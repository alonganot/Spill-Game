import type { RunConfig, RunState } from '../engine';
import { DieFaces } from './DiceEditor';
import { SeedLine } from './SeedLine';

interface RunEndScreenProps {
  run: RunState;
  config: RunConfig;
  seed: number;
  seeded: boolean;
  onNewRun: () => void;
  onReplaySeed: () => void;
  onMainMenu: () => void;
}

export function RunEndScreen({ run, config, seed, seeded, onNewRun, onReplaySeed, onMainMenu }: RunEndScreenProps) {
  const won = run.phase === 'victory';
  const enemy = config.stages[run.stageIndex]?.enemy.name;
  return (
    <section className="panel run-end">
      <h2 className={won ? 'victory' : 'defeat'}>{won ? 'Run complete!' : 'Run over'}</h2>
      <p className="muted">
        {won
          ? `You beat all ${config.stages.length} fights with ${run.hp} HP left.`
          : `Defeated by ${enemy ?? 'an enemy'} in fight ${run.stageIndex + 1} of ${config.stages.length}.`}
      </p>
      <div>
        <h3 className="subhead">Your dice</h3>
        <ul className="dice-list">
          {run.dice.map((die, i) => (
            <li key={i} className="die-row">
              <span className="die-name">{die.name}</span>
              <DieFaces die={die} />
            </li>
          ))}
        </ul>
      </div>
      <SeedLine seed={seed} seeded={seeded} />
      <div className="run-end-actions">
        <button type="button" className="btn btn-primary" onClick={onNewRun}>
          New run
        </button>
        <div className="settings-row">
          <button type="button" className="btn btn-menu" onClick={onReplaySeed}>
            Replay seed
          </button>
          <button type="button" className="btn btn-menu" onClick={onMainMenu}>
            Main menu
          </button>
        </div>
      </div>
    </section>
  );
}
