import type { EssenceReward, RunConfig, RunState } from '../engine';
import { ESSENCE } from '../data/economy';
import { DieFaces } from './DiceEditor';
import { formatEssence } from './format';
import { SeedLine } from './SeedLine';

interface RunEndScreenProps {
  run: RunState;
  config: RunConfig;
  seed: number;
  seeded: boolean;
  characterName: string;
  /** What the run paid; null for a seeded run (or a run that ended before this version paid Essence). */
  essence: EssenceReward | null;
  /** The Essence balance after this run's payout. */
  essenceTotal: number;
  onNewRun: () => void;
  onReplaySeed: () => void;
  onMainMenu: () => void;
}

export function RunEndScreen({
  run,
  config,
  seed,
  seeded,
  characterName,
  essence,
  essenceTotal,
  onNewRun,
  onReplaySeed,
  onMainMenu,
}: RunEndScreenProps) {
  const won = run.phase === 'victory';
  const names = [...new Set(config.stages[run.stageIndex]?.enemies.map((e) => e.name) ?? [])];
  const foes = names.length === 0 ? 'an enemy' : names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return (
    <section className="panel run-end">
      <h2 className={won ? 'victory' : 'defeat'}>{won ? 'Run complete!' : 'Run over'}</h2>
      <p className="muted">
        {won
          ? `As the ${characterName}, you beat all ${config.stages.length} fights with ${run.hp} HP left.`
          : `As the ${characterName}, defeated by ${foes} in fight ${run.stageIndex + 1} of ${config.stages.length}.`}
      </p>
      <EssenceEarned essence={essence} seeded={seeded} gold={run.gold} total={essenceTotal} />
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

/** The run's Essence by source (like the Victory popup's gold list), then the new balance. */
function EssenceEarned({ essence, seeded, gold, total }: { essence: EssenceReward | null; seeded: boolean; gold: number; total: number }) {
  if (essence === null) {
    return <p className="muted essence-earned">{seeded ? 'Seeded run: no Essence.' : 'No Essence for this run.'}</p>;
  }
  return (
    <div className="essence-earned">
      <h3 className="subhead">Essence earned</h3>
      <dl className="gold-breakdown" aria-label="Essence earned">
        <div className="gold-line">
          <dt>
            Gold left ({gold} ÷ {ESSENCE.goldDivisor})
          </dt>
          <dd>+{essence.gold}</dd>
        </div>
        <div className="gold-line">
          <dt>
            Fights won ({essence.fightsWon} × {ESSENCE.perFightWon})
          </dt>
          <dd>+{essence.fights}</dd>
        </div>
        {essence.victory > 0 && (
          <div className="gold-line">
            <dt>Run won</dt>
            <dd>+{essence.victory}</dd>
          </div>
        )}
        <div className="gold-line gold-total">
          <dt>Total</dt>
          <dd>+{formatEssence(essence.total)}</dd>
        </div>
      </dl>
      <p className="muted small">
        Essence: <strong>{formatEssence(total)}</strong>
      </p>
    </div>
  );
}
