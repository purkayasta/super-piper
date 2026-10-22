import { Routes } from '@angular/router';
import { createGame } from '../../../game-engine/bootstrap/create-game';
import { GAME_FACTORY } from '../../core/game-factory.token';
import { GameSessionService } from '../../core/services/game-session.service';

export const gameShellRoutes: Routes = [
  {
    path: '',
    providers: [GameSessionService, { provide: GAME_FACTORY, useValue: createGame }],
    loadComponent: () =>
      import('./game-shell.component').then((module) => module.GameShellComponent),
  },
];
