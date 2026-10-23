# Phase 5: Sound and Music — Implementation Plan

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax for tracking. Tick each step as it lands and note any deviation inline under its task.

**Goal:** every action in 1-1 has a satisfying, original chiptune sound, the stage has its own catchy loop that speeds up when time runs low, the Rush Star, stage clear, death and game over have their own music, and the menu has a theme. Every other World 1 theme (underground, sky, castle, boss) is composed and rendered now, ready for Phase 7. Audio starts cleanly on the first click or key press, never crackles, and never hitches a frame.

**Architecture:** a small, pure-TS **4-channel chiptune synth** (two band-limited pulse channels, a 4-bit stepped triangle and a 15-bit LFSR noise channel) runs at **build time** in `src/asset-pipeline/audio/`. Sound effects are written as synth parameters and music as note strings in `src/content/audio/`. The generator renders each one, folds loop tails back to the start so loops are seamless, normalises it, and writes it as **FLAC** through a small in-repo encoder. Every sound has a stable manifest ID (`sfx.*`, `music.*`), and `asset-manifest.ts` maps it to its file. At runtime a plain Web Audio engine (`src/game-engine/audio/web-audio-engine.ts`, no Phaser) decodes each file once, keeps the buffers for the app's lifetime, limits voices per sound, and mixes through master, music and SFX gain buses. Angular's root `AudioService` owns the engine and the volumes. Phaser scenes receive it as the narrow `GameAudio` port (through the registry, like the bridge) and call cues on gameplay events only. What music should play is decided by a pure `MusicDirector`.

**Tech Stack:** Phase 4 stack. **No new dependencies.** The FLAC encoder (fixed predictors, partitioned Rice coding) is in-repo, like the PNG and WebP encoders. This replaces `lamejs`/MP3 from `engine.md` §1 and §6.

**Spec:** `docs/design.md` §5. `docs/engine.md` §1, §6, §7. Builds on `phase-4-enemies-and-rules.md`.

## Global Constraints

