import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('defaults to showing the Cast button', () => {
    expect(DEFAULT_SETTINGS.autoCast).toBe(false);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('reads a saved choice', () => {
    expect(parseSettings('{"autoCast":true}')).toEqual({ autoCast: true });
    expect(parseSettings('{"autoCast":false}')).toEqual({ autoCast: false });
  });

  it.each(['not json', '42', 'null', '{"autoCast":"yes"}', '{}'])('falls back to the default for %s', (text) => {
    expect(parseSettings(text)).toEqual(DEFAULT_SETTINGS);
  });
});
