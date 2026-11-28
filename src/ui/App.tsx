import type { CharacterId } from '../data/characters';
import { HERO_SPRITES } from '../data/sprites';
import { CharacterSelect } from './CharacterSelect';
import { MainMenu } from './MainMenu';
import { selectCharacter, unlockCharacter } from './metaSave';
import { RunScreen } from './RunScreen';
import { useScreenFlow } from './screenFlow';
import { SettingsScreen } from './SettingsScreen';
import { changeMeta, useMeta } from './useMeta';
import { useRun } from './useRun';
import './battle.css';
import './run.css';
import './menu.css';

/**
 * Owns the run, the meta progress, and the screen stack. The run lives here,
 * not in RunScreen, so it outlives trips to the menu; RunScreen stays mounted
 * (just hidden) while another screen shows, so a battle keeps its playback and log.
 */
export function App() {
  const flow = useScreenFlow();
  const meta = useMeta();
  const { view, dispatch, start, abandon, clearError } = useRun();
  const runOver = view !== null && (view.run.phase === 'victory' || view.run.phase === 'defeat');
  // The run shows when it's on top, or under an overlay such as Settings.
  const runVisible = flow.top === 'run' || (flow.top === 'settings' && flow.below === 'run');
  const menuVisible = flow.top === 'menu' || (flow.top === 'settings' && flow.below === 'menu');

  /** Starts a run as `characterId` (random seed unless given) and shows it. */
  const newRun = (characterId: CharacterId, seed?: number, seeded?: boolean) => {
    start(characterId, seed, seeded);
    flow.reset(['menu', 'run']);
  };

  return (
    <>
      {menuVisible && (
        <MainMenu
          canContinue={view !== null && !runOver}
          essence={meta.essence}
          heroSprite={HERO_SPRITES[meta.selected]}
          onNewRun={() => flow.push('characters')}
          onContinue={() => flow.push('run')}
          onSettings={() => flow.push('settings')}
        />
      )}
      {view !== null && (
        <RunScreen
          key={view.runId}
          view={view}
          essenceTotal={meta.essence}
          dispatch={dispatch}
          clearError={clearError}
          onNewRun={() => flow.push('characters')}
          // Replaying a seed keeps the run's own character and its Seeded/Random mark.
          onReplaySeed={() => newRun(view.characterId, view.seed, view.seeded)}
          onMainMenu={() => flow.reset(['menu'])}
          onMenu={() => flow.push('settings')}
          hidden={!runVisible}
          paused={flow.top !== 'run'}
        />
      )}
      {flow.top === 'characters' && (
        <CharacterSelect
          meta={meta}
          onSelect={(id) => changeMeta((m) => selectCharacter(m, id))}
          onUnlock={(id) => changeMeta((m) => unlockCharacter(m, id) ?? m)}
          onStart={() => newRun(meta.selected)}
          onBack={flow.back}
        />
      )}
      {flow.top === 'settings' && (
        <SettingsScreen
          inRun={flow.below === 'run'}
          run={view !== null && !runOver ? { seed: view.seed, seeded: view.seeded } : null}
          onBack={flow.back}
          onMainMenu={() => flow.reset(['menu'])}
          onRestart={() => view && newRun(view.characterId, view.seed, view.seeded)}
          onAbandon={() => {
            abandon();
            flow.reset(['menu']);
          }}
          // A typed seed starts as the character picked for the next run.
          onStartSeeded={(seed) => newRun(meta.selected, seed)}
        />
      )}
    </>
  );
}
