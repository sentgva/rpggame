/**
 * Процедурный пиксель-арт: героини, враги и боссы собираются из слоёв
 * (волосы, тело, одежда, аксессуары, оружие, крылья/хвосты) по параметрам Look.
 * Логический размер 32×32, отображается ×3 (96×96) и ×6 для боссов (192×192)
 * с масштабированием без сглаживания. Модуль без DOM — работает и в Node (превью).
 */
import type { Element, Look } from '@idle/shared';
import { ELEMENT_COLORS } from '@idle/shared';
import { darken, hex, lighten, mix, type RGBA } from './color';

export type WeaponKind = 'sword' | 'axe' | 'bow' | 'staff' | 'wand' | 'scythe' | 'daggers' | 'lute' | 'none';
export type BodyKind = 'robe' | 'tunic' | 'plate';

export interface SpriteSpec {
  look: Look;
  weapon: WeaponKind;
  body: BodyKind;
  element: Element;
  /** Тёмный двойник (механика Никты). */
  shadow?: boolean;
  /** Тонировка (статус «заморожена», «призрак» и т. п.). */
  tint?: string;
}

export interface Bitmap {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

export const SPRITE_W = 32;
export const SPRITE_H = 32;

class Sym {
  g: string[];
  constructor(
    public w: number,
    public h: number,
  ) {
    this.g = new Array(w * h).fill('');
  }
  set(x: number, y: number, s: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.g[y * this.w + x] = s;
  }
  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '';
    return this.g[y * this.w + x];
  }
  hl(x0: number, x1: number, y: number, s: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, s);
  }
  vl(x: number, y0: number, y1: number, s: string) {
    for (let y = y0; y <= y1; y++) this.set(x, y, s);
  }
  rect(x0: number, y0: number, x1: number, y1: number, s: string) {
    for (let y = y0; y <= y1; y++) this.hl(x0, x1, y, s);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, s: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) this.set(x, y, s);
      }
  }
  /** Толстая линия по точкам. */
  path(pts: [number, number][], width: number, s: string, shade?: string) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / steps);
        const y = Math.round(y0 + ((y1 - y0) * k) / steps);
        for (let dx = 0; dx < width; dx++) this.set(x + dx - Math.floor(width / 2), y, shade && dx === 0 ? shade : s);
      }
    }
  }
  patch(rows: string[], ox: number, oy: number) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c !== '.' && c !== ' ') this.set(ox + x, oy + y, c);
      }
    });
  }
}

// ——— слои ———

function drawHead(c: Sym) {
  c.hl(13, 18, 5, 'S');
  c.hl(11, 20, 6, 'S');
  c.rect(10, 7, 21, 12, 'S');
  c.hl(10, 21, 13, 'S');
  c.set(10, 13, 's');
  c.hl(11, 20, 14, 'S');
  c.set(11, 14, 's');
  c.hl(12, 19, 15, 'S');
  c.set(12, 15, 's');
  c.set(13, 15, 's');
  // глаза 2×2, блик, румянец, рот
  c.set(15, 10, 'E');
  c.set(16, 10, 'E');
  c.set(15, 11, 'E');
  c.set(16, 11, 'e');
  c.set(19, 10, 'E');
  c.set(20, 10, 'E');
  c.set(19, 11, 'E');
  c.set(20, 11, 'e');
  c.set(14, 12, 'P');
  c.set(21, 12, 'P');
  c.set(18, 13, 'M');
  // шея
  c.hl(14, 17, 16, 'S');
  c.set(14, 16, 's');
}

