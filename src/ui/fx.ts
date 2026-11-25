import type { BattleEvent, Color, Target } from '../engine';

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

/** What rises above `target` on this beat. */
export function floatsFor(event: BattleEvent | null, target: Target): FloatText[] {
  if (!event) return [];
  if (event.type === 'damaged' && event.target === target) {
    const floats: FloatText[] = [];
    if (event.amount > 0) floats.push({ text: `-${event.amount}`, kind: event.source === 'attack' ? 'damage' : event.source });
    if (event.blocked > 0) floats.push({ text: `🛡−${event.blocked}`, kind: 'blocked' });
    return floats;
  }
  if (event.type === 'blockGained' && event.target === target) {
    return [{ text: `🛡+${event.amount}`, kind: 'block' }];
  }
  return [];
}

/** How a combatant's sprite reacts on this beat. */
export type StageFx = 'hit' | 'poison' | 'burn' | 'guard' | 'lunge' | 'cast';

export function stageFxFor(event: BattleEvent | null, target: Target): StageFx | null {
  if (!event) return null;
  switch (event.type) {
    case 'damaged':
      if (event.target !== target || event.amount === 0) return null;
      return event.source === 'attack' ? 'hit' : event.source;
    case 'blockGained':
      return event.target === target ? 'guard' : null;
    case 'enemyIntent':
      return target === 'enemy' && event.intent.type === 'attack' ? 'lunge' : null;
    case 'triggered':
      return target === 'player' ? 'cast' : null;
    default:
      return null;
  }
}
