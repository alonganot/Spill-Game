import { describe, expect, it } from 'vitest';
import { STARTING_ATTACKS } from './attacks';

const byId = (id: string) => STARTING_ATTACKS.find((a) => a.id === id)!;

describe('spell upgrades', () => {
  it('every spell has a + form', () => {
    expect(STARTING_ATTACKS).toHaveLength(27);
    for (const attack of STARTING_ATTACKS) expect(attack.upgrade, attack.id).toBeDefined();
  });

  it('each + form changes the effects', () => {
    for (const attack of STARTING_ATTACKS) {
      expect(attack.upgrade!.effects.length, attack.id).toBeGreaterThan(0);
      expect(attack.upgrade!.effects, attack.id).not.toEqual(attack.effects);
    }
  });

  it('Hex+ curses every enemy and Hush+ leaves no Silence Immunity', () => {
    expect(byId('hex').upgrade!.effects).toEqual([{ type: 'curse', area: true }]);
    expect(byId('hush').upgrade!.effects).toEqual([{ type: 'silence', noImmunity: true }]);
  });

  it('the Gold spells and their + forms match RULES.md', () => {
    expect(byId('mint')).toMatchObject({ cost: { gold: 1 }, effects: [{ type: 'gold', amount: 2 }] });
    expect(byId('mint').upgrade!.effects).toEqual([{ type: 'gold', amount: 3 }]);
    expect(byId('bounty')).toMatchObject({
      cost: { gold: 1, green: 1 },
      effects: [{ type: 'bounty', stacks: 1 }, { type: 'damage', amount: 3 }],
    });
    expect(byId('bounty').upgrade!.effects).toEqual([{ type: 'bounty', stacks: 2 }, { type: 'damage', amount: 4 }]);
    expect(byId('gildedWard')).toMatchObject({
      cost: { gold: 1, blue: 1 },
      effects: [{ type: 'block', amount: 5 }, { type: 'gold', amount: 1 }],
    });
    expect(byId('gildedWard').upgrade!.effects).toEqual([{ type: 'block', amount: 7 }, { type: 'gold', amount: 2 }]);
  });

  it('Inferno+ adds a second Burn stack', () => {
    expect(byId('inferno').upgrade!.effects.filter((e) => e.type === 'burn')).toHaveLength(2);
  });
});

describe('Spore Cloud', () => {
  it('costs two Green and poisons every enemy for 2 (3 when upgraded)', () => {
    const spore = byId('sporeCloud');
    expect(spore.cost).toEqual({ green: 2 });
    expect(spore.effects).toEqual([{ type: 'poison', stacks: 2, area: true }]);
    expect(spore.upgrade!.effects).toEqual([{ type: 'poison', stacks: 3, area: true }]);
  });
});

describe('Miasma', () => {
  it("adds 5 Block to Spore Cloud's area Poison; the upgrade raises only the Poison", () => {
    const miasma = byId('miasma');
    expect(miasma.cost).toEqual({ cyan: 1, green: 1 });
    expect(miasma.effects).toEqual([{ type: 'poison', stacks: 2, area: true }, { type: 'block', amount: 5 }]);
    expect(miasma.upgrade!.effects).toEqual([{ type: 'poison', stacks: 4, area: true }, { type: 'block', amount: 5 }]);
    // No longer a copy of Spore Cloud.
    expect(miasma.effects).not.toEqual(byId('sporeCloud').effects);
  });
});
