export const Sfx = {
  jumpSmall: 'sfx.jump-small',
  jumpBig: 'sfx.jump-big',
  coin: 'sfx.coin',
  stomp: 'sfx.stomp',
  kick: 'sfx.kick',
  bump: 'sfx.bump',
  brickBreak: 'sfx.brick-break',
  powerUpAppear: 'sfx.power-up-appear',
  powerUpGet: 'sfx.power-up-get',
  oneUp: 'sfx.one-up',
  damage: 'sfx.damage',
  death: 'sfx.death',
  goal: 'sfx.goal',
  tally: 'sfx.tally',
  timeLow: 'sfx.time-low',
  parcelThrow: 'sfx.parcel-throw',
  tube: 'sfx.tube',
  checkpoint: 'sfx.checkpoint',
  postmark: 'sfx.postmark',
  pause: 'sfx.pause',
  menuMove: 'sfx.menu-move',
  menuSelect: 'sfx.menu-select',
  bossHit: 'sfx.boss-hit',
} as const;

export const Music = {
  overworld: 'music.overworld',
  overworldHurry: 'music.overworld-hurry',
  underground: 'music.underground',
  undergroundHurry: 'music.underground-hurry',
  sky: 'music.sky',
  skyHurry: 'music.sky-hurry',
  castle: 'music.castle',
  castleHurry: 'music.castle-hurry',
  boss: 'music.boss',
  star: 'music.star',
  stageClear: 'music.stage-clear',
  gameOver: 'music.game-over',
  menu: 'music.menu',
} as const;

export type SfxId = (typeof Sfx)[keyof typeof Sfx];

export type MusicId = (typeof Music)[keyof typeof Music];

export type SoundId = SfxId | MusicId;

export const SFX_IDS: readonly SfxId[] = Object.values(Sfx);

export const MUSIC_IDS: readonly MusicId[] = Object.values(Music);

export const STAGE_MUSIC_IDS = [
  Music.overworld,
  Music.underground,
  Music.sky,
  Music.castle,
] as const;

export type StageMusicId = (typeof STAGE_MUSIC_IDS)[number];

export const HURRY_VARIANTS: Readonly<Record<StageMusicId, MusicId>> = {
  [Music.overworld]: Music.overworldHurry,
  [Music.underground]: Music.undergroundHurry,
  [Music.sky]: Music.skyHurry,
  [Music.castle]: Music.castleHurry,
};

export const ONE_SHOT_MUSIC: ReadonlySet<MusicId> = new Set([Music.stageClear, Music.gameOver]);

export const SFX_MAX_VOICES: Readonly<Record<SfxId, number>> = {
  [Sfx.jumpSmall]: 1,
  [Sfx.jumpBig]: 1,
  [Sfx.coin]: 3,
  [Sfx.stomp]: 2,
  [Sfx.kick]: 3,
  [Sfx.bump]: 2,
  [Sfx.brickBreak]: 3,
  [Sfx.powerUpAppear]: 2,
  [Sfx.powerUpGet]: 1,
  [Sfx.oneUp]: 2,
  [Sfx.damage]: 1,
  [Sfx.death]: 1,
  [Sfx.goal]: 1,
  [Sfx.tally]: 1,
  [Sfx.timeLow]: 1,
  [Sfx.parcelThrow]: 2,
  [Sfx.tube]: 1,
  [Sfx.checkpoint]: 1,
  [Sfx.postmark]: 1,
  [Sfx.pause]: 1,
  [Sfx.menuMove]: 2,
  [Sfx.menuSelect]: 1,
  [Sfx.bossHit]: 2,
};

export function isStageMusic(id: string): id is StageMusicId {
  return (STAGE_MUSIC_IDS as readonly string[]).includes(id);
}

export function isSfxId(id: string): id is SfxId {
  return (SFX_IDS as readonly string[]).includes(id);
}

export function soundFileName(id: SoundId): string {
  const [kind, name] = id.split('.');
  return `${kind === 'sfx' ? 'sfx' : 'music'}/${name}.flac`;
}
