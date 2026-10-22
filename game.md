ARCHITECTURE AND PERFORMANCE SPECIFICATION
Angular + Phaser 3 — 2D Platformer
1. Core Architecture Principles

Build the game using three clearly separated areas:

Game Engine: Phaser 3 gameplay, physics, scenes, entities, cameras, collisions, animation, and rendering.
Angular Application: Main menu, world map, settings, achievements, shop, HUD overlays, navigation, and save management.
Assets and Content: Sprites, tilesets, backgrounds, animations, audio, fonts, level definitions, and asset manifests.

Keep the boundaries strict. Angular must not control per-frame gameplay, and Phaser must not implement application-level navigation or duplicate Angular's save-management logic.

Performance is a first-class requirement. Design for a stable 60 FPS on supported, reasonably modern desktop hardware, with adaptive settings for weaker devices.

Use Angular standalone components, lazy loading, typed services, dependency injection, and other conventions recommended by the installed stable Angular version. Avoid unnecessary abstractions and dependencies.

Do not use React, Three.js, Rapier, or any 3D engine.

2. Recommended Project Structure

Use a feature-oriented Angular application with independent game-engine and asset directories.

retro-platform-adventure/
├── public/
│   └── assets/
│       ├── images/
│       ├── fonts/
│       └── audio/
│
├── src/
│   ├── main.ts
│   ├── index.html
│   ├── styles.css
│   │
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   │
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── save.service.ts
│   │   │   │   ├── progression.service.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── audio-settings.service.ts
│   │   │   │   └── game-session.service.ts
│   │   │   ├── models/
│   │   │   │   ├── save-data.model.ts
│   │   │   │   ├── progression.model.ts
│   │   │   │   └── settings.model.ts
│   │   │   └── utilities/
│   │   │
│   │   ├── features/
│   │   │   ├── main-menu/
│   │   │   │   ├── main-menu.component.ts
│   │   │   │   ├── main-menu.component.html
│   │   │   │   └── main-menu.component.css
│   │   │   │
│   │   │   ├── world-map/
│   │   │   ├── settings/
│   │   │   ├── achievements/
│   │   │   ├── character-shop/
│   │   │   ├── pause-menu/
│   │   │   ├── results/
│   │   │   └── game-shell/
│   │   │       ├── game-shell.component.ts
│   │   │       ├── game-shell.component.html
│   │   │       └── game-shell.component.css
│   │   │
│   │   └── shared/
│   │       ├── components/
│   │       ├── pipes/
│   │       └── ui/
│   │
│   ├── game-engine/
│   │   ├── bootstrap/
│   │   │   ├── create-game.ts
│   │   │   └── game-config.ts
│   │   │
│   │   ├── core/
│   │   │   ├── game-events.ts
│   │   │   ├── game-registry.ts
│   │   │   ├── game-context.ts
│   │   │   └── collision-groups.ts
│   │   │
│   │   ├── scenes/
│   │   │   ├── boot.scene.ts
│   │   │   ├── preload.scene.ts
│   │   │   ├── level.scene.ts
│   │   │   ├── bonus.scene.ts
│   │   │   └── boss.scene.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── player/
│   │   │   ├── enemies/
│   │   │   ├── bosses/
│   │   │   ├── collectibles/
│   │   │   ├── power-ups/
│   │   │   └── projectiles/
│   │   │
│   │   ├── systems/
│   │   │   ├── physics/
│   │   │   ├── input/
│   │   │   ├── camera/
│   │   │   ├── animation/
│   │   │   ├── scoring/
│   │   │   ├── checkpoints/
│   │   │   ├── particles/
│   │   │   └── level-completion/
│   │   │
│   │   ├── world/
│   │   │   ├── level-loader.ts
│   │   │   ├── tilemap-loader.ts
│   │   │   └── world-builder.ts
│   │   │
│   │   └── configuration/
│   │       ├── movement.config.ts
│   │       ├── physics.config.ts
│   │       ├── scoring.config.ts
│   │       └── performance.config.ts
│   │
│   ├── content/
│   │   ├── levels/
│   │   │   ├── world-1/
│   │   │   ├── world-2/
│   │   │   ├── world-3/
│   │   │   └── bonus/
│   │   │
│   │   ├── manifests/
│   │   │   ├── asset-manifest.ts
│   │   │   └── level-manifest.ts
│   │   │
│   │   └── localization/
│   │
│   └── environments/
│
├── scripts/
│   ├── validate-assets.ts
│   └── validate-levels.ts
│
├── angular.json
├── package.json
├── tsconfig.json
└── README.md


