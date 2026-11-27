// Core engine types. Values for these shapes live in `src/data/`.

export type BaseColor = 'red' | 'blue' | 'green';
export type SecondaryColor = 'purple' | 'cyan' | 'orange';
export type Color = BaseColor | SecondaryColor;

/** Returns a float in [0, 1). Injected so rolls are deterministic in tests. */
export type Rng = () => number;

export interface DieDefinition {
  id: string;
  name: string;
  faces: readonly BaseColor[];
}

export interface MixRecipe {
  inputs: readonly [Color, Color];
  output: Color;
}

/** How many of each color an attack consumes, e.g. `{ red: 2 }`. */
export type ColorCost = Partial<Record<Color, number>>;

/** Damage and statuses hit the target enemy, or every living enemy when `area` is set. Block goes to the player. */
export type Effect =
  | { type: 'damage'; amount: number; area?: true }
  | { type: 'block'; amount: number }
  | { type: 'poison'; stacks: number; area?: true }
  | { type: 'burn'; area?: true };

export interface AttackDefinition {
  id: string;
  name: string;
  cost: ColorCost;
  effects: readonly Effect[];
}

export type EnemyIntent =
  /** Hits the player `hits` times (default 1) for `amount` each. */
  | { type: 'attack'; amount: number; hits?: number }
  | { type: 'block'; amount: number }
  /** Adds poison stacks to the player. */
  | { type: 'poison'; stacks: number }
  /** Sets the player on fire. */
  | { type: 'burn' };

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
  /** HP the player starts the battle with (defaults to max). Used to carry HP between fights. */
  playerStartHp?: number;
  dice: readonly DieDefinition[];
  recipes: readonly MixRecipe[];
  /** Attacks the player can trigger this battle. */
  attacks: readonly AttackDefinition[];
  status: StatusConfig;
  /** The enemies in this fight, left to right. They act in this order. */
  enemies: readonly EnemyDefinition[];
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

export interface EnemyState extends Combatant {
  /** Counts this enemy's actions; its next intent is `intents[intentIndex % length]`. */
  intentIndex: number;
}

export type BattlePhase = 'player' | 'victory' | 'defeat';

export interface BattleState {
  turn: number;
  phase: BattlePhase;
  pool: Color[];
  player: Combatant;
  /** One per `BattleConfig.enemies`, same order. Defeated enemies stay in place at 0 HP. */
  enemies: EnemyState[];
}

export type BattleAction =
  | { type: 'mix'; colors: readonly [Color, Color] }
  /** `target` is an enemy index; when left out it is the first living enemy. */
  | { type: 'trigger'; attackId: string; target?: number }
  | { type: 'endTurn' };

export type Target = 'player' | 'enemy';

/** Events that happen to an enemy carry its index in `enemy`; events on the player leave it out. */
export type BattleEvent =
  | { type: 'rolled'; colors: readonly Color[]; discarded: readonly Color[] }
  | { type: 'mixed'; inputs: readonly [Color, Color]; output: Color }
  /** `target` is the enemy the spell was aimed at. */
  | { type: 'triggered'; attackId: string; target: number }
  | { type: 'damaged'; target: Target; enemy?: number; amount: number; blocked: number; source: 'attack' | 'poison' | 'burn' }
  | { type: 'blockGained'; target: Target; enemy?: number; amount: number }
  | { type: 'statusApplied'; target: Target; enemy?: number; status: 'poison' | 'burn'; stacks: number }
  /** Enemy `enemy` acts on its intent; the results follow as their own events. */
  | { type: 'enemyIntent'; enemy: number; intent: EnemyIntent }
  | { type: 'victory' }
  | { type: 'defeat' };

export type ActionError =
  | 'battle_over'
  | 'no_recipe'
  | 'missing_colors'
  | 'unknown_attack'
  | 'invalid_target';

export type ActionResult =
  | { ok: true; state: BattleState; events: BattleEvent[] }
  | { ok: false; state: BattleState; error: ActionError };

// ---------- Run loop ----------

export type StageKind = 'normal' | 'elite' | 'boss';

/** One fight. After every fight but the last comes a reward pick, then a shop. */
export interface StageDefinition {
  enemies: readonly EnemyDefinition[];
  kind: StageKind;
  act: number;
}

export interface DieForSale {
  die: DieDefinition;
  price: number;
}

export interface RewardAmounts {
  gold: number;
  heal: number;
}

export interface EconomyConfig {
  goldPerWin: Record<StageKind, number>;
  /** Reward pick amounts by the kind of fight just won. */
  rewards: Record<StageKind, RewardAmounts>;
  shop: {
    repaintPrice: number;
    repaintPriceStep: number;
    healPrice: number;
    healAmount: number;
    capPrice: number;
    capPriceStep: number;
    diceForSale: number;
  };
}

export interface RunConfig {
  /** Battle settings shared by every fight; dice, enemies, and HP come from the run. */
  battle: Omit<BattleConfig, 'dice' | 'enemies' | 'playerStartHp'>;
  stages: readonly StageDefinition[];
  startingDice: readonly DieDefinition[];
  startingGold: number;
  startingDiceCap: number;
  maxDiceCap: number;
  shopDice: readonly DieForSale[];
  economy: EconomyConfig;
}

export type RewardOption =
  | { type: 'gold'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'repaint' };

export interface ShopDieOffer extends DieForSale {
  sold: boolean;
}

export type RunPhase = 'battle' | 'reward' | 'shop' | 'victory' | 'defeat';

export interface RunState {
  stageIndex: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  gold: number;
  dice: DieDefinition[];
  diceCap: number;
  /** How many times each repeatable shop service was bought (drives price increases). */
  purchases: { repaint: number; cap: number };
  /** The current fight; null outside the battle phase. */
  battle: BattleState | null;
  rewardOffers: RewardOption[];
  shopStock: ShopDieOffer[];
}

export interface RepaintTarget {
  dieIndex: number;
  faceIndex: number;
  color: BaseColor;
}

export type RunAction =
  | { type: 'battle'; action: BattleAction }
  /** Leaves a finished fight: collects gold and moves to the reward pick (or ends the run). */
  | { type: 'continue' }
  | { type: 'chooseReward'; index: number; repaint?: RepaintTarget }
  | { type: 'buyDie'; offerIndex: number }
  | { type: 'repaint'; target: RepaintTarget }
  | { type: 'buyHeal' }
  | { type: 'buyCapUpgrade' }
  | { type: 'leaveShop' };

export type RunError =
  | ActionError
  | 'wrong_phase'
  | 'battle_not_over'
  | 'not_enough_gold'
  | 'dice_cap_reached'
  | 'cap_max_reached'
  | 'already_full_hp'
  | 'sold_out';

export type RunActionResult =
  | { ok: true; state: RunState; events: BattleEvent[] }
  | { ok: false; state: RunState; error: RunError };
