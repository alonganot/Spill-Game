import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { ENEMIES } from '../data/enemies';
import type { BattleEvent } from '../engine';
import { describeEffect, describeIntent, describeUpdate, enemyLabels, formatEvent } from './format';

const config = defaultBattleConfig();

describe('formatEvent', () => {
  it.each([
    [{ type: 'rolled', colors: ['red', 'blue'], discarded: [] }, 'Rolled Red, Blue'],
    [{ type: 'rolled', colors: ['red', 'blue'], discarded: ['blue'] }, 'Rolled Red, Blue (pool full, 1 lost)'],
    [{ type: 'mixed', inputs: ['red', 'blue'], output: 'purple' }, 'Mixed Red + Blue → Purple'],
    [{ type: 'triggered', attackId: 'ember', target: 0 }, 'You used Ember'],
    [{ type: 'damaged', target: 'enemy', amount: 4, blocked: 2, source: 'attack' }, 'Ink Blob takes 4 damage (2 blocked)'],
    [{ type: 'damaged', target: 'player', amount: 6, blocked: 0, source: 'attack' }, 'You take 6 damage'],
    [{ type: 'damaged', target: 'enemy', amount: 3, blocked: 0, source: 'poison' }, 'Poison deals 3 to Ink Blob'],
    [{ type: 'damaged', target: 'player', amount: 4, blocked: 0, source: 'burn' }, 'Burn deals 4 to you'],
    [{ type: 'blockGained', target: 'player', amount: 4 }, 'You gain 4 block'],
    [{ type: 'blockGained', target: 'enemy', amount: 5 }, 'Ink Blob gains 5 block'],
    [{ type: 'statusApplied', target: 'enemy', status: 'poison', stacks: 2 }, 'Ink Blob poisoned (+2)'],
    [{ type: 'statusApplied', target: 'enemy', status: 'burn', stacks: 1 }, 'Ink Blob set on fire'],
    [{ type: 'statusApplied', target: 'player', status: 'poison', stacks: 3 }, 'You are poisoned (+3)'],
    [{ type: 'statusApplied', target: 'player', status: 'burn', stacks: 1 }, 'You are set on fire'],
    [{ type: 'statusApplied', target: 'enemy', enemy: 0, status: 'curse', stacks: 1 }, 'Ink Blob is cursed'],
    [{ type: 'statusApplied', target: 'enemy', enemy: 0, status: 'silence', stacks: 1 }, 'Ink Blob is silenced'],
    [{ type: 'statusApplied', target: 'enemy', enemy: 0, status: 'chill', stacks: 1 }, 'Ink Blob is chilled'],
    [{ type: 'healed', target: 'player', amount: 5 }, 'You heal 5'],
    [{ type: 'cleansed', target: 'player', poison: 3, burn: 1 }, 'You cleanse 3 Poison and 1 Burn'],
    [{ type: 'cleansed', target: 'player', poison: 0, burn: 2 }, 'You cleanse 2 Burn'],
    [{ type: 'silenceResisted', enemy: 0 }, 'Ink Blob resists Silence'],
    [{ type: 'enemySkipped', enemy: 0, intent: { type: 'attack', amount: 6 } }, 'Ink Blob is silenced and skips Attack 6'],
    [{ type: 'enemyIntent', enemy: 0, intent: { type: 'attack', amount: 6 } }, null],
    [{ type: 'enemyIntent', enemy: 0, intent: { type: 'burn' } }, 'Ink Blob: Burn'],
    [{ type: 'victory' }, 'Ink Blob is defeated!'],
    [{ type: 'defeat' }, 'You are defeated.'],
  ] as [BattleEvent, string | null][])('%o -> %s', (event, expected) => {
    expect(formatEvent(event, config)).toBe(expected);
  });

  it('names which enemy did what when there are several', () => {
    const many = defaultBattleConfig([ENEMIES.puddleSlime, ENEMIES.puddleSlime, ENEMIES.inkBlob]);
    expect(enemyLabels(many)).toEqual(['Puddle Slime A', 'Puddle Slime B', 'Ink Blob']);
    const lines = ([
      { type: 'triggered', attackId: 'ember', target: 1 },
      { type: 'damaged', target: 'enemy', enemy: 1, amount: 4, blocked: 0, source: 'attack' },
      { type: 'enemyIntent', enemy: 2, intent: { type: 'attack', amount: 3, hits: 2 } },
      { type: 'enemyIntent', enemy: 0, intent: { type: 'block', amount: 4 } },
      { type: 'victory' },
    ] as BattleEvent[]).map((e) => formatEvent(e, many));
    expect(lines).toEqual([
      'You used Ember on Puddle Slime B',
      'Puddle Slime B takes 4 damage',
      'Ink Blob: Attack 3×2',
      null,
      'Every enemy is defeated!',
    ]);
    expect(formatEvent({ type: 'triggered', attackId: 'splash', target: 0 }, {
      ...many,
      attacks: [{ id: 'splash', name: 'Splash', cost: { purple: 1 }, effects: [{ type: 'damage', amount: 3, area: true }] }],
    })).toBe('You used Splash on every enemy');
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
    expect(describeEffect({ type: 'damage', amount: 5, area: true })).toBe('5 dmg all');
    expect(describeIntent({ type: 'attack', amount: 6 })).toBe('Attack 6');
    expect(describeIntent({ type: 'attack', amount: 2, hits: 3 })).toBe('Attack 2×3');
    expect(describeIntent({ type: 'block', amount: 5 })).toBe('Block 5');
    expect(describeIntent({ type: 'poison', stacks: 3 })).toBe('Poison 3');
    expect(describeIntent({ type: 'burn' })).toBe('Burn');
  });
});

describe('describeUpdate', () => {
  it.each([
    [{ state: 'none' }, null],
    [{ state: 'available', version: '1.0.2' }, { text: 'Update available: v1.0.2', action: 'Update' }],
    [{ state: 'downloading', version: '1.0.2', percent: 41.6 }, { text: 'Downloading v1.0.2… 42%' }],
    [{ state: 'downloading', version: '1.0.2', percent: 140 }, { text: 'Downloading v1.0.2… 100%' }],
    [{ state: 'installing', version: '1.0.2' }, { text: 'Installing v1.0.2. Spill will restart…' }],
    [{ state: 'error', version: '1.0.2', message: 'net::ERR' }, { text: "Couldn't download v1.0.2.", action: 'Retry' }],
  ] as const)('%o', (status, expected) => {
    expect(describeUpdate(status)).toEqual(expected);
  });
});
