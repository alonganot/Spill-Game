import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { applyAction, createBattle, getEnemyIntent } from './battle';
import { createSeededRng } from './rng';
import { DUMMY, noopRng, patchEnemy, testConfig, withState } from './testUtils';
import type { BattleAction, BattleConfig, BattleState, EnemyIntent } from './types';

function start(config: BattleConfig = testConfig()): BattleState {
  return createBattle(config, noopRng).state;
}

function act(state: BattleState, action: BattleAction, config: BattleConfig = testConfig()) {
  const result = applyAction(state, action, config, noopRng);
  if (!result.ok) throw new Error(`Action failed: ${result.error}`);
  return result;
}

describe('createBattle', () => {
  it('starts on turn 1 with the first roll in the pool', () => {
    const { state, events } = createBattle(testConfig(), noopRng);
    expect(state).toMatchObject({ turn: 1, phase: 'player', pool: ['red', 'blue', 'green'] });
    expect(state.player).toMatchObject({ hp: 20, block: 0 });
    expect(state.enemies[0]).toMatchObject({ hp: 30, block: 0 });
    expect(events).toEqual([{ type: 'rolled', colors: ['red', 'blue', 'green'], discarded: [] }]);
  });

  it('can start the player below max HP (HP carried from earlier fights)', () => {
    const state = start(testConfig({ playerStartHp: 12 }));
    expect(state.player).toMatchObject({ hp: 12, maxHp: 20 });
  });

  it('never starts the player above max HP', () => {
    expect(start(testConfig({ playerStartHp: 99 })).player.hp).toBe(20);
  });

  it('never starts the player at 0 HP or below', () => {
    expect(start(testConfig({ playerStartHp: 0 })).player.hp).toBe(1);
    expect(start(testConfig({ playerStartHp: -5 })).player.hp).toBe(1);
  });
});

describe('player actions', () => {
  it('mixing consumes colors and adds the result to the pool', () => {
    const { state } = act(start(), { type: 'mix', colors: ['red', 'blue'] });
    expect(state.pool).toEqual(['green', 'purple']);
  });

  it('mixed colors can be spent on attacks', () => {
    const mixed = act(start(), { type: 'mix', colors: ['red', 'blue'] }).state;
    const { state } = act(mixed, { type: 'trigger', attackId: 'blast' });
    expect(state.pool).toEqual(['green']);
    expect(state.enemies[0]!.hp).toBe(22);
  });

  it('damage attacks hit enemy block first', () => {
    const s = start();
    const { state } = act(patchEnemy(s, { block: 3 }), { type: 'trigger', attackId: 'hit' });
    expect(state.enemies[0]).toMatchObject({ block: 0, hp: 28 });
  });

  it('block attacks add block to the player', () => {
    const { state, events } = act(start(), { type: 'trigger', attackId: 'guard' });
    expect(state.player.block).toBe(4);
    expect(state.pool).toEqual(['red', 'green']);
    expect(events).toContainEqual({ type: 'blockGained', target: 'player', amount: 4 });
  });

  it('status attacks apply poison stacks and burn to the enemy', () => {
    let s = withState(start(), { pool: ['green', 'green', 'red', 'red'] });
    s = act(s, { type: 'trigger', attackId: 'venom' }).state;
    s = act(s, { type: 'trigger', attackId: 'venom' }).state;
    s = act(s, { type: 'trigger', attackId: 'scorch' }).state;
    expect(s.enemies[0]!.statuses).toEqual({ poison: 6, burn: true });
    expect(s.pool).toEqual([]);
  });

  it('multi-color combos consume every required color', () => {
    const s = withState(start(), { pool: ['purple', 'red', 'cyan', 'orange'] });
    const { state } = act(s, { type: 'trigger', attackId: 'combo' });
    expect(state.pool).toEqual(['red']);
    expect(state.enemies[0]!.hp).toBe(0);
  });

  it('allows several actions in one turn', () => {
    let s = start();
    s = act(s, { type: 'trigger', attackId: 'hit' }).state;
    s = act(s, { type: 'trigger', attackId: 'guard' }).state;
    s = act(s, { type: 'trigger', attackId: 'venom' }).state;
    expect(s.pool).toEqual([]);
    expect(s.turn).toBe(1);
  });
});

