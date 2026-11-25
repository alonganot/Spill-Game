import { describe, expect, it } from 'vitest';
import { toRuns } from './PixelSprite';

describe('toRuns', () => {
  it('merges same-colored neighbors and skips transparent pixels', () => {
    expect(toRuns(['aab.', '.bbb'], { a: '#111', b: '#222' })).toEqual([
      { x: 0, y: 0, width: 2, color: '#111' },
      { x: 2, y: 0, width: 1, color: '#222' },
      { x: 1, y: 1, width: 3, color: '#222' },
    ]);
  });

  it('skips chars missing from the palette', () => {
    expect(toRuns(['zz'], {})).toEqual([]);
  });
});
