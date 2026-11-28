import { useEffect, useId, useRef } from 'react';
import type { AttackDefinition, Color, MixRecipe } from '../engine';
import { PaintDrop } from './PaintDrop';
import { COLOR_LABEL, spellTip } from './format';
import { EffectLine, SpellName } from './SpellUpgrade';
import { Tip } from './Tooltip';
import { costSlots } from './staging';
import { SlotChip, useWorkbench } from './workbench';

/** Whether a spell can be cast now, after some mixes, or not with this pool. */
export type SpellStatus = 'ready' | 'craftable' | 'locked';

export interface Spell {
  attack: AttackDefinition;
  status: SpellStatus;
  /** For craftable spells: the mixes that would make it payable. */
  plan?: MixRecipe[];
}

interface SpellCardProps {
  spell: Spell;
}

/**
 * A spell with one slot per color it costs. Drag colors onto it (or tap an
 * empty slot to fill it from the bowl or pool), then Cast once every slot is
 * full. With Auto-cast on there's no Cast button: it casts itself when full.
 */
export function SpellCard({ spell }: SpellCardProps) {
  const wb = useWorkbench();
  const { attack, status, plan } = spell;
  const mixes = plan ? `${plan.length} mix${plan.length > 1 ? 'es' : ''}` : '';
  const target = `spell:${attack.id}`;
  const staged = wb.staging.spells[attack.id] ?? [];
  const slots = fillSlots(costSlots(attack.cost), staged, wb.pool);
  const ready = staged.length > 0 && slots.every((slot) => slot.chip !== undefined);
  const locked = status === 'locked';
  const hint = () => status === 'craftable' && wb.hint(attack.id);

  return (
    <div
      className={`attack attack-${status}${ready ? ' attack-charged' : ''}${attack.upgraded ? ' chroma-aura' : ''}${wb.dropClass(target)}`}
      data-drop={locked ? undefined : target}
      onPointerEnter={hint}
      onPointerLeave={() => wb.hint(null)}
      onClick={() => {
        // Tapping the card with a lifted chip drops it here.
        if (wb.selectedChip !== null && !locked) wb.placeSelected({ kind: 'spell', attackId: attack.id });
      }}
    >
      <div className="attack-head">
        <Tip text={spellTip(attack, status, wb.status, plan)} className="attack-name-tip" focusable>
          <SpellName attack={attack} />
        </Tip>
        {status === 'craftable' && plan && (
          <button
            type="button"
            className="attack-mix-tag"
            disabled={wb.locked}
            onClick={(e) => {
              e.stopPropagation();
              wb.prepareMix(plan);
            }}
            onFocus={hint}
            onBlur={() => wb.hint(null)}
            aria-label={`${attack.name} needs ${mixes} first. Put the colors to mix in the bowl`}
          >
            ⚗ {mixes}
          </button>
        )}
      </div>
      <EffectLine effects={attack.effects} base={attack.baseEffects} />
      <div className="attack-foot">
        <span className="cost-slots" role="group" aria-label={`${attack.name} cost`}>
          {slots.map((slot, i) =>
            slot.chip !== undefined ? (
              <SlotChip key={i} chip={slot.chip} where={attack.name} />
            ) : (
              <button
                key={i}
                type="button"
                className={`slot slot-empty slot-${slot.color}`}
                disabled={wb.locked || locked}
                onClick={(e) => {
                  e.stopPropagation();
                  wb.fillSlot(attack.id, slot.color);
                }}
                aria-label={
                  wb.pool.includes(slot.color)
                    ? `Empty ${COLOR_LABEL[slot.color]} slot. Tap to fill it`
                    : `Empty ${COLOR_LABEL[slot.color]} slot. Mix ${COLOR_LABEL[slot.color]} first`
                }
                title={wb.pool.includes(slot.color) ? undefined : `Mix ${COLOR_LABEL[slot.color]} first`}
              >
                {/* A faded drop of the color this slot wants. */}
                <span className="slot-ghost" aria-hidden="true">
                  <PaintDrop color={slot.color} size={18} />
                </span>
              </button>
            ),
          )}
        </span>
        {!wb.autoCast && (
          <button
            type="button"
            className="btn attack-cast"
            disabled={wb.locked || !ready}
            onClick={(e) => {
              e.stopPropagation();
              wb.cast(attack.id);
            }}
          >
            Cast
          </button>
        )}
      </div>
    </div>
  );
}

/** Matches staged chips to a spell's slots by color, in slot order. */
function fillSlots(colors: readonly Color[], staged: readonly number[], pool: readonly Color[]) {
  const slots: { color: Color; chip?: number }[] = colors.map((color) => ({ color }));
  for (const chip of staged) {
    const slot = slots.find((s) => s.chip === undefined && s.color === pool[chip]);
    if (slot) slot.chip = chip;
  }
  return slots;
}


interface SpellbookProps {
  spells: readonly Spell[];
  /** Every mix recipe, listed under the spells. */
  recipes: readonly MixRecipe[];
  unavailableOnly: boolean;
  onToggleUnavailableOnly: () => void;
  onClose: () => void;
}

/** Every spell, ready or not, in a sheet that slides up over the spell area. */
export function Spellbook({
  spells,
  recipes,
  unavailableOnly,
  onToggleUnavailableOnly,
  onClose,
}: SpellbookProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const shown = unavailableOnly ? spells.filter((s) => s.status !== 'ready') : spells;
  const { autoCast } = useWorkbench();

  // Move focus into the sheet, keep Tab inside it, and hand focus back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Handled here, so the global back action doesn't also leave the battle.
        e.preventDefault();
        onClose();
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const inside = sheetRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        className="spellbook"
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="spellbook-head">
          <h3 id={titleId}>
            <span aria-hidden="true">📖</span> Spellbook
          </h3>
          <button
            type="button"
            className={`toggle${unavailableOnly ? ' on' : ''}`}
            aria-pressed={unavailableOnly}
            onClick={onToggleUnavailableOnly}
          >
            Unavailable only
          </button>
          <button type="button" className="icon-btn" aria-label="Close spellbook" onClick={onClose}>
            ✕
          </button>
        </div>
        {/* Only the spells, mixes, and legend scroll; the title and buttons above stay put. */}
        <div className="spellbook-body">
        {shown.length === 0 ? (
          <p className="muted spellbook-empty">Every spell is ready to cast.</p>
        ) : (
          <div className="attacks spellbook-grid">
            {shown.map((spell) => (
              <SpellCard key={spell.attack.id} spell={spell} />
            ))}
          </div>
        )}
        <h4 className="recipe-head">Mixes</h4>
        <ul className="recipe-list">
          {recipes.map(({ inputs: [a, b], output }) => (
            <li key={`${a}+${b}`} className="recipe">
              <span className="recipe-drops" aria-hidden="true">
                <PaintDrop color={a} size={20} /> + <PaintDrop color={b} size={20} /> → <PaintDrop color={output} size={20} />
              </span>
              <span className="recipe-text">
                {COLOR_LABEL[a]} + {COLOR_LABEL[b]} → {COLOR_LABEL[output]}
              </span>
            </li>
          ))}
        </ul>
        <p className="spellbook-legend muted">
          Tap an empty slot to fill it from your bowl or pool, {autoCast ? 'and the spell casts once every slot is full' : 'then Cast'}. <span className="legend-craftable">⚗ Mix first</span> puts the colors to mix in the bowl. Dim spells need colors you don't have.
        </p>
        </div>
      </section>
    </>
  );
}
