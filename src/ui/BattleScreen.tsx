import { useState } from 'react';
import {
  canAfford,
  findRecipe,
  getEnemyIntent,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
} from '../engine';
import { enemySprite, HERO_SPRITE } from '../data/sprites';
import { Badges, ColorDot, CostDots, HpBar } from './components';
import { PixelSprite } from './PixelSprite';
import { COLOR_LABEL, describeEffect, describeIntent, formatEvent } from './format';
import './battle.css';

function wasHit(events: BattleEvent[], target: 'player' | 'enemy'): boolean {
  return events.some((e) => e.type === 'damaged' && e.target === target && e.amount > 0);
}

interface BattleScreenProps {
  battle: BattleState;
  config: BattleConfig;
  events: BattleEvent[];
  actionCount: number;
  isFinalFight: boolean;
  onAction: (action: BattleAction) => void;
  onContinue: () => void;
}

export function BattleScreen({ battle: state, config, events, actionCount, isFinalFight, onAction, onContinue }: BattleScreenProps) {
  const [selected, setSelected] = useState<number[]>([]);

  const intent = getEnemyIntent(state, config);
  const enemyArt = enemySprite(config.enemy.id);
  const playerHit = wasHit(events, 'player');
  const isOver = state.phase !== 'player';
  const log = events.map((e) => formatEvent(e, config)).filter((line): line is string => line !== null);

  const selectedColors = selected.map((i) => state.pool[i]).filter((c) => c !== undefined);
  const [a, b] = selectedColors;
  const recipe = a && b ? findRecipe(config.recipes, a, b) : undefined;

  function toggle(index: number) {
    setSelected((cur) => {
      if (cur.includes(index)) return cur.filter((i) => i !== index);
      return cur.length >= 2 ? [index] : [...cur, index];
    });
  }

  function act(action: BattleAction) {
    setSelected([]);
    onAction(action);
  }

  return (
    <>
      <section key={`enemy-${actionCount}`} className={`card enemy with-sprite${wasHit(events, 'enemy') ? ' hit' : ''}`}>
        {enemyArt && (
          <div className="sprite-stage">
            <PixelSprite sprite={enemyArt} frame="idle" size={88} label={config.enemy.name} />
          </div>
        )}
        <div className="card-body">
          <div className="card-title">
            <h2>{config.enemy.name}</h2>
            <Badges combatant={state.enemy} />
          </div>
          {intent && !isOver && (
            <span className={`intent intent-${intent.type}`} aria-label="Enemy intent">
              {intent.type === 'attack' ? '⚔' : '🛡'} {describeIntent(intent)}
            </span>
          )}
          <HpBar combatant={state.enemy} />
        </div>
      </section>

      <section className="log" aria-live="polite">
        {log.map((line, i) => (
          <p key={`${actionCount}-${i}`}>{line}</p>
        ))}
      </section>

      <section key={`player-${actionCount}`} className={`card player with-sprite${playerHit ? ' hit' : ''}`}>
        <PixelSprite sprite={HERO_SPRITE} frame={playerHit ? 'hit' : 'idle'} size={48} label="You" className="hero" />
        <div className="card-body">
          <div className="card-row">
            <div className="card-title">
              <h2>You</h2>
              <Badges combatant={state.player} />
            </div>
            <span className="muted">Turn {state.turn}</span>
          </div>
          <HpBar combatant={state.player} />
        </div>
      </section>

      <section className="pool-section">
        <div className="section-head">
          <h3>Color pool</h3>
          <span className="muted">
            {state.pool.length} / {config.maxPoolSize}
          </span>
        </div>
        <div className="pool">
          {state.pool.length === 0 && <span className="muted">Empty. End the turn to roll.</span>}
          {state.pool.map((color, i) => (
            <button
              key={i}
              type="button"
              className={`chip chip-${color}${selected.includes(i) ? ' selected' : ''}`}
              onClick={() => toggle(i)}
              disabled={isOver}
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
            <button type="button" className="btn btn-mix" onClick={() => act({ type: 'mix', colors: [a, b] })}>
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
          const affordable = canAfford(state.pool, attack.cost);
          const effects = attack.effects.map(describeEffect).join(' · ');
          return (
            <button
              key={attack.id}
              type="button"
              className="attack"
              aria-label={`${attack.name}: ${effects}`}
              disabled={!affordable || isOver}
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
        <button type="button" className="btn btn-primary" onClick={() => act({ type: 'endTurn' })} disabled={isOver}>
          End turn
        </button>
      </footer>

      {isOver && (
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
