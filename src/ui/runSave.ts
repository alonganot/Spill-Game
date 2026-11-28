import { DEFAULT_CHARACTER, isCharacterId, type CharacterId } from '../data/characters';
import {
  applyRunAction,
  type BattleEvent,
  createRun,
  createSeededRng,
  type Rng,
  type RunAction,
  type RunConfig,
  type RunState,
} from '../engine';

/**
 * A run in progress, saved as its seed plus every action that succeeded.
 * The engine is deterministic, so replaying the actions rebuilds the run
 * exactly, random rolls included.
 */
export interface RunSave {
  version: 5;
  seed: number;
  seeded: boolean;
  /** The character the run started as; a save without one plays as the Apprentice. */
  characterId?: CharacterId;
  actions: RunAction[];
}

/** The character a saved run plays as. */
export function saveCharacter(save: RunSave): CharacterId {
  return save.characterId ?? DEFAULT_CHARACTER;
}

// v5 (Milestone 10): Miasma gained Block and Hush can't target an immune enemy,
// so a v4 save could replay differently or fail partway; v4 saves are dropped.
export const SAVE_KEY = 'spill.run.v5';
/** Saves from earlier versions, which can't be replayed by this engine. */
export const OLD_SAVE_KEYS = ['spill.run.v1', 'spill.run.v2', 'spill.run.v3', 'spill.run.v4'] as const;

const ACTION_TYPES = new Set<RunAction['type']>([
  'battle',
  'continue',
  'chooseReward',
  'buyDie',
  'repaint',
  'buyHeal',
  'buyCapUpgrade',
  'buySpotlightUpgrade',
  'buyDraftUpgrade',
  'pickDraftUpgrade',
  'buyTargetedUpgrade',
  'leaveShop',
]);

function isAction(value: unknown): value is RunAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    ACTION_TYPES.has((value as { type?: unknown }).type as RunAction['type'])
  );
}

/** A save read back from storage, or null if it isn't one this version understands. */
export function parseSave(text: string | null): RunSave | null {
  if (text === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { version, seed, seeded, characterId, actions } = data as Record<string, unknown>;
  if (version !== 5) return null;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0) return null;
  if (typeof seeded !== 'boolean') return null;
  // A character this version doesn't know would start with the wrong dice, so it can't replay.
  if (characterId !== undefined && !isCharacterId(characterId)) return null;
  if (!Array.isArray(actions) || !actions.every(isAction)) return null;
  return characterId === undefined ? { version, seed, seeded, actions } : { version, seed, seeded, characterId, actions };
}

export type RolledEvent = Extract<BattleEvent, { type: 'rolled' }>;

export interface ReplayedRun {
  rng: Rng;
  run: RunState;
  /** The current fight's latest dice roll, so a restored battle can show the dice as rolled. */
  lastRoll: RolledEvent | null;
}

/** The roll among `events`, if any. */
export function findRoll(events: readonly BattleEvent[]): RolledEvent | null {
  return events.find((e): e is RolledEvent => e.type === 'rolled') ?? null;
}

/**
 * Rebuilds a saved run by replaying its actions on its seed, with the config
 * of the run's character (`runConfigFor(saveCharacter(save))`). Returns null
 * if any action no longer applies (for example after a balance change).
 */
export function replayRun(save: RunSave, config: RunConfig): ReplayedRun | null {
  try {
    const rng = createSeededRng(save.seed);
    const started = createRun(config, rng);
    let run = started.state;
    let lastRoll = findRoll(started.events);
    for (const action of save.actions) {
      const result = applyRunAction(run, action, config, rng);
      if (!result.ok) return null;
      run = result.state;
      lastRoll = run.battle ? (findRoll(result.events) ?? lastRoll) : null;
    }
    return { rng, run, lastRoll };
  } catch {
    // A malformed action can throw deep in the engine; treat it like a failed replay.
    return null;
  }
}

// Storage access can throw (private mode, blocked site data, full quota). Saving
// is a convenience, so every failure is swallowed and the game carries on.

export function saveRun(save: RunSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Ignore: the run just won't survive a reload.
  }
}

export function loadRun(): RunSave | null {
  try {
    for (const key of OLD_SAVE_KEYS) localStorage.removeItem(key);
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore.
  }
}
