import type { P } from './core';

export type Arms = 'idle' | 'idle2' | 'attack';
export type Eyes = 'open' | 'half' | 'closed' | 'wink';
export type WeaponKind = 'sword' | 'axe' | 'bow' | 'staff' | 'wand' | 'scythe' | 'daggers' | 'lute' | 'none';

export type HandKind = 'fist' | 'open' | 'hip';

export interface ArmRig {
  s: P;
  e: P;
  w: P;
  hand: HandKind;
}

export interface Grip {
  x: number;
  y: number;
  /** угол оружия в градусах: 0 — «вверх», по часовой стрелке */
  a: number;
}

export interface Rig {
  L: ArmRig;
  R: ArmRig;
  /** оружие в правой (от зрителя) руке и в левой (щит, второй кинжал) */
  gripR?: Grip;
  gripL?: Grip;
}

const SL: P = [148, 234];
const SR: P = [252, 234];

type Stance = { idle: Rig; attack: Partial<Rig> };

/** Стойки по оружию: у каждого класса своя поза, а не одна на всех. */
const STANCES: Record<WeaponKind, Stance> = {
  staff: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [288, 300], w: [304, 350], hand: 'fist' }, gripR: { x: 305, y: 350, a: 2 } },
    attack: { R: { s: SR, e: [286, 262], w: [304, 214], hand: 'fist' }, gripR: { x: 305, y: 214, a: 12 } },
  },
  scythe: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [288, 300], w: [304, 350], hand: 'fist' }, gripR: { x: 305, y: 350, a: 4 } },
    attack: { R: { s: SR, e: [290, 266], w: [318, 240], hand: 'fist' }, gripR: { x: 318, y: 240, a: 55 } },
  },
  wand: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [284, 296], w: [300, 258], hand: 'fist' }, gripR: { x: 301, y: 258, a: 22 } },
    attack: { R: { s: SR, e: [290, 250], w: [326, 226], hand: 'fist' }, gripR: { x: 327, y: 226, a: 60 } },
  },
  sword: {
    idle: { L: { s: SL, e: [120, 300], w: [150, 326], hand: 'fist' }, R: { s: SR, e: [282, 306], w: [292, 372], hand: 'fist' }, gripR: { x: 293, y: 372, a: 150 }, gripL: { x: 142, y: 322, a: 0 } },
    attack: { R: { s: SR, e: [290, 262], w: [330, 244], hand: 'fist' }, gripR: { x: 331, y: 244, a: 70 } },
  },
  axe: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [284, 300], w: [296, 352], hand: 'fist' }, gripR: { x: 297, y: 352, a: -12 } },
    attack: { R: { s: SR, e: [286, 250], w: [314, 214], hand: 'fist' }, gripR: { x: 315, y: 214, a: 40 } },
  },
  bow: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [284, 302], w: [298, 356], hand: 'fist' }, gripR: { x: 299, y: 356, a: 0 } },
    attack: { R: { s: SR, e: [292, 256], w: [334, 252], hand: 'fist' }, gripR: { x: 335, y: 252, a: 0 } },
  },
  daggers: {
    idle: { L: { s: SL, e: [120, 302], w: [116, 364], hand: 'fist' }, R: { s: SR, e: [280, 302], w: [284, 364], hand: 'fist' }, gripR: { x: 285, y: 364, a: 150 }, gripL: { x: 115, y: 364, a: 210 } },
    attack: { R: { s: SR, e: [292, 262], w: [332, 258], hand: 'fist' }, gripR: { x: 333, y: 258, a: 90 } },
  },
  lute: {
    idle: { L: { s: SL, e: [128, 300], w: [166, 314], hand: 'fist' }, R: { s: SR, e: [272, 312], w: [236, 348], hand: 'open' }, gripL: { x: 214, y: 350, a: -58 } },
    attack: { R: { s: SR, e: [276, 300], w: [248, 334], hand: 'open' } },
  },
  none: {
    idle: { L: { s: SL, e: [114, 304], w: [146, 370], hand: 'hip' }, R: { s: SR, e: [272, 310], w: [278, 388], hand: 'open' } },
    attack: { R: { s: SR, e: [290, 262], w: [330, 256], hand: 'fist' } },
  },
};

const shift = (a: ArmRig, dx: number, dy: number, side: -1 | 1): ArmRig => ({
  ...a,
  e: [a.e[0] + dx * side, a.e[1] + dy],
  w: [a.w[0] + dx * 0.4 * side, a.w[1] + dy * 0.6],
});

export function rigFor(weapon: WeaponKind, arms: Arms): Rig {
  const st = STANCES[weapon] ?? STANCES.none;
  const base = st.idle;
  if (arms === 'attack') return { ...base, ...st.attack, L: st.attack.L ?? base.L, R: st.attack.R ?? base.R };
  if (arms === 'idle2') {
    // вдох: локти чуть расходятся, кисти приподнимаются
    const dy = -2.5;
    const r: Rig = { ...base, L: base.L.hand === 'hip' ? base.L : shift(base.L, 3, dy, -1), R: shift(base.R, 3, dy, 1) };
    if (base.gripR) r.gripR = { ...base.gripR, x: base.gripR.x + 1.2, y: base.gripR.y + dy * 0.6 };
    if (base.gripL) r.gripL = { ...base.gripL, x: base.gripL.x - (base.L.hand === 'hip' ? 0 : 1.2), y: base.gripL.y + dy * 0.6 };
    return r;
  }
  return base;
}
