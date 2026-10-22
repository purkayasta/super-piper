import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideDevToolsFlag } from './core/utilities/dev-tools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Read before bootstrap: the hash router's initial navigation rewrites the URL and drops ?dev=1.
    provideDevToolsFlag(window.location.search, !isDevMode()),
    provideRouter(routes, withHashLocation()),
  ],
};
