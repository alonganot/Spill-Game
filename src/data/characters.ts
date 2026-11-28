import type { DieDefinition } from '../engine/types';
import { PLAYER_MAX_HP } from './balance';
import { DICE } from './dice';

/** Playable starting characters (RULES.md §4, Characters & Essence). */
export type CharacterId = 'apprentice' | 'warrior' | 'tank' | 'venom' | 'demon' | 'healer';

/** 0 is the free starter; tiers 1 and 2 are unlocked with Essence. */
export type CharacterTier = 0 | 1 | 2;

export interface CharacterDef {
  id: CharacterId;
  name: string;
  tier: CharacterTier;
  /** Essence to unlock; 0 for the starter. */
  unlockCost: number;
  dice: readonly DieDefinition[];
  maxHp: number;
  description: string;
}

export const TIER_COSTS: Readonly<Record<CharacterTier, number>> = { 0: 0, 1: 500, 2: 2000 };

export const CHARACTERS: Readonly<Record<CharacterId, CharacterDef>> = {
  apprentice: {
    id: 'apprentice',
    name: 'Apprentice',
    tier: 0,
    unlockCost: TIER_COSTS[0],
    dice: [DICE.standard, DICE.standard],
    maxHp: PLAYER_MAX_HP,
    description: 'An even split of Red, Blue, and Green.',
  },
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    tier: 1,
    unlockCost: TIER_COSTS[1],
    dice: [DICE.ember, DICE.ember],
    maxHp: PLAYER_MAX_HP,
    description: 'Mostly Red: hits hard and burns.',
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    tier: 1,
    unlockCost: TIER_COSTS[1],
    dice: [DICE.lagoon, DICE.standard],
    maxHp: 42,
    description: 'Leans Blue, with 2 more HP: blocks and outlasts.',
  },
  venom: {
    id: 'venom',
    name: 'Venom',
    tier: 1,
    unlockCost: TIER_COSTS[1],
    dice: [DICE.moss, DICE.tide],
    maxHp: PLAYER_MAX_HP,
    description: 'Mostly Green with Blue: Poison behind a wall of Block.',
  },
  demon: {
    id: 'demon',
    name: 'Demon',
    tier: 2,
    unlockCost: TIER_COSTS[2],
    dice: [DICE.standard, DICE.shade],
    maxHp: PLAYER_MAX_HP,
    description: 'Starts with Black paint: Curse and Silence.',
  },
  healer: {
    id: 'healer',
    name: 'Healer',
    tier: 2,
    unlockCost: TIER_COSTS[2],
    dice: [DICE.standard, DICE.halo],
    maxHp: 28,
    description: 'Starts with White paint (Block, Cleanse, Heal), but only 28 HP.',
  },
};

/** Display order, starter first, then by tier. */
export const CHARACTER_ORDER: readonly CharacterId[] = ['apprentice', 'warrior', 'tank', 'venom', 'demon', 'healer'];

export const DEFAULT_CHARACTER: CharacterId = 'apprentice';

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && Object.hasOwn(CHARACTERS, value);
}
