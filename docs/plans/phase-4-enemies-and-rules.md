# Phase 4: Enemies, Power-ups, Rules — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Tick each step as it lands and note any deviation inline under its task.

**Goal:** a full 1-1 run plays like SMB1. Thornbugs, Shellbacks (kickable shells), Flapjacks and Snapvines spawn as the camera reaches them. Star blocks and bricks hold Parcel Boxes, Spark Stamps, a Rush Star, a hidden Green Stamp and a multi-coin brick. Pip grows, shrinks with invulnerability frames, throws parcels, dies, respawns at the checkpoint, runs out of lives, and scores stomp combos, goal-height points and a time bonus. The HUD follows every change through `hudChanged`.

**Architecture:** every rule is a pure, Vitest-tested module. Enemies, power-ups and parcels are **pure kinematic actors** (an AABB swept against the collision grid), owned by one pure `StageActors` world that is stepped on Arcade's `worldstep` event with the same `dt` as Pip. `StageActors` spawns from a camera-driven `SpawnSchedule`, runs every allowed overlap pair (Pip↔enemies, Pip↔items, parcels↔enemies, shells↔enemies, enemies↔enemies for turning) and reports outcomes through an `ActorEvents` sink that `LevelScene` implements with bound methods (no per-step allocation). Phaser glue only draws: pooled sprites mirror actor slots each frame, and frame names come from pure selectors. Pip keeps his Arcade body and his midpoint-velocity controller. `PipPower` (form, transitions, invulnerability, star), `DeathSequence`, `CheckpointTracker`, `ScoreChain`, `goalHeightPoints` and `TimeTally` are pure too.

**Tech Stack:** Phase 3 stack. **No new dependencies.**

**Spec:** `docs/design.md` §3.1, §4 (stomp bounce), §6, §7 (lives). `docs/engine.md` §4.1, §4.3, §4.5, §7. Builds on `phase-3-art-and-1-1.md`.

## Global Constraints

- Phase 1–3 Global Constraints still apply (midpoint-velocity Pip controller per world step, whole-number view left, no per-frame allocation, emit on change only, Node-imported files use erasable TypeScript only).
- **Only Pip has an Arcade body.** Actors are pure rectangles stepped per world step (`dt = 1 / world.fps`) with midpoint gravity, so they behave the same at 60, 120 and 144Hz. This extends Phase 3's "no physics bodies besides Pip" decision. Active actors are added to the overlay's `activeBodies` count. Budget: ≤ 40.
- **Pools are fixed at stage start:** 12 enemy slots, 4 power-up slots, 2 parcels, 8 score pop-ups, 8 brick-debris pieces, plus the Phase 3 effect pools. A spawn that finds no free enemy slot waits for one.
- **Spawning:** an enemy wakes when its column is within one column of the view's right edge, and is freed when it falls out of the level or is more than 4 tiles behind the view's left edge. Spawns behind the starting view (checkpoint respawn) never wake.
- **All Pip frames are 16×32.** Small frames are drawn 16×16 and padded at the top by the pipeline, so the sprite never changes size and its feet stay on the frame's bottom edge. Body: small 12×14 at (2, 18), big 12×26 at (2, 6).
- **World freeze:** grow, shrink, Spark-up and death freeze actors and the timer (SMB rule). Pip is scripted during the freeze.
- **Bridge:** new events `checkpoint`, `playerDied` and `gameOver`. `HudState` gains `power`. The time bonus is tallied in 8-unit chunks every 80ms, so the HUD updates at 12.5Hz during the tally, never per frame.

## Decisions made without the owner (review later)

