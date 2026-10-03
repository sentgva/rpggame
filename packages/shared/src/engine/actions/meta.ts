import {
  ACHIEVEMENTS,
  BANNER_MAP,
  DAILY_CHESTS,
  DAILY_QUESTS,
  LOGIN_REWARDS,
  PASS_BONUS_XP,
  PASS_LEVELS,
  PASS_SKIN_DUPE_CRYSTALS,
  PASS_XP_PER_LEVEL,
  passBonusReward,
  WEEKLY_CHESTS,
  WEEKLY_QUESTS,
  passReward,
  type QuestDef,
} from '../../content';
import type { Config } from '../../config';
import type { PlayerState } from '../../types';
import type { Action } from '../apply';
import { addItem, assert, give, goldPerMin, metric, requireUnlocked, rollLoot, scaleReward, spend, track, vInt, vOneOf, vStr, type Ctx } from '../core';

/** Цена следующего уровня Знамени (null — максимум). Цена — в минутах дохода золота. */
export function bannerCost(cfg: Config, s: PlayerState, id: string): number | null {
  const def = BANNER_MAP[id];
  if (!def) return null;
  const lvl = s.banner[id] ?? 0;
  if (lvl >= def.max) return null;
  return Math.ceil(goldPerMin(cfg, s) * def.price * Math.pow(cfg.banner.costGrowth, lvl));
}

function questActivity(q: QuestDef) {
  return q.activity;
}

function activity(ctx: Ctx, kind: 'daily' | 'weekly'): number {
  const list = kind === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
  const claimed = kind === 'daily' ? ctx.s.quests.dailyClaimed : ctx.s.quests.weeklyClaimed;
  return list.filter((q) => claimed.includes(q.id)).reduce((s, q) => s + questActivity(q), 0);
}

export function passLevel(s: Ctx['s']): number {
  return Math.min(PASS_LEVELS, Math.floor(s.shop.passXp / PASS_XP_PER_LEVEL));
}

/** Сколько бонусных сундуков (после 50-го уровня) накоплено и сколько уже открыто. */
export function passBonus(s: Ctx['s']): { earned: number; claimed: number } {
  const over = s.shop.passXp - PASS_LEVELS * PASS_XP_PER_LEVEL;
  return { earned: over > 0 ? Math.floor(over / PASS_BONUS_XP) : 0, claimed: s.shop.passBonus ?? 0 };
}

type PassOut = { cur?: Record<string, number>; skins?: string[]; items?: unknown[] };

function mergeCur(out: PassOut, cur: Record<string, number>) {
  out.cur ??= {};
  for (const [k, v] of Object.entries(cur)) out.cur[k] = (out.cur[k] ?? 0) + v;
}

/** Выдать награду уровня пропуска (облик, уже имеющийся, превращается в кристаллы). */
function grantPassLevel(ctx: Ctx, level: number, out: PassOut) {
  const { s, cfg } = ctx;
  s.shop.passClaimed.push(level);
  const r = passReward(level, s.shop.passSeason);
  if (r.cur) {
    const cur = scaleReward(cfg, s, r.cur) as Record<string, number>;
    give(ctx, cur);
    mergeCur(out, cur);
  }
  if (r.skin) {
    if (!s.skins.includes(r.skin)) {
      s.skins.push(r.skin);
      (out.skins ??= []).push(r.skin);
    } else {
      give(ctx, { crystals: PASS_SKIN_DUPE_CRYSTALS });
      mergeCur(out, { crystals: PASS_SKIN_DUPE_CRYSTALS });
    }
  }
  if (r.item) {
    const it = rollLoot(ctx, { rarity: r.item === 'legendary' ? 4 : 3 });
    (out.items ??= []).push(addItem(ctx, it, { keep: true }));
  }
}

