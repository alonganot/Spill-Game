import { useCallback, useEffect, useState } from 'react';
import { desktopUpdates, type UpdateStatus } from '../desktop/updates';

export interface AppUpdate {
  status: UpdateStatus;
  /** Downloads and installs the update (also retries a failed download). */
  update: () => void;
}

/** The Windows app's update status; always "none" in a browser. */
export function useAppUpdate(): AppUpdate {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'none' });

  useEffect(() => desktopUpdates()?.onUpdateStatus(setStatus), []);

  const update = useCallback(() => {
    void desktopUpdates()?.downloadUpdate();
  }, []);

  return { status, update };
}
