# Phase 1: Skeleton — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Angular 22 + Phaser 3.90 app. It has a main menu, a lazy-loaded game screen that creates and destroys Phaser cleanly, a typed bridge, integer pixel scaling, refresh-rate detection, a dev performance overlay over an animated sandbox scene, lifecycle browser tests, and a GitHub Pages-ready build.

**Architecture:** Angular owns navigation and overlays. Phaser lives only inside `GameShellComponent` and is reached only through `GameSessionService` and a typed `GameBridge`. All measurable logic (zoom, refresh detection, frame statistics, dev flag) is pure TypeScript with no Phaser import, so it is unit-tested in Vitest. Phaser-dependent code is exercised by Playwright.

**Tech Stack:** Angular 22 (standalone, zoneless, signals, OnPush, hash routing), Phaser 3.90.0, TypeScript strict, Vitest, Playwright.

**Spec:** `docs/design.md`, `docs/engine.md` (§1, §2.1, §3, §7, §8, §10, §11), `game.md`.

## Global Constraints

- Angular `^22.2`, Phaser exactly `3.90.0`. Do not use React, Three.js, Rapier, NgRx or any 3D engine.
- Runtime dependencies: Angular packages and `phaser` only.
- File names follow `game.md` §2 (`*.component.ts`, `*.service.ts`). Use `--type` flags with `ng generate`.
- Phaser must never be imported by any module that Vitest loads. Only `src/game-engine/bootstrap/**` and `src/game-engine/scenes/**` may import `phaser`.
- The Phaser bundle must be loaded only by the `play/:stageId` route, never in the initial bundle.
- Logical view is **432×240** world px. Canvas is `432N × 240N`, with N a whole number. Quality caps: low ≤ 3, medium ≤ 4, high ≤ 6.
- `pixelArt: true`, `roundPixels: true`, `type: Phaser.AUTO`.
- No events are emitted every frame. `perfSample` goes out every 250ms, and only when dev tools are enabled.
- Dev tools are enabled when the build is not production, **or** when the URL query has `dev=1`.
- Before every commit, run `npx prettier --write` on the changed files only.
- No explanatory `//` comments (owner rule). Use descriptive names instead.
- The GitHub account and repo are **not known**. Do not create remotes or deploy. The workflow is `workflow_dispatch` only.

## Review Focus

1. **Quick Play → Menu → Play before boot finishes.** Expect no console errors and exactly one canvas. Test: `lifecycle.spec.ts › rapid toggling during boot leaves one canvas`.
2. **Window resize and moving to a different-DPI monitor.** Expect the canvas to rescale to the new N with pixels still sharp. Test: `computeZoom` unit cases, plus `lifecycle.spec.ts › resize recomputes canvas size`.
3. **Tab hidden then shown.** Expect no burst of catch-up frames being counted as long frames. Test: `FrameStats.push` ignores samples over 250ms (`ignores tab-switch gaps`).
4. **Noisy refresh measurement (one GC spike, a 240Hz or 165Hz display).** Expect correct snapping. Test: `detectRefreshRate` cases.
5. **Leaving the game screen.** Expect every bridge listener removed and the Phaser game destroyed. Test: `GameShellComponent › destroys the game and disposes the bridge on destroy`.

---

## File Structure

```
.gitignore                                  modified: adds .superpowers/, public/assets/generated/, test-results/, playwright-report/
package.json                                scripts: start, build, preview, test, e2e
playwright.config.ts
.github/workflows/deploy-pages.yml          workflow_dispatch only
src/app/app.config.ts                       hash router, zoneless
src/app/app.routes.ts
src/app/core/services/game-session.service.ts
src/app/core/utilities/dev-tools.ts         isDevToolsEnabled()
src/app/core/game-factory.token.ts          GAME_FACTORY InjectionToken
src/app/features/main-menu/main-menu.component.{ts,html,css}
src/app/features/game-shell/game-shell.component.{ts,html,css}
src/app/shared/components/dev-overlay/dev-overlay.component.{ts,html,css}
src/game-engine/core/game-events.ts         GameCommand, GameEvent, related types
src/game-engine/core/game-bridge.ts         GameBridge
src/game-engine/core/display.ts             computeZoom(), detectRefreshRate()
src/game-engine/core/frame-stats.ts         FrameStats
src/game-engine/configuration/performance.config.ts
src/game-engine/bootstrap/game-config.ts    createGameConfig()
src/game-engine/bootstrap/create-game.ts    createGame(): GameFactory implementation
src/game-engine/scenes/boot.scene.ts        refresh detection, then starts sandbox
src/game-engine/scenes/sandbox.scene.ts     animated measurement scene, perf sampling
e2e/lifecycle.spec.ts
```

