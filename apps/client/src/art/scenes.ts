/** Пиксельные фоны мест «Ухода»: лагерь, источники, комнаты резиденции и места свиданий (кэш data-URL). */
import { Rng } from '@idle/shared';
import { hex, mix, type RGBA } from './color';

const SCENE_W = 128;
const SCENE_H = 100;
const W = SCENE_W;
const H = SCENE_H;

export type SceneBg = 'camp' | 'spa' | 'living' | 'kitchen' | 'bath' | 'bedroom' | 'night' | 'fair' | 'tower' | 'lake' | 'tavern' | 'garden' | 'bloodmoon' | 'tides' | 'sakura' | 'tourney' | 'mine';

type C = string | RGBA;
type Pt = [number, number];

const rgbCache = new Map<string, RGBA>();
function rgb(c: C): RGBA {
  if (typeof c !== 'string') return c;
  let v = rgbCache.get(c);
  if (!v) rgbCache.set(c, (v = hex(c)));
  return v;
}

/** Рисование по пикселям в буфер W×H (с полупрозрачностью). */
class Painter {
  readonly d = new Uint8ClampedArray(W * H * 4);
  constructor(readonly rng: Rng) {}

  set(x: number, y: number, c: C, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const [r, g, b] = rgb(c);
    const i = (y * W + x) * 4;
    const d = this.d;
    if (a >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    } else {
      d[i] = d[i] * (1 - a) + r * a;
      d[i + 1] = d[i + 1] * (1 - a) + g * a;
      d[i + 2] = d[i + 2] * (1 - a) + b * a;
    }
    d[i + 3] = 255;
  }

  rect(x: number, y: number, w: number, h: number, c: C, a = 1) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.set(xx, yy, c, a);
  }

  hl(x0: number, x1: number, y: number, c: C, a = 1) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, c, a);
  }

  vl(x: number, y0: number, y1: number, c: C, a = 1) {
    for (let y = Math.round(y0); y <= Math.round(y1); y++) this.set(x, y, c, a);
  }

  /** Вертикальный градиент «ступеньками» по 2 пикселя. */
  vgrad(x: number, y: number, w: number, h: number, c0: C, c1: C, step = 2) {
    const a = rgb(c0);
    const b = rgb(c1);
    for (let yy = 0; yy < h; yy++) {
      const t = h > 1 ? (Math.floor(yy / step) * step) / (h - 1) : 0;
      this.hl(x, x + w - 1, y + yy, mix(a, b, Math.min(1, t)));
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: C, a = 1) {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++)
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        if ((dx * dx) / (rx * rx + 0.6) + (dy * dy) / (ry * ry + 0.6) <= 1) this.set(cx + dx, cy + dy, c, a);
      }
  }

  circle(cx: number, cy: number, r: number, c: C, a = 1) {
    this.ellipse(cx, cy, r, r, c, a);
  }

  /** Заливка многоугольника по строкам — без сглаживания. */
  poly(pts: Pt[], c: C, a = 1) {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c, a);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: C, a = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
  }

  /** Мягкое свечение: прозрачность падает к краю ступенями. */
  glow(cx: number, cy: number, r: number, c: C, a: number) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d >= 1) continue;
        this.set(cx + dx, cy + dy, c, Math.round(a * (1 - d) * (1 - d) * 8) / 8);
      }
  }

  stars(n: number, x: number, y: number, w: number, h: number, cols: C[] = ['#fff4e0', '#c8d8ff', '#ffe8b0']) {
    for (let i = 0; i < n; i++) {
      const sx = x + this.rng.int(w);
      const sy = y + this.rng.int(h);
      const c = cols[this.rng.int(cols.length)];
      this.set(sx, sy, c, 0.5 + this.rng.next() * 0.5);
      if (this.rng.next() < 0.12) {
        this.set(sx - 1, sy, c, 0.4);
        this.set(sx + 1, sy, c, 0.4);
        this.set(sx, sy - 1, c, 0.4);
        this.set(sx, sy + 1, c, 0.4);
      }
    }
  }

  url(): string {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d')!.putImageData(new ImageData(this.d, W, H), 0, 0);
    return c.toDataURL();
  }
}

// ——— общие детали ———

function pines(p: Painter, y: number, col: C, minH: number, maxH: number, gapMin = 4, gapMax = 9) {
  for (let x = -3; x < W + 4; x += gapMin + p.rng.int(gapMax - gapMin + 1)) {
    const h = minH + p.rng.int(maxH - minH + 1);
    const w = 4 + p.rng.int(4);
    p.poly(
      [
        [x, y - h],
        [x + w / 2 + 0.5, y],
        [x - w / 2 - 0.5, y],
      ],
      col,
    );
  }
}

function flame(p: Painter, cx: number, base: number, h: number) {
  p.poly(
    [
      [cx, base - h],
      [cx + h * 0.45, base],
      [cx - h * 0.45, base],
    ],
    '#e8501a',
  );
  p.poly(
    [
      [cx + 0.5, base - h * 0.72],
      [cx + h * 0.3, base],
      [cx - h * 0.28, base],
    ],
    '#ff9a2a',
  );
  p.poly(
    [
      [cx, base - h * 0.42],
      [cx + h * 0.16, base],
      [cx - h * 0.16, base],
    ],
    '#ffe27a',
  );
}

function woodFloor(p: Painter, y: number, c0: C, c1: C, seam: C) {
  p.vgrad(0, y, W, H - y, c0, c1, 3);
  for (let yy = y + 4, row = 0; yy < H; yy += 5, row++) {
    p.hl(0, W - 1, yy, seam, 0.6);
    for (let x = (row % 2) * 13 + p.rng.int(6); x < W; x += 22 + p.rng.int(10)) p.vl(x, yy - 4, yy - 1, seam, 0.5);
  }
}

function curtains(p: Painter, x0: number, x1: number, y0: number, y1: number, c: C, shade: C) {
  for (const [a, b] of [
    [x0 - 5, x0 + 1],
    [x1 - 1, x1 + 5],
  ]) {
    p.rect(a, y0, b - a, y1 - y0, c);
    for (let x = a + 1; x < b; x += 2) p.vl(x, y0, y1 - 1, shade, 0.7);
  }
  p.hl(x0 - 7, x1 + 7, y0 - 1, '#3a2418');
  p.hl(x0 - 7, x1 + 7, y0 - 2, '#6a4a30');
}

function frame(p: Painter, x: number, y: number, w: number, h: number, c: C) {
  p.rect(x, y, w, 1, c);
  p.rect(x, y + h - 1, w, 1, c);
  p.rect(x, y, 1, h, c);
  p.rect(x + w - 1, y, 1, h, c);
}

// ——— места ———

