import type { RunConfig, StageDefinition } from '../engine/types';
import { STARTING_ATTACKS } from './attacks';
import { MAX_POOL_SIZE, PLAYER_MAX_HP, STATUS_CONFIG } from './balance';
import { MIX_RECIPES } from './colors';
import { SHOP_DICE, STARTING_DICE } from './dice';
import { ECONOMY } from './economy';
import { ENEMIES } from './enemies';

export const STARTING_GOLD = 0;
export const STARTING_DICE_CAP = 3;
export const MAX_DICE_CAP = 6;

/** Fight 1 → Reward → Fight 2 → Shop → Elite → Reward → Fight 4 → Shop → Boss. */
export const RUN_STAGES: readonly StageDefinition[] = [
  { enemy: ENEMIES.puddleSlime, kind: 'normal', after: 'reward' },
  { enemy: ENEMIES.thornSprite, kind: 'normal', after: 'shop' },
  { enemy: ENEMIES.inkBlob, kind: 'elite', after: 'reward' },
  { enemy: ENEMIES.rustGolem, kind: 'normal', after: 'shop' },
  { enemy: ENEMIES.theBlot, kind: 'boss', after: 'end' },
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
