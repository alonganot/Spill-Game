import { useState } from 'react';
import { enemySprite, HERO_SPRITE, TITLE_SPRITE } from '../data/sprites';
import { ConfirmDialog } from './ConfirmDialog';
import { PixelSprite } from './PixelSprite';
import { UpdateNotice } from './UpdateNotice';
import { useDesktop } from './useMediaQuery';

interface MainMenuProps {
  /** A run is in progress and hasn't ended, so it can be continued. */
  canContinue: boolean;
  onNewRun: () => void;
  onContinue: () => void;
  onSettings: () => void;
}

const SLIME = enemySprite('puddleSlime');

/** The title scene: the pixel logo, the hero facing a slime, and the main buttons. */
export function MainMenu({ canContinue, onNewRun, onContinue, onSettings }: MainMenuProps) {
  const [confirmingNewRun, setConfirmingNewRun] = useState(false);
  // Twice as big on desktop, still in whole pixels (27px logo, 16px hero, 22px slime).
  const scale = useDesktop() ? 2 : 1;

  return (
    <main className="screen main-menu">
      <h1 className="title-logo">
        <PixelSprite sprite={TITLE_SPRITE} frame="logo" size={270 * scale} label="Spill" />
      </h1>
      <p className="title-tagline muted">Roll paint. Mix colors. Spill it on monsters.</p>

      <div className="title-scene" aria-hidden="true">
        <div className="bob bob-slow">
          <PixelSprite sprite={HERO_SPRITE} frame="idle" size={64 * scale} label="" />
        </div>
        {SLIME && (
          <div className="bob">
            <PixelSprite sprite={SLIME} frame="idle" size={88 * scale} label="" />
          </div>
        )}
      </div>

      <UpdateNotice />

      <nav className="menu-buttons" aria-label="Main menu">
        {canContinue && (
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            Continue
          </button>
        )}
        <button
          type="button"
          className={`btn ${canContinue ? 'btn-menu' : 'btn-primary'}`}
          onClick={() => (canContinue ? setConfirmingNewRun(true) : onNewRun())}
        >
          New run
        </button>
        <button type="button" className="btn btn-menu" onClick={onSettings}>
          Settings
        </button>
      </nav>

      {confirmingNewRun && (
        <ConfirmDialog
          title="Abandon this run?"
          body="Starting a new run ends the one in progress. It can't be continued afterwards."
          confirmLabel="New run"
          danger
          onConfirm={() => {
            setConfirmingNewRun(false);
            onNewRun();
          }}
          onCancel={() => setConfirmingNewRun(false)}
        />
      )}
    </main>
  );
}
