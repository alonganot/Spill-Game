import { describe, expect, it } from 'vitest';
import { createRun } from '../engine/run';
import { createSeededRng } from '../engine/rng';
import { PLAYER_MAX_HP } from './balance';
import { CHARACTER_ORDER, CHARACTERS, DEFAULT_CHARACTER, isCharacterId, TIER_COSTS } from './characters';
import { DICE, SHOP_DICE } from './dice';
import { ESSENCE } from './economy';
import { defaultRunConfig, runConfigFor, STARTING_DICE_CAP } from './run';

describe('characters', () => {
  it('lists every character once, starter first', () => {
    expect(new Set(CHARACTER_ORDER).size).toBe(CHARACTER_ORDER.length);
    expect(Object.keys(CHARACTERS).sort()).toEqual([...CHARACTER_ORDER].sort());
    expect(CHARACTER_ORDER[0]).toBe(DEFAULT_CHARACTER);
    const tiers = CHARACTER_ORDER.map((id) => CHARACTERS[id].tier);
    expect(tiers).toEqual([...tiers].sort());
  });

  it.each(CHARACTER_ORDER)('%s: dice, HP, and cost are well formed', (id) => {
    const c = CHARACTERS[id];
    expect(c.id).toBe(id);
    expect(c.maxHp).toBeGreaterThan(0);
    expect(c.dice.length).toBeGreaterThan(0);
    expect(c.dice.length).toBeLessThanOrEqual(STARTING_DICE_CAP);
    for (const die of c.dice) expect(die.faces).toHaveLength(6);
    expect(c.unlockCost).toBe(TIER_COSTS[c.tier]);
    expect(c.description.length).toBeGreaterThan(0);
  });

  it('has the RULES.md numbers', () => {
    expect(TIER_COSTS).toEqual({ 0: 0, 1: 500, 2: 2000 });
    expect(CHARACTERS.apprentice.dice).toEqual([DICE.standard, DICE.standard]);
    expect(CHARACTERS.warrior.dice).toEqual([DICE.ember, DICE.ember]);
    expect(CHARACTERS.tank).toMatchObject({ dice: [DICE.lagoon, DICE.standard], maxHp: 42 });
    expect(CHARACTERS.venom).toMatchObject({ dice: [DICE.moss, DICE.tide], maxHp: 40 });
    expect(CHARACTERS.demon).toMatchObject({ dice: [DICE.standard, DICE.shade], maxHp: 40 });
    expect(CHARACTERS.healer).toMatchObject({ dice: [DICE.standard, DICE.halo], maxHp: 28 });
    expect(DICE.shade.faces).toEqual(['black', 'black', 'black', 'black', 'red', 'green']);
    expect(DICE.halo.faces).toEqual(['white', 'white', 'white', 'white', 'red', 'blue']);
    expect(ESSENCE).toEqual({ goldDivisor: 5, perFightWon: 3, victoryBonus: 30 });
  });

  it('keeps the Shade and Halo dice out of the shop', () => {
    const sold = SHOP_DICE.map((d) => d.die.id);
    expect(sold).not.toContain('shade');
    expect(sold).not.toContain('halo');
  });

  it('isCharacterId accepts only real ids', () => {
    for (const id of CHARACTER_ORDER) expect(isCharacterId(id)).toBe(true);
    for (const bad of ['', 'wizard', 'toString', 1, null, undefined]) expect(isCharacterId(bad)).toBe(false);
  });
});

describe('runConfigFor', () => {
  it('matches the default config for the Apprentice', () => {
    expect(runConfigFor('apprentice')).toEqual(defaultRunConfig());
    expect(CHARACTERS.apprentice.maxHp).toBe(PLAYER_MAX_HP);
  });

  it.each(CHARACTER_ORDER)("%s: a run starts with the character's dice and HP", (id) => {
    const { state } = createRun(runConfigFor(id), createSeededRng(1));
    expect(state.dice).toEqual(CHARACTERS[id].dice);
    expect(state.maxHp).toBe(CHARACTERS[id].maxHp);
    expect(state.hp).toBe(CHARACTERS[id].maxHp);
    expect(state.diceCap).toBe(STARTING_DICE_CAP);
  });

  it('changes only the dice and max HP', () => {
    const base = defaultRunConfig();
    const tank = runConfigFor('tank');
    expect({ ...tank, startingDice: base.startingDice, battle: { ...tank.battle, playerMaxHp: base.battle.playerMaxHp } }).toEqual(base);
  });
});
