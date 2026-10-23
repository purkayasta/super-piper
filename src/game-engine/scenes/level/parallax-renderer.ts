import type Phaser from 'phaser';
import {
  SCENERY_RESOLUTIONS,
  sceneryLayersFor,
  type SceneryLayerSpec,
  type SceneryResolution,
  type SceneryTheme,
} from '../../../content/art/scenery-layers';
import { sceneryAssetId } from '../../../content/manifests/asset-manifest';
import { LOGICAL_WIDTH } from '../../configuration/performance.config';
import { advanceDrift, stripCopiesNeeded, stripScreenX } from '../../systems/parallax/parallax';

interface ParallaxLayer {
  readonly spec: SceneryLayerSpec;
  readonly copies: readonly Phaser.GameObjects.Image[];
  drift: number;
}

const MS_PER_SECOND = 1000;

export class ParallaxRenderer {
  private readonly layers: ParallaxLayer[] = [];

  constructor(
    scene: Phaser.Scene,
    theme: SceneryTheme,
    resolution: SceneryResolution,
    baseDepth: number,
    includeDetail: boolean,
    private readonly drifting: boolean,
  ) {
    const scale = 1 / SCENERY_RESOLUTIONS[resolution];
    sceneryLayersFor(theme, includeDetail).forEach((spec, index) => {
      const key = sceneryAssetId(theme, spec.id, resolution);
      if (!scene.textures.exists(key)) return;
      const count = spec.scrollFactor === 0 ? 1 : stripCopiesNeeded(spec.stripWidth, LOGICAL_WIDTH);
      const copies = Array.from({ length: count }, () =>
        scene.add
          .image(0, spec.top, key)
          .setOrigin(0, 0)
          .setScale(scale)
          .setDepth(baseDepth + index),
      );
      this.layers.push({ spec, copies, drift: 0 });
    });
  }

  update(viewLeft: number, deltaMs: number): void {
    const dtSeconds = deltaMs / MS_PER_SECOND;
    for (let index = 0; index < this.layers.length; index++) {
      const layer = this.layers[index];
      const { spec, copies } = layer;
      if (this.drifting && spec.driftSpeed !== 0) {
        layer.drift = advanceDrift(layer.drift, spec.driftSpeed, dtSeconds, spec.stripWidth);
      }
      const firstX =
        viewLeft + stripScreenX(viewLeft, spec.scrollFactor, layer.drift, spec.stripWidth);
      for (let i = 0; i < copies.length; i++) copies[i].x = firstX + i * spec.stripWidth;
    }
  }

  destroy(): void {
    for (const layer of this.layers) for (const copy of layer.copies) copy.destroy();
    this.layers.length = 0;
  }
}
