import { writeFileSync } from 'node:fs';
import { ICON_NAMES, renderIcon } from '../src/art/icons';
import { encodePng } from './png';
const out = process.argv[2] ?? 'icons.png';
const S = 3, cell = 16 * S + 8, cols = 12;
const rows = Math.ceil(ICON_NAMES.length / cols);
const W = cols * cell, H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([42, 30, 34, 255], i * 4);
ICON_NAMES.forEach((n, i) => {
  const b = renderIcon(n);
  const ox = (i % cols) * cell + 4, oy = Math.floor(i / cols) * cell + 4;
  for (let y = 0; y < 16 * S; y++) for (let x = 0; x < 16 * S; x++) {
    const si = (Math.floor(y / S) * 16 + Math.floor(x / S)) * 4;
    if (b.data[si + 3]) img.set(b.data.subarray(si, si + 4), ((oy + y) * W + ox + x) * 4);
  }
});
writeFileSync(out, encodePng(W, H, img));
console.log(ICON_NAMES.join(' '));
