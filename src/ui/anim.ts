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

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function beatDuration(event: BattleEvent | null): number {
  if (event === null || prefersReducedMotion()) return 0;
  return BEAT_MS[event.type];
}
