import {
  ACTS,
  FESTIVALS,
  FEST_BOSS_ATTEMPTS,
  FEST_BOSS_HP,
  FEST_BOSS_HP_GROWTH,
  FEST_CHAPTER,
  FEST_GOALS,
  FEST_GOAL_MAP,
  FEST_MILESTONES,
  FEST_STAGES,
  FEST_STAR_POINTS,
  FEST_TASK_MAP,
  FEST_TASK_REWARD,
  FEST_TICKETS,
  RIFT_TACTICS,
  RIFT_TACTIC_MAP,
  festBossLevel,
  festBossReward,
  festDailyTasks,
  festFirstReward,
  festRaidReward,
  festShop,
  festStageLevel,
  festStageMod,
  festStars,
  festivalAt,
  type FestGoalMetric,
  type FestivalDef,
  type FestivalNow,
} from '../../content';
import { Rng, mixSeed } from '../../rng';
import type { FestivalState, Item, PlayerState } from '../../types';
import type { Action } from '../apply';
import type { UnitInit } from '../battle';
import { addItem, assert, farmLevel, give, requireUnlocked, rollLoot, scaleReward, spend, track, vInt, vOneOf, vStr, type Ctx } from '../core';
import type { Config } from '../../config';
import { dayKey } from '../state';
import { customEnemies, heroUnits, modEnemies } from '../units';
import { currentParty, runBattle, stripRaw } from './battle';
import { grantHeart } from './bond';

type Cur = Record<string, number>;

/** Общие счётчики, от которых считаются цели праздника. */
const GOAL_COUNTERS: FestGoalMetric[] = ['bossWin', 'hordeWave', 'summon', 'towerWin', 'dungeon'];

/** Праздник, идущий сейчас по расписанию из конфига (null — праздника нет). */
export function festivalNow(ctx: { cfg: Config; now: number }): FestivalNow | null {
  return festivalAt(ctx.now, ctx.cfg.festival);
}

function requireFestival(ctx: Ctx): FestivalNow {
  const cur = festivalNow(ctx);
  assert(cur, 'noFestival');
  return cur;
}

/**
 * Состояние праздника на сейчас: новый праздник — чистый лист, новый день — свежие билеты,
 * задания и попытки босса. Не меняет s (действия сами записывают результат в s.festival).
 * Праздника нет — пустое состояние (cycle −1), его никто не сохраняет.
 */
export function festivalState(ctx: { s: PlayerState; cfg: Config; now: number }, cur: FestivalNow | null = festivalNow(ctx)): FestivalState {
  const { s, cfg, now } = ctx;
  const cycle = cur?.cycle ?? -1;
  const today = dayKey(now);
  let f = s.festival;
  if (!f || f.cycle !== cycle || (cur && f.fest !== undefined && f.fest !== cur.def.id)) {
    f = {
      cycle,
      fest: cur?.def.id,
      lvl: Math.max(5, farmLevel(cfg, s)),
      points: 0,
      claimed: [],
      stars: Array(FEST_STAGES).fill(0),
      day: today,
      tickets: FEST_TICKETS,
      tasks: [],
      tasksDone: 0,
      goals: [],
      base: Object.fromEntries(GOAL_COUNTERS.map((k) => [k, s.counters[k] ?? 0])),
      boss: { lvl: 1, dmg: 0, used: 0, kills: 0, best: 0 },
    };
  }
  if (f.day !== today) f = { ...f, day: today, tickets: FEST_TICKETS, tasks: [], boss: { ...f.boss, used: 0 } };
  if (cur && f.fest === undefined) f = { ...f, fest: cur.def.id };
  return f;
}

/** Рабочая копия состояния для действия: всё вложенное — свои массивы и объекты. */
function festCopy(ctx: Ctx, cur: FestivalNow): FestivalState {
  const f = festivalState(ctx, cur);
  return { ...f, claimed: [...f.claimed], stars: [...f.stars], tasks: [...f.tasks], goals: [...f.goals], base: { ...f.base }, boss: { ...f.boss } };
}

