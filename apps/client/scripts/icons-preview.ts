/** Лист всех иконок: npx tsx scripts/icons-preview.ts out.png [scale] */
import { writeFileSync } from 'node:fs';
import { ICON_NAMES, renderIcon } from '../src/art/icons';
import { encodePng } from './png';
const out = process.argv[2] ?? 'icons.png';
const S = Number(process.argv[3] ?? 2);
const bmps = ICON_NAMES.map((n) => renderIcon(n));
const size = bmps[0].w;
const cell = size * S + 8;
const cols = 12;
const rows = Math.ceil(bmps.length / cols);
const W = cols * cell;
const H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([42, 30, 34, 255], i * 4);
bmps.forEach((b, i) => {
  const ox = (i % cols) * cell + 4;
  const oy = Math.floor(i / cols) * cell + 4;
  for (let y = 0; y < b.h * S; y++)
    for (let x = 0; x < b.w * S; x++) {
      const si = (Math.floor(y / S) * b.w + Math.floor(x / S)) * 4;
      if (b.data[si + 3]) img.set(b.data.subarray(si, si + 4), ((oy + y) * W + ox + x) * 4);
    }
});
writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out);