describe('invalid actions', () => {
  const s = start();

  it.each<[string, BattleAction, string]>([
    ['unknown attack', { type: 'trigger', attackId: 'nope' }, 'unknown_attack'],
    ['unaffordable attack', { type: 'trigger', attackId: 'scorch' }, 'missing_colors'],
    ['mix with no recipe', { type: 'mix', colors: ['red', 'red'] }, 'no_recipe'],
    ['mix with missing color', { type: 'mix', colors: ['purple', 'red'] }, 'no_recipe'],
  ])('rejects %s and leaves state unchanged', (_, action, error) => {
    const result = applyAction(s, action, testConfig(), noopRng);
    expect(result).toEqual({ ok: false, state: s, error });
  });

  it('rejects a mix when one input is not in the pool', () => {
    const result = applyAction(withState(s, { pool: ['red'] }), { type: 'mix', colors: ['red', 'blue'] }, testConfig(), noopRng);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('missing_colors');
  });

  it('rejects every action once the battle is over', () => {
    const over = withState(s, { phase: 'victory' });
    for (const action of [
      { type: 'endTurn' },
      { type: 'trigger', attackId: 'hit' },
      { type: 'mix', colors: ['red', 'blue'] },
    ] as BattleAction[]) {
      expect(applyAction(over, action, testConfig(), noopRng)).toEqual({ ok: false, state: over, error: 'battle_over' });
    }
  });
});

describe('end of turn', () => {
  it('carries unspent colors over and adds the new roll', () => {
    const s = act(start(), { type: 'trigger', attackId: 'hit' }).state;
    const { state } = act(s, { type: 'endTurn' });
    expect(state.turn).toBe(2);
    expect(state.pool).toEqual(['blue', 'green', 'red', 'blue', 'green']);
  });

  it('caps the pool at the max size and reports discarded colors', () => {
    const { state, events } = act(start(), { type: 'endTurn' });
    expect(state.pool).toHaveLength(6);
    const third = act(state, { type: 'endTurn' });
    expect(third.state.pool).toHaveLength(6);
    expect(third.events).toContainEqual({ type: 'rolled', colors: ['red', 'blue', 'green'], discarded: ['red', 'blue', 'green'] });
    expect(events.at(-1)).toEqual({ type: 'rolled', colors: ['red', 'blue', 'green'], discarded: [] });
  });

  it('resolves in order: statuses, enemy action, next roll', () => {
    const s = start();
    const poisoned = patchEnemy(s, { statuses: { poison: 2, burn: true } });
    const { events } = act(poisoned, { type: 'endTurn' });
    expect(events.map((e) => e.type)).toEqual(['damaged', 'damaged', 'enemyIntent', 'damaged', 'rolled']);
  });

  it('ticks poison and burn on the enemy', () => {
    const s = start();
    const poisoned = patchEnemy(s, { statuses: { poison: 3, burn: true } });
    const { state } = act(poisoned, { type: 'endTurn' });
    expect(state.enemies[0]!.hp).toBe(30 - 3 - 4);
    expect(state.enemies[0]!.statuses).toEqual({ poison: 2, burn: false });
  });

  it('enemy attacks hit player block first', () => {
    const s = act(start(), { type: 'trigger', attackId: 'guard' }).state;
    const { events } = act(s, { type: 'endTurn' });
    expect(events).toContainEqual({ type: 'damaged', target: 'player', amount: 2, blocked: 4, source: 'attack' });
  });

  it('player block expires at the start of their next turn', () => {
    const s = withState(start(), { pool: ['blue', 'blue', 'blue'] });
    let next = act(s, { type: 'trigger', attackId: 'guard' }).state;
    next = act(next, { type: 'trigger', attackId: 'guard' }).state;
    next = act(next, { type: 'trigger', attackId: 'guard' }).state;
    const { state } = act(next, { type: 'endTurn' });
    expect(state.player).toMatchObject({ hp: 20, block: 0 });
  });

  it('enemy intents cycle, and enemy block lasts until its next action', () => {
    const config = testConfig({
      enemies: [
        {
          id: 'turtle',
          name: 'Turtle',
          maxHp: 30,
          intents: [
            { type: 'block', amount: 5 },
            { type: 'attack', amount: 3 },
          ],
        },
      ],
    });
    let s = start(config);
    expect(getEnemyIntent(s, config, 0)).toEqual({ type: 'block', amount: 5 });

    s = act(s, { type: 'endTurn' }, config).state;
    expect(s.enemies[0]!.block).toBe(5);
    expect(getEnemyIntent(s, config, 0)).toEqual({ type: 'attack', amount: 3 });

    s = act(s, { type: 'trigger', attackId: 'hit' }, config).state;
    expect(s.enemies[0]).toMatchObject({ block: 0, hp: 30 });

    s = act(s, { type: 'endTurn' }, config).state;
    expect(s.player.hp).toBe(17);
    expect(getEnemyIntent(s, config, 0)).toEqual({ type: 'block', amount: 5 });
  });
});

