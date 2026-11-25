import { useEffect, useId, useRef, useState } from 'react';

/**
 * A "Battle log" button that opens the fight's history over the screen, so the
 * log never pushes the layout around. Hovering opens it with a mouse; on touch
 * screens a tap toggles it, and tapping anywhere else closes it.
 */
export function BattleLog({ lines }: { lines: readonly string[] }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Keep the newest line in view.
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, lines.length]);

  // A tap outside closes a pinned log.
  useEffect(() => {
    if (!pinned) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pinned]);

  // Escape closes an open log first, before the global back action leaves the battle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      setPinned(false);
      setHovered(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      className="battle-log"
      ref={rootRef}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="log-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          // A click closes the log even when hovering is what opened it.
          if (open) {
            setPinned(false);
            setHovered(false);
          } else {
            setPinned(true);
          }
        }}
      >
        <span aria-hidden="true">📜</span> Battle log <span className="muted">({lines.length})</span>
      </button>
      {/* Always rendered, so screen readers hear each new line even while the panel is closed. */}
      <div className="sr-only" aria-live="polite">
        {lines.length > 0 && <p key={lines.length}>{lines.at(-1)}</p>}
      </div>
      {open && (
        <div className="log-panel" id={panelId} ref={listRef} role="region" aria-label="Battle log">
          {lines.length === 0 ? (
            <p className="muted">Nothing has happened yet.</p>
          ) : (
            lines.map((line, i) => <p key={i}>{line}</p>)
          )}
        </div>
      )}
    </div>
  );
}