function festIndex(def: FestivalDef): number {
  return FESTIVALS.indexOf(def);
}

/** Враги этапа пути: главы — из своих актов, стражи глав — мини-боссы, финал — героиня праздника. */
export function festStageEnemies(cfg: Config, def: FestivalDef, base: number, stage: number): UnitInit[] {
  const chapter = Math.ceil(stage / FEST_CHAPTER) - 1;
  const act = ACTS[def.acts[chapter] - 1];
  const rng = new Rng(mixSeed(stage, festIndex(def) * 131 + 7, 0xfe57));
  const list: { id: string; tier: 'normal' | 'elite' | 'mini' | 'boss' }[] = [];
  let adds = 4 + (chapter >= 2 ? 1 : 0);
  if (stage === FEST_STAGES) {
    list.push({ id: def.trialBoss, tier: 'boss' });
    adds = 2;
  } else if (stage % FEST_CHAPTER === 0) {
    list.push({ id: act.minis[chapter % 3], tier: 'mini' });
    adds = 3;
  } else if (stage % 3 === 0) {
    list.push({ id: rng.pick(act.enemies), tier: 'elite' });
    adds -= 1;
  }
  for (let i = 0; i < adds; i++) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  const mod = festStageMod(festIndex(def), stage);
  return modEnemies(customEnemies(cfg, festStageLevel(base, stage), list), mod?.enemy);
}

/** Босс праздника текущего уровня: полный запас HP и сколько осталось. */
export function festBoss(ctx: { s: PlayerState; cfg: Config; now: number }, def: FestivalDef, f = festivalState(ctx)) {
  const level = festBossLevel(f.lvl, f.boss.lvl);
  const k = FEST_BOSS_HP * (1 + FEST_BOSS_HP_GROWTH * (f.boss.lvl - 1));
  const units = customEnemies(ctx.cfg, level, [{ id: def.boss, tier: 'boss' }]).map((u) => ({ ...u, stats: { ...u.stats, hp: Math.round(u.stats.hp * k) } }));
  const hp = units[0].stats.hp;
  const left = Math.max(1, hp - f.boss.dmg);
  units[0].hpPct = left / hp;
  return { id: def.boss, level, units, hp, left };
}

/** Значение метрики цели праздника. */
export function festGoalValue(s: PlayerState, f: FestivalState, metric: FestGoalMetric): number {
  switch (metric) {
    case 'stars':
      return f.stars.reduce((a, b) => a + b, 0);
    case 'kills':
      return f.boss.kills;
    case 'tasks':
      return f.tasksDone;
    default:
      return Math.max(0, (s.counters[metric] ?? 0) - (f.base[metric] ?? 0));
  }
}

/** Прогресс задания дня (счётчики дня сбрасываются в полночь UTC). */
export function festTaskValue(s: PlayerState, id: string): number {
  const t = FEST_TASK_MAP[id];
  return t ? (s.quests.daily[t.counter] ?? 0) : 0;
}

/** Сколько наград праздника можно забрать прямо сейчас (для значка в лагере). */
export function festClaimable(ctx: { s: PlayerState; cfg: Config; now: number }): number {
  const { s, now } = ctx;
  const cur = festivalNow(ctx);
  if (!cur) return 0;
  const f = festivalState(ctx, cur);
  let n = 0;
  FEST_MILESTONES.forEach((m, i) => {
    if (f.points >= m.at && !f.claimed.includes(i)) n++;
  });
  for (const id of festDailyTasks(dayKey(now), f.cycle)) if (!f.tasks.includes(id) && festTaskValue(s, id) >= FEST_TASK_MAP[id].target) n++;
  for (const g of FEST_GOALS) if (!f.goals.includes(g.id) && festGoalValue(s, f, g.metric) >= g.target) n++;
  return n;
}

function addFestShards(ctx: Ctx, def: FestivalDef, n: number): Record<string, number> | undefined {
  if (n <= 0) return undefined;
  ctx.s.shards[def.hero] = (ctx.s.shards[def.hero] ?? 0) + n;
  return { [def.hero]: n };
}

