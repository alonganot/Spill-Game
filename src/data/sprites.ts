import type { CharacterId } from './characters';
import { ENEMIES } from './enemies';

/**
 * Pixel-art sprites drawn in code. Each frame is a list of rows; each char is
 * one pixel, looked up in the palette. `.` is transparent.
 */
export interface SpriteSheet<Frame extends string = string> {
  palette: Readonly<Record<string, string>>;
  frames: Readonly<Record<Frame, readonly string[]>>;
}

export const TRANSPARENT = '.';

export type EnemyFrame = 'idle' | 'blink';
export type HeroFrame = 'idle' | 'cast' | 'hit';
export type EnemyId = keyof typeof ENEMIES;

/** Builds a symmetric frame from left halves: each row is mirrored onto the right. */
function mirror(halves: readonly string[]): string[] {
  return halves.map((half) => half + [...half].reverse().join(''));
}

/** Copy of `rows` with some rows replaced, for frames that differ only slightly. */
function withRows(rows: readonly string[], changes: Readonly<Record<number, string>>): string[] {
  return rows.map((row, i) => changes[i] ?? row);
}

// Enemies are 22×22 (drawn as 11-wide left halves, mirrored).

const SLIME = [
  '...........',
  '...........',
  '...........',
  '...........',
  '...........',
  '.........kk',
  '.......kkbb',
  '......kbbbl',
  '.....kbbbbl',
  '....kbbbbbb',
  '....kbbwwbb',
  '...kbbbwpbb',
  '...kbbbwwbb',
  '..kbbbbbdbb',
  '..kbbbbbbbd',
  '.kbbbbbbbbb',
  '.kbbbbbbbbb',
  '.kdbbbbbbbb',
  'kddbbbbbbbb',
  'kdddddbbbbb',
  '.kkdddddddd',
  '...kkkkkkkk',
];

const THORN = [
  '...........',
  '...........',
  '..........k',
  '.........kt',
  '...k.....kt',
  '...tk...kgg',
  '....tk.kggg',
  '.....kkgggl',
  '.yy..kggggg',
  'kyyyykggwwg',
  'kyyyykggwpg',
  '.kyyykggwwg',
  '..kkkkggggg',
  '....tkggggd',
  '.....kdgggg',
  '.....tkdggg',
  '.......kddd',
  '........kkk',
  '.........kt',
  '..........k',
  '...........',
  '...........',
];

const GOLEM = [
  '...........',
  '...........',
  '......kkkkk',
  '.....kslsss',
  '.....kssrss',
  '.....kseess',
  '.....kssssd',
  '.....kdssss',
  '.kkkk.kkkkk',
  '.kssk.kslss',
  'kslsk.kssss',
  'kssskkksrss',
  'kssrkdsssss',
  'kssskdsssss',
  'kdddkdsssdd',
  '.kkk.kddddd',
  '.....kssk..',
  '.....kssk..',
  '....kdddk..',
  '....kkkkk..',
  '...........',
  '...........',
];

const INK = [
  '...........',
  '........kkk',
  '......kkiii',
  '.....kiilii',
  '....kiiliii',
  '...kiiiiiii',
  '..kiiieeiii',
  '..kiiieeiii',
  '.kiiiiiiiii',
  '.kiiiiiiiii',
  'kiiiikkkkkk',
  'kiiiikwkwkw',
  'kiiiiikkkkk',
  'kiiiiiiiiii',
  'kdiiiiiiiii',
  '.kdiiiiiiii',
  '.kddiiiiiii',
  '..kkddiddii',
  '....kdkkdik',
  '....kk..kdk',
  '.........k.',
  '...........',
];

