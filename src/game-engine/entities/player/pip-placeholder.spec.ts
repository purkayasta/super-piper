import { describe, expect, it } from 'vitest';
import { HERO_PIP, PIP_FRAME_SIZE, PIP_PALETTE } from './pip-placeholder';

describe('HERO_PIP', () => {
  it('is a 16×16 grid', () => {
    expect(HERO_PIP).toHaveLength(PIP_FRAME_SIZE);
    for (const row of HERO_PIP) expect(row).toHaveLength(PIP_FRAME_SIZE);
  });

  it('only uses palette symbols or transparency', () => {
    for (const row of HERO_PIP) {
      for (const symbol of row) {
        expect(symbol === '.' || Object.hasOwn(PIP_PALETTE, symbol)).toBe(true);
      }
    }
  });

  it('has feet on the bottom row so the body offset rests on the frame bottom', () => {
    expect(HERO_PIP[PIP_FRAME_SIZE - 1].trim().replaceAll('.', '')).not.toBe('');
  });
});