- Pure kinematic actors instead of Arcade bodies for enemies, items and parcels (see Global Constraints).
- **Movement values** (per second, SMB-derived): enemy walk 30, shell 180, enemy gravity 1350, enemy max fall 240, Parcel Box slide 60, Rush Star bounce 300 (gravity 900), parcel 240 with a 200 bounce (gravity 1800), stomp bounce 210 (holding jump keeps hold gravity, so a held stomp bounces higher).
- **Score ladder:** 100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000, then 1UP. Stomps start at 100 and reset on landing. Each moving shell keeps its own chain starting at 500. Rush Star kills share a chain starting at 100. Kick 400, parcel or bump kills 100 (Thornbug) or 200 (others), brick 50, power-up 1000, coin 200 (Phase 3), Postmark 1000 (Phase 3).
- **Goal height:** fraction of the pole above Pip's feet at the grab: ≥ 0.92 → 5000, ≥ 0.62 → 2000, ≥ 0.38 → 800, ≥ 0.16 → 400, else 100. Time bonus 50 per remaining unit.
- **Power-ups:** a power block gives a Parcel Box when Pip is small and a Spark Stamp otherwise. A Spark Stamp taken while small goes straight to Spark. Damage while big or Spark goes to small, with 2s of invulnerability (flicker). Rush Star lasts 10s, with a slower flash in the last 2s. It is shown with a tint cycle instead of extra palette frames.
- **Enemies:** Thornbug walks and turns at walls and at other enemies. Shellback walks; a stomp makes a shell that revives after 5s (peeks at 3.8s). Touching a resting shell kicks it away from Pip. A stomp stops a moving shell. Flapjack flies left with a vertical bob; a stomp clips its wings and it becomes a walker. Snapvine rises from its tube every few seconds, stays down while Pip is within 1.5 tiles of the tube centre, and can't be stomped. A bumped block knocks out enemies standing on it and hops items.
- **Death and lives:** small-Pip damage, a pit and the time-out kill. A hit death freezes for 0.5s, then hops and falls off-screen (2.8s total). A pit death waits 1.2s. Each death costs a life. With lives left, the stage restarts (`scene.restart`) at the checkpoint if it was reached, keeping score, coins and collected Postmarks. At 0 lives `gameOver` is emitted and the shell shows GAME OVER with Retry (the `restart` command) and Menu. Phase 6 builds the real results and map flow.
- **Checkpoint:** one per stage, a visible post (`checkpoint/down`, `checkpoint/up`). Passing it raises the pennant and emits `checkpoint`.
- **Blocks:** level `item-block` entities put contents on `?`, `B` or the new hidden-block symbol `h`. Multi-coin bricks give coins until 4s after the first hit (at most 10), then become used. Big Pip breaks plain bricks (4 pooled debris pieces). Hidden blocks are invisible and non-solid until Pip's head enters them while rising.
- **Big-Pip crouch:** down on the ground while big shrinks the body to small height and ignores left/right. Pip stays crouched until down is released and there is headroom.
- **Score pop-ups** are atlas frames rendered at build time from a 3×5 pixel font (`score/100` … `score/8000`, `score/1up`).

## Review Focus

1. **Stomp vs side hit.** A falling Pip whose feet are within 8px of an enemy's top stomps; anything else is a hit. Test: `StageActors › stomps when falling onto an enemy`, `› hurts Pip on a side touch`.
2. **Kicking a shell you just made.** Stomping a Shellback must not instantly kick the shell. Test: `StageActors › a fresh shell ignores Pip briefly`.
3. **Stomp combo.** Consecutive stomps without landing climb the ladder and reach 1UP. Test: `ScoreChain`.
4. **Damage while invulnerable.** No second hit during the 2s flicker. Test: `PipPower › ignores damage while invulnerable`.
5. **Time-out at the goal.** Touching the pole stops the clock, so the timer can't kill Pip during the goal sequence. Test: `StageSession › stops the clock`.
6. **Respawn spawns.** After a checkpoint respawn, enemies behind the view never wake. Test: `SpawnSchedule › skips spawns behind the start view`.
7. **Restart leaks.** `scene.restart` must not stack listeners: every `once` handler is removed in clean-up.

---

## File Structure