- Phase 1–4 Global Constraints still apply (emit on change only, no per-frame allocation, Node-imported files use erasable TypeScript only, Phaser only in bootstrap, scenes and glue).
- **Files the Node scripts import** now include `src/asset-pipeline/audio/**` and `src/content/audio/**`. Same rules: erasable TypeScript, `import type` for types, no Phaser, Angular or Node APIs.
- **Nothing is synthesised at runtime.** The runtime only decodes files and starts buffer sources.
- **Format:** FLAC, mono, 24 kHz, samples quantised to 12 bits (stored with FLAC's wasted-bits flag). Every current browser decodes FLAC in `decodeAudioData` (Chrome 56+, Firefox 51+, Safari 11+). See Task 4 for the size measurements behind 24 kHz / 12-bit.
- **Phaser's own sound system is off** (`audio.noAudio`). Phaser would otherwise create and close an `AudioContext` for every game instance and decode every sound again on each Play.
- **Autoplay:** no `AudioContext` exists until the page has had a user activation (`navigator.userActivation.hasBeenActive`, or the first `pointerdown`, `pointerup`, `keydown` or `touchend`). Sounds requested before that are dropped; the wanted music is remembered and starts once audio is unlocked.
- **Hitch-free:** sounds are fetched and decoded when a stage preloads, not when first played. Each SFX has a voice limit (oldest voice stolen with a 5 ms fade), and there is a global cap of 16 SFX voices. Playing a sound creates two Web Audio nodes, on gameplay events only, never per frame.
- **Ownership:** volumes are Angular settings (`engine.md` §7.1). `AudioService` applies them straight to the app-lifetime engine; Phaser never sees them. Phase 6's settings screen binds to `AudioService.volumes` and `setVolume`, and persists through the save service.

## Decisions made without the owner (review later)

- **FLAC instead of WAV + MP3.** 16-bit WAV at 32 kHz would be about 11 MB for the music; an MP3 encoder means a dependency or a very large in-repo encoder. FLAC needs only fixed predictors and Rice codes, decodes everywhere, and with 12-bit samples comes to 4.2 MB in total (Task 4).
- **Engine outside Phaser.** One `AudioContext` for the app's lifetime lets the menu have music, keeps decoded buffers across Play/Menu cycles (`game.md` §5: "avoid reloading the same assets"), and needs the autoplay unlock only once.
- **Music set:** overworld, underground, sky, castle, boss, Rush Star, stage clear, game over and menu. Each stage theme (not boss) also gets a **hurry** variant rendered at 1.3× tempo from the same note data. At 100 time units left the music stops, a warning jingle plays, and the hurry loop starts (SMB rule).
- **Death** is an SFX jingle with the music silenced. **Goal:** grabbing the pole stops the music and plays the goal slide; the stage-clear fanfare starts when Pip leaves the pole; each time-tally chunk ticks.
- **Pause** plays the pause chime and holds the music where it is; resume continues it from the same point. The tab going hidden suspends the whole context.
- **Default volumes:** master 0.8, music 0.6, SFX 0.8, mapped to gain as `v²` so the slider feels even.
- **SFX list** (`design.md` §5 plus the gameplay hooks that exist): jump small, jump big, coin, stomp, kick (shells and knockouts), bump, brick break, power-up appear, power-up get, 1-up, damage (shrink), death, goal, tally tick, time-low warning, parcel throw, tube, checkpoint, pause, menu move, menu select, boss hit. Tube and boss hit are rendered now and wired in Phase 7.
- **Melodies are original.** None of them quotes or paraphrases an SMB theme: different keys, rhythms and contours, checked against the 1-1 overworld, underground, star, castle and flag tunes while writing.

## Review Focus

1. **Loop seams.** Every looping track is rendered with its tail folded back to the start and filtered circularly. Test: `renderSong › a looping song's end flows into its start`.
2. **Hurry, star and death ordering.** Star music beats hurry; hurry survives the star; death and goal silence everything. Test: `MusicDirector`.
3. **Voice stealing.** A full SFX steals its oldest voice; the global cap holds. Test: `VoicePool`.
4. **FLAC correctness.** A test decoder round-trips every subframe type bit-exactly. Chromium's `decodeAudioData` decodes the generated files (one-off check).
5. **Unlock.** Nothing is created before activation; the wanted music starts on unlock. Test: `WebAudioEngine` with a fake context.

---

## File Structure

```
src/asset-pipeline/audio/notes.ts                    note names → MIDI → Hz
src/asset-pipeline/audio/msb-bit-writer.ts           MSB-first bit writer with unary and signed writes
src/asset-pipeline/audio/flac-encoder.ts             encodeFlac(Int16Array, sampleRate)
src/asset-pipeline/audio/flac-decoder.test-helpers.ts  decoder for the encoder's subset (tests only)
src/asset-pipeline/audio/oscillators.ts              PolyBLEP pulse, stepped triangle, LFSR noise
src/asset-pipeline/audio/tone.ts                     ToneSpec, envelope, sweep, vibrato, arpeggio → samples
src/asset-pipeline/audio/mixdown.ts                  loop fold, circular DC block, normalise, PCM16
src/asset-pipeline/audio/notation.ts                 note-string parser and helpers
src/asset-pipeline/audio/sequencer.ts                song → timed tones per channel
src/asset-pipeline/audio/render-sound.ts             renderSfx(), renderSong()
src/content/audio/sound-ids.ts                       stable SFX and music IDs (runtime + pipeline)
src/content/audio/sound-format.ts                    SfxDefinition, Song, Instrument types
src/content/audio/sfx-library.ts                     every SFX as synth parameters + voice limits
src/content/audio/instruments.ts                     shared instruments and drum kit
src/content/audio/songs/*.ts                         one file per theme
src/content/audio/music-library.ts                   music ID → song (+ hurry variants)
src/content/audio/stage-sounds.ts                    sound IDs a stage needs
src/content/manifests/asset-manifest.ts              + `sound` entries
scripts/generate-assets.ts                           + sound rendering
src/game-engine/audio/game-audio.ts                  GameAudio port, silent implementation
src/game-engine/audio/volume.ts                      AudioVolumes, defaults, gain curve
src/game-engine/audio/voice-pool.ts                  VoicePool (per-sound limit, global cap, steal oldest)
src/game-engine/audio/music-director.ts              MusicDirector (pure)
src/game-engine/audio/web-audio-engine.ts            WebAudioEngine (Web Audio glue, no Phaser)
src/app/core/services/audio.service.ts               root owner of the engine and volumes
```

Also new: `src/asset-pipeline/audio/song-validator.ts`, `src/content/audio/phrases.ts`, `src/game-engine/audio/browser-audio-environment.ts`, `src/game-engine/configuration/audio.config.ts`.

Modified: `game-factory.ts`, `registry-keys.ts`, `create-game.ts`, `game-config.ts` (`noAudio`), `boot.scene.ts`, `level.scene.ts`, `player-controller.ts` (`justLaunched`), `stage-actors.ts` (`strike` event), `rules.config.ts` (pit death length), `level-format.ts`, `level-validator.ts`, `asset-manifest.ts`, `generate-assets.ts`, `game-session.service.ts`, `main-menu.component.*`. (`validate-assets.ts` needed no change: sound entries are ordinary manifest entries.)

---

### Task 1: Encoder core

**Files:** `notes.ts`, `msb-bit-writer.ts`, `flac-encoder.ts`, `flac-decoder.test-helpers.ts` + specs.

- [x] **Step 1 (TDD):** note parsing (`C4`, `F#5`, `Bb3`), MIDI 69 = 440 Hz.
- [x] **Step 2 (TDD):** MSB bit writer: bit order, unary, signed values, byte alignment.
- [x] **Step 3 (TDD):** FLAC: header and STREAMINFO fields, CRC-8 and CRC-16 vectors, constant / fixed / verbatim subframes round-trip, short last block, random noise and sine round-trip bit-exactly.
- [x] **Step 4:** one-off Chromium check that `decodeAudioData` decodes a generated file to the same samples.

_Done. Deviations: the encoder also writes FLAC "wasted bits" (see Task 4), and the test decoder reads them. The Chromium check (gitignored `tmp/flac-chromium-check.mjs`, Playwright's Chromium, `OfflineAudioContext` at 24 kHz) decoded overworld, stage clear, coin, brick break and tally with the right lengths and peaks, and every sample a multiple of the 12-bit step. Chromium scales positive samples by 1/32767 and negative by 1/32768, so a naive comparison looks off by half; it is exact._

### Task 2: Synth and sequencer

**Files:** `oscillators.ts`, `tone.ts`, `mixdown.ts`, `notation.ts`, `sequencer.ts`, `render-sound.ts` + specs.

- [x] **Step 1 (TDD):** pulse frequency and duty (zero-crossings, mean), triangle range and steps, noise determinism and short mode.
- [x] **Step 2 (TDD):** envelope stages, pitch sweep end, arpeggio steps, tone length includes release.
- [x] **Step 3 (TDD):** notation: lengths, rests, ties, drums, repeat and transpose helpers, bad tokens rejected.
- [x] **Step 4 (TDD):** sequencer: note start times at tempo, gate, swing-free timing, loop length, tempo scaling for hurry.
- [x] **Step 5 (TDD):** mixdown: loop fold, circular DC blocker keeps the seam continuous, peak normalisation, PCM16 clamp.

_Done. Monophonic channels: each note is cut (3 ms fade) where the next note on its channel starts, wrapping round for loops, like the real chip. `delayPhrase` builds the underground's echo channel from its melody. A `song-validator` enforces the chip (at most two pulse, one triangle and one drum channel), whole bars, equal channel lengths and pitch ranges._

### Task 3: Sound content

**Files:** `src/content/audio/*` + specs.

- [x] **Step 1:** sound IDs and formats; SFX library (every SFX in the list above).
- [x] **Step 2:** instruments and drum kit; overworld, star, stage clear, game over, menu, time-low.
- [x] **Step 3:** underground, sky, castle, boss.
- [x] **Step 4 (TDD):** every song's channels have equal length in whole bars, every note parses and sits in its channel's range, every SFX renders under 3 s with a silent end, every ID is unique.

_Done. Songs: overworld "Parcel Path" (F major, 150 BPM, 16 bars), underground "Cellar Sorting" (D minor, 112 BPM, plucked lead with a 3-step echo), sky "Updraft" (D lydian, 126 BPM, 16th arpeggios), castle "Rook's Keep" (E harmonic minor, 132 BPM, ostinato bass), boss "Rook King" (D minor, 168 BPM), star "Rush Star" (G major, 176 BPM, 4 bars), menu "Sorting Office" (E-flat major, 104 BPM), plus the stage-clear fanfare and game-over phrase. Death and the time-low warning are SFX jingles sequenced from note strings. Phrase helpers (`bounce`, `pump`, `offbeats`…) live in `src/content/audio/phrases.ts`._

### Task 4: Manifest and generator

**Files:** `asset-manifest.ts`, `stage-sounds.ts`, `generate-assets.ts`, `validate-assets.ts`, `level-format.ts`, `level-validator.ts`.

- [x] **Step 1:** `sound` manifest entries at `assets/generated/audio/{sfx,music}/<name>.flac`.
- [x] **Step 2:** the generator renders and encodes sounds; audio inputs join the cache hash; `art-overrides/` works for sounds too.
- [x] **Step 3 (TDD):** a level's music must be a stage theme; `stageSoundIds` lists SFX, theme, hurry, star, clear and game over.

_Done. **Deviation (size):** the first render at 32 kHz / 16-bit came to 8.0 MB, because FLAC only reaches about 73% on full mixes (the noise drums are incompressible). A probe (gitignored `tmp/audio-size-probe.ts`) measured 32/24/22.05 kHz × 16/13/12/11 bits. **24 kHz, 12-bit** halved it: the encoder now detects samples quantised to 12 bits and writes them with FLAC's wasted-bits flag. Total audio is **4.2 MB** (36 files once the Postmark sound was added; 4,233 kB); a stage needs about 1.7 MB (its theme, hurry, star, clear, game over and every SFX). 12 bits is still finer than the NES's own DAC, and 24 kHz keeps content to 10 kHz (mastering low-pass). Full regeneration takes about 4.5 s; audio is under 2 s of that._

### Task 5: Runtime logic

**Files:** `game-audio.ts`, `volume.ts`, `voice-pool.ts`, `music-director.ts` + specs.

- [x] **Step 1 (TDD):** volume clamp and gain curve, defaults.
- [x] **Step 2 (TDD):** `VoicePool`: per-sound limit, steal oldest, frees ended voices, global cap.
- [x] **Step 3 (TDD):** `MusicDirector`: stage → star → back; hurry warning then hurry track; star during hurry; death and goal silence; clear; game over.

_Done. `GameAudio` (the port Phaser sees) has `prepare`, `playSfx`, `playMusic`, `pauseMusic`, `resumeMusic` and `stopAll`; `SILENT_AUDIO` is the no-op used where Web Audio is missing (jsdom, very old browsers). `sanitizeVolumes` is there for Phase 6 to clean values loaded from a save. The hurry rule (100 time units, 1.5 s warning) lives in `configuration/audio.config.ts`._

### Task 6: Engine, Angular service, wiring

**Files:** `web-audio-engine.ts`, `audio.service.ts`, factory, registry, scenes, player, actors, menu + specs.

- [x] **Step 1 (TDD):** `WebAudioEngine` with a fake context: no context before activation, unlock on gesture, wanted music starts after decode, same track is not restarted, pause/resume keeps position, volumes reach the buses.
- [x] **Step 2:** `AudioService` (root) with volume signals; passed to the game factory; Phaser's sound off.
- [x] **Step 3:** cues in `LevelScene`, `Player` (jump), `StageActors` (`strike`), block hits, power-ups, death, goal, tally, pause; `MusicDirector` drives the music; clean-up stops sound.
- [x] **Step 4:** menu music and the Play select sound.

_Done. Deviations and findings:_

- _`AudioService` (generated with `ng generate service --type=service`) is root-provided and owns the engine and the `volumes` signal; `setVolume(channel, value)` and `setVolumes(partial)` are the Phase 6 API. `GameSessionService` passes `audioService.gameAudio` as the factory's new fourth argument (written to the registry as `audio`), and calls `stopAll()` on detach, so leaving the play route silences everything. Scene clean-up does not stop sound, because `scene.restart` after a death must not cut the death jingle._
- _`Player` is unchanged: the controller exposes `justLaunched`, and `LevelScene` reads it on the world step (its handler runs after Pip's), so a stomp bounce never sounds like a jump._
- _`StageActors` reports every kick and knockout through a new `strike` event (one kick sound). A stomp stays a stomp._
- _Added `sfx.postmark` (a stamp thump and a rising arpeggio), which the list above missed. Coins that reach 100 play the 1-up sound instead of the coin._
- _Cue map: jump small/big, stomp, kick, bump (any solid block from below, including used blocks and ground), power-up appear (item released), coin (block or pickup), brick break, power-up get (Parcel Box, Spark Stamp, Rush Star), 1-up (Green Stamp, 100 coins, score ladder 1UP), damage (shrink), death (hit, pit, time-out; music silenced), checkpoint, Postmark, parcel throw, goal (music silenced), stage clear (when Pip leaves the pole), tally tick (each chunk), time-low + hurry, star music while the star lasts, game over, pause chime with music held, resume._
- _**Rule change:** a pit death now waits 2.8 s like a hit death (was 1.2 s), so the death jingle (shortened to 2.4 s) always ends before the restart. SMB also plays the whole death tune for pits. A test pins the jingle under both durations, and another pins the time-low jingle inside the hurry warning._
- _`BootScene` silences the menu music when any stage boots, so the test room is quiet too. A `restart` command clears the paused music first, so a restart from a paused game starts its music again._
- _A one-off headless smoke run of the production build (gitignored `tmp/audio-smoke.mjs`, Chromium with `--autoplay-policy=user-gesture-required`) confirmed: no `AudioContext` before the first click, exactly one context in total (Phaser's own sound is off), the menu loop starts on the Play click, 1-1's overworld loop starts at stage load, a jump plays its SFX, 29 FLAC files are fetched once each, and the console has no audio warnings._

### Task 7: Verify and document

- [x] `npm test` passes (599 tests). `NG_CLI_ANALYTICS=false npm run build` succeeds; asset generation and both validators run in `prebuild`. The initial bundle is unchanged at 235 kB; the audio engine is an 11 kB lazy chunk shared by the menu and the game.
- [x] `docs/plans/deferred-review.md` Phase 5 section; `docs/plan.md` status and link; `docs/engine.md` §1, §6, §7 audio notes.
- [x] Prettier on changed files only.
