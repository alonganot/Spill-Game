import { describe, expect, it } from 'vitest';
import { GOLD_ATTACKS, GOLD_SPELL_PAYOUT } from '../data/attacks';
import { BOUNTY_GOLD_PER_STACK } from '../data/balance';
import { MIX_RECIPES } from '../data/colors';
import { applyAction, createBattle } from './battle';
import { findMixPlan, mixColors } from './mixing';
import { DUMMY, noopRng, patchEnemy, testConfig, withState } from './testUtils';
import { upgradeAttack } from './upgrades';
import type { BattleAction, BattleConfig, BattleEvent, BattleState, Color, EnemyDefinition } from './types';

// Gold spells and Bounty (RULES.md §2-§3). The test config: player 20 HP, Dummy 30 HP
// attacking for 6, bountyGold 3, burnDamage 4. Dice roll red/blue/green.

const base = testConfig();
const config: BattleConfig = {
  ...base,
  attacks: [
    ...base.attacks,
    ...Object.values(GOLD_ATTACKS),
    { id: 'wave', name: 'Wave', cost: { blue: 2 }, effects: [{ type: 'damage', amount: 5, area: true }] },
  ],
};
const IMP: EnemyDefinition = { id: 'imp', name: 'Imp', maxHp: 10, intents: [{ type: 'attack', amount: 2 }] };

function start(cfg: BattleConfig = config): BattleState {
  return createBattle(cfg, noopRng).state;
}

function act(state: BattleState, action: BattleAction, cfg: BattleConfig = config) {
  const result = applyAction(state, action, cfg, noopRng);
  if (!result.ok) throw new Error(`Action failed: ${result.error}`);
  return result;
}

const cast = (state: BattleState, attackId: string, target?: number, cfg?: BattleConfig) =>
  act(state, { type: 'trigger', attackId, target }, cfg);
const endTurn = (state: BattleState, cfg?: BattleConfig) => act(state, { type: 'endTurn' }, cfg);
const withPool = (state: BattleState, pool: Color[]) => withState(state, { pool });
const gold = (events: readonly BattleEvent[]) => events.filter((e) => e.type === 'goldGained');

describe('Gold spells', () => {
  it('Mint adds GOLD_SPELL_PAYOUT gold and touches nothing else', () => {
    const before = withPool(start(), ['gold']);
    const { state, events } = cast(before, 'mint');
    expect(GOLD_SPELL_PAYOUT).toBe(2);
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 2, source: 'spell' }]);
    expect(state.pool).toEqual([]);
    expect(state.player).toEqual(before.player);
    expect(state.enemies).toEqual(before.enemies);
  });

  it('Mint+ adds 3 gold', () => {
    const plus = { ...config, attacks: config.attacks.map((a) => (a.id === 'mint' ? upgradeAttack(a) : a)) };
    const { events } = cast(withPool(start(plus), ['gold']), 'mint', undefined, plus);
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 3, source: 'spell' }]);
  });

  it('Gilded Ward gives 5 Block and 1 gold', () => {
    const { state, events } = cast(withPool(start(), ['gold', 'blue']), 'gildedWard');
    expect(state.player.block).toBe(5);
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 1, source: 'spell' }]);
  });
});

