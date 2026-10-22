import { InjectionToken } from '@angular/core';
import type { GameFactory } from '../../game-engine/core/game-factory';

export type { GameFactory, GameHandle, GameOptions } from '../../game-engine/core/game-factory';

export const GAME_FACTORY = new InjectionToken<GameFactory>('GAME_FACTORY');
