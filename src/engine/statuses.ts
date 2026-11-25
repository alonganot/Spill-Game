import { loseHp } from './combat';
import type { BattleEvent, Combatant, StatusConfig, Target } from './types';

/**
 * Resolves end-of-turn statuses on one combatant:
 * Poison deals damage equal to its stacks, then decays.
 * Burn deals fixed damage, then is cleared.
 */
export function resolveStatuses(
  combatant: Combatant,
  target: Target,
  config: StatusConfig,
): { combatant: Combatant; events: BattleEvent[] } {
  let current = combatant;
  const events: BattleEvent[] = [];

  if (current.statuses.poison > 0) {
    const stacks = current.statuses.poison;
    const { combatant: hit, dealt } = loseHp(current, stacks);
    current = {
      ...hit,
      statuses: { ...hit.statuses, poison: Math.max(0, stacks - config.poisonDecay) },
    };
    events.push({ type: 'damaged', target, amount: dealt, blocked: 0, source: 'poison' });
  }

  if (current.statuses.burn) {
    const { combatant: hit, dealt } = loseHp(current, config.burnDamage);
    current = { ...hit, statuses: { ...hit.statuses, burn: false } };
    events.push({ type: 'damaged', target, amount: dealt, blocked: 0, source: 'burn' });
  }

  return { combatant: current, events };
}
