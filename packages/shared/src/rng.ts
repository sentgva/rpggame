/**
 * Детерминированный ГПСЧ (mulberry32). Состояние — одно 32-битное целое,
 * поэтому его легко хранить в сохранении игрока и передавать между клиентом
 * и сервером: один и тот же seed всегда даёт одну и ту же последовательность.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  get state(): number {
    return this.s >>> 0;
  }

  /** Случайное uint32. */
  u32(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Число в [0, 1). */
  next(): number {
    return this.u32() / 4294967296;
  }

  /** Целое в [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Целое в [a, b] включительно. */
  range(a: number, b: number): number {
    return a + this.int(b - a + 1);
  }

  /** Вещественное в [a, b). */
  float(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** Индекс по весам. */
  weighted(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += Math.max(0, w);
    if (total <= 0) return 0;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Новый независимый seed из текущего потока. */
  fork(): number {
    return this.u32() || 1;
  }
}

/** Стабильный 32-битный хэш строки (FNV-1a). */
export function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Смешивание нескольких чисел в seed. */
export function mixSeed(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h ^= (p >>> 0) + 0x9e3779b9 + (h << 6) + (h >>> 2);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  }
  return h >>> 0 || 1;
}