function drawBody(c: Sym, body: BodyKind, lower: 'legs' | 'none') {
  if (body === 'plate') {
    c.hl(12, 19, 17, 'K');
    c.hl(8, 11, 18, 'K');
    c.hl(20, 23, 18, 'K');
    c.hl(12, 19, 18, 'O');
    c.hl(8, 11, 19, 'k');
    c.hl(20, 23, 19, 'K');
    c.set(20, 19, 'k');
    c.hl(12, 19, 19, 'O');
    c.hl(9, 10, 20, 'k');
    c.hl(21, 22, 20, 'k');
    c.hl(12, 19, 20, 'K');
    c.set(12, 20, 'k');
    c.hl(9, 10, 21, 'k');
    c.hl(21, 22, 21, 'k');
    c.hl(12, 19, 21, 'K');
    c.set(12, 21, 'k');
    c.set(15, 20, 'T');
    c.set(16, 20, 'T');
    c.hl(9, 10, 22, 'S');
    c.hl(21, 22, 22, 'S');
    c.hl(12, 19, 22, 'b');
    c.hl(11, 20, 23, 'O');
    c.set(11, 23, 'o');
    c.hl(11, 20, 24, 'K');
    c.set(11, 24, 'k');
    c.hl(10, 21, 25, 'O');
    c.set(10, 25, 'o');
    c.hl(10, 21, 26, 'T');
    if (lower === 'legs') {
      c.hl(12, 14, 27, 'k');
      c.hl(17, 19, 27, 'k');
      c.hl(12, 14, 28, 'K');
      c.hl(17, 19, 28, 'K');
      c.hl(12, 14, 29, 'K');
      c.hl(17, 19, 29, 'K');
      c.hl(12, 14, 30, 'K');
      c.hl(17, 19, 30, 'K');
      c.set(12, 30, 'k');
      c.set(17, 30, 'k');
      c.hl(11, 14, 31, 'k');
      c.hl(17, 20, 31, 'k');
    }
    return;
  }
  // общий верх для мантии и туники
  c.hl(12, 19, 17, 'O');
  c.set(12, 17, 'T');
  c.set(19, 17, 'T');
  if (body === 'robe') {
    c.set(15, 17, 'T');
    c.set(16, 17, 'T');
  }
  c.hl(11, 20, 18, 'O');
  c.set(11, 18, 'o');
  c.hl(10, 21, 19, 'O');
  c.set(10, 19, 'o');
  c.hl(9, 22, 20, 'O');
  c.set(9, 20, 'o');
  c.set(10, 20, 'o');
  c.hl(9, 10, 21, 'o');
  c.hl(12, 19, 21, 'O');
  c.set(12, 21, 'o');
  c.hl(21, 22, 21, 'O');
  c.hl(9, 10, 22, 'S');
  c.hl(21, 22, 22, 'S');
  c.hl(12, 19, 22, 'b');
  if (body === 'robe') {
    c.hl(11, 20, 23, 'O');
    c.set(11, 23, 'o');
    c.hl(10, 21, 24, 'O');
    c.set(10, 24, 'o');
    c.hl(10, 21, 25, 'O');
    c.set(10, 25, 'o');
    c.hl(9, 22, 26, 'O');
    c.set(9, 26, 'o');
    c.hl(8, 23, 27, 'O');
    c.set(8, 27, 'o');
    c.set(9, 27, 'o');
    c.vl(16, 23, 27, 't');
    c.hl(8, 23, 28, 'T');
    if (lower === 'legs') {
      c.hl(13, 14, 29, 'S');
      c.hl(18, 19, 29, 'S');
      c.hl(13, 14, 30, 'B');
      c.hl(18, 19, 30, 'B');
      c.hl(12, 14, 31, 'B');
      c.hl(18, 20, 31, 'B');
    }
  } else {
    c.hl(11, 20, 23, 'O');
    c.set(11, 23, 'o');
    c.hl(11, 20, 24, 'O');
    c.set(11, 24, 'o');
    c.hl(10, 21, 25, 'O');
    c.set(10, 25, 'o');
    c.hl(10, 21, 26, 'T');
    if (lower === 'legs') {
      c.hl(12, 14, 27, 'o');
      c.hl(17, 19, 27, 'o');
      c.hl(12, 14, 28, 'B');
      c.hl(17, 19, 28, 'B');
      c.hl(12, 14, 29, 'B');
      c.hl(17, 19, 29, 'B');
      c.hl(12, 14, 30, 'B');
      c.hl(17, 19, 30, 'B');
      c.hl(11, 14, 31, 'B');
      c.hl(17, 20, 31, 'B');
    }
  }
}

