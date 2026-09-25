import {
  ACHIEVEMENTS,
  ASCENSION_UPGRADES,
  ASC_MAP,
  DAILY_CHESTS,
  DAILY_QUESTS,
  HEROINE_MAP,
  LOGIN_REWARDS,
  LORE,
  PASS_LEVELS,
  PASS_XP_PER_LEVEL,
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
  farmStage,
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
    const { s, cfg } = ctx;
    const level = vInt(a.level, 1, PASS_LEVELS, 'level');
    const premium = !!a.premium;
    assert(passLevel(s) >= level, 'notDone');
    if (premium) assert(s.shop.passUntil > ctx.now, 'noPass');
    const list = premium ? s.shop.passPremiumClaimed : s.shop.passClaimed;
    assert(!list.includes(level), 'claimed');
    list.push(level);
    const r = passReward(level, premium);
    const out: Record<string, unknown> = {};
    if (r.cur) {
      const cur = scaleReward(cfg, s, r.cur);
      give(ctx, cur);
      out.cur = cur;
    }
    if (r.skin && !s.skins.includes(r.skin)) {
      s.skins.push(r.skin);
      out.skin = r.skin;
    }
    if (r.item) {
      const it = rollLoot(ctx, { lvl: farmStage(s), forceRarity: r.item === 'legendary' ? 4 : 3 });
      out.item = addItem(ctx, it, { noAutoSmelt: true });
    }
    return out;
  },

  /** Удобство: одной кнопкой надеть лучшее на весь отряд. */
  'party.autoEquip': (ctx: Ctx) => {
    let n = 0;
    for (const id of ctx.s.party.presets[ctx.s.party.active]) if (id) n += autoEquipHero(ctx, id);
    return { changes: n };
  },
};
