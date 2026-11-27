/**
 * The Windows app's update bridge (`electron/preload.cjs` exposes it as
 * `window.spillDesktop`). In the browser it doesn't exist, and the game
 * carries on without update checks. Nothing here imports Electron.
 */

export type UpdateStatus =
  /** No update, the check failed (offline), or this isn't the installed app. */
  | { state: 'none' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  /** Downloaded; the game is about to close, install it, and restart. */
  | { state: 'installing'; version: string }
  /** The download failed; it can be retried. */
  | { state: 'error'; version: string; message: string };

export interface DesktopUpdates {
  /** Calls `listener` with the current status, then on every change. Returns an unsubscribe. */
  onUpdateStatus(listener: (status: UpdateStatus) => void): () => void;
  /** Starts downloading the available update; it installs and restarts the game when done. */
  downloadUpdate(): Promise<void>;
}

declare global {
  interface Window {
    spillDesktop?: DesktopUpdates;
  }
}

/** The update bridge in the Windows app, or null in a browser. */
export function desktopUpdates(): DesktopUpdates | null {
  return typeof window !== 'undefined' && window.spillDesktop ? window.spillDesktop : null;
}
