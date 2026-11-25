import { capUpgradePrice, repaintPrice, type RunAction, type RunConfig, type RunState } from '../engine';
import { DiceEditor, DieFaces } from './DiceEditor';

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

  return (
    <>
      <section className="panel">
        <div className="section-head">
          <h2>Shop</h2>
          <span className="muted">Next: fight {run.stageIndex + 2}</span>
        </div>

        <h3 className="subhead">Dice for sale</h3>
        <ul className="shop-list">
          {run.shopStock.map((offer, i) => {
            const reason = offer.sold
              ? 'Sold'
              : slotsFull
                ? 'No free slot'
                : run.gold < offer.price
                  ? 'Not enough gold'
                  : null;
            return (
              <li key={i} className="shop-item">
                <span className="item-main">
                  <span className="item-title">{offer.die.name} die</span>
                  <DieFaces die={offer.die} />
                </span>
                <BuyButton
                  label={offer.sold ? 'Sold' : `${offer.price}g`}
                  reason={reason}
                  onClick={() => onAction({ type: 'buyDie', offerIndex: i })}
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
      </section>

      <footer className="footer">
        <button type="button" className="btn btn-primary" onClick={() => onAction({ type: 'leaveShop' })}>
          Leave shop
        </button>
      </footer>
    </>
  );
}

/** Price button; when it can't be bought, the reason is shown inside the button. */
function BuyButton({ label, reason, onClick }: { label: string; reason: string | null; onClick: () => void }) {
  const showReason = reason !== null && reason !== label;
  return (
    <button type="button" className="btn btn-buy" disabled={reason !== null} onClick={onClick}>
      <span>{label}</span>
      {showReason && <span className="buy-reason">{reason}</span>}
    </button>
  );
}
