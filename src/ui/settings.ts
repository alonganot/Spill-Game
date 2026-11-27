import { useSyncExternalStore } from 'react';

/** Player preferences, kept across runs and reloads (not part of a run's save). */
export interface Settings {
  /** Cast a spell as soon as its slots are full, instead of showing a Cast button. */
  autoCast: boolean;
}

export const SETTINGS_KEY = 'spill.settings.v1';
export const DEFAULT_SETTINGS: Settings = { autoCast: false };

/** Settings read back from storage; anything missing or malformed falls back to the default. */
export function parseSettings(text: string | null): Settings {
  if (text === null) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(text);
    if (typeof data !== 'object' || data === null) return DEFAULT_SETTINGS;
    const { autoCast } = data as Record<string, unknown>;
    return { autoCast: typeof autoCast === 'boolean' ? autoCast : DEFAULT_SETTINGS.autoCast };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Storage access can throw (private mode, blocked site data); settings then
// just last until the page closes.
function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current: Settings | null = null;
const listeners = new Set<() => void>();

function snapshot(): Settings {
  current ??= load();
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Changes some settings, saves them, and updates every screen using them. */
export function updateSettings(change: Partial<Settings>): void {
  current = { ...snapshot(), ...change };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Ignore: the change still applies until the page closes.
  }
  for (const listener of listeners) listener();
}

/** The current settings; re-renders when they change (e.g. from Settings opened mid-fight). */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_SETTINGS);
}
