import { applyAction, createBattle } from './battle';
import {
  canUpgrade,
  drawDistinct,
  NO_SHOP_UPGRADES,
  rollShopUpgrades,
  runAttacks,
  targetedUpgradePrice,
  upgradableSpells,
} from './upgrades';
import type {
  BattleConfig,
  BattleEvent,
  DieDefinition,
  InterestRule,
  RepaintTarget,
  RewardOption,
  Rng,
  RunAction,
  RunActionResult,
  RunConfig,
  RunError,
  RunState,
  ShopDieOffer,
  ShopUpgrades,
  StageDefinition,
  VictoryGold,
} from './types';

type Started = { state: RunState; events: BattleEvent[] };

/** Starts a new run at the first fight. */
export function createRun(config: RunConfig, rng: Rng): Started {
  const initial: RunState = {
    stageIndex: 0,
    phase: 'battle',
    hp: config.battle.playerMaxHp,
    maxHp: config.battle.playerMaxHp,
    gold: config.startingGold,
    dice: [...config.startingDice],
    diceCap: config.startingDiceCap,
    purchases: { repaint: 0, cap: 0, upgrade: 0 },
    upgradedSpells: [],
    battle: null,
    rewardOffers: [],
    shopStock: [],
    shopUpgrades: NO_SHOP_UPGRADES,
  };
  return startStage(initial, 0, config, rng);
}

export function currentStage(run: RunState, config: RunConfig): StageDefinition | undefined {
  return config.stages[run.stageIndex];
}

/** Battle config for the current stage: the run's dice, HP, enemies, and spells (`+` forms included). */
export function battleConfigFor(run: RunState, config: RunConfig): BattleConfig {
  const stage = currentStage(run, config);
  if (!stage) throw new Error(`No stage at index ${run.stageIndex}`);
  return {
    ...config.battle,
    playerMaxHp: run.maxHp,
    playerStartHp: run.hp,
    dice: run.dice,
    attacks: runAttacks(run, config),
    enemies: stage.enemies,
  };
}

export function repaintPrice(run: RunState, config: RunConfig): number {
  const { repaintPrice: base, repaintPriceStep: step } = config.economy.shop;
  return base + step * run.purchases.repaint;
}

export function capUpgradePrice(run: RunState, config: RunConfig): number {
  const { capPrice: base, capPriceStep: step } = config.economy.shop;
  return base + step * run.purchases.cap;
}

/** Interest a won fight pays on `gold` held: +1g per `step` gold, capped at `max` (RULES.md §4). */
export function calculateGoldInterest(gold: number, { step, max }: InterestRule): number {
  if (step <= 0) return 0;
  return Math.max(0, Math.min(max, Math.floor(gold / step)));
}

/**
 * What winning the current fight pays: base gold for its kind, a bonus per color left in the pool,
 * and interest on the gold held before this fight's gold is added.
 */
export function victoryGold(run: RunState, config: RunConfig): VictoryGold {
  const stage = currentStage(run, config);
  const base = stage ? config.economy.goldPerWin[stage.kind] : 0;
  const leftover = run.battle?.pool.length ?? 0;
  const perColor = config.economy.leftoverColorGold;
  const bonus = leftover * perColor;
  const interestRule = config.economy.interest;
  const interest = calculateGoldInterest(run.gold, interestRule);
  return { base, leftover, perColor, bonus, held: run.gold, interest, interestRule, total: base + bonus + interest };
}

