import type { BaseColor, DieDefinition, Rng } from './types';

export function rollDie(die: DieDefinition, rng: Rng): BaseColor {
  if (die.faces.length === 0) throw new Error(`Die "${die.id}" has no faces`);
  const index = Math.min(Math.floor(rng() * die.faces.length), die.faces.length - 1);
  return die.faces[index]!;
}

export function rollDice(dice: readonly DieDefinition[], rng: Rng): BaseColor[] {
  return dice.map((die) => rollDie(die, rng));
}
