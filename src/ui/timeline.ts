import type { BattleEvent, BattleState, Color, Combatant, StatusConfig, Statuses } from '../engine';

/** The parts of a combatant that change beat by beat during playback. */
export interface Vitals {
  hp: number;
  block: number;
  statuses: Statuses;
}

/** One beat of playback: an event and what the screen shows while it plays. */
export interface Step {
  /** Null only for an action that produced no events. */
  event: BattleEvent | null;
  player: Vitals;
  /** One per enemy, same order as `BattleState.enemies`. */
  enemies: Vitals[];
  pool: readonly Color[];
}

function vitals(c: Combatant): Vitals {
  return { hp: c.hp, block: c.block, statuses: c.statuses };
}

/**
 * Splits one action's events into beats, replaying HP, block, status, and pool
 * changes forward from `before`. The last beat always matches `after` exactly.
 * `status` is the battle's status config, so poison decays as the engine does.
 */
export function buildTimeline(
  before: BattleState,
  events: readonly BattleEvent[],
  after: BattleState,
  status: StatusConfig,
): Step[] {
  let player = vitals(before.player);
  let enemies = before.enemies.map(vitals);
  let pool: readonly Color[] = before.pool;
  const steps: Step[] = [];
  /** Applies `change` to the player, or to the enemy the event names. */
  const update = (target: 'player' | 'enemy', index: number | undefined, change: (v: Vitals) => Vitals) => {
    if (target === 'player') player = change(player);
    else enemies = enemies.map((v, i) => (i === index ? change(v) : v));
  };

  for (const event of events) {
    switch (event.type) {
      case 'damaged': {
        const { source } = event;
        const hit = (v: Vitals): Vitals => ({
          hp: Math.max(0, v.hp - event.amount),
          block: Math.max(0, v.block - event.blocked),
          // A tick uses up its status the way the engine resolves it.
          statuses:
            source === 'poison'
              ? { ...v.statuses, poison: Math.max(0, v.statuses.poison - status.poisonDecay) }
              : source === 'burn'
                ? { ...v.statuses, burn: false }
                : v.statuses,
        });
        update(event.target, event.enemy, hit);
        break;
      }
      case 'blockGained':
        update(event.target, event.enemy, (v) => ({ ...v, block: v.block + event.amount }));
        break;
      case 'statusApplied': {
        const apply = (v: Vitals): Vitals => ({
          ...v,
          statuses:
            event.status === 'poison'
              ? { ...v.statuses, poison: v.statuses.poison + event.stacks }
              : { ...v.statuses, burn: true },
        });
        update(event.target, event.enemy, apply);
        break;
      }
      case 'enemyIntent':
        // The enemy's old block expires right before it acts.
        update('enemy', event.enemy, (v) => ({ ...v, block: 0 }));
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
      case 'victory':
      case 'defeat':
        break;
    }
    steps.push({ event, player, enemies, pool });
  }

  const final: Step = {
    event: steps.at(-1)?.event ?? null,
    player: vitals(after.player),
    enemies: after.enemies.map(vitals),
    pool: after.pool,
  };
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
