import { describe, expect, it } from 'vitest';
import { defaultRunConfig } from '../data/run';
import { createSeededRng } from './rng';
import { applyRunAction, battleConfigFor, capUpgradePrice, createRun, repaintPrice } from './run';
import { fixedDie, noopRng, testConfig } from './testUtils';
import type { EnemyDefinition, RunAction, RunConfig, RunState } from './types';

function enemy(id: string, maxHp = 10): EnemyDefinition {
  return { id, name: id, maxHp, intents: [{ type: 'attack', amount: 3 }] };
}

function testRunConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  const { dice: _dice, enemy: _enemy, ...battle } = testConfig();
  return {
    battle,
    stages: [
      { enemy: enemy('n1'), kind: 'normal', after: 'reward' },
      { enemy: enemy('n2'), kind: 'normal', after: 'shop' },
      { enemy: enemy('elite'), kind: 'elite', after: 'reward' },
      { enemy: enemy('n3'), kind: 'normal', after: 'shop' },
      { enemy: enemy('boss'), kind: 'boss', after: 'end' },
    ],
    startingDice: [fixedDie('red'), fixedDie('blue')],
    startingGold: 0,
    startingDiceCap: 3,
    maxDiceCap: 4,
    shopDice: [
      { die: fixedDie('green'), price: 30 },
      { die: { id: 'mixed', name: 'Mixed', faces: ['red', 'blue'] }, price: 40 },
      { die: fixedDie('red'), price: 50 },
    ],
    economy: {
      goldPerWin: { normal: 10, elite: 20, boss: 0 },
      rewards: { normal: { gold: 15, heal: 5 }, elite: { gold: 25, heal: 9 } },
      shop: {
        repaintPrice: 10,
        repaintPriceStep: 5,
        healPrice: 8,
        healAmount: 6,
        capPrice: 20,
        capPriceStep: 10,
        diceForSale: 2,
      },
    },
    ...overrides,
  };
}

const config = testRunConfig();

function act(run: RunState, action: RunAction, cfg: RunConfig = config): RunState {
  const result = applyRunAction(run, action, cfg, noopRng);
  if (!result.ok) throw new Error(`Run action failed: ${result.error}`);
  return result.state;
}

/** Sets the enemy to 1 HP, kills it with a red attack, and returns the finished-fight state. */
function winFight(run: RunState, playerHp?: number): RunState {
  const battle = run.battle!;
  const rigged: RunState = {
    ...run,
    battle: {
      ...battle,
      pool: ['red'],
      enemy: { ...battle.enemy, hp: 1, block: 0 },
      player: { ...battle.player, hp: playerHp ?? battle.player.hp },
    },
  };
  const won = act(rigged, { type: 'battle', action: { type: 'trigger', attackId: 'hit' } });
  expect(won.battle?.phase).toBe('victory');
  return won;
}

function start(cfg: RunConfig = config): RunState {
  return createRun(cfg, noopRng).state;
}

/** Plays from the start to the first shop (stage 2), taking the gold reward. */
function toFirstShop(): RunState {
  let run = act(winFight(start()), { type: 'continue' });
  run = act(run, { type: 'chooseReward', index: 0 });
  return act(winFight(run), { type: 'continue' });
}

function withGold(run: RunState, gold: number): RunState {
  return { ...run, gold };
}

describe('createRun', () => {
  it('starts fight 1 with starting dice, full HP, and no gold', () => {
    const { state, events } = createRun(config, noopRng);
    expect(state).toMatchObject({ stageIndex: 0, phase: 'battle', hp: 20, gold: 0, diceCap: 3 });
    expect(state.dice).toHaveLength(2);
    expect(state.battle?.pool).toEqual(['red', 'blue']);
    expect(state.battle?.enemy.hp).toBe(10);
    expect(events[0]?.type).toBe('rolled');
  });

  it('uses 2 Standard dice and cap 3 in the real data', () => {
    const real = start(defaultRunConfig());
    expect(real.dice.map((d) => d.id)).toEqual(['standard', 'standard']);
    expect(real.diceCap).toBe(3);
  });
});

