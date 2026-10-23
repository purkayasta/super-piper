import { TRANSPARENT_SYMBOL, type PixelGrid } from './pixel-grid';

export const GLYPH_WIDTH = 3;
export const GLYPH_HEIGHT = 5;
export const GLYPH_GAP = 1;
export const FILL_SYMBOL = 'W';
export const OUTLINE_SYMBOL = 'K';

const GLYPHS: Readonly<Record<string, PixelGrid>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  P: ['###', '#.#', '###', '#..', '#..'],
};

export function outlinedTextGrid(text: string): PixelGrid {
  const innerWidth = text.length * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP;
  const width = innerWidth + 2;
  const height = GLYPH_HEIGHT + 2;
  const cells: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TRANSPARENT_SYMBOL),
  );
  [...text].forEach((character, index) => {
    const glyph = GLYPHS[character.toUpperCase()];
    if (glyph === undefined) throw new Error(`No glyph for "${character}"`);
    const originX = 1 + index * (GLYPH_WIDTH + GLYPH_GAP);
    glyph.forEach((line, row) => {
      for (let column = 0; column < GLYPH_WIDTH; column++) {
        if (line[column] === '#') cells[row + 1][originX + column] = FILL_SYMBOL;
      }
    });
  });
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      if (cells[row][column] !== TRANSPARENT_SYMBOL) continue;
      if (touchesFill(cells, row, column)) cells[row][column] = OUTLINE_SYMBOL;
    }
  }
  return cells.map((line) => line.join(''));
}

function touchesFill(cells: readonly string[][], row: number, column: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (cells[row + dy]?.[column + dx] === FILL_SYMBOL) return true;
    }
  }
  return false;
}
