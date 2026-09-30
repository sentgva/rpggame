import type { Currency, L10n } from '../types';
import { SKINS } from './heroines';

/** Магазины за игровые валюты. */
export interface ShopOffer {
  id: string;
  shop: 'emblems' | 'arena' | 'guild' | 'labyrinth' | 'event' | 'daily' | 'skins';
  name: L10n;
  cost: Partial<Record<Currency, number>>;
  give: { cur?: Partial<Record<Currency, number>>; skin?: string; item?: 'epic' | 'legendary' | 'mythic' };
  /** Лимит покупок (в день для daily, иначе навсегда/в неделю). */
  limit?: number;
  weekly?: boolean;
}

/** Облики коллекций, которые продаются в магазине активности. */
function skinOffers(shop: 'arena' | 'labyrinth' | 'event', prefix: string, cost: ShopOffer['cost']): ShopOffer[] {
  return SKINS.filter((x) => x.set && x.source === shop).map((x) => ({
    id: `${prefix}_${x.id}`,
    shop,
    name: { ru: `Облик «${x.name.ru}»`, en: `Skin "${x.name.en}"` },
    cost,
    give: { skin: x.id },
    limit: 1,
  }));
}

const E = (n: number): { ru: string; en: string } => ({ ru: `Эмблемы ×${n}`, en: `Emblems ×${n}` });

export const SHOP_OFFERS: ShopOffer[] = [
  // лавка эмблем: ранги героинь за кристаллы (обновляется раз в неделю)
  { id: 'em_5', shop: 'emblems', name: E(5), cost: { crystals: 120 }, give: { cur: { emblems: 5 } }, limit: 5, weekly: true },
  { id: 'em_25', shop: 'emblems', name: E(25), cost: { crystals: 520 }, give: { cur: { emblems: 25 } }, limit: 2, weekly: true },
  { id: 'em_80', shop: 'emblems', name: E(80), cost: { crystals: 1500 }, give: { cur: { emblems: 80 } }, limit: 1, weekly: true },
  { id: 'sh_emblem', shop: 'daily', name: E(3), cost: { crystals: 75 }, give: { cur: { emblems: 3 } }, limit: 3 },
  { id: 'sh_dust', shop: 'daily', name: { ru: 'Пыль заточки ×200', en: 'Enhance dust ×200' }, cost: { crystals: 50 }, give: { cur: { dust: 200 } }, limit: 5 },
  { id: 'sh_stardust', shop: 'daily', name: { ru: 'Звёздная пыль ×50', en: 'Star dust ×50' }, cost: { crystals: 80 }, give: { cur: { starDust: 50 } }, limit: 3 },
  { id: 'sh_forge', shop: 'daily', name: { ru: 'Материалы кузницы ×10', en: 'Forge materials ×10' }, cost: { crystals: 60 }, give: { cur: { forgeMats: 10 } }, limit: 3 },
  // арена
  { id: 'ar_emblems', shop: 'arena', name: E(10), cost: { arenaTokens: 300 }, give: { cur: { emblems: 10 } }, limit: 5, weekly: true },
  { id: 'ar_mythic', shop: 'arena', name: { ru: 'Мифический предмет', en: 'Mythic item' }, cost: { arenaTokens: 3000 }, give: { item: 'mythic' }, limit: 1, weekly: true },
  ...skinOffers('arena', 'ar', { arenaTokens: 4500 }),
  // гильдия
  { id: 'gd_mythic', shop: 'guild', name: { ru: 'Мифический предмет', en: 'Mythic item' }, cost: { guildCoins: 2000 }, give: { item: 'mythic' }, limit: 1, weekly: true },
  { id: 'gd_emblems', shop: 'guild', name: E(20), cost: { guildCoins: 1200 }, give: { cur: { emblems: 20 } }, limit: 1, weekly: true },
  // лабиринт
  ...skinOffers('labyrinth', 'lb', { labCoins: 1400 }),
  { id: 'lb_emblems', shop: 'labyrinth', name: E(15), cost: { labCoins: 500 }, give: { cur: { emblems: 15 } }, limit: 2, weekly: true },
  { id: 'lb_legend', shop: 'labyrinth', name: { ru: 'Легендарный предмет', en: 'Legendary item' }, cost: { labCoins: 600 }, give: { item: 'legendary' }, limit: 2, weekly: true },
  // ивент
  ...skinOffers('event', 'ev', { eventTokens: 1800 }),
  { id: 'ev_emblems', shop: 'event', name: E(5), cost: { eventTokens: 200 }, give: { cur: { emblems: 5 } }, limit: 10 },
  // облики за кристаллы (появятся вместе с новыми коллекциями)
  ...SKINS.filter((x) => x.crystals).map(
    (x): ShopOffer => ({ id: `sk_${x.id}`, shop: 'skins', name: x.name, cost: { crystals: x.crystals! }, give: { skin: x.id }, limit: 1 }),
  ),
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
    // пока коллекций обликов нет — ключевые уровни дают больше Эмблем
    return skin ? { skin, cur: { crystals: 100 + si * 50, emblems: 6 } } : { item: 'legendary', cur: { crystals: 150 + si * 50, emblems: 12 } };
  }
  if (level % 10 === 0) return { item: 'legendary', cur: { emblems: 8, crystals: 100 } };
  if (level % 5 === 0) return { item: 'epic', cur: { emblems: 4, crystals: 30 } };
  if (level % 2 === 0) return { cur: { crystals: 20, starDust: 15 } };
  return { cur: { dust: 60, gold: 30 } };
}

export function passBonusReward(): PassReward {
  return { cur: { crystals: 50, starDust: 20 } };
}