const BLOT = [
  '....k......',
  '...kik....k',
  '....k...kki',
  '......kkiii',
  '.k...kiiiii',
  'kik.kiilrii',
  '.k.kiiliiii',
  '...kiiiiiii',
  '..kiiieeeii',
  '..kiiieekii',
  '.kiiiiiiiii',
  '.kiibiiiiii',
  'kiiiikkkkkk',
  'kiiiikwkwkw',
  'kiiiikkkkkk',
  'kiiiiiiiiii',
  'kigiiiiiiii',
  '.kiiiiiiiii',
  '..kiiiiiiii',
  '...kkiikiii',
  '..k..kkkkkk',
  '.kik.......',
];

const DRIP = [
  '...........',
  '...........',
  '...........',
  '...........',
  '...........',
  '..........k',
  '.........kb',
  '........kbb',
  '.......kbbl',
  '......kbbbl',
  '.....kbbbbb',
  '....kbbbbbb',
  '....kbbwwbb',
  '...kbbbwpbb',
  '...kbbbwwbb',
  '...kbbbbbbb',
  '...kdbbbbbb',
  '....kdbbbbb',
  '....kddbbbb',
  '.....kkdddd',
  '.......kkkk',
  '...........',
];

const MOLD = [
  '...........',
  '........s..',
  '...s.......',
  '.......kkkk',
  '.....kkgggg',
  '....kgglggg',
  '...kglgggsg',
  '...kgggggss',
  '..kgsgggggg',
  '..kggggwwgg',
  '..kggggwpgg',
  '..kggggwwgg',
  '..kdggggggg',
  '..kdgggkkkk',
  '...kdgggggg',
  '....kddgggg',
  '.....kkdddd',
  '.......kttt',
  '.......kttt',
  '......kdttt',
  '......kkkkk',
  '...........',
];

const CINDER = [
  '..y........',
  '..oy.......',
  '..ok.......',
  '...ok..kkkk',
  '....okkrrrr',
  '.....krrrrr',
  '....krrrrrr',
  '....krrwwrr',
  '....krrwprr',
  '....krrrrrr',
  '....krrkkkk',
  '.....krrrrr',
  '...k..kdrrr',
  '..krk.krrrr',
  '..krrkkrrrr',
  '...kkdkrrrr',
  '......kdrrr',
  '......kdrrr',
  '.......kdk.',
  '.......kkk.',
  '...........',
  '...........',
];

const GNATS = [
  '...........',
  '...........',
  '...ww......',
  '..wwww.....',
  '...kbk.....',
  '..kbebk....',
  '...kbk.....',
  '....k......',
  '.........ww',
  '........www',
  '.........kb',
  '........kbe',
  '........kbb',
  '.ww......kb',
  'wwww......k',
  '.kbk.......',
  'kbebk......',
  '.kbk.......',
  '..k........',
  '...........',
  '...........',
  '...........',
];

const SHELL = [
  '...........',
  '...........',
  '...........',
  '...........',
  '......kkkkk',
  '....kksslss',
  '...ksslllss',
  '..ksslsssds',
  '..kslssdsss',
  '.kssssdssss',
  '.ksdsssssds',
  '.kssdssssds',
  '.kdssssdsss',
  'kkddsssssss',
  'kbkkddddddd',
  'kbbbkkkkkkk',
  'kbwwbbbbbbb',
  'kbwpbbbbbbb',
  '.kbbbbbbbbb',
  '..kkkkkkkkk',
  '...........',
  '...........',
];

const KNIGHT = [
  '..........r',
  '.........rr',
  '........krr',
  '......kkkkk',
  '.....kaalaa',
  '....kaalaaa',
  '....kaaaaaa',
  '....kkkkkkk',
  '....kaeekdk',
  '....kkkkkkk',
  '...kdaaaaaa',
  '..kiiaalaaa',
  '.kiiiaaaaaa',
  'kiiiiaaaaaa',
  'kiiiikaaaaa',
  'kiiiiikdddd',
  '.kiiiiiiiii',
  '.kiiiiiiiii',
  '..kkiiikiii',
  '....kkkkkkk',
  '...........',
  '...........',
];

