/**
 * Насколько облик отличается от обычного вида героини (доля изменённых пикселей фигуры):
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/skin-diff.ts [порог%]
 * Облики ниже порога почти не видны — их стоит сделать заметнее (другой наряд, аксессуар).
 */
import { HEROINE_MAP, SKINS } from '@idle/shared';
import { CLASS_OUTFIT, renderFigure } from '../src/art/figure';
import { CLASS_BODY, CLASS_WEAPON } from '../src/art/sprite';

const limit = Number(process.argv[2] ?? 12);
const rows: [string, number][] = [];
for (const sk of SKINS) {
  const h = HEROINE_MAP[sk.hero];
  const base = { weapon: CLASS_WEAPON[h.cls], body: CLASS_BODY[h.cls], element: h.element, outfit: CLASS_OUTFIT[h.cls] };
  const a = renderFigure({ ...base, look: h.look });
  const b = renderFigure({ ...base, look: { ...h.look, ...sk.look } });
  let fig = 0;
  let diff = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const on = a.data[i + 3] > 0 || b.data[i + 3] > 0;
    if (!on) continue;
    fig++;
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) diff++;
  }
  rows.push([`${sk.id} (${sk.name.ru}, ${sk.source}${sk.set ? ', ' + sk.set : ''})`, Math.round((diff / fig) * 1000) / 10]);
}
rows.sort((x, y) => x[1] - y[1]);
for (const [id, pct] of rows) if (pct < limit) console.log(`${String(pct).padStart(5)}%  ${id}`);
console.log(`всего обликов: ${rows.length}, ниже ${limit}%: ${rows.filter((r) => r[1] < limit).length}`);
