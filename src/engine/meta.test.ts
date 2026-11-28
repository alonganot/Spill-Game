import { describe, expect, it } from 'vitest';
import { ESSENCE } from '../data/economy';
import { defaultRunConfig, runConfigFor } from '../data/run';
import { runEssence } from './meta';
import { createSeededRng } from './rng';
import { applyRunAction, createRun } from './run';
import { botAction } from './testBot';
import type { RunConfig, RunPhase, RunState } from './types';

const config = defaultRunConfig();

function ended(phase: RunPhase, stageIndex: number, gold: number) {
  return { phase, stageIndex, gold };
}

/** Plays a whole run with the test bot. */
function playOut(seed: number, cfg: RunConfig): RunState {
  const rng = createSeededRng(seed);
  let { state: run } = createRun(cfg, rng);
  for (let guard = 0; guard < 20000 && run.phase !== 'victory' && run.phase !== 'defeat'; guard++) {
    const result = applyRunAction(run, botAction(run, cfg), cfg, rng);
    if (!result.ok) throw new Error(result.error);
    run = result.state;
  }
  return run;
}

describe('runEssence', () => {
  it('pays the RULES.md example for a win: 60 gold left', () => {
    expect(runEssence(ended('victory', 14, 60), config, ESSENCE, false)).toEqual({
      fightsWon: 15,
      gold: 12,
      fights: 45,
      victory: 30,
      total: 87,
    });
  });

  it('pays the RULES.md example for a loss in fight 8 with 20 gold left', () => {
    expect(runEssence(ended('defeat', 7, 20), config, ESSENCE, false)).toEqual({
      fightsWon: 7,
      gold: 4,
      fights: 21,
      victory: 0,
      total: 25,
    });
  });

  it('rounds the gold share down, and a loss in fight 1 with no gold pays nothing', () => {
    expect(runEssence(ended('defeat', 2, 14), config, ESSENCE, false)?.gold).toBe(2);
    expect(runEssence(ended('defeat', 0, 0), config, ESSENCE, false)).toMatchObject({ fightsWon: 0, total: 0 });
  });

  it('pays nothing for a seeded run', () => {
    expect(runEssence(ended('victory', 14, 60), config, ESSENCE, true)).toBeNull();
    expect(runEssence(ended('defeat', 7, 20), config, ESSENCE, true)).toBeNull();
  });

  it('pays nothing while the run is still going', () => {
    for (const phase of ['battle', 'reward', 'shop'] as const) {
      expect(runEssence(ended(phase, 3, 50), config, ESSENCE, false), phase).toBeNull();
    }
  });

  it('counts fights from the real run, for every character', () => {
    for (const id of ['apprentice', 'tank', 'healer'] as const) {
      const cfg = runConfigFor(id);
      const run = playOut(3, cfg);
      const reward = runEssence(run, cfg, ESSENCE, false)!;
      expect(reward, id).not.toBeNull();
      const fightsWon = run.phase === 'victory' ? cfg.stages.length : run.stageIndex;
      expect(reward.fights, id).toBe(fightsWon * ESSENCE.perFightWon);
      expect(reward.total, id).toBe(reward.gold + reward.fights + reward.victory);
    }
  });
});
