export type VolumeChannel = 'master' | 'music' | 'sfx';

export type AudioVolumes = Readonly<Record<VolumeChannel, number>>;

export const DEFAULT_VOLUMES: AudioVolumes = { master: 0.8, music: 0.6, sfx: 0.8 };

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function volumeToGain(value: number): number {
  const volume = clampVolume(value);
  return volume * volume;
}

export function withVolume(
  volumes: AudioVolumes,
  channel: VolumeChannel,
  value: number,
): AudioVolumes {
  return { ...volumes, [channel]: clampVolume(value) };
}

export function sanitizeVolumes(volumes: Partial<AudioVolumes>): AudioVolumes {
  return {
    master: clampVolume(volumes.master ?? DEFAULT_VOLUMES.master),
    music: clampVolume(volumes.music ?? DEFAULT_VOLUMES.music),
    sfx: clampVolume(volumes.sfx ?? DEFAULT_VOLUMES.sfx),
  };
}