describe('stage progression', () => {
  it('follows Fight → Reward → Fight → Shop → Elite → Reward → Fight → Shop → Boss → victory', () => {
    const phases: string[] = [];
    let run = start();
    for (let guard = 0; guard < 20 && run.phase !== 'victory'; guard++) {
      phases.push(`${run.phase}:${run.stageIndex}`);
      if (run.phase === 'battle') run = act(winFight(run), { type: 'continue' });
      else if (run.phase === 'reward') run = act(run, { type: 'chooseReward', index: 0 });
      else if (run.phase === 'shop') run = act(run, { type: 'leaveShop' });
    }
    expect(phases).toEqual([
      'battle:0', 'reward:0', 'battle:1', 'shop:1', 'battle:2', 'reward:2', 'battle:3', 'shop:3', 'battle:4',
    ]);
    expect(run.phase).toBe('victory');
  });

  it('cannot continue while the fight is still going', () => {
    expect(applyRunAction(start(), { type: 'continue' }, config, noopRng)).toMatchObject({
      ok: false,
      error: 'battle_not_over',
    });
  });

  it('passes battle actions through and keeps battle errors', () => {
    const run = start();
    const ok = applyRunAction(run, { type: 'battle', action: { type: 'trigger', attackId: 'hit' } }, config, noopRng);
    expect(ok.ok && ok.state.battle?.enemy.hp).toBe(5);
    const bad = applyRunAction(run, { type: 'battle', action: { type: 'trigger', attackId: 'scorch' } }, config, noopRng);
    expect(bad).toMatchObject({ ok: false, error: 'missing_colors', state: run });
  });

  it('losing a fight ends the run', () => {
    const run = start();
    const dying: RunState = { ...run, battle: { ...run.battle!, player: { ...run.battle!.player, hp: 1 } } };
    const lost = act(dying, { type: 'battle', action: { type: 'endTurn' } });
    expect(lost.battle?.phase).toBe('defeat');
    expect(act(lost, { type: 'continue' })).toMatchObject({ phase: 'defeat', hp: 0, battle: null });
  });

  it('rejects actions from the wrong phase', () => {
    const run = start();
    for (const action of [
      { type: 'chooseReward', index: 0 },
      { type: 'buyHeal' },
      { type: 'leaveShop' },
      { type: 'buyDie', offerIndex: 0 },
    ] as RunAction[]) {
      expect(applyRunAction(run, action, config, noopRng)).toMatchObject({ ok: false, error: 'wrong_phase' });
    }
    const shop = toFirstShop();
    expect(applyRunAction(shop, { type: 'continue' }, config, noopRng)).toMatchObject({ error: 'wrong_phase' });
    expect(applyRunAction(shop, { type: 'battle', action: { type: 'endTurn' } }, config, noopRng)).toMatchObject({
      error: 'wrong_phase',
    });
  });
});

describe('HP and gold between fights', () => {
  it('carries HP into the next fight and resets block, statuses, and pool', () => {
    let run = winFight(start(), 13);
    run = act(run, { type: 'continue' });
    expect(run.hp).toBe(13);
    run = act(run, { type: 'chooseReward', index: 0 });
    expect(run.battle?.player).toMatchObject({ hp: 13, maxHp: 20, block: 0, statuses: { poison: 0, burn: false } });
    expect(run.battle?.pool).toEqual(['red', 'blue']);
    expect(battleConfigFor(run, config).playerStartHp).toBe(13);
  });

  it('pays gold per win by fight kind', () => {
    let run = act(winFight(start()), { type: 'continue' });
    expect(run.gold).toBe(10);
    run = act(run, { type: 'chooseReward', index: 0 }); // +15
    run = act(act(winFight(run), { type: 'continue' }), { type: 'leaveShop' }); // +10
    run = act(winFight(run), { type: 'continue' }); // elite +20
    expect(run.gold).toBe(55);
  });
});

