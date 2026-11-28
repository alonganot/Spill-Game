import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Color, DieDefinition } from '../engine';
import type { SpriteSheet } from '../data/sprites';
import { DIE_FLICKER_MS, DIE_FLICKER_SLOWDOWN, ROLL_RETURN_MS, dieLandMs, rollReturnMs } from './anim';
import { ColorDot } from './components';
import { COLOR_LABEL } from './format';
import { DROP_ROWS, dropPalette } from './PaintDrop';
import { PixelSprite } from './PixelSprite';

// A 16×16 die: the paint drop (DROP_ROWS, 12×12) on a light face with a dark
// outline and a shaded bottom edge, with a row of face above and below the drop
// so it touches neither edge.
const DIE_ROWS = [
  '.kkkkkkkkkkkkkk.',
  'kffffffffffffffk',
  ...DROP_ROWS.map((row) => `kf${row.replaceAll('.', 'f')}fk`),
  'ksffffffffffffsk',
  '.kkkkkkkkkkkkkk.',
];

function dieSheet(color: Color): SpriteSheet<'face'> {
  return {
    palette: { ...dropPalette(color), f: '#ece7f4', s: '#b3abc4' },
    frames: { face: DIE_ROWS },
  };
}

// Built once so the memoized sprite sees a stable sheet per color.
const DIE_SHEETS: Record<Color, SpriteSheet<'face'>> = {
  red: dieSheet('red'),
  blue: dieSheet('blue'),
  green: dieSheet('green'),
  purple: dieSheet('purple'),
  cyan: dieSheet('cyan'),
  orange: dieSheet('orange'),
  white: dieSheet('white'),
  black: dieSheet('black'),
  gold: dieSheet('gold'),
  pink: dieSheet('pink'),
  grey: dieSheet('grey'),
  crimson: dieSheet('crimson'),
  blight: dieSheet('blight'),
  frost: dieSheet('frost'),
};

/** 16px art at 2×. Six dice and End turn still share one row at 375px. */
const DIE_SIZE = 32;

/** A single static pixel die showing one face. */
export function PixelDie({ color, size = DIE_SIZE }: { color: Color; size?: number }) {
  return <PixelSprite sprite={DIE_SHEETS[color]} frame="face" size={size} label={COLOR_LABEL[color]} />;
}

type TumblePhase = 'tumbling' | 'landed';

/**
 * Flickers through a die's own faces, slowing down as it settles, then lands
 * on `result` after `landMs`. The flicker uses Math.random, never the game rng,
 * so it can't change what a seed plays out.
 */
function useTumble(die: DieDefinition, result: Color, landMs: number): { shown: Color; phase: TumblePhase } {
  const randomFace = () => die.faces[Math.floor(Math.random() * die.faces.length)] ?? result;
  // Starts on a random face, so the result never shows before it lands.
  const [shown, setShown] = useState<Color>(randomFace);
  const [phase, setPhase] = useState<TumblePhase>(landMs > 0 ? 'tumbling' : 'landed');

  useEffect(() => {
    if (landMs <= 0) {
      setShown(result);
      setPhase('landed');
      return;
    }
    const startedAt = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed >= landMs) {
        setShown(result);
        setPhase('landed');
        return;
      }
      setShown(randomFace());
      const progress = elapsed / landMs;
      const next = DIE_FLICKER_MS * (1 + (DIE_FLICKER_SLOWDOWN - 1) * progress * progress);
      timer = setTimeout(tick, Math.min(next, landMs - elapsed));
    };
    timer = setTimeout(tick, DIE_FLICKER_MS);
    return () => clearTimeout(timer);
    // Runs once per stage die; the stage remounts for every roll.
  }, []);

  return { shown, phase };
}

interface TrayDieProps {
  die: DieDefinition;
  /** The face this die rolled last, if it has rolled this fight. */
  result: Color | undefined;
  /** The rolled color didn't fit in the pool. */
  discarded: boolean;
  /** Hidden while this die is out on the roll stage. */
  away: boolean;
  /** Die size in CSS px. */
  size?: number;
}

