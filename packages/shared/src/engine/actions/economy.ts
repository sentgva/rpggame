import { CHANGELOG, SHOP_OFFER_MAP } from '../../content';
import type { Item, PlayerSettings } from '../../types';
import type { Action } from '../apply';
import {
  addAccountXp,
  addItem,
  assert,
  capMinutes,
  give,
  goldPerMin,
  grantReward,
  levelUpLegion,
  rollLoot,
  settleChest,
  spend,
  steelPerMin,
  track,
  vInt,
  vOneOf,
  vStr,
  xpPerMin,
  type Ctx,
} from '../core';
import { createPlayer, weekKey } from '../state';

/** Ускорения ×2 на сегодня. */
export function boostsLeft(ctx: Pick<Ctx, 'cfg' | 's'>): number {
  return ctx.cfg.income.x2PerDay - ctx.s.day.boosts;
}

/** Вещи из сундука (до 400 за раз); лишнее уходит в авторазбор. */
function chestItems(ctx: Ctx, count: number): { items: string[]; salvaged: number } {
  const items: string[] = [];
  let salvaged = 0;
  for (let i = 0; i < Math.min(count, 400); i++) {
    const uid = addItem(ctx, rollLoot(ctx));
    if (uid) items.push(uid);
    else salvaged++;
  }
  return { items, salvaged };
}

