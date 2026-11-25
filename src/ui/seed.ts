/** Random run seeds stay short enough to read out or type back in. */
const RANDOM_SEED_LIMIT = 1_000_000;
/** Typed seeds can be up to 9 digits. */
const MAX_SEED_DIGITS = 9;

export function randomSeed(): number {
  return Math.floor(Math.random() * RANDOM_SEED_LIMIT);
}

/** A typed seed as a number, or null unless it is 1–9 digits (spaces around it are fine). */
export function parseSeed(text: string): number | null {
  const trimmed = text.trim();
  if (!new RegExp(`^\\d{1,${MAX_SEED_DIGITS}}$`).test(trimmed)) return null;
  return Number(trimmed);
}

/** Copies a seed to the clipboard. Resolves false when the browser refuses. */
export async function copySeed(seed: number): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(String(seed));
    return true;
  } catch {
    return false;
  }
}
