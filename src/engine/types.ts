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
  /** HP the player starts the battle with (defaults to max). Used to carry HP between fights. */
  playerStartHp?: number;
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

// ---------- Run loop ----------

export type StageKind = 'normal' | 'elite' | 'boss';
/** What happens after a stage's fight is won. */
export type StageStop = 'reward' | 'shop' | 'end';

export interface StageDefinition {
  enemy: EnemyDefinition;
  kind: StageKind;
  after: StageStop;
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
  /** Reward pick amounts after normal fights vs. elite fights. */
  rewards: { normal: RewardAmounts; elite: RewardAmounts };
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
  /** Battle settings shared by every fight; dice, enemy, and HP come from the run. */
  battle: Omit<BattleConfig, 'dice' | 'enemy' | 'playerStartHp'>;
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
  /** Leaves a finished fight: collects gold and moves to the next stop (or ends the run). */
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
  | 'invalid_target'
  | 'already_full_hp'
  | 'sold_out';

export type RunActionResult =
  | { ok: true; state: RunState; events: BattleEvent[] }
  | { ok: false; state: RunState; error: RunError };
