import { describe, expect, it } from 'vitest';
import { createCombatant, takeDamage } from './combat';
import { resolveStatuses } from './statuses';
import type { Combatant } from './types';

const config = { burnDamage: 4, poisonDecay: 1, curseBonus: 3, chillMultiplier: 0.5, bountyGold: 3 };

function withStatuses(poison: number, burn: number, block = 0): Combatant {
  return { ...createCombatant(20), block, statuses: { poison, burn } };
}

describe('takeDamage', () => {
  it('reduces block before HP', () => {
    const { combatant, blocked, dealt } = takeDamage({ ...createCombatant(20), block: 3 }, 5);
    expect(combatant).toMatchObject({ block: 0, hp: 18 });
    expect({ blocked, dealt }).toEqual({ blocked: 3, dealt: 2 });
  });

  it('is fully absorbed by enough block', () => {
    expect(takeDamage({ ...createCombatant(20), block: 10 }, 4).combatant).toMatchObject({ block: 6, hp: 20 });
  });

  it('does not drop HP below 0', () => {
    const { combatant, dealt } = takeDamage(createCombatant(5), 9);
    expect(combatant.hp).toBe(0);
    expect(dealt).toBe(5);
  });
});

describe('resolveStatuses', () => {
  it('poison deals damage equal to stacks, then decays by 1', () => {
    const { combatant } = resolveStatuses(withStatuses(3, 0), 'enemy', config);
    expect(combatant.hp).toBe(17);
    expect(combatant.statuses.poison).toBe(2);
  });

  it('poison is removed when it reaches 0', () => {
    const { combatant } = resolveStatuses(withStatuses(1, 0), 'enemy', config);
    expect(combatant.statuses.poison).toBe(0);
    expect(resolveStatuses(combatant, 'enemy', config).events).toEqual([]);
  });

  it('burn deals fixed damage, then is cleared', () => {
    const { combatant } = resolveStatuses(withStatuses(0, 1), 'enemy', config);
    expect(combatant.hp).toBe(16);
    expect(combatant.statuses.burn).toBe(0);
  });

  it('stacked burn deals its damage once per stack, then every stack goes out', () => {
    const { combatant, events } = resolveStatuses(withStatuses(0, 3), 'enemy', config);
    expect(combatant.hp).toBe(20 - 3 * 4);
    expect(combatant.statuses.burn).toBe(0);
    expect(events).toEqual([{ type: 'damaged', target: 'enemy', amount: 12, blocked: 0, source: 'burn' }]);
  });

  it('status damage ignores block', () => {
    const { combatant } = resolveStatuses(withStatuses(2, 1, 10), 'enemy', config);
    expect(combatant).toMatchObject({ hp: 14, block: 10 });
  });

  it('resolves poison then burn and reports both', () => {
    const { events } = resolveStatuses(withStatuses(2, 1), 'player', config);
    expect(events).toEqual([
      { type: 'damaged', target: 'player', amount: 2, blocked: 0, source: 'poison' },
      { type: 'damaged', target: 'player', amount: 4, blocked: 0, source: 'burn' },
    ]);
  });
});
