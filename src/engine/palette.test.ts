import { describe, expect, it } from 'vitest';
import { PALETTE_ATTACKS } from '../data/attacks';
import { applyAction, createBattle } from './battle';
import { findMixPlan } from './mixing';
import { DUMMY, noopRng, patchEnemy, testConfig, withState } from './testUtils';
import type { BattleAction, BattleConfig, BattleState, Color, EnemyDefinition } from './types';

// White, Pink, and Black spells (RULES.md §2-§3): Heal, Cleanse, Curse, Silence, Chill.
// The test config: player 20 HP, Dummy 30 HP attacking for 6 every turn,
// curseBonus 3, chillMultiplier 0.5, burnDamage 4. Dice roll red/blue/green.

const base = testConfig();
const config: BattleConfig = { ...base, attacks: [...base.attacks, ...Object.values(PALETTE_ATTACKS)] };

const GNATS: EnemyDefinition = { id: 'gnats', name: 'Gnats', maxHp: 30, intents: [{ type: 'attack', amount: 5, hits: 2 }] };
const WALL: EnemyDefinition = { id: 'wall', name: 'Wall', maxHp: 30, intents: [{ type: 'block', amount: 5 }] };

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

function withPool(state: BattleState, pool: Color[]): BattleState {
  return withState(state, { pool });
}

function withPlayer(state: BattleState, patch: Partial<BattleState['player']>): BattleState {
  return withState(state, { player: { ...state.player, ...patch } });
}

describe('new mixes', () => {
  it.each([
    ['red', 'white', 'pink'],
    ['white', 'black', 'grey'],
    ['red', 'black', 'crimson'],
    ['green', 'black', 'blight'],
    ['blue', 'white', 'frost'],
  ] as const)('%s + %s makes %s', (a, b, out) => {
    const { state, events } = act(withPool(start(), [a, b]), { type: 'mix', colors: [b, a] });
    expect(state.pool).toEqual([out]);
    expect(events).toEqual([{ type: 'mixed', inputs: [b, a], output: out }]);
  });

  it('findMixPlan finds the new mixes for a spell', () => {
    expect(findMixPlan(['white', 'black'], { grey: 1 }, config.recipes, 3)?.map((r) => r.output)).toEqual(['grey']);
    expect(findMixPlan(['red', 'white', 'red'], { pink: 1, red: 1 }, config.recipes, 3)?.map((r) => r.output)).toEqual([
      'pink',
    ]);
    expect(findMixPlan(['white', 'white'], { grey: 1 }, config.recipes, 3)).toBeNull();
  });
});

describe('Heal', () => {
  it('Mend restores HP', () => {
    const s = withPool(withPlayer(start(), { hp: 12 }), ['pink']);
    const { state, events } = cast(s, 'mend');
    expect(state.player.hp).toBe(17);
    expect(events).toContainEqual({ type: 'healed', target: 'player', amount: 5 });
  });

  it('is capped at max HP, and reports only what it restored', () => {
    const { state, events } = cast(withPool(withPlayer(start(), { hp: 18 }), ['pink']), 'mend');
    expect(state.player.hp).toBe(20);
    expect(events).toContainEqual({ type: 'healed', target: 'player', amount: 2 });
  });

  it('at full HP heals nothing but still spends the colors', () => {
    const { state, events } = cast(withPool(start(), ['pink']), 'mend');
    expect(state.player.hp).toBe(20);
    expect(state.pool).toEqual([]);
    expect(events.some((e) => e.type === 'healed')).toBe(false);
  });

  it('Blood Bloom and Soul Siphon deal damage and heal', () => {
    let s = withPool(withPlayer(start(), { hp: 10 }), ['pink', 'red', 'crimson']);
    s = cast(s, 'bloodBloom').state;
    expect(s.enemies[0]!.hp).toBe(20);
    expect(s.player.hp).toBe(14);
    s = cast(s, 'soulSiphon').state;
    expect(s.enemies[0]!.hp).toBe(13);
    expect(s.player.hp).toBe(17);
  });

  it('Rejuvenate heals and blocks', () => {
    const { state } = cast(withPool(withPlayer(start(), { hp: 10 }), ['pink', 'green']), 'rejuvenate');
    expect(state.player).toMatchObject({ hp: 14, block: 6 });
  });
});

