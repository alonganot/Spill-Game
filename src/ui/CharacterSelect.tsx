import { useEffect, useRef, useState } from 'react';
import { CHARACTER_ORDER, CHARACTERS, TIER_COSTS, type CharacterDef, type CharacterId, type CharacterTier } from '../data/characters';
import { HERO_SPRITES } from '../data/sprites';
import { ConfirmDialog } from './ConfirmDialog';
import { DieFaces } from './DiceEditor';
import { formatEssence } from './format';
import { isUnlocked, type MetaSave } from './metaSave';
import { PixelSprite } from './PixelSprite';

interface CharacterSelectProps {
  meta: MetaSave;
  onSelect: (id: CharacterId) => void;
  /** Spends the character's cost; it becomes the selected one. */
  onUnlock: (id: CharacterId) => void;
  /** Starts a run as the selected character. */
  onStart: () => void;
  onBack: () => void;
}

const TIERS: readonly CharacterTier[] = [0, 1, 2];

function tierTitle(tier: CharacterTier): string {
  return tier === 0 ? 'Starter' : `Tier ${tier} · ${formatEssence(TIER_COSTS[tier])}`;
}

/** Before a new run: pick a character, or spend Essence to unlock one (RULES.md §4). */
export function CharacterSelect({ meta, onSelect, onUnlock, onStart, onBack }: CharacterSelectProps) {
  const [confirming, setConfirming] = useState<CharacterDef | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const selected = CHARACTERS[meta.selected];

  // Keyboard users land on Start run, the usual next step.
  useEffect(() => {
    startRef.current?.focus();
  }, []);

  return (
    <main className="screen character-select" aria-labelledby="character-select-title">
      <header className="character-head">
        <button type="button" className="icon-btn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h2 id="character-select-title">Choose a character</h2>
        <span className="essence-balance" aria-label={`Essence: ${meta.essence}`}>
          {formatEssence(meta.essence)}
        </span>
      </header>

      {TIERS.map((tier) => (
        <section key={tier} className="character-tier" aria-label={tierTitle(tier)}>
          <h3 className="subhead tier-title">{tierTitle(tier)}</h3>
          <ul className="character-cards">
            {CHARACTER_ORDER.filter((id) => CHARACTERS[id].tier === tier).map((id) => (
              <li key={id}>
                <CharacterCard
                  character={CHARACTERS[id]}
                  unlocked={isUnlocked(meta, id)}
                  selected={meta.selected === id}
                  affordable={meta.essence >= CHARACTERS[id].unlockCost}
                  onSelect={() => onSelect(id)}
                  onUnlock={() => setConfirming(CHARACTERS[id])}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="character-footer">
        <button type="button" ref={startRef} className="btn btn-primary" onClick={onStart}>
          Start run as {selected.name}
        </button>
      </footer>

      {confirming && (
        <ConfirmDialog
          title={`Unlock ${confirming.name}?`}
          body={`Spend ${formatEssence(confirming.unlockCost)} of your ${formatEssence(meta.essence)}. Unlocks are permanent.`}
          confirmLabel={`Unlock · ${formatEssence(confirming.unlockCost)}`}
          onConfirm={() => {
            onUnlock(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </main>
  );
}

interface CharacterCardProps {
  character: CharacterDef;
  unlocked: boolean;
  selected: boolean;
  affordable: boolean;
  onSelect: () => void;
  onUnlock: () => void;
}

function CharacterCard({ character, unlocked, selected, affordable, onSelect, onUnlock }: CharacterCardProps) {
  return (
    <article
      className={`character-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`}
      aria-label={`${character.name}${unlocked ? '' : ', locked'}${selected ? ', selected' : ''}`}
    >
      <div className="character-sprite" aria-hidden="true">
        <PixelSprite sprite={HERO_SPRITES[character.id]} frame="idle" size={64} label="" />
      </div>
      <div className="character-info">
        <div className="character-name-row">
          <h4 className="character-name">{character.name}</h4>
          <span className="character-hp" aria-label={`Max HP ${character.maxHp}`}>
            ❤ {character.maxHp}
          </span>
        </div>
        <p className="character-desc muted">{character.description}</p>
        <ul className="character-dice" aria-label="Starting dice">
          {character.dice.map((die, i) => (
            <li key={i} className="character-die">
              <span className="die-name">{die.name}</span>
              <DieFaces die={die} />
            </li>
          ))}
        </ul>
        <div className="character-action">
          {!unlocked ? (
            <button type="button" className="btn btn-buy" disabled={!affordable} onClick={onUnlock}>
              Unlock · {formatEssence(character.unlockCost)}
              {!affordable && <span className="buy-reason">Not enough Essence</span>}
            </button>
          ) : selected ? (
            <span className="character-selected-tag">Selected</span>
          ) : (
            <button type="button" className="btn btn-menu" onClick={onSelect}>
              Select
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
