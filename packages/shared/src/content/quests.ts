import type { Currency, L10n } from '../types';

export interface QuestDef {
  id: string;
  name: L10n;
  counter: string;
  target: number;
  activity: number;
  /** Золото и опыт — в минутах дохода. */
  reward: Partial<Record<Currency, number>>;
}

/** Ежедневные задания. */
export const DAILY_QUESTS: QuestDef[] = [
  { id: 'd_login', name: { ru: 'Войти в игру', en: 'Log in' }, counter: 'login', target: 1, activity: 20, reward: { gold: 30 } },
  { id: 'd_chest', name: { ru: 'Собрать сундук 2 раза', en: 'Collect the chest 2 times' }, counter: 'chestCollect', target: 2, activity: 20, reward: { crystals: 10 } },
  { id: 'd_boss', name: { ru: 'Победить 3 стражей этапов', en: 'Defeat 3 stage guardians' }, counter: 'bossWin', target: 3, activity: 20, reward: { gold: 60 } },
  { id: 'd_level', name: { ru: 'Повысить уровень Легиона 3 раза', en: 'Raise the Legion level 3 times' }, counter: 'legionLevel', target: 3, activity: 20, reward: { xp: 60 } },
  { id: 'd_ult', name: { ru: 'Выпустить 30 ульт', en: 'Unleash 30 ultimates' }, counter: 'ult', target: 30, activity: 20, reward: { books: 2 } },
  { id: 'd_chain', name: { ru: 'Собрать 5 цепей Легиона', en: 'Build 5 Legion chains' }, counter: 'chain', target: 5, activity: 20, reward: { emblems: 2 } },
  { id: 'd_dungeon', name: { ru: 'Пройти подземелье 2 раза', en: 'Clear dungeons 2 times' }, counter: 'dungeon', target: 2, activity: 20, reward: { steel: 30 } },
  { id: 'd_merge', name: { ru: 'Слить или заточить снаряжение 3 раза', en: 'Merge or enhance gear 3 times' }, counter: 'forge', target: 3, activity: 20, reward: { steel: 20 } },
  { id: 'd_care', name: { ru: 'Провести время с героем', en: 'Spend time with a hero' }, counter: 'bondCare', target: 1, activity: 20, reward: { crystals: 10 } },
];

/** Еженедельные задания. */
export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'w_daily', name: { ru: 'Выполнить 30 ежедневных заданий', en: 'Complete 30 daily quests' }, counter: 'dailyDone', target: 30, activity: 50, reward: { crystals: 80 } },
  { id: 'w_boss', name: { ru: 'Победить 25 стражей', en: 'Defeat 25 guardians' }, counter: 'bossWin', target: 25, activity: 50, reward: { gold: 600 } },
  { id: 'w_combo', name: { ru: 'Сыграть 40 связок', en: 'Land 40 combos' }, counter: 'combo', target: 40, activity: 50, reward: { emblems: 8 } },
  { id: 'w_parry', name: { ru: 'Парировать 10 сокрушительных ударов', en: 'Parry 10 crushing blows' }, counter: 'parry', target: 10, activity: 50, reward: { books: 10 } },
  { id: 'w_tower', name: { ru: 'Покорить 5 этажей Башни', en: 'Conquer 5 Tower floors' }, counter: 'towerWin', target: 5, activity: 50, reward: { crystals: 50 } },
  { id: 'w_raid', name: { ru: 'Сразиться с Колоссом 10 раз', en: 'Fight the Colossus 10 times' }, counter: 'raid', target: 10, activity: 50, reward: { steel: 200 } },
  { id: 'w_dungeon', name: { ru: 'Пройти 12 подземелий', en: 'Clear 12 dungeons' }, counter: 'dungeon', target: 12, activity: 50, reward: { books: 10 } },
  { id: 'w_chest', name: { ru: 'Собрать сундук 15 раз', en: 'Collect the chest 15 times' }, counter: 'chestCollect', target: 15, activity: 50, reward: { gold: 600 } },
];

/** Пороги активности для сундуков и их награды. Золото/опыт — в «минутах дохода». */
export const DAILY_CHESTS: { at: number; reward: Partial<Record<Currency, number>> }[] = [
  { at: 40, reward: { gold: 30, steel: 20 } },
  { at: 80, reward: { crystals: 20, xp: 30 } },
  { at: 120, reward: { emblems: 3, books: 3 } },
  { at: 160, reward: { crystals: 40, steel: 40 } },
];
export const WEEKLY_CHESTS: { at: number; reward: Partial<Record<Currency, number>> }[] = [
  { at: 100, reward: { crystals: 50 } },
  { at: 200, reward: { emblems: 10 } },
  { at: 300, reward: { crystals: 80, books: 15 } },
  { at: 400, reward: { emblems: 15, steel: 150 } },
];

