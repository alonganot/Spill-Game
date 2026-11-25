import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Gap between the anchor and the bubble, and the bubble and the window edge. */
const GAP_PX = 8;

interface TipProps {
  text: string;
  children: ReactNode;
  className?: string;
  /**
   * Makes the anchor itself focusable, for content with nothing focusable
   * inside (badges, intents). Leave off when the content has its own buttons.
   */
  focusable?: boolean;
}

/**
 * Shows `text` in a bubble: on mouse hover, on keyboard focus, or on a tap
 * (touch screens; tap again or anywhere else to close). The bubble is fixed
 * to the window, so scrolling or clipped panels never cut it off. Above the
 * anchor when there's room, otherwise below; always inside the window.
 */
export function Tip({ text, children, className, focusable = false }: TipProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  // Place the bubble once it has a size.
  useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current;
    if (!open || !anchor || !bubble) return;
    const { width, height } = bubble.getBoundingClientRect();
    const left = Math.min(
      Math.max(GAP_PX, anchor.left + anchor.width / 2 - width / 2),
      window.innerWidth - width - GAP_PX,
    );
    const above = anchor.top - height - GAP_PX;
    const top = above >= GAP_PX ? above : anchor.bottom + GAP_PX;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.dataset.side = above >= GAP_PX ? 'above' : 'below';
  }, [open, text]);

  // A tap opened it: close on the next tap anywhere else, or on scroll.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && anchorRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <span
      ref={anchorRef}
      className={`tip-anchor${className ? ` ${className}` : ''}`}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={id}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onPointerUp={(e) => {
        // Touch has no hover, so a tap toggles the bubble.
        if (e.pointerType !== 'mouse') setOpen((o) => !o);
      }}
      onFocus={(e) => e.target === e.currentTarget && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {/* Always in the page for screen readers; the visible bubble is a copy. */}
      <span id={id} className="sr-only">
        {text}
      </span>
      {open &&
        createPortal(
          <span ref={bubbleRef} className="tip" aria-hidden="true">
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