function drawHairBack(c: Sym, style: Look['style']) {
  switch (style) {
    case 'long':
      c.rect(8, 6, 12, 23, 'H');
      c.vl(8, 6, 23, 'h');
      c.hl(9, 12, 24, 'H');
      c.hl(10, 12, 25, 'h');
      c.rect(20, 7, 23, 18, 'H');
      c.vl(23, 7, 18, 'h');
      c.hl(21, 23, 19, 'h');
      break;
    case 'bob':
      c.rect(8, 6, 23, 14, 'H');
      c.hl(9, 22, 15, 'h');
      c.vl(8, 6, 14, 'h');
      break;
    case 'short':
      c.rect(9, 6, 22, 11, 'H');
      break;
    case 'ponytail':
      c.rect(9, 6, 22, 11, 'H');
      c.path(
        [
          [8, 7],
          [6, 9],
          [5, 12],
          [4, 15],
          [4, 18],
          [5, 21],
        ],
        3,
        'H',
        'h',
      );
      break;
    case 'twintails':
      c.rect(9, 6, 22, 11, 'H');
      c.path(
        [
          [8, 8],
          [6, 11],
          [5, 15],
          [5, 19],
          [6, 23],
        ],
        3,
        'H',
        'h',
      );
      c.path(
        [
          [24, 8],
          [26, 11],
          [27, 15],
          [27, 19],
          [26, 23],
        ],
        3,
        'H',
        'h',
      );
      break;
    case 'braid':
      c.rect(9, 6, 22, 12, 'H');
      for (let y = 13; y <= 27; y++) c.hl(9, 11, y, y % 2 ? 'H' : 'h');
      c.set(10, 28, 'T');
      break;
    case 'bun':
      c.rect(9, 6, 22, 11, 'H');
      break;
    case 'wild':
      c.rect(7, 5, 24, 17, 'H');
      c.vl(7, 5, 17, 'h');
      for (const [x, y] of [
        [5, 7],
        [6, 7],
        [5, 11],
        [6, 11],
        [5, 15],
        [6, 15],
        [9, 18],
        [9, 19],
        [22, 18],
        [25, 8],
        [25, 12],
        [26, 12],
      ] as [number, number][])
        c.set(x, y, 'h');
      break;
  }
}

function drawHairFront(c: Sym, style: Look['style']) {
  c.hl(13, 18, 3, 'H');
  c.hl(11, 20, 4, 'H');
  c.hl(10, 21, 5, 'H');
  c.hl(9, 22, 6, 'H');
  c.hl(9, 22, 7, 'H');
  // блик
  c.hl(12, 15, 4, 'L');
  c.set(11, 5, 'L');
  // чёлка прядями
  c.hl(9, 22, 8, 'H');
  for (const x of [14, 17, 20]) c.set(x, 8, 'S');
  for (const x of [9, 10, 12, 15, 16, 18, 21, 22]) c.set(x, 9, x === 12 || x === 18 ? 'h' : 'H');
  c.set(13, 9, 'S');
  c.set(14, 9, 'S');
  c.set(17, 9, 'S');
  c.set(19, 9, 'S');
  c.set(20, 9, 'S');
  // боковые пряди
  const sideEnd = style === 'short' || style === 'bun' ? 11 : style === 'bob' ? 14 : 13;
  c.vl(9, 9, sideEnd, 'H');
  c.vl(10, 9, sideEnd - 1, 'h');
  c.vl(22, 9, 10, 'H');
  if (style === 'wild') {
    for (const [x, y] of [
      [12, 2],
      [15, 1],
      [16, 2],
      [19, 2],
      [21, 3],
      [8, 5],
    ] as [number, number][])
      c.set(x, y, 'H');
  }
  if (style === 'bun') {
    c.ellipse(15.5, 1.8, 3, 1.8, 'H');
    c.hl(14, 16, 1, 'L');
    c.hl(13, 18, 3, 'T');
  }
  if (style === 'ponytail') {
    c.set(8, 7, 'T');
    c.set(8, 8, 'T');
  }
  if (style === 'twintails') {
    c.set(8, 8, 'T');
    c.set(24, 8, 'T');
  }
}