---

### Task 1: Workspace scaffold

**Files:** the whole Angular workspace at the repo root. Also `.gitignore` and `package.json`.

- [ ] **Step 1:** Confirm `package-lock.json` at the repo root is empty (0 bytes), then delete it. Run `git init`.
- [ ] **Step 2:** Scaffold into the existing folder without prompts:
  ```bash
  NG_CLI_ANALYTICS=false npx -y @angular/cli@22 new pip-delivery --directory=. --style=css --routing --ssr=false --skip-git --interactive=false
  ```
  Expected: the workspace is created, and `game.md` and `docs/` are untouched.
- [ ] **Step 3:** Install the rest:
  ```bash
  npm i phaser@3.90.0
  npm i -D @playwright/test && npx playwright install chromium
  ```
- [ ] **Step 4:** Add the entries listed in File Structure to `.gitignore`. Set these scripts in `package.json`:
  - `"start": "ng serve"`
  - `"build": "ng build"`
  - `"preview": "ng build && npx -y http-server dist/pip-delivery/browser -p 4300 -c-1"`
  - `"test": "ng test --watch=false"`
  - `"e2e": "playwright test"`
- [ ] **Step 5:** Verify: `npm run build` succeeds, and `npm test` passes with the generated default spec.
- [ ] **Step 6:** Commit with the message `chore: scaffold Angular 22 workspace with Phaser 3.90`.

### Task 2: Typed bridge

**Files:** Create `src/game-engine/core/game-events.ts`, `src/game-engine/core/game-bridge.ts`. Test: `src/game-engine/core/game-bridge.spec.ts`.

**Interfaces (Produces):**
```ts
export type StageId = string;
export type QualityLevel = 'low' | 'medium' | 'high';
export interface GameplaySettings { quality: QualityLevel; reducedMotion: boolean; screenShake: boolean; }
export interface PerfSample { fps: number; avgFrameMs: number; p95FrameMs: number; longFrames: number; refreshHz: number; physicsHz: number; activeBodies: number; }
export type GameCommand =
  | { type: 'startStage'; stageId: StageId }
  | { type: 'pause' } | { type: 'resume' } | { type: 'restart' } | { type: 'quitToMap' }
  | { type: 'applySettings'; settings: GameplaySettings };
export type GameEvent =
  | { type: 'loadProgress'; progress: number }
  | { type: 'loadComplete'; stageId: StageId }
  | { type: 'paused' } | { type: 'resumed' }
  | { type: 'perfSample'; sample: PerfSample }
  | { type: 'recoverableError'; message: string };
export class GameBridge {
  send(command: GameCommand): void;
  onCommand(handler: (command: GameCommand) => void): () => void;   // returns unsubscribe
  emit(event: GameEvent): void;
  onEvent(handler: (event: GameEvent) => void): () => void;         // returns unsubscribe
  listenerCount(): number;
  dispose(): void;                                                  // removes all listeners; later send/emit are no-ops
}
```
Later phases extend these unions in this file only. `requestSnapshot` and the progression events are added in Phases 4 and 6.

- [ ] **Step 1: Failing tests** in `game-bridge.spec.ts`:
  - `delivers commands to command handlers only`: `send({type:'pause'})` calls the command handler once with that object. The event handler is not called.
  - `delivers events to event handlers only`: the mirror of the case above.
  - `unsubscribe stops delivery`: after calling the returned function, `send` does not call the handler, and `listenerCount()` decreases by 1.
  - `dispose removes every listener and silences later calls`: two of each handler registered, then `dispose()`. `listenerCount()` is `0`, and `emit` and `send` call nothing.
  - `a throwing handler does not stop other handlers`: the second handler is still called, and the error is reported through `console.error`.
- [ ] **Step 2:** `npm test` fails because the module is not found.
- [ ] **Step 3:** Implement `GameBridge` with two `Set`s of handlers. Use no RxJS inside `game-engine`, so the engine stays framework-free.
- [ ] **Step 4:** `npm test` passes.
- [ ] **Step 5:** Run prettier on the changed files, then commit with `feat(engine): typed Angular-Phaser bridge`.

### Task 3: Display maths and frame statistics

**Files:**
- Create: `src/game-engine/core/display.ts`, `src/game-engine/core/frame-stats.ts`, `src/game-engine/configuration/performance.config.ts`
- Test: `display.spec.ts`, `frame-stats.spec.ts` next to them

