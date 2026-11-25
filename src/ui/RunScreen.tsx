import { useEffect } from 'react';
import { battleConfigFor, currentStage, type RunConfig, type RunError, type RunState } from '../engine';
import { BattleScreen } from './BattleScreen';
import { RewardScreen } from './RewardScreen';
import { RunEndScreen } from './RunEndScreen';
import { ShopScreen } from './ShopScreen';
import { useRun } from './useRun';
import './battle.css';
import './run.css';

const ERROR_TEXT: Partial<Record<RunError, string>> = {
  not_enough_gold: 'Not enough gold.',
  dice_cap_reached: 'No free dice slot. Buy +1 dice slot first.',
  cap_max_reached: 'Dice slots are already at the max.',
  already_full_hp: 'You are already at full HP.',
  sold_out: 'That die is sold.',
  invalid_target: "That can't be done.",
};

const ERROR_FALLBACK = "That action isn't available right now.";
const ERROR_TOAST_MS = 2500;

/** Text for an error toast, or null for errors that need no message. */
function errorMessage(error: RunError | null): string | null {
  // `wrong_phase` only comes from stale double taps (e.g. tapping Leave shop twice); ignore it.
  if (error === null || error === 'wrong_phase') return null;
  return ERROR_TEXT[error] ?? ERROR_FALLBACK;
}

function stageLabel(run: RunState, config: RunConfig): string {
  const total = config.stages.length;
  if (run.phase === 'shop') return 'Shop';
  if (run.phase === 'reward') return 'Reward';
  if (run.phase === 'victory' || run.phase === 'defeat') return 'Run end';
  const stage = currentStage(run, config);
  const kind = stage?.kind === 'boss' ? ' · Boss' : stage?.kind === 'elite' ? ' · Elite' : '';
  return `Fight ${run.stageIndex + 1}/${total}${kind}`;
}

export function RunScreen() {
  const { config, view, dispatch, restart, clearError } = useRun();
  const { run } = view;
  const outsideBattle = run.phase !== 'battle';
  const error = errorMessage(view.error);

  // Auto-hide the error toast; any newer action restarts the timer.
  useEffect(() => {
    if (view.error === null) return;
    const timer = setTimeout(clearError, ERROR_TOAST_MS);
    return () => clearTimeout(timer);
  }, [view, clearError]);

  return (
    <div className="screen">
      <header className="topbar">
        <span className="brand">Spill</span>
        <span className="stage">{stageLabel(run, config)}</span>
        <span className="stats">
          {outsideBattle && run.phase !== 'defeat' && (
            <span aria-label="HP">
              ❤ {run.hp}/{run.maxHp}
            </span>
          )}
          <span aria-label="Gold">🪙 {run.gold}</span>
        </span>
      </header>

      {error && (
        <p className="error-toast" role="alert">
          {error}
        </p>
      )}

      {run.phase === 'battle' && run.battle && (
        <BattleScreen
          key={run.stageIndex}
          battle={run.battle}
          config={battleConfigFor(run, config)}
          events={view.events}
          actionCount={view.actionCount}
          isFinalFight={currentStage(run, config)?.after === 'end'}
          onAction={(action) => dispatch({ type: 'battle', action })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )}
      {run.phase === 'reward' && (
        <RewardScreen run={run} onChoose={(index, repaint) => dispatch({ type: 'chooseReward', index, repaint })} />
      )}
      {run.phase === 'shop' && <ShopScreen run={run} config={config} onAction={dispatch} />}
      {(run.phase === 'victory' || run.phase === 'defeat') && (
        <RunEndScreen run={run} config={config} seed={view.seed} onNewRun={restart} />
      )}
    </div>
  );
}
