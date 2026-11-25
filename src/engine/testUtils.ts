import { MIX_RECIPES } from '../data/colors';
import type { BaseColor, BattleConfig, BattleState, DieDefinition, Rng } from './types';

/** RNG that returns the given values in order, then repeats. */
export function sequenceRng(values: readonly number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length]!;
}

/** A die that always rolls the given color. */
export function fixedDie(color: BaseColor): DieDefinition {
  return { id: `fixed-${color}`, name: `Fixed ${color}`, faces: [color] };
}

export const noopRng: Rng = () => 0;

/** Small, readable config for tests. Numbers are independent of balance data. */
export function testConfig(overrides: Partial<BattleConfig> = {}): BattleConfig {
  return {
    maxPoolSize: 6,
    playerMaxHp: 20,
    dice: [fixedDie('red'), fixedDie('blue'), fixedDie('green')],
    recipes: MIX_RECIPES,
    attacks: [
      { id: 'hit', name: 'Hit', cost: { red: 1 }, effects: [{ type: 'damage', amount: 5 }] },
      { id: 'guard', name: 'Guard', cost: { blue: 1 }, effects: [{ type: 'block', amount: 4 }] },
      { id: 'venom', name: 'Venom', cost: { green: 1 }, effects: [{ type: 'poison', stacks: 3 }] },
      { id: 'scorch', name: 'Scorch', cost: { red: 2 }, effects: [{ type: 'burn' }] },
      { id: 'blast', name: 'Blast', cost: { purple: 1 }, effects: [{ type: 'damage', amount: 8 }] },
      {
        id: 'combo',
        name: 'Combo',
        cost: { purple: 1, cyan: 1, orange: 1 },
        effects: [{ type: 'damage', amount: 30 }],
      },
    ],
    status: { burnDamage: 4, poisonDecay: 1 },
    enemy: { id: 'dummy', name: 'Dummy', maxHp: 30, intents: [{ type: 'attack', amount: 6 }] },
    ...overrides,
  };
}

/** Overwrite parts of a state, e.g. to set a specific pool. */
export function withState(state: BattleState, patch: Partial<BattleState>): BattleState {
  return { ...state, ...patch };
}
