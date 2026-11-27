// Decides the next release version from what changed since the last release tag.
// Used by .github/workflows/release.yml on every push to main.
//
//   node scripts/release-version.mjs            # prints the decision as JSON
//   (in GitHub Actions it also writes `release`, `bump`, `version` to $GITHUB_OUTPUT)
//
// Rules, first match wins:
//   1. A marker in a commit message forces it: [skip release], [major], [minor], [patch]
//      (the biggest marker wins if there are several).
//   2. No game files changed (only docs, CI, editor config): no release.
//   3. major: the run save format changed (SAVE_KEY in src/ui/runSave.ts), because
//      saved runs from older versions can't be continued, or a commit says BREAKING CHANGE.
//   4. minor: a new feature-sized change: new source files under src/ or electron/,
//      or at least MINOR_LINES changed lines in game files.
//   5. patch: everything else (fixes, tweaks, balance numbers).
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Changed lines (added + removed) in game files that make a release at least minor. */
export const MINOR_LINES = 400;

/** Paths that change the shipped game. Anything else (docs, CI, tooling) doesn't need a release. */
const GAME_PATHS = [/^src\//, /^electron\//, /^public\//, /^index\.html$/, /^vite\.config\.ts$/, /^package(-lock)?\.json$/];
/** Test files change no shipped behavior on their own. */
const TEST_FILE = /\.(test|sim\.test)\.tsx?$/;

const LEVELS = ['patch', 'minor', 'major'];

export function isGameFile(path) {
  return GAME_PATHS.some((re) => re.test(path)) && !TEST_FILE.test(path);
}

/**
 * @param {object} changes
 * @param {string[]} changes.messages  commit messages since the last release
 * @param {{ path: string, status: string, lines: number }[]} changes.files  changed files
 *        (status A/M/D/R from git; lines = added + removed)
 * @param {boolean} changes.saveFormatChanged  SAVE_KEY differs from the last release
 * @returns {{ release: boolean, bump: 'major' | 'minor' | 'patch' | null, reason: string }}
 */
export function decideBump({ messages, files, saveFormatChanged }) {
  const text = messages.join('\n');
  if (/\[skip release\]/i.test(text)) return { release: false, bump: null, reason: '[skip release] in a commit message' };

  const markers = LEVELS.filter((level) => new RegExp(`\\[${level}\\]`, 'i').test(text));
  if (markers.length > 0) {
    const bump = markers.at(-1);
    return { release: true, bump, reason: `[${bump}] in a commit message` };
  }

  const game = files.filter((f) => isGameFile(f.path));
  if (game.length === 0) return { release: false, bump: null, reason: 'no game files changed' };

  if (saveFormatChanged) return { release: true, bump: 'major', reason: 'the run save format changed (old saves are dropped)' };
  if (/BREAKING CHANGE/.test(text)) return { release: true, bump: 'major', reason: 'BREAKING CHANGE in a commit message' };

  const added = game.filter((f) => f.status.startsWith('A') && /^(src|electron)\//.test(f.path));
  if (added.length > 0) return { release: true, bump: 'minor', reason: `new files: ${added.map((f) => f.path).join(', ')}` };

  const lines = game.reduce((sum, f) => sum + f.lines, 0);
  if (lines >= MINOR_LINES) return { release: true, bump: 'minor', reason: `${lines} changed lines in game files` };

  return { release: true, bump: 'patch', reason: `${lines} changed lines in game files` };
}

/** `1.4.2` + `minor` → `1.5.0`. */
export function nextVersion(version, bump) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) throw new Error(`Not a version: ${version}`);
  const [major, minor, patch] = parts;
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Not a bump: ${bump}`);
}

// ---------- CLI: read the changes from git ----------

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const SAVE_KEY_RE = /SAVE_KEY = '([^']+)'/;
function saveKeyAt(ref) {
  try {
    return git('show', `${ref}:src/ui/runSave.ts`).match(SAVE_KEY_RE)?.[1] ?? null;
  } catch {
    return null;
  }
}

function main() {
  const current = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  let lastTag = '';
  try {
    lastTag = git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*');
  } catch {
    // No release yet.
  }

  let decision;
  let version;
  if (!lastTag) {
    // The first automatic release ships the version already in package.json.
    decision = { release: true, bump: null, reason: 'first release' };
    version = current;
  } else {
    const range = `${lastTag}..HEAD`;
    const messages = git('log', range, '--format=%B%x00').split('\0').filter((m) => m.trim());
    const status = new Map(
      git('diff', '--name-status', '--no-renames', range)
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t'))
        .map(([s, path]) => [path, s]),
    );
    const files = git('diff', '--numstat', '--no-renames', range)
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [add, del, path] = line.split('\t');
        // Binary files show "-": count them as one line.
        const lines = (Number(add) || 0) + (Number(del) || 0) || 1;
        return { path, status: status.get(path) ?? 'M', lines };
      });
    const before = saveKeyAt(lastTag);
    const after = saveKeyAt('HEAD');
    decision = decideBump({ messages, files, saveFormatChanged: before !== null && after !== null && before !== after });
    // The tag is the source of truth: package.json can lag if a release commit didn't land.
    const base = lastTag.replace(/^v/, '');
    version = decision.release ? nextVersion(base, decision.bump) : base;
  }

  const result = { ...decision, lastTag: lastTag || null, version };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `release=${result.release}\nbump=${result.bump ?? ''}\nversion=${result.version}\nreason=${result.reason.replace(/\n/g, ' ')}\n`,
    );
  }
}

if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) main();
