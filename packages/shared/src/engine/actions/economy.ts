import { HEROINE_MAP, SHOP_OFFER_MAP, SUMMON_POOL } from '../../content';
import type { HeroRarity, Item, PlayerSettings } from '../../types';
import type { Action } from '../apply';
import {
  addAccountXp,
  addHeroine,
  addItem,
  assert,
  autoLevelParty,
  capMinutes,
  give,
  goldPerMin,
  grantReward,
  offlineBonus,
  rollLoot,
  settleChest,
  spend,
  track,
  vInt,
  vOneOf,
  vStr,
  xpPerMin,
  dustPerMin,
  type Ctx,
  farmLevel,
} from '../core';
import { weekKey } from '../state';

const HOUR = 3600000;

/** Бесплатные ускорения ×2: ограничены числом в день (счётчик day.ads). */
export function boostsLeft(ctx: Pick<Ctx, 'cfg' | 's'>): number {
  return ctx.cfg.income.x2PerDay - ctx.s.day.ads;
}

/** Сгенерировать предметы сундука; при переполнении — автопереплавка. */
function chestItems(ctx: Ctx, count: number): { items: string[]; smelted: number } {
  const n = farmLevel(ctx.cfg, ctx.s);
  const items: string[] = [];
  let smelted = 0;
  const limit = Math.min(count, 400);
  for (let i = 0; i < limit; i++) {
    const it = rollLoot(ctx, { lvl: n, maxRarity: 5 });
    const uid = addItem(ctx, it);
    if (uid) items.push(uid);
    else smelted++;
  }
  return { items, smelted };
}

