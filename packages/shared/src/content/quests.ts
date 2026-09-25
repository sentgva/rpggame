import type { Currency, L10n } from '../types';

export interface QuestDef {
  id: string;
  name: L10n;
  counter: string;
  target: number;
  activity: number;
  reward: Partial<Record<Currency, number>>;
}

/** Ежедневные задания (8 шт.). */
export const DAILY_QUESTS: QuestDef[] = [
  { id: 'd_login', name: { ru: 'Войти в игру', en: 'Log in' }, counter: 'login', target: 1, activity: 20, reward: { gold: 30 } },
  { id: 'd_chest', name: { ru: 'Собрать сундук 2 раза', en: 'Collect the chest 2 times' }, counter: 'chestCollect', target: 2, activity: 20, reward: { crystals: 5 } },
  { id: 'd_boss', name: { ru: 'Победить босса', en: 'Defeat a boss' }, counter: 'bossWin', target: 1, activity: 20, reward: { gold: 60 } },
  { id: 'd_level', name: { ru: 'Повысить уровень героинь 3 раза', en: 'Level up heroines 3 times' }, counter: 'heroLevel', target: 3, activity: 20, reward: { xp: 60 } },
  { id: 'd_enhance', name: { ru: 'Заточить предметы 2 раза', en: 'Enhance items 2 times' }, counter: 'enhance', target: 2, activity: 20, reward: { dust: 30 } },
  { id: 'd_summon', name: { ru: 'Призвать героиню', en: 'Summon a heroine' }, counter: 'summon', target: 1, activity: 20, reward: { crystals: 10 } },
  { id: 'd_dungeon', name: { ru: 'Пройти подземелье 2 раза', en: 'Clear dungeons 2 times' }, counter: 'dungeon', target: 2, activity: 20, reward: { starDust: 10 } },
  { id: 'd_quick', name: { ru: 'Сделать быстрый сбор', en: 'Use quick collect' }, counter: 'quick', target: 1, activity: 20, reward: { crystals: 5 } },
];

/** Еженедельные задания (10 шт.). */
export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'w_daily', name: { ru: 'Выполнить 30 ежедневных заданий', en: 'Complete 30 daily quests' }, counter: 'dailyDone', target: 30, activity: 50, reward: { crystals: 50 } },
  { id: 'w_boss', name: { ru: 'Победить 15 боссов', en: 'Defeat 15 bosses' }, counter: 'bossWin', target: 15, activity: 50, reward: { gold: 600 } },
  { id: 'w_summon', name: { ru: 'Призвать 10 героинь', en: 'Summon 10 heroines' }, counter: 'summon', target: 10, activity: 50, reward: { scrolls: 1 } },
  { id: 'w_dungeon', name: { ru: 'Пройти 15 подземелий', en: 'Clear 15 dungeons' }, counter: 'dungeon', target: 15, activity: 50, reward: { starDust: 60 } },
  { id: 'w_tower', name: { ru: 'Покорить 5 этажей Башни', en: 'Conquer 5 Tower floors' }, counter: 'towerWin', target: 5, activity: 50, reward: { crystals: 30 } },
  { id: 'w_enhance', name: { ru: 'Заточить предметы 20 раз', en: 'Enhance items 20 times' }, counter: 'enhance', target: 20, activity: 50, reward: { dust: 200 } },
  { id: 'w_expedition', name: { ru: 'Завершить 10 экспедиций', en: 'Complete 10 expeditions' }, counter: 'expedition', target: 10, activity: 50, reward: { forgeMats: 20 } },
  { id: 'w_chest', name: { ru: 'Собрать сундук 15 раз', en: 'Collect the chest 15 times' }, counter: 'chestCollect', target: 15, activity: 50, reward: { gold: 600 } },
  { id: 'w_smelt', name: { ru: 'Переплавить 50 предметов', en: 'Smelt 50 items' }, counter: 'smelt', target: 50, activity: 50, reward: { forgeMats: 15 } },
  { id: 'w_arena', name: { ru: 'Провести 10 боёв арены', en: 'Fight 10 arena battles' }, counter: 'arenaFight', target: 10, activity: 50, reward: { arenaTokens: 100 } },
];

/** Пороги активности для сундуков и их награды. Золото/опыт — в «минутах дохода». */
export const DAILY_CHESTS: { at: number; reward: Partial<Record<Currency, number>> }[] = [
  { at: 40, reward: { gold: 30, dust: 20 } },
  { at: 80, reward: { crystals: 10, xp: 30 } },
  { at: 120, reward: { scrolls: 1, starDust: 15 } },
  { at: 160, reward: { crystals: 25, forgeMats: 5 } },
];
export const WEEKLY_CHESTS: { at: number; reward: Partial<Record<Currency, number>> }[] = [
  { at: 100, reward: { crystals: 30 } },
  { at: 200, reward: { scrolls: 2 } },
  { at: 300, reward: { crystals: 60, starDust: 50 } },
  { at: 400, reward: { scrolls: 3, forgeMats: 30 } },
  { at: 500, reward: { crystals: 100 } },
];

/** Награды за вход: 28-дневный календарь, 28-й день — SSR-героиня на выбор. */
export const LOGIN_REWARDS: { day: number; reward: Partial<Record<Currency, number>>; ssrChoice?: boolean }[] = Array.from(
  { length: 28 },
  (_, i) => {
    const day = i + 1;
    if (day === 28) return { day, reward: { crystals: 100 }, ssrChoice: true };
    if (day % 7 === 0) return { day, reward: { crystals: 60 + day * 5, scrolls: 1 } };
    if (day % 3 === 0) return { day, reward: { scrolls: 1, dust: 50 } };
    return { day, reward: { crystals: 15 + day, gold: 20 } };
  },
);