const SMUDGE = [
  '...e....e..',
  '...ee..eee.',
  '...eeeeeeee',
  '...eereeeer',
  '..kkkkkkkkk',
  '.kmmmmlmmmm',
  'kmmlmmmmmmm',
  'kmlmmeemmmm',
  'kmmmmeekmmm',
  'kmmmmmmmmmm',
  'kmmmkkkkkkk',
  'kmmmkwkwkwk',
  'kmmmmkkkkkk',
  'kdmmmmmmmmm',
  'kdmmmmmmmmm',
  '.kdmmmmmmmm',
  '.kddmmmmmmm',
  '..kdddmmmmm',
  '...kkdddddd',
  '.....kkkkkk',
  '...........',
  '...........',
];

export const ENEMY_SPRITES: Record<EnemyId, SpriteSheet<EnemyFrame>> = {
  puddleSlime: {
    palette: { k: '#13213d', b: '#3e9bfa', l: '#b4dcff', d: '#2559b3', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(SLIME),
      blink: mirror(withRows(SLIME, { 10: '....kbbbbbb', 11: '...kbbkkkbb', 12: '...kbbbbbbb' })),
    },
  },
  thornSprite: {
    palette: { k: '#122a19', g: '#3fb950', l: '#9be6a6', d: '#22793a', t: '#d2b46a', y: '#c7f5cf', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(THORN),
      blink: mirror(withRows(THORN, { 9: 'kyyyykggggg', 10: 'kyyyykgkkgg', 11: '.kyyykggggg' })),
    },
  },
  rustGolem: {
    palette: { k: '#221913', s: '#8a7e72', l: '#bdb2a4', d: '#585048', r: '#c0612b', e: '#f2c94c' },
    frames: {
      idle: mirror(GOLEM),
      blink: mirror(withRows(GOLEM, { 5: '.....kskkss' })),
    },
  },
  inkBlob: {
    palette: { k: '#09070d', i: '#3b2a57', l: '#8466b5', d: '#241933', e: '#e5484d', w: '#ece4f6' },
    frames: {
      idle: mirror(INK),
      blink: mirror(withRows(INK, { 6: '..kiiiiiiii', 7: '..kiiikkiii' })),
    },
  },
  theBlot: {
    palette: {
      k: '#09070d',
      i: '#2d2542',
      l: '#5a4d78',
      e: '#f2c94c',
      w: '#ece4f6',
      r: '#e5484d',
      b: '#3e7bfa',
      g: '#3fb950',
    },
    frames: {
      idle: mirror(BLOT),
      blink: mirror(withRows(BLOT, { 8: '..kiiiiiiii', 9: '..kiiikkkii' })),
    },
  },
  drip: {
    palette: { k: '#1d1030', b: '#9b5de5', l: '#d4b8ff', d: '#6a3aa8', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(DRIP),
      blink: mirror(withRows(DRIP, { 12: '....kbbbbbb', 13: '...kbbbkkbb', 14: '...kbbbbbbb' })),
    },
  },
  moldPuff: {
    palette: { k: '#16210f', g: '#7bbf4a', l: '#c4e89a', d: '#4b7a2a', s: '#d6f24c', t: '#e8dcc0', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(MOLD),
      blink: mirror(withRows(MOLD, { 9: '..kgggggggg', 10: '..kggggkkgg', 11: '..kgggggggg' })),
    },
  },
  cinderImp: {
    palette: { k: '#2a0f08', r: '#e5484d', o: '#f08a24', y: '#f2c94c', d: '#8f2a1c', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(CINDER),
      blink: mirror(withRows(CINDER, { 7: '....krrrrrr', 8: '....krrkkrr' })),
    },
  },
  gnatSwarm: {
    palette: { k: '#141018', b: '#5a5470', w: '#cfe8ff', e: '#e5484d' },
    frames: {
      idle: mirror(GNATS),
      blink: mirror(withRows(GNATS, { 5: '..kbbbk....', 11: '........kbb', 16: 'kbbbk......' })),
    },
  },
  varnishShell: {
    palette: { k: '#24170a', s: '#c98a2e', l: '#f2c94c', d: '#7a4d16', b: '#8fae9c', w: '#ffffff', p: '#14121a' },
    frames: {
      idle: mirror(SHELL),
      blink: mirror(withRows(SHELL, { 16: 'kbbbbbbbbbb', 17: 'kbkkbbbbbbb' })),
    },
  },
  smearKnight: {
    palette: { k: '#0e0d14', a: '#6f7a91', l: '#b5bfd4', d: '#3f4659', i: '#2d2542', r: '#e5484d', e: '#f2c94c' },
    frames: {
      idle: mirror(KNIGHT),
      blink: mirror(withRows(KNIGHT, { 8: '....kaaakdk' })),
    },
  },
  grandSmudge: {
    palette: { k: '#0b0a10', m: '#4a3d6b', l: '#7b68a6', d: '#2c2342', e: '#f2c94c', w: '#ece4f6', r: '#e5484d' },
    frames: {
      idle: mirror(SMUDGE),
      blink: mirror(withRows(SMUDGE, { 7: 'kmlmmmmmmmm', 8: 'kmmmmkkkmmm' })),
    },
  },
};

