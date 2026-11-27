import { describe, expect, it } from 'vitest';
import { MIX_HINT_MAX_MIXES } from '../data/balance';
import { MIX_RECIPES } from '../data/colors';
import { findMixPlan, mixCost } from './mixing';

const outputs = (plan: ReturnType<typeof findMixPlan>) => plan?.map((r) => r.output);

describe('findMixPlan', () => {
  it('needs no mixes when the pool can already pay', () => {
    expect(findMixPlan(['red', 'red'], { red: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES)).toEqual([]);
  });

  it('finds the single mix that makes a secondary color', () => {
    expect(outputs(findMixPlan(['red', 'blue'], { purple: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES))).toEqual(['purple']);
  });

  it('finds a three-mix plan for Prism', () => {
    const plan = findMixPlan(['red', 'red', 'blue', 'blue', 'green', 'green'], { purple: 1, cyan: 1, orange: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES);
    expect(outputs(plan)?.sort()).toEqual(['cyan', 'orange', 'purple']);
  });

  it('counts colors the mixes would use up', () => {
    // Mixing for purple uses the only red, so purple + red can't both be paid.
    expect(findMixPlan(['red', 'blue'], { purple: 1, red: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES)).toBeNull();
    expect(outputs(findMixPlan(['red', 'red', 'blue'], { purple: 1, red: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES))).toEqual(['purple']);
  });

  it('returns null when no mix sequence works, or it needs too many mixes', () => {
    expect(findMixPlan(['red', 'red'], { purple: 1 }, MIX_RECIPES, MIX_HINT_MAX_MIXES)).toBeNull();
    expect(findMixPlan(['red', 'blue', 'red', 'blue'], { purple: 2 }, MIX_RECIPES, 1)).toBeNull();
  });
});

describe('mixCost', () => {
  it('takes one of each color, or two of one color when both inputs match', () => {
    expect(mixCost('red', 'blue')).toEqual({ red: 1, blue: 1 });
    expect(mixCost('white', 'white')).toEqual({ white: 2 });
  });
});