describe('victory and defeat', () => {
  it('wins immediately when an attack drops the enemy to 0', () => {
    const s = start();
    const { state, events } = act(patchEnemy(s, { hp: 5 }), { type: 'trigger', attackId: 'hit' });
    expect(state.phase).toBe('victory');
    expect(events.at(-1)).toEqual({ type: 'victory' });
  });

  it('wins from status damage before the enemy can act', () => {
    const s = start();
    const dying = patchEnemy(s, { hp: 2, statuses: { poison: 2, burn: false } });
    const { state, events } = act(dying, { type: 'endTurn' });
    expect(state.phase).toBe('victory');
    expect(state.player.hp).toBe(20);
    expect(events.map((e) => e.type)).toEqual(['damaged', 'victory']);
  });

  it('loses when the enemy drops the player to 0, and no new dice are rolled', () => {
    const s = start();
    const weak = withState(s, { player: { ...s.player, hp: 6 } });
    const { state, events } = act(weak, { type: 'endTurn' });
    expect(state.phase).toBe('defeat');
    expect(state.player.hp).toBe(0);
    expect(state.turn).toBe(1);
    expect(events.map((e) => e.type)).not.toContain('rolled');
  });

  it('loses from player status damage before the enemy acts', () => {
    const s = start();
    const weak = withState(s, { player: { ...s.player, hp: 3, statuses: { poison: 0, burn: true } } });
    const { state, events } = act(weak, { type: 'endTurn' });
    expect(state.phase).toBe('defeat');
    expect(events.map((e) => e.type)).not.toContain('enemyIntent');
  });
});

