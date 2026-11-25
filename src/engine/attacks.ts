import { gainBlock, takeDamage } from './combat';
import type { BattleEvent, Combatant, Effect } from './types';

/** Applies one attack effect. Damage and statuses go to the enemy; block goes to the player. */
export function applyEffect(
  effect: Effect,
  player: Combatant,
  enemy: Combatant,
): { player: Combatant; enemy: Combatant; events: BattleEvent[] } {
  switch (effect.type) {
    case 'damage': {
      const { combatant, blocked, dealt } = takeDamage(enemy, effect.amount);
      return {
        player,
        enemy: combatant,
        events: [{ type: 'damaged', target: 'enemy', amount: dealt, blocked, source: 'attack' }],
      };
    }
    case 'block':
      return {
        player: gainBlock(player, effect.amount),
        enemy,
        events: [{ type: 'blockGained', target: 'player', amount: effect.amount }],
      };
    case 'poison':
      return {
        player,
        enemy: { ...enemy, statuses: { ...enemy.statuses, poison: enemy.statuses.poison + effect.stacks } },
        events: [{ type: 'statusApplied', target: 'enemy', status: 'poison', stacks: effect.stacks }],
      };
    case 'burn':
      return {
        player,
        enemy: { ...enemy, statuses: { ...enemy.statuses, burn: true } },
        events: [{ type: 'statusApplied', target: 'enemy', status: 'burn', stacks: 1 }],
      };
  }
}
