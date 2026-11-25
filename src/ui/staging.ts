import { findRecipe, type Color, type ColorCost, type MixRecipe } from '../engine';

/**
 * Colors the player has dragged out of the pool, but not yet used: into the
 * mixing bowl, or onto a spell's cost slots. UI-only; nothing reaches the
 * engine until Mix or Cast. Values are pool indices, each used at most once.
 */
export interface Staging {
  bowl: readonly number[];
  spells: Readonly<Record<string, readonly number[]>>;
}

/** Where a chip can go. */
export type StageTarget = { kind: 'bowl' } | { kind: 'spell'; attackId: string };

export type PlaceResult = { ok: true; staging: Staging } | { ok: false; reason: 'full' | 'not-needed' | 'unknown' };

export const EMPTY_STAGING: Staging = { bowl: [], spells: {} };

export const BOWL_SIZE = 2;

/** One color per cost unit, in a stable order: the slots a spell card shows. */
export function costSlots(cost: ColorCost): Color[] {
  const slots: Color[] = [];
  for (const [color, n] of Object.entries(cost) as [Color, number][]) {
    for (let i = 0; i < n; i++) slots.push(color);
  }
  return slots;
}

/** Every pool index currently staged somewhere. */
export function stagedIndices(staging: Staging): Set<number> {
  return new Set([...staging.bowl, ...Object.values(staging.spells).flat()]);
}

/** The chip's index taken out of wherever it's staged. */
export function remove(staging: Staging, chipIndex: number): Staging {
  const spells: Record<string, readonly number[]> = {};
  for (const [id, chips] of Object.entries(staging.spells)) {
    const left = chips.filter((c) => c !== chipIndex);
    if (left.length > 0) spells[id] = left;
  }
  return { bowl: staging.bowl.filter((c) => c !== chipIndex), spells };
}

/** Colors a spell still needs, after the chips already staged on it. */
export function missingColors(cost: ColorCost, staged: readonly Color[]): Color[] {
  const missing = costSlots(cost);
  for (const color of staged) {
    const at = missing.indexOf(color);
    if (at >= 0) missing.splice(at, 1);
  }
  return missing;
}

/**
 * Puts a pool chip into the bowl or onto a spell. A chip already staged
 * elsewhere moves. A spell only takes colors its cost still needs.
 */
export function place(
  staging: Staging,
  chipIndex: number,
  target: StageTarget,
  pool: readonly Color[],
  costs: Readonly<Record<string, ColorCost>>,
): PlaceResult {
  const color = pool[chipIndex];
  if (color === undefined) return { ok: false, reason: 'unknown' };
  const without = remove(staging, chipIndex);

  if (target.kind === 'bowl') {
    if (without.bowl.length >= BOWL_SIZE) return { ok: false, reason: 'full' };
    return { ok: true, staging: { ...without, bowl: [...without.bowl, chipIndex] } };
  }

  const cost = costs[target.attackId];
  if (!cost) return { ok: false, reason: 'unknown' };
  const current = without.spells[target.attackId] ?? [];
  const needed = missingColors(
    cost,
    current.map((i) => pool[i]!),
  );
  if (!needed.includes(color)) return { ok: false, reason: needed.length === 0 ? 'full' : 'not-needed' };
  return { ok: true, staging: { ...without, spells: { ...without.spells, [target.attackId]: [...current, chipIndex] } } };
}

/** What the bowl would make: nothing yet, a recipe, or two colors that don't mix. */
export function bowlResult(
  staging: Staging,
  pool: readonly Color[],
  recipes: readonly MixRecipe[],
): { kind: 'waiting' } | { kind: 'mix'; inputs: [Color, Color]; recipe: MixRecipe } | { kind: 'no-mix' } {
  const [a, b] = staging.bowl.map((i) => pool[i]);
  if (a === undefined || b === undefined) return { kind: 'waiting' };
  const recipe = findRecipe(recipes, a, b);
  return recipe ? { kind: 'mix', inputs: [a, b], recipe } : { kind: 'no-mix' };
}

/** True once a spell's slots are all filled. */
export function spellReady(staging: Staging, attackId: string, cost: ColorCost, pool: readonly Color[]): boolean {
  const staged = (staging.spells[attackId] ?? []).map((i) => pool[i]!);
  return staged.length > 0 && missingColors(cost, staged).length === 0;
}

/** Drops anything that no longer points at a chip in `pool` (e.g. after the pool changed). */
export function prune(staging: Staging, pool: readonly Color[]): Staging {
  const valid = (i: number) => i >= 0 && i < pool.length;
  const spells: Record<string, readonly number[]> = {};
  for (const [id, chips] of Object.entries(staging.spells)) {
    const kept = chips.filter(valid);
    if (kept.length > 0) spells[id] = kept;
  }
  return { bowl: staging.bowl.filter(valid), spells };
}
