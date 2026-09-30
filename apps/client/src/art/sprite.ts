/**
 * Общие типы и таблицы процедурного пиксель-арта: параметры фигуры, оружие и одежда по классам.
 * Сами фигуры рисует figure.ts (48×48).
 */
import type { Element, Look } from '@idle/shared';

export type WeaponKind = 'sword' | 'axe' | 'bow' | 'staff' | 'wand' | 'scythe' | 'daggers' | 'lute' | 'crossbow' | 'none';
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
  /** Мягкий стиль: глаза с бликами, пастельные тени, цветной контур. */
  soft?: boolean;
}

export interface Bitmap {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

export const CLASS_WEAPON: Record<string, WeaponKind> = {
  knight: 'sword',
  assassin: 'daggers',
  priestess: 'wand',
  ranger: 'bow',
  warlock: 'staff',
  hunter: 'crossbow',
  brute: 'axe',
  guardian: 'sword',
  berserker: 'axe',
  archer: 'bow',
  sorceress: 'staff',
  cleric: 'wand',
  necromancer: 'scythe',
  rogue: 'daggers',
  bard: 'lute',
};

export const CLASS_BODY: Record<string, BodyKind> = {
  knight: 'plate',
  assassin: 'tunic',
  priestess: 'robe',
  ranger: 'tunic',
  warlock: 'robe',
  hunter: 'tunic',
  brute: 'plate',
  guardian: 'plate',
  berserker: 'plate',
  archer: 'tunic',
  sorceress: 'robe',
  cleric: 'robe',
  necromancer: 'robe',
  rogue: 'tunic',
  bard: 'tunic',
};

/** Враги одеваются по роли — в те же закрытые боевые наряды, что и классы Легиона. */
export const ROLE_CLASS: Record<string, string> = {
  tank: 'knight',
  brute: 'brute',
  ranged: 'ranger',
  caster: 'warlock',
  healer: 'priestess',
  rogue: 'assassin',
};
