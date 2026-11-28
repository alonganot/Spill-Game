import { useCallback, useRef, useState } from 'react';
import { DEFAULT_CHARACTER, type CharacterId } from '../data/characters';
import { ESSENCE } from '../data/economy';
import { runConfigFor } from '../data/run';
import { grantEssence } from './metaSave';
import { clearRun, findRoll, loadRun, replayRun, saveCharacter, saveRun, type RolledEvent } from './runSave';
import { randomSeed } from './seed';
import { changeMeta } from './useMeta';
import {
  applyRunAction,
  createRun,
  createSeededRng,
  runEssence,
  type BattleEvent,
  type BattleState,
  type EssenceReward,
  type Rng,
  type RunAction,
  type RunConfig,
  type RunError,
  type RunState,
} from '../engine';

export interface RunView {
  /** Unique per started run, so a restart on the same seed still gets fresh screens. */
  runId: number;
  seed: number;
  /** True when the player chose the seed, rather than getting a random one. */
  seeded: boolean;
  /** The character the run started as. */
  characterId: CharacterId;
  /** The run's config: shared rules, plus the character's starting dice and HP. */
  config: RunConfig;
  /** When this run was started or restored (ms); part of its Essence grant key. */
  startedAt: number;
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
  /** The Essence the run paid when it ended; null before then, and for seeded runs. */
  essence: EssenceReward | null;
}

let nextRunId = 1;

function startView(characterId: CharacterId, chosenSeed?: number): RunView {
  const seed = chosenSeed ?? randomSeed();
  const rng = createSeededRng(seed);
  const config = runConfigFor(characterId);
  const { state, events } = createRun(config, rng);
  return {
    runId: nextRunId++,
    seed,
    seeded: chosenSeed !== undefined,
    characterId,
    config,
    startedAt: Date.now(),
    rng,
    run: state,
    events,
    lastRoll: findRoll(events),
    prevBattle: null,
    error: null,
    actionCount: 0,
    actions: [],
    essence: null,
  };
}

/** The run saved from an earlier visit, rebuilt; or null (clearing a save that no longer replays). */
function restoreView(): RunView | null {
  const save = loadRun();
  if (save === null) return null;
  const characterId = saveCharacter(save);
  const config = runConfigFor(characterId);
  const replayed = replayRun(save, config);
  if (replayed === null || isOver(replayed.run)) {
    clearRun();
    return null;
  }
  // A restored run shows its current state; nothing plays back.
  return {
    runId: nextRunId++,
    seed: save.seed,
    seeded: save.seeded,
    characterId,
    config,
    startedAt: Date.now(),
    rng: replayed.rng,
    run: replayed.run,
    events: [],
    lastRoll: replayed.lastRoll,
    prevBattle: null,
    error: null,
    actionCount: save.actions.length,
    actions: save.actions,
    essence: null,
  };
}

function isOver(run: RunState): boolean {
  return run.phase === 'victory' || run.phase === 'defeat';
}

/** Keeps the saved run in step with the one on screen. A finished run isn't kept. */
function persist(view: RunView | null): void {
  if (view === null || isOver(view.run)) clearRun();
  else saveRun({ version: 6, seed: view.seed, seeded: view.seeded, characterId: view.characterId, actions: view.actions });
}

/** Identifies one finished run, so its Essence is paid once. */
export function essenceGrantKey(view: Pick<RunView, 'seed' | 'startedAt' | 'actionCount'>): string {
  return `${view.seed}:${view.startedAt}:${view.actionCount}`;
}

/**
 * The Essence a run would pay if its finished fight were confirmed: the fight is
 * lost (or the final fight won) but the player hasn't pressed See results /
 * Finish run yet. Null when the run is still going, already over, or seeded.
 */
export function unconfirmedEssence(run: RunState, config: RunConfig, seeded: boolean): EssenceReward | null {
  if (isOver(run) || !run.battle || run.battle.phase === 'player') return null;
  // A lost or final fight's `continue` draws nothing, so a dummy rng leaves nothing out.
  const result = applyRunAction(run, { type: 'continue' }, config, () => 0);
  return result.ok ? runEssence(result.state, config, ESSENCE, seeded) : null;
}

/** Pays a run that is being left (abandoned, restarted, replaced) after it was already lost or won. */
function payUnconfirmedEnd(view: RunView | null): void {
  if (view === null) return;
  const reward = unconfirmedEssence(view.run, view.config, view.seeded);
  // Same key the confirming `continue` would use, so the run can never pay twice.
  const key = essenceGrantKey({ ...view, actionCount: view.actionCount + 1 });
  if (reward) changeMeta((meta) => grantEssence(meta, key, reward.total));
}

export interface RunControls {
  /** The run in progress, or null before the first run and after abandoning one. */
  view: RunView | null;
  dispatch: (action: RunAction) => void;
  /** Starts a new run as `characterId`, on `seed` if given or a random seed otherwise. */
  start: (characterId: CharacterId, seed?: number, seeded?: boolean) => void;
  abandon: () => void;
  clearError: () => void;
}

/**
 * Holds a run in React state and exposes run actions to the UI.
 * Actions run in the event handler, not inside a state updater, because
 * StrictMode calls updaters twice and would consume extra random rolls
 * (and, for the action that ends a run, pay its Essence twice).
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
    const result = applyRunAction(current.run, action, current.config, current.rng);
    if (!result.ok) {
      commit({ ...current, error: result.error });
      return;
    }
    const next: RunView = {
      ...current,
      run: result.state,
      events: result.events,
      lastRoll: result.state.battle ? (findRoll(result.events) ?? current.lastRoll) : null,
      // Only a battle action continues the same fight; anything else starts a new one.
      prevBattle: action.type === 'battle' ? current.run.battle : null,
      error: null,
      actionCount: current.actionCount + 1,
      actions: [...current.actions, action],
    };
    // The action that ends the run pays its Essence (none for a seeded run).
    if (!isOver(current.run) && isOver(next.run)) {
      next.essence = runEssence(next.run, next.config, ESSENCE, next.seeded);
      const reward = next.essence;
      if (reward) changeMeta((meta) => grantEssence(meta, essenceGrantKey(next), reward.total));
    }
    commit(next);
  }, [commit]);

  const start = useCallback(
    (characterId: CharacterId = DEFAULT_CHARACTER, seed?: number, seeded?: boolean) => {
      payUnconfirmedEnd(viewRef.current);
      const next = startView(characterId, seed);
      // Restarting a random run on its own seed keeps it unmarked.
      commit(seeded === undefined ? next : { ...next, seeded });
    },
    [commit],
  );

  const abandon = useCallback(() => {
    payUnconfirmedEnd(viewRef.current);
    commit(null);
  }, [commit]);

  const clearError = useCallback(() => {
    const current = viewRef.current;
    if (current !== null && current.error !== null) commit({ ...current, error: null });
  }, [commit]);

  return { view, dispatch, start, abandon, clearError };
}