describe('Cleanse', () => {
  const poisoned = (s: BattleState, poison: number, burn: number) => withPlayer(s, { statuses: { poison, burn } });

  it('Purify removes all Poison and Burn, then gives Block', () => {
    const { state, events } = cast(withPool(poisoned(start(), 5, 2), ['white']), 'purify');
    expect(state.player.statuses).toEqual({ poison: 0, burn: 0 });
    expect(state.player.block).toBe(3);
    expect(events).toContainEqual({ type: 'cleansed', target: 'player', poison: 5, burn: 2 });
  });

  it('with nothing to remove, Purify still gives Block and logs no cleanse', () => {
    const { state, events } = cast(withPool(start(), ['white']), 'purify');
    expect(state.player.block).toBe(3);
    expect(events.some((e) => e.type === 'cleansed')).toBe(false);
  });

  it('Radiant Burst removes 1 stack of each and hits every living enemy for 6', () => {
    let s = start({ ...config, enemies: [DUMMY, DUMMY, DUMMY] });
    s = patchEnemy(s, { hp: 0 }, 1);
    s = withPool(poisoned(s, 3, 2), ['white', 'red']);
    const { state, events } = cast(s, 'radiantBurst');
    expect(state.enemies.map((e) => e.hp)).toEqual([24, 0, 24]);
    expect(state.player.statuses).toEqual({ poison: 2, burn: 1 });
    expect(events).toContainEqual({ type: 'cleansed', target: 'player', poison: 1, burn: 1 });
  });

  it('Aegis gives 16 Block when clean, 12 when poisoned or burning', () => {
    expect(cast(withPool(start(), ['white', 'white']), 'aegis').state.player.block).toBe(16);
    expect(cast(withPool(poisoned(start(), 1, 0), ['white', 'white']), 'aegis').state.player.block).toBe(12);
    expect(cast(withPool(poisoned(start(), 0, 1), ['white', 'white']), 'aegis').state.player.block).toBe(12);
  });

  it('effects resolve in order: Purify before Aegis earns the bigger Block', () => {
    let s = withPool(poisoned(start(), 2, 0), ['white', 'white', 'white']);
    s = cast(s, 'purify').state;
    s = cast(s, 'aegis').state;
    expect(s.player.block).toBe(3 + 16);
  });
});

describe('Curse', () => {
  it('adds curseBonus to each hit for the rest of the turn', () => {
    let s = withPool(start(), ['black', 'red', 'red']);
    const hexed = cast(s, 'hex');
    expect(hexed.events).toContainEqual({ type: 'statusApplied', target: 'enemy', enemy: 0, status: 'curse', stacks: 1 });
    s = cast(hexed.state, 'hit').state;
    s = cast(s, 'hit').state;
    expect(s.enemies[0]!.hp).toBe(30 - 8 - 8);
  });

  it('adds curseBonus to Poison and Burn ticks, then clears after the status step', () => {
    let s = patchEnemy(start(), { cursed: true, statuses: { poison: 2, burn: 1 } });
    const { state, events } = endTurn(s);
    const ticks = events.filter((e) => e.type === 'damaged' && e.target === 'enemy').map((e) => e.type === 'damaged' && e.amount);
    expect(ticks).toEqual([2 + 3, 4 + 3]);
    expect(state.enemies[0]!.cursed).toBe(false);
    s = withPool(state, ['red']);
    expect(cast(s, 'hit').state.enemies[0]!.hp).toBe(state.enemies[0]!.hp - 5);
  });

  it('the bonus goes through Block first like normal damage', () => {
    const s = withPool(patchEnemy(start(), { cursed: true, block: 4 }), ['red']);
    expect(cast(s, 'hit').state.enemies[0]).toMatchObject({ block: 0, hp: 30 - 4 });
  });

  it('only the cursed enemy takes the bonus from an area spell', () => {
    let s = start({ ...config, enemies: [DUMMY, DUMMY] });
    s = withPool(patchEnemy(s, { cursed: true }, 1), ['white', 'red']);
    expect(cast(s, 'radiantBurst').state.enemies.map((e) => e.hp)).toEqual([24, 21]);
  });
});

