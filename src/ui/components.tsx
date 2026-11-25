import type { Color, ColorCost, Combatant, StatusConfig } from '../engine';
import { blockTip, burnTip, COLOR_LABEL, poisonTip, type Owner } from './format';
import { Tip } from './Tooltip';

export function HpBar({ combatant }: { combatant: Combatant }) {
  const pct = combatant.maxHp > 0 ? (combatant.hp / combatant.maxHp) * 100 : 0;
  return (
    <div className="hp" role="meter" aria-label="HP" aria-valuenow={combatant.hp} aria-valuemin={0} aria-valuemax={combatant.maxHp}>
      <div className="hp-fill" style={{ width: `${pct}%` }} />
      <span className="hp-text">
        {combatant.hp} / {combatant.maxHp}
      </span>
    </div>
  );
}

/** Block and status badges; hover, focus, or tap one to see what it does. */
export function Badges({ combatant, owner, status }: { combatant: Combatant; owner: Owner; status: StatusConfig }) {
  const { block, statuses } = combatant;
  if (block === 0 && statuses.poison === 0 && !statuses.burn) return null;
  return (
    <div className="badges">
      {block > 0 && (
        <Tip text={blockTip(block, owner)} focusable>
          <span className="badge badge-block">🛡 {block}</span>
        </Tip>
      )}
      {statuses.poison > 0 && (
        <Tip text={poisonTip(statuses.poison, owner, status)} focusable>
          <span className="badge badge-poison">☠ {statuses.poison}</span>
        </Tip>
      )}
      {statuses.burn && (
        <Tip text={burnTip(owner, status)} focusable>
          <span className="badge badge-burn">🔥 Burn</span>
        </Tip>
      )}
    </div>
  );
}

export function ColorDot({ color, small = false }: { color: Color; small?: boolean }) {
  return (
    <span
      className={`dot dot-${color}${small ? ' dot-small' : ''}`}
      role="img"
      aria-label={COLOR_LABEL[color]}
      title={COLOR_LABEL[color]}
    />
  );
}

export function CostDots({ cost }: { cost: ColorCost }) {
  const dots: Color[] = [];
  for (const [color, n] of Object.entries(cost) as [Color, number][]) {
    for (let i = 0; i < n; i++) dots.push(color);
  }
  return (
    <span className="cost">
      {dots.map((c, i) => (
        <ColorDot key={i} color={c} small />
      ))}
    </span>
  );
}
