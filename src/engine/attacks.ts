import { gainBlock, isDefeated, takeDamage } from './combat';
import type { AttackDefinition, BattleEvent, Combatant, Effect, EnemyState, StatusConfig } from './types';

/** Whether an effect hits every living enemy instead of just the target. */
export function isAreaEffect(effect: Effect): boolean {
  return 'area' in effect && effect.area === true;
}

/** Whether a spell has any effect that hits every living enemy. */
export function isAreaSpell(attack: AttackDefinition): boolean {
  return attack.effects.some(isAreaEffect);
}

/** Whether the player has any Poison or Burn. */
function afflicted(player: Combatant): boolean {
  return player.statuses.poison > 0 || player.statuses.burn > 0;
}

type EffectResult = { player: Combatant; enemies: EnemyState[]; events: BattleEvent[] };

/** Block, Heal, and Cleanse: effects on the player. */
function applyToPlayer(
  effect: Extract<Effect, { type: 'block' | 'heal' | 'cleanse' }>,
  player: Combatant,
): { player: Combatant; events: BattleEvent[] } {
  switch (effect.type) {
    case 'block': {
      const amount = effect.cleanAmount !== undefined && !afflicted(player) ? effect.cleanAmount : effect.amount;
      return { player: gainBlock(player, amount), events: [{ type: 'blockGained', target: 'player', amount }] };
    }
    case 'heal': {
      const amount = Math.min(effect.amount, player.maxHp - player.hp);
      if (amount <= 0) return { player, events: [] };
      return { player: { ...player, hp: player.hp + amount }, events: [{ type: 'healed', target: 'player', amount }] };
    }
    case 'cleanse': {
      const { poison, burn } = player.statuses;
      const limit = effect.stacks ?? Infinity;
      const removed = { poison: Math.min(poison, limit), burn: Math.min(burn, limit) };
      if (removed.poison === 0 && removed.burn === 0) return { player, events: [] };
      return {
        player: { ...player, statuses: { ...player.statuses, poison: poison - removed.poison, burn: burn - removed.burn } },
        events: [{ type: 'cleansed', target: 'player', ...removed }],
      };
    }
  }
}

/** One effect on one enemy. */
function applyToEnemy(
  effect: Exclude<Effect, { type: 'block' | 'heal' | 'cleanse' }>,
  enemy: EnemyState,
  index: number,
  status: StatusConfig,
  events: BattleEvent[],
): EnemyState {
  const applied = (s: 'poison' | 'burn' | 'curse' | 'silence' | 'chill', stacks: number) =>
    events.push({ type: 'statusApplied', target: 'enemy', enemy: index, status: s, stacks });
  switch (effect.type) {
    case 'damage': {
      const amount = effect.amount + (enemy.cursed ? status.curseBonus : 0);
      const { combatant, blocked, dealt } = takeDamage(enemy, amount);
      events.push({ type: 'damaged', target: 'enemy', enemy: index, amount: dealt, blocked, source: 'attack' });
      return { ...enemy, ...combatant };
    }
    case 'poison':
      applied('poison', effect.stacks);
      return { ...enemy, statuses: { ...enemy.statuses, poison: enemy.statuses.poison + effect.stacks } };
    case 'burn':
      applied('burn', 1);
      return { ...enemy, statuses: { ...enemy.statuses, burn: enemy.statuses.burn + 1 } };
    case 'multiplyPoison': {
      const poison = enemy.statuses.poison * effect.factor;
      const added = poison - enemy.statuses.poison;
      if (added <= 0) return enemy;
      applied('poison', added);
      return { ...enemy, statuses: { ...enemy.statuses, poison } };
    }
    case 'curse':
      applied('curse', 1);
      return { ...enemy, cursed: true };
    case 'silence':
      if (enemy.silenceImmune) {
        events.push({ type: 'silenceResisted', enemy: index });
        return enemy;
      }
      applied('silence', 1);
      return { ...enemy, silenced: true };
    case 'chill':
      applied('chill', 1);
      return { ...enemy, chilled: true };
  }
}

/**
 * Applies one attack effect. Enemy effects hit enemy `target`, or every living
 * enemy for an area effect; Block, Heal, and Cleanse go to the player.
 */
export function applyEffect(
  effect: Effect,
  player: Combatant,
  enemies: readonly EnemyState[],
  target: number,
  status: StatusConfig,
): EffectResult {
  if (effect.type === 'block' || effect.type === 'heal' || effect.type === 'cleanse') {
    return { ...applyToPlayer(effect, player), enemies: [...enemies] };
  }

  const events: BattleEvent[] = [];
  const next = enemies.map((enemy, index) => {
    const hit = isAreaEffect(effect) ? !isDefeated(enemy) : index === target;
    return hit ? applyToEnemy(effect, enemy, index, status, events) : enemy;
  });
  return { player, enemies: next, events };
}
