import { drawPixelGrid, type PixelPalette, type PixelTarget } from '../../world/placeholder-tiles';

export const PIP_TEXTURE_KEY = 'pip-placeholder';

export const PIP_FRAME_SIZE = 16;

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

export const HERO_PIP: readonly string[] = [
  '................',
  '.....KKKKKK.....',
  '....KCCCCCCKK...',
  '...KCCWCCCCCCK..',
  '...KHHSSSKSKK...',
  '..KHSHSSSKSSSK..',
  '..KHSHHSSSKSSSK.',
  '..KHHSSSSKKKKK..',
  '...KKSSSSSSSK...',
  '...KYYYJYYYYYY..',
  '..KJJJYJJJJK.YY.',
  '.KSSJJWJJWJSSK..',
  '.KSSPPPPPPPSSK..',
  '..KKPPPKPPPKK...',
  '..KBBBK.KBBBK...',
  '.KBBBBK.KBBBBK..',
];

export function drawPip(target: PixelTarget): void {
  drawPixelGrid(target, HERO_PIP, PIP_PALETTE, 0, 0);
}
