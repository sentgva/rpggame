/**
 * Героини и враги-гуманоиды 48×48: взрослые пропорции (≈4 головы), детальное лицо,
 * волосы и одежда с трёхтоновой светотенью, уверенная поза с перенесённым весом.
 *
 * Рисуем «материалами»: каждый пиксель — материал + тон ('S0' — кожа, база; 'S-' — тень;
 * 'S+' — блик; 'S=' — глубокая тень). После рисования проход автосветотени добавляет
 * объём (свет сверху-слева), затем контур. Цвета материалов берутся из Look.
 */
import type { Element, Look } from '@idle/shared';
import { ELEMENT_COLORS } from '@idle/shared';
import { darken, hex, lighten, mix, type RGBA } from './color';
import type { Bitmap, SpriteSpec } from './sprite';

export const FIG = 48;

/** Наряд по классу героини (враги берут класс по роли). */
export type OutfitKind = 'knight' | 'barbarian' | 'ranger' | 'witch' | 'cleric' | 'reaper' | 'rogue' | 'minstrel';

export const CLASS_OUTFIT: Record<string, OutfitKind> = {
  guardian: 'knight',
  berserker: 'barbarian',
  archer: 'ranger',
  sorceress: 'witch',
  priestess: 'cleric',
  necromancer: 'reaper',
  assassin: 'rogue',
  bard: 'minstrel',
};

export type Tone = '0' | '+' | '-' | '=';

export class Canvas {
  g: string[];
  constructor(
    public w: number,
    public h: number,
  ) {
    this.g = new Array(w * h).fill('');
  }
  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, m: string, t: Tone = '0') {
    if (!this.in(x, y)) return;
    this.g[y * this.w + x] = m.length === 1 ? m + t : m;
  }
  get(x: number, y: number): string {
    return this.in(x, y) ? this.g[y * this.w + x] : '';
  }
  mat(x: number, y: number): string {
    return this.get(x, y).charAt(0);
  }
  clear(x: number, y: number) {
    if (this.in(x, y)) this.g[y * this.w + x] = '';
  }
  hl(x0: number, x1: number, y: number, m: string, t: Tone = '0') {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, m, t);
  }
  vl(x: number, y0: number, y1: number, m: string, t: Tone = '0') {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, m, t);
  }
  rect(x0: number, y0: number, x1: number, y1: number, m: string, t: Tone = '0') {
    for (let y = y0; y <= y1; y++) this.hl(x0, x1, y, m, t);
  }
  /** Ряды [y, x0, x1] — удобно описывать силуэты. */
  rows(list: [number, number, number][], m: string, t: Tone = '0') {
    for (const [y, x0, x1] of list) this.hl(x0, x1, y, m, t);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, m: string, t: Tone = '0') {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) this.set(x, y, m, t);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, m: string, t: Tone = '0', w = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= steps; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / steps);
      const y = Math.round(y0 + ((y1 - y0) * k) / steps);
      for (let d = 0; d < w; d++) this.set(x + d, y, m, t);
    }
  }
  path(pts: [number, number][], m: string, t: Tone = '0', w = 1) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, t, w);
  }
  /** Заливка многоугольника (чётно-нечётное правило). */
  poly(pts: [number, number][], m: string, t: Tone = '0') {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if (y0 === y1) continue;
        const yy = y + 0.5;
        if ((yy >= y0 && yy < y1) || (yy >= y1 && yy < y0)) xs.push(x0 + ((yy - y0) * (x1 - x0)) / (y1 - y0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]) - 1; x++) this.set(x, y, m, t);
    }
  }
  /** Перекрасить тон у всех пикселей материала m внутри прямоугольника. */
  tone(x0: number, y0: number, x1: number, y1: number, m: string, t: Tone) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.mat(x, y) === m) this.set(x, y, m, t);
  }
}

// ——— тело ———

/** Геометрия рук: левая (от зрителя) упёрта в бедро, правая держит оружие. */
export const ARM_L = { shoulder: [16, 22] as [number, number], elbow: [12, 27] as [number, number], hand: [17, 31] as [number, number] };
export const ARM_R = { shoulder: [31, 22] as [number, number], elbow: [34, 27] as [number, number], hand: [35, 30] as [number, number] };

/** Толстый сегмент (для рук и рукавов). */
function limb(c: Canvas, a: [number, number], b: [number, number], m: string, t: Tone = '0', w = 3) {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let k = 0; k <= steps; k++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * k) / steps);
    const y = Math.round(a[1] + ((b[1] - a[1]) * k) / steps);
    for (let dx = 0; dx < w; dx++) c.set(x + dx - Math.floor(w / 2), y, m, t);
  }
}

/** Рукав/перчатка на участке руки. */
export function armPart(c: Canvas, side: 'L' | 'R', part: 'upper' | 'fore' | 'hand', m: string, t: Tone = '0') {
  const A = side === 'L' ? ARM_L : ARM_R;
  if (part === 'upper') limb(c, A.shoulder, A.elbow, m, t);
  else if (part === 'fore') limb(c, A.elbow, A.hand, m, t);
  else c.rect(A.hand[0] - 1, A.hand[1] - 1, A.hand[0] + 1, A.hand[1], m, t);
}

