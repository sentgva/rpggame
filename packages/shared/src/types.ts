/** Базовые типы игры, общие для клиента и сервера. */

export type Lang = 'ru' | 'en';
/** Локализованная строка. */
export type L10n = { ru: string; en: string };

export type Element = 'fire' | 'nature' | 'water' | 'light' | 'dark';
export const ELEMENTS: Element[] = ['fire', 'nature', 'water', 'light', 'dark'];

export type ClassId =
  | 'guardian'
  | 'berserker'
  | 'archer'
  | 'sorceress'
  | 'priestess'
  | 'necromancer'
  | 'assassin'
  | 'bard';
export const CLASS_IDS: ClassId[] = [
  'guardian',
  'berserker',
  'archer',
  'sorceress',
  'priestess',
  'necromancer',
  'assassin',
  'bard',
];

export type HeroRarity = 'R' | 'SR' | 'SSR' | 'UR';
export const HERO_RARITIES: HeroRarity[] = ['R', 'SR', 'SSR', 'UR'];

/** 0 обычный … 6 божественный */
export type ItemRarity = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const ITEM_RARITY_KEYS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'] as const;

export type Difficulty = 0 | 1 | 2;
export const DIFFICULTY_KEYS = ['normal', 'hard', 'nightmare'] as const;

export type ItemSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'belt'
  | 'cloak'
  | 'amulet'
  | 'ring';
export type EquipSlot = Exclude<ItemSlot, 'ring'> | 'ring1' | 'ring2';
export const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'belt',
  'cloak',
  'amulet',
  'ring1',
  'ring2',
];
export const ITEM_SLOTS: ItemSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'belt',
  'cloak',
  'amulet',
  'ring',
];

export function equipSlotToItemSlot(s: EquipSlot): ItemSlot {
  return s === 'ring1' || s === 'ring2' ? 'ring' : s;
}

/** Все характеристики и бонусы, которые могут давать предметы, древо, созвездие и т. д. */
export type StatKey =
  | 'hp'
  | 'atk'
  | 'def'
  | 'spd'
  | 'hpPct'
  | 'atkPct'
  | 'defPct'
  | 'crit'
  | 'critDmg'
  | 'acc'
  | 'eva'
  | 'pen'
  | 'lifesteal'
  | 'healPower'
  | 'resist'
  | 'energyRegen'
  | 'dmgFire'
  | 'dmgNature'
  | 'dmgWater'
  | 'dmgLight'
  | 'dmgDark'
  | 'dmgBoss'
  | 'dmgSkill'
  | 'dmgUlt'
  | 'dmgBasic'
  | 'dmgDot'
  | 'dmgReduce'
  | 'shieldPower'
  | 'goldPct'
  | 'xpPct'
  | 'lootDouble'
  | 'skillRank';

export type Stats = Partial<Record<StatKey, number>>;

/** Итоговые боевые характеристики юнита. */
export interface FinalStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  critDmg: number;
  acc: number;
  eva: number;
  pen: number;
  lifesteal: number;
  healPower: number;
  resist: number;
  energyRegen: number;
  /** Прочие бонусы (урон по стихиям, по боссам и т. д.). */
  bonus: Stats;
}

export type Currency =
  | 'gold'
  | 'xp'
  | 'crystals'
  | 'scrolls'
  | 'dust'
  | 'starDust'
  | 'ether'
  | 'arenaTokens'
  | 'guildCoins'
  | 'forgeMats'
  | 'divineMats'
  | 'labCoins'
  | 'eventTokens';
export const CURRENCIES: Currency[] = [
  'gold',
  'xp',
  'crystals',
  'scrolls',
  'dust',
  'starDust',
  'ether',
  'arenaTokens',
  'guildCoins',
  'forgeMats',
  'divineMats',
  'labCoins',
  'eventTokens',
];

/** Особый эффект (ключевой талант, легендарка, сет, пробуждение…) с параметрами. */
export interface SpecialEffect {
  id: string;
  /** Основной числовой параметр (проценты — в долях). */
  v?: number;
  /** Дополнительный параметр. */
  n?: number;
  /** Строковый параметр, например id умения. */
  s?: string;
}

export interface ItemAffix {
  id: string;
  tier: number;
  v: number;
}

export interface Item {
  uid: string;
  base: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  lvl: number;
  main: { stat: StatKey; v: number };
  affixes: ItemAffix[];
  set?: string;
  fx?: string;
  enh: number;
  luck?: number;
  sockets: number;
  gems: (string | null)[];
  lock?: boolean;
  isNew?: boolean;
}

