import type { StatusConfig } from '../engine/types';

export const MAX_POOL_SIZE = 10;
export const PLAYER_MAX_HP = 40;

export const STATUS_CONFIG: StatusConfig = {
  burnDamage: 4,
  poisonDecay: 1,
  curseBonus: 3,
  chillMultiplier: 0.5,
};

/** How many mixes ahead the Spellbook looks when marking a spell craftable. */
export const MIX_HINT_MAX_MIXES = 3;
