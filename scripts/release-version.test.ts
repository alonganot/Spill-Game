import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain JS build script, no type declarations
import { decideBump, MINOR_LINES, nextVersion } from './release-version.mjs';

const file = (path: string, lines = 10, status = 'M') => ({ path, status, lines });
const decide = (files: ReturnType<typeof file>[], messages: string[] = ['Fix a thing'], saveFormatChanged = false) =>
  decideBump({ messages, files, saveFormatChanged });

describe('decideBump', () => {
  it('releases a small game change as a patch', () => {
    expect(decide([file('src/ui/battle.css', 8), file('src/data/enemies.ts', 4)])).toMatchObject({ release: true, bump: 'patch' });
  });

  it('makes new source files or a big change a minor release', () => {
    expect(decide([file('src/ui/UpdateNotice.tsx', 30, 'A')])).toMatchObject({ bump: 'minor' });
    expect(decide([file('src/engine/battle.ts', MINOR_LINES)])).toMatchObject({ bump: 'minor' });
    expect(decide([file('src/engine/battle.ts', MINOR_LINES - 1)])).toMatchObject({ bump: 'patch' });
  });

  it('makes a save format change or BREAKING CHANGE a major release', () => {
    expect(decide([file('src/ui/runSave.ts', 2)], ['Save v3'], true)).toMatchObject({ bump: 'major' });
    expect(decide([file('src/engine/run.ts')], ['Rework runs\n\nBREAKING CHANGE: new run format'])).toMatchObject({ bump: 'major' });
  });

  it('skips a release when only docs, CI, or tests changed', () => {
    expect(decide([file('PLAN.md', 900), file('.github/workflows/release.yml', 50, 'A')])).toMatchObject({ release: false });
    expect(decide([file('src/engine/run.test.ts', 600, 'A')])).toMatchObject({ release: false });
  });

  it('lets commit markers decide, the biggest one winning', () => {
    expect(decide([file('src/engine/battle.ts', 2000, 'A')], ['Huge but safe [patch]'])).toMatchObject({ bump: 'patch' });
    expect(decide([file('src/ui/a.ts')], ['[minor] one', '[major] two'])).toMatchObject({ bump: 'major' });
    expect(decide([file('README.md')], ['Docs, but ship it [patch]'])).toMatchObject({ release: true, bump: 'patch' });
    expect(decide([file('src/ui/a.ts')], ['Not yet [skip release]'])).toMatchObject({ release: false });
  });
});

describe('nextVersion', () => {
  it.each([
    ['1.0.1', 'patch', '1.0.2'],
    ['1.0.1', 'minor', '1.1.0'],
    ['1.4.2', 'major', '2.0.0'],
  ])('%s + %s = %s', (version, bump, expected) => {
    expect(nextVersion(version, bump)).toBe(expected);
  });

  it('rejects a malformed version', () => {
    expect(() => nextVersion('1.0', 'patch')).toThrow();
  });
});
