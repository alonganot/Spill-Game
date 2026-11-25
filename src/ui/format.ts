import type { BattleConfig, BattleEvent, Color, Effect, EnemyIntent } from '../engine';

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