/** Награды за вход: 28-дневный календарь. */
export const LOGIN_REWARDS: { day: number; reward: Partial<Record<Currency, number>>; big?: boolean }[] = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  if (day === 28) return { day, reward: { crystals: 300, emblems: 40 }, big: true };
  if (day % 7 === 0) return { day, reward: { crystals: 80 + day * 5, emblems: 8 } };
  if (day % 3 === 0) return { day, reward: { emblems: 3, books: 3 } };
  return { day, reward: { crystals: 20 + day, steel: 20 } };
});

/** Достижения: лестница уровней по метрике. */
export interface AchievementDef {
  id: string;
  name: L10n;
  metric: string;
  tiers: number[];
  crystals: number;
  title?: L10n;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'stage', name: { ru: 'Покоритель этапов', en: 'Stage Conqueror' }, metric: 'maxStage', tiers: Array.from({ length: 30 }, (_, i) => (i + 1) * 20), crystals: 15, title: { ru: 'Покоритель', en: 'Conqueror' } },
  { id: 'legion', name: { ru: 'Рост Легиона', en: 'Legion Growth' }, metric: 'legionLevel', tiers: [10, 20, 40, 60, 80, 100, 130, 160, 200, 250, 300, 400, 500, 600], crystals: 12 },
  { id: 'bossWin', name: { ru: 'Гроза стражей', en: 'Guardian Slayer' }, metric: 'bossWin', tiers: [1, 10, 25, 50, 100, 200, 350, 500, 1000, 2000], crystals: 8, title: { ru: 'Гроза стражей', en: 'Bane of Guardians' } },
  { id: 'chain', name: { ru: 'Цепь Легиона', en: 'Legion Chain' }, metric: 'chain', tiers: [1, 10, 50, 150, 400, 1000, 2500, 5000], crystals: 10, title: { ru: 'Сердце Легиона', en: 'Heart of the Legion' } },
  { id: 'combo', name: { ru: 'Сыгранность', en: 'Teamwork' }, metric: 'combo', tiers: [1, 10, 50, 150, 400, 1000, 2500, 5000], crystals: 10 },
  { id: 'parry', name: { ru: 'Парирование', en: 'Parry' }, metric: 'parry', tiers: [1, 5, 20, 50, 120, 300, 700, 1500], crystals: 12, title: { ru: 'Несокрушимый', en: 'Unbreakable' } },
  { id: 'ranks', name: { ru: 'Ранги Легиона', en: 'Legion Ranks' }, metric: 'rankTotal', tiers: [8, 10, 12, 15, 18, 21, 24, 28, 32, 36, 42], crystals: 15 },
  { id: 'merge', name: { ru: 'Кузнец', en: 'Smith' }, metric: 'merge', tiers: [1, 10, 30, 80, 200, 500, 1000, 2000], crystals: 8 },
  { id: 'mythic', name: { ru: 'Мифотворец', en: 'Mythmaker' }, metric: 'mythicMade', tiers: [1, 3, 6, 12, 24, 40], crystals: 25 },
  { id: 'tower', name: { ru: 'Восхождение', en: 'Ascent' }, metric: 'towerFloor', tiers: [5, 10, 20, 30, 50, 75, 100, 150, 200, 300], crystals: 12, title: { ru: 'Покоритель Башни', en: 'Tower Conqueror' } },
  { id: 'dungeon', name: { ru: 'Расхититель', en: 'Raider' }, metric: 'dungeon', tiers: [1, 10, 25, 50, 100, 200, 400, 800], crystals: 8 },
  { id: 'raid', name: { ru: 'Сокрушитель колоссов', en: 'Colossus Breaker' }, metric: 'raid', tiers: [1, 10, 30, 60, 120, 250, 500], crystals: 10 },
  { id: 'chest', name: { ru: 'Хозяйственный', en: 'Thrifty' }, metric: 'chestCollect', tiers: [1, 10, 25, 50, 100, 200, 500, 1000], crystals: 5 },
  { id: 'campfire', name: { ru: 'Вечера у костра', en: 'Campfire Evenings' }, metric: 'campfire', tiers: [1, 5, 15, 30, 60, 100, 150, 250, 365], crystals: 12, title: { ru: 'Душа привала', en: 'Heart of the Camp' } },
  { id: 'kills', name: { ru: 'Гроза врагов', en: 'Scourge of Foes' }, metric: 'kills', tiers: [10, 100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000], crystals: 5 },
  { id: 'login', name: { ru: 'Верность', en: 'Loyalty' }, metric: 'loginDays', tiers: [1, 3, 7, 14, 30, 60, 90, 180, 365], crystals: 10 },
  { id: 'accLevel', name: { ru: 'Командор', en: 'Commander' }, metric: 'accountLevel', tiers: [5, 10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200], crystals: 10 },
];

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.reduce((s, a) => s + a.tiers.length, 0);

