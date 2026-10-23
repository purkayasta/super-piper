# Repository instructions

Pip's Delivery is an original Angular 22 + Phaser 3.90 browser platformer. Read `game.md` first for binding architecture/performance rules, then `docs/design.md` for product decisions and `docs/engine.md` for implementation details. `docs/plan.md` identifies the active phase and review checklist; use its matching `docs/plans/phase-N-*.md` for task-level requirements.

## Build, test, and format

Requires Node 24+ and npm.

| Command                                                              | Purpose                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm start`                                                          | Generate/validate assets, then run Angular at `http://localhost:4200`.       |
| `npm run build`                                                      | Generate/validate assets, then production-build the app.                     |
| `npm run build:pages`                                                | Build with a relative base href for GitHub Pages.                            |
| `npm run assets`                                                     | Generate assets and validate asset and level manifests.                      |
| `npm test`                                                           | Run the package's configured Angular test command (`ng test --watch=false`). |
| `npx vitest run`                                                     | Run the Vitest suite directly.                                               |
| `npx vitest run src/game-engine/systems/actors/stage-actors.spec.ts` | Run one pure unit-test file; add `-t "test name"` to select one test.        |
| `npm run e2e`                                                        | Run Playwright browser tests (Chromium; server starts on port 4301).         |
| `npx playwright test e2e/lifecycle.spec.ts -g "test name"`           | Run one browser test.                                                        |
| `npm run preview`                                                    | Production-build and serve at `http://localhost:4300`.                       |
| `npx prettier --write <changed-files>`                               | Format only files changed for the task.                                      |

There is no lint script in `package.json`. `npm test` uses Angular's unit-test builder with Vitest and initializes Angular `TestBed`; `npx vitest run` invokes Vitest directly for tests that do not need that Angular setup. `vitest.config.mjs` configures direct runs for jsdom. In non-interactive Windows shells, set `NG_CLI_ANALYTICS=false` before invoking Angular CLI commands.

## Architecture

- Angular owns routes, menus, overlays, settings, saves, progression, achievements, and cosmetics. Phaser owns the per-frame world, movement, collisions, rendering, and temporary stage state.
- The only Angular↔Phaser interface is the typed command/event union in `src/game-engine/core/game-events.ts`, sent through `GameSessionService` and `GameBridge`. Send events only for state changes; never emit bridge events or update Angular signals every frame. Performance samples are the exception: every 250 ms, only with developer tools enabled.
- Keep game rules independent of Phaser wherever practical. Pure systems belong under `src/game-engine/systems/` or `entities/`, use per-second/per-step values from typed configuration, and should remain Vitest-testable. Phaser imports belong in bootstrap, scenes, and the narrow Phaser glue classes. Keep Phaser out of Angular's initial bundle; the play route loads it lazily.
- Content definitions and stable asset IDs live under `src/content/`. `level-manifest.ts` registers stages and their required assets; `asset-manifest.ts` registers generated files. Stage rows/entities are compiled and validated before builds. The Node asset scripts write generated output under `public/assets/generated/`; update source generators/manifests, not generated output.
- LevelScene is the Phaser integration point: it wires pure systems to sprites, physics, the bridge, and assets. Angular screens remain HTML/CSS rather than canvas UI.
- Rendering and timing are contractual: 432×240 logical view; integer canvas scale based on viewport and DPR; crisp pixel-art gameplay, linear-filtered scenery; no frame-rate cap. Arcade steps at detected display refresh, and Pip's controller supplies midpoint velocity. Preserve cross-refresh jump equivalence (within 1 px at 60/120/144 Hz) and avoid per-frame allocations; use pools for transient objects.

## Repository conventions

- Angular components are standalone, OnPush, zoneless, signal-based, and lazy-routed. Follow `*.component.ts` / `*.service.ts` naming and keep UI controls accessible HTML.
- Persist settings through `SettingsService`/`SaveService`; validate and default persisted fields in `src/app/core/utilities/save-validation.ts`. Settings are applied to Phaser at stage start through `GameOptions`; audio volume is owned by Angular's `AudioService`.
- Use abstract input actions (`left`, `right`, `jump`, etc.) rather than raw keys in gameplay. Keyboard bindings are stored as `KeyboardEvent.code`; gamepad mapping is centralized in `systems/input/actions.ts`.
- Source art and music are original and generated at build time. Use stable manifest IDs; do not add third-party game assets, copied melodies, or recognizable existing level layouts.
- Follow the one-phase-at-a-time workflow in `docs/plan.md`: implement the active phase, keep its plan/status current when requested by that workflow, and stop for the owner's browser review before starting the next phase. Do not claim performance targets without measurements.
- Do not commit, push, merge, or deploy without the owner's explicit permission. Deployment is a manually dispatched GitHub Pages workflow; never deploy without asking.
- Avoid explanatory `//` comments unless they explain a non-obvious browser/Phaser behavior or timing rule. Before committing, run Prettier on changed files only; never reformat untouched files.
