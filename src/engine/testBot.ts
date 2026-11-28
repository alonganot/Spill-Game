// A simple greedy bot for simulation tests. Not part of the game.
import { isAreaEffect } from './attacks';
import { attackHitDamage, firstLivingEnemy, getEnemyIntent } from './battle';
import { isDefeated } from './combat';
import { findMixPlan } from './mixing';
import { canAfford } from './pool';
import { battleConfigFor, capUpgradePrice } from './run';
import type {
  AttackDefinition,
  BattleConfig,
  BattleState,
  Color,
  Effect,
  RunAction,
  RunConfig,
  RunState,
  StatusConfig,
} from './types';
import { targetedUpgradePrice, upgradableSpells } from './upgrades';

/** Damage enemy `i` will deal when the turn ends (block ignored, Chill and Silence counted). */
function enemyThreat(state: BattleState, config: BattleConfig, i: number): number {
  const enemy = state.enemies[i]!;
  if (isDefeated(enemy) || enemy.silenced) return 0;
  const intent = getEnemyIntent(state, config, i);
  if (intent?.type !== 'attack') return 0;
  return attackHitDamage(intent.amount, enemy, config) * (intent.hits ?? 1);
}

/** Damage the living enemies will deal when the turn ends (block ignored). */
function incomingDamage(state: BattleState, config: BattleConfig): number {
  return state.enemies.reduce((total, _, i) => total + enemyThreat(state, config, i), 0);
}

/** Rough worth of everything an enemy intent would do to the player (attack damage, poison, burn). */
function intentHarm(state: BattleState, config: BattleConfig, i: number): number {
  const enemy = state.enemies[i]!;
  if (isDefeated(enemy)) return 0;
  const intent = getEnemyIntent(state, config, i);
  if (intent?.type === 'poison') return intent.stacks * 2;
  if (intent?.type === 'burn') return config.status.burnDamage;
  return enemyThreat(state, config, i);
}

/** What 1 gold is worth to the bot, in damage-equivalent points. */
const GOLD_WORTH = 0.5;

/** Rough value of casting `attack` at enemy `target` now. */
function score(attack: AttackDefinition, state: BattleState, config: BattleConfig, target: number): number {
  const { status } = config;
  const living = state.enemies.map((e, i) => ({ e, i })).filter(({ e }) => !isDefeated(e));
  const { player } = state;
  const uncoveredHit = Math.max(0, incomingDamage(state, config) - player.block);
  const afflicted = player.statuses.poison > 0 || player.statuses.burn > 0;
  let value = 0;
  for (const effect of attack.effects) {
    const hit = isAreaEffect(effect) ? living : living.filter(({ i }) => i === target);
    switch (effect.type) {
      case 'damage':
        for (const { e } of hit) value += effect.amount + (e.cursed ? status.curseBonus : 0);
        break;
      case 'poison':
        value += effect.stacks * 2 * hit.length;
        break;
      case 'burn':
        value += status.burnDamage * hit.length;
        break;
      case 'multiplyPoison':
        for (const { e } of hit) value += e.statuses.poison * (effect.factor - 1) * 2;
        break;
      case 'block': {
        const amount = effect.cleanAmount !== undefined && !afflicted ? effect.cleanAmount : effect.amount;
        value += Math.min(amount, uncoveredHit);
        break;
      }
      case 'heal':
        // Worth less than damage at high HP, more when low.
        value += Math.min(effect.amount, player.maxHp - player.hp) * (player.hp < player.maxHp / 2 ? 1.5 : 0.75);
        break;
      case 'cleanse': {
        const limit = effect.stacks ?? Infinity;
        value += Math.min(player.statuses.poison, limit) * 2 + Math.min(player.statuses.burn, limit) * status.burnDamage;
        break;
      }
      case 'curse':
        // Pays off on this turn's status ticks plus one more hit.
        for (const { e } of hit) {
          if (e.cursed) continue;
          const ticks = (e.statuses.poison > 0 ? 1 : 0) + (e.statuses.burn > 0 ? 1 : 0);
          value += status.curseBonus * (ticks + 1);
        }
        break;
      case 'silence':
        for (const { e, i } of hit) {
          if (e.silenced || e.silenceImmune) continue;
          value += Math.min(intentHarm(state, config, i), uncoveredHit + 6);
        }
        break;
      case 'chill':
        for (const { e, i } of hit) {
          if (e.chilled) continue;
          value += Math.min(enemyThreat(state, config, i) * (1 - status.chillMultiplier), uncoveredHit);
        }
        break;
      case 'gold':
        // Gold buys power later, so it is worth less than damage now.
        value += effect.amount * GOLD_WORTH;
        break;
      case 'bounty':
        // Pays only if the enemy dies, which the bot usually manages.
        value += effect.stacks * status.bountyGold * GOLD_WORTH * hit.length;
        break;
    }
  }
  return value;
}

