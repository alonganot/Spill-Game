import { useCallback, useEffect, useState } from 'react';
import { beatDuration } from './anim';
import type { Step } from './timeline';

export interface Playback {
  step: Step;
  /** Index of the beat on screen. */
  index: number;
  /** True until every beat has had its time on screen. */
  playing: boolean;
  /** Jumps straight to the final state. */
  skip: () => void;
}

/**
 * Steps through `steps` on a timer. A new `playKey` (one per action) restarts
 * playback from the first beat.
 */
export function usePlayback(steps: readonly Step[], playKey: number): Playback {
  const [progress, setProgress] = useState({ key: playKey, index: 0 });
  // A new action restarts from beat 0 right away, without a stale frame.
  const index = progress.key === playKey ? progress.index : 0;
  const current = steps[index];

  useEffect(() => {
    if (current === undefined) return;
    const timer = setTimeout(() => setProgress({ key: playKey, index: index + 1 }), beatDuration(current.event));
    return () => clearTimeout(timer);
  }, [current, index, playKey]);

  const skip = useCallback(() => setProgress({ key: playKey, index: steps.length }), [playKey, steps.length]);

  return {
    step: steps[Math.min(index, steps.length - 1)]!,
    index,
    playing: index < steps.length,
    skip,
  };
}
