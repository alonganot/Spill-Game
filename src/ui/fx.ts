import type { BattleEvent, Color } from '../engine';

/** A combatant on screen: the player, or an enemy by index. */
export type Who = 'player' | number;

/** Whether an event's target is `who`. */
function aimsAt(event: { target: 'player' | 'enemy'; enemy?: number }, who: Who): boolean {
  return event.target === 'player' ? who === 'player' : event.enemy === who;
}

/** Literal hex for each color (same as the tokens in global.css), for SVG fills and inline effect colors. */
export const COLOR_HEX: Record<Color, string> = {
  red: '#e5484d',
  blue: '#3e7bfa',
  green: '#3fb950',
  purple: '#9b5de5',
  cyan: '#22c3d6',
  orange: '#f08a24',
  white: '#f4f0e6',
  black: '#2b2238',
  pink: '#ff7eb6',
  grey: '#9a96a8',
  crimson: '#b5173f',
  blight: '#8e9c1e',
  frost: '#a6ecff',
};

export type FloatKind =
  | 'damage'
  | 'poison'
  | 'burn'
  | 'blocked'
  | 'block'
  | 'heal'
  | 'cleanse'
  | 'curse'
  | 'silence'
  | 'chill'
  | 'resist';

/** A number that rises from a combatant on one playback beat. */
export interface FloatText {
  text: string;
  kind: FloatKind;
}

/** What rises above `who` on this beat. */
export function floatsFor(event: BattleEvent | null, who: Who): FloatText[] {
  if (!event) return [];
  if (event.type === 'damaged' && aimsAt(event, who)) {
    const floats: FloatText[] = [];
    if (event.amount > 0) floats.push({ text: `-${event.amount}`, kind: event.source === 'attack' ? 'damage' : event.source });
    if (event.blocked > 0) floats.push({ text: `🛡−${event.blocked}`, kind: 'blocked' });
    return floats;
  }
  if (event.type === 'blockGained' && aimsAt(event, who)) {
    return [{ text: `🛡+${event.amount}`, kind: 'block' }];
  }
  if (event.type === 'statusApplied' && aimsAt(event, who)) {
    switch (event.status) {
      case 'poison':
        return [{ text: `☠+${event.stacks}`, kind: 'poison' }];
      case 'burn':
        return [{ text: `🔥+${event.stacks}`, kind: 'burn' }];
      case 'curse':
        return [{ text: '🌑 Cursed', kind: 'curse' }];
      case 'silence':
        return [{ text: '🤐 Silenced', kind: 'silence' }];
      case 'chill':
        return [{ text: '❄ Chilled', kind: 'chill' }];
    }
  }
  if (event.type === 'healed' && who === 'player') return [{ text: `+${event.amount}`, kind: 'heal' }];
  if (event.type === 'cleansed' && who === 'player') {
    return [{ text: `✨−${event.poison + event.burn}`, kind: 'cleanse' }];
  }
  if (event.type === 'silenceResisted' && event.enemy === who) return [{ text: 'Immune', kind: 'resist' }];
  if (event.type === 'enemySkipped' && event.enemy === who) return [{ text: '🤐 Skips', kind: 'silence' }];
  return [];
}

/** How a combatant's sprite reacts on this beat. */
export type StageFx = 'hit' | 'poison' | 'burn' | 'guard' | 'lunge' | 'cast' | 'heal' | 'cleanse' | 'curse' | 'silence' | 'chill';

export function stageFxFor(event: BattleEvent | null, who: Who): StageFx | null {
  if (!event) return null;
  switch (event.type) {
    case 'damaged':
      if (!aimsAt(event, who) || event.amount === 0) return null;
      return event.source === 'attack' ? 'hit' : event.source;
    case 'blockGained':
      return aimsAt(event, who) ? 'guard' : null;
    case 'statusApplied':
      return aimsAt(event, who) ? event.status : null;
    case 'healed':
      return who === 'player' ? 'heal' : null;
    case 'cleansed':
      return who === 'player' ? 'cleanse' : null;
    case 'enemySkipped':
      return event.enemy === who ? 'silence' : null;
    case 'enemyIntent':
      // Attackers lunge; poisoners and burners lunge too, since they reach the player.
      return event.enemy === who && event.intent.type !== 'block' ? 'lunge' : null;
    case 'triggered':
      return who === 'player' ? 'cast' : null;
    default:
      return null;
  }
}
