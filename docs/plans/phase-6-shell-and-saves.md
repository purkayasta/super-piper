# Phase 6: Angular Shell + Saves — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Tick each step as it lands and note any deviation inline under its task.

**Goal:** the whole loop menu → world map → 1-1 → results → map works, and progress survives a reload. The main menu leads to a World 1 map with four stage nodes. A pause overlay holds the running game without recreating it. A results screen awards stars (finish, all Postmarks, target time), best score and time, coins and XP towards a courier rank. A settings screen sets volumes, key bindings, quality, reduced motion and screen shake. Everything is saved to `localStorage` with a schema version, validation, migration, a backup slot and recovery from corruption. Menus work with mouse, keyboard and gamepad. The built settings screen also has separate jump/left/right sensitivity sliders (50–150%, default 100%) and fills the available screen width.

**Architecture:** all permanent state belongs to Angular (`game.md` §3, §7; `engine.md` §7.1, §9). A root `SaveService` owns the one `SaveData` signal and its storage; the rules that read and repair a save (`parseSave`, `validateSave`, `migrateSave`, `restoreSave`) are pure, Vitest-tested functions. `SettingsService` and `ProgressionService` are thin root services over `SaveService`; the rules they apply (`mergeSettings`, `rebindKey`, `applyClear`, `rankForXp`) are pure too. `AudioService` keeps its Phase 5 API but its volumes now come from `SettingsService`, so a slider change persists. Phaser learns settings only at game creation (`GameOptions.settings` and `GameOptions.bindings`) and turns quality and reduced motion into a pure `EffectProfile`. Phaser reports a pause key press as a new `pauseRequested` event; Angular decides and sends `pause`, and shows the overlay only when the scene confirms with `paused`. Results come from the existing `stageComplete` event, extended with the time used, the coins collected and the Postmarks collected; Angular records them once and shows the results overlay inside the shell while the finished scene stays alive. Menus are plain HTML: a small `appMenuNav` directive moves focus with the arrow keys, and a root `GamepadMenuService` polls gamepads (only while a menu is on screen and a pad is connected) and turns the d-pad, stick, A, B and Start into the same moves.

**Tech Stack:** Phase 5 stack. **No new dependencies.**

**Spec:** `docs/design.md` §5 (volumes), §7 (progression). `docs/engine.md` §4.2, §7, §8, §9. `game.md` §3, §5 (adaptive quality), §7. Builds on `phase-5-sound-and-music.md`.

## Global Constraints

- Phase 1–5 Global Constraints still apply (emit on change only, no per-frame allocation, Phaser only in bootstrap, scenes and glue, the initial bundle Phaser-free).
- **Settings and saves change only on user action or stage events.** Progression writes immediately (stage clear, erase). Settings writes are debounced by 500 ms and flushed on `pagehide`. Nothing is written from the gameplay loop.
- **Phaser never sees the save.** It gets `GameplaySettings` and `KeyBindings` in `GameOptions`, and reports results through `stageComplete`.
- **The game is created once per stage visit.** Pause, results and game over are overlays in the shell; the Phaser game keeps running (paused or finished) underneath. A different stage (route parameter change) is a new session: the shell detaches and attaches again.
- **Menus** use real buttons and links, visible focus, `aria-pressed` for toggles and segmented choices, `role="dialog"` with a label for overlays, and arrow-key and gamepad focus movement.
- **Component styles stay small** (the `anyComponentStyle` budget warns at 4 kB). Shared panel, button, choice and range styles live in `src/styles.css`.
- **No explanatory comments.**

## Decisions made without the owner (review later)

