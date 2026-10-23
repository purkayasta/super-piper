# Deferred Review Items

_2026-10-23 · Phases 3–6 were built back to back on `phases-3-7` without per-phase owner reviews; Phase 7 is being completed on that branch. These unchecked items are still outstanding and must be reviewed before Phase 8._

## Phase 2: Pip's feel

Open items carried from the Phase 2 review:

- [ ] **Off-step micro-hitch.** About 1 frame in 10s runs 0 or 2 physics steps, because the fixed step drifts against the display's real refresh. Planned fix: delta snapping. Quantise the delta Arcade sees to whole steps and carry the remainder. Re-measure off-step frames afterwards.
- [ ] **120Hz and 144Hz have not been measured.** Run the 60s test-room measurement on a high-refresh display and record it in `docs/plan.md`.
- [ ] **Movement tuning.** Use the F2 panel until it feels like Mario, then "Copy as config". Those values become `DEFAULT_MOVEMENT`.
- [ ] Phase 2 review checklist in `docs/plan.md` (skid, tap/held/running jump heights, coyote time, jump buffer, corner slide, camera never scrolls back, refresh-rate reload).

## Phase 3: Art pipeline + World 1-1

Review checklist from `docs/plan.md`:

- [ ] 1-1 looks like the approved direction, with crisp pixel gameplay in front of rich layered scenery.
- [ ] The scenery never makes Pip or hazards hard to read.
- [ ] 1-1 is playable start to finish.
- [ ] The dev overlay holds 60fps while running through the whole stage. **Not measured.**

Not measured or not verified (no review this phase):

- [ ] **1-1 frame rate has not been measured.** Run the dev overlay through the whole stage on the baseline machine, at High (1440p scenery) and Medium (720p). Risk signal: a headless smoke run with software GL showed about 27fps in 1-1 against 60fps in the test room, so the five scenery layers cost real fill-rate there. That isn't a measurement, because headless Chromium has no GPU. If a real GPU misses the target, try the 720p set at High first, then trimming strip heights.
- [ ] **A full 1-1 playthrough has not been done by hand.** Headless smoke runs covered loading, running, jumping, HUD time ticking and the goal sequence (using a temporary goal column, since reverted). Nobody has played start to finish, so check the jumps over tall tubes, the pits, the stairs-over-a-pit and the Postmark placements.
- [ ] **Readability.** Check that bushes (scroll factor 0.7) and hills never make Pip hard to read, at High and Medium, on a large monitor.
- [ ] **Art review.** Check the Pip frames (walk, run, skid, jump, fall, goal-grab), the coin spin, the Postmark stamp, the postal-teal tubes and the delivery depot against the approved mockup. The mountain shading has a sharp light/shade crease at ridge peaks, which reads as a vertical line. Decide whether to keep it.
- [ ] **Star-block shimmer, block bump and coin pop** have not been seen in motion. Hit a star block and a brick from below. Check the coin above a bumped block is collected.
- [ ] **HUD.** Check its size and placement over the canvas at several window sizes, and that it uses the Press Start 2P font. The text-shadow is small; check it is cheap.
- [ ] **e2e has not been run.** `npm run e2e` now enters 1-1 from Play, so the 20-cycle heap test exercises the real scenery textures. Run it and check heap growth stays under 5MB.
- [ ] **WebP decode.** Lossless WebP comes from the in-repo encoder. Chromium decoded its test images pixel-exactly. Firefox and Safari have not been checked.

Deferred to later phases (scope decisions):

