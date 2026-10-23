import {
  rotateGridClockwise,
  swapPalette,
  type PixelGrid,
  type PixelPalette,
} from '../../asset-pipeline/pixel-grid';
import { PowerUpFrame } from './atlas-frames';

export const POWER_UP_PALETTE: PixelPalette = {
  K: '#1a1020',
  W: '#ffffff',
  O: '#c98a4a',
  Q: '#e8b070',
  Z: '#8a5424',
  T: '#f3e2b0',
  C: '#22b3c8',
  R: '#d8403a',
  Y: '#ffd23a',
  A: '#f8b800',
  G: '#3fae4a',
  L: '#9ee68a',
  D: '#1f6a2a',
  S: '#f5b58a',
};

export const POWER_UP_GLINT_PALETTE: PixelPalette = swapPalette(POWER_UP_PALETTE, {
  R: '#ff8a3a',
  Y: '#fff6c0',
  A: '#ffd23a',
});

const PARCEL_BOX: PixelGrid = [
  '................',
  '................',
  '..KKKKKKKKKKKK..',
  '.KQQQQQTTQQQQQK.',
  '.KQOOOOTTOOOOZK.',
  '.KQOOOOTTOOOOZK.',
  '.KTTTTTTTTTTTTK.',
  '.KQOOOOTTOOOOZK.',
  '.KQOCCCTTOOOOZK.',
  '.KQOCWCTTOOOOZK.',
  '.KQOCCCTTOOOOZK.',
  '.KQOOOOTTOOOOZK.',
  '.KZZZZZTTZZZZZK.',
  '..KKKKKKKKKKKK..',
  '................',
  '................',
];

const SPARK_STAMP: PixelGrid = [
  '................',
  '.W.W.W.W.W.W.W..',
  'WWWWWWWWWWWWWWW.',
  '.WRRRRRRRRRRRW..',
  'WWRKKKKKKKYKRWW.',
  '.WRKKKKKKYYKRW..',
  'WWRKKKKKYYKKRWW.',
  '.WRKKKKYYYYKRW..',
  'WWRKKKYYYYKKRWW.',
  '.WRKKKKYYKKKRW..',
  'WWRKKKYYKKKKRWW.',
  '.WRKKKYKKKKKRW..',
  'WWRRRRRRRRRRRWW.',
  'WWWWWWWWWWWWWWW.',
  '.W.W.W.W.W.W.W..',
  '................',
];

const RUSH_STAR: PixelGrid = [
  '.......KK.......',
  '......KYYK......',
  '......KYYK......',
  '.....KYYYYK.....',
  'KKKKKKYYYYKKKKKK',
  'KAYYYYYYYYYYYYAK',
  '.KAYYWYYYYYYYAK.',
  '..KAYYYYYYYYAK..',
  '...KAYYYYYYAK...',
  '...KAYYYYYYAK...',
  '..KAYYYAAYYYAK..',
  '..KAYYAKKAYYAK..',
  '.KAYYAK..KAYYAK.',
  '.KAAAK....KAAAK.',
  '.KKKK......KKKK.',
  '................',
];

const GREEN_STAMP: PixelGrid = [
  '................',
  '.W.W.W.W.W.W.W..',
  'WWWWWWWWWWWWWWW.',
  '.WGGGGGGGGGGGW..',
  'WWGLLLLLLLLLGWW.',
  '.WGLLKKKKKLLGW..',
  'WWGLKCCCCCKLGWW.',
  '.WGKCCWCCCCKGW..',
  'WWGKSSSKSKKLGWW.',
  '.WGLKSSSSSKLGW..',
  'WWGLLKKKKKLLGWW.',
  '.WGLLLLLLLLLGW..',
  'WWGDDDDDDDDDGWW.',
  'WWWWWWWWWWWWWWW.',
  '.W.W.W.W.W.W.W..',
  '................',
];

const PARCEL: PixelGrid = [
  '.KKKKKK.',
  'KQQTTQQK',
  'KQOTTOZK',
  'KTTTTTTK',
  'KQOTTOZK',
  'KZZTTZZK',
  '.KKKKKK.',
  '........',
];

const PARCEL_QUARTER = rotateGridClockwise(PARCEL);
const PARCEL_HALF = rotateGridClockwise(PARCEL_QUARTER);

export const POWER_UP_FRAME_GRIDS: Readonly<
  Record<string, { readonly grid: PixelGrid; readonly palette: PixelPalette }>
> = {
  [PowerUpFrame.parcelBox]: { grid: PARCEL_BOX, palette: POWER_UP_PALETTE },
  [PowerUpFrame.sparkStamp0]: { grid: SPARK_STAMP, palette: POWER_UP_PALETTE },
  [PowerUpFrame.sparkStamp1]: { grid: SPARK_STAMP, palette: POWER_UP_GLINT_PALETTE },
  [PowerUpFrame.rushStar0]: { grid: RUSH_STAR, palette: POWER_UP_PALETTE },
  [PowerUpFrame.rushStar1]: { grid: RUSH_STAR, palette: POWER_UP_GLINT_PALETTE },
  [PowerUpFrame.greenStamp]: { grid: GREEN_STAMP, palette: POWER_UP_PALETTE },
  [PowerUpFrame.parcel0]: { grid: PARCEL, palette: POWER_UP_PALETTE },
  [PowerUpFrame.parcel1]: { grid: PARCEL_QUARTER, palette: POWER_UP_PALETTE },
  [PowerUpFrame.parcel2]: { grid: PARCEL_HALF, palette: POWER_UP_PALETTE },
  [PowerUpFrame.parcel3]: { grid: rotateGridClockwise(PARCEL_HALF), palette: POWER_UP_PALETTE },
};
