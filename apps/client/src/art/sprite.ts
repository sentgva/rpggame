/**
 * Общие типы и таблицы процедурного пиксель-арта: параметры фигуры, оружие и одежда по классам.
 * Сами фигуры рисует figure.ts (48×48).
 */
import type { Element, Look } from '@idle/shared';

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
