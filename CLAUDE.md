# Pip's Delivery

An original browser platformer that **plays and feels like Super Mario Bros. (NES, World 1-1)**. Its hero is **Pip the courier**, and it has crisp pixel-art gameplay in front of rich, high-resolution, layered scenery. Built with Angular 22 and Phaser 3.90, and deployed as a static site to GitHub Pages.

The owner's top priorities, in order: **a measured, stutter-free frame rate**, with 60fps as the floor and the display's full refresh rate where it is higher (no 60fps cap), then **excellent look and feel**.

## Read first

| Doc                       | Authority on                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `game.md`                 | Architecture and performance rules. Applies in full and is never contradicted.              |
| `docs/design.md`          | What the game is: look, feel, sound, content, progression.                                  |
| `docs/engine.md`          | How it is built: rendering, timing, systems, pipeline, bridge, saves, perf budget, hosting. |
| `docs/plan.md`            | Phase roadmap and review checklists.                                                        |
| `docs/plans/phase-N-*.md` | Detailed task plan for the current phase.                                                   |

## How work proceeds

- Work happens **one phase at a time** (`docs/plan.md`). Each phase ends with a **browser review by the owner**, using that phase's checklist plus the dev-overlay numbers. The next phase does not start until the owner signs off.
- A phase's detailed plan is written in `docs/plans/` **just before the phase starts**, using what was learned in the previous review. Mark the phase status in `docs/plan.md`.
- Execution uses subagent-driven development: one task at a time, with a review after each task.
- **Deployment target is GitHub Pages.** The code lives in the **private** GitHub repo `purkayasta/super-piper`. Free Pages needs a public repo, so ask about visibility in Phase 8. Keep the build Pages-ready (relative base-href, hash routing, `workflow_dispatch` workflow). Never deploy without asking.

## Hard rules

- **Boundaries (`game.md` §3):** Angular owns menus, navigation, overlays, saves and settings. Phaser owns everything per-frame. They talk only through the typed `GameBridge` (`src/game-engine/core/game-events.ts`), via `GameSessionService`. **Never emit bridge events or update signals every frame.** Emit on change only. Perf samples go out every 250ms, and only with dev tools on.
- Phaser may be imported only in `src/game-engine/bootstrap/**`, `scenes/**`, and the Phaser glue classes, such as `entities/player/player.ts`. Keep logic pure and Vitest-testable. Phaser stays out of the initial bundle and is loaded only by the play route.
- **Rendering:** logical view 432×240. Canvas `432N × 240N` with N a whole number, `N = ceil(min(h/240, w/432) × dpr)` (quality caps low 3, medium 4, high 6). `pixelArt` and `roundPixels` on. The canvas element's final fit to the window is smooth (`image-rendering: auto`, sharp scaling). The camera keeps its default origin and is positioned with `centerOn`. Scenery textures use linear filtering. No full-screen post-processing.
- **Physics:** Arcade, stepped at the detected display refresh rate. All tuning is in per-second units in `configuration/*.config.ts`. The player controller runs per world step and hands Arcade **midpoint velocity**. Jumps must match within 1px at 60, 120 and 144Hz, and a test enforces this.
- **No per-frame allocation** in update paths. Use pools for short-lived objects. Collision callbacks stay short.
- **Original IP only:** no Nintendo sprites, music, names or exact level layouts. Art and audio are generated in code at build time, and every asset is referenced by a stable manifest ID so it can be swapped later.
- No React, Three.js, Rapier, NgRx or 3D engines. Runtime dependencies are Angular and `phaser` only.
- Don't claim a performance target is met until it has been measured. Record the measurements.

## Code style (owner preferences)

- **No explanatory `//` comments.** Make code self-explanatory through naming and extraction. Comment only a genuinely hidden _why_, such as a browser or Phaser quirk or a timing rule.
- File names follow `game.md` §2: `*.component.ts` and `*.service.ts`. Use `ng generate ... --type=component` and similar.
- Angular uses standalone components, OnPush, signals, zoneless change detection and lazy routes.
- Before every commit, run `npx prettier --write` on **changed files only**, and include the result in the commit. Never reformat untouched files.
- Write tests first (TDD) for pure logic.
- **Never `git commit` without the owner's explicit permission**, even where a plan says "commit". Leave changes uncommitted, show what changed, and ask. Subagents must not commit either.
- **Git:** remote `origin` is `github.com/purkayasta/super-piper` (private). Only `development` is pushed. Phase branches stay local and are merged into `development` before a push. **Ask before every push**, and never force-push.
- **Branches (once git exists):** each phase has its own branch (`phase-N-<name>`) taken from `development`. Phase branches merge into `development`. `development` merges into `main` only when everything is done. **Ask before every merge.**

## Commands

| Command               | Purpose                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `npm start`           | Dev server at http://localhost:4200 (dev tools on)                                   |
| `npm run preview`     | Production build served at http://localhost:4300. Add `/?dev=1#/...` for the overlay |
| `npm test`            | Angular unit-test builder (Vitest)                                                   |
| `npx vitest run`      | Run Vitest directly; use `npm test` for Angular TestBed specs                        |
| `npm run e2e`         | Playwright lifecycle, memory and resize tests                                        |
| `npm run build:pages` | GitHub Pages build                                                                   |

**In-game dev keys:** backtick toggles the perf overlay, and **F2** toggles the movement tuning panel.

## Environment notes

- Windows 11. Set `NG_CLI_ANALYTICS=false` when running the Angular CLI non-interactively, or it hangs on a prompt.
- Never kill all `node.exe` processes. Stop specific PIDs only.
- `.superpowers/` holds brainstorm mockups, including the approved Pip/world mockup `hero-and-world.html`. It is gitignored.
