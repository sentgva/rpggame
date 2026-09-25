/** Лист иконок предметов: строки — типы, столбцы — редкость 0…6. npx tsx scripts/items-preview.ts out.png [scale] [tier] */
import { writeFileSync } from 'node:fs';
import { renderItemIcon } from '../src/art/itemArt';
import { encodePng } from './png';
const out = process.argv[2] ?? 'items.png';
const S = Number(process.argv[3] ?? 2);
const tier = Number(process.argv[4] ?? 4);
const kinds: [string, string][] = [
  ['weapon', 'sword'], ['weapon', 'axe'], ['weapon', 'bow'], ['weapon', 'staff'], ['weapon', 'wand'], ['weapon', 'scythe'], ['weapon', 'daggers'], ['weapon', 'lute'],
  ['offhand', 'shield'], ['offhand', 'horn'], ['offhand', 'quiver'], ['offhand', 'orb'], ['offhand', 'tome'], ['offhand', 'grimoire'], ['offhand', 'dagger'], ['offhand', 'songbook'],
  ['helmet', 'heavy'], ['helmet', 'medium'], ['helmet', 'light'], ['armor', 'heavy'], ['armor', 'medium'], ['armor', 'light'],
  ['gloves', 'heavy'], ['gloves', 'medium'], ['gloves', 'light'], ['boots', 'heavy'], ['boots', 'medium'], ['boots', 'light'],
  ['belt', 'belt'], ['cloak', 'cloak'], ['amulet', 'amulet'], ['ring', 'ring'],
];
const cell = 32 * S + 6;
const perRow = 16;
const cols = perRow;
const rows = Math.ceil(kinds.length / perRow) * 2;
const W = cols * cell;
const H = rows * cell;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([42, 30, 34, 255], i * 4);
kinds.forEach(([slot, type], k) => {
  for (const [ri, rarity] of [[0, 1], [1, 4]] as const) {
    const b = renderItemIcon(slot, type, tier, rarity);
    const ox = (k % perRow) * cell + 3;
    const oy = (Math.floor(k / perRow) * 2 + ri) * cell + 3;
    for (let y = 0; y < b.h * S; y++)
      for (let x = 0; x < b.w * S; x++) {
        const si = (Math.floor(y / S) * b.w + Math.floor(x / S)) * 4;
        const a = b.data[si + 3];
        if (!a) continue;
        const di = ((oy + y) * W + ox + x) * 4;
        const f = a / 255;
        for (let q = 0; q < 3; q++) img[di + q] = Math.round(b.data[si + q] * f + img[di + q] * (1 - f));
      }
  }
});
writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out);
