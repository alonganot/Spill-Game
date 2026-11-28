import { describe, expect, it } from 'vitest';
import { STARTING_ATTACKS } from './attacks';

const byId = (id: string) => STARTING_ATTACKS.find((a) => a.id === id)!;

describe('spell upgrades', () => {
  it('every spell has a + form', () => {
    expect(STARTING_ATTACKS).toHaveLength(24);
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
