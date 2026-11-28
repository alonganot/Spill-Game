import {
  isAreaSpell,
  type AttackDefinition,
  type BattleConfig,
  type BattleEvent,
  type Color,
  type Effect,
  type EnemyIntent,
  type MixRecipe,
  type StatusConfig,
} from '../engine';
import type { UpdateStatus } from '../desktop/updates';

export const COLOR_LABEL: Record<Color, string> = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  cyan: 'Cyan',
  orange: 'Orange',
  white: 'White',
  black: 'Black',
  pink: 'Pink',
  grey: 'Grey',
  crimson: 'Crimson',
  blight: 'Blight',
  frost: 'Frost',
};

/**
 * A spell's effects as they are shown: repeated Burn effects (each adds one stack) merge into
 * one entry at the first one's place, with `stacks` counting them. Every other effect has `stacks` 1.
 */
export function groupEffects(effects: readonly Effect[]): { effect: Effect; stacks: number }[] {
  const grouped: { effect: Effect; stacks: number }[] = [];
  for (const effect of effects) {
    const same =
      effect.type === 'burn' &&
      grouped.find((g) => g.effect.type === 'burn' && (g.effect.area === true) === (effect.area === true));
    if (same) same.stacks++;
    else grouped.push({ effect, stacks: 1 });
  }
  return grouped;
}

/** One effect in short form. `stacks` is how many Burn effects it stands for (`2 burn`). */
export function describeEffect(effect: Effect, stacks = 1): string {
  const all = 'area' in effect && effect.area ? ' all' : '';
  switch (effect.type) {
    case 'damage':
      return `${effect.amount} dmg${all}`;
    case 'block':
      return effect.cleanAmount === undefined ? `${effect.amount} block` : `${effect.amount}/${effect.cleanAmount} block`;
    case 'poison':
      return `${effect.stacks} poison${all}`;
    case 'burn':
      return stacks > 1 ? `${stacks} burn${all}` : `burn${all}`;
    case 'heal':
      return `${effect.amount} heal`;
    case 'cleanse':
      return effect.stacks === undefined ? 'cleanse' : `cleanse ${effect.stacks}`;
    case 'curse':
      return `curse${all}`;
    case 'silence':
      return effect.noImmunity ? `silence${all}, no immunity` : `silence${all}`;
    case 'chill':
      return `chill${all}`;
    case 'multiplyPoison':
      return `poison ×${effect.factor}${all}`;
  }
}

export function describeIntent(intent: EnemyIntent): string {
  switch (intent.type) {
    case 'attack':
      return (intent.hits ?? 1) > 1 ? `Attack ${intent.amount}×${intent.hits}` : `Attack ${intent.amount}`;
    case 'block':
      return `Block ${intent.amount}`;
    case 'poison':
      return `Poison ${intent.stacks}`;
    case 'burn':
      return 'Burn';
  }
}

/**
 * Display names for a fight's enemies. Repeated names get a letter
 * ("Puddle Slime A", "Puddle Slime B") so the log and tooltips can tell them apart.
 */
export function enemyLabels(config: Pick<BattleConfig, 'enemies'>): string[] {
  const names = config.enemies.map((e) => e.name);
  const seen = new Map<string, number>();
  return names.map((name) => {
    if (names.filter((n) => n === name).length === 1) return name;
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return `${name} ${String.fromCharCode(65 + n)}`;
  });
}

/**
 * One log line per event, or null for events that don't need a line.
 * Pass `labels` (from `enemyLabels`) when formatting many events, so they're built once.
 */
