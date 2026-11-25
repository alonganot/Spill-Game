import { describe, expect, it } from 'vitest';
import { MIX_RECIPES } from '../data/colors';
import { canAfford, type Color, type ColorCost } from '../engine';
import {
  bowlResult,
  costSlots,
  EMPTY_STAGING,
  missingColors,
  place,
  prune,
  remove,
  spellReady,
  stagedIndices,
  type Staging,
} from './staging';

const pool: Color[] = ['red', 'blue', 'green', 'red', 'purple'];
const costs: Record<string, ColorCost> = {
  ember: { red: 1 },
  inferno: { red: 2 },
  steam: { purple: 1, blue: 1 },
};

function placeOk(staging: Staging, chip: number, target: Parameters<typeof place>[2]): Staging {
  const result = place(staging, chip, target, pool, costs);
  if (!result.ok) throw new Error(`place failed: ${result.reason}`);
  return result.staging;
}

describe('the mixing bowl', () => {
  it('takes two chips and no more', () => {
    let s = placeOk(EMPTY_STAGING, 0, { kind: 'bowl' });
    s = placeOk(s, 1, { kind: 'bowl' });
    expect(s.bowl).toEqual([0, 1]);
    expect(place(s, 2, { kind: 'bowl' }, pool, costs)).toEqual({ ok: false, reason: 'full' });
  });

  it('finds the recipe in either order', () => {
    const ab = placeOk(placeOk(EMPTY_STAGING, 0, { kind: 'bowl' }), 1, { kind: 'bowl' });
    const ba = placeOk(placeOk(EMPTY_STAGING, 1, { kind: 'bowl' }), 0, { kind: 'bowl' });
    for (const s of [ab, ba]) {
      const result = bowlResult(s, pool, MIX_RECIPES);
      expect(result.kind).toBe('mix');
      if (result.kind === 'mix') expect(result.recipe.output).toBe('purple');
    }
  });

  it('waits for a second color, and says when two colors do not mix', () => {
    const one = placeOk(EMPTY_STAGING, 0, { kind: 'bowl' });
    expect(bowlResult(one, pool, MIX_RECIPES).kind).toBe('waiting');
    const twoReds = placeOk(one, 3, { kind: 'bowl' });
    expect(bowlResult(twoReds, pool, MIX_RECIPES).kind).toBe('no-mix');
  });
});

describe('spell slots', () => {
  it('only takes colors the spell still needs', () => {
    expect(place(EMPTY_STAGING, 1, { kind: 'spell', attackId: 'ember' }, pool, costs)).toEqual({
      ok: false,
      reason: 'not-needed',
    });
    const one = placeOk(EMPTY_STAGING, 0, { kind: 'spell', attackId: 'ember' });
    expect(place(one, 3, { kind: 'spell', attackId: 'ember' }, pool, costs)).toEqual({ ok: false, reason: 'full' });
  });

  it('is ready once every slot is filled, and its colors then pay the cost', () => {
    let s = placeOk(EMPTY_STAGING, 4, { kind: 'spell', attackId: 'steam' });
    expect(spellReady(s, 'steam', costs.steam!, pool)).toBe(false);
    s = placeOk(s, 1, { kind: 'spell', attackId: 'steam' });
    expect(spellReady(s, 'steam', costs.steam!, pool)).toBe(true);
    const colors = s.spells.steam!.map((i) => pool[i]!);
    expect(canAfford(colors, costs.steam!)).toBe(true);
    expect(colors).toHaveLength(costSlots(costs.steam!).length);
  });

  it('lists what a spell is still missing', () => {
    expect(missingColors({ red: 2, blue: 1 }, ['red'])).toEqual(['red', 'blue']);
    expect(missingColors({ red: 1 }, ['red'])).toEqual([]);
  });
});

describe('moving chips', () => {
  it('keeps each chip in one place: placing it again moves it', () => {
    let s = placeOk(EMPTY_STAGING, 0, { kind: 'bowl' });
    s = placeOk(s, 0, { kind: 'spell', attackId: 'inferno' });
    expect(s.bowl).toEqual([]);
    expect(s.spells.inferno).toEqual([0]);
    expect([...stagedIndices(s)]).toEqual([0]);
  });

  it('frees a chip on remove, and drops empty spells', () => {
    const s = remove(placeOk(EMPTY_STAGING, 0, { kind: 'spell', attackId: 'ember' }), 0);
    expect(s).toEqual(EMPTY_STAGING);
  });

  it('drops chips that no longer exist in a smaller pool', () => {
    let s = placeOk(EMPTY_STAGING, 4, { kind: 'bowl' });
    s = placeOk(s, 0, { kind: 'spell', attackId: 'ember' });
    expect(prune(s, ['red', 'blue'])).toEqual({ bowl: [], spells: { ember: [0] } });
  });

  it('rejects unknown chips and spells', () => {
    expect(place(EMPTY_STAGING, 99, { kind: 'bowl' }, pool, costs).ok).toBe(false);
    expect(place(EMPTY_STAGING, 0, { kind: 'spell', attackId: 'nope' }, pool, costs).ok).toBe(false);
  });
});
