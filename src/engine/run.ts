import { applyAction, createBattle } from './battle';
import type {
  BattleConfig,
  BattleEvent,
  DieDefinition,
  RepaintTarget,
  RewardOption,
  Rng,
  RunAction,
  RunActionResult,
  RunConfig,
  RunError,
  RunState,
  ShopDieOffer,
  StageDefinition,
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
    purchases: { repaint: 0, cap: 0 },
    battle: null,
    rewardOffers: [],
    shopStock: [],
  };
  return startStage(initial, 0, config, rng);
}

export function currentStage(run: RunState, config: RunConfig): StageDefinition | undefined {
  return config.stages[run.stageIndex];
}

/** Battle config for the current stage: the run's dice, HP, and enemies. */
export function battleConfigFor(run: RunState, config: RunConfig): BattleConfig {
  const stage = currentStage(run, config);
  if (!stage) throw new Error(`No stage at index ${run.stageIndex}`);
  return {
    ...config.battle,
    playerMaxHp: run.maxHp,
    playerStartHp: run.hp,
    dice: run.dice,
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

/** Applies a run action. Invalid actions return the unchanged run and an error. */
export function applyRunAction(run: RunState, action: RunAction, config: RunConfig, rng: Rng): RunActionResult {
  const fail = (error: RunError): RunActionResult => ({ ok: false, state: run, error });
  const done = (state: RunState, events: BattleEvent[] = []): RunActionResult => ({ ok: true, state, events });

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
        gold: run.gold + config.economy.goldPerWin[stage.kind],
        battle: null,
      };
      if (run.stageIndex >= config.stages.length - 1) return done({ ...won, phase: 'victory' });
      return done({ ...won, phase: 'reward', rewardOffers: rewardOffersFor(stage, config) });
    }

    case 'chooseReward': {
      if (run.phase !== 'reward') return fail('wrong_phase');
      const offer = run.rewardOffers[action.index];
      if (!offer) return fail('invalid_target');
      let next: RunState;
      if (offer.type === 'gold') next = { ...run, gold: run.gold + offer.amount };
      else if (offer.type === 'heal') next = heal(run, offer.amount);
      else {
        if (!action.repaint) return fail('invalid_target');
        const dice = repaintDice(run.dice, action.repaint);
        if (!dice) return fail('invalid_target');
        next = { ...run, dice };
      }
      return done({ ...next, phase: 'shop', rewardOffers: [], shopStock: rollShopStock(config, rng) });
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
      if (run.dice.length >= run.diceCap) return fail('dice_cap_reached');
      if (run.gold < offer.price) return fail('not_enough_gold');
      return done({
        ...run,
        gold: run.gold - offer.price,
        dice: [...run.dice, offer.die],
        shopStock: run.shopStock.map((o, i) => (i === action.offerIndex ? { ...o, sold: true } : o)),
      });
    }

    case 'leaveShop': {
      if (run.phase !== 'shop') return fail('wrong_phase');
      const started = startStage({ ...run, shopStock: [] }, run.stageIndex + 1, config, rng);
      return done(started.state, started.events);
    }
  }
}

/** Moves to a stage and starts its fight; past the last stage, the run is won. */
function startStage(run: RunState, stageIndex: number, config: RunConfig, rng: Rng): Started {
  const next: RunState = { ...run, stageIndex };
  if (!currentStage(next, config)) return { state: { ...next, phase: 'victory', battle: null }, events: [] };
  const { state: battle, events } = createBattle(battleConfigFor(next, config), rng);
  return { state: { ...next, phase: 'battle', battle }, events };
}

function rewardOffersFor(stage: StageDefinition, config: RunConfig): RewardOption[] {
  const amounts = config.economy.rewards[stage.kind];
  return [{ type: 'gold', amount: amounts.gold }, { type: 'heal', amount: amounts.heal }, { type: 'repaint' }];
}

/** Picks distinct random dice for sale. */
function rollShopStock(config: RunConfig, rng: Rng): ShopDieOffer[] {
  const pool = [...config.shopDice];
  const count = Math.min(config.economy.shop.diceForSale, pool.length);
  const picked: ShopDieOffer[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
    const [offer] = pool.splice(index, 1);
    picked.push({ ...offer!, sold: false });
  }
  return picked;
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
