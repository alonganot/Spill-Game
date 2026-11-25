import { useState } from 'react';
import { BASE_COLORS } from '../data/colors';
import type { BaseColor, DieDefinition, RepaintTarget } from '../engine';
import { COLOR_LABEL } from './format';

/** A die drawn as a row of colored face squares. Faces are tappable when `onSelectFace` is given. */
export function DieFaces({
  die,
  selectedFace,
  onSelectFace,
}: {
  die: DieDefinition;
  selectedFace?: number;
  onSelectFace?: (faceIndex: number) => void;
}) {
  return (
    <span className="faces">
      {die.faces.map((color, i) =>
        onSelectFace ? (
          <button
            key={i}
            type="button"
            className={`face dot-${color}${selectedFace === i ? ' selected' : ''}`}
            aria-label={`${die.name} face ${i + 1}: ${COLOR_LABEL[color]}`}
            aria-pressed={selectedFace === i}
            onClick={() => onSelectFace(i)}
          />
        ) : (
          <span key={i} className={`face face-static dot-${color}`} role="img" aria-label={COLOR_LABEL[color]} />
        ),
      )}
    </span>
  );
}

interface DiceEditorProps {
  dice: readonly DieDefinition[];
  /** Label for the confirm button, e.g. "Repaint · 15g". */
  confirmLabel: string;
  /** Why repainting isn't possible right now (shown instead of enabling the button). */
  blockedReason?: string;
  onRepaint: (target: RepaintTarget) => void;
}

/** Pick a face on one of your dice, pick a color, then confirm. */
export function DiceEditor({ dice, confirmLabel, blockedReason, onRepaint }: DiceEditorProps) {
  const [face, setFace] = useState<{ dieIndex: number; faceIndex: number } | null>(null);
  const [color, setColor] = useState<BaseColor | null>(null);

  const current = face ? dice[face.dieIndex]?.faces[face.faceIndex] : undefined;
  const ready = face !== null && color !== null && color !== current && !blockedReason;

  function confirm() {
    if (!face || !color) return;
    onRepaint({ ...face, color });
    setFace(null);
    setColor(null);
  }

  let hint = 'Tap a face to repaint it.';
  if (blockedReason) hint = blockedReason;
  else if (face && !color) hint = 'Now pick a new color.';
  else if (face && color === current) hint = 'That face is already that color.';

  return (
    <div className="editor">
      <ul className="dice-list">
        {dice.map((die, dieIndex) => (
          <li key={dieIndex} className="die-row">
            <span className="die-name">{die.name}</span>
            <DieFaces
              die={die}
              selectedFace={face?.dieIndex === dieIndex ? face.faceIndex : undefined}
              onSelectFace={(faceIndex) => setFace({ dieIndex, faceIndex })}
            />
          </li>
        ))}
      </ul>
      <div className="editor-controls">
        <div className="color-picks" role="group" aria-label="New color">
          {BASE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip-${c}${color === c ? ' selected' : ''}`}
              aria-pressed={color === c}
              disabled={!face}
              onClick={() => setColor(c)}
            >
              {COLOR_LABEL[c]}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" disabled={!ready} onClick={confirm}>
          {confirmLabel}
        </button>
        <p className="muted hint">{hint}</p>
      </div>
    </div>
  );
}
