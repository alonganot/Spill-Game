import { describe, expect, it } from 'vitest';
import { defaultRunConfig, runConfigFor } from '../data/run';
import { createSeededRng } from './rng';
import { applyRunAction, battleConfigFor, calculateGoldInterest, capUpgradePrice, createRun, repaintPrice, victoryGold } from './run';
import { botAction } from './testBot';
import { fixedDie, noopRng, testConfig } from './testUtils';
import type { EnemyDefinition, RunAction, RunConfig, RunState } from './types';

function enemy(id: string, maxHp = 10): EnemyDefinition {
  return { id, name: id, maxHp, intents: [{ type: 'attack', amount: 3 }] };
}

function testRunConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  const { dice: _dice, enemies: _enemies, ...battle } = testConfig();
  return {
    battle,
    stages: [
      { enemies: [enemy('n1')], kind: 'normal', act: 1 },
      { enemies: [enemy('elite'), enemy('minion', 4)], kind: 'elite', act: 1 },
      { enemies: [enemy('boss')], kind: 'boss', act: 2 },
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
      leftoverColorGold: 2,
      // Off by default so gold totals elsewhere stay simple; the interest tests turn it on.
      interest: { step: 5, max: 0 },
      rewards: { normal: { gold: 15, heal: 5 }, elite: { gold: 25, heal: 9 }, boss: { gold: 40, heal: 12 } },
      upgradeRewardChance: 0.5,
      shop: {
        repaintPrice: 10,
        repaintPriceStep: 5,
        healPrice: 8,
        healAmount: 6,
        capPrice: 20,
        capPriceStep: 10,
        diceForSale: 2,
        spotlightPrice: 5,
        draftPrice: 7,
        draftChoices: 2,
        targetedPrice: 12,
        targetedPriceStep: 3,
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

/** Leaves one enemy at 1 HP (the rest defeated), kills it with a red attack, and returns the finished-fight state. */
function winFight(run: RunState, playerHp?: number): RunState {
  const battle = run.battle!;
  const rigged: RunState = {
    ...run,
    battle: {
      ...battle,
      pool: ['red'],
      enemies: battle.enemies.map((e, i) => ({ ...e, hp: i === 0 ? 1 : 0, block: 0 })),
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

/** Plays from the start to the first shop (after fight 1), taking the gold reward. */
function toFirstShop(): RunState {
  const run = act(winFight(start()), { type: 'continue' });
  return act(run, { type: 'chooseReward', index: 0 });
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
    expect(state.battle?.enemies.map((e) => e.hp)).toEqual([10]);
    expect(events[0]?.type).toBe('rolled');
  });

  it('uses 2 Standard dice and cap 3 in the real data', () => {
    const real = start(defaultRunConfig());
    expect(real.dice.map((d) => d.id)).toEqual(['standard', 'standard']);
    expect(real.diceCap).toBe(3);
  });
});

describe('characters', () => {
  it("a Tank's 42 HP and dice reach the fight", () => {
    const cfg = runConfigFor('tank');
    const run = start(cfg);
    expect(run).toMatchObject({ hp: 42, maxHp: 42 });
    expect(run.battle?.player).toMatchObject({ hp: 42, maxHp: 42 });
    expect(battleConfigFor(run, cfg)).toMatchObject({ playerMaxHp: 42, playerStartHp: 42 });
    expect(battleConfigFor(run, cfg).dice.map((d) => d.id)).toEqual(['lagoon', 'standard']);
  });

  it("each character rolls its own dice in the first fight", () => {
    const demon = createRun(runConfigFor('demon'), createSeededRng(9)).state;
    const healer = createRun(runConfigFor('healer'), createSeededRng(9)).state;
    expect(demon.dice.map((d) => d.id)).toEqual(['standard', 'shade']);
    expect(healer.dice.map((d) => d.id)).toEqual(['standard', 'halo']);
    // Same seed, same roll positions; the second die's faces differ between them.
    const second = (run: RunState) => run.battle!.pool[1];
    expect(['black', 'red', 'green']).toContain(second(demon));
    expect(['white', 'red', 'blue']).toContain(second(healer));
  });

  it('a character run replays exactly from its seed and actions', () => {
    const cfg = runConfigFor('warrior');
    const play = (rng = createSeededRng(77)) => {
      let { state: run } = createRun(cfg, rng);
      const actions: RunAction[] = [];
      for (let i = 0; i < 300 && run.phase !== 'victory' && run.phase !== 'defeat'; i++) {
        const action = botAction(run, cfg);
        const result = applyRunAction(run, action, cfg, rng);
        if (!result.ok) throw new Error(result.error);
        actions.push(action);
        run = result.state;
      }
      return { run, actions };
    };
    const first = play();
    const rng = createSeededRng(77);
    let { state: replayed } = createRun(cfg, rng);
    for (const action of first.actions) {
      const result = applyRunAction(replayed, action, cfg, rng);
      if (!result.ok) throw new Error(result.error);
      replayed = result.state;
    }
    expect(replayed).toEqual(first.run);
    expect(replayed.maxHp).toBe(40);
  });
});

describe('stage progression', () => {
  it('follows every fight but the last with a reward, then a shop', () => {
    const phases: string[] = [];
    let run = start();
    for (let guard = 0; guard < 20 && run.phase !== 'victory'; guard++) {
      phases.push(`${run.phase}:${run.stageIndex}`);
      if (run.phase === 'battle') run = act(winFight(run), { type: 'continue' });
      else if (run.phase === 'reward') run = act(run, { type: 'chooseReward', index: 0 });
      else if (run.phase === 'shop') run = act(run, { type: 'leaveShop' });
    }
    expect(phases).toEqual([
      'battle:0', 'reward:0', 'shop:0', 'battle:1', 'reward:1', 'shop:1', 'battle:2',
    ]);
    expect(run.phase).toBe('victory');
  });

  it('starts a fight with every enemy of its stage', () => {
    const run = act(toFirstShop(), { type: 'leaveShop' });
    expect(run.stageIndex).toBe(1);
    expect(run.battle?.enemies.map((e) => e.hp)).toEqual([10, 4]);
    expect(battleConfigFor(run, config).enemies.map((e) => e.id)).toEqual(['elite', 'minion']);
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
    expect(ok.ok && ok.state.battle?.enemies[0]!.hp).toBe(5);
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
    run = act(act(run, { type: 'chooseReward', index: 0 }), { type: 'leaveShop' });
    expect(run.battle?.player).toMatchObject({ hp: 13, maxHp: 20, block: 0, statuses: { poison: 0, burn: 0 } });
    expect(run.battle?.pool).toEqual(['red', 'blue']);
    expect(battleConfigFor(run, config).playerStartHp).toBe(13);
  });

  it('pays a bonus for every color left in the pool', () => {
    const won = winFight(start());
    const rich: RunState = { ...won, battle: { ...won.battle!, pool: ['red', 'blue', 'green', 'red'] } };
    expect(victoryGold(rich, config)).toMatchObject({ base: 10, leftover: 4, perColor: 2, bonus: 8, interest: 0, total: 18 });
    expect(act(rich, { type: 'continue' }).gold).toBe(18);
    expect(victoryGold(won, config)).toMatchObject({ base: 10, leftover: 0, perColor: 2, bonus: 0, interest: 0, total: 10 });
    const none = testRunConfig({ economy: { ...config.economy, leftoverColorGold: 0 } });
    expect(act(rich, { type: 'continue' }, none).gold).toBe(10);
  });

  it('pays gold per win by fight kind', () => {
    let run = act(winFight(start()), { type: 'continue' });
    expect(run.gold).toBe(10);
    run = act(act(run, { type: 'chooseReward', index: 0 }), { type: 'leaveShop' }); // +15
    run = act(winFight(run), { type: 'continue' }); // elite +20
    expect(run.gold).toBe(45);
  });
});

describe('gold interest', () => {
  const rule = { step: 5, max: 5 };
  const interestConfig = testRunConfig({ economy: { ...config.economy, interest: rule } });

  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [14, 2],
    [18, 3],
    [25, 5],
    [50, 5],
    [999, 5],
    [-10, 0],
  ])('%ig held pays %ig', (gold, interest) => {
    expect(calculateGoldInterest(gold, rule)).toBe(interest);
  });

  it('pays nothing with a zero step or cap', () => {
    expect(calculateGoldInterest(50, { step: 0, max: 5 })).toBe(0);
    expect(calculateGoldInterest(50, { step: 5, max: 0 })).toBe(0);
  });

  it('adds interest on gold held to the victory gold', () => {
    const won = winFight(withGold(start(), 18));
    const painted: RunState = { ...won, battle: { ...won.battle!, pool: ['red', 'blue'] } };
    expect(victoryGold(painted, interestConfig)).toEqual({
      base: 10,
      leftover: 2,
      perColor: 2,
      bonus: 4,
      held: 18,
      interest: 3,
      interestRule: rule,
      total: 17,
    });
    expect(act(painted, { type: 'continue' }, interestConfig).gold).toBe(18 + 17);
  });

  it("counts gold held before the fight's own gold", () => {
    const won = winFight(withGold(start(), 3));
    expect(victoryGold(won, interestConfig)).toMatchObject({ held: 3, interest: 0, total: 10 });
    expect(act(won, { type: 'continue' }, interestConfig).gold).toBe(13);
  });

  it('caps interest however much gold is held', () => {
    const won = winFight(withGold(start(), 200));
    expect(act(won, { type: 'continue' }, interestConfig).gold).toBe(200 + 10 + 5);
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
    let run = act(act(atReward(), { type: 'chooseReward', index: 0 }), { type: 'leaveShop' });
    run = act(winFight(run), { type: 'continue' });
    expect(run.rewardOffers.slice(0, 2)).toEqual([
      { type: 'gold', amount: 25 },
      { type: 'heal', amount: 9 },
    ]);
  });

  it('picking a reward moves on to the shop', () => {
    const run = act(atReward(), { type: 'chooseReward', index: 0 });
    expect(run).toMatchObject({ gold: 25, phase: 'shop', stageIndex: 0, rewardOffers: [], battle: null });
    expect(run.shopStock).toHaveLength(2);
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
    for (const color of ['white', 'black'] as const) {
      const painted = act(run, { type: 'chooseReward', index: 2, repaint: { dieIndex: 0, faceIndex: 0, color } });
      expect(painted.dice[0]?.faces).toEqual([color]);
    }
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

  it('buying a die can replace one of yours, in its place, even with every slot full', () => {
    let run = withGold(toFirstShop(), 200);
    const [first, second] = run.shopStock;
    run = act(run, { type: 'buyDie', offerIndex: 0 }); // 3 / 3 slots
    const before = run.dice;
    run = act(run, { type: 'buyDie', offerIndex: 1, replaceIndex: 0 });
    expect(run.dice).toEqual([second!.die, before[1], first!.die]);
    expect(run.gold).toBe(200 - first!.price - second!.price);
    expect(run.shopStock[1]?.sold).toBe(true);
  });

  it('replacing works with a free slot too, and needs a die at that index', () => {
    const shop = withGold(toFirstShop(), 200);
    const swapped = act(shop, { type: 'buyDie', offerIndex: 0, replaceIndex: 1 });
    expect(swapped.dice).toEqual([shop.dice[0], shop.shopStock[0]!.die]);
    for (const replaceIndex of [2, -1, 0.5]) {
      expect(applyRunAction(shop, { type: 'buyDie', offerIndex: 0, replaceIndex }, config, noopRng)).toMatchObject({
        ok: false,
        error: 'invalid_target',
      });
    }
    expect(
      applyRunAction(withGold(shop, 0), { type: 'buyDie', offerIndex: 0, replaceIndex: 0 }, config, noopRng),
    ).toMatchObject({ error: 'not_enough_gold' });
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