describe('Bounty', () => {
  it('starts at 0 and stacks across casts on the same enemy, dealing 3 each time', () => {
    expect(start().enemies[0]!.bounty).toBe(0);
    let state = withPool(start(), ['gold', 'green', 'gold', 'green']);
    const first = cast(state, 'bounty');
    expect(first.events).toContainEqual({ type: 'statusApplied', target: 'enemy', enemy: 0, status: 'bounty', stacks: 1 });
    state = cast(first.state, 'bounty').state;
    expect(state.enemies[0]).toMatchObject({ bounty: 2, hp: 24 });
  });

  it('never decays at the end of the turn', () => {
    const marked = cast(withPool(start(), ['gold', 'green']), 'bounty').state;
    expect(endTurn(marked).state.enemies[0]!.bounty).toBe(1);
  });

  it('pays stacks × BOUNTY_GOLD_PER_STACK once when a hit defeats the enemy, before victory', () => {
    expect(BOUNTY_GOLD_PER_STACK).toBe(3);
    const marked = patchEnemy(withPool(start(), ['red']), { bounty: 2, hp: 5 });
    const { state, events } = cast(marked, 'hit');
    const paid = events.findIndex((e) => e.type === 'goldGained');
    expect(events[paid]).toEqual({ type: 'goldGained', amount: 6, source: 'bounty', enemy: 0 });
    expect(events[paid - 1]).toMatchObject({ type: 'damaged', enemy: 0 });
    expect(paid).toBeLessThan(events.findIndex((e) => e.type === 'victory'));
    expect(gold(events)).toHaveLength(1);
    expect(state.enemies[0]!.bounty).toBe(0);
  });

  it("pays the killing cast's own new stack (Bounty resolves before its damage)", () => {
    const { events } = cast(patchEnemy(withPool(start(), ['gold', 'green']), { bounty: 1, hp: 3 }), 'bounty');
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 6, source: 'bounty', enemy: 0 }]);
  });

  it('pays nothing for a hit that does not kill, or a kill without Bounty', () => {
    expect(gold(cast(patchEnemy(withPool(start(), ['red']), { bounty: 2 }), 'hit').events)).toEqual([]);
    expect(gold(cast(patchEnemy(withPool(start(), ['red']), { hp: 5 }), 'hit').events)).toEqual([]);
  });

  it('pays on a Poison tick kill, before the victory', () => {
    const marked = patchEnemy(start(), { bounty: 1, hp: 2, statuses: { poison: 3, burn: 0 } });
    const { events } = endTurn(marked);
    const paid = events.findIndex((e) => e.type === 'goldGained');
    expect(events[paid]).toEqual({ type: 'goldGained', amount: 3, source: 'bounty', enemy: 0 });
    expect(events[paid - 1]).toMatchObject({ type: 'damaged', source: 'poison' });
    expect(paid).toBeLessThan(events.findIndex((e) => e.type === 'victory'));
  });

  it('pays on a Burn tick kill', () => {
    const marked = patchEnemy(start(), { bounty: 3, hp: 4, statuses: { poison: 0, burn: 1 } });
    const { events } = endTurn(marked);
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 9, source: 'bounty', enemy: 0 }]);
  });

  it('an area kill pays every marked enemy it defeats, and only those', () => {
    const cfg = { ...config, enemies: [IMP, IMP, DUMMY] };
    let state = withPool(start(cfg), ['blue', 'blue']);
    state = patchEnemy(state, { hp: 5, bounty: 1 }, 0);
    state = patchEnemy(state, { hp: 5 }, 1);
    state = patchEnemy(state, { bounty: 2 }, 2);
    const { events } = cast(state, 'wave', undefined, cfg);
    expect(gold(events)).toEqual([{ type: 'goldGained', amount: 3, source: 'bounty', enemy: 0 }]);
  });
});

describe('Gold paint and mixing', () => {
  it('has no recipes: mixing Gold with anything fails', () => {
    for (const other of ['red', 'blue', 'green', 'white', 'black', 'gold', 'purple'] as const) {
      expect(mixColors(['gold', other], MIX_RECIPES, 'gold', other)).toMatchObject({ ok: false, error: 'no_recipe' });
    }
  });

  it('findMixPlan pays Gold spells straight from the pool, and knows Gold cannot be mixed', () => {
    expect(findMixPlan(['gold', 'green'], { gold: 1, green: 1 }, MIX_RECIPES, 2)).toEqual([]);
    expect(findMixPlan(['gold', 'red', 'blue'], { gold: 1, blue: 1 }, MIX_RECIPES, 2)).toEqual([]);
    expect(findMixPlan(['red', 'blue'], { gold: 1 }, MIX_RECIPES, 2)).toBeNull();
  });
});
