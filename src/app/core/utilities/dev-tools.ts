import { InjectionToken, type Provider } from '@angular/core';

export const DEV_TOOLS_ENABLED = new InjectionToken<boolean>('DEV_TOOLS_ENABLED', {
  providedIn: 'root',
  factory: () => false,
});

export function isDevToolsEnabled(search: string, production: boolean): boolean {
  return new URLSearchParams(search).get('dev') === '1' || !production;
}

export function provideDevToolsFlag(search: string, production: boolean): Provider {
  return { provide: DEV_TOOLS_ENABLED, useValue: isDevToolsEnabled(search, production) };
}
