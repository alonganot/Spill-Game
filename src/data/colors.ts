import type { BaseColor, MixRecipe, SecondaryColor } from '../engine/types';

export const BASE_COLORS: readonly BaseColor[] = ['red', 'blue', 'green', 'white', 'black', 'gold'];
export const SECONDARY_COLORS: readonly SecondaryColor[] = [
  'purple',
  'cyan',
  'orange',
  'pink',
  'grey',
  'crimson',
  'blight',
  'frost',
];

export const MIX_RECIPES: readonly MixRecipe[] = [
  { inputs: ['red', 'blue'], output: 'purple' },
  { inputs: ['blue', 'green'], output: 'cyan' },
  { inputs: ['red', 'green'], output: 'orange' },
  // White and Black
  { inputs: ['red', 'white'], output: 'pink' },
  { inputs: ['white', 'black'], output: 'grey' },
  { inputs: ['red', 'black'], output: 'crimson' },
  { inputs: ['green', 'black'], output: 'blight' },
  { inputs: ['blue', 'white'], output: 'frost' },
];
