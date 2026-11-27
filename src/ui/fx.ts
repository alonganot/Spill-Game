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
};

export type FloatKind = 'damage' | 'poison' | 'burn' | 'blocked' | 'block';

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
  return [];
}

/** How a combatant's sprite reacts on this beat. */
export type StageFx = 'hit' | 'poison' | 'burn' | 'guard' | 'lunge' | 'cast';

export function stageFxFor(event: BattleEvent | null, who: Who): StageFx | null {
  if (!event) return null;
  switch (event.type) {
    case 'damaged':
      if (!aimsAt(event, who) || event.amount === 0) return null;
      return event.source === 'attack' ? 'hit' : event.source;
    case 'blockGained':
      return aimsAt(event, who) ? 'guard' : null;
    case 'enemyIntent':
      // Attackers lunge; poisoners and burners lunge too, since they reach the player.
      return event.enemy === who && event.intent.type !== 'block' ? 'lunge' : null;
    case 'triggered':
      return who === 'player' ? 'cast' : null;
    default:
      return null;
  }
}
