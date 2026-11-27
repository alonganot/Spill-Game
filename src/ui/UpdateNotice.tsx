import { describeUpdate } from './format';
import { useAppUpdate } from './useAppUpdate';

/** The main menu's "update available" notice in the Windows app. Renders nothing otherwise. */
export function UpdateNotice() {
  const { status, update } = useAppUpdate();
  const notice = describeUpdate(status);
  if (notice === null) return null;

  return (
    <div className="update-notice" role="status" aria-live="polite">
      <span className="update-notice-text">{notice.text}</span>
      {notice.action && (
        <button type="button" className="btn btn-primary update-notice-btn" onClick={update}>
          {notice.action}
        </button>
      )}
    </div>
  );
}
