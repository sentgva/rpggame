import {
  ACTS,
  COLOSSI,
  HERALDS,
  HERALD_BY_ELEMENT,
  HEROINE_MAP,
  RIFT_COLOSSUS,
  RIFT_TIERS,
  hordeStage,
  riftElement,
  riftTier,
  spireOpen,
  spireStage,
} from '../../content';
import { Rng, hashStr, mixSeed } from '../../rng';
import type { Element, HordeState, RiftState } from '../../types';
import { ELEMENTS } from '../../types';
import type { Action } from '../apply';
import type { UnitInit } from '../battle';
import { assert, farmLevel, give, goldPerMin, requireUnlocked, scaleReward, track, trackMax, vOneOf, type Ctx } from '../core';
import { dayKey, weekKey } from '../state';
import { activeParty, buildHeroine } from '../stats';
import { customEnemies, heroUnits } from '../units';
import { currentParty, runBattle, stripRaw } from './battle';
import { onExpedition } from './heroes';

type Cur = Record<string, number>;

function addShards(ctx: Ctx, hero: string, n: number, out: Record<string, number>) {
  ctx.s.shards[hero] = (ctx.s.shards[hero] ?? 0) + n;
  out[hero] = (out[hero] ?? 0) + n;
}

// ——— Разлом Колосса ———

export function riftState(ctx: Pick<Ctx, 's' | 'now'>): RiftState {
  const today = dayKey(ctx.now);
  const week = weekKey(ctx.now);
  let r = ctx.s.modes.rift;
  if (!r) r = { day: today, used: 0, bestTierToday: 0, bestDmgToday: 0, week, bestDmgWeek: 0, bestDmgEver: 0 };
  if (r.day !== today) r = { ...r, day: today, used: 0, bestTierToday: 0, bestDmgToday: 0 };
  if (r.week !== week) r = { ...r, week, bestDmgWeek: 0 };
  return r;
}

/** Колосс дня: гигант с огромным запасом HP — важен не исход, а нанесённый урон. */
export function riftBoss(ctx: Pick<Ctx, 'cfg' | 's' | 'now'>): { id: string; element: Element; level: number; units: UnitInit[]; hp: number } {
  const { cfg, s, now } = ctx;
  const element = riftElement(now);
  const id = RIFT_COLOSSUS[element];
  const level = farmLevel(cfg, s);
  const units = customEnemies(cfg, level, [{ id, tier: 'boss' }]).map((u) => ({ ...u, stats: { ...u.stats, hp: Math.round(u.stats.hp * cfg.modes.riftHpMult) } }));
  return { id, element, level, units, hp: units[0].stats.hp };
}

/** Награда яруса: осколки Вестницы стихии дня, кристаллы, золото и звёздная пыль. */
export function riftReward(ctx: Pick<Ctx, 'cfg' | 's'>, tier: number, level: number, element: Element) {
  const { cfg, s } = ctx;
  if (tier <= 0) return { cur: { gold: Math.floor(goldPerMin(cfg, s, level) * 3) } as Cur, shards: 0, hero: HERALD_BY_ELEMENT[element] };
  return {
    cur: {
      gold: Math.floor(goldPerMin(cfg, s, level) * 6 * tier),
      crystals: 5 * tier,
      starDust: 3 * tier,
    } as Cur,
    shards: tier,
    hero: HERALD_BY_ELEMENT[element],
  };
}

function grantRift(ctx: Ctx, tier: number, level: number, element: Element) {
  const r = riftReward(ctx, tier, level, element);
  give(ctx, r.cur);
  const shards: Record<string, number> = {};
  if (r.shards && r.hero) addShards(ctx, r.hero, r.shards, shards);
  return { cur: r.cur, shards };
}

// ——— Стихийные шпили ———

/** Отряд шпиля: пять сильнейших героинь стихии (кроме ушедших в экспедицию), танки — вперёд. */
export function spireParty(ctx: Pick<Ctx, 'cfg' | 's' | 'now'>, el: Element): (string | null)[] {
  const { cfg, s } = ctx;
  const ids = Object.keys(s.heroines).filter((id) => HEROINE_MAP[id]?.element === el && !onExpedition(ctx as Ctx, id));
  const power = (id: string) => buildHeroine(cfg, s, s.heroines[id]).power;
  const top = ids.sort((a, b) => power(b) - power(a)).slice(0, 5);
  const front = (id: string) => (['guardian', 'berserker'].includes(HEROINE_MAP[id].cls) ? 0 : 1);
  top.sort((a, b) => front(a) - front(b));
  const slots: (string | null)[] = [null, null, null, null, null];
  top.forEach((id, i) => (slots[i] = id));
  return slots;
}

