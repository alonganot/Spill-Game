import { describe, expect, it } from 'vitest';
import { CHARACTER_ORDER, CHARACTERS } from '../data/characters';
import { runConfigFor } from '../data/run';
import { createSeededRng } from './rng';
import { applyRunAction, createRun } from './run';
import { botAction } from './testBot';
import type { RunConfig } from './types';

const SEEDS = 200;

interface Outcome {
  won: boolean;
  /** The fight (1-based) the run ended on. */
  fight: number;
}

function playRun(seed: number, cfg: RunConfig): Outcome {
  const rng = createSeededRng(seed);
  let { state: run } = createRun(cfg, rng);
  for (let guard = 0; guard < 20000 && run.phase !== 'victory' && run.phase !== 'defeat'; guard++) {
    const action = botAction(run, cfg);
    const result = applyRunAction(run, action, cfg, rng);
    if (!result.ok) throw new Error(`seed ${seed}: ${JSON.stringify(action)} failed with ${result.error}`);
    run = result.state;
  }
  if (run.phase !== 'victory' && run.phase !== 'defeat') throw new Error(`seed ${seed}: run never ended`);
  return { won: run.phase === 'victory', fight: run.stageIndex + 1 };
}

// Every character is held to the same band, so none is a trap or a free win.
describe.each(CHARACTER_ORDER)('balance as the %s (greedy bot over many seeded runs)', (id) => {
  it('is hard: the bot wins only some runs, and losses spread over the later acts', () => {
    const cfg = runConfigFor(id);
    const outcomes = Array.from({ length: SEEDS }, (_, i) => playRun(i + 1, cfg));
    const wins = outcomes.filter((o) => o.won).length;
    const lossesByFight = new Map<number, number>();
    for (const o of outcomes) if (!o.won) lossesByFight.set(o.fight, (lossesByFight.get(o.fight) ?? 0) + 1);
    const pastFight3 = outcomes.filter((o) => o.won || o.fight > 3).length;
    const reachedAct3 = outcomes.filter((o) => o.won || o.fight > 10).length;

    const histogram = [...lossesByFight.entries()].sort(([a], [b]) => a - b).map(([f, n]) => `${f}:${n}`).join(' ');
    console.log(
      `Balance (${CHARACTERS[id].name}): bot won ${wins}/${SEEDS} (${((wins / SEEDS) * 100).toFixed(1)}%); ` +
        `past fight 3: ${pastFight3}; reached act 3: ${reachedAct3}; losses by fight ${histogram}`,
    );

    // Target 10-25% wins; the band is wider so small data tweaks don't break the test.
    expect(wins / SEEDS).toBeGreaterThanOrEqual(0.05);
    expect(wins / SEEDS).toBeLessThanOrEqual(0.35);
    // The opening stays fair, and the run isn't decided by a single wall.
    expect(pastFight3 / SEEDS).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...lossesByFight.values()) / SEEDS).toBeLessThanOrEqual(0.4);
  }, 60_000);
});
