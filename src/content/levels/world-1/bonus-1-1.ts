import type { AreaDefinition } from '../../../game-engine/world/level-format';

export const BONUS_1_1: AreaDefinition = {
  theme: 'underground',
  music: 'music.underground',
  rows: [
    '..............................',
    '..............................',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'X............................X',
    'X.........BBBBBBBB...........X',
    'X............................X',
    'X.......oooooooooooo.........X',
    'X............................X',
    'X.......oooooooooooo.........X',
    'X............................X',
    'X.......o.o.o.o.o.o.o........X',
    'X............................X',
    'X......S.....................X',
    '##############################',
    '##############################',
  ],
  entities: [
    { kind: 'tube', column: 3, topRow: 11, id: 'entry', destination: null },
    { kind: 'tube', column: 24, topRow: 11, destination: { area: 'main', tube: 'return' } },
    { kind: 'item-block', item: 'multi-coin', column: 13, row: 4 },
  ],
};
