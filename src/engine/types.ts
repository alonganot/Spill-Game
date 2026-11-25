// Core engine types. Values for these shapes live in `src/data/`.

export type BaseColor = 'red' | 'blue' | 'green';
export type SecondaryColor = 'purple' | 'cyan' | 'orange';
export type Color = BaseColor | SecondaryColor;

/** Returns a float in [0, 1). Injected so rolls are deterministic in tests. */
export type Rng = () => number;

export interface DieDefinition {
  id: string;
  faces: readonly BaseColor[];
}

export interface MixRecipe {
  inputs: readonly [Color, Color];
  output: Color;
}

/** How many of each color an attack consumes, e.g. `{ red: 2 }`. */
export type ColorCost = Partial<Record<Color, number>>;

export type Effect =
  | { type: 'damage'; amount: number }
  | { type: 'block'; amount: number }
  | { type: 'poison'; stacks: number }
  | { type: 'burn' };

export interface AttackDefinition {
  id: string;
  name: string;
  cost: ColorCost;
  effects: readonly Effect[];
}

export type EnemyIntent =
  | { type: 'attack'; amount: number }
  | { type: 'block'; amount: number };

export interface EnemyDefinition {
  id: string;
  name: string;
  maxHp: number;
  /** Intents are performed in order and loop. */
  intents: readonly EnemyIntent[];
}

export interface StatusConfig {
  /** Fixed damage dealt by Burn when it resolves (then Burn is cleared). */
  burnDamage: number;
  /** Poison stacks removed after each tick. */
  poisonDecay: number;
}

export interface BattleConfig {
  maxPoolSize: number;
  playerMaxHp: number;
  dice: readonly DieDefinition[];
  recipes: readonly MixRecipe[];
  /** Attacks the player can trigger this battle. */
  attacks: readonly AttackDefinition[];
  status: StatusConfig;
  enemy: EnemyDefinition;
}

export interface Statuses {
  poison: number;
  burn: boolean;
}

export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
}

export type BattlePhase = 'player' | 'victory' | 'defeat';

export interface BattleState {
  turn: number;
  phase: BattlePhase;
  pool: Color[];
  player: Combatant;
  enemy: Combatant;
  enemyIntentIndex: number;
}

export type BattleAction =
  | { type: 'mix'; colors: readonly [Color, Color] }
  | { type: 'trigger'; attackId: string }
  | { type: 'endTurn' };

export type Target = 'player' | 'enemy';

export type BattleEvent =
  | { type: 'rolled'; colors: readonly Color[]; discarded: readonly Color[] }
  | { type: 'mixed'; inputs: readonly [Color, Color]; output: Color }
  | { type: 'triggered'; attackId: string }
  | { type: 'damaged'; target: Target; amount: number; blocked: number; source: 'attack' | 'poison' | 'burn' }
  | { type: 'blockGained'; target: Target; amount: number }
  | { type: 'statusApplied'; target: Target; status: 'poison' | 'burn'; stacks: number }
  | { type: 'enemyIntent'; intent: EnemyIntent }
  | { type: 'victory' }
  | { type: 'defeat' };

export type ActionError =
  | 'battle_over'
  | 'no_recipe'
  | 'missing_colors'
  | 'unknown_attack';

export type ActionResult =
  | { ok: true; state: BattleState; events: BattleEvent[] }
  | { ok: false; state: BattleState; error: ActionError };
