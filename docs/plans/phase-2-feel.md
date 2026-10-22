# Phase 2: Pip's Feel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pip moves and jumps like SMB1 in a test room. The movement is the same at 60, 120 and 144Hz, the camera only scrolls forward, and a live tuning panel lets the owner dial in the feel.

**Architecture:** `PlayerController` is pure TypeScript and holds all movement rules and its own true velocity. Each Arcade physics step, `Player` (the Phaser glue) passes it contacts read from the Arcade body, then hands the body the controller's **midpoint velocity** for the next step. Arcade integrates position as `p += v·dt`, so midpoint velocity makes integration exact for constant acceleration, which is what keeps jump heights identical across step rates. Input, camera and the tile grid are pure, tested modules.

**Tech Stack:** Phase 1 stack. No new dependencies.

**Spec:** `docs/design.md` §4, `docs/engine.md` §3, §4.1, §4.2, §4.4, §4.5, §10.2. Builds on `docs/plans/phase-1-skeleton.md`.

## Global Constraints

- Phase 1 Global Constraints still apply.
- **All tuning is in per-second units.** Converted from SMB1 px/frame at 60Hz: speed × 60, acceleration × 3600.
- `DEFAULT_MOVEMENT` values, which the owner may change at review:
  - walk max speed `93.75`
  - run max speed `153.75`
  - walk acceleration `133.59375`
  - run acceleration `200.390625`
  - air acceleration `133.59375` (added in Task 2 so the panel can tune air control)
  - release deceleration `182.8125`
  - skid deceleration `365.625`
  - max fall speed `270`
  - coyote time `100` ms
  - jump buffer `100` ms
  - corner nudge `4` px
  - max step `1/30` s
  - camera lead fraction `0.42`
- **Jump tiers** (SMB1, chosen by |vx| at takeoff). These are the documented SMB1 tier values that the rounded table in `design.md` §4 summarises.

  | Tier | min takeoff speed | launch speed | hold gravity | fall gravity |
  |---|---|---|---|---|
  | 0 | 0 | 240 | 450 | 1575 |
  | 1 | 60 | 240 | 421.875 | 1350 |
  | 2 | 138.75 | 300 | 562.5 | 2025 |
- Hold gravity applies only while rising **and** jump is held. Once jump is released or Pip starts falling, fall gravity applies for the rest of that airtime.
- **Air rules:**
  - no release deceleration in the air
  - facing never changes in the air
  - air max speed = `min(runMaxSpeed, max(walkMaxSpeed, |vx at takeoff|))`
- Holding left and right together counts as no horizontal input.
- Jump triggers on a **press edge** only. Holding jump through a landing never re-jumps.
- The controller runs once per Arcade **world step** (the `worldstep` event, with `dt = 1 / physicsHz`), never once per render frame.
- Small Pip body: 12×14 px, offset (2, 2) inside the 16×16 frame. Tile size 16.

## Carried over from Phase 1 (binding)

These are what Phase 1 actually built, and they override older wording below.
- **Factory types** (`GameOptions`, `GameHandle`, `GameFactory`) live in `src/game-engine/core/game-factory.ts`. `src/app/core/game-factory.token.ts` only re-exports them and declares `GAME_FACTORY`.
- **Zoom:** `computeZoom(viewportCssWidth, viewportCssHeight, devicePixelRatio, quality)` is `clamp(ceil(min(h/240, w/432) · dpr), 1, cap)`. The signature is `GameHandle.resize(width, height, dpr)`.
- **Sharp scaling (owner decision):** render at a whole-number N. Phaser's inline `image-rendering: pixelated` on the canvas is overridden to `auto` in `postBoot`, so the browser's final fractional fit to the window is smooth.
- **Camera:**
  - Keep the default origin (0.5), so `worldView` and bounds maths stay correct.
  - Position the view with `camera.centerOn(viewLeft + LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)`.
  - **Never** assign `scrollX` to the view's left edge directly. At zoom N they differ by `216·(N−1)` px.
  - Re-centre after every zoom change.
  - Run `scale.resize` before `registry.set('zoom')`.
