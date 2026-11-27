import { gainBlock, isDefeated, takeDamage } from './combat';
import type { AttackDefinition, BattleEvent, Combatant, Effect, EnemyState } from './types';

/** Whether an effect hits every living enemy instead of just the target. */
export function isAreaEffect(effect: Effect): boolean {
  return effect.type !== 'block' && effect.area === true;
}

/** Whether a spell has any effect that hits every living enemy. */
export function isAreaSpell(attack: AttackDefinition): boolean {
  return attack.effects.some(isAreaEffect);
}

/**
 * Applies one attack effect. Damage and statuses hit enemy `target`, or every
 * living enemy for an area effect; block goes to the player.
 */
export function applyEffect(
  effect: Effect,
  player: Combatant,
  enemies: readonly EnemyState[],
  target: number,
): { player: Combatant; enemies: EnemyState[]; events: BattleEvent[] } {
  if (effect.type === 'block') {
    return {
      player: gainBlock(player, effect.amount),
      enemies: [...enemies],
      events: [{ type: 'blockGained', target: 'player', amount: effect.amount }],
    };
  }

  const events: BattleEvent[] = [];
  const next = enemies.map((enemy, index) => {
    const hit = isAreaEffect(effect) ? !isDefeated(enemy) : index === target;
    if (!hit) return enemy;
    switch (effect.type) {
      case 'damage': {
        const { combatant, blocked, dealt } = takeDamage(enemy, effect.amount);
        events.push({ type: 'damaged', target: 'enemy', enemy: index, amount: dealt, blocked, source: 'attack' });
        return { ...enemy, ...combatant };
      }
      case 'poison':
        events.push({ type: 'statusApplied', target: 'enemy', enemy: index, status: 'poison', stacks: effect.stacks });
        return { ...enemy, statuses: { ...enemy.statuses, poison: enemy.statuses.poison + effect.stacks } };
      case 'burn':
        events.push({ type: 'statusApplied', target: 'enemy', enemy: index, status: 'burn', stacks: 1 });
        return { ...enemy, statuses: { ...enemy.statuses, burn: true } };
    }
  });
  return { player, enemies: next, events };
}
