import { describe, expect, it } from 'vitest';
import { clampToCameraLeft, nextCameraScrollX } from './forward-camera';

describe('nextCameraScrollX', () => {
  it('stays put while the player is near the start', () => {
    expect(nextCameraScrollX(0, 100, 432, 2000, 0.42)).toBe(0);
  });

  it('follows the player with a lead', () => {
    expect(nextCameraScrollX(0, 300, 432, 2000, 0.42)).toBeCloseTo(118.56, 5);
  });

  it('never scrolls back', () => {
    expect(nextCameraScrollX(200, 100, 432, 2000, 0.42)).toBe(200);
  });

  it('stops at the level end', () => {
    expect(nextCameraScrollX(0, 1990, 432, 2000, 0.42)).toBe(1568);
  });
});

describe('clampToCameraLeft', () => {
  it('pushes the player to the view edge', () => {
    expect(clampToCameraLeft(90, 100)).toBe(100);
  });

  it('leaves the player alone when inside the view', () => {
    expect(clampToCameraLeft(120, 100)).toBe(120);
  });
});
