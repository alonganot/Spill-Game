import { createRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  canAfford,
  firstLivingEnemy,
  isAreaSpell,
  mixColors,
  findMixPlan,
  spendColors,
  getEnemyIntent,
  attackHitDamage,
  type BattleAction,
  type BattleConfig,
  type BattleEvent,
  type BattleState,
  type Color,
  type EnemyIntent,
  type EnemyState,
  type Effect,
  type MixRecipe,
} from '../engine';
import { MIX_HINT_MAX_MIXES } from '../data/balance';
import { enemySprite } from '../data/sprites';
import { Badges, HpBar } from './components';
import { BattleLog } from './BattleLog';
import { SpellCard, Spellbook, type Spell } from './Spellbook';
import { chipPopMs, useReducedMotion } from './anim';
import { RollStage, TrayDie } from './PixelDie';
import { EnemyStage, HeroStage, Projectile } from './Fighters';
import { COLOR_HEX, floatsFor, stageFxFor } from './fx';
import { COLOR_LABEL, describeIntent, enemyLabels, formatEvent, intentTip, type IntentMark } from './format';
import { Tip } from './Tooltip';
import { beforeOpeningRoll, buildTimeline } from './timeline';
import { chipsForPlan } from './mixHint';
import { usePlayback } from './usePlayback';
import { useDesktop, useWindowSize } from './useMediaQuery';
import { DiceRack } from './DiceRack';
import { useChipDrag } from './useDrag';
import { BOWL_RESULT, MixingBowl, WorkbenchProvider, type Workbench } from './workbench';
import { PaintDrop } from './PaintDrop';
import {
  bowlResult,
  carryStaging,
  EMPTY_STAGING,
  place,
  remove,
  spellReady,
  stagedIndices,
  type StageTarget,
  type Staging,
} from './staging';
import type { RolledEvent } from './runSave';
import './battle.css';
import './fx.css';


interface BattleScreenProps {
  battle: BattleState;
  /** The battle before the latest action, or null when this fight just started. */
  prevBattle: BattleState | null;
  config: BattleConfig;
  events: BattleEvent[];
  /** The fight's latest roll, which may be older than `events` (after a reload, for example). */
  lastRoll: RolledEvent | null;
  actionCount: number;
  isFinalFight: boolean;
  /** The run's gold, shown beside the player's HP. */
  gold: number;
  onAction: (action: BattleAction) => void;
  onContinue: () => void;
}

