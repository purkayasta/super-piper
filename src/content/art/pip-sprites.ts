import {
  mirrorGrid,
  swapPalette,
  type PixelGrid,
  type PixelPalette,
} from '../../asset-pipeline/pixel-grid';
import type { PipBigFrame, PipLook, PipSmallFrame } from './atlas-frames';

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

export const PIP_LOOK_PALETTES: Readonly<Record<PipLook, PixelPalette>> = {
  courier: PIP_PALETTE,
  forest: swapPalette(PIP_PALETTE, { C: '#3f9a4a', J: '#8a7a34', Y: '#f3e6b0', P: '#3b2e1f' }),
  midnight: swapPalette(PIP_PALETTE, {
    C: '#6a4ac0',
    J: '#2b3170',
    Y: '#c9d4e8',
    P: '#1c1c2e',
    B: '#3a2a4a',
  }),
  mint: swapPalette(PIP_PALETTE, { C: '#4fd6b0', J: '#f2f6f0', Y: '#2f8f7a', P: '#3a4f6e' }),
  sunset: swapPalette(PIP_PALETTE, { C: '#ff7a6a', J: '#7a2f66', Y: '#ffb347', P: '#3d2348' }),
  royal: swapPalette(PIP_PALETTE, {
    C: '#7b3fc4',
    J: '#4b2a8a',
    Y: '#ffcf3a',
    P: '#24204a',
    B: '#2e1a12',
  }),
  golden: swapPalette(PIP_PALETTE, {
    C: '#ffd23a',
    J: '#e8b02a',
    Y: '#fff4d0',
    P: '#2a2238',
    B: '#4a2a12',
  }),
  spark: swapPalette(PIP_PALETTE, { C: '#ffd23a', J: '#f4f0e8', Y: '#d8403a', P: '#22b3c8' }),
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

export const PIP_SMALL_GRIDS: Readonly<Record<PipSmallFrame, PixelGrid>> = {
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

const BIG_HEAD: PixelGrid = [
  '................',
  '.....KKKKKK.....',
  '....KCCCCCCKK...',
  '...KCCWCCCCCCK..',
  '..KCCCCCCCCCCCK.',
  '...KHHSSSKSKK...',
  '..KHSHSSSKSSSK..',
  '..KHSHHSSSKSSSK.',
  '..KHSHSSSSSSSSK.',
  '..KHHSSSSKKKKK..',
  '...KKSSSSSSSK...',
  '....KKSSSSKK....',
];

const BIG_TROUSER_TOP: PixelGrid = ['...KPPPPPPPPK...', '...KPPPPPPPPK...'];

const BIG_TORSO_IDLE: PixelGrid = [
  '...KYYYYJYYYYY..',
  '..KYYYJJJJYK.YY.',
  '..KJJJJYJJJJK.Y.',
  '.KJJJJJYJJJJJK..',
  '.KJJWJJJJJWJJK..',
  'KSJJJJJJJJJJJSK.',
  'KSSKJJJJJJJJKSSK',
  '.KKKJJJJJJJJKKK.',
  ...BIG_TROUSER_TOP,
];

const BIG_WALK_TORSO_LOWER: PixelGrid = [
  '...KJJJYJJJJK...',
  '..KJJJJYJJJJJK..',
  '..KJWJJJJJWJJK..',
  '..KSJJJJJJJJSK..',
  '..KSSJJJJJJSSK..',
  '...KKJJJJJJKK...',
  ...BIG_TROUSER_TOP,
];

const BIG_TORSO_TAIL_UP: PixelGrid = [
  '.YYKYYYJYYYYK...',
  'YY.KYJJJJJYK....',
  ...BIG_WALK_TORSO_LOWER,
];

const BIG_TORSO_TAIL_DOWN: PixelGrid = [
  '..YKYYYJYYYYK...',
  'YYYKYJJJJJYK....',
  ...BIG_WALK_TORSO_LOWER,
];

const BIG_RUN_TORSO_LOWER: PixelGrid = [
  '...KJJJYJJJJKSK.',
  '..KJJJJYJJJJK...',
  '..KJWJJJJJWJK...',
  '..KJJJJJJJJJK...',
  '...KJJJJJJJK....',
  '...KKJJJJJKK....',
  ...BIG_TROUSER_TOP,
];

const BIG_RUN_TORSO_STREAM: PixelGrid = [
  'YYYKYYYJYYYYK...',
  '.YYKYJJJJJYKSSK.',
  ...BIG_RUN_TORSO_LOWER,
];

const BIG_RUN_TORSO_WAVE: PixelGrid = [
  '.YYKYYYJYYYYK...',
  'YY.KYJJJJJYKSSK.',
  ...BIG_RUN_TORSO_LOWER,
];

const BIG_LEGS_IDLE: PixelGrid = [
  '...KPPPPPPPPK...',
  '..KPPPPKKPPPPK..',
  '..KPPPK..KPPPK..',
  '..KPPPK..KPPPK..',
  '..KPPPK..KPPPK..',
  '..KBBBK..KBBBK..',
  '..KBBBK..KBBBK..',
  '.KBBBBK..KBBBBK.',
  '.KBBBBBK.KBBBBBK',
  '.KKKKKK..KKKKKK.',
];

const BIG_LEGS_STRIDE: PixelGrid = [
  '...KPPPPPPPPK...',
  '..KPPPPKKPPPPK..',
  '..KPPPK..KPPPK..',
  '.KPPPK....KPPPK.',
  '.KPPK......KPPK.',
  'KPPK........KPPK',
  'KBBK........KBBK',
  'KBBBK.......KBBK',
  'KBBBBK.....KBBBK',
  'KKKKKK.....KKKKK',
];

const BIG_LEGS_PASSING: PixelGrid = [
  '...KPPPPPPPPK...',
  '...KPPPPPPPPK...',
  '....KPPPPPPK....',
  '....KPPPPPPK....',
  '.....KPPPPK.....',
  '.....KPPPPK.....',
  '.....KBBBBK.....',
  '....KBBBBBK.....',
  '....KBBBBBBK....',
  '....KKKKKKKK....',
];

const BIG_LEGS_STEP: PixelGrid = [
  '...KPPPPPPPPK...',
  '..KPPPPKKPPPPK..',
  '..KPPPK.KPPPK...',
  '..KPPK...KPPK...',
  '.KPPK....KPPK...',
  '.KPPK.....KPPK..',
  '.KBBK.....KBBK..',
  '.KBBBK....KBBBK.',
  '.KBBBBK...KBBBBK',
  '.KKKKKK...KKKKKK',
];

const BIG_LEGS_TUCKED: PixelGrid = [
  '...KPPPPPPPPPK..',
  '..KPPPPKKPPPPPK.',
  '..KPPPK..KPPPPK.',
  '..KPPK....KPPPK.',
  '.KPPK.....KPPK..',
  '.KBBK.....KBBK..',
  '.KBBBK...KBBBK..',
  '.KKKKK...KKKKK..',
  '................',
  '................',
];

const BIG_LEGS_HANGING: PixelGrid = [
  '...KPPPPPPPPK...',
  '...KPPPKPPPPK...',
  '...KPPK.KPPPK...',
  '...KPPK.KPPK....',
  '...KPPK.KPPK....',
  '...KBBK.KBBK....',
  '...KBBK.KBBK....',
  '...KBBK.KBBK....',
  '...KKKK.KKKK....',
  '................',
];

const BIG_RUN_STEP_FRAME: PixelGrid = [...BIG_HEAD, ...BIG_RUN_TORSO_STREAM, ...BIG_LEGS_STEP];

export const PIP_BIG_GRIDS: Readonly<Record<PipBigFrame, PixelGrid>> = {
  'big-idle': [...BIG_HEAD, ...BIG_TORSO_IDLE, ...BIG_LEGS_IDLE],
  'big-walk-0': [...BIG_HEAD, ...BIG_TORSO_TAIL_UP, ...BIG_LEGS_STRIDE],
  'big-walk-1': [...BIG_HEAD, ...BIG_TORSO_TAIL_DOWN, ...BIG_LEGS_PASSING],
  'big-walk-2': [...BIG_HEAD, ...BIG_TORSO_TAIL_UP, ...BIG_LEGS_STEP],
  'big-run-0': [...BIG_HEAD, ...BIG_RUN_TORSO_STREAM, ...BIG_LEGS_STRIDE],
  'big-run-1': [...BIG_HEAD, ...BIG_RUN_TORSO_WAVE, ...BIG_LEGS_PASSING],
  'big-run-2': BIG_RUN_STEP_FRAME,
  'big-skid': mirrorGrid(BIG_RUN_STEP_FRAME),
  'big-jump': [
    ...BIG_HEAD,
    '.YYKYYYJYYYYKSSK',
    'YY.KYJJJJJYKJSK.',
    '...KJJJYJJJJKJK.',
    '..KJJJJYJJJJJK..',
    '..KJWJJJJJWJJK..',
    '.KSJJJJJJJJJJK..',
    '.KSKJJJJJJJJK...',
    '..KKJJJJJJJJK...',
    ...BIG_TROUSER_TOP,
    ...BIG_LEGS_TUCKED,
  ],
  'big-fall': [
    ...BIG_HEAD,
    '.YYKYYYJYYYYK...',
    'KSKKYJJJJJYKKSK.',
    '.K.KJJJYJJJJK.K.',
    '..KJJJJYJJJJJK..',
    '..KJWJJJJJWJJK..',
    '..KJJJJJJJJJJK..',
    '...KJJJJJJJJK...',
    '...KKJJJJJJKK...',
    ...BIG_TROUSER_TOP,
    ...BIG_LEGS_STEP,
  ],
  'big-crouch': [
    ...Array.from({ length: 14 }, () => '................'),
    ...BIG_HEAD,
    '..KYYYYJYYYYK.YY',
    '.KSJJJJYJJJJSK..',
    '.KSSJJWJJWJJSSK.',
    'KPPPPPPPPPPPPPPK',
    'KBBBBPPPPPPBBBBK',
    'KKKKKKKKKKKKKKKK',
  ],
  'big-goal-grab': [
    ...BIG_HEAD,
    '...KYYYJYYYKSSK.',
    'YY.KYJJJJYJKSSK.',
    '.YKJJJJYJJJK....',
    '..KJJJJYJJJJK...',
    '..KJWJJJJJWJK...',
    '..KJJJJJJJJJK...',
    '..KSJJJJJJJSK...',
    '...KKJJJJJKK....',
    ...BIG_TROUSER_TOP,
    ...BIG_LEGS_HANGING,
  ],
  'big-throw': [
    ...BIG_HEAD,
    '.YYKYYYJYYYYK...',
    'YY.KYJJJJJYK....',
    '...KJJJYJJJJKKKK',
    '..KJJJJYJJJJJSSK',
    '..KJWJJJJJWJKKKK',
    '..KSJJJJJJJJK...',
    '..KSSJJJJJJK....',
    '...KKJJJJJJKK...',
    ...BIG_TROUSER_TOP,
    ...BIG_LEGS_STEP,
  ],
};
