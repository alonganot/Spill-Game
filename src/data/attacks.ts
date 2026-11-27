import type { AttackDefinition } from '../engine/types';

export const ATTACKS = {
  // Single base color
  ember: { id: 'ember', name: 'Ember', cost: { red: 1 }, effects: [{ type: 'damage', amount: 4 }] },
  ripple: { id: 'ripple', name: 'Ripple', cost: { blue: 1 }, effects: [{ type: 'block', amount: 4 }] },
  thorn: { id: 'thorn', name: 'Thorn', cost: { green: 1 }, effects: [{ type: 'poison', stacks: 2 }] },

  // Stack combos (same color, several times)
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    cost: { red: 2 },
    effects: [{ type: 'damage', amount: 6 }, { type: 'burn' }],
  },
  tidalWall: { id: 'tidalWall', name: 'Tidal Wall', cost: { blue: 2 }, effects: [{ type: 'block', amount: 10 }] },

  // Secondary colors
  steamBurst: {
    id: 'steamBurst',
    name: 'Steam Burst',
    cost: { purple: 1 },
    effects: [{ type: 'damage', amount: 7 }, { type: 'block', amount: 3 }],
  },
  toxicTide: {
    id: 'toxicTide',
    name: 'Toxic Tide',
    cost: { cyan: 1 },
    effects: [{ type: 'poison', stacks: 3 }, { type: 'block', amount: 4 }],
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire',
    cost: { orange: 1 },
    effects: [{ type: 'burn' }, { type: 'poison', stacks: 3 }],
  },

  // Area spells: hit every enemy
  splash: {
    id: 'splash',
    name: 'Splash',
    cost: { purple: 1, red: 1 },
    effects: [{ type: 'damage', amount: 4, area: true }],
  },
  miasma: {
    id: 'miasma',
    name: 'Miasma',
    cost: { cyan: 1, green: 1 },
    effects: [{ type: 'poison', stacks: 2, area: true }],
  },
  // Multi-color combo
  prism: {
    id: 'prism',
    name: 'Prism',
    cost: { purple: 1, cyan: 1, orange: 1 },
    effects: [{ type: 'damage', amount: 20 }],
  },
} as const satisfies Record<string, AttackDefinition>;

export const STARTING_ATTACKS: readonly AttackDefinition[] = Object.values(ATTACKS);
