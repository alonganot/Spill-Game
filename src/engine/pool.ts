import type { Color, ColorCost } from './types';

/** Adds colors in order until the pool is full; the rest are discarded. */
export function addToPool(
  pool: readonly Color[],
  colors: readonly Color[],
  maxPoolSize: number,
): { pool: Color[]; discarded: Color[] } {
  const room = Math.max(0, maxPoolSize - pool.length);
  return {
    pool: [...pool, ...colors.slice(0, room)],
    discarded: colors.slice(room),
  };
}

export function countColor(pool: readonly Color[], color: Color): number {
  return pool.filter((c) => c === color).length;
}

export function canAfford(pool: readonly Color[], cost: ColorCost): boolean {
  return costEntries(cost).every(([color, n]) => countColor(pool, color) >= n);
}

/** Removes the cost from the pool. Returns null if the pool can't cover it. */
export function spendColors(pool: readonly Color[], cost: ColorCost): Color[] | null {
  if (!canAfford(pool, cost)) return null;
  const remaining = new Map(costEntries(cost));
  const result: Color[] = [];
  for (const color of pool) {
    const left = remaining.get(color) ?? 0;
    if (left > 0) remaining.set(color, left - 1);
    else result.push(color);
  }
  return result;
}

function costEntries(cost: ColorCost): [Color, number][] {
  return (Object.entries(cost) as [Color, number | undefined][])
    .filter((entry): entry is [Color, number] => (entry[1] ?? 0) > 0);
}
