import { useState } from 'react';
import {
  capUpgradePrice,
  repaintPrice,
  targetedUpgradePrice,
  upgradableSpells,
  type AttackDefinition,
  type RunAction,
  type RunConfig,
  type RunState,
} from '../engine';
import { ConfirmDialog } from './ConfirmDialog';
import { DiceEditor, DieFaces } from './DiceEditor';
import { UpgradePreview } from './SpellUpgrade';

interface ShopScreenProps {
  run: RunState;
  config: RunConfig;
  onAction: (action: RunAction) => void;
}

export function ShopScreen({ run, config, onAction }: ShopScreenProps) {
  const { healPrice, healAmount } = config.economy.shop;
  const repaint = repaintPrice(run, config);
  const cap = capUpgradePrice(run, config);
  const slotsFull = run.dice.length >= run.diceCap;
  const capMaxed = run.diceCap >= config.maxDiceCap;
  const fullHp = run.hp >= run.maxHp;
  // With every slot full, buying a die means picking one of yours to replace.
  const [swapping, setSwapping] = useState<number | null>(null);
  const [replaced, setReplaced] = useState<number | null>(null);
  const swapOffer = swapping === null ? undefined : run.shopStock[swapping];
  // Targeted Upgrade: the picker is open, and the spell picked in it.
  const [targeting, setTargeting] = useState(false);
  const [targeted, setTargeted] = useState<string | null>(null);
  const [drafted, setDrafted] = useState<string | null>(null);

  const { spotlightPrice, draftPrice } = config.economy.shop;
  const targetedPrice = targetedUpgradePrice(run, config);
  const upgradable = upgradableSpells(run, config);
  const spell = (id: string | null) => (id === null ? undefined : config.battle.attacks.find((a) => a.id === id));
  const { spotlightSold, draftSold, targetedSold, draftChoices } = run.shopUpgrades;
  const spotlight = spell(run.shopUpgrades.spotlight);
  const spotlightLeft = spotlight !== undefined && upgradable.some((a) => a.id === spotlight.id);
  const priceReason = (sold: boolean, price: number) => (sold ? 'Sold' : run.gold < price ? 'Not enough gold' : null);

  function closeTargeted() {
    setTargeting(false);
    setTargeted(null);
  }

  function closeSwap() {
    setSwapping(null);
    setReplaced(null);
  }

  return (
    <>
      <section className="panel shop">
        <div className="section-head shop-head">
          <h2>Shop</h2>
          <span className="muted">Next: fight {run.stageIndex + 2}</span>
        </div>

        {/* On desktop: what's for sale on the left, your dice on the right. On phones the columns vanish. */}
        <div className="shop-columns">
        <div className="shop-col">
        <h3 className="subhead">Dice for sale</h3>
        <ul className="shop-list">
          {run.shopStock.map((offer, i) => {
            const reason = offer.sold ? 'Sold' : run.gold < offer.price ? 'Not enough gold' : null;
            return (
              <li key={i} className="shop-item">
                <span className="item-main">
                  <span className="item-title">{offer.die.name} die</span>
                  <DieFaces die={offer.die} />
                </span>
                <BuyButton
                  label={offer.sold ? 'Sold' : `${offer.price}g`}
                  reason={reason}
                  note={reason === null && slotsFull ? 'Swap a die' : undefined}
                  onClick={() => (slotsFull ? setSwapping(i) : onAction({ type: 'buyDie', offerIndex: i }))}
                />
              </li>
            );
          })}
        </ul>

        <h3 className="subhead">Services</h3>
        <ul className="shop-list">
          <li className="shop-item">
            <span className="item-main">
              <span className="item-title">Heal {healAmount} HP</span>
              <span className="muted small">
                HP {run.hp} / {run.maxHp}
              </span>
            </span>
            <BuyButton
              label={`${healPrice}g`}
              reason={fullHp ? 'Full HP' : run.gold < healPrice ? 'Not enough gold' : null}
              onClick={() => onAction({ type: 'buyHeal' })}
            />
          </li>
          <li className="shop-item">
            <span className="item-main">
              <span className="item-title">+1 dice slot</span>
              <span className="muted small">
                Slots {run.diceCap} / max {config.maxDiceCap}
              </span>
            </span>
            <BuyButton
              label={capMaxed ? 'Max' : `${cap}g`}
              reason={capMaxed ? 'Max' : run.gold < cap ? 'Not enough gold' : null}
              onClick={() => onAction({ type: 'buyCapUpgrade' })}
            />
          </li>
        </ul>

        </div>

        <div className="shop-col">
        <div className="section-head subhead-row">
          <h3 className="subhead">
            Your dice ({run.dice.length}/{run.diceCap})
          </h3>
          <span className="muted small">Repaint a face: {repaint}g</span>
        </div>
        <DiceEditor
          dice={run.dice}
          confirmLabel={`Repaint · ${repaint}g`}
          blockedReason={run.gold < repaint ? `Repainting costs ${repaint}g.` : undefined}
          onRepaint={(target) => onAction({ type: 'repaint', target })}
        />
        </div>
        </div>

        {/* Spell upgrades: a full-width row under both columns. */}
        <div className="shop-upgrades">
          <h3 className="subhead">Spell upgrades</h3>
          {upgradable.length === 0 && !draftChoices ? (
            <p className="muted small">Every spell is upgraded.</p>
          ) : (
            <ul className="shop-list shop-upgrade-row">
              {spotlight && (spotlightLeft || spotlightSold) && (
                <li className="shop-item shop-upgrade">
                  <span className="item-main">
                    <span className="item-title">Spotlight Upgrade</span>
                    <UpgradePreview attack={spotlight} />
                  </span>
                  <BuyButton
                    label={spotlightSold ? 'Sold' : `${spotlightPrice}g`}
                    reason={priceReason(spotlightSold, spotlightPrice)}
                    onClick={() => onAction({ type: 'buySpotlightUpgrade' })}
                  />
                </li>
              )}
              <li className="shop-item">
                <span className="item-main">
                  <span className="item-title">Draft Upgrade</span>
                  <span className="muted small">
                    Draw {config.economy.shop.draftChoices} spells, upgrade one of them
                  </span>
                </span>
                <BuyButton
                  label={draftSold ? 'Sold' : `${draftPrice}g`}
                  reason={priceReason(draftSold, draftPrice)}
                  onClick={() => onAction({ type: 'buyDraftUpgrade' })}
                />
              </li>
              <li className="shop-item">
                <span className="item-main">
                  <span className="item-title">Targeted Upgrade</span>
                  <span className="muted small">Upgrade any spell you choose</span>
                </span>
                <BuyButton
                  label={targetedSold ? 'Sold' : `${targetedPrice}g`}
                  reason={priceReason(targetedSold, targetedPrice)}
                  onClick={() => setTargeting(true)}
                />
              </li>
            </ul>
          )}
        </div>
      </section>

      {swapOffer && (
        <ConfirmDialog
          title={`Swap in the ${swapOffer.die.name} die?`}
          body="Every slot is full. Pick one of your dice to replace; the new die takes its place."
          confirmLabel={`Replace · ${swapOffer.price}g`}
          confirmDisabled={replaced === null}
          onConfirm={() => {
            if (swapping === null || replaced === null) return;
            onAction({ type: 'buyDie', offerIndex: swapping, replaceIndex: replaced });
            closeSwap();
          }}
          onCancel={closeSwap}
        >
          <div className="swap-new">
            <span className="muted small">New</span>
            <DieFaces die={swapOffer.die} />
          </div>
          <ul className="dice-list swap-list" role="group" aria-label="Die to replace">
            {run.dice.map((die, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`die-row swap-pick${replaced === i ? ' selected' : ''}`}
                  aria-pressed={replaced === i}
                  aria-label={`Replace ${die.name} die ${i + 1}`}
                  onClick={() => setReplaced(i)}
                >
                  <span className="die-name">{die.name}</span>
                  <DieFaces die={die} />
                </button>
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}

      {/* A bought Draft must be picked: the dialog has no Cancel and comes back after a reload. */}
      {draftChoices && (
        <ConfirmDialog
          title="Draft Upgrade: pick a spell"
          body="Pick one of these spells to upgrade to its + form for the rest of the run."
          confirmLabel="Upgrade"
          confirmDisabled={drafted === null || !draftChoices.includes(drafted)}
          onConfirm={() => {
            if (drafted === null) return;
            onAction({ type: 'pickDraftUpgrade', attackId: drafted });
            setDrafted(null);
          }}
        >
          <SpellPicker spells={draftChoices.map(spell).filter(isSpell)} picked={drafted} onPick={setDrafted} />
        </ConfirmDialog>
      )}

      {targeting && (
        <ConfirmDialog
          title="Targeted Upgrade"
          body="Pick any spell to upgrade to its + form for the rest of the run."
          confirmLabel={`Upgrade · ${targetedPrice}g`}
          confirmDisabled={targeted === null}
          onConfirm={() => {
            if (targeted === null) return;
            onAction({ type: 'buyTargetedUpgrade', attackId: targeted });
            closeTargeted();
          }}
          onCancel={closeTargeted}
        >
          <SpellPicker spells={upgradable} picked={targeted} onPick={setTargeted} />
        </ConfirmDialog>
      )}

      <footer className="footer">
        <button
          type="button"
          className="btn btn-primary"
          disabled={draftChoices !== null}
          onClick={() => onAction({ type: 'leaveShop' })}
        >
          Leave shop
        </button>
      </footer>
    </>
  );
}

function isSpell(attack: AttackDefinition | undefined): attack is AttackDefinition {
  return attack !== undefined;
}

/** A list of spells to upgrade, each shown as its `+` form; one can be picked. */
function SpellPicker({
  spells,
  picked,
  onPick,
}: {
  spells: readonly AttackDefinition[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul className="dice-list swap-list upgrade-list" role="group" aria-label="Spell to upgrade">
      {spells.map((attack) => (
        <li key={attack.id}>
          <button
            type="button"
            className={`die-row swap-pick upgrade-pick${picked === attack.id ? ' selected' : ''}`}
            aria-pressed={picked === attack.id}
            aria-label={`Upgrade ${attack.name}`}
            onClick={() => onPick(attack.id)}
          >
            <UpgradePreview attack={attack} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Price button; when it can't be bought, the reason is shown inside the button (or else an optional note). */
function BuyButton({
  label,
  reason,
  note,
  onClick,
}: {
  label: string;
  reason: string | null;
  note?: string;
  onClick: () => void;
}) {
  const shown = reason !== null && reason !== label ? reason : note;
  return (
    <button type="button" className="btn btn-buy" disabled={reason !== null} onClick={onClick}>
      <span>{label}</span>
      {shown && <span className="buy-reason">{shown}</span>}
    </button>
  );
}
