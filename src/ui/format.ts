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

export const COLOR_LABEL: Record<Color, string> = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
  cyan: 'Cyan',
  orange: 'Orange',
};

export function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'damage':
      return `${effect.amount} dmg${effect.area ? ' all' : ''}`;
    case 'block':
      return `${effect.amount} block`;
    case 'poison':
      return `${effect.stacks} poison${effect.area ? ' all' : ''}`;
    case 'burn':
      return effect.area ? 'burn all' : 'burn';
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
      return event.status === 'poison' ? `${who} poisoned (+${event.stacks})` : `${who} set on fire`;
    }
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

export function burnTip(owner: Owner, status: StatusConfig): string {
  const who = owner.kind === 'player' ? 'You take' : `${owner.name} takes`;
  return `Burn: ${who} ${status.burnDamage} damage at the end of the turn, then it goes out. Ignores Block. Doesn't stack.`;
}

export function blockTip(amount: number, owner: Owner): string {
  return owner.kind === 'player'
    ? `Block ${amount}: absorbs the next ${amount} attack damage. It lasts until your next turn starts.`
    : `Block ${amount}: absorbs the next ${amount} damage from your spells. It lasts until ${owner.name} acts again.`;
}

export function intentTip(intent: EnemyIntent, enemyName: string, status: StatusConfig): string {
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
      return `${when} sets you on fire: ${status.burnDamage} damage at the end of your next turn. Ignores Block.`;
  }
}

/** One effect as a short sentence, with its real numbers. */
export function effectSentence(effect: Effect, status: StatusConfig): string {
  switch (effect.type) {
    case 'damage':
      return `Deals ${effect.amount} damage${effect.area ? ' to every enemy' : ''}`;
    case 'block':
      return `Gives you ${effect.amount} Block`;
    case 'poison':
      return `Poisons ${effect.area ? 'every enemy ' : ''}for ${effect.stacks} (${effect.stacks} damage per turn, falling by ${status.poisonDecay})`;
    case 'burn':
      return `Sets ${effect.area ? 'every enemy' : 'the enemy'} on fire (${status.burnDamage} damage at the end of the turn)`;
  }
}

/** A spell's tooltip: what it does, what it costs, and how to get there. */
export function spellTip(
  attack: AttackDefinition,
  readiness: 'ready' | 'craftable' | 'locked',
  status: StatusConfig,
  plan?: readonly MixRecipe[],
): string {
  const effects = attack.effects.map((e) => effectSentence(e, status)).join('. ');
  const cost = Object.entries(attack.cost)
    .flatMap(([color, n]) => Array.from({ length: n ?? 0 }, () => COLOR_LABEL[color as Color]))
    .join(' + ');
  const how =
    readiness === 'ready'
      ? 'You have the colors: drag them onto its slots, then Cast.'
      : readiness === 'craftable' && plan
        ? `Mix first: ${plan.map((r) => `${COLOR_LABEL[r.inputs[0]]} + ${COLOR_LABEL[r.inputs[1]]} → ${COLOR_LABEL[r.output]}`).join(', ')}.`
        : "You don't have these colors yet.";
  return `${attack.name}: ${effects}. Costs ${cost}. ${how}`;
}

/** A die's tooltip: its name and all six faces. */
export function dieTip(name: string, faces: readonly Color[]): string {
  return `${name} die: ${faces.map((f) => COLOR_LABEL[f]).join(', ')}.`;
}
