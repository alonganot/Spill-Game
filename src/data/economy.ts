import type { EconomyConfig } from '../engine/types';

// Starting numbers; tune in the Milestone 4 balance pass.
export const ECONOMY: EconomyConfig = {
  goldPerWin: { normal: 15, elite: 30, boss: 0 },
  rewards: {
    normal: { gold: 20, heal: 8 },
    elite: { gold: 35, heal: 14 },
    boss: { gold: 40, heal: 16 },
  },
  shop: {
    repaintPrice: 15,
    repaintPriceStep: 10,
    healPrice: 10,
    healAmount: 8,
    capPrice: 40,
    capPriceStep: 30,
    diceForSale: 2,
  },
};
