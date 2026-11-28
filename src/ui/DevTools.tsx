import { formatEssence } from './format';
import { DEFAULT_META } from './metaSave';
import { changeMeta, useMeta } from './useMeta';

/** Essence added per click. */
const DEV_ESSENCE_STEP = 1000;

/**
 * Testing shortcuts for local development (`npm run dev`, `npm run electron:dev`).
 * Only rendered behind `import.meta.env.DEV`, which is false in every
 * production build, so released games never show it.
 */
export function DevTools() {
  const meta = useMeta();
  return (
    <div className="settings-group dev-tools">
      <h3 className="subhead">Developer</h3>
      <p className="muted settings-hint">
        Local builds only. Essence: <strong>{formatEssence(meta.essence)}</strong>
      </p>
      <div className="settings-row">
        <button
          type="button"
          className="btn btn-menu"
          onClick={() => changeMeta((m) => ({ ...m, essence: m.essence + DEV_ESSENCE_STEP }))}
        >
          +{formatEssence(DEV_ESSENCE_STEP)}
        </button>
        <button type="button" className="btn btn-menu btn-menu-danger" onClick={() => changeMeta(() => DEFAULT_META)}>
          Reset progress
        </button>
      </div>
    </div>
  );
}
