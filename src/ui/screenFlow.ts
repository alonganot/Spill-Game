import { useCallback, useEffect, useMemo, useReducer } from 'react';

/** The app's screens. Settings opens over whatever is below it. */
export type Screen = 'menu' | 'run' | 'settings';

/** Screens from bottom to top; the last one is on screen. Never empty. */
export type ScreenStack = readonly Screen[];

export type FlowAction =
  | { type: 'push'; screen: Screen }
  | { type: 'back' }
  | { type: 'reset'; stack: ScreenStack };

export const INITIAL_STACK: ScreenStack = ['menu'];

export function flowReducer(stack: ScreenStack, action: FlowAction): ScreenStack {
  switch (action.type) {
    case 'push':
      // Opening the screen that's already on top does nothing.
      return stack.at(-1) === action.screen ? stack : [...stack, action.screen];
    case 'back':
      // The root screen stays; on mobile, back there leaves the app instead (M6).
      return stack.length > 1 ? stack.slice(0, -1) : stack;
    case 'reset':
      return action.stack.length > 0 ? action.stack : INITIAL_STACK;
  }
}

export interface ScreenFlow {
  stack: ScreenStack;
  top: Screen;
  /** The screen under the top one, shown behind an overlay such as Settings. */
  below: Screen | undefined;
  push: (screen: Screen) => void;
  back: () => void;
  reset: (stack: ScreenStack) => void;
}

/**
 * The screen stack, plus a global back action on Escape. A layer that handles
 * Escape itself (a dialog, the Spellbook) calls `preventDefault()`, so one
 * press only closes the top layer.
 */
export function useScreenFlow(): ScreenFlow {
  const [stack, dispatch] = useReducer(flowReducer, INITIAL_STACK);
  const push = useCallback((screen: Screen) => dispatch({ type: 'push', screen }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const reset = useCallback((next: ScreenStack) => dispatch({ type: 'reset', stack: next }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      back();
    };
    // Bubble phase on window, so layers listening on document go first.
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);

  return useMemo(
    () => ({ stack, top: stack.at(-1) ?? 'menu', below: stack.at(-2), push, back, reset }),
    [stack, push, back, reset],
  );
}
