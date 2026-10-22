import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import { computeZoom } from '../core/display';
import type { GameFactory } from '../core/game-factory';
import { readZoom, writeRegistry } from '../core/registry-keys';
import { BootScene } from '../scenes/boot.scene';
import { SandboxScene } from '../scenes/sandbox.scene';
import { TestRoomScene } from '../scenes/test-room.scene';
import { createGameConfig } from './game-config';

export const createGame: GameFactory = (parent, bridge, options) => {
  const initialZoom = computeZoom(
    parent.clientWidth || window.innerWidth,
    parent.clientHeight || window.innerHeight,
    window.devicePixelRatio || 1,
    options.quality,
  );
  const config = createGameConfig(parent, initialZoom, [BootScene, SandboxScene, TestRoomScene]);
  config.callbacks = {
    preBoot: (preBootGame) => {
      writeRegistry(preBootGame.registry, 'bridge', bridge);
      writeRegistry(preBootGame.registry, 'options', options);
      writeRegistry(preBootGame.registry, 'zoom', initialZoom);
    },
    postBoot: (bootedGame) => {
      // pixelArt makes Phaser force nearest-neighbour on the canvas element; the fractional FIT to the window should be smooth.
      bootedGame.canvas.style.imageRendering = 'auto';
    },
  };
  const game = new Phaser.Game(config);

  return {
    destroy: () => game.destroy(true),
    resize: (viewportCssWidth, viewportCssHeight, devicePixelRatio) => {
      const zoom = computeZoom(
        viewportCssWidth,
        viewportCssHeight,
        devicePixelRatio,
        options.quality,
      );
      if (zoom === readZoom(game.registry)) return;
      game.scale.resize(LOGICAL_WIDTH * zoom, LOGICAL_HEIGHT * zoom);
      writeRegistry(game.registry, 'zoom', zoom);
    },
  };
};