/** Шаблоны достижений: каждый шаблон — лестница уровней (всего ~300 достижений). */
export interface AchievementDef {
  id: string;
  name: L10n;
  /** Ключ счётчика или вычисляемой метрики. */
  metric: string;
  tiers: number[];
  /** Кристаллы за уровень. */
  crystals: number;
  title?: L10n;
}

const tiers = (arr: number[]) => arr;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'stage', name: { ru: 'Покорительница этапов', en: 'Stage Conqueror' }, metric: 'maxStage', tiers: tiers(Array.from({ length: 30 }, (_, i) => (i + 1) * 20)), crystals: 10, title: { ru: 'Покорительница', en: 'Conqueror' } },
  { id: 'bossWin', name: { ru: 'Убийца боссов', en: 'Boss Slayer' }, metric: 'bossWin', tiers: tiers([1, 5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500, 2000, 3000, 5000]), crystals: 8, title: { ru: 'Гроза боссов', en: 'Bane of Bosses' } },
  { id: 'summon', name: { ru: 'Зов Кристалла', en: 'Crystal Call' }, metric: 'summon', tiers: tiers([1, 10, 30, 60, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000]), crystals: 10 },
  { id: 'heroes', name: { ru: 'Коллекционерка', en: 'Collector' }, metric: 'heroCount', tiers: tiers([5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50]), crystals: 17, title: { ru: 'Собирательница душ', en: 'Soul Gatherer' } },
  { id: 'heroLevel', name: { ru: 'Наставница', en: 'Mentor' }, metric: 'maxHeroLevel', tiers: tiers([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200]), crystals: 8 },
  { id: 'enhance', name: { ru: 'Кузнец', en: 'Smith' }, metric: 'enhance', tiers: tiers([1, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500, 2000, 3000, 5000]), crystals: 7 },
  { id: 'maxEnhance', name: { ru: 'Мастер заточки', en: 'Enhance Master' }, metric: 'maxEnhance', tiers: tiers([3, 5, 7, 9, 10, 11, 12, 13, 14, 15]), crystals: 13 },
  { id: 'legendary', name: { ru: 'Легенды оживают', en: 'Legends Awaken' }, metric: 'legendaryFound', tiers: tiers([1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200]), crystals: 13 },
  { id: 'mythic', name: { ru: 'Мифотворица', en: 'Mythmaker' }, metric: 'mythicFound', tiers: tiers([1, 3, 5, 10, 15, 25, 40, 60]), crystals: 20 },
  { id: 'chest', name: { ru: 'Хозяйственная', en: 'Thrifty' }, metric: 'chestCollect', tiers: tiers([1, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500, 2000]), crystals: 5 },
  { id: 'tower', name: { ru: 'Восхождение', en: 'Ascent' }, metric: 'towerFloor', tiers: tiers([5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500]), crystals: 10, title: { ru: 'Покорительница Башни', en: 'Tower Conqueror' } },
  { id: 'dungeon', name: { ru: 'Расхитительница', en: 'Raider' }, metric: 'dungeon', tiers: tiers([1, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500]), crystals: 7 },
  { id: 'ascension', name: { ru: 'Вечный цикл', en: 'Eternal Cycle' }, metric: 'ascensions', tiers: tiers([1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50]), crystals: 33, title: { ru: 'Вознесённая', en: 'Ascended' } },
  { id: 'constellation', name: { ru: 'Звездочёт', en: 'Stargazer' }, metric: 'constellation', tiers: tiers([1, 10, 20, 40, 60, 80, 100, 120, 150, 180, 210, 240]), crystals: 13 },
  { id: 'expedition', name: { ru: 'Путешественница', en: 'Traveler' }, metric: 'expedition', tiers: tiers([1, 10, 25, 50, 100, 200, 350, 500, 750, 1000]), crystals: 7 },
  { id: 'arena', name: { ru: 'Гладиатор', en: 'Gladiator' }, metric: 'arenaWin', tiers: tiers([1, 10, 25, 50, 100, 200, 350, 500, 750, 1000]), crystals: 8, title: { ru: 'Чемпионка арены', en: 'Arena Champion' } },
  { id: 'labyrinth', name: { ru: 'Выход из лабиринта', en: 'Way Out' }, metric: 'labWin', tiers: tiers([1, 3, 5, 10, 20, 30, 50, 75, 100]), crystals: 17 },
  { id: 'smelt', name: { ru: 'Переплавщица', en: 'Smelter' }, metric: 'smelt', tiers: tiers([10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000]), crystals: 5 },
  { id: 'gold', name: { ru: 'Золотая лихорадка', en: 'Gold Rush' }, metric: 'goldEarned', tiers: tiers([1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15]), crystals: 7 },
  { id: 'kills', name: { ru: 'Гроза врагов', en: 'Scourge of Foes' }, metric: 'kills', tiers: tiers([10, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000]), crystals: 5 },
  { id: 'abyss', name: { ru: 'Взгляд в Бездну', en: 'Gaze into the Abyss' }, metric: 'abyssLevel', tiers: tiers([1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500]), crystals: 20, title: { ru: 'Дитя Бездны', en: 'Child of the Abyss' } },
  { id: 'login', name: { ru: 'Верность', en: 'Loyalty' }, metric: 'loginDays', tiers: tiers([1, 3, 7, 14, 30, 60, 90, 120, 180, 240, 300, 365]), crystals: 10 },
  { id: 'accLevel', name: { ru: 'Командор', en: 'Commander' }, metric: 'accountLevel', tiers: tiers([5, 10, 20, 30, 40, 50, 60, 80, 100, 120, 140, 160, 180, 200]), crystals: 10 },
];

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.reduce((s, a) => s + a.tiers.length, 0);