- **No fps cap (owner decision):** render and physics follow the detected display refresh. 60 is the floor, not the target.
- **Frame timing:** frame timing uses `game.loop.rawDelta`. `PerfSample.longFrames` is the session total (`FrameStats.totalLongFrames`).
- **Arcade stepping order** (checked in the Phaser 3.90 source):
  - `World.step` integrates the bodies, separates the colliders, then emits `worldstep`.
  - So a velocity set on `worldstep` drives the **next** step. The controller is one step ahead, and that is consistent across rates.
  - On the first step of a frame, bodies integrate inside `preUpdate` before any hook runs.
  - The player body must have `allowGravity = false`, zero acceleration and zero drag, and its maxVelocity must not bind, so Arcade never changes the midpoint velocity.
- **Dev-only hotkeys** bind a filtered key, for example `(document:keydown.code.F2)`, so other keys never trigger change detection.

## Review Focus

1. **Holding jump through a landing.** Expect no automatic re-jump. Test: `PlayerController › holding jump through landing does not re-jump`.
2. **A key held while the window loses focus.** Expect Pip to stop, not run forever. Test: `InputTracker › releaseAll clears every key`, and `TestRoomScene` calls it on game `blur` and on `visibilitychange`.
3. **Left and right held together.** Expect Pip to decelerate as if released, with no drift. Test: `PlayerController › both directions held behaves as released`.
4. **A large time gap, such as a tab switch or a debugger pause.** Expect no tunnelling through floors or huge velocity jumps. Test: `PlayerController › clamps oversized dt`.
5. **Running into a wall, then jumping.** Expect the stored speed to be gone, so the jump is a standing jump. Test: `PlayerController › wall contact zeroes horizontal speed`.

---

## File Structure

```
src/game-engine/configuration/movement.config.ts      MovementTuning, JumpTier, DEFAULT_MOVEMENT
src/game-engine/configuration/physics.config.ts       TILE_SIZE, PLAYER_SMALL_BODY
src/game-engine/entities/player/player-controller.ts  PlayerController (pure)
src/game-engine/entities/player/player-sim.test-helpers.ts   simulateJump() and other fixed-rate harnesses (tests only)
src/game-engine/entities/player/player.ts             Player: Phaser sprite + body + controller glue
src/game-engine/entities/player/pip-placeholder.ts    HERO_PIP grid → texture (temporary until Phase 3)
src/game-engine/systems/physics/corner-nudge.ts       cornerNudge() (pure)
src/game-engine/systems/input/actions.ts              ActionState, KeyBindings, DEFAULT_BINDINGS, resolveActions()
src/game-engine/systems/input/input-tracker.ts        InputTracker (pure)
src/game-engine/systems/camera/forward-camera.ts      nextCameraScrollX(), clampToCameraLeft() (pure)
src/game-engine/world/tile-grid.ts                    parseTileRows() (pure)
src/game-engine/world/placeholder-tiles.ts            runtime 16×16 tile textures (temporary until Phase 3)
src/game-engine/scenes/test-room.scene.ts
src/content/levels/sandbox/test-room.ts               ASCII test room
src/content/manifests/level-manifest.ts               STAGE_SCENES: stageId → scene key
src/app/shared/components/tuning-panel/tuning-panel.component.{ts,html,css}
src/app/shared/components/tuning-panel/format-tuning.ts   formatTuningAsConfig() (pure)
src/game-engine/core/registry-keys.ts                 typed registry accessors (Task 4)
src/game-engine/core/step-stats.ts                    StepStats: frames whose world-step count ≠ 1 (pure, Task 4)
src/game-engine/scenes/physics-rate.ts                applyDetectedPhysicsRate(scene) shared helper (Task 4)
```
Modified:
- `game-events.ts`: adds `applyTuning`, plus `PerfSample.offStepFrames`.
- `src/game-engine/core/game-factory.ts`: `GameOptions.initialStageId`.
- `create-game.ts`, `boot.scene.ts` and `sandbox.scene.ts`.
- `game-shell.component.*`, `main-menu.component.html` and `dev-overlay.component.*`.
- Build config for the arcade-only Phaser build (Task 1).

