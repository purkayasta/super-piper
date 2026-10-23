import { mirrorGrid, type PixelGrid, type PixelPalette } from '../../asset-pipeline/pixel-grid';
import { ItemFrame } from './atlas-frames';

export const ITEM_PALETTE: PixelPalette = {
  K: '#1a1020',
  W: '#ffffff',
  Y: '#ffd23a',
  A: '#f8b800',
  Z: '#a05a00',
  T: '#22b3c8',
  R: '#d8403a',
  C: '#22b3c8',
  J: '#f0602a',
  M: '#fff6e0',
  G: '#7cc46a',
  L: '#c8f0b0',
  D: '#3f7a36',
  H: '#f0a070',
  B: '#c85a3c',
  N: '#3a1a10',
};

const COIN_FACE: PixelGrid = [
  '................',
  '......KKKK......',
  '.....KYYYYK.....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYWYYAYK....',
  '....KYYYYAYK....',
  '.....KYAAAK.....',
  '......KKKK......',
  '................',
  '................',
];

const COIN_TURNING: PixelGrid = [
  '................',
  '.......KK.......',
  '......KYYK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KWAK......',
  '......KYAK......',
  '......KYAK......',
  '.......KK.......',
  '................',
  '................',
];

const COIN_EDGE: PixelGrid = [
  '................',
  '.......KK.......',
  '.......KK.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KZ.......',
  '.......KK.......',
  '.......KK.......',
  '................',
  '................',
];

const POSTMARK: PixelGrid = [
  '................',
  '..M.M.M.M.M.M...',
  '.MMMMMMMMMMMMM..',
  '..MRRRRRRRRRM...',
  '.MMRYYYYYYYRMM..',
  '..MRYKKKKKYRM...',
  '.MMRYKCCCKYRMM..',
  '..MRYKCWCKYRM...',
  '.MMRYKKKKKYRMM..',
  '..MRYYJJJYYRM...',
  '.MMRYYYYYYYRMM..',
  '..MRRRRRRRRRM...',
  '.MMMMMMMMMMMMM..',
  '..M.M.M.M.M.M...',
  '................',
  '................',
];

const FLAG: PixelGrid = [
  '................',
  '...........KKKKK',
  '.........KKTTTTK',
  '.......KKTTTTTTK',
  '.....KKTTTYYTTTK',
  '...KKTTTTYYYYTTK',
  '.KKTTTTTYYYYTTTK',
  'KTTTTTTTTYYTTTTK',
  '.KKTTTTTTTTTTTTK',
  '...KKTTTTTTTTTTK',
  '.....KKTTTTTTTTK',
  '.......KKTTTTTTK',
  '.........KKTTTTK',
  '...........KKKKK',
  '................',
  '................',
];

const POLE: PixelGrid = Array.from({ length: 16 }, () => 'KLGK');

const POLE_TOP: PixelGrid = [
  '..KKKK..',
  '.KWLLGK.',
  'KWLLGGGK',
  'KLLGGGGK',
  'KLGGGGGK',
  'KGGGGGDK',
  '.KGGGDK.',
  '..KKKK..',
];

const BRICK_DEBRIS: PixelGrid = [
  '..KKKK..',
  '.KBBBBK.',
  'KBHBBBBK',
  'KBBBBBBK',
  'KBBBBBNK',
  '.KBBBNK.',
  '..KKKK..',
  '........',
];

const SPARKLE_BURST: PixelGrid = [
  '...W....',
  '...W....',
  '..WYW...',
  'WWYYYWW.',
  '..WYW...',
  '...W....',
  '...W....',
  '........',
];

const SPARKLE_FADE: PixelGrid = [
  '........',
  '.W...W..',
  '..W.W...',
  '...Y....',
  '..W.W...',
  '.W...W..',
  '........',
  '........',
];

export const ITEM_FRAME_GRIDS: Readonly<Record<string, PixelGrid>> = {
  [ItemFrame.coin0]: COIN_FACE,
  [ItemFrame.coin1]: COIN_TURNING,
  [ItemFrame.coin2]: COIN_EDGE,
  [ItemFrame.coin3]: mirrorGrid(COIN_TURNING),
  [ItemFrame.postmark]: POSTMARK,
  [ItemFrame.flag]: FLAG,
  [ItemFrame.pole]: POLE,
  [ItemFrame.poleTop]: POLE_TOP,
  [ItemFrame.brickDebris]: BRICK_DEBRIS,
  [ItemFrame.sparkle0]: SPARKLE_BURST,
  [ItemFrame.sparkle1]: SPARKLE_FADE,
};