export const economyActions = {
  'chest.collect': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    settleChest(ctx);
    const c = s.chest;
    const gold = Math.floor(c.gold);
    const xp = Math.floor(c.xp);
    const dust = Math.floor(c.dust);
    const itemCount = Math.floor(c.itemMin / cfg.income.itemEveryMin);
    const minutes = c.minutes;
    give(ctx, { gold, xp, dust });
    addAccountXp(ctx, c.accXp);
    const loot = chestItems(ctx, itemCount);
    s.chest = { since: ctx.now, minutes: 0, gold: 0, xp: 0, accXp: 0, itemMin: c.itemMin - itemCount * cfg.income.itemEveryMin, dust: 0 };
    const levels = s.settings.autoLevel ? autoLevelParty(ctx) : {};
    track(ctx, 'chestCollect', 1);
    ctx.events.push({ name: 'chest_collect', props: { minutes: Math.round(minutes), gold, items: itemCount } });
    return { gold, xp, dust, minutes, items: loot.items, smelted: loot.smelted, levels };
  },

  /** Быстрый сбор: мгновенно 2 ч дохода. 2 раза в день бесплатно, дальше 20 → 50 → 100 кристаллов. */
  'chest.quick': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const method = vOneOf(a.method, ['free', 'crystals'] as const, 'method');
    if (method === 'free') {
      // второй бесплатный сбор хранится во флаге quickAd (раньше — сбор за рекламу)
      assert(!s.day.quickFree || !s.day.quickAd, 'usedToday');
      if (!s.day.quickFree) s.day.quickFree = true;
      else s.day.quickAd = true;
    } else {
      const costs = cfg.income.quickCrystals;
      assert(s.day.quick < costs.length, 'usedToday');
      spend(ctx, { crystals: costs[s.day.quick] });
      s.day.quick++;
    }
    const minutes = cfg.income.quickHours * 60;
    const b = 1 + offlineBonus(s);
    const gold = Math.floor(goldPerMin(cfg, s) * minutes * b);
    const xp = Math.floor(xpPerMin(cfg, s) * minutes * b);
    const dust = Math.floor(dustPerMin(cfg, s) * minutes);
    give(ctx, { gold, xp, dust });
    const loot = chestItems(ctx, Math.floor(minutes / cfg.income.itemEveryMin));
    const levels = s.settings.autoLevel ? autoLevelParty(ctx) : {};
    track(ctx, 'quick', 1);
    ctx.events.push({ name: 'quick_collect', props: { method } });
    return { gold, xp, dust, minutes, items: loot.items, smelted: loot.smelted, levels };
  },

  /** Ускорение ×2 на 30 минут: бесплатно, несколько раз в день. */
  'boost.x2': (ctx: Ctx) => {
    const { s, cfg, now } = ctx;
    assert(boostsLeft(ctx) > 0, 'usedToday');
    s.day.ads++;
    settleChest(ctx);
    s.boosts.x2Until = Math.max(now, s.boosts.x2Until) + cfg.income.x2Minutes * 60000;
    return { x2Until: s.boosts.x2Until };
  },

  /** Бесплатный призыв раз в день. */
  'summon.free': (ctx: Ctx) => {
    const { s } = ctx;
    assert(!s.day.freeSummon, 'usedToday');
    s.day.freeSummon = true;
    return { pulls: doSummon(ctx, 1) };
  },

  summon: (ctx: Ctx, a: Action) => {
    const { cfg } = ctx;
    const count = vInt(a.count, 1, 10, 'count');
    assert(count === 1 || count === 10, 'badParam', { name: 'count' });
    const pay = vOneOf(a.pay, ['crystals', 'scrolls'] as const, 'pay');
    if (pay === 'scrolls') spend(ctx, { scrolls: count * cfg.summon.scrollCost });
    else spend(ctx, { crystals: count === 10 ? cfg.summon.cost10 : cfg.summon.cost1 });
    const pulls = doSummon(ctx, count);
    ctx.events.push({ name: 'summon', props: { count, pay } });
    return { pulls };
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
    let heroForShards: string | undefined;
    if (offer.give.shardsRarity) {
      heroForShards = vStr(a.hero, 'hero');
      const def = HEROINE_MAP[heroForShards];
      assert(def && !def.boss && def.rarity === offer.give.shardsRarity, 'badParam', { name: 'hero' });
    }
    spend(ctx, offer.cost);
    s.shop.bought[key] = bought + 1;
    const out: Record<string, unknown> = {};
    if (offer.give.cur) {
      give(ctx, offer.give.cur);
      out.cur = offer.give.cur;
    }
    if (heroForShards) {
      s.shards[heroForShards] = (s.shards[heroForShards] ?? 0) + (offer.give.shards ?? 10);
      out.shards = { [heroForShards]: offer.give.shards ?? 10 };
    }
    if (offer.give.skin) {
      s.skins.push(offer.give.skin);
      out.skin = offer.give.skin;
    }
    if (offer.give.item) {
      const rarity = offer.give.item === 'mythic' ? 5 : offer.give.item === 'legendary' ? 4 : 3;
      const it = rollLoot(ctx, { lvl: farmLevel(ctx.cfg, s), forceRarity: rarity as Item['rarity'] });
      const uid = addItem(ctx, it, { noAutoSmelt: true });
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
    if (p.autoBoss !== undefined) st.autoBoss = !!p.autoBoss && (s.ascension.up.autoBoss ?? 0) > 0;
    if (p.autoSmelt !== undefined) st.autoSmelt = vInt(p.autoSmelt, -1, 4, 'autoSmelt');
    if (p.speed !== undefined) st.speed = p.speed === 2 ? 2 : 1;
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

export interface SummonPull {
  hero: string;
  rarity: HeroRarity;
  isNew: boolean;
  shards: number;
}

/** Призыв с гарантом: SSR не позже 60-го, UR не позже 150-го. */
export function doSummon(ctx: Ctx, count: number): SummonPull[] {
  const { s, cfg, rng } = ctx;
  const rates = cfg.summon.rates;
  const out: SummonPull[] = [];
  for (let i = 0; i < count; i++) {
    s.summon.pitySSR++;
    s.summon.pityUR++;
    s.summon.total++;
    let rarity: HeroRarity;
    if (s.summon.pityUR >= cfg.summon.pityUR) rarity = 'UR';
    else {
      const r = rng.weighted([rates.R, rates.SR, rates.SSR, rates.UR]);
      rarity = (['R', 'SR', 'SSR', 'UR'] as HeroRarity[])[r];
      if (s.summon.pitySSR >= cfg.summon.pitySSR && (rarity === 'R' || rarity === 'SR')) {
        rarity = rng.chance(rates.UR / (rates.SSR + rates.UR)) ? 'UR' : 'SSR';
      }
    }
    if (rarity === 'UR') {
      s.summon.pityUR = 0;
      s.summon.pitySSR = 0;
    } else if (rarity === 'SSR') s.summon.pitySSR = 0;
    const hero = rng.pick(SUMMON_POOL[rarity]);
    const isNew = addHeroine(ctx, hero);
    let shards = 0;
    if (!isNew) {
      shards = cfg.hero.dupeShards[rarity];
      s.shards[hero] = (s.shards[hero] ?? 0) + shards;
    }
    out.push({ hero, rarity, isNew, shards });
    ctx.events.push({ name: 'summon_pull', props: { hero, rarity } });
  }
  track(ctx, 'summon', count);
  return out;
}

export { HOUR };