- [x] Big-Pip (16x32) frames, and the grow/shrink and death animations, move to Phase 4 with the Parcel Box. The small-Pip death frame is already in the atlas. _Done in Phase 4: 13 big frames, a Spark look, a flicker transition for grow, shrink and Spark-up, and a death hop._
- [x] Falling into a pit respawns Pip at the start, and the timer stops at 0 without killing. Lives, death and the time-out are Phase 4 rules. _Done in Phase 4: pits, hits and the time-out kill, each death costs a life, and the stage restarts at the checkpoint._
- [x] Goal-height points and the time bonus at the goal are Phase 4 scoring. The DELIVERED! banner is a stand-in for the Phase 6 results screen. _Done in Phase 4: 100 to 5000 by grab height, then 50 per remaining time unit, tallied on the HUD. The banner stays until Phase 6._ _Done in Phase 6: the results screen replaces the DELIVERED! banner, and the GAME OVER banner became a dialog with Retry and World map._
- [x] Enterable tubes and the 1-1 bonus room were added in Phase 7. Their gameplay and route still need the Phase 7 browser review below.

## Phase 4: Enemies, power-ups, rules

Review checklist from `docs/plan.md`:

- [ ] A full 1-1 run feels like real SMB1 gameplay.
- [ ] Stomps, shells, power-ups, deaths and checkpoint respawn all work.
- [ ] HUD numbers update correctly (score, coins, time, lives, the 1UP from 100 coins, combos and the goal tally).
- [ ] No frame drops in busy moments. **Not measured.**

Not measured or not verified (no review this phase):

- [ ] **Busy-moment frame rate has not been measured.** Watch the overlay's FPS, p95 and active bodies with several enemies, two parcels, debris and score pop-ups on screen. Actors are pure rectangles (only Pip has an Arcade body), so `activeBodies` is Pip plus the active actors. Budget: ≤ 40.
- [ ] **Feel of the new numbers.** Enemy walk 30, shell 180, stomp bounce 210 (held jump bounces higher), Parcel Box slide 60, Rush Star bounce 300, parcel 240 with a 200 bounce, Snapvine rhythm 1.8s hidden / 0.8s rise / 1.4s out. All live in `actors.config.ts` and `rules.config.ts`.
- [ ] **Stomp window.** A falling Pip stomps when his feet are within 8px of an enemy's top. Check it never feels like an unfair hit or a free stomp from the side.
- [ ] **Shell play.** Kick from both sides, stop a moving shell with a stomp, chain kills (500, 800, 1000…), the shell bouncing off tubes and walls, and the peek and revive after 5s.
- [ ] **Snapvine.** It should stay down while Pip stands next to or on its tube (tubes at columns 57 and 173) and be readable as it rises. It draws behind the tube tiles; check the tube rim's transparent corners don't show the plant.
- [ ] **Power-up flow.** First `?` gives a Parcel Box when small and a Spark Stamp when big; the grow, shrink and Spark-up flicker freezes the world for 0.9s; 2s invulnerability flicker after damage; two parcels at most; crouch while big (down), standing up blocked under a low ceiling.
- [ ] **Blocks.** Big Pip breaks plain bricks with debris; the multi-coin brick (column 72) pays for 4s, at most 10 coins; the Rush Star brick (column 101); the hidden Green Stamp at column 62, row 9 (jump straight up under it); bumping a block knocks out an enemy on top and hops an item.
- [ ] **Death and lives.** Hit, pit and time-out deaths; the respawn at the checkpoint (column 97) keeps score, coins and collected Postmarks; GAME OVER after the last life, with Retry and Menu. Check the restart has no visible hitch.
- [ ] **Goal.** Grab points by height (100 to 5000) and the time tally (8 units every 80ms, so the HUD updates 12.5 times a second, never per frame).
- [ ] **Tall-tube jump.** A standing jump from against the 4-high tube at column 49 can't clear it; a run-up can. SMB1's tallest 1-1 pipe needs the same, but check it feels fair (Phase 3 layout item).
- [ ] **Held keys through a respawn.** The stage restarts with a fresh input tracker, so a key held through death registers again after the OS key-repeat delay (about 0.5s). If that feels sluggish, keep the input tracker across restarts.
- [ ] **Art review.** Big Pip (all 13 frames and the Spark look), Thornbug, Shellback and shell, Flapjack with wings, Snapvine, Parcel Box, Spark Stamp, Rush Star, Green Stamp, parcels, the checkpoint post and the score pop-up font. Check none of them reads as Nintendo IP.
- [ ] **Restart memory.** Each death runs `scene.restart`. Clean-up removes every listener, including its own `once` handlers. Run `npm run e2e` and a manual 20-death session and check heap growth.
- [ ] **e2e has not been run** this phase.