// The hero is 16×16 and faces right, holding a paintbrush.
const HERO_IDLE = [
  '................',
  '......kkkk......',
  '.....khhhhk.k...',
  '....khhhhhhkk...',
  '....kkkkkkkk....',
  '....kssssssk....',
  '....kspssspk....',
  '....kssssssk....',
  '.....kssssk...y.',
  '....kcccccck..y.',
  '...kclcccccck.t.',
  '...kclcccccckst.',
  '...kcccccccck.t.',
  '....kkkkkkkk..t.',
  '....kck..kck....',
  '....kkk..kkk....',
];

const HERO_CAST = [
  '................',
  '......kkkk......',
  '.....khhhhk.k.y.',
  '....khhhhhhkk.y.',
  '....kkkkkkkk..t.',
  '....kssssssk..t.',
  '....kspssspk..t.',
  '....kssssssk.st.',
  '.....kssssk.kc..',
  '....kcccccckc...',
  '...kclcccccck...',
  '...kclcccccck...',
  '...kcccccccck...',
  '....kkkkkkkk....',
  '....kck..kck....',
  '....kkk..kkk....',
];

export const HERO_SPRITE: SpriteSheet<HeroFrame> = {
  palette: {
    k: '#14121a',
    s: '#f1c7a1',
    h: '#e5484d',
    c: '#3e7bfa',
    l: '#86afff',
    p: '#14121a',
    t: '#a0703c',
    y: '#f2c94c',
  },
  frames: {
    idle: HERO_IDLE,
    cast: HERO_CAST,
    hit: withRows(HERO_IDLE, { 6: '....kskssksk....' }),
  },
};

// Character heroes (Milestone 10): the Apprentice's 16×16 body and pose, with a
// new head, outfit colors, and held item. Row 6 is always the face, at columns 4–11.

/** A hero sheet from its idle and cast frames; the hit frame squints the idle face. */
function heroSheet(palette: Readonly<Record<string, string>>, idle: readonly string[], cast: readonly string[]): SpriteSheet<HeroFrame> {
  const face = idle[6]!;
  return { palette, frames: { idle, cast, hit: withRows(idle, { 6: `${face.slice(0, 4)}kskssksk${face.slice(12)}` }) } };
}

const HERO_BASE_PALETTE = { k: '#14121a', s: '#f1c7a1', p: '#14121a' } as const;

