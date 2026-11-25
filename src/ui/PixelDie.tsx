import { useEffect, useId, useState } from 'react';
import type { Color, DieDefinition } from '../engine';
import type { SpriteSheet } from '../data/sprites';
import { DIE_FLICKER_MS } from './anim';
import { ColorDot } from './components';
import { COLOR_LABEL } from './format';
import { PixelSprite } from './PixelSprite';

/** Same values as the color tokens in global.css; SVG fills need literal colors. */
const COLOR_HEX: Record<Color, string> = {
  red: '#e5484d',
  blue: '#3e7bfa',
  green: '#3fb950',
  purple: '#9b5de5',
  cyan: '#22c3d6',
  orange: '#f08a24',
};

// A 10×10 die with a paint drop of the face color in the middle.
// Small enough that six dice and the End turn button share one row at 375px.
const DIE_ROWS = [
  '.kkkkkkkk.',
  'kffffffffk',
  'kfffccfffk',
  'kffhcccffk',
  'kffccccffk',
  'kffccccffk',
  'kfffccfffk',
  'kffffffffk',
  'ksffffffsk',
  '.kkkkkkkk.',
];

function dieSheet(color: Color): SpriteSheet<'face'> {
  return {
    palette: { k: '#14121a', f: '#ece7f4', s: '#b3abc4', h: '#ffffff', c: COLOR_HEX[color] },
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
};

const DIE_SIZE = 30;

/** A single static pixel die showing one face. */
export function PixelDie({ color, size = DIE_SIZE }: { color: Color; size?: number }) {
  return <PixelSprite sprite={DIE_SHEETS[color]} frame="face" size={size} label={COLOR_LABEL[color]} />;
}

type TumblePhase = 'still' | 'tumbling' | 'landed';

interface TrayDieProps {
  die: DieDefinition;
  /** The face this die rolled last, if it has rolled this fight. */
  result: Color | undefined;
  /** True while this die's roll beat plays. */
  rolling: boolean;
  /** Changes on every new roll, so back-to-back rolls restart the tumble. */
  rollKey: number;
  /** When to stop tumbling, in ms after `rolling` turns on. */
  landMs: number;
  /** The rolled color didn't fit in the pool. */
  discarded: boolean;
}

/**
 * A die in the battle tray. While rolling it flickers through its own faces,
 * then lands on the rolled face. The flicker uses Math.random, never the game
 * rng, so it can't change what a seed plays out.
 */
export function TrayDie({ die, result, rolling, rollKey, landMs, discarded }: TrayDieProps) {
  const [shown, setShown] = useState<Color | undefined>(result);
  const [phase, setPhase] = useState<TumblePhase>('still');

  useEffect(() => {
    if (!rolling || landMs <= 0) {
      setShown(result);
      setPhase('still');
      return;
    }
    const startedAt = performance.now();
    setPhase('tumbling');
    const timer = setInterval(() => {
      if (performance.now() - startedAt >= landMs) {
        setShown(result);
        setPhase('landed');
        clearInterval(timer);
      } else {
        setShown(die.faces[Math.floor(Math.random() * die.faces.length)]);
      }
    }, DIE_FLICKER_MS);
    return () => clearInterval(timer);
  }, [rolling, rollKey, landMs, result, die]);

  const overflowed = discarded && phase !== 'tumbling';
  const label = shown ? `${die.name}: ${COLOR_LABEL[shown]}${overflowed ? ' (pool full)' : ''}` : die.name;
  const tipId = useId();
  return (
    // Hover, or tap on touch screens (which focuses it), to see every face of the die.
    <button type="button" className="tray-die-btn" aria-label={label} aria-describedby={tipId}>
      <span className={`tray-die tray-die-${phase}${overflowed ? ' tray-die-overflow' : ''}`} aria-hidden="true">
        {shown ? <PixelDie color={shown} /> : <span className="tray-die-blank" />}
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
