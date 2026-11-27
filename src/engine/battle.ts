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
  EnemyState,
  Rng,
} from './types';

/** Starts a battle and rolls the first turn's dice. */
export function createBattle(config: BattleConfig, rng: Rng): { state: BattleState; events: BattleEvent[] } {
  const initial: BattleState = {
    turn: 0,
    phase: 'player',
    pool: [],
    player: createCombatant(config.playerMaxHp, config.playerStartHp),
    enemies: config.enemies.map((enemy) => ({ ...createCombatant(enemy.maxHp), intentIndex: 0 })),
  };
  return startPlayerTurn(initial, config, rng);
}

/** Enemy `index`'s next action, shown to the player as its intent. */
export function getEnemyIntent(state: BattleState, config: BattleConfig, index: number): EnemyIntent | undefined {
  const intents = config.enemies[index]?.intents;
  const enemy = state.enemies[index];
  if (!intents || !enemy || intents.length === 0) return undefined;
  return intents[enemy.intentIndex % intents.length];
}

/** Index of the first enemy still standing, or -1 if none. */
export function firstLivingEnemy(state: BattleState): number {
  return state.enemies.findIndex((e) => !isDefeated(e));
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
      return triggerAttack(state, action.attackId, action.target, config);
    case 'endTurn':
      return endTurn(state, config, rng);
  }
}

function triggerAttack(
  state: BattleState,
  attackId: string,
  requested: number | undefined,
  config: BattleConfig,
): ActionResult {
  const attack = config.attacks.find((a) => a.id === attackId);
  if (!attack) return { ok: false, state, error: 'unknown_attack' };
  const target = requested ?? firstLivingEnemy(state);
  const aimed = state.enemies[target];
  if (!aimed || isDefeated(aimed)) return { ok: false, state, error: 'invalid_target' };
  const pool = spendColors(state.pool, attack.cost);
  if (!pool) return { ok: false, state, error: 'missing_colors' };

  let { player, enemies } = state;
  const events: BattleEvent[] = [{ type: 'triggered', attackId, target }];
  for (const effect of attack.effects) {
    const result = applyEffect(effect, player, enemies, target);
    player = result.player;
    enemies = result.enemies;
    events.push(...result.events);
  }
  return { ok: true, state: checkOutcome({ ...state, pool, player, enemies }, events), events };
}

function endTurn(state: BattleState, config: BattleConfig, rng: Rng): ActionResult {
  const events: BattleEvent[] = [];
  let current = state;
  const over = () => current.phase !== 'player';

  // 1. Status effects: each living enemy in order, then the player.
  for (let i = 0; i < current.enemies.length; i++) {
    const enemy = current.enemies[i]!;
    if (isDefeated(enemy)) continue;
    const resolved = resolveStatuses(enemy, 'enemy', config.status, i);
    events.push(...resolved.events);
    current = checkOutcome(withEnemy(current, i, resolved.combatant), events);
    if (over()) return { ok: true, state: current, events };
  }
  const playerStatus = resolveStatuses(current.player, 'player', config.status);
  events.push(...playerStatus.events);
  current = checkOutcome({ ...current, player: playerStatus.combatant }, events);
  if (over()) return { ok: true, state: current, events };

  // 2. Each living enemy acts in order. Its own block lasts until its next action.
  for (let i = 0; i < current.enemies.length; i++) {
    if (isDefeated(current.enemies[i]!)) continue;
    current = withEnemy(current, i, { ...current.enemies[i]!, block: 0 });
    const intent = getEnemyIntent(current, config, i);
    if (!intent) continue;
    events.push({ type: 'enemyIntent', enemy: i, intent });
    current = performIntent(current, i, intent, events);
    const acted = current.enemies[i]!;
    current = withEnemy(current, i, { ...acted, intentIndex: acted.intentIndex + 1 });
    current = checkOutcome(current, events);
    if (over()) return { ok: true, state: current, events };
  }

  // 3. Next player turn.
  const started = startPlayerTurn(current, config, rng);
  return { ok: true, state: started.state, events: [...events, ...started.events] };
}

function performIntent(state: BattleState, index: number, intent: EnemyIntent, events: BattleEvent[]): BattleState {
  switch (intent.type) {
    case 'attack': {
      let player = state.player;
      const hits = Math.max(1, intent.hits ?? 1);
      for (let h = 0; h < hits && !isDefeated(player); h++) {
        const { combatant, blocked, dealt } = takeDamage(player, intent.amount);
        player = combatant;
        events.push({ type: 'damaged', target: 'player', amount: dealt, blocked, source: 'attack' });
      }
      return { ...state, player };
    }
    case 'block':
      events.push({ type: 'blockGained', target: 'enemy', enemy: index, amount: intent.amount });
      return withEnemy(state, index, gainBlock(state.enemies[index]!, intent.amount));
    case 'poison': {
      const { statuses } = state.player;
      events.push({ type: 'statusApplied', target: 'player', status: 'poison', stacks: intent.stacks });
      return { ...state, player: { ...state.player, statuses: { ...statuses, poison: statuses.poison + intent.stacks } } };
    }
    case 'burn':
      events.push({ type: 'statusApplied', target: 'player', status: 'burn', stacks: 1 });
      return { ...state, player: { ...state.player, statuses: { ...state.player.statuses, burn: true } } };
  }
}

function withEnemy(state: BattleState, index: number, enemy: EnemyState): BattleState {
  return { ...state, enemies: state.enemies.map((e, i) => (i === index ? enemy : e)) };
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

/** Sets victory once every enemy is down, or defeat if the player is (enemies checked first), and logs it. */
function checkOutcome(state: BattleState, events: BattleEvent[]): BattleState {
  if (state.enemies.every(isDefeated)) {
    events.push({ type: 'victory' });
    return { ...state, phase: 'victory' };
  }
  if (isDefeated(state.player)) {
    events.push({ type: 'defeat' });
    return { ...state, phase: 'defeat' };
  }
  return state;
}