---

### Task 1: Arcade-only Phaser build

**Why:** the full Phaser bundle includes Matter physics, which this game never uses. The arcade-only distribution is about 11% smaller over the wire: about 282 kB gzip against about 315 kB. It loads only with the game route.

**Files:** build config (`angular.json` and/or `tsconfig.json`), plus a type bridge only if needed. No source file changes its `import ... from 'phaser'` lines.

- [ ] **Step 1:** Make every `phaser` import resolve to the arcade-only build (`phaser/dist/phaser-arcade-physics.min.js` or its unminified sibling) at bundle time, while the type checker keeps using Phaser's own `types/phaser.d.ts`. Use the cleanest mechanism Angular 22's esbuild builder supports, and explain the choice in the report.
- [ ] **Step 2:** Verify:
  - `npm run build` succeeds, and the Phaser chunk is smaller than before. Record raw and gzip sizes, before and after.
  - The initial chunk still contains no Phaser.
  - `npx tsc -p tsconfig.app.json --noEmit` is clean.
  - `npm test` and `npm run e2e` pass.
  - `npm run build:pages` still loads from a subfolder.
- [ ] **Step 3:** Run prettier on the changed files, then commit with `build: use the arcade-only Phaser distribution`.

### Task 2: Movement configuration and controller

**Files:**
- Create: `movement.config.ts`, `physics.config.ts`, `player-controller.ts`, `player-sim.test-helpers.ts`
- Test: `player-controller.spec.ts`

**Interfaces (Produces):**
```ts
export interface JumpTier { minTakeoffSpeed: number; launchSpeed: number; holdGravity: number; fallGravity: number; }
export interface MovementTuning {
  walkMaxSpeed: number; runMaxSpeed: number; walkAccel: number; runAccel: number;
  airAccel: number; releaseDecel: number; skidDecel: number; maxFallSpeed: number;
  jumpTiers: readonly [JumpTier, JumpTier, JumpTier];
  coyoteMs: number; jumpBufferMs: number; cornerNudgePx: number; maxStepSeconds: number;
  cameraLeadFraction: number;
}
export const DEFAULT_MOVEMENT: MovementTuning;
export const TILE_SIZE = 16;
export const PLAYER_SMALL_BODY = { width: 12, height: 14, offsetX: 2, offsetY: 2 } as const;

export interface ActionState { left: boolean; right: boolean; down: boolean; jump: boolean; run: boolean; }
export interface Contacts { onGround: boolean; hitCeiling: boolean; hitWallLeft: boolean; hitWallRight: boolean; }
export type PlayerMode = 'ground' | 'skid' | 'air';
export class PlayerController {
  constructor(tuning: MovementTuning);
  setTuning(tuning: MovementTuning): void;
  step(actions: ActionState, contacts: Contacts, dtSeconds: number): void;
  readonly vx: number; readonly vy: number;            // true velocity, px/s, y down
  readonly bodyVx: number; readonly bodyVy: number;    // midpoint velocity for this step
  readonly facing: 1 | -1;
  readonly mode: PlayerMode;
}
```
`ActionState` is defined in `systems/input/actions.ts` (Task 3) and is created first, in this task, so the controller can import it.

`player-sim.test-helpers.ts` exports these harnesses. Each integrates `y += bodyVy·dt` and `x += bodyVx·dt` against flat ground at `y = 0`, with `onGround` meaning `y >= 0 && vy >= 0`. `distance` is the horizontal travel interpolated to the exact step where `y` crosses back to 0, so landing on a step boundary doesn't add up to a step's worth of error:
```ts
simulateJump(hz: number, opts: { runUpSeconds: number; run: boolean; holdJumpSeconds: number }): { apex: number; distance: number }
simulate(hz: number, seconds: number, actionsAt: (t: number) => ActionState, contactsAt?: (t: number, y: number) => Contacts): PlayerController
```

