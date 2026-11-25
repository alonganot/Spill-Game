import type { BattleEvent, BattleState, Color, Combatant } from '../engine';

/** The parts of a combatant that change beat by beat during playback. */
export interface Vitals {
  hp: number;
  block: number;
}

/** One beat of playback: an event and what the screen shows while it plays. */
export interface Step {
  /** Null only for an action that produced no events. */
  event: BattleEvent | null;
  player: Vitals;
  enemy: Vitals;
  pool: readonly Color[];
}

function vitals(c: Combatant): Vitals {
  return { hp: c.hp, block: c.block };
}

/**
 * Splits one action's events into beats, replaying HP, block, and pool changes
 * forward from `before`. The last beat always matches `after` exactly.
 */
export function buildTimeline(before: BattleState, events: readonly BattleEvent[], after: BattleState): Step[] {
  let player = vitals(before.player);
  let enemy = vitals(before.enemy);
  let pool: readonly Color[] = before.pool;
  const steps: Step[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'damaged': {
        const hit = (v: Vitals): Vitals => ({
          hp: Math.max(0, v.hp - event.amount),
          block: Math.max(0, v.block - event.blocked),
        });
        if (event.target === 'player') player = hit(player);
        else enemy = hit(enemy);
        break;
      }
      case 'blockGained':
        if (event.target === 'player') player = { ...player, block: player.block + event.amount };
        else enemy = { ...enemy, block: enemy.block + event.amount };
        break;
      case 'enemyIntent':
        // The enemy's old block expires right before it acts.
        enemy = { ...enemy, block: 0 };
        break;
      case 'rolled':
        // A new player turn: player block expires and the dice land in the pool.
        player = { ...player, block: 0 };
        pool = after.pool;
        break;
      case 'mixed':
      case 'triggered':
        // Mixing and attacking change the pool once, at the start of the action.
        pool = after.pool;
        break;
      case 'statusApplied':
      case 'victory':
      case 'defeat':
        break;
    }
    steps.push({ event, player, enemy, pool });
  }

  const final: Step = { event: steps.at(-1)?.event ?? null, player: vitals(after.player), enemy: vitals(after.enemy), pool: after.pool };
  if (steps.length === 0) return [final];
  steps[steps.length - 1] = final;
  return steps;
}

/**
 * The state just before a fresh battle's opening roll, so the first turn's
 * dice can play back too: same combatants, minus the colors that roll added.
 */
export function beforeOpeningRoll(after: BattleState, events: readonly BattleEvent[]): BattleState {
  const roll = events.find((e) => e.type === 'rolled');
  if (!roll) return after;
  const added = roll.colors.length - roll.discarded.length;
  return { ...after, pool: after.pool.slice(0, Math.max(0, after.pool.length - added)) };
}
