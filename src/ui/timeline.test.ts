import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { ENEMIES } from '../data/enemies';
import { STATUS_CONFIG } from '../data/balance';
import {
  applyAction,
  canAfford,
  createBattle,
  createSeededRng,
  findRecipe,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type Rng,
} from '../engine';
import { beforeOpeningRoll, buildTimeline, type Conditions } from './timeline';

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base = createBattle(defaultBattleConfig(), createSeededRng(1)).state;
  return { ...base, ...overrides };
}

function withVitals(state: BattleState, who: 'player' | 'enemy', hp: number, block: number): BattleState {
  if (who === 'player') return { ...state, player: { ...state.player, hp, block } };
  return { ...state, enemies: state.enemies.map((e, i) => (i === 0 ? { ...e, hp, block } : e)) };
}

const conditionsOf = (e: Partial<Conditions>) => ({
  cursed: e.cursed,
  silenced: e.silenced,
  silenceImmune: e.silenceImmune,
  chilled: e.chilled,
  bounty: e.bounty,
});
const vitalsOf = (c: { hp: number; block: number; statuses: BattleState['player']['statuses'] }) => ({
  hp: c.hp,
  block: c.block,
  statuses: c.statuses,
});

describe('buildTimeline', () => {
  it('returns one beat of the final state when there are no events', () => {
    const after = battle();
    const steps = buildTimeline(after, [], after, STATUS_CONFIG);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.event).toBeNull();
    expect(steps[0]!.player.hp).toBe(after.player.hp);
  });

  it('lets block absorb damage before HP drops', () => {
    const before = withVitals(battle(), 'player', 30, 5);
    const events: BattleEvent[] = [
      { type: 'enemyIntent', enemy: 0, intent: { type: 'attack', amount: 8 } },
      { type: 'damaged', target: 'player', amount: 3, blocked: 5, source: 'attack' },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'poison', stacks: 1 },
    ];
    const after = withVitals(before, 'player', 27, 0);
    const steps = buildTimeline(before, events, after, STATUS_CONFIG);
    expect(steps.map((s) => ({ hp: s.player.hp, block: s.player.block }))).toEqual([
      { hp: 30, block: 5 },
      { hp: 27, block: 0 },
      { hp: 27, block: 0 },
    ]);
  });

  it('shows Curse, Silence, and Chill coming and going beat by beat', () => {
    const before = battle();
    const events: BattleEvent[] = [
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'curse', stacks: 1 },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'silence', stacks: 1 },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'chill', stacks: 1 },
      { type: 'enemySkipped', enemy: 0, intent: { type: 'attack', amount: 6 } },
      { type: 'rolled', colors: [], discarded: [] },
    ];
    const after = { ...before, enemies: [{ ...before.enemies[0]!, silenceImmune: true, chilled: true }] };
    const flags = buildTimeline(before, events, after, STATUS_CONFIG).map((s) => {
      const { cursed, silenced, silenceImmune, chilled } = s.enemies[0]!;
      return { cursed, silenced, silenceImmune, chilled };
    });
    expect(flags).toEqual([
      { cursed: true, silenced: false, silenceImmune: false, chilled: false },
      { cursed: true, silenced: true, silenceImmune: false, chilled: false },
      { cursed: true, silenced: true, silenceImmune: false, chilled: true },
      { cursed: false, silenced: false, silenceImmune: true, chilled: true },
      { cursed: false, silenced: false, silenceImmune: true, chilled: true },
    ]);
  });

  it('a Hush+ skip leaves no Silence Immunity', () => {
    const base = battle();
    const before = { ...base, enemies: [{ ...base.enemies[0]!, silenced: true, silenceNoImmunity: true }] };
    const events: BattleEvent[] = [{ type: 'enemySkipped', enemy: 0, intent: { type: 'attack', amount: 6 }, noImmunity: true }];
    const after = { ...before, enemies: [{ ...before.enemies[0]!, silenced: false, silenceNoImmunity: false }] };
    const [step] = buildTimeline(before, events, after, STATUS_CONFIG);
    expect(step!.enemies[0]).toMatchObject({ silenced: false, silenceImmune: false });
  });

  it('applies and uses up statuses beat by beat', () => {
    const base = battle();
    const before = { ...base, enemies: [{ ...base.enemies[0]!, statuses: { poison: 3, burn: 1 } }] };
    const events: BattleEvent[] = [
      { type: 'damaged', target: 'enemy', enemy: 0, amount: 3, blocked: 0, source: 'poison' },
      { type: 'damaged', target: 'enemy', enemy: 0, amount: 4, blocked: 0, source: 'burn' },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'poison', stacks: 2 },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'burn', stacks: 1 },
      { type: 'enemyIntent', enemy: 0, intent: { type: 'block', amount: 1 } },
    ];
    const steps = buildTimeline(before, events, before, { ...STATUS_CONFIG, poisonDecay: 1 });
    expect(steps.slice(0, -1).map((s) => s.enemies[0]!.statuses)).toEqual([
      { poison: 2, burn: 1 },
      { poison: 2, burn: 0 },
      { poison: 4, burn: 0 },
      { poison: 4, burn: 1 },
    ]);
  });

  it('steps poison and burn ticks one at a time', () => {
    const before = withVitals(battle(), 'enemy', 20, 0);
    const events: BattleEvent[] = [
      { type: 'damaged', target: 'enemy', enemy: 0, amount: 3, blocked: 0, source: 'poison' },
      { type: 'damaged', target: 'enemy', enemy: 0, amount: 4, blocked: 0, source: 'burn' },
    ];
    const steps = buildTimeline(before, events, withVitals(before, 'enemy', 13, 0), STATUS_CONFIG);
    expect(steps.map((s) => s.enemies[0]!.hp)).toEqual([17, 13]);
  });

  it("drops the enemy's old block when it acts, then adds new block", () => {
    const before = withVitals(battle(), 'enemy', 20, 6);
    const events: BattleEvent[] = [
      { type: 'enemyIntent', enemy: 0, intent: { type: 'block', amount: 4 } },
      { type: 'blockGained', target: 'enemy', enemy: 0, amount: 4 },
    ];
    const steps = buildTimeline(before, events, withVitals(before, 'enemy', 20, 4), STATUS_CONFIG);
    expect(steps.map((s) => s.enemies[0]!.block)).toEqual([0, 4]);
  });

  it('keeps the old pool until the dice land', () => {
    const before = battle({ pool: ['red'] });
    const after = { ...withVitals(before, 'player', before.player.hp - 2, 0), pool: ['red', 'blue', 'green'] as const };
    const events: BattleEvent[] = [
      { type: 'damaged', target: 'player', amount: 2, blocked: 0, source: 'poison' },
      { type: 'rolled', colors: ['blue', 'green'], discarded: [] },
    ];
    const steps = buildTimeline(before, events, { ...after, pool: [...after.pool] }, STATUS_CONFIG);
    expect(steps.map((s) => s.pool)).toEqual([['red'], ['red', 'blue', 'green']]);
  });
});

