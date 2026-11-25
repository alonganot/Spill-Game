import type { BaseColor, MixRecipe, SecondaryColor } from '../engine/types';

export const BASE_COLORS: readonly BaseColor[] = ['red', 'blue', 'green'];
export const SECONDARY_COLORS: readonly SecondaryColor[] = ['purple', 'cyan', 'orange'];

export const MIX_RECIPES: readonly MixRecipe[] = [
  { inputs: ['red', 'blue'], output: 'purple' },
  { inputs: ['blue', 'green'], output: 'cyan' },
  { inputs: ['red', 'green'], output: 'orange' },
];
