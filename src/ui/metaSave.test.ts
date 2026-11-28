import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_META,
  GRANTED_RUNS_KEPT,
  grantEssence,
  loadMeta,
  META_KEY,
  parseMeta,
  saveMeta,
  selectCharacter,
  unlockCharacter,
  type MetaSave,
} from './metaSave';
import { changeMeta, getMeta, resetMetaStore } from './useMeta';

const rich: MetaSave = { ...DEFAULT_META, essence: 2600 };

describe('parseMeta', () => {
  it('reads back saved progress', () => {
    const meta: MetaSave = { version: 1, essence: 120, unlocked: ['apprentice', 'tank'], selected: 'tank', grantedRuns: ['1:2:3'] };
    expect(parseMeta(JSON.stringify(meta))).toEqual(meta);
  });

  it('falls back to the default for missing, corrupt, or other-version data', () => {
    for (const text of [null, '', '{oops', 'null', '7', '[]', JSON.stringify({ ...rich, version: 2 })]) {
      expect(parseMeta(text), String(text)).toEqual(DEFAULT_META);
    }
  });

  it('repairs bad fields one by one, keeping the good ones', () => {
    const parsed = parseMeta(
      JSON.stringify({ version: 1, essence: -5, unlocked: ['tank', 'wizard', 3], selected: 'healer', grantedRuns: ['a', 4] }),
    );
    expect(parsed).toEqual({ version: 1, essence: 0, unlocked: ['apprentice', 'tank'], selected: 'apprentice', grantedRuns: ['a'] });
    expect(parseMeta(JSON.stringify({ version: 1, essence: 1.5, unlocked: 'all' })).essence).toBe(0);
    expect(parseMeta(JSON.stringify({ version: 1, essence: 40 }))).toEqual({ ...DEFAULT_META, essence: 40 });
  });

  it('always has the Apprentice unlocked, once', () => {
    expect(parseMeta(JSON.stringify({ version: 1, unlocked: [] })).unlocked).toEqual(['apprentice']);
    expect(parseMeta(JSON.stringify({ version: 1, unlocked: ['apprentice', 'apprentice'] })).unlocked).toEqual(['apprentice']);
  });
});

describe('unlocking and selecting', () => {
  it('spends the cost, unlocks, and selects the character', () => {
    expect(unlockCharacter(rich, 'warrior')).toEqual({ ...rich, essence: 2100, unlocked: ['apprentice', 'warrior'], selected: 'warrior' });
    expect(unlockCharacter(rich, 'demon')).toMatchObject({ essence: 600, selected: 'demon' });
  });

  it("can't unlock twice, or without enough Essence", () => {
    const once = unlockCharacter(rich, 'venom')!;
    expect(unlockCharacter(once, 'venom')).toBeNull();
    expect(unlockCharacter({ ...DEFAULT_META, essence: 499 }, 'venom')).toBeNull();
    expect(unlockCharacter({ ...DEFAULT_META, essence: 500 }, 'venom')).toMatchObject({ essence: 0 });
    expect(unlockCharacter({ ...DEFAULT_META, essence: 1999 }, 'healer')).toBeNull();
    expect(unlockCharacter(DEFAULT_META, 'apprentice')).toBeNull();
  });

  it('selects only unlocked characters', () => {
    expect(selectCharacter(DEFAULT_META, 'tank')).toBe(DEFAULT_META);
    const withTank = unlockCharacter(rich, 'tank')!;
    expect(selectCharacter(withTank, 'apprentice').selected).toBe('apprentice');
  });
});

describe('grantEssence', () => {
  it('pays a run once', () => {
    const paid = grantEssence(DEFAULT_META, 'run-1', 87);
    expect(paid).toMatchObject({ essence: 87, grantedRuns: ['run-1'] });
    expect(grantEssence(paid, 'run-1', 87)).toBe(paid);
    expect(grantEssence(paid, 'run-2', 25).essence).toBe(112);
  });

  it('remembers only the latest run keys', () => {
    let meta = DEFAULT_META;
    for (let i = 0; i < GRANTED_RUNS_KEPT + 5; i++) meta = grantEssence(meta, `run-${i}`, 1);
    expect(meta.grantedRuns).toHaveLength(GRANTED_RUNS_KEPT);
    expect(meta.grantedRuns.at(-1)).toBe(`run-${GRANTED_RUNS_KEPT + 4}`);
    expect(meta.essence).toBe(GRANTED_RUNS_KEPT + 5);
  });
});

describe('meta storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetMetaStore();
  });

  function stubStorage() {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    });
    return items;
  }

  it('saves and loads progress under its own key', () => {
    const items = stubStorage();
    saveMeta(rich);
    expect(items.has(META_KEY)).toBe(true);
    expect(loadMeta()).toEqual(rich);
  });

  it('the shared store saves each change and ignores no-op changes', () => {
    const items = stubStorage();
    resetMetaStore();
    expect(getMeta()).toEqual(DEFAULT_META);
    changeMeta((m) => grantEssence(m, 'k', 30));
    expect(parseMeta(items.get(META_KEY) ?? null).essence).toBe(30);
    items.delete(META_KEY);
    changeMeta((m) => grantEssence(m, 'k', 30));
    expect(items.has(META_KEY)).toBe(false);
    expect(getMeta().essence).toBe(30);
  });

  it("a change starts from storage, so another tab's progress isn't overwritten", () => {
    const items = stubStorage();
    resetMetaStore();
    items.set(META_KEY, JSON.stringify({ ...DEFAULT_META, essence: 600 }));
    expect(getMeta().essence).toBe(600);
    // Another tab finishes a run and saves 640.
    items.set(META_KEY, JSON.stringify({ ...DEFAULT_META, essence: 640, grantedRuns: ['other-tab'] }));
    changeMeta((m) => unlockCharacter(m, 'warrior') ?? m);
    const saved = parseMeta(items.get(META_KEY) ?? null);
    expect(saved).toMatchObject({ essence: 140, unlocked: ['apprentice', 'warrior'], grantedRuns: ['other-tab'] });
    expect(getMeta()).toEqual(saved);
  });

  it('never throws when storage is unavailable', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: fail, setItem: fail, removeItem: fail });
    expect(loadMeta()).toEqual(DEFAULT_META);
    expect(() => saveMeta(rich)).not.toThrow();
    resetMetaStore();
    expect(() => changeMeta((m) => ({ ...m, essence: 5 }))).not.toThrow();
    expect(getMeta().essence).toBe(5);
  });
});