describe('beforeOpeningRoll', () => {
  it('removes only the rolled colors that made it into the pool', () => {
    const after = battle({ pool: ['red', 'red', 'blue'] });
    const events: BattleEvent[] = [{ type: 'rolled', colors: ['red', 'blue', 'green'], discarded: ['green'] }];
    expect(beforeOpeningRoll(after, events).pool).toEqual(['red']);
  });

  it('returns the state unchanged when nothing was rolled', () => {
    const after = battle({ pool: ['red'] });
    expect(beforeOpeningRoll(after, []).pool).toEqual(['red']);
  });
});

function legalActions(state: BattleState, config: BattleConfig): BattleAction[] {
  const actions: BattleAction[] = [{ type: 'endTurn' }];
  for (const attack of config.attacks) {
    if (canAfford(state.pool, attack.cost)) actions.push({ type: 'trigger', attackId: attack.id });
  }
  for (let i = 0; i < state.pool.length; i++) {
    for (let j = i + 1; j < state.pool.length; j++) {
      const a = state.pool[i]!;
      const b = state.pool[j]!;
      if (findRecipe(config.recipes, a, b)) actions.push({ type: 'mix', colors: [a, b] });
    }
  }
  return actions;
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

describe('buildTimeline against the engine', () => {
  it('always ends on the real post-action state, with sane beats along the way', () => {
    const enemies = Object.values(ENEMIES);
    let actionsChecked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = createSeededRng(seed);
      // One, two, or three enemies, so events land on different indexes.
      const count = 1 + (seed % 3);
      const config = defaultBattleConfig(Array.from({ length: count }, (_, k) => enemies[(seed + k) % enemies.length]!));
      const opening = createBattle(config, rng);
      let state = opening.state;

      const first = buildTimeline(beforeOpeningRoll(state, opening.events), opening.events, state, config.status);
      expect(first.at(-1)!.pool).toEqual(state.pool);

      for (let n = 0; n < 80 && state.phase === 'player'; n++) {
        const result = applyAction(state, pick(legalActions(state, config), rng), config, rng);
        expect(result.ok).toBe(true);
        if (!result.ok) break;
        const steps = buildTimeline(state, result.events, result.state, config.status);
        const last = steps.at(-1)!;
        expect(last.player).toEqual({ hp: result.state.player.hp, block: result.state.player.block, statuses: result.state.player.statuses });
        expect(last.enemies).toEqual(result.state.enemies.map((e) => ({ ...vitalsOf(e), ...conditionsOf(e) })));
        expect(last.pool).toEqual(result.state.pool);
        // Replaying forward should already land on the real numbers before the final snap.
        const replayed = buildTimeline(state, [...result.events, { type: 'victory' }], result.state, config.status).at(-2)!;
        expect(replayed.player.hp).toBe(result.state.player.hp);
        expect(replayed.enemies.map((e) => e.hp)).toEqual(result.state.enemies.map((e) => e.hp));
        expect(replayed.player.statuses).toEqual(result.state.player.statuses);
        expect(replayed.enemies.map((e) => e.statuses)).toEqual(result.state.enemies.map((e) => e.statuses));
        expect(replayed.enemies.map(conditionsOf)).toEqual(result.state.enemies.map(conditionsOf));
        for (const step of steps) {
          expect(step.player.hp).toBeGreaterThanOrEqual(0);
          for (const enemy of step.enemies) expect(enemy.hp).toBeGreaterThanOrEqual(0);
          expect(step.player.block).toBeGreaterThanOrEqual(0);
        }
        state = result.state;
        actionsChecked++;
      }
    }
    expect(actionsChecked).toBeGreaterThan(500);
  });
});

describe('buildTimeline: Gold and Bounty', () => {
  it('adds Bounty stacks, clears them on the payout beat, and counts the gold beat by beat', () => {
    const before = battle();
    const events: BattleEvent[] = [
      { type: 'goldGained', amount: 2, source: 'spell' },
      { type: 'statusApplied', target: 'enemy', enemy: 0, status: 'bounty', stacks: 2 },
      { type: 'damaged', target: 'enemy', enemy: 0, amount: 3, blocked: 0, source: 'attack' },
      { type: 'goldGained', amount: 6, source: 'bounty', enemy: 0 },
      { type: 'victory' },
    ];
    const after = { ...before, enemies: [{ ...before.enemies[0]!, hp: before.enemies[0]!.hp - 3 }] };
    const steps = buildTimeline(before, events, after, STATUS_CONFIG);
    expect(steps.map((s) => s.goldGained)).toEqual([2, 2, 2, 8, 8]);
    expect(steps.map((s) => s.enemies[0]!.bounty)).toEqual([0, 2, 2, 0, 0]);
  });
});
