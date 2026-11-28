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

/** The enemies a spell aimed at `target` would Silence: the target, or every living enemy for an area Silence. */
function silenceTargets(attack: AttackDefinition, enemies: readonly EnemyState[], target: number): EnemyState[] {
  const silence = attack.effects.find((e) => e.type === 'silence');
  if (!silence) return [];
  if (isAreaEffect(silence)) return enemies.filter((e) => !isDefeated(e));
  const aimed = enemies[target];
  return aimed ? [aimed] : [];
}

/** Whether a spell Silences, and every enemy it would Silence is immune (RULES.md §2). */
export function silenceResisted(attack: AttackDefinition, enemies: readonly EnemyState[], target: number): boolean {
  const aimed = silenceTargets(attack, enemies, target);
  return aimed.length > 0 && aimed.every((e) => e.silenceImmune);
}

/**
 * Whether casting would do nothing: a spell whose only effect is Silence (Hush),
 * aimed only at enemies immune to Silence. Spells with other effects (Eclipse's
 * Block) can still be cast; their Silence is just resisted.
 */
export function silenceWasted(attack: AttackDefinition, enemies: readonly EnemyState[], target: number): boolean {
  return attack.effects.every((e) => e.type === 'silence') && silenceResisted(attack, enemies, target);
}

/** Whether the player has any Poison or Burn. */
function afflicted(player: Combatant): boolean {
  return player.statuses.poison > 0 || player.statuses.burn > 0;
}

type EffectResult = { player: Combatant; enemies: EnemyState[]; events: BattleEvent[] };

type PlayerEffect = Extract<Effect, { type: 'block' | 'heal' | 'cleanse' | 'gold' }>;

function isPlayerEffect(effect: Effect): effect is PlayerEffect {
  return effect.type === 'block' || effect.type === 'heal' || effect.type === 'cleanse' || effect.type === 'gold';
}

/**
 * Pays enemy `index`'s Bounty if it was alive before and is defeated after:
 * a `goldGained` event, and its stacks are cleared so it can never pay twice.
 */
export function payBounty(
  before: EnemyState,
  after: EnemyState,
  index: number,
  status: StatusConfig,
  events: BattleEvent[],
): EnemyState {
  if (isDefeated(before) || !isDefeated(after) || after.bounty <= 0) return after;
  const amount = after.bounty * status.bountyGold;
  if (amount > 0) events.push({ type: 'goldGained', amount, source: 'bounty', enemy: index });
  return { ...after, bounty: 0 };
}

/** Block, Heal, Cleanse, and Gold: effects on the player (Gold goes to the run's purse). */
function applyToPlayer(
  effect: PlayerEffect,
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
    case 'gold':
      return { player, events: effect.amount > 0 ? [{ type: 'goldGained', amount: effect.amount, source: 'spell' }] : [] };
  }
}

/** One effect on one enemy. */
function applyToEnemy(
  effect: Exclude<Effect, PlayerEffect>,
  enemy: EnemyState,
  index: number,
  status: StatusConfig,
  events: BattleEvent[],
): EnemyState {
  const applied = (s: 'poison' | 'burn' | 'bounty' | 'curse' | 'silence' | 'chill', stacks: number) =>
    events.push({ type: 'statusApplied', target: 'enemy', enemy: index, status: s, stacks });
  switch (effect.type) {
    case 'damage': {
      const amount = effect.amount + (enemy.cursed ? status.curseBonus : 0);
      const { combatant, blocked, dealt } = takeDamage(enemy, amount);
      events.push({ type: 'damaged', target: 'enemy', enemy: index, amount: dealt, blocked, source: 'attack' });
      return payBounty(enemy, { ...enemy, ...combatant }, index, status, events);
    }
    case 'bounty':
      applied('bounty', effect.stacks);
      return { ...enemy, bounty: enemy.bounty + effect.stacks };
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
      // A plain Silence on an enemy Hush+ already silenced keeps Hush+'s promise of no immunity.
      return {
        ...enemy,
        silenced: true,
        silenceNoImmunity: effect.noImmunity === true || (enemy.silenced && enemy.silenceNoImmunity),
      };
    case 'chill':
      applied('chill', 1);
      return { ...enemy, chilled: true };
  }
}

/**
 * Applies one attack effect. Enemy effects hit enemy `target`, or every living
 * enemy for an area effect; Block, Heal, Cleanse, and Gold go to the player.
 * A hit that defeats an enemy with Bounty pays it out (`goldGained`).
 */
export function applyEffect(
  effect: Effect,
  player: Combatant,
  enemies: readonly EnemyState[],
  target: number,
  status: StatusConfig,
): EffectResult {
  if (isPlayerEffect(effect)) {
    return { ...applyToPlayer(effect, player), enemies: [...enemies] };
  }

  const events: BattleEvent[] = [];
  const next = enemies.map((enemy, index) => {
    const hit = isAreaEffect(effect) ? !isDefeated(enemy) : index === target;
    return hit ? applyToEnemy(effect, enemy, index, status, events) : enemy;
  });
  return { player, enemies: next, events };
}
