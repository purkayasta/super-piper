# Phase 7: Rest of World 1 — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Tick each step as it lands and note any deviation inline under its task.

**Goal:** the whole of World 1 is playable from the map. 1-2 is an underground cellar, 1-3 is a sky course on moving platforms, and 1-4 is a castle with lava, firebars and the **Rook King**. Each stage has its own tileset and scenery, generated at build time and loaded only by the stage that needs it. Delivery tubes can be entered (down on top of a tube that leads somewhere), and one tube in 1-1 leads to a hidden bonus room. Achievements unlock from gameplay events and are saved, with their own screen. A cosmetic shop sells Pip outfits for the coin balance (rank unlocks give two more), and the equipped outfit is worn in game. A short story intro is shown once, can be skipped, and can be replayed from the menu.

**Architecture:** every rule is pure and Vitest-tested; Phaser glue only draws and wires. **Moving platforms** are pure (`MovingPlatforms`): each platform's position is a function of accumulated step time, so it is identical at any refresh rate. They are one-way (solid from above only). A pure `PlatformRider` lands Pip on a platform with a swept test against the platform's own motion, carries him by the platform's step delta, and reports ground contact. It runs inside Pip's world-step hook, after the platforms have stepped (the platform step is registered on `worldstep` before Pip's), so the controller sees the contact on the same step. **Firebars** are pure geometry (`Firebars`): angle = start + speed × time, segment centres written into preallocated typed arrays, and a circle-versus-box test for Pip; their sprites are a fixed pool built at stage start. **Lava** is a hazard tile layer drawn in front of Pip; touching it is a pit death. **The Rook King** is a pure state machine (`RookKing`) with a pooled projectile (`RookStone`), owned by a pure `BossFight` that locks the camera to the arena, resolves Pip, stomps and parcels, and opens the arena gate when he falls. **Screen shake** is a pure, integer camera offset that respects the setting and reduced motion. **Tubes** use pure `findEnterableTube` and `TubeTransition`. A stage may have **sub-areas** (the bonus room); a tube links to a named tube in an area, and moving between areas restarts the scene with the run, clock, power and stats carried over. **Achievements, the shop and the story flag** are Angular-owned (`game.md` §3, §7): pure rules in `app/core/utilities/`, root services over `SaveService`, and lazy screens. Phaser only reports facts: `milestone` and `bossDefeated` events, and run stats inside `stageComplete`.

**Tech Stack:** Phase 6 stack. **No new dependencies.**

**Spec:** `docs/design.md` §3.2 (theme scenery), §6 (stages, tubes, moving platforms, lava, firebars, Rook King, story), §7 (achievements, shop). `docs/engine.md` §2.2, §3, §4, §5, §6, §7, §8. `game.md` §3, §5, §6, §7. Builds on `phase-6-shell-and-saves.md`.

## Global Constraints

- Phase 1–6 Global Constraints still apply (midpoint-velocity Pip controller per world step, whole-number view left, no per-frame allocation, emit on change only, Node-imported files use erasable TypeScript only, Phaser only in bootstrap, scenes and glue, the initial bundle Phaser-free, no explanatory comments).
- **Everything that moves steps with Pip's `dt`.** Platforms, firebars, the boss and its stones advance per world step (`dt = 1 / world.fps`), so they match at 60, 120 and 144Hz. A test rides a platform at all three rates.
- **Only Pip has an Arcade body.** Platforms, firebar segments, the boss and stones are pure shapes; their sprites mirror them each frame from fixed pools.
- **Per-stage loading.** A stage's manifest entry lists the atlas and the tilesets of every area it contains; the scene queues the scenery of each area's theme for the current quality. Nothing else loads.
- **Bridge:** new events `milestone` (rare: once per kind per run) and `bossDefeated`. `stageComplete` and `gameOver` carry `stats` (hits taken, finish power, boss stomp hits, whether the boss fell). `GameOptions.outfit` sends the equipped outfit. No new per-frame traffic.
- **Saves:** schema stays at version 1. New optional field `flags.introSeen` (default false); `achievements` now keeps known IDs only; outfits are validated against the catalogue. Purchases, equips and unlocks write immediately.

## Decisions made without the owner (review later)

- **Stage ideas (introduce, test, twist).** 1-2 _Cellar Sorting_: low brick ceilings and tight corridors where shells ricochet, plus a ceiling route over the wall (run on top of the cellar). 1-3 _Updraft Heights_: moving platforms over bottomless gaps — horizontal shuttles first over safe ground, then over gaps, then vertical lifts, then a chain of both with Flapjacks. 1-4 _Rook's Keep_: lava pits and firebars that move on a clock (wait, then go), then the Rook King.
- **Moving platforms** are one-way: Pip can jump up through them and lands only from above. They carry Pip by their own movement (never his jump: SMB rule). Paths are back-and-forth with a cosine ease (`travel`, `period`, `phase` in level data). Enemies ignore platforms. When Pip lands, his offset to the platform is snapped to a whole pixel so he never shimmers against it.
- **Firebars:** 4–6 balls 8 px apart around a used block, one revolution every 2.4–3 s. The hit test uses a 3 px radius per ball against Pip's body (smaller than the 8 px art), which reads as fair.
- **Lava** kills like a pit (SMB rule) and is drawn in front of Pip, so he sinks into it. Its surface animates by tile swaps every 160 ms.
- **The Rook King** (original: a crowned crow-knight in a stone tower cloak, not a Bowser-like). 6 health: a stomp takes 2, a parcel takes 1. Pattern loop: pace → hop toward Pip → pace → throw → pace → throw → pace → hop. Every attack is telegraphed: a 0.5 s crouch before a hop, a 0.65 s flashing wind-up before a throw (shorter, 0.35 s and 0.45 s, once he is at half health, when he also throws two stones). After a hit he flashes for 1 s, cannot be hurt, and hops away from Pip. Touching him otherwise hurts Pip; the Rush Star makes the touch harmless both ways. When he falls, the boss music stops, the gate on the arena's right wall crumbles, the camera unlocks and the castle theme returns; the goal pole stands past the gate.
- **The boss arena** is exactly one view wide, ending at the gate column. The camera stops scrolling when the arena fills the view, and the fight (and the boss music) starts then.
- **Screen shake:** 2 px for 0.25 s when the Rook King lands, 3 px for 0.5 s when he falls. Only when the screen-shake setting is on and reduced motion is off. Offsets are whole pixels.
- **Tubes:** press down while standing on a tube that leads somewhere, with Pip's centre over the tube's inner 24 px. Pip sinks for 0.8 s (drawn behind the tube), the area changes, and he rises out of the destination tube for 0.8 s. The tube sound plays on both. The clock keeps running in a bonus room (SMB rule), and power, score, coins, lives, Postmarks and the checkpoint carry over. Dying anywhere restarts the main area.
- **Bonus room:** the tube at 1-1 column 34 leads to an underground coin room; its exit tube returns Pip to the tube at column 161, past the middle of the stage. Bonus rooms have no goal, no Postmarks and no checkpoint.
- **Achievements (17):** First Delivery, Bag Recovered (beat the Rook King), Route Complete (clear all four), Stamp Collector (all Postmarks in a stage), Postmaster (all 12 in World 1), Beat the Clock (a time star), Three-Star Service, Perfect Route (all 12 stars), Untouchable (clear without being hit), Combo Courier (an 8-stomp chain), Shell Shock (5 knockouts from one shell), Secret Cellar (find the bonus room), Return to Sender (beat the Rook King with parcels only), Spark Delivery (finish as Spark Pip), Piggy Bank (hold 300 coins), Fresh Threads (buy an outfit), Senior Courier (reach that rank). Unlocks show on the results screen and as a small toast in game.
- **Outfits:** Courier (default), Forest 100, Mint 150, Midnight 200, Sunset 250 coins; Royal is unlocked by reaching Courier rank and Golden by Express Courier rank. A purchase deducts coins at once; an outfit never goes away. Spark Pip keeps its own look (it is a power signal).
- **Story:** three short pages ("The Stolen Bag"). Play opens the story the first time, then the map. Skip goes straight to the map. The menu has Story to replay it.
- **Screens:** `#/achievements`, `#/shop`, `#/story`, all lazy. The main menu gains Shop, Achievements and Story.

## Review Focus

1. **Platform riding at 60/120/144Hz.** Standing, walking, jumping off, landing on a rising platform and jumping up through one. Test: `platform-riding.spec.ts`.
2. **Firebar geometry.** Segment positions at a given time, direction, and the hit test. Test: `Firebars`.
3. **Boss fairness.** Every attack has a telegraph; no damage during the hurt window; stomp vs side touch; the camera lock and gate. Test: `RookKing`, `BossFight`.
4. **Tube entry rules.** Only on top, centred, grounded, pressing down, and only tubes that lead somewhere. Test: `findEnterableTube`, `TubeTransition`.
5. **Level validation** of platforms, firebars, the boss arena, lava, tube links and bonus rooms. Test: `level-validator.spec.ts`.
6. **Achievement rules** and **shop rules** (price, rank unlocks, equip). Test: `achievement-rules.spec.ts`, `shop-rules.spec.ts`.
7. **Restart leaks:** the extra pools and world-step listeners are removed on shutdown.

---

## File Structure

```
src/game-engine/world/level-format.ts                + areas, tube links, platform/firebar/boss entities, lava and gate symbols
src/game-engine/world/level-validator.ts             + area roles, tube links, new entity rules
src/game-engine/world/level-compiler.ts              compileArea(); goal optional; platforms, firebars, boss, lava
src/game-engine/world/tile-ids.ts                    + lava surface ×3, lava, gate
src/game-engine/world/hazard-field.ts                lava contact (pure)
src/game-engine/systems/platforms/moving-platforms.ts   MovingPlatforms, PlatformRider
src/game-engine/systems/hazards/firebars.ts          Firebars
src/game-engine/systems/effects/screen-shake.ts      ScreenShake
src/game-engine/systems/tubes/tube-travel.ts         findEnterableTube, TubeTransition
src/game-engine/systems/scoring/run-stats.ts         RunStats tracker, milestones
src/game-engine/entities/bosses/rook-king.ts         RookKing state machine
src/game-engine/entities/bosses/rook-stone.ts        RookStone projectile
src/game-engine/systems/bosses/boss-fight.ts         BossFight (arena, gate, interactions)
src/game-engine/configuration/stage-objects.config.ts   platform, firebar, lava, tube tuning
src/game-engine/configuration/boss.config.ts         Rook King tuning
src/game-engine/audio/music-director.ts              + boss track
src/game-engine/scenes/level/platform-sprites.ts     pooled platform images
src/game-engine/scenes/level/firebar-sprites.ts      pooled firebar segment images
src/game-engine/scenes/level/boss-sprites.ts         Rook King and stone images
src/game-engine/scenes/level.scene.ts                areas, tubes, platforms, hazards, boss, shake, outfit, stats
src/content/art/theme-tiles.ts                       underground, sky and castle tilesets
src/content/art/boss-sprites.ts                      Rook King and stone grids
src/content/art/stage-object-sprites.ts              platforms, firebar balls
src/content/art/pip-sprites.ts                       + outfit palettes
src/content/art/scenery-layers.ts                    per-theme layer specs with generator and detail flag
src/asset-pipeline/scenery/*.ts                      cavern, crystals, motes, sunset, cloud sea, towers, pillars, embers
src/content/cosmetics/outfit-catalogue.ts            prices, rank unlocks, titles
src/content/levels/world-1/stage-1-2.ts, stage-1-3.ts, stage-1-4.ts, bonus-1-1.ts
src/content/manifests/level-manifest.ts              1-2..1-4, per-stage assets
src/app/core/models/achievement.model.ts             definitions
src/app/core/utilities/achievement-rules.ts          unlock rules
src/app/core/utilities/shop-rules.ts                 buy, equip, rank unlocks
src/app/core/services/achievement.service.ts
src/app/core/services/cosmetics.service.ts
src/app/features/achievements/*, character-shop/*, story/*
```

---

### Task 1: Level format, validator, compiler

- [ ] **Step 1 (TDD):** tile ids for lava and the gate; legend symbols `~` (lava surface), `=` (lava), `g` (gate).
- [ ] **Step 2 (TDD):** validator: platforms (bounds, width 2–4, path in bounds, period, phase, empty start cells), firebars (solid anchor, 2–8 balls, speed), at most one boss (on ground, inside a one-view arena that ends at a gate column of `g`, goal past the gate), tube ids unique, tube links resolve to an exit tube in an existing area, bonus rooms (no goal, Postmarks, checkpoint or boss; at least one way out).
- [ ] **Step 3 (TDD):** compiler: `compileArea` for the main area and sub-areas; platforms, firebars, boss arena, lava cells, tube ids and links.

### Task 2: Pure systems

- [ ] **Step 1 (TDD):** `MovingPlatforms` and `PlatformRider`; riding, jumping off, landing on a rising platform and jumping up through, all within 1px at 60/120/144Hz.
- [ ] **Step 2 (TDD):** `Firebars` geometry and hit test; `HazardField` lava contact.
- [ ] **Step 3 (TDD):** `ScreenShake`; `findEnterableTube`; `TubeTransition`.
- [ ] **Step 4 (TDD):** `RookKing` (pattern, telegraphs, hop, throw, hurt window, defeat) and `RookStone`; `BossFight` (camera lock, start, stomp vs touch, parcels, star, gate, events).
- [ ] **Step 5 (TDD):** `MusicDirector` boss track; `stageSoundIds` for areas and the boss; `StageSession` clock carry; `RunStats` and milestones.

### Task 3: Art and pipeline

- [ ] **Step 1:** theme tilesets (underground, sky, castle) and lava and gate tiles for every theme.
- [ ] **Step 2:** atlas: platforms, firebar balls, the Rook King and his stone, four new outfits.
- [ ] **Step 3:** per-theme scenery layers and generators; quality skips detail layers.
- [ ] **Step 4 (TDD):** art and manifest specs (sizes, palettes, unique frames, every theme has every tile and its scenery).

### Task 4: Levels

- [ ] **Step 1:** 1-2, 1-3 and 1-4 layouts (original), the 1-1 bonus room and its tubes.
- [ ] **Step 2 (TDD):** level specs: each validates, uses its theme and teaching elements; the manifest lists per-stage assets.

### Task 5: LevelScene and Phaser glue

- [ ] **Step 1:** areas and tube travel; platforms (world-step order) and their sprites.
- [ ] **Step 2:** lava layer and contact; firebars and their sprites.
- [ ] **Step 3:** the boss fight, camera lock, gate, screen shake, boss music and SFX.
- [ ] **Step 4:** outfit, run stats, milestones, `bossDefeated`; clean-up removes the new listeners.

### Task 6: Angular

- [ ] **Step 1 (TDD):** achievement definitions and rules; `AchievementService`.
- [ ] **Step 2 (TDD):** outfit catalogue and shop rules; `CosmeticsService`; save validation of outfits, achievements and flags.
- [ ] **Step 3:** achievements, shop and story screens (specs); menu, results and shell wiring; routes.

### Task 7: Verify and document

- [ ] `npm test` passes; `NG_CLI_ANALYTICS=false npm run build` succeeds; bundle sizes recorded.
- [ ] `deferred-review.md` Phase 7 section; earlier deferred bullets ticked; `docs/plan.md` status and link; `engine.md` notes.
- [ ] Prettier on changed files only.
