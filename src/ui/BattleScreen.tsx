import { useMemo, useState } from 'react';
import {
  canAfford,
  findRecipe,
  getEnemyIntent,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type Target,
} from '../engine';
import { enemySprite, HERO_SPRITE } from '../data/sprites';
import { Badges, ColorDot, CostDots, HpBar } from './components';
import { PixelSprite } from './PixelSprite';
import { COLOR_LABEL, describeEffect, describeIntent, formatEvent } from './format';
import { beforeOpeningRoll, buildTimeline } from './timeline';
import { usePlayback } from './usePlayback';
import './battle.css';

/** Who takes a hit on this beat, if anyone. */
function hitTarget(event: BattleEvent | null): Target | null {
  return event?.type === 'damaged' && event.amount > 0 ? event.target : null;
}

interface BattleScreenProps {
  battle: BattleState;
  /** The battle before the latest action, or null when this fight just started. */
  prevBattle: BattleState | null;
  config: BattleConfig;
  events: BattleEvent[];
  actionCount: number;
  isFinalFight: boolean;
  onAction: (action: BattleAction) => void;
  onContinue: () => void;
}

export function BattleScreen({
  battle: state,
  prevBattle,
  config,
  events,
  actionCount,
  isFinalFight,
  onAction,
  onContinue,
}: BattleScreenProps) {
  const [selected, setSelected] = useState<number[]>([]);

  const before = useMemo(() => prevBattle ?? beforeOpeningRoll(state, events), [prevBattle, state, events]);
  const steps = useMemo(() => buildTimeline(before, events, state), [before, events, state]);
  const { step, index, playing, skip } = usePlayback(steps, actionCount);

  // While the beats play, show the numbers of the current beat, not the final ones.
  const player = { ...state.player, ...step.player };
  const enemy = { ...state.enemy, ...step.enemy };
  const pool = step.pool;

  const intent = getEnemyIntent(playing ? before : state, config);
  const enemyArt = enemySprite(config.enemy.id);
  const hit = playing ? hitTarget(step.event) : null;
  const beatKey = `${actionCount}-${index}`;
  const isOver = state.phase !== 'player';
  const locked = isOver || playing;
  const log = (playing ? events.slice(0, index + 1) : events)
    .map((e) => formatEvent(e, config))
    .filter((line): line is string => line !== null);

  const selectedColors = selected.map((i) => pool[i]).filter((c) => c !== undefined);
  const [a, b] = selectedColors;
  const recipe = a && b ? findRecipe(config.recipes, a, b) : undefined;

  function toggle(i: number) {
    setSelected((cur) => {
      if (cur.includes(i)) return cur.filter((x) => x !== i);
      return cur.length >= 2 ? [i] : [...cur, i];
    });
  }

  function act(action: BattleAction) {
    setSelected([]);
    onAction(action);
  }

  return (
    <>
      <section className="card enemy with-sprite">
        {enemyArt && (
          <div key={hit === 'enemy' ? beatKey : 'still'} className={`sprite-stage${hit === 'enemy' ? ' hit' : ''}`}>
            <PixelSprite sprite={enemyArt} frame="idle" size={88} label={config.enemy.name} />
          </div>
        )}
        <div className="card-body">
          <div className="card-title">
            <h2>{config.enemy.name}</h2>
            <Badges combatant={enemy} />
          </div>
          {intent && !isOver && (
            <span className={`intent intent-${intent.type}`} aria-label="Enemy intent">
              {intent.type === 'attack' ? '⚔' : '🛡'} {describeIntent(intent)}
            </span>
          )}
          <HpBar combatant={enemy} />
        </div>
      </section>

      <section className="log" aria-live="polite">
        {log.map((line, i) => (
          <p key={`${actionCount}-${i}`}>{line}</p>
        ))}
      </section>

      <section className="card player with-sprite">
        <div key={hit === 'player' ? beatKey : 'still'} className={`hero-stage${hit === 'player' ? ' hit' : ''}`}>
          <PixelSprite sprite={HERO_SPRITE} frame={hit === 'player' ? 'hit' : 'idle'} size={48} label="You" />
        </div>
        <div className="card-body">
          <div className="card-row">
            <div className="card-title">
              <h2>You</h2>
              <Badges combatant={player} />
            </div>
            <span className="muted">Turn {state.turn}</span>
          </div>
          <HpBar combatant={player} />
        </div>
      </section>

      <section className="pool-section">
        <div className="section-head">
          <h3>Color pool</h3>
          <span className="muted">
            {pool.length} / {config.maxPoolSize}
          </span>
        </div>
        <div className="pool">
          {pool.length === 0 && <span className="muted">Empty. End the turn to roll.</span>}
          {pool.map((color, i) => (
            <button
              key={i}
              type="button"
              className={`chip chip-${color}${selected.includes(i) ? ' selected' : ''}`}
              onClick={() => toggle(i)}
              disabled={locked}
              aria-pressed={selected.includes(i)}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
        <div className="mixbar">
          {selectedColors.length < 2 ? (
            <span className="muted">
              {selectedColors.length === 0 ? 'Tap two colors to mix them.' : 'Tap one more color to mix.'}
            </span>
          ) : recipe && a && b ? (
            <button
              type="button"
              className="btn btn-mix"
              disabled={locked}
              onClick={() => act({ type: 'mix', colors: [a, b] })}
            >
              Mix <ColorDot color={a} small /> + <ColorDot color={b} small /> → <ColorDot color={recipe.output} small />{' '}
              {COLOR_LABEL[recipe.output]}
            </button>
          ) : (
            <span className="muted">Those two colors don't mix.</span>
          )}
        </div>
      </section>

      <section className="attacks">
        {config.attacks.map((attack) => {
          const affordable = canAfford(pool, attack.cost);
          const effects = attack.effects.map(describeEffect).join(' · ');
          return (
            <button
              key={attack.id}
              type="button"
              className="attack"
              aria-label={`${attack.name}: ${effects}`}
              disabled={!affordable || locked}
              onClick={() => act({ type: 'trigger', attackId: attack.id })}
            >
              <span className="attack-name">{attack.name}</span>
              <CostDots cost={attack.cost} />
              <span className="attack-fx">{effects}</span>
            </button>
          );
        })}
      </section>

      <footer className="footer">
        <button type="button" className="btn btn-primary" onClick={() => act({ type: 'endTurn' })} disabled={locked}>
          End turn
        </button>
      </footer>

      {playing && <button type="button" className="skip-layer" aria-label="Skip animation" onClick={skip} />}

      {isOver && !playing && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result">
            <h2 id="result-title" className={state.phase}>
              {state.phase === 'victory' ? 'Victory!' : 'Defeated'}
            </h2>
            <p className="muted">
              {state.phase === 'victory'
                ? `You beat ${config.enemy.name} on turn ${state.turn} with ${state.player.hp} HP left.`
                : `${config.enemy.name} had ${state.enemy.hp} HP left.`}
            </p>
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              {state.phase === 'defeat' ? 'See results' : isFinalFight ? 'Finish run' : 'Continue'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
