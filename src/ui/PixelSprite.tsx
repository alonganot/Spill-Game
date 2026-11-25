import { memo } from 'react';
import { TRANSPARENT, type SpriteSheet } from '../data/sprites';

interface Run {
  x: number;
  y: number;
  width: number;
  color: string;
}

/** Merges each row's same-colored neighbors into one run, so a frame needs few SVG rects. */
export function toRuns(rows: readonly string[], palette: SpriteSheet['palette']): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === char) end++;
      const color = palette[char];
      if (char !== TRANSPARENT && color) runs.push({ x, y, width: end - x, color });
      x = end;
    }
  });
  return runs;
}

interface PixelSpriteProps<Frame extends string> {
  sprite: SpriteSheet<Frame>;
  frame: Frame;
  /** Largest side in CSS px; the sprite is scaled by a whole number of pixels to fit. */
  size: number;
  label: string;
  className?: string;
}

function PixelSpriteImpl<Frame extends string>({ sprite, frame, size, label, className }: PixelSpriteProps<Frame>) {
  const rows = sprite.frames[frame];
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const scale = Math.max(1, Math.floor(size / Math.max(width, height, 1)));
  return (
    <svg
      className={className ? `sprite ${className}` : 'sprite'}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      {toRuns(rows, sprite.palette).map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={run.color} />
      ))}
    </svg>
  );
}

export const PixelSprite = memo(PixelSpriteImpl) as typeof PixelSpriteImpl;
