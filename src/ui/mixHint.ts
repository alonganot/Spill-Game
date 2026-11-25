import type { Color, MixRecipe } from '../engine';

/**
 * Pool indices of the chips a mix plan would use, one distinct chip per recipe
 * input, in plan order. Inputs the pool can't supply are skipped.
 */
export function chipsForPlan(pool: readonly Color[], plan: readonly MixRecipe[]): number[] {
  const used: number[] = [];
  for (const recipe of plan) {
    for (const color of recipe.inputs) {
      const index = pool.findIndex((c, i) => c === color && !used.includes(i));
      if (index >= 0) used.push(index);
    }
  }
  return used;
}