describe('rewards', () => {
  const atReward = () => act(winFight(start(), 10), { type: 'continue' });

  it('offers gold, heal, and repaint with normal amounts', () => {
    expect(atReward().rewardOffers).toEqual([
      { type: 'gold', amount: 15 },
      { type: 'heal', amount: 5 },
      { type: 'repaint' },
    ]);
  });

  it('gives bigger amounts after an elite', () => {
    let run = act(atReward(), { type: 'chooseReward', index: 0 });
    run = act(act(winFight(run), { type: 'continue' }), { type: 'leaveShop' });
    run = act(winFight(run), { type: 'continue' });
    expect(run.rewardOffers.slice(0, 2)).toEqual([
      { type: 'gold', amount: 25 },
      { type: 'heal', amount: 9 },
    ]);
  });

  it('gold reward adds gold and starts the next fight', () => {
    const run = act(atReward(), { type: 'chooseReward', index: 0 });
    expect(run).toMatchObject({ gold: 25, phase: 'battle', stageIndex: 1, rewardOffers: [] });
  });

  it('heal reward restores HP but not above max', () => {
    expect(act(atReward(), { type: 'chooseReward', index: 1 }).hp).toBe(15);
    const nearlyFull = act(winFight(start(), 18), { type: 'continue' });
    expect(act(nearlyFull, { type: 'chooseReward', index: 1 }).hp).toBe(20);
  });

  it('free repaint changes one face and needs a valid target', () => {
    const run = atReward();
    const repainted = act(run, { type: 'chooseReward', index: 2, repaint: { dieIndex: 0, faceIndex: 0, color: 'green' } });
    expect(repainted.dice[0]?.faces).toEqual(['green']);
    expect(repainted.gold).toBe(10);
    for (const repaint of [
      undefined,
      { dieIndex: 5, faceIndex: 0, color: 'green' },
      { dieIndex: 0, faceIndex: 3, color: 'green' },
      { dieIndex: 0, faceIndex: 0, color: 'red' }, // already red
    ] as const) {
      expect(applyRunAction(run, { type: 'chooseReward', index: 2, repaint }, config, noopRng)).toMatchObject({
        ok: false,
        error: 'invalid_target',
      });
    }
    expect(applyRunAction(run, { type: 'chooseReward', index: 9 }, config, noopRng)).toMatchObject({
      error: 'invalid_target',
    });
  });
});

describe('shop', () => {
  it('stocks 2 distinct dice', () => {
    const stock = toFirstShop().shopStock;
    expect(stock).toHaveLength(2);
    expect(new Set(stock.map((o) => o.die.id)).size).toBe(2);
    expect(stock.every((o) => !o.sold)).toBe(true);
  });

  it('repaint costs gold, rises in price, and only edits the chosen face', () => {
    let run = withGold(toFirstShop(), 100);
    expect(repaintPrice(run, config)).toBe(10);
    run = act(run, { type: 'repaint', target: { dieIndex: 1, faceIndex: 0, color: 'red' } });
    expect(run.dice.map((d) => d.faces)).toEqual([['red'], ['red']]);
    expect(run.gold).toBe(90);
    expect(repaintPrice(run, config)).toBe(15);
    run = act(run, { type: 'repaint', target: { dieIndex: 1, faceIndex: 0, color: 'green' } });
    expect(run.gold).toBe(75);
  });

  it('repaint fails without enough gold or with a bad target', () => {
    const shop = toFirstShop();
    const target = { dieIndex: 0, faceIndex: 0, color: 'green' } as const;
    expect(applyRunAction(withGold(shop, 9), { type: 'repaint', target }, config, noopRng)).toMatchObject({
      error: 'not_enough_gold',
    });
    expect(
      applyRunAction(withGold(shop, 99), { type: 'repaint', target: { ...target, color: 'red' } }, config, noopRng),
    ).toMatchObject({ error: 'invalid_target' });
  });

  it('heal costs gold, caps at max HP, and is refused at full HP', () => {
    const shop: RunState = { ...withGold(toFirstShop(), 20), hp: 17 };
    const healed = act(shop, { type: 'buyHeal' });
    expect(healed).toMatchObject({ hp: 20, gold: 12 });
    expect(applyRunAction(healed, { type: 'buyHeal' }, config, noopRng)).toMatchObject({ error: 'already_full_hp' });
    expect(applyRunAction({ ...shop, gold: 7 }, { type: 'buyHeal' }, config, noopRng)).toMatchObject({
      error: 'not_enough_gold',
    });
  });

  it('cap upgrades rise in price and stop at the max cap', () => {
    let run = withGold(toFirstShop(), 100);
    expect(capUpgradePrice(run, config)).toBe(20);
    run = act(run, { type: 'buyCapUpgrade' });
    expect(run).toMatchObject({ diceCap: 4, gold: 80 });
    expect(capUpgradePrice(run, config)).toBe(30);
    expect(applyRunAction(run, { type: 'buyCapUpgrade' }, config, noopRng)).toMatchObject({ error: 'cap_max_reached' });
    expect(applyRunAction(withGold(toFirstShop(), 19), { type: 'buyCapUpgrade' }, config, noopRng)).toMatchObject({
      error: 'not_enough_gold',
    });
  });

  it('buying a die adds it, marks it sold, and respects the cap', () => {
    let run = withGold(toFirstShop(), 200);
    const [first, second] = run.shopStock;
    run = act(run, { type: 'buyDie', offerIndex: 0 });
    expect(run.dice).toHaveLength(3);
    expect(run.dice[2]).toEqual(first!.die);
    expect(run.gold).toBe(200 - first!.price);
    expect(run.shopStock[0]?.sold).toBe(true);
    expect(applyRunAction(run, { type: 'buyDie', offerIndex: 0 }, config, noopRng)).toMatchObject({ error: 'sold_out' });
    expect(applyRunAction(run, { type: 'buyDie', offerIndex: 1 }, config, noopRng)).toMatchObject({
      error: 'dice_cap_reached',
    });
    run = act(run, { type: 'buyCapUpgrade' });
    run = act(run, { type: 'buyDie', offerIndex: 1 });
    expect(run.dice[3]).toEqual(second!.die);
  });

  it('buying a die fails without enough gold or a bad offer index', () => {
    const shop = withGold(toFirstShop(), 0);
    expect(applyRunAction(shop, { type: 'buyDie', offerIndex: 0 }, config, noopRng)).toMatchObject({
      error: 'not_enough_gold',
    });
    expect(applyRunAction(shop, { type: 'buyDie', offerIndex: 5 }, config, noopRng)).toMatchObject({
      error: 'invalid_target',
    });
  });

  it('bought and repainted dice roll in the next fight', () => {
    let run = withGold(toFirstShop(), 200);
    run = act(run, { type: 'repaint', target: { dieIndex: 0, faceIndex: 0, color: 'green' } });
    run = act(run, { type: 'buyDie', offerIndex: 0 });
    run = act(run, { type: 'leaveShop' });
    expect(run.phase).toBe('battle');
    expect(run.battle?.pool).toEqual(['green', 'blue', run.dice[2]!.faces[0]]);
  });
});

