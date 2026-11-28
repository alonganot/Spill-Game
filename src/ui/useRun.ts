import { useCallback, useRef, useState } from 'react';
import { defaultRunConfig } from '../data/run';
import { clearRun, findRoll, loadRun, replayRun, saveRun, type RolledEvent } from './runSave';
import { randomSeed } from './seed';
import {
  applyRunAction,
  createRun,
  createSeededRng,
  type BattleEvent,
  type BattleState,
  type Rng,
  type RunAction,
  type RunConfig,
  type RunError,
  type RunState,
} from '../engine';

const CONFIG = defaultRunConfig();

export interface RunView {
  /** Unique per started run, so a restart on the same seed still gets fresh screens. */
  runId: number;
  seed: number;
  /** True when the player chose the seed, rather than getting a random one. */
  seeded: boolean;
  rng: Rng;
  run: RunState;
  /** Battle events from the most recent action, for the battle log and playback. */
  events: BattleEvent[];
  /** The current fight's latest dice roll, even when it came from an earlier action (or before a reload). */
  lastRoll: RolledEvent | null;
  /** The battle as it was before the most recent action, when that action was a battle action. */
  prevBattle: BattleState | null;
  error: RunError | null;
  /** Increments on every successful action; used to replay feedback animations. */
  actionCount: number;
  /** Every successful action this run, in order: with the seed, enough to rebuild it. */
  actions: RunAction[];
}

let nextRunId = 1;

function startView(chosenSeed?: number): RunView {
  const seed = chosenSeed ?? randomSeed();
  const rng = createSeededRng(seed);
  const { state, events } = createRun(CONFIG, rng);
  return {
    runId: nextRunId++,
    seed,
    seeded: chosenSeed !== undefined,
    rng,
    run: state,
    events,
    lastRoll: findRoll(events),
    prevBattle: null,
    error: null,
    actionCount: 0,
    actions: [],
  };
}

/** The run saved from an earlier visit, rebuilt; or null (clearing a save that no longer replays). */
function restoreView(): RunView | null {
  const save = loadRun();
  if (save === null) return null;
  const replayed = replayRun(save, CONFIG);
  if (replayed === null || isOver(replayed.run)) {
    clearRun();
    return null;
  }
  // A restored run shows its current state; nothing plays back.
  return {
    runId: nextRunId++,
    seed: save.seed,
    seeded: save.seeded,
    rng: replayed.rng,
    run: replayed.run,
    events: [],
    lastRoll: replayed.lastRoll,
    prevBattle: null,
    error: null,
    actionCount: save.actions.length,
    actions: save.actions,
  };
}

function isOver(run: RunState): boolean {
  return run.phase === 'victory' || run.phase === 'defeat';
}

/** Keeps the saved run in step with the one on screen. A finished run isn't kept. */
function persist(view: RunView | null): void {
  if (view === null || isOver(view.run)) clearRun();
  else saveRun({ version: 4, seed: view.seed, seeded: view.seeded, actions: view.actions });
}

export interface RunControls {
  config: RunConfig;
  /** The run in progress, or null before the first run and after abandoning one. */
  view: RunView | null;
  dispatch: (action: RunAction) => void;
  /** Starts a new run, on `seed` if given or a random seed otherwise. */
  start: (seed?: number, seeded?: boolean) => void;
  abandon: () => void;
  clearError: () => void;
}

/**
 * Holds a run in React state and exposes run actions to the UI.
 * Actions run in the event handler, not inside a state updater, because
 * StrictMode calls updaters twice and would consume extra random rolls.
 */
export function useRun(): RunControls {
  // Picks up a run saved before a reload, so the menu can offer Continue.
  const [view, setView] = useState<RunView | null>(restoreView);
  // Only the callbacks below update it, always together with the state.
  const viewRef = useRef(view);

  const commit = useCallback((next: RunView | null) => {
    // Errors don't change the run, so only real changes touch storage.
    if (next?.actions !== viewRef.current?.actions || next?.seed !== viewRef.current?.seed) persist(next);
    viewRef.current = next;
    setView(next);
  }, []);

  const dispatch = useCallback((action: RunAction) => {
    const current = viewRef.current;
    if (current === null) return;
    const result = applyRunAction(current.run, action, CONFIG, current.rng);
    const next: RunView = result.ok
      ? {
          ...current,
          run: result.state,
          events: result.events,
          lastRoll: result.state.battle ? (findRoll(result.events) ?? current.lastRoll) : null,
          // Only a battle action continues the same fight; anything else starts a new one.
          prevBattle: action.type === 'battle' ? current.run.battle : null,
          error: null,
          actionCount: current.actionCount + 1,
          actions: [...current.actions, action],
        }
      : { ...current, error: result.error };
    commit(next);
  }, [commit]);

  const start = useCallback(
    (seed?: number, seeded?: boolean) => {
      const next = startView(seed);
      // Restarting a random run on its own seed keeps it unmarked.
      commit(seeded === undefined ? next : { ...next, seeded });
    },
    [commit],
  );

  const abandon = useCallback(() => commit(null), [commit]);

  const clearError = useCallback(() => {
    const current = viewRef.current;
    if (current !== null && current.error !== null) commit({ ...current, error: null });
  }, [commit]);

  return { config: CONFIG, view, dispatch, start, abandon, clearError };
}
