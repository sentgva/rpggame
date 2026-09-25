/** Пиксельная картинка приветствия бота (/start): npx tsx --tsconfig scripts/tsconfig.json scripts/welcome-banner.ts public/welcome-pixel.png */
import { writeFileSync } from 'node:fs';
import { HEROINE_MAP } from '@idle/shared';
import { CLASS_OUTFIT, renderFigure } from '../src/art/figure';
import { CLASS_WEAPON } from '../src/art/sprite';
import { encodePng } from './png';

const out = process.argv[2] ?? 'public/welcome-pixel.png';
const W = 1040;
const H = 440;
const S = 4;
const img = new Uint8ClampedArray(W * H * 4);

// ночное небо с фиолетовым заревом Кристалла Эфира
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const t = y / H;
    let r = 22 + 30 * t;
    let g = 12 + 14 * t;
    let b = 34 + 36 * t;
    const dx = (x - W / 2) / (W * 0.42);
    const dy = (y - H * 0.55) / (H * 0.6);
    const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    r += 120 * glow * glow;
    g += 40 * glow * glow;
    b += 150 * glow * glow;
    // пиксельная «дизеринг»-ступенька, чтобы градиент выглядел как пиксель-арт
    const q = ((x >> 2) + (y >> 2)) % 2 ? 3 : 0;
    img.set([Math.min(255, r + q), Math.min(255, g + q), Math.min(255, b + q), 255], (y * W + x) * 4);
  }
// звёзды
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = 0; i < 140; i++) {
  const x = Math.floor(rnd() * W);
  const y = Math.floor(rnd() * H * 0.55);
  const big = rnd() < 0.2;
  for (let yy = 0; yy < (big ? 4 : 2); yy++) for (let xx = 0; xx < (big ? 4 : 2); xx++) img.set([255, 240, 220, 255], ((y + yy) * W + x + xx) * 4);
}
// земля
for (let y = H - 64; y < H; y++)
  for (let x = 0; x < W; x++) {
    const edge = y < H - 60;
    img.set(edge ? [90, 60, 80, 255] : [40, 24, 38, 255], (y * W + x) * 4);
  }

const cast = ['seyra', 'astrid', 'lira', 'velvet', 'mirabel', 'keira'];
cast.forEach((id, i) => {
  const h = HEROINE_MAP[id];
  const bmp = renderFigure(
    { look: h.look, weapon: CLASS_WEAPON[h.cls], body: 'robe', element: h.element, outfit: CLASS_OUTFIT[h.cls] },
    { eyes: i === 2 ? 'wink' : 'open', arms: i % 2 ? 'idle2' : 'idle' },
  );
  const ox = 30 + i * 160;
  // центральная пара чуть выше — композиция «клином»
  const oy = H - 48 * S - 30 + (i === 2 || i === 3 ? -6 : 8);
  // тень
  for (let yy = -6; yy <= 6; yy++)
    for (let xx = -70; xx <= 70; xx++) {
      if ((xx * xx) / 4900 + (yy * yy) / 36 > 1) continue;
      const px = ox + 96 + xx;
      const py = oy + 48 * S - 8 + yy;
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      const k = (py * W + px) * 4;
      img[k] *= 0.55;
      img[k + 1] *= 0.55;
      img[k + 2] *= 0.55;
    }
  for (let y = 0; y < bmp.h * S; y++)
    for (let x = 0; x < bmp.w * S; x++) {
      const si = (Math.floor(y / S) * bmp.w + Math.floor(x / S)) * 4;
      if (bmp.data[si + 3] === 0) continue;
      const px = ox + x;
      const py = oy + y;
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      img.set(bmp.data.subarray(si, si + 4), (py * W + px) * 4);
    }
});

writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out, W, H);
