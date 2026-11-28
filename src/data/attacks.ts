import type { AttackDefinition } from '../engine/types';

// Every spell has a `+` form (`upgrade`): stronger effects, same cost (RULES.md §2).
// Area spells roughly double, since they cost two colors and hit every enemy.

export const ATTACKS = {
  // Single base color
  ember: {
    id: 'ember',
    name: 'Ember',
    cost: { red: 1 },
    effects: [{ type: 'damage', amount: 4 }],
    upgrade: { effects: [{ type: 'damage', amount: 6 }] },
  },
  ripple: {
    id: 'ripple',
    name: 'Ripple',
    cost: { blue: 1 },
    effects: [{ type: 'block', amount: 4 }],
    upgrade: { effects: [{ type: 'block', amount: 6 }] },
  },
  thorn: {
    id: 'thorn',
    name: 'Thorn',
    cost: { green: 1 },
    effects: [{ type: 'poison', stacks: 2 }],
    upgrade: { effects: [{ type: 'poison', stacks: 4 }] },
  },

  // Stack combos (same color, several times)
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    cost: { red: 2 },
    effects: [{ type: 'damage', amount: 6 }, { type: 'burn' }],
    upgrade: { effects: [{ type: 'damage', amount: 8 }, { type: 'burn' }, { type: 'burn' }] },
  },
  tidalWall: {
    id: 'tidalWall',
    name: 'Tidal Wall',
    cost: { blue: 2 },
    effects: [{ type: 'block', amount: 10 }],
    upgrade: { effects: [{ type: 'block', amount: 14 }] },
  },
  sporeCloud: {
    id: 'sporeCloud',
    name: 'Spore Cloud',
    cost: { green: 2 },
    effects: [{ type: 'poison', stacks: 2, area: true }],
    upgrade: { effects: [{ type: 'poison', stacks: 3, area: true }] },
  },

  // Secondary colors
  steamBurst: {
    id: 'steamBurst',
    name: 'Steam Burst',
    cost: { purple: 1 },
    effects: [{ type: 'damage', amount: 7 }, { type: 'block', amount: 3 }],
    upgrade: { effects: [{ type: 'damage', amount: 10 }, { type: 'block', amount: 3 }] },
  },
  toxicTide: {
    id: 'toxicTide',
    name: 'Toxic Tide',
    cost: { cyan: 1 },
    effects: [{ type: 'poison', stacks: 3 }, { type: 'block', amount: 4 }],
    upgrade: { effects: [{ type: 'poison', stacks: 4 }, { type: 'block', amount: 6 }] },
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire',
    cost: { orange: 1 },
    effects: [{ type: 'burn' }, { type: 'poison', stacks: 3 }],
    upgrade: { effects: [{ type: 'burn' }, { type: 'burn' }, { type: 'poison', stacks: 4 }] },
  },

  // Area spells: hit every enemy
  splash: {
    id: 'splash',
    name: 'Splash',
    cost: { purple: 1, red: 1 },
    effects: [{ type: 'damage', amount: 4, area: true }],
    upgrade: { effects: [{ type: 'damage', amount: 8, area: true }] },
  },
  miasma: {
    id: 'miasma',
    name: 'Miasma',
    cost: { cyan: 1, green: 1 },
    // Spore Cloud's area Poison plus Block, for the extra mix it costs; the upgrade only adds Poison.
    effects: [{ type: 'poison', stacks: 2, area: true }, { type: 'block', amount: 5 }],
    upgrade: { effects: [{ type: 'poison', stacks: 4, area: true }, { type: 'block', amount: 5 }] },
  },
  // Multi-color combo
  prism: {
    id: 'prism',
    name: 'Prism',
    cost: { purple: 1, cyan: 1, orange: 1 },
    effects: [{ type: 'damage', amount: 20 }],
    upgrade: { effects: [{ type: 'damage', amount: 20 }, { type: 'chill' }] },
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
    upgrade: { effects: [{ type: 'cleanse' }, { type: 'block', amount: 5 }] },
  },
  aegis: {
    id: 'aegis',
    name: 'Aegis',
    cost: { white: 2 },
    effects: [{ type: 'block', amount: 12, cleanAmount: 16 }],
    upgrade: { effects: [{ type: 'block', amount: 16, cleanAmount: 20 }] },
  },
  radiantBurst: {
    id: 'radiantBurst',
    name: 'Radiant Burst',
    cost: { white: 1, red: 1 },
    effects: [{ type: 'damage', amount: 6, area: true }, { type: 'cleanse', stacks: 1 }],
    upgrade: { effects: [{ type: 'damage', amount: 10, area: true }, { type: 'cleanse', stacks: 2 }] },
  },

  // Pink: heal
  mend: {
    id: 'mend',
    name: 'Mend',
    cost: { pink: 1 },
    effects: [{ type: 'heal', amount: 5 }],
    upgrade: { effects: [{ type: 'heal', amount: 7 }] },
  },
  rejuvenate: {
    id: 'rejuvenate',
    name: 'Rejuvenate',
    cost: { pink: 1, green: 1 },
    effects: [{ type: 'heal', amount: 4 }, { type: 'block', amount: 6 }],
    upgrade: { effects: [{ type: 'heal', amount: 6 }, { type: 'block', amount: 8 }] },
  },
  bloodBloom: {
    id: 'bloodBloom',
    name: 'Blood Bloom',
    cost: { pink: 1, red: 1 },
    effects: [{ type: 'damage', amount: 10 }, { type: 'heal', amount: 4 }],
    upgrade: { effects: [{ type: 'damage', amount: 14 }, { type: 'heal', amount: 6 }] },
  },

  // Black and its mixes: curse, silence, drain
  hex: {
    id: 'hex',
    name: 'Hex',
    cost: { black: 1 },
    effects: [{ type: 'curse' }],
    upgrade: { effects: [{ type: 'curse', area: true }] },
  },
  hush: {
    id: 'hush',
    name: 'Hush',
    cost: { black: 1, blue: 1 },
    effects: [{ type: 'silence' }],
    upgrade: { effects: [{ type: 'silence', noImmunity: true }] },
  },
  soulSiphon: {
    id: 'soulSiphon',
    name: 'Soul Siphon',
    cost: { crimson: 1 },
    effects: [{ type: 'damage', amount: 7 }, { type: 'heal', amount: 3 }],
    upgrade: { effects: [{ type: 'damage', amount: 10 }, { type: 'heal', amount: 4 }] },
  },
  eclipse: {
    id: 'eclipse',
    name: 'Eclipse',
    cost: { grey: 1 },
    effects: [{ type: 'silence' }, { type: 'block', amount: 8 }],
    upgrade: { effects: [{ type: 'silence' }, { type: 'block', amount: 12 }] },
  },
  plagueBurst: {
    id: 'plagueBurst',
    name: 'Plague Burst',
    cost: { blight: 1 },
    effects: [{ type: 'poison', stacks: 2 }, { type: 'multiplyPoison', factor: 2 }],
    upgrade: { effects: [{ type: 'poison', stacks: 3 }, { type: 'multiplyPoison', factor: 3 }] },
  },

  // Frost: chill
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    cost: { frost: 1 },
    effects: [{ type: 'damage', amount: 5 }, { type: 'chill' }],
    upgrade: { effects: [{ type: 'damage', amount: 7 }, { type: 'chill' }] },
  },
} as const satisfies Record<string, AttackDefinition>;

export const STARTING_ATTACKS: readonly AttackDefinition[] = [...Object.values(ATTACKS), ...Object.values(PALETTE_ATTACKS)];
