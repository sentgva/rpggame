/**
 * Героини и враги-гуманоиды 48×48, версия 2: взрослые пропорции (≈3,5 головы, длинные ноги,
 * узкая талия), детальное лицо, откровенные фэнтезийные наряды без наготы, кадры анимации
 * (глаза: открыты/полуприкрыты/закрыты/подмигивание; руки: два кадра «дыхания» и выпад).
 *
 * Рисуем «материалами»: пиксель — материал + тон ('S0' кожа-база, 'S-' тень, 'S+' блик,
 * 'S=' глубокая тень). После рисования — автосветотень (свет сверху-слева) и контур.
 */
import type { Element, Look } from '@idle/shared';
import { ELEMENT_COLORS } from '@idle/shared';
import { darken, hex, lighten, mix, type RGBA } from './color';
import type { Bitmap, SpriteSpec } from './sprite';

const FIG = 48;

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
export type Eyes = 'open' | 'half' | 'closed' | 'wink';
export type Arms = 'idle' | 'idle2' | 'attack' | 'hips' | 'behindHead' | 'victory' | 'wave' | 'crossed' | 'shy' | 'kiss';
/** Позы конструктора (без оружия): боевые кадры — idle/idle2/attack. */
export const EXTRA_POSES: Arms[] = ['hips', 'behindHead', 'victory', 'wave', 'crossed', 'shy', 'kiss'];
export interface Pose {
  eyes?: Eyes;
  arms?: Arms;
  /** Второй кадр «особой» анимации: крылья подняты, хвост качнулся (Вестницы и Колоссы). */
  flap?: boolean;
}
type P = [number, number];

export class Canvas {
  g: string[];
  /** Смещение рисования (для оружия, привязанного к кисти). */
  ox = 0;
  oy = 0;
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
    x += this.ox;
    y += this.oy;
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
    this.set(x, y, '');
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
  path(pts: P[], m: string, t: Tone = '0', w = 1) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, t, w);
  }
  /** Заливка многоугольника (чётно-нечётное правило). */
  poly(pts: P[], m: string, t: Tone = '0') {
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
  /** Перекрасить тон материала m в прямоугольнике. */
  tone(x0: number, y0: number, x1: number, y1: number, m: string, t: Tone) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.mat(x, y) === m) this.set(x, y, m, t);
  }
}

// ——— раскладка фигуры ———

interface ArmGeo {
  shoulder: P;
  elbow: P;
  hand: P;
}

