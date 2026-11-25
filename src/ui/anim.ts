import { useSyncExternalStore } from 'react';
import type { BattleEvent } from '../engine';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * How long each playback beat stays on screen, in ms. These are presentation
 * timings only; gameplay numbers live in `src/data/`.
 */
const BEAT_MS: Record<BattleEvent['type'], number> = {
  triggered: 320,
  mixed: 300,
  damaged: 450,
  blockGained: 350,
  statusApplied: 200,
  enemyIntent: 300,
  rolled: 700,
  victory: 300,
  defeat: 300,
};


/*
 * A roll plays on a stage in the middle of the screen: the dice tumble (slowing
 * down as they settle), land one after another, hold for a moment so the result
 * sinks in, then fly back to the tray, and the new pool chips pop in.
 */
/** How often a tumbling die flickers to another face at the start of its tumble. */
export const DIE_FLICKER_MS = 60;
/** The flicker slows to this many times its first speed just before landing. */
export const DIE_FLICKER_SLOWDOWN = 3.5;
const DIE_FIRST_LAND_MS = 800;
const DIE_STAGGER_MS = 220;
/** How long the landed dice stay in the middle before flying back. */
const ROLL_HOLD_MS = 650;
/** How long the flight back to the tray takes. */
export const ROLL_RETURN_MS = 420;
const CHIP_STAGGER_MS = 50;
/** Time after the last chip starts popping in, before input unlocks. */
const ROLL_SETTLE_MS = 260;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
}

/** `prefersReducedMotion`, kept current if the player changes the setting mid-fight. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = typeof window !== 'undefined' ? window.matchMedia?.(REDUCED_MOTION_QUERY) : undefined;
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/** When die `index` stops tumbling, in ms from the start of the roll beat. */
export function dieLandMs(index: number): number {
  return prefersReducedMotion() ? 0 : DIE_FIRST_LAND_MS + index * DIE_STAGGER_MS;
}

/** When the dice leave the middle of the screen for the tray. */
export function rollReturnMs(diceCount: number): number {
  return prefersReducedMotion() ? 0 : dieLandMs(Math.max(0, diceCount - 1)) + ROLL_HOLD_MS;
}

/** When the pool chip from kept die `index` pops in: as the dice reach the tray. */
export function chipPopMs(diceCount: number, index: number): number {
  return prefersReducedMotion() ? 0 : rollReturnMs(diceCount) + ROLL_RETURN_MS * 0.7 + index * CHIP_STAGGER_MS;
}

export function beatDuration(event: BattleEvent | null): number {
  if (event === null || prefersReducedMotion()) return 0;
  if (event.type === 'rolled') {
    const n = event.colors.length;
    return Math.max(BEAT_MS.rolled, chipPopMs(n, Math.max(0, n - 1)) + ROLL_SETTLE_MS);
  }
  return BEAT_MS[event.type];
}