export function formatEvent(
  event: BattleEvent,
  config: BattleConfig,
  labels: readonly string[] = enemyLabels(config),
): string | null {
  const name = (index: number | undefined) => labels[index ?? 0] ?? 'Enemy';
  switch (event.type) {
    case 'rolled': {
      const rolled = `Rolled ${event.colors.map((c) => COLOR_LABEL[c]).join(', ')}`;
      return event.discarded.length > 0 ? `${rolled} (pool full, ${event.discarded.length} lost)` : rolled;
    }
    case 'mixed':
      return `Mixed ${COLOR_LABEL[event.inputs[0]]} + ${COLOR_LABEL[event.inputs[1]]} → ${COLOR_LABEL[event.output]}`;
    case 'triggered': {
      const attack = config.attacks.find((a) => a.id === event.attackId);
      const spell = attack?.name ?? event.attackId;
      if (attack && isAreaSpell(attack)) return `You used ${spell} on every enemy`;
      return config.enemies.length > 1 ? `You used ${spell} on ${name(event.target)}` : `You used ${spell}`;
    }
    case 'damaged': {
      const who = event.target === 'enemy' ? name(event.enemy) : 'You';
      if (event.source !== 'attack') {
        const status = event.source === 'poison' ? 'Poison' : 'Burn';
        return `${status} deals ${event.amount} to ${event.target === 'enemy' ? who : 'you'}`;
      }
      const verb = event.target === 'enemy' ? 'takes' : 'take';
      const blocked = event.blocked > 0 ? ` (${event.blocked} blocked)` : '';
      return `${who} ${verb} ${event.amount} damage${blocked}`;
    }
    case 'blockGained':
      return event.target === 'player' ? `You gain ${event.amount} block` : `${name(event.enemy)} gains ${event.amount} block`;
    case 'statusApplied': {
      const who = event.target === 'enemy' ? name(event.enemy) : 'You are';
      switch (event.status) {
        case 'poison':
          return `${who} poisoned (+${event.stacks})`;
        case 'burn':
          return `${who} set on fire`;
        case 'curse':
          return `${who} is cursed`;
        case 'silence':
          return `${who} is silenced`;
        case 'chill':
          return `${who} is chilled`;
      }
    }
    case 'healed':
      return `You heal ${event.amount}`;
    case 'cleansed': {
      const parts = [event.poison > 0 ? `${event.poison} Poison` : '', event.burn > 0 ? `${event.burn} Burn` : ''];
      return `You cleanse ${parts.filter(Boolean).join(' and ')}`;
    }
    case 'silenceResisted':
      return `${name(event.enemy)} resists Silence`;
    case 'enemySkipped':
      return `${name(event.enemy)} is silenced and skips ${describeIntent(event.intent)}`;
    case 'enemyIntent':
      // Block already names who gained it. Attacks only need the attacker named when there are several enemies.
      if (event.intent.type === 'block') return null;
      return event.intent.type !== 'attack' || config.enemies.length > 1
        ? `${name(event.enemy)}: ${describeIntent(event.intent)}`
        : null;
    case 'victory':
      return config.enemies.length > 1 ? 'Every enemy is defeated!' : `${name(0)} is defeated!`;
    case 'defeat':
      return 'You are defeated.';
  }
}

// ---------- Tooltip texts (hover on PC, tap on touch screens) ----------

/** Who a badge belongs to: the player, or the enemy by name. */
export type Owner = { kind: 'player' } | { kind: 'enemy'; name: string };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function poisonTip(stacks: number, owner: Owner, status: StatusConfig): string {
  const who = owner.kind === 'player' ? 'You take' : `${owner.name} takes`;
  return `Poison ${stacks}: ${who} ${stacks} damage at the end of each turn, then it loses ${plural(status.poisonDecay, 'stack')}. Ignores Block.`;
}

export function burnTip(stacks: number, owner: Owner, status: StatusConfig): string {
  const who = owner.kind === 'player' ? 'You take' : `${owner.name} takes`;
  const each = stacks > 1 ? ` (${status.burnDamage} per stack)` : '';
  return `Burn ${stacks}: ${who} ${status.burnDamage * stacks} damage${each} at the end of the turn, then it goes out. Ignores Block. Burning again adds a stack.`;
}

export function curseTip(name: string, status: StatusConfig): string {
  return `Cursed: ${name} takes ${status.curseBonus} more from every hit and every Poison or Burn tick until this turn's statuses resolve.`;
}

export function silenceTip(name: string): string {
  return `Silenced: ${name} skips its next action. Afterwards it can't be Silenced again until it really acts.`;
}

export function silenceImmuneTip(name: string): string {
  return `Silence Immunity: ${name} was just Silenced, so Silence has no effect on it until it acts again.`;
}

export function chillTip(name: string, status: StatusConfig): string {
  return `Chilled: ${name}'s next attack deals ${Math.round(status.chillMultiplier * 100)}% damage per hit (rounded down). Clears after it acts.`;
}

export function blockTip(amount: number, owner: Owner): string {
  return owner.kind === 'player'
    ? `Block ${amount}: absorbs the next ${amount} attack damage. It lasts until your next turn starts.`
    : `Block ${amount}: absorbs the next ${amount} damage from your spells. It lasts until ${owner.name} acts again.`;
}

/** How an enemy's intent is changed: skipped (Silenced) or softened (Chilled). */
export type IntentMark = 'skipped' | 'chilled';

/** `intent` is what the enemy will really do (a Chilled attack already reduced). */
export function intentTip(intent: EnemyIntent, enemyName: string, status: StatusConfig, mark: IntentMark | null = null): string {
  if (mark === 'skipped') {
    return `${enemyName} is Silenced: it skips ${describeIntent(intent)} when you end your turn.`;
  }
  const base = intentText(intent, enemyName, status);
  return mark === 'chilled' ? `${base} (Chilled: ${Math.round(status.chillMultiplier * 100)}% damage per hit.)` : base;
}

function intentText(intent: EnemyIntent, enemyName: string, status: StatusConfig): string {
  const when = `When you end your turn, ${enemyName}`;
  switch (intent.type) {
    case 'attack': {
      const hits = intent.hits ?? 1;
      return hits > 1
        ? `${when} attacks ${hits} times for ${intent.amount} each (${hits * intent.amount} total). Your Block absorbs it first.`
        : `${when} attacks for ${intent.amount}. Your Block absorbs it first.`;
    }
    case 'block':
      return `${when} gains ${intent.amount} Block, which lasts through your next turn.`;
    case 'poison':
      return `${when} poisons you for ${intent.stacks}: damage equal to the stacks at the end of each turn, falling by ${status.poisonDecay}. Ignores Block.`;
    case 'burn':
      return `${when} sets you on fire (+1 Burn): ${status.burnDamage} damage per stack at the end of your next turn. Ignores Block.`;
  }
}