const SCENES: Record<SceneBg, (p: Painter) => void> = {
  camp(p) {
    p.vgrad(0, 0, W, 64, '#0c0e2a', '#3a2a52');
    p.stars(55, 0, 0, W, 46);
    p.glow(104, 30, 14, '#f4ecd0', 0.35);
    p.circle(104, 30, 5, '#f4ecd0');
    p.circle(106, 29, 4, '#d8d0b8', 0.35);
    p.poly(
      [
        [0, 50],
        [12, 38],
        [24, 46],
        [40, 32],
        [56, 44],
        [72, 34],
        [88, 46],
        [102, 36],
        [116, 44],
        [128, 38],
        [128, 64],
        [0, 64],
      ],
      '#2a2242',
    );
    pines(p, 66, '#141c28', 10, 22);
    p.vgrad(0, 64, W, 36, '#1c2a1a', '#2a3a20', 3);
    for (let i = 0; i < 70; i++) p.set(p.rng.int(W), 66 + p.rng.int(34), '#3a5028', 0.8);
    p.ellipse(66, 90, 46, 9, '#3a3024', 0.8);
    // палатка
    p.poly(
      [
        [2, 82],
        [21, 50],
        [40, 82],
      ],
      '#9a5a2e',
    );
    p.poly(
      [
        [21, 50],
        [40, 82],
        [30, 82],
      ],
      '#7a4222',
    );
    for (let i = 0; i < 4; i++) p.line(21, 50, 5 + i * 9, 82, '#6a3a1e', 0.5);
    p.poly(
      [
        [16, 82],
        [21, 64],
        [26, 82],
      ],
      '#ffc070',
    );
    p.glow(21, 78, 12, '#ffb050', 0.25);
    p.line(21, 50, 21, 46, '#5a3a20');
    p.rect(20, 45, 4, 2, '#d04040');
    // костёр
    p.glow(108, 82, 30, '#ff8a3a', 0.32);
    for (const [x, y] of [
      [98, 90],
      [102, 91],
      [107, 92],
      [112, 91],
      [117, 90],
      [119, 88],
      [96, 88],
    ] as Pt[])
      p.ellipse(x, y, 2, 1.4, '#6a6470');
    p.line(99, 89, 116, 85, '#6a4020');
    p.line(99, 85, 116, 89, '#5a3418');
    flame(p, 108, 88, 15);
    // бревно-скамья
    p.rect(74, 88, 18, 4, '#6a4428');
    p.rect(74, 88, 18, 1, '#8a5a34');
    p.ellipse(92, 90, 1.5, 2, '#b08050');
    for (let i = 0; i < 8; i++) p.set(p.rng.int(W), 50 + p.rng.int(30), '#e0f070', 0.9);
  },

  spa(p) {
    p.vgrad(0, 0, W, 56, '#0e1830', '#2c3e60');
    p.stars(45, 0, 0, W, 40);
    p.poly(
      [
        [0, 52],
        [18, 30],
        [34, 44],
        [54, 24],
        [74, 42],
        [92, 28],
        [112, 44],
        [128, 34],
        [128, 60],
        [0, 60],
      ],
      '#2a3448',
    );
    for (const [x, y] of [
      [18, 30],
      [54, 24],
      [92, 28],
    ] as Pt[])
      p.poly(
        [
          [x, y],
          [x + 6, y + 6],
          [x + 2, y + 5],
          [x - 1, y + 7],
          [x - 6, y + 6],
        ],
        '#dfe8f4',
      );
    // бамбуковая изгородь
    for (let x = 0; x < 26; x += 4) {
      p.rect(x, 34 - (x % 8), 3, 34 + (x % 8), '#5f8a3e');
      p.vl(x, 34 - (x % 8), 67, '#86b058');
      for (let y = 40; y < 66; y += 8) p.hl(x, x + 2, y - (x % 8) / 2, '#3e5e28');
    }
    p.hl(0, 26, 44, '#3a2a1a');
    p.hl(0, 26, 58, '#3a2a1a');
    // ветка сакуры
    p.line(128, 30, 100, 38, '#4a2a22');
    p.line(112, 34, 106, 28, '#4a2a22');
    for (let i = 0; i < 26; i++) p.circle(100 + p.rng.int(28), 26 + p.rng.int(16), 1, i % 3 ? '#f4a8c8' : '#ffd0e0');
    // каменный фонарь
    p.rect(106, 60, 14, 4, '#6a6e7a');
    p.rect(110, 50, 6, 10, '#7a7e8a');
    p.rect(107, 42, 12, 8, '#7a7e8a');
    p.rect(109, 44, 8, 4, '#ffd27a');
    p.glow(113, 46, 16, '#ffc860', 0.3);
    p.poly(
      [
        [104, 42],
        [113, 36],
        [122, 42],
      ],
      '#5a5e6a',
    );
    // вода и камни по кромке
    p.vgrad(0, 64, W, 36, '#3a86a4', '#1c5a78', 3);
    for (let i = 0; i < 12; i++) p.hl(p.rng.int(W), p.rng.int(W), 70 + p.rng.int(28), '#7ac0d8', 0.35);
    for (let x = 0; x < W; x += 7 + p.rng.int(4)) {
      const r = 3 + p.rng.int(3);
      p.ellipse(x, 64, r + 1, r - 1, '#5a6070');
      p.ellipse(x - 1, 63, r - 1, r - 2, '#7a808e');
    }
  },

  living(p) {
    p.rect(0, 0, W, 60, '#6a3040');
    for (let x = 2; x < W; x += 8) p.rect(x, 0, 3, 60, '#7a3a4c');
    for (let x = 6; x < W; x += 8) for (let y = 4; y < 60; y += 8) p.set(x, y, '#9a5060');
    p.rect(0, 0, W, 3, '#4a2028');
    // обшивка стены
    p.rect(0, 58, W, 16, '#5a3624');
    p.rect(0, 58, W, 2, '#7a4a30');
    for (let x = 4; x < W; x += 16) frame(p, x, 62, 12, 9, '#4a2a1c');
    woodFloor(p, 74, '#8a5a36', '#6a4226', '#4a2c18');
    // ковёр
    p.ellipse(64, 90, 46, 8, '#8a2a3a');
    p.ellipse(64, 90, 42, 6, '#a83a4a');
    for (let x = 26; x < 104; x += 6) p.set(x, 90, '#e0b060');
    // окно с ночным небом
    p.rect(8, 16, 26, 32, '#3a2418');
    p.vgrad(10, 18, 22, 28, '#1a2450', '#3a3a70');
    p.stars(8, 10, 18, 22, 14);
    p.circle(26, 23, 3, '#f0ead0');
    p.rect(20, 18, 2, 28, '#3a2418');
    p.rect(10, 31, 22, 2, '#3a2418');
    p.rect(6, 48, 30, 2, '#7a5a40');
    curtains(p, 8, 34, 14, 52, '#a02a3a', '#7a1e2a');
    // диван
    p.rect(0, 62, 36, 10, '#2e6a6a');
    p.rect(0, 70, 38, 8, '#3a8080');
    p.rect(34, 64, 5, 14, '#2a5e5e');
    p.rect(3, 64, 14, 6, '#4a9a94');
    p.rect(18, 64, 14, 6, '#4a9a94');
    p.hl(0, 38, 78, '#1e4444');
    p.rect(2, 78, 2, 3, '#3a2418');
    p.rect(34, 78, 2, 3, '#3a2418');
    // картина
    p.rect(50, 22, 28, 16, '#c8a050');
    p.vgrad(52, 24, 24, 12, '#8ac8e0', '#e0c890');
    p.poly(
      [
        [52, 36],
        [60, 28],
        [66, 32],
        [72, 26],
        [76, 36],
      ],
      '#4a7a4a',
    );
    // камин
    p.rect(92, 32, 36, 42, '#8a8490');
    for (let y = 34; y < 74; y += 4) {
      p.hl(92, 127, y, '#6a6470');
      for (let x = 92 + ((y / 4) % 2) * 4; x < W; x += 8) p.vl(x, y, y + 3, '#6a6470');
    }
    p.rect(88, 30, 40, 3, '#5a3624');
    p.rect(88, 30, 40, 1, '#8a5a3a');
    p.rect(100, 50, 20, 24, '#140c0c');
    p.poly(
      [
        [100, 50],
        [110, 44],
        [120, 50],
      ],
      '#8a8490',
    );
    p.line(101, 72, 118, 69, '#5a3418');
    p.line(101, 69, 118, 72, '#6a4020');
    flame(p, 110, 71, 14);
    p.glow(110, 66, 30, '#ff8a3a', 0.3);
    for (const x of [92, 124]) {
      p.rect(x, 25, 2, 5, '#f0e8d8');
      p.set(x, 24, '#ffd060');
      p.set(x + 1, 23, '#ffb040');
      p.glow(x, 23, 5, '#ffd080', 0.25);
    }
    p.circle(108, 27, 3, '#c8a050');
    p.circle(108, 27, 2, '#f0e8d8');
  },

  kitchen(p) {
    p.rect(0, 0, W, 30, '#7a5a40');
    for (let y = 30; y < 56; y += 6)
      for (let x = (y / 6) % 2 ? 0 : -3; x < W; x += 6) {
        p.rect(x, y, 5, 5, '#d8c098');
        p.set(x, y, '#e8d4b0');
      }
    p.rect(0, 30, W, 1, '#5a4030');
    // полка с банками
    p.rect(4, 22, 38, 2, '#5a3a24');
    const jars = ['#c05a3a', '#e0b050', '#6aa050', '#8a5ac0', '#c0c0c8'];
    for (let i = 0; i < 6; i++) {
      p.rect(6 + i * 6, 15, 4, 7, jars[i % jars.length]);
      p.rect(6 + i * 6, 14, 4, 1, '#8a6a4a');
      p.set(7 + i * 6, 16, '#ffffff', 0.6);
    }
    // окно
    p.rect(70, 6, 32, 24, '#e8e0d0');
    p.vgrad(72, 8, 28, 20, '#7ac0ec', '#c8e8f8');
    p.circle(80, 14, 3, '#ffffff', 0.9);
    p.circle(84, 14, 4, '#ffffff', 0.9);
    p.rect(85, 8, 2, 20, '#e8e0d0');
    p.rect(68, 29, 36, 2, '#a88868');
    p.rect(74, 24, 5, 5, '#b05a30');
    p.circle(76, 22, 3, '#4a9a3a');
    // столешница и шкафы
    p.rect(0, 54, W, 3, '#b0a494');
    p.rect(0, 57, W, 17, '#6a4a2e');
    for (let x = 2; x < W; x += 14) {
      frame(p, x, 59, 12, 13, '#4e341e');
      p.set(x + 10, 65, '#d0b070');
    }
    p.rect(0, 72, W, 2, '#3a2616');
    // плита с кастрюлей
    p.rect(2, 40, 28, 38, '#2a2a32');
    p.rect(4, 58, 24, 14, '#1a1a20');
    p.rect(6, 60, 20, 10, '#3a2a28');
    p.glow(16, 66, 8, '#ff7030', 0.4);
    p.rect(2, 40, 28, 2, '#4a4a54');
    p.rect(8, 32, 16, 8, '#8a8a94');
    p.rect(7, 32, 18, 2, '#a8a8b2');
    p.rect(12, 6, 6, 26, '#3a3a42');
    for (let i = 0; i < 6; i++) p.set(12 + p.rng.int(8), 22 + p.rng.int(9), '#e8eef4', 0.5);
    // сковороды и хлеб
    p.hl(98, 126, 34, '#3a2a1a');
    for (const [x, r] of [
      [103, 5],
      [115, 4],
      [124, 3],
    ] as Pt[]) {
      p.vl(x, 34, 38, '#3a2a1a');
      p.circle(x, 38 + r, r, '#c07a40');
      p.circle(x, 38 + r, r - 1, '#a0602e');
    }
    p.ellipse(106, 51, 7, 3, '#d09a50');
    p.ellipse(106, 50, 6, 2, '#e8b870');
    p.circle(118, 51, 3, '#d04a3a');
    p.circle(123, 52, 2, '#6aa040');
    // пол плиткой
    for (let y = 74; y < H; y += 6) for (let x = 0; x < W; x += 8) p.rect(x, y, 8, 6, (x / 8 + (y - 74) / 6) % 2 === 0 ? '#9a4e36' : '#b8906c');
  },

  bath(p) {
    for (let y = 0; y < 66; y += 8)
      for (let x = 0; x < W; x += 8) {
        p.rect(x, y, 8, 8, '#8ab8c4');
        p.rect(x + 1, y + 1, 7, 7, '#a8d2dc');
        p.set(x + 2, y + 2, '#c8e6ee');
      }
    p.rect(0, 40, W, 3, '#3a6a78');
    p.hl(0, W, 41, '#e0c070');
    for (let y = 66; y < H; y += 6) for (let x = 0; x < W; x += 6) p.rect(x, y, 6, 6, ((x / 6 + (y - 66) / 6) % 2 === 0 ? '#2a5a68' : '#36707e'));
    p.rect(0, 66, W, 1, '#1e4450');
    // зеркало и раковина
    p.ellipse(18, 26, 10, 13, '#c8a050');
    p.ellipse(18, 26, 8, 11, '#c8e8f0');
    p.line(12, 30, 20, 18, '#ffffff', 0.7);
    p.line(14, 32, 22, 20, '#ffffff', 0.4);
    p.ellipse(18, 50, 10, 3, '#f4f8fa');
    p.rect(8, 50, 21, 4, '#e8eef2');
    p.rect(15, 54, 6, 14, '#dce6ea');
    p.rect(17, 44, 2, 5, '#c8a050');
    // окно
    p.rect(66, 4, 30, 20, '#e8e0d0');
    p.vgrad(68, 6, 26, 16, '#d8eef8', '#f4fbff');
    p.rect(80, 6, 2, 16, '#e8e0d0');
    p.glow(81, 16, 18, '#ffffff', 0.2);
    // полка с флаконами и свечами
    p.rect(98, 32, 28, 2, '#8a6a4a');
    const bottles: [number, string][] = [
      [101, '#e080a8'],
      [106, '#6ac0a0'],
      [111, '#7a9ae0'],
    ];
    for (const [x, c] of bottles) {
      p.rect(x, 25, 4, 7, c);
      p.rect(x + 1, 23, 2, 2, '#f0f0f0');
    }
    for (const x of [117, 122]) {
      p.rect(x, 27, 3, 5, '#f4ecdc');
      p.set(x + 1, 26, '#ffc050');
      p.glow(x + 1, 25, 6, '#ffd080', 0.3);
    }
    // ванна на ножках
    p.ellipse(108, 62, 20, 4, '#e8eef2');
    p.rect(88, 62, 40, 14, '#f4f8fa');
    p.ellipse(108, 76, 20, 3, '#dfe8ec');
    p.rect(88, 62, 40, 2, '#c8d8de');
    p.rect(91, 78, 3, 4, '#d0a040');
    p.rect(123, 78, 3, 4, '#d0a040');
    for (let i = 0; i < 10; i++) p.circle(92 + p.rng.int(34), 60 + p.rng.int(3), 2, '#ffffff');
    // полотенце и цветок
    p.rect(40, 44, 12, 2, '#c8a050');
    p.rect(41, 46, 10, 12, '#f090b8');
    p.hl(41, 50, 55, '#ffffff');
    p.rect(0, 56, 7, 10, '#b86a3a');
    p.circle(3, 52, 4, '#4a9a4a');
    p.circle(6, 48, 3, '#5aaa5a');
  },

  bedroom(p) {
    p.rect(0, 0, W, 64, '#8a78a8');
    for (let y = 3; y < 64; y += 6) for (let x = (y % 12 === 3 ? 0 : 3); x < W; x += 6) p.set(x, y, '#a494c4');
    p.rect(0, 62, W, 2, '#e8dcf0');
    woodFloor(p, 64, '#b07e52', '#8a5e3a', '#6a4428');
    p.ellipse(66, 88, 40, 7, '#e8a0c0');
    p.ellipse(66, 88, 36, 5, '#f4c0d8');
    // окно с солнцем
    p.rect(88, 14, 32, 34, '#f0e8f4');
    p.vgrad(90, 16, 28, 30, '#8ac8f4', '#d4ecfc');
    p.circle(112, 22, 4, '#fff0a0');
    p.glow(112, 22, 10, '#fff0a0', 0.4);
    p.circle(96, 30, 3, '#ffffff');
    p.circle(100, 30, 4, '#ffffff');
    p.rect(103, 16, 2, 30, '#f0e8f4');
    p.rect(90, 30, 28, 2, '#f0e8f4');
    curtains(p, 88, 120, 12, 50, '#e090b0', '#c0708e');
    p.poly(
      [
        [90, 48],
        [118, 48],
        [104, 100],
        [66, 100],
      ],
      '#fff4c0',
      0.12,
    );
    // полка с книгами и мишкой
    p.rect(6, 30, 32, 2, '#7a4a30');
    const books = ['#c04a4a', '#4a7ac0', '#e0b040', '#6aa06a'];
    for (let i = 0; i < 4; i++) p.rect(8 + i * 3, 22, 2, 8, books[i]);
    p.circle(30, 26, 3, '#b0703a');
    p.circle(28, 23, 1, '#b0703a');
    p.circle(32, 23, 1, '#b0703a');
    p.set(30, 27, '#3a2010');
    // кровать
    p.rect(0, 46, 6, 36, '#7a4a30');
    p.rect(0, 46, 6, 2, '#9a6a44');
    p.rect(6, 62, 38, 8, '#f4f0f8');
    p.rect(8, 57, 12, 6, '#ffffff');
    p.rect(8, 62, 12, 1, '#d8d0e0');
    p.rect(18, 62, 26, 14, '#d06a9a');
    for (let x = 20; x < 44; x += 5) p.vl(x, 63, 75, '#e890b8');
    p.rect(42, 58, 4, 24, '#7a4a30');
    p.rect(2, 80, 3, 3, '#5a3420');
    p.rect(42, 80, 3, 3, '#5a3420');
  },

  night(p) {
    p.rect(0, 0, W, 64, '#262044');
    for (let y = 3; y < 64; y += 6) for (let x = (y % 12 === 3 ? 0 : 3); x < W; x += 6) p.set(x, y, '#342c58');
    p.rect(0, 62, W, 2, '#3e3664');
    woodFloor(p, 64, '#3a2a30', '#241a20', '#18101a');
    // окно с луной
    p.rect(88, 20, 32, 34, '#4a4270');
    p.vgrad(90, 22, 28, 30, '#0c1030', '#1e2250');
    p.stars(14, 90, 22, 28, 30);
    p.circle(110, 30, 4, '#f4ecd0');
    p.circle(112, 29, 3, '#1a1e48');
    p.glow(108, 32, 10, '#f4ecd0', 0.25);
    p.rect(103, 22, 2, 30, '#4a4270');
    p.rect(90, 36, 28, 2, '#4a4270');
    curtains(p, 88, 120, 18, 56, '#5a3a78', '#442a5e');
    p.poly(
      [
        [90, 54],
        [118, 54],
        [96, 100],
        [60, 100],
      ],
      '#b8c8ff',
      0.08,
    );
    // бра над кроватью
    p.rect(62, 30, 6, 5, '#e8c070');
    p.rect(64, 35, 2, 3, '#8a6a4a');
    p.glow(65, 33, 22, '#ffc070', 0.28);
  },

  fair(p) {
    p.vgrad(0, 0, W, 72, '#3a1e50', '#f0906a', 3);
    p.stars(14, 0, 0, W, 16);
    // колесо обозрения
    for (let a = 0; a < 120; a++) {
      const ang = (a / 120) * Math.PI * 2;
      p.set(100 + Math.cos(ang) * 20, 40 + Math.sin(ang) * 20, '#5a2a58');
      p.set(100 + Math.cos(ang) * 19, 40 + Math.sin(ang) * 19, '#5a2a58');
    }
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      p.line(100, 40, 100 + Math.cos(ang) * 20, 40 + Math.sin(ang) * 20, '#5a2a58');
    }
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const x = 100 + Math.cos(ang) * 21;
      const y = 40 + Math.sin(ang) * 21;
      p.rect(x - 2, y, 4, 3, ['#e04a4a', '#4a8ae0', '#e0c040', '#6ac06a'][a % 4]);
      p.set(x, y - 1, '#ffe8a0');
    }
    p.line(100, 40, 88, 76, '#4a2248');
    p.line(100, 40, 112, 76, '#4a2248');
    // шатры
    const tent = (x: number, w: number, top: number, a: string, b: string) => {
      for (let i = 0; i < w; i += 4) p.rect(x + i, top + 10, 4, 76 - top - 10, (i / 4) % 2 ? a : b);
      for (let i = 0; i <= w; i += 4)
        p.poly(
          [
            [x + w / 2, top],
            [x + i, top + 10],
            [x + Math.min(w, i + 4), top + 10],
          ],
          (i / 4) % 2 ? a : b,
        );
      p.hl(x, x + w - 1, top + 10, '#7a2a2a');
      p.line(x + w / 2, top, x + w / 2, top - 5, '#4a2a20');
      p.rect(x + w / 2, top - 5, 4, 2, '#ffd040');
      p.rect(x + w / 2 - 3, 64, 6, 12, '#2a1418');
      p.glow(x + w / 2, 70, 7, '#ffc060', 0.3);
    };
    tent(0, 34, 38, '#d03a3a', '#f4e6d4');
    tent(84, 24, 50, '#3a6ad0', '#f0d040');
    // гирлянда флажков и огни
    for (let x = 0; x < W; x += 5) {
      const y = 30 + Math.sin((x / W) * Math.PI) * 6;
      p.poly(
        [
          [x, y],
          [x + 4, y],
          [x + 2, y + 4],
        ],
        ['#e04a4a', '#f0c040', '#4a9ae0', '#e070c0', '#6ac06a'][(x / 5) % 5],
      );
      p.set(x, y, '#3a2020');
    }
    for (let x = 2; x < W; x += 6) {
      const y = 46 + Math.sin((x / W) * Math.PI) * 5;
      p.set(x, y, '#ffe8a0');
      p.glow(x, y, 3, '#ffe0a0', 0.3);
    }
    // шарики
    for (const [x, y, c] of [
      [40, 50, '#e04a6a'],
      [44, 46, '#4ab0e0'],
      [47, 51, '#f0c040'],
    ] as [number, number, string][]) {
      p.ellipse(x, y, 2, 3, c);
      p.line(x, y + 3, 42, 62, '#e8e0d8', 0.6);
    }
    // брусчатка
    p.vgrad(0, 76, W, 24, '#6a5a60', '#4a3e44', 3);
    for (let y = 77; y < H; y += 4) for (let x = ((y - 77) / 4) % 2 ? 0 : 3; x < W; x += 7) p.rect(x, y, 6, 3, '#7a6a70', 0.6);
  },

  tower(p) {
    p.vgrad(0, 0, W, 76, '#080a22', '#2a2060', 3);
    for (const [x, y, r, c] of [
      [40, 40, 34, '#8a4ae0'],
      [88, 30, 30, '#4a6ae0'],
      [64, 58, 24, '#e04a9a'],
    ] as [number, number, number, string][])
      p.glow(x, y, r, c, 0.16);
    p.stars(110, 0, 0, W, 64);
    p.circle(24, 36, 6, '#f4ecd0');
    p.circle(27, 34, 5, '#14143a');
    p.glow(22, 38, 12, '#f4ecd0', 0.2);
    // далёкий город
    for (let x = 8; x < 120; x += 5 + p.rng.int(6)) {
      const h = 4 + p.rng.int(8);
      p.rect(x, 70 - h, 4, h, '#161430');
      if (p.rng.next() < 0.7) p.set(x + 1, 70 - h + 2, '#ffd070');
    }
    p.rect(0, 70, W, 6, '#161430');
    // балюстрада
    p.rect(0, 62, W, 3, '#8a86a0');
    p.rect(0, 62, W, 1, '#a8a4bc');
    for (let x = 2; x < W; x += 6) {
      p.rect(x, 65, 3, 11, '#6a6680');
      p.set(x + 1, 67, '#8a86a0');
    }
    p.rect(0, 75, W, 2, '#8a86a0');
    // пол-плиты
    p.vgrad(0, 77, W, 23, '#4a4660', '#34304a', 3);
    for (let y = 80; y < H; y += 6) p.hl(0, W, y, '#2a2640');
    for (let x = 0; x < W; x += 12) p.vl(x + ((x / 12) % 2) * 6, 77, H, '#2a2640', 0.6);
    // колонны по краям
    for (const x of [0, 118]) {
      p.rect(x, 0, 10, 100, '#5a566e');
      p.rect(x + 1, 0, 2, 100, '#7a7690');
      p.rect(x + 8, 0, 2, 100, '#44405a');
    }
    // телескоп
    p.line(102, 76, 106, 60, '#6a5a40');
    p.line(112, 76, 106, 60, '#6a5a40');
    p.line(106, 76, 106, 60, '#6a5a40');
    for (let i = 0; i < 3; i++) p.line(96 + i, 64 - i, 116 + i, 46 - i, '#c8a050');
    p.line(96, 65, 116, 47, '#8a6a30');
    p.rect(115, 44, 4, 4, '#e0c070');
  },

  lake(p) {
    p.vgrad(0, 0, W, 54, '#121c38', '#4a5a8a');
    p.stars(50, 0, 0, W, 40);
    p.circle(96, 30, 6, '#f4ecd0');
    p.glow(96, 30, 16, '#f4ecd0', 0.3);
    p.poly(
      [
        [0, 50],
        [20, 44],
        [44, 48],
        [70, 42],
        [98, 48],
        [128, 44],
        [128, 56],
        [0, 56],
      ],
      '#1a2a34',
    );
    pines(p, 56, '#122028', 5, 12, 3, 6);
    // вода с лунной дорожкой
    p.vgrad(0, 56, W, 30, '#243e60', '#1a3050', 3);
    for (let i = 0; i < 16; i++) {
      const y = 58 + p.rng.int(26);
      const x = p.rng.int(W);
      p.hl(x, x + 3 + p.rng.int(8), y, '#5a7aa8', 0.4);
    }
    for (let y = 58; y < 86; y += 2) {
      const w = 2 + ((y * 7) % 5);
      p.hl(96 - w, 96 + w, y, '#f4ecd0', 0.5 - (y - 58) / 70);
    }
    // берег, камыш, мостки
    p.vgrad(0, 84, W, 16, '#2a3a24', '#1c2818', 3);
    for (let i = 0; i < 40; i++) p.set(p.rng.int(W), 86 + p.rng.int(14), '#4a6a34');
    for (const x0 of [0, 108]) {
      for (let i = 0; i < 9; i++) {
        const x = x0 + 2 + i * 2 + p.rng.int(2);
        const h = 10 + p.rng.int(10);
        p.vl(x, 88 - h, 88, '#3a5a2a');
        if (i % 3 === 0) p.rect(x, 88 - h, 2, 4, '#7a4a2a');
      }
    }
    p.rect(0, 70, 34, 4, '#7a5234');
    for (let x = 0; x < 34; x += 5) p.vl(x, 70, 73, '#5a3a22');
    for (const x of [4, 18, 31]) p.rect(x, 74, 2, 12, '#4a3020');
    for (let i = 0; i < 12; i++) {
      const x = p.rng.int(W);
      const y = 50 + p.rng.int(40);
      p.set(x, y, '#e8f07a');
      p.glow(x, y, 3, '#e8f07a', 0.25);
    }
  },

  tavern(p) {
    p.rect(0, 0, W, 60, '#5a3a24');
    for (let x = 0; x < W; x += 9) {
      p.vl(x, 0, 59, '#3e2616');
      p.vl(x + 4, 0, 59, '#6a4630', 0.5);
    }
    p.rect(0, 6, W, 3, '#3a2414');
    p.rect(0, 44, W, 3, '#3a2414');
    // полки с бутылками и кружками
    p.rect(6, 24, 116, 2, '#7a5234');
    p.rect(6, 38, 116, 2, '#7a5234');
    const bc = ['#3a7a3a', '#7a3a2a', '#a07a3a', '#3a5a8a', '#8a2a4a'];
    for (let x = 8; x < 120; x += 5) {
      const h = 5 + ((x * 3) % 4);
      p.rect(x, 24 - h, 3, h, bc[Math.floor(x / 5) % bc.length]);
      p.rect(x + 1, 24 - h - 2, 1, 2, '#2a1a10');
      p.set(x, 24 - h + 1, '#ffffff', 0.5);
    }
    for (let x = 10; x < 120; x += 8) {
      p.rect(x, 33, 5, 5, '#c8b8a0');
      p.vl(x + 5, 34, 36, '#c8b8a0');
      p.rect(x, 33, 5, 1, '#f4f0e8');
    }
    // фонари
    for (const x of [26, 100]) {
      p.vl(x + 2, 9, 12, '#2a1a10');
      p.rect(x, 12, 5, 7, '#ffc860');
      frame(p, x, 12, 5, 7, '#3a2414');
      p.glow(x + 2, 16, 22, '#ffb050', 0.3);
    }
    // стойка
    p.rect(0, 54, W, 3, '#9a6a3e');
    p.rect(0, 57, W, 17, '#6a4228');
    for (let x = 3; x < W; x += 16) frame(p, x, 59, 13, 13, '#4e2e1a');
    woodFloor(p, 74, '#4a3020', '#3a2418', '#241408');
    // бочки
    for (const [x, y] of [
      [0, 76],
      [12, 76],
      [6, 64],
    ] as Pt[]) {
      p.ellipse(x + 6, y + 9, 6, 9, '#8a5a30');
      p.rect(x, y + 3, 12, 1, '#3a3a3a');
      p.rect(x, y + 14, 12, 1, '#3a3a3a');
      p.vl(x + 6, y + 1, y + 17, '#6a4220', 0.6);
    }
    // стол с кружками и свечой
    p.ellipse(112, 82, 14, 3, '#8a5a34');
    p.rect(110, 84, 4, 12, '#5a3a22');
    p.rect(102, 76, 4, 5, '#c8b8a0');
    p.rect(102, 76, 4, 1, '#ffffff');
    p.rect(118, 76, 4, 5, '#c8b8a0');
    p.rect(118, 76, 4, 1, '#ffffff');
    p.rect(111, 75, 2, 5, '#f4ecdc');
    p.set(111, 74, '#ffc050');
    p.glow(111, 74, 10, '#ffc060', 0.3);
  },

  garden(p) {
    p.vgrad(0, 0, W, 50, '#7ac0ec', '#d4ecf8');
    for (const [x, y] of [
      [20, 14],
      [70, 8],
      [104, 18],
    ] as Pt[]) {
      p.ellipse(x, y, 8, 3, '#ffffff');
      p.ellipse(x + 5, y - 2, 5, 3, '#ffffff');
    }
    // живая изгородь
    p.rect(0, 44, W, 22, '#3a7a3a');
    for (let x = 0; x < W; x += 6) p.circle(x + 3, 45, 4, '#3a7a3a');
    for (let i = 0; i < 90; i++) p.set(p.rng.int(W), 42 + p.rng.int(24), p.rng.next() < 0.5 ? '#4e9a48' : '#2e6430');
    // сакура
    p.rect(12, 34, 5, 38, '#6a4030');
    p.line(14, 40, 4, 30, '#6a4030');
    p.line(15, 38, 26, 28, '#6a4030');
    for (const [x, y, r] of [
      [8, 24, 9],
      [22, 22, 10],
      [14, 14, 9],
      [30, 30, 6],
      [2, 34, 6],
    ] as [number, number, number][]) {
      p.circle(x, y, r, '#f0a0c0');
      p.circle(x - 2, y - 2, r - 3, '#ffc4d8');
    }
    for (let i = 0; i < 30; i++) p.set(p.rng.int(40), 30 + p.rng.int(60), '#ffc4d8');
    // арка с розами
    p.rect(96, 36, 3, 40, '#e8e0d4');
    p.rect(119, 36, 3, 40, '#e8e0d4');
    for (let i = 0; i <= 20; i++) {
      const ang = Math.PI + (i / 20) * Math.PI;
      p.rect(109 + Math.cos(ang) * 11.5, 36 + Math.sin(ang) * 10, 3, 3, '#e8e0d4');
    }
    for (let i = 0; i < 26; i++) {
      const ang = Math.PI + p.rng.next() * Math.PI;
      const onArc = p.rng.next() < 0.5;
      const x = onArc ? 110 + Math.cos(ang) * 12 : [97, 120][p.rng.int(2)] + p.rng.int(3);
      const y = onArc ? 37 + Math.sin(ang) * 10 : 40 + p.rng.int(34);
      p.circle(x, y, 1, '#3a8a3a');
      p.set(x + (p.rng.next() < 0.5 ? 1 : -1), y, ['#e03a5a', '#f07aa0', '#ffffff'][p.rng.int(3)]);
    }
    // клумбы и газон
    p.vgrad(0, 66, W, 34, '#5aa04a', '#3e7e34', 3);
    for (let i = 0; i < 80; i++) p.set(p.rng.int(W), 66 + p.rng.int(34), '#78c060');
    for (let x = 2; x < W; x += 3) {
      if (x > 44 && x < 84) continue;
      p.set(x, 68 + (x % 2), ['#f04a6a', '#f0d040', '#b060e0', '#ffffff', '#f09030'][x % 5]);
      p.set(x, 70 + (x % 2), '#2e6a2a');
    }
    // дорожка
    p.poly(
      [
        [52, 66],
        [76, 66],
        [96, 100],
        [32, 100],
      ],
      '#c8bca8',
    );
    for (let y = 70; y < H; y += 6) {
      const half = 12 + (y - 66) * 0.6;
      p.hl(64 - half, 64 + half, y, '#a89c88');
      for (let x = 64 - half + ((y / 6) % 2) * 5; x < 64 + half; x += 10) p.vl(x, y - 5, y, '#a89c88');
    }
    // бабочки
    for (const [x, y, c] of [
      [36, 56, '#f0d040'],
      [88, 60, '#e070c0'],
    ] as [number, number, string][]) {
      p.set(x, y, c);
      p.set(x + 2, y, c);
      p.set(x + 1, y + 1, '#2a1a10');
    }
  },

  // ——— праздники Легиона ———

  bloodmoon(p) {
    p.vgrad(0, 0, W, 64, '#12040a', '#5a0e1e');
    p.stars(40, 0, 0, W, 40, ['#ffd8d8', '#ffb0b0', '#fff0e0']);
    // алая луна
    p.glow(88, 26, 30, '#ff3a3a', 0.35);
    p.circle(88, 26, 13, '#c81e2a');
    p.circle(88, 26, 12, '#e8303a');
    p.circle(84, 22, 4, '#c81e2a', 0.6);
    p.circle(93, 30, 3, '#b01a24', 0.6);
    p.circle(91, 20, 2, '#b01a24', 0.5);
    // летучие мыши
    for (const [x, y] of [
      [30, 18],
      [44, 12],
      [58, 22],
      [110, 12],
    ] as Pt[]) {
      p.set(x, y, '#12040a');
      p.hl(x - 3, x - 1, y - 1, '#12040a');
      p.hl(x + 1, x + 3, y - 1, '#12040a');
      p.set(x - 4, y, '#12040a');
      p.set(x + 4, y, '#12040a');
    }
    // готический город: шпили и окна
    const town = '#1a0810';
    for (const [x, w, h, spire] of [
      [0, 14, 30, 8],
      [12, 10, 22, 0],
      [22, 16, 40, 14],
      [38, 12, 26, 6],
      [50, 20, 34, 0],
      [70, 10, 44, 16],
      [80, 14, 28, 0],
      [94, 12, 36, 10],
      [106, 22, 24, 0],
    ] as [number, number, number, number][]) {
      p.rect(x, 70 - h, w, h, town);
      if (spire) p.poly([[x, 70 - h], [x + w / 2, 70 - h - spire], [x + w, 70 - h]], town);
      for (let yy = 72 - h; yy < 66; yy += 6) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (p.rng.next() < 0.35) p.rect(xx, yy, 1, 2, '#ffb040');
    }
    p.glow(64, 70, 60, '#ff2a3a', 0.12);
    // мостовая и туман
    p.vgrad(0, 70, W, 30, '#2a0e16', '#1a080e', 3);
    for (let y = 72; y < H; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < W; x += 7) p.hl(x, x + 4, y, '#3a1620', 0.7);
    for (let i = 0; i < 5; i++) p.ellipse(10 + i * 28, 74 + (i % 2) * 3, 18, 3, '#ff5a6a', 0.08);
    // фонари-свечи
    for (const x of [8, 118]) {
      p.rect(x, 62, 2, 30, '#140408');
      p.rect(x - 2, 58, 6, 6, '#ffb040');
      frame(p, x - 2, 58, 6, 6, '#140408');
      p.glow(x + 1, 61, 14, '#ff9a40', 0.3);
    }
  },

  tides(p) {
    p.vgrad(0, 0, W, 50, '#140a30', '#3a4a8a');
    p.stars(45, 0, 0, W, 34);
    p.glow(30, 20, 18, '#e8f4ff', 0.3);
    p.circle(30, 20, 7, '#eef6ff');
    p.circle(32, 18, 6, '#d8e8f8', 0.35);
    // дворец на горизонте
    for (const [x, w, h] of [
      [86, 6, 14],
      [92, 10, 20],
      [102, 6, 12],
      [108, 4, 16],
    ] as [number, number, number][]) {
      p.rect(x, 50 - h, w, h, '#24305a');
      p.poly([[x - 1, 50 - h], [x + w / 2, 50 - h - 5], [x + w + 1, 50 - h]], '#2a3a6a');
      p.set(x + Math.floor(w / 2), 50 - h + 4, '#9fe8ff');
    }
    // море и волны
    p.vgrad(0, 50, W, 30, '#1e4a8a', '#0e2a5a', 3);
    for (let y = 52; y < 80; y += 3) {
      const off = (y * 5) % 11;
      for (let x = -off; x < W; x += 11) p.hl(x, x + 4, y, '#5aa0e0', 0.45);
    }
    for (let y = 52; y < 78; y += 2) {
      const w = 2 + ((y * 3) % 4);
      p.hl(30 - w, 30 + w, y, '#eef6ff', 0.45 - (y - 52) / 70);
    }
    // гребень волны
    p.poly([[0, 80], [18, 72], [36, 78], [58, 70], [80, 78], [104, 71], [128, 77], [128, 84], [0, 84]], '#3a8ac8');
    for (let x = 0; x < W; x += 3) p.set(x, 73 + ((x * 7) % 6), '#e6f6ff', 0.8);
    // песок, ракушки, кораллы
    p.vgrad(0, 84, W, 16, '#e0c890', '#b89a64', 3);
    for (let i = 0; i < 30; i++) p.set(p.rng.int(W), 86 + p.rng.int(14), '#f4e0b0');
    for (const [x, c] of [
      [12, '#ff7a8a'],
      [22, '#ffb07a'],
      [108, '#ff7ab0'],
      [118, '#ff9a6a'],
    ] as [number, string][]) {
      p.vl(x, 80, 92, c);
      p.line(x, 86, x - 3, 82, c);
      p.line(x, 88, x + 3, 83, c);
    }
    for (const x of [40, 70, 92]) {
      p.ellipse(x, 94, 3, 2, '#f8e8f0');
      p.set(x, 93, '#e0a0b0');
    }
    // гирлянда фонариков
    for (let x = 0; x <= W; x++) {
      const y = 8 + Math.round(Math.sin((x / W) * Math.PI) * 10);
      p.set(x, y, '#2a1a3a');
      if (x % 12 === 6) {
        const c = ['#ffd24a', '#6ff0e0', '#ff8ac0'][(x / 12) % 3 | 0];
        p.rect(x - 1, y + 1, 3, 4, c);
        p.glow(x, y + 3, 6, c, 0.3);
      }
    }
  },

  sakura(p) {
    p.vgrad(0, 0, W, 56, '#3a1e4a', '#f0a0a0');
    p.glow(64, 52, 40, '#ffd0a0', 0.3);
    // горы
    p.poly([[0, 46], [22, 26], [40, 40], [62, 18], [86, 38], [104, 24], [128, 40], [128, 60], [0, 60]], '#6a3a6a');
    p.poly([[56, 24], [62, 18], [68, 24], [64, 25]], '#f8e8f0');
    p.poly([[0, 54], [30, 42], [60, 50], [92, 40], [128, 50], [128, 64], [0, 64]], '#4a2a4a');
    // тории
    const red = '#c8243a';
    p.rect(50, 34, 28, 3, red);
    p.rect(48, 32, 32, 2, '#2a1418');
    p.rect(52, 40, 24, 2, red);
    p.rect(54, 34, 3, 40, red);
    p.rect(71, 34, 3, 40, red);
    p.rect(62, 37, 4, 3, '#2a1418');
    // сакуры по краям
    for (const [tx, flip] of [
      [12, 1],
      [116, -1],
    ] as [number, number][]) {
      p.rect(tx - 2, 44, 5, 40, '#5a3024');
      p.line(tx, 52, tx + 12 * flip, 40, '#5a3024');
      p.line(tx, 48, tx - 8 * flip, 36, '#5a3024');
      for (const [dx, dy, r] of [
        [0, 32, 11],
        [12, 36, 9],
        [-8, 38, 8],
        [6, 24, 9],
        [-4, 26, 7],
      ] as [number, number, number][]) {
        p.circle(tx + dx * flip, dy, r, '#e888b0');
        p.circle(tx + dx * flip - 2, dy - 2, r - 3, '#ffc4d8');
      }
    }
    // земля и каменная дорожка
    p.vgrad(0, 64, W, 36, '#6a8a4a', '#3e5a30', 3);
    p.poly([[56, 64], [72, 64], [92, 100], [36, 100]], '#b8aca0');
    for (let y = 68; y < H; y += 6) {
      const half = 8 + (y - 64) * 0.55;
      p.hl(64 - half, 64 + half, y, '#9a8e80');
    }
    // бумажные фонари
    for (const [x, y] of [
      [30, 56],
      [98, 56],
    ] as Pt[]) {
      p.vl(x + 2, y + 6, y + 30, '#3a2418');
      p.ellipse(x + 2, y + 2, 4, 5, '#ff5a4a');
      p.hl(x - 1, x + 5, y - 3, '#2a1418');
      p.hl(x - 1, x + 5, y + 7, '#2a1418');
      p.glow(x + 2, y + 2, 12, '#ffb070', 0.3);
    }
    // лепестки
    for (let i = 0; i < 60; i++) p.set(p.rng.int(W), p.rng.int(H), p.rng.next() < 0.5 ? '#ffc4d8' : '#ff9ac0', 0.9);
  },

  tourney(p) {
    // вечерняя арена Вальхаллы: трибуны, флаги, песок
    p.vgrad(0, 0, W, 40, '#2a1a3a', '#e0905a');
    p.glow(64, 40, 44, '#ffd070', 0.3);
    p.stars(12, 0, 0, W, 18);
    // трибуны — ярусы арки
    for (let row = 0; row < 3; row++) {
      const y = 30 + row * 9;
      p.rect(0, y, W, 9, ['#5a4a5a', '#4a3a4a', '#3a2c3a'][row]);
      for (let x = 2 + (row % 2) * 4; x < W; x += 8) {
        p.rect(x, y + 2, 4, 5, '#2a1e2a');
        // зрители — цветные точки
        p.set(x + 1, y + 3, ['#e03a3a', '#3d7be0', '#f2d46b', '#4fbf5a'][(x + row) % 4]);
        p.set(x + 2, y + 3, '#f4d3b8');
      }
    }
    // колонны и флаги
    for (const x of [8, 40, 88, 120]) {
      p.rect(x - 2, 22, 5, 36, '#d8ccb8');
      p.rect(x - 3, 20, 7, 3, '#f2e6d8');
      p.vl(x, 8, 20, '#6a4a2a');
      const c = x < 64 ? '#e03a3a' : '#3d7be0';
      p.poly([[x + 1, 8], [x + 12, 11], [x + 1, 14]], c);
      p.hl(x + 1, x + 8, 11, '#f2d46b');
    }
    // песок арены и круг
    p.vgrad(0, 57, W, 43, '#d8b070', '#a07840', 3);
    p.ellipse(64, 82, 52, 12, '#c89a5a');
    p.ellipse(64, 82, 48, 10, '#d8b070');
    for (let i = 0; i < 40; i++) p.set(p.rng.int(W), 60 + p.rng.int(40), '#b88a50', 0.8);
    // оружие на стойке
    p.vl(18, 70, 90, '#6a4a2a');
    p.line(14, 72, 22, 72, '#6a4a2a');
    p.vl(15, 62, 72, '#c8d0dc');
    p.vl(21, 64, 72, '#c8d0dc');
    p.circle(108, 84, 5, '#9a6a3a');
    p.circle(108, 84, 3, '#e6b23a');
  },

  mine(p) {
    // пещера: своды, рельсы, фонари и кристаллы
    p.vgrad(0, 0, W, H, '#140e1a', '#2a1e30', 3);
    // своды
    p.poly([[0, 0], [W, 0], [W, 18], [110, 26], [90, 16], [70, 24], [48, 14], [26, 24], [0, 16]], '#0a060c');
    p.poly([[0, 100], [0, 70], [14, 62], [26, 74], [0, 100]], '#0e0a12');
    p.poly([[W, 100], [W, 66], [112, 60], [100, 72], [W, 100]], '#0e0a12');
    // кристаллы
    for (const [x, y, c, hgt] of [
      [20, 60, '#c05aff', 14],
      [28, 64, '#ff6a8a', 9],
      [104, 58, '#40e0d0', 13],
      [112, 62, '#c05aff', 8],
      [60, 22, '#ff6a8a', 7],
      [76, 20, '#40e0d0', 6],
    ] as [number, number, string, number][]) {
      p.poly([[x, y], [x + 3, y - hgt], [x + 6, y]], c);
      p.poly([[x + 3, y - hgt], [x + 6, y], [x + 4, y]], '#ffffff', 0.35);
      p.glow(x + 3, y - hgt / 2, 10, c, 0.25);
    }
    // рельсы в глубину
    p.poly([[40, 100], [58, 50], [70, 50], [88, 100]], '#2a1c1a');
    for (let y = 52; y < H; y += 5) {
      const half = 6 + (y - 50) * 0.45;
      p.hl(64 - half, 64 + half, y, '#5a3a24');
    }
    p.line(58, 50, 40, 100, '#9a9aa8');
    p.line(70, 50, 88, 100, '#9a9aa8');
    // вагонетка с рудой
    p.rect(74, 78, 22, 10, '#6a4a3a');
    p.rect(74, 78, 22, 2, '#8a6a4a');
    p.circle(78, 89, 2, '#3a3a3a');
    p.circle(92, 89, 2, '#3a3a3a');
    for (const [x, c] of [[77, '#ff6a8a'], [82, '#c05aff'], [87, '#40e0d0'], [92, '#f2d46b']] as [number, string][]) p.circle(x, 77, 2, c);
    // фонари на стойках
    for (const x of [34, 94]) {
      p.vl(x, 34, 60, '#4a3020');
      p.rect(x - 2, 30, 5, 5, '#ffc860');
      p.glow(x, 32, 14, '#ffb050', 0.35);
    }
    // пыль
    for (let i = 0; i < 40; i++) p.set(p.rng.int(W), p.rng.int(H), '#c8a8e8', 0.35);
  },
};

const cache = new Map<SceneBg, string>();

/** Фон места как data-URL (рисуется один раз). */
export function sceneUrl(id: SceneBg): string {
  let u = cache.get(id);
  if (!u) {
    const p = new Painter(new Rng(id.split('').reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) >>> 0));
    SCENES[id](p);
    u = p.url();
    cache.set(id, u);
  }
  return u;
}
