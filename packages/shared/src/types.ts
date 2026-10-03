/** Базовые типы игры, общие для клиента и сервера (Легион 3.0). */

export type Lang = 'ru' | 'en';
/** Локализованная строка. */
export type L10n = { ru: string; en: string };

export type Element = 'fire' | 'nature' | 'water' | 'light' | 'dark';
export const ELEMENTS: Element[] = ['fire', 'nature', 'water', 'light', 'dark'];

/** Шесть классов — по одному герою на класс. */
export type ClassId = 'knight' | 'assassin' | 'priestess' | 'ranger' | 'warlock' | 'hunter';
export const CLASS_IDS: ClassId[] = ['knight', 'assassin', 'priestess', 'ranger', 'warlock', 'hunter'];

// ——— снаряжение ———

/** 0 обычный … 5 мифический (мифический — только слиянием). */
export type ItemRarity = 0 | 1 | 2 | 3 | 4 | 5;
export const RARITY_KEYS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export const MAX_RARITY = 5;

/** Четыре слота: оружие (атака), шлем (здоровье), доспех (защита), сапоги (скорость). */
export type GearSlot = 'weapon' | 'helmet' | 'armor' | 'boots';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'helmet', 'armor', 'boots'];

/** Дополнительные свойства предметов. */
export type SubStat = 'atkPct' | 'hpPct' | 'defPct' | 'crit' | 'critDmg' | 'haste' | 'skillDmg' | 'lifesteal';
export const SUB_STATS: SubStat[] = ['atkPct', 'hpPct', 'defPct', 'crit', 'critDmg', 'haste', 'skillDmg', 'lifesteal'];

export type SetId = 'fury' | 'bastion' | 'gale' | 'predator' | 'grace' | 'eclipse';
export const SET_IDS: SetId[] = ['fury', 'bastion', 'gale', 'predator', 'grace', 'eclipse'];

export interface Item {
  uid: string;
  slot: GearSlot;
  rarity: ItemRarity;
  /** Уровень предмета (= этап, где он найден). */
  lvl: number;
  /** Вид для иконки и названия (меч, лук, тяжёлый доспех…). */
  kind: string;
  /** Доп. свойства: значения в долях (0.06 = 6%). */
  subs: { s: SubStat; v: number }[];
  set?: SetId;
  /** Заточка 0…15. */
  enh: number;
  lock?: boolean;
  isNew?: boolean;
}

// ——— характеристики ———

/** Итоговые характеристики бойца. Проценты — в долях. */
export interface FinalStats {
  hp: number;
  atk: number;
  def: number;
  /** Скорость: ускоряет атаки и перезарядку умений. */
  haste: number;
  crit: number;
  critDmg: number;
  /** Урон умений и ульт. */
  skillDmg: number;
  lifesteal: number;
  /** Сила лечения. */
  heal: number;
  /** Снижение получаемого урона. */
  dmgRed: number;
  /** Прибавка к набору энергии. */
  energy: number;
  /** Урон по боссам. */
  bossDmg: number;
}

export type StatKey = keyof FinalStats;

export type Currency = 'gold' | 'xp' | 'crystals' | 'emblems' | 'books' | 'steel' | 'eventTokens';
export const CURRENCIES: Currency[] = ['gold', 'xp', 'crystals', 'emblems', 'books', 'steel', 'eventTokens'];

export interface Reward {
  cur?: Partial<Record<Currency, number>>;
  heroes?: string[];
  items?: Item[];
  skins?: string[];
  accXp?: number;
}

export interface MailMessage {
  id: string;
  title: L10n;
  body: L10n;
  at: number;
  rewards?: Reward;
  claimed?: boolean;
}

export interface PlayerSettings {
  lang: Lang;
  music: number;
  sfx: number;
  notify: boolean;
  /** Сам повышать уровень Легиона при сборе сундука. */
  autoLevel: boolean;
  /** Сам вызывать стража этапа после волн. */
  autoBoss: boolean;
  /** Повторять бой со стражем после поражения (через паузу). */
  autoRetry: boolean;
  /** Авторазбор новых вещей ниже этой редкости (−1 — выключено). */
  autoSalvage: number;
  haptics: boolean;
  speed: 1 | 2;
  /** Ручные ульты и парирование в боях со стражами и в режимах. */
  manual?: boolean;
  /** Последняя прочитанная запись «Что нового». */
  news?: string;
}

/** Герой Легиона: ранг, уровни навыков, облик и снаряжение. Уровень — общий у Легиона. */
export interface HeroState {
  id: string;
  /** Ранг ★1…★7. */
  rank: number;
  /** Уровень умения 1…10. */
  skill: number;
  /** Уровень ульты 1…10. */
  ult: number;
  skin?: string;
  gear: Partial<Record<GearSlot, string>>;
}

