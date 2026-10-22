import { isDevToolsEnabled } from './dev-tools';

describe('isDevToolsEnabled', () => {
  it('is on for a non-production build', () => {
    expect(isDevToolsEnabled('', false)).toBe(true);
  });

  it('is off for a production build without the flag', () => {
    expect(isDevToolsEnabled('', true)).toBe(false);
  });

  it('is on in production with dev=1', () => {
    expect(isDevToolsEnabled('?dev=1', true)).toBe(true);
  });

  it('is off in production with dev=0', () => {
    expect(isDevToolsEnabled('?dev=0', true)).toBe(false);
  });
});
