import type { Currency, L10n } from '../types';

/**
 * Товары за Telegram Stars (единственный способ оплаты).
 * Цены — стартовый ориентир для A/B-тестов, правятся в конфиге.
 */
export interface StarsProduct {
  id: string;
  name: L10n;
  desc: L10n;
  stars: number;
  kind: 'starter' | 'crystals' | 'monthly' | 'pass' | 'skin' | 'event' | 'convenience';
  crystals?: number;
  /** Удвоение первой покупки. */
  firstDouble?: boolean;
  limit?: number;
  skin?: string;
  /** Подписка: период в секундах. */
  subscription?: number;
}

export const STARS_PRODUCTS: StarsProduct[] = [
  { id: 'starter', name: { ru: 'Стартовый набор', en: 'Starter Pack' }, desc: { ru: 'SSR-героиня Астрид, 1 000 кристаллов и эпический сет', en: 'SSR heroine Astrid, 1,000 crystals and an epic set' }, stars: 99, kind: 'starter', crystals: 1000, limit: 1 },
  { id: 'crystals_300', name: { ru: '300 кристаллов', en: '300 Crystals' }, desc: { ru: 'Первая покупка — ×2', en: 'First purchase ×2' }, stars: 50, kind: 'crystals', crystals: 300, firstDouble: true },
  { id: 'crystals_1000', name: { ru: '1 000 кристаллов', en: '1,000 Crystals' }, desc: { ru: 'Первая покупка — ×2', en: 'First purchase ×2' }, stars: 150, kind: 'crystals', crystals: 1000, firstDouble: true },
  { id: 'crystals_3200', name: { ru: '3 200 кристаллов', en: '3,200 Crystals' }, desc: { ru: 'Первая покупка — ×2', en: 'First purchase ×2' }, stars: 450, kind: 'crystals', crystals: 3200, firstDouble: true },
  { id: 'crystals_7000', name: { ru: '7 000 кристаллов', en: '7,000 Crystals' }, desc: { ru: 'Первая покупка — ×2', en: 'First purchase ×2' }, stars: 950, kind: 'crystals', crystals: 7000, firstDouble: true },
  { id: 'crystals_15000', name: { ru: '15 000 кристаллов', en: '15,000 Crystals' }, desc: { ru: 'Первая покупка — ×2', en: 'First purchase ×2' }, stars: 1950, kind: 'crystals', crystals: 15000, firstDouble: true },
  { id: 'monthly', name: { ru: 'Месячная карта', en: 'Monthly Card' }, desc: { ru: '300 кристаллов сразу + 100 в день 30 дней, офлайн-лимит 24 ч, реклама заменяется наградами', en: '300 crystals now + 100 daily for 30 days, 24h offline cap, ads replaced by free rewards' }, stars: 250, kind: 'monthly', crystals: 300, subscription: 2592000 },
  { id: 'pass', name: { ru: 'Боевой пропуск', en: 'Battle Pass' }, desc: { ru: '50 уровней наград, эксклюзивный облик, ускорение ×2 весь сезон', en: '50 reward levels, exclusive skin, ×2 speed all season' }, stars: 450, kind: 'pass' },
  { id: 'inv100', name: { ru: '+100 ячеек инвентаря', en: '+100 Inventory Slots' }, desc: { ru: 'Разовая покупка', en: 'One-time purchase' }, stars: 100, kind: 'convenience', limit: 1 },
  { id: 'presets', name: { ru: '+2 пресета отряда', en: '+2 Party Presets' }, desc: { ru: 'До 5 пресетов', en: 'Up to 5 presets' }, stars: 200, kind: 'convenience', limit: 1 },
  { id: 'event_pack', name: { ru: 'Набор ивента', en: 'Event Pack' }, desc: { ru: '10 свитков призыва и 500 жетонов ивента', en: '10 summon scrolls and 500 event tokens' }, stars: 300, kind: 'event', limit: 1 },
];

