import { CHARACTERS, DEFAULT_CHARACTER, isCharacterId, type CharacterId } from '../data/characters';

/**
 * Progress kept between runs (RULES.md §4, Characters & Essence): the Essence
 * balance, unlocked characters, the one picked for the next run, and the runs
 * that already paid out. Separate from the run save, so dropping one never
 * touches the other.
 */
export interface MetaSave {
  version: 1;
  essence: number;
  /** Always includes the starter. */
  unlocked: CharacterId[];
  /** Always unlocked. */
  selected: CharacterId;
  /** Keys of the finished runs that already paid Essence, newest last. */
  grantedRuns: string[];
}

export const META_KEY = 'spill.meta.v1';
/** How many paid-out run keys to remember; a key only has to outlive its own run end. */
export const GRANTED_RUNS_KEPT = 50;

export const DEFAULT_META: MetaSave = {
  version: 1,
  essence: 0,
  unlocked: [DEFAULT_CHARACTER],
  selected: DEFAULT_CHARACTER,
  grantedRuns: [],
};

/**
 * Meta progress read back from storage. Anything unreadable falls back to the
 * default, field by field: a bad balance never costs the unlocks, and the
 * reverse.
 */
export function parseMeta(text: string | null): MetaSave {
  if (text === null) return DEFAULT_META;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return DEFAULT_META;
  }
  if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== 1) return DEFAULT_META;
  const { essence, unlocked, selected, grantedRuns } = data as Record<string, unknown>;
  const ids = new Set<CharacterId>([DEFAULT_CHARACTER]);
  if (Array.isArray(unlocked)) for (const id of unlocked) if (isCharacterId(id)) ids.add(id);
  return {
    version: 1,
    essence: typeof essence === 'number' && Number.isSafeInteger(essence) && essence >= 0 ? essence : 0,
    unlocked: [...ids],
    selected: isCharacterId(selected) && ids.has(selected) ? selected : DEFAULT_CHARACTER,
    grantedRuns: Array.isArray(grantedRuns)
      ? grantedRuns.filter((k): k is string => typeof k === 'string').slice(-GRANTED_RUNS_KEPT)
      : [],
  };
}

export function isUnlocked(meta: MetaSave, id: CharacterId): boolean {
  return meta.unlocked.includes(id);
}

/** Spends Essence to unlock a character and selects it; null if it's already unlocked or too expensive. */
export function unlockCharacter(meta: MetaSave, id: CharacterId): MetaSave | null {
  const cost = CHARACTERS[id].unlockCost;
  if (isUnlocked(meta, id) || meta.essence < cost) return null;
  return { ...meta, essence: meta.essence - cost, unlocked: [...meta.unlocked, id], selected: id };
}

/** Picks the character for the next run; unchanged if it's locked. */
export function selectCharacter(meta: MetaSave, id: CharacterId): MetaSave {
  return isUnlocked(meta, id) ? { ...meta, selected: id } : meta;
}

/** Pays a finished run's Essence once: a run key that already paid changes nothing. */
export function grantEssence(meta: MetaSave, runKey: string, amount: number): MetaSave {
  if (meta.grantedRuns.includes(runKey)) return meta;
  return {
    ...meta,
    essence: meta.essence + Math.max(0, Math.floor(amount)),
    grantedRuns: [...meta.grantedRuns, runKey].slice(-GRANTED_RUNS_KEPT),
  };
}

// Storage access can throw (private mode, blocked site data, full quota);
// progress then lasts until the page closes.

export function loadMeta(): MetaSave {
  try {
    return parseMeta(localStorage.getItem(META_KEY));
  } catch {
    return DEFAULT_META;
  }
}

export function saveMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore.
  }
}
