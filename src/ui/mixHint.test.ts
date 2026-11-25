import { describe, expect, it } from 'vitest';
import { MIX_RECIPES } from '../data/colors';
import { findMixPlan } from '../engine';
import { chipsForPlan } from './mixHint';

describe('chipsForPlan', () => {
  it('points at the two chips one mix would use', () => {
    const pool = ['green', 'red', 'green', 'blue'] as const;
    const plan = findMixPlan(pool, { purple: 1 }, MIX_RECIPES)!;
    expect(chipsForPlan(pool, plan)).toEqual([1, 3]);
  });

  it('uses a different chip for each input across several mixes', () => {
    const pool = ['red', 'blue', 'red', 'blue'] as const;
    const plan = findMixPlan(pool, { purple: 2 }, MIX_RECIPES)!;
    expect(chipsForPlan(pool, plan)).toEqual([0, 1, 2, 3]);
  });

  it('is empty for a plan with no mixes', () => {
    expect(chipsForPlan(['red'], [])).toEqual([]);
  });
});
