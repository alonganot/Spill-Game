import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../engine';
import { floatsFor, stageFxFor } from './fx';

const hit = (amount: number, blocked: number, source: 'attack' | 'poison' | 'burn' = 'attack'): BattleEvent => ({
  type: 'damaged',
  target: 'enemy',
  amount,
  blocked,
  source,
});

describe('floatsFor', () => {
  it('shows damage and the part block soaked up, only on the target', () => {
    expect(floatsFor(hit(3, 2), 'enemy')).toEqual([
      { text: '-3', kind: 'damage' },
      { text: '🛡−2', kind: 'blocked' },
    ]);
    expect(floatsFor(hit(3, 2), 'player')).toEqual([]);
  });

  it('shows a fully blocked hit as just the blocked amount', () => {
    expect(floatsFor(hit(0, 5), 'enemy')).toEqual([{ text: '🛡−5', kind: 'blocked' }]);
  });

  it('colors status ticks by their status', () => {
    expect(floatsFor(hit(4, 0, 'burn'), 'enemy')).toEqual([{ text: '-4', kind: 'burn' }]);
    expect(floatsFor(hit(2, 0, 'poison'), 'enemy')).toEqual([{ text: '-2', kind: 'poison' }]);
  });

  it('shows gained block', () => {
    expect(floatsFor({ type: 'blockGained', target: 'player', amount: 4 }, 'player')).toEqual([
      { text: '🛡+4', kind: 'block' },
    ]);
  });

  it('shows nothing for other events', () => {
    expect(floatsFor(null, 'enemy')).toEqual([]);
    expect(floatsFor({ type: 'victory' }, 'enemy')).toEqual([]);
  });
});

describe('stageFxFor', () => {
  it('reacts to hits and status ticks on the target only', () => {
    expect(stageFxFor(hit(3, 0), 'enemy')).toBe('hit');
    expect(stageFxFor(hit(3, 0, 'poison'), 'enemy')).toBe('poison');
    expect(stageFxFor(hit(3, 0, 'burn'), 'enemy')).toBe('burn');
    expect(stageFxFor(hit(0, 3), 'enemy')).toBeNull();
    expect(stageFxFor(hit(3, 0), 'player')).toBeNull();
  });

  it('lunges the enemy only for attacks, and casts for the player', () => {
    expect(stageFxFor({ type: 'enemyIntent', intent: { type: 'attack', amount: 4 } }, 'enemy')).toBe('lunge');
    expect(stageFxFor({ type: 'enemyIntent', intent: { type: 'block', amount: 4 } }, 'enemy')).toBeNull();
    expect(stageFxFor({ type: 'triggered', attackId: 'ember' }, 'player')).toBe('cast');
    expect(stageFxFor({ type: 'triggered', attackId: 'ember' }, 'enemy')).toBeNull();
  });

  it('glows when block is gained', () => {
    expect(stageFxFor({ type: 'blockGained', target: 'enemy', amount: 4 }, 'enemy')).toBe('guard');
  });
});