/** One effect as a short sentence, with its real numbers. `stacks` is how many Burn effects it stands for. */
export function effectSentence(effect: Effect, status: StatusConfig, stacks = 1): string {
  switch (effect.type) {
    case 'damage':
      return `Deals ${effect.amount} damage${effect.area ? ' to every enemy' : ''}`;
    case 'block':
      return effect.cleanAmount === undefined
        ? `Gives you ${effect.amount} Block`
        : `Gives you ${effect.amount} Block, or ${effect.cleanAmount} if you have no Poison or Burn`;
    case 'poison':
      return `Poisons ${effect.area ? 'every enemy ' : ''}for ${effect.stacks} (${effect.stacks} damage per turn, falling by ${status.poisonDecay})`;
    case 'burn':
      return `Sets ${effect.area ? 'every enemy' : 'the enemy'} on fire (+${stacks} Burn: ${status.burnDamage} damage per stack at the end of the turn)`;
    case 'heal':
      return `Heals you for ${effect.amount} (up to your max HP)`;
    case 'cleanse':
      return effect.stacks === undefined
        ? 'Removes all your Poison and Burn'
        : `Removes ${effect.stacks} of your Poison and ${effect.stacks} of your Burn`;
    case 'curse':
      return `Curses ${effect.area ? 'every enemy' : 'the enemy'} (+${status.curseBonus} damage from each hit and tick until the end of the turn)`;
    case 'silence':
      return effect.noImmunity
        ? `Silences ${effect.area ? 'every enemy' : 'the enemy'} (it skips its next action, and can be Silenced again right away)`
        : `Silences ${effect.area ? 'every enemy' : 'the enemy'} (it skips its next action, then can't be Silenced again until it acts)`;
    case 'chill':
      return `Chills ${effect.area ? 'every enemy' : 'the enemy'} (its next attack deals ${Math.round(status.chillMultiplier * 100)}% damage)`;
    case 'multiplyPoison':
      return `Multiplies ${effect.area ? 'every enemy’s' : 'the enemy’s'} Poison by ${effect.factor}`;
  }
}

/** A spell's tooltip: what it does, what it costs, and how to get there. */
export function spellTip(
  attack: AttackDefinition,
  readiness: 'ready' | 'craftable' | 'locked',
  status: StatusConfig,
  plan?: readonly MixRecipe[],
): string {
  const effects = groupEffects(attack.effects)
    .map((g) => effectSentence(g.effect, status, g.stacks))
    .join('. ');
  const cost = Object.entries(attack.cost)
    .flatMap(([color, n]) => Array.from({ length: n ?? 0 }, () => COLOR_LABEL[color as Color]))
    .join(' + ');
  const how =
    readiness === 'ready'
      ? 'You have the colors: drag them onto its slots, then Cast.'
      : readiness === 'craftable' && plan
        ? `Mix first: ${plan.map((r) => `${COLOR_LABEL[r.inputs[0]]} + ${COLOR_LABEL[r.inputs[1]]} → ${COLOR_LABEL[r.output]}`).join(', ')}.`
        : "You don't have these colors yet.";
  const was = attack.upgraded && attack.baseEffects ? ` Upgraded from ${shownEffects(attack.baseEffects).map((e) => e.text).join(' · ')}.` : '';
  return `${attack.name}: ${effects}.${was} Costs ${cost}. ${how}`;
}

/**
 * A spell's effects as short texts (repeated Burns merged), each marked `changed` when it differs
 * from the base spell's text in its place, so an upgrade's new numbers can be highlighted.
 */
export function shownEffects(effects: readonly Effect[], base?: readonly Effect[]): { text: string; changed: boolean }[] {
  const texts = (list: readonly Effect[]) => groupEffects(list).map((g) => describeEffect(g.effect, g.stacks));
  const baseTexts = base ? texts(base) : undefined;
  return texts(effects).map((text, i) => ({ text, changed: baseTexts !== undefined && baseTexts[i] !== text }));
}

/** A die's tooltip: its name and all six faces. */
export function dieTip(name: string, faces: readonly Color[]): string {
  return `${name} die: ${faces.map((f) => COLOR_LABEL[f]).join(', ')}.`;
}

/** The main menu's update notice: its text, and its button label if it has one. Null hides it. */
export function describeUpdate(status: UpdateStatus): { text: string; action?: string } | null {
  switch (status.state) {
    case 'none':
      return null;
    case 'available':
      return { text: `Update available: v${status.version}`, action: 'Update' };
    case 'downloading':
      return { text: `Downloading v${status.version}… ${Math.max(0, Math.min(100, Math.round(status.percent)))}%` };
    case 'installing':
      return { text: `Installing v${status.version}. Spill will restart…` };
    case 'error':
      return { text: `Couldn't download v${status.version}.`, action: 'Retry' };
  }
}