**Interfaces (Produces):**
```ts
// performance.config.ts
export const LOGICAL_WIDTH = 432;
export const LOGICAL_HEIGHT = 240;
export const ZOOM_CAP: Record<QualityLevel, number> = { low: 3, medium: 4, high: 6 };
export const SUPPORTED_REFRESH_RATES = [60, 75, 90, 100, 120, 144, 165, 240] as const;
export const LONG_FRAME_MS = 50;
export const IGNORED_GAP_MS = 250;
export const PERF_SAMPLE_INTERVAL_MS = 250;
export const FRAME_STATS_CAPACITY = 240;
// display.ts
export function computeZoom(viewportCssHeight: number, devicePixelRatio: number, quality: QualityLevel): number;
export function detectRefreshRate(frameDeltasMs: readonly number[]): number;
// frame-stats.ts
export class FrameStats {
  constructor(capacity: number);
  push(frameMs: number): void;
  readonly average: number;      // getter
  readonly p95: number;          // getter, nearest-rank
  readonly longFrames: number;   // getter, count > LONG_FRAME_MS in window
  readonly fps: number;          // getter, 1000 / average, 0 when empty
}
```
`computeZoom` is `clamp(ceil(h * dpr / 240), 1, ZOOM_CAP[quality])`. `detectRefreshRate` takes the median delta, computes `1000 / median`, and snaps it to the nearest supported rate. With no samples it returns 60.

- [ ] **Step 1: Failing tests:**
  - `computeZoom`:
    - `(720,1,'high') → 3`
    - `(1080,1,'high') → 5`
    - `(1080,1,'medium') → 4`
    - `(1440,1,'high') → 6`
    - `(2160,1,'high') → 6`
    - `(720,2,'low') → 3`
    - `(200,1,'high') → 1`
  - `detectRefreshRate`:
    - 30 × `16.67` → `60`
    - 30 × `6.94` → `144`
    - 30 × `8.33` → `120`
    - 30 × `4.17` → `240`
    - 30 × `6.06` → `165`
    - 29 × `16.67` plus one `120` → `60`
    - `[]` → `60`
  - `FrameStats`:
    - samples 1..100 at capacity 240 → `average 50.5`, `p95 95`, `longFrames 50`
    - capacity 3 then push 1,2,3,4 → `average 3`
    - `ignores tab-switch gaps`: pushing `16.67, 900, 16.67` → `longFrames 0`, `average ≈ 16.67`
    - empty → `fps 0`
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3:** Implement. `FrameStats` uses a preallocated `Float64Array` ring buffer, so `push` does not allocate. `p95` may sort a reused scratch copy; it is called only every 250ms.
- [ ] **Step 4:** `npm test` passes.
- [ ] **Step 5:** Run prettier, then commit with `feat(engine): zoom, refresh detection, frame stats`.

### Task 4: Phaser bootstrap and scenes

**Files:**
- Create: `src/game-engine/bootstrap/game-config.ts`, `src/game-engine/bootstrap/create-game.ts`, `src/game-engine/scenes/boot.scene.ts`, `src/game-engine/scenes/sandbox.scene.ts`, `src/app/core/game-factory.token.ts`

**Interfaces:**
- Consumes: `GameBridge`, `computeZoom`, `detectRefreshRate`, `FrameStats`, and the constants in `performance.config.ts`.
- Produces:
```ts
// game-factory.token.ts
export interface GameOptions { quality: QualityLevel; devTools: boolean; }
export interface GameHandle { destroy(): void; resize(viewportCssHeight: number, devicePixelRatio: number): void; }
export type GameFactory = (parent: HTMLElement, bridge: GameBridge, options: GameOptions) => GameHandle;
export const GAME_FACTORY = new InjectionToken<GameFactory>('GAME_FACTORY');
// create-game.ts
export const createGame: GameFactory;
// game-config.ts
export function createGameConfig(parent: HTMLElement, zoom: number, scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig;
```
- **Bridge and options in scenes:** `createGame` stores the bridge and options in the game registry under `'bridge'` and `'options'`. Scenes read them from there.
- **`createGameConfig`:**
  - `width: 432*zoom, height: 240*zoom`
  - `pixelArt: true, roundPixels: true, type: Phaser.AUTO, backgroundColor: '#6cb4ff'`
  - `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`
  - `physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } }`
  - `fps: { smoothStep: true }`
