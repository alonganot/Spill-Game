import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultRunConfig } from '../data/run';
import {
  applyRunAction,
  createRun,
  createSeededRng,
  findRecipe,
  type BattleAction,
  type Rng,
  type RunAction,
  type RunState,
} from '../engine';
import { clearRun, loadRun, OLD_SAVE_KEYS, parseSave, replayRun, SAVE_KEY, saveRun, type RunSave } from './runSave';

const config = defaultRunConfig();

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

/** A spread of actions for the current phase: mostly sensible, some that will fail. */
function candidateActions(run: RunState, rng: Rng): RunAction[] {
  const battle: BattleAction[] = [{ type: 'endTurn' }];
  if (run.battle) {
    const { pool } = run.battle;
    for (const attack of config.battle.attacks) battle.push({ type: 'trigger', attackId: attack.id });
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const [a, b] = [pool[i]!, pool[j]!];
        if (findRecipe(config.battle.recipes, a, b)) battle.push({ type: 'mix', colors: [a, b] });
      }
    }
  }
  const repaint = { dieIndex: 0, faceIndex: Math.floor(rng() * 6), color: pick(['red', 'blue', 'green'] as const, rng) };
  return [
    ...battle.map((action): RunAction => ({ type: 'battle', action })),
    { type: 'continue' },
    { type: 'chooseReward', index: Math.floor(rng() * 3), repaint },
    { type: 'buyDie', offerIndex: Math.floor(rng() * 2) },
    { type: 'repaint', target: repaint },
    { type: 'buyHeal' },
    { type: 'buyCapUpgrade' },
    { type: 'leaveShop' },
  ];
}

describe('replayRun', () => {
  it('rebuilds exactly the live run from its seed and successful actions', () => {
    let replays = 0;
    const phasesSeen = new Set<string>();
    let furthestStage = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createSeededRng(seed);
      // A separate rng chooses actions, so it never disturbs the game's rolls.
      const chooser = createSeededRng(seed * 7919);
      let run = createRun(config, rng).state;
      const actions: RunAction[] = [];

      for (let n = 0; n < 400 && run.phase !== 'victory' && run.phase !== 'defeat'; n++) {
        const action = pick(candidateActions(run, chooser), chooser);
        const result = applyRunAction(run, action, config, rng);
        // Failed actions are rejected before any roll, so they are never saved.
        if (!result.ok) continue;
        run = result.state;
        actions.push(action);
        phasesSeen.add(run.phase);
        furthestStage = Math.max(furthestStage, run.stageIndex);

        if (n % 25 === 0) {
          const replayed = replayRun({ version: 2, seed, seeded: false, actions: [...actions] }, config);
          expect(replayed?.run).toEqual(run);
          replays++;
        }
      }
      const final = replayRun({ version: 2, seed, seeded: false, actions }, config);
      expect(final?.run).toEqual(run);
      // The replayed rng carries on exactly where the live one is.
      expect(final?.rng()).toBe(rng());
    }
    expect(replays).toBeGreaterThan(50);
    // The random play gets far enough to cover rewards and the shop, not just fight 1.
    expect(phasesSeen).toContain('reward');
    expect(phasesSeen).toContain('shop');
    expect(furthestStage).toBeGreaterThanOrEqual(2);
  });

  it('returns null when a saved action no longer applies', () => {
    const save: RunSave = { version: 2, seed: 5, seeded: false, actions: [{ type: 'leaveShop' }] };
    expect(replayRun(save, config)).toBeNull();
  });
});

describe('parseSave', () => {
  const good: RunSave = { version: 2, seed: 42, seeded: true, actions: [{ type: 'battle', action: { type: 'endTurn' } }] };

  it('reads back a saved run', () => {
    expect(parseSave(JSON.stringify(good))).toEqual(good);
  });

  it('rejects missing, corrupt, outdated, and malformed saves', () => {
    const bad = [
      null,
      '',
      '{not json',
      'null',
      '42',
      JSON.stringify({ ...good, version: 1 }),
      JSON.stringify({ ...good, seed: -1 }),
      JSON.stringify({ ...good, seed: 1.5 }),
      JSON.stringify({ ...good, seed: '42' }),
      JSON.stringify({ ...good, seeded: 'yes' }),
      JSON.stringify({ ...good, actions: 'none' }),
      JSON.stringify({ ...good, actions: [{ type: 'cheat' }] }),
      JSON.stringify({ ...good, actions: [null] }),
    ];
    for (const text of bad) expect(parseSave(text), String(text)).toBeNull();
  });
});

describe('save storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStorage() {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    });
    return items;
  }

  it('saves, loads, and clears a run', () => {
    const items = stubStorage();
    const save: RunSave = { version: 2, seed: 7, seeded: false, actions: [] };
    saveRun(save);
    expect(items.has(SAVE_KEY)).toBe(true);
    expect(loadRun()).toEqual(save);
    clearRun();
    expect(loadRun()).toBeNull();
  });

  it('deletes saves from earlier versions when loading', () => {
    const items = stubStorage();
    for (const key of OLD_SAVE_KEYS) items.set(key, '{"version":1,"seed":3,"seeded":false,"actions":[]}');
    expect(loadRun()).toBeNull();
    for (const key of OLD_SAVE_KEYS) expect(items.has(key)).toBe(false);
  });

  it('ignores a corrupted save', () => {
    stubStorage().set(SAVE_KEY, '{"version":2,"seed":');
    expect(loadRun()).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: fail, setItem: fail, removeItem: fail });
    expect(() => saveRun({ version: 2, seed: 1, seeded: false, actions: [] })).not.toThrow();
    expect(loadRun()).toBeNull();
    expect(() => clearRun()).not.toThrow();
  });
});