/** Applies a run action. Invalid actions return the unchanged run and an error. */
export function applyRunAction(run: RunState, action: RunAction, config: RunConfig, rng: Rng): RunActionResult {
  const fail = (error: RunError): RunActionResult => ({ ok: false, state: run, error });
  const done = (state: RunState, events: BattleEvent[] = []): RunActionResult => ({ ok: true, state, events });

  // A bought Draft must be picked before anything else happens in the shop.
  if (run.phase === 'shop' && run.shopUpgrades.draftChoices && action.type !== 'pickDraftUpgrade') {
    return fail('draft_pending');
  }

  switch (action.type) {
    case 'battle': {
      if (run.phase !== 'battle' || !run.battle) return fail('wrong_phase');
      const result = applyAction(run.battle, action.action, battleConfigFor(run, config), rng);
      if (!result.ok) return fail(result.error);
      return done({ ...run, battle: result.state }, result.events);
    }

    case 'continue': {
      if (run.phase !== 'battle' || !run.battle) return fail('wrong_phase');
      const { battle } = run;
      if (battle.phase === 'player') return fail('battle_not_over');
      if (battle.phase === 'defeat') return done({ ...run, phase: 'defeat', hp: 0, battle: null });

      const stage = currentStage(run, config)!;
      const won: RunState = {
        ...run,
        hp: battle.player.hp,
        gold: run.gold + victoryGold(run, config).total,
        battle: null,
      };
      if (run.stageIndex >= config.stages.length - 1) return done({ ...won, phase: 'victory' });
      return done({ ...won, phase: 'reward', rewardOffers: rewardOffersFor(won, stage, config, rng) });
    }

    case 'chooseReward': {
      if (run.phase !== 'reward') return fail('wrong_phase');
      const offer = run.rewardOffers[action.index];
      if (!offer) return fail('invalid_target');
      let next: RunState;
      if (offer.type === 'gold') next = { ...run, gold: run.gold + offer.amount };
      else if (offer.type === 'heal') next = heal(run, offer.amount);
      else if (offer.type === 'upgrade') {
        if (!canUpgrade(run, config, offer.attackId)) return fail('not_upgradable');
        next = upgrade(run, offer.attackId);
      } else {
        if (!action.repaint) return fail('invalid_target');
        const dice = repaintDice(run.dice, action.repaint);
        if (!dice) return fail('invalid_target');
        next = { ...run, dice };
      }
      const shopStock = rollShopStock(config, rng);
      return done({ ...next, phase: 'shop', rewardOffers: [], shopStock, shopUpgrades: rollShopUpgrades(next, config, rng) });
    }

    case 'repaint': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const price = repaintPrice(run, config);
      if (run.gold < price) return fail('not_enough_gold');
      const dice = repaintDice(run.dice, action.target);
      if (!dice) return fail('invalid_target');
      return done({
        ...run,
        dice,
        gold: run.gold - price,
        purchases: { ...run.purchases, repaint: run.purchases.repaint + 1 },
      });
    }

    case 'buyHeal': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const { healPrice, healAmount } = config.economy.shop;
      if (run.hp >= run.maxHp) return fail('already_full_hp');
      if (run.gold < healPrice) return fail('not_enough_gold');
      return done(heal({ ...run, gold: run.gold - healPrice }, healAmount));
    }

    case 'buyCapUpgrade': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      if (run.diceCap >= config.maxDiceCap) return fail('cap_max_reached');
      const price = capUpgradePrice(run, config);
      if (run.gold < price) return fail('not_enough_gold');
      return done({
        ...run,
        diceCap: run.diceCap + 1,
        gold: run.gold - price,
        purchases: { ...run.purchases, cap: run.purchases.cap + 1 },
      });
    }

    case 'buyDie': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const offer = run.shopStock[action.offerIndex];
      if (!offer) return fail('invalid_target');
      if (offer.sold) return fail('sold_out');
      const { replaceIndex } = action;
      const replacing = replaceIndex !== undefined;
      if (replacing && (!Number.isInteger(replaceIndex) || !run.dice[replaceIndex])) return fail('invalid_target');
      if (!replacing && run.dice.length >= run.diceCap) return fail('dice_cap_reached');
      if (run.gold < offer.price) return fail('not_enough_gold');
      return done({
        ...run,
        gold: run.gold - offer.price,
        // A replaced die keeps its place, so the roll order stays the same.
        dice: replacing ? run.dice.map((d, i) => (i === replaceIndex ? offer.die : d)) : [...run.dice, offer.die],
        shopStock: run.shopStock.map((o, i) => (i === action.offerIndex ? { ...o, sold: true } : o)),
      });
    }

    case 'buySpotlightUpgrade': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const { spotlight, spotlightSold } = run.shopUpgrades;
      if (spotlightSold) return fail('sold_out');
      if (!spotlight || !canUpgrade(run, config, spotlight)) return fail('not_upgradable');
      return buyUpgrade(run, config.economy.shop.spotlightPrice, spotlight, { spotlightSold: true });
    }

    case 'buyDraftUpgrade': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      if (run.shopUpgrades.draftSold) return fail('sold_out');
      const spells = upgradableSpells(run, config);
      if (spells.length === 0) return fail('not_upgradable');
      const price = config.economy.shop.draftPrice;
      if (run.gold < price) return fail('not_enough_gold');
      const choices = drawDistinct(spells, config.economy.shop.draftChoices, rng).map((a) => a.id);
      return done({
        ...run,
        gold: run.gold - price,
        shopUpgrades: { ...run.shopUpgrades, draftSold: true, draftChoices: choices },
      });
    }

    case 'pickDraftUpgrade': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const choices = run.shopUpgrades.draftChoices;
      if (!choices) return fail('no_draft_pending');
      if (!choices.includes(action.attackId) || !canUpgrade(run, config, action.attackId)) return fail('invalid_target');
      return done({
        ...upgrade(run, action.attackId),
        purchases: { ...run.purchases, upgrade: run.purchases.upgrade + 1 },
        shopUpgrades: { ...run.shopUpgrades, draftChoices: null },
      });
    }

    case 'buyTargetedUpgrade': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      if (run.shopUpgrades.targetedSold) return fail('sold_out');
      if (!canUpgrade(run, config, action.attackId)) return fail('not_upgradable');
      return buyUpgrade(run, targetedUpgradePrice(run, config), action.attackId, { targetedSold: true });
    }

    case 'leaveShop': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const started = startStage({ ...run, shopStock: [], shopUpgrades: NO_SHOP_UPGRADES }, run.stageIndex + 1, config, rng);
      return done(started.state, started.events);
    }
  }

  /** Pays for a shop upgrade, upgrades the spell, and marks that option sold for this visit. */
  function buyUpgrade(state: RunState, price: number, attackId: string, sold: Partial<ShopUpgrades>): RunActionResult {
    if (state.gold < price) return fail('not_enough_gold');
    return done({
      ...upgrade(state, attackId),
      gold: state.gold - price,
      purchases: { ...state.purchases, upgrade: state.purchases.upgrade + 1 },
      shopUpgrades: { ...state.shopUpgrades, ...sold },
    });
  }
}

