import { describe, expect, it } from 'vitest';
import { ENEMIES } from './enemies';
import { ENEMY_SPRITES, enemySprite, HERO_SPRITE, TITLE_SPRITE, TRANSPARENT, type SpriteSheet } from './sprites';

const sheets: [string, SpriteSheet][] = [
  ...Object.entries(ENEMY_SPRITES).map(([id, sheet]): [string, SpriteSheet] => [id, sheet]),
  ['hero', HERO_SPRITE],
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

  it('enemy sprites are 22×22', () => {
    for (const sheet of Object.values(ENEMY_SPRITES)) {
      expect(sheet.frames.idle).toHaveLength(22);
      expect(sheet.frames.idle[0]).toHaveLength(22);
    }
  });
});