/** Базовая фигура: голова, шея, торс, руки, ноги (всё кожей; одежда рисуется поверх). */
function drawBody(c: Canvas, legs: boolean) {
  // лицо: круглее и мягче
  c.rows(
    [
      [6, 19, 28],
      [7, 18, 29],
      [8, 17, 30],
      [9, 17, 30],
      [10, 17, 30],
      [11, 17, 30],
      [12, 17, 30],
      [13, 17, 30],
      [14, 18, 29],
      [15, 18, 29],
      [16, 19, 28],
      [17, 20, 27],
      [18, 22, 25],
    ],
    'S',
  );
  // шея
  c.rect(22, 18, 25, 20, 'S');
  c.hl(22, 25, 19, 'S', '-');
  // руки — под торсом, чтобы плечо перекрывало сустав
  for (const A of [ARM_L, ARM_R]) {
    limb(c, A.shoulder, A.elbow, 'S');
    limb(c, A.elbow, A.hand, 'S');
    c.rect(A.hand[0] - 1, A.hand[1] - 1, A.hand[0] + 1, A.hand[1], 'S');
  }
  // плечи, грудь, узкая талия, бёдра (со смещением таза — поза с опорой на ногу)
  c.rows(
    [
      [20, 20, 27],
      [21, 18, 29],
      [22, 17, 30],
      [23, 17, 30],
      [24, 17, 30],
      [25, 18, 29],
      [26, 19, 28],
      [27, 20, 27],
      [28, 20, 27],
      [29, 20, 28],
      [30, 19, 29],
      [31, 18, 30],
      [32, 18, 30],
      [33, 18, 30],
      [34, 19, 30],
    ],
    'S',
  );
  // объём груди, ключицы, пупок
  c.hl(19, 22, 25, 'S', '-');
  c.hl(25, 28, 25, 'S', '-');
  c.set(24, 23, 'S', '-');
  c.set(23, 24, 'S', '=');
  c.set(24, 24, 'S', '=');
  c.set(19, 22, 'S', '+');
  c.set(26, 22, 'S', '+');
  c.set(21, 21, 'S', '-');
  c.set(26, 21, 'S', '-');
  c.set(24, 30, 'S', '-');
  if (!legs) return;
  // ноги: правая (от зрителя) — опорная, левая отставлена в сторону
  c.rows(
    [
      [35, 19, 23],
      [36, 19, 23],
      [37, 18, 22],
      [38, 18, 22],
      [39, 18, 21],
      [40, 17, 21],
      [41, 17, 20],
      [42, 17, 20],
      [43, 16, 19],
      [44, 16, 19],
      [45, 15, 19],
      [46, 14, 19],
    ],
    'S',
  );
  c.rows(
    [
      [35, 25, 30],
      [36, 25, 29],
      [37, 25, 29],
      [38, 25, 28],
      [39, 25, 28],
      [40, 26, 28],
      [41, 26, 28],
      [42, 26, 28],
      [43, 26, 28],
      [44, 26, 28],
      [45, 26, 29],
      [46, 26, 30],
    ],
    'S',
  );
  c.vl(23, 35, 36, 'S', '-');
  c.vl(25, 35, 36, 'S', '-');
}

// ——— лицо ———

function drawFace(c: Canvas) {
  // крупные глаза 3×4: ресницы, тёмный верх радужки, два блика
  for (const [x0, flip] of [
    [19, false],
    [26, true],
  ] as [number, boolean][]) {
    const outer = flip ? x0 + 2 : x0;
    const inner = flip ? x0 : x0 + 2;
    c.hl(x0, x0 + 2, 11, 'l');
    c.set(flip ? x0 + 3 : x0 - 1, 12, 'l');
    c.set(outer, 12, 'E', '=');
    c.set(x0 + 1, 12, 'E', '-');
    c.set(inner, 12, 'E', '+');
    c.hl(x0, x0 + 2, 13, 'E', '0');
    c.set(inner, 13, 'E', '-');
    c.set(outer, 14, 'E', '+');
    c.set(x0 + 1, 14, 'E', '0');
    c.set(inner, 14, 'E', '-');
  }
  // брови
  c.hl(19, 21, 9, 'H', '-');
  c.hl(26, 28, 9, 'H', '-');
  // румянец, нос, губы
  c.hl(18, 19, 15, 'P');
  c.hl(28, 29, 15, 'P');
  c.set(24, 15, 'S', '-');
  c.set(23, 17, 'M');
  c.set(24, 17, 'M', '+');
}

// ——— волосы ———

function hairTop(c: Canvas) {
  // макушка
  c.rows(
    [
      [2, 20, 27],
      [3, 18, 29],
      [4, 17, 30],
      [5, 16, 31],
      [6, 16, 31],
      [7, 16, 31],
      [8, 16, 31],
    ],
    'H',
  );
  // чёлка: пряди до бровей с острыми кончиками
  c.rows(
    [
      [9, 16, 18],
      [9, 20, 22],
      [9, 24, 25],
      [9, 27, 31],
      [10, 16, 17],
      [10, 21, 22],
      [10, 29, 31],
      [11, 16, 16],
      [11, 31, 31],
    ],
    'H',
  );
  c.set(19, 9, 'H', '-');
  c.set(23, 9, 'H', '-');
  c.set(26, 9, 'H', '-');
  c.set(24, 8, 'H', '-');
  c.set(20, 8, 'H', '-');
  // «ангельское кольцо» — блик на волосах
  for (let x = 19; x <= 28; x++) if (x % 2 === 0 || x === 23) c.set(x, 4, 'H', '+');
  c.hl(21, 24, 3, 'H', '+');
  c.set(18, 5, 'H', '+');
  // пряди вдоль лица
  c.vl(16, 9, 16, 'H');
  c.vl(15, 8, 14, 'H');
  c.vl(31, 9, 16, 'H');
  c.vl(32, 8, 14, 'H');
  c.set(16, 17, 'H', '-');
  c.set(31, 17, 'H', '-');
}

