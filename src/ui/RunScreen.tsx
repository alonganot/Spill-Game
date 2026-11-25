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
  const { config, view, dispatch, restart } = useRun();
  const { run } = view;
  const outsideBattle = run.phase !== 'battle';

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

      {view.error && ERROR_TEXT[view.error] && (
        <p className="error" role="alert">
          {ERROR_TEXT[view.error]}
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
