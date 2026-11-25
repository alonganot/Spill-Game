import type { EnemyDefinition } from '../engine/types';

// Tuned for a 2-dice start (about 2 colors per turn). Expect changes in the Milestone 4 balance pass.
export const ENEMIES = {
  puddleSlime: {
    id: 'puddleSlime',
    name: 'Puddle Slime',
    maxHp: 16,
    intents: [
      { type: 'attack', amount: 4 },
      { type: 'attack', amount: 4 },
      { type: 'block', amount: 4 },
    ],
  },
  thornSprite: {
    id: 'thornSprite',
    name: 'Thorn Sprite',
    maxHp: 18,
    intents: [
      { type: 'attack', amount: 3 },
      { type: 'attack', amount: 6 },
    ],
  },
  rustGolem: {
    id: 'rustGolem',
    name: 'Rust Golem',
    maxHp: 24,
    intents: [
      { type: 'block', amount: 6 },
      { type: 'attack', amount: 7 },
    ],
  },
  /** Elite. */
  inkBlob: {
    id: 'inkBlob',
    name: 'Ink Blob',
    maxHp: 30,
    intents: [
      { type: 'attack', amount: 6 },
      { type: 'block', amount: 5 },
      { type: 'attack', amount: 9 },
    ],
  },
  /** Boss. */
  theBlot: {
    id: 'theBlot',
    name: 'The Blot',
    maxHp: 48,
    intents: [
      { type: 'attack', amount: 6 },
      { type: 'block', amount: 8 },
      { type: 'attack', amount: 10 },
      { type: 'attack', amount: 5 },
    ],
  },
} as const satisfies Record<string, EnemyDefinition>;