describe('several enemies', () => {
  const imp = { id: 'imp', name: 'Imp', maxHp: 10, intents: [{ type: 'attack', amount: 2 }] } as const;
  const config = testConfig({
    enemies: [imp, DUMMY],
    attacks: [
      ...testConfig().attacks,
      { id: 'splash', name: 'Splash', cost: { blue: 1 }, effects: [{ type: 'damage', amount: 3, area: true }] },
      { id: 'cloud', name: 'Cloud', cost: { green: 1 }, effects: [{ type: 'poison', stacks: 2, area: true }, { type: 'burn', area: true }] },
    ],
  });
  const begin = () => start(config);
  const go = (s: BattleState, action: BattleAction) => act(s, action, config);

  it('starts every enemy at full HP with its own intent', () => {
    const s = begin();
    expect(s.enemies.map((e) => e.hp)).toEqual([10, 30]);
    expect(getEnemyIntent(s, config, 0)).toEqual({ type: 'attack', amount: 2 });
    expect(getEnemyIntent(s, config, 1)).toEqual({ type: 'attack', amount: 6 });
    expect(getEnemyIntent(s, config, 2)).toBeUndefined();
  });

  it('single-target spells hit the chosen enemy, or the first living one by default', () => {
    let s = withState(begin(), { pool: ['red', 'red'] });
    const aimed = go(s, { type: 'trigger', attackId: 'hit', target: 1 });
    expect(aimed.state.enemies.map((e) => e.hp)).toEqual([10, 25]);
    expect(aimed.events[0]).toEqual({ type: 'triggered', attackId: 'hit', target: 1 });
    expect(aimed.events).toContainEqual({ type: 'damaged', target: 'enemy', enemy: 1, amount: 5, blocked: 0, source: 'attack' });

    s = patchEnemy(s, { hp: 0 }, 0);
    expect(go(s, { type: 'trigger', attackId: 'hit' }).state.enemies.map((e) => e.hp)).toEqual([0, 25]);
  });

  it.each([
    ['a defeated enemy', 0],
    ['an enemy that does not exist', 5],
    ['a negative index', -1],
  ])('rejects aiming at %s', (_, target) => {
    const s = patchEnemy(begin(), { hp: 0 }, 0);
    const result = applyAction(s, { type: 'trigger', attackId: 'hit', target }, config, noopRng);
    expect(result).toEqual({ ok: false, state: s, error: 'invalid_target' });
  });

  it('area spells hit every living enemy and skip defeated ones', () => {
    const three = testConfig({ ...config, enemies: [imp, DUMMY, imp] });
    let s = patchEnemy(start(three), { hp: 0 }, 2);
    s = patchEnemy(s, { block: 2 }, 1);
    const splash = act(s, { type: 'trigger', attackId: 'splash' }, three);
    expect(splash.state.enemies.map((e) => [e.hp, e.block])).toEqual([[7, 0], [29, 0], [0, 0]]);
    expect(splash.events.filter((e) => e.type === 'damaged')).toHaveLength(2);

    const cloud = act(splash.state, { type: 'trigger', attackId: 'cloud' }, three);
    expect(cloud.state.enemies.map((e) => e.statuses)).toEqual([
      { poison: 2, burn: true },
      { poison: 2, burn: true },
      { poison: 0, burn: false },
    ]);
  });

  it('every living enemy ticks statuses, then acts in order; defeated enemies do nothing', () => {
    let s = patchEnemy(begin(), { statuses: { poison: 1, burn: false } }, 1);
    const { state, events } = go(s, { type: 'endTurn' });
    expect(events.map((e) => [e.type, 'enemy' in e ? e.enemy : 'player'])).toEqual([
      ['damaged', 1],
      ['enemyIntent', 0],
      ['damaged', 'player'],
      ['enemyIntent', 1],
      ['damaged', 'player'],
      ['rolled', 'player'],
    ]);
    expect(state.player.hp).toBe(20 - 2 - 6);
    expect(state.enemies.map((e) => e.intentIndex)).toEqual([1, 1]);

    s = patchEnemy(begin(), { hp: 0 }, 0);
    const solo = go(s, { type: 'endTurn' });
    expect(solo.events.filter((e) => e.type === 'enemyIntent')).toEqual([{ type: 'enemyIntent', enemy: 1, intent: { type: 'attack', amount: 6 } }]);
    expect(solo.state.enemies[0]!.intentIndex).toBe(0);
  });

  it('wins only once the last enemy is down', () => {
    let s = withState(patchEnemy(begin(), { hp: 5 }, 0), { pool: ['red', 'red'] });
    s = go(s, { type: 'trigger', attackId: 'hit', target: 0 }).state;
    expect(s.phase).toBe('player');
    s = patchEnemy(s, { hp: 5 }, 1);
    const last = go(s, { type: 'trigger', attackId: 'hit', target: 1 });
    expect(last.state.phase).toBe('victory');
    expect(last.events.at(-1)).toEqual({ type: 'victory' });
  });

  it('an enemy with no intents does nothing, and keeps its block', () => {
    const idle = { id: 'idle', name: 'Idle', maxHp: 10, intents: [] };
    const cfg = testConfig({ enemies: [idle, DUMMY] });
    const s = patchEnemy(start(cfg), { block: 6 }, 0);
    const { state, events } = act(s, { type: 'endTurn' }, cfg);
    expect(state.enemies[0]).toMatchObject({ block: 6, intentIndex: 0 });
    expect(events.filter((e) => e.type === 'enemyIntent').map((e) => 'enemy' in e && e.enemy)).toEqual([1]);
  });

  it('stops the enemy phase as soon as the player falls', () => {
    const s = withState(begin(), { player: { ...begin().player, hp: 2 } });
    const { state, events } = go(s, { type: 'endTurn' });
    expect(state.phase).toBe('defeat');
    expect(events.filter((e) => e.type === 'enemyIntent')).toHaveLength(1);
  });
});

