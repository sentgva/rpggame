/**
 * Звери 48×48 (сейчас — волк Охотницы): не гуманоид, а собственный силуэт на четырёх лапах.
 * Смотрит вправо, как отряд игрока. Кадр «attack» — выпад с раскрытой пастью.
 */
import { darken, hex, lighten, mix, type RGBA } from './color';
import { Canvas, type Pose } from './figure';
import type { Bitmap } from './sprite';

const W = 48;

function wolfShape(c: Canvas, pose: Pose) {
  const lunge = pose.arms === 'attack';
  const dx = lunge ? 2 : 0;
  const tailUp = pose.arms === 'idle2' ? -1 : 0;
  // хвост — пушистый, чуть приподнят
  c.path(
    [
      [11, 31],
      [7, 27 + tailUp],
      [5, 22 + tailUp],
    ],
    'F',
    '0',
    3,
  );
  c.ellipse(5.5, 23 + tailUp, 2.4, 3.2, 'F');
  c.set(4, 21 + tailUp, 'F', '+');
  // задние лапы
  c.rect(12, 36, 14, 45, 'F', '-');
  c.rect(16, 36, 18, 45, 'F');
  c.hl(11, 14, 46, 'F', '-');
  c.hl(16, 19, 46, 'F');
  // туловище и грудь
  c.ellipse(22 + dx / 2, 32, 12, 6, 'F');
  c.ellipse(31 + dx, 29, 5.5, 6.5, 'F');
  // передние лапы (в выпаде вынесены вперёд)
  c.rect(29 + dx, 35, 31 + dx, 45, 'F', '-');
  c.rect(33 + dx * 1.5, 35, 35 + dx * 1.5, 45, 'F');
  c.hl(29 + dx, 32 + dx, 46, 'F', '-');
  c.hl(33 + dx * 1.5, 36 + dx * 1.5, 46, 'F');
  // голова, уши, морда
  const hx = 36 + dx;
  const hy = lunge ? 24 : 22;
  c.ellipse(hx, hy, 5, 4.5, 'F');
  c.poly(
    [
      [hx - 3, hy - 3],
      [hx - 2, hy - 9],
      [hx, hy - 3],
    ],
    'F',
  );
  c.poly(
    [
      [hx + 1, hy - 3],
      [hx + 3, hy - 9],
      [hx + 4, hy - 2],
    ],
    'F',
  );
  c.set(hx - 2, hy - 5, 'P');
  c.set(hx + 3, hy - 5, 'P');
  c.ellipse(hx + 5.5, hy + 2, 3.2, 1.8, 'F');
  c.rect(hx + 8, hy + 1, hx + 9, hy + 2, 'N');
  if (lunge) {
    // раскрытая пасть с клыками
    c.hl(hx + 3, hx + 8, hy + 4, 'M');
    c.hl(hx + 3, hx + 7, hy + 5, 'F', '-');
    c.set(hx + 7, hy + 4, 'R');
    c.set(hx + 5, hy + 4, 'R');
  }
  // глаз и грива
  c.set(hx + 2, hy - 1, 'E');
  c.set(hx + 2, hy - 2, 'E', '+');
  for (let y = 25; y <= 33; y += 2) c.set(27 + dx, y, 'F', '-');
  // светлое брюхо и тень спины
  c.hl(14, 30, 37, 'F', '+');
  c.hl(15, 29, 26, 'F', '-');
}

function outline(c: Canvas) {
  const src = c.g.slice();
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (src[y * c.w + x]) continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([ax, ay]) => {
        const nx = x + ax;
        const ny = y + ay;
        return nx >= 0 && ny >= 0 && nx < c.w && ny < c.h && src[ny * c.w + nx];
      });
      if (near) c.g[y * c.w + x] = 'X0';
    }
}

/** Волк: мех — цвета «волос» облика, глаза — цвета глаз. */
export function renderWolf(fur: string, eyes: string, pose: Pose = {}, hd = false): Bitmap {
  const c = new Canvas(W, W);
  wolfShape(c, pose);
  outline(c);
  const f = hex(fur);
  const pal: Record<string, Record<string, RGBA>> = {
    F: { '0': f, '+': lighten(f, 0.22), '-': mix(darken(f, 0.22), hex('#6A7A9A'), 0.25), '=': darken(f, 0.45) },
    E: { '0': hex(eyes), '+': lighten(hex(eyes), 0.6) },
    N: { '0': hex('#2A2430') },
    P: { '0': hex('#E8A0B0') },
    M: { '0': hex('#8A2A3A') },
    R: { '0': hex('#FFFFFF') },
    X: { '0': hex('#1A1016') },
  };
  const k = hd ? 2 : 1;
  const out = new Uint8ClampedArray(W * k * W * k * 4);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const v = c.g[y * W + x];
      if (!v) continue;
      const col = pal[v[0]]?.[v[1] || '0'] ?? pal[v[0]]?.['0'];
      if (!col) continue;
      for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) out.set(col, ((y * k + yy) * W * k + x * k + xx) * 4);
    }
  return { w: W * k, h: W * k, data: out };
}
