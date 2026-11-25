import { canAfford, spendColors } from './pool';
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

/**
 * The fewest mixes (at most `maxMixes`) that would let the pool pay `cost`.
 * Returns [] when the pool can already pay, or null when no mix sequence helps.
 */
export function findMixPlan(
  pool: readonly Color[],
  cost: ColorCost,
  recipes: readonly MixRecipe[],
  maxMixes: number,
): MixRecipe[] | null {
  let frontier: { pool: readonly Color[]; plan: MixRecipe[] }[] = [{ pool, plan: [] }];
  for (let depth = 0; depth <= maxMixes; depth++) {
    const found = frontier.find((node) => canAfford(node.pool, cost));
    if (found) return found.plan;
    if (depth === maxMixes) break;
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const recipe of recipes) {
        const mixed = mixColors(node.pool, recipes, recipe.inputs[0], recipe.inputs[1]);
        if (mixed.ok) next.push({ pool: mixed.pool, plan: [...node.plan, recipe] });
      }
    }
    frontier = next;
  }
  return null;
}