function drawAccessory(c: Sym, acc: Look['acc']) {
  switch (acc) {
    case 'witchHat':
      c.hl(6, 25, 6, 'A');
      c.hl(7, 24, 7, 'a');
      c.hl(10, 21, 5, 'A');
      c.hl(11, 20, 4, 'A');
      c.hl(12, 19, 3, 'A');
      c.hl(12, 18, 2, 'A');
      c.hl(11, 16, 1, 'A');
      c.hl(9, 13, 0, 'A');
      c.hl(11, 20, 5, 'T');
      c.set(17, 5, 'G');
      break;
    case 'crown':
      c.hl(12, 19, 3, 'A');
      c.hl(12, 19, 4, 'a');
      for (const x of [12, 15, 16, 19]) c.set(x, 2, 'A');
      c.set(12, 1, 'A');
      c.set(15, 1, 'A');
      c.set(19, 1, 'A');
      c.set(16, 3, 'G');
      break;
    case 'tiara':
      c.hl(12, 19, 5, 'A');
      c.set(15, 4, 'A');
      c.set(16, 4, 'G');
      c.set(16, 3, 'A');
      break;
    case 'hood':
      c.hl(12, 19, 2, 'A');
      c.hl(10, 21, 3, 'A');
      c.hl(9, 22, 4, 'A');
      c.hl(8, 23, 5, 'A');
      c.hl(8, 23, 6, 'A');
      c.hl(8, 11, 7, 'A');
      c.hl(21, 23, 7, 'A');
      c.vl(8, 7, 16, 'a');
      c.vl(9, 7, 15, 'A');
      c.vl(23, 7, 12, 'a');
      c.hl(10, 22, 6, 'a');
      break;
    case 'mask':
      c.hl(13, 21, 12, 'A');
      c.hl(13, 21, 13, 'A');
      c.hl(14, 20, 14, 'a');
      break;
    case 'horns':
      c.path(
        [
          [11, 5],
          [9, 3],
          [8, 1],
          [9, 0],
        ],
        2,
        'A',
        'a',
      );
      c.path(
        [
          [20, 5],
          [22, 3],
          [23, 1],
          [22, 0],
        ],
        2,
        'A',
        'a',
      );
      break;
    case 'halo':
      c.hl(11, 20, 0, 'G');
      c.set(10, 1, 'G');
      c.set(21, 1, 'G');
      c.hl(11, 20, 1, 'g');
      break;
    case 'flower':
      c.set(20, 4, 'A');
      c.set(22, 4, 'A');
      c.set(21, 3, 'A');
      c.set(21, 5, 'A');
      c.set(21, 4, 'G');
      c.set(19, 5, 'V');
      break;
    case 'helmet':
      c.hl(11, 20, 2, 'K');
      c.hl(10, 21, 3, 'K');
      c.hl(9, 22, 4, 'K');
      c.hl(9, 22, 5, 'k');
      c.hl(9, 22, 6, 'K');
      c.vl(9, 7, 12, 'K');
      c.vl(10, 7, 11, 'k');
      c.set(15, 1, 'A');
      c.set(16, 1, 'A');
      c.set(16, 0, 'A');
      c.hl(14, 17, 6, 'A');
      break;
    case 'elfEars':
      c.set(8, 10, 'S');
      c.set(7, 9, 'S');
      c.set(6, 8, 's');
      c.set(23, 10, 'S');
      c.set(24, 9, 's');
      break;
    case 'veil':
      c.hl(11, 20, 3, 'A');
      c.hl(9, 22, 4, 'A');
      c.vl(8, 5, 22, 'A');
      c.vl(7, 7, 21, 'a');
      c.vl(23, 5, 18, 'a');
      c.hl(10, 21, 5, 'T');
      break;
    case 'bandana':
      c.hl(9, 22, 6, 'A');
      c.hl(9, 22, 7, 'a');
      c.set(7, 7, 'A');
      c.set(6, 8, 'A');
      c.set(7, 9, 'a');
      break;
    case 'catEars':
      c.set(11, 2, 'H');
      c.hl(11, 12, 3, 'H');
      c.set(12, 3, 'P');
      c.set(20, 2, 'H');
      c.hl(19, 20, 3, 'H');
      c.set(19, 3, 'P');
      c.set(10, 1, 'H');
      c.set(21, 1, 'H');
      break;
    default:
      break;
  }
}

