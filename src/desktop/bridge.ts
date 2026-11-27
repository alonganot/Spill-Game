/**
 * The Windows app's bridge to Electron (`electron/preload.cjs` exposes it as
 * `window.spillDesktop`). In a browser it doesn't exist. Nothing here imports Electron.
 */
import type { UpdateStatus } from './updates';

export interface DesktopBridge {
  /** Calls `listener` with the current update status, then on every change. Returns an unsubscribe. */
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void;
  /** Starts downloading the available update; it installs and restarts the game when done. */
  downloadUpdate(): Promise<void>;
  /** Calls `listener` with whether the window is fullscreen, then on every change. Returns an unsubscribe. */
  onFullScreenChange(listener: (fullscreen: boolean) => void): () => void;
  setFullScreen(fullscreen: boolean): Promise<void>;
}

declare global {
  interface Window {
    spillDesktop?: DesktopBridge;
  }
}

/** The bridge in the Windows app, or null in a browser. */
export function desktopBridge(): DesktopBridge | null {
  return typeof window !== 'undefined' && window.spillDesktop ? window.spillDesktop : null;
}
