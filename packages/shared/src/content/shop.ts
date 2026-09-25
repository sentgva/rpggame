import type { Currency, L10n } from '../types';
import { SKINS } from './heroines';

/** Магазины за игровые валюты. */
export interface ShopOffer {
  id: string;
  shop: 'shards' | 'arena' | 'guild' | 'labyrinth' | 'event' | 'daily' | 'skins';
  name: L10n;
  cost: Partial<Record<Currency, number>>;
  give: { cur?: Partial<Record<Currency, number>>; shardsRarity?: 'R' | 'SR' | 'SSR' | 'UR'; shards?: number; skin?: string; item?: 'epic' | 'legendary' | 'mythic' };
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
  ...skinOffers('arena', 'ar', { arenaTokens: 4500 }),
  // гильдия
  { id: 'gd_mythic', shop: 'guild', name: { ru: 'Мифический предмет', en: 'Mythic item' }, cost: { guildCoins: 2000 }, give: { item: 'mythic' }, limit: 1, weekly: true },
  { id: 'gd_shards', shop: 'guild', name: { ru: '10 осколков UR', en: '10 UR shards' }, cost: { guildCoins: 1500 }, give: { shardsRarity: 'UR', shards: 10 }, limit: 1, weekly: true },
  // лабиринт
  { id: 'lb_skin1', shop: 'labyrinth', name: { ru: 'Облик «Звезда сцены»', en: 'Skin "Stage Star"' }, cost: { labCoins: 800 }, give: { skin: 'hanna_star' }, limit: 1 },
  { id: 'lb_skin2', shop: 'labyrinth', name: { ru: 'Облик «Ночная сакура»', en: 'Skin "Night Sakura"' }, cost: { labCoins: 1200 }, give: { skin: 'rin_night' }, limit: 1 },
  { id: 'lb_skin3', shop: 'labyrinth', name: { ru: 'Облик «Нуар»', en: 'Skin "Noir"' }, cost: { labCoins: 1500 }, give: { skin: 'carmen_noir' }, limit: 1 },
  ...skinOffers('labyrinth', 'lb', { labCoins: 1400 }),
  { id: 'lb_legend', shop: 'labyrinth', name: { ru: 'Легендарный предмет', en: 'Legendary item' }, cost: { labCoins: 600 }, give: { item: 'legendary' }, limit: 2, weekly: true },
  // ивент
  { id: 'ev_skin', shop: 'event', name: { ru: 'Облик «Падший серафим»', en: 'Skin "Fallen Seraph"' }, cost: { eventTokens: 2000 }, give: { skin: 'seraphina_dark' }, limit: 1 },
  { id: 'ev_skin2', shop: 'event', name: { ru: 'Облик «Чёрная роза»', en: 'Skin "Black Rose"' }, cost: { eventTokens: 2000 }, give: { skin: 'belladonna_rose' }, limit: 1 },
  ...skinOffers('event', 'ev', { eventTokens: 1800 }),
  { id: 'ev_scroll', shop: 'event', name: { ru: 'Свиток призыва', en: 'Summon scroll' }, cost: { eventTokens: 200 }, give: { cur: { scrolls: 1 } }, limit: 10 },
  { id: 'ev_shards', shop: 'event', name: { ru: '10 осколков SSR', en: '10 SSR shards' }, cost: { eventTokens: 500 }, give: { shardsRarity: 'SSR', shards: 10 }, limit: 3 },
  // облики за кристаллы: эксклюзивы магазина и все облики летней и бельевой коллекций
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
export const PASS_SKIN_POOL: string[] = [
  'lira_crimson',
  'sigrid_valk',
  ...SKINS.filter((x) => x.set && x.source === 'pass').map((x) => x.id),
];

export function seasonIndex(season: string): number {
  const n = Number(season.replace(/^s/, ''));
  return Number.isFinite(n) ? n : 0;
}

export function passSkins(season: string): string[] {
  const per = PASS_SKIN_LEVELS.length;
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
    return { skin, cur: { crystals: 100 + si * 50, scrolls: 1 } };
  }
  if (level % 10 === 0) return { item: 'legendary', cur: { scrolls: 2, crystals: 100 } };
  if (level % 5 === 0) return { item: 'epic', cur: { scrolls: 1, crystals: 30 } };
  if (level % 2 === 0) return { cur: { crystals: 20, starDust: 15 } };
  return { cur: { dust: 60, gold: 30 } };
}

export function passBonusReward(): PassReward {
  return { cur: { crystals: 50, starDust: 20 } };
}
