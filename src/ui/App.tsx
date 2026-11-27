import { MainMenu } from './MainMenu';
import { RunScreen } from './RunScreen';
import { useScreenFlow } from './screenFlow';
import { SettingsScreen } from './SettingsScreen';
import { useRun } from './useRun';
import './battle.css';
import './run.css';
import './menu.css';

/**
 * Owns the run and the screen stack. The run lives here, not in RunScreen, so
 * it outlives trips to the menu; RunScreen stays mounted (just hidden) while
 * another screen shows, so a battle keeps its playback and log.
 */
export function App() {
  const flow = useScreenFlow();
  const { config, view, dispatch, start, abandon, clearError } = useRun();
  const runOver = view !== null && (view.run.phase === 'victory' || view.run.phase === 'defeat');
  // The run shows when it's on top, or under an overlay such as Settings.
  const runVisible = flow.top === 'run' || (flow.top === 'settings' && flow.below === 'run');
  const menuVisible = flow.top === 'menu' || (flow.top === 'settings' && flow.below === 'menu');

  /** Starts a run (random seed unless given) and shows it. */
  const newRun = (seed?: number, seeded?: boolean) => {
    start(seed, seeded);
    flow.reset(['menu', 'run']);
  };

  return (
    <>
      {menuVisible && (
        <MainMenu
          canContinue={view !== null && !runOver}
          onNewRun={() => newRun()}
          onContinue={() => flow.push('run')}
          onSettings={() => flow.push('settings')}
        />
      )}
      {view !== null && (
        <RunScreen
          key={view.runId}
          config={config}
          view={view}
          dispatch={dispatch}
          clearError={clearError}
          onNewRun={() => newRun()}
          onReplaySeed={() => newRun(view.seed, view.seeded)}
          onMainMenu={() => flow.reset(['menu'])}
          onMenu={() => flow.push('settings')}
          hidden={!runVisible}
          paused={flow.top !== 'run'}
        />
      )}
      {flow.top === 'settings' && (
        <SettingsScreen
          inRun={flow.below === 'run'}
          run={view !== null && !runOver ? { seed: view.seed, seeded: view.seeded } : null}
          onBack={flow.back}
          onMainMenu={() => flow.reset(['menu'])}
          onRestart={() => view && newRun(view.seed, view.seeded)}
          onAbandon={() => {
            abandon();
            flow.reset(['menu']);
          }}
          onStartSeeded={(seed) => newRun(seed)}
        />
      )}
    </>
  );
}
