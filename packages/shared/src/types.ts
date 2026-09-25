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
}

export interface PlayerState {
  v: number;
  id: string;
  name: string;
  createdAt: number;
  rng: number;
  battleSeed: number;
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
    monthlyUntil: number;
    monthlyLastDay: string;
    passUntil: number;
    passSeason: string;
    passXp: number;
    passClaimed: number[];
    passPremiumClaimed: number[];
    /** Открыто бонусных сундуков пропуска (после 50-го уровня). */
    passBonus?: number;
    starterUntil: number;
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
