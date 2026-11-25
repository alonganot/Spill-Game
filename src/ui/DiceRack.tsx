import type { RefObject } from 'react';
import type { Color, DieDefinition } from '../engine';
import { COLOR_LABEL, dieTip } from './format';
import { Tip } from './Tooltip';
import { PixelDie } from './PixelDie';

interface DiceRackProps {
  dice: readonly DieDefinition[];
  /** The roll to show, if the dice have rolled this fight. */
  roll: { colors: readonly Color[] } | undefined;
  /** How many of the rolled colors fit in the pool; the rest overflowed. */
  kept: number;
  /** Hidden while the dice are out on the roll stage. */
  away: boolean;
  /** The roll stage flies its dice back to the big faces in here. */
  trayRef: RefObject<HTMLDivElement | null>;
}

/**
 * The desktop dice: each die's rolled face big, with all six faces small
 * beside it. Faces of the rolled color stay bright (a roll only reports the
 * color, not which face landed).
 */
export function DiceRack({ dice, roll, kept, away, trayRef }: DiceRackProps) {
  return (
    <section className="dice-rack-section" aria-label="Your dice">
      <div className="section-head">
        <h3>Your dice</h3>
        <span className="muted">
          {dice.length} {dice.length === 1 ? 'die' : 'dice'}
        </span>
      </div>
      <div className="dice-rack" ref={trayRef}>
        {dice.map((die, i) => {
          const result = roll?.colors[i];
          const overflowed = roll !== undefined && i >= kept;
          const label = `${die.name}: ${result ? `rolled ${COLOR_LABEL[result]}${overflowed ? ' (pool full)' : ''}` : 'not rolled yet'}. Faces: ${die.faces.map((f) => COLOR_LABEL[f]).join(', ')}`;
          return (
            <Tip key={i} text={dieTip(die.name, die.faces)} focusable>
            <div className="rack-die" role="img" aria-label={label}>
              <span
                className={`tray-die rack-big${overflowed ? ' tray-die-overflow' : ''}${away ? ' tray-die-away' : ''}`}
                aria-hidden="true"
              >
                {result ? <PixelDie color={result} size={48} /> : <span className="tray-die-blank" />}
              </span>
              <span className="rack-faces" aria-hidden="true">
                {die.faces.map((face, j) => (
                  <span key={j} className={`rack-face${result && face !== result ? ' rack-face-dim' : ''}`}>
                    <PixelDie color={face} size={16} />
                  </span>
                ))}
              </span>
            </div>
            </Tip>
          );
        })}
      </div>
    </section>
  );
}