/** Позы рук: левая (от зрителя) упёрта в бедро, правая держит оружие. */
const ARMS: Record<Arms, { L: ArmGeo; R: ArmGeo }> = {
  idle: {
    L: { shoulder: [17, 19], elbow: [13, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [33, 24], hand: [35, 27] },
  },
  idle2: {
    L: { shoulder: [17, 19], elbow: [12, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [33, 23], hand: [35, 26] },
  },
  attack: {
    L: { shoulder: [17, 19], elbow: [13, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [34, 18], hand: [38, 21] },
  },
  // обе руки на бёдрах
  hips: {
    L: { shoulder: [17, 19], elbow: [12, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [35, 24], hand: [30, 28] },
  },
  // руки за головой: кисти прячутся за волосами
  behindHead: {
    L: { shoulder: [17, 19], elbow: [11, 12], hand: [16, 6] },
    R: { shoulder: [30, 19], elbow: [36, 12], hand: [32, 6] },
  },
  // кулак вверх
  victory: {
    L: { shoulder: [17, 19], elbow: [13, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [35, 13], hand: [36, 5] },
  },
  // машет рукой
  wave: {
    L: { shoulder: [17, 19], elbow: [13, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [37, 17], hand: [37, 10] },
  },
  // руки скрещены под грудью
  crossed: {
    L: { shoulder: [17, 19], elbow: [16, 25], hand: [29, 23] },
    R: { shoulder: [30, 19], elbow: [31, 25], hand: [19, 23] },
  },
  // кисти сцеплены внизу перед собой
  shy: {
    L: { shoulder: [17, 19], elbow: [17, 25], hand: [23, 30] },
    R: { shoulder: [30, 19], elbow: [30, 25], hand: [25, 30] },
  },
  // воздушный поцелуй: кисть у губ
  kiss: {
    L: { shoulder: [17, 19], elbow: [13, 24], hand: [18, 28] },
    R: { shoulder: [30, 19], elbow: [34, 21], hand: [27, 13] },
  },
};

/** Руки, которые в позе идут перед торсом и одеждой (рисуются отдельным слоем поверх). */
const FRONT_ARMS: Partial<Record<Arms, ('L' | 'R')[]>> = { crossed: ['L', 'R'], shy: ['L', 'R'], kiss: ['R'] };

let arms = ARMS.idle;
/** Слой рук «спереди» (позы конструктора); null — руки рисуются прямо под торсом, как в бою. */
let armLayer: Canvas | null = null;
let frontSides: ('L' | 'R')[] = [];
/** Толщина горизонтальных предплечий — поперёк руки (в новых позах руки бывают почти горизонтальны). */
let perpLimbs = false;

function armCanvas(c: Canvas, side: 'L' | 'R'): Canvas {
  return armLayer && frontSides.includes(side) ? armLayer : c;
}

/** Толстый сегмент (руки, рукава). */
function limb(c: Canvas, a: P, b: P, m: string, t: Tone = '0', w = 2) {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let k = 0; k <= steps; k++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * k) / steps);
    const y = Math.round(a[1] + ((b[1] - a[1]) * k) / steps);
    const flat = perpLimbs && Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    for (let d = 0; d < w; d++) {
      if (flat) c.set(x, y + d - Math.floor(w / 2), m, t);
      else c.set(x + d - Math.floor(w / 2), y, m, t);
    }
  }
}

/** Рукав/перчатка на участке руки. */
function armPart(c0: Canvas, side: 'L' | 'R', part: 'upper' | 'fore' | 'hand', m: string, t: Tone = '0') {
  const A = arms[side];
  const c = armCanvas(c0, side);
  if (part === 'upper') limb(c, A.shoulder, A.elbow, m, t, 3);
  else if (part === 'fore') limb(c, A.elbow, A.hand, m, t);
  else c.rect(A.hand[0] - 1, A.hand[1] - 1, A.hand[0], A.hand[1], m, t);
}
function bothArms(c: Canvas, part: 'upper' | 'fore' | 'hand', m: string, t: Tone = '0') {
  armPart(c, 'L', part, m, t);
  armPart(c, 'R', part, m, t);
}

// ——— тело ———

const LEG_L: [number, number, number][] = [
  [33, 18, 23],
  [34, 18, 23],
  [35, 18, 22],
  [36, 18, 22],
  [37, 18, 22],
  [38, 18, 21],
  [39, 18, 21],
  [40, 18, 21],
  [41, 18, 20],
  [42, 18, 20],
  [43, 17, 20],
  [44, 17, 20],
  [45, 16, 20],
  [46, 15, 20],
];
const LEG_R: [number, number, number][] = [
  [33, 25, 30],
  [34, 25, 29],
  [35, 25, 29],
  [36, 25, 29],
  [37, 25, 28],
  [38, 26, 28],
  [39, 26, 28],
  [40, 26, 28],
  [41, 26, 28],
  [42, 26, 28],
  [43, 26, 28],
  [44, 26, 28],
  [45, 26, 29],
  [46, 26, 30],
];

/** Силуэт торса [y, x0, x1]: по нему же фигура меняет объём (см. shapeBody). */
const TORSO: [number, number, number][] = [
  [17, 20, 27],
  [18, 17, 30],
  [19, 16, 31],
  [20, 16, 31],
  [21, 16, 31],
  [22, 17, 30],
  [23, 18, 29],
  [24, 19, 28],
  [25, 20, 27],
  [26, 20, 27],
  [27, 19, 28],
  [28, 18, 29],
  [29, 17, 30],
  [30, 17, 30],
  [31, 17, 30],
  [32, 18, 30],
];

/** Нога с y0 по y1 материалом m (чулки, сапоги, поножи). */
function legs(c: Canvas, y0: number, y1: number, m: string, t: Tone = '0', which: 'both' | 'L' | 'R' = 'both') {
  for (const [rows, side] of [
    [LEG_L, 'L'],
    [LEG_R, 'R'],
  ] as const) {
    if (which !== 'both' && which !== side) continue;
    for (const [y, x0, x1] of rows) if (y >= y0 && y <= y1) c.hl(x0, x1, y, m, t);
  }
}

function drawBody(c: Canvas, withLegs: boolean) {
  // лицо: взрослый овал с узким подбородком
  c.rows(
    [
      [5, 20, 27],
      [6, 19, 28],
      [7, 18, 29],
      [8, 18, 29],
      [9, 18, 29],
      [10, 18, 29],
      [11, 18, 29],
      [12, 19, 28],
      [13, 20, 27],
      [14, 21, 26],
      [15, 22, 25],
    ],
    'S',
  );
  c.set(18, 11, 'S', '-');
  c.set(29, 11, 'S', '-');
  // шея
  c.rect(22, 15, 25, 17, 'S');
  c.hl(22, 25, 16, 'S', '-');
  // руки — под торсом, плечо перекрывает сустав
  for (const side of ['L', 'R'] as const) {
    const A = arms[side];
    const ac = armCanvas(c, side);
    limb(ac, A.shoulder, A.elbow, 'S', '0', 3);
    limb(ac, A.elbow, A.hand, 'S');
    ac.rect(A.hand[0] - 1, A.hand[1] - 1, A.hand[0], A.hand[1], 'S');
  }
  // торс: плечи, грудь, тонкая талия, широкие бёдра
  c.rows(TORSO, 'S');
  // ключицы, объём груди, ложбинка, пупок
  c.set(21, 18, 'S', '-');
  c.set(26, 18, 'S', '-');
  c.set(19, 19, 'S', '+');
  c.set(27, 19, 'S', '+');
  c.hl(18, 22, 22, 'S', '-');
  c.hl(25, 29, 22, 'S', '-');
  c.set(24, 20, 'S', '-');
  c.set(23, 21, 'S', '=');
  c.set(24, 21, 'S', '=');
  c.set(24, 27, 'S', '-');
  if (!withLegs) return;
  c.rows(LEG_L, 'S');
  c.rows(LEG_R, 'S');
  c.vl(23, 33, 35, 'S', '-');
  c.vl(25, 33, 35, 'S', '-');
  c.set(19, 38, 'S', '+');
  c.set(26, 38, 'S', '+');
}

// ——— объём фигуры ———

/** Насколько раздвинуть строку торса в каждую сторону: грудь (−1…2). */
const BUST_ROWS: Record<number, Record<number, number>> = {
  [-1]: { 19: -1, 20: -1, 21: -1 },
  1: { 19: 1, 20: 1, 21: 1, 22: 1 },
  2: { 19: 1, 20: 2, 21: 2, 22: 1 },
};
/** Бёдра (0…2): торс и внешняя сторона ног. */
const HIP_ROWS: Record<number, { torso: Record<number, number>; legs: Record<number, number> }> = {
  1: { torso: { 28: 1, 29: 1, 30: 1, 31: 1, 32: 1 }, legs: { 33: 1, 34: 1, 35: 1, 36: 1 } },
  2: { torso: { 27: 1, 28: 1, 29: 2, 30: 2, 31: 2, 32: 2 }, legs: { 33: 2, 34: 2, 35: 1, 36: 1, 37: 1 } },
};

/**
 * Меняет объём уже одетой фигуры: строки торса раздвигаются от середины (или сдвигаются к ней), ноги —
 * наружу от своей оси. Одежда двигается вместе с телом, поэтому покрытие не меняется и дыр не бывает:
 * освободившиеся пиксели заполняются соседом-одеждой или тем, что было позади тела (волосы, крылья).
 */
function shapeBody(c: Canvas, under: string[], bust: number, hips: number, withLegs: boolean) {
  const rowsD = new Map<number, number>();
  for (const [y, d] of Object.entries(BUST_ROWS[bust] ?? {})) rowsD.set(Number(y), d);
  const hp = HIP_ROWS[hips];
  for (const [y, d] of Object.entries(hp?.torso ?? {})) rowsD.set(Number(y), d);
  const W = c.w;
  for (const [y, x0, x1] of TORSO) {
    const d = rowsD.get(y) ?? 0;
    if (!d) continue;
    const old = c.g.slice(y * W, y * W + W);
    const put = (x: number, v: string) => {
      if (x >= 0 && x < W) c.g[y * W + x] = v;
    };
    if (d > 0) {
      for (let x = x0; x <= 23; x++) put(x - d, old[x]);
      for (let x = 24 - d; x <= 23; x++) put(x, old[23]);
      for (let x = x1; x >= 24; x--) put(x + d, old[x]);
      for (let x = 24; x <= 23 + d; x++) put(x, old[24]);
    } else {
      const k = -d;
      const fill = (p: number, nb: number) => {
        const o = old[nb] ?? '';
        put(p, o && o !== under[y * W + nb] ? o : under[y * W + p]);
      };
      for (let x = 23 - k; x >= x0; x--) put(x + k, old[x]);
      for (let x = 24 + k; x <= x1; x++) put(x - k, old[x]);
      for (let p = x0; p < x0 + k; p++) fill(p, x0 - 1);
      for (let p = x1 - k + 1; p <= x1; p++) fill(p, x1 + 1);
    }
  }
  if (!withLegs || !hp) return;
  for (const [rows, side] of [
    [LEG_L, 'L'],
    [LEG_R, 'R'],
  ] as const)
    for (const [y, x0, x1] of rows) {
      const d = hp.legs[y] ?? 0;
      if (!d) continue;
      const old = c.g.slice(y * W, y * W + W);
      const put = (x: number, v: string) => {
        if (x >= 0 && x < W) c.g[y * W + x] = v;
      };
      if (side === 'L') {
        const cl = Math.floor((x0 + x1) / 2);
        for (let x = x0; x <= cl; x++) put(x - d, old[x]);
        for (let x = cl - d + 1; x <= cl; x++) put(x, old[cl]);
      } else {
        const cr = Math.ceil((x0 + x1) / 2);
        for (let x = x1; x >= cr; x--) put(x + d, old[x]);
        for (let x = cr; x < cr + d; x++) put(x, old[cr]);
      }
    }
}

// ——— лицо ———

function eye(c: Canvas, x0: number, flip: boolean, state: 'open' | 'half' | 'closed') {
  const outer = flip ? x0 + 2 : x0;
  const inner = flip ? x0 : x0 + 2;
  const wing = flip ? x0 + 3 : x0 - 1;
  if (state === 'closed') {
    // закрытый глаз — дуга ресниц
    c.hl(x0, x0 + 2, 10, 'l');
    c.set(wing, 9, 'l');
    c.set(x0 + 1, 11, 'S', '-');
    return;
  }
  if (state === 'half') {
    // томный полуприкрытый взгляд
    c.hl(x0, x0 + 2, 9, 'S', '-');
    c.hl(x0, x0 + 2, 10, 'l');
    c.set(wing, 10, 'l');
    c.set(outer, 11, 'E', '=');
    c.set(x0 + 1, 11, 'E', '-');
    c.set(inner, 11, 'E', '+');
    return;
  }
  c.hl(x0, x0 + 2, 9, 'l');
  c.set(wing, 8, 'l');
  c.set(outer, 10, 'E', '=');
  c.set(x0 + 1, 10, 'E', '-');
  c.set(inner, 10, 'E', '+');
  c.set(outer, 11, 'E', '0');
  c.set(x0 + 1, 11, 'E', '0');
  c.set(inner, 11, 'E', '-');
}

function drawFace(c: Canvas, eyes: Eyes) {
  const left = eyes === 'wink' ? 'open' : eyes;
  const right = eyes === 'wink' ? 'closed' : eyes;
  eye(c, 19, false, left);
  eye(c, 26, true, right);
  // брови
  c.hl(19, 21, 7, 'H', '-');
  c.hl(26, 28, 7, 'H', '-');
  // румянец, нос, губы
  c.hl(19, 20, 12, 'P');
  c.hl(27, 28, 12, 'P');
  c.set(24, 11, 'S', '-');
  c.set(23, 13, 'M');
  c.set(24, 13, 'M', '+');
  if (eyes === 'wink') c.set(25, 13, 'M', '-');
}

// ——— волосы ———

function hairTop(c: Canvas) {
  c.rows(
    [
      [1, 21, 26],
      [2, 19, 28],
      [3, 18, 29],
      [4, 17, 30],
      [5, 17, 30],
      [6, 17, 30],
    ],
    'H',
  );
  // кончики чёлки
  c.rows(
    [
      [7, 17, 18],
      [7, 21, 22],
      [7, 25, 25],
      [7, 29, 30],
      [8, 17, 17],
      [8, 30, 30],
    ],
    'H',
  );
  c.set(20, 6, 'H', '-');
  c.set(23, 6, 'H', '-');
  c.set(27, 6, 'H', '-');
  // блик-кольцо
  for (let x = 20; x <= 27; x++) if (x % 2 === 0) c.set(x, 3, 'H', '+');
  c.hl(21, 23, 2, 'H', '+');
  // пряди вдоль лица
  c.vl(17, 7, 13, 'H');
  c.vl(16, 5, 11, 'H');
  c.vl(30, 7, 13, 'H');
  c.vl(31, 5, 11, 'H');
  c.set(17, 14, 'H', '-');
  c.set(30, 14, 'H', '-');
}

function drawHairBack(c: Canvas, style: Look['style']) {
  const cap: P[] = [
    [16, 3],
    [31, 3],
    [32, 9],
    [15, 9],
  ];
  switch (style) {
    case 'long':
      c.poly(
        [
          [16, 3],
          [31, 3],
          [34, 16],
          [35, 30],
          [33, 34],
          [14, 34],
          [12, 30],
          [13, 16],
        ],
        'H',
      );
      c.line(14, 18, 13, 30, 'H', '-');
      c.line(33, 18, 34, 30, 'H', '-');
      break;
    case 'bob':
      c.poly(
        [
          [16, 3],
          [31, 3],
          [33, 10],
          [32, 15],
          [15, 15],
          [14, 10],
        ],
        'H',
      );
      break;
    case 'short':
      c.poly(
        [
          [16, 3],
          [31, 3],
          [32, 9],
          [30, 12],
          [17, 12],
          [15, 9],
        ],
        'H',
      );
      break;
    case 'ponytail':
      c.poly(cap, 'H');
      c.poly(
        [
          [30, 3],
          [35, 4],
          [37, 10],
          [37, 20],
          [35, 27],
          [33, 29],
          [34, 21],
          [33, 12],
          [30, 7],
        ],
        'H',
      );
      c.line(35, 10, 35, 22, 'H', '-');
      c.rect(30, 4, 31, 5, 'T');
      break;
    case 'twintails':
      c.poly(cap, 'H');
      for (const s of [-1, 1]) {
        const cx = s < 0 ? 13 : 34;
        c.poly(
          [
            [cx - s, 4],
            [cx + 3 * s, 6],
            [cx + 4 * s, 14],
            [cx + 3 * s, 24],
            [cx + s, 29],
            [cx, 24],
            [cx + s, 14],
          ],
          'H',
        );
        c.set(cx + (s < 0 ? 1 : -1), 4, 'T');
        c.set(cx + (s < 0 ? 2 : -2), 5, 'T');
      }
      break;
    case 'braid':
      c.poly(
        [
          [16, 3],
          [31, 3],
          [32, 11],
          [15, 11],
        ],
        'H',
      );
      for (let y = 12; y <= 30; y += 2) {
        c.hl(13, 15, y, 'H');
        c.hl(13, 15, y + 1, 'H', '-');
      }
      c.rect(13, 31, 15, 32, 'T');
      break;
    case 'bun':
      c.poly(cap, 'H');
      c.ellipse(24, 1, 4, 2.2, 'H');
      c.hl(22, 24, 0, 'H', '+');
      break;
    case 'wild':
      c.poly(
        [
          [13, 2],
          [34, 2],
          [37, 10],
          [35, 16],
          [37, 22],
          [33, 28],
          [30, 22],
          [17, 22],
          [14, 28],
          [10, 22],
          [12, 16],
          [10, 10],
        ],
        'H',
      );
      break;
  }
}

// ——— детали нарядов ———

/**
 * Верх:
 * 'micro' — треугольнички на завязках, 'balconette' — полукружевные чашки (верх груди открыт),
 * 'bandeau' — узкая полоска поперёк груди, 'plunge' — V-вырез до пупка (монокини).
 */
function bust(c: Canvas, m: string, style: 'micro' | 'balconette' | 'bandeau' | 'plunge', t: Tone = '0') {
  if (style === 'micro') {
    c.rows(
      [
        [19, 19, 20],
        [20, 18, 21],
        [21, 17, 22],
        [22, 18, 22],
        [19, 27, 28],
        [20, 26, 29],
        [21, 25, 30],
        [22, 25, 29],
      ],
      m,
      t,
    );
    c.set(19, 19, m, '+');
    c.set(27, 19, m, '+');
    c.hl(18, 21, 22, m, '-');
    c.hl(26, 29, 22, m, '-');
    // завязки: на шею, между чашками и по бокам
    c.line(20, 18, 22, 16, m, '-');
    c.line(27, 18, 25, 16, m, '-');
    c.hl(23, 24, 21, m, '-');
    c.hl(16, 17, 21, m, '-');
    c.hl(30, 31, 21, m, '-');
    return;
  }
  if (style === 'balconette') {
    c.rows(
      [
        [20, 16, 22],
        [21, 16, 22],
        [22, 17, 22],
        [20, 25, 31],
        [21, 25, 31],
        [22, 25, 30],
      ],
      m,
      t,
    );
    c.hl(23, 24, 22, m, '-');
    // кружевная кромка
    for (let x = 16; x <= 31; x++) if (x < 23 || x > 24) c.set(x, 20, m, x % 2 ? '+' : '0');
    c.vl(19, 18, 19, m, '-');
    c.vl(28, 18, 19, m, '-');
    return;
  }
  if (style === 'bandeau') {
    c.rows(
      [
        [20, 16, 31],
        [21, 16, 31],
      ],
      m,
      t,
    );
    c.hl(17, 22, 20, m, '+');
    c.hl(25, 30, 20, m, '+');
    c.hl(23, 24, 21, m, '=');
    return;
  }
  // монокини с вырезом до пупка: две полосы ткани по груди, сходятся на животе
  c.rows(
    [
      [19, 16, 19],
      [20, 16, 20],
      [21, 17, 21],
      [22, 18, 21],
      [19, 28, 31],
      [20, 27, 31],
      [21, 26, 30],
      [22, 26, 29],
    ],
    m,
    t,
  );
  c.path(
    [
      [20, 23],
      [23, 26],
      [23, 28],
    ],
    m,
    t,
  );
  c.path(
    [
      [27, 23],
      [24, 26],
      [24, 28],
    ],
    m,
    t,
  );
}

/** Низ-стринги: высокие боковые завязки и узкий треугольник спереди. */
function stringBottom(c: Canvas, m: string, t: Tone = '0', ties = m) {
  c.rows(
    [
      [29, 20, 27],
      [30, 21, 26],
      [31, 22, 25],
      [32, 23, 24],
    ],
    m,
    t,
  );
  c.line(17, 27, 20, 29, ties, '-');
  c.line(27, 29, 30, 27, ties, '-');
}

/** Чулки до бедра: полоса-резинка сверху, подвязки к поясу. */
function stockings(c: Canvas, top: number, m: string, band: string, garterFrom = 0, which: 'both' | 'L' | 'R' = 'both') {
  legs(c, top, 44, m, '0', which);
  legs(c, top, top, band, '0', which);
  if (garterFrom) {
    if (which !== 'R') c.vl(19, garterFrom, top - 1, band, '-');
    if (which !== 'L') c.vl(29, garterFrom, top - 1, band, '-');
  }
}

/** Сетка поверх ног (чулки-сетка). */
function fishnet(c: Canvas, y0: number, y1: number, m: string) {
  for (const rows of [LEG_L, LEG_R])
    for (const [y, x0, x1] of rows) if (y >= y0 && y <= y1) for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) c.set(x, y, m);
}

// ——— наряды: максимум открытой кожи, всё нужное прикрыто ———

function outfit(c: Canvas, kind: OutfitKind, withLegs: boolean) {
  switch (kind) {
    case 'knight': {
      // латное микро-бикини: наплечники, чашки-пластины, золотая цепь, узкий табард, поножи
      c.ellipse(15, 18, 3, 2, 'K');
      c.ellipse(32, 18, 3, 2, 'K');
      c.hl(13, 16, 17, 'K', '+');
      c.hl(31, 34, 17, 'K', '+');
      bust(c, 'K', 'micro');
      c.line(20, 18, 22, 16, 'T');
      c.line(27, 18, 25, 16, 'T');
      c.hl(23, 24, 21, 'T');
      c.set(24, 22, 'G', '+');
      stringBottom(c, 'K', '0', 'T');
      c.set(23, 29, 'T', '+');
      c.set(24, 29, 'T', '+');
      c.rect(23, 30, 24, 38, 'O');
      c.hl(23, 24, 38, 'T');
      bothArms(c, 'fore', 'K');
      bothArms(c, 'hand', 'K');
      if (withLegs) {
        legs(c, 39, 46, 'K');
        legs(c, 39, 39, 'T');
        c.rect(19, 40, 20, 41, 'K', '+');
        c.rect(26, 40, 27, 41, 'K', '+');
      }
      break;
    }
    case 'barbarian': {
      // бикини из шкуры (яркая ткань с меховой каймой), костяное ожерелье, узкая повязка
      bust(c, 'B', 'micro');
      c.hl(18, 21, 20, 'R', '-');
      c.hl(26, 29, 20, 'R', '-');
      c.set(19, 19, 'R', '+');
      c.set(20, 19, 'R');
      c.set(27, 19, 'R');
      c.set(28, 19, 'R', '+');
      c.hl(22, 25, 17, 'R');
      c.set(23, 18, 'R', '+');
      c.set(24, 18, 'R', '+');
      stringBottom(c, 'B', '0', 'R');
      c.hl(20, 27, 29, 'R', '-');
      c.rect(23, 31, 24, 39, 'B', '-');
      c.hl(23, 24, 39, 'R');
      c.hl(12, 14, 24, 'R');
      c.hl(32, 34, 24, 'R');
      bothArms(c, 'hand', 'W');
      if (withLegs) {
        legs(c, 42, 46, 'W');
        legs(c, 41, 41, 'R');
      }
      break;
    }
    case 'ranger': {
      // кожаное микро-бикини, ремень колчана через ложбинку, ботфорты, сумочка на бедре
      bust(c, 'B', 'micro');
      c.line(20, 17, 30, 29, 'W', '-');
      c.set(25, 22, 'T', '+');
      stringBottom(c, 'B', '0', 'W');
      c.line(17, 30, 21, 31, 'W');
      bothArms(c, 'hand', 'W');
      c.hl(12, 14, 25, 'W', '-');
      c.hl(33, 35, 25, 'W', '-');
      if (withLegs) {
        c.hl(18, 23, 34, 'W');
        c.rect(18, 35, 20, 36, 'W', '-');
        legs(c, 37, 46, 'W');
        legs(c, 37, 37, 'W', '+');
        c.set(20, 39, 'T');
        c.set(27, 39, 'T');
      }
      break;
    }
    case 'witch': {
      // бельевой комплект: балконет с кружевом, корсет-пояс, стринги, чулки с подвязками,
      // полы мантии только по бокам — спереди всё открыто
      bust(c, 'B', 'balconette');
      c.rows(
        [
          [24, 19, 28],
          [25, 20, 27],
          [26, 20, 27],
          [27, 19, 28],
        ],
        'O',
      );
      for (let y = 24; y <= 27; y++) c.set(24, y, 'T', y % 2 ? '+' : '0');
      c.hl(18, 29, 28, 'T');
      stringBottom(c, 'B');
      c.poly(
        [
          [18, 27],
          [20, 27],
          [16, 46],
          [12, 46],
        ],
        'O',
      );
      c.poly(
        [
          [28, 27],
          [30, 27],
          [36, 46],
          [32, 46],
        ],
        'O',
      );
      c.hl(12, 16, 46, 'T');
      c.hl(32, 36, 46, 'T');
      bothArms(c, 'fore', 'O');
      if (withLegs) {
        stockings(c, 34, 'F', 'T', 29);
        legs(c, 45, 46, 'W', '-');
      }
      break;
    }
    case 'cleric': {
      // белое монокини с вырезом до пупка, узкая священная лента спереди, белые чулки
      bust(c, 'R', 'plunge');
      // окантовка выреза, чтобы белая ткань читалась на светлой коже
      c.path(
        [
          [19, 18],
          [21, 21],
          [21, 22],
          [23, 25],
        ],
        'T',
      );
      c.path(
        [
          [28, 18],
          [26, 21],
          [26, 22],
          [24, 25],
        ],
        'T',
      );
      c.line(19, 18, 22, 16, 'T');
      c.line(28, 18, 25, 16, 'T');
      c.set(23, 27, 'G', '+');
      c.set(24, 27, 'G', '+');
      stringBottom(c, 'R', '0', 'T');
      c.hl(20, 27, 29, 'T');
      c.rect(23, 30, 24, 44, 'R');
      c.vl(22, 31, 44, 'T', '-');
      c.vl(25, 31, 44, 'T', '-');
      c.hl(22, 25, 44, 'T');
      bothArms(c, 'hand', 'T', '-');
      if (withLegs) {
        stockings(c, 36, 'R', 'T', 30);
        c.rect(15, 45, 20, 46, 'T', '-');
        c.rect(26, 45, 30, 46, 'T', '-');
      }
      break;
    }
    case 'reaper': {
      // чёрное бельё с портупеей: чокер, микро-чашки, ремни, пояс для чулок, сетка, шлейф сзади
      c.hl(22, 25, 16, 'D');
      c.set(24, 16, 'G', '+');
      c.poly(
        [
          [17, 27],
          [19, 27],
          [14, 46],
          [11, 46],
        ],
        'O',
      );
      c.poly(
        [
          [29, 27],
          [31, 27],
          [37, 46],
          [34, 46],
        ],
        'O',
      );
      bust(c, 'D', 'micro');
      c.hl(18, 29, 23, 'D');
      c.vl(24, 24, 28, 'D');
      c.hl(18, 29, 28, 'D', '+');
      c.set(24, 25, 'G', '+');
      stringBottom(c, 'D');
      bothArms(c, 'fore', 'D');
      bothArms(c, 'hand', 'D');
      if (withLegs) {
        fishnet(c, 34, 44, 'D');
        legs(c, 33, 33, 'D', '+');
        c.vl(19, 29, 32, 'D');
        c.vl(29, 29, 32, 'D');
        legs(c, 45, 46, 'D');
      }
      break;
    }
    case 'rogue': {
      // бандо и стринги, ремни крест-накрест по животу, кинжал на бедре, ботфорты
      c.hl(21, 26, 15, 'A');
      c.hl(20, 27, 16, 'A', '-');
      bust(c, 'B', 'bandeau');
      c.line(21, 19, 22, 17, 'O', '-');
      c.line(26, 19, 25, 17, 'O', '-');
      c.line(18, 23, 29, 29, 'W', '-');
      c.line(29, 23, 18, 29, 'W', '-');
      c.set(24, 26, 'T', '+');
      stringBottom(c, 'B', '0', 'W');
      bothArms(c, 'fore', 'O', '-');
      if (withLegs) {
        c.hl(18, 23, 35, 'W');
        c.rect(15, 34, 16, 40, 'K', '-');
        legs(c, 38, 46, 'F');
        legs(c, 38, 38, 'W');
        legs(c, 45, 46, 'W', '-');
      }
      break;
    }
    case 'minstrel': {
      // спущенные рукава-фонарики, балконет с оборкой, короткий корсет, микро-юбка, чулки
      c.ellipse(15, 21, 2.6, 2, 'R');
      c.ellipse(32, 21, 2.6, 2, 'R');
      bust(c, 'R', 'balconette');
      c.rows(
        [
          [23, 18, 29],
          [24, 19, 28],
        ],
        'O',
      );
      c.set(24, 23, 'T', '+');
      c.set(24, 24, 'T');
      c.poly(
        [
          [18, 28],
          [30, 28],
          [33, 32],
          [15, 32],
        ],
        'O',
      );
      c.hl(15, 33, 32, 'T');
      c.hl(16, 32, 33, 'R', '-');
      if (withLegs) {
        stockings(c, 37, 'F', 'T', 34);
        legs(c, 44, 46, 'W');
      }
      break;
    }
  }
}

// ——— сменные наряды обликов: купальники и бельё ———

function wearOutfit(c: Canvas, wear: NonNullable<Look['wear']>, withLegs: boolean) {
  const sandals = () => {
    if (!withLegs) return;
    legs(c, 46, 46, 'W');
    c.set(20, 45, 'W', '-');
    c.set(27, 45, 'W', '-');
  };
  switch (wear) {
    case 'swim': {
      // бикини на завязках и парео, завязанное на бедре
      bust(c, 'B', 'micro');
      stringBottom(c, 'B');
      c.poly(
        [
          [17, 28],
          [21, 29],
          [22, 39],
          [15, 42],
        ],
        'T',
      );
      c.line(17, 28, 15, 42, 'T', '-');
      c.rect(17, 28, 18, 29, 'T', '+');
      c.set(16, 30, 'T', '-');
      sandals();
      break;
    }
    case 'swim2': {
      // бикини с оборками и бантиком
      bust(c, 'B', 'balconette');
      for (let x = 16; x <= 31; x++) if (x < 23 || x > 24) c.set(x, 23, 'T', x % 2 ? '+' : '0');
      c.set(23, 22, 'T', '+');
      c.set(24, 22, 'T', '+');
      stringBottom(c, 'B');
      for (let x = 19; x <= 28; x++) c.set(x, 29, 'T', x % 2 ? '+' : '0');
      c.set(23, 30, 'T', '+');
      c.set(24, 30, 'T', '+');
      if (withLegs) legs(c, 43, 43, 'T', '+');
      sandals();
      break;
    }
    case 'swim3': {
      // монокини: V до пупка, высокие вырезы на бёдрах, кольцо-застёжка
      bust(c, 'B', 'plunge');
      c.rows([[28, 21, 26]], 'B');
      stringBottom(c, 'B');
      c.set(23, 26, 'T', '+');
      c.set(24, 26, 'T', '+');
      c.line(19, 18, 22, 16, 'B', '-');
      c.line(28, 18, 25, 16, 'B', '-');
      sandals();
      break;
    }
    case 'swim4': {
      // бандо, стринги и распахнутая пляжная рубашка
      bust(c, 'B', 'bandeau');
      stringBottom(c, 'B');
      bothArms(c, 'upper', 'T');
      c.poly(
        [
          [16, 18],
          [20, 18],
          [19, 31],
          [15, 31],
        ],
        'T',
      );
      c.poly(
        [
          [27, 18],
          [31, 18],
          [32, 31],
          [28, 31],
        ],
        'T',
      );
      c.line(20, 18, 19, 30, 'T', '-');
      c.line(27, 18, 28, 30, 'T', '-');
      c.set(21, 17, 'T', '+');
      c.set(26, 17, 'T', '+');
      sandals();
      break;
    }
    case 'lace': {
      // кружевной балконет, пояс для чулок, стринги, чулки, чокер с бантиком
      c.hl(22, 25, 16, 'B');
      c.set(24, 17, 'T', '+');
      bust(c, 'B', 'balconette');
      c.rows(
        [
          [27, 19, 28],
          [28, 18, 29],
        ],
        'B',
      );
      for (let x = 18; x <= 29; x++) c.set(x, 28, 'B', x % 2 ? '+' : '0');
      stringBottom(c, 'B');
      if (withLegs) {
        stockings(c, 34, 'F', 'B', 29);
        for (let x = 17; x <= 30; x++) if (x % 2 === 0) c.set(x, 35, 'B', '+');
        legs(c, 45, 46, 'B', '-');
      }
      break;
    }
    case 'lace2': {
      // бэби-долл: чашки и распахнутые полы до бёдер, бант под грудью
      bust(c, 'B', 'balconette');
      // полы расходятся от центра под грудью — живот и бёдра открыты
      c.poly(
        [
          [16, 22],
          [22, 23],
          [17, 32],
          [12, 33],
        ],
        'B',
        '-',
      );
      c.poly(
        [
          [25, 23],
          [31, 22],
          [35, 33],
          [30, 32],
        ],
        'B',
        '-',
      );
      c.line(12, 33, 17, 32, 'B', '+');
      c.line(30, 32, 35, 33, 'B', '+');
      c.rect(23, 23, 24, 23, 'T', '+');
      c.set(22, 24, 'T');
      c.set(25, 24, 'T');
      stringBottom(c, 'B');
      if (withLegs) legs(c, 46, 46, 'B');
      break;
    }
    case 'lace3': {
      // боди с вырезом до пупка, длинные перчатки, чулки с подвязками
      bust(c, 'B', 'plunge');
      c.rows([[28, 20, 27]], 'B');
      stringBottom(c, 'B');
      c.line(19, 18, 22, 16, 'B', '-');
      c.line(28, 18, 25, 16, 'B', '-');
      bothArms(c, 'fore', 'B');
      bothArms(c, 'hand', 'B');
      if (withLegs) {
        stockings(c, 35, 'B', 'T', 29);
        legs(c, 45, 46, 'B', '-');
      }
      break;
    }
    case 'dancer': {
      // наряд танцовщицы: чашечки с монетками, ожерелье, низкий пояс с бахромой, узкая
      // передняя лента, браслеты на руках и ногах — всё в золоте
      c.hl(21, 26, 16, 'T');
      c.set(23, 17, 'G', '+');
      c.set(24, 17, 'G', '+');
      bust(c, 'B', 'micro');
      for (let x = 17; x <= 30; x++) if (x < 23 || x > 24) if (x % 2 === 0) c.set(x, 23, 'T', '+');
      c.set(23, 22, 'G', '+');
      // цепочка на животе
      c.path(
        [
          [19, 26],
          [24, 28],
          [29, 26],
        ],
        'T',
        '+',
      );
      stringBottom(c, 'B');
      c.hl(17, 30, 29, 'T');
      for (let x = 17; x <= 30; x++) if (x % 2) c.set(x, 30, 'T', '+');
      c.rect(23, 31, 24, 44, 'B', '-');
      c.set(23, 44, 'T', '+');
      c.set(24, 44, 'T', '+');
      for (const side of ['L', 'R'] as const) {
        const A = arms[side];
        const bx = Math.round(A.elbow[0] + (A.hand[0] - A.elbow[0]) * 0.6);
        const by = Math.round(A.elbow[1] + (A.hand[1] - A.elbow[1]) * 0.6);
        c.set(bx, by, 'T', '+');
        c.set(bx - 1, by, 'T');
        const ux = Math.round((A.shoulder[0] + A.elbow[0]) / 2);
        const uy = Math.round((A.shoulder[1] + A.elbow[1]) / 2);
        c.set(ux, uy, 'T', '+');
      }
      if (withLegs) legs(c, 44, 44, 'T', '+');
      break;
    }
    case 'regalia': {
      // регалии Вестницы: золотой горжет, наплечники-крылья, металлические чашки,
      // пластина-стринги, латные перчатки и ботфорты
      c.hl(20, 27, 16, 'T');
      c.hl(21, 26, 17, 'T', '-');
      c.ellipse(15, 18, 3.2, 2.2, 'B');
      c.ellipse(32, 18, 3.2, 2.2, 'B');
      c.hl(12, 16, 16, 'T', '+');
      c.hl(31, 35, 16, 'T', '+');
      bust(c, 'B', 'micro');
      c.set(20, 19, 'T', '+');
      c.set(27, 19, 'T', '+');
      c.set(23, 21, 'G', '+');
      c.set(24, 21, 'G', '+');
      stringBottom(c, 'B', '0', 'T');
      c.rect(22, 29, 25, 31, 'B');
      c.hl(22, 25, 29, 'T', '+');
      c.set(23, 30, 'G', '+');
      bothArms(c, 'fore', 'K');
      bothArms(c, 'hand', 'K');
      if (withLegs) {
        legs(c, 37, 46, 'K');
        legs(c, 37, 37, 'T', '+');
        c.rect(19, 39, 20, 40, 'T');
        c.rect(26, 39, 27, 40, 'T');
      }
      break;
    }
    case 'bunny': {
      // «кролик»: корсетное боди без бретелей, высокие вырезы на бёдрах, воротничок с бабочкой,
      // манжеты на запястьях, колготки-сетка и каблуки
      c.hl(21, 26, 16, 'R');
      c.hl(22, 25, 17, 'B');
      c.set(23, 17, 'B', '+');
      c.set(24, 17, 'B', '+');
      c.rows(
        [
          [20, 16, 22],
          [21, 16, 22],
          [22, 17, 22],
          [20, 25, 31],
          [21, 25, 31],
          [22, 25, 30],
          [23, 18, 29],
          [24, 19, 28],
          [25, 20, 27],
          [26, 20, 27],
          [27, 19, 28],
          [28, 19, 28],
        ],
        'B',
      );
      for (let x = 16; x <= 31; x++) if (x < 23 || x > 24) c.set(x, 20, 'B', '+');
      c.hl(23, 24, 22, 'B', '-');
      for (let y = 23; y <= 27; y += 2) {
        c.set(23, y, 'T', '+');
        c.set(24, y + 1, 'T', '+');
      }
      stringBottom(c, 'B');
      // колготки видны и на бёдрах по бокам от выреза
      for (let y = 29; y <= 32; y++) for (let x = 17; x <= 30; x++) if ((x < 21 - (y - 29) || x > 26 + (y - 29)) && (x + y) % 2 === 0) c.set(x, y, 'F');
      for (const side of ['L', 'R'] as const) {
        const A = arms[side];
        const bx = Math.round(A.elbow[0] + (A.hand[0] - A.elbow[0]) * 0.8);
        const by = Math.round(A.elbow[1] + (A.hand[1] - A.elbow[1]) * 0.8);
        c.set(bx, by, 'R', '+');
        c.set(bx - 1, by, 'R');
      }
      if (withLegs) {
        fishnet(c, 33, 44, 'F');
        legs(c, 45, 46, 'B');
        c.set(20, 45, 'B', '-');
        c.set(27, 45, 'B', '-');
      }
      break;
    }
    case 'maid': {
      // «горничная»: чокер с бантом, балконет с белой оборкой, корсет под грудью, крошечный
      // фартук-оборка поверх стрингов, чулки с белой кружевной резинкой и подвязками
      c.hl(22, 25, 16, 'R');
      c.set(23, 17, 'O', '+');
      c.set(24, 17, 'O', '+');
      bust(c, 'O', 'balconette');
      for (let x = 16; x <= 31; x++) if (x < 23 || x > 24) if (x % 2) c.set(x, 19, 'R', '+');
      c.rows(
        [
          [23, 18, 29],
          [24, 19, 28],
          [25, 20, 27],
        ],
        'O',
      );
      c.set(23, 23, 'R', '+');
      c.set(24, 24, 'R', '+');
      c.set(23, 25, 'R', '+');
      stringBottom(c, 'O');
      c.hl(19, 28, 28, 'O', '-');
      c.rect(21, 29, 26, 31, 'R');
      for (let x = 21; x <= 26; x++) c.set(x, 32, 'R', x % 2 ? '+' : '-');
      c.set(20, 28, 'R', '+');
      c.set(27, 28, 'R', '+');
      if (withLegs) {
        stockings(c, 36, 'F', 'R', 29);
        legs(c, 45, 46, 'O');
      }
      break;
    }
    case 'yukata': {
      // короткая летняя юката: глубокий запах до пояса, широкий оби с бантом, рукава, гэта
      c.rows(
        [
          [18, 17, 30],
          [19, 16, 31],
          [20, 16, 31],
          [21, 16, 31],
          [22, 17, 30],
          [23, 18, 29],
          [24, 19, 28],
          [25, 20, 27],
          [26, 20, 27],
          [27, 19, 28],
          [28, 18, 29],
          [29, 17, 30],
          [30, 17, 30],
          [31, 17, 30],
          [32, 18, 30],
        ],
        'O',
      );
      // вырез-запах: открытая ложбинка до оби
      for (let y = 18; y <= 24; y++) {
        const w = Math.max(0, 3 - Math.floor((y - 18) / 2));
        c.hl(24 - w - 1, 23 + w + 1, y, 'S');
      }
      c.set(24, 20, 'S', '-');
      c.set(23, 21, 'S', '=');
      c.set(24, 21, 'S', '=');
      c.line(20, 18, 23, 24, 'T');
      c.line(27, 18, 24, 24, 'T');
      // оби и бант сбоку
      c.rect(18, 25, 29, 27, 'T');
      c.hl(18, 29, 26, 'T', '-');
      c.set(28, 24, 'T', '+');
      c.set(29, 25, 'T', '+');
      c.set(30, 26, 'T', '+');
      // складки и цветочный узор
      c.vl(21, 28, 32, 'O', '-');
      c.vl(27, 28, 32, 'O', '-');
      for (const [x, y] of [
        [18, 20],
        [29, 21],
        [19, 30],
        [28, 31],
      ])
        c.set(x, y, 'T', '+');
      bothArms(c, 'upper', 'O');
      if (withLegs) {
        // подол до середины бедра
        c.rows(
          [
            [33, 18, 30],
            [34, 18, 29],
            [35, 18, 29],
            [36, 18, 29],
          ],
          'O',
        );
        c.hl(18, 29, 37, 'T');
        c.set(24, 34, 'O', '-');
        c.set(24, 35, 'O', '-');
        c.set(20, 35, 'T', '+');
        legs(c, 46, 46, 'W');
        c.set(20, 45, 'T');
        c.set(27, 45, 'T');
      }
      break;
    }
    case 'gown': {
      // вечернее платье: вырез до пупка, открытые плечи, высокий разрез по правой ноге, каблуки
      bust(c, 'O', 'plunge');
      c.line(20, 18, 22, 16, 'O', '-');
      c.line(27, 18, 25, 16, 'O', '-');
      c.rows(
        [
          [27, 19, 22],
          [27, 25, 28],
          [28, 18, 29],
          [29, 17, 30],
          [30, 17, 30],
          [31, 17, 30],
          [32, 18, 30],
        ],
        'O',
      );
      c.set(20, 29, 'T', '+');
      c.set(27, 30, 'T', '+');
      c.set(23, 31, 'T', '+');
      c.hl(19, 28, 28, 'T', '-');
      if (withLegs) {
        // юбка в пол: левая нога закрыта, справа — разрез от бедра
        for (const [y, x0] of LEG_L) if (y <= 45) c.hl(x0 - (y > 40 ? 1 : 0), 24, y, 'O');
        c.line(24, 33, 24, 45, 'O', '-');
        c.line(19, 36, 18, 45, 'O', '-');
        c.hl(15, 24, 45, 'T', '-');
        // каблук на открытой ноге
        legs(c, 45, 46, 'T', '0', 'R');
        c.set(28, 44, 'T', '+');
      }
      break;
    }
    case 'silk': {
      // шёлковая пижама: кружевная камисоль на тонких бретелях, открытый живот, шортики, бант
      c.rows(
        [
          [19, 17, 30],
          [20, 16, 31],
          [21, 16, 31],
          [22, 17, 30],
          [23, 18, 29],
          [24, 19, 28],
          [25, 20, 27],
        ],
        'O',
      );
      c.hl(23, 24, 19, 'S');
      c.set(23, 20, 'S', '=');
      c.set(24, 20, 'S', '=');
      for (let x = 17; x <= 30; x++) if (x < 23 || x > 24) c.set(x, 19, 'T', x % 2 ? '+' : '0');
      for (let x = 20; x <= 27; x++) c.set(x, 25, 'T', x % 2 ? '+' : '0');
      c.vl(19, 17, 18, 'T', '-');
      c.vl(28, 17, 18, 'T', '-');
      c.set(23, 22, 'T', '+');
      c.set(24, 22, 'T', '+');
      // шортики
      c.rows(
        [
          [28, 18, 29],
          [29, 17, 30],
          [30, 17, 30],
          [31, 17, 30],
          [32, 18, 30],
        ],
        'O',
      );
      c.hl(18, 29, 28, 'T');
      c.set(24, 30, 'O', '-');
      c.set(24, 31, 'O', '-');
      if (withLegs) {
        c.hl(18, 23, 33, 'O');
        c.hl(25, 30, 33, 'O');
        c.hl(18, 23, 34, 'T', '+');
        c.hl(25, 30, 34, 'T', '+');
        // тапочки
        legs(c, 46, 46, 'T');
      }
      break;
    }
    case 'lace4': {
      // портупея: микро-чашки, ремешки, чокер с кольцом, подвязки на бёдрах, каблуки
      c.hl(22, 25, 16, 'B');
      c.set(23, 17, 'T', '+');
      c.set(24, 17, 'T', '+');
      bust(c, 'B', 'micro');
      c.hl(18, 29, 23, 'B');
      c.line(20, 23, 21, 28, 'B', '-');
      c.line(27, 23, 26, 28, 'B', '-');
      c.hl(18, 29, 27, 'B', '+');
      stringBottom(c, 'B');
      if (withLegs) {
        c.hl(18, 23, 36, 'B');
        c.hl(25, 30, 36, 'B');
        c.set(19, 37, 'T', '+');
        c.set(29, 37, 'T', '+');
        legs(c, 45, 46, 'B');
      }
      break;
    }
  }
}

// ——— низ монстродевушек ———

function lowerExtra(c: Canvas, extra: Look['extra']): boolean {
  if (extra === 'snake') {
    c.poly(
      [
        [17, 29],
        [30, 29],
        [31, 37],
        [36, 43],
        [42, 46],
        [22, 47],
        [14, 44],
        [16, 37],
      ],
      'A',
    );
    for (let y = 32; y <= 45; y += 2) c.hl(20, 27, y, 'A', '+');
    return true;
  }
  if (extra === 'fishTail') {
    c.poly(
      [
        [17, 29],
        [30, 29],
        [29, 39],
        [26, 43],
        [22, 43],
        [19, 39],
      ],
      'A',
    );
    c.poly(
      [
        [24, 42],
        [31, 47],
        [24, 44],
        [17, 47],
      ],
      'A',
      '-',
    );
    for (let y = 31; y <= 40; y += 2) for (let x = 20 + (y % 4 ? 1 : 0); x <= 28; x += 2) c.set(x, y, 'A', '+');
    return true;
  }
  return false;
}

// ——— спина и перёд ———

function extraBack(c: Canvas, extra: Look['extra'], flap = false) {
  // взмах: чем дальше точка крыла от спины, тем выше она поднимается
  const lift = (x0: number, pts: P[]): P[] => (flap ? pts.map(([x, y]) => [x, y - Math.round(Math.abs(x - x0) / 3.5)] as P) : pts);
  switch (extra) {
    case 'wings':
      for (const s of [-1, 1]) {
        const x0 = 24 + s * 6;
        c.poly(
          lift(x0, [
            [x0, 18],
            [x0 + s * 12, 8],
            [x0 + s * 17, 10],
            [x0 + s * 15, 20],
            [x0 + s * 11, 28],
            [x0 + s * 4, 26],
          ]),
          'Q',
        );
        for (let k = 0; k < 4; k++) {
          const [[ax, ay], [bx, by]] = lift(x0, [
            [x0 + s * (5 + k * 3), 13 + k * 2],
            [x0 + s * (3 + k * 3), 25 - k],
          ]);
          c.line(ax, ay, bx, by, 'Q', '-');
        }
      }
      break;
    case 'darkWings':
      for (const s of [-1, 1]) {
        const x0 = 24 + s * 6;
        c.poly(
          lift(x0, [
            [x0, 18],
            [x0 + s * 10, 6],
            [x0 + s * 18, 7],
            [x0 + s * 16, 14],
            [x0 + s * 18, 20],
            [x0 + s * 13, 22],
            [x0 + s * 12, 28],
            [x0 + s * 7, 25],
          ]),
          'D',
        );
        const [[a1x, a1y], [b1x, b1y], [a2x, a2y], [b2x, b2y]] = lift(x0, [
          [x0 + s, 18],
          [x0 + s * 16, 9],
          [x0 + s * 2, 20],
          [x0 + s * 15, 19],
        ]);
        c.line(a1x, a1y, b1x, b1y, 'D', '+');
        c.line(a2x, a2y, b2x, b2y, 'D', '+');
      }
      break;
    case 'tail':
      // хвост покачивается: во втором кадре кончик уходит ниже и дальше
      c.path(
        flap
          ? [
              [30, 29],
              [35, 32],
              [39, 31],
              [42, 27],
              [44, 26],
            ]
          : [
              [30, 29],
              [35, 31],
              [38, 28],
              [40, 23],
              [42, 21],
            ],
        'A',
        '0',
        2,
      );
      c.poly(
        flap
          ? [
              [43, 22],
              [47, 25],
              [43, 28],
            ]
          : [
              [41, 18],
              [45, 20],
              [42, 23],
            ],
        'A',
      );
      break;
    case 'scorpion':
      c.path(
        [
          [30, 28],
          [36, 28],
          [40, 22],
          [40, 14],
          [37, 10],
        ],
        'A',
        '0',
        3,
      );
      c.poly(
        [
          [35, 7],
          [39, 9],
          [36, 12],
        ],
        'A',
        '-',
      );
      break;
    case 'gears':
      for (const [gx, gy, r] of [
        [11, 14, 4],
        [37, 20, 3.4],
        [36, 10, 2.6],
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
  if (extra !== 'vines') return;
  c.path(
    [
      [16, 20],
      [19, 25],
      [18, 31],
      [21, 36],
      [20, 44],
    ],
    'V',
  );
  c.path(
    [
      [31, 20],
      [28, 26],
      [30, 32],
      [27, 38],
    ],
    'V',
  );
  for (const [x, y] of [
    [18, 23],
    [20, 34],
    [29, 28],
    [28, 36],
    [17, 29],
  ] as P[]) {
    c.set(x, y, 'V', '+');
    c.set(x + 1, y, 'V', '+');
  }
}

// ——— аксессуары ———

function accessoryBack(c: Canvas, acc: Look['acc']) {
  if (acc === 'hood')
    c.poly(
      [
        [15, 0],
        [32, 0],
        [36, 10],
        [36, 22],
        [30, 24],
        [17, 24],
        [11, 22],
        [11, 10],
      ],
      'A',
      '-',
    );
  else if (acc === 'veil')
    c.poly(
      [
        [16, 2],
        [31, 2],
        [36, 16],
        [35, 32],
        [30, 26],
        [17, 26],
        [12, 32],
        [11, 16],
      ],
      'A',
    );
}

function accessory(c: Canvas, acc: Look['acc']) {
  switch (acc) {
    case 'witchHat':
      c.poly(
        [
          [22, -3],
          [27, -1],
          [30, 4],
          [17, 4],
        ],
        'A',
      );
      c.rows(
        [
          [4, 12, 35],
          [5, 13, 34],
        ],
        'A',
      );
      c.hl(17, 30, 3, 'T');
      c.set(27, 3, 'G', '+');
      break;
    case 'crown':
      c.rect(20, 1, 27, 2, 'T');
      for (const x of [20, 23, 24, 27]) c.set(x, 0, 'T', '+');
      c.set(23, 1, 'G', '+');
      c.set(24, 1, 'G');
      break;
    case 'tiara':
      c.hl(18, 29, 4, 'T');
      c.set(23, 3, 'T', '+');
      c.set(24, 3, 'T', '+');
      c.set(24, 2, 'G', '+');
      break;
    case 'halo':
      c.hl(19, 28, 0, 'T', '+');
      c.set(18, 1, 'T');
      c.set(29, 1, 'T');
      break;
    case 'hood':
      c.rows(
        [
          [0, 18, 29],
          [1, 16, 31],
          [2, 15, 32],
          [3, 15, 32],
        ],
        'A',
      );
      c.hl(17, 30, 3, 'A', '-');
      for (let y = 4; y <= 17; y++) {
        c.hl(13, 15, y, 'A');
        c.hl(32, 34, y, 'A');
      }
      c.vl(15, 4, 17, 'A', '-');
      c.vl(32, 4, 17, 'A', '-');
      break;
    case 'helmet':
      c.rows(
        [
          [0, 20, 27],
          [1, 18, 29],
          [2, 17, 30],
          [3, 16, 31],
          [4, 16, 31],
          [5, 16, 31],
        ],
        'K',
      );
      c.hl(19, 23, 1, 'K', '+');
      c.vl(16, 6, 11, 'K');
      c.vl(31, 6, 11, 'K');
      c.path(
        [
          [16, 2],
          [12, -1],
          [10, 0],
        ],
        'R',
      );
      c.path(
        [
          [31, 2],
          [35, -1],
          [37, 0],
        ],
        'R',
      );
      break;
    case 'horns':
      c.path(
        [
          [19, 3],
          [17, 0],
          [15, -1],
        ],
        'A',
        '0',
        2,
      );
      c.path(
        [
          [28, 3],
          [30, 0],
          [32, -1],
        ],
        'A',
        '0',
        2,
      );
      break;
    case 'bunnyEars':
      // ободок с длинными ушками
      // ушки начинаются поверх волос: над головой в кадре всего пара пикселей
      c.poly(
        [
          [19, 6],
          [16, -1],
          [18, -2],
          [22, 5],
        ],
        'A',
      );
      c.poly(
        [
          [25, 5],
          [29, -2],
          [31, -1],
          [28, 6],
        ],
        'A',
      );
      c.line(18, 0, 20, 4, 'P');
      c.line(29, 0, 27, 4, 'P');
      c.hl(18, 29, 5, 'A', '-');
      break;
    case 'maidBand':
      // кружевная наколка горничной
      c.hl(18, 29, 4, 'R');
      for (let x = 18; x <= 29; x++) if (x % 2) c.set(x, 3, 'R', '+');
      c.set(23, 2, 'R', '+');
      c.set(24, 2, 'R', '+');
      break;
    case 'catEars':
      c.poly(
        [
          [17, 4],
          [18, -2],
          [22, 2],
        ],
        'H',
      );
      c.poly(
        [
          [26, 2],
          [29, -2],
          [31, 4],
        ],
        'H',
      );
      c.set(19, 1, 'P');
      c.set(28, 1, 'P');
      break;
    case 'elfEars':
      c.poly(
        [
          [18, 9],
          [14, 5],
          [18, 11],
        ],
        'S',
      );
      c.poly(
        [
          [29, 9],
          [33, 5],
          [29, 11],
        ],
        'S',
      );
      break;
    case 'flower':
      c.ellipse(29, 4, 1.6, 1.6, 'A');
      c.set(29, 4, 'T', '+');
      c.set(27, 5, 'V');
      break;
    case 'veil':
      c.hl(16, 31, 3, 'T');
      c.set(24, 2, 'G', '+');
      break;
    case 'bandana':
      c.hl(16, 31, 4, 'A');
      c.hl(16, 31, 5, 'A', '-');
      c.path(
        [
          [31, 5],
          [34, 8],
          [35, 11],
        ],
        'A',
      );
      break;
    case 'mask':
      c.hl(19, 28, 12, 'A');
      c.hl(20, 27, 13, 'A', '-');
      c.hl(21, 26, 14, 'A');
      break;
    case 'sunHat':
      // соломенная шляпа с лентой и цветком
      c.rows(
        [
          [0, 20, 27],
          [1, 19, 28],
          [2, 18, 29],
          [3, 18, 29],
          [4, 11, 36],
          [5, 12, 35],
        ],
        'A',
      );
      c.hl(12, 35, 5, 'A', '-');
      for (let x = 13; x <= 34; x += 3) c.set(x, 4, 'A', '+');
      c.hl(18, 29, 3, 'T');
      c.ellipse(27, 3, 1.4, 1.2, 'G');
      c.set(27, 3, 'G', '+');
      break;
    case 'bow':
      // бант на макушке
      c.rows(
        [
          [1, 23, 24],
          [2, 22, 25],
          [3, 23, 24],
          [1, 28, 29],
          [2, 27, 30],
          [3, 28, 29],
        ],
        'A',
      );
      c.rect(26, 2, 26, 2, 'A', '+');
      c.set(25, 2, 'A', '-');
      c.set(27, 2, 'A', '-');
      c.set(24, 4, 'A', '-');
      c.set(29, 4, 'A', '-');
      break;
  }
}

// ——— оружие: координаты от «эталонной» кисти (35,30) / левой кисти (17,31) ———

function weaponRight(c: Canvas, w: SpriteSpec['weapon']) {
  switch (w) {
    case 'sword':
      c.line(36, 29, 44, 13, 'K', '+', 2);
      c.line(37, 29, 45, 13, 'K', '-');
      c.hl(33, 38, 29, 'T');
      c.rect(34, 30, 36, 31, 'W');
      c.set(35, 32, 'T', '+');
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
      break;
    case 'staff':
      c.line(37, 44, 37, 9, 'W', '0', 2);
      c.ellipse(37.5, 7, 2.6, 2.6, 'G');
      c.set(36, 6, 'G', '+');
      c.set(37, 5, 'G', '+');
      c.path(
        [
          [35, 9],
          [35, 6],
          [37, 3],
        ],
        'T',
      );
      break;
    case 'wand':
      c.line(35, 32, 39, 21, 'T');
      c.ellipse(40, 19, 1.8, 1.8, 'G');
      c.set(40, 18, 'G', '+');
      for (const [x, y] of [
        [43, 16],
        [42, 21],
        [44, 19],
      ] as P[])
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

function weaponLeft(c: Canvas, w: SpriteSpec['weapon']) {
  if (w === 'sword') {
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
  } else if (w === 'daggers') {
    c.line(16, 33, 13, 39, 'K', '+');
    c.line(17, 33, 14, 39, 'K', '-');
    c.set(17, 32, 'T');
  } else if (w === 'bow') {
    c.rect(11, 16, 13, 27, 'W', '-');
    c.hl(10, 14, 15, 'Q');
  }
}

type WeaponFn = (c: Canvas, w: SpriteSpec['weapon']) => void;
const boxCache = new Map<string, [number, number, number, number] | null>();

/** Габариты оружия без смещения (кэш по функции и типу). */
function weaponBox(fn: WeaponFn, w: SpriteSpec['weapon']) {
  const key = fn.name + ':' + w;
  if (boxCache.has(key)) return boxCache.get(key)!;
  const PAD = 32;
  const t = new Canvas(FIG + PAD * 2, FIG + PAD * 2);
  t.ox = PAD;
  t.oy = PAD;
  fn(t, w);
  let box: [number, number, number, number] | null = null;
  for (let i = 0; i < t.g.length; i++) {
    if (!t.g[i]) continue;
    const x = (i % t.w) - PAD;
    const y = Math.floor(i / t.w) - PAD;
    if (!box) box = [x, y, x, y];
    else box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
  }
  boxCache.set(key, box);
  return box;
}

/** Выставить смещение рисования так, чтобы оружие осталось в кадре (с местом под контур). */
function shiftInside(c: Canvas, fn: WeaponFn, w: SpriteSpec['weapon'], dx: number, dy: number) {
  const b = weaponBox(fn, w);
  if (b) {
    dx = Math.max(1 - b[0], Math.min(FIG - 2 - b[2], dx));
    dy = Math.max(1 - b[1], Math.min(FIG - 2 - b[3], dy));
  }
  c.ox = dx;
  c.oy = dy;
}

// ——— светотень, контур, палитра ———

const AUTO = new Set(['S', 'H', 'O', 'T', 'A', 'B', 'K', 'W', 'R', 'F', 'D', 'G', 'Q', 'V']);

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
      const i = y * c.w + x;
      if (right && down) c.g[i] = m + '=';
      else if (right || down) c.g[i] = m + '-';
      else if ((up || left) && m !== 'S') c.g[i] = m + '+';
      else if (up && left) c.g[i] = m + '+';
    }
}

function outline(c: Canvas) {
  const edge: number[] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (c.get(x, y)) continue;
      if (c.get(x - 1, y) || c.get(x + 1, y) || c.get(x, y - 1) || c.get(x, y + 1)) edge.push(y * c.w + x);
    }
  for (const i of edge) c.g[i] = 'X0';
}

function tones(base: RGBA, deep = 0.42): Record<Tone, RGBA> {
  return { '0': base, '+': lighten(base, 0.28), '-': darken(base, 0.24), '=': darken(base, deep) };
}

function toLab(c: RGBA): [number, number, number] {
  const f = (v: number) => {
    v /= 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  };
  const [r, g, b] = [f(c[0]), f(c[1]), f(c[2])];
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const X = t((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const Y = t(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const Z = t((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

/** Воспринимаемая разница цветов (CIE76 ΔE). */
function deltaE(a: RGBA, b: RGBA) {
  const A = toLab(a);
  const B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/**
 * Цвет белья: первый кандидат, заметно отличающийся от кожи (ΔE ≥ 45 — ткань читается как одежда
 * даже на 48 px), иначе самый контрастный.
 */
function lingerieColor(skin: RGBA, cands: RGBA[]): RGBA {
  for (const c of cands) if (deltaE(c, skin) >= 45) return c;
  return cands.reduce((a, b) => (deltaE(b, skin) > deltaE(a, skin) ? b : a));
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
    B: tones(lingerieColor(skin, [outfit, trim, elem, darken(outfit, 0.55), hex('#2A1622')])),
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
    M: { '0': mix(skin, hex('#C0304A'), 0.65), '+': mix(skin, hex('#F07A8A'), 0.55), '-': mix(skin, hex('#8A2A3A'), 0.6), '=': hex('#5A1A2A') },
    l: tones(hex('#24121C')),
    X: tones(hex('#1A1016')),
  };
}

export function renderFigure(spec: SpriteSpec & { outfit?: OutfitKind }, pose: Pose = {}): Bitmap {
  const c = new Canvas(FIG, FIG);
  const L = spec.look;
  const kind = spec.outfit ?? 'witch';
  const armsKind = pose.arms ?? 'idle';
  arms = ARMS[armsKind];
  frontSides = FRONT_ARMS[armsKind] ?? [];
  armLayer = frontSides.length ? new Canvas(FIG, FIG) : null;
  perpLimbs = EXTRA_POSES.includes(armsKind);
  const handR = arms.R.hand;
  const handL = arms.L.hand;
  const bust = Math.max(-1, Math.min(2, Math.round(L.bust ?? 0)));
  const hips = Math.max(0, Math.min(2, Math.round(L.hips ?? 0)));

  extraBack(c, L.extra, !!pose.flap);
  accessoryBack(c, L.acc);
  drawHairBack(c, L.style);
  const under = bust || hips ? c.g.slice() : null;
  const replaced = L.extra === 'snake' || L.extra === 'fishTail';
  drawBody(c, !replaced);
  if (replaced) lowerExtra(c, L.extra);
  if (L.wear) wearOutfit(c, L.wear, !replaced);
  else outfit(c, kind, !replaced);
  if (under) shapeBody(c, under, bust, hips, !replaced);
  drawFace(c, pose.eyes ?? 'open');
  hairTop(c);
  if (armLayer) {
    for (let i = 0; i < armLayer.g.length; i++) if (armLayer.g[i]) c.g[i] = armLayer.g[i];
    armLayer = null;
  }
  accessory(c, L.acc);
  // кисть на бедре уезжает вместе с шириной бёдер
  const hipShift = HIP_ROWS[hips]?.torso[handL[1]] ?? 0;
  // оружие следует за кистями (координаты оружия заданы от эталонных кистей),
  // но не вылезает за кадр — длинное древко просто «проскальзывает» в кулаке
  shiftInside(c, weaponLeft, spec.weapon, handL[0] - hipShift - 17, handL[1] - 31);
  weaponLeft(c, spec.weapon);
  shiftInside(c, weaponRight, spec.weapon, handR[0] - 35, handR[1] - 30);
  weaponRight(c, spec.weapon);
  c.ox = 0;
  c.oy = 0;
  extraFront(c, L.extra);
  autoShade(c);
  outline(c);
  arms = ARMS.idle;
  frontSides = [];
  perpLimbs = false;

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
