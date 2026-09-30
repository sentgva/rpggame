import type { L10n } from '../types';

/**
 * «Рыбалка» (по мотивам Stardew Valley и Genshin): три места, у каждого своя рыба. Заброс тратит наживку,
 * сервер решает, кто клюнул; дальше — мини-игра: держи рыбу в зоне, пока шкала улова не заполнится.
 * Редкая рыба бьётся сильнее, легендарная — почти вырывается. Коллекция видов даёт награды, рекорды веса
 * записываются. С собой можно взять героиню: водная стихия приманивает редкую рыбу.
 */
const L = (ru: string, en: string): L10n => ({ ru, en });

export type FishSpot = 'lake' | 'sea' | 'moon';
export type FishRarity = 'common' | 'rare' | 'epic' | 'legend';

export const FISH_SPOTS: { id: FishSpot; icon: string; name: L10n; desc: L10n; level: number }[] = [
  { id: 'lake', icon: '🏞️', name: L('Тихое озеро', 'Quiet Lake'), desc: L('Спокойная вода, рыба попроще', 'Calm water, easier fish'), level: 1 },
  { id: 'sea', icon: '🌊', name: L('Морской пирс', 'Sea Pier'), desc: L('Крупная рыба и тёплое солнце', 'Big fish and warm sun'), level: 12 },
  { id: 'moon', icon: '🌙', name: L('Лунная заводь', 'Moonlit Cove'), desc: L('Ночью клюёт то, чего нет в книгах', 'At night bites what no book describes'), level: 25 },
];

export interface FishDef {
  id: string;
  name: L10n;
  spot: FishSpot;
  rarity: FishRarity;
  /** вес, кг */
  weight: [number, number];
  color: string;
}

export const FISH: FishDef[] = [
  { id: 'carp', name: L('Карп-пузан', 'Pot-bellied Carp'), spot: 'lake', rarity: 'common', weight: [1, 4], color: '#c8a050' },
  { id: 'perch', name: L('Серебристый окунь', 'Silver Perch'), spot: 'lake', rarity: 'common', weight: [0.3, 1.5], color: '#b8c8d8' },
  { id: 'pike', name: L('Щука-разбойница', 'Bandit Pike'), spot: 'lake', rarity: 'rare', weight: [2, 9], color: '#6a9a4a' },
  { id: 'catfish', name: L('Усатый сом', 'Whiskered Catfish'), spot: 'lake', rarity: 'epic', weight: [8, 30], color: '#5a4a3a' },
  { id: 'goldfish', name: L('Золотая рыбка', 'Golden Fish'), spot: 'lake', rarity: 'legend', weight: [0.5, 1.2], color: '#ffd24a' },
  { id: 'sardine', name: L('Сардина', 'Sardine'), spot: 'sea', rarity: 'common', weight: [0.1, 0.4], color: '#8ab0d0' },
  { id: 'clown', name: L('Рыба-клоун', 'Clownfish'), spot: 'sea', rarity: 'common', weight: [0.1, 0.3], color: '#ff8a3a' },
  { id: 'sword', name: L('Меч-рыба', 'Swordfish'), spot: 'sea', rarity: 'rare', weight: [20, 90], color: '#4a7ab0' },
  { id: 'manta', name: L('Скат-парус', 'Sail Manta'), spot: 'sea', rarity: 'epic', weight: [40, 200], color: '#3a4a7a' },
  { id: 'kraken', name: L('Кракен-малыш', 'Baby Kraken'), spot: 'sea', rarity: 'legend', weight: [15, 60], color: '#c04a8a' },
  { id: 'firefly', name: L('Светлячковый гольян', 'Firefly Minnow'), spot: 'moon', rarity: 'common', weight: [0.05, 0.2], color: '#d8f07a' },
  { id: 'ghosteel', name: L('Призрачный угорь', 'Ghost Eel'), spot: 'moon', rarity: 'rare', weight: [1, 5], color: '#c8d8f0' },
  { id: 'starray', name: L('Звёздный скат', 'Star Ray'), spot: 'moon', rarity: 'epic', weight: [5, 25], color: '#6a5ad0' },
  { id: 'moonkoi', name: L('Лунный карп-кои', 'Moon Koi'), spot: 'moon', rarity: 'rare', weight: [2, 8], color: '#f0e0f8' },
  { id: 'pearl', name: L('Русалочья жемчужина', 'Mermaid Pearl'), spot: 'moon', rarity: 'legend', weight: [0.2, 0.6], color: '#fff0fa' },
];
export const FISH_MAP: Record<string, FishDef> = Object.fromEntries(FISH.map((f) => [f.id, f]));

/**
 * Редкость: шанс поклёвки, сила рыбы в мини-игре (0–1), золото в минутах дохода, кристаллы и Эмблемы.
 */
export const FISH_RARITY: Record<FishRarity, { name: L10n; color: string; weight: number; power: number; goldMin: number; dust: number; crystals: number; emblems: number }> = {
  common: { name: L('Обычная', 'Common'), color: '#c8c0b8', weight: 62, power: 0.3, goldMin: 8, dust: 15, crystals: 0, emblems: 0 },
  rare: { name: L('Редкая', 'Rare'), color: '#5ab8f0', weight: 26, power: 0.5, goldMin: 20, dust: 40, crystals: 5, emblems: 0 },
  epic: { name: L('Эпическая', 'Epic'), color: '#b04de0', weight: 10, power: 0.72, goldMin: 45, dust: 90, crystals: 15, emblems: 1 },
  legend: { name: L('Легендарная', 'Legendary'), color: '#ffc040', weight: 2, power: 0.92, goldMin: 120, dust: 200, crystals: 50, emblems: 4 },
};

/** Наживка: бесплатная в день, запас, покупка за золото (раз в день ограничено). */
export const FISH_DAILY = 8;
export const FISH_BAIT_MAX = 24;
export const FISH_BUY = { bait: 3, perDay: 5, goldMin: 25 };
/** Идеальный улов (рыба ни разу не вышла из зоны) — +50% золота. */
export const FISH_PERFECT = 0.5;
/** Коллекция: сколько видов поймано → награда (один раз). */
export const FISH_COLLECTION: { species: number; crystals: number; emblems?: number; hearts?: number }[] = [
  { species: 5, crystals: 100 },
  { species: 10, crystals: 200, emblems: 2 },
  { species: 15, crystals: 500, emblems: 3, hearts: 1 },
];
/** Спутница водной стихии приманивает редкую рыбу. */
export const FISH_WATER_BONUS = 1.35;