```
src/asset-pipeline/pixel-grid.ts                         + padGridTop(), overlayGrid(), rotateGrid()
src/asset-pipeline/pixel-font.ts                         3×5 glyphs → outlined PixelGrid (score pop-ups)
src/content/art/pip-sprites.ts                           + big Pip frames, Spark palette
src/content/art/enemy-sprites.ts                         Thornbug, Shellback, Flapjack, Snapvine
src/content/art/item-sprites.ts                          + Parcel Box, Spark Stamp, Rush Star, Green Stamp, parcel, checkpoint
src/content/art/atlas-frames.ts                          + PipLook, big frames, EnemyFrame, power-up/score/checkpoint frames
src/content/art/art-sources.ts                           packs everything above
src/content/levels/world-1/stage-1-1.ts                  enemies, block contents, hidden 1-up, checkpoint, Snapvine tubes
src/game-engine/configuration/actors.config.ts           enemy, power-up and parcel tuning
src/game-engine/configuration/rules.config.ts            power, death, stomp, crouch, pool sizes
src/game-engine/configuration/scoring.config.ts          + ladder, enemy points, goal bands, tally
src/game-engine/configuration/physics.config.ts          + PLAYER_BIG_BODY, PLAYER_CROUCH_BODY
src/game-engine/core/game-events.ts                      + PowerForm, checkpoint/playerDied/gameOver, HudState.power
src/game-engine/entities/actors/actor-body.ts            ActorBody, moveThroughTiles(), fallStep(), overlaps()
src/game-engine/entities/enemies/enemy.ts                Enemy slot (pure state machine per kind)
src/game-engine/entities/enemies/spawn-schedule.ts       SpawnSchedule
src/game-engine/entities/power-ups/power-up.ts           PowerUp slot
src/game-engine/entities/projectiles/parcel.ts           Parcel slot
src/game-engine/systems/actors/stage-actors.ts           StageActors (pools, spawning, interactions)
src/game-engine/systems/animation/actor-frames.ts        enemyFrame(), powerUpFrame(), parcelFrame()
src/game-engine/systems/animation/pip-animation.ts       + selectPoweredAnimation()
src/game-engine/systems/power/power-state.ts             PipPower
src/game-engine/systems/power/crouch.ts                  nextCrouching()
src/game-engine/systems/rules/death-sequence.ts          DeathSequence
src/game-engine/systems/checkpoints/checkpoint.ts        CheckpointTracker
src/game-engine/systems/scoring/score-chain.ts           ScoreChain
src/game-engine/systems/scoring/goal-scoring.ts          goalHeightPoints(), TimeTally
src/game-engine/systems/scoring/stage-session.ts         + run totals, lives, power, time conversion
src/game-engine/systems/effects/effect-curves.ts         + scorePopOffset(), debrisOffset(), flicker/tint helpers
src/game-engine/world/level-format.ts                    + enemy, item-block, checkpoint entities, hidden symbol, Snapvine tubes
src/game-engine/world/level-compiler.ts                  + spawns, block contents, hidden blocks, checkpoint
src/game-engine/world/level-validator.ts                 + enemy, item-block and checkpoint rules
src/game-engine/world/block-contents.ts                  BlockContents (items, multi-coin, hidden)
src/game-engine/world/block-hits.ts                      blockHitOutcome() with contents and form
src/game-engine/entities/player/player-controller.ts     + bounce(), stopRising()
src/game-engine/entities/player/player.ts                forms, body sizes, crouch, throw pose, flicker, tint, scripted poses
src/game-engine/scenes/level.scene.ts                    rules orchestration
src/game-engine/scenes/level/actor-sprites.ts            pooled sprites for actor slots
src/game-engine/scenes/level/score-popups.ts             pooled score pop-ups
src/game-engine/scenes/level/block-effects.ts            + brick debris
src/game-engine/scenes/level/gameplay-animations.ts      animation keys per look and form
src/game-engine/scenes/perf-sampler.ts                   counts actors in activeBodies
src/app/core/services/game-session.service.ts            + gameOver signal
src/app/features/game-shell/game-shell.component.*       GAME OVER banner with Retry and Menu
```

---

### Task 1: Pipeline helpers and art

**Files:** `pixel-grid.ts`, `pixel-font.ts`, `src/content/art/*` + specs.

- [x] **Step 1 (TDD):** `padGridTop`, `overlayGrid`, `rotateGrid`; pixel font renders outlined text at the expected size.
- [x] **Step 2:** big Pip frames (idle, walk ×3, run ×3, skid, jump, fall, crouch, goal-grab, throw) and the Spark palette; small frames padded to 16×32 in the atlas.
- [x] **Step 3:** enemies (Thornbug walk ×2 + squashed, Shellback walk ×2 + shell + peek, Flapjack fly ×2 + walk ×2, Snapvine open + closed), power-ups (Parcel Box, Spark Stamp ×2, Rush Star ×2, Green Stamp), parcel ×4 (rotations), checkpoint ×2, score frames.
- [x] **Step 4 (TDD):** every grid has its declared size and only palette symbols; every frame name is unique in the atlas.