function drawHairBack(c: Canvas, style: Look['style']) {
  switch (style) {
    case 'long':
      c.poly(
        [
          [15, 6],
          [32, 6],
          [34, 20],
          [35, 32],
          [33, 36],
          [14, 36],
          [12, 32],
          [13, 20],
        ],
        'H',
      );
      c.path(
        [
          [15, 20],
          [14, 30],
        ],
        'H',
        '-',
      );
      c.path(
        [
          [32, 20],
          [33, 30],
        ],
        'H',
        '-',
      );
      break;
    case 'bob':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [34, 14],
          [33, 19],
          [14, 19],
          [13, 14],
        ],
        'H',
      );
      break;
    case 'short':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [33, 12],
          [31, 16],
          [16, 16],
          [14, 12],
        ],
        'H',
      );
      break;
    case 'ponytail':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [33, 12],
          [14, 12],
        ],
        'H',
      );
      c.poly(
        [
          [31, 5],
          [36, 6],
          [38, 12],
          [38, 22],
          [36, 30],
          [34, 32],
          [35, 24],
          [34, 14],
          [31, 9],
        ],
        'H',
      );
      c.path(
        [
          [36, 12],
          [36, 24],
        ],
        'H',
        '-',
      );
      c.rect(31, 6, 32, 7, 'T');
      break;
    case 'twintails':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [33, 12],
          [14, 12],
        ],
        'H',
      );
      for (const s of [-1, 1]) {
        const cx = s < 0 ? 13 : 34;
        c.poly(
          [
            [cx - 1 * s, 6],
            [cx + 3 * s, 8],
            [cx + 4 * s, 16],
            [cx + 3 * s, 26],
            [cx + 1 * s, 31],
            [cx, 26],
            [cx + 1 * s, 16],
          ].map(([x, y]) => [x, y] as [number, number]),
          'H',
        );
        c.set(cx + (s < 0 ? 1 : -1), 6, 'T');
        c.set(cx + (s < 0 ? 2 : -2), 7, 'T');
      }
      break;
    case 'braid':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [33, 14],
          [14, 14],
        ],
        'H',
      );
      for (let y = 15; y <= 33; y += 2) {
        c.hl(13, 15, y, 'H');
        c.hl(13, 15, y + 1, 'H', '-');
      }
      c.rect(13, 34, 15, 35, 'T');
      break;
    case 'bun':
      c.poly(
        [
          [15, 5],
          [32, 5],
          [33, 12],
          [14, 12],
        ],
        'H',
      );
      c.ellipse(24, 2, 4, 2.4, 'H');
      c.hl(22, 24, 1, 'H', '+');
      break;
    case 'wild':
      c.poly(
        [
          [13, 4],
          [34, 4],
          [37, 12],
          [35, 18],
          [37, 24],
          [33, 30],
          [30, 24],
          [17, 24],
          [14, 30],
          [10, 24],
          [12, 18],
          [10, 12],
        ],
        'H',
      );
      break;
  }
}

// ——— наряды ———

