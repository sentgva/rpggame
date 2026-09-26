import { Rng, mixSeed } from '../rng';
import type { Currency } from '../types';

/**
 * «Самоцветные копи»: поле 7×8 в тумане. Каждый шаг — кирка; копать можно только клетку рядом с уже
 * раскопанной, соседние клетки видны заранее — маршрут выбираешь сам. Руда и самоцветы дают жетоны,
 * сундуки — ресурсы, родники — кирки, ловушки их отнимают, чудовищ надо победить своим отрядом.
 * Лестница ведёт этажом ниже: там богаче, но опаснее; на каждом третьем этаже её сторожит страж.
 */
export const MINE_W = 7;
export const MINE_H = 8;
/** Кирки в начале праздника, прибавка в день и запас. */
export const MINE_START = 25;
export const MINE_DAILY = 25;
export const MINE_CAP = 60;
/** Старт — середина нижнего ряда. */
export const MINE_START_IDX = (MINE_H - 1) * MINE_W + Math.floor(MINE_W / 2);

export type MineTile = 'empty' | 'ore' | 'gem' | 'chest' | 'trap' | 'spring' | 'monster' | 'stairs';

/** Поле этажа: детерминированно от зерна игрока и номера этажа. Глубже — больше чудовищ и самоцветов. */
export function mineBoard(seed: number, floor: number): MineTile[] {
  const rng = new Rng(mixSeed(seed, floor, 0x3113));
  const deep = Math.min(10, floor - 1);
  const weights: [MineTile, number][] = [
    ['empty', 30 - deep],
    ['ore', 22],
    ['gem', 5 + deep * 0.5],
    ['chest', 6],
    ['trap', 8 + deep * 0.4],
    ['spring', 5],
    ['monster', 16 + deep * 1.2],
  ];
  const total = weights.reduce((a, [, w]) => a + w, 0);
  const tiles: MineTile[] = [];
  for (let i = 0; i < MINE_W * MINE_H; i++) {
    let r = rng.next() * total;
    let t: MineTile = 'empty';
    for (const [k, w] of weights) {
      r -= w;
      if (r < 0) {
        t = k;
        break;
      }
    }
    tiles.push(t);
  }
  tiles[MINE_START_IDX] = 'empty';
  // лестница — в одном из двух верхних рядов
  tiles[rng.int(2) * MINE_W + rng.int(MINE_W)] = 'stairs';
  return tiles;
}

export function mineNeighbors(i: number): number[] {
  const x = i % MINE_W;
  const y = Math.floor(i / MINE_W);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < MINE_W - 1) out.push(i + 1);
  if (y > 0) out.push(i - MINE_W);
  if (y < MINE_H - 1) out.push(i + MINE_W);
  return out;
}

/** Видимые клетки: раскопанные и их соседи. */
export function mineVisible(dug: number[]): Set<number> {
  const v = new Set<number>(dug);
  for (const i of dug) for (const n of mineNeighbors(i)) v.add(n);
  return v;
}

/** Можно ли копать клетку: не раскопана и рядом с раскопанной. */
export function mineCanDig(dug: number[], i: number): boolean {
  return i >= 0 && i < MINE_W * MINE_H && !dug.includes(i) && mineNeighbors(i).some((n) => dug.includes(n));
}

/** Лестницу каждого третьего этажа сторожит страж. */
export function mineGuarded(floor: number): boolean {
  return floor % 3 === 0;
}

/** Уровень чудовищ этажа: от «ниже фарма» и глубже — сильнее. */
export function mineMonsterLevel(base: number, floor: number): number {
  return Math.max(1, base - 5 + Math.round(floor * 1.2));
}

/** Награда за клетку (жетоны, очки праздника, изменение кирок). */
export function mineReward(tile: MineTile, floor: number): { tokens: number; points: number; picks: number } {
  switch (tile) {
    case 'ore':
      return { tokens: 12 + 2 * floor, points: 8, picks: 0 };
    case 'gem':
      return { tokens: 25 + 3 * floor, points: 30, picks: 0 };
    case 'chest':
      return { tokens: 0, points: 20, picks: 0 };
    case 'spring':
      return { tokens: 0, points: 5, picks: 4 };
    case 'trap':
      return { tokens: 0, points: 0, picks: -2 };
    case 'monster':
      return { tokens: 20 + 3 * floor, points: 25, picks: 0 };
    case 'stairs':
      return { tokens: 60 + 10 * floor, points: 80 + 10 * floor, picks: 0 };
    default:
      return { tokens: 0, points: 2, picks: 0 };
  }
}

/** Содержимое сундука: ресурсы или осколки героини праздника. */
export function mineChest(rng: Rng, floor: number): { cur?: Partial<Record<Currency, number>>; shards?: number } {
  const r = rng.next();
  if (r < 0.3) return { cur: { crystals: 20 + floor * 2 } };
  if (r < 0.55) return { cur: { starDust: 30 + floor * 3 } };
  if (r < 0.75) return { cur: { dust: 120 + floor * 15 } };
  if (r < 0.85) return { cur: { scrolls: 1 } };
  return { shards: 3 };
}

/** Бонус за спуск на этаж floor: каждый третий — осколки, каждый пятый — Сердце Эфира. */
export function mineDescendBonus(floor: number): { shards: number; heart: boolean } {
  return { shards: floor % 3 === 0 ? 10 : 0, heart: floor % 5 === 0 };
}