- **`BootScene`:** collects 30 `game.loop.delta` values, then stores `refreshHz` in the registry and calls `physics.world.setFPS(refreshHz)` in later scenes. It then starts `SandboxScene`.
- **`SandboxScene`:**
  - camera zoom = N
  - a 27×15-tile checkerboard ground strip
  - 20 bouncing 16×16 squares, so there is something to measure
  - emits `loadComplete` with stage id `'sandbox'`
  - when `options.devTools` is on, it pushes each `game.loop.delta` into a `FrameStats` and emits `perfSample` every `PERF_SAMPLE_INTERVAL_MS`
  - handles `pause` and `resume` commands by pausing and resuming the scene, then emitting `paused` and `resumed`
  - unregisters its bridge handlers on the scene `shutdown` event
- **`resize`:** recomputes zoom, then calls `game.scale.resize(432*N, 240*N)` and sets the camera zoom.
- **`destroy`:** calls `game.destroy(true)`.

- [ ] **Step 1:** Implement the four files. No unit tests here, because this is Phaser-bound and covered by Task 6.
- [ ] **Step 2:** `npm run build` succeeds.
- [ ] **Step 3:** Run prettier, then commit with `feat(engine): Phaser bootstrap, boot and sandbox scenes`.

### Task 5: Angular shell, menu, session service, dev overlay

**Files:**
- Create: `src/app/core/services/game-session.service.ts`, `src/app/core/utilities/dev-tools.ts`, `src/app/features/main-menu/*`, `src/app/features/game-shell/*`, `src/app/shared/components/dev-overlay/*`
- Modify: `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/app/app.html`
- Test: `dev-tools.spec.ts`, `game-session.service.spec.ts`, `game-shell.component.spec.ts`

**Interfaces:**
- Consumes: `GAME_FACTORY`, `GameHandle`, `GameBridge`, `GameEvent`, `PerfSample`.
- Produces:
```ts
export function isDevToolsEnabled(search: string, production: boolean): boolean;
@Injectable() export class GameSessionService {      // provided on the play route, not root
  readonly loaded: Signal<boolean>;
  readonly paused: Signal<boolean>;
  readonly perf: Signal<PerfSample | null>;
  attach(host: HTMLElement, options: GameOptions): void;   // throws if already attached
  send(command: GameCommand): void;
  resize(viewportCssHeight: number, devicePixelRatio: number): void;
  detach(): void;                                         // destroys game, disposes bridge, idempotent
}
```
- **Routing:**
  - `app.config.ts`: `provideRouter(routes, withHashLocation())` and `provideZonelessChangeDetection()`, if the CLI did not already add it.
  - `app.routes.ts` routes:
    - `''` loads `MainMenuComponent` with `loadComponent`
    - `'play/:stageId'` loads `GameShellComponent` with `loadComponent`, and has `providers: [GameSessionService, { provide: GAME_FACTORY, useValue: createGame }]`. The provider must sit in a lazily loaded route file such as `game-shell.routes.ts` (using `loadChildren`), so `create-game.ts` and Phaser stay out of the initial chunk.
    - `'**'` redirects to `''`
- **`MainMenuComponent`:** OnPush, with the title **PIP'S DELIVERY** and a **Play** link to `['/play', 'sandbox']`. Use the Press Start 2P font, self-hosted from `public/assets/fonts/` with `@font-face` in `styles.css`. The font is OFL; download it from Google Fonts or its GitHub source and include `OFL.txt`.
- **`GameShellComponent`:**
  - OnPush
  - a `#host` div that fills the viewport with a black letterbox
  - a **Menu** link back to `/`
  - `<app-dev-overlay>` when dev tools are enabled
  - calls `session.attach` in `afterNextRender` with `{ quality: 'high', devTools: isDevToolsEnabled(location.search, !isDevMode()) }`. Quality becomes a setting in Phase 6. With hash routing the dev flag goes before the hash, as in `/?dev=1#/play/sandbox`.
  - calls `session.detach` through `DestroyRef.onDestroy`
  - a `ResizeObserver` on the host calls `session.resize` (throttled with `requestAnimationFrame`), and is disconnected on destroy
- **`DevOverlayComponent`:** OnPush, with input `sample: PerfSample | null`. It shows FPS, avg and p95 ms, long frames, refresh and physics Hz, and bodies, in a fixed top-right monospace box. It toggles with the backtick key, using a host listener on `document:keydown`.

