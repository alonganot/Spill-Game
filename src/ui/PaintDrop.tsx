import type { Color } from '../engine';
import type { SpriteSheet } from '../data/sprites';
import { BLACK_RIM, COLOR_HEX } from './fx';
import { PixelSprite } from './PixelSprite';

// A 12×12 drop of paint: dark outline, a highlight down its left side, and
// a shaded bottom right. The only drop in the game: pool chips, slots, previews,
// and dice faces (where it leaves a row of face above and below it) all use it.
export const DROP_ROWS = [
  '.....kk.....',
  '....kcck....',
  '...kchcck...',
  '...khccck...',
  '..khccccck..',
  '..khccccck..',
  '.khccccccck.',
  '.khccccccck.',
  '.kcccccccdk.',
  '.kccccccddk.',
  '..kccccddk..',
  '...kkkkkk...',
];

/** Mixes a #rrggbb color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const channel = (i: number) => {
    const value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(value + (target - value) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** Gold paint's shine (`--paint-gold-shine`). */
const GOLD_SHINE = '#fff1a8';

/** The drop's colors: outline (k), paint (c), highlight (h), and shade (d). Shared with the dice faces. */
export function dropPalette(color: Color): Record<'k' | 'c' | 'h' | 'd', string> {
  const base = COLOR_HEX[color];
  // Black paint gets a light rim (and a stronger highlight) so it reads on the dark background.
  if (color === 'black') return { k: BLACK_RIM, c: base, h: shade(base, 0.35), d: '#120e1a' };
  // Gold paint is metallic: a near-white shine and a deep bronze shade, so it reads apart from Orange.
  if (color === 'gold') return { k: '#14121a', c: base, h: GOLD_SHINE, d: shade(base, -0.45) };
  return { k: '#14121a', c: base, h: shade(base, 0.45), d: shade(base, -0.3) };
}

function dropSheet(color: Color): SpriteSheet<'drop'> {
  return { palette: dropPalette(color), frames: { drop: DROP_ROWS } };
}

// Built once so the memoized sprite sees a stable sheet per color.
const DROP_SHEETS: Record<Color, SpriteSheet<'drop'>> = {
  red: dropSheet('red'),
  blue: dropSheet('blue'),
  green: dropSheet('green'),
  purple: dropSheet('purple'),
  cyan: dropSheet('cyan'),
  orange: dropSheet('orange'),
  white: dropSheet('white'),
  black: dropSheet('black'),
  gold: dropSheet('gold'),
  pink: dropSheet('pink'),
  grey: dropSheet('grey'),
  crimson: dropSheet('crimson'),
  blight: dropSheet('blight'),
  frost: dropSheet('frost'),
};

/** A pixel paint drop in a color. `size` is the largest side in CSS px (12px art, whole-pixel scaling). */
export function PaintDrop({ color, size = 39, label = '' }: { color: Color; size?: number; label?: string }) {
  return <PixelSprite sprite={DROP_SHEETS[color]} frame="drop" size={size} label={label} className="paint-drop" />;
}
