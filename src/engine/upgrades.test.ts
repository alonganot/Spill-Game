import { describe, expect, it } from 'vitest';
import { STARTING_ATTACKS } from '../data/attacks';
import { defaultRunConfig } from '../data/run';
import { applyAction, createBattle } from './battle';
import { createSeededRng } from './rng';
import { applyRunAction, battleConfigFor, createRun } from './run';
import { DUMMY, noopRng, sequenceRng, testConfig } from './testUtils';
import { drawDistinct, targetedUpgradePrice, upgradableSpells, upgradeAttack } from './upgrades';
import type { BattleConfig, BattleState, EnemyDefinition, Rng, RunAction, RunConfig, RunState } from './types';

const weak = (id: string): EnemyDefinition => ({ id, name: id, maxHp: 5, intents: [{ type: 'attack', amount: 1 }] });

/** The real spells and economy, with three short fights. */
const config: RunConfig = {
  ...defaultRunConfig(),
  stages: [
    { enemies: [weak('a')], kind: 'normal', act: 1 },
    { enemies: [weak('b')], kind: 'normal', act: 1 },
    { enemies: [weak('c')], kind: 'boss', act: 1 },
  ],
};
const ALL = STARTING_ATTACKS.length;

function act(run: RunState, action: RunAction, rng: Rng = noopRng): RunState {
  const result = applyRunAction(run, action, config, rng);
  if (!result.ok) throw new Error(`Run action failed: ${result.error}`);
  return result.state;
}

function attempt(run: RunState, action: RunAction, rng: Rng = noopRng) {
  return applyRunAction(run, action, config, rng);
}

/** Wins the current fight by casting Ember on a 1 HP enemy. */
function winFight(run: RunState): RunState {
  const battle = run.battle!;
  const rigged: RunState = {
    ...run,
    battle: { ...battle, pool: ['red'], enemies: battle.enemies.map((e) => ({ ...e, hp: 1, block: 0 })) },
  };
  return act(rigged, { type: 'battle', action: { type: 'trigger', attackId: 'ember' } });
}

/** Plays to the first reward; `rng` decides the offers. */
function toReward(rng: Rng = noopRng): RunState {
  return act(winFight(createRun(config, noopRng).state), { type: 'continue' }, rng);
}

/** Plays to the first shop with plenty of gold. */
function toShop(rng: Rng = noopRng): RunState {
  const run = act(toReward(), { type: 'chooseReward', index: 0 }, rng);
  return { ...run, gold: 500 };
}

describe('upgradeAttack', () => {
  it('names the + form, keeps the cost, and keeps the base effects for display', () => {
    const inferno = STARTING_ATTACKS.find((a) => a.id === 'inferno')!;
    const plus = upgradeAttack(inferno);
    expect(plus).toMatchObject({ id: 'inferno', name: 'Inferno+', cost: inferno.cost, upgraded: true });
    expect(plus.effects).toEqual(inferno.upgrade!.effects);
    expect(plus.baseEffects).toEqual(inferno.effects);
    expect(upgradeAttack(plus)).toBe(plus);
  });

  it('leaves a spell without an upgrade as it is', () => {
    const plain = testConfig().attacks[0]!;
    expect(upgradeAttack(plain)).toBe(plain);
  });
});

describe('drawDistinct', () => {
  it('draws distinct items, at most as many as there are', () => {
    expect(drawDistinct([1, 2, 3], 2, sequenceRng([0.99, 0]))).toEqual([3, 1]);
    expect(drawDistinct([1, 2], 5, noopRng)).toEqual([1, 2]);
  });
});

describe('battles use upgraded spells', () => {
  it('the run starts with no upgrades; battleConfigFor swaps in the + form', () => {
    const run = createRun(config, noopRng).state;
    expect(run.upgradedSpells).toEqual([]);
    const upgraded = { ...run, upgradedSpells: ['ember'] };
    const ember = battleConfigFor(upgraded, config).attacks.find((a) => a.id === 'ember')!;
    expect(ember.name).toBe('Ember+');
    expect(ember.cost).toEqual({ red: 1 });
    const battle = {
      ...upgraded.battle!,
      pool: ['red' as const],
      enemies: upgraded.battle!.enemies.map((e) => ({ ...e, hp: 10, maxHp: 10 })),
    };
    const result = attempt({ ...upgraded, battle }, { type: 'battle', action: { type: 'trigger', attackId: 'ember' } });
    expect(result.ok && result.state.battle!.enemies[0]!.hp).toBe(10 - 6);
  });
});

