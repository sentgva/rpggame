import type { Config } from '../config';
import { STARTER_HEROINES, CHANGELOG_LATEST } from '../content';
import { hashStr, mixSeed } from '../rng';
import type { Currency, HeroState, PlayerState } from '../types';
import { CURRENCIES } from '../types';

/** 4 — «Легион 3.0»: новый бой, снаряжение и общий уровень Легиона; старые сохранения сбрасываются. */
export const STATE_VERSION = 4;
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

export function newHeroine(_cfg: Config, id: string): HeroState {
  return { id, rank: 1, skill: 1, ult: 1, gear: {} };
}

export function emptyCurrencies(): Record<Currency, number> {
  return Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>;
}

export function createPlayer(cfg: Config, id: string, name: string, now: number, lang: 'ru' | 'en' = 'ru'): PlayerState {
  const seed = mixSeed(hashStr(id), now & 0xffffffff, 0x1d1e);
  const heroines: Record<string, HeroState> = {};
  for (const h of STARTER_HEROINES) heroines[h] = newHeroine(cfg, h);
  const cur = emptyCurrencies();
  cur.gold = 300;
  cur.crystals = 300;

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
    legion: { lvl: 1 },
    heroines,
    items: {},
    invCap: cfg.inventory.start,
    skins: [],
    banner: {},
    progress: { stage: 0, wave: 0, fails: 0, retryAt: 0 },
    chest: { since: now, minutes: 0, gold: 0, xp: 0, accXp: 0, itemMin: 0, steel: 0 },
    boosts: { x2Until: 0 },
    day: { key: dayKey(now), quickFree: 0, quick: 0, boosts: 0, keys: {}, gift: false },
    week: { key: weekKey(now) },
    modes: { tower: 0, dungeons: {} },
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
    shop: { bought: {}, passSeason: seasonKey(now), passXp: 0, passClaimed: [] },
    mail: [
      {
        id: 'welcome',
        title: { ru: 'Добро пожаловать, Командор!', en: 'Welcome, Commander!' },
        body: {
          ru: 'Кристалл Эфира пробудился. Кассиан и Лира уже в строю — остальные присоединятся в походе. Эмблемы — на первые ранги.',
          en: 'The Aether Crystal has awakened. Cassian and Lira stand ready — the others will join on the march. Emblems are for the first ranks.',
        },
        at: now,
        rewards: { cur: { crystals: 300, emblems: 20 } },
      },
    ],
    settings: {
      // новичкам «Что нового» не показываем — всё и так новое
      news: CHANGELOG_LATEST,
      lang,
      music: 0.6,
      sfx: 0.8,
      notify: true,
      autoLevel: false,
      autoBoss: true,
      autoRetry: true,
      autoSalvage: 1,
      haptics: true,
      speed: 1,
      manual: true,
    },
    tutorial: 0,
    dev: { used: false },
    lastSeen: now,
    story: ['prologue'],
    titles: [],
  };
  return s;
}

/** Миграция сохранений: до 3.0 — новая игра (системы несовместимы), дальше — дополняем недостающие поля. */
export function migrate(cfg: Config, raw: PlayerState, now: number): PlayerState {
  if (!(raw?.v >= STATE_VERSION)) {
    const fresh = createPlayer(cfg, raw.id, raw.name, now, raw.settings?.lang ?? 'ru');
    // аккаунт, побывавший в режиме разработчика, остаётся помеченным
    if (raw?.dev?.used) fresh.dev.used = true;
    return fresh;
  }
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
    if (k === 'heroines' || k === 'items' || k === 'banner' || k === 'gear' || k === 'dungeons' || k === 'keys' || k === 'bought' || k === 'counters' || k === 'achievements' || k === 'daily' || k === 'weekly') {
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
