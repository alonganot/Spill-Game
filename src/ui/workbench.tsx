import { createContext, useContext, type PointerEvent as ReactPointerEvent } from 'react';
import type { Color, MixRecipe, StatusConfig } from '../engine';
import { PaintDrop } from './PaintDrop';
import { COLOR_LABEL } from './format';
import { BOWL_SIZE, bowlResult, type StageTarget, type Staging } from './staging';

/**
 * Everything the workbench pieces (pool chips, the mixing bowl, spell cards)
 * share: the pool, what's staged where, and the actions that move colors.
 * BattleScreen provides it; the Spellbook's cards read it too.
 */
export interface Workbench {
  pool: readonly Color[];
  staging: Staging;
  /** A chip lifted by a tap (or Enter), waiting for a tap on where it goes. */
  selectedChip: number | null;
  locked: boolean;
  /** Spells cast themselves once their slots are full, so cards show no Cast button. */
  autoCast: boolean;
  recipes: readonly MixRecipe[];
  /** Burn damage and poison decay, for spell tooltips. */
  status: StatusConfig;
  /** Extra classes for a drop target while a chip hovers over it, or after a rejected drop. */
  dropClass: (target: string) => string;
  chipPointerDown: (e: ReactPointerEvent, chip: number) => void;
  /** Wraps a chip's click so it doesn't fire right after a drag. */
  chipClick: (handler: () => void) => () => void;
  /** Puts the lifted chip into a target (tap-to-place). */
  placeSelected: (target: StageTarget) => void;
  /** Fills an empty spell slot: with the lifted chip, or else that color from the bowl (a drop or its mix), or else the pool. */
  fillSlot: (attackId: string, color: Color) => void;
  /** Sends a staged chip back to the pool. */
  returnChip: (chip: number) => void;
  /** Mixes what is in the bowl; the new color goes into the pool. */
  mix: () => void;
  cast: (attackId: string) => void;
  /** Puts the chips a craftable spell's next mix needs into the bowl. */
  prepareMix: (plan: MixRecipe[]) => void;
  /** Highlights the chips a craftable spell would mix (or clears with null). */
  hint: (attackId: string | null) => void;
}

const WorkbenchContext = createContext<Workbench | null>(null);

export const WorkbenchProvider = WorkbenchContext.Provider;

export function useWorkbench(): Workbench {
  const workbench = useContext(WorkbenchContext);
  if (!workbench) throw new Error('useWorkbench needs a WorkbenchProvider');
  return workbench;
}

/** Drag id for the bowl's result, which isn't in the pool yet. */
export const BOWL_RESULT = -1;

/** A staged chip sitting in a slot: drag it elsewhere, or tap to send it back. */
export function SlotChip({ chip, where, size = 26 }: { chip: number; where: string; size?: number }) {
  const wb = useWorkbench();
  const color = wb.pool[chip];
  if (color === undefined) return null;
  return (
    <button
      type="button"
      className="chip chip-drop slot-chip"
      disabled={wb.locked}
      onPointerDown={(e) => wb.chipPointerDown(e, chip)}
      onClick={wb.chipClick(() => wb.returnChip(chip))}
      aria-label={`${COLOR_LABEL[color]} in ${where}. Tap to put it back`}
    >
      <PaintDrop color={color} size={size} />
    </button>
  );
}

/**
 * Two slots and what they make. Drag (or tap) two colors in; then drag the
 * new color to your pool or straight onto a spell (or tap it to keep it).
 */
export function MixingBowl() {
  const wb = useWorkbench();
  const result = bowlResult(wb.staging, wb.pool, wb.recipes);
  const chips = wb.staging.bowl;
  const canPlace = wb.selectedChip !== null && !wb.locked;

  return (
    <section className="bowl-section" aria-label="Mixing bowl">
      <div className="section-head">
        <h3>Mixing bowl</h3>
        <span className="muted">{result.kind === 'mix' ? 'Drag the new color out' : 'Drag two colors in'}</span>
      </div>
      <div className={`bowl${wb.dropClass('bowl')}`} data-drop="bowl">
        {Array.from({ length: BOWL_SIZE }, (_, i) => {
          const chip = chips[i];
          return (
            <span key={i} className="bowl-slot-wrap">
              {i > 0 && (
                <span className="bowl-op" aria-hidden="true">
                  +
                </span>
              )}
              {chip !== undefined ? (
                <SlotChip chip={chip} where="the bowl" size={39} />
              ) : (
                <button
                  type="button"
                  className="slot slot-empty"
                  disabled={!canPlace}
                  onClick={() => wb.placeSelected({ kind: 'bowl' })}
                  aria-label={canPlace ? 'Put the lifted color in the bowl' : 'Empty bowl slot'}
                />
              )}
            </span>
          );
        })}
        <span className="bowl-op" aria-hidden="true">
          =
        </span>
        {result.kind === 'mix' ? (
          <button
            type="button"
            className="chip chip-drop bowl-result bowl-result-ready"
            disabled={wb.locked}
            onPointerDown={(e) => wb.chipPointerDown(e, BOWL_RESULT)}
            onClick={wb.chipClick(wb.mix)}
            aria-label={`${COLOR_LABEL[result.recipe.output]}. Drag it to your pool or onto a spell, or tap to add it to your pool`}
          >
            <PaintDrop color={result.recipe.output} size={52} />
          </button>
        ) : (
          <span className="bowl-result" aria-hidden="true">
            {result.kind === 'no-mix' ? '✕' : '?'}
          </span>
        )}
      </div>
      <p className="bowl-note muted" aria-live="polite">
        {result.kind === 'no-mix'
          ? "These two colors don't mix."
          : result.kind === 'mix'
            ? `${COLOR_LABEL[result.inputs[0]]} + ${COLOR_LABEL[result.inputs[1]]} makes ${COLOR_LABEL[result.recipe.output]}. Drag it to your pool or a spell.`
            : 'Drop two colors in to mix them. Every recipe is in the 📖 Spellbook.'}
      </p>
    </section>
  );
}