describe('Free Spell Upgrade reward', () => {
  it('a low roll offers an upgrade of a named spell instead of the repaint', () => {
    // 0 → upgrade (0 < 0.5), then 0 → the first upgradable spell.
    const run = toReward(sequenceRng([0]));
    expect(run.rewardOffers[2]).toEqual({ type: 'upgrade', attackId: 'ember' });
    const after = act(run, { type: 'chooseReward', index: 2 });
    expect(after.upgradedSpells).toEqual(['ember']);
    expect(after.purchases.upgrade).toBe(0);
  });

  it('a high roll keeps the repaint', () => {
    expect(toReward(sequenceRng([0.9]))!.rewardOffers[2]).toEqual({ type: 'repaint' });
  });

  it('never names an upgraded spell, and is a repaint once none are left', () => {
    let run = winFight(createRun(config, noopRng).state);
    run = { ...run, upgradedSpells: ['ember'] };
    expect(act(run, { type: 'continue' }, sequenceRng([0]))!.rewardOffers[2]).toEqual({ type: 'upgrade', attackId: 'ripple' });
    const allDone = { ...run, upgradedSpells: STARTING_ATTACKS.map((a) => a.id) };
    expect(act(allDone, { type: 'continue' }, sequenceRng([0]))!.rewardOffers[2]).toEqual({ type: 'repaint' });
  });
});