function outfit(c: Canvas, kind: OutfitKind, legs: boolean) {
  switch (kind) {
    case 'knight': {
      // наплечники
      c.ellipse(15, 21, 3, 2.2, 'K');
      c.ellipse(32, 21, 3, 2.2, 'K');
      c.hl(13, 16, 20, 'K', '+');
      c.hl(30, 33, 20, 'K', '+');
      // кираса до середины живота — живот открыт
      c.rows(
        [
          [21, 18, 29],
          [22, 17, 30],
          [23, 17, 30],
          [24, 17, 30],
          [25, 18, 29],
          [26, 19, 28],
        ],
        'K',
      );
      c.vl(24, 21, 26, 'K', '-');
      c.hl(19, 22, 22, 'K', '+');
      c.hl(18, 29, 26, 'T');
      c.set(23, 21, 'G');
      c.set(24, 21, 'G');
      // пояс и набедренные пластины с разрезом
      c.hl(19, 29, 30, 'W');
      c.set(24, 30, 'T', '+');
      c.rows(
        [
          [31, 18, 23],
          [32, 18, 23],
          [33, 18, 22],
          [34, 18, 22],
          [35, 19, 21],
        ],
        'K',
      );
      c.rows(
        [
          [31, 25, 30],
          [32, 25, 30],
          [33, 26, 30],
          [34, 26, 30],
          [35, 27, 29],
        ],
        'K',
      );
      c.hl(18, 23, 31, 'K', '+');
      c.hl(25, 30, 31, 'K', '+');
      // короткая юбка под пластинами
      c.hl(19, 29, 31, 'O');
      c.hl(19, 29, 32, 'O', '-');
      c.rect(18, 31, 23, 31, 'K', '+');
      c.rect(25, 31, 30, 31, 'K', '+');
      // латные перчатки
      armPart(c, 'L', 'fore', 'K', '0');
      armPart(c, 'R', 'fore', 'K', '0');
      armPart(c, 'L', 'hand', 'K', '0');
      armPart(c, 'R', 'hand', 'K', '0');
      if (legs) {
        // латные сапоги выше колена
        c.rect(18, 38, 22, 46, 'K');
        c.rect(25, 38, 28, 46, 'K');
        c.hl(16, 22, 46, 'K', '-');
        c.hl(25, 30, 46, 'K', '-');
        c.hl(18, 22, 39, 'K', '+');
        c.hl(25, 28, 39, 'K', '+');
        c.set(20, 40, 'T');
        c.set(26, 40, 'T');
      }
      break;
    }
    case 'barbarian': {
      // топ из меха и кожи, живот, руки и плечи открыты
      c.rows(
        [
          [22, 17, 30],
          [23, 17, 30],
          [24, 17, 30],
          [25, 18, 29],
        ],
        'W',
      );
      c.hl(17, 30, 22, 'R');
      c.set(24, 23, 'W', '-');
      c.set(24, 24, 'W', '-');
      c.line(20, 21, 17, 22, 'W', '-');
      c.line(27, 21, 30, 22, 'W', '-');
      // набедренная повязка и пояс с черепом-пряжкой
      c.hl(18, 30, 30, 'W', '-');
      c.set(24, 30, 'R', '+');
      c.rows(
        [
          [31, 18, 30],
          [32, 19, 29],
        ],
        'O',
      );
      c.poly(
        [
          [21, 32],
          [27, 32],
          [26, 39],
          [22, 39],
        ],
        'O',
      );
      c.hl(22, 26, 39, 'T');
      // наручи и меховые сапоги
      armPart(c, 'L', 'fore', 'W', '0');
      armPart(c, 'R', 'fore', 'W', '0');
      c.hl(11, 13, 27, 'R');
      c.hl(33, 35, 27, 'R');
      if (legs) {
        c.rect(17, 42, 21, 46, 'W');
        c.rect(26, 42, 30, 46, 'W');
        c.hl(17, 21, 41, 'R');
        c.hl(26, 29, 41, 'R');
      }
      break;
    }
    case 'ranger': {
      // корсет со шнуровкой, открытые плечи и ключицы
      c.rows(
        [
          [22, 17, 30],
          [23, 17, 30],
          [24, 17, 30],
          [25, 18, 29],
          [26, 19, 28],
          [27, 19, 28],
          [28, 19, 28],
        ],
        'O',
      );
      c.hl(17, 30, 22, 'T');
      for (let y = 24; y <= 28; y += 2) c.set(24, y, 'T', '+');
      c.vl(24, 23, 28, 'O', '-');
      // шорты и пояс с сумкой
      c.hl(19, 29, 29, 'W');
      c.rows(
        [
          [30, 18, 30],
          [31, 18, 30],
          [32, 18, 23],
          [32, 25, 30],
        ],
        'O',
        '-',
      );
      c.rect(27, 29, 29, 31, 'W', '-');
      // перчатки без пальцев
      armPart(c, 'L', 'hand', 'W', '0');
      armPart(c, 'R', 'hand', 'W', '0');
      if (legs) {
        // ботфорты выше колена, между шортами и ботфортами — открытые бёдра
        c.rect(18, 37, 22, 46, 'W');
        c.rect(25, 37, 29, 46, 'W');
        c.hl(18, 22, 37, 'W', '+');
        c.hl(25, 29, 37, 'W', '+');
        c.hl(16, 22, 46, 'W', '-');
        c.hl(25, 30, 46, 'W', '-');
        c.set(19, 38, 'T');
        c.set(26, 38, 'T');
      }
      break;
    }
    case 'witch': {
      // платье с открытыми плечами и корсетом
      c.rows(
        [
          [22, 17, 30],
          [23, 16, 31],
          [24, 17, 30],
          [25, 18, 29],
          [26, 19, 28],
          [27, 19, 28],
          [28, 19, 28],
          [29, 19, 29],
        ],
        'O',
      );
      c.hl(17, 30, 22, 'T');
      c.set(24, 23, 'O', '-');
      c.hl(19, 29, 29, 'T');
      c.set(24, 29, 'G');
      // длинная юбка с высоким разрезом по правой ноге
      c.poly(
        [
          [18, 30],
          [30, 30],
          [31, 36],
          [29, 45],
          [16, 46],
          [17, 38],
        ],
        'O',
      );
      c.poly(
        [
          [25, 31],
          [30, 31],
          [30, 46],
          [25, 46],
        ],
        '',
      );
      c.line(24, 31, 23, 46, 'O', '-');
      c.hl(16, 24, 46, 'T');
      // рукава-перчатки
      armPart(c, 'L', 'fore', 'O', '0');
      armPart(c, 'R', 'fore', 'O', '0');
      c.hl(11, 13, 27, 'T');
      c.hl(33, 35, 27, 'T');
      if (legs) {
        // видимая в разрезе нога — чулок с кружевом
        c.rect(25, 38, 28, 44, 'F');
        c.hl(25, 28, 38, 'T');
        c.rect(26, 45, 30, 46, 'W', '-');
      }
      break;
    }
    case 'cleric': {
      // платье-халтер: открытые плечи и руки, глубокий вырез, золото
      c.line(21, 19, 22, 21, 'T');
      c.line(26, 19, 25, 21, 'T');
      c.rows(
        [
          [22, 17, 22],
          [22, 25, 30],
          [23, 17, 23],
          [23, 24, 30],
          [24, 17, 30],
          [25, 18, 29],
          [26, 19, 28],
          [27, 19, 28],
          [28, 19, 28],
          [29, 19, 29],
        ],
        'R',
      );
      c.hl(17, 22, 22, 'T');
      c.hl(25, 30, 22, 'T');
      c.hl(19, 29, 28, 'T');
      c.set(24, 28, 'G', '+');
      // юбка с разрезами по обеим сторонам
      c.poly(
        [
          [21, 29],
          [27, 29],
          [28, 46],
          [20, 46],
        ],
        'R',
      );
      c.poly(
        [
          [18, 29],
          [20, 29],
          [19, 40],
          [16, 42],
        ],
        'R',
        '-',
      );
      c.poly(
        [
          [28, 29],
          [30, 29],
          [32, 42],
          [29, 40],
        ],
        'R',
        '-',
      );
      c.vl(24, 30, 46, 'T');
      c.hl(20, 28, 46, 'T');
      // браслеты
      c.hl(16, 18, 30, 'T');
      c.hl(34, 36, 29, 'T');
      if (legs) {
        c.rect(16, 45, 20, 46, 'T', '-');
        c.rect(26, 45, 30, 46, 'T', '-');
      }
      break;
    }
    case 'reaper': {
      // тёмный корсет, чокер, отдельные рукава
      c.hl(21, 26, 19, 'D');
      c.set(24, 19, 'G');
      c.rows(
        [
          [23, 17, 30],
          [24, 17, 30],
          [25, 18, 29],
          [26, 19, 28],
          [27, 19, 28],
          [28, 19, 28],
          [29, 19, 29],
        ],
        'D',
      );
      c.hl(17, 30, 23, 'T');
      c.path(
        [
          [21, 24],
          [24, 28],
          [27, 24],
        ],
        'T',
        '-',
      );
      // длинная рваная юбка с разрезом спереди
      c.poly(
        [
          [18, 30],
          [30, 30],
          [33, 46],
          [14, 46],
        ],
        'O',
      );
      c.poly(
        [
          [22, 31],
          [26, 31],
          [28, 46],
          [20, 46],
        ],
        '',
      );
      for (const x of [14, 17, 29, 32]) c.clear(x, 46);
      c.hl(18, 30, 30, 'T');
      armPart(c, 'L', 'fore', 'D', '0');
      armPart(c, 'R', 'fore', 'D', '0');
      if (legs) {
        c.rect(19, 36, 23, 46, 'F');
        c.rect(25, 36, 29, 46, 'F');
        c.hl(19, 23, 36, 'D');
        c.hl(25, 29, 36, 'D');
      }
      break;
    }
    case 'rogue': {
      // облегающий топ с вырезом на животе, шарф-маска на шее
      c.rows(
        [
          [21, 18, 29],
          [22, 17, 30],
          [23, 17, 30],
          [24, 17, 30],
          [25, 18, 29],
        ],
        'O',
      );
      c.hl(20, 27, 20, 'A');
      c.hl(19, 28, 21, 'A', '-');
      c.set(24, 23, 'O', '-');
      c.set(24, 24, 'O', '-');
      // шорты, ремни на бёдрах
      c.hl(19, 29, 29, 'W');
      c.rows(
        [
          [30, 18, 30],
          [31, 18, 30],
          [32, 18, 23],
          [32, 25, 30],
        ],
        'O',
      );
      armPart(c, 'L', 'fore', 'O', '-');
      armPart(c, 'R', 'fore', 'O', '-');
      if (legs) {
        c.rect(19, 35, 23, 46, 'F');
        c.rect(25, 35, 29, 46, 'F');
        c.hl(19, 23, 34, 'W');
        c.hl(25, 29, 34, 'W');
        c.hl(16, 20, 46, 'W', '-');
        c.hl(26, 30, 46, 'W', '-');
      }
      break;
    }
    case 'minstrel': {
      // блуза со спущенными плечами, корсет, пышная короткая юбка
      c.ellipse(15, 22, 2.6, 2, 'R');
      c.ellipse(32, 22, 2.6, 2, 'R');
      c.rows(
        [
          [22, 17, 30],
          [23, 17, 30],
        ],
        'R',
      );
      c.rows(
        [
          [24, 18, 29],
          [25, 18, 29],
          [26, 19, 28],
          [27, 19, 28],
          [28, 19, 28],
          [29, 19, 29],
        ],
        'O',
      );
      for (let y = 25; y <= 29; y += 2) c.hl(23, 25, y, 'T', '+');
      c.poly(
        [
          [18, 30],
          [30, 30],
          [33, 36],
          [15, 36],
        ],
        'O',
      );
      c.hl(15, 33, 36, 'T');
      c.hl(16, 32, 37, 'R');
      if (legs) {
        c.rect(19, 38, 22, 46, 'F');
        c.rect(25, 38, 28, 46, 'F');
        c.hl(19, 22, 38, 'T');
        c.hl(25, 28, 38, 'T');
        c.rect(16, 44, 21, 46, 'W');
        c.rect(26, 44, 30, 46, 'W');
      }
      break;
    }
  }
}

