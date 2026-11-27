// A simple greedy bot for simulation tests. Not part of the game.
import { isAreaEffect } from './attacks';
import { attackHitDamage, firstLivingEnemy, getEnemyIntent } from './battle';
import { isDefeated } from './combat';
import { findMixPlan } from './mixing';
import { canAfford } from './pool';
import { battleConfigFor, capUpgradePrice } from './run';
import type { AttackDefinition, BattleConfig, BattleState, RunAction, RunConfig, RunState } from './types';

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

/** Greedy bot: best spell now (or mix toward one); in shops buy cap → die → heal; take heal when hurt. */
export function botAction(run: RunState, cfg: RunConfig): RunAction {
  if (run.phase === 'battle') {
    const battle = run.battle!;
    if (battle.phase !== 'player') return { type: 'continue' };
    return battleAction(battle, battleConfigFor(run, cfg));
  }
  if (run.phase === 'reward') return { type: 'chooseReward', index: run.hp < run.maxHp / 2 ? 1 : 0 };
  // shop
  if (run.hp < run.maxHp * 0.4 && run.gold >= cfg.economy.shop.healPrice) return { type: 'buyHeal' };
  const offer = run.shopStock.findIndex((o) => !o.sold && o.price <= run.gold);
  if (offer >= 0 && run.dice.length < run.diceCap) return { type: 'buyDie', offerIndex: offer };
  if (run.dice.length >= run.diceCap && run.diceCap < cfg.maxDiceCap && capUpgradePrice(run, cfg) <= run.gold) {
    return { type: 'buyCapUpgrade' };
  }
  if (run.hp < run.maxHp && run.gold >= cfg.economy.shop.healPrice) return { type: 'buyHeal' };
  return { type: 'leaveShop' };
}
