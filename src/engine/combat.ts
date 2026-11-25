import type { Combatant } from './types';

/** Damage hits block first, then HP. */
export function takeDamage(
  target: Combatant,
  amount: number,
): { combatant: Combatant; blocked: number; dealt: number } {
  const blocked = Math.min(target.block, amount);
  const dealt = Math.min(target.hp, amount - blocked);
  return {
    combatant: { ...target, block: target.block - blocked, hp: target.hp - dealt },
    blocked,
    dealt,
  };
}

/** Status damage ignores block. */
export function loseHp(target: Combatant, amount: number): { combatant: Combatant; dealt: number } {
  const dealt = Math.min(target.hp, amount);
  return { combatant: { ...target, hp: target.hp - dealt }, dealt };
}

export function gainBlock(target: Combatant, amount: number): Combatant {
  return { ...target, block: target.block + amount };
}

export function isDefeated(c: Combatant): boolean {
  return c.hp <= 0;
}

/** Starting HP is clamped to [1, maxHp] so a combatant never starts a battle already defeated. */
export function createCombatant(maxHp: number, hp: number = maxHp): Combatant {
  return { hp: Math.max(1, Math.min(hp, maxHp)), maxHp, block: 0, statuses: { poison: 0, burn: false } };
}
