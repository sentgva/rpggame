import type { Arms, Eyes } from './figure';

/** Состояние «живой» фигуры: дыхание рук и моргание по случайному расписанию. */
export interface LifeAnim {
  /** фаза дыхания (радианы) — у каждой фигуры своя, чтобы не дышали хором */
  phase: number;
  /** когда начинается следующее моргание, мс */
  blinkAt: number;
  kind: 'blink' | 'double' | 'wink';
  /** может ли подмигивать (героини — да, враги — нет) */
  canWink: boolean;
  /** особая анимация Вестниц и Колоссов: взмахи крыльев / покачивание хвоста */
  special: boolean;
}

export interface LifeFrame {
  arms: Arms;
  eyes: Eyes;
  flap?: boolean;
}

/** Период дыхания совпадает с покачиванием юнитов в бою (sin(t/380)). */
const BREATH_RATE = 380;

export function newLife(now: number, canWink: boolean, special = false): LifeAnim {
  return { phase: Math.random() * Math.PI * 2, blinkAt: now + 600 + Math.random() * 3600, kind: 'blink', canWink, special };
}

function schedule(a: LifeAnim, now: number) {
  a.blinkAt = now + 1700 + Math.random() * 4300;
  const r = Math.random();
  a.kind = a.canWink && r < 0.14 ? 'wink' : r < 0.32 ? 'double' : 'blink';
}

/** Один взмах ресниц: полуприкрыты → закрыты → полуприкрыты. */
function blinkEyes(t: number): Eyes | null {
  if (t < 0) return null;
  if (t < 50) return 'half';
  if (t < 140) return 'closed';
  if (t < 190) return 'half';
  return null;
}

/** Кадр на момент now (двигает расписание моргания). */
export function lifeFrame(a: LifeAnim, now: number): LifeFrame {
  const arms: Arms = Math.sin(now / BREATH_RATE + a.phase) > 0.35 ? 'idle2' : 'idle';
  const t = now - a.blinkAt;
  let eyes: Eyes = 'open';
  if (t >= 0) {
    if (a.kind === 'wink') {
      if (t < 60) eyes = 'half';
      else if (t < 620) eyes = 'wink';
      else schedule(a, now);
    } else if (a.kind === 'double') {
      const e = blinkEyes(t) ?? blinkEyes(t - 260);
      if (e) eyes = e;
      else if (t > 450) schedule(a, now);
    } else {
      const e = blinkEyes(t);
      if (e) eyes = e;
      else schedule(a, now);
    }
  }
  // взмах крыльев примерно раз в 0,7 с
  const flap = a.special && Math.sin(now / 110 + a.phase) > 0;
  return { arms, eyes, flap };
}

export function frameKey(f: LifeFrame): string {
  return f.arms + ':' + f.eyes + (f.flap ? ':f' : '');
}
