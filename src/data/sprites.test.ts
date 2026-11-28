import { describe, expect, it } from 'vitest';
import { ENEMIES } from './enemies';
import { CHARACTER_ORDER } from './characters';
import { ENEMY_SPRITES, enemySprite, HERO_SPRITE, HERO_SPRITES, TITLE_SPRITE, TRANSPARENT, type SpriteSheet } from './sprites';

const sheets: [string, SpriteSheet][] = [
  ...Object.entries(ENEMY_SPRITES).map(([id, sheet]): [string, SpriteSheet] => [id, sheet]),
  ['hero', HERO_SPRITE],
  ...Object.entries(HERO_SPRITES).map(([id, sheet]): [string, SpriteSheet] => [`hero:${id}`, sheet]),
  ['title', TITLE_SPRITE],
];

describe('sprites', () => {
  it('has a sprite for every enemy', () => {
    for (const id of Object.keys(ENEMIES)) expect(enemySprite(id), id).toBeDefined();
    expect(enemySprite('nobody')).toBeUndefined();
    expect(enemySprite('toString')).toBeUndefined();
  });

  it.each(sheets)('%s: every frame is a rectangle of the same size', (_, sheet) => {
    const frames = Object.values(sheet.frames);
    const [first] = frames;
    expect(first).toBeDefined();
    const height = first!.length;
    const width = first![0]!.length;
    expect(width).toBeGreaterThan(0);
    for (const rows of frames) {
      expect(rows).toHaveLength(height);
      for (const row of rows) expect(row).toHaveLength(width);
    }
  });

  it.each(sheets)('%s: every pixel char is in the palette', (_, sheet) => {
    for (const [name, rows] of Object.entries(sheet.frames)) {
      for (const char of rows.join('')) {
        if (char !== TRANSPARENT) expect(sheet.palette[char], `${name}: '${char}'`).toBeDefined();
      }
    }
  });

  it('every character has a 16×16 hero sprite, and the Apprentice is the original hero', () => {
    expect(HERO_SPRITES.apprentice).toBe(HERO_SPRITE);
    for (const id of CHARACTER_ORDER) {
      const sheet = HERO_SPRITES[id];
      expect(sheet.frames.idle, id).toHaveLength(16);
      expect(sheet.frames.idle[0], id).toHaveLength(16);
    }
    // The new heroes look different from each other and from the Apprentice.
    const looks = new Set(CHARACTER_ORDER.map((id) => JSON.stringify([HERO_SPRITES[id].frames.idle, HERO_SPRITES[id].palette])));
    expect(looks.size).toBe(CHARACTER_ORDER.length);
  });

  it('enemy sprites are 22×22', () => {
    for (const sheet of Object.values(ENEMY_SPRITES)) {
      expect(sheet.frames.idle).toHaveLength(22);
      expect(sheet.frames.idle[0]).toHaveLength(22);
    }
  });
});