export interface HeroineState {
  id: string;
  lvl: number;
  stars: number;
  tree: Record<string, number>;
  skills: (string | null)[];
  spec?: 'A' | 'B';
  skin?: string;
  awakened?: boolean;
  gear: Partial<Record<EquipSlot, string>>;
  treeResets?: number;
}

export interface Expedition {
  id: string;
  quest: string;
  heroes: string[];
  start: number;
  end: number;
}

export interface RiftState {
  day: string;
  used: number;
  /** лучший ярус награды за сегодня (для быстрой зачистки) */
  bestTierToday: number;
  bestDmgToday: number;
  week: string;
  bestDmgWeek: number;
  bestDmgEver: number;
}

export interface HordeState {
  day: string;
  wave: number;
  hp: Record<string, number>;
  active: boolean;
  best: number;
  week: string;
  bestWeek: number;
  /** Благословения забега (id из HORDE_BLESSINGS, могут повторяться). */
  blessings?: string[];
  /** Предложенный выбор благословения — до выбора следующая волна недоступна. */
  offer?: string[];
}

export interface LabyrinthRun {
  week: string;
  floor: number;
  node: number;
  choices: string[];
  hp: Record<string, number>;
  relics: string[];
  buffs: Stats;
  pending?: { kind: 'relic' | 'buff'; options: string[] };
  coins: number;
  done?: boolean;
  won?: boolean;
  seed: number;
}

export interface MailMessage {
  id: string;
  title: L10n;
  body: L10n;
  at: number;
  rewards?: Reward;
  claimed?: boolean;
}

export interface Reward {
  cur?: Partial<Record<Currency, number>>;
  shards?: Record<string, number>;
  heroes?: string[];
  items?: Item[];
  gems?: Record<string, number>;
  skins?: string[];
  accXp?: number;
}

export interface PlayerSettings {
  lang: Lang;
  music: number;
  sfx: number;
  notify: boolean;
  autoLevel: boolean;
  autoBoss: boolean;
  autoRetry: boolean;
  /** Автопереплавка: всё ниже указанной редкости (−1 — выключено). */
  autoSmelt: number;
  haptics: boolean;
  speed: 1 | 2;
  /** Ручные ульты в боях с боссами и в режимах (по умолчанию включены). */
  manualUlt?: boolean;
  /** Последняя прочитанная запись «Что нового» (id из CHANGELOG). */
  news?: string;
}

/** Близость с героиней: уровень, опыт и счётчики действий за день. */
export interface BondState {
  lvl: number;
  xp: number;
  day: string;
  talk: number;
  treat: number;
  spa: boolean;
  date: boolean;
  /** ванна в резиденции (раз в день) */
  bath?: boolean;
}

/** Артефакты: уровни (1–5), слоты отряда, гарантии баннера. */
export interface ArtifactState {
  owned: Record<string, number>;
  slots: (string | null)[];
  pitySSR: number;
  pityUR: number;
  total: number;
  /** день последнего бесплатного призыва */
  freeDay?: string;
}

/** Резиденция героинь: уровни комнат и последняя ночёвка. */
export interface HomeState {
  rooms: Partial<Record<'living' | 'kitchen' | 'bath' | 'bedroom', number>>;
  /** день последней ночёвки (одна героиня за ночь) */
  slept?: string;
  sleptWith?: string;
}

/** Праздник Легиона: прогресс текущего праздника (с началом следующего начинается заново). */
export interface FestivalState {
  /** номер праздника (цикла) */
  cycle: number;
  /** какой праздник (id) — прогресс сбрасывается и при смене праздника с тем же номером */
  fest?: string;
  /** уровень силы на старте праздника — от него считаются враги пути и босса */
  lvl: number;
  points: number;
  /** забранные ступени шкалы наград (индексы) */
  claimed: number[];
  /** звёзды этапов пути (индекс этапа − 1 → 0–3) */
  stars: number[];
  /** день, к которому относятся билеты, задания и попытки босса */
  day: string;
  tickets: number;
  /** задания праздника, награда за которые забрана сегодня */
  tasks: string[];
  /** всего заданий праздника выполнено за праздник */
  tasksDone: number;
  /** цели праздника, награда за которые забрана */
  goals: string[];
  /** общие счётчики на старте праздника (для целей) */
  base: Record<string, number>;
  /** босс праздника: уровень, снятое HP текущего уровня, попытки сегодня, победы, лучший урон */
  boss: { lvl: number; dmg: number; used: number; kills: number; best: number };
  /** «Турнир Валькирий»: текущий забег, входы сегодня (и купленные), рекорд, победы, чемпионства */
  tour?: TourneyState;
  /** «Самоцветные копи»: этаж, раскопанные клетки, кирки */
  mine?: MineState;
}