describe('enemy intents', () => {
  const withIntents = (...intents: EnemyIntent[]) =>
    testConfig({ enemies: [{ id: 'x', name: 'X', maxHp: 30, intents }] });

  it('multi-hit attacks hit block first, one hit at a time', () => {
    const config = withIntents({ type: 'attack', amount: 3, hits: 3 });
    const s = act(start(config), { type: 'trigger', attackId: 'guard' }, config).state;
    const { state, events } = act(s, { type: 'endTurn' }, config);
    expect(events.filter((e) => e.type === 'damaged')).toEqual([
      { type: 'damaged', target: 'player', amount: 0, blocked: 3, source: 'attack' },
      { type: 'damaged', target: 'player', amount: 2, blocked: 1, source: 'attack' },
      { type: 'damaged', target: 'player', amount: 3, blocked: 0, source: 'attack' },
    ]);
    expect(state.player.hp).toBe(15);
  });

  it('multi-hit attacks stop once the player is down', () => {
    const config = withIntents({ type: 'attack', amount: 3, hits: 5 });
    const s = withState(start(config), { player: { ...start(config).player, hp: 4 } });
    const { state, events } = act(s, { type: 'endTurn' }, config);
    expect(state.phase).toBe('defeat');
    expect(events.filter((e) => e.type === 'damaged')).toHaveLength(2);
  });

  it('enemies can poison and burn the player, which ticks at the next end of turn', () => {
    const config = withIntents({ type: 'poison', stacks: 3 }, { type: 'burn' });
    let { state, events } = act(start(config), { type: 'endTurn' }, config);
    expect(events).toContainEqual({ type: 'statusApplied', target: 'player', status: 'poison', stacks: 3 });
    expect(state.player).toMatchObject({ hp: 20, statuses: { poison: 3, burn: false } });

    ({ state, events } = act(state, { type: 'endTurn' }, config));
    expect(events).toContainEqual({ type: 'statusApplied', target: 'player', status: 'burn', stacks: 1 });
    expect(state.player).toMatchObject({ hp: 17, statuses: { poison: 2, burn: true } });

    ({ state } = act(state, { type: 'endTurn' }, config));
    expect(state.player.hp).toBe(17 - 2 - 4);
  });
});

describe('simulation with default data', () => {
  it('a greedy player finishes a seeded battle without errors', () => {
    const config = defaultBattleConfig();
    const rng = createSeededRng(7);
    let { state } = createBattle(config, rng);

    for (let guard = 0; guard < 200 && state.phase === 'player'; guard++) {
      const affordable = config.attacks.find((attack) =>
        applyAction(state, { type: 'trigger', attackId: attack.id }, config, rng).ok,
      );
      const action: BattleAction = affordable ? { type: 'trigger', attackId: affordable.id } : { type: 'endTurn' };
      const result = applyAction(state, action, config, rng);
      expect(result.ok).toBe(true);
      state = result.state;
      expect(state.pool.length).toBeLessThanOrEqual(config.maxPoolSize);
    }

    expect(['victory', 'defeat']).toContain(state.phase);
  });

  it('the same seed gives the same battle', () => {
    const run = () => {
      const config = defaultBattleConfig();
      const rng = createSeededRng(99);
      let { state } = createBattle(config, rng);
      for (let i = 0; i < 5; i++) state = applyAction(state, { type: 'endTurn' }, config, rng).state;
      return state;
    };
    expect(run()).toEqual(run());
  });
});