function festItem(ctx: Ctx, kind: 'legendary' | 'mythic'): string | undefined {
  const it: Item = rollLoot(ctx, { lvl: farmLevel(ctx.cfg, ctx.s), forceRarity: kind === 'mythic' ? 5 : 4 });
  return addItem(ctx, it, { noAutoSmelt: true }) ?? undefined;
}

function addCur(out: Cur, cur: Partial<Record<string, number>>) {
  for (const [k, v] of Object.entries(cur)) if (v) out[k] = (out[k] ?? 0) + v;
}

export const festivalActions = {
  /** Бой на пути праздника: первое прохождение — бесплатно, повтор пройденного (рейд) — за билет при победе. */
  'fest.stage': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'events');
    const fn = requireFestival(ctx);
    const { def } = fn;
    const f = festCopy(ctx, fn);
    const stage = vInt(a.stage, 1, FEST_STAGES, 'stage');
    assert(stage === 1 || f.stars[stage - 2] > 0, 'locked', { feature: 'festStage' });
    const cleared = f.stars[stage - 1] > 0;
    if (cleared) assert(f.tickets > 0, 'noTickets');
    const mod = festStageMod(festIndex(def), stage);
    const party = currentParty(ctx);
    const b = runBattle(ctx, festStageEnemies(cfg, def, f.lvl, stage), heroUnits(cfg, s, party, { extra: mod?.hero }), cfg.battle.bossTimeLimit);
    let reward = null;
    let stars = 0;
    if (b.win) {
      const fallen = Object.values(b.heroHp ?? {}).filter((v) => v <= 0).length;
      stars = festStars(fallen);
      const prev = f.stars[stage - 1];
      const cur: Cur = {};
      let points = 0;
      let shards: Record<string, number> | undefined;
      if (!cleared) {
        const r = festFirstReward(stage);
        cur.eventTokens = r.tokens;
        points += r.points;
        shards = addFestShards(ctx, def, r.shards);
      } else {
        f.tickets--;
        const r = festRaidReward(stage);
        cur.eventTokens = r.tokens;
        points += r.points;
        track(ctx, 'festRaid', 1);
      }
      if (stars > prev) {
        points += (stars - prev) * FEST_STAR_POINTS;
        f.stars[stage - 1] = stars;
      }
      give(ctx, cur);
      f.points += points;
      track(ctx, 'festWin', 1);
      reward = { cur, points, shards, first: !cleared };
    }
    s.festival = f;
    ctx.events.push({ name: 'fest_stage', props: { fest: def.id, stage, win: b.win, stars } });
    return { battle: stripRaw(b), win: b.win, stage, stars, reward, festival: f };
  },

  /** Быстрый рейд этапа, пройденного на 3 звезды: билеты → жетоны и очки без боя. */
  'fest.sweep': (ctx: Ctx, a: Action) => {
    requireUnlocked(ctx, 'events');
    const f = festCopy(ctx, requireFestival(ctx));
    const stage = vInt(a.stage, 1, FEST_STAGES, 'stage');
    const times = vInt(a.times ?? 1, 1, FEST_TICKETS, 'times');
    assert(f.stars[stage - 1] >= 3, 'notDone');
    assert(f.tickets >= times, 'noTickets');
    const r = festRaidReward(stage);
    const cur: Cur = { eventTokens: r.tokens * times };
    give(ctx, cur);
    f.tickets -= times;
    f.points += r.points * times;
    track(ctx, 'festRaid', times);
    ctx.s.festival = f;
    return { cur, points: r.points * times, times, festival: f };
  },

  /** Бой с боссом праздника: урон копится между боями, снял всё HP — босс крепнет, а вы получаете сундук. */
  'fest.boss': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'events');
    const fn = requireFestival(ctx);
    const { def } = fn;
    const f = festCopy(ctx, fn);
    assert(f.boss.used < FEST_BOSS_ATTEMPTS, 'noAttempts');
    const tactic = a.tactic === undefined ? 'none' : vOneOf(a.tactic, RIFT_TACTICS.map((x) => x.id), 'tactic');
    const boss = festBoss(ctx, def, f);
    const b = runBattle(ctx, boss.units, heroUnits(cfg, s, currentParty(ctx), { extra: RIFT_TACTIC_MAP[tactic].stats }), cfg.modes.riftTimeLimit);
    // урон всего отряда за бой (как в Разломе): вампиризм босса не «откатывает» запас его сил
    const ours = new Set(b.raw.units.filter((u) => u.side === 0).map((u) => u.uid));
    const total = Math.round(Object.entries(b.dmgDone ?? {}).reduce((sum, [uid, v]) => (ours.has(Number(uid)) ? sum + v : sum), 0));
    const dmg = b.win ? boss.left : Math.min(boss.left, total);
    const killed = b.win || f.boss.dmg + dmg >= boss.hp;
    const r = festBossReward(dmg / boss.hp, killed);
    const cur: Cur = { eventTokens: r.tokens };
    if (r.crystals) cur.crystals = r.crystals;
    give(ctx, cur);
    const shards = addFestShards(ctx, def, r.shards);
    let hearts = 0;
    let items: string[] | undefined;
    const lvl = f.boss.lvl;
    if (killed) {
      f.boss = { ...f.boss, lvl: lvl + 1, dmg: 0, kills: f.boss.kills + 1 };
      // каждый третий уровень — Сердце Эфира, каждый второй — легендарный предмет
      if (lvl % 3 === 0) hearts = grantHeart(ctx);
      if (lvl % 2 === 0) {
        const uid = festItem(ctx, 'legendary');
        if (uid) items = [uid];
      }
    } else f.boss = { ...f.boss, dmg: f.boss.dmg + dmg };
    f.boss.used++;
    f.boss.best = Math.max(f.boss.best, dmg);
    f.points += r.points;
    s.festival = f;
    track(ctx, 'festBoss', 1);
    ctx.events.push({ name: 'fest_boss', props: { fest: def.id, lvl, dmg, killed, tactic } });
    return {
      battle: stripRaw(b),
      win: b.win,
      dmg,
      hp: boss.hp,
      killed,
      lvl,
      reward: { cur, points: r.points, shards, hearts: hearts || undefined, items },
      festival: f,
    };
  },

  /** Награда за задание дня. */
  'fest.task': (ctx: Ctx, a: Action) => {
    const { s, now } = ctx;
    requireUnlocked(ctx, 'events');
    const f = festCopy(ctx, requireFestival(ctx));
    const id = vStr(a.id, 'id');
    assert(festDailyTasks(dayKey(now), f.cycle).includes(id), 'badParam', { name: 'id' });
    assert(!f.tasks.includes(id), 'claimed');
    assert(festTaskValue(s, id) >= FEST_TASK_MAP[id].target, 'notDone');
    const cur: Cur = { eventTokens: FEST_TASK_REWARD.tokens };
    give(ctx, cur);
    f.tasks.push(id);
    f.tasksDone++;
    f.points += FEST_TASK_REWARD.points;
    s.festival = f;
    return { cur, points: FEST_TASK_REWARD.points, festival: f };
  },

  /** Награда за цель праздника. */
  'fest.goal': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'events');
    const f = festCopy(ctx, requireFestival(ctx));
    const g = FEST_GOAL_MAP[vStr(a.id, 'id')];
    assert(g, 'badParam', { name: 'id' });
    assert(!f.goals.includes(g.id), 'claimed');
    assert(festGoalValue(s, f, g.metric) >= g.target, 'notDone');
    const cur = scaleReward(cfg, s, g.cur) as Cur;
    give(ctx, cur);
    f.goals.push(g.id);
    f.points += g.points;
    s.festival = f;
    return { cur, points: g.points, festival: f };
  },

  /** Забрать ступени шкалы наград (одну по индексу или все доступные). */
  'fest.claim': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'events');
    const fn = requireFestival(ctx);
    const { def } = fn;
    const f = festCopy(ctx, fn);
    const list = a.index === 'all' ? FEST_MILESTONES.map((_, i) => i) : [vInt(a.index, 0, FEST_MILESTONES.length - 1, 'index')];
    const ready = list.filter((i) => f.points >= FEST_MILESTONES[i].at && !f.claimed.includes(i));
    assert(ready.length > 0, 'notDone');
    const cur: Cur = {};
    let shards = 0;
    let hearts = 0;
    const items: string[] = [];
    const skins: string[] = [];
    for (const i of ready) {
      const m = FEST_MILESTONES[i];
      if (m.item) {
        const uid = festItem(ctx, m.item);
        // инвентарь полон — предмет не пропадает: ступень остаётся незабранной
        if (!uid) continue;
        items.push(uid);
      }
      if (m.cur) addCur(cur, scaleReward(cfg, s, m.cur));
      if (m.shards) shards += m.shards;
      if (m.heart) hearts += grantHeart(ctx);
      if (m.skin) {
        // облик уже есть (с прошлого круга) — вместо него кристаллы
        if (s.skins.includes(def.finalSkin)) addCur(cur, { crystals: 500 });
        else {
          s.skins.push(def.finalSkin);
          skins.push(def.finalSkin);
        }
      }
      f.claimed.push(i);
    }
    give(ctx, cur);
    const sh = addFestShards(ctx, def, shards);
    s.festival = f;
    return { cur, shards: sh, hearts: hearts || undefined, items: items.length ? items : undefined, skins: skins.length ? skins : undefined, festival: f };
  },

  /** Лавка праздника: жетоны ивента → осколки героини праздника, облики и ресурсы. Лимиты — на праздник. */
  'fest.buy': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    requireUnlocked(ctx, 'events');
    const { def, cycle } = requireFestival(ctx);
    const offer = festShop(def).find((o) => o.id === vStr(a.offer, 'offer'));
    assert(offer, 'badParam', { name: 'offer' });
    // облики — навсегда, остальное — на праздник
    const key = offer.give.skin ? `fest_${offer.give.skin}` : `${offer.id}@f${cycle}`;
    const bought = s.shop.bought[key] ?? 0;
    assert(bought < offer.limit, 'limitReached');
    if (offer.give.skin) assert(!s.skins.includes(offer.give.skin), 'owned');
    assert((s.cur.eventTokens ?? 0) >= offer.cost, 'notEnough', { cur: 'eventTokens' });
    let uid: string | undefined;
    if (offer.give.item) {
      uid = festItem(ctx, offer.give.item);
      assert(uid, 'inventoryFull');
    }
    spend(ctx, { eventTokens: offer.cost });
    s.shop.bought[key] = bought + 1;
    // старые лимиты прошлых праздников больше не нужны
    for (const k of Object.keys(s.shop.bought)) {
      const p = k.split('@f');
      if (p[1] !== undefined && p[1] !== String(cycle)) delete s.shop.bought[k];
    }
    if (offer.give.cur) give(ctx, offer.give.cur);
    const shards = offer.give.shards ? addFestShards(ctx, def, offer.give.shards) : undefined;
    if (offer.give.skin) s.skins.push(offer.give.skin);
    const hearts = offer.give.heart ? grantHeart(ctx) : 0;
    return { cur: offer.give.cur, shards, skin: offer.give.skin, item: uid, hearts: hearts || undefined };
  },
};

/** Сколько раз уже куплено предложение лавки праздника (для интерфейса). */
export function festBought(s: PlayerState, offerId: string, skin: string | undefined, cycle: number): number {
  return s.shop.bought[skin ? `fest_${skin}` : `${offerId}@f${cycle}`] ?? 0;
}

/** Для интерфейса: предложения лавки идущего праздника (null — праздника нет). */
export function festShopNow(ctx: { cfg: Config; now: number }) {
  const cur = festivalNow(ctx);
  return cur ? { def: cur.def, cycle: cur.cycle, offers: festShop(cur.def) } : null;
}