describe('Silence', () => {
  it('Hush makes the enemy skip its next action; its intent still advances', () => {
    const cfg = { ...config, enemies: [{ ...DUMMY, intents: [{ type: 'attack', amount: 6 }, { type: 'block', amount: 9 }] }] } as BattleConfig;
    let s = withPool(start(cfg), ['black', 'blue']);
    s = cast(s, 'hush', undefined, cfg).state;
    expect(s.enemies[0]!.silenced).toBe(true);
    const { state, events } = endTurn(s, cfg);
    expect(state.player.hp).toBe(20);
    expect(events).toContainEqual({ type: 'enemySkipped', enemy: 0, intent: { type: 'attack', amount: 6 } });
    expect(events.some((e) => e.type === 'enemyIntent')).toBe(false);
    expect(state.enemies[0]).toMatchObject({ silenced: false, silenceImmune: true, intentIndex: 1 });
  });

  it("a Silenced enemy's old Block still expires", () => {
    const s = patchEnemy(start(), { silenced: true, block: 7 });
    expect(endTurn(s).state.enemies[0]!.block).toBe(0);
  });

  it('an immune enemy resists Silence; the spell\'s other effects still apply', () => {
    const s = withPool(patchEnemy(start(), { silenceImmune: true }), ['grey']);
    const { state, events } = cast(s, 'eclipse');
    expect(state.enemies[0]!.silenced).toBe(false);
    expect(state.player.block).toBe(8);
    expect(events).toContainEqual({ type: 'silenceResisted', enemy: 0 });
  });

  it('can be applied at most every other turn: immunity ends once the enemy really acts', () => {
    let s = withPool(start(), ['black', 'blue']);
    s = endTurn(cast(s, 'hush').state).state; // turn 1: silenced, skips
    s = withPool(s, ['black', 'blue']);
    s = cast(s, 'hush').state; // turn 2: immune
    expect(s.enemies[0]!.silenced).toBe(false);
    s = endTurn(s).state; // acts: 6 damage, immunity clears
    expect(s.player.hp).toBe(14);
    expect(s.enemies[0]!.silenceImmune).toBe(false);
    s = withPool(s, ['black', 'blue']);
    expect(cast(s, 'hush').state.enemies[0]!.silenced).toBe(true); // turn 3: works again
  });

  it('a Silenced enemy still takes status ticks', () => {
    const s = patchEnemy(start(), { silenced: true, statuses: { poison: 3, burn: 0 } });
    expect(endTurn(s).state.enemies[0]!.hp).toBe(27);
  });

  it('a defeated enemy is never hit by area Silence or Curse', () => {
    const area: BattleConfig = {
      ...config,
      enemies: [DUMMY, DUMMY],
      attacks: [{ id: 'hush-all', name: 'Hush all', cost: { black: 1 }, effects: [{ type: 'silence', area: true }, { type: 'curse', area: true }] }],
    };
    const s = withPool(patchEnemy(start(area), { hp: 0 }, 0), ['black']);
    const { state } = cast(s, 'hush-all', 1, area);
    expect(state.enemies[0]).toMatchObject({ silenced: false, cursed: false });
    expect(state.enemies[1]).toMatchObject({ silenced: true, cursed: true });
  });
});

describe('Chill', () => {
  it("Frostbite deals 5 and halves the enemy's next attack", () => {
    const { state } = cast(withPool(start(), ['frost']), 'frostbite');
    expect(state.enemies[0]).toMatchObject({ hp: 25, chilled: true });
    const after = endTurn(state).state;
    expect(after.player.hp).toBe(20 - 3);
    expect(after.enemies[0]!.chilled).toBe(false);
    expect(endTurn(after).state.player.hp).toBe(17 - 6);
  });

  it('halves every hit of a multi-hit attack, rounded down', () => {
    const cfg = { ...config, enemies: [GNATS] };
    const s = patchEnemy(start(cfg), { chilled: true });
    expect(endTurn(s, cfg).state.player.hp).toBe(20 - 2 - 2);
  });

  it('clears after the next real action even if it was not an attack', () => {
    const cfg = { ...config, enemies: [WALL] };
    const s = patchEnemy(start(cfg), { chilled: true });
    expect(endTurn(s, cfg).state.enemies[0]).toMatchObject({ chilled: false, block: 5 });
  });

  it('a Silenced enemy keeps its Chill for the action it really takes', () => {
    let s = patchEnemy(start(), { chilled: true, silenced: true });
    s = endTurn(s).state;
    expect(s.player.hp).toBe(20);
    expect(s.enemies[0]!.chilled).toBe(true);
    s = endTurn(s).state;
    expect(s.player.hp).toBe(17);
    expect(s.enemies[0]!.chilled).toBe(false);
  });
});

describe('Plague Burst', () => {
  it('adds 2 Poison, then doubles the total', () => {
    const s = withPool(patchEnemy(start(), { statuses: { poison: 3, burn: 0 } }), ['blight']);
    const { state, events } = cast(s, 'plagueBurst');
    expect(state.enemies[0]!.statuses.poison).toBe(10);
    const applied = events.filter((e) => e.type === 'statusApplied').map((e) => e.type === 'statusApplied' && e.stacks);
    expect(applied).toEqual([2, 5]);
  });

  it('on a clean enemy still leaves 4 Poison', () => {
    expect(cast(withPool(start(), ['blight']), 'plagueBurst').state.enemies[0]!.statuses.poison).toBe(4);
  });
});

describe('new fights', () => {
  it('start every enemy free of Curse, Silence, immunity, and Chill', () => {
    for (const enemy of start().enemies) {
      expect(enemy).toMatchObject({ cursed: false, silenced: false, silenceImmune: false, chilled: false });
    }
  });
});
