import type { EnemyDefinition } from '../engine/types';

export const ENEMIES = {
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
} as const satisfies Record<string, EnemyDefinition>;
