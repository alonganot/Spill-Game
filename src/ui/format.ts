import type { AttackDefinition, BattleConfig, BattleEvent, Color, Effect, EnemyIntent, MixRecipe, StatusConfig } from '../engine';

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
      return `${effect.amount} dmg`;
    case 'block':
      return `${effect.amount} block`;
    case 'poison':
      return `${effect.stacks} poison`;
    case 'burn':
      return 'burn';
  }
}

export function describeIntent(intent: EnemyIntent): string {
  return intent.type === 'attack' ? `Attack ${intent.amount}` : `Block ${intent.amount}`;
}

/** One log line per event, or null for events that don't need a line. */
export function formatEvent(event: BattleEvent, config: BattleConfig): string | null {
  const enemy = config.enemy.name;
  switch (event.type) {
    case 'rolled': {
      const rolled = `Rolled ${event.colors.map((c) => COLOR_LABEL[c]).join(', ')}`;
      return event.discarded.length > 0 ? `${rolled} (pool full, ${event.discarded.length} lost)` : rolled;
    }
    case 'mixed':
      return `Mixed ${COLOR_LABEL[event.inputs[0]]} + ${COLOR_LABEL[event.inputs[1]]} → ${COLOR_LABEL[event.output]}`;
    case 'triggered': {
      const name = config.attacks.find((a) => a.id === event.attackId)?.name ?? event.attackId;
      return `You used ${name}`;
    }
    case 'damaged': {
      const who = event.target === 'enemy' ? enemy : 'You';
      if (event.source !== 'attack') {
        const status = event.source === 'poison' ? 'Poison' : 'Burn';
        return `${status} deals ${event.amount} to ${event.target === 'enemy' ? enemy : 'you'}`;
      }
      const verb = event.target === 'enemy' ? 'takes' : 'take';
      const blocked = event.blocked > 0 ? ` (${event.blocked} blocked)` : '';
      return `${who} ${verb} ${event.amount} damage${blocked}`;
    }
    case 'blockGained':
      return event.target === 'player' ? `You gain ${event.amount} block` : `${enemy} gains ${event.amount} block`;
    case 'statusApplied': {
      const who = event.target === 'enemy' ? enemy : 'You';
      return event.status === 'poison' ? `${who} poisoned (+${event.stacks})` : `${who} set on fire`;
    }
    case 'enemyIntent':
      return null;
    case 'victory':
      return `${enemy} is defeated!`;
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

export function intentTip(intent: EnemyIntent, enemyName: string): string {
  return intent.type === 'attack'
    ? `When you end your turn, ${enemyName} attacks for ${intent.amount}. Your Block absorbs it first.`
    : `When you end your turn, ${enemyName} gains ${intent.amount} Block, which lasts through your next turn.`;
}

/** One effect as a short sentence, with its real numbers. */
export function effectSentence(effect: Effect, status: StatusConfig): string {
  switch (effect.type) {
    case 'damage':
      return `Deals ${effect.amount} damage`;
    case 'block':
      return `Gives you ${effect.amount} Block`;
    case 'poison':
      return `Poisons for ${effect.stacks} (${effect.stacks} damage per turn, falling by ${status.poisonDecay})`;
    case 'burn':
      return `Sets the enemy on fire (${status.burnDamage} damage at the end of the turn)`;
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