/** Объём груди на верхе одежды: блик сверху, тень снизу и в ложбинке. */
function bustShading(c: Canvas) {
  const cloth = (x: number, y: number) => {
    const m = c.mat(x, y);
    return m && m !== 'S' && m !== 'H' && m !== 'X' ? m : '';
  };
  for (const [x0, x1] of [
    [18, 22],
    [25, 29],
  ]) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      const m = cloth(x, 22);
      if (m) c.set(x, 22, m, '+');
    }
    for (let x = x0; x <= x1; x++) {
      const m = cloth(x, 25);
      if (m) c.set(x, 25, m, '-');
    }
  }
  for (const y of [23, 24]) {
    const m = cloth(24, y);
    if (m) c.set(24, y, m, '=');
    const m2 = cloth(23, y);
    if (m2 && y === 24) c.set(23, y, m2, '-');
  }
}

// ——— низ монстродевушек ———

function lowerExtra(c: Canvas, extra: Look['extra']): boolean {
  if (extra === 'snake') {
    c.poly(
      [
        [18, 31],
        [30, 31],
        [31, 38],
        [36, 44],
        [42, 46],
        [22, 47],
        [15, 44],
        [17, 38],
      ],
      'A',
    );
    for (let y = 34; y <= 45; y += 2) c.hl(20, 27, y, 'A', '+');
    return true;
  }
  if (extra === 'fishTail') {
    c.poly(
      [
        [18, 31],
        [30, 31],
        [29, 40],
        [26, 44],
        [22, 44],
        [19, 40],
      ],
      'A',
    );
    c.poly(
      [
        [24, 43],
        [31, 47],
        [24, 45],
        [17, 47],
      ],
      'A',
      '-',
    );
    for (let y = 33; y <= 41; y += 2) for (let x = 20 + (y % 4 ? 1 : 0); x <= 28; x += 2) c.set(x, y, 'A', '+');
    return true;
  }
  return false;
}

