import { describe, expect, it } from 'vitest';
import { STANDARD_DIE } from '../data/dice';
import { rollDice, rollDie } from './dice';
import { createSeededRng } from './rng';
import { sequenceRng } from './testUtils';

describe('rollDie', () => {
  it('maps the RNG value to a face', () => {
    expect(rollDie(STANDARD_DIE, () => 0)).toBe('red');
    expect(rollDie(STANDARD_DIE, () => 0.4)).toBe('blue');
    expect(rollDie(STANDARD_DIE, () => 0.99)).toBe('green');
  });

  it('never goes out of bounds', () => {
    expect(rollDie(STANDARD_DIE, () => 0.9999999999)).toBe('green');
  });

  it('throws for a die with no faces', () => {
    expect(() => rollDie({ id: 'empty', faces: [] }, () => 0)).toThrow();
  });
});

describe('rollDice', () => {
  it('rolls each die once, in order', () => {
    expect(rollDice([STANDARD_DIE, STANDARD_DIE, STANDARD_DIE], sequenceRng([0, 0.5, 0.9]))).toEqual([
      'red',
      'blue',
      'green',
    ]);
  });

  it('is deterministic for the same seed', () => {
    const dice = Array.from({ length: 10 }, () => STANDARD_DIE);
    expect(rollDice(dice, createSeededRng(42))).toEqual(rollDice(dice, createSeededRng(42)));
  });
});