function spireEnemies(ctx: Ctx, el: Element, floor: number): UnitInit[] {
  const acts = ACTS.filter((a) => a.element === el);
  const act = acts[floor % acts.length];
  const rng = new Rng(mixSeed(floor, el.length * 7919 + el.charCodeAt(0)));
  const list: { id: string; tier: 'normal' | 'elite' | 'mini' | 'boss' }[] = [];
  if (floor % 30 === 0) list.push({ id: RIFT_COLOSSUS[el], tier: 'mini' });
  else if (floor % 10 === 0) list.push({ id: act.minis[(floor / 10) % 3], tier: 'mini' });
  else list.push({ id: rng.pick(act.enemies), tier: 'elite' });
  const count = 3 + (floor > 60 ? 1 : 0);
  for (let i = 0; i < count; i++) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  return customEnemies(ctx.cfg, spireStage(floor), list);
}

export function spireReward(floor: number, el: Element) {
  const milestone = floor % 10 === 0;
  return {
    cur: { crystals: 3 + Math.floor(floor / 25) + (milestone ? 30 : 0), starDust: 4 + Math.floor(floor / 5) } as Cur,
    shards: milestone ? 10 : 0,
    hero: HERALD_BY_ELEMENT[el],
  };
}

// ——— Нашествие ———

export function hordeState(ctx: Pick<Ctx, 's' | 'now'>): HordeState {
  const today = dayKey(ctx.now);
  const week = weekKey(ctx.now);
  let h = ctx.s.modes.horde;
  if (!h) h = { day: '', wave: 0, hp: {}, active: false, best: 0, week, bestWeek: 0 };
  if (h.week !== week) h = { ...h, week, bestWeek: 0 };
  // забег прошлого дня закрывается сам
  if (h.day !== today && h.active) h = { ...h, active: false };
  return h;
}

function hordeEnemies(ctx: Ctx, wave: number): UnitInit[] {
  const { cfg, s } = ctx;
  const rng = new Rng(mixSeed(wave, 0x401d, hashStr(ctx.s.modes.horde?.day ?? '')));
  const act = ACTS[(wave - 1) % ACTS.length];
  const list: { id: string; tier: 'normal' | 'elite' | 'mini' | 'boss' }[] = [];
  if (wave % 25 === 0) list.push({ id: COLOSSI[(wave / 25 - 1) % COLOSSI.length].id, tier: 'mini' });
  else if (wave % 10 === 0) list.push({ id: act.minis[(wave / 10) % 3], tier: 'mini' });
  else if (wave % 5 === 0) list.push({ id: rng.pick(act.enemies), tier: 'elite' });
  const count = Math.min(5, 3 + Math.floor(wave / 6));
  while (list.length < count) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  return customEnemies(cfg, hordeStage(farmLevel(cfg, s), wave), list);
}

export function hordeWaveReward(ctx: Pick<Ctx, 'cfg' | 's'>, wave: number) {
  const { cfg, s } = ctx;
  const cur: Cur = { gold: Math.floor(goldPerMin(cfg, s) * 2), dust: 8 + wave };
  if (wave % 5 === 0) cur.crystals = 10 + wave;
  return { cur, heraldShards: wave % 10 === 0 ? 5 : 0 };
}