describe('shop upgrades', () => {
  it('draws a Spotlight spell on arrival, never the one just upgraded', () => {
    const reward = toReward(sequenceRng([0]));
    // Ember is upgraded by the reward; the Spotlight draw (rng 0) picks the next spell.
    const shop = act(reward, { type: 'chooseReward', index: 2 }, noopRng);
    expect(shop.shopUpgrades).toEqual({
      spotlight: 'ripple',
      spotlightSold: false,
      draftSold: false,
      targetedSold: false,
      draftChoices: null,
    });
  });

  it('Spotlight upgrades its spell for its price, once per visit', () => {
    const shop = toShop();
    const spot = shop.shopUpgrades.spotlight!;
    const bought = act(shop, { type: 'buySpotlightUpgrade' });
    expect(bought.upgradedSpells).toEqual([spot]);
    expect(bought.gold).toBe(500 - config.economy.shop.spotlightPrice);
    expect(bought.purchases.upgrade).toBe(1);
    expect(attempt(bought, { type: 'buySpotlightUpgrade' })).toMatchObject({ ok: false, error: 'sold_out' });
  });

  it('Spotlight fails without gold, or when its spell is already upgraded', () => {
    const shop = toShop();
    expect(attempt({ ...shop, gold: 0 }, { type: 'buySpotlightUpgrade' })).toMatchObject({ error: 'not_enough_gold' });
    const already = { ...shop, upgradedSpells: [shop.shopUpgrades.spotlight!] };
    expect(attempt(already, { type: 'buySpotlightUpgrade' })).toMatchObject({ error: 'not_upgradable' });
  });

  it('Draft pays first, draws distinct spells, and must be picked before leaving', () => {
    const shop = toShop();
    const drafted = act(shop, { type: 'buyDraftUpgrade' }, sequenceRng([0.5, 0.5, 0.5]));
    const choices = drafted.shopUpgrades.draftChoices!;
    expect(choices).toHaveLength(config.economy.shop.draftChoices);
    expect(new Set(choices).size).toBe(choices.length);
    expect(drafted.gold).toBe(500 - config.economy.shop.draftPrice);
    expect(drafted.upgradedSpells).toEqual([]);

    expect(attempt(drafted, { type: 'leaveShop' })).toMatchObject({ ok: false, error: 'draft_pending' });
    // Nothing else can happen in the shop until the pick, so the drawn spells can't be upgraded another way.
    for (const action of [
      { type: 'buySpotlightUpgrade' },
      { type: 'buyTargetedUpgrade', attackId: choices[0]! },
      { type: 'buyHeal' },
      { type: 'buyCapUpgrade' },
      { type: 'buyDie', offerIndex: 0 },
    ] as RunAction[]) {
      expect(attempt(drafted, action), action.type).toMatchObject({ ok: false, error: 'draft_pending' });
    }
    const notDrawn = STARTING_ATTACKS.find((a) => !choices.includes(a.id))!.id;
    expect(attempt(drafted, { type: 'pickDraftUpgrade', attackId: notDrawn })).toMatchObject({ error: 'invalid_target' });

    const picked = act(drafted, { type: 'pickDraftUpgrade', attackId: choices[1]! });
    expect(picked.upgradedSpells).toEqual([choices[1]]);
    expect(picked.shopUpgrades.draftChoices).toBeNull();
    expect(picked.purchases.upgrade).toBe(1);
    expect(attempt(picked, { type: 'buyDraftUpgrade' })).toMatchObject({ error: 'sold_out' });
    expect(act(picked, { type: 'leaveShop' }).phase).toBe('battle');
  });

  it('a Draft pick needs a pending Draft; a Draft needs gold', () => {
    const shop = toShop();
    expect(attempt(shop, { type: 'pickDraftUpgrade', attackId: 'ember' })).toMatchObject({ error: 'no_draft_pending' });
    expect(attempt({ ...shop, gold: 0 }, { type: 'buyDraftUpgrade' })).toMatchObject({ error: 'not_enough_gold' });
  });

  it('Draft draws fewer when fewer spells are left', () => {
    const shop = { ...toShop(), upgradedSpells: STARTING_ATTACKS.slice(1).map((a) => a.id) };
    expect(act(shop, { type: 'buyDraftUpgrade' }).shopUpgrades.draftChoices).toEqual([STARTING_ATTACKS[0]!.id]);
  });

  it('Targeted upgrades any spell; its price rises with bought upgrades only', () => {
    const shop = toShop();
    const base = config.economy.shop.targetedPrice;
    const step = config.economy.shop.targetedPriceStep;
    expect(targetedUpgradePrice(shop, config)).toBe(base);
    // A free reward upgrade doesn't raise it.
    expect(targetedUpgradePrice({ ...shop, upgradedSpells: ['ember'] }, config)).toBe(base);
    const afterSpot = act(shop, { type: 'buySpotlightUpgrade' });
    expect(targetedUpgradePrice(afterSpot, config)).toBe(base + step);

    const bought = act(afterSpot, { type: 'buyTargetedUpgrade', attackId: 'prism' });
    expect(bought.upgradedSpells).toContain('prism');
    expect(bought.gold).toBe(afterSpot.gold - base - step);
    expect(attempt(bought, { type: 'buyTargetedUpgrade', attackId: 'hex' })).toMatchObject({ error: 'sold_out' });
  });

  it('each spell upgrades once per run; unknown spells cannot be upgraded', () => {
    const shop = { ...toShop(), upgradedSpells: ['prism'] };
    expect(attempt(shop, { type: 'buyTargetedUpgrade', attackId: 'prism' })).toMatchObject({ error: 'not_upgradable' });
    expect(attempt(shop, { type: 'buyTargetedUpgrade', attackId: 'nope' })).toMatchObject({ error: 'not_upgradable' });
  });

  it('with every spell upgraded there is no Spotlight and no Draft', () => {
    const run = { ...toReward(), upgradedSpells: STARTING_ATTACKS.map((a) => a.id) };
    const shop = { ...act(run, { type: 'chooseReward', index: 0 }), gold: 500 };
    expect(shop.shopUpgrades.spotlight).toBeNull();
    expect(upgradableSpells(shop, config)).toHaveLength(0);
    expect(attempt(shop, { type: 'buySpotlightUpgrade' })).toMatchObject({ error: 'not_upgradable' });
    expect(attempt(shop, { type: 'buyDraftUpgrade' })).toMatchObject({ error: 'not_upgradable' });
  });

  it('the options reset on the next shop visit', () => {
    let run = act(toShop(), { type: 'buySpotlightUpgrade' });
    run = act(run, { type: 'leaveShop' });
    run = act(winFight(run), { type: 'continue' }, sequenceRng([0.9]));
    run = act(run, { type: 'chooseReward', index: 0 });
    expect(run.shopUpgrades.spotlightSold).toBe(false);
    expect(run.upgradedSpells).toHaveLength(1);
    expect(upgradableSpells(run, config)).toHaveLength(ALL - 1);
  });

  it('a seeded run replays the same offers and draws', () => {
    function play(seed: number) {
      const rng = createSeededRng(seed);
      let run = act(winFight(createRun(config, rng).state), { type: 'continue' }, rng);
      const offers = run.rewardOffers;
      run = { ...act(run, { type: 'chooseReward', index: 0 }, rng), gold: 500 };
      run = act(run, { type: 'buyDraftUpgrade' }, rng);
      return { offers, shop: run.shopUpgrades };
    }
    expect(play(7)).toEqual(play(7));
  });
});

