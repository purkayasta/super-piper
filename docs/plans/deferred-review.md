# Deferred Review Items

_2026-10-23 · The owner chose to build Phases 3–7 back to back on one branch (`phases-3-7`), one commit per phase, with no per-phase browser review. Everything below is checked in one combined review after Phase 7. Each phase adds its own section when it is built._

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

- Big-Pip (16x32) frames, and the grow/shrink and death animations, move to Phase 4 with the Parcel Box. The small-Pip death frame is already in the atlas.
- Falling into a pit respawns Pip at the start, and the timer stops at 0 without killing. Lives, death and the time-out are Phase 4 rules.
- Goal-height points and the time bonus at the goal are Phase 4 scoring. The DELIVERED! banner is a stand-in for the Phase 6 results screen.
- Tubes are not enterable (Phase 7). Their destination field is already validated.
