import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import {
  DEFAULT_MOVEMENT,
  type JumpTier,
  type MovementTuning,
} from '../../../../game-engine/configuration/movement.config';
import { formatTuningAsConfig } from './format-tuning';

type ScalarKey = Exclude<keyof MovementTuning, 'jumpTiers'>;
type TierIndex = 0 | 1 | 2;
type TierKey = keyof JumpTier;

interface ScalarField {
  readonly key: ScalarKey;
  readonly max: number;
}

const SLIDER_MAX_FACTOR = 3;
const MIN_GRAVITY = 1;
const GRAVITY_KEYS: ReadonlySet<string> = new Set(['holdGravity', 'fallGravity']);

const SCALAR_KEYS: readonly ScalarKey[] = [
  'walkMaxSpeed',
  'runMaxSpeed',
  'walkAccel',
  'runAccel',
  'airAccel',
  'releaseDecel',
  'skidDecel',
  'maxFallSpeed',
  'coyoteMs',
  'jumpBufferMs',
  'cornerNudgePx',
  'cameraLeadFraction',
];

const SCALAR_FIELDS: readonly ScalarField[] = SCALAR_KEYS.map((key) => ({
  key,
  max: key === 'cameraLeadFraction' ? 1 : DEFAULT_MOVEMENT[key] * SLIDER_MAX_FACTOR,
}));

const TIER_KEYS: readonly TierKey[] = [
  'minTakeoffSpeed',
  'launchSpeed',
  'holdGravity',
  'fallGravity',
];

const TIER_INDEXES: readonly TierIndex[] = [0, 1, 2];

const COPY_FAILED_MESSAGE = 'Copy failed: clipboard unavailable';
const COPIED_MESSAGE = 'Copied to clipboard';

@Component({
  selector: 'app-tuning-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.code.F2)': 'toggle($event)' },
  styleUrl: './tuning-panel.component.css',
  templateUrl: './tuning-panel.component.html',
})
export class TuningPanelComponent {
  readonly tuningChange = output<MovementTuning>();

  protected readonly scalarFields = SCALAR_FIELDS;
  protected readonly tierKeys = TIER_KEYS;
  protected readonly tierIndexes = TIER_INDEXES;
  protected readonly open = signal(false);
  protected readonly tuning = signal<MovementTuning>(DEFAULT_MOVEMENT);
  protected readonly message = signal('');

  protected toggle(event: Event): void {
    event.preventDefault();
    this.open.update((open) => !open);
  }

  protected editScalar(key: ScalarKey, event: Event): void {
    const value = this.readNumber(event, key);
    if (value === null) return;
    this.apply({ ...this.tuning(), [key]: value });
  }

  protected editTier(index: TierIndex, key: TierKey, event: Event): void {
    const value = this.readNumber(event, key);
    if (value === null) return;
    const current = this.tuning();
    const tiers = current.jumpTiers.map((tier, tierIndex) =>
      tierIndex === index ? { ...tier, [key]: value } : tier,
    ) as unknown as MovementTuning['jumpTiers'];
    this.apply({ ...current, jumpTiers: tiers });
  }

  protected reset(): void {
    this.message.set('');
    this.apply(DEFAULT_MOVEMENT);
  }

  protected async copy(): Promise<void> {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard === undefined) {
      this.message.set(COPY_FAILED_MESSAGE);
      return;
    }
    try {
      await clipboard.writeText(formatTuningAsConfig(this.tuning()));
      this.message.set(COPIED_MESSAGE);
    } catch {
      this.message.set(COPY_FAILED_MESSAGE);
    }
  }

  protected blurTarget(event: Event): void {
    (event.target as HTMLElement).blur();
  }

  private apply(tuning: MovementTuning): void {
    this.message.set('');
    this.tuning.set(tuning);
    this.tuningChange.emit(tuning);
  }

  private readNumber(event: Event, key: string): number | null {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (!Number.isFinite(value)) return null;
    return Math.max(value, GRAVITY_KEYS.has(key) ? MIN_GRAVITY : 0);
  }
}