// ——— спина и перёд: крылья, хвосты, лозы ———

function extraBack(c: Canvas, extra: Look['extra']) {
  switch (extra) {
    case 'wings':
      for (const s of [-1, 1]) {
        const x0 = 24 + s * 6;
        c.poly(
          [
            [x0, 20],
            [x0 + s * 12, 10],
            [x0 + s * 17, 12],
            [x0 + s * 15, 22],
            [x0 + s * 11, 30],
            [x0 + s * 4, 28],
          ],
          'Q',
        );
        for (let k = 0; k < 4; k++) c.line(x0 + s * (5 + k * 3), 15 + k * 2, x0 + s * (3 + k * 3), 27 - k, 'Q', '-');
      }
      break;
    case 'darkWings':
      for (const s of [-1, 1]) {
        const x0 = 24 + s * 6;
        c.poly(
          [
            [x0, 20],
            [x0 + s * 10, 8],
            [x0 + s * 18, 9],
            [x0 + s * 16, 16],
            [x0 + s * 18, 22],
            [x0 + s * 13, 24],
            [x0 + s * 12, 30],
            [x0 + s * 7, 27],
          ],
          'D',
        );
        c.line(x0 + s * 1, 20, x0 + s * 16, 11, 'D', '+');
        c.line(x0 + s * 2, 22, x0 + s * 15, 21, 'D', '+');
      }
      break;
    case 'tail':
      c.path(
        [
          [30, 31],
          [35, 33],
          [38, 30],
          [40, 25],
          [42, 23],
        ],
        'A',
        '0',
        2,
      );
      c.poly(
        [
          [41, 20],
          [45, 22],
          [42, 25],
        ],
        'A',
      );
      break;
    case 'scorpion':
      c.path(
        [
          [30, 30],
          [36, 30],
          [40, 24],
          [40, 16],
          [37, 12],
        ],
        'A',
        '0',
        3,
      );
      c.poly(
        [
          [35, 9],
          [39, 11],
          [36, 14],
        ],
        'A',
        '-',
      );
      break;
    case 'gears':
      for (const [gx, gy, r] of [
        [11, 16, 4],
        [37, 22, 3.4],
        [36, 12, 2.6],
      ] as [number, number, number][]) {
        c.ellipse(gx, gy, r, r, 'K');
        c.ellipse(gx, gy, r * 0.4, r * 0.4, 'K', '=');
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          c.set(Math.round(gx + Math.cos(a) * (r + 1)), Math.round(gy + Math.sin(a) * (r + 1)), 'K', '-');
        }
      }
      break;
  }
}

function extraFront(c: Canvas, extra: Look['extra']) {
  if (extra === 'vines') {
    c.path(
      [
        [16, 22],
        [19, 27],
        [18, 33],
        [21, 38],
        [20, 44],
      ],
      'V',
    );
    c.path(
      [
        [31, 22],
        [28, 28],
        [30, 34],
        [27, 40],
      ],
      'V',
    );
    for (const [x, y] of [
      [18, 25],
      [20, 36],
      [29, 30],
      [28, 38],
      [17, 31],
    ] as [number, number][]) {
      c.set(x, y, 'V', '+');
      c.set(x + 1, y, 'V', '+');
    }
  }
}

// ——— аксессуары ———

