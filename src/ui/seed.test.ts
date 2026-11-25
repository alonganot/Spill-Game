import { describe, expect, it } from 'vitest';
import { parseSeed, randomSeed } from './seed';

describe('parseSeed', () => {
  it('reads digits as a number', () => {
    expect(parseSeed('12345')).toBe(12345);
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('007')).toBe(7);
  });

  it('ignores spaces around the seed', () => {
    expect(parseSeed('  42 ')).toBe(42);
  });

  it('allows up to 9 digits', () => {
    expect(parseSeed('999999999')).toBe(999_999_999);
    expect(parseSeed('1234567890')).toBeNull();
  });

  it('rejects empty input, letters, signs, and decimals', () => {
    for (const text of ['', '   ', 'abc', '12a', '-5', '+5', '1.5', '1 2', '1e5']) {
      expect(parseSeed(text), JSON.stringify(text)).toBeNull();
    }
  });
});

describe('randomSeed', () => {
  it('is a whole number that parseSeed reads back', () => {
    for (let i = 0; i < 50; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(parseSeed(String(seed))).toBe(seed);
    }
  });
});
