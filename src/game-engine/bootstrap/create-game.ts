import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';
import { computeZoom } from '../core/display';
import type { GameFactory } from '../core/game-factory';
import { BootScene } from '../scenes/boot.scene';
import { SandboxScene } from '../scenes/sandbox.scene';
import { createGameConfig } from './game-config';

export const createGame: GameFactory = (parent, bridge, options) => {
  const initialZoom = computeZoom(
    parent.clientHeight || window.innerHeight,
    window.devicePixelRatio || 1,
    options.quality,
  );
  const config = createGameConfig(parent, initialZoom, [BootScene, SandboxScene]);
  config.callbacks = {
    preBoot: (preBootGame) => {
      preBootGame.registry.set('bridge', bridge);
      preBootGame.registry.set('options', options);
      preBootGame.registry.set('zoom', initialZoom);
    },
  };
  const game = new Phaser.Game(config);

  return {
    destroy: () => game.destroy(true),
    resize: (viewportCssHeight, devicePixelRatio) => {
      const zoom = computeZoom(viewportCssHeight, devicePixelRatio, options.quality);
      if (zoom === game.registry.get('zoom')) return;
      game.registry.set('zoom', zoom);
      game.scale.resize(LOGICAL_WIDTH * zoom, LOGICAL_HEIGHT * zoom);
    },
  };
};
