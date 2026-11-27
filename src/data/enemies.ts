import type { EnemyDefinition, EnemyIntent } from '../engine/types';

// Starting numbers for the 15-fight run; tuned with the run simulation test.
export const ENEMIES = {
  // ---------- Act 1 ----------
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
  /** Minion: weak alone, dangerous in numbers. */
  drip: {
    id: 'drip',
    name: 'Drip',
    maxHp: 9,
    intents: [
      { type: 'attack', amount: 4 },
      { type: 'attack', amount: 3 },
      { type: 'block', amount: 3 },
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
  /** Act 1 boss. */
  rustGolem: {
    id: 'rustGolem',
    name: 'Rust Golem',
    maxHp: 40,
    intents: [
      { type: 'block', amount: 8 },
      { type: 'attack', amount: 9 },
      { type: 'attack', amount: 5 },
    ],
  },

  // ---------- Act 2 ----------
  /** Poisons the player. */
  moldPuff: {
    id: 'moldPuff',
    name: 'Mold Puff',
    maxHp: 16,
    intents: [
      { type: 'poison', stacks: 3 },
      { type: 'attack', amount: 3 },
      { type: 'attack', amount: 4 },
    ],
  },
  /** Sets the player on fire. */
  cinderImp: {
    id: 'cinderImp',
    name: 'Cinder Imp',
    maxHp: 15,
    intents: [
      { type: 'burn' },
      { type: 'attack', amount: 5 },
      { type: 'attack', amount: 3 },
    ],
  },
  /** Many small bites: weak against Block. */
  gnatSwarm: {
    id: 'gnatSwarm',
    name: 'Gnat Swarm',
    maxHp: 14,
    intents: [
      { type: 'attack', amount: 2, hits: 3 },
      { type: 'block', amount: 3 },
      { type: 'attack', amount: 2, hits: 4 },
    ],
  },
  /** Hides behind thick Block. */
  varnishShell: {
    id: 'varnishShell',
    name: 'Varnish Shell',
    maxHp: 24,
    intents: [
      { type: 'block', amount: 10 },
      { type: 'attack', amount: 7 },
    ],
  },
  /** Elite. */
  smearKnight: {
    id: 'smearKnight',
    name: 'Smear Knight',
    maxHp: 44,
    intents: [
      { type: 'attack', amount: 8 },
      { type: 'block', amount: 8 },
      { type: 'attack', amount: 4, hits: 2 },
    ],
  },
  /** Act 2 boss. */
  grandSmudge: {
    id: 'grandSmudge',
    name: 'Grand Smudge',
    maxHp: 58,
    intents: [
      { type: 'attack', amount: 9 },
      { type: 'poison', stacks: 3 },
      { type: 'block', amount: 8 },
      { type: 'attack', amount: 5, hits: 2 },
    ],
  },

  // ---------- Act 3 ----------
  /** Final boss. */
  theBlot: {
    id: 'theBlot',
    name: 'The Blot',
    maxHp: 100,
    intents: [
      { type: 'attack', amount: 12 },
      { type: 'block', amount: 12 },
      { type: 'burn' },
      { type: 'attack', amount: 5, hits: 3 },
      { type: 'poison', stacks: 4 },
    ],
  },
} as const satisfies Record<string, EnemyDefinition>;

/**
 * A tougher version of an enemy for later acts: same id (so the same sprite)
 * and name, more HP, and harder-hitting intents. Poison stacks and Block scale
 * like damage; Burn stays as it is.
 */
export function toughened(enemy: EnemyDefinition, hpScale: number, powerScale: number): EnemyDefinition {
  const scale = (n: number) => Math.round(n * powerScale);
  const intents = enemy.intents.map((intent): EnemyIntent => {
    switch (intent.type) {
      case 'attack':
        return { ...intent, amount: scale(intent.amount) };
      case 'block':
        return { ...intent, amount: scale(intent.amount) };
      case 'poison':
        return { ...intent, stacks: scale(intent.stacks) };
      case 'burn':
        return intent;
    }
  });
  return { ...enemy, maxHp: Math.round(enemy.maxHp * hpScale), intents };
}
