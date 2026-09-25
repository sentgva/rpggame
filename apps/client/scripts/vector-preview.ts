/** Лист векторных персонажей (HTML): npx tsx --tsconfig scripts/tsconfig.json scripts/vector-preview.ts out.html [heroines|enemies|summer|lingerie] [px] [ids] [poses] */
import { writeFileSync } from 'node:fs';
import { ENEMIES, HEROINES, HEROINE_MAP, SKINS } from '@idle/shared';
import { CLASS_OUTFIT } from '../src/art/figure';
import { CLASS_WEAPON, ROLE_CLASS } from '../src/art/sprite';
import { renderVectorSvg, type VPose, type VSpec } from '../src/art/vector/figure';

const out = process.argv[2] ?? 'vector.html';
const which = process.argv[3] ?? 'heroines';
const px = Number(process.argv[4] ?? 160);
const only = process.argv[5] && process.argv[5] !== '-' ? process.argv[5].split(',') : null;
const poses: VPose[] = (process.argv[6] ?? 'open:idle').split(',').map((s) => {
  const [eyes, arms, flap] = s.split(':');
  return { eyes: eyes as VPose['eyes'], arms: arms as VPose['arms'], flap: flap === 'flap' };
});
const specs: { name: string; spec: VSpec }[] = [];
if (which === 'enemies') {
  for (const e of ENEMIES) {
    if (only && !only.includes(e.id)) continue;
    const cls = ROLE_CLASS[e.role];
    specs.push({ name: e.id, spec: { look: e.look, weapon: CLASS_WEAPON[cls], element: e.element, outfit: CLASS_OUTFIT[cls] } });
  }
} else if (which === 'summer' || which === 'lingerie') {
  for (const sk of SKINS) {
    if (sk.set !== which) continue;
    const h = HEROINE_MAP[sk.hero];
    specs.push({ name: sk.id, spec: { look: { ...h.look, ...sk.look }, weapon: CLASS_WEAPON[h.cls], element: h.element, outfit: CLASS_OUTFIT[h.cls] } });
  }
} else {
  for (const h of HEROINES) {
    if (only && !only.includes(h.id)) continue;
    specs.push({ name: h.id, spec: { look: h.look, weapon: CLASS_WEAPON[h.cls], element: h.element, outfit: CLASS_OUTFIT[h.cls] } });
  }
}
const cells = specs.flatMap(({ name, spec }) => poses.map((pose) => `<div class="c"><div class="im">${renderVectorSvg(spec, pose)}</div><div class="n">${name}</div></div>`));
writeFileSync(
  out,
  `<!doctype html><html><head><style>body{margin:0;background:#2a1e24;display:flex;flex-wrap:wrap;gap:4px;padding:6px;font:11px sans-serif;color:#d8c8c0}.c{width:${px}px;text-align:center}.im svg{width:${px}px;height:${px}px;display:block}.n{margin-top:-4px}</style></head><body>${cells.join('')}</body></html>`,
);
console.log('cells', cells.length);
