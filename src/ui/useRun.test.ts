import { describe, expect, it } from 'vitest';
import { runConfigFor } from '../data/run';
import { applyRunAction, createRun, createSeededRng, type RunConfig, type RunState } from '../engine';
import { botAction } from '../engine/testBot';
import { unconfirmedEssence } from './useRun';

const config = runConfigFor('apprentice');

/** Plays with the bot until `stop` says so (or the run ends). */
function playUntil(seed: number, cfg: RunConfig, stop: (run: RunState) => boolean): RunState {
  const rng = createSeededRng(seed);
  let run = createRun(cfg, rng).state;
  for (let i = 0; i < 20000 && !stop(run) && run.phase !== 'victory' && run.phase !== 'defeat'; i++) {
    run = applyRunAction(run, botAction(run, cfg), cfg, rng).state;
  }
  return run;
}

describe('unconfirmedEssence', () => {
  it("pays a lost fight left at the defeat popup what See results would pay", () => {
    const lost = playUntil(2, config, (r) => r.battle?.phase === 'defeat');
    expect(lost.battle?.phase).toBe('defeat');
    const confirmed = applyRunAction(lost, { type: 'continue' }, config, () => 0);
    if (!confirmed.ok) throw new Error(confirmed.error);
    const reward = unconfirmedEssence(lost, config, false);
    expect(reward).not.toBeNull();
    expect(reward!.fightsWon).toBe(lost.stageIndex);
    expect(reward!.total).toBe(Math.floor(lost.gold / 5) + lost.stageIndex * 3);
  });

  it('pays nothing while a fight is going, after a fight that was won mid-run, or for a seeded run', () => {
    const fresh = createRun(config, createSeededRng(1)).state;
    expect(unconfirmedEssence(fresh, config, false)).toBeNull();
    const wonFight1 = playUntil(1, config, (r) => r.battle?.phase === 'victory');
    expect(wonFight1.battle?.phase).toBe('victory');
    expect(unconfirmedEssence(wonFight1, config, false)).toBeNull();
    const lost = playUntil(2, config, (r) => r.battle?.phase === 'defeat');
    expect(unconfirmedEssence(lost, config, true)).toBeNull();
  });

  it('pays nothing once the run is over (See results already paid it)', () => {
    const over = playUntil(2, config, () => false);
    expect(['victory', 'defeat']).toContain(over.phase);
    expect(unconfirmedEssence(over, config, false)).toBeNull();
  });
});
