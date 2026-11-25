import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { describeEffect, describeIntent, formatEvent } from './format';

const config = defaultBattleConfig();

describe('formatEvent', () => {
  it.each([
    [{ type: 'rolled', colors: ['red', 'blue'], discarded: [] }, 'Rolled Red, Blue'],
    [{ type: 'rolled', colors: ['red', 'blue'], discarded: ['blue'] }, 'Rolled Red, Blue (pool full, 1 lost)'],
    [{ type: 'mixed', inputs: ['red', 'blue'], output: 'purple' }, 'Mixed Red + Blue → Purple'],
    [{ type: 'triggered', attackId: 'ember' }, 'You used Ember'],
    [{ type: 'damaged', target: 'enemy', amount: 4, blocked: 2, source: 'attack' }, 'Ink Blob takes 4 damage (2 blocked)'],
    [{ type: 'damaged', target: 'player', amount: 6, blocked: 0, source: 'attack' }, 'You take 6 damage'],
    [{ type: 'damaged', target: 'enemy', amount: 3, blocked: 0, source: 'poison' }, 'Poison deals 3 to Ink Blob'],
    [{ type: 'damaged', target: 'player', amount: 4, blocked: 0, source: 'burn' }, 'Burn deals 4 to you'],
    [{ type: 'blockGained', target: 'player', amount: 4 }, 'You gain 4 block'],
    [{ type: 'blockGained', target: 'enemy', amount: 5 }, 'Ink Blob gains 5 block'],
    [{ type: 'statusApplied', target: 'enemy', status: 'poison', stacks: 2 }, 'Ink Blob poisoned (+2)'],
    [{ type: 'statusApplied', target: 'enemy', status: 'burn', stacks: 1 }, 'Ink Blob set on fire'],
    [{ type: 'enemyIntent', intent: { type: 'attack', amount: 6 } }, null],
    [{ type: 'victory' }, 'Ink Blob is defeated!'],
    [{ type: 'defeat' }, 'You are defeated.'],
  ] as const)('%o -> %s', (event, expected) => {
    expect(formatEvent(event, config)).toBe(expected);
  });
});

describe('describe helpers', () => {
  it('summarizes effects and intents', () => {
    expect([
      describeEffect({ type: 'damage', amount: 6 }),
      describeEffect({ type: 'block', amount: 4 }),
      describeEffect({ type: 'poison', stacks: 2 }),
      describeEffect({ type: 'burn' }),
    ]).toEqual(['6 dmg', '4 block', '2 poison', 'burn']);
    expect(describeIntent({ type: 'attack', amount: 6 })).toBe('Attack 6');
    expect(describeIntent({ type: 'block', amount: 5 })).toBe('Block 5');
  });
});