export const endgameActions = {
  'rift.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'rift');
    const r = riftState(ctx);
    assert(r.used < cfg.modes.riftAttempts, 'noAttempts');
    const boss = riftBoss(ctx);
    const b = runBattle(ctx, boss.units, heroUnits(cfg, s, currentParty(ctx)), cfg.modes.riftTimeLimit);
    // урон отряда по всем врагам (Колосс + призванные им)
    const ours = new Set(b.raw.units.filter((u) => u.side === 0).map((u) => u.uid));
    const dmg = Math.round(Object.entries(b.dmgDone ?? {}).reduce((sum, [uid, v]) => (ours.has(Number(uid)) ? sum + v : sum), 0));
    const tier = riftTier(dmg, boss.hp, b.win);
    const reward = grantRift(ctx, tier, boss.level, boss.element);
    r.used++;
    r.bestTierToday = Math.max(r.bestTierToday, tier);
    r.bestDmgToday = Math.max(r.bestDmgToday, dmg);
    r.bestDmgWeek = Math.max(r.bestDmgWeek, dmg);
    r.bestDmgEver = Math.max(r.bestDmgEver, dmg);
    s.modes.rift = r;
    track(ctx, 'riftFight', 1);
    ctx.events.push({ name: 'rift', props: { boss: boss.id, dmg, tier } });
    return { battle: stripRaw(b), win: b.win, dmg, hp: boss.hp, tier, reward, boss: boss.id };
  },

  /** Быстрая зачистка: оставшиеся попытки дня с лучшим ярусом, уже достигнутым сегодня. */
  'rift.sweep': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'rift');
    const r = riftState(ctx);
    assert(r.used > 0 && r.bestTierToday > 0, 'notDone');
    const left = cfg.modes.riftAttempts - r.used;
    assert(left > 0, 'noAttempts');
    const boss = riftBoss(ctx);
    const cur: Cur = {};
    const shards: Record<string, number> = {};
    for (let i = 0; i < left; i++) {
      const g = grantRift(ctx, r.bestTierToday, boss.level, boss.element);
      for (const [k, v] of Object.entries(g.cur)) cur[k] = (cur[k] ?? 0) + v;
      for (const [k, v] of Object.entries(g.shards)) shards[k] = (shards[k] ?? 0) + v;
      track(ctx, 'riftFight', 1);
    }
    r.used = cfg.modes.riftAttempts;
    s.modes.rift = r;
    return { cur, shards, times: left };
  },

  'spire.fight': (ctx: Ctx, a: Action) => {
    const { s, cfg, now } = ctx;
    requireUnlocked(ctx, 'spires');
    const el = vOneOf(a.element, ELEMENTS, 'element');
    assert(spireOpen(el, now), 'closedToday');
    const spires = { ...(s.modes.spires ?? {}) };
    const floor = (spires[el] ?? 0) + 1;
    assert(floor <= cfg.modes.spireFloors, 'maxRank');
    const slots = spireParty(ctx, el);
    assert(slots.some(Boolean), 'emptyParty');
    const b = runBattle(ctx, spireEnemies(ctx, el, floor), heroUnits(cfg, s, slots), cfg.battle.bossTimeLimit);
    let reward = null;
    if (b.win) {
      spires[el] = floor;
      s.modes.spires = spires;
      const r = spireReward(floor, el);
      const cur = scaleReward(cfg, s, r.cur) as Cur;
      give(ctx, cur);
      const shards: Record<string, number> = {};
      if (r.shards && r.hero) addShards(ctx, r.hero, r.shards, shards);
      reward = { cur, shards };
      track(ctx, 'spireWin', 1);
      trackMax(ctx, 'spireBest', floor);
    }
    return { battle: stripRaw(b), win: b.win, floor, element: el, reward };
  },

  'horde.start': (ctx: Ctx) => {
    const { s, now } = ctx;
    requireUnlocked(ctx, 'horde');
    const h = hordeState(ctx);
    const today = dayKey(now);
    assert(h.day !== today, 'usedToday');
    const party = activeParty(s);
    assert(party.length > 0, 'emptyParty');
    s.modes.horde = { ...h, day: today, wave: 0, hp: Object.fromEntries(party.map((id) => [id, 1])), active: true };
    return { horde: s.modes.horde };
  },

  'horde.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'horde');
    const h = hordeState(ctx);
    assert(h.active, 'noRun');
    const wave = h.wave + 1;
    const slots = currentParty(ctx).map((id) => (id && h.hp[id] !== undefined ? id : null));
    const b = runBattle(ctx, hordeEnemies(ctx, wave), heroUnits(cfg, s, slots, { hp: h.hp }), cfg.battle.bossTimeLimit);
    const hp = { ...h.hp };
    for (const [id, v] of Object.entries(b.heroHp ?? {})) hp[id] = v;
    let reward = null;
    const next: HordeState = { ...h, hp };
    if (b.win) {
      next.wave = wave;
      next.best = Math.max(h.best, wave);
      next.bestWeek = Math.max(h.bestWeek, wave);
      const r = hordeWaveReward(ctx, wave);
      const cur = scaleReward(cfg, s, r.cur) as Cur;
      give(ctx, cur);
      const shards: Record<string, number> = {};
      if (r.heraldShards) addShards(ctx, HERALDS[ctx.rng.int(HERALDS.length)].id, r.heraldShards, shards);
      // передышка: каждые N волн выжившие восстанавливают треть здоровья
      if (wave % cfg.modes.hordeHealEvery === 0) for (const id of Object.keys(hp)) if (hp[id] > 0) hp[id] = Math.min(1, hp[id] + 0.33);
      reward = { cur, shards };
      trackMax(ctx, 'hordeBest', wave);
      track(ctx, 'hordeWave', 1);
    } else next.active = false;
    if (!Object.values(hp).some((v) => v > 0)) next.active = false;
    s.modes.horde = next;
    return { battle: stripRaw(b), win: b.win, wave, reward, horde: next };
  },

  'horde.retreat': (ctx: Ctx) => {
    const h = hordeState(ctx);
    assert(h.active, 'noRun');
    ctx.s.modes.horde = { ...h, active: false };
    return { horde: ctx.s.modes.horde };
  },
};

/** Для подсказок интерфейса: пороги урона текущего Колосса. */
export function riftThresholds(hp: number): number[] {
  return RIFT_TIERS.map((t) => Math.ceil(hp * t));
}