/** Летопись: пролог и главы, открывающиеся победами над владычицами актов. */
export const LORE: { id: string; title: L10n; text: L10n }[] = [
  {
    id: 'prologue',
    title: { ru: 'Пролог: Кристалл Эфира', en: 'Prologue: The Aether Crystal' },
    text: {
      ru: 'Мир Аэрис держался на Небесном Троне и десяти Печатях Света. Богиня Хаоса Никта разбила Трон, и осколки Печатей вонзились в сердца владычиц. Ты — Командор, последний хранитель Кристалла Эфира. Собери Легион и верни Печати.',
      en: 'The world of Aeris rested on the Celestial Throne and ten Seals of Light. Nyx, Goddess of Chaos, shattered the Throne, and shards of the Seals pierced the hearts of the sovereigns. You are the Commander, last keeper of the Aether Crystal. Gather the Legion and reclaim the Seals.',
    },
  },
  { id: 'act1', title: { ru: 'Глава I: Изумрудная опушка', en: 'Chapter I: Emerald Glade' }, text: { ru: 'Сильвана отпустила лес. Первая Печать горит в руке Кассиана — тёплая, как летний полдень.', en: 'Sylvana released the forest. The first Seal glows in Cassian’s hand — warm as a summer noon.' } },
  { id: 'act2', title: { ru: 'Глава II: Пустыня миражей', en: 'Chapter II: Desert of Mirages' }, text: { ru: 'Нефертари назвала Лиру сестрой по огню. Лира сделала вид, что не услышала, но улыбалась до самого привала.', en: 'Nefertari called Lira her sister in fire. Lira pretended not to hear, but smiled all the way to camp.' } },
  { id: 'act3', title: { ru: 'Глава III: Ледяной пик', en: 'Chapter III: Frozen Peak' }, text: { ru: 'Скади узнала Ульфу: когда-то они охотились в одних снегах. Снег впервые завилял хвостом чужой.', en: 'Skadi recognized Ulfa: once they hunted the same snows. For the first time Snow wagged his tail at a stranger.' } },
  { id: 'act4', title: { ru: 'Глава IV: Затонувший храм', en: 'Chapter IV: Sunken Temple' }, text: { ru: 'Талассия вернула храму воду, а Мирабель — молитву. Под водой звонят колокола.', en: 'Thalassia returned the water to the temple, and Mirabel the prayer. Bells ring beneath the waves.' } },
  { id: 'act5', title: { ru: 'Глава V: Проклятый город', en: 'Chapter V: Cursed City' }, text: { ru: 'Кармилла смеялась до последнего. «Кейра, ты же одна из нас». Кейра не ответила — она давно выбрала, кем быть.', en: '"Keira, you are one of us," Carmilla laughed to the end. Keira did not answer — she chose who to be long ago.' } },
  { id: 'act6', title: { ru: 'Глава VI: Пепельный вулкан', en: 'Chapter VI: Ashen Volcano' }, text: { ru: 'Ифрита остыла и впервые за век уснула. Над вулканом снова видны звёзды.', en: 'Ifrita cooled and slept for the first time in a century. Stars are visible above the volcano again.' } },
  { id: 'act7', title: { ru: 'Глава VII: Небесный архипелаг', en: 'Chapter VII: Sky Archipelago' }, text: { ru: 'Брунгильда сломала копьё о щит Кассиана и рассмеялась: «Ты достоин неба».', en: 'Brunhilde broke her spear on Cassian’s shield and laughed: "You are worthy of the sky."' } },
  { id: 'act8', title: { ru: 'Глава VIII: Механическая цитадель', en: 'Chapter VIII: Mechanical Citadel' }, text: { ru: 'Эгида остановила шестерни. В её груди тикает Печать — сердце, которое она так долго искала.', en: 'Aegis stilled her gears. A Seal ticks in her chest — the heart she sought for so long.' } },
  { id: 'act9', title: { ru: 'Глава IX: Лунный некрополь', en: 'Chapter IX: Lunar Necropolis' }, text: { ru: 'Морриган отпустила мёртвых. Элиан положил на её курган белый цветок.', en: 'Morrigan let the dead go. Elian laid a white flower on her mound.' } },
  { id: 'act10', title: { ru: 'Финал: Трон Пустоты', en: 'Finale: The Void Throne' }, text: { ru: 'Никта пала, но не погибла. «Я была первой из вас», — шепчет она. Её история продолжится на следующих кругах.', en: 'Nyx has fallen, but not perished. "I was the first of you," she whispers. Her story continues in the next circles.' } },
];
