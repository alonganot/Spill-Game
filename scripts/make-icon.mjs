// Draws the app icon (electron/icon.png, 256×256) from the hero's idle sprite.
// Run with `npm run icon` after changing HERO_SPRITE; the PNG is committed.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const SIZE = 256;
const BACKGROUND = [0x14, 0x12, 0x1a, 255];
const BORDER = [0x3e, 0x7b, 0xfa, 255];

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true } });
const { HERO_SPRITE, TRANSPARENT } = await server.ssrLoadModule('/src/data/sprites.ts');
await server.close();

const rows = HERO_SPRITE.frames.idle;
const height = rows.length;
const width = rows[0].length;
const scale = Math.floor((SIZE - 32) / Math.max(width, height));
const offsetX = Math.floor((SIZE - width * scale) / 2);
const offsetY = Math.floor((SIZE - height * scale) / 2);

const hex = (color) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)).concat(255);
const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const edge = x < 8 || y < 8 || x >= SIZE - 8 || y >= SIZE - 8;
    let rgba = edge ? BORDER : BACKGROUND;
    const sx = Math.floor((x - offsetX) / scale);
    const sy = Math.floor((y - offsetY) / scale);
    const char = x >= offsetX && y >= offsetY ? rows[sy]?.[sx] : undefined;
    if (char && char !== TRANSPARENT && HERO_SPRITE.palette[char]) rgba = hex(HERO_SPRITE.palette[char]);
    pixels.set(rgba, (y * SIZE + x) * 4);
  }
}

// Minimal PNG encoder: 8-bit RGBA, no filtering.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header.set([8, 6, 0, 0, 0], 8);
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = fileURLToPath(new URL('../electron/icon.png', import.meta.url));
writeFileSync(out, png);
console.log(`Wrote ${out} (${width}×${height} sprite at ${scale}×)`);