/** The best enemy to aim `attack` at; ties go to the weakest, so the crowd thins out. */
function bestTarget(attack: AttackDefinition, state: BattleState, config: BattleConfig): { target: number; value: number } {
  const living = state.enemies.map((e, i) => ({ e, i })).filter(({ e }) => !isDefeated(e));
  let best = { target: living[0]?.i ?? firstLivingEnemy(state), value: -Infinity, hp: Infinity };
  for (const { e, i } of living) {
    const value = score(attack, state, config, i);
    if (value > best.value || (value === best.value && e.hp < best.hp)) best = { target: i, value, hp: e.hp };
  }
  return { target: best.target, value: best.value };
}

/** A spell one mix away must beat the best ready spell by this factor before the bot mixes for it. */
const MIX_WORTH = 1.5;

function battleAction(state: BattleState, config: BattleConfig): RunAction {
  const ready = config.attacks
    .filter((a) => canAfford(state.pool, a.cost))
    .map((a) => ({ a, ...bestTarget(a, state, config) }))
    .sort((x, y) => y.value - x.value);
  const bestReady = ready[0] && ready[0].value > 0 ? ready[0] : undefined;

  // Spells a mix or two away, best first.
  const craftable = config.attacks
    .map((a) => ({ a, plan: findMixPlan(state.pool, a.cost, config.recipes, 2), value: bestTarget(a, state, config).value }))
    .filter((x) => x.plan && x.plan.length > 0 && x.value > 0)
    .sort((x, y) => y.value - x.value);
  const oneMix = craftable.find((x) => x.plan!.length === 1);

  // Mix first when a spell one mix away is clearly better than anything ready.
  if (oneMix && (!bestReady || oneMix.value > bestReady.value * MIX_WORTH)) {
    return { type: 'battle', action: { type: 'mix', colors: oneMix.plan![0]!.inputs } };
  }
  if (bestReady) {
    return { type: 'battle', action: { type: 'trigger', attackId: bestReady.a.id, target: bestReady.target } };
  }
  // Nothing worth casting: mix toward the best spell two mixes away.
  const mix = craftable[0]?.plan?.[0];
  if (mix) return { type: 'battle', action: { type: 'mix', colors: mix.inputs } };

  return { type: 'battle', action: { type: 'endTurn' } };
}

// ---------- Spell upgrades ----------

/** Rough worth of one cast of these effects, outside any battle (area effects count two enemies). */
function effectsWorth(effects: readonly Effect[], status: StatusConfig): number {
  let value = 0;
  for (const effect of effects) {
    const targets = isAreaEffect(effect) ? 2 : 1;
    switch (effect.type) {
      case 'damage':
        value += effect.amount * targets;
        break;
      case 'block':
        value += (effect.cleanAmount ?? effect.amount) * 0.7;
        break;
      case 'poison':
        value += effect.stacks * 2 * targets;
        break;
      case 'burn':
        value += status.burnDamage * targets;
        break;
      case 'multiplyPoison':
        value += (effect.factor - 1) * 4 * targets;
        break;
      case 'heal':
        value += effect.amount * 0.75;
        break;
      case 'cleanse':
        value += effect.stacks === undefined ? 4 : effect.stacks * 2;
        break;
      case 'curse':
        value += status.curseBonus * 2 * targets;
        break;
      case 'silence':
        value += (effect.noImmunity ? 9 : 6) * targets;
        break;
      case 'chill':
        value += 4 * targets;
        break;
      case 'gold':
        value += effect.amount * GOLD_WORTH;
        break;
      case 'bounty':
        value += effect.stacks * status.bountyGold * GOLD_WORTH * targets;
        break;
    }
  }
  return value;
}

/** How likely a roll of these dice pays `attack`: per needed base color, its expected count per roll (capped at 1), multiplied. */
function castChance(attack: AttackDefinition, run: RunState, cfg: RunConfig): number {
  const expected = (color: Color) =>
    run.dice.reduce((sum, die) => sum + die.faces.filter((f) => f === color).length / die.faces.length, 0);
  const baseColors = (color: Color): Color[] => {
    const recipe = cfg.battle.recipes.find((r) => r.output === color);
    return recipe ? recipe.inputs.flatMap(baseColors) : [color];
  };
  const needed = Object.entries(attack.cost).flatMap(([color, n]) =>
    Array.from({ length: n ?? 0 }, () => baseColors(color as Color)).flat(),
  );
  return needed.reduce((chance, color) => chance * Math.min(1, expected(color)), 1);
}

