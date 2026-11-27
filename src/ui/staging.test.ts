import { describe, expect, it } from 'vitest';
import { MIX_RECIPES } from '../data/colors';
import { canAfford, mixColors, spendColors, type Color, type ColorCost } from '../engine';
import {
  bowlResult,
  carryStaging,
  costSlots,
  EMPTY_STAGING,
  missingColors,
  place,
  prune,
  remove,
  slotSource,
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

describe('where a tapped slot takes its paint from', () => {
  it('takes a matching drop from the bowl before the pool', () => {
    const bowl: Staging = { bowl: [3], spells: {} }; // the second red
    expect(slotSource(bowl, pool, 'red', MIX_RECIPES)).toEqual({ kind: 'chip', chip: 3 });
    expect(slotSource(EMPTY_STAGING, pool, 'red', MIX_RECIPES)).toEqual({ kind: 'chip', chip: 0 });
  });

  it("takes the bowl's mix when it makes that color", () => {
    const redBlue: Staging = { bowl: [0, 1], spells: {} };
    expect(slotSource(redBlue, pool, 'purple', MIX_RECIPES)).toEqual({ kind: 'mixed' });
    // A drop of the color itself still wins over the mix.
    expect(slotSource(redBlue, pool, 'red', MIX_RECIPES)).toEqual({ kind: 'chip', chip: 0 });
  });

  it('skips chips staged on spells, and finds nothing when the color is missing', () => {
    const onSpell: Staging = { bowl: [], spells: { ember: [0] } };
    expect(slotSource(onSpell, pool, 'red', MIX_RECIPES)).toEqual({ kind: 'chip', chip: 3 });
    expect(slotSource(EMPTY_STAGING, pool, 'orange', MIX_RECIPES)).toBeNull();
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

describe('carrying staging over a Cast or Mix', () => {
  const cast = (staging: Staging, before: Color[], attackId: string, cost: ColorCost) =>
    carryStaging(staging, before, cost, spendColors(before, cost)!, { kind: 'spell', attackId });

  it('keeps other spells and the bowl, following their chips to new indices', () => {
    const before: Color[] = ['red', 'blue', 'green', 'red', 'purple'];
    const staged: Staging = { bowl: [2], spells: { ember: [0], steam: [4, 1] } };
    // Casting Ember spends the first red (index 0); everything after shifts down by one.
    expect(cast(staged, before, 'ember', { red: 1 })).toEqual({ bowl: [1], spells: { steam: [3, 0] } });
  });

  it('moves a chip the engine spent from under another spell to a free chip of the same color', () => {
    const before: Color[] = ['red', 'red', 'blue'];
    // Inferno-to-be holds chip 0; Ember holds chip 1. Casting Ember spends chip 0 (the first red).
    const staged: Staging = { bowl: [], spells: { inferno: [0], ember: [1] } };
    const after = cast(staged, before, 'ember', { red: 1 });
    expect(after).toEqual({ bowl: [], spells: { inferno: [0] } });
    expect(['red', 'blue'][after.spells.inferno![0]!]).toBe('red');
  });

  it('drops a chip whose color is gone', () => {
    const before: Color[] = ['red', 'blue'];
    const staged: Staging = { bowl: [], spells: { inferno: [0], steam: [1] } };
    // Casting something that costs the only red takes Inferno's chip with it.
    expect(cast(staged, before, 'steam', { red: 1, blue: 1 })).toEqual({ bowl: [], spells: {} });
  });

  it('after a Mix, empties the bowl and keeps spell slots; the new color is last in the pool', () => {
    const before: Color[] = ['green', 'red', 'blue', 'red'];
    const staged: Staging = { bowl: [1, 2], spells: { ember: [3] } };
    const mixed = mixColors(before, MIX_RECIPES, 'red', 'blue');
    if (!mixed.ok) throw new Error('mix failed');
    expect(mixed.pool).toEqual(['green', 'red', 'purple']);
    // The engine spends the first red (index 1, the bowl's own) so Ember's red keeps going.
    expect(carryStaging(staged, before, { red: 1, blue: 1 }, mixed.pool, { kind: 'bowl' })).toEqual({
      bowl: [],
      spells: { ember: [1] },
    });
  });

  it('never stages two places on one chip', () => {
    const before: Color[] = ['red', 'red', 'red'];
    const staged: Staging = { bowl: [2], spells: { inferno: [0, 1] } };
    const after = cast(staged, before, 'inferno', { red: 2 });
    expect(after).toEqual({ bowl: [0], spells: {} });
    expect(stagedIndices(after).size).toBe(1);
  });
});
