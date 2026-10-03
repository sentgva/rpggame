import type { Config } from '../config';
import { Rng } from '../rng';
import type { GameEvent, PlayerState } from '../types';
import { campaignActions } from './actions/campaign';
import { devActions } from './actions/dev';
import { economyActions } from './actions/economy';
import { legionActions } from './actions/legion';
import { itemActions } from './actions/items';
import { metaActions } from './actions/meta';
import { modeActions } from './actions/modes';
import { bondActions } from './actions/bond';
import { festivalActions } from './actions/festival';
import { mineActions } from './actions/mine';
import { photoActions } from './actions/photo';
import { fishingActions } from './actions/fishing';
import { volleyActions } from './actions/volley';
import { campfireActions } from './actions/campfire';
import { adjutantActions } from './actions/adjutant';
import { sortieActions } from './actions/sortie';
import { serverActions } from './actions/server';
import type { CombatInput } from './combat';
import { GameError, settleChest, track, type Ctx } from './core';
import { dayKey, seasonKey, weekKey, yesterdayKey } from './state';

export interface Action {
  type: string;
  [k: string]: unknown;
}

export type Handler = (ctx: Ctx, a: Action) => unknown;

export const HANDLERS: Record<string, Handler> = {
  sync: () => ({}),
  ...campaignActions,
  ...legionActions,
  ...itemActions,
  ...economyActions,
  ...metaActions,
  ...modeActions,
  ...bondActions,
  ...festivalActions,
  ...mineActions,
  ...photoActions,
  ...fishingActions,
  ...volleyActions,
  ...campfireActions,
  ...adjutantActions,
  ...sortieActions,
  ...devActions,
  ...serverActions,
};

/** Действия, которые может инициировать только сервер (платежи, рефералы…). */
export const SERVER_ONLY = new Set(Object.keys(serverActions));

export interface ApplyOptions {
  cfg: Config;
  now: number;
  dev?: boolean;
  /** Выполняется на сервере: бои без записи событий. */
  server?: boolean;
  /** Действие инициировано сервером (почта, награды) — разрешены SERVER_ONLY. */
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
    control: battleControl(action),
  };
  tick(ctx);
  const result = handler(ctx, action);
  touch(ctx);
  s.rng = ctx.rng.state;
  if (action.type.startsWith('dev.')) s.dev.used = true;
  return { state: s, result: result ?? {}, events: ctx.events };
}

/** Ручное управление: { manual: true, inputs: [{ t, k: 'ult', u } | { t, k: 'guard' } | { t, k: 'auto' }] } в любом боевом действии. */
export function battleControl(a: Action): Ctx['control'] {
  if (a.manual !== true) return undefined;
  const raw = a.inputs === undefined ? [] : a.inputs;
  if (!Array.isArray(raw) || raw.length > 300) throw new GameError('badParam', { name: 'inputs' });
  const inputs: CombatInput[] = raw.map((x) => {
    const o = x as { t?: unknown; k?: unknown; u?: unknown };
    if (!Number.isInteger(o?.t) || (o.t as number) < 0 || (o.t as number) > 3_600_000) throw new GameError('badParam', { name: 'inputs' });
    const t = o.t as number;
    if (o.k === 'ult') {
      if (!Number.isInteger(o.u) || (o.u as number) < 0 || (o.u as number) > 99) throw new GameError('badParam', { name: 'inputs' });
      return { t, k: 'ult', u: o.u as number };
    }
    if (o.k === 'guard') return { t, k: 'guard' };
    if (o.k === 'auto') return { t, k: 'auto' };
    throw new GameError('badParam', { name: 'inputs' });
  });
  return { manual: true, inputs };
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
    s.day = { key: today, quickFree: 0, quick: 0, boosts: 0, keys: {}, gift: false };
    s.quests.dayKey = today;
    s.quests.daily = {};
    s.quests.dailyClaimed = [];
    s.quests.dailyChests = [];
    track(ctx, 'login', 1);
    // чистим устаревшие ключи лимитов магазина
    for (const k of Object.keys(s.shop.bought)) {
      const parts = k.split('@');
      if (parts[1] && parts[1].length === 10 && parts[1] !== today) delete s.shop.bought[k];
    }
    ctx.events.push({ name: 'day_start', props: { streak: login.streak } });
  }
  const wk = weekKey(now);
  if (s.week.key !== wk) {
    for (const k of Object.keys(s.shop.bought)) {
      const parts = k.split('@');
      if (parts[1] && parts[1].startsWith('w') && parts[1] !== wk) delete s.shop.bought[k];
    }
    s.week = { key: wk };
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
    s.shop.passBonus = 0;
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