/** Moves to a stage and starts its fight; past the last stage, the run is won. */
function startStage(run: RunState, stageIndex: number, config: RunConfig, rng: Rng): Started {
  const next: RunState = { ...run, stageIndex };
  if (!currentStage(next, config)) return { state: { ...next, phase: 'victory', battle: null }, events: [] };
  const { state: battle, events } = createBattle(battleConfigFor(next, config), rng);
  return { state: { ...next, phase: 'battle', battle }, events };
}

/** Gold, Heal, and a third offer: a Free Spell Upgrade (at `upgradeRewardChance`, while a spell is left) or a Free repaint. */
function rewardOffersFor(run: RunState, stage: StageDefinition, config: RunConfig, rng: Rng): RewardOption[] {
  const amounts = config.economy.rewards[stage.kind];
  const offers: RewardOption[] = [{ type: 'gold', amount: amounts.gold }, { type: 'heal', amount: amounts.heal }];
  const spells = upgradableSpells(run, config);
  if (spells.length > 0 && rng() < config.economy.upgradeRewardChance) {
    const [spell] = drawDistinct(spells, 1, rng);
    return [...offers, { type: 'upgrade', attackId: spell!.id }];
  }
  return [...offers, { type: 'repaint' }];
}

/** Picks distinct random dice for sale. */
function rollShopStock(config: RunConfig, rng: Rng): ShopDieOffer[] {
  return drawDistinct(config.shopDice, config.economy.shop.diceForSale, rng).map((offer) => ({ ...offer, sold: false }));
}

function upgrade(run: RunState, attackId: string): RunState {
  return { ...run, upgradedSpells: [...run.upgradedSpells, attackId] };
}

function heal(run: RunState, amount: number): RunState {
  return { ...run, hp: Math.min(run.maxHp, run.hp + amount) };
}

/** Returns new dice with one face repainted, or null if the target is invalid or wouldn't change anything. */
function repaintDice(dice: readonly DieDefinition[], { dieIndex, faceIndex, color }: RepaintTarget): DieDefinition[] | null {
  const die = dice[dieIndex];
  if (!die || faceIndex < 0 || faceIndex >= die.faces.length || die.faces[faceIndex] === color) return null;
  const faces = die.faces.map((f, i) => (i === faceIndex ? color : f));
  return dice.map((d, i) => (i === dieIndex ? { ...d, faces } : d));
}