- [ ] **Step 1: Failing tests** in `player-controller.spec.ts`. All values come from Global Constraints.
  - `walking accelerates to walk max and no further`: right held for 3s gives `vx` = 93.75 ± 0.01.
  - `walk acceleration rate`: after 0.5s from rest, `vx` = 66.8 ± 1.
  - `run reaches run max`: right + run for 3s gives 153.75 ± 0.01.
  - `release decelerates to rest without reversing`: from walk max, after releasing, `vx` reaches 0 within 0.53s and is never negative.
  - `reversing on ground skids`: at run max, holding left gives `mode` `'skid'` while `vx > 0`, then `facing` -1 once moving left.
  - `both directions held behaves as released`.
  - `standing full jump apex is 64px` (±1). `walking jump apex is 68.3px` (±1, takeoff at walk max). `running jump apex is 80px` (±1, takeoff at run max).
  - `tap jump is short`: jump held for 1 step gives an apex between 14 and 24 px.
  - `jump apex and distance match across 60, 120 and 144Hz within 1px`, for both the standing full jump and the running full jump.
  - `falls no faster than max fall speed`: `vy` never exceeds 270.
  - `coyote time`: ground contact ends at t0. A jump press at t0 + 90ms launches (`vy` = -240). A press at t0 + 110ms does not.
  - `jump buffer`: a press 90ms before landing launches on the landing step. A press 110ms before does not.
  - `holding jump through landing does not re-jump`.
  - `facing does not flip in the air`.
  - `air speed is capped by takeoff speed`: after a walking takeoff, holding run in the air keeps |vx| ≤ 93.75.
  - `wall contact zeroes horizontal speed`: `hitWallRight` while moving right gives `vx` 0.
  - `clamps oversized dt`: `step` with dt 0.5 changes `vx` by at most `walkAccel / 30`.
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3: Implement `PlayerController`.**
  - **Per step:**
    1. Clamp dt to `maxStepSeconds`.
    2. Update the coyote and buffer timers in ms.
    3. Resolve the horizontal intent.
    4. Apply ground or air horizontal rules.
    5. Pick the gravity (hold or fall, from the tier latched at takeoff).
    6. Compute `vNew`.
    7. Set `body* = (vOld + vNew) / 2`.
    8. Clamp `vy` to `maxFallSpeed`.
  - **Contacts:**
    - `hitCeiling` sets `vy = max(vy, 0)` and switches to fall gravity.
    - `onGround` with `vy > 0` sets `vy = 0`.
- [ ] **Step 4:** `npm test` passes. If the cross-rate test fails, check the gravity switch at apex first. Switching inside a step must split that step at `vy = 0`.
- [ ] **Step 5:** Run prettier, then commit with `feat(player): SMB1-tuned movement controller`.

### Task 3: Input, corner nudge, camera, tile grid

**Files:** Create `actions.ts`, `input-tracker.ts`, `corner-nudge.ts`, `forward-camera.ts`, `tile-grid.ts`, each with a `.spec.ts`.

**Interfaces (Produces):**
```ts
export type GameAction = keyof ActionState | 'pause';
export type KeyBindings = Record<GameAction, readonly string[]>;           // KeyboardEvent.code values
export const DEFAULT_BINDINGS: KeyBindings;
// left: ArrowLeft, KeyA · right: ArrowRight, KeyD · down: ArrowDown, KeyS
// jump: Space, KeyZ, KeyK · run: ShiftLeft, ShiftRight, KeyX, KeyJ · pause: Escape, Enter
export interface PadState { axisX: number; buttons: readonly boolean[]; }
export function resolveActions(pressed: ReadonlySet<string>, bindings: KeyBindings, pad: PadState | null): ActionState;
// pad: button 0 jump, button 2 run, button 14/15 d-pad left/right, button 13 down, axisX < -0.5 left, > 0.5 right
export class InputTracker { keyDown(code: string): void; keyUp(code: string): void; releaseAll(): void; readonly pressed: ReadonlySet<string>; }
export interface Rect { x: number; y: number; width: number; height: number; }
export function cornerNudge(box: Rect, dy: number, isSolidTile: (tx: number, ty: number) => boolean, tileSize: number, maxNudgePx: number): number;
export function nextCameraScrollX(currentScrollX: number, playerX: number, viewWidth: number, levelWidth: number, leadFraction: number): number;
export function clampToCameraLeft(playerLeft: number, scrollX: number): number;
export function parseTileRows(rows: readonly string[], legend: Readonly<Record<string, number>>): { tiles: number[][]; width: number; height: number };
```
- **`cornerNudge`** applies only when `dy < 0`. It looks at the tile row the head would enter. If exactly one of the head's two corner columns is solid, and the horizontal overlap with that tile is at most `maxNudgePx`, it returns the dx that clears the overlap. Otherwise it returns 0.
- **`parseTileRows`** throws `Error('Unknown tile symbol "x" at row r, col c')` on an unknown symbol, and `Error('Row r has length n, expected m')` on ragged rows.

