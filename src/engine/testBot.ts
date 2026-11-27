// A simple greedy bot for simulation tests. Not part of the game.
import { isAreaEffect } from './attacks';
import { firstLivingEnemy, getEnemyIntent } from './battle';
import { isDefeated } from './combat';
import { findMixPlan } from './mixing';
import { canAfford } from './pool';
import { battleConfigFor, capUpgradePrice } from './run';
import type { AttackDefinition, BattleConfig, BattleState, RunAction, RunConfig, RunState } from './types';

/** Damage the living enemies will deal when the turn ends (block ignored). */
function incomingDamage(state: BattleState, config: BattleConfig): number {
  let total = 0;
  state.enemies.forEach((enemy, i) => {
    if (isDefeated(enemy)) return;
    const intent = getEnemyIntent(state, config, i);
    if (intent?.type === 'attack') total += intent.amount * (intent.hits ?? 1);
  });
  return total;
}

/** Rough value of casting `attack` now. */
function score(attack: AttackDefinition, state: BattleState, config: BattleConfig): number {
  const living = state.enemies.filter((e) => !isDefeated(e)).length;
  const uncoveredHit = Math.max(0, incomingDamage(state, config) - state.player.block);
  let value = 0;
  for (const effect of attack.effects) {
    const targets = isAreaEffect(effect) ? living : 1;
    if (effect.type === 'damage') value += effect.amount * targets;
    else if (effect.type === 'poison') value += effect.stacks * 2 * targets;
    else if (effect.type === 'burn') value += config.status.burnDamage * targets;
    else if (effect.type === 'block') value += Math.min(effect.amount, uncoveredHit);
    // Heal, Cleanse, Curse, Silence, Chill: the bot learns them in Milestone 8, Task 4.
  }
  return value;
}

function battleAction(state: BattleState, config: BattleConfig): RunAction {
  const living = state.enemies.map((e, i) => ({ e, i })).filter(({ e }) => !isDefeated(e));
  // Focus the weakest enemy, so the crowd thins out.
  const target = living.reduce((best, x) => (x.e.hp < best.e.hp ? x : best), living[0] ?? { e: state.enemies[0]!, i: firstLivingEnemy(state) }).i;

  const ready = config.attacks
    .filter((a) => canAfford(state.pool, a.cost))
    .map((a) => ({ a, value: score(a, state, config) }))
    .sort((x, y) => y.value - x.value);
  if (ready[0] && ready[0].value > 0) {
    return { type: 'battle', action: { type: 'trigger', attackId: ready[0].a.id, target } };
  }

  // Nothing worth casting: mix toward the best spell two mixes away.
  const craftable = config.attacks
    .map((a) => ({ a, plan: findMixPlan(state.pool, a.cost, config.recipes, 2), value: score(a, state, config) }))
    .filter((x) => x.plan && x.plan.length > 0 && x.value > 0)
    .sort((x, y) => y.value - x.value);
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
