import { isDevMode, type ValueProvider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { DEV_TOOLS_ENABLED, isDevToolsEnabled, provideDevToolsFlag } from './dev-tools';

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

describe('provideDevToolsFlag', () => {
  it('defaults to off when nothing provides the flag', () => {
    expect(TestBed.inject(DEV_TOOLS_ENABLED)).toBe(false);
  });

  it('captures the flag from the search string it was given', () => {
    TestBed.configureTestingModule({ providers: [provideDevToolsFlag('?dev=1', true)] });
    expect(TestBed.inject(DEV_TOOLS_ENABLED)).toBe(true);
  });

  it('stays off in production without the flag', () => {
    TestBed.configureTestingModule({ providers: [provideDevToolsFlag('', true)] });
    expect(TestBed.inject(DEV_TOOLS_ENABLED)).toBe(false);
  });
});

describe('appConfig dev tools wiring', () => {
  it('provides the flag as a value computed when the config module loads', () => {
    const provider = appConfig.providers.find(
      (candidate): candidate is ValueProvider =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'provide' in candidate &&
        candidate.provide === DEV_TOOLS_ENABLED,
    );
    expect(provider).toBeDefined();
    expect(provider!.useValue).toBe(isDevToolsEnabled(window.location.search, !isDevMode()));
  });
});