_Done. The helper is `rotateGridClockwise`. Power-ups have their own palette file (`power-up-sprites.ts`); the Spark Stamp and Rush Star "glint" frames are palette swaps, not new grids. Flapjack has its own squashed frame. Shellback art faces left; the sprite flips when it walks right. The Rush Star has no face, so it doesn't echo a familiar design. A 3× atlas preview (gitignored `tmp/`) was checked by eye._

### Task 2: Level format, compiler, validator

**Files:** `level-format.ts`, `level-compiler.ts`, `level-validator.ts`, `block-contents.ts`, `block-hits.ts` + specs.

- [x] **Step 1 (TDD):** validator: enemies in bounds on empty cells, known kinds; item blocks only on `?`/`B`/`h` with valid items (multi-coin on `B` only), no duplicates; at most one checkpoint, on ground, between start and goal.
- [x] **Step 2 (TDD):** compiler: enemy spawns sorted by column (Snapvines from tubes), block contents, hidden blocks, checkpoint cell.
- [x] **Step 3 (TDD):** `BlockContents` (item lookup, multi-coin window and cap, hidden reveal) and `blockHitOutcome` with contents and Pip's form.

_Done. The checkpoint post claims the two cells above the ground at its column. `hiddenBlockOutcome` pays a coin from an empty hidden block._

### Task 3: Actor physics and enemies

**Files:** `actor-body.ts`, `enemy.ts`, `spawn-schedule.ts`, `power-up.ts`, `parcel.ts`, `actors.config.ts` + specs.

- [x] **Step 1 (TDD):** `moveThroughTiles` lands on floors, stops at walls and ceilings, falls through gaps; `fallStep` midpoint gravity with max fall.
- [x] **Step 2 (TDD):** Thornbug walk and wall turn; Shellback stomp → shell → revive; kick and moving-shell wall bounce; Flapjack bob and wing clip; Snapvine cycle and shyness; knocked-out fall and free.
- [x] **Step 3 (TDD):** `SpawnSchedule` wakes by view right edge, skips spawns behind the start view, waits when the pool is full.
- [x] **Step 4 (TDD):** power-up emerge, slide, star bounce, bump hop; parcel bounce, wall burst, off-view free.

_Done. Parcels burst straight away (an event) instead of holding a burst state; the scene shows the burst with the existing sparkle pool. `moveThroughTiles` resolves one tile per axis per step, which is enough because `dt` is capped and no actor moves more than 8px a step._

### Task 4: Interactions

**Files:** `stage-actors.ts`, `score-chain.ts` + specs.

- [x] **Step 1 (TDD):** `ScoreChain` ladder and 1UP; reset.
- [x] **Step 2 (TDD):** `StageActors`: stomp (bounce, award), side hit (hurt), star kill, shell kick and grace, moving shell kills with its own chain, parcel kills, enemies turn on each other, block bump knocks enemies and hops items, item collection, despawn behind the view, two-parcel cap.

_Done. Hot loops use index loops, not `for...of`, so stepping never creates iterators. Two moving shells knock each other out._

### Task 5: Pip rules

**Files:** `power-state.ts`, `crouch.ts`, `death-sequence.ts`, `checkpoint.ts`, `goal-scoring.ts`, `stage-session.ts`, `rules.config.ts`, `scoring.config.ts`, `player-controller.ts` + specs.

- [x] **Step 1 (TDD):** `PipPower`: grow, Spark-up, shrink + invulnerability, death when small, star timer, display form during transitions.
- [x] **Step 2 (TDD):** `nextCrouching`, `DeathSequence` (hit and pit), `CheckpointTracker`.
- [x] **Step 3 (TDD):** `goalHeightPoints` bands, `TimeTally` chunks; `StageSession` run totals, lives, 1-ups, time-up, time conversion, power in HUD.
- [x] **Step 4 (TDD):** controller `bounce()` and `stopRising()`; the 60/120/144Hz jump test stays green.

