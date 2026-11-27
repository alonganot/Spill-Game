import type { EnemyDefinition, RunConfig, StageDefinition } from '../engine/types';
import { STARTING_ATTACKS } from './attacks';
import { MAX_POOL_SIZE, PLAYER_MAX_HP, STATUS_CONFIG } from './balance';
import { MIX_RECIPES } from './colors';
import { SHOP_DICE, STARTING_DICE } from './dice';
import { ECONOMY } from './economy';
import { ENEMIES, toughened } from './enemies';

export const STARTING_GOLD = 0;
export const STARTING_DICE_CAP = 3;
export const MAX_DICE_CAP = 6;

/** Act 3 enemies: the same faces, tougher. */
const ACT3_HP = 1.35;
const ACT3_POWER = 1.25;
const late = (enemy: EnemyDefinition) => toughened(enemy, ACT3_HP, ACT3_POWER);

/**
 * 15 fights in 3 acts of 5. Fights 1-3 are one enemy; from fight 4 on there
 * are always 2-3. Every fight but the last is followed by a reward pick, then a shop.
 */
export const RUN_STAGES: readonly StageDefinition[] = [
  // Act 1
  { enemies: [ENEMIES.puddleSlime], kind: 'normal', act: 1 },
  { enemies: [ENEMIES.thornSprite], kind: 'normal', act: 1 },
  { enemies: [ENEMIES.inkBlob], kind: 'elite', act: 1 },
  { enemies: [ENEMIES.puddleSlime, ENEMIES.drip], kind: 'normal', act: 1 },
  { enemies: [ENEMIES.drip, ENEMIES.rustGolem, ENEMIES.drip], kind: 'boss', act: 1 },
  // Act 2
  { enemies: [ENEMIES.moldPuff, ENEMIES.cinderImp], kind: 'normal', act: 2 },
  { enemies: [ENEMIES.gnatSwarm, ENEMIES.varnishShell], kind: 'normal', act: 2 },
  { enemies: [ENEMIES.smearKnight, ENEMIES.drip], kind: 'elite', act: 2 },
  { enemies: [ENEMIES.moldPuff, ENEMIES.gnatSwarm, ENEMIES.cinderImp], kind: 'normal', act: 2 },
  { enemies: [ENEMIES.drip, ENEMIES.grandSmudge, ENEMIES.drip], kind: 'boss', act: 2 },
  // Act 3
  { enemies: [late(ENEMIES.cinderImp), late(ENEMIES.varnishShell), late(ENEMIES.gnatSwarm)], kind: 'normal', act: 3 },
  { enemies: [late(ENEMIES.inkBlob), late(ENEMIES.moldPuff)], kind: 'normal', act: 3 },
  { enemies: [late(ENEMIES.smearKnight), late(ENEMIES.thornSprite)], kind: 'elite', act: 3 },
  { enemies: [late(ENEMIES.gnatSwarm), late(ENEMIES.rustGolem), late(ENEMIES.moldPuff)], kind: 'normal', act: 3 },
  { enemies: [late(ENEMIES.drip), ENEMIES.theBlot, late(ENEMIES.drip)], kind: 'boss', act: 3 },
];

export function defaultRunConfig(): RunConfig {
  return {
    battle: {
      maxPoolSize: MAX_POOL_SIZE,
      playerMaxHp: PLAYER_MAX_HP,
      recipes: MIX_RECIPES,
      attacks: STARTING_ATTACKS,
      status: STATUS_CONFIG,
    },
    stages: RUN_STAGES,
    startingDice: STARTING_DICE,
    startingGold: STARTING_GOLD,
    startingDiceCap: STARTING_DICE_CAP,
    maxDiceCap: MAX_DICE_CAP,
    shopDice: SHOP_DICE,
    economy: ECONOMY,
  };
}