// Warrior: a steel helmet with a red plume, a red tunic, and a sword.
const WARRIOR_SPRITE = heroSheet(
  { ...HERO_BASE_PALETTE, h: '#9aa3b5', c: '#b33a3a', l: '#e5737a', t: '#6b4a2b', b: '#dfe6f0', g: '#f2c94c', r: '#e5484d' },
  withRows(HERO_IDLE, {
    0: '.......rr.......',
    1: '.....kkkkkk.....',
    2: '....khhhhhhk....',
    3: '....khhhhhhk....',
    6: '....kspssspk..b.',
    7: '....kssssssk..b.',
    8: '.....kssssk...b.',
    9: '....kcccccck..b.',
    10: '...kclcccccckggg',
    13: '....kkkkkkkk..g.',
  }),
  withRows(HERO_CAST, {
    0: '.......rr.....b.',
    1: '.....kkkkkk...b.',
    2: '....khhhhhhk..b.',
    3: '....khhhhhhk..b.',
    4: '....kkkkkkkk.ggg',
  }),
);

// Tank: a broad helmet, a bulkier blue body, and a gold-crossed shield in front.
const TANK_SPRITE = heroSheet(
  { ...HERO_BASE_PALETTE, h: '#5b6478', c: '#2f5fd0', l: '#86afff', w: '#c9d2e3', y: '#f2c94c' },
  withRows(HERO_IDLE, {
    1: '.....kkkkkk.....',
    2: '....khhhhhhk....',
    3: '...khhhhhhhhk...',
    4: '...kkkkkkkkkk...',
    8: '.....ksssskkkkkk',
    9: '...kccccccckwywk',
    10: '..kclcccccckyyyk',
    11: '..kclcccccckwywk',
    12: '..kcccccccckwwwk',
    13: '...kkkkkkkk.kwk.',
  }),
  withRows(HERO_IDLE, {
    1: '.....kkkkkk.....',
    2: '....khhhhhhk....',
    3: '...khhhhhhhhk...',
    4: '...kkkkkkkkkk...',
    6: '....kspssspkkkkk',
    7: '....ksssssskwywk',
    8: '.....ksssskkyyyk',
    9: '...kccccccckwywk',
    10: '..kclcccccckwwwk',
    11: '..kclcccccckkwk.',
    12: '..kcccccccck....',
    13: '...kkkkkkkk.....',
  }),
);

// Venom: a pointed green hood, a dark green robe, and a poison-tipped brush.
const VENOM_HEAD = {
  0: '........k.......',
  1: '.......khk......',
  2: '.....khhhhk.....',
  3: '....khhhhhhk....',
  4: '....khkkkkhk....',
};
const VENOM_SPRITE = heroSheet(
  { ...HERO_BASE_PALETTE, h: '#3a8f4a', c: '#2e5d36', l: '#6fcf7a', t: '#4a3a2a', y: '#8be36b' },
  withRows(HERO_IDLE, VENOM_HEAD),
  withRows(HERO_CAST, { ...VENOM_HEAD, 2: '.....khhhhk...y.', 3: '....khhhhhhk..y.', 4: '....khkkkkhk..t.' }),
);

// Demon: bone horns, black hair, red eyes, a crimson coat, and a brush of shadow paint.
const DEMON_HEAD = {
  0: '....n......n....',
  1: '....nnkkkknn....',
  2: '.....khhhhk.....',
};
const DEMON_SPRITE = heroSheet(
  { ...HERO_BASE_PALETTE, s: '#e3a88f', p: '#e5484d', h: '#2a2233', n: '#e8dcc0', c: '#8b1e3f', l: '#c94a6b', t: '#3a2f4a', y: '#9b5de5' },
  withRows(HERO_IDLE, DEMON_HEAD),
  withRows(HERO_CAST, { ...DEMON_HEAD, 2: '.....khhhhk...y.', 3: '....khhhhhhk..y.' }),
);

