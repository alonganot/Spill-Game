import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** How far the pointer moves before a press turns into a drag, so taps stay taps. */
const DRAG_THRESHOLD_PX = 6;

/** A chip being dragged: where the pointer is, and the drop target under it. */
export interface DragState {
  chip: number;
  x: number;
  y: number;
  /** The `data-drop` value of the target under the pointer, if any. */
  over: string | null;
}

/** The nearest `[data-drop]` element at a screen point (the ghost chip ignores the pointer). */
export function dropTargetAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  return el?.closest('[data-drop]')?.getAttribute('data-drop') ?? null;
}

/**
 * Pointer-event dragging for pool chips, so it works with a mouse and on touch
 * screens (HTML5 drag and drop doesn't fire on touch). A press that moves past
 * a few pixels becomes a drag; on release `onDrop` gets the chip and the target.
 * A press that doesn't move stays a normal click (tap to select).
 */
export function useChipDrag(onDrop: (chip: number, target: string | null) => void, enabled: boolean) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  // After a real drag the browser still fires a click on release; swallow it.
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);
  // Locking (playback) cancels a drag in progress.
  useEffect(() => {
    if (enabled) return;
    cleanup.current?.();
    setDrag(null);
  }, [enabled]);

  const start = useCallback(
    (e: ReactPointerEvent, chip: number) => {
      if (!enabled || e.button !== 0) return;
      cleanup.current?.();
      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let dragging = false;

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        ev.preventDefault();
        setDrag({ chip, x: ev.clientX, y: ev.clientY, over: dropTargetAt(ev.clientX, ev.clientY) });
      };
      const end = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        stop();
        if (!dragging) return;
        suppressClick.current = true;
        setDrag(null);
        onDropRef.current(chip, ev.type === 'pointercancel' ? null : dropTargetAt(ev.clientX, ev.clientY));
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        cleanup.current = null;
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      cleanup.current = stop;
    },
    [enabled],
  );

  /** Wrap a chip's click handler: it won't fire right after the chip was dragged. */
  const click = useCallback((handler: () => void) => {
    return () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      handler();
    };
  }, []);

  return { drag, start, click };
}