- [ ] **Step 1: Failing tests:**
  - **`resolveActions`:**
    - `ArrowRight` gives right
    - `KeyD` + `ShiftLeft` gives right + run
    - `Space` gives jump
    - pad `axisX -0.8` gives left
    - pad button 0 gives jump
    - an empty set with a null pad gives all false
  - **`InputTracker`:** down/up tracking works, and `releaseAll clears every key`.
  - **`cornerNudge`** (tile 16, nudge 4, solid tile at (1, 0), box `{x:29, y:17, width:12, height:14}`, dy -5):
    - gives `+3`
    - the same box with `x: 26` (6px overlap) gives `0`
    - mirrored (solid at (2, 0), box `x: 23`) gives `-3`
    - both corners solid gives `0`
    - `dy: 5` gives `0`
  - **`nextCameraScrollX`** (view 432, level 2000, lead 0.42):
    - `(0, 100, …)` gives `0`
    - `(0, 300, …)` gives `118.56`
    - `(200, 100, …)` gives `200` (never back)
    - `(0, 1990, …)` gives `1568` (level end)
  - **`clampToCameraLeft`:** `(90, 100)` gives `100`, and `(120, 100)` gives `120`.
  - **`parseTileRows`:** a 2-row, 3-column grid parses, and both error messages appear exactly as written above.
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` passes.
- [ ] **Step 5:** Run prettier, then commit with `feat(engine): input mapping, corner nudge, forward camera, tile grid`.

### Task 4: Stepping and measurement infrastructure

**Why:** the Phase 1 final review found these problems:
- A fixed step at the refresh rate drifts against the real vsync (59.94 vs 60, plus rAF jitter). That gives frames with 0 or 2 physics steps, which show up as micro-hitches the overlay can't see.
- Every scene repeats its own `setFPS`.
- Refresh detection reruns on every Play (about 0.5 s).
- Registry keys are untyped strings.
- The stats window is a fixed 240 frames, but engine.md §10.1 says a rolling 2 s window.

**Files:**
- Create: `core/registry-keys.ts`, `core/step-stats.ts` (+ spec), `scenes/physics-rate.ts`
- Modify: `game-events.ts`, `boot.scene.ts`, `sandbox.scene.ts`, `create-game.ts`, `dev-overlay.component.*`

**Interfaces (Produces):**
```ts
export class StepStats { recordFrame(stepsThisFrame: number): void; readonly offStepFrames: number; }
export function applyDetectedPhysicsRate(scene: Phaser.Scene): number;
```
- `StepStats.offStepFrames` is the session total of frames whose step count is not exactly 1.
- `applyDetectedPhysicsRate` reads `refreshHz` through the typed registry, calls `physics.world.setFPS`, and returns the Hz.
- `PerfSample` gains `offStepFrames: number`, and the overlay shows it as "off-step".
- **Typed registry access:** `registry-keys.ts` exports typed get/set helpers for `bridge`, `options`, `zoom` and `refreshHz`. All scenes and `create-game` use them, and there are no bare string keys left.
- **Refresh detection** runs once per page session. The detected Hz is cached in a module-level variable in `bootstrap/`, and later games reuse it. `BootScene` skips sampling when a cached value exists.
- **Stats window:** `FrameStats` is created with capacity `ceil(2 × refreshHz)`, which gives the rolling 2 s window.
- **Step counting:** each frame, the scene records how many world steps ran. Count `worldstep` events between `preupdate` events, or read `physics.world.stepsLastFrame` if it exists in 3.90 (check the source). Feed the count into `StepStats`. Nothing per frame allocates.

- [ ] **Step 1: Failing tests:**
  - `StepStats` counts only frames with 0 or ≥ 2 steps, and starts at 0.
  - The `FrameStats` capacity follows `2 × refreshHz`: create one at 144 Hz and check the window length.
  - The refresh cache returns the stored value on a second lookup.
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test`, `npm run build` and `npm run e2e` pass.
- [ ] **Step 5:** Run prettier, then commit with `feat(engine): shared physics rate, step stats, typed registry`.

