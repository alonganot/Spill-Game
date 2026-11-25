import { useCallback, useRef, useState } from 'react';
import { defaultBattleConfig } from '../data/battles';
import {
  applyAction,
  createBattle,
  createSeededRng,
  type ActionError,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type Rng,
} from '../engine';

const CONFIG = defaultBattleConfig();

export interface BattleView {
  seed: number;
  rng: Rng;
  state: BattleState;
  /** Events from the most recent action, for feedback. */
  events: BattleEvent[];
  error: ActionError | null;
  /** Increments on every successful action; used to replay feedback animations. */
  actionCount: number;
}

function startView(): BattleView {
  const seed = Math.floor(Math.random() * 1_000_000);
  const rng = createSeededRng(seed);
  const { state, events } = createBattle(CONFIG, rng);
  return { seed, rng, state, events, error: null, actionCount: 0 };
}

/**
 * Holds a battle in React state and exposes engine actions to the UI.
 * Actions run in the event handler, not inside a state updater, because
 * StrictMode calls updaters twice and would consume extra dice rolls.
 */
export function useBattle(): {
  config: BattleConfig;
  view: BattleView;
  dispatch: (action: BattleAction) => void;
  restart: () => void;
} {
  const [view, setView] = useState(startView);
  const viewRef = useRef(view);
  viewRef.current = view;

  const dispatch = useCallback((action: BattleAction) => {
    const current = viewRef.current;
    const result = applyAction(current.state, action, CONFIG, current.rng);
    const next: BattleView = result.ok
      ? { ...current, state: result.state, events: result.events, error: null, actionCount: current.actionCount + 1 }
      : { ...current, error: result.error };
    viewRef.current = next;
    setView(next);
  }, []);

  const restart = useCallback(() => {
    const next = startView();
    viewRef.current = next;
    setView(next);
  }, []);

  return { config: CONFIG, view, dispatch, restart };
}
