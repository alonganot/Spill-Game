import type { RunConfig, RunState } from '../engine';
import { DieFaces } from './DiceEditor';

interface RunEndScreenProps {
  run: RunState;
  config: RunConfig;
  seed: number;
  onNewRun: () => void;
}

export function RunEndScreen({ run, config, seed, onNewRun }: RunEndScreenProps) {
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
      <button type="button" className="btn btn-primary" onClick={onNewRun}>
        New run
      </button>
      <p className="seed">Seed {seed}</p>
    </section>
  );
}