function drawWeapon(c: Sym, w: WeaponKind) {
  switch (w) {
    case 'sword':
      c.vl(24, 9, 21, 'K');
      c.vl(25, 10, 20, 'k');
      c.set(24, 8, 'K');
      c.hl(22, 27, 22, 'T');
      c.vl(24, 23, 25, 'W');
      c.set(24, 26, 'T');
      // щит в дальней руке
      c.rect(4, 18, 10, 26, 'A');
      c.vl(4, 18, 26, 'a');
      c.hl(5, 9, 27, 'a');
      c.rect(6, 20, 8, 23, 'T');
      c.set(7, 21, 'G');
      break;
    case 'axe':
      c.vl(23, 9, 28, 'W');
      c.vl(24, 10, 27, 'w');
      c.patch(['..KKK', '.KKKKK', 'KKKKKK', 'KKKKKk', '.KKKk', '..Kk'], 24, 8);
      c.set(23, 8, 'k');
      break;
    case 'bow':
      c.path(
        [
          [23, 11],
          [25, 13],
          [26, 17],
          [26, 22],
          [25, 26],
          [23, 29],
        ],
        1,
        'W',
      );
      c.vl(23, 12, 28, 'R');
      c.set(26, 19, 'w');
      c.set(26, 20, 'w');
      break;
    case 'staff':
      c.vl(24, 7, 30, 'W');
      c.set(24, 30, 'w');
      c.vl(25, 8, 29, 'w');
      c.patch(['.K.K.', 'K.G.K', '.GGG.', 'K.G.K', '.K.K.'], 22, 2);
      break;
    case 'wand':
      c.vl(24, 16, 23, 'T');
      c.vl(25, 17, 22, 't');
      c.ellipse(24.5, 14, 1.6, 1.6, 'G');
      c.set(24, 13, 'e');
      c.set(22, 14, 'T');
      c.set(27, 14, 'T');
      break;
    case 'scythe':
      c.vl(24, 5, 30, 'k');
      c.vl(25, 6, 29, 'W');
      c.patch(['..KKKKKKKK', '.KKkkkkkkK', 'KKk.......', 'Kk........', 'k.........'], 15, 3);
      break;
    case 'daggers':
      c.vl(24, 17, 21, 'K');
      c.set(25, 18, 'k');
      c.hl(23, 25, 22, 'T');
      c.set(24, 23, 'W');
      c.vl(7, 18, 21, 'K');
      c.hl(6, 8, 22, 'T');
      c.set(7, 23, 'W');
      break;
    case 'lute':
      c.ellipse(20.5, 24, 3.4, 2.6, 'W');
      c.ellipse(20.5, 24, 1, 1, 'w');
      c.path(
        [
          [23, 22],
          [25, 19],
          [27, 16],
        ],
        1,
        'w',
      );
      c.hl(26, 28, 15, 'T');
      c.set(18, 24, 'R');
      break;
    default:
      break;
  }
}