/** Близость с героем: уровень, опыт и счётчики действий за день. */
export interface BondState {
  lvl: number;
  xp: number;
  day: string;
  talk: number;
  treat: number;
  spa: boolean;
  date: boolean;
  bath?: boolean;
}

/** Резиденция: уровни комнат и последняя ночёвка. */
export interface HomeState {
  rooms: Partial<Record<'living' | 'kitchen' | 'bath' | 'bedroom', number>>;
  slept?: string;
  sleptWith?: string;
}

/** Праздник Легиона: прогресс текущего праздника. */
export interface FestivalState {
  cycle: number;
  fest?: string;
  /** уровень силы на старте праздника — от него считаются враги пути и босса */
  lvl: number;
  points: number;
  claimed: number[];
  stars: number[];
  day: string;
  tickets: number;
  tasks: string[];
  tasksDone: number;
  goals: string[];
  base: Record<string, number>;
  boss: { lvl: number; dmg: number; used: number; kills: number; best: number };
  mine?: MineState;
  volley?: VolleyState;
}

export interface VolleyState {
  used: number;
  bonus: number;
  best: number;
  wins: number;
  big: number;
  match?: { rung: number; heroes: string[]; at: number };
}

export interface MineState {
  floor: number;
  seed: number;
  picks: number;
  dug: number[];
  chests: number;
  steps: number;
  best: number;
}

export interface CampfireState {
  day: string;
  done: boolean;
  scene?: string;
  seen: string[];
}

export interface AdjutantState {
  hero: string;
  skin?: string;
  day: string;
  pats: number;
}

export interface SortieState {
  day: string;
  runs: number;
  best: Record<string, { time: number; kills: number; boss: boolean }>;
  active?: { id: number; tier: string; hero: string; at: number; rewarded: boolean };
}

export interface FishingState {
  day: string;
  bait: number;
  bought: number;
  hook?: { fish: string; spot: string; weight: number; hero?: string };
  log: Record<string, { n: number; best: number }>;
  milestones: number[];
  buddy?: string;
}

export interface PhotoEntry {
  hero: string;
  skin?: string;
  loc: string;
  pose: string;
  face: string;
  stars: number;
  at: number;
}

export interface PhotoState {
  day: string;
  shots: number;
  album: PhotoEntry[];
  known: Record<string, { loc?: string; pose?: string; face?: string }>;
  best: number;
}

/** Колосс: попытки за день, лучший урон дня, недели и за всё время, забранные пороги дня. */
export interface RaidState {
  day: string;
  used: number;
  bestDay: number;
  week: string;
  bestWeek: number;
  best: number;
  /** пороги урона, награда за которые забрана сегодня */
  tiers: number[];
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
  /** Уровень Легиона — общий для всех героев. */
  legion: { lvl: number };
  heroines: Record<string, HeroState>;
  items: Record<string, Item>;
  invCap: number;
  skins: string[];
  /** Знамя Легиона: уровни улучшений аккаунта. */
  banner: Record<string, number>;
  /** Поход: пройдено этапов (сквозной номер 0…600), волна текущего этапа, неудачи стража. */
  progress: { stage: number; wave: number; fails: number; retryAt: number };
  chest: { since: number; minutes: number; gold: number; xp: number; accXp: number; itemMin: number; steel: number };
  boosts: { x2Until: number };
  day: {
    key: string;
    /** бесплатные быстрые сборы сегодня */
    quickFree: number;
    /** быстрые сборы за кристаллы сегодня */
    quick: number;
    /** ускорения ×2 сегодня */
    boosts: number;
    /** ключи подземелий, потраченные сегодня */
    keys: Record<string, number>;
    gift: boolean;
  };
  week: { key: string };
  modes: {
    /** Башня: пройдено этажей. */
    tower: number;
    /** Подземелья: лучший пройденный уровень по видам. */
    dungeons: Record<string, number>;
    raid?: RaidState;
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
    passBonus?: number;
  };
  mail: MailMessage[];
  settings: PlayerSettings;
  tutorial: number;
  dev: { used: boolean; unlockAll?: boolean; immortal?: boolean; oneShot?: boolean; fixedSeed?: number | null; speed?: number };
  lastSeen: number;
  story: string[];
  titles: string[];
  title?: string;
  notify?: { chestFullAt?: number };
  referral?: { by?: string; count: number; claimed: number[] };
  // ——— Лагерь ———
  bond?: Record<string, BondState>;
  bondHearts?: number;
  home?: HomeState;
  festival?: FestivalState;
  photo?: PhotoState;
  fishing?: FishingState;
  campfire?: CampfireState;
  adjutant?: AdjutantState;
  sortie?: SortieState;
}

/** Событие для аналитики и журнала. */
export interface GameEvent {
  name: string;
  props?: Record<string, string | number | boolean | null>;
}
