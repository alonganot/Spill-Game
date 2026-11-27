import type { EconomyConfig } from '../engine/types';

// A reward and a shop follow every one of the 15 fights, so each stop gives
// little and prices climb. Tuned with the balance simulation test.
export const ECONOMY: EconomyConfig = {
  goldPerWin: { normal: 14, elite: 27, boss: 34 },
  rewards: {
    normal: { gold: 20, heal: 6 },
    elite: { gold: 34, heal: 10 },
    boss: { gold: 42, heal: 14 },
  },
  shop: {
    repaintPrice: 20,
    repaintPriceStep: 10,
    healPrice: 14,
    healAmount: 6,
    capPrice: 50,
    capPriceStep: 40,
    diceForSale: 2,
  },
};
