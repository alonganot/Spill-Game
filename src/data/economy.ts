import type { EconomyConfig, EssenceConfig } from '../engine/types';

// Paid once when a run is won or lost; seeded runs pay nothing (RULES.md §4).
export const ESSENCE: EssenceConfig = {
  goldDivisor: 5,
  perFightWon: 3,
  victoryBonus: 30,
};

// A reward and a shop follow every one of the 15 fights, so each stop gives
// little and prices climb. Tuned with the balance simulation test.
export const ECONOMY: EconomyConfig = {
  goldPerWin: { normal: 12, elite: 25, boss: 31 },
  // Paid per color still in the pool when a fight is won (RULES.md §4).
  leftoverColorGold: 1,
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