This is the logical starting structure. Create directories and additional files only when needed; do not generate dozens of empty files or create a class for every trivial operation.

Use Angular's standard public/ asset-serving conventions for the chosen project configuration. Store source-level TypeScript, services, models, and game logic under src/.

3. Responsibility Boundaries
A. Angular application

Angular owns:

Main menu and navigation.
World map and stage selection.
Settings and key bindings.
Achievement and cosmetic screens.
Pause and results overlays.
Persistent campaign progression.
Save migration, validation, and recovery.
Loading indicators and error states.
Accessible interface elements.

Use standalone components and lazy-load substantial application features where beneficial.

Keep menus in normal HTML and CSS instead of rendering them inside the Phaser canvas. This improves accessibility, text rendering, layout flexibility, and separation of concerns.

Use Angular signals or another suitable lightweight state mechanism for UI-facing state. Use RxJS where asynchronous streams and event composition provide a genuine benefit.

Do not introduce NgRx or another large state-management framework without a demonstrated need.

B. Phaser game engine

Phaser owns:

Gameplay rendering and its update loop.
Physics, movement, collisions, and world boundaries.
Player and enemy behavior.
Boss encounters and projectiles.
Tilemaps, moving platforms, hazards, and collectibles.
Camera movement.
Gameplay animation and particles.
Gameplay input interpretation.
Level completion detection.
Temporary session state.

Keep all high-frequency movement and collision calculations inside Phaser. Do not update Angular signals, observables, or component properties on every frame.

C. Assets and content

The content area owns:

Level definitions and tilemap data.
Asset manifests and asset identifiers.
World metadata.
Stage objectives and target times.
Enemy placements and collectible locations.
Localization strings.
Asset-validation tools.

Keep tunable gameplay values in typed configuration or level data rather than scattering magic numbers through the engine.

Use stable asset identifiers instead of duplicating raw asset paths throughout the codebase.

4. Communication Between Angular and Phaser

Create a narrow, typed integration layer.

Angular should communicate with Phaser through explicit commands, such as:

Start a stage.
Pause or resume gameplay.
Restart the current stage.
Return to the world map.
Change supported gameplay settings.
Request a controlled snapshot of session results.

Phaser should notify Angular about meaningful events, such as:

Level loading started or completed.
Player health changed, when the UI needs the update.
A checkpoint was activated.
A stage was completed.
An achievement-triggering milestone occurred.
The player died or exhausted their lives.
A boss was defeated.
A recoverable gameplay error occurred.

Define event names and payloads in typed interfaces. Document which side owns each piece of state.

Performance rule: Do not send events every frame. Batch or throttle nonessential HUD updates and emit events only when values change meaningfully.

For example, update the score display when points are awarded rather than on every Phaser update tick.

The Phaser game instance must be created once for a game session and destroyed correctly when the player leaves the game screen or the owning component is destroyed.

5. Performance Requirements: 60 FPS

Treat 60 FPS as a measurable target, not a promise based on architecture alone.

At 60 FPS, the approximate total frame budget is 16.67 milliseconds.

Aim to keep the main-thread work for gameplay comfortably below that budget, leaving room for browser rendering, garbage collection, and UI work.

Rendering
Use Phaser's WebGL renderer when supported, with a suitable fallback where practical.
Use sprite atlases and texture atlases to reduce texture changes and draw overhead.
Use tilemaps instead of creating a separate complex object for every static ground tile.
Avoid excessive transparent overdraw and unnecessarily large textures.
Reuse particle emitters and pooled short-lived objects where profiling shows a benefit.
Cull or deactivate objects outside the relevant gameplay area where appropriate.
Avoid unnecessary post-processing and expensive full-screen effects.
Use suitable texture sizes and avoid loading every world's assets simultaneously.
Physics and game logic
Use simple, stable collision bodies.
Prefer static physics bodies for immovable level geometry.
Avoid unnecessary overlap checks between unrelated object groups.
Limit the number of active physics objects.
Use Phaser groups and object pools when frequent creation and destruction becomes expensive.
Keep collision callbacks short.
Avoid creating temporary arrays, closures, and objects every frame without a good reason.
Never perform file operations, save serialization, or large asset parsing in the gameplay update loop.

Use a fixed-step simulation only if the selected physics architecture requires it; otherwise, use Phaser's established update and physics timing behavior. Do not add a second competing game loop.

