# Pip's Delivery — Game Design

*Working title · 2026-10-22*

This is the authority on **what the game is**: its intent, look, feel, sound and content. The other documents:

- [`engine.md`](engine.md): how it is built (technical design).
- [`plan.md`](plan.md): the phased build order, with a browser review after each phase.
- [`../game.md`](../game.md): the original architecture and performance specification. It still applies in full. `engine.md` makes it concrete.

## 1. Intent

Build an original browser platformer that **plays and feels like Super Mario Bros. (NES, World 1-1)**. It is presented with **modern, rich, layered scenery** behind crisp pixel-art gameplay. Hero, world, names, art, sound and music are all original. Nintendo assets, characters, names, melodies and exact level layouts must not be used.

The owner's two top priorities:

1. **A rock-solid 60fps.** Smooth, stutter-free and measured, not assumed.
2. **Excellent look and feel.** The controls must feel like Mario, and the presentation must be beautiful.

Success means someone who grew up on SMB1 picks it up and says "this feels right" within 30 seconds, then notices how good it looks. It should run smoothly on a normal laptop browser.

## 2. Goals, non-goals, anti-goals

**Goals (first release)**
- One complete world, **World 1**, with four stages: 1-1 overworld, 1-2 underground, 1-3 sky/athletic and 1-4 castle with a boss. Also one hidden bonus room. *(Builder's call on scope. The owner can expand it.)*
- Mario-faithful movement with modern forgiveness (§4).
- The full Angular shell from `game.md`: main menu, world map, pause, results, settings (key bindings, quality, reduced motion, screen shake), achievements, cosmetic shop, and save/progression including XP and rank (§7).
- Keyboard, gamepad and mobile touch controls.
- Free static hosting on GitHub Pages.
- A browser review by the owner after every build phase.

**Non-goals (first release)**
- Worlds 2 and 3 and their bosses. The architecture must make them straightforward to add later.
- Online features, accounts, leaderboards and a backend.
- A level editor.
- Localization beyond English. Strings still go through a localization table.

**Anti-goals (failure even if it "works")**
- Floaty, slippery or "generic web game" controls.
- Visible stutter, hitching on stage load, or long frames during play.
- Anything that reads as a copy of Nintendo IP.
- Blurry, smeared or shimmering gameplay pixels.
- Busy scenery that competes with gameplay. Pip, enemies, hazards and platforms must always read instantly against the background.
- An over-engineered architecture never exercised by real gameplay.

## 3. Look

The art direction is a **hybrid**: crisp pixel-art gameplay in front of high-resolution, layered, atmospheric scenery. The owner's reference images show a classic 1-1 layout in front of big volumetric clouds, snowy mountains fading into haze, lush rolling hills and strong depth.

### 3.1 Gameplay layer (pixel art)
- **16×16 tiles**, drawn with sharp, nearest-neighbour pixels and always scaled by a whole number (3× at 720p).
- **Style:** "NES-plus". It keeps the NES silhouette and the dark outline, with richer shading: more colours per sprite, a highlight and a shadow tone, and soft ambient tint per stage. The base designs are the approved mockup at `.superpowers/brainstorm/*/content/hero-and-world.html`.
- **Hero: Pip the courier** (approved). Pip is a human kid with a teal cap, orange jacket, yellow scarf, blue trousers and brown boots. The scarf flaps when running. Pip has a *small* form (16×16) and a *big* form (16×32).
- **World 1 pieces:** grass-topped dirt ground, clay bricks, gold **star blocks** (our "?" block), coins, **delivery tubes** (our pipes), and a goal post.
- **Animation:** Pip has idle, walk (speed-scaled), run, skid, jump, fall, crouch (big form), grow/shrink, death and goal-pose frames. Blocks bump when hit from below, coins pop and spin, and enemies squash.

### 3.2 Scenery layer (high resolution, parallax)
- 4–6 layers per stage, each scrolling at its own speed. For a World 1 overworld:
  - sky gradient with a sun glow
  - far snowy mountains with atmospheric haze
  - big soft cumulus clouds that drift slowly on their own
  - mid rolling green hills
  - near bushes and tufts
- Smooth, non-pixel rendering at full screen resolution. It is lower in contrast and slightly desaturated compared with the gameplay layer, so gameplay always pops.
- **Generated in code at build time** (owner-approved approach): noise-based clouds, layered mountain ridges with haze, gradient skies and rolling hills. This is attractive and stylised, not photoreal.
- **Swappable:** every layer is a named asset, so painted or AI-generated art can replace any layer later without code changes.
- Each stage theme gets its own scenery set:
  - **Overworld:** day sky, mountains, clouds, hills.
  - **Underground:** dark cavern depth, glowing crystals, dust motes.
  - **Sky:** clouds below as well as above, a distant sunset.
  - **Castle:** dark stone, lava glow, embers.

### 3.3 Effects ("juice")
These scale with quality settings and respect reduced motion: brick-break debris, a dust puff on skid and land, a score pop-up, a coin sparkle, drifting clouds and ambient particles (motes, embers), and a small screen shake on the boss only. There are no full-screen post-processing effects.

### 3.4 HUD
HTML overlaid on the canvas in the **Press Start 2P** pixel font, which is self-hosted. It shows score, coins, world, time and lives, and updates only when values change.

## 4. Feel (the most important section)

Movement is tuned to SMB1's behaviour, using community-documented SMB1 values as the **starting point** (px/frame at 60Hz, in 16px-tile world units):

| Behaviour | Starting value |
|---|---|
| Walk max speed | ~1.56 |
| Run max speed (run button held) | ~2.56 |
| Walk acceleration | ~0.037 |
| Run acceleration | ~0.056 |
| Release deceleration | ~0.051 |
| Skid deceleration (reversing) | ~0.10 |
| Jump initial upward velocity | ~4.0, rising to ~5.0 at run speed |
| Gravity while rising **and** jump held | ~0.125 (slow) to ~0.19 (fast) |
| Gravity otherwise | ~0.44 to ~0.56 |
| Max fall speed | ~4.5 |

Required behaviours:
- **Momentum:** separate walk and run top speeds, and skidding on reversal.
- **Variable jump height:** releasing jump early switches to heavy gravity.
- **Speed matters:** faster horizontal speed gives a higher and longer jump.
- **Air rules:** air control is weaker than ground control, and facing does not flip mid-jump (SMB1 rule).
- **Stomp bounce:** stomping an enemy bounces Pip. Holding jump gives a higher bounce.
- **Modern forgiveness:** about 6 frames of coyote time, about 6 frames of jump buffering, and corner nudging of a few pixels when Pip's head clips a block edge. These should be invisible to a Mario player.
- **Camera:** follows forward, never scrolls back, has a small dead zone, and has no vertical scrolling in standard stages.
- **Tuning:** all values live in config. A dev-only **tuning panel** in the browser lets the owner adjust them live during reviews and copy the result back into config.

The final values are decided by feel at the Phase 2 review.

## 5. Sound

- Original NES-style chiptune: square, triangle and noise channels.
- **Sound effects:** jump (small and big), coin, stomp, bump, brick break, power-up appear, power-up get, 1-up, damage, death, goal, pause, menu move and select, and boss hit.
- **Music:** short catchy loops for overworld, underground, sky, castle, boss, star power, stage clear, game over and menu/map. Every melody is original.
- **Authoring:** sound effects are written as synth parameters and music as note data in source. Both are rendered to audio files at build time, and nothing is synthesised during gameplay.
- Master, music and SFX volume are adjustable in settings.

## 6. Game content (World 1)

- **Story hook (one or two screens):** Pip must deliver a parcel across the land. The **Rook King** has stolen the delivery bag and holds it in his castle. *(Builder's call. Can be renamed.)*
- **Enemies:**
  - **Thornbug:** walks, turns at walls, and is defeated by a stomp.
  - **Shellback:** a stomp turns it into a kickable shell that knocks out other enemies.
  - **Flapjack:** a winged flyer that bobs. A stomp clips its wings and it becomes a walker.
  - **Snapvine:** a plant that emerges from tubes and can't be stomped. It stays hidden while Pip stands next to its tube.
- **Power-ups:**
  - **Parcel Box:** turns Pip big.
  - **Spark Stamp:** Pip throws bouncing parcels, with at most 2 on screen.
  - **Rush Star:** temporary invincibility with its own music.
  - **Green Stamp:** 1-up.
  - 100 coins also gives a 1-up.
- **Damage:** big or powered Pip shrinks to small. Small Pip dies.
- **Stage elements:**
  - star blocks, bricks (big Pip breaks them), hidden blocks and multi-coin blocks
  - enterable delivery tubes (one leads to the bonus room)
  - moving platforms (1-3)
  - lava and firebar hazards (1-4)
  - a mid-stage checkpoint
  - a goal post at the end that awards points by how high Pip touches it
- **1-4 boss, the Rook King:** a readable hop-and-throw pattern, defeated by stomps or parcels, with a hurt flash and a death sequence.
- **Scoring:** SMB1-like. Points for enemies (combo stomps), coins, blocks and goal height. The remaining time converts to points at the goal.
- **Levels:** original layouts that follow SMB1-style teaching design (introduce, then test, then twist).

## 7. Progression

- **Stars per stage:** 1 for finishing, 1 for finding all 3 hidden **Postmarks**, and 1 for beating the target time.
- **Lives:** classic lives and game over, with game over returning to the world map. *(Builder's call.)*
- **Coins** persist as a balance and buy **cosmetic outfits** for Pip (palette variants) in the shop.
- **XP and rank** (required by `game.md` §7): XP comes from stage score, stars and first clears, and fills rank titles from *Trainee Courier* to *Legendary Courier*. Ranks are cosmetic only and unlock an outfit or two. *(Builder's call on the details.)*
- **Achievements:** roughly 15–20 milestones, such as first clear, all Postmarks in a stage, no-damage clear and a 10-stomp combo. *(The builder picks the list.)*
- Best score and best time are kept per stage.

## 8. Left to the builder

- Exact sprite, tile and scenery designs within §3.
- Exact level layouts within §6.
- Melodies and SFX design within §5.
- Achievement list, shop prices, XP curve and rank names.
