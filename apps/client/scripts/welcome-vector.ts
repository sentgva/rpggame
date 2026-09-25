/**
 * Векторная картинка приветствия бота (/start) в SVG:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/welcome-vector.ts welcome.svg
 * Telegram принимает только растр — SVG переводится в public/welcome.png (1040×440) в любом браузере
 * (например, скриншотом Playwright с viewport 1040×440).
 */
import { writeFileSync } from 'node:fs';
import { HEROINE_MAP } from '@idle/shared';
import { CLASS_OUTFIT } from '../src/art/figure';
import { CLASS_WEAPON } from '../src/art/sprite';
import { renderVectorSvg, type VPose } from '../src/art/vector/figure';

const out = process.argv[2] ?? 'welcome.svg';
const W = 1040;
const H = 440;

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const stars = Array.from({ length: 120 }, () => {
  const r = rnd() < 0.2 ? 1.8 : 0.9;
  return `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H * 0.55).toFixed(0)}" r="${r}" fill="#fff0dc" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`;
}).join('');

// кадр фигуры: от макушки до стоп, чтобы героини заняли всю высоту картинки
const FRAME = { x: 40, y: 0, w: 320, h: 790 };
const cast: { id: string; pose: VPose }[] = [
  { id: 'seyra', pose: { arms: 'idle' } },
  { id: 'astrid', pose: { arms: 'idle2' } },
  { id: 'lira', pose: { eyes: 'wink', arms: 'idle' } },
  { id: 'velvet', pose: { arms: 'idle2' } },
  { id: 'mirabel', pose: { arms: 'idle' } },
  { id: 'keira', pose: { arms: 'idle2' } },
];
const figH = 424;
const figW = (figH * FRAME.w) / FRAME.h;
const figures = cast
  .map(({ id, pose }, i) => {
    const h = HEROINE_MAP[id];
    const svg = renderVectorSvg({ look: h.look, weapon: CLASS_WEAPON[h.cls], element: h.element, outfit: CLASS_OUTFIT[h.cls] }, pose, `${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`);
    const x = 18 + i * 168;
    // центральная пара чуть выше — композиция «клином»
    const y = H - figH - 6 + (i === 2 || i === 3 ? -6 : 4);
    return svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg x="${x}" y="${y}" width="${figW.toFixed(0)}" height="${figH}"`);
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160c22"/><stop offset="1" stop-color="#34203e"/></linearGradient>
<radialGradient id="crystal" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#b050e0" stop-opacity="0.75"/><stop offset="0.6" stop-color="#6a2a9a" stop-opacity="0.25"/><stop offset="1" stop-color="#6a2a9a" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3c50"/><stop offset="0.1" stop-color="#2e1c2c"/><stop offset="1" stop-color="#1a0f1a"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<ellipse cx="${W / 2}" cy="${H * 0.55}" rx="${W * 0.46}" ry="${H * 0.62}" fill="url(#crystal)"/>
${stars}
<path d="M0 ${H - 58} C ${W * 0.25} ${H - 70} ${W * 0.75} ${H - 50} ${W} ${H - 62} L ${W} ${H} L 0 ${H} Z" fill="url(#ground)"/>
${figures}
</svg>`;

writeFileSync(out, svg);
console.log('wrote', out, W, H);
