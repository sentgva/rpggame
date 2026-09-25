import type { Config } from '../config';
import { HEROINE_MAP, STARTER_HEROINES } from '../content';
import { hashStr, mixSeed } from '../rng';
import type { Currency, HeroineState, PlayerState } from '../types';
import { CURRENCIES } from '../types';

export const STATE_VERSION = 1;
const DAY = 86400000;

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Номер недели с понедельника (UTC). */
export function weekKey(now: number): string {
  const days = Math.floor(now / DAY);
  return `w${Math.floor((days + 3) / 7)}`;
}

/** Сезон пропуска — 30 дней. */
export function seasonKey(now: number): string {
  return `s${Math.floor(now / DAY / 30)}`;
}

export function seasonEnd(now: number): number {
  return (Math.floor(now / DAY / 30) + 1) * 30 * DAY;
}

export function yesterdayKey(now: number): string {
  return dayKey(now - DAY);
}

export function newHeroine(cfg: Config, id: string): HeroineState {
  const def = HEROINE_MAP[id];
  return {
    id,
    lvl: 1,
    stars: cfg.hero.startStars[def.rarity],
    tree: {},
    skills: [null, null],
    gear: {},
  };
}

export function emptyCurrencies(): Record<Currency, number> {
  return Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>;
}

export function createPlayer(cfg: Config, id: string, name: string, now: number, lang: 'ru' | 'en' = 'ru'): PlayerState {
  const seed = mixSeed(hashStr(id), now & 0xffffffff, 0x1d1e);
  const heroines: Record<string, HeroineState> = {};
  for (const h of STARTER_HEROINES) heroines[h] = newHeroine(cfg, h);
  const cur = emptyCurrencies();
  cur.gold = 300;
  cur.crystals = 300;
  cur.scrolls = 1;

  const s: PlayerState = {
    v: STATE_VERSION,
    id,
    name,
    createdAt: now,
    rng: seed,
    battleSeed: mixSeed(seed, 0xba77),
    uidCounter: 1,
    account: { lvl: 1, xp: 0 },
    cur,
    heroines,
    shards: {},
    items: {},
    invCap: cfg.inventory.start,
    gems: {},
    skins: [],
    party: {
      presets: [
        ['coral', null, 'lira', 'seyra', null],
        [null, null, null, null, null],
        [null, null, null, null, null],
      ],
      active: 0,
    },
    progress: { diff: 0, cleared: [0, 0, 0], wave: 0, bossFails: 0, retryAt: 0, maxGlobal: 0, maxGlobalEver: 0 },
    chest: { since: now, minutes: 0, gold: 0, xp: 0, accXp: 0, itemMin: 0, dust: 0 },
    boosts: { x2Until: 0 },
    day: { key: dayKey(now), quickFree: false, quickAd: false, quick: 0, ads: 0, freeSummon: false, keys: {}, arena: 0, arenaBought: 0, gift: false },
    week: { key: weekKey(now), treeDiscount: false },
    summon: { pitySSR: 0, pityUR: 0, total: 0 },
    constellation: 0,
    ascension: { count: 0, ether: 0, up: {}, story: 0 },
    modes: {
      dungeons: {},
      tower: 0,
      abyss: 0,
      expeditions: [],
      expeditionBoard: { day: '', quests: [] },
      labBest: 0,
      arena: { rating: 1000, wins: 0, losses: 0, opponents: [], refreshDay: '' },
    },
    quests: {
      dayKey: dayKey(now),
      weekKey: weekKey(now),
      daily: { login: 1 },
      weekly: {},
      dailyClaimed: [],
      weeklyClaimed: [],
      dailyChests: [],
      weeklyChests: [],
      login: { streak: 1, last: dayKey(now), claimedKey: '', total: 1 },
    },
    counters: { login: 1, loginDays: 1 },
    achievements: {},
    shop: {
      bought: {},
      monthlyUntil: 0,
      monthlyLastDay: '',
      passUntil: 0,
      passSeason: seasonKey(now),
      passXp: 0,
      passClaimed: [],
      passPremiumClaimed: [],
      starterUntil: now + 72 * 3600 * 1000,
    },
    mail: [
      {
        id: 'welcome',
        title: { ru: 'Добро пожаловать, Командор!', en: 'Welcome, Commander!' },
        body: {
          ru: 'Кристалл Эфира пробудился. Прими эти дары и собери Легион Валькирий.',
          en: 'The Aether Crystal has awakened. Accept these gifts and gather the Valkyrie Legion.',
        },
        at: now,
        rewards: { cur: { crystals: 300, scrolls: 2 } },
      },
    ],
    settings: {
      lang,
      music: 0.6,
      sfx: 0.8,
      notify: true,
      autoLevel: true,
      autoBoss: false,
      autoRetry: true,
      autoSmelt: 2,
      haptics: true,
      speed: 1,
    },
    tutorial: 0,
    dev: { used: false },
    lastSeen: now,
    story: ['prologue'],
    titles: [],
  };
  return s;
}

/** Миграция старых сохранений: заполняем недостающие поля значениями по умолчанию. */
export function migrate(cfg: Config, raw: PlayerState, now: number): PlayerState {
  const fresh = createPlayer(cfg, raw.id, raw.name, raw.createdAt ?? now, raw.settings?.lang ?? 'ru');
  const s = fillDefaults(raw as any, fresh as any) as PlayerState;
  for (const c of CURRENCIES) if (typeof s.cur[c] !== 'number' || !isFinite(s.cur[c])) s.cur[c] = 0;
  s.v = STATE_VERSION;
  return s;
}

function fillDefaults(target: any, defaults: any): any {
  if (target === undefined || target === null) return defaults;
  if (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults)) return target;
  if (typeof target !== 'object' || Array.isArray(target)) return defaults;
  for (const k of Object.keys(defaults)) {
    // словари с динамическими ключами не дополняем содержимым по умолчанию
    if (k === 'heroines' || k === 'items' || k === 'shards' || k === 'gems' || k === 'up' || k === 'tree' || k === 'gear' || k === 'dungeons' || k === 'keys' || k === 'bought' || k === 'counters' || k === 'achievements' || k === 'daily' || k === 'weekly') {
      if (target[k] === undefined) target[k] = defaults[k];
      continue;
    }
    if (k === 'mail' || k === 'story') {
      if (target[k] === undefined) target[k] = defaults[k];
      continue;
    }
    target[k] = fillDefaults(target[k], defaults[k]);
  }
  return target;
}
