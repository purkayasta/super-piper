# Phase 3: Art Pipeline + World 1-1 — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Tick each step as it lands and note any deviation inline under its task.

**Goal:** 1-1 is playable from start to goal post. Crisp, generated pixel art sits in front of rich, generated, layered parallax scenery, and an HTML HUD shows score, coins, world, time and lives.

**Architecture:** every asset is generated at build time by Node scripts (`scripts/*.ts`, run by Node's built-in TypeScript type stripping) from pure, Vitest-tested modules in `src/asset-pipeline/` and art definitions in `src/content/art/`. The output goes to `public/assets/generated/` (gitignored). `asset-manifest.ts` gives every file a stable ID, and Phaser texture keys are those IDs. Levels are ASCII rows plus an entity list. A pure compiler turns them into collision and decoration grids, and a pure validator fails the build on bad data. `LevelScene` loads the stage's manifest assets, builds one collision tilemap layer and one decoration layer, places parallax scenery, and runs block bumps, coins, Postmarks and the goal sequence. Every rule in those systems is a pure module. Angular renders the HUD from `hudChanged` bridge events, which are emitted only on change.

**Tech Stack:** Phase 2 stack. **No new dependencies.** PNG is encoded with a small in-repo encoder (deflate from `node:zlib` is passed in by the script). WebP is encoded with a small in-repo **lossless VP8L** encoder (subtract-green and predictor transforms, run-length backward references, length-limited canonical prefix codes). This replaces `sharp` from `engine.md` §1, because the owner prefers no new dependencies. TypeScript scripts run with `node --import ./scripts/register-ts-resolution.mjs`. The hook only adds `.ts` to extensionless relative imports, so `tsx` is not needed either.

**Spec:** `docs/design.md` §3, §6. `docs/engine.md` §2, §5, §6, §7. Builds on `phase-2-feel.md`.

## Global Constraints

- Phase 1 and 2 Global Constraints still apply.
- **Files the Node scripts import** (`src/asset-pipeline/**`, `src/content/art/**`, `src/content/levels/**`, `src/content/manifests/*`, `src/game-engine/world/level-*.ts`, `tile-ids.ts`, `physics.config.ts`) must use erasable TypeScript only: no enums, no parameter properties, no namespaces, and `import type` for every type-only import. They must not import Phaser, Angular or Node APIs.
- **Pixel art** is PNG with nearest filtering. Tilesets are extruded by 1px (margin 1, spacing 2) so integer zoom never bleeds neighbouring tiles.
- **Scenery** is lossless WebP, generated at two resolution multiples: k = 3 (`720p`, Low and Medium) and k = 6 (`1440p`, High). Each image is placed in world space at scale `1/k` with linear filtering. Only the set for the current quality loads.
- **Scenery layers (overworld):** sky (fixed), clouds (0.12, plus their own drift), mountains (0.22), hills (0.45), bushes (0.7). That is 5 layers, the `engine.md` §2.2 maximum. Scenery is lower in contrast and less saturated than gameplay art.
- **Parallax uses scroll factor 1 for every scenery image.** The image's world x is set each frame to `viewLeft + screenX`. This avoids Phaser's zoom-dependent offset for scroll factors other than 1 (`216·(N−1)`), and keeps camera culling correct. No allocation per frame.
- **No physics bodies besides Pip.** Coins and Postmarks are checked against Pip's body rectangle through a tile-cell lookup. Block bumps and coin pops use fixed pools that are created at stage start.
- **Level size:** standard stages are exactly 15 rows (no vertical scrolling). The view is 27 columns.
- **HUD:** `hudChanged` is sent only when a value changes. Time ticks once per in-game second, which is 400ms (SMB-like pacing, builder's call).

## Decisions made without the owner (review later)

- In-repo lossless WebP encoder instead of `sharp` (see Tech Stack).
- Big-Pip frames (16×32) are drawn in Phase 4, together with the power-up that uses them. Phase 3 delivers every small-Pip frame: idle, walk ×3, run ×3, skid, jump, fall, death and goal-grab, plus two palette-swap outfits (`forest`, `midnight`) to prove the swap pipeline.
- Falling into a pit respawns Pip at the start. Lives, death and the time-out are Phase 4 rules. The timer stops at 0.
- Scoring in Phase 3: coin 200, Postmark 1000, 100 coins = 1-up. Goal-height and time bonus points are Phase 4.
- At the goal, Pip slides down the pole, hops off and walks into the delivery depot. Then `stageComplete` is emitted, and the shell shows a small "DELIVERED!" banner with a Menu link. The results screen is Phase 6.
- Star blocks shimmer by swapping tile indices on a 3-frame cycle every 150ms, by timer, without per-frame allocation.
- Generation is cached. The generator hashes its own inputs (pipeline, art, manifest and scripts) and skips the work when `public/assets/generated/.stamp` matches.
- Hand-made art can replace any generated file. A file with the same name in `art-overrides/` is copied to the manifest path instead of being generated.

## Review Focus

1. **Scenery never hides Pip.** Bushes and hills sit right behind Pip, so check readability by eye.
2. **Bump from below between two blocks.** The block nearest Pip's centre is the one bumped (SMB rule). Test: `pickBumpedColumn`.
3. **Coin above a bumped block** is collected. Test: `LevelScene` uses `CoinField.collectCell`, covered by the `CoinField` spec.
4. **Pole touched mid-jump** starts the slide from the touch height. Test: `GoalSequence › slides from the grab height`.
5. **Repeated quit/restart** leaves no listeners or textures behind. Textures are cached by key and never reloaded.

---

## File Structure

```
scripts/register-ts-resolution.mjs                 Node resolve hook: extensionless relative imports → .ts
scripts/generate-assets.ts                         writes every manifest asset; cached by input hash
scripts/validate-assets.ts                         every manifest ID resolves to a file; every stage asset ID exists
scripts/validate-levels.ts                         runs validateLevel on every stage; non-zero exit on errors
src/asset-pipeline/raster.ts                       Raster (RGBA8), createRaster, fillRect, blit, parseHex, mix
src/asset-pipeline/pixel-grid.ts                   rasterizeGrid(), swapPalette()
src/asset-pipeline/crc32.ts                        crc32()
src/asset-pipeline/png-encoder.ts                  encodePng(raster, deflate)
src/asset-pipeline/bit-writer.ts                   BitWriter (LSB-first)
src/asset-pipeline/prefix-codes.ts                 limitedCodeLengths(), canonicalCodes()
src/asset-pipeline/webp-encoder.ts                 encodeWebpLossless(raster)
src/asset-pipeline/atlas-packer.ts                 packAtlas() → raster + Phaser JSON hash
src/asset-pipeline/tileset-builder.ts              buildTileset() with 1px extrusion
src/asset-pipeline/noise.ts                        seeded RNG, tileable value noise 1D/2D, fBm
src/asset-pipeline/scenery/*.ts                    sky, clouds, mountains, hills, bushes generators
src/content/art/pip-sprites.ts                     Pip frames + outfit palettes
src/content/art/item-sprites.ts                    coin spin, Postmark, flag, pole, debris, sparkle
src/content/art/overworld-tiles.ts                 overworld tile drawings
src/content/art/atlas-frames.ts                    frame-name constants (runtime + pipeline)
src/content/art/scenery-layers.ts                  layer specs (runtime + pipeline)
src/content/manifests/asset-manifest.ts            stable asset IDs → paths
src/content/manifests/level-manifest.ts            stageId → scene, level, assets
src/content/levels/world-1/stage-1-1.ts            the 1-1 layout
src/game-engine/world/tile-ids.ts                  tile index semantics shared by every theme
src/game-engine/world/level-format.ts              LevelDefinition, entities, legend
src/game-engine/world/level-compiler.ts            compileLevel() (pure)
src/game-engine/world/level-validator.ts           validateLevel() (pure)
src/game-engine/world/coin-field.ts                CoinField (pure cell lookup)
src/game-engine/world/block-hits.ts                pickBumpedColumn(), blockHitOutcome() (pure)
src/game-engine/systems/parallax/parallax.ts       stripScreenX(), wrapDrift() (pure)
src/game-engine/systems/animation/pip-animation.ts selectPipAnimation() (pure)
src/game-engine/systems/effects/effect-curves.ts   bumpOffset(), coinPopOffset() (pure)
src/game-engine/systems/scoring/stage-session.ts   StageSession (pure HUD state + change detection)
src/game-engine/systems/level-completion/goal-sequence.ts  GoalSequence (pure)
src/game-engine/configuration/scoring.config.ts
src/game-engine/configuration/effects.config.ts
src/game-engine/scenes/level.scene.ts
src/game-engine/scenes/level/*.ts                  Phaser glue: asset loading, parallax renderer, block effects, pip animations
src/app/features/game-shell/hud/hud.component.{ts,html,css}
```

Modified: `game-events.ts` (`hudChanged`, `stageComplete`, `loadComplete.stageLabel`), `player.ts` (atlas frames, animation, ceiling hook, scripted mode), `test-room.scene.ts` (loads the atlas), `create-game.ts`, `boot.scene.ts`, `game-session.service.ts`, `game-shell.component.*`, `main-menu.component.*`, `package.json` scripts, CI workflow. Removed: `pip-placeholder.ts` (+ spec).

---

### Task 1: Node script runner and pure raster/encoder core

**Files:** `scripts/register-ts-resolution.mjs`, `src/asset-pipeline/{raster,pixel-grid,crc32,png-encoder,bit-writer,prefix-codes,webp-encoder}.ts` + specs.

- [x] **Step 1:** Resolve hook, checked with a one-off probe on Node 26.
- [x] **Step 2 (TDD):** raster ops, grid rasterizing and palette swap.
- [x] **Step 3 (TDD):** CRC32 (known vector), PNG chunk layout (signature, IHDR fields, CRC per chunk, IEND).
- [x] **Step 4 (TDD):** bit writer, length-limited prefix codes (Kraft sum = 1, max length respected), LZ77 prefix-value encoding, predictor residuals round-trip.
- [x] **Step 5:** VP8L encoder. Check once that Chromium decodes generated files pixel-exactly (a one-off script, not an e2e test).

_Done. The hook also sets format `module-typescript` on resolved `.ts` URLs, which silences Node's MODULE_TYPELESS_PACKAGE_JSON warning without adding `"type": "module"` to package.json. The Chromium check (a one-off script in gitignored `tmp/`) decoded noise, shape, soft-alpha and flat images with a max channel difference of 0._

### Task 2: Atlas and tileset packing

**Files:** `atlas-packer.ts`, `tileset-builder.ts` + specs.

- [x] **Step 1 (TDD):** shelf packing (no overlaps, 1px padding, power-of-two width, deterministic), Phaser JSON hash format.
- [x] **Step 2 (TDD):** tileset extrusion (edge pixels copied into the 1px gutter).

### Task 3: Art definitions

**Files:** `src/content/art/*`, `src/game-engine/world/tile-ids.ts`.

- [x] **Step 1:** Pip small frames (the approved idle is kept exactly) and outfit palettes.
- [x] **Step 2:** items (coin ×4, Postmark, flag, pole, pole top, debris, sparkle ×2).
- [x] **Step 3:** overworld tiles (grass top, dirt, brick, star ×3, used, solid, tube ×4, depot ×4).
- [x] **Step 4 (TDD):** every grid is 16 wide and uses only palette symbols. Every tile id has a drawing.

_Deviation: tubes are postal teal with a yellow band instead of green, so they don't read as Nintendo pipes. Shared frame names live in `atlas-frames.ts`, and the atlas and tileset sources are assembled in `art-sources.ts`._

### Task 4: Scenery generators

**Files:** `noise.ts`, `scenery/*.ts`, `scenery-layers.ts` + specs.

- [x] **Step 1 (TDD):** seeded RNG is deterministic. 1D/2D noise tiles seamlessly across its period.
- [x] **Step 2:** sky (gradient + sun glow), clouds (fBm cumulus, wraps horizontally), mountains (ridged fBm, snow, haze), hills, bushes.
- [x] **Step 3 (TDD):** each layer's left and right edges match (tileable), sizes follow the spec × k, and the sky is opaque.

_Done. Visual check on a composite preview (gitignored `tmp/`): mountain lighting now uses a smoothed 3-octave ridge that fades with depth (the per-column slope made vertical streaks), and cloud edge noise fades in with density (it was leaking faint alpha across each cloud's bounding box). Hills and bushes run to the bottom of the view, so pits never show a hard scenery edge._

### Task 5: Manifest and build scripts

**Files:** `asset-manifest.ts`, `scripts/*.ts`, `package.json`, `.github/workflows/deploy-pages.yml`.

- [x] **Step 1:** manifest IDs: `atlas.gameplay`, `tileset.overworld`, `scenery.overworld.<layer>.<720p|1440p>`.
- [x] **Step 2:** the generator writes the files, caches by input hash, and honours `art-overrides/`.
- [x] **Step 3:** asset and level validators. `npm run assets` runs generate → validate assets → validate levels. `prestart`, `prebuild` and `prebuild:pages` call it, `preview` goes through `npm run build`, and CI runs it.

_Done. Full generation takes about 3s, and cached runs print "assets: up to date". `prewatch` was added too. CI needs no change, because `npm run build:pages` triggers `prebuild:pages`. Output sizes: 1440p scenery is about 1.7MB in total, 720p about 0.67MB, the atlas PNG 2KB and the tileset 1KB._

### Task 6: Level format, compiler, validator

**Files:** `level-format.ts`, `level-compiler.ts`, `level-validator.ts`, `coin-field.ts`, `block-hits.ts` + specs.

- [x] **Step 1 (TDD):** compiler: ground auto-tiling (grass top where nothing solid is above), tubes stamped down to the ground, goal base block, coins and start extracted, decoration split.
- [x] **Step 2 (TDD):** validator: ragged rows, unknown symbols, height 15, one start, one goal, exactly 3 Postmarks, entities in bounds, tubes resting on solid ground and not overlapping, tube destinations known.
- [x] **Step 3 (TDD):** `CoinField` rect and cell collection. `pickBumpedColumn` nearest-centre rule. `blockHitOutcome`.

_Done. Pickups (coins and Postmarks) share one `PickupField` class (`pickup-field.ts`) instead of a coin-only `CoinField`. The compiler re-runs the validator and throws on an invalid level._

### Task 7: The 1-1 layout

**Files:** `src/content/levels/world-1/stage-1-1.ts`, `level-manifest.ts` + spec.

- [x] **Step 1:** an original layout of about 210 columns: teach blocks, then tubes, then pits, then floating platforms, then stairs, then the goal and depot. It has 3 Postmarks off the main path.
- [x] **Step 2 (TDD):** a spec asserts that 1-1 validates cleanly and that the manifest maps `1-1` to `LevelScene`.

_Done. Layout (212 columns): blocks taught by columns 10–19, then six tubes of mixed height (2/3/4/3, later 2/3), two pits with coin arcs, floating brick platforms, an open field with a low brick cave of coins, two staircase pairs (the second over a pit), and a 5-step final ascent. The goal is at column 193 and the depot door at 201. The Postmarks are above the first platform, above the tallest tube, and past the final ascent. A full-level render was checked by eye._

### Task 8: Pure gameplay systems

**Files:** `parallax.ts`, `pip-animation.ts`, `effect-curves.ts`, `stage-session.ts`, `goal-sequence.ts`, configs + specs.

- [x] **Step 1 (TDD):** parallax strip position (factor, drift, wrap, whole view covered).
- [x] **Step 2 (TDD):** animation selection (idle/walk/run/skid/jump/fall, speed-scaled walk rate).
- [x] **Step 3 (TDD):** bump and coin-pop curves start and end at 0.
- [x] **Step 4 (TDD):** session: coins, 1-up at 100, score, timer at 400ms per unit, clamped at 0, change flag.
- [x] **Step 5 (TDD):** goal sequence: slide, hop, walk to the door, done. Flag follows.

_Done. `HudState` and `StageResult` are bridge payload types in `game-events.ts`. Animation picks jump while rising and fall while descending, and stride rate scales from 5fps to 15fps with speed._

### Task 9: LevelScene and Phaser glue

**Files:** `level.scene.ts`, `scenes/level/*.ts`, `player.ts`, `test-room.scene.ts`, `create-game.ts`, `boot.scene.ts`, `game-events.ts`.

- [x] **Step 1:** load manifest assets for the stage and quality, with linear filtering on scenery and `loadProgress` events.
- [x] **Step 2:** tilemap collision and decoration layers, parallax renderer, coins, Postmarks, goal pole and flag.
- [x] **Step 3:** Pip on the atlas with animations, the ceiling-hit hook, block bump and coin pop pools, and star shimmer.
- [x] **Step 4:** HUD events on change, the goal sequence, `stageComplete`, and pit respawn.
- [x] **Step 5:** the test room uses the atlas Pip. Remove the placeholder Pip.

_Done. Deviations:_

- _`gameplay-animations.ts` (Pip and coin animations), `stage-assets.ts` (manifest-driven loading, linear filtering, and named `tile-N` frames on the tileset so bump sprites can show a tile), `parallax-renderer.ts` and `block-effects.ts` live in `scenes/level/`._
- _The goal triggers when Pip's body reaches the base block's left edge, not the pole centre. A walking Pip is stopped by the base block, and in SMB touching the base counts as grabbing the pole. A headless smoke run (temporary goal at column 8, reverted) found and confirmed this fix._
- _A headless smoke run also found that coin sprites played `coin-spin` before the Player constructor registered it. `LevelScene` now calls `ensureGameplayAnimations` before building pickups._
- _The test room now uses the generated tileset and atlas, so `placeholder-tiles.ts` and `pip-placeholder.ts` (and their specs) are deleted._

### Task 10: Angular HUD and routing

**Files:** `hud.component.*`, `game-session.service.ts`, `game-shell.component.*`, `main-menu.component.*` + specs.

- [x] **Step 1 (TDD):** the session service exposes `hud`, `stageLabel`, `loadProgress` and `stageResult` signals.
- [x] **Step 2 (TDD):** the HUD component renders PIP/score, coins, WORLD, TIME and lives with zero padding, aligned to the canvas box.
- [x] **Step 3:** the shell shows loading progress and the "DELIVERED!" banner. The menu's Play opens `1-1`, and dev builds also link the test room.

_Done. The shell spec needed a `renderShellWithLiveUpdates` helper, because the existing synchronous `requestAnimationFrame` stub stalls Angular's zoneless scheduler for later signal updates. The menu link moved to the bottom-left so it doesn't cover the HUD. Stage ids for the menu live in `stage-ids.ts`, so the menu chunk never pulls in level data._

### Task 11: Verify and document

- [x] `npm test` passes. `NG_CLI_ANALYTICS=false npx ng build` succeeds.
- [x] `docs/plans/deferred-review.md` Phase 3 section, `docs/plan.md` status.
- [x] Prettier on changed files only.
