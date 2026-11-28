import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultRunConfig, runConfigFor } from '../data/run';
import { BASE_COLORS } from '../data/colors';
import { META_KEY } from './metaSave';
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
import { botAction } from '../engine/testBot';
import { clearRun, loadRun, OLD_SAVE_KEYS, parseSave, replayRun, SAVE_KEY, saveCharacter, saveRun, type RunSave } from './runSave';

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
  const repaint = { dieIndex: 0, faceIndex: Math.floor(rng() * 6), color: pick(BASE_COLORS, rng) };
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

        if (actions.length % 10 === 0) {
          const replayed = replayRun({ version: 6, seed, seeded: false, actions: [...actions] }, config);
          expect(replayed?.run).toEqual(run);
          replays++;
        }
      }
      const final = replayRun({ version: 6, seed, seeded: false, actions }, config);
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

  it("recovers the current fight's latest roll, so a restored battle shows the dice as rolled", () => {
    const rng = createSeededRng(5);
    const started = createRun(config, rng);
    let run = started.state;
    let roll = started.events.find((e) => e.type === 'rolled');
    expect(roll).toBeDefined();
    const actions: RunAction[] = [];
    expect(replayRun({ version: 6, seed: 5, seeded: false, actions }, config)?.lastRoll).toEqual(roll);

    // End a turn (a new roll), then cast a spell (no roll): the roll from the end of turn is kept.
    const endTurn: RunAction = { type: 'battle', action: { type: 'endTurn' } };
    const ended = applyRunAction(run, endTurn, config, rng);
    if (!ended.ok) throw new Error(ended.error);
    run = ended.state;
    actions.push(endTurn);
    roll = ended.events.find((e) => e.type === 'rolled');
    expect(roll).toBeDefined();
    const spell = config.battle.attacks.find((a) =>
      Object.entries(a.cost).every(([color, n]) => run.battle!.pool.filter((c) => c === color).length >= (n ?? 0)),
    );
    expect(spell).toBeDefined();
    if (spell) {
      const cast: RunAction = { type: 'battle', action: { type: 'trigger', attackId: spell.id, target: 0 } };
      const result = applyRunAction(run, cast, config, rng);
      if (!result.ok) throw new Error(result.error);
      expect(result.events.some((e) => e.type === 'rolled')).toBe(false);
      actions.push(cast);
    }
    expect(replayRun({ version: 6, seed: 5, seeded: false, actions }, config)?.lastRoll).toEqual(roll);
  });

  it('has no roll outside a battle', () => {
    const rng = createSeededRng(1);
    let run = createRun(config, rng).state;
    const actions: RunAction[] = [];
    while (run.phase === 'battle') {
      const action = botAction(run, config);
      run = applyRunAction(run, action, config, rng).state;
      actions.push(action);
    }
    expect(run.phase).toBe('reward');
    expect(replayRun({ version: 6, seed: 1, seeded: false, actions }, config)?.lastRoll).toBeNull();
  });

  it("replays a character run with that character's dice and HP", () => {
    const cfg = runConfigFor('tank');
    const rng = createSeededRng(11);
    let run = createRun(cfg, rng).state;
    const actions: RunAction[] = [];
    for (let i = 0; i < 60 && run.phase !== 'victory' && run.phase !== 'defeat'; i++) {
      const action = botAction(run, cfg);
      const result = applyRunAction(run, action, cfg, rng);
      if (!result.ok) throw new Error(result.error);
      run = result.state;
      actions.push(action);
    }
    const save: RunSave = { version: 6, seed: 11, seeded: false, characterId: 'tank', actions };
    const replayed = replayRun(save, runConfigFor(saveCharacter(save)));
    expect(replayed?.run).toEqual(run);
    expect(replayed?.run.maxHp).toBe(42);
  });

  it('treats a save without a character as the Apprentice', () => {
    const save: RunSave = { version: 6, seed: 3, seeded: false, actions: [] };
    expect(saveCharacter(save)).toBe('apprentice');
    expect(replayRun(save, runConfigFor(saveCharacter(save)))?.run).toEqual(createRun(config, createSeededRng(3)).state);
  });

  it('returns null when a saved action no longer applies', () => {
    const save: RunSave = { version: 6, seed: 5, seeded: false, actions: [{ type: 'leaveShop' }] };
    expect(replayRun(save, config)).toBeNull();
  });
});

describe('parseSave', () => {
  const good: RunSave = { version: 6, seed: 42, seeded: true, actions: [{ type: 'battle', action: { type: 'endTurn' } }] };

  it('reads back a saved run, with or without its character', () => {
    expect(parseSave(JSON.stringify(good))).toEqual(good);
    const healer: RunSave = { ...good, characterId: 'healer' };
    expect(parseSave(JSON.stringify(healer))).toEqual(healer);
  });

  it('rejects missing, corrupt, outdated, and malformed saves', () => {
    const bad = [
      null,
      '',
      '{not json',
      'null',
      '42',
      JSON.stringify({ ...good, version: 1 }),
      // A v2-format save under the new key (old shop dice, so it would replay differently).
      JSON.stringify({ ...good, version: 2 }),
      // A v3 save (before spell upgrades): reward and shop draws changed, so it would replay differently.
      JSON.stringify({ ...good, version: 3 }),
      // A v4 save (before Miasma's Block and the Hush rule): it could replay differently.
      JSON.stringify({ ...good, version: 4 }),
      // A v5 save (before the Gold spells joined the upgrade draws): its draws would differ.
      JSON.stringify({ ...good, version: 5 }),
      JSON.stringify({ ...good, seed: -1 }),
      JSON.stringify({ ...good, seed: 1.5 }),
      JSON.stringify({ ...good, seed: '42' }),
      JSON.stringify({ ...good, seeded: 'yes' }),
      JSON.stringify({ ...good, actions: 'none' }),
      JSON.stringify({ ...good, actions: [{ type: 'cheat' }] }),
      JSON.stringify({ ...good, actions: [null] }),
      // A character this version doesn't know would start with the wrong dice.
      JSON.stringify({ ...good, characterId: 'wizard' }),
      JSON.stringify({ ...good, characterId: 7 }),
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
    const save: RunSave = { version: 6, seed: 7, seeded: false, actions: [] };
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

  it('keeps Essence and unlocks when dropping an old run save', () => {
    const items = stubStorage();
    items.set('spill.run.v5', '{"version":5,"seed":3,"seeded":false,"actions":[]}');
    items.set(META_KEY, '{"essence":1250}');
    expect(OLD_SAVE_KEYS).toContain('spill.run.v5');
    expect(loadRun()).toBeNull();
    expect(items.has('spill.run.v5')).toBe(false);
    expect(items.get(META_KEY)).toBe('{"essence":1250}');
  });

  it('ignores a corrupted save', () => {
    stubStorage().set(SAVE_KEY, '{"version":6,"seed":');
    expect(loadRun()).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: fail, setItem: fail, removeItem: fail });
    expect(() => saveRun({ version: 6, seed: 1, seeded: false, actions: [] })).not.toThrow();
    expect(loadRun()).toBeNull();
    expect(() => clearRun()).not.toThrow();
  });
});
