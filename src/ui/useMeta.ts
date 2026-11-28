import { useSyncExternalStore } from 'react';
import { DEFAULT_META, loadMeta, META_KEY, parseMeta, saveMeta, type MetaSave } from './metaSave';

// One shared copy of the meta progress, like the settings store: the run hook
// pays Essence into it and every screen showing the balance updates. Another
// tab's changes come in through `storage` events, and every change starts from
// storage, so two open tabs never write over each other's Essence or unlocks.

let current: MetaSave | null = null;
const listeners = new Set<() => void>();

/** The meta progress now (loaded on first use). */
export function getMeta(): MetaSave {
  current ??= loadMeta();
  return current;
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Picks up progress saved by another tab of the game. */
function onStorage(e: StorageEvent): void {
  // `key` is null when another tab cleared all of storage.
  if (e.key !== META_KEY && e.key !== null) return;
  current = e.key === null ? loadMeta() : parseMeta(e.newValue);
  notify();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/**
 * Applies a change, saves it, and updates every screen using it. The change
 * starts from what's in storage now (another tab may have saved since). A
 * change returning the same object does nothing.
 */
export function changeMeta(change: (meta: MetaSave) => MetaSave): void {
  const before = loadFresh();
  const next = change(before);
  if (next === before) return;
  current = next;
  saveMeta(next);
  notify();
}

/** Storage's copy, or the one in memory when storage can't be read (it then never changes behind our back). */
function loadFresh(): MetaSave {
  let stored: string | null;
  try {
    stored = localStorage.getItem(META_KEY);
  } catch {
    return getMeta();
  }
  current = stored === null ? (current ?? DEFAULT_META) : parseMeta(stored);
  return current;
}

/** The current meta progress; re-renders when it changes. */
export function useMeta(): MetaSave {
  return useSyncExternalStore(subscribe, getMeta, () => DEFAULT_META);
}

/** For tests: forget the loaded copy, so the next read goes back to storage. */
export function resetMetaStore(): void {
  current = null;
}
