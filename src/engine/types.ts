// Core engine types. Values for these shapes live in `src/data/`.

export type BaseColor = 'red' | 'blue' | 'green' | 'white' | 'black';
export type SecondaryColor = 'purple' | 'cyan' | 'orange' | 'pink' | 'grey' | 'crimson' | 'blight' | 'frost';
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

/**
 * Damage and statuses (Poison, Burn, Curse, Silence, Chill) hit the target enemy,
 * or every living enemy when `area` is set. Block, Heal, and Cleanse go to the player.
 */
export type Effect =
  | { type: 'damage'; amount: number; area?: true }
  /** `cleanAmount`, if set, replaces `amount` when the player has no Poison or Burn. */
  | { type: 'block'; amount: number; cleanAmount?: number }
  | { type: 'poison'; stacks: number; area?: true }
  | { type: 'burn'; area?: true }
  /** Restores player HP, capped at max HP. */
  | { type: 'heal'; amount: number }
  /** Removes the player's Poison and Burn: all of it, or up to `stacks` of each. */
  | { type: 'cleanse'; stacks?: number }
  /** The enemy takes `curseBonus` more from each damage instance this turn. */
  | { type: 'curse'; area?: true }
  /** The enemy skips its next action. With `noImmunity`, it gains no Silence Immunity afterwards. */
  | { type: 'silence'; area?: true; noImmunity?: true }
  /** The enemy's next attack hits softer (`chillMultiplier`). */
  | { type: 'chill'; area?: true }
  /** Multiplies the enemy's Poison stacks. */
  | { type: 'multiplyPoison'; factor: number; area?: true };

/** A spell's `+` form: new effects, same cost (RULES.md §2). */
export interface SpellUpgrade {
  effects: readonly Effect[];
}

export interface AttackDefinition {
  id: string;
  name: string;
  cost: ColorCost;
  effects: readonly Effect[];
  /** Its `+` form, if the spell can be upgraded. */
  upgrade?: SpellUpgrade;
  /** Set only on a resolved `+` spell (`upgradeAttack`). */
  upgraded?: true;
  /** On a resolved `+` spell: the base effects, so the change can be shown. */
  baseEffects?: readonly Effect[];
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
  /** Damage per Burn stack when Burn resolves (then every stack is cleared). */
  burnDamage: number;
  /** Poison stacks removed after each tick. */
  poisonDecay: number;
  /** Extra damage a Cursed enemy takes per damage instance (hit or tick). */
  curseBonus: number;
  /** A Chilled enemy's attack hits deal this fraction of their damage (rounded down). */
  chillMultiplier: number;
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
  /** Burn stacks. Each deals `burnDamage` when Burn resolves; then all of them go out. */
  burn: number;
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
  /** Takes `curseBonus` more from each damage instance; clears after the turn's status step. */
  cursed: boolean;
  /** Skips its next action, then gains Silence Immunity. */
  silenced: boolean;
  /** Can't be Silenced until it next really acts. */
  silenceImmune: boolean;
  /** Its current Silence (from Hush+) grants no Silence Immunity when it ends. */
  silenceNoImmunity: boolean;
  /** Its next action's attack hits deal `chillMultiplier` damage; clears after it really acts. */
  chilled: boolean;
}

/** Statuses that only enemies carry (from White/Black spells). */
export type EnemyCondition = 'curse' | 'silence' | 'chill';

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
  /** Poison and Burn add `stacks`; Curse, Silence, and Chill (enemies only) are on/off, with `stacks` 1. */
  | { type: 'statusApplied'; target: Target; enemy?: number; status: 'poison' | 'burn' | EnemyCondition; stacks: number }
  /** HP actually restored (after the max HP cap). */
  | { type: 'healed'; target: 'player'; amount: number }
  /** Poison and Burn stacks removed from the player. */
  | { type: 'cleansed'; target: 'player'; poison: number; burn: number }
  /** Silence aimed at an enemy with Silence Immunity: nothing happens. */
  | { type: 'silenceResisted'; enemy: number }
  /** Enemy `enemy` acts on its intent; the results follow as their own events. */
  | { type: 'enemyIntent'; enemy: number; intent: EnemyIntent }
  /** Enemy `enemy` is Silenced and skips this intent. `noImmunity`: it gains no Silence Immunity. */
  | { type: 'enemySkipped'; enemy: number; intent: EnemyIntent; noImmunity?: true }
  | { type: 'victory' }
  | { type: 'defeat' };

export type ActionError =
  | 'battle_over'
  | 'no_recipe'
  | 'missing_colors'
  | 'unknown_attack'
  | 'invalid_target'
  /** A spell that only Silences, aimed only at enemies immune to Silence (it would do nothing). */
  | 'silence_immune';

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