/** Забег турнира: драфт из предложенных героинь, затем бои до 3 поражений или 7 побед. */
export interface TourneyRun {
  seed: number;
  picks: string[];
  /** предложение на выбор (драфт или замена после победы) */
  offer: string[];
  phase: 'draft' | 'fight' | 'swap' | 'done';
  wins: number;
  losses: number;
}

export interface TourneyState {
  run?: TourneyRun;
  /** входов использовано сегодня */
  entries: number;
  /** купленные в лавке входы (не сгорают) */
  bonus: number;
  best: number;
  wins: number;
  champs: number;
}

export interface MineState {
  floor: number;
  seed: number;
  picks: number;
  /** раскопанные клетки текущего этажа */
  dug: number[];
  chests: number;
  steps: number;
  /** самый глубокий этаж за праздник */
  best: number;
}

/** Активная встреча на экране боя. */
export interface EncounterState {
  kind: string;
  at: number;
  until: number;
}

export interface PlayerState {
  v: number;
  id: string;
  name: string;
  createdAt: number;
  rng: number;
  battleSeed: number;
  /** Близость с UR-героинями (режим «Уход») и Сердца Эфира для нарядов близости. */
  bond?: Record<string, BondState>;
  bondHearts?: number;
  home?: HomeState;
  artifacts?: ArtifactState;
  festival?: FestivalState;
  /** Встреча, ждущая решения игрока, и время следующей. */
  encounter?: EncounterState | null;
  encounterNext?: number;
  uidCounter: number;
  account: { lvl: number; xp: number };
  cur: Record<Currency, number>;
  heroines: Record<string, HeroineState>;
  shards: Record<string, number>;
  items: Record<string, Item>;
  invCap: number;
  gems: Record<string, number>;
  skins: string[];
  party: { presets: (string | null)[][]; active: number };
  progress: {
    diff: Difficulty;
    cleared: [number, number, number];
    wave: number;
    bossFails: number;
    retryAt: number;
    maxGlobal: number;
    maxGlobalEver: number;
  };
  chest: { since: number; minutes: number; gold: number; xp: number; accXp: number; itemMin: number; dust: number };
  boosts: { x2Until: number };
  day: {
    key: string;
    quickFree: boolean;
    quickAd: boolean;
    quick: number;
    ads: number;
    freeSummon: boolean;
    keys: Record<string, number>;
    arena: number;
    arenaBought: number;
    gift: boolean;
  };
  week: { key: string; treeDiscount: boolean };
  summon: { pitySSR: number; pityUR: number; total: number };
  constellation: number;
  ascension: { count: number; ether: number; up: Record<string, number>; story: number };
  modes: {
    dungeons: Record<string, number>;
    tower: number;
    abyss: number;
    expeditions: Expedition[];
    expeditionBoard: { day: string; quests: string[] };
    lab?: LabyrinthRun;
    labBest: number;
    arena: { rating: number; wins: number; losses: number; opponents: ArenaOpponent[]; refreshDay: string };
    /** Разлом Колосса: попытки за день, лучший урон дня/недели. */
    rift?: RiftState;
    /** Стихийные шпили: пройденный этаж по стихиям. */
    spires?: Partial<Record<Element, number>>;
    /** Нашествие: забег на выживание (один в день). */
    horde?: HordeState;
  };
  quests: {
    dayKey: string;
    weekKey: string;
    daily: Record<string, number>;
    weekly: Record<string, number>;
    dailyClaimed: string[];
    weeklyClaimed: string[];
    dailyChests: number[];
    weeklyChests: number[];
    login: { streak: number; last: string; claimedKey: string; total: number };
  };
  counters: Record<string, number>;
  achievements: Record<string, number>;
  shop: {
    bought: Record<string, number>;
    passSeason: string;
    passXp: number;
    passClaimed: number[];
    /** Открыто бонусных сундуков пропуска (после 50-го уровня). */
    passBonus?: number;
  };
  mail: MailMessage[];
  settings: PlayerSettings;
  tutorial: number;
  dev: { used: boolean; unlockAll?: boolean; immortal?: boolean; oneShot?: boolean; fixedSeed?: number | null; speed?: number; log?: boolean };
  lastSeen: number;
  story: string[];
  titles: string[];
  title?: string;
  lastBoss?: { gold: number; xp: number; at: number; doubled?: boolean };
  notify?: { chestFullAt?: number };
  referral?: { by?: string; count: number; claimed: number[] };
}

export interface ArenaOpponent {
  id: string;
  name: string;
  rating: number;
  power: number;
  seed: number;
  team: { id: string; lvl: number; stars: number }[];
}

/** Событие для аналитики и журнала. */
export interface GameEvent {
  name: string;
  props?: Record<string, string | number | boolean | null>;
}