// Healer: a halo, golden hair, a long white robe, and a glowing brush.
const HEALER_HEAD = {
  0: '.....aaaaaa.....',
  2: '.....khhhhk.....',
  3: '....khhhhhhk....',
};
const HEALER_ROBE = {
  13: '....kcccccck....',
  14: '....kcccccck....',
  15: '....kkkkkkkk....',
};
const HEALER_SPRITE = heroSheet(
  { ...HERO_BASE_PALETTE, a: '#fff3b0', h: '#f2c94c', c: '#e9e6f2', l: '#ffffff', t: '#a0703c', y: '#fff3b0' },
  withRows(HERO_IDLE, { ...HEALER_HEAD, ...HEALER_ROBE, 13: '....kcccccck..t.' }),
  withRows(HERO_CAST, { ...HEALER_HEAD, ...HEALER_ROBE, 2: '.....khhhhk...y.', 3: '....khhhhhhk..y.' }),
);

/** Each character's hero sheet; the Apprentice is the original hero. */
export const HERO_SPRITES: Readonly<Record<CharacterId, SpriteSheet<HeroFrame>>> = {
  apprentice: HERO_SPRITE,
  warrior: WARRIOR_SPRITE,
  tank: TANK_SPRITE,
  venom: VENOM_SPRITE,
  demon: DEMON_SPRITE,
  healer: HEALER_SPRITE,
};

export function enemySprite(enemyId: string): SpriteSheet<EnemyFrame> | undefined {
  return Object.hasOwn(ENEMY_SPRITES, enemyId) ? ENEMY_SPRITES[enemyId as EnemyId] : undefined;
}

// The "Spill" title logo: 7-row letters, one paint color each, with paint
// dripping off a few of them and a dark outline so it reads on any background.

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  L: ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
};

/** Letters with their palette chars, plus drips as [column, length] under the letter. */
const TITLE_LETTERS: readonly { glyph: string; ink: string; drip?: readonly [number, number] }[] = [
  { glyph: 'S', ink: 'r', drip: [2, 1] },
  { glyph: 'P', ink: 'p' },
  { glyph: 'I', ink: 'b', drip: [2, 3] },
  { glyph: 'L', ink: 'c', drip: [2, 1] },
  { glyph: 'L', ink: 'g', drip: [3, 2] },
];

/** Surrounds every inked pixel with a 1px outline of `edge`, growing the frame by 1px each side. */
function outlined(rows: readonly string[], edge: string): string[] {
  const width = (rows[0]?.length ?? 0) + 2;
  const padded = [TRANSPARENT.repeat(width), ...rows.map((r) => `${TRANSPARENT}${r}${TRANSPARENT}`), TRANSPARENT.repeat(width)];
  const inked = (y: number, x: number) => (padded[y]?.[x] ?? TRANSPARENT) !== TRANSPARENT;
  return padded.map((row, y) =>
    [...row]
      .map((char, x) => {
        if (char !== TRANSPARENT) return char;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inked(y + dy, x + dx)) return edge;
        return char;
      })
      .join(''),
  );
}

function titleRows(): string[] {
  const dripRows = Math.max(...TITLE_LETTERS.map((l) => l.drip?.[1] ?? 0));
  const rows = Array.from({ length: 7 + dripRows }, () => '');
  TITLE_LETTERS.forEach(({ glyph, ink, drip }, i) => {
    const shape = GLYPHS[glyph]!;
    const width = shape[0]!.length;
    const gap = i === 0 ? '' : TRANSPARENT;
    rows.forEach((_, y) => {
      const cells =
        y < 7
          ? shape[y]!.replaceAll('#', ink)
          : [...TRANSPARENT.repeat(width)].map((c, x) => (drip && x === drip[0] && y - 7 < drip[1] ? ink : c)).join('');
      rows[y] += gap + cells;
    });
  });
  return outlined(rows, 'k');
}

export const TITLE_SPRITE: SpriteSheet<'logo'> = {
  palette: { k: '#14121a', r: '#e5484d', p: '#9b5de5', b: '#3e7bfa', c: '#22c3d6', g: '#3fb950' },
  frames: { logo: titleRows() },
};