export const metaActions = {
  'quest.claim': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const id = vStr(a.id, 'id');
    const daily = DAILY_QUESTS.find((q) => q.id === id);
    const weekly = WEEKLY_QUESTS.find((q) => q.id === id);
    const q = daily ?? weekly;
    assert(q, 'badParam', { name: 'id' });
    const progress = daily ? s.quests.daily[q.counter] ?? 0 : s.quests.weekly[q.counter] ?? 0;
    const claimed = daily ? s.quests.dailyClaimed : s.quests.weeklyClaimed;
    assert(!claimed.includes(id), 'claimed');
    assert(progress >= q.target, 'notDone');
    claimed.push(id);
    const reward = scaleReward(cfg, s, q.reward);
    give(ctx, reward);
    s.shop.passXp += q.activity;
    if (daily) track(ctx, 'dailyDone', 1);
    return { reward };
  },

  /** «Забрать всё»: все выполненные задания дня и недели, затем открывшиеся сундуки активности. */
  'quest.claimAll': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    const total: Record<string, number> = {};
    const add = (r: Partial<Record<string, number>>) => {
      for (const [k, v] of Object.entries(r)) total[k] = (total[k] ?? 0) + (v ?? 0);
    };
    let n = 0;
    for (const [list, prog, claimed, daily] of [
      [DAILY_QUESTS, s.quests.daily, s.quests.dailyClaimed, true],
      [WEEKLY_QUESTS, s.quests.weekly, s.quests.weeklyClaimed, false],
    ] as const) {
      for (const q of list) {
        if (claimed.includes(q.id) || (prog[q.counter] ?? 0) < q.target) continue;
        claimed.push(q.id);
        const reward = scaleReward(cfg, s, q.reward);
        give(ctx, reward);
        add(reward);
        s.shop.passXp += q.activity;
        if (daily) track(ctx, 'dailyDone', 1);
        n++;
      }
    }
    // сундуки — после заданий: активность только что выросла
    for (const [kind, list, opened] of [
      ['daily', DAILY_CHESTS, s.quests.dailyChests],
      ['weekly', WEEKLY_CHESTS, s.quests.weeklyChests],
    ] as const) {
      list.forEach((c, i) => {
        if (opened.includes(i) || activity(ctx, kind) < c.at) return;
        opened.push(i);
        const reward = scaleReward(cfg, s, c.reward);
        give(ctx, reward);
        add(reward);
        n++;
      });
    }
    assert(n > 0, 'notDone');
    return { reward: total, n };
  },

  'quest.chest': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const kind = vOneOf(a.kind, ['daily', 'weekly'] as const, 'kind');
    const list = kind === 'daily' ? DAILY_CHESTS : WEEKLY_CHESTS;
    const i = vInt(a.index, 0, list.length - 1, 'index');
    const opened = kind === 'daily' ? s.quests.dailyChests : s.quests.weeklyChests;
    assert(!opened.includes(i), 'claimed');
    assert(activity(ctx, kind) >= list[i].at, 'notDone');
    opened.push(i);
    const reward = scaleReward(cfg, s, list[i].reward);
    give(ctx, reward);
    return { reward };
  },

  'login.claim': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const login = s.quests.login;
    assert(login.claimedKey !== s.day.key, 'claimed');
    const day = ((login.streak - 1) % 28) + 1;
    const r = LOGIN_REWARDS[day - 1];
    login.claimedKey = s.day.key;
    const reward = scaleReward(cfg, s, r.reward);
    give(ctx, reward);
    return { day, reward };
  },

  /** Забрать все доступные уровни достижения. */
  'ach.claim': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const ids = a.id === 'all' ? ACHIEVEMENTS.map((x) => x.id) : [vStr(a.id, 'id')];
    let crystals = 0;
    let tiers = 0;
    for (const id of ids) {
      const def = ACHIEVEMENTS.find((x) => x.id === id);
      assert(def, 'badParam', { name: 'id' });
      const v = metric(s, def.metric);
      let claimed = s.achievements[id] ?? 0;
      while (claimed < def.tiers.length && v >= def.tiers[claimed]) {
        claimed++;
        tiers++;
        crystals += def.crystals * (1 + Math.floor(claimed / 5));
      }
      s.achievements[id] = claimed;
      if (claimed >= def.tiers.length && def.title && !s.titles.includes(id)) s.titles.push(id);
    }
    assert(tiers > 0, 'notDone');
    give(ctx, { crystals });
    return { crystals, tiers };
  },

  /** Знамя Легиона: улучшение аккаунта за золото. */
  'banner.buy': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'banner');
    const id = vStr(a.id, 'id');
    assert(BANNER_MAP[id], 'badParam', { name: 'id' });
    const cost = bannerCost(cfg, s, id);
    assert(cost !== null, 'maxRank');
    spend(ctx, { gold: cost });
    s.banner[id] = (s.banner[id] ?? 0) + 1;
    track(ctx, 'banner', 1);
    return { lvl: s.banner[id] };
  },

  'pass.claim': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const level = vInt(a.level, 1, PASS_LEVELS, 'level');
    assert(passLevel(s) >= level, 'notDone');
    assert(!s.shop.passClaimed.includes(level), 'claimed');
    const out: PassOut = {};
    grantPassLevel(ctx, level, out);
    return out;
  },

  /** Забрать все доступные уровни и бонусные сундуки разом. */
  'pass.claimAll': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    const out: PassOut = {};
    const lvl = passLevel(s);
    let n = 0;
    for (let level = 1; level <= lvl; level++) {
      if (s.shop.passClaimed.includes(level)) continue;
      grantPassLevel(ctx, level, out);
      n++;
    }
    const b = passBonus(s);
    for (let i = b.claimed; i < b.earned; i++) {
      const cur = scaleReward(cfg, s, passBonusReward().cur!) as Record<string, number>;
      give(ctx, cur);
      mergeCur(out, cur);
      n++;
    }
    s.shop.passBonus = Math.max(b.claimed, b.earned);
    assert(n > 0, 'notDone');
    return out;
  },
};
