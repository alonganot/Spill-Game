import type { BattleEvent } from '../engine';

/**
 * How long each playback beat stays on screen, in ms. These are presentation
 * timings only; gameplay numbers live in `src/data/`.
 */
const BEAT_MS: Record<BattleEvent['type'], number> = {
  triggered: 250,
  mixed: 300,
  damaged: 450,
  blockGained: 350,
  statusApplied: 200,
  enemyIntent: 300,
  rolled: 700,
  victory: 300,
  defeat: 300,
};

/** How often a tumbling die flickers to another face. */
export const DIE_FLICKER_MS = 70;
const DIE_FIRST_LAND_MS = 320;
const DIE_STAGGER_MS = 70;
/** Time after the last die lands, so its pool chip can pop in before input unlocks. */
const ROLL_SETTLE_MS = 280;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** When die `index` stops tumbling, in ms from the start of the roll beat. */
export function dieLandMs(index: number): number {
  return prefersReducedMotion() ? 0 : DIE_FIRST_LAND_MS + index * DIE_STAGGER_MS;
}

export function beatDuration(event: BattleEvent | null): number {
  if (event === null || prefersReducedMotion()) return 0;
  if (event.type === 'rolled') {
    return Math.max(BEAT_MS.rolled, dieLandMs(event.colors.length - 1) + ROLL_SETTLE_MS);
  }
  return BEAT_MS[event.type];
}
