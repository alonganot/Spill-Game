import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from 'react';
import type { AttackDefinition, MixRecipe } from '../engine';
import { CostDots } from './components';
import { describeEffect } from './format';

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
  disabled: boolean;
  onCast: () => void;
  onPrepareMix: (plan: MixRecipe[]) => void;
  /** Hovering a craftable spell highlights the chips it would mix. */
  onHint: (attackId: string | null) => void;
}

export function SpellCard({ spell, disabled, onCast, onPrepareMix, onHint }: SpellCardProps) {
  const { attack, status, plan } = spell;
  const effects = attack.effects.map(describeEffect).join(' · ');
  const mixes = plan ? `${plan.length} mix${plan.length > 1 ? 'es' : ''}` : '';
  const hint = () => status === 'craftable' && onHint(attack.id);
  const label =
    status === 'craftable'
      ? `${attack.name}: ${effects}. Needs ${mixes} first; tap to pick the colors`
      : status === 'locked'
        ? `${attack.name}: ${effects}. Not enough colors`
        : `${attack.name}: ${effects}`;
  return (
    <button
      type="button"
      className={`attack attack-${status}`}
      aria-label={label}
      disabled={disabled || status === 'locked'}
      onClick={() => (plan && status === 'craftable' ? onPrepareMix(plan) : onCast())}
      onPointerEnter={hint}
      onPointerLeave={() => onHint(null)}
      onFocus={hint}
      onBlur={() => onHint(null)}
    >
      {status === 'craftable' && (
        <span className="attack-mix-tag" aria-hidden="true">
          ⚗ {mixes}
        </span>
      )}
      <span className="attack-name">{attack.name}</span>
      <CostDots cost={attack.cost} />
      <span className="attack-fx">{effects}</span>
    </button>
  );
}

interface SpellbookProps {
  spells: readonly Spell[];
  locked: boolean;
  unavailableOnly: boolean;
  onToggleUnavailableOnly: () => void;
  onCast: (attackId: string) => void;
  onPrepareMix: (plan: MixRecipe[]) => void;
  onHint: (attackId: string | null) => void;
  onClose: () => void;
  /** The sheet stops below this element (the color pool). */
  keepVisibleRef: RefObject<HTMLElement | null>;
}

/** Never shrink the sheet below this, even when the pool is very tall. */
const MIN_SHEET_PX = 200;
const SHEET_GAP_PX = 8;

/** Every spell, ready or not, in a sheet that slides up over the spell area. */
export function Spellbook({
  spells,
  locked,
  unavailableOnly,
  onToggleUnavailableOnly,
  onCast,
  onPrepareMix,
  onHint,
  onClose,
  keepVisibleRef,
}: SpellbookProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const shown = unavailableOnly ? spells.filter((s) => s.status !== 'ready') : spells;

  // Stop the sheet just below the pool, so the chips a hint highlights stay visible.
  useLayoutEffect(() => {
    const fit = () => {
      const bottom = keepVisibleRef.current?.getBoundingClientRect().bottom;
      if (bottom === undefined) return;
      const room = Math.max(MIN_SHEET_PX, window.innerHeight - bottom - SHEET_GAP_PX);
      sheetRef.current?.style.setProperty('--sheet-max', `${room}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [keepVisibleRef]);

  // Move focus into the sheet, keep Tab inside it, and hand focus back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
        {shown.length === 0 ? (
          <p className="muted spellbook-empty">Every spell is ready to cast.</p>
        ) : (
          <div className="attacks spellbook-grid">
            {shown.map((spell) => (
              <SpellCard
                key={spell.attack.id}
                spell={spell}
                disabled={locked}
                onCast={() => onCast(spell.attack.id)}
                onPrepareMix={onPrepareMix}
                onHint={onHint}
              />
            ))}
          </div>
        )}
        <p className="spellbook-legend muted">
          <span className="legend-craftable">⚗ Mix first</span> · tap to pick the colors. Dim spells need colors you don't have.
        </p>
      </section>
    </>
  );
}
