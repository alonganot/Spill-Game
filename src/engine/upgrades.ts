import type { AttackDefinition, Rng, RunConfig, RunState, ShopUpgrades } from './types';

/** A spell's `+` form: `Name+`, the upgrade's effects, the same cost. A spell without an upgrade is returned as is. */
export function upgradeAttack(attack: AttackDefinition): AttackDefinition {
  if (!attack.upgrade || attack.upgraded) return attack;
  return {
    id: attack.id,
    name: `${attack.name}+`,
    cost: attack.cost,
    effects: attack.upgrade.effects,
    upgraded: true,
    baseEffects: attack.effects,
  };
}

/** The run's spells as they resolve in battle, `+` forms included. */
export function runAttacks(run: Pick<RunState, 'upgradedSpells'>, config: RunConfig): AttackDefinition[] {
  return config.battle.attacks.map((a) => (run.upgradedSpells.includes(a.id) ? upgradeAttack(a) : a));
}

/** Spells that can still be upgraded this run (base definitions). */
export function upgradableSpells(run: Pick<RunState, 'upgradedSpells'>, config: RunConfig): AttackDefinition[] {
  return config.battle.attacks.filter((a) => a.upgrade && !run.upgradedSpells.includes(a.id));
}

export function canUpgrade(run: Pick<RunState, 'upgradedSpells'>, config: RunConfig, attackId: string): boolean {
  return upgradableSpells(run, config).some((a) => a.id === attackId);
}

/** Targeted Upgrade price: rises with every spell upgrade bought earlier in the run (free ones don't count). */
export function targetedUpgradePrice(run: RunState, config: RunConfig): number {
  const { targetedPrice, targetedPriceStep } = config.economy.shop;
  return targetedPrice + targetedPriceStep * run.purchases.upgrade;
}

/** Up to `count` distinct items, drawn with the run RNG. */
export function drawDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const picked: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
    picked.push(pool.splice(index, 1)[0]!);
  }
  return picked;
}

/** A new shop visit's upgrade options: the Spotlight spell is drawn now. */
export function rollShopUpgrades(run: RunState, config: RunConfig, rng: Rng): ShopUpgrades {
  const [spotlight] = drawDistinct(upgradableSpells(run, config), 1, rng);
  return { ...NO_SHOP_UPGRADES, spotlight: spotlight?.id ?? null };
}

export const NO_SHOP_UPGRADES: ShopUpgrades = {
  spotlight: null,
  spotlightSold: false,
  draftSold: false,
  targetedSold: false,
  draftChoices: null,
};
