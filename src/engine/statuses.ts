import { loseHp } from './combat';
import type { BattleEvent, Combatant, StatusConfig, Target } from './types';

/**
 * Resolves end-of-turn statuses on one combatant:
 * Poison deals damage equal to its stacks, then decays.
 * Burn deals `burnDamage` per stack, then every stack is cleared.
 * For an enemy, pass its index so the events say which one was hit.
 * `bonus` is added to each tick (a Cursed enemy takes `curseBonus` more).
 */
export function resolveStatuses<C extends Combatant>(
  combatant: C,
  target: Target,
  config: StatusConfig,
  enemy?: number,
  bonus = 0,
): { combatant: C; events: BattleEvent[] } {
  let current = combatant;
  const who = enemy === undefined ? {} : { enemy };
  const events: BattleEvent[] = [];

  if (current.statuses.poison > 0) {
    const stacks = current.statuses.poison;
    const { combatant: hit, dealt } = loseHp(current, stacks + bonus);
    current = {
      ...current,
      ...hit,
      statuses: { ...hit.statuses, poison: Math.max(0, stacks - config.poisonDecay) },
    };
    events.push({ type: 'damaged', target, ...who, amount: dealt, blocked: 0, source: 'poison' });
  }

  if (current.statuses.burn > 0) {
    const { combatant: hit, dealt } = loseHp(current, config.burnDamage * current.statuses.burn + bonus);
    current = { ...current, ...hit, statuses: { ...hit.statuses, burn: 0 } };
    events.push({ type: 'damaged', target, ...who, amount: dealt, blocked: 0, source: 'burn' });
  }

  return { combatant: current, events };
}
