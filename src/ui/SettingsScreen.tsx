import { useEffect, useId, useRef, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { SeedLine } from './SeedLine';
import { parseSeed } from './seed';
import { useFullScreen } from './useFullScreen';

/** The run Settings can act on: one that's in progress (not ended). */
export interface ActiveRun {
  seed: number;
  seeded: boolean;
}

interface SettingsScreenProps {
  /** Opened from inside a run (the ☰ button), rather than from the main menu. */
  inRun: boolean;
  /** The run in progress, if there is one. */
  run: ActiveRun | null;
  onBack: () => void;
  onMainMenu: () => void;
  /** Starts the current run over from fight 1, on the same seed. */
  onRestart: () => void;
  onAbandon: () => void;
  onStartSeeded: (seed: number) => void;
}

type Pending = { kind: 'restart' } | { kind: 'abandon' } | { kind: 'seeded'; seed: number };

/** Settings, shown over the menu or the paused run. Back (or Escape) returns to it. */
export function SettingsScreen({
  inRun,
  run,
  onBack,
  onMainMenu,
  onRestart,
  onAbandon,
  onStartSeeded,
}: SettingsScreenProps) {
  const titleId = useId();
  const seedInputId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [seedText, setSeedText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const typedSeed = parseSeed(seedText);
  const display = useFullScreen();

  // Move focus into the panel so keyboard users start here.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  function startSeeded() {
    if (typedSeed === null) return;
    // Only ask when it would end a run in progress.
    if (run) setPending({ kind: 'seeded', seed: typedSeed });
    else onStartSeeded(typedSeed);
  }

  function confirmPending() {
    if (!pending) return;
    setPending(null);
    if (pending.kind === 'restart') onRestart();
    else if (pending.kind === 'abandon') onAbandon();
    else onStartSeeded(pending.seed);
  }

  return (
    <div className="overlay settings-overlay">
      <section className="settings" ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="settings-head">
          <button type="button" className="icon-btn" aria-label="Back" onClick={onBack}>
            ←
          </button>
          <h2 id={titleId}>{inRun ? 'Paused' : 'Settings'}</h2>
        </header>

        {inRun && (
          <div className="settings-group">
            <button type="button" className="btn btn-primary" onClick={onBack}>
              Resume run
            </button>
            <button type="button" className="btn btn-menu" onClick={onMainMenu}>
              Main menu
            </button>
          </div>
        )}

        {run && (
          <div className="settings-group">
            <h3 className="subhead">Current run</h3>
            <SeedLine seed={run.seed} seeded={run.seeded} />
            <div className="settings-row">
              <button type="button" className="btn btn-menu" onClick={() => setPending({ kind: 'restart' })}>
                Restart run
              </button>
              <button type="button" className="btn btn-menu btn-menu-danger" onClick={() => setPending({ kind: 'abandon' })}>
                Abandon run
              </button>
            </div>
          </div>
        )}

        {display && (
          <div className="settings-group">
            <h3 className="subhead">Display</h3>
            <div className="settings-row" role="group" aria-label="Display mode">
              {([false, true] as const).map((full) => (
                <button
                  key={String(full)}
                  type="button"
                  className={`btn ${display.fullscreen === full ? 'btn-primary' : 'btn-menu'}`}
                  aria-pressed={display.fullscreen === full}
                  onClick={() => display.setFullScreen(full)}
                >
                  {full ? 'Fullscreen' : 'Windowed'}
                </button>
              ))}
            </div>
            <p className="muted settings-hint">F11 also switches.</p>
          </div>
        )}

        <form
          className="settings-group"
          onSubmit={(e) => {
            e.preventDefault();
            startSeeded();
          }}
        >
          <label className="subhead" htmlFor={seedInputId}>
            Start a seeded run
          </label>
          <p className="muted settings-hint">The same seed gives the same dice, rewards, and shop, so you can replay or share a run.</p>
          <div className="seed-entry">
            <input
              id={seedInputId}
              className="seed-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={9}
              placeholder="e.g. 12345"
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              aria-invalid={seedText.trim() !== '' && typedSeed === null}
            />
            <button type="submit" className="btn btn-primary seed-start" disabled={typedSeed === null}>
              Start
            </button>
          </div>
          {seedText.trim() !== '' && typedSeed === null && (
            <p className="seed-error" role="alert">
              Use digits only, up to 9.
            </p>
          )}
        </form>
      </section>

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'restart' ? 'Restart this run?' : 'Abandon this run?'}
          body={
            pending.kind === 'restart'
              ? `You go back to fight 1 on seed ${run?.seed ?? ''}, with your starting dice, HP, and gold.`
              : pending.kind === 'abandon'
                ? "The run ends and can't be continued."
                : `The run in progress ends, and a new run starts on seed ${pending.seed}.`
          }
          confirmLabel={pending.kind === 'restart' ? 'Restart' : pending.kind === 'abandon' ? 'Abandon' : 'Start'}
          danger
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