Angular performance
Keep the Phaser canvas outside frequently changing Angular templates.
Do not trigger Angular change detection every frame.
Avoid excessive global state subscriptions.
Use OnPush change detection where appropriate for UI components.
Lazy-load menu features and heavier screens.
Keep DOM animations limited to UI transitions, not player movement.
Avoid expensive CSS blur, shadow, and filter effects across large screen areas.
Avoid unnecessary component destruction and recreation when navigating between pause and gameplay states.
Memory and lifecycle
Reuse textures and animation definitions.
Unregister event listeners during teardown.
Stop timers, tweens, and sounds when their scene is destroyed.
Release references to inactive entities.
Destroy the Phaser game instance when appropriate.
Avoid reloading the same assets when switching between menus and stages.
Test repeated stage restarts for memory growth.
Adaptive performance

Provide configurable quality settings:

Low: fewer particles and reduced environmental animation.
Medium: balanced effects and animation.
High: full supported effects and environmental detail.

Allow reduced motion and disabling screen shake.

Do not automatically reduce rendering quality without measuring actual performance or detecting a clear resource constraint.

6. Loading and Asset Management

Implement a proper boot and loading sequence.

Initialize the minimum required engine assets.
Display an Angular loading screen with real progress information.
Load shared assets needed by the selected stage.
Load stage-specific tilemaps, sprites, audio, and enemy resources.
Start gameplay only when required assets are available.
Report meaningful errors when an essential asset cannot load.

Do not preload the entire game campaign into memory at startup.

Use manifests to identify required and optional assets. Validate asset paths and level references during development.

Use lazy loading, cache reuse, and sensible cleanup to balance startup speed and memory consumption.

7. Save System and Performance

The Angular save service owns permanent campaign progression.

Persist:

Stage unlocks.
Best scores and times.
Stars.
XP and player rank.
Coin balance.
Purchased cosmetics.
Achievements.
Settings and key bindings.

Phaser reports meaningful progression events through the integration layer. Angular validates and applies permanent progression changes.

Do not serialize the full save object every frame.

Save after important events, and debounce only low-priority settings or frequently updated nonessential data. Critical rewards must not be lost due to aggressive debouncing.

Keep storage work out of the gameplay frame loop. Use localStorage for compact data and IndexedDB if larger records justify it.

Validate stored data and provide graceful recovery for missing or corrupt saves.

8. Testing and Performance Verification

Test actual gameplay in a browser, not just compilation.

Required checks:

Angular production build succeeds.
Phaser starts and destroys correctly.
Player movement and collisions remain stable.
Stage transitions work without duplicate game instances.
Restarting stages does not accumulate event listeners or memory.
Save and progression events do not create frame spikes.
Loading a new stage does not block gameplay unexpectedly.
Mobile touch controls remain responsive.
The browser console has no critical errors.

Measure performance using browser profiling tools and Phaser's frame-time information.

Record:

Average frame time.
95th-percentile frame time where measurable.
Long frames and stutters.
Memory growth after repeated restarts.
Loading time for initial startup and stage transitions.

Target 60 FPS on a documented baseline device with a representative level, normal enemy counts, and typical effects enabled. Test heavier boss encounters separately.

A 60 FPS display reading alone is insufficient if the game regularly suffers long frames or stutters.

If the target is missed, profile the bottleneck first and optimize the measured cause rather than applying speculative changes.

9. Development Order

Implement the architecture in this sequence:

Create the Angular application using standalone components and recommended project conventions.
Create the Phaser bootstrap and game-host component.
Establish the typed Angular-to-Phaser communication boundary.
Build one playable stage with the player, platforms, collisions, camera, and finish point.
Implement asset manifests and stage loading.
Add collectibles, enemies, checkpoints, scoring, and audio.
Implement save and progression services.
Build menus, settings, achievements, and results screens.
Profile and optimize the playable stage.
Expand the remaining worlds and boss encounters.
Verify 60 FPS targets, memory behavior, and lifecycle cleanup.

Do not create an elaborate architecture that has never been tested by actual gameplay. Keep the structure modular but practical, and refactor when real requirements justify it.

Final acceptance standard

Deliver a maintainable Angular + Phaser 3 platformer with strict separation between the game engine, Angular UI, and content assets.

Prioritize responsive controls, reliable physics, fast loading, stable 60 FPS performance, low memory overhead, and correct lifecycle management.

Do not claim a performance target has been achieved until it has been measured on representative hardware.