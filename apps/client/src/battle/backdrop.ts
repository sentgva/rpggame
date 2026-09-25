/** Процедурные пиксельные фоны актов: 3 слоя параллакса + погода. */
import { ACTS, Rng } from '@idle/shared';
import { darken, hex, lighten, mix, toCss, type RGBA } from '../art/color';

export const BG_W = 160;
export const BG_H = 90;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: RGBA | string) {
  ctx.fillStyle = typeof col === 'string' ? col : toCss(col);
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Небо: вертикальный градиент полосами (дизеринг «ступеньками»). */
export function drawSky(act: number): HTMLCanvasElement {
  const def = ACTS[act - 1] ?? ACTS[0];
  const { c, ctx } = canvas(BG_W, BG_H);
  const top = hex(def.bg.sky[0]);
  const bottom = hex(def.bg.sky[1]);
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    px(ctx, 0, (i * BG_H) / bands, BG_W, BG_H / bands + 1, mix(top, bottom, i / (bands - 1)));
  }
  const rng = new Rng(act * 97);
  // звёзды/солнце/луна
  if ([5, 9, 10, 4].includes(act)) {
    for (let i = 0; i < 40; i++) px(ctx, rng.int(BG_W), rng.int(BG_H * 0.6), 1, 1, lighten(top, 0.5 + rng.next() * 0.4));
  }
  if (act === 9 || act === 5) {
    ctx.fillStyle = act === 9 ? '#E6EEFF' : '#D86A6A';
    ctx.beginPath();
    ctx.arc(120, 18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toCss(mix(top, bottom, 0.1));
    ctx.beginPath();
    ctx.arc(124, 15, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (act === 2 || act === 6) {
    ctx.fillStyle = act === 2 ? '#FFE8A0' : '#FF7A2A';
    ctx.beginPath();
    ctx.arc(128, 22, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  if (act === 10) {
    for (let i = 0; i < 5; i++) {
      const x = rng.int(BG_W);
      const y = rng.int(40);
      for (let k = 0; k < 14; k++) px(ctx, x + k * 0.7, y + Math.sin(k) * 2 + k * 0.6, 1, 1, '#E040FF');
    }
  }
  return c;
}

type Shape = (ctx: CanvasRenderingContext2D, rng: Rng, col: RGBA, base: number) => void;

const trees: Shape = (ctx, rng, col, base) => {
  for (let x = -4; x < BG_W + 8; x += 6 + rng.int(8)) {
    const h = 14 + rng.int(20);
    const w = 6 + rng.int(6);
    px(ctx, x + w / 2 - 1, base - h * 0.3, 2, h * 0.3 + 2, darken(col, 0.3));
    for (let i = 0; i < h * 0.8; i++) {
      const ww = Math.max(1, (w * (i + 2)) / (h * 0.8));
      px(ctx, x + w / 2 - ww / 2, base - h + i, ww, 1, i % 4 === 0 ? lighten(col, 0.08) : col);
    }
  }
};
const dunes: Shape = (ctx, rng, col, base) => {
  const off = rng.next() * 10;
  for (let x = 0; x < BG_W; x++) {
    const y = base - 8 - Math.sin(x / 18 + off) * 6 - Math.sin(x / 7 + off * 2) * 2;
    px(ctx, x, y, 1, BG_H - y, col);
    px(ctx, x, y, 1, 1, lighten(col, 0.15));
  }
};
const peaks: Shape = (ctx, rng, col, base) => {
  for (let x = -20; x < BG_W + 20; x += 18 + rng.int(18)) {
    const h = 20 + rng.int(30);
    const w = 24 + rng.int(20);
    for (let i = 0; i < h; i++) {
      const ww = (w * i) / h;
      px(ctx, x - ww / 2, base - h + i, ww, 1, col);
      if (i < h * 0.3) px(ctx, x - ww / 2, base - h + i, ww * 0.5, 1, lighten(col, 0.45));
    }
  }
};
const columns: Shape = (ctx, rng, col, base) => {
  for (let x = 0; x < BG_W; x += 14 + rng.int(12)) {
    const h = 16 + rng.int(26);
    const broken = rng.chance(0.4);
    px(ctx, x, base - h, 5, h, col);
    px(ctx, x - 1, base - h - (broken ? 0 : 2), 7, 2, lighten(col, 0.1));
    px(ctx, x + 1, base - h + 2, 1, h - 2, darken(col, 0.2));
  }
};
const spires: Shape = (ctx, rng, col, base) => {
  for (let x = -2; x < BG_W; x += 9 + rng.int(10)) {
    const h = 18 + rng.int(34);
    const w = 6 + rng.int(6);
    px(ctx, x, base - h, w, h, col);
    for (let i = 0; i < 6; i++) px(ctx, x + w / 2 - (6 - i) / 2, base - h - 6 + i, 6 - i, 1, col);
    if (rng.chance(0.6)) px(ctx, x + 2, base - h + 6, 2, 3, '#E0A13A');
  }
};
const volcano: Shape = (ctx, rng, col, base) => {
  peaks(ctx, rng, col, base);
  for (let i = 0; i < 12; i++) px(ctx, rng.int(BG_W), base - rng.int(8), 2, 1, '#FF7A2A');
};
const islands: Shape = (ctx, rng, col, base) => {
  for (let i = 0; i < 6; i++) {
    const x = rng.int(BG_W);
    const y = base - 20 - rng.int(30);
    const w = 16 + rng.int(18);
    px(ctx, x, y, w, 3, lighten(col, 0.2));
    for (let k = 0; k < 6; k++) px(ctx, x + k * 1.5, y + 3 + k, w - k * 3, 1, col);
  }
};
const gears: Shape = (ctx, rng, col, base) => {
  for (let x = 0; x < BG_W; x += 20 + rng.int(14)) {
    const h = 20 + rng.int(28);
    px(ctx, x, base - h, 10, h, col);
    px(ctx, x + 3, base - h - 6, 4, 6, darken(col, 0.2));
    ctx.fillStyle = toCss(lighten(col, 0.1));
    ctx.beginPath();
    ctx.arc(x + 5, base - h * 0.6, 5, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, x + 4, base - h * 0.6 - 1, 2, 2, darken(col, 0.4));
  }
};
const tombs: Shape = (ctx, rng, col, base) => {
  for (let x = 0; x < BG_W; x += 8 + rng.int(10)) {
    const h = 6 + rng.int(8);
    if (rng.chance(0.5)) {
      px(ctx, x, base - h, 5, h, col);
      px(ctx, x + 1, base - h - 1, 3, 1, col);
    } else {
      px(ctx, x + 2, base - h - 2, 1, h + 2, col);
      px(ctx, x, base - h, 5, 1, col);
    }
  }
};
const voidShards: Shape = (ctx, rng, col, base) => {
  for (let i = 0; i < 16; i++) {
    const x = rng.int(BG_W);
    const h = 8 + rng.int(36);
    for (let k = 0; k < h; k++) px(ctx, x + (k * 3) / h, base - k, Math.max(1, 3 - (k * 3) / h), 1, k % 5 === 0 ? '#E040FF' : col);
  }
};

const SHAPES: Record<number, [Shape, Shape]> = {
  1: [trees, trees],
  2: [dunes, dunes],
  3: [peaks, peaks],
  4: [columns, columns],
  5: [spires, spires],
  6: [volcano, peaks],
  7: [islands, islands],
  8: [gears, gears],
  9: [tombs, spires],
  10: [voidShards, voidShards],
};

export function drawLayer(act: number, layer: 'far' | 'mid' | 'near'): HTMLCanvasElement {
  const def = ACTS[act - 1] ?? ACTS[0];
  const { c, ctx } = canvas(BG_W, BG_H);
  const rng = new Rng(act * 131 + (layer === 'far' ? 1 : layer === 'mid' ? 2 : 3));
  if (layer === 'near') {
    const ground = hex(def.bg.near);
    const top = 70;
    px(ctx, 0, top, BG_W, BG_H - top, ground);
    px(ctx, 0, top, BG_W, 1, lighten(ground, 0.18));
    for (let i = 0; i < 90; i++) px(ctx, rng.int(BG_W), top + 2 + rng.int(BG_H - top - 2), 1 + rng.int(2), 1, rng.chance(0.5) ? darken(ground, 0.25) : lighten(ground, 0.1));
    // трава/камни по кромке
    for (let x = 0; x < BG_W; x += 2 + rng.int(4)) px(ctx, x, top - 1 - rng.int(2), 1, 2, lighten(ground, 0.12));
    return c;
  }
  const [farShape, midShape] = SHAPES[act] ?? SHAPES[1];
  if (layer === 'far') farShape(ctx, rng, hex(def.bg.far), 72);
  else midShape(ctx, rng, hex(def.bg.mid), 74);
  return c;
}

export type Weather = (typeof ACTS)[number]['bg']['weather'];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  life: number;
}

export function weatherParams(w: Weather): { count: number; color: number[]; vx: [number, number]; vy: [number, number]; size: [number, number] } {
  switch (w) {
    case 'leaves':
      return { count: 18, color: [0x7acf5a, 0x4fbf5a, 0xc0a060], vx: [-12, -4], vy: [10, 22], size: [2, 3] };
    case 'sand':
      return { count: 60, color: [0xe6c87a, 0xc0a060], vx: [-80, -40], vy: [-4, 6], size: [1, 2] };
    case 'snow':
      return { count: 50, color: [0xffffff, 0xcfefff], vx: [-10, 6], vy: [14, 30], size: [1, 3] };
    case 'bubbles':
      return { count: 24, color: [0x9fe0ff, 0x6fd0e0], vx: [-4, 4], vy: [-24, -10], size: [2, 3] };
    case 'ash':
      return { count: 40, color: [0x8a8a8a, 0x5a5a5a], vx: [-8, 8], vy: [8, 18], size: [1, 2] };
    case 'embers':
      return { count: 34, color: [0xff7a2a, 0xffe040, 0xe03a3a], vx: [-6, 6], vy: [-30, -12], size: [1, 2] };
    case 'clouds':
      return { count: 12, color: [0xffffff, 0xe6f0ff], vx: [-14, -6], vy: [-1, 1], size: [3, 5] };
    case 'sparks':
      return { count: 20, color: [0x40e0ff, 0xffe040], vx: [-20, 20], vy: [10, 40], size: [1, 2] };
    case 'wisps':
      return { count: 18, color: [0x6fffd0, 0xc8c0e0], vx: [-6, 6], vy: [-10, -3], size: [2, 2] };
    case 'void':
      return { count: 30, color: [0xe040ff, 0x9b4de0], vx: [-10, 10], vy: [-16, -4], size: [1, 3] };
  }
}
