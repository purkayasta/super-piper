import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/main-menu/main-menu.component').then((module) => module.MainMenuComponent),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/world-map/world-map.component').then((module) => module.WorldMapComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((module) => module.SettingsComponent),
  },
  {
    path: 'play/:stageId',
    loadChildren: () =>
      import('./features/game-shell/game-shell.routes').then((module) => module.gameShellRoutes),
  },
  { path: '**', redirectTo: '' },
];
