import type { Config } from '../config';
import { ARENA_LEAGUES, arenaLeague } from '../content';
import { Rng } from '../rng';
import type { GameEvent, PlayerState } from '../types';
import { battleActions } from './actions/battle';
import { devActions } from './actions/dev';
import { economyActions } from './actions/economy';
import { heroActions } from './actions/heroes';
import { itemActions } from './actions/items';
import { metaActions } from './actions/meta';
import { modeActions } from './actions/modes';
import { purchaseActions } from './actions/purchase';
import { GameError, give, settleChest, track, type Ctx } from './core';
import { dayKey, seasonKey, weekKey, yesterdayKey } from './state';

export interface Action {
  type: string;
  [k: string]: unknown;
}

export type Handler = (ctx: Ctx, a: Action) => unknown;

export const HANDLERS: Record<string, Handler> = {
  sync: () => ({}),
  ...battleActions,
  ...heroActions,
  ...itemActions,
  ...economyActions,
  ...metaActions,
  ...modeActions,
  ...devActions,
  ...purchaseActions,
};

/** Действия, которые может инициировать только сервер (платежи, рефералы…). */
export const SERVER_ONLY = new Set(Object.keys(purchaseActions));

export interface ApplyOptions {
  cfg: Config;
  now: number;
  dev?: boolean;
  /** Выполняется на сервере: бои без записи событий. */
  server?: boolean;
  /** Действие инициировано сервером (платежи, почта) — разрешены SERVER_ONLY. */
  trusted?: boolean;
  /** Не клонировать состояние (вызывающий уже передал копию). */
  mutate?: boolean;
}

export interface ApplyResult {
  state: PlayerState;
  result: any;
  events: GameEvent[];
}

export function applyAction(state: PlayerState, action: Action, opt: ApplyOptions): ApplyResult {
  const handler = HANDLERS[action?.type];
  if (!handler) throw new GameError('unknownAction', { type: String(action?.type) });
  if (SERVER_ONLY.has(action.type) && !opt.trusted) throw new GameError('forbidden');
  if (action.type.startsWith('dev.') && !opt.dev) throw new GameError('forbidden');
  const s = opt.mutate ? state : structuredClone(state);
  const ctx: Ctx = {
    s,
    cfg: opt.cfg,
    now: opt.now,
    rng: new Rng(s.rng),
    dev: !!opt.dev,
    server: !!opt.server,
    events: [],
  };
  tick(ctx);
  const result = handler(ctx, action);
  touch(ctx);
  s.rng = ctx.rng.state;
  if (action.type.startsWith('dev.')) s.dev.used = true;
  return { state: s, result: result ?? {}, events: ctx.events };
}

/** Общий шаг перед любым действием: смена дня/недели/сезона и начисление дохода в сундук. */
export function tick(ctx: Ctx) {
  const { s, now, cfg } = ctx;
  const today = dayKey(now);
  if (s.day.key !== today) {
    // вход в игру: серия дней подряд
    const login = s.quests.login;
    if (login.last !== today) {
      login.streak = login.last === yesterdayKey(now) ? login.streak + 1 : 1;
      login.last = today;
      login.total++;
    }
    s.day = { key: today, quickFree: false, quickAd: false, quick: 0, ads: 0, freeSummon: false, keys: {}, arena: 0, arenaBought: 0, gift: false };
    s.quests.dayKey = today;
    s.quests.daily = {};
    s.quests.dailyClaimed = [];
    s.quests.dailyChests = [];
    track(ctx, 'login', 1);
    // месячная карта: 100 кристаллов в день
    if (s.shop.monthlyUntil > now && s.shop.monthlyLastDay !== today) {
      s.shop.monthlyLastDay = today;
      give(ctx, { crystals: 100 });
    }
    // чистим устаревшие ключи лимитов магазина
    for (const k of Object.keys(s.shop.bought)) {
      const parts = k.split('@');
      if (parts[1] && parts[1].length === 10 && parts[1] !== today) delete s.shop.bought[k];
    }
    ctx.events.push({ name: 'day_start', props: { streak: login.streak } });
  }
  const wk = weekKey(now);
  if (s.week.key !== wk) {
    // еженедельная награда арены по лиге
    if (s.modes.arena.wins + s.modes.arena.losses > 0) {
      const league = arenaLeague(s.modes.arena.rating);
      give(ctx, { crystals: league.weekly });
      s.mail.push({
        id: `arena_${s.week.key}`,
        title: { ru: 'Награда арены', en: 'Arena reward' },
        body: { ru: `Лига: ${league.name.ru}. Начислено ${league.weekly} кристаллов.`, en: `League: ${league.name.en}. ${league.weekly} crystals granted.` },
        at: now,
        claimed: true,
      });
      void ARENA_LEAGUES;
    }
    for (const k of Object.keys(s.shop.bought)) {
      const parts = k.split('@');
      if (parts[1] && parts[1].startsWith('w') && parts[1] !== wk) delete s.shop.bought[k];
    }
    s.week = { key: wk, treeDiscount: false };
    s.quests.weekKey = wk;
    s.quests.weekly = {};
    s.quests.weeklyClaimed = [];
    s.quests.weeklyChests = [];
  }
  const season = seasonKey(now);
  if (s.shop.passSeason !== season) {
    s.shop.passSeason = season;
    s.shop.passXp = 0;
    s.shop.passClaimed = [];
    s.shop.passPremiumClaimed = [];
  }
  // почта: храним не больше 50 писем
  if (s.mail.length > 50) s.mail = s.mail.slice(-50);
  settleChest(ctx);
  void cfg;
}

/** Отметка «игрок был в игре» — после действия (для экрана «Пока вас не было»). */
export function touch(ctx: Ctx) {
  ctx.s.lastSeen = ctx.now;
}

export function sanitizeResult(result: any): any {
  if (result && typeof result === 'object' && result.battle && result.battle.events) {
    return { ...result, battle: { ...result.battle, events: undefined } };
  }
  return result;
}