export interface InterestRule {
  /** Gold held per 1g of interest. */
  step: number;
  /** The most interest one won fight pays. */
  max: number;
}

export interface EconomyConfig {
  goldPerWin: Record<StageKind, number>;
  /** Extra gold per color still in the pool when a fight is won. */
  leftoverColorGold: number;
  /** Gold interest on a won fight (RULES.md §4): +1g per `step` gold held, at most `max`. */
  interest: InterestRule;
  /** Reward pick amounts by the kind of fight just won. */
  rewards: Record<StageKind, RewardAmounts>;
  /** Chance that a reward's third offer is a Free Spell Upgrade instead of a Free repaint. */
  upgradeRewardChance: number;
  shop: {
    repaintPrice: number;
    repaintPriceStep: number;
    healPrice: number;
    healAmount: number;
    capPrice: number;
    capPriceStep: number;
    diceForSale: number;
    /** Spell upgrades (RULES.md §4). */
    spotlightPrice: number;
    draftPrice: number;
    /** How many spells a Draft Upgrade draws to pick from. */
    draftChoices: number;
    targetedPrice: number;
    /** Added to the Targeted price for each upgrade bought earlier in the run. */
    targetedPriceStep: number;
  };
}

/** How much permanent Essence a finished run pays (RULES.md §4, Characters & Essence). */
export interface EssenceConfig {
  /** Remaining gold is divided by this, rounded down. */
  goldDivisor: number;
  perFightWon: number;
  victoryBonus: number;
}

/** A finished run's Essence, by source. */
export interface EssenceReward {
  fightsWon: number;
  /** From remaining gold. */
  gold: number;
  /** From fights won. */
  fights: number;
  /** The bonus for winning the run (0 on a loss). */
  victory: number;
  total: number;
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
  | { type: 'repaint' }
  /** Upgrades the named spell to its `+` form for free. */
  | { type: 'upgrade'; attackId: string };

export interface ShopDieOffer extends DieForSale {
  sold: boolean;
}

/** This shop visit's spell upgrade options (RULES.md §4). Reset on every shop arrival. */
export interface ShopUpgrades {
  /** The discounted spell, drawn on arrival; null when none can be upgraded. */
  spotlight: string | null;
  spotlightSold: boolean;
  draftSold: boolean;
  targetedSold: boolean;
  /** A bought Draft's drawn spells, waiting for the pick; null when no pick is pending. */
  draftChoices: string[] | null;
}

export type RunPhase = 'battle' | 'reward' | 'shop' | 'victory' | 'defeat';

/** The gold a won fight pays: its base, a bonus per color left in the pool, and interest on gold held. */
export interface VictoryGold {
  base: number;
  leftover: number;
  perColor: number;
  bonus: number;
  /** Gold held when the fight was won, before this fight's gold. */
  held: number;
  interest: number;
  interestRule: InterestRule;
  total: number;
}

export interface RunState {
  stageIndex: number;
  phase: RunPhase;
  hp: number;
  maxHp: number;
  gold: number;
  dice: DieDefinition[];
  diceCap: number;
  /** How many times each repeatable shop service was bought (drives price increases). `upgrade`: spell upgrades bought in shops. */
  purchases: { repaint: number; cap: number; upgrade: number };
  /** Ids of the spells upgraded to their `+` form this run, in the order they were upgraded. */
  upgradedSpells: string[];
  /** The current fight; null outside the battle phase. */
  battle: BattleState | null;
  rewardOffers: RewardOption[];
  shopStock: ShopDieOffer[];
  shopUpgrades: ShopUpgrades;
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
  /** With `replaceIndex`, the bought die takes the place of that die; without it, it needs a free slot. */
  | { type: 'buyDie'; offerIndex: number; replaceIndex?: number }
  | { type: 'repaint'; target: RepaintTarget }
  | { type: 'buyHeal' }
  | { type: 'buyCapUpgrade' }
  /** Upgrades this visit's Spotlight spell. */
  | { type: 'buySpotlightUpgrade' }
  /** Pays for a Draft: the run RNG draws spells, and `pickDraftUpgrade` must follow. */
  | { type: 'buyDraftUpgrade' }
  | { type: 'pickDraftUpgrade'; attackId: string }
  /** Upgrades any spell that can still be upgraded. */
  | { type: 'buyTargetedUpgrade'; attackId: string }
  | { type: 'leaveShop' };

export type RunError =
  | ActionError
  | 'wrong_phase'
  | 'battle_not_over'
  | 'not_enough_gold'
  | 'dice_cap_reached'
  | 'cap_max_reached'
  | 'already_full_hp'
  | 'sold_out'
  | 'not_upgradable'
  | 'no_draft_pending'
  | 'draft_pending';

export type RunActionResult =
  | { ok: true; state: RunState; events: BattleEvent[] }
  | { ok: false; state: RunState; error: RunError };
