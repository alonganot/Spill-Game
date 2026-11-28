import type { BattleEvent, BattleState, Color, Combatant, EnemyState, StatusConfig, Statuses } from '../engine';

/** Curse, Silence, Silence Immunity, Chill, and Bounty stacks: only enemies carry them. */
export type Conditions = Pick<EnemyState, 'cursed' | 'silenced' | 'silenceImmune' | 'chilled' | 'bounty'>;

/** The parts of a combatant that change beat by beat during playback. Enemies also carry their Conditions. */
export interface Vitals extends Partial<Conditions> {
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
  /** Gold this action has earned so far, up to and including this beat (Gold spells, Bounty payouts). */
  goldGained: number;
}

function vitals(c: Combatant | EnemyState): Vitals {
  const base = { hp: c.hp, block: c.block, statuses: c.statuses };
  if (!('cursed' in c)) return base;
  return { ...base, cursed: c.cursed, silenced: c.silenced, silenceImmune: c.silenceImmune, chilled: c.chilled, bounty: c.bounty };
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
  let goldGained = 0;
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
          ...v,
          hp: Math.max(0, v.hp - event.amount),
          block: Math.max(0, v.block - event.blocked),
          // A tick uses up its status the way the engine resolves it.
          statuses:
            source === 'poison'
              ? { ...v.statuses, poison: Math.max(0, v.statuses.poison - status.poisonDecay) }
              : source === 'burn'
                ? { ...v.statuses, burn: 0 }
                : v.statuses,
        });
        update(event.target, event.enemy, hit);
        break;
      }
      case 'blockGained':
        update(event.target, event.enemy, (v) => ({ ...v, block: v.block + event.amount }));
        break;
      case 'statusApplied': {
        const { status: applied, stacks } = event;
        if (applied === 'poison' || applied === 'burn') {
          update(event.target, event.enemy, (v) => ({
            ...v,
            statuses: { ...v.statuses, [applied]: v.statuses[applied] + stacks },
          }));
        } else if (applied === 'bounty') {
          update('enemy', event.enemy, (v) => ({ ...v, bounty: (v.bounty ?? 0) + stacks }));
        } else {
          const flag = { curse: 'cursed', silence: 'silenced', chill: 'chilled' } as const;
          update(event.target, event.enemy, (v) => ({ ...v, [flag[applied]]: true }));
        }
        break;
      }
      case 'healed':
        update('player', undefined, (v) => ({ ...v, hp: v.hp + event.amount }));
        break;
      case 'cleansed':
        update('player', undefined, (v) => ({
          ...v,
          statuses: { ...v.statuses, poison: v.statuses.poison - event.poison, burn: v.statuses.burn - event.burn },
        }));
        break;
      case 'silenceResisted':
        break;
      case 'goldGained':
        goldGained += event.amount;
        // A paid Bounty is used up.
        if (event.source === 'bounty') update('enemy', event.enemy, (v) => ({ ...v, bounty: 0 }));
        break;
      case 'enemySkipped':
      case 'enemyIntent':
        // The status step is over once enemies act, so every Curse has cleared.
        enemies = enemies.map((v) => (v.cursed ? { ...v, cursed: false } : v));
        // The enemy's old block expires right before it acts (or skips).
        update('enemy', event.enemy, (v) =>
          event.type === 'enemySkipped'
            ? { ...v, block: 0, silenced: false, silenceImmune: !event.noImmunity }
            : { ...v, block: 0, chilled: false, silenceImmune: false },
        );
        break;
      case 'rolled':
        // A new player turn: player block expires and the dice land in the pool. Any Curse is gone by now.
        player = { ...player, block: 0 };
        enemies = enemies.map((v) => (v.cursed ? { ...v, cursed: false } : v));
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
    steps.push({ event, player, enemies, pool, goldGained });
  }

  const final: Step = {
    event: steps.at(-1)?.event ?? null,
    player: vitals(after.player),
    enemies: after.enemies.map(vitals),
    pool: after.pool,
    goldGained,
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
