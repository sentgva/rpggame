/**
 * Лист обликов крупно: npx tsx --tsconfig scripts/tsconfig.json scripts/skin-sheet.ts out.png [classic|hd] [масштаб] [id,…] [глаза:руки]
 * id — облик (`lira_spark`) или герой (`lira`); облики рисуются без оружия в позе «руки опущены».
 */
import { writeFileSync } from 'node:fs';
import { HEROINES, HEROINE_MAP, SKIN_MAP } from '@idle/shared';
import { CLASS_OUTFIT, renderFigure, renderFigureHD, type Pose } from '../src/art/figure';
import { CLASS_WEAPON, type Bitmap } from '../src/art/sprite';
import { encodePng } from './png';

const [out = 'skins.png', mode = 'classic', sc = '6', list, poseStr] = process.argv.slice(2);
const SCALE = Number(sc);
const [eyes, arms] = (poseStr ?? 'open:').split(':') as [Pose['eyes'], Pose['arms']];
const ids = (list ?? HEROINES.map((h) => h.id).join(',')).split(',');
const sprites: Bitmap[] = ids.map((it) => {
  const skin = SKIN_MAP[it] ? it : undefined;
  const h = HEROINE_MAP[skin ? SKIN_MAP[it].hero : it];
  const look = skin ? { ...h.look, ...SKIN_MAP[skin].look } : h.look;
  const spec = { look, weapon: skin ? ('none' as const) : CLASS_WEAPON[h.cls], body: 'robe' as const, element: h.element, outfit: CLASS_OUTFIT[h.cls] };
  const pose: Pose = { eyes, arms: arms || (skin ? 'relaxed' : 'idle') };
  return mode === 'hd' ? renderFigureHD(spec, pose) : renderFigure(spec, pose);
});
const cols = Math.min(8, sprites.length);
const cw = sprites[0].w * SCALE + 6;
const rows = Math.ceil(sprites.length / cols);
const W = cols * cw;
const H = rows * cw;
const img = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([46, 34, 38, 255], i * 4);
sprites.forEach((b, i) => {
  const ox = (i % cols) * cw + 3;
  const oy = Math.floor(i / cols) * cw + 3;
  for (let y = 0; y < b.h * SCALE; y++)
    for (let x = 0; x < b.w * SCALE; x++) {
      const si = (Math.floor(y / SCALE) * b.w + Math.floor(x / SCALE)) * 4;
      if (b.data[si + 3] === 0) continue;
      img.set(b.data.subarray(si, si + 4), ((oy + y) * W + ox + x) * 4);
    }
});
writeFileSync(out, encodePng(W, H, img));
console.log('wrote', out, W, H);