function accessory(c: Canvas, acc: Look['acc']) {
  switch (acc) {
    case 'witchHat':
      c.poly(
        [
          [22, -1],
          [27, 1],
          [30, 6],
          [17, 6],
        ],
        'A',
      );
      c.line(22, -1, 17, 1, 'A');
      c.set(16, 2, 'A');
      c.rows(
        [
          [6, 12, 35],
          [7, 13, 34],
        ],
        'A',
      );
      c.hl(17, 30, 5, 'T');
      c.set(27, 5, 'G', '+');
      break;
    case 'crown':
      c.rect(19, 2, 28, 4, 'T');
      for (const x of [19, 22, 25, 28]) c.set(x, 1, 'T', '+');
      c.set(23, 3, 'G', '+');
      c.set(24, 3, 'G');
      break;
    case 'tiara':
      c.hl(18, 29, 5, 'T');
      c.set(23, 4, 'T', '+');
      c.set(24, 4, 'T', '+');
      c.set(24, 3, 'G', '+');
      break;
    case 'halo':
      c.hl(19, 28, 0, 'T', '+');
      c.hl(18, 29, 1, 'T');
      c.hl(19, 28, 2, 'T', '+');
      c.clear(20, 1);
      c.hl(20, 27, 1, '');
      break;
    case 'hood':
      // передняя кромка капюшона: верх над чёлкой и края вдоль лица
      c.rows(
        [
          [1, 19, 28],
          [2, 17, 30],
          [3, 16, 31],
          [4, 15, 32],
          [5, 15, 32],
        ],
        'A',
      );
      c.hl(18, 29, 5, 'A', '-');
      for (let y = 6; y <= 20; y++) {
        c.hl(13, 15, y, 'A');
        c.hl(32, 34, y, 'A');
      }
      c.vl(15, 6, 20, 'A', '-');
      c.vl(32, 6, 20, 'A', '-');
      break;
    case 'helmet':
      c.rows(
        [
          [2, 20, 27],
          [3, 18, 29],
          [4, 17, 30],
          [5, 16, 31],
          [6, 16, 31],
          [7, 16, 31],
        ],
        'K',
      );
      c.hl(19, 23, 3, 'K', '+');
      c.vl(16, 8, 13, 'K');
      c.vl(31, 8, 13, 'K');
      c.path(
        [
          [16, 4],
          [12, 1],
          [10, 2],
        ],
        'R',
      );
      c.path(
        [
          [31, 4],
          [35, 1],
          [37, 2],
        ],
        'R',
      );
      break;
    case 'horns':
      c.path(
        [
          [19, 5],
          [17, 2],
          [15, 1],
        ],
        'A',
        '0',
        2,
      );
      c.path(
        [
          [28, 5],
          [30, 2],
          [32, 1],
        ],
        'A',
        '0',
        2,
      );
      break;
    case 'catEars':
      c.poly(
        [
          [17, 6],
          [18, 0],
          [22, 4],
        ],
        'H',
      );
      c.poly(
        [
          [26, 4],
          [29, 0],
          [31, 6],
        ],
        'H',
      );
      c.set(19, 3, 'P');
      c.set(28, 3, 'P');
      break;
    case 'elfEars':
      c.poly(
        [
          [18, 11],
          [14, 7],
          [18, 13],
        ],
        'S',
      );
      c.poly(
        [
          [29, 11],
          [33, 7],
          [29, 13],
        ],
        'S',
      );
      break;
    case 'flower':
      c.ellipse(29, 6, 1.6, 1.6, 'A');
      c.set(29, 6, 'T', '+');
      c.set(27, 7, 'V');
      break;
    case 'veil':
      // ободок; сама вуаль рисуется за спиной (accessoryBack)
      c.hl(16, 31, 5, 'T');
      c.set(24, 4, 'G', '+');
      break;
    case 'bandana':
      c.hl(16, 31, 6, 'A');
      c.hl(16, 31, 7, 'A', '-');
      c.path(
        [
          [31, 7],
          [34, 10],
          [35, 13],
        ],
        'A',
      );
      break;
    case 'mask':
      c.hl(19, 28, 15, 'A');
      c.hl(19, 28, 16, 'A', '-');
      c.hl(20, 27, 17, 'A');
      break;
  }
}

/** Части аксессуаров за головой и телом. */
function accessoryBack(c: Canvas, acc: Look['acc']) {
  if (acc === 'hood') {
    c.poly(
      [
        [15, 2],
        [32, 2],
        [36, 12],
        [36, 24],
        [30, 26],
        [17, 26],
        [11, 24],
        [11, 12],
      ],
      'A',
      '-',
    );
  } else if (acc === 'veil') {
    c.poly(
      [
        [16, 4],
        [31, 4],
        [36, 18],
        [35, 34],
        [30, 28],
        [17, 28],
        [12, 34],
        [11, 18],
      ],
      'A',
    );
  }
}

// ——— оружие ———

function weapon(c: Canvas, w: SpriteSpec['weapon']) {
  switch (w) {
    case 'sword':
      // клинок вверх-вправо из правой руки
      c.line(36, 29, 44, 13, 'K', '+', 2);
      c.line(37, 29, 45, 13, 'K', '-');
      c.hl(33, 38, 29, 'T');
      c.rect(34, 30, 36, 31, 'W');
      c.set(35, 32, 'T', '+');
      // щит в левой руке
      c.poly(
        [
          [8, 24],
          [16, 24],
          [16, 32],
          [12, 37],
          [8, 32],
        ],
        'A',
      );
      c.hl(8, 16, 24, 'T');
      c.vl(12, 25, 35, 'T', '-');
      c.set(12, 29, 'G', '+');
      break;
    case 'axe':
      c.line(37, 33, 40, 10, 'W', '0', 2);
      c.poly(
        [
          [40, 11],
          [46, 8],
          [47, 16],
          [41, 18],
        ],
        'K',
      );
      c.line(46, 8, 47, 16, 'K', '+');
      break;
    case 'bow':
      c.path(
        [
          [37, 12],
          [41, 18],
          [42, 26],
          [41, 34],
          [37, 40],
        ],
        'W',
        '0',
        2,
      );
      c.line(37, 13, 37, 39, 'R', '-');
      // колчан за спиной
      c.rect(11, 18, 13, 29, 'W', '-');
      c.hl(10, 14, 17, 'Q');
      break;
    case 'staff':
      c.line(37, 44, 37, 9, 'W', '0', 2);
      c.ellipse(38.5, 7, 2.6, 2.6, 'G');
      c.set(37, 6, 'G', '+');
      c.set(38, 5, 'G', '+');
      c.path(
        [
          [36, 9],
          [36, 6],
          [38, 3],
        ],
        'T',
      );
      break;
    case 'wand':
      c.line(35, 32, 39, 21, 'T', '0');
      c.ellipse(40, 19, 1.8, 1.8, 'G');
      c.set(40, 18, 'G', '+');
      for (const [x, y] of [
        [43, 16],
        [42, 21],
        [44, 19],
      ] as [number, number][])
        c.set(x, y, 'G', '+');
      break;
    case 'scythe':
      c.line(38, 45, 41, 5, 'W', '-', 2);
      c.poly(
        [
          [40, 5],
          [30, 3],
          [24, 6],
          [31, 5],
          [40, 8],
        ],
        'K',
      );
      c.line(30, 3, 40, 5, 'K', '+');
      break;
    case 'daggers':
      c.line(36, 30, 41, 24, 'K', '+');
      c.line(37, 30, 42, 24, 'K', '-');
      c.set(35, 31, 'T');
      c.line(16, 33, 13, 39, 'K', '+');
      c.line(17, 33, 14, 39, 'K', '-');
      c.set(17, 32, 'T');
      break;
    case 'lute':
      c.ellipse(28, 33, 5, 4, 'W');
      c.ellipse(28, 33, 1.4, 1.4, 'W', '=');
      c.line(31, 30, 38, 22, 'W', '-', 2);
      c.rect(38, 20, 39, 22, 'T');
      c.line(26, 34, 37, 22, 'R', '+');
      break;
  }
}

