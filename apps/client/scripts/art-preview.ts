import { writeFileSync } from 'node:fs';
import { ENEMIES, HEROINES, ROLE_STATS } from '@idle/shared';
import { CLASS_BODY, CLASS_WEAPON, ROLE_CLASS, renderSprite, type Bitmap } from '../src/art/sprite';
import { encodePng } from './png';

const out = process.argv[2] ?? 'preview.png';
const which = process.argv[3] ?? 'heroines';
const SCALE = 3;
const sprites: Bitmap[] = [];
if (which === 'heroines') {
  for (const h of HEROINES) sprites.push(renderSprite({ look: h.look, weapon: CLASS_WEAPON[h.cls], body: CLASS_BODY[h.cls], element: h.element }));
} else {
  for (const e of ENEMIES) {
    const cls = ROLE_CLASS[e.role];
    void ROLE_STATS;
    sprites.push(renderSprite({ look: e.look, weapon: CLASS_WEAPON[cls], body: CLASS_BODY[cls], element: e.element }));
  }
}
const cols = 10;
const cell = 32 * SCALE + 8;
const rows = Math.ceil(sprites.length / cols);
const W = cols * cell;
const H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([42, 30, 34, 255], i * 4);
sprites.forEach((b, i) => {
  const ox = (i % cols) * cell + 4;
  const oy = Math.floor(i / cols) * cell + 4;
  for (let y = 0; y < b.h * SCALE; y++)
    for (let x = 0; x < b.w * SCALE; x++) {
      const si = (Math.floor(y / SCALE) * b.w + Math.floor(x / SCALE)) * 4;
      if (b.data[si + 3] === 0) continue;
      img.set(b.data.subarray(si, si + 4), ((oy + y) * W + ox + x) * 4);
    }
});
writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out, W, H);