/** A die resting in the battle tray, showing its last roll. Hover or tap for its faces. */
export function TrayDie({ die, result, discarded, away, size = DIE_SIZE }: TrayDieProps) {
  const label = result ? `${die.name}: ${COLOR_LABEL[result]}${discarded ? ' (pool full)' : ''}` : die.name;
  const tipId = useId();
  return (
    // Hover, or tap on touch screens (which focuses it), to see every face of the die.
    <button type="button" className="tray-die-btn" aria-label={label} aria-describedby={tipId}>
      <span
        className={`tray-die${discarded ? ' tray-die-overflow' : ''}${away ? ' tray-die-away' : ''}`}
        aria-hidden="true"
      >
        {result ? <PixelDie color={result} size={size} /> : <span className="tray-die-blank" />}
      </span>
      <span className="tray-tip" id={tipId} role="tooltip">
        <span className="tray-tip-name">{die.name} die</span>
        <span className="tray-tip-faces">
          {die.faces.map((face, i) => (
            <ColorDot key={i} color={face} small />
          ))}
        </span>
      </span>
    </button>
  );
}

function StageDie({
  die,
  result,
  landMs,
  discarded,
  size,
}: {
  die: DieDefinition;
  result: Color;
  landMs: number;
  discarded: boolean;
  size: number;
}) {
  const { shown, phase } = useTumble(die, result, landMs);
  const overflowed = discarded && phase === 'landed';
  return (
    <span className={`stage-die stage-die-${phase}${overflowed ? ' tray-die-overflow' : ''}`}>
      <PixelDie color={shown} size={size} />
    </span>
  );
}

interface RollStageProps {
  dice: readonly DieDefinition[];
  colors: readonly Color[];
  /** How many of `colors` made it into the pool; the rest overflowed. */
  kept: number;
  /** The dice tray, whose dice the stage dice fly back to. */
  trayRef: RefObject<HTMLElement | null>;
  /** Bigger dice for desktop screens. */
  big?: boolean;
}

/**
 * The roll, played big in the middle of the screen: the dice tumble and land
 * one by one, hold for a moment, then fly back to their places in the tray.
 * Mount it fresh (with a new key) for every roll.
 */
export function RollStage({ dice, colors, kept, trayRef, big = false }: RollStageProps) {
  const [returning, setReturning] = useState(false);
  const dieRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Big dice, but six still fit across a 375px screen; desktop goes bigger still.
  const size = big ? 96 : colors.length > 4 ? 48 : 64;

  useEffect(() => {
    const timer = setTimeout(() => setReturning(true), rollReturnMs(colors.length));
    return () => clearTimeout(timer);
  }, [colors.length]);

  // Send each die to its own tray slot.
  useLayoutEffect(() => {
    if (!returning) return;
    const slots = trayRef.current?.querySelectorAll('.tray-die');
    dieRefs.current.forEach((el, i) => {
      const slot = slots?.[i]?.getBoundingClientRect();
      if (!el || !slot) return;
      const from = el.getBoundingClientRect();
      const dx = slot.left + slot.width / 2 - (from.left + from.width / 2);
      const dy = slot.top + slot.height / 2 - (from.top + from.height / 2);
      el.style.transition = `transform ${ROLL_RETURN_MS}ms cubic-bezier(0.5, 0, 0.3, 1) ${i * 30}ms`;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${slot.width / from.width})`;
    });
  }, [returning, trayRef]);

  return (
    <div className={`roll-stage${returning ? ' roll-stage-returning' : ''}`} aria-hidden="true">
      <div className="roll-stage-dice">
        {colors.map((color, i) => {
          const die = dice[i];
          if (!die) return null;
          return (
            <span
              key={i}
              className="roll-stage-slot"
              ref={(el) => {
                dieRefs.current[i] = el;
              }}
            >
              <StageDie die={die} result={color} landMs={dieLandMs(i)} discarded={i >= kept} size={size} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
