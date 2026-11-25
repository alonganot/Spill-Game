import type { Color } from '../engine';
import type { SpriteSheet } from '../data/sprites';
import { COLOR_HEX } from './fx';
import { PixelSprite } from './PixelSprite';

// A 12×13 drop of paint: dark outline, a highlight down its left side, and
// a shaded bottom right. The same drop as on the dice faces, drawn bigger.
export const DROP_ROWS = [
  '.....kk.....',
  '....kcck....',
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

/** The drop's colors: outline (k), paint (c), highlight (h), and shade (d). Shared with the dice faces. */
export function dropPalette(color: Color): Record<'k' | 'c' | 'h' | 'd', string> {
  const base = COLOR_HEX[color];
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
};

/** A pixel paint drop in a color. `size` is the largest side in CSS px (13px art, whole-pixel scaling). */
export function PaintDrop({ color, size = 39, label = '' }: { color: Color; size?: number; label?: string }) {
  return <PixelSprite sprite={DROP_SHEETS[color]} frame="drop" size={size} label={label} className="paint-drop" />;
}