- **Routes:** `#/` menu, `#/map` world map, `#/play/:stageId`, `#/settings`. Achievements, the shop and story are Phase 7 targets and remain unimplemented. Play on the menu goes to the map.
- **Save layout** (`pip.save`, schema version 1): `progression` (per-stage records, coin balance, XP), `settings` (volumes, quality, reduced motion, screen shake, movement sensitivity, key bindings), `cosmetics` (owned and equipped outfit, for the Phase 7 shop) and `achievements` (unlocked IDs, for Phase 7).
- **Validation is strict on types, lenient on absence.** A missing field takes its default. A field with the wrong type or an impossible value (negative coins, a volume above 1, conflicting key bindings, a non-JSON string) makes the save corrupt. Unknown stage IDs (not in the world manifest) are dropped quietly, so a removed stage never breaks a save.
- **Recovery:** a corrupt primary falls back to `pip.save.backup`, then to a fresh save. The corrupt text is kept under `pip.save.corrupt` for debugging, and the menu shows a dismissible notice. A save from a newer schema version is treated as unreadable; it is not overwritten on load, only when the player next changes something.
- **Backup = last good save.** Before each write, the backup slot takes the primary that was last loaded or written successfully. So a primary corrupted in devtools recovers to one write behind at worst.
- **No storage** (private mode, blocked storage, quota): the game runs from memory and the menu says progress can't be saved.
- **Migrations** are a table from version N to N+1. Version 1 is the first schema, so the table has one entry: an unversioned save (version 0) is read as version 1 with defaults.
- **Stars:** _finish_ (any clear), _Postmarks_ (all of a stage's Postmarks found, counted across runs, so each can be found on a different run), _target time_ (time used ≤ the level's `targetTime`, in HUD time units). Stars never go away once earned.
- **Best time** is the fewest HUD time units used before the goal grab (the time bonus tally doesn't count). Best score is the final score after the tally.
- **Coins:** the coins Pip collects in a run (across deaths in that run, not wrapped at 100) are added to the balance on a clear. Game over adds nothing.
- **XP:** `floor(score / 100)` per clear, plus 200 for a first clear and 100 per newly earned star. **Ranks** (XP needed): Trainee Courier 0, Junior Courier 500, Courier 1500, Senior Courier 3000, Express Courier 5000, Master Courier 8000, Legendary Courier 12000. Rank-unlocked outfits are Phase 7 (shop).
- **Unlocks:** the first stage of a world is open. Clearing a stage opens the next one in the world order. A stage named in the world manifest but not in the level manifest shows "SOON" and can't be started. Phase 7 has since registered 1-2, 1-3 and 1-4 as playable stages.
- **Lives** stay per stage attempt (3, Phase 4). Game over offers Retry and World map.
- **Pause:** the stage's pause binding (Esc or Enter by default) or gamepad Start pauses; a pause button sits top-left (it replaces the Phase 1 Menu link); hiding the tab pauses. The overlay offers Resume, Restart stage and World map plus music and effects volume. Esc, the pause binding (except Enter and Space, which activate buttons), B or Start resume. A pause asked for during loading is applied after `loadComplete`; pausing is ignored after the goal and after game over.
- **Quality:** Low caps the canvas scale at 3, loads 720p scenery, drops the nearest scenery layer (bushes), halves brick debris (2 pieces), skips sparkles and stops cloud drift. Medium caps at 4 with 720p scenery and every effect. High caps at 6 with 1440p scenery. Default: High.
- **Reduced motion** stops cloud drift and screen shake in game and turns off UI animations and transitions (`data-reduced-motion` on the document). Default follows the OS `prefers-reduced-motion`. **Screen shake** (default on) is consumed by the Phase 7 boss through the effect profile.
- **Key rebinding:** each action shows its keys (the primary first). "Change" captures the next key and makes it the action's primary key. A key already used elsewhere moves to the new action; if that would leave the other action with no key, it gets the replaced key (a swap). Tab, Backquote, F1–F12, the Meta keys and ContextMenu are reserved (focus, dev keys, browser). Escape cancels a capture. Gamepad buttons are fixed (A jump, X run, d-pad/stick move, Start pause).
- **Settings apply at stage start.** The settings screen is outside the game, so `applySettings` stays unsent; only volumes change live (from the pause overlay too).
- **Volume UI sound:** releasing the master or effects slider plays the coin sound at the new level. Moving focus in a menu plays `sfx.menu-move`; confirming plays `sfx.menu-select`.

## Review Focus

1. **Corruption recovery.** Not JSON, wrong types, newer version, missing storage. Test: `restoreSave`, `SaveService`.
2. **Migration.** Unversioned → v1; a chain of steps runs in order. Test: `migrateSave`.
3. **Stars are sticky and Postmarks accumulate.** Test: `applyClear`.
4. **Rebinding conflicts.** Steal, swap, reserved keys. Test: `rebindKey`.
5. **Pause before load and the pause key latch.** A pause press that resumes must not re-pause. Test: `GameSessionService`, `DomInput`.
6. **The results report is recorded once per clear.** Test: `GameShellComponent`.

---

## File Structure

```
src/content/manifests/world-manifest.ts                 World 1: stage order, titles, themes, map positions, nextStageId()
src/game-engine/core/game-events.ts                     + StageResult.timeUsed/coinsCollected/postmarksCollected/postmarkTotal, pauseRequested
src/game-engine/core/game-factory.ts                    GameOptions.settings + bindings
src/game-engine/configuration/quality.config.ts         QUALITY_EFFECTS per quality
src/game-engine/systems/effects/effect-profile.ts       effectProfile()
src/game-engine/systems/input/dom-input.ts              bindings, consumePausePress() with a release latch, pad Start
src/game-engine/systems/scoring/stage-session.ts        + timeUsed, coinsCollected
src/game-engine/scenes/level.scene.ts                   pause request, guards, results fields, effect profile
src/game-engine/scenes/level/parallax-renderer.ts       layer skip + drift switch
src/game-engine/scenes/level/block-effects.ts           debris count + sparkle switch
src/game-engine/scenes/level/stage-assets.ts            scenery ids honour the profile
src/game-engine/scenes/test-room.scene.ts               bindings + pause request
src/game-engine/bootstrap/create-game.ts                quality from options.settings
src/app/core/models/settings.model.ts                   GameSettings, defaultSettings, gameplaySettings
src/app/core/models/progression.model.ts                StageRecord, Progression, ClearReport, StageStatus
src/app/core/models/save-data.model.ts                  SaveData, schema version, freshSave
src/app/core/utilities/key-binding-rules.ts             rebindKey, validateBindings, keyLabel
src/app/core/utilities/settings-rules.ts                mergeSettings, sameSettings
src/app/core/utilities/save-validation.ts               validateSave
src/app/core/utilities/save-migration.ts                migrateSave, SAVE_MIGRATIONS
src/app/core/utilities/save-recovery.ts                 parseSave, restoreSave
src/app/core/utilities/progression-rules.ts             applyClear, rankForXp, stageStatuses, RANKS, XP_RULES
src/app/core/utilities/pad-navigator.ts                 PadNavigator (edges, held-at-start latch, stick repeat)
src/app/core/services/save.service.ts                   storage, signal, debounce, backup
src/app/core/services/settings.service.ts               settings signal, update, rebind, reduced-motion attribute
src/app/core/services/progression.service.ts            stage statuses, recordClear
src/app/core/services/gamepad-menu.service.ts           rAF pad polling while a menu is active
src/app/core/services/audio.service.ts                  volumes from SettingsService
src/app/core/services/game-session.service.ts           requestPause/resume/restart, pending pause, loadError
src/app/core/testing/game-fixtures.test-helpers.ts      stageResult(), gameOptions(), MemoryStorage
src/app/shared/ui/menu-nav.directive.ts                 arrow-key focus movement, back, gamepad target
src/app/shared/ui/counter-format.ts                     moved from game-shell/hud/hud-format.ts
src/app/shared/components/volume-slider/*               one labelled slider
src/app/shared/components/star-row/*                    three stars
src/app/features/main-menu/*                            Play, Settings, rank, stars and coins, save notice
src/app/features/world-map/*                            stage nodes and details
src/app/features/settings/*                             audio, quality, motion, controls, save data
src/app/features/pause-menu/*                           pause overlay
src/app/features/results/*                              results overlay
src/app/features/game-shell/*                           overlays, pause button, recording, loading cancel
```

---

### Task 1: Engine boundary

**Files:** `game-events.ts`, `game-factory.ts`, `quality.config.ts`, `effect-profile.ts`, `dom-input.ts`, `stage-session.ts`, scenes, `create-game.ts` + specs.

- [x] **Step 1 (TDD):** `effectProfile` for each quality, reduced motion and screen shake.
- [x] **Step 2 (TDD):** `DomInput` uses passed bindings; `consumePausePress` fires once per press, never for a key still held after `releaseAll`, and for pad Start.
- [x] **Step 3 (TDD):** `StageSession` reports `timeUsed` and `coinsCollected` (carried across deaths).
- [x] **Step 4:** `LevelScene` emits `pauseRequested`, ignores pause after the goal and game over, fills the new result fields, and applies the effect profile to scenery, debris and sparkles. Test room gets bindings and the pause request.

_Done. Pause detection lives in `DomInput.consumePausePress()`: the pause binding or pad Start, edge-triggered, with a latch that `releaseAll()` (called on pause, blur and tab hide) sets, so the key that resumes the game can't pause it again. A key held when the stage starts is latched too. `DomInput` now also ignores keys aimed at buttons and links (as it already did for text fields), so Space and Enter work in overlays while the paused scene keeps its listeners. `LevelScene` ignores `pause` unless the scene is running (`isActive`), after the goal and after game over, and ignores `resume` unless paused. The Phase 1 item "the `:stageId` route parameter is ignored" had already been fixed in Phase 2 (`initialStageId` picks the scene); Phase 6 adds re-attaching when the parameter changes._

### Task 2: Content

- [x] **Step 1 (TDD):** World 1 manifest names 1-1…1-4 in order, each with a title and a map position; built stages resolve through the level manifest.

_Done. Titles: 1-1 Parcel Path, 1-2 Cellar Sorting, 1-3 Updraft Heights, 1-4 Rook's Keep. `nextStageId()` gives the world order for the results screen's Next button._

### Task 3: Pure app rules

- [x] **Step 1 (TDD):** settings defaults and `mergeSettings`.
- [x] **Step 2 (TDD):** `rebindKey` (primary replace, steal, swap, reserved, no-op) and `validateBindings`.
- [x] **Step 3 (TDD):** `validateSave`, `migrateSave`, `parseSave`, `restoreSave` (primary, backup, fresh, newer version, unversioned, notices).
- [x] **Step 4 (TDD):** `applyClear` (first clear, stars, sticky stars, Postmark union, bests, coins, XP, rank-up), `rankForXp`, `stageStatuses` (open, locked, coming soon).
- [x] **Step 5 (TDD):** `PadNavigator` edges, held-at-start latch, stick repeat.

_Done. Settings rules are `mergeSettings` / `sameSettings` in `utilities/settings-rules.ts` (types and defaults in `models/settings.model.ts`). `restoreSave` also returns `needsWrite` (rewrite after a migration or a backup recovery) and `corruptText`. Validation also rejects an equipped outfit that isn't owned and Postmark indices above 63._

### Task 4: Services

- [x] **Step 1 (TDD):** `SaveService`: loads and recovers, immediate and debounced writes, backup rotation, flush, no storage, failed writes.
- [x] **Step 2 (TDD):** `SettingsService` and `ProgressionService`; `AudioService` reads and writes volumes through settings.
- [x] **Step 3 (TDD):** `GameSessionService`: pending pause, `pauseRequested`, resume, restart, results reset on load, load errors.
- [x] **Step 4 (TDD):** `GamepadMenuService` polling lifecycle.

_Done. `SaveService` tracks what the primary slot holds, so a backup recovery rewrites the primary even though its text matches the backup. Storage is injected (`SAVE_STORAGE`), as is the reduced-motion preference (`PREFERS_REDUCED_MOTION`), so specs use an in-memory `Storage`. `SettingsService` is not injected by the root component: every screen reaches it through `AudioService`, which keeps the save code out of the initial bundle (injecting it in `App` cost 12 kB). `GameSessionService` also gained `canPause` and `loadError` (a `recoverableError` before load, such as an unknown stage). A pause wanted during loading is sent one microtask after `loadComplete`, because Phaser's SceneManager marks a scene running again after its `create()` returns. `GamepadMenuService` polls with `requestAnimationFrame` only while a menu is registered and a pad is connected; it starts on `gamepadconnected`._

### Task 5: Screens

- [x] **Step 1:** `appMenuNav`, volume slider, star row.
- [x] **Step 2:** main menu, world map, settings (specs).
- [x] **Step 3:** pause overlay, results overlay, shell wiring, route parameter changes (specs).
- [x] **Step 4:** routes; e2e helpers follow the new flow (not run).

_Done. The HUD's counter formatting moved to `shared/ui/counter-format.ts`, since the map and results use it too. The loading screen gained a Cancel link (and shows a load error), because the pause overlay is only reachable once a stage has loaded. The Phase 1 Menu link is gone; the pause overlay's World map replaces it. Focus returns to the game host on load and resume, so a key press never lands on a stale button. The e2e helpers now go menu → map → Deliver! and leave through pause → World map, and the rapid-toggle test uses browser back; e2e was not run._

### Task 6: Verify and document

- [x] `npm test` passes; `NG_CLI_ANALYTICS=false npm run build` succeeds; initial bundle recorded.
- [x] `deferred-review.md` Phase 6 section; earlier deferred bullets ticked; `docs/plan.md` status and link; `engine.md` notes.
- [x] Prettier on changed files only.

_Done. 734 unit tests pass in 87 files (was 599 in 72). The production build succeeds. Initial bundle 243 kB raw / 67 kB transfer (was 235 kB; the growth is Angular core features the new screens use). Phaser stays in the lazy `game-shell-routes` chunk (1.17 MB). New lazy chunks: world map 8.5 kB, settings 8.4 kB, main menu 4.6 kB, and a shared 23 kB chunk with the save, settings, progression and audio services._
