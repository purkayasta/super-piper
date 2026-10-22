import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../configuration/performance.config';

export function createGameConfig(
  parent: HTMLElement,
  zoom: number,
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: LOGICAL_WIDTH * zoom,
    height: LOGICAL_HEIGHT * zoom,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#6cb4ff',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    fps: { smoothStep: true },
    scene: scenes,
  };
}
