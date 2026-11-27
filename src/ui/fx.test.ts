import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../engine';
import { floatsFor, stageFxFor } from './fx';

const hit = (amount: number, blocked: number, source: 'attack' | 'poison' | 'burn' = 'attack', enemy = 0): BattleEvent => ({
  type: 'damaged',
  target: 'enemy',
  enemy,
  amount,
  blocked,
  source,
});

describe('floatsFor', () => {
  it('shows damage and the part block soaked up, only on the target', () => {
    expect(floatsFor(hit(3, 2), 0)).toEqual([
      { text: '-3', kind: 'damage' },
      { text: '🛡−2', kind: 'blocked' },
    ]);
    expect(floatsFor(hit(3, 2), 'player')).toEqual([]);
  });

  it('shows a fully blocked hit as just the blocked amount', () => {
    expect(floatsFor(hit(0, 5), 0)).toEqual([{ text: '🛡−5', kind: 'blocked' }]);
  });

  it('colors status ticks by their status', () => {
    expect(floatsFor(hit(4, 0, 'burn'), 0)).toEqual([{ text: '-4', kind: 'burn' }]);
    expect(floatsFor(hit(2, 0, 'poison'), 0)).toEqual([{ text: '-2', kind: 'poison' }]);
  });

  it('shows gained block', () => {
    expect(floatsFor({ type: 'blockGained', target: 'player', amount: 4 }, 'player')).toEqual([
      { text: '🛡+4', kind: 'block' },
    ]);
  });

  it('shows nothing for other events', () => {
    expect(floatsFor(null, 0)).toEqual([]);
    expect(floatsFor({ type: 'victory' }, 0)).toEqual([]);
  });
});

describe('stageFxFor', () => {
  it('reacts to hits and status ticks on the target only', () => {
    expect(stageFxFor(hit(3, 0), 0)).toBe('hit');
    expect(stageFxFor(hit(3, 0, 'poison'), 0)).toBe('poison');
    expect(stageFxFor(hit(3, 0, 'burn'), 0)).toBe('burn');
    expect(stageFxFor(hit(0, 3), 0)).toBeNull();
    expect(stageFxFor(hit(3, 0), 'player')).toBeNull();
  });

  it('lunges the acting enemy for anything but block, and casts for the player', () => {
    expect(stageFxFor({ type: 'enemyIntent', enemy: 0, intent: { type: 'attack', amount: 4 } }, 0)).toBe('lunge');
    expect(stageFxFor({ type: 'enemyIntent', enemy: 1, intent: { type: 'poison', stacks: 2 } }, 1)).toBe('lunge');
    expect(stageFxFor({ type: 'enemyIntent', enemy: 1, intent: { type: 'attack', amount: 4 } }, 0)).toBeNull();
    expect(stageFxFor({ type: 'enemyIntent', enemy: 0, intent: { type: 'block', amount: 4 } }, 0)).toBeNull();
    expect(stageFxFor({ type: 'triggered', attackId: 'ember', target: 0 }, 'player')).toBe('cast');
    expect(stageFxFor({ type: 'triggered', attackId: 'ember', target: 0 }, 0)).toBeNull();
  });

  it('glows when block is gained', () => {
    expect(stageFxFor({ type: 'blockGained', target: 'enemy', enemy: 0, amount: 4 }, 0)).toBe('guard');
  });

  it('shows statuses landing on whoever they hit', () => {
    const poisoned: BattleEvent = { type: 'statusApplied', target: 'player', status: 'poison', stacks: 3 };
    const burning: BattleEvent = { type: 'statusApplied', target: 'enemy', enemy: 1, status: 'burn', stacks: 1 };
    expect(floatsFor(poisoned, 'player')).toEqual([{ text: '☠+3', kind: 'poison' }]);
    expect(stageFxFor(poisoned, 'player')).toBe('poison');
    expect(floatsFor(poisoned, 0)).toEqual([]);
    expect(floatsFor(burning, 1)).toEqual([{ text: '🔥+1', kind: 'burn' }]);
    expect(stageFxFor(burning, 1)).toBe('burn');
    expect(stageFxFor(burning, 0)).toBeNull();
  });

  it('only reacts on the enemy the event names', () => {
    expect(stageFxFor(hit(3, 0), 1)).toBeNull();
    expect(floatsFor(hit(3, 0), 1)).toEqual([]);
    expect(floatsFor(hit(3, 0, 'attack', 1), 1)).toEqual([{ text: '-3', kind: 'damage' }]);
  });
});

describe('White, Pink, and Black effects', () => {
  it('heal and cleanse float over the player only', () => {
    const healed: BattleEvent = { type: 'healed', target: 'player', amount: 5 };
    const cleansed: BattleEvent = { type: 'cleansed', target: 'player', poison: 2, burn: 1 };
    expect(floatsFor(healed, 'player')).toEqual([{ text: '+5', kind: 'heal' }]);
    expect(floatsFor(healed, 0)).toEqual([]);
    expect(stageFxFor(healed, 'player')).toBe('heal');
    expect(floatsFor(cleansed, 'player')).toEqual([{ text: '✨−3', kind: 'cleanse' }]);
    expect(stageFxFor(cleansed, 'player')).toBe('cleanse');
  });

  it('Curse, Silence, and Chill float and glow on the enemy they hit', () => {
    for (const [status, text] of [
      ['curse', '🌑 Cursed'],
      ['silence', '🤐 Silenced'],
      ['chill', '❄ Chilled'],
    ] as const) {
      const event: BattleEvent = { type: 'statusApplied', target: 'enemy', enemy: 1, status, stacks: 1 };
      expect(floatsFor(event, 1)).toEqual([{ text, kind: status }]);
      expect(floatsFor(event, 0)).toEqual([]);
      expect(stageFxFor(event, 1)).toBe(status);
    }
  });

  it('a resisted Silence and a skipped turn show on that enemy', () => {
    expect(floatsFor({ type: 'silenceResisted', enemy: 0 }, 0)).toEqual([{ text: 'Immune', kind: 'resist' }]);
    const skipped: BattleEvent = { type: 'enemySkipped', enemy: 0, intent: { type: 'attack', amount: 6 } };
    expect(floatsFor(skipped, 0)).toEqual([{ text: '🤐 Skips', kind: 'silence' }]);
    expect(stageFxFor(skipped, 0)).toBe('silence');
    expect(stageFxFor(skipped, 'player')).toBeNull();
  });
});
