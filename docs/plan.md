# Pip's Delivery — Build Plan (Roadmap)

_2026-10-22 · Implements [`design.md`](design.md) and [`engine.md`](engine.md) under the rules of [`../game.md`](../game.md)._

The game is built in **8 phases**. Every phase ends with a **browser review by the owner**. The next phase does not start until the owner has played the build and signed off, or asked for changes.

Each phase has its own detailed task plan in [`plans/`](plans/). Detailed plans are written **just before a phase starts**, so they include what was learned in the previous review. Phases 1 and 2 are detailed now.

| #   | Phase                                                | Detailed plan                                                              | Status                 |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------- |
| 1   | Skeleton                                             | [`plans/phase-1-skeleton.md`](plans/phase-1-skeleton.md)                   | Done                   |
| 2   | Pip's feel                                           | [`plans/phase-2-feel.md`](plans/phase-2-feel.md)                           | Built, review deferred |
| 3   | Art pipeline + World 1-1                             | [`plans/phase-3-art-and-1-1.md`](plans/phase-3-art-and-1-1.md)             | Built, review deferred |
| 4   | Enemies, power-ups, rules                            | [`plans/phase-4-enemies-and-rules.md`](plans/phase-4-enemies-and-rules.md) | Built, review deferred |
| 5   | Sound and music                                      | [`plans/phase-5-sound-and-music.md`](plans/phase-5-sound-and-music.md)     | Built, review deferred |
| 6   | Angular shell + saves                                | [`plans/phase-6-shell-and-saves.md`](plans/phase-6-shell-and-saves.md)     | Built, review deferred |
| 7   | Rest of World 1                                      | written after Phase 6 review                                               | —                      |
| 8   | Mobile, performance, polish, **GitHub Pages deploy** | written after Phase 7 review                                               | —                      |

## How a review works

