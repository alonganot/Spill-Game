import { describe, expect, it } from 'vitest';
import { MIX_RECIPES } from '../data/colors';
import { findRecipe, mixColors } from './mixing';
import { addToPool, canAfford, spendColors } from './pool';

describe('addToPool', () => {
  it('appends rolled colors to the existing pool', () => {
    expect(addToPool(['red'], ['blue', 'green'], 5)).toEqual({ pool: ['red', 'blue', 'green'], discarded: [] });
  });

  it('discards colors beyond the max pool size', () => {
    expect(addToPool(['red', 'red'], ['blue', 'green', 'red'], 4)).toEqual({
      pool: ['red', 'red', 'blue', 'green'],
      discarded: ['red'],
    });
  });

  it('discards everything when the pool is already full', () => {
    expect(addToPool(['red', 'blue'], ['green'], 2)).toEqual({ pool: ['red', 'blue'], discarded: ['green'] });
  });
});

describe('spendColors', () => {
  it('removes exactly the cost and keeps the rest in order', () => {
    expect(spendColors(['red', 'blue', 'red', 'green'], { red: 1, green: 1 })).toEqual(['blue', 'red']);
  });

  it('handles stacked costs', () => {
    expect(spendColors(['red', 'red', 'red'], { red: 2 })).toEqual(['red']);
  });

  it('returns null and spends nothing when colors are missing', () => {
    expect(spendColors(['red'], { red: 2 })).toBeNull();
    expect(canAfford(['red', 'blue'], { red: 1, purple: 1 })).toBe(false);
  });

  it('treats an empty cost as free', () => {
    expect(spendColors(['red'], {})).toEqual(['red']);
  });
});

describe('mixing', () => {
  it.each([
    ['red', 'blue', 'purple'],
    ['blue', 'green', 'cyan'],
    ['red', 'green', 'orange'],
  ] as const)('%s + %s -> %s, in either order', (a, b, out) => {
    expect(findRecipe(MIX_RECIPES, a, b)?.output).toBe(out);
    expect(findRecipe(MIX_RECIPES, b, a)?.output).toBe(out);
  });

  it('consumes both inputs and adds the result', () => {
    expect(mixColors(['red', 'green', 'blue'], MIX_RECIPES, 'blue', 'red')).toEqual({
      ok: true,
      pool: ['green', 'purple'],
      output: 'purple',
    });
  });

  it('rejects pairs with no recipe', () => {
    expect(mixColors(['red', 'red'], MIX_RECIPES, 'red', 'red')).toEqual({ ok: false, error: 'no_recipe' });
    expect(mixColors(['purple', 'red'], MIX_RECIPES, 'purple', 'red')).toEqual({ ok: false, error: 'no_recipe' });
  });

  it('rejects a mix when an input is missing from the pool', () => {
    expect(mixColors(['red'], MIX_RECIPES, 'red', 'blue')).toEqual({ ok: false, error: 'missing_colors' });
  });
});