function drawExtraBack(c: Sym, extra: Look['extra']) {
  switch (extra) {
    case 'wings':
      c.patch(
        [
          '.....QQ',
          '...QQQQ',
          '..QQQqQ',
          '.QQQqQQ',
          'QQQqQQq',
          'QQqQQq.',
          'QqQQq..',
          'qQQq...',
          'QQq....',
          'Qq.....',
        ],
        1,
        14,
      );
      c.patch(['QQ...', 'QQQ..', 'qQQQ.', '.qQQ.', '..qQ.'], 23, 15);
      break;
    case 'darkWings':
      c.patch(
        [
          '......D',
          '....DDD',
          '..DDDDd',
          '.DDdDdD',
          'DDd.Dd.',
          'Dd..d..',
          'D..d...',
          'd......',
        ],
        1,
        13,
      );
      c.patch(['DD...', 'DDD..', 'dDDD.', '.dDd.', '..d..'], 23, 14);
      break;
    case 'tail':
      c.path(
        [
          [11, 24],
          [8, 25],
          [5, 24],
          [3, 21],
          [3, 18],
        ],
        2,
        'H',
        'h',
      );
      c.set(2, 17, 'H');
      c.set(4, 17, 'H');
      c.set(3, 16, 'H');
      break;
    case 'scorpion':
      c.path(
        [
          [10, 24],
          [6, 24],
          [4, 21],
          [3, 17],
          [4, 13],
          [7, 11],
        ],
        2,
        'Z',
        'z',
      );
      c.set(8, 12, 'G');
      c.set(9, 13, 'G');
      break;
    case 'gears':
      c.ellipse(6, 18, 4, 4, 'K');
      c.ellipse(6, 18, 1.5, 1.5, 'k');
      for (const [x, y] of [
        [6, 13],
        [6, 23],
        [1, 18],
        [11, 18],
        [2, 14],
        [10, 22],
        [2, 22],
        [10, 14],
      ] as [number, number][])
        c.set(x, y, 'k');
      break;
    default:
      break;
  }
}

function drawLowerExtra(c: Sym, extra: Look['extra']): boolean {
  if (extra === 'snake') {
    c.patch(
      [
        '..ZZZZZZZZZZZZ....',
        '.ZZzZZzZZzZZzZZ...',
        'ZZZZZZZZZZZZZZZZ..',
        'zZZzZZzZZzZZZZZZZ.',
        '.zzzzzzzzzzzzzZZZZ',
      ],
      7,
      27,
    );
    return true;
  }
  if (extra === 'fishTail') {
    c.patch(['..ZZZZZZZZ.....', '...ZzZZzZZZ....', '....ZZZZZZZZ.GG', '.....zzzZZZZGGG', '..........zGGG.'], 9, 27);
    return true;
  }
  return false;
}

function drawExtraFront(c: Sym, extra: Look['extra']) {
  if (extra === 'vines') {
    for (const [x, y, s] of [
      [11, 18, 'V'],
      [12, 19, 'V'],
      [13, 20, 'v'],
      [19, 23, 'V'],
      [20, 24, 'V'],
      [21, 25, 'v'],
      [10, 26, 'V'],
      [11, 27, 'v'],
      [22, 7, 'V'],
      [23, 6, 'v'],
      [9, 12, 'v'],
    ] as [number, number, string][])
      c.set(x, y, s);
  }
}

// ——— раскраска ———

function palette(spec: SpriteSpec): Record<string, RGBA> {
  const L = spec.look;
  const skin = hex(L.skin);
  const hair = hex(L.hair);
  const outfit = hex(L.outfit);
  const trim = hex(L.trim);
  const acc = hex(L.accColor ?? L.trim);
  const elem = hex(ELEMENT_COLORS[spec.element]);
  const eyes = hex(L.eyes);
  return {
    S: skin,
    s: darken(skin, 0.18),
    E: eyes,
    e: lighten(eyes, 0.7),
    P: mix(skin, hex('#E86A7A'), 0.45),
    M: mix(skin, hex('#A83A4A'), 0.6),
    H: hair,
    h: darken(hair, 0.25),
    L: lighten(hair, 0.35),
    O: outfit,
    o: darken(outfit, 0.25),
    T: trim,
    t: darken(trim, 0.25),
    B: darken(outfit, 0.55),
    b: darken(trim, 0.15),
    A: acc,
    a: darken(acc, 0.25),
    K: hex('#D8DEE8'),
    k: hex('#8A92A6'),
    W: hex('#9A6A3A'),
    w: hex('#6A4424'),
    G: elem,
    g: darken(elem, 0.3),
    R: hex('#F2E6D8'),
    Q: hex('#F6F2FF'),
    q: hex('#C8C0E0'),
    D: hex('#3A1E44'),
    d: hex('#24102A'),
    Z: mix(trim, outfit, 0.3),
    z: darken(mix(trim, outfit, 0.3), 0.3),
    V: hex('#3F8A34'),
    v: hex('#7ACF5A'),
    X: hex('#1A1016'),
  };
}