export const economyActions = {
  'chest.collect': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    settleChest(ctx);
    const c = s.chest;
    const gold = Math.floor(c.gold);
    const xp = Math.floor(c.xp);
    const steel = Math.floor(c.steel);
    const itemCount = Math.floor(c.itemMin / cfg.income.itemEveryMin);
    const minutes = c.minutes;
    give(ctx, { gold, xp, steel });
    addAccountXp(ctx, c.accXp);
    const loot = chestItems(ctx, itemCount);
    s.chest = { since: ctx.now, minutes: 0, gold: 0, xp: 0, accXp: 0, itemMin: c.itemMin - itemCount * cfg.income.itemEveryMin, steel: 0 };
    const levels = s.settings.autoLevel ? levelUpLegion(ctx, 1000) : 0;
    track(ctx, 'chestCollect', 1);
    ctx.events.push({ name: 'chest_collect', props: { minutes: Math.round(minutes), gold, items: itemCount } });
    return { gold, xp, steel, minutes, items: loot.items, salvaged: loot.salvaged, levels };
  },

  /** Быстрый сбор: мгновенно 2 ч дохода. Бесплатно quickFree раз в день, дальше — за кристаллы. */
  'chest.quick': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const method = vOneOf(a.method, ['free', 'crystals'] as const, 'method');
    if (method === 'free') {
      assert(s.day.quickFree < cfg.income.quickFree, 'usedToday');
      s.day.quickFree++;
    } else {
      const costs = cfg.income.quickCrystals;
      assert(s.day.quick < costs.length, 'usedToday');
      spend(ctx, { crystals: costs[s.day.quick] });
      s.day.quick++;
    }
    const minutes = cfg.income.quickHours * 60;
    const gold = Math.floor(goldPerMin(cfg, s) * minutes);
    const xp = Math.floor(xpPerMin(cfg, s) * minutes);
    const steel = Math.floor(steelPerMin(cfg, s) * minutes);
    give(ctx, { gold, xp, steel });
    const loot = chestItems(ctx, Math.floor(minutes / cfg.income.itemEveryMin));
    const levels = s.settings.autoLevel ? levelUpLegion(ctx, 1000) : 0;
    track(ctx, 'quick', 1);
    ctx.events.push({ name: 'quick_collect', props: { method } });
    return { gold, xp, steel, minutes, items: loot.items, salvaged: loot.salvaged, levels };
  },

  /** Ускорение ×2 на 30 минут: несколько раз в день. */
  'boost.x2': (ctx: Ctx) => {
    const { s, cfg, now } = ctx;
    assert(boostsLeft(ctx) > 0, 'usedToday');
    s.day.boosts++;
    settleChest(ctx);
    s.boosts.x2Until = Math.max(now, s.boosts.x2Until) + cfg.income.x2Minutes * 60000;
    return { x2Until: s.boosts.x2Until };
  },

  'shop.buy': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const id = vStr(a.offer, 'offer');
    const offer = SHOP_OFFER_MAP[id];
    assert(offer, 'badParam', { name: 'offer' });
    const period = offer.shop === 'daily' ? s.day.key : offer.weekly ? weekKey(ctx.now) : 'all';
    const key = period === 'all' ? id : `${id}@${period}`;
    const bought = s.shop.bought[key] ?? 0;
    if (offer.limit) assert(bought < offer.limit, 'limitReached');
    if (offer.give.skin) assert(!s.skins.includes(offer.give.skin), 'owned');
    spend(ctx, offer.cost);
    s.shop.bought[key] = bought + 1;
    const out: Record<string, unknown> = {};
    if (offer.give.cur) {
      give(ctx, offer.give.cur);
      out.cur = offer.give.cur;
    }
    if (offer.give.skin) {
      s.skins.push(offer.give.skin);
      out.skin = offer.give.skin;
    }
    if (offer.give.item) {
      const rarity = offer.give.item === 'legendary' ? 4 : 3;
      const it = rollLoot(ctx, { rarity: rarity as Item['rarity'] });
      const uid = addItem(ctx, it, { keep: true });
      assert(uid, 'inventoryFull');
      out.item = uid;
    }
    return out;
  },

  'mail.claim': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const ids = a.id === 'all' ? s.mail.filter((m) => !m.claimed && m.rewards).map((m) => m.id) : [vStr(a.id, 'id')];
    const out: unknown[] = [];
    for (const id of ids) {
      const m = s.mail.find((x) => x.id === id);
      assert(m, 'noMail');
      if (m.claimed) continue;
      m.claimed = true;
      if (m.rewards) out.push(grantReward(ctx, m.rewards));
    }
    return { rewards: out };
  },

  'mail.delete': (ctx: Ctx) => {
    ctx.s.mail = ctx.s.mail.filter((m) => !m.claimed);
    return {};
  },

  settings: (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const p = (a.patch ?? {}) as Partial<PlayerSettings>;
    const st = s.settings;
    if (p.lang !== undefined) st.lang = vOneOf(p.lang, ['ru', 'en'] as const, 'lang');
    if (p.music !== undefined) st.music = clamp01(p.music);
    if (p.sfx !== undefined) st.sfx = clamp01(p.sfx);
    if (p.notify !== undefined) st.notify = !!p.notify;
    if (p.autoLevel !== undefined) st.autoLevel = !!p.autoLevel;
    if (p.autoRetry !== undefined) st.autoRetry = !!p.autoRetry;
    if (p.haptics !== undefined) st.haptics = !!p.haptics;
    if (p.autoBoss !== undefined) st.autoBoss = !!p.autoBoss;
    if (p.autoSalvage !== undefined) st.autoSalvage = vInt(p.autoSalvage, -1, 4, 'autoSalvage');
    if (p.speed !== undefined) st.speed = p.speed === 2 ? 2 : 1;
    if (p.manual !== undefined) st.manual = !!p.manual;
    return {};
  },

  /**
   * Полный сброс прогресса: игра начинается с нуля (героини, предметы, валюты, этапы, режимы).
   * Сохраняются только настройки и имя. Нужна явная строка подтверждения — от случайного нажатия.
   */
  'account.reset': (ctx: Ctx, a: Action) => {
    assert(a.confirm === 'RESET', 'badParam', { name: 'confirm' });
    const { s } = ctx;
    const fresh = createPlayer(ctx.cfg, s.id, s.name, ctx.now, s.settings.lang);
    fresh.settings = { ...fresh.settings, ...s.settings };
    // аккаунт, побывавший в режиме разработчика, остаётся помеченным
    fresh.dev.used = s.dev.used;
    for (const k of Object.keys(s) as (keyof typeof s)[]) if (!(k in fresh)) delete s[k];
    Object.assign(s, fresh);
    ctx.events.push({ name: 'account_reset', props: {} });
    return {};
  },

  /** Прочитана запись «Что нового». */
  'news.seen': (ctx: Ctx, a: Action) => {
    const id = vStr(a.id, 'id');
    assert(CHANGELOG.some((c) => c.id === id), 'badParam', { name: 'id' });
    ctx.s.settings.news = id;
    return {};
  },

  tutorial: (ctx: Ctx, a: Action) => {
    const step = vInt(a.step, 0, 100, 'step');
    ctx.s.tutorial = Math.max(ctx.s.tutorial, step);
    return {};
  },

  'title.set': (ctx: Ctx, a: Action) => {
    if (a.title === null) delete ctx.s.title;
    else {
      const t = vStr(a.title, 'title');
      assert(ctx.s.titles.includes(t), 'badParam', { name: 'title' });
      ctx.s.title = t;
    }
    return {};
  },

  'name.set': (ctx: Ctx, a: Action) => {
    const name = vStr(a.name, 'name').trim().slice(0, 24);
    assert(name.length >= 2, 'badParam', { name: 'name' });
    ctx.s.name = name;
    return {};
  },

  /** Отметить, что игрок видел экран «Пока вас не было». */
  seen: (ctx: Ctx) => {
    ctx.s.lastSeen = ctx.now;
    return { cap: capMinutes(ctx.cfg, ctx.s, ctx.now) };
  },
};

function clamp01(v: unknown): number {
  const n = typeof v === 'number' && isFinite(v) ? v : 0;
  return Math.max(0, Math.min(1, n));
}