- [ ] **Step 1: Failing tests:**
  - `isDevToolsEnabled`:
    - `('', false) → true`
    - `('', true) → false`
    - `('?dev=1', true) → true`
    - `('?dev=0', true) → false`
  - `GameSessionService`, with a fake factory returning a spy `GameHandle`:
    - `attach` calls the factory once with the host
    - a second `attach` throws
    - an emitted `perfSample` updates `perf()`
    - `loadComplete` sets `loaded()` to true
    - `detach` calls `handle.destroy` once, leaves the bridge `listenerCount()` at 0, and calling it twice is safe
  - `GameShellComponent › destroys the game and disposes the bridge on destroy`: render with the fake factory, destroy the fixture, and expect `destroy` called once.
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3:** Implement. Generate components with `npx ng g c features/main-menu --type=component` and similar, then adjust.
- [ ] **Step 4:** `npm test` passes, and `npm run build` succeeds. The build output must show Phaser in a lazy chunk, not in `main`. Check that the initial bundle is under 300 kB.
- [ ] **Step 5:** Manual check: run `npm start` and open `http://localhost:4200`. The menu appears, Play opens the sandbox, the overlay shows numbers, and Menu returns.
- [ ] **Step 6:** Run prettier, then commit with `feat(app): menu, game shell, session service, dev overlay`.

### Task 6: Lifecycle browser tests

**Files:** Create `playwright.config.ts`, `e2e/lifecycle.spec.ts`.

**Config:** Chromium only. `webServer: { command: 'npx ng serve --port 4301', url: 'http://localhost:4301', reuseExistingServer: true }`. `baseURL` is the same address.

- [ ] **Step 1: Write the tests.** Every test collects `page.on('console')` messages of type `error` and asserts there are none at the end.
  - `menu to play shows exactly one canvas`: `#/play/sandbox` shows one `canvas` element.
  - `twenty play-menu cycles leave one canvas and bounded heap`:
    1. Do one warm-up cycle, force GC through CDP `HeapProfiler.collectGarbage`, and record `performance.memory.usedJSHeapSize`.
    2. Do 20 cycles of clicking Play, waiting for the canvas, then clicking Menu.
    3. Force GC again. Assert 0 canvases on the menu and heap growth below `5 * 1024 * 1024`.
  - `rapid toggling during boot leaves one canvas`: 10 cycles of Play then Menu with no waiting, ending on Play. After 1s, there is exactly one canvas.
  - `resize recomputes canvas size`: at viewport 1280×720, the canvas `width` attribute is `1296`. After changing to 1920×1080, it becomes `2160`. `?dev=1` is not needed because the dev server is a dev build.
- [ ] **Step 2:** `npm run e2e` passes. If the heap assertion fails, find the retained objects with a heap snapshot. Do not loosen the threshold.
- [ ] **Step 3:** Run prettier, then commit with `test(e2e): lifecycle, memory and resize checks`.

### Task 7: GitHub Pages readiness

**Files:** Create `.github/workflows/deploy-pages.yml`. Modify `package.json`.

- [ ] **Step 1:** Add the script `"build:pages": "ng build --base-href ./"`. A relative base-href works under any repo path with hash routing, so no repo name is needed yet.
- [ ] **Step 2:** Write the workflow. It triggers on `workflow_dispatch` only. It runs on Node 24 and does:
  1. `npm ci`
  2. `npm test`
  3. `npm run build:pages`
  4. `actions/upload-pages-artifact` with `dist/pip-delivery/browser`
  5. `actions/deploy-pages`

  It needs the permissions `pages: write` and `id-token: write`. Phase 8 switches the trigger to push on `main` once the repo exists.
- [ ] **Step 3:** Verify `npm run build:pages`, then serve `dist/pip-delivery/browser` from a **subfolder** to simulate the Pages repo path:
  1. Copy the output into `tmp-pages/pip/`.
  2. Run `npx -y http-server tmp-pages -p 4302`.
  3. Open `http://localhost:4302/pip/#/play/sandbox`. The game loads with no 404s in the network tab.
  4. Delete `tmp-pages`.
- [ ] **Step 4:** Run prettier, then commit with `ci: GitHub Pages workflow (manual trigger)`.

### Task 8: Phase 1 review handoff

- [ ] **Step 1:** Run `npm test`, `npm run e2e` and `npm run build`. All three must be green. Record the dev-overlay numbers from the sandbox at 1280×720 and at fullscreen: FPS, avg, p95 and long frames.
- [ ] **Step 2:** Present the Phase 1 review checklist from `docs/plan.md` to the owner, with the recorded numbers and the commands `npm start` and `npm run preview`. Mark Phase 1 "In review" in `docs/plan.md`.
