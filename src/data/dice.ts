import type { DieDefinition, DieForSale } from '../engine/types';

export const DICE = {
  /** Even split of the three base colors. */
  standard: { id: 'standard', name: 'Standard', faces: ['red', 'red', 'blue', 'blue', 'green', 'green'] },

  // Lean hard toward one color.
  ember: { id: 'ember', name: 'Ember', faces: ['red', 'red', 'red', 'red', 'blue', 'green'] },
  tide: { id: 'tide', name: 'Tide', faces: ['blue', 'blue', 'blue', 'blue', 'red', 'green'] },
  moss: { id: 'moss', name: 'Moss', faces: ['green', 'green', 'green', 'green', 'red', 'blue'] },

  // Two colors only: good for one specific mix.
  dusk: { id: 'dusk', name: 'Dusk', faces: ['red', 'red', 'red', 'blue', 'blue', 'blue'] },
  lagoon: { id: 'lagoon', name: 'Lagoon', faces: ['blue', 'blue', 'blue', 'green', 'green', 'green'] },
  ash: { id: 'ash', name: 'Ash', faces: ['red', 'red', 'red', 'green', 'green', 'green'] },
} as const satisfies Record<string, DieDefinition>;

export const STANDARD_DIE: DieDefinition = DICE.standard;

export const STARTING_DICE: readonly DieDefinition[] = [DICE.standard, DICE.standard];

/** Dice the shop can offer, with prices. */
export const SHOP_DICE: readonly DieForSale[] = [
  { die: DICE.standard, price: 35 },
  { die: DICE.ember, price: 45 },
  { die: DICE.tide, price: 45 },
  { die: DICE.moss, price: 45 },
  { die: DICE.dusk, price: 50 },
  { die: DICE.lagoon, price: 50 },
  { die: DICE.ash, price: 50 },
];
