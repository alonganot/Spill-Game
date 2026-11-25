import { useCallback, useRef, useState } from 'react';
import { defaultRunConfig } from '../data/run';
import {
  applyRunAction,
  createRun,
  createSeededRng,
  type BattleEvent,
  type Rng,
  type RunAction,
  type RunConfig,
  type RunError,
  type RunState,
} from '../engine';

const CONFIG = defaultRunConfig();

export interface RunView {
  seed: number;
  rng: Rng;
  run: RunState;
  /** Battle events from the most recent action, for the battle log. */
  events: BattleEvent[];
  error: RunError | null;
  /** Increments on every successful action; used to replay feedback animations. */
  actionCount: number;
}

function startView(): RunView {
  const seed = Math.floor(Math.random() * 1_000_000);
  const rng = createSeededRng(seed);
  const { state, events } = createRun(CONFIG, rng);
  return { seed, rng, run: state, events, error: null, actionCount: 0 };
}

/**
 * Holds a run in React state and exposes run actions to the UI.
 * Actions run in the event handler, not inside a state updater, because
 * StrictMode calls updaters twice and would consume extra random rolls.
 */
export function useRun(): {
  config: RunConfig;
  view: RunView;
  dispatch: (action: RunAction) => void;
  restart: () => void;
  clearError: () => void;
} {
  const [view, setView] = useState(startView);
  // Seeded from the first committed state; after that only the callbacks below update it.
  const viewRef = useRef(view);

  const commit = useCallback((next: RunView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const dispatch = useCallback((action: RunAction) => {
    const current = viewRef.current;
    const result = applyRunAction(current.run, action, CONFIG, current.rng);
    const next: RunView = result.ok
      ? { ...current, run: result.state, events: result.events, error: null, actionCount: current.actionCount + 1 }
      : { ...current, error: result.error };
    commit(next);
  }, [commit]);

  const restart = useCallback(() => commit(startView()), [commit]);

  const clearError = useCallback(() => {
    if (viewRef.current.error !== null) commit({ ...viewRef.current, error: null });
  }, [commit]);

  return { config: CONFIG, view, dispatch, restart, clearError };
}