describe('determinism and simulation', () => {
  it('the same seed gives the same run', () => {
    const play = () => {
      const cfg = defaultRunConfig();
      const rng = createSeededRng(123);
      let { state } = createRun(cfg, rng);
      state = applyRunAction(state, { type: 'battle', action: { type: 'endTurn' } }, cfg, rng).state;
      return state;
    };
    expect(play()).toEqual(play());
  });

  it('a simple bot plays full runs with the real data without errors', () => {
    const cfg = defaultRunConfig();
    const outcomes: string[] = [];
    const furthestStage: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createSeededRng(seed);
      let { state: run } = createRun(cfg, rng);
      let furthest = 0;
      for (let guard = 0; guard < 2000 && run.phase !== 'victory' && run.phase !== 'defeat'; guard++) {
        const action = botAction(run, cfg);
        const result = applyRunAction(run, action, cfg, rng);
        expect(result.ok, `seed ${seed}: ${JSON.stringify(action)}`).toBe(true);
        run = result.state;
        expect(run.dice.length).toBeLessThanOrEqual(run.diceCap);
        expect(run.diceCap).toBeLessThanOrEqual(cfg.maxDiceCap);
        expect(run.gold).toBeGreaterThanOrEqual(0);
        furthest = Math.max(furthest, run.stageIndex);
      }
      expect(['victory', 'defeat']).toContain(run.phase);
      outcomes.push(run.phase);
      furthestStage.push(furthest);
    }
    // Catches broken stage order or degenerate data, not exact balance.
    expect(furthestStage.every((s) => s >= 1), 'every run should get past the first fight').toBe(true);
    expect(furthestStage).toContain(cfg.stages.length - 1);
    expect(outcomes).toContain('victory');
  });
});

/** Greedy bot: attack when possible; in shops buy cap → die → heal; take heal when hurt. */
function botAction(run: RunState, cfg: RunConfig): RunAction {
  if (run.phase === 'battle') {
    const battle = run.battle!;
    if (battle.phase !== 'player') return { type: 'continue' };
    const bc = battleConfigFor(run, cfg);
    const attack = bc.attacks.find((a) =>
      Object.entries(a.cost).every(([c, n]) => battle.pool.filter((p) => p === c).length >= (n ?? 0)),
    );
    return attack ? { type: 'battle', action: { type: 'trigger', attackId: attack.id } } : { type: 'battle', action: { type: 'endTurn' } };
  }
  if (run.phase === 'reward') return { type: 'chooseReward', index: run.hp < run.maxHp / 2 ? 1 : 0 };
  // shop
  const offer = run.shopStock.findIndex((o) => !o.sold && o.price <= run.gold);
  if (offer >= 0 && run.dice.length < run.diceCap) return { type: 'buyDie', offerIndex: offer };
  if (run.dice.length >= run.diceCap && run.diceCap < cfg.maxDiceCap && capUpgradePrice(run, cfg) <= run.gold) {
    return { type: 'buyCapUpgrade' };
  }
  if (run.hp < run.maxHp && run.gold >= cfg.economy.shop.healPrice) return { type: 'buyHeal' };
  return { type: 'leaveShop' };
}
