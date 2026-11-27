import type { BattleConfig, EnemyDefinition } from '../engine/types';
import { STARTING_ATTACKS } from './attacks';
import { MAX_POOL_SIZE, PLAYER_MAX_HP, STATUS_CONFIG } from './balance';
import { MIX_RECIPES } from './colors';
import { STARTING_DICE } from './dice';
import { ENEMIES } from './enemies';

/** Default battle setup used by the prototype. */
export function defaultBattleConfig(enemies: readonly EnemyDefinition[] = [ENEMIES.inkBlob]): BattleConfig {
  return {
    maxPoolSize: MAX_POOL_SIZE,
    playerMaxHp: PLAYER_MAX_HP,
    dice: STARTING_DICE,
    recipes: MIX_RECIPES,
    attacks: STARTING_ATTACKS,
    status: STATUS_CONFIG,
    enemies,
  };
}