/** What upgrading `attack` is worth to this run: the extra value per cast, times how often it can be cast. */
function upgradeGain(attack: AttackDefinition, run: RunState, cfg: RunConfig): number {
  if (!attack.upgrade) return 0;
  const { status } = cfg.battle;
  return (effectsWorth(attack.upgrade.effects, status) - effectsWorth(attack.effects, status)) * castChance(attack, run, cfg);
}

/** The spell (by id) worth the most to upgrade among `ids`, with its gain. */
function bestUpgrade(ids: readonly string[], run: RunState, cfg: RunConfig): { id: string; gain: number } | null {
  let best: { id: string; gain: number } | null = null;
  for (const id of ids) {
    const attack = cfg.battle.attacks.find((a) => a.id === id);
    const gain = attack ? upgradeGain(attack, run, cfg) : 0;
    if (!best || gain > best.gain) best = { id, gain };
  }
  return best;
}

/**
 * An upgrade the bot takes only when its gain clears this bar (Targeted needs twice as much).
 * Rewards pay most of a run's gold, so a low bar trades away too much of it: over 1,000 seeds
 * a bar of 1 won 10%, 3 won 14-17%, and never upgrading 21% (Milestone 9, Task 4).
 */
const MIN_UPGRADE_GAIN = 3;
/** Gold the bot keeps after a Draft, since it can't know what the Draft will offer. */
const DRAFT_RESERVE = 20;

/** The shop upgrade the bot wants to buy now, if any. */
function shopUpgradeAction(run: RunState, cfg: RunConfig): RunAction | null {
  const { spotlightPrice, draftPrice } = cfg.economy.shop;
  const { spotlight, spotlightSold, draftSold, targetedSold } = run.shopUpgrades;
  const left = upgradableSpells(run, cfg).map((a) => a.id);
  if (left.length === 0) return null;
  // Dice slots compound, so upgrades only get gold that the next slot doesn't need.
  const reserve = run.diceCap < cfg.maxDiceCap ? capUpgradePrice(run, cfg) : 0;
  const affords = (price: number) => run.gold - price >= reserve;
  if (spotlight && !spotlightSold && left.includes(spotlight) && affords(spotlightPrice)) {
    if ((bestUpgrade([spotlight], run, cfg)?.gain ?? 0) >= MIN_UPGRADE_GAIN) return { type: 'buySpotlightUpgrade' };
  }
  const best = bestUpgrade(left, run, cfg);
  if (!targetedSold && best && best.gain >= MIN_UPGRADE_GAIN * 2 && affords(targetedUpgradePrice(run, cfg))) {
    return { type: 'buyTargetedUpgrade', attackId: best.id };
  }
  if (!draftSold && best && best.gain >= MIN_UPGRADE_GAIN && affords(draftPrice + DRAFT_RESERVE)) {
    return { type: 'buyDraftUpgrade' };
  }
  return null;
}

/**
 * Greedy bot: best spell now (or mix toward one). Rewards: heal when hurt, else a worthwhile
 * upgrade, else gold. Shops: heal when low, then die, cap, upgrades, and heal.
 */
export function botAction(run: RunState, cfg: RunConfig): RunAction {
  if (run.phase === 'battle') {
    const battle = run.battle!;
    if (battle.phase !== 'player') return { type: 'continue' };
    return battleAction(battle, battleConfigFor(run, cfg));
  }
  if (run.phase === 'reward') {
    if (run.hp < run.maxHp / 2) return { type: 'chooseReward', index: 1 };
    const upgrade = run.rewardOffers.findIndex(
      (o) => o.type === 'upgrade' && (bestUpgrade([o.attackId], run, cfg)?.gain ?? 0) >= MIN_UPGRADE_GAIN,
    );
    return { type: 'chooseReward', index: upgrade >= 0 ? upgrade : 0 };
  }
  // Shop: a bought Draft is always picked first.
  const draft = run.shopUpgrades.draftChoices;
  if (draft) return { type: 'pickDraftUpgrade', attackId: bestUpgrade(draft, run, cfg)!.id };
  if (run.hp < run.maxHp * 0.4 && run.gold >= cfg.economy.shop.healPrice) return { type: 'buyHeal' };
  const offer = run.shopStock.findIndex((o) => !o.sold && o.price <= run.gold);
  if (offer >= 0 && run.dice.length < run.diceCap) return { type: 'buyDie', offerIndex: offer };
  if (run.dice.length >= run.diceCap && run.diceCap < cfg.maxDiceCap && capUpgradePrice(run, cfg) <= run.gold) {
    return { type: 'buyCapUpgrade' };
  }
  if (run.hp < run.maxHp && run.gold >= cfg.economy.shop.healPrice) return { type: 'buyHeal' };
  return shopUpgradeAction(run, cfg) ?? { type: 'leaveShop' };
}
