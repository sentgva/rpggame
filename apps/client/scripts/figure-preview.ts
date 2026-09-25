/** Превью героинь/врагов нового генератора: npx tsx scripts/figure-preview.ts out.png [heroines|enemies] [scale] [ids] */
import { writeFileSync } from 'node:fs';
import { ENEMIES, HEROINES } from '@idle/shared';
import { CLASS_OUTFIT, renderFigure } from '../src/art/figure';
import { CLASS_WEAPON, ROLE_CLASS, type Bitmap } from '../src/art/sprite';
import { encodePng } from './png';

const out = process.argv[2] ?? 'figures.png';
const which = process.argv[3] ?? 'heroines';
const SCALE = Number(process.argv[4] ?? 3);
const only = process.argv[5]?.split(',');
const sprites: Bitmap[] = [];
if (which === 'heroines') {
  for (const h of HEROINES) {
    if (only && !only.includes(h.id)) continue;
    sprites.push(renderFigure({ look: h.look, weapon: CLASS_WEAPON[h.cls], body: 'robe', element: h.element, outfit: CLASS_OUTFIT[h.cls] }));
  }
} else {
  for (const e of ENEMIES) {
    const cls = ROLE_CLASS[e.role];
    sprites.push(renderFigure({ look: e.look, weapon: CLASS_WEAPON[cls], body: 'robe', element: e.element, outfit: CLASS_OUTFIT[cls] }));
  }
}
const cols = Math.min(8, sprites.length);
const cell = 48 * SCALE + 6;
const rows = Math.ceil(sprites.length / cols);
const W = cols * cell;
const H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([46, 34, 38, 255], i * 4);
sprites.forEach((b, i) => {
  const ox = (i % cols) * cell + 3;
  const oy = Math.floor(i / cols) * cell + 3;
  for (let y = 0; y < b.h * SCALE; y++)
    for (let x = 0; x < b.w * SCALE; x++) {
      const si = (Math.floor(y / SCALE) * b.w + Math.floor(x / SCALE)) * 4;
      if (b.data[si + 3] === 0) continue;
      img.set(b.data.subarray(si, si + 4), ((oy + y) * W + ox + x) * 4);
    }
});
writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out, W, H);
