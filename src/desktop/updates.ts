/**
 * Update status from the Windows app. In a browser there are no update checks.
 * Nothing here imports Electron.
 */
import { desktopBridge, type DesktopBridge } from './bridge';

export type UpdateStatus =
  /** No update, the check failed (offline), or this isn't the installed app. */
  | { state: 'none' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; version: string; percent: number }
  /** Downloaded; the game is about to close, install it, and restart. */
  | { state: 'installing'; version: string }
  /** The download failed; it can be retried. */
  | { state: 'error'; version: string; message: string };

/** The update half of the Windows app's bridge, or null in a browser. */
export function desktopUpdates(): Pick<DesktopBridge, 'onUpdateStatus' | 'downloadUpdate'> | null {
  return desktopBridge();
}
