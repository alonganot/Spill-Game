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

/**
 * Keeps what's staged after a Cast or Mix changes the pool, instead of
 * clearing it. `used` is what was just spent (the cast spell, or the bowl),
 * so its own staging goes; everything else follows its chips to their new
 * indices in `after`. The engine spends the first chips of each color in the
 * pool (`spendColors`), which may be chips staged elsewhere: those move to
 * another free chip of the same color, or drop if none is left.
 */
export function carryStaging(
  staging: Staging,
  before: readonly Color[],
  spent: ColorCost,
  after: readonly Color[],
  used: StageTarget,
): Staging {
  // Old index -> new index, for chips the engine keeps (in order, mixes append after them).
  const left = new Map(Object.entries(spent) as [Color, number][]);
  const moved: (number | undefined)[] = [];
  let next = 0;
  for (const color of before) {
    const n = left.get(color) ?? 0;
    if (n > 0) {
      left.set(color, n - 1);
      moved.push(undefined);
    } else {
      moved.push(next++);
    }
  }

  const groups: [StageTarget, readonly number[]][] = [
    [{ kind: 'bowl' }, used.kind === 'bowl' ? [] : staging.bowl],
    ...Object.entries(staging.spells)
      .filter(([id]) => !(used.kind === 'spell' && used.attackId === id))
      .map(([attackId, chips]): [StageTarget, readonly number[]] => [{ kind: 'spell', attackId }, chips]),
  ];

  // First every chip that survived keeps its place; then lost chips take a free chip of their color.
  const taken = new Set<number>();
  const kept = groups.map(([, chips]) =>
    chips.map((chip) => {
      const to = moved[chip];
      if (to === undefined || after[to] !== before[chip]) return undefined;
      taken.add(to);
      return to;
    }),
  );
  const carried: { bowl: number[]; spells: Record<string, number[]> } = { bowl: [], spells: {} };
  groups.forEach(([target, chips], g) => {
    const placed = kept[g]!.flatMap((to, i) => {
      if (to !== undefined) return [to];
      const free = after.findIndex((c, j) => c === before[chips[i]!] && !taken.has(j));
      if (free < 0) return [];
      taken.add(free);
      return [free];
    });
    if (target.kind === 'bowl') carried.bowl = placed;
    else if (placed.length > 0) carried.spells[target.attackId] = placed;
  });
  return carried;
}
