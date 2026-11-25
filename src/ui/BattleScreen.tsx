import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  canAfford,
  findMixPlan,
  findRecipe,
  getEnemyIntent,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type Color,
  type MixRecipe,
} from '../engine';
import { enemySprite } from '../data/sprites';
import { Badges, ColorDot, HpBar } from './components';
import { BattleLog } from './BattleLog';
import { SpellCard, Spellbook, type Spell } from './Spellbook';
import { dieLandMs } from './anim';
import { TrayDie } from './PixelDie';
import { EnemyStage, HeroStage, Projectile } from './Fighters';
import { COLOR_HEX, floatsFor, stageFxFor } from './fx';
import { COLOR_LABEL, describeIntent, formatEvent } from './format';
import { beforeOpeningRoll, buildTimeline } from './timeline';
import { chipsForPlan } from './mixHint';
import { usePlayback } from './usePlayback';
import './battle.css';
import './fx.css';

type RolledEvent = Extract<BattleEvent, { type: 'rolled' }>;

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
  // Effects only play while the beats run; once settled, the sprites rest.
  const beatEvent = playing ? step.event : null;
  const beatKey = `${actionCount}-${index}`;
  const enemyStageRef = useRef<HTMLDivElement>(null);
  const heroStageRef = useRef<HTMLDivElement>(null);
  // A spell that harms the enemy sends a bolt of its first cost color.
  const castAttack =
    beatEvent?.type === 'triggered' ? config.attacks.find((x) => x.id === beatEvent.attackId) : undefined;
  const castColor = castAttack && (Object.keys(castAttack.cost)[0] as Color | undefined);
  const boltColor =
    castAttack && castColor && castAttack.effects.some((e) => e.type !== 'block') ? COLOR_HEX[castColor] : null;
  // A mix appends its output to the pool, so the splash goes on the last chip.
  const splashColor = beatEvent?.type === 'mixed' ? COLOR_HEX[beatEvent.output] : null;
  const isOver = state.phase !== 'player';
  const locked = isOver || playing;
  // The fight's log: every earlier action, plus this action up to the current beat.
  const toLines = (evs: readonly BattleEvent[]) =>
    evs.map((e) => formatEvent(e, config)).filter((line): line is string => line !== null);
  const [history, setHistory] = useState({ count: actionCount, past: [] as string[], latest: events });
  if (history.count !== actionCount) {
    setHistory({ count: actionCount, past: [...history.past, ...toLines(history.latest)].slice(-200), latest: events });
  }
  const logLines = [...history.past, ...toLines(playing ? events.slice(0, index + 1) : events)];

  // Every spell with whether it can be cast now, after some mixes, or not at all.
  const spells = useMemo<Spell[]>(
    () =>
      config.attacks.map((attack) => {
        if (canAfford(pool, attack.cost)) return { attack, status: 'ready' };
        const plan = findMixPlan(pool, attack.cost, config.recipes);
        return plan && plan.length > 0 ? { attack, status: 'craftable', plan } : { attack, status: 'locked' };
      }),
    [pool, config],
  );
  const readySpells = spells.filter((s) => s.status === 'ready');
  const craftableCount = spells.filter((s) => s.status === 'craftable').length;

  const [bookOpen, setBookOpen] = useState(false);
  const [unavailableOnly, setUnavailableOnly] = useState(false);
  const [hintedAttack, setHintedAttack] = useState<string | null>(null);
  const hintedPlan = !locked && hintedAttack ? spells.find((s) => s.attack.id === hintedAttack)?.plan : undefined;
  const hintedChips = hintedPlan ? chipsForPlan(pool, hintedPlan) : [];

  const closeBook = useCallback(() => {
    setBookOpen(false);
    setHintedAttack(null);
  }, []);

  /** Tapping a craftable spell selects the chips for its next mix, ready for the Mix button. */
  function prepareMix(plan: MixRecipe[]) {
    setSelected(chipsForPlan(pool, plan).slice(0, 2));
    closeBook();
  }

  function cast(attackId: string) {
    closeBook();
    act({ type: 'trigger', attackId });
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
          <EnemyStage
            ref={enemyStageRef}
            sprite={enemyArt}
            name={config.enemy.name}
            fx={beatEvent ? stageFxFor(beatEvent, 'enemy') : null}
            floats={floatsFor(beatEvent, 'enemy')}
            beatKey={beatKey}
            defeated={enemy.hp === 0}
          />
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

      <BattleLog lines={logLines} />

      <section className="card player with-sprite">
        <HeroStage
          ref={heroStageRef}
          fx={beatEvent ? stageFxFor(beatEvent, 'player') : null}
          floats={floatsFor(beatEvent, 'player')}
          beatKey={beatKey}
          defeated={player.hp === 0}
        />
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
            const splash = splashColor !== null && i === pool.length - 1;
            const classes = ['chip', `chip-${color}`];
            if (selected.includes(i)) classes.push('selected');
            if (landing) classes.push('chip-landing');
            if (hintedChips.includes(i)) classes.push('chip-hint');
            if (splash) classes.push('chip-splash');
            const style: CSSProperties | undefined = landing
              ? { animationDelay: `${dieLandMs(fromDie)}ms` }
              : splash
                ? ({ '--splash': splashColor } as CSSProperties)
                : undefined;
            return (
            <button
              key={i}
              type="button"
              className={classes.join(' ')}
              style={style}
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

      <section className="spells-section">
        <div className="section-head">
          <h3>Ready spells</h3>
          <button
            type="button"
            className="book-btn"
            aria-haspopup="dialog"
            aria-expanded={bookOpen}
            onClick={() => setBookOpen(true)}
            aria-label={`Open spellbook${craftableCount ? `, ${craftableCount} can be mixed` : ''}`}
          >
            <span aria-hidden="true">📖</span> Spellbook
            {craftableCount > 0 && (
              <span className="book-badge" aria-hidden="true">
                ⚗{craftableCount}
              </span>
            )}
          </button>
        </div>
        {readySpells.length === 0 ? (
          <p className="muted no-spells">
            No spell is ready. Mix colors, or open the Spellbook to see what you could make.
          </p>
        ) : (
          <div className="attacks">
            {readySpells.map((spell) => (
              <SpellCard
                key={spell.attack.id}
                spell={spell}
                disabled={locked}
                onCast={() => cast(spell.attack.id)}
                onPrepareMix={prepareMix}
                onHint={setHintedAttack}
              />
            ))}
          </div>
        )}
      </section>

      {bookOpen && (
        <Spellbook
          spells={spells}
          locked={locked}
          unavailableOnly={unavailableOnly}
          onToggleUnavailableOnly={() => setUnavailableOnly((v) => !v)}
          onCast={cast}
          onPrepareMix={prepareMix}
          onHint={setHintedAttack}
          onClose={closeBook}
        />
      )}

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

      {boltColor && <Projectile key={beatKey} from={heroStageRef} to={enemyStageRef} color={boltColor} />}

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
