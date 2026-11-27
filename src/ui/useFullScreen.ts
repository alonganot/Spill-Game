import { useEffect, useMemo, useState } from 'react';
import { displayMode } from '../desktop/display';

export interface FullScreenControl {
  fullscreen: boolean;
  setFullScreen: (fullscreen: boolean) => void;
}

/** Whether the game is fullscreen, and a switch for it; null where fullscreen isn't available. */
export function useFullScreen(): FullScreenControl | null {
  const mode = useMemo(displayMode, []);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => mode?.subscribe(setFullscreen), [mode]);

  return mode ? { fullscreen, setFullScreen: mode.setFullScreen } : null;
}
