import { useEffect } from 'react';
import { battleConfigFor, currentStage, victoryGold, type RunAction, type RunConfig, type RunError, type RunState } from '../engine';
import { BattleScreen } from './BattleScreen';
import { RewardScreen } from './RewardScreen';
import { RunEndScreen } from './RunEndScreen';
import { ShopScreen } from './ShopScreen';
import type { RunView } from './useRun';
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
  const act = stage ? ` · Act ${stage.act}` : '';
  return `Fight ${run.stageIndex + 1}/${total}${act}${kind}`;
}

interface RunScreenProps {
  config: RunConfig;
  view: RunView;
  dispatch: (action: RunAction) => void;
  clearError: () => void;
  onNewRun: () => void;
  /** Starts the finished run's seed again. */
  onReplaySeed: () => void;
  onMainMenu: () => void;
  /** Opens the in-run menu (Settings). */
  onMenu: () => void;
  /** Hidden, but kept mounted, while another screen shows. */
  hidden: boolean;
  /** Another screen (Settings, the menu) is on top, so nothing should act on its own. */
  paused: boolean;
}

/**
 * The run in progress. It stays mounted while the menu or Settings shows, so
 * battle playback, the log, and the dice tray keep their state.
 */
export function RunScreen({
  config,
  view,
  dispatch,
  clearError,
  onNewRun,
  onReplaySeed,
  onMainMenu,
  onMenu,
  hidden,
  paused,
}: RunScreenProps) {
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
    <div className={`screen run-screen${run.phase === 'battle' ? ' in-battle' : ''}`} hidden={hidden}>
      <header className="topbar">
        <span className="topbar-left">
          <button type="button" className="icon-btn menu-btn" aria-label="Menu" onClick={onMenu}>
            ☰
          </button>
          <span className="brand">Spill</span>
        </span>
        <span className="stage">{stageLabel(run, config)}</span>
        <span className="stats">
          {outsideBattle && run.phase !== 'defeat' && (
            <span aria-label="HP">
              ❤ {run.hp}/{run.maxHp}
            </span>
          )}
          {/* In a fight, gold sits beside the player's HP instead. */}
          {outsideBattle && <span aria-label="Gold">🪙 {run.gold}</span>}
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
          prevBattle={view.prevBattle}
          config={battleConfigFor(run, config)}
          events={view.events}
          lastRoll={view.lastRoll}
          actionCount={view.actionCount}
          isFinalFight={run.stageIndex === config.stages.length - 1}
          gold={run.gold}
          paused={paused}
          reward={run.battle.phase === 'victory' ? victoryGold(run, config) : null}
          onAction={(action) => dispatch({ type: 'battle', action })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )}
      {run.phase === 'reward' && (
        <RewardScreen run={run} config={config} onChoose={(index, repaint) => dispatch({ type: 'chooseReward', index, repaint })} />
      )}
      {run.phase === 'shop' && <ShopScreen run={run} config={config} onAction={dispatch} />}
      {(run.phase === 'victory' || run.phase === 'defeat') && (
        <RunEndScreen
          run={run}
          config={config}
          seed={view.seed}
          seeded={view.seeded}
          onNewRun={onNewRun}
          onReplaySeed={onReplaySeed}
          onMainMenu={onMainMenu}
        />
      )}
    </div>
  );
}
