/**
 * Windowed or fullscreen: the Windows app switches its window (and remembers the
 * choice); a browser uses the Fullscreen API for the page. Nothing here imports Electron.
 */
import { desktopBridge } from './bridge';

export interface DisplayMode {
  /** Calls `listener` with whether the game is fullscreen, then on every change. Returns an unsubscribe. */
  subscribe(listener: (fullscreen: boolean) => void): () => void;
  setFullScreen(fullscreen: boolean): void;
}

function browserDisplay(): DisplayMode | null {
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;
  return {
    subscribe(listener) {
      const update = () => listener(document.fullscreenElement !== null);
      update();
      document.addEventListener('fullscreenchange', update);
      return () => document.removeEventListener('fullscreenchange', update);
    },
    setFullScreen(fullscreen) {
      const change = fullscreen ? document.documentElement.requestFullscreen() : document.exitFullscreen();
      // The browser may refuse (no user gesture, or already in that mode); the toggle shows what really happened.
      change.catch(() => {});
    },
  };
}

/** How to switch fullscreen here, or null where it isn't possible (e.g. iPhone Safari). */
export function displayMode(): DisplayMode | null {
  const bridge = desktopBridge();
  if (bridge) {
    return {
      subscribe: (listener) => bridge.onFullScreenChange(listener),
      setFullScreen: (fullscreen) => void bridge.setFullScreen(fullscreen),
    };
  }
  return browserDisplay();
}