// ——— светотень, контур, палитра ———

const AUTO = new Set(['S', 'H', 'O', 'T', 'A', 'K', 'W', 'R', 'F', 'D', 'G', 'Q', 'V']);

/** Автосветотень: свет сверху-слева. Правая/нижняя кромка материала — тень, верх/лево — блик. */
function autoShade(c: Canvas) {
  const src = c.g.slice();
  const at = (x: number, y: number) => (c.in(x, y) ? src[y * c.w + x].charAt(0) : '');
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const v = src[y * c.w + x];
      if (v.length !== 2 || v[1] !== '0' || !AUTO.has(v[0])) continue;
      const m = v[0];
      const right = at(x + 1, y) !== m;
      const down = at(x, y + 1) !== m;
      const left = at(x - 1, y) !== m;
      const up = at(x, y - 1) !== m;
      if (right && down) c.set(x, y, m, '=');
      else if (right || down) c.set(x, y, m, '-');
      else if ((up || left) && m !== 'S') c.set(x, y, m, '+');
      else if (up && left) c.set(x, y, m, '+');
    }
}

function outline(c: Canvas) {
  const edge: [number, number][] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (c.get(x, y)) continue;
      if (c.get(x - 1, y) || c.get(x + 1, y) || c.get(x, y - 1) || c.get(x, y + 1)) edge.push([x, y]);
    }
  for (const [x, y] of edge) c.set(x, y, 'X');
}

function tones(base: RGBA, deep = 0.42): Record<Tone, RGBA> {
  return { '0': base, '+': lighten(base, 0.28), '-': darken(base, 0.24), '=': darken(base, deep) };
}

function palette(spec: SpriteSpec): Record<string, Record<Tone, RGBA>> {
  const L = spec.look;
  const outfit = hex(L.outfit);
  const trim = hex(L.trim);
  const elem = hex(ELEMENT_COLORS[spec.element as Element]);
  const skin = hex(L.skin);
  const eyes = hex(L.eyes);
  return {
    S: { '0': skin, '+': lighten(skin, 0.18), '-': mix(darken(skin, 0.2), hex('#B0506A'), 0.18), '=': mix(darken(skin, 0.34), hex('#8A3A5A'), 0.2) },
    H: tones(hex(L.hair)),
    O: tones(outfit),
    T: tones(trim),
    A: tones(hex(L.accColor ?? L.trim)),
    K: { '0': hex('#C8D0DE'), '+': hex('#F4F8FF'), '-': hex('#8A92A6'), '=': hex('#5A6072') },
    W: tones(hex('#8A5A34')),
    R: { '0': hex('#F2ECE4'), '+': hex('#FFFFFF'), '-': hex('#C8BCB4'), '=': hex('#9A8E88') },
    F: tones(mix(darken(outfit, 0.55), hex('#2A1A2A'), 0.5)),
    D: tones(hex('#3A1E44')),
    G: tones(elem),
    Q: { '0': hex('#F6F2FF'), '+': hex('#FFFFFF'), '-': hex('#C8C0E0'), '=': hex('#9A90B8') },
    V: tones(hex('#3F8A34')),
    E: { '0': eyes, '+': lighten(eyes, 0.75), '-': darken(eyes, 0.45), '=': darken(eyes, 0.6) },
    P: tones(mix(skin, hex('#F06A8A'), 0.45)),
    M: tones(mix(skin, hex('#B03A5A'), 0.6)),
    l: tones(hex('#24121C')),
    X: tones(hex('#1A1016')),
  };
}

export function renderFigure(spec: SpriteSpec & { outfit?: OutfitKind }): Bitmap {
  const c = new Canvas(FIG, FIG);
  const L = spec.look;
  const kind = spec.outfit ?? 'witch';
  extraBack(c, L.extra);
  accessoryBack(c, L.acc);
  drawHairBack(c, L.style);
  const replaced = L.extra === 'snake' || L.extra === 'fishTail';
  drawBody(c, !replaced);
  if (replaced) lowerExtra(c, L.extra);
  outfit(c, kind, !replaced);
  bustShading(c);
  drawFace(c);
  hairTop(c);
  accessory(c, L.acc);
  weapon(c, spec.weapon);
  extraFront(c, L.extra);
  autoShade(c);
  outline(c);

  const pal = palette(spec);
  const data = new Uint8ClampedArray(c.w * c.h * 4);
  const shadow = spec.shadow ? hex('#2A0E3A') : null;
  const tint = spec.tint ? hex(spec.tint) : null;
  for (let i = 0; i < c.g.length; i++) {
    const v = c.g[i];
    if (!v) continue;
    const m = v.charAt(0);
    const t = (v.charAt(1) || '0') as Tone;
    let col = pal[m]?.[t] ?? hex('#FF00FF');
    if (shadow && m !== 'X') col = mix(col, shadow, m === 'E' ? 0.2 : 0.65);
    if (shadow && m === 'E') col = hex('#E040FF');
    if (tint && m !== 'X') col = mix(col, tint, 0.45);
    data.set(col, i * 4);
  }
  return { w: c.w, h: c.h, data };
}
