import { applyEffect } from './attacks';
import { createCombatant, gainBlock, isDefeated, takeDamage } from './combat';
import { rollDice } from './dice';
import { mixColors } from './mixing';
import { addToPool, spendColors } from './pool';
import { resolveStatuses } from './statuses';
import type {
  ActionResult,
  BattleAction,
  BattleConfig,
  BattleEvent,
  BattleState,
  EnemyIntent,
  Rng,
} from './types';

/** Starts a battle and rolls the first turn's dice. */
export function createBattle(config: BattleConfig, rng: Rng): { state: BattleState; events: BattleEvent[] } {
  const initial: BattleState = {
    turn: 0,
    phase: 'player',
    pool: [],
    player: createCombatant(config.playerMaxHp),
    enemy: createCombatant(config.enemy.maxHp),
    enemyIntentIndex: 0,
  };
  return startPlayerTurn(initial, config, rng);
}

/** The enemy's next action, shown to the player as its intent. */
export function getEnemyIntent(state: BattleState, config: BattleConfig): EnemyIntent | undefined {
  const { intents } = config.enemy;
  if (intents.length === 0) return undefined;
  return intents[state.enemyIntentIndex % intents.length];
}

/** Applies a player action. Invalid actions return the unchanged state and an error. */
export function applyAction(
  state: BattleState,
  action: BattleAction,
  config: BattleConfig,
  rng: Rng,
): ActionResult {
  if (state.phase !== 'player') return { ok: false, state, error: 'battle_over' };

  switch (action.type) {
    case 'mix': {
      const [a, b] = action.colors;
      const result = mixColors(state.pool, config.recipes, a, b);
      if (!result.ok) return { ok: false, state, error: result.error };
      return {
        ok: true,
        state: { ...state, pool: result.pool },
        events: [{ type: 'mixed', inputs: action.colors, output: result.output }],
      };
    }
    case 'trigger':
      return triggerAttack(state, action.attackId, config);
    case 'endTurn':
      return endTurn(state, config, rng);
  }
}

function triggerAttack(state: BattleState, attackId: string, config: BattleConfig): ActionResult {
  const attack = config.attacks.find((a) => a.id === attackId);
  if (!attack) return { ok: false, state, error: 'unknown_attack' };
  const pool = spendColors(state.pool, attack.cost);
  if (!pool) return { ok: false, state, error: 'missing_colors' };

  let { player, enemy } = state;
  const events: BattleEvent[] = [{ type: 'triggered', attackId }];
  for (const effect of attack.effects) {
    const result = applyEffect(effect, player, enemy);
    player = result.player;
    enemy = result.enemy;
    events.push(...result.events);
  }

  return { ok: true, state: checkOutcome({ ...state, pool, player, enemy }, events), events };
}

function endTurn(state: BattleState, config: BattleConfig, rng: Rng): ActionResult {
  const events: BattleEvent[] = [];
  let current = state;

  // 1. Status effects (enemy, then player).
  const enemyStatus = resolveStatuses(current.enemy, 'enemy', config.status);
  events.push(...enemyStatus.events);
  current = checkOutcome({ ...current, enemy: enemyStatus.combatant }, events);
  if (current.phase !== 'player') return { ok: true, state: current, events };

  const playerStatus = resolveStatuses(current.player, 'player', config.status);
  events.push(...playerStatus.events);
  current = checkOutcome({ ...current, player: playerStatus.combatant }, events);
  if (current.phase !== 'player') return { ok: true, state: current, events };

  // 2. Enemy action. The enemy's own block lasts until its next action.
  current = { ...current, enemy: { ...current.enemy, block: 0 } };
  const intent = getEnemyIntent(current, config);
  if (intent) {
    events.push({ type: 'enemyIntent', intent });
    if (intent.type === 'attack') {
      const { combatant, blocked, dealt } = takeDamage(current.player, intent.amount);
      current = { ...current, player: combatant };
      events.push({ type: 'damaged', target: 'player', amount: dealt, blocked, source: 'attack' });
    } else {
      current = { ...current, enemy: gainBlock(current.enemy, intent.amount) };
      events.push({ type: 'blockGained', target: 'enemy', amount: intent.amount });
    }
    current = { ...current, enemyIntentIndex: current.enemyIntentIndex + 1 };
  }
  current = checkOutcome(current, events);
  if (current.phase !== 'player') return { ok: true, state: current, events };

  // 3. Next player turn.
  const started = startPlayerTurn(current, config, rng);
  return { ok: true, state: started.state, events: [...events, ...started.events] };
}

/** Player block expires at the start of their turn; then dice are rolled into the pool. */
function startPlayerTurn(
  state: BattleState,
  config: BattleConfig,
  rng: Rng,
): { state: BattleState; events: BattleEvent[] } {
  const rolled = rollDice(config.dice, rng);
  const { pool, discarded } = addToPool(state.pool, rolled, config.maxPoolSize);
  return {
    state: { ...state, turn: state.turn + 1, pool, player: { ...state.player, block: 0 } },
    events: [{ type: 'rolled', colors: rolled, discarded }],
  };
}

/** Sets victory/defeat if either side is down (enemy checked first) and logs it. */
function checkOutcome(state: BattleState, events: BattleEvent[]): BattleState {
  if (isDefeated(state.enemy)) {
    events.push({ type: 'victory' });
    return { ...state, phase: 'victory' };
  }
  if (isDefeated(state.player)) {
    events.push({ type: 'defeat' });
    return { ...state, phase: 'defeat' };
  }
  return state;
}
