import { spendColors } from './pool';
import type { Color, ColorCost, MixRecipe } from './types';

/** Finds the recipe for two colors, regardless of order. */
export function findRecipe(recipes: readonly MixRecipe[], a: Color, b: Color): MixRecipe | undefined {
  return recipes.find(
    ({ inputs: [x, y] }) => (x === a && y === b) || (x === b && y === a),
  );
}

export type MixResult =
  | { ok: true; pool: Color[]; output: Color }
  | { ok: false; error: 'no_recipe' | 'missing_colors' };

/** Consumes both inputs from the pool and adds the mixed color. */
export function mixColors(
  pool: readonly Color[],
  recipes: readonly MixRecipe[],
  a: Color,
  b: Color,
): MixResult {
  const recipe = findRecipe(recipes, a, b);
  if (!recipe) return { ok: false, error: 'no_recipe' };
  const cost: ColorCost = a === b ? { [a]: 2 } : { [a]: 1, [b]: 1 };
  const spent = spendColors(pool, cost);
  if (!spent) return { ok: false, error: 'missing_colors' };
  return { ok: true, pool: [...spent, recipe.output], output: recipe.output };
}