Verified headlessly (not a substitute for the review): a scripted run through 1-1 in Chromium, with a temporary debug hook since reverted, exercised grow, brick break, crouch, Spark throwing (two-parcel cap), shrink with invulnerability, the Rush Star tint, the hidden Green Stamp, the checkpoint and respawn, a time-out death, GAME OVER and Retry, and the goal tally to DELIVERED!, with no console errors. It found and fixed two bugs: clean-up crashed on restart (Arcade nulls `physics.world` before scene clean-up), and an item could be collected while still emerging.

## Phase 5: Sound and music

Review checklist from `docs/plan.md`:

- [ ] Every action has a satisfying sound. **Needs ears:** nobody has listened to any of it.
- [ ] The music is catchy and original. **Needs ears.** Overworld, underground, sky, castle, boss, Rush Star, menu, stage clear and game over were written to avoid SMB's melodies, rhythms and contours, but check each by ear against the 1-1, underground, star, castle and flag tunes, and the death, coin, 1-up and power-up sounds.
- [ ] Audio starts correctly after the first click or keypress (browser autoplay rules).
- [ ] There is no audio crackle or frame hitch when sounds play. **Not measured.**

Not measured or not verified (no review this phase):

- [ ] **Listen to everything.** Play `public/assets/generated/audio/**/*.flac` after `npm run assets`, then in game. Check the mix (triangle bass against the pulses, the drums' noise level), the default volumes (master 0.8, music 0.6, SFX 0.8, squared gain), and that SFX cut through the music.
- [ ] **Loop seams.** Let the overworld, menu and Rush Star loops wrap several times. The tails are folded back and the filters run circularly, so there should be no click or gap.
- [ ] **Hurry.** At 100 time units left the music stops, the warning plays, and the overworld returns at 1.3× tempo. Take a Rush Star during the hurry: star music plays, then the hurry loop comes back.
- [ ] **Goal and death timing.** The goal slide plays on the grab and the clear fanfare starts as Pip leaves the pole, over the tally ticks (12.5 a second). Check it isn't cluttered. A pit death now waits 2.8 s like a hit death (was 1.2 s), so the 2.4 s death jingle finishes before the restart. Check the pit wait doesn't feel long.
- [ ] **Unlock edge cases.** A cold start on the menu is silent until the first click or key, then the menu loop starts. That first click's select sound is dropped, because nothing is decoded until audio unlocks. A reload straight into `#/play/1-1` is silent until the first key press, then the stage music starts from the top.
- [ ] **Hitches.** Watch the dev overlay for long frames while coins, stomps and bricks fire together and when music switches (star, goal, death). Each sound starts two Web Audio nodes; nothing is decoded during play.
- [ ] **First stage load.** 1-1 fetches about 1.7 MB of audio (theme, hurry, star, clear, game over and every SFX) alongside the scenery. Audio does not hold up the stage: music starts as soon as its decode finishes. Check how long that takes on a cold cache.
- [ ] **Decoded memory.** Decoded buffers live for the app's lifetime. 1-1's set plus the menu is about 85 s of audio, roughly 16 MB at a 48 kHz output. Preparing a different stage releases the old stage's theme, hurry and boss music (`musicToRelease`). Measure it, and check the 20-restart heap test still passes.
- [ ] **Other browsers.** FLAC decoding was checked in Chromium only, bit-exactly. Check Firefox and Safari decode, and the iOS Safari unlock (it needs the silent primer buffer started inside the gesture).
- [ ] **Tab switching.** Hiding the tab suspends the audio context and showing it resumes. Check music doesn't drift from the game after a long switch.
- [ ] **e2e has not been run** this phase.

Built but not reachable yet (later phases):

- [x] The pause chime and held music run on the bridge's `pause` and `resume` commands, which nothing sends until Phase 6's pause overlay. _Done in Phase 6: the pause key, gamepad Start, the pause button and hiding the tab all pause through the overlay._
- [x] The volume UI is Phase 6. It binds to `AudioService.volumes`, `setVolume(channel, value)` and `setVolumes(partial)`, and persists them through the save service. _Done in Phase 6: master, music and effects on the settings screen, music and effects in the pause overlay; releasing the master or effects slider plays the coin sound._
- [x] `sfx.menu-move` waits for Phase 6's menus. _Done in Phase 6: every focus move in a menu plays it._
- [x] `sfx.tube` and `sfx.boss-hit` are wired to the Phase 7 tubes and boss. The underground, sky, castle and boss music (and their hurry variants) are in the manifest. Listening and mix review remain open.

## Phase 6: Angular shell + saves

Review checklist from `docs/plan.md`:

- [ ] The loop menu → map → 1-1 → results → map works smoothly.
- [ ] Progress survives a page reload.
- [ ] Corrupting the save in devtools recovers gracefully. (Edit `pip.save` in Application → Local Storage, reload: the menu shows a notice and the last good save, from `pip.save.backup`, comes back. The damaged text is kept in `pip.save.corrupt`.)
- [ ] Rebinding keys works.
- [ ] Low quality visibly reduces effects.
- [ ] Pausing and resuming doesn't recreate the game.

Not measured or not verified (no review this phase):

- [ ] **No full owner browser review has happened.** A Chromium test covered the full-width settings layout and sensitivity sliders; manually check every screen at several window sizes: the main menu, world map (node positions and dashed route), settings, pause, results and game over.
- [ ] **Look and feel of the menus.** Pixel panels with hard offset shadows, the red Play button, gold focus, Press Start 2P throughout. The star glyphs on the map's goal list (☆/★) fall back to a system font; check they read well. Check contrast of the muted grey text against the panel colour.
- [ ] **Keyboard navigation.** Arrows move focus in every menu (wrapping), Esc goes back (map → menu, settings → menu, pause → resume, results and game over → map). Left/right on a slider change the value instead of moving focus. Held Enter or Space never repeats a click.
- [ ] **Gamepad navigation.** D-pad or stick moves (repeat after 350 ms, then every 140 ms), A confirms, B goes back, Start confirms on screens and resumes in the pause overlay. A button held when a menu opens is ignored until released. Only the first connected pad is read, with the standard mapping. Polling runs only while a menu is on screen and a pad is connected; check it stops in game (no pad reads in a performance profile while playing).
- [ ] **Pause edge cases.** Pause on the very first frame after loading, during the death hop, while the Rush Star music plays and during the hurry warning. Pause asked for during loading (switch tab while loading) is applied after load. A pause press during a death restart (between scenes) is dropped; check that it never leaves the overlay up over a running game. The pause key that resumes must not re-pause. Restart from the pause overlay starts the music again.
- [ ] **Results.** Stars pop in one after another (none under reduced motion), BEST tags on a new best score or time, the XP bar and RANK UP. "Next stage" should route to 1-2 after a 1-1 clear. Replay restarts in the same game. Check the results appear only after the tally finishes and the clear fanfare isn't cut.
- [ ] **Movement sensitivity.** Test jump and left/right turning at 50%, 100% and 150%; check the settings sliders remain usable with keyboard and gamepad navigation.
- [ ] **Progression numbers.** XP 1 per 100 points + 200 first clear + 100 per new star; ranks at 500 / 1500 / 3000 / 5000 / 8000 / 12000. 1-1's target is 150 time units (60 s); check it is a fair but real challenge. Postmarks count across runs.
- [ ] **Quality.** Low: no bushes layer, no sparkles, 2 brick-debris pieces, still clouds, canvas capped at 3×. Medium: everything at 720p, capped at 4×. High: 1440p, capped at 6×. Quality applies from the next stage load. Measure Low against High in 1-1 on the baseline machine.
- [ ] **Reduced motion.** Defaults to the OS setting. Stops cloud drift and every UI animation and transition. Check nothing else in game should also calm down (the star-block shimmer, coin spin and Rush Star tint are gameplay signals and stay).
- [ ] **Screen shake.** The Phase 7 boss now consumes `EffectProfile.screenShake`; confirm its amplitude and reduced-motion/setting behavior in the browser.
- [ ] **Rebinding.** The primary key is replaced; a key taken from another action moves (or swaps if it was that action's only key); Tab, Backquote, F1–F12 and the Meta keys are refused; Esc cancels. Gamepad buttons can't be rebound. Check AZERTY and other layouts: bindings store `KeyboardEvent.code` (physical position), and labels show the US name.
- [ ] **Save timing.** A clear writes at once; settings write 500 ms after the last change and on `pagehide`. Check there is no frame hitch when the results appear (one `JSON.stringify` of a small object).
- [ ] **Private browsing and blocked storage.** The menu should say progress can't be saved, and the game should still work.
- [ ] **Cross-tab.** Two tabs each keep their own copy in memory and the last write wins. Not handled (no `storage` event listener).
- [ ] **Initial bundle** grew from 235 kB to 243 kB raw (67 kB transfer). Phaser is still lazy.
- [ ] **The full e2e suite has not been run.** The settings layout/slider browser test passed; the lifecycle helpers cover menu → map → Deliver!, leaving through pause → World map, and rapid toggling by browser back.

Earlier-phase items handled here:

- The `:stageId` route parameter already chose the stage since Phase 2. Phase 6 also starts a fresh game when the parameter changes on the same screen (Next stage).
- Pause commands sent while `BootScene` runs were dropped (Phase 1). Now a pause asked for before `loadComplete` is remembered and sent after it, and the overlay only appears when the scene confirms with `paused`.

Built but not reachable yet (later phases):

- `applySettings` is still never sent: settings are read at stage start. Live quality changes would need a scenery reload.
- Save fields `cosmetics` (owned and equipped outfit) and `achievements` are validated and stored, but Phase 7 still needs the catalogue, unlock/purchase services and screens. Rank-unlocked outfits are also unfinished.
- All four World 1 levels are now registered and unlock in order on the world map; check each route and results-screen progression by hand.

## Phase 7: Rest of World 1

Implemented: 1-2, 1-3, 1-4, the 1-1 bonus area, themed tiles/scenery, enterable tubes, moving platforms, lava, firebars, the Rook King boss, screen shake, run stats and gameplay milestone events. The Angular achievement/shop/story work is still missing; do not treat this phase as complete.

Not measured or not verified:

- [ ] Play all four stages by hand, including the bonus-room entrance/exit and every stage transition.
- [ ] Review stage teaching, difficulty, collision fairness, boss telegraphs, camera lock/gate, and the boss defeat/goal sequence.
- [ ] Review each stage's art, HUD, effects, and scenery readability at High and Medium quality.
- [ ] Check moving-platform riding and jumps, firebar/lava damage, tube transitions, checkpoint/death behavior, and cleanup after restarts.
- [ ] Listen to underground, sky, castle and boss music plus tube/boss-hit SFX. Check pause, hurry and stage-clear transitions.
- [ ] Measure full-stage and boss-scene frame rate, p95, long frames and active bodies on the baseline GPU. No Phase 7 performance target has been measured.
- [ ] Implement and test Angular achievement, shop/cosmetic and story features before the Phase 7 browser review.
- [ ] Verify save persistence, progression unlocks, outfits, achievements and story replay after those features exist.
- [ ] Run the full Playwright suite after Angular feature work; the prior phase's e2e checklist is still unverified.
