import type { DieDefinition } from '../engine/types';

/** Even split of the three base colors. */
export const STANDARD_DIE: DieDefinition = {
  id: 'standard',
  faces: ['red', 'red', 'blue', 'blue', 'green', 'green'],
};

export const STARTING_DICE: readonly DieDefinition[] = [STANDARD_DIE, STANDARD_DIE, STANDARD_DIE];
