# Pip's Delivery

An original browser platformer that **plays and feels like Super Mario Bros. (NES, World 1-1)**. Its hero is **Pip the courier**. The gameplay is crisp pixel art in front of rich, high-resolution, layered scenery.

Built with **Angular 22** and **Phaser 3.90**, and shipped as a static site for GitHub Pages.

> All characters, art, music and level layouts are original. Nothing is taken from Nintendo. Art and audio are generated in code at build time, and each asset has a stable manifest ID so it can be swapped later.

## Goals

1. **A measured, stutter-free frame rate.** 60fps is the floor, and high-refresh displays run at their full rate (120/144Hz and up) with no cap. A dev overlay measures frame time, p95, long frames and physics stepping, so performance claims are checked rather than assumed.
2. **Excellent look and feel.** The movement is tuned to SMB1: acceleration, skid, speed-tiered jumps, coyote time, jump buffering and corner nudging. It feels identical at every refresh rate, and a test holds jumps to within 1px at 60, 120 and 144Hz.

## How it works

| Area | Approach |
|---|---|
| Split of responsibilities | Angular owns menus, overlays, saves and settings. Phaser owns everything per-frame. They talk only through a typed `GameBridge`, and only when something changes. |
| Rendering | A 432×240 logical view, drawn to a `432N × 240N` canvas with whole-number N. Pixels are crisp inside the canvas, and the final fit to the window is smooth, so nothing shimmers. |
| Physics | Arcade Physics steps at the detected display refresh rate. A pure TypeScript controller hands Arcade the exact midpoint velocity for each step. |
| Bundle | Phaser (the arcade-only build) loads only on the game route. The initial bundle is about 64 kB over the wire. |
| Quality | Pure logic is covered by Vitest unit tests. Playwright covers the lifecycle (20 Play/Menu cycles under 5 MB heap growth), resizing, DPI changes and scaling. |

Design docs: [`docs/design.md`](docs/design.md) (what the game is), [`docs/engine.md`](docs/engine.md) (how it is built), [`game.md`](game.md) (architecture rules).

## Progress

The game is built in 8 phases. Each one ends with a hands-on browser review. See [`docs/plan.md`](docs/plan.md).

| # | Phase | Status |
|---|---|---|
| 1 | Skeleton: app shell, Phaser lifecycle, bridge, integer scaling, refresh detection, dev overlay, e2e tests, Pages-ready build | ✅ Done |
| 2 | Pip's feel: SMB1-tuned controller, test room, forward-only camera, live tuning panel | 🔍 In review |
| 3 | Art pipeline + World 1-1 | ⏳ Planned |
| 4 | Enemies, power-ups, rules | ⏳ Planned |
| 5 | Sound and music | ⏳ Planned |
| 6 | Angular shell + saves | ⏳ Planned |
| 7 | Rest of World 1 | ⏳ Planned |
| 8 | Mobile, performance, polish, GitHub Pages deploy | ⏳ Planned |

Latest measurements (Phase 2, 60Hz laptop display, test room): 59.9 FPS, p95 16.8 ms, 0 long frames. Details are in [`docs/plan.md`](docs/plan.md).

## Running it

Requires Node 24+.

```bash
npm install
npm start            # dev server at http://localhost:4200 (dev tools on)
npm test             # unit tests (Vitest)
npm run e2e          # browser tests (Playwright, Chromium)
npm run preview      # production build at http://localhost:4300 (add /?dev=1#/play/test-room for the overlay)
npm run build:pages  # GitHub Pages build (relative base href)
```

**Controls:** arrow keys or A/D to move, Shift, X or J to run, Space, Z or K to jump. A gamepad also works.
**Dev keys:** backtick (`` ` ``) toggles the performance overlay, and **F2** toggles the movement tuning panel.
