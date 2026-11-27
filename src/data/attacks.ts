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

/** White, Pink, and Black spells (Milestone 8): heal, cleanse, curse, silence, chill. */
export const PALETTE_ATTACKS = {
  // White: purity
  purify: {
    id: 'purify',
    name: 'Purify',
    cost: { white: 1 },
    effects: [{ type: 'cleanse' }, { type: 'block', amount: 3 }],
  },
  aegis: { id: 'aegis', name: 'Aegis', cost: { white: 2 }, effects: [{ type: 'block', amount: 12, cleanAmount: 16 }] },
  radiantBurst: {
    id: 'radiantBurst',
    name: 'Radiant Burst',
    cost: { white: 1, red: 1 },
    effects: [{ type: 'damage', amount: 6, area: true }, { type: 'cleanse', stacks: 1 }],
  },

  // Pink: heal
  mend: { id: 'mend', name: 'Mend', cost: { pink: 1 }, effects: [{ type: 'heal', amount: 5 }] },
  rejuvenate: {
    id: 'rejuvenate',
    name: 'Rejuvenate',
    cost: { pink: 1, green: 1 },
    effects: [{ type: 'heal', amount: 4 }, { type: 'block', amount: 6 }],
  },
  bloodBloom: {
    id: 'bloodBloom',
    name: 'Blood Bloom',
    cost: { pink: 1, red: 1 },
    effects: [{ type: 'damage', amount: 10 }, { type: 'heal', amount: 4 }],
  },

  // Black and its mixes: curse, silence, drain
  hex: { id: 'hex', name: 'Hex', cost: { black: 1 }, effects: [{ type: 'curse' }] },
  hush: { id: 'hush', name: 'Hush', cost: { black: 1, blue: 1 }, effects: [{ type: 'silence' }] },
  soulSiphon: {
    id: 'soulSiphon',
    name: 'Soul Siphon',
    cost: { crimson: 1 },
    effects: [{ type: 'damage', amount: 7 }, { type: 'heal', amount: 3 }],
  },
  eclipse: {
    id: 'eclipse',
    name: 'Eclipse',
    cost: { grey: 1 },
    effects: [{ type: 'silence' }, { type: 'block', amount: 8 }],
  },
  plagueBurst: {
    id: 'plagueBurst',
    name: 'Plague Burst',
    cost: { blight: 1 },
    effects: [{ type: 'poison', stacks: 2 }, { type: 'multiplyPoison', factor: 2 }],
  },

  // Frost: chill
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    cost: { frost: 1 },
    effects: [{ type: 'damage', amount: 5 }, { type: 'chill' }],
  },
} as const satisfies Record<string, AttackDefinition>;

export const STARTING_ATTACKS: readonly AttackDefinition[] = [...Object.values(ATTACKS), ...Object.values(PALETTE_ATTACKS)];
