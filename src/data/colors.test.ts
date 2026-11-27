import { describe, expect, it } from 'vitest';
import type { AttackDefinition, Color } from '../engine/types';
import { ATTACKS, PALETTE_ATTACKS, STARTING_ATTACKS } from './attacks';
import { BASE_COLORS, MIX_RECIPES, SECONDARY_COLORS } from './colors';
import { DICE, SHOP_DICE, STARTING_DICE } from './dice';

const ALL_COLORS: readonly Color[] = [...BASE_COLORS, ...SECONDARY_COLORS];
const pairKey = ([a, b]: readonly [Color, Color]) => [a, b].sort().join('+');

describe('color recipes', () => {
  it('mixes two different base colors into a secondary color', () => {
    for (const { inputs, output } of MIX_RECIPES) {
      expect(BASE_COLORS).toContain(inputs[0]);
      expect(BASE_COLORS).toContain(inputs[1]);
      expect(inputs[0]).not.toBe(inputs[1]);
      expect(SECONDARY_COLORS).toContain(output);
    }
  });

  it('has one recipe per pair and per secondary color, all 8 of them', () => {
    expect(new Set(MIX_RECIPES.map((r) => pairKey(r.inputs))).size).toBe(MIX_RECIPES.length);
    expect(new Set(MIX_RECIPES.map((r) => r.output))).toEqual(new Set(SECONDARY_COLORS));
    expect(MIX_RECIPES).toHaveLength(8);
  });

  it.each([
    ['red', 'white', 'pink'],
    ['white', 'black', 'grey'],
    ['red', 'black', 'crimson'],
    ['green', 'black', 'blight'],
    ['blue', 'white', 'frost'],
  ] as const)('%s + %s -> %s', (a, b, out) => {
    expect(MIX_RECIPES.find((r) => pairKey(r.inputs) === pairKey([a, b]))?.output).toBe(out);
  });
});

describe('spells', () => {
  const all: [string, AttackDefinition][] = [...Object.entries(ATTACKS), ...Object.entries(PALETTE_ATTACKS)];

  it('have unique ids matching their keys', () => {
    for (const [key, attack] of all) expect(attack.id).toBe(key);
    expect(new Set(all.map(([key]) => key)).size).toBe(all.length);
  });

  it('cost only known colors, in positive amounts, and do something', () => {
    for (const [, attack] of all) {
      const cost = Object.entries(attack.cost);
      expect(cost.length).toBeGreaterThan(0);
      for (const [color, count] of cost) {
        expect(ALL_COLORS).toContain(color);
        expect(count).toBeGreaterThan(0);
      }
      expect(attack.effects.length).toBeGreaterThan(0);
    }
  });

  it('are all in play, the White/Pink/Black ones included', () => {
    expect(STARTING_ATTACKS.map((a) => a.id)).toEqual(all.map(([key]) => key));
  });

  it('give every secondary color at least one spell', () => {
    for (const color of SECONDARY_COLORS) {
      expect(STARTING_ATTACKS.some((a) => (a.cost[color] ?? 0) > 0)).toBe(true);
    }
  });
});

describe('dice', () => {
  it('have 6 base-color faces', () => {
    for (const die of Object.values(DICE)) {
      expect(die.faces).toHaveLength(6);
      for (const face of die.faces) expect(BASE_COLORS).toContain(face);
    }
  });

  it('starter dice stay Red/Blue/Green', () => {
    for (const die of STARTING_DICE) {
      for (const face of die.faces) expect(['red', 'blue', 'green']).toContain(face);
    }
  });

  it('the shop sells White and Black dice', () => {
    const ids = SHOP_DICE.map((d) => d.die.id);
    expect(ids).toEqual(expect.arrayContaining(['cleric', 'occult', 'monochrome']));
    for (const color of ['white', 'black'] as const) {
      expect(SHOP_DICE.some((d) => d.die.faces.includes(color))).toBe(true);
    }
  });
});