export const STARS_PRODUCT_MAP: Record<string, StarsProduct> = Object.fromEntries(STARS_PRODUCTS.map((p) => [p.id, p]));

/** Магазины за игровые валюты. */
export interface ShopOffer {
  id: string;
  shop: 'shards' | 'arena' | 'guild' | 'labyrinth' | 'event' | 'daily';
  name: L10n;
  cost: Partial<Record<Currency, number>>;
  give: { cur?: Partial<Record<Currency, number>>; shardsRarity?: 'R' | 'SR' | 'SSR' | 'UR'; shards?: number; skin?: string; item?: 'epic' | 'legendary' | 'mythic' };
  /** Лимит покупок (в день для daily, иначе навсегда/в неделю). */
  limit?: number;
  weekly?: boolean;
}

export const SHOP_OFFERS: ShopOffer[] = [
  // магазин осколков — любую героиню можно получить бесплатно
  { id: 'sh_r', shop: 'shards', name: { ru: '10 осколков R-героини', en: '10 R shards' }, cost: { crystals: 60 }, give: { shardsRarity: 'R', shards: 10 }, limit: 5 },
  { id: 'sh_sr', shop: 'shards', name: { ru: '10 осколков SR-героини', en: '10 SR shards' }, cost: { crystals: 150 }, give: { shardsRarity: 'SR', shards: 10 }, limit: 3 },
  { id: 'sh_ssr', shop: 'shards', name: { ru: '10 осколков SSR-героини', en: '10 SSR shards' }, cost: { crystals: 450 }, give: { shardsRarity: 'SSR', shards: 10 }, limit: 2 },
  { id: 'sh_ur', shop: 'shards', name: { ru: '10 осколков UR-героини', en: '10 UR shards' }, cost: { crystals: 1200 }, give: { shardsRarity: 'UR', shards: 10 }, limit: 1 },
  { id: 'sh_scroll', shop: 'daily', name: { ru: 'Свиток призыва', en: 'Summon scroll' }, cost: { crystals: 280 }, give: { cur: { scrolls: 1 } }, limit: 3 },
  { id: 'sh_dust', shop: 'daily', name: { ru: 'Пыль заточки ×200', en: 'Enhance dust ×200' }, cost: { crystals: 50 }, give: { cur: { dust: 200 } }, limit: 5 },
  { id: 'sh_stardust', shop: 'daily', name: { ru: 'Звёздная пыль ×50', en: 'Star dust ×50' }, cost: { crystals: 80 }, give: { cur: { starDust: 50 } }, limit: 3 },
  { id: 'sh_forge', shop: 'daily', name: { ru: 'Материалы кузницы ×10', en: 'Forge materials ×10' }, cost: { crystals: 60 }, give: { cur: { forgeMats: 10 } }, limit: 3 },
  // арена
  { id: 'ar_shards', shop: 'arena', name: { ru: '10 осколков SSR', en: '10 SSR shards' }, cost: { arenaTokens: 400 }, give: { shardsRarity: 'SSR', shards: 10 }, limit: 3, weekly: true },
  { id: 'ar_scroll', shop: 'arena', name: { ru: 'Свиток призыва', en: 'Summon scroll' }, cost: { arenaTokens: 150 }, give: { cur: { scrolls: 1 } }, limit: 5, weekly: true },
  { id: 'ar_mythic', shop: 'arena', name: { ru: 'Мифический предмет', en: 'Mythic item' }, cost: { arenaTokens: 3000 }, give: { item: 'mythic' }, limit: 1, weekly: true },
  { id: 'ar_skin1', shop: 'arena', name: { ru: 'Облик «Полдень»', en: 'Skin "High Noon"' }, cost: { arenaTokens: 5000 }, give: { skin: 'liora_sun' }, limit: 1 },
  { id: 'ar_skin2', shop: 'arena', name: { ru: 'Облик «Коралловый риф»', en: 'Skin "Coral Reef"' }, cost: { arenaTokens: 5000 }, give: { skin: 'lorelei_coral' }, limit: 1 },
  // гильдия
  { id: 'gd_mythic', shop: 'guild', name: { ru: 'Мифический предмет', en: 'Mythic item' }, cost: { guildCoins: 2000 }, give: { item: 'mythic' }, limit: 1, weekly: true },
  { id: 'gd_shards', shop: 'guild', name: { ru: '10 осколков UR', en: '10 UR shards' }, cost: { guildCoins: 1500 }, give: { shardsRarity: 'UR', shards: 10 }, limit: 1, weekly: true },
  // лабиринт
  { id: 'lb_skin1', shop: 'labyrinth', name: { ru: 'Облик «Звезда сцены»', en: 'Skin "Stage Star"' }, cost: { labCoins: 800 }, give: { skin: 'hanna_star' }, limit: 1 },
  { id: 'lb_skin2', shop: 'labyrinth', name: { ru: 'Облик «Ночная сакура»', en: 'Skin "Night Sakura"' }, cost: { labCoins: 1200 }, give: { skin: 'rin_night' }, limit: 1 },
  { id: 'lb_skin3', shop: 'labyrinth', name: { ru: 'Облик «Нуар»', en: 'Skin "Noir"' }, cost: { labCoins: 1500 }, give: { skin: 'carmen_noir' }, limit: 1 },
  { id: 'lb_legend', shop: 'labyrinth', name: { ru: 'Легендарный предмет', en: 'Legendary item' }, cost: { labCoins: 600 }, give: { item: 'legendary' }, limit: 2, weekly: true },
  // ивент
  { id: 'ev_skin', shop: 'event', name: { ru: 'Облик «Падший серафим»', en: 'Skin "Fallen Seraph"' }, cost: { eventTokens: 2000 }, give: { skin: 'seraphina_dark' }, limit: 1 },
  { id: 'ev_skin2', shop: 'event', name: { ru: 'Облик «Чёрная роза»', en: 'Skin "Black Rose"' }, cost: { eventTokens: 2000 }, give: { skin: 'belladonna_rose' }, limit: 1 },
  { id: 'ev_scroll', shop: 'event', name: { ru: 'Свиток призыва', en: 'Summon scroll' }, cost: { eventTokens: 200 }, give: { cur: { scrolls: 1 } }, limit: 10 },
  { id: 'ev_shards', shop: 'event', name: { ru: '10 осколков SSR', en: '10 SSR shards' }, cost: { eventTokens: 500 }, give: { shardsRarity: 'SSR', shards: 10 }, limit: 3 },
];
export const SHOP_OFFER_MAP: Record<string, ShopOffer> = Object.fromEntries(SHOP_OFFERS.map((o) => [o.id, o]));

/** Боевой пропуск: 50 уровней, бесплатная и премиум-ветка. */
export const PASS_LEVELS = 50;
export const PASS_XP_PER_LEVEL = 100;
export interface PassReward {
  cur?: Partial<Record<Currency, number>>;
  skin?: string;
  item?: 'epic' | 'legendary';
}
export function passReward(level: number, premium: boolean): PassReward {
  if (premium) {
    if (level === 50) return { skin: 'lira_crimson' };
    if (level === 25) return { skin: 'sigrid_valk' };
    if (level % 10 === 0) return { item: 'legendary', cur: { crystals: 200 } };
    if (level % 5 === 0) return { cur: { scrolls: 2, crystals: 100 } };
    return { cur: { crystals: 40, starDust: 15 } };
  }
  if (level % 10 === 0) return { cur: { scrolls: 1, crystals: 50 } };
  if (level % 5 === 0) return { item: 'epic' };
  return { cur: { dust: 40, gold: 30 } };
}

/** Реклама с наградой: виды наград. */
export type AdRewardKind = 'quick' | 'x2' | 'bossDouble' | 'freeSummon';
