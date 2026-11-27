import { useCallback, useSyncExternalStore } from 'react';

/** Wide enough for the desktop layouts: the battle arena with a side panel, and so on. */
export const DESKTOP_QUERY = '(min-width: 900px)';

/**
 * Whether a CSS media query matches, kept current as the window resizes. For
 * the few things CSS can't do itself, like the pixel size of a sprite.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    [query],
  );
  const matches = () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;
  return useSyncExternalStore(subscribe, matches, () => false);
}

/** True on desktop-sized windows. */
export function useDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** The window's inner width and height, kept current as it resizes. */
export function useWindowSize(): { width: number; height: number } {
  const width = useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 0);
  const height = useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 0);
  return { width, height };
}