describe('upgraded battle effects', () => {
  function battleWith(ids: string[], enemies: EnemyDefinition[]): { cfg: BattleConfig; state: BattleState } {
    const attacks = STARTING_ATTACKS.map((a) => (ids.includes(a.id) ? upgradeAttack(a) : a));
    const cfg = testConfig({ attacks, enemies });
    return { cfg, state: createBattle(cfg, noopRng).state };
  }
  const run = (state: BattleState, cfg: BattleConfig, action: Parameters<typeof applyAction>[1]) => {
    const result = applyAction(state, action, cfg, noopRng);
    if (!result.ok) throw new Error(result.error);
    return result.state;
  };

  it('Hex+ curses every living enemy', () => {
    const { cfg, state } = battleWith(['hex'], [DUMMY, DUMMY, DUMMY]);
    const after = run({ ...state, pool: ['black'] }, cfg, { type: 'trigger', attackId: 'hex' });
    expect(after.enemies.map((e) => e.cursed)).toEqual([true, true, true]);
  });

  it('Hush+ leaves no Silence Immunity, so the enemy can be silenced again right away', () => {
    const { cfg, state } = battleWith(['hush'], [DUMMY]);
    let s = run({ ...state, pool: ['black', 'blue'] }, cfg, { type: 'trigger', attackId: 'hush' });
    expect(s.enemies[0]).toMatchObject({ silenced: true, silenceNoImmunity: true });
    const result = applyAction(s, { type: 'endTurn' }, cfg, noopRng);
    expect(result.ok && result.events).toContainEqual({
      type: 'enemySkipped',
      enemy: 0,
      intent: DUMMY.intents[0],
      noImmunity: true,
    });
    s = result.state;
    expect(s.enemies[0]).toMatchObject({ silenced: false, silenceImmune: false, silenceNoImmunity: false });
    s = run({ ...s, pool: ['black', 'blue'] }, cfg, { type: 'trigger', attackId: 'hush' });
    expect(s.enemies[0]!.silenced).toBe(true);
  });

  it('a plain Silence after Hush+ keeps the no-immunity', () => {
    const { cfg, state } = battleWith(['hush'], [DUMMY]);
    let s = run({ ...state, pool: ['black', 'blue'] }, cfg, { type: 'trigger', attackId: 'hush' });
    s = run({ ...s, pool: ['grey'] }, cfg, { type: 'trigger', attackId: 'eclipse' });
    expect(s.enemies[0]).toMatchObject({ silenced: true, silenceNoImmunity: true });
    const after = applyAction(s, { type: 'endTurn' }, cfg, noopRng).state;
    expect(after.enemies[0]!.silenceImmune).toBe(false);
  });

  it('Inferno+ adds two Burn stacks', () => {
    const { cfg, state } = battleWith(['inferno'], [DUMMY]);
    const after = run({ ...state, pool: ['red', 'red'] }, cfg, { type: 'trigger', attackId: 'inferno' });
    expect(after.enemies[0]).toMatchObject({ hp: 30 - 8, statuses: { burn: 2 } });
  });
});