export function renderSprite(spec: SpriteSpec): Bitmap {
  const c = new Sym(SPRITE_W, SPRITE_H);
  const L = spec.look;
  drawExtraBack(c, L.extra);
  drawHairBack(c, L.style);
  drawHead(c);
  const replacedLegs = L.extra === 'snake' || L.extra === 'fishTail';
  drawBody(c, spec.body, replacedLegs ? 'none' : 'legs');
  if (replacedLegs) drawLowerExtra(c, L.extra);
  drawHairFront(c, L.style);
  drawAccessory(c, L.acc);
  drawWeapon(c, spec.weapon);
  drawExtraFront(c, L.extra);

  // контур: прозрачные пиксели рядом с непрозрачными
  const outline: [number, number][] = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      if (c.get(x, y)) continue;
      if (c.get(x - 1, y) || c.get(x + 1, y) || c.get(x, y - 1) || c.get(x, y + 1)) outline.push([x, y]);
    }
  for (const [x, y] of outline) c.set(x, y, 'X');

  const pal = palette(spec);
  const data = new Uint8ClampedArray(c.w * c.h * 4);
  const shadow = spec.shadow ? hex('#2A0E3A') : null;
  const tint = spec.tint ? hex(spec.tint) : null;
  for (let i = 0; i < c.g.length; i++) {
    const s = c.g[i];
    if (!s) continue;
    let col = pal[s] ?? hex('#FF00FF');
    if (shadow && s !== 'X') col = mix(col, shadow, s === 'E' || s === 'e' ? 0.2 : 0.65);
    if (shadow && (s === 'E' || s === 'e')) col = hex('#E040FF');
    if (tint && s !== 'X') col = mix(col, tint, 0.45);
    data.set(col, i * 4);
  }
  return { w: c.w, h: c.h, data };
}

export const CLASS_WEAPON: Record<string, WeaponKind> = {
  guardian: 'sword',
  berserker: 'axe',
  archer: 'bow',
  sorceress: 'staff',
  priestess: 'wand',
  necromancer: 'scythe',
  assassin: 'daggers',
  bard: 'lute',
};

export const CLASS_BODY: Record<string, BodyKind> = {
  guardian: 'plate',
  berserker: 'plate',
  archer: 'tunic',
  sorceress: 'robe',
  priestess: 'robe',
  necromancer: 'robe',
  assassin: 'tunic',
  bard: 'tunic',
};

export const ROLE_CLASS: Record<string, string> = {
  tank: 'guardian',
  brute: 'berserker',
  ranged: 'archer',
  caster: 'sorceress',
  healer: 'priestess',
  rogue: 'assassin',
};

/** Кадрирование и увеличение (для портретов и иконок). */
export function cropScale(b: Bitmap, x0: number, y0: number, w: number, h: number, scale: number): Bitmap {
  const out = new Uint8ClampedArray(w * scale * h * scale * 4);
  for (let y = 0; y < h * scale; y++)
    for (let x = 0; x < w * scale; x++) {
      const sx = x0 + Math.floor(x / scale);
      const sy = y0 + Math.floor(y / scale);
      if (sx < 0 || sy < 0 || sx >= b.w || sy >= b.h) continue;
      const si = (sy * b.w + sx) * 4;
      const di = (y * w * scale + x) * 4;
      out[di] = b.data[si];
      out[di + 1] = b.data[si + 1];
      out[di + 2] = b.data[si + 2];
      out[di + 3] = b.data[si + 3];
    }
  return { w: w * scale, h: h * scale, data: out };
}
