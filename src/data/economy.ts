import type { EconomyConfig, EssenceConfig } from '../engine/types';

// Paid once when a run is won or lost; seeded runs pay nothing (RULES.md §4).
export const ESSENCE: EssenceConfig = {
  goldDivisor: 5,
  perFightWon: 3,
  victoryBonus: 30,
};

// Gold interest on every won fight (RULES.md §4): +1g per 5g held, at most +5g (25g+).
export const INTEREST_GOLD_STEP = 5;
export const MAX_INTEREST_GOLD = 5;

// A reward and a shop follow every one of the 15 fights, so each stop gives
// little and prices climb. Tuned with the balance simulation test.
export const ECONOMY: EconomyConfig = {
  // Trimmed 12/25/31 -> 10/23/29 when gold interest arrived (Issue #11), so a spender
  // earns about what it did before and saving is what pays.
  goldPerWin: { normal: 10, elite: 23, boss: 29 },
  // Paid per color still in the pool when a fight is won (RULES.md §4).
  leftoverColorGold: 1,
  interest: { step: INTEREST_GOLD_STEP, max: MAX_INTEREST_GOLD },
  rewards: {
    normal: { gold: 20, heal: 6 },
    elite: { gold: 34, heal: 10 },
    boss: { gold: 42, heal: 14 },
  },
  upgradeRewardChance: 0.5,
  shop: {
    repaintPrice: 20,
    repaintPriceStep: 10,
    healPrice: 14,
    healAmount: 6,
    capPrice: 50,
    capPriceStep: 40,
    diceForSale: 2,
    spotlightPrice: 25,
    draftPrice: 35,
    draftChoices: 3,
    targetedPrice: 60,
    targetedPriceStep: 10,
  },
};
