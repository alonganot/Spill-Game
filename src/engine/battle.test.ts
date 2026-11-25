import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { applyAction, createBattle, getEnemyIntent } from './battle';
import { createSeededRng } from './rng';
import { noopRng, testConfig, withState } from './testUtils';
import type { BattleAction, BattleConfig, BattleState } from './types';

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
    expect(state.enemy).toMatchObject({ hp: 30, block: 0 });
    expect(events).toEqual([{ type: 'rolled', colors: ['red', 'blue', 'green'], discarded: [] }]);
  });

  it('can start the player below max HP (HP carried from earlier fights)', () => {
    const state = start(testConfig({ playerStartHp: 12 }));
    expect(state.player).toMatchObject({ hp: 12, maxHp: 20 });
  });

  it('never starts the player above max HP', () => {
    expect(start(testConfig({ playerStartHp: 99 })).player.hp).toBe(20);
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
    expect(state.enemy.hp).toBe(22);
  });

  it('damage attacks hit enemy block first', () => {
    const s = start();
    const { state } = act(withState(s, { enemy: { ...s.enemy, block: 3 } }), { type: 'trigger', attackId: 'hit' });
    expect(state.enemy).toMatchObject({ block: 0, hp: 28 });
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
    expect(s.enemy.statuses).toEqual({ poison: 6, burn: true });
    expect(s.pool).toEqual([]);
  });

  it('multi-color combos consume every required color', () => {
    const s = withState(start(), { pool: ['purple', 'red', 'cyan', 'orange'] });
    const { state } = act(s, { type: 'trigger', attackId: 'combo' });
    expect(state.pool).toEqual(['red']);
    expect(state.enemy.hp).toBe(0);
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
    const poisoned = withState(s, { enemy: { ...s.enemy, statuses: { poison: 2, burn: true } } });
    const { events } = act(poisoned, { type: 'endTurn' });
    expect(events.map((e) => e.type)).toEqual(['damaged', 'damaged', 'enemyIntent', 'damaged', 'rolled']);
  });

  it('ticks poison and burn on the enemy', () => {
    const s = start();
    const poisoned = withState(s, { enemy: { ...s.enemy, statuses: { poison: 3, burn: true } } });
    const { state } = act(poisoned, { type: 'endTurn' });
    expect(state.enemy.hp).toBe(30 - 3 - 4);
    expect(state.enemy.statuses).toEqual({ poison: 2, burn: false });
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
      enemy: {
        id: 'turtle',
        name: 'Turtle',
        maxHp: 30,
        intents: [
          { type: 'block', amount: 5 },
          { type: 'attack', amount: 3 },
        ],
      },
    });
    let s = start(config);
    expect(getEnemyIntent(s, config)).toEqual({ type: 'block', amount: 5 });

    s = act(s, { type: 'endTurn' }, config).state;
    expect(s.enemy.block).toBe(5);
    expect(getEnemyIntent(s, config)).toEqual({ type: 'attack', amount: 3 });

    s = act(s, { type: 'trigger', attackId: 'hit' }, config).state;
    expect(s.enemy).toMatchObject({ block: 0, hp: 30 });

    s = act(s, { type: 'endTurn' }, config).state;
    expect(s.player.hp).toBe(17);
    expect(getEnemyIntent(s, config)).toEqual({ type: 'block', amount: 5 });
  });
});

describe('victory and defeat', () => {
  it('wins immediately when an attack drops the enemy to 0', () => {
    const s = start();
    const { state, events } = act(withState(s, { enemy: { ...s.enemy, hp: 5 } }), { type: 'trigger', attackId: 'hit' });
    expect(state.phase).toBe('victory');
    expect(events.at(-1)).toEqual({ type: 'victory' });
  });

  it('wins from status damage before the enemy can act', () => {
    const s = start();
    const dying = withState(s, { enemy: { ...s.enemy, hp: 2, statuses: { poison: 2, burn: false } } });
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
