import type { EssenceConfig, EssenceReward, RunConfig, RunState } from './types';

/**
 * The Essence a finished run pays (RULES.md §4, Characters & Essence):
 * remaining gold ÷ divisor (rounded down), plus an amount per fight won,
 * plus a bonus for winning the run. Null while the run is still going, and
 * for seeded runs, which never pay.
 */
export function runEssence(
  run: Pick<RunState, 'phase' | 'gold' | 'stageIndex'>,
  config: Pick<RunConfig, 'stages'>,
  essence: EssenceConfig,
  seeded: boolean,
): EssenceReward | null {
  if (seeded) return null;
  if (run.phase !== 'victory' && run.phase !== 'defeat') return null;
  const won = run.phase === 'victory';
  // On a loss the run stops at the fight it lost, so every earlier fight was won.
  const fightsWon = won ? config.stages.length : run.stageIndex;
  const gold = Math.floor(Math.max(0, run.gold) / essence.goldDivisor);
  const fights = fightsWon * essence.perFightWon;
  const victory = won ? essence.victoryBonus : 0;
  return { fightsWon, gold, fights, victory, total: gold + fights + victory };
}
