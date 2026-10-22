# Pip's Delivery — Engine & Technical Design

*2026-10-22*

This is the authority on **how the game is built**. It makes [`../game.md`](../game.md) (architecture and performance rules, which still apply in full) concrete for the game described in [`design.md`](design.md). The build order is in [`plan.md`](plan.md).

Anything marked *(builder's call)* was decided during design without the owner. It can be changed if measurement or real use says otherwise.

## 1. Stack

| Area | Choice |
|---|---|
| App shell | **Angular 22**: standalone components, zoneless change detection, signals, OnPush, lazy-loaded routes |
| Game engine | **Phaser 3.90** (latest 3.x; `game.md` requires Phaser 3), Arcade Physics |
| Language | TypeScript, strict mode |
| Unit tests | Vitest (Angular's default runner) |
| Browser tests | Playwright (Chromium; mobile emulation for touch) |
| Build-time asset tools | Node scripts run with `tsx`; `sharp` for PNG/WebP encoding; a small pure-TS synth and `lamejs` for audio *(builder's call)* |
| Hosting | GitHub Pages via GitHub Actions; fully static, no server |

No runtime dependencies beyond Angular and Phaser. No NgRx, React, Three.js or Rapier.

The workspace lives at the repo root, `C:\Users\Home\source\repos\mario`, following the layout in `game.md` §2. Create folders only when they're needed.

## 2. Rendering

### 2.1 Resolution and scaling
- **Logical view:** 432×240 world pixels, which is 27×15 tiles of 16px at a 1.8:1 aspect ratio. Level design assumes this view.
- **Canvas size:** 432N × 240N, where **N is a whole number**: `N = clamp(ceil(min(h/240, w/432) × devicePixelRatio), 1, cap)`, using the game host's CSS width and height. The cap depends on quality: Low ≤ 3 (1296×720), Medium ≤ 4 (1728×960), High ≤ 6. Taking the smaller of the two ratios keeps half-screen and 16:10 windows from drawing a canvas 2–3× larger than they need. The camera zooms by N, so inside the canvas every gameplay pixel is exactly N×N canvas pixels.
- N is recomputed on window resize and when `devicePixelRatio` changes, for example when the window moves to a monitor with a different scale.
- **Sharp scaling (owner decision, Phase 1):** `Scale.FIT` fits the canvas to the window, usually as a small downscale. Phaser's `pixelArt` puts `image-rendering: pixelated` on the canvas element. That is overridden to `auto` after boot, so this final fractional fit is smooth instead of nearest-neighbour. The result fills the window with no shimmer and no uneven pixels, and an exact fit stays pixel-perfect.
- **No camera jitter:** `roundPixels` floors the camera's `scrollX` and each sprite's x separately. The view's left edge is therefore kept a whole number (`floor(floor(playerX) − lead)`), and `centerOn` makes `scrollX = viewLeft − 216·(N−1)`, which is also whole. Pip's screen offset then stays constant. This relies on an even sprite frame size with a centred origin, and no camera `setBounds` or `startFollow`.
- **Camera:** keep the default origin (0.5), so Phaser's `worldView`, bounds and culling maths stay correct. Position the view with `camera.centerOn(viewLeft + 216, 120)`. Never assign `scrollX` to the view's left edge: at zoom N they differ by `216·(N−1)` px.
- `pixelArt: true` gives nearest-neighbour filtering inside the canvas by default. `roundPixels: true` prevents sub-pixel shimmer. WebGL is used where supported, with Canvas as the fallback (`Phaser.AUTO`).

### 2.2 Two visual layers, one camera
- **Gameplay layer:** tilemap, sprites, particles. Nearest-neighbour filtering, 16px world units.
- **Scenery layer:** high-resolution images with **linear filtering** set per texture. Each is placed in world space at scale `1/k`, where k is the scenery's resolution multiple. The camera's zoom of N therefore shows them at native resolution. Parallax comes from `scrollFactor` per layer.
- Two scenery resolution sets are generated: **720p** for Low and Medium, and **1440p** for High. Only the set matching the quality setting is loaded.
- Horizontal layers are tileable strips rendered as TileSprites or recycled Images; which one is decided by measurement *(builder's call)*. The sky is one gradient image.
- **Overdraw budget:** at most 5 scenery layers. Each layer except the sky is mostly transparent. Scenery uses no blend modes and no shaders.

### 2.3 Draw cost rules
- One shared gameplay atlas for Pip, items, enemies and effects, plus one tileset per stage theme.
- Static level geometry is a single tilemap layer, never one game object per tile.
- Particles use pre-created emitters with capped counts per quality level.
- No full-screen post-processing. The screen shake is a camera offset.

## 3. Simulation and timing

- **Phaser's single game loop.** No second loop.
- **No frame-rate cap (owner decision).** Rendering follows the display's refresh rate. 60fps is the floor, not the target, and a 120 or 144Hz display runs at 120 or 144fps.
- **Arcade Physics steps at the display's refresh rate.** During boot, about 30 raw `requestAnimationFrame` deltas (`game.loop.rawDelta`, not the smoothed `delta`) are measured. Their median is snapped to the nearest supported rate (60, 75, 90, 100, 120, 144, 165 or 240Hz), then `world.setFPS(rate)` is called.
- **Arcade step order (Phaser 3.90):** `World.step` integrates the bodies, separates the colliders, then emits `worldstep`. A velocity set on `worldstep` therefore drives the *next* step.
- Every tuning value is stored in **per-second units**, converted from the px/frame-at-60Hz table in `design.md` §4. This means a 120Hz display gets twice as many smaller steps rather than choppy motion.
- **Feel consistency is enforced by test.** The Pip controller is pure TypeScript and can be simulated without Phaser. A unit test asserts that jump apex height and jump distance at 60, 120 and 144 steps per second match within 1px.
- If that test cannot pass, the fallback is a fixed 60Hz simulation with render interpolation for Pip, enemies and the camera. *(This is the one known technical risk, and it is tested in Phase 2, not left until the end.)*

## 4. Gameplay systems

### 4.1 Pip controller
- Arcade body for tile collision only. Gravity is disabled on the body, and the controller applies its own state-dependent gravity: low while rising with jump held, high otherwise. It also applies acceleration, skid, max speeds, jump impulse by speed tier, coyote time, jump buffering and corner nudging, using the values in `movement.config.ts` and `physics.config.ts`.
- An explicit state machine: ground, air, skid, crouch, grow/shrink, hurt, dead, goal, tube.
- The controller reads **abstract actions** (left, right, down, jump, run/throw, pause), never raw keys.

### 4.2 Input
- **Sources:** keyboard (rebindable, with bindings stored in settings), gamepad through Phaser's gamepad plugin, and touch.
- **Default keys:** move with Arrows/WASD; jump with Space, Z or K; run/throw with Shift, X or J; pause with Esc or Enter. *(Builder's call.)*
- **Touch:** on-screen buttons are drawn and handled inside Phaser with multi-touch pointers, not as DOM buttons, to keep latency low. They appear only on touch devices.

### 4.3 Enemies, items, projectiles
- **Spawning:** enemies are dormant until the camera's right edge reaches their spawn column (SMB1 behaviour). They despawn after falling out of the world or moving far behind the camera. This keeps active bodies low, at **≤ 40 at any time**.
- **Pooling:** shells, parcels (≤ 2), debris, score pop-ups and coin pops come from pools created at stage start.
- **Overlaps are limited to these pairs:** Pip↔enemies, Pip↔items, parcels↔enemies, shells↔enemies, plus every group against the tile layer. There are no others.
- Collision callbacks stay short. They set flags and emit events, and never allocate.

### 4.4 Camera
Forward-only follow with a small dead zone, clamped to the level bounds. No vertical follow in standard stages. Shake runs only on the boss, and only when enabled.

### 4.5 Allocation discipline
No per-frame arrays, closures or object literals in update paths. Vectors are reused. String formatting happens only when a value changes.

## 5. Levels and content

- **Authoring:** each stage is a TypeScript file in `src/content/levels/world-1/` containing:
  - ASCII tile rows with a legend
  - an entity list (enemies, items, Postmarks, checkpoint, tubes and their destinations, goal)
  - metadata: theme, music, time limit, target time
- **Compilation:** `validate-levels.ts` runs before every build and fails it on errors. It checks:
  - legend symbols are known
  - the stage has a start and a goal
  - tube destinations exist
  - each stage has exactly 3 Postmarks
  - entities sit inside the bounds
- At runtime, the level loader builds the Phaser tilemap from the compiled data with `make.tilemap({ data })`, keeping one static collision layer and an optional decorative layer.
- **Manifests:** `asset-manifest.ts` gives every asset a stable ID, path and theme. `level-manifest.ts` maps stage IDs to level modules and the asset IDs each one needs.

## 6. Asset pipeline (build time)

Assets are generated by scripts into `public/assets/generated/`, which is gitignored and regenerated in CI:

1. **Sprites:** `.ts` pixel grids plus named palettes are packed into the gameplay atlas (PNG + Phaser JSON) and the tilesets. Palette-swap variants for cosmetics and themed enemies are generated here.
2. **Scenery:** procedural generators produce gradient skies, fBm-noise cumulus clouds, layered mountain ridges with haze, rolling hills and bushes. Each layer is written as WebP at 720p and 1440p. Generation is seeded, so it is reproducible.
3. **Audio:** SFX parameter sets and music note data are rendered by a small 4-channel chiptune synth (two squares, triangle, noise). SFX are written as short WAV and music as MP3, both of which play on every browser including iOS Safari.
4. `validate-assets.ts` checks that every manifest ID resolves to a generated file and that every referenced ID exists in the manifest.

Hand-made art can replace any generated file by being placed at the manifest path. The generator then skips that ID.

## 7. Angular ↔ Phaser boundary

### 7.1 Ownership
| State | Owner |
|---|---|
| Positions, physics, enemies, per-frame anything | Phaser |
| Current-stage session (score, coins, time, lives, power state) | Phaser; mirrored to Angular only on change |
| Campaign progress, coins balance, stars, XP, rank, unlocks, cosmetics, achievements | Angular (`SaveService`, `ProgressionService`) |
| Settings, key bindings, quality | Angular (`SettingsService`); pushed to Phaser as commands |
| Navigation, menus, overlays | Angular |

### 7.2 Integration layer
- `game-engine/core/game-events.ts` defines:
  - a `GameCommand` discriminated union: `startStage`, `pause`, `resume`, `restart`, `quitToMap`, `applySettings`, `requestSnapshot`
  - a `GameEvent` union: `loadProgress`, `loadComplete`, `hudChanged` (score/coins/time/lives/power, emitted only on change; time once per in-game second), `checkpoint`, `stageComplete`, `playerDied`, `gameOver`, `bossDefeated`, `milestone`, `recoverableError`
- `GameSessionService` (Angular) is the only thing that touches the Phaser instance. It sends commands and exposes events as signals for templates.
- **Lifecycle:** `GameShellComponent` creates the Phaser game once in `afterNextRender` and calls `game.destroy(true)` in `ngOnDestroy`. Pause and results are overlays inside the shell. The game is paused, never recreated, while an overlay shows. Every scene unregisters its listeners and stops its timers, tweens and sounds on `shutdown`.

## 8. Routing and screens

- **Routes** use hash location for zero-config GitHub Pages deep links *(builder's call)*: `#/` menu, `#/map`, `#/play/:stageId`, `#/settings`, `#/achievements`, `#/shop`.
- Every feature is lazy-loaded. The Phaser bundle is only loaded by the play route.
- **UI rules:** plain HTML/CSS with the Press Start 2P font (self-hosted). Transitions use only transform and opacity. No large blur, shadow or filter effects.

## 9. Saves

- `localStorage` key `pip.save`, holding JSON with a `schemaVersion`.
- Typed validation on load, then migrations, then defaults for missing fields.
- The last good save is kept under `pip.save.backup`.
- **Recovery:** a corrupt save falls back to the backup, then to a fresh save, and the user sees a notice.
- **Timing:**
  - Write immediately on stage completion, purchase and achievement.
  - Debounce settings writes by 500ms.
  - Never write during the gameplay frame loop.

## 10. Performance budget and verification

**Baseline device:** the owner's Windows 11 desktop. Specs and display refresh rate are recorded in `docs/perf-report.md` in Phase 8.

| Metric | Target |
|---|---|
| Frame rate | At least 60fps, and the display's full refresh rate on high-refresh displays (no cap) |
| Average frame time (60Hz, representative stage, High) | ≤ 16.7ms with gameplay script ≤ 6ms |
| 95th-percentile frame time | ≤ 17.5ms |
| Long frames (> 50ms) during gameplay, counted over the whole session | 0 |
| Active physics bodies | ≤ 40 |
| JS heap growth after 20 stage restarts | < 5MB |
| Initial load to menu (broadband, cold cache) | < 3s |
| Stage load (assets cached) | < 1s, no gameplay hitch |

### 10.1 Dev overlay
Toggled with the backtick key, and available on the live site with `?dev=1` so reviews work there. It shows:
- FPS
- average and p95 frame time over a rolling 2s, measured from raw frame deltas
- long-frame count, as a session total so a hitch never ages out of view
- off-step frames: frames where the physics ran 0 or 2+ steps, a sign of drift between the step rate and the display's real refresh
- detected refresh rate and physics step rate
- active bodies and the size of each pool

### 10.2 Tuning panel
Dev-only, an HTML overlay. It edits movement and physics values live, and has "copy as config" to put the result back into the config files.

### 10.3 Automated checks
- **Vitest:** controller physics (including refresh-rate consistency), save validation, migration and recovery, level validation.
- **Playwright:**
  - boot → play → quit, 20 times, asserting exactly one canvas and bounded heap
  - a scripted run through 1-1
  - a touch-emulation smoke test
  - a console-errors check

## 11. Hosting

- A GitHub Actions workflow runs on every push to `main`:
  1. `npm ci`
  2. generate assets
  3. validate assets and levels
  4. tests
  5. `ng build --base-href /<repo>/`
  6. deploy to GitHub Pages
- Free for public repos. A private repo needs a paid GitHub plan for Pages.
- **Repo account, name and visibility are deliberately deferred by the owner.** From Phase 1 the build stays Pages-ready: the base-href is configurable, routing uses hash location, and the workflow file is in the repo. The owner is asked for the account and repo at the deploy phase in `plan.md`. Until then, reviews run on the local dev server and on a local production build.
