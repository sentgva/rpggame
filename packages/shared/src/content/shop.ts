import type { Currency, L10n } from '../types';
import { FESTIVAL_ONLY_SKINS, SKINS } from './heroines';

/** Лавки за игровые валюты. */
export interface ShopOffer {
  id: string;
  shop: 'daily' | 'emblems' | 'event' | 'skins';
  name: L10n;
  cost: Partial<Record<Currency, number>>;
  give: { cur?: Partial<Record<Currency, number>>; skin?: string; item?: 'epic' | 'legendary' };
  /** Лимит покупок (в день для daily, иначе навсегда/в неделю). */
  limit?: number;
  weekly?: boolean;
}

const E = (n: number): L10n => ({ ru: `Эмблемы ×${n}`, en: `Emblems ×${n}` });

export const SHOP_OFFERS: ShopOffer[] = [
  // лавка дня
  { id: 'sh_emblem', shop: 'daily', name: E(3), cost: { crystals: 60 }, give: { cur: { emblems: 3 } }, limit: 3 },
  { id: 'sh_books', shop: 'daily', name: { ru: 'Тома знаний ×5', en: 'Tomes ×5' }, cost: { crystals: 50 }, give: { cur: { books: 5 } }, limit: 3 },
  { id: 'sh_steel', shop: 'daily', name: { ru: 'Сталь ×60', en: 'Steel ×60' }, cost: { crystals: 40 }, give: { cur: { steel: 60 } }, limit: 3 },
  { id: 'sh_epic', shop: 'daily', name: { ru: 'Эпическая вещь', en: 'Epic item' }, cost: { crystals: 120 }, give: { item: 'epic' }, limit: 1 },
  // лавка эмблем: ранги героев за кристаллы (раз в неделю)
  { id: 'em_10', shop: 'emblems', name: E(10), cost: { crystals: 200 }, give: { cur: { emblems: 10 } }, limit: 5, weekly: true },
  { id: 'em_40', shop: 'emblems', name: E(40), cost: { crystals: 720 }, give: { cur: { emblems: 40 } }, limit: 2, weekly: true },
  { id: 'em_legend', shop: 'emblems', name: { ru: 'Легендарная вещь', en: 'Legendary item' }, cost: { crystals: 900 }, give: { item: 'legendary' }, limit: 1, weekly: true },
  // облики праздника продаются только в лавке праздника; здесь — коллекции за кристаллы
  ...SKINS.filter((x) => x.crystals && !FESTIVAL_ONLY_SKINS.has(x.id)).map(
    (x): ShopOffer => ({ id: `sk_${x.id}`, shop: 'skins', name: x.name, cost: { crystals: x.crystals! }, give: { skin: x.id }, limit: 1 }),
  ),
  // облики-«ивент» коллекций — за жетоны праздника
  ...SKINS.filter((x) => x.set && x.source === 'event' && !FESTIVAL_ONLY_SKINS.has(x.id)).map(
    (x): ShopOffer => ({ id: `ev_${x.id}`, shop: 'event', name: { ru: `Облик «${x.name.ru}»`, en: `Skin "${x.name.en}"` }, cost: { eventTokens: 1800 }, give: { skin: x.id }, limit: 1 }),
  ),
  { id: 'ev_emblems', shop: 'event', name: E(5), cost: { eventTokens: 200 }, give: { cur: { emblems: 5 } }, limit: 10 },
];
export const SHOP_OFFER_MAP: Record<string, ShopOffer> = Object.fromEntries(SHOP_OFFERS.map((o) => [o.id, o]));

/** Боевой пропуск сезона: 50 уровней наград за задания + бесконечные бонусные уровни. */
export const PASS_LEVELS = 50;
export const PASS_XP_PER_LEVEL = 100;
/** Бонусный сундук после 50-го уровня — каждые N очков активности. */
export const PASS_BONUS_XP = 200;
export interface PassReward {
  cur?: Partial<Record<Currency, number>>;
  skin?: string;
  item?: 'epic' | 'legendary';
}

/** Облики пропуска: каждый сезон — своя четвёрка, пул идёт по кругу. */
export const PASS_SKIN_LEVELS = [15, 30, 40, 50];
export const PASS_SKIN_POOL: string[] = SKINS.filter((x) => x.set && x.source === 'pass').map((x) => x.id);

export function seasonIndex(season: string): number {
  const n = Number(season.replace(/^s/, ''));
  return Number.isFinite(n) ? n : 0;
}

export function passSkins(season: string): string[] {
  const per = PASS_SKIN_LEVELS.length;
  if (PASS_SKIN_POOL.length < per) return [];
  const rounds = Math.max(1, Math.floor(PASS_SKIN_POOL.length / per));
  const k = seasonIndex(season) % rounds;
  return PASS_SKIN_POOL.slice(k * per, k * per + per);
}

/** Кристаллы вместо облика, если он уже есть. */
export const PASS_SKIN_DUPE_CRYSTALS = 300;

export function passReward(level: number, season = 's0'): PassReward {
  const si = PASS_SKIN_LEVELS.indexOf(level);
  if (si >= 0) {
    const skin = passSkins(season)[si];
    // облик сезона; если пул пуст — ключевые уровни дают больше Эмблем
    return skin ? { skin, cur: { crystals: 100 + si * 50, emblems: 6 } } : { item: 'legendary', cur: { crystals: 150 + si * 50, emblems: 12 } };
  }
  if (level % 10 === 0) return { item: 'legendary', cur: { emblems: 8, crystals: 100 } };
  if (level % 5 === 0) return { item: 'epic', cur: { emblems: 4, crystals: 30 } };
  if (level % 2 === 0) return { cur: { crystals: 20, books: 2 } };
  return { cur: { steel: 40, gold: 30 } };
}

export function passBonusReward(): PassReward {
  return { cur: { crystals: 50, books: 3 } };
}
