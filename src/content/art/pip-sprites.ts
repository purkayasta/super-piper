import {
  mirrorGrid,
  swapPalette,
  type PixelGrid,
  type PixelPalette,
} from '../../asset-pipeline/pixel-grid';
import type { PipFrame, PipOutfit } from './atlas-frames';

export const PIP_PALETTE: PixelPalette = {
  K: '#1a1020',
  S: '#f5b58a',
  H: '#5a2d0c',
  C: '#22b3c8',
  J: '#f0602a',
  P: '#2b3a8c',
  B: '#6b3a1a',
  W: '#ffffff',
  Y: '#ffd23a',
};

export const PIP_OUTFIT_PALETTES: Readonly<Record<PipOutfit, PixelPalette>> = {
  courier: PIP_PALETTE,
  forest: swapPalette(PIP_PALETTE, { C: '#3f9a4a', J: '#8a7a34', Y: '#f3e6b0', P: '#3b2e1f' }),
  midnight: swapPalette(PIP_PALETTE, {
    C: '#6a4ac0',
    J: '#2b3170',
    Y: '#c9d4e8',
    P: '#1c1c2e',
    B: '#3a2a4a',
  }),
};

const HEAD: PixelGrid = [
  '................',
  '.....KKKKKK.....',
  '....KCCCCCCKK...',
  '...KCCWCCCCCCK..',
  '...KHHSSSKSKK...',
  '..KHSHSSSKSSSK..',
  '..KHSHHSSSKSSSK.',
  '..KHHSSSSKKKKK..',
  '...KKSSSSSSSK...',
];

const WALK_TORSO_LOWER: PixelGrid = ['..KSJJWJJWJSK...', '..KSPPPPPPPSK...'];

const WALK_TORSO_TAIL_UP: PixelGrid = ['.YYKYYYJYYYYK...', 'YY.KJJYJJJJJK...', ...WALK_TORSO_LOWER];

const WALK_TORSO_TAIL_DOWN: PixelGrid = [
  '..YKYYYJYYYYK...',
  'YYYKJJYJJJJJK...',
  ...WALK_TORSO_LOWER,
];

const RUN_TORSO_LOWER: PixelGrid = ['...KJJWJJWJKSSK.', '...KPPPPPPPK....'];

const RUN_TORSO_STREAM: PixelGrid = ['YYYKYYYJYYYYK...', '.YYKJJYJJJJKSSK.', ...RUN_TORSO_LOWER];

const RUN_TORSO_WAVE: PixelGrid = ['.YYKYYYJYYYYK...', 'YY.KJJYJJJJKSSK.', ...RUN_TORSO_LOWER];

const LEGS_STRIDE: PixelGrid = ['..KPPPKKPPPK....', '.KBBBK...KBBBK..', 'KBBBK.....KBBBK.'];

const LEGS_PASSING: PixelGrid = ['...KPPPPPPK.....', '....KBBBBK......', '...KBBBBBBK.....'];

const LEGS_STEP: PixelGrid = ['...KPPPKPPPK....', '..KBBBK.KBBBK...', '..KBBBBK.KBBBK..'];

const LEGS_SPRINT: PixelGrid = ['..KPPPPKKPPPPK..', '.KBBBK....KBBBK.', 'KBBK........KBBK'];

const LEGS_SPRINT_RECOVER: PixelGrid = ['...KPPPKKPPPK...', '..KBBBK..KBBBK..', '..KBBK....KBBK..'];

export const PIP_FRAME_GRIDS: Readonly<Record<PipFrame, PixelGrid>> = {
  idle: [
    ...HEAD,
    '...KYYYJYYYYYY..',
    '..KJJJYJJJJK.YY.',
    '.KSSJJWJJWJSSK..',
    '.KSSPPPPPPPSSK..',
    '..KKPPPKPPPKK...',
    '..KBBBK.KBBBK...',
    '.KBBBBK.KBBBBK..',
  ],
  'walk-0': [...HEAD, ...WALK_TORSO_TAIL_UP, ...LEGS_STRIDE],
  'walk-1': [...HEAD, ...WALK_TORSO_TAIL_DOWN, ...LEGS_PASSING],
  'walk-2': [...HEAD, ...WALK_TORSO_TAIL_UP, ...LEGS_STEP],
  'run-0': [...HEAD, ...RUN_TORSO_STREAM, ...LEGS_SPRINT],
  'run-1': [...HEAD, ...RUN_TORSO_WAVE, ...LEGS_PASSING],
  'run-2': [...HEAD, ...RUN_TORSO_STREAM, ...LEGS_SPRINT_RECOVER],
  skid: [
    ...mirrorGrid(HEAD),
    '...KYYYYJYYYK.YY',
    '..KSJJJJYJJJK.Y.',
    '.KSSJWJJWJJJK...',
    '..KKPPPPPPPK....',
    '.KPPPPKKPPPK....',
    'KBBBK....KBBK...',
    'KBBBBK...KBBBK..',
  ],
  jump: [
    ...HEAD,
    '.YYKYYYJYYYYKSSK',
    'YY.KJJYJJJJKJSK.',
    '..KSJJWJJWJK....',
    '..KSPPPPPPPK....',
    '...KPPPPKPPPPK..',
    '..KBBBK..KBBBBK.',
    '..KKKK....KKKK..',
  ],
  fall: [
    ...HEAD,
    '.YYKYYYJYYYYK...',
    'KSKKJJYJJJJKKSK.',
    '.K.KJJWJJWJK.K..',
    '...KPPPPPPPK....',
    '..KPPPPKPPPPK...',
    '.KBBBK...KBBBK..',
    '.KBBK.....KBBK..',
  ],
  death: [
    '.KSK........KSK.',
    '.KSSK.KKKK.KSSK.',
    '..KJJKCCCCKJJK..',
    '..KJKCCWCCCKJK..',
    '...KHKKKKKKHK...',
    '...KHSSSSSSHK...',
    '...KSKSSSSKSK...',
    '...KSSSKKSSSK...',
    '....KSSSSSSK....',
    '...KYYYYYYYYK...',
    '..KJJJJYYJJJJK..',
    '..KJJWJJJJWJJK..',
    '..KPPPPPPPPPPK..',
    '..KPPPPKKPPPPK..',
    '..KBBBK..KBBBK..',
    '.KBBBBK..KBBBBK.',
  ],
  'goal-grab': [
    ...HEAD,
    '...KYYYJYYYKSSK.',
    'YY.KJJYJJJJKSSK.',
    '.YKJJJWJJWJK....',
    '..KPPPPPPPPK....',
    '...KPPPKPPPK....',
    '...KBBK.KBBK....',
    '...KBBK.KBBK....',
  ],
};