### Task 5: Test room in Phaser

**Files:**
- Create: `player.ts`, `pip-placeholder.ts`, `placeholder-tiles.ts`, `test-room.scene.ts`, `test-room.ts`, `level-manifest.ts`
- Modify: `game-factory.token.ts`, `create-game.ts`, `boot.scene.ts`, `game-shell.component.ts`, `main-menu.component.html`

**Interfaces:**
- Consumes: everything from Tasks 2–4, and the Phase 1 `GameBridge` and `GameOptions`.
- Produces:
```ts
export interface GameOptions { quality: QualityLevel; devTools: boolean; initialStageId: StageId; }  // field added
export const STAGE_SCENES: Readonly<Record<StageId, string>> = { sandbox: 'SandboxScene', 'test-room': 'TestRoomScene' };
export class Player {
  constructor(scene: Phaser.Scene, x: number, y: number, tuning: MovementTuning, input: () => ActionState, isSolidTile: (tx: number, ty: number) => boolean);
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  readonly controller: PlayerController;
  destroy(): void;
}
```
- **`test-room.ts` exports `TEST_ROOM_ROWS: readonly string[]`.** It is 15 rows by about 160 columns. Legend: `.` empty, `#` ground, `B` brick, `?` star block, `S` start (empty, start marker). It contains, in order:
  - flat run-up
  - 1, 2, 3 and 4-tile steps
  - a 2-tile gap, a 3-tile gap and a 4-tile gap (the 4-tile gap needs a running jump)
  - a low ceiling corridor with block edges to test the corner nudge
  - a coin-height block row at 4 tiles
  - a staircase
  - a long runway to judge top speed
- **`TestRoomScene`:**
  - builds the tilemap with `make.tilemap({ data, tileWidth: 16, tileHeight: 16 })` using the placeholder tileset, `setCollision` on solids, and a collider between Pip and the layer
  - calls `applyDetectedPhysicsRate(this)` (Task 4) instead of its own `setFPS` call
  - sets the camera zoom to N (default origin), with the vertical view locked to the top 240px
  - keeps a `viewLeft` number. Each frame it sets `viewLeft = nextCameraScrollX(viewLeft, ...)` and applies it with `camera.centerOn(viewLeft + LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)`, never by assigning `scrollX`
  - follows the same zoom path as Sandbox: registry `changedata-zoom` re-applies the zoom and re-centres
  - clamps Pip with `clampToCameraLeft(…, viewLeft)`
  - updates the camera after physics in the frame (e.g. on scene `postupdate`), so Pip and the view never disagree by a step
  - respawns Pip at `S` when Pip falls below the level
  - emits `perfSample` as in the Sandbox scene, with `activeBodies` filled in
  - handles `applyTuning` with `player.controller.setTuning`
  - calls `releaseAll()` on game `blur` and on document `visibilitychange`
  - unregisters every listener on `shutdown`
- **`Player`:**
  - Body size and offset come from `PLAYER_SMALL_BODY`, with `allowGravity = false`.
  - On each `physics.world` `worldstep`:
    1. Read the contacts from `body.blocked`.
    2. Call `controller.step(input(), contacts, 1 / physicsHz)`.
    3. If `vy < 0`, apply `cornerNudge` to `sprite.x`.
    4. `body.setVelocity(controller.bodyVx, controller.bodyVy)`.
    5. Set `flipX` from `facing`.
  - Remove the listener in `destroy`.
  - Phase 1 confirmed that `worldstep` fires after integration and collider separation, so `body.blocked` is current there. A velocity set on `worldstep` drives the **next** step. Give the body zero acceleration and drag, and keep `allowGravity = false`.