_Done. A time-out death uses the hit hop. `StageSession` now takes run totals (score, coins, lives) and the collected Postmark count, so a restart carries them._

### Task 6: Phaser glue and LevelScene

**Files:** `player.ts`, `gameplay-animations.ts`, `actor-sprites.ts`, `score-popups.ts`, `block-effects.ts`, `level.scene.ts`, `perf-sampler.ts`, `test-room.scene.ts`, `game-events.ts`.

- [x] **Step 1:** Player forms and body sizes (feet kept), crouch, throw pose, bounce, flicker and star tint, scripted death and transition poses.
- [x] **Step 2:** actor sprites and score pop-ups from pools; brick debris; checkpoint post.
- [x] **Step 3:** LevelScene: actors on `worldstep`, block contents and hidden blocks, brick breaking, power-ups, throwing, damage, death, lives, checkpoint respawn via `scene.restart`, time-out, goal-height points and the time tally, game over, the `restart` command.
- [x] **Step 4:** clean-up removes every listener on shutdown (restart-safe).

_Done. Deviations and findings:_

- _A headless smoke run (gitignored `tmp/`, with a temporary `window` hook on the scene, since reverted) drove grow, brick break, crouch, Spark throwing, shrink, the Rush Star, the hidden block, the checkpoint, a pit respawn, a time-out death, GAME OVER, Retry and the goal tally. It found two bugs, both fixed: clean-up crashed on restart because the Arcade plugin nulls `physics.world` on shutdown before the scene's handler runs (the scene now keeps its own world reference), and the hidden-block Green Stamp was collected the moment it appeared because the Pip probe was refreshed before the block pushed Pip down (the probe now updates after hidden blocks, and items can't be taken while emerging, as in SMB)._
- _The world stays frozen from a death's start until the restart, so a time-out can't start a second death in the frame the restart is queued._
- _`Player.beginScripted` copies the body's position to the sprite, because a disabled body skips Arcade's `postUpdate` and the frame's movement would otherwise be lost. Body resizes mid-frame (crouch) shift `prev`/`prevFrame` too, so the feet stay put._
- _`setDepth` is only called when the depth changes, because Phaser re-sorts the display list on every call._
- _`activeBodies` in the perf sample now adds the active actors to Arcade's bodies._

### Task 7: 1-1 content

**Files:** `stage-1-1.ts`, `level-manifest.spec.ts`.

- [x] **Step 1:** place enemies, block contents, the hidden Green Stamp, a multi-coin brick, a Rush Star brick, two Snapvine tubes and the checkpoint.
- [x] **Step 2 (TDD):** the 1-1 spec asserts every enemy kind appears, every item kind is placed, and there is one checkpoint.

_Done. 1-1 now has 16 placed enemies (12 Thornbugs, 2 Shellbacks, 2 Flapjacks) plus Snapvines in the tubes at columns 57 and 173. Power blocks at (15, 9), (74, 9), (105, 5) and (168, 9); a multi-coin brick at (72, 9); a Rush Star brick at (101, 9); a hidden Green Stamp at (62, 9); the checkpoint at column 97, about halfway to the goal._

### Task 8: Angular

**Files:** `game-session.service.ts`, `game-shell.component.*`, HUD specs.

- [x] **Step 1 (TDD):** the session service exposes `gameOver`, cleared on `loadComplete`.
- [x] **Step 2 (TDD):** the shell shows GAME OVER with the score, Retry (sends `restart`) and Menu.

_Done. `LevelScene` handles `restart` with a fresh run. The HUD shows nothing new; `HudState.power` is there for Phase 6 and achievements._

### Task 9: Verify and document

- [x] `npm test` passes (477 tests). `NG_CLI_ANALYTICS=false npm run build` succeeds (asset generation and both validators run in `prebuild`).
- [x] `docs/plans/deferred-review.md` Phase 4 section; Phase 3 deferred bullets ticked.
- [x] `docs/plan.md` status and plan link; `docs/engine.md` §4.3 notes pure actors.
- [x] Prettier on changed files only.