1. I tell you the build is ready and how to open it. That's normally `npm start`, then http://localhost:4200, or `npm run preview` for the production build.
2. You work through the phase's **review checklist**: what to try, and what "good" looks like.
3. The dev overlay (press **`` ` ``**) shows FPS, frame times and long frames throughout, so performance is visible at every review, not just at the end.
4. You tell me what feels wrong or what to change. Fixes happen before the next phase starts.

---

## Phase 1: Skeleton

**Builds:**

- Angular 22 app with a hash router, main menu and a lazy-loaded game screen
- Phaser 3.90 created and destroyed correctly
- the typed Angular↔Phaser bridge
- refresh-rate detection and integer pixel scaling
- the dev overlay, with a sandbox scene to measure
- Playwright lifecycle tests
- a GitHub Pages-ready build (workflow file present, not yet deployed)

**Review checklist:**

- The menu says **PIP'S DELIVERY** and has **Play**. Play opens the game screen with an animated sandbox scene, and **Menu** returns.
- Doing Play → Menu 20 times quickly gives no errors in the console, and the game never shows twice.
- The dev overlay shows about 60 FPS (or your monitor's rate), a p95 frame time close to the frame budget, and 0 long frames.
- Resizing the window keeps pixels sharp, with no blur or shimmer.
- `npm run preview` (the production build) behaves the same.

**Measured (2026-10-22, dev build, headed Chromium 156, NVIDIA RTX 3050 Laptop, 60Hz display, 10s run):**

| Viewport  | FPS  | avg ms | p95 ms | Long frames | Refresh / physics Hz | Canvas    |
| --------- | ---- | ------ | ------ | ----------- | -------------------- | --------- |
| 1280×720  | 59.9 | 16.68  | 16.80  | 0           | 60 / 60              | 1296×720  |
| 1920×1080 | 59.9 | 16.68  | 16.80  | 0           | 60 / 60              | 2160×1200 |

Initial bundle 228.9 kB (62.7 kB transfer). Phaser is in the lazy `game-shell-routes` chunk, 1.21 MB (266.5 kB transfer). Heap growth over 20 Play/Menu cycles was 1.57 MB (limit 5 MB). 120/144Hz displays have not been measured yet.

## Phase 2: Pip's feel

**Builds:**

- the pure-TypeScript Pip controller with SMB1-based values (walk, run, skid, variable jump by speed tier, coyote time, jump buffering, corner nudging, SMB1 air rules)
- keyboard and gamepad input
- a test room with steps, gaps, ceilings and blocks
- the forward-only camera
- a placeholder Pip sprite
- the **live tuning panel**
- an automated test proving jumps are identical at 60, 120 and 144Hz

**Review checklist:**

- Walk and run feel weighty. Reversing makes Pip skid.
- A tap jump is short and a held jump is high, about 4 tiles. A running jump is higher, about 5 tiles, and longer.
- Walking off a ledge and pressing jump a moment late still jumps. Pressing jump just before landing jumps on landing.
- Hitting a ceiling corner slides Pip past it instead of stopping dead.
- The camera never scrolls back.
- Use the tuning panel until it **feels like Mario**, then "Copy as config". Those values become the defaults.
- After moving the window to a monitor with a different refresh rate, reload the page. The detected rate is cached per page session.

**Measured (2026-10-22, dev build, headed Chromium, RTX 3050 Laptop, 60Hz display, 60s running right in the test room):**

| FPS  | avg ms | p95 ms | Long frames | Off-step frames     | Refresh / physics Hz |
| ---- | ------ | ------ | ----------- | ------------------- | -------------------- |
| 59.9 | 16.68  | 16.80  | 0           | 6 (about 1 per 10s) | 60 / 60              |

Phaser chunk: 1.11 MB raw, 243 kB transfer (arcade-only build). Initial bundle: 235 kB. Heap growth over 20 Play/Menu cycles: 1.66 MB. 174 unit tests and 8 e2e tests pass.

**Known item for the review:** each off-step frame is a frame where physics ran 0 or 2 steps. That happens because the fixed step at the snapped rate drifts against the display's real refresh, and it can show up as a rare micro-hitch. The planned fix is delta snapping: quantise the delta Arcade sees to whole steps and carry the remainder. It is not in yet. 120/144Hz has not been measured.

## Phase 3: Art pipeline + World 1-1

**Builds:**

- the build-time sprite pipeline: pixel grids → atlas, tilesets and palette swaps
- the procedural scenery generator: sky, clouds, mountains, hills and bushes as layered WebP at 720p and 1440p
- the parallax renderer
- the level format and validator
- final small-Pip animations (idle, walk, run, skid, jump, fall, goal-grab; plus a death frame), with two palette-swap outfits
- the full original 1-1 layout with star blocks, bricks, coins, tubes (non-enterable for now) and the goal post
- the HTML HUD (score, coins, world, time, lives), fed by `hudChanged` events on change

**Scope notes (built without a review):**

- Scenery is lossless WebP from an in-repo encoder, so no `sharp` and no new dependencies. Build scripts run on Node's built-in TypeScript type stripping.
- Big-Pip (16×32) frames moved to Phase 4, where the Parcel Box first uses them.
- The coin, block-bump and goal-sequence basics are in: Postmarks are collectable, and the DELIVERED! banner stands in for the results screen. Death, lives and the time-out stay in Phase 4.
- Open items for the combined review are in [`plans/deferred-review.md`](plans/deferred-review.md).

**Review checklist:** 1-1 looks like the approved direction, with crisp pixel gameplay in front of rich layered scenery. The scenery never makes Pip or hazards hard to read. 1-1 is playable start to finish. The dev overlay holds 60fps while running through the whole stage.

## Phase 4: Enemies, power-ups, rules

**Builds:**

- **Enemies:** Thornbug, Shellback (kickable shell), Flapjack and Snapvine, with camera-triggered spawning and pooling
- **Power-ups:** Parcel Box, Spark Stamp (parcel throwing), Rush Star and Green Stamp
- **Big Pip** (16×32) frames, plus the grow/shrink and death animations (moved from Phase 3)
- **Rules:** damage and shrink, death, the checkpoint, scoring with stomp combos, the timer, lives, and goal-height points
- the HUD wired to bridge events

**Scope notes (built without a review):**

- Enemies, items and parcels are pure actors stepped with Pip's physics step. Only Pip has an Arcade body (`engine.md` §4.3).
- Also built: big-Pip crouch, brick breaking, a hidden block, a multi-coin brick, score pop-ups, the checkpoint post, and the goal time-bonus tally.
- Game over is a simple GAME OVER banner with Retry (the `restart` command) and Menu. Phase 6 builds the real results and map flow.
- The Rush Star is shown with a tint cycle; its music is Phase 5.
- Open items for the combined review are in [`plans/deferred-review.md`](plans/deferred-review.md).

**Review checklist:** a full 1-1 run that feels like real SMB1 gameplay. Stomps, shells, power-ups, deaths and checkpoint respawn all work. HUD numbers update correctly. No frame drops in busy moments.

## Phase 5: Sound and music

**Builds:**

- the 4-channel chiptune synth at build time
- every sound effect in `design.md` §5
- music for the overworld, star power, stage clear, game over and menu, with the remaining themes' music written here too
- an audio manager with master, music and SFX volume

**Scope notes (built without a review):**

- Audio is FLAC (mono, 24 kHz, 12-bit) from an in-repo encoder instead of WAV + MP3, so `lamejs` isn't needed. All 36 sounds come to 4.2 MB; a stage loads about 1.7 MB.
- One app-lifetime Web Audio engine is owned by Angular's `AudioService`. Phaser's own sound is off and scenes play cues through the `GameAudio` port. The menu has music.
- Each stage theme has a hurry variant at 1.3× tempo. At 100 time units left a warning plays, then the hurry loop.
- A pit death now waits 2.8 s like a hit death, so the death jingle always finishes.
- The pause chime, the volume UI and the menu-move, tube and boss-hit sounds are built but not reachable until Phases 6 and 7.
- Open items for the combined review are in [`plans/deferred-review.md`](plans/deferred-review.md).

**Review checklist:** every action has a satisfying sound. The music is catchy and original. Audio starts correctly after the first click or keypress (browser autoplay rules). There is no audio crackle or frame hitch when sounds play.

## Phase 6: Angular shell + saves

**Builds:**

- **Screens:** main menu, world map with stage nodes, pause overlay and results screen
- **Settings:** volumes, key rebinding, quality, reduced motion and screen shake
- **Saves:** the save service with validation, migration and backup recovery
- **Progression:** stars (finish, Postmarks, target time), best score and time, coins balance, XP and rank

**Scope notes (built without a review):**

- Routes: `#/` menu, `#/map`, `#/play/:stageId`, `#/settings`. Achievements and the shop stay in Phase 7.
- The world map reads World 1 from `content/manifests/world-manifest.ts`. 1-2 to 1-4 show as locked, then "SOON" once the stage before is cleared, until Phase 7 adds their levels to the level manifest.
- Menus work with the mouse, arrow keys and a gamepad (d-pad/stick, A, B, Start). Pause comes from the pause key, gamepad Start, a pause button or hiding the tab; the overlay has Resume, Restart, World map and music/effects volume.
- Settings apply at the next stage load; only volumes change live. Low quality drops the bushes layer, sparkles, half the brick debris and cloud drift. Screen shake waits for Phase 7's boss.
- Saves: `pip.save` (schema 1) with `pip.save.backup` as the last good save; corrupt saves recover from the backup, then start fresh, with a notice on the menu.
- Initial bundle 243 kB raw (67 kB transfer); Phaser stays lazy.
- Open items for the combined review are in [`plans/deferred-review.md`](plans/deferred-review.md).

**Review checklist:**

- The loop menu → map → 1-1 → results → map works smoothly.
- Progress survives a page reload.
- Corrupting the save in devtools recovers gracefully.
- Rebinding keys works.
- Low quality visibly reduces effects.
- Pausing and resuming doesn't recreate the game.

## Phase 7: Rest of World 1

**Builds:**

- 1-2 underground, 1-3 sky with moving platforms, and 1-4 castle with lava, firebars and the **Rook King** boss
- each stage theme's scenery and tiles
- enterable delivery tubes and the bonus room
- achievements and their screen
- the cosmetic shop with Pip outfits
- the story intro screen

**Review checklist:** play the whole world. Each stage teaches a new idea, and the boss is readable and fair. The boss fight holds 60fps. The shop and achievements work and are saved.

## Phase 8: Mobile, performance, polish, deploy

**Builds:**

- touch controls with multi-touch
- the full profiling pass and `docs/perf-report.md` (average and p95 frame time, long frames, memory after 20 restarts, load times, high-refresh check)
- fixes for whatever the measurements show
- final polish from earlier reviews
- **deployment to GitHub Pages.** The owner provides the account, repo name and visibility at this phase. A public repo is needed for free Pages.

**Review checklist:**

- Play on a phone and on desktop.
- Read the performance report and check its targets against `engine.md` §10.
- Play the live GitHub Pages URL.
