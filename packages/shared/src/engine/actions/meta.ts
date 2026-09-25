import {
  ACHIEVEMENTS,
  ASCENSION_UPGRADES,
  ASC_MAP,
  DAILY_CHESTS,
  DAILY_QUESTS,
  HEROINE_MAP,
  LOGIN_REWARDS,
  LORE,
  PASS_BONUS_XP,
  PASS_LEVELS,
  PASS_SKIN_DUPE_CRYSTALS,
  PASS_XP_PER_LEVEL,
  passBonusReward,
  WEEKLY_CHESTS,
  WEEKLY_QUESTS,
  ascensionCost,
  passReward,
  type QuestDef,
} from '../../content';
import type { Action } from '../apply';
import {
  addItem,
  assert,
  give,
  grantReward,
  metric,
  requireUnlocked,
  rollLoot,
  scaleReward,
  spend,
  track,
  vInt,
  vOneOf,
  vStr,
  type Ctx,
  farmLevel,
} from '../core';
import { autoEquipHero } from './items';

export function constellationCost(ctx: Pick<Ctx, 'cfg'>, k: number): number {
  const C = ctx.cfg.constellation;
  return Math.floor(C.costBase * Math.pow(k + 1, 1.2));
}

export function etherForStage(ctx: Pick<Ctx, 'cfg' | 's'>, stageMax: number): number {
  const A = ctx.cfg.ascension;
  const base = Math.floor(A.etherBase * Math.pow(stageMax / A.etherDiv, A.etherExp));
  const bonus = 1 + (ctx.s.ascension.up.ether ?? 0) * (ASC_MAP.ether?.per ?? 0);
  return Math.floor(base * bonus);
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
    const it = rollLoot(ctx, { lvl: farmLevel(cfg, s), forceRarity: r.item === 'legendary' ? 4 : 3 });
    (out.items ??= []).push(addItem(ctx, it, { noAutoSmelt: true }));
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
    let hero: string | undefined;
    if (r.ssrChoice) {
      hero = vStr(a.hero, 'hero');
      const def = HEROINE_MAP[hero];
      assert(def && def.rarity === 'SSR' && !def.boss, 'badParam', { name: 'hero' });
    }
    login.claimedKey = s.day.key;
    const reward = scaleReward(cfg, s, r.reward);
    give(ctx, reward);
    if (hero) grantReward(ctx, { heroes: [hero] });
    return { day, reward, hero };
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

  'constellation.buy': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'constellation');
    const max = cfg.constellation.count * cfg.constellation.stars;
    const count = a.count === undefined ? 1 : vInt(a.count, 1, max, 'count');
    let bought = 0;
    for (let i = 0; i < count && s.constellation < max; i++) {
      const cost = constellationCost(ctx, s.constellation);
      if (s.cur.starDust < cost) break;
      s.cur.starDust -= cost;
      s.constellation++;
      bought++;
    }
    assert(bought > 0, s.constellation >= max ? 'maxRank' : 'notEnough', { cur: 'starDust' });
    return { constellation: s.constellation, bought };
  },

  /** Вознесение: сброс этапов и уровней героинь ради Эфира. */
  ascend: (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'ascension');
    assert(s.progress.maxGlobal >= cfg.ascension.unlockGlobal || ctx.dev, 'ascendTooEarly', { stage: cfg.ascension.unlockGlobal });
    const ether = etherForStage(ctx, s.progress.maxGlobal);
    give(ctx, { ether });
    s.ascension.ether += ether;
    s.ascension.count++;
    const start = Math.min(180, (s.ascension.up.start ?? 0) * (ASC_MAP.start?.per ?? 10));
    s.progress = {
      diff: 0,
      cleared: [start, 0, 0],
      wave: 0,
      bossFails: 0,
      retryAt: 0,
      maxGlobal: start,
      maxGlobalEver: s.progress.maxGlobalEver,
    };
    for (const h of Object.values(s.heroines)) {
      h.lvl = 1;
      h.tree = {};
      h.skills = [null, null];
    }
    s.cur.gold = 0;
    s.cur.xp = 0;
    s.chest = { since: ctx.now, minutes: 0, gold: 0, xp: 0, accXp: 0, itemMin: 0, dust: 0 };
    // новый фрагмент сюжета каждый цикл
    const lore = LORE.filter((l) => l.id.startsWith('asc'));
    const next = lore[Math.min(lore.length - 1, s.ascension.count - 1)];
    if (next && !s.story.includes(next.id)) s.story.push(next.id);
    s.ascension.story = s.ascension.count;
    track(ctx, 'ascend', 1);
    ctx.events.push({ name: 'ascend', props: { count: s.ascension.count, ether } });
    return { ether, count: s.ascension.count, start };
  },

  'ascension.buy': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const id = vStr(a.id, 'id');
    const def = ASCENSION_UPGRADES.find((u) => u.id === id);
    assert(def, 'badParam', { name: 'id' });
    const rank = s.ascension.up[id] ?? 0;
    assert(rank < def.max, 'maxRank');
    if (def.req) assert((s.ascension.up[def.req.id] ?? 0) >= def.req.rank, 'tierLocked');
    spend(ctx, { ether: ascensionCost(def, rank) });
    s.ascension.up[id] = rank + 1;
    if (id === 'autoBoss') s.settings.autoBoss = true;
    return { rank: rank + 1 };
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

  /** Удобство: одной кнопкой надеть лучшее на весь отряд. */
  'party.autoEquip': (ctx: Ctx) => {
    let n = 0;
    for (const id of ctx.s.party.presets[ctx.s.party.active]) if (id) n += autoEquipHero(ctx, id);
    return { changes: n };
  },
};
