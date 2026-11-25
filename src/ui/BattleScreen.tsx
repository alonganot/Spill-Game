import { useMemo, useState } from 'react';
import {
  canAfford,
  findMixPlan,
  findRecipe,
  getEnemyIntent,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type MixRecipe,
  type Target,
} from '../engine';
import { enemySprite, HERO_SPRITE } from '../data/sprites';
import { Badges, ColorDot, CostDots, HpBar } from './components';
import { dieLandMs } from './anim';
import { TrayDie } from './PixelDie';
import { PixelSprite } from './PixelSprite';
import { COLOR_LABEL, describeEffect, describeIntent, formatEvent } from './format';
import { beforeOpeningRoll, buildTimeline } from './timeline';
import { chipsForPlan } from './mixHint';
import { usePlayback } from './usePlayback';
import './battle.css';

type RolledEvent = Extract<BattleEvent, { type: 'rolled' }>;

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

  // The tray shows the last roll through mixes and attacks, and keeps the
  // previous roll on screen until this action's roll beat comes up.
  const rollIndex = events.findIndex((e) => e.type === 'rolled');
  const rollEvent = rollIndex >= 0 ? (events[rollIndex] as RolledEvent) : undefined;
  const [rolls, setRolls] = useState<{ current?: RolledEvent; previous?: RolledEvent }>({ current: rollEvent });
  if (rollEvent && rollEvent !== rolls.current) setRolls({ current: rollEvent, previous: rolls.current });
  const beforeRollBeat = playing && rollEvent !== undefined && index < rollIndex;
  const shownRoll = beforeRollBeat ? rolls.previous : (rollEvent ?? rolls.current);
  const rolling = playing && step.event?.type === 'rolled';
  const keptCount = shownRoll ? shownRoll.colors.length - shownRoll.discarded.length : 0;

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

  // Spells the pool can't pay yet, but could after some mixes.
  const mixPlans = useMemo(() => {
    const plans = new Map<string, MixRecipe[]>();
    for (const attack of config.attacks) {
      if (canAfford(pool, attack.cost)) continue;
      const plan = findMixPlan(pool, attack.cost, config.recipes);
      if (plan && plan.length > 0) plans.set(attack.id, plan);
    }
    return plans;
  }, [pool, config]);
  const [hintedAttack, setHintedAttack] = useState<string | null>(null);
  const hintedPlan = !locked && hintedAttack ? mixPlans.get(hintedAttack) : undefined;
  const hintedChips = hintedPlan ? chipsForPlan(pool, hintedPlan) : [];

  /** Tapping a craftable spell selects the chips for its next mix, ready for the Mix button. */
  function prepareMix(plan: MixRecipe[]) {
    setSelected(chipsForPlan(pool, plan).slice(0, 2));
  }

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
          {pool.map((color, i) => {
            // While dice land, each new chip pops in as its die lands.
            const fromDie = i - before.pool.length;
            const landing = rolling && fromDie >= 0;
            return (
            <button
              key={i}
              type="button"
              className={`chip chip-${color}${selected.includes(i) ? ' selected' : ''}${landing ? ' chip-landing' : ''}${hintedChips.includes(i) ? ' chip-hint' : ''}`}
              style={landing ? { animationDelay: `${dieLandMs(fromDie)}ms` } : undefined}
              onClick={() => toggle(i)}
              disabled={locked}
              aria-pressed={selected.includes(i)}
            >
              {COLOR_LABEL[color]}
            </button>
            );
          })}
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
          const plan = mixPlans.get(attack.id);
          const effects = attack.effects.map(describeEffect).join(' · ');
          const mixes = plan ? `${plan.length} mix${plan.length > 1 ? 'es' : ''}` : '';
          return (
            <button
              key={attack.id}
              type="button"
              className={`attack${plan ? ' attack-craftable' : ''}`}
              aria-label={`${attack.name}: ${effects}${plan ? `. Needs ${mixes} first; tap to pick the colors` : ''}`}
              disabled={(!affordable && !plan) || locked}
              onClick={() => (plan ? prepareMix(plan) : act({ type: 'trigger', attackId: attack.id }))}
              onPointerEnter={() => plan && setHintedAttack(attack.id)}
              onPointerLeave={() => setHintedAttack(null)}
              onFocus={() => plan && setHintedAttack(attack.id)}
              onBlur={() => setHintedAttack(null)}
            >
              {plan && (
                <span className="attack-mix-tag" aria-hidden="true">
                  ⚗ {mixes}
                </span>
              )}
              <span className="attack-name">{attack.name}</span>
              <CostDots cost={attack.cost} />
              <span className="attack-fx">{effects}</span>
            </button>
          );
        })}
      </section>

      <footer className="footer footer-battle">
        <div className="dice-tray" role="group" aria-label="Your dice">
          {config.dice.map((die, i) => (
            <TrayDie
              key={i}
              die={die}
              result={shownRoll?.colors[i]}
              rolling={rolling}
              rollKey={actionCount}
              landMs={dieLandMs(i)}
              discarded={shownRoll !== undefined && i >= keptCount}
            />
          ))}
        </div>
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
