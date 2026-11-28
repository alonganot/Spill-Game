import type { AttackDefinition, Color, ColorCost, Effect } from '../engine';
import { upgradeAttack } from '../engine';
import { COLOR_LABEL, shownEffects } from './format';
import { PaintDrop } from './PaintDrop';

/** A spell's name; a `+` spell shows its `+` as a shimmering badge (DESIGN.md §6.6). */
export function SpellName({ attack, className = 'attack-name' }: { attack: AttackDefinition; className?: string }) {
  if (!attack.upgraded) return <span className={className}>{attack.name}</span>;
  return (
    <span className={className}>
      {attack.name.slice(0, -1)}
      <span className="plus-badge" aria-hidden="true">
        +
      </span>
      {/* The badge is decorative; screen readers get a plain "+" so they say "Inferno+". */}
      <span className="sr-only">+</span>
    </span>
  );
}

/** A spell's effects in short form. Effects that differ from `base` are marked in gold. */
export function EffectLine({
  effects,
  base,
  className = 'attack-fx',
}: {
  effects: readonly Effect[];
  base?: readonly Effect[];
  className?: string;
}) {
  const shown = shownEffects(effects, base);
  return (
    <span className={className}>
      {shown.map(({ text, changed }, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <span className={changed ? 'stat-up' : undefined}>{text}</span>
        </span>
      ))}
    </span>
  );
}

/** The colors a spell costs, one paint drop per color. */
export function CostDrops({ cost, size = 14 }: { cost: ColorCost; size?: number }) {
  const colors = Object.entries(cost).flatMap(([color, n]) => Array.from({ length: n ?? 0 }, () => color as Color));
  return (
    <span className="upgrade-cost" role="img" aria-label={`Costs ${colors.map((c) => COLOR_LABEL[c]).join(' + ')}`}>
      {colors.map((color, i) => (
        <PaintDrop key={i} color={color} size={size} />
      ))}
    </span>
  );
}

/** What upgrading a spell gives: its `+` form, cost colors, and effects (the changed numbers in gold). */
export function UpgradePreview({ attack }: { attack: AttackDefinition }) {
  const plus = upgradeAttack(attack);
  return (
    <span className="upgrade-preview">
      <span className="upgrade-row upgrade-after chroma-aura">
        <SpellName attack={plus} className="upgrade-name" />
        <CostDrops cost={attack.cost} />
        <EffectLine effects={plus.effects} base={attack.effects} className="upgrade-fx" />
      </span>
    </span>
  );
}