export function BattleScreen({
  battle: state,
  prevBattle,
  config,
  events,
  lastRoll,
  actionCount,
  isFinalFight,
  gold,
  onAction,
  onContinue,
}: BattleScreenProps) {
  const before = useMemo(() => prevBattle ?? beforeOpeningRoll(state, events), [prevBattle, state, events]);
  const steps = useMemo(() => buildTimeline(before, events, state, config.status), [before, events, state, config.status]);
  const { step, index, playing, skip } = usePlayback(steps, actionCount);

  // The tray shows the last roll through mixes and attacks, and keeps the
  // previous roll on screen until this action's roll beat comes up.
  const rollIndex = events.findIndex((e) => e.type === 'rolled');
  const rollEvent = rollIndex >= 0 ? (events[rollIndex] as RolledEvent) : undefined;
  const [rolls, setRolls] = useState<{ current?: RolledEvent; previous?: RolledEvent }>({ current: rollEvent ?? lastRoll ?? undefined });
  if (rollEvent && rollEvent !== rolls.current) setRolls({ current: rollEvent, previous: rolls.current });
  const beforeRollBeat = playing && rollEvent !== undefined && index < rollIndex;
  const shownRoll = beforeRollBeat ? rolls.previous : (rollEvent ?? rolls.current);
  const rolling = playing && step.event?.type === 'rolled';
  // The roll plays big in the middle of the screen, unless motion is reduced.
  const reducedMotion = useReducedMotion();
  const onStage = rolling && !reducedMotion && rollEvent !== undefined;
  const trayRef = useRef<HTMLDivElement>(null);
  const desktop = useDesktop();
  const { width: windowWidth } = useWindowSize();
  const enemyCount = config.enemies.length;
  const pixel = fighterPixel(windowWidth);
  const crowd = enemyCount >= 3 ? CROWD_SCALE[3] : enemyCount === 2 ? CROWD_SCALE[2] : 1;
  const enemySize = desktop ? 22 * Math.max(3, Math.floor(pixel * crowd)) : enemyCount >= 3 ? 56 : enemyCount === 2 ? 68 : 88;
  const heroSize = desktop ? 16 * pixel : 48;
  const keptCount = shownRoll ? shownRoll.colors.length - shownRoll.discarded.length : 0;

  // While the beats play, show the numbers of the current beat, not the final ones.
  const player = { ...state.player, ...step.player };
  const enemies = state.enemies.map((e, i) => ({ ...e, ...step.enemies[i] }));
  const pool = step.pool;
  const labels = useMemo(() => enemyLabels(config), [config]);

  // The enemy single-target spells hit. It moves on to the next living enemy when it falls.
  const [picked, setPicked] = useState(0);
  const target = state.enemies[picked] && state.enemies[picked]!.hp > 0 ? picked : Math.max(0, firstLivingEnemy(state));
  const choosing = enemyCount > 1 && state.phase === 'player';

  // Effects only play while the beats run; once settled, the sprites rest.
  const beatEvent = playing ? step.event : null;
  const beatKey = `${actionCount}-${index}`;
  const enemyStageRefs = useMemo(() => config.enemies.map(() => createRef<HTMLDivElement>()), [config.enemies]);
  const heroStageRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLElement>(null);
  // A spell that reaches enemies sends a bolt of its first cost color: to its target, or to every living enemy.
  // Spells that only touch the player (Block, Heal, Cleanse) send none.
  const castAttack =
    beatEvent?.type === 'triggered' ? config.attacks.find((x) => x.id === beatEvent.attackId) : undefined;
  const castColor = castAttack && (Object.keys(castAttack.cost)[0] as Color | undefined);
  const boltColor =
    castAttack && castColor && castAttack.effects.some((e) => !PLAYER_EFFECTS.has(e.type)) ? COLOR_HEX[castColor] : null;
  const boltTargets =
    beatEvent?.type !== 'triggered' || !castAttack
      ? []
      : isAreaSpell(castAttack)
        ? before.enemies.flatMap((e, i) => (e.hp > 0 ? [i] : []))
        : [beatEvent.target];
  // A mix appends its output to the pool, so the splash goes on the last chip.
  const splashColor = beatEvent?.type === 'mixed' ? COLOR_HEX[beatEvent.output] : null;
  const isOver = state.phase !== 'player';
  const locked = isOver || playing;
  // The fight's log: every earlier action, plus this action up to the current beat.
  const toLines = (evs: readonly BattleEvent[]) =>
    evs.map((e) => formatEvent(e, config, labels)).filter((line): line is string => line !== null);
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
        const plan = findMixPlan(pool, attack.cost, config.recipes, MIX_HINT_MAX_MIXES);
        return plan && plan.length > 0 ? { attack, status: 'craftable', plan } : { attack, status: 'locked' };
      }),
    [pool, config],
  );

  const [bookOpen, setBookOpen] = useState(false);
  const [unavailableOnly, setUnavailableOnly] = useState(false);
  const [hintedAttack, setHintedAttack] = useState<string | null>(null);
  const hintedPlan = !locked && hintedAttack ? spells.find((s) => s.attack.id === hintedAttack)?.plan : undefined;
  const hintedChips = hintedPlan ? chipsForPlan(pool, hintedPlan) : [];

  const closeBook = useCallback(() => {
    setBookOpen(false);
    setHintedAttack(null);
  }, []);

  // Colors dragged (or tapped) into the bowl or onto spells. UI-only. A Cast
  // or Mix carries the rest over to the pool it leaves (`carryOver`); any other
  // change (a new turn, a rejected action) starts fresh. Staging made for one
  // action and pool never applies to another.
  const [stage, setStage] = useState<{ key: number; pool: readonly Color[]; staging: Staging; selected: number | null }>({
    key: actionCount,
    pool,
    staging: EMPTY_STAGING,
    selected: null,
  });
  const fresh = stage.key === actionCount && samePool(stage.pool, pool);
  const staging = fresh ? stage.staging : EMPTY_STAGING;
  const selectedChip = fresh ? stage.selected : null;
  const setStaging = (next: Staging, selected: number | null = null) =>
    setStage({ key: actionCount, pool, staging: next, selected });
  /** Stages `next` for the action about to happen, which leaves the pool as `after`. */
  const carryOver = (next: Staging, after: readonly Color[]) =>
    setStage({ key: actionCount + 1, pool: after, staging: next, selected: null });
  const staged = stagedIndices(staging);
  const costs = useMemo(() => Object.fromEntries(config.attacks.map((a) => [a.id, a.cost])), [config.attacks]);

  // A rejected drop shakes its target briefly.
  const [reject, setReject] = useState<{ target: string; n: number } | null>(null);
  useEffect(() => {
    if (!reject) return;
    const timer = setTimeout(() => setReject(null), 400);
    return () => clearTimeout(timer);
  }, [reject]);

  const keyOf = (target: StageTarget) => (target.kind === 'bowl' ? 'bowl' : `spell:${target.attackId}`);

  function stageTo(chip: number, target: StageTarget) {
    const result = place(staging, chip, target, pool, costs);
    if (result.ok) setStaging(result.staging);
    else {
      setStaging(staging);
      setReject((r) => ({ target: keyOf(target), n: (r?.n ?? 0) + 1 }));
    }
  }

  function parseTarget(key: string | null): StageTarget | 'pool' | null {
    if (key === 'pool') return 'pool';
    if (key === 'bowl') return { kind: 'bowl' };
    if (key?.startsWith('spell:')) return { kind: 'spell', attackId: key.slice('spell:'.length) };
    return null;
  }

  // What the bowl makes, and the pool right after that mix (the engine's own
  // mixColors, so the new color's index matches: it's appended last).
  const bowl = bowlResult(staging, pool, config.recipes);
  const mixed = bowl.kind === 'mix' ? mixColors(pool, config.recipes, bowl.inputs[0], bowl.inputs[1]) : null;
  const mixedPool = mixed?.ok ? mixed.pool : null;
  /** What stays staged once the bowl is mixed. */
  const afterMix =
    bowl.kind === 'mix' && mixedPool
      ? carryStaging(staging, pool, { [bowl.inputs[0]]: 1, [bowl.inputs[1]]: 1 }, mixedPool, { kind: 'bowl' })
      : null;

  /** Where the bowl's new color could go on a spell, after the mix. */
  function placeMixed(target: StageTarget) {
    if (!mixedPool || !afterMix || target.kind !== 'spell') return null;
    const result = place(afterMix, mixedPool.length - 1, target, mixedPool, costs);
    return result.ok ? result.staging : null;
  }

  /** Mixes the bowl. The new color joins the pool, or goes straight onto a spell's slot. */
  function mixInto(target: StageTarget | 'pool') {
    if (bowl.kind !== 'mix' || !mixedPool) return;
    const mixAction: BattleAction = { type: 'mix', colors: bowl.inputs };
    if (target === 'pool' || target.kind === 'bowl') {
      act(mixAction);
      if (afterMix) carryOver(afterMix, mixedPool);
      return;
    }
    const onSpell = placeMixed(target);
    if (!onSpell) {
      setReject((r) => ({ target: keyOf(target), n: (r?.n ?? 0) + 1 }));
      return;
    }
    act(mixAction);
    // The new color goes straight onto the spell; the rest of the staging stays.
    carryOver(onSpell, mixedPool);
  }

  const { drag, start: chipPointerDown, click: chipClick } = useChipDrag((chip, key) => {
    const target = parseTarget(key);
    if (chip === BOWL_RESULT) {
      if (target) mixInto(target);
      return;
    }
    if (target === 'pool') setStaging(remove(staging, chip));
    else if (target) stageTo(chip, target);
  }, !locked);

  function dropClass(target: string): string {
    if (reject?.target === target) return ` drop-reject drop-reject-${reject.n % 2}`;
    if (!drag || drag.over !== target) return '';
    const parsed = parseTarget(target);
    if (drag.chip === BOWL_RESULT) {
      if (parsed === 'pool') return ' drop-ok';
      if (!parsed || parsed.kind === 'bowl') return '';
      return placeMixed(parsed) ? ' drop-ok' : ' drop-bad';
    }
    if (parsed === 'pool') return staged.has(drag.chip) ? ' drop-ok' : '';
    if (!parsed) return '';
    return place(staging, drag.chip, parsed, pool, costs).ok ? ' drop-ok' : ' drop-bad';
  }

  /** Puts the chips a craftable spell's next mix needs into the bowl. */
  function prepareMix(plan: MixRecipe[]) {
    const chips = chipsForPlan(pool, plan).slice(0, 2);
    let next = staging;
    for (const chip of [...staging.bowl, ...chips]) next = remove(next, chip);
    setStaging({ ...next, bowl: chips });
    closeBook();
  }

  function act(action: BattleAction) {
    onAction(action);
  }

  const workbench: Workbench = {
    pool,
    staging,
    selectedChip,
    locked,
    recipes: config.recipes,
    status: config.status,
    dropClass,
    chipPointerDown,
    chipClick,
    placeSelected: (target) => {
      if (selectedChip !== null) stageTo(selectedChip, target);
    },
    fillSlot: (attackId, color) => {
      const target: StageTarget = { kind: 'spell', attackId };
      if (selectedChip !== null) return stageTo(selectedChip, target);
      const chip = pool.findIndex((c, i) => c === color && !staged.has(i));
      if (chip >= 0) return stageTo(chip, target);
      // The color isn't in the pool: offer the mix that makes it.
      const plan = spells.find((s) => s.attack.id === attackId)?.plan;
      if (plan) prepareMix(plan);
      else setReject((r) => ({ target: keyOf(target), n: (r?.n ?? 0) + 1 }));
    },
    returnChip: (chip) => setStaging(remove(staging, chip)),
    mix: () => mixInto('pool'),
    cast: (attackId) => {
      const cost = costs[attackId];
      if (!cost || !spellReady(staging, attackId, cost, pool)) return;
      closeBook();
      act({ type: 'trigger', attackId, target });
      const after = spendColors(pool, cost);
      if (after) carryOver(carryStaging(staging, pool, cost, after, { kind: 'spell', attackId }), after);
    },
    prepareMix,
    hint: setHintedAttack,
  };

  // Craftable now or after mixing; spells out of reach stay in the Spellbook.
  const craftable = [...spells.filter((s) => s.status === 'ready'), ...spells.filter((s) => s.status === 'craftable')];
  const lockedCount = spells.length - craftable.length;
  const draggedColor =
    drag === null ? undefined : drag.chip === BOWL_RESULT ? (bowl.kind === 'mix' ? bowl.recipe.output : undefined) : pool[drag.chip];

  // The color pool: on phones it sits above the spells, so it never scrolls
  // out of reach; on PC it's the bottom of the workbench.
  const poolSection = (
      <section className={`pool-section${dropClass('pool')}`} ref={poolRef} data-drop="pool">
        <div className="section-head">
          <h3>Color pool</h3>
          <span className="muted">
            {pool.length} / {config.maxPoolSize}
          </span>
        </div>
        <div className="pool">
          {pool.length === 0 && !desktop && <span className="muted">Empty. End the turn to roll.</span>}
          {pool.map((color, i) => {
            // A staged chip leaves a dashed gap where it was.
            if (staged.has(i))
              return (
                <span key={i} className="chip chip-drop chip-ghost" aria-hidden="true">
                  <PaintDrop color={color} />
                </span>
              );
            // While dice land, each new chip pops in as its die lands.
            const fromDie = i - before.pool.length;
            const landing = rolling && fromDie >= 0;
            const splash = splashColor !== null && i === pool.length - 1;
            const classes = ['chip', 'chip-drop', 'chip-draggable'];
            if (selectedChip === i) classes.push('selected');
            if (landing) classes.push('chip-landing');
            if (hintedChips.includes(i)) classes.push('chip-hint');
            if (splash) classes.push('chip-splash');
            if (drag?.chip === i) classes.push('chip-dragging');
            const style: CSSProperties | undefined = landing
              ? { animationDelay: `${chipPopMs(rollEvent?.colors.length ?? 0, fromDie)}ms` }
              : splash
                ? ({ '--splash': splashColor } as CSSProperties)
                : undefined;
            return (
              <button
                key={i}
                type="button"
                className={classes.join(' ')}
                style={style}
                onPointerDown={(e) => chipPointerDown(e, i)}
                onClick={chipClick(() => setStaging(staging, selectedChip === i ? null : i))}
                disabled={locked}
                aria-pressed={selectedChip === i}
                aria-label={`${COLOR_LABEL[color]}. Drag it to the bowl or a spell, or tap to pick it up`}
              >
                <PaintDrop color={color} />
              </button>
            );
          })}
          {/* On desktop the pool is a fixed grid, so the free room shows. */}
          {desktop &&
            Array.from({ length: Math.max(0, config.maxPoolSize - pool.length) }, (_, i) => (
              <span key={`free-${i}`} className="chip chip-free" aria-hidden="true" />
            ))}
        </div>
      </section>
  );

  return (
    <WorkbenchProvider value={workbench}>
      {/* On phones these wrappers are display: contents, so it's one column; on desktop, an arena and a side panel. */}
      <div className="battle-layout">
      <div className={`arena${enemyCount > 1 ? ' arena-crowd' : ''}`}>
      {desktop && (
        <DiceRack dice={config.dice} roll={shownRoll} kept={keptCount} away={onStage} trayRef={trayRef} />
      )}
      <div className={`enemy-row enemies-${enemyCount}`}>
        {config.enemies.map((def, i) => {
          const enemy = enemies[i]!;
          const label = labels[i]!;
          const art = enemySprite(def.id);
          const down = enemy.hp === 0;
          const shown = playing ? before : state;
          const intent = down ? undefined : getEnemyIntent(shown, config, i);
          const plan = intent && intentPlan(intent, shown.enemies[i]!, config);
          const targeted = choosing && i === target && !down;
          const stage = art ? (
            <EnemyStage
              ref={enemyStageRefs[i]}
              sprite={art}
              name={label}
              fx={beatEvent ? stageFxFor(beatEvent, i) : null}
              floats={floatsFor(beatEvent, i)}
              beatKey={beatKey}
              defeated={down}
              size={enemySize}
            />
          ) : (
            // No art yet: keep a sprite-sized box so the target button still has something to press.
            <div className="sprite-stage sprite-missing" ref={enemyStageRefs[i]} style={{ width: enemySize, height: enemySize }} aria-hidden="true">
              ?
            </div>
          );
          // Only the sprite is the target button, so tapping a tooltip (intent, badges) never retargets.
          return (
            <section key={i} className={`card enemy with-sprite${targeted ? ' targeted' : ''}${down ? ' down' : ''}`}>
              {choosing ? (
                <button
                  type="button"
                  className="target-btn"
                  onClick={() => setPicked(i)}
                  disabled={down}
                  aria-pressed={targeted}
                  aria-label={`Target ${label}`}
                >
                  {stage}
                </button>
              ) : (
                stage
              )}
              <div className="card-body">
                <div className="card-title">
                  <h2>{label}</h2>
                  {/* A defeated enemy's leftover statuses never tick, so they aren't shown. */}
                  {!down && <Badges combatant={enemy} owner={{ kind: 'enemy', name: label }} status={config.status} />}
                </div>
                {intent && plan && !isOver && (
                  <Tip text={intentTip(plan.intent, label, config.status, plan.mark)} focusable>
                    <span
                      className={`intent intent-${intent.type}${plan.mark ? ` intent-${plan.mark}` : ''}`}
                      aria-label={`${label} intent${plan.mark === 'skipped' ? ' (skipped: Silenced)' : plan.mark === 'chilled' ? ' (Chilled)' : ''}`}
                    >
                      {plan.mark === 'skipped' ? '🤐 ' : plan.mark === 'chilled' ? '❄ ' : ''}
                      {INTENT_ICON[intent.type]} {describeIntent(plan.intent)}
                    </span>
                  </Tip>
                )}
                <HpBar combatant={enemy} />
              </div>
              {targeted && <span className="target-tag">Target</span>}
            </section>
          );
        })}
      </div>

      <BattleLog lines={logLines} />

      <section className="card player with-sprite">
        <HeroStage
          ref={heroStageRef}
          fx={beatEvent ? stageFxFor(beatEvent, 'player') : null}
          floats={floatsFor(beatEvent, 'player')}
          beatKey={beatKey}
          defeated={player.hp === 0}
          size={heroSize}
        />
        <div className="card-body">
          <div className="card-row">
            <div className="card-title">
              <h2>You</h2>
              <Badges combatant={player} owner={{ kind: 'player' }} status={config.status} />
            </div>
            <span className="card-meta">
              <span className="gold" aria-label="Gold">
                🪙 {gold}
              </span>
              <span className="muted">Turn {state.turn}</span>
            </span>
          </div>
          <HpBar combatant={player} />
        </div>
      </section>
      </div>

      <div className="side-panel">
      <MixingBowl />

      {!desktop && poolSection}

      <section className="spells-section">
        <div className="section-head">
          <h3>Craftable spells</h3>
          <button
            type="button"
            className="book-btn"
            aria-haspopup="dialog"
            aria-expanded={bookOpen}
            onClick={() => setBookOpen(true)}
            aria-label={`Open spellbook${lockedCount ? `, ${lockedCount} more spells` : ''}`}
          >
            <span aria-hidden="true">📖</span> Spellbook
          </button>
        </div>
        {craftable.length === 0 ? (
          <p className="muted no-spells">Nothing to craft with these colors. End the turn to roll more.</p>
        ) : (
          <div className="attacks">
            {craftable.map((spell) => (
              <SpellCard key={spell.attack.id} spell={spell} />
            ))}
          </div>
        )}
      </section>

      {desktop && poolSection}

      {desktop && (
        <button
          type="button"
          className="btn btn-primary end-turn-panel"
          onClick={() => act({ type: 'endTurn' })}
          disabled={locked}
        >
          End turn
        </button>
      )}
      </div>
      </div>

      {bookOpen && (
        <Spellbook
          spells={spells}
          recipes={config.recipes}
          unavailableOnly={unavailableOnly}
          onToggleUnavailableOnly={() => setUnavailableOnly((v) => !v)}
          onClose={closeBook}
          keepVisibleRef={poolRef}
        />
      )}

      {!desktop && (
      <footer className="footer footer-battle">
        <div className="dice-tray" role="group" aria-label="Your dice" ref={trayRef}>
          {config.dice.map((die, i) => (
            <TrayDie
              key={i}
              die={die}
              result={shownRoll?.colors[i]}
              discarded={shownRoll !== undefined && i >= keptCount}
              away={onStage}
            />
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => act({ type: 'endTurn' })} disabled={locked}>
          End turn
        </button>
      </footer>
      )}

      {onStage && rollEvent && (
        <RollStage
          key={beatKey}
          dice={config.dice}
          colors={rollEvent.colors}
          kept={rollEvent.colors.length - rollEvent.discarded.length}
          trayRef={trayRef}
          big={desktop}
        />
      )}

      {boltColor &&
        boltTargets.map((i) => (
          <Projectile key={`${beatKey}-${i}`} from={heroStageRef} to={enemyStageRefs[i]!} color={boltColor} />
        ))}

      {playing && <button type="button" className="skip-layer" aria-label="Skip animation" onClick={skip} />}

      {isOver && !playing && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result">
            <h2 id="result-title" className={state.phase}>
              {state.phase === 'victory' ? 'Victory!' : 'Defeated'}
            </h2>
            <p className="muted">
              {state.phase === 'victory'
                ? `You won on turn ${state.turn} with ${state.player.hp} HP left.`
                : defeatLine(state, labels)}
            </p>
            <button type="button" className="btn btn-primary" onClick={onContinue}>
              {state.phase === 'defeat' ? 'See results' : isFinalFight ? 'Finish run' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {drag && draggedColor && (
        <span className="chip chip-drop drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <PaintDrop color={draggedColor} size={52} />
        </span>
      )}
    </WorkbenchProvider>
  );
}

/** How much smaller each enemy is drawn in a fight with two or three of them. */
const CROWD_SCALE = { 2: 0.8, 3: 0.6 } as const;

/**
 * Desktop fighters' pixel scale (hero 16px, enemy 22px of art). The arena is
 * half the window, so this follows the window width, and it's the same in
 * every fight: picked so the hero plus three crowd-sized enemies fit, so the
 * hero never changes size when more enemies appear.
 */
export function fighterPixel(windowWidth: number): number {
  // Half the window, less the page padding (24px each side), the 20px gap, and the arena's own padding.
  const arena = (windowWidth - 68) / 2 - 32;
  // Hero (16) + three enemies (22 × 0.6 each) in pixels, plus about 48px of gaps and card padding.
  const perPixel = 16 + 3 * 22 * CROWD_SCALE[3];
  return Math.max(4, Math.min(14, Math.floor((arena - 48) / perPixel)));
}

function samePool(a: readonly Color[], b: readonly Color[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

const PLAYER_EFFECTS = new Set<Effect['type']>(['block', 'heal', 'cleanse']);

const INTENT_ICON: Record<EnemyIntent['type'], string> = { attack: '⚔', block: '🛡', poison: '☠', burn: '🔥' };

/**
 * What an enemy will really do: a Silenced enemy skips its intent, and a Chilled
 * one's attack shows its reduced per-hit damage.
 */
function intentPlan(
  intent: EnemyIntent,
  enemy: EnemyState,
  config: BattleConfig,
): { intent: EnemyIntent; mark: IntentMark | null } {
  if (enemy.silenced) return { intent, mark: 'skipped' };
  if (enemy.chilled && intent.type === 'attack') {
    return { intent: { ...intent, amount: attackHitDamage(intent.amount, enemy, config) }, mark: 'chilled' };
  }
  return { intent, mark: null };
}

/** Who was still standing when the player fell. */
function defeatLine(state: BattleState, labels: readonly string[]): string {
  const standing = state.enemies.flatMap((e, i) => (e.hp > 0 ? [`${labels[i]} (${e.hp} HP)`] : []));
  return standing.length === 1 ? `${standing[0]} was still standing.` : `Still standing: ${standing.join(', ')}.`;
}