- **Session and routing:** `GameSessionService.attach` passes `initialStageId` from the route param. `GameOptions` lives in `src/game-engine/core/game-factory.ts`. `BootScene` starts `STAGE_SCENES[initialStageId]`, and emits `recoverableError` for an unknown id. The main-menu Play link goes to `['/play', 'test-room']`.
- **`GameCommand`** gains `| { type: 'applyTuning'; tuning: MovementTuning }`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm run build` succeeds, and `npm test` and `npm run e2e` pass. Update the e2e specs to the `test-room` stage.
- [ ] **Step 3:** Manual check on `npm start`:
  - The steps, gaps and corridor all play.
  - The overlay shows `physicsHz` equal to the monitor's refresh rate.
  - Pip never jitters against the scrolling camera.
- [ ] **Step 4:** Run prettier, then commit with `feat(game): playable test room with Pip controller`.

### Task 6: Live tuning panel

**Files:**
- Create: `tuning-panel.component.{ts,html,css}`, `format-tuning.ts`
- Test: `format-tuning.spec.ts`, `tuning-panel.component.spec.ts`
- Modify: `game-shell.component.html`, `game-shell.component.ts`

**Interfaces:**
- Consumes: `MovementTuning`, `DEFAULT_MOVEMENT`, and `GameSessionService.send`.
- Produces:
  - `formatTuningAsConfig(tuning: MovementTuning): string`, which returns a paste-ready `export const DEFAULT_MOVEMENT: MovementTuning = { ... };` block with each number written exactly.
  - `TuningPanelComponent`: OnPush, output `tuningChange: MovementTuning`.

- [ ] **Step 1: Failing tests:**
  - `formatTuningAsConfig(DEFAULT_MOVEMENT)` contains `walkMaxSpeed: 93.75,` and `launchSpeed: 300,`, and evaluating the object literal portion with `new Function` gives back a deep-equal object.
  - The panel component test: changing the `walkMaxSpeed` input to `100` emits a tuning with `walkMaxSpeed: 100` and every other value unchanged.
- [ ] **Step 2:** `npm test` fails.
- [ ] **Step 3: Implement the panel.**
  - **Layout:** a dev-only collapsible panel on the left side, toggled with **F2** through a key-filtered host binding (`(document:keydown.code.F2)`). It has a labelled number input and range slider per scalar field, and per-tier inputs for the jump tiers.
  - **Actions:** **Reset to defaults**, and **Copy as config**, which writes `formatTuningAsConfig` output to `navigator.clipboard`.
  - **Wiring:** each change is sent as `applyTuning`.
  - The panel keeps its state in a signal, so values survive closing and reopening it. They do **not** persist across reloads; that's intentional, because the copied config is the source of truth.
- [ ] **Step 4:** `npm test` passes. Manual check: changing walk max speed in the panel changes Pip's top speed immediately.
- [ ] **Step 5:** Run prettier, then commit with `feat(dev): live movement tuning panel`.

### Task 7: Phase 2 review handoff

- [ ] **Step 1:** Run `npm test`, `npm run e2e` and `npm run build`. All three must be green. Record the overlay numbers in the test room while running the full length: FPS, avg, p95, long frames, off-step frames, refresh and physics Hz. Record the Phaser chunk's gzip size. The dev machine's display is 60Hz, so list 120/144Hz as unmeasured unless the owner measures them.
- [ ] **Step 2:** Present the Phase 2 review checklist from `docs/plan.md` with those numbers. Ask the owner to tune with the panel and paste the "Copy as config" output. Commit it as the new `DEFAULT_MOVEMENT`, after re-running the tests: apex tests derive from the config, so update their expected values from the new tiers using `apex = launch² / (2·holdGravity)`.
- [ ] **Step 3:** Mark Phase 2 "In review" in `docs/plan.md`. After sign-off, write `docs/plans/phase-3-art-and-1-1.md`.
