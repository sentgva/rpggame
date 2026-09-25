/**
 * Векторная графика персонажей: SVG собирается кодом (без DOM — работает и в Node для превью).
 * Пространство рисования: фигура по центру x=200, голова сверху (~y 60), стопы внизу (~y 770);
 * итоговый viewBox квадратный (-200 0 800 800) — как прежний пиксельный холст 48×48,
 * поэтому размер персонажей в игре не меняется.
 */
export type P = [number, number];

// ——— цвета ———

type RGB = [number, number, number];

export function rgb(c: string): RGB {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexOf(a: RGB): string {
  return '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return hexOf([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Затемнение со сдвигом в тёплый фиолетовый (как в рисованных тенях). */
export const dark = (c: string, t: number) => mix(c, '#1c0c18', t);
export const light = (c: string, t: number) => mix(c, '#fff8ee', t);

function toLab(c: string): [number, number, number] {
  const [r0, g0, b0] = rgb(c);
  const f = (v: number) => {
    v /= 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  };
  const [r, g, b] = [f(r0), f(g0), f(b0)];
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const X = t((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const Y = t(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const Z = t((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

export function deltaE(a: string, b: string): number {
  const A = toLab(a);
  const B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** Цвет белья/купальника, заметно отличающийся от кожи (ΔE ≥ 45), иначе самый контрастный. */
export function contrastColor(skin: string, cands: string[]): string {
  for (const c of cands) if (deltaE(c, skin) >= 45) return c;
  return cands.reduce((a, b) => (deltaE(b, skin) > deltaE(a, skin) ? b : a));
}

// ——— геометрия ———

export const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
export const pt = (p: P) => `${f1(p[0])} ${f1(p[1])}`;

/** Гладкая кривая через точки (Catmull-Rom → кубические Безье). */
export function smooth(points: P[], closed = false, tension = 1): string {
  const n = points.length;
  if (n < 2) return '';
  const get = (i: number): P => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pt(points[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? d + ' Z' : d;
}

/** Конечность-«трубка» переменной толщины через точки (плечо → локоть → запястье). */
export function limb(points: P[], radii: number[]): string {
  const n = points.length;
  const normals: P[] = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len];
  });
  const left = points.map((p, i): P => [p[0] + normals[i][0] * radii[i], p[1] + normals[i][1] * radii[i]]);
  const right = points.map((p, i): P => [p[0] - normals[i][0] * radii[i], p[1] - normals[i][1] * radii[i]]);
  // скругления на концах
  const end = points[n - 1];
  const dirE = [end[0] - points[n - 2][0], end[1] - points[n - 2][1]];
  const lE = Math.hypot(dirE[0], dirE[1]) || 1;
  const capE: P = [end[0] + (dirE[0] / lE) * radii[n - 1] * 0.9, end[1] + (dirE[1] / lE) * radii[n - 1] * 0.9];
  const st = points[0];
  const dirS = [st[0] - points[1][0], st[1] - points[1][1]];
  const lS = Math.hypot(dirS[0], dirS[1]) || 1;
  const capS: P = [st[0] + (dirS[0] / lS) * radii[0] * 0.8, st[1] + (dirS[1] / lS) * radii[0] * 0.8];
  const ring: P[] = [...left, capE, ...right.reverse(), capS];
  return smooth(ring, true, 0.9);
}

export const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const angleOf = (a: P, b: P) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

// ——— построитель SVG ———

export const LINE = '#2a1418';

export interface ShadeOpts {
  stroke?: string | null;
  sw?: number;
  shade?: string;
  shadeColor?: string;
  shadeOpacity?: number;
  rim?: string;
  rimOpacity?: number;
  opacity?: number;
}

export class Svg {
  private static seq = 0;
  defs: string[] = [];
  out: string[] = [];
  private n = 0;
  private gradCache = new Map<string, string>();
  /** уникальный префикс id: несколько SVG на одной странице не путают градиенты */
  readonly pre = 'v' + (Svg.seq++).toString(36) + '_';

  id(p = 'i') {
    return this.pre + p + (this.n++).toString(36);
  }

  add(s: string) {
    this.out.push(s);
  }

  lin(stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 1, y2 = 1): string {
    const key = 'l' + JSON.stringify(stops) + x1 + y1 + x2 + y2;
    const hit = this.gradCache.get(key);
    if (hit) return hit;
    const id = this.id('g');
    this.defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`,
    );
    const url = `url(#${id})`;
    this.gradCache.set(key, url);
    return url;
  }

  rad(stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy): string {
    const key = 'r' + JSON.stringify(stops) + cx + cy + r + fx + fy;
    const hit = this.gradCache.get(key);
    if (hit) return hit;
    const id = this.id('g');
    this.defs.push(
      `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`,
    );
    const url = `url(#${id})`;
    this.gradCache.set(key, url);
    return url;
  }

  /** Материал: свет сверху-слева, тень снизу-справа. */
  mat(c: string, gloss = 0.16, deep = 0.3): string {
    return this.lin([[0, light(c, gloss)], [0.55, c], [1, dark(c, deep)]], 0, 0, 1, 0.35);
  }

  /** Вертикальный материал (волосы, ткань, падающая вниз). */
  matV(c: string, gloss = 0.14, deep = 0.35): string {
    return this.lin([[0, light(c, gloss)], [0.5, c], [1, dark(c, deep)]], 0, 0, 0.25, 1);
  }

  /** Фигура с мягкой объёмной тенью, обрезанной по контуру, контуром и рефлексом. */
  shape(d: string, fill: string, o: ShadeOpts = {}) {
    let s = `<path d="${d}" fill="${fill}"${o.opacity !== undefined ? ` opacity="${o.opacity}"` : ''}/>`;
    if (o.shade || o.rim) {
      const id = this.id('c');
      this.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
      if (o.shade) s += `<g clip-path="url(#${id})"><path d="${o.shade}" fill="${o.shadeColor ?? '#000'}" filter="url(#soft)" opacity="${o.shadeOpacity ?? 0.85}"/></g>`;
      if (o.rim) s += `<g clip-path="url(#${id})"><path d="${o.rim}" fill="#fff" filter="url(#soft)" opacity="${o.rimOpacity ?? 0.3}"/></g>`;
    }
    if (o.stroke !== null) s += `<path d="${d}" fill="none" stroke="${o.stroke ?? LINE}" stroke-width="${o.sw ?? 1.6}" stroke-linejoin="round"/>`;
    this.add(s);
  }

  line(d: string, stroke: string, w = 1.6, extra = '') {
    this.add(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`);
  }

  /** Группа с трансформацией (оружие, крылья). */
  group(transform: string, fn: () => void, extra = '') {
    this.add(`<g transform="${transform}"${extra ? ' ' + extra : ''}>`);
    fn();
    this.add('</g>');
  }

  toString(viewBox: string, wrap?: { filter?: string }): string {
    const filters = `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter><filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    const body = this.out.join('');
    const inner = wrap?.filter ? `<g filter="url(#${wrap.filter})">${body}</g>` : body;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${filters}${this.defs.join('')}</defs>${inner}</svg>`;
  }
}
