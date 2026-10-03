import { ACTS, COMBOS, HEROINES, STAGE_COUNT, comboMastery, stageRef, type StageRef } from '../../content';
import { mixSeed } from '../../rng';
import type { Action } from '../apply';
import { simulateCombat, type CombatResult, type CombatUnitInit } from '../combat';
import { addAccountXp, addHeroine, addItem, assert, give, goldPerMin, rollLoot, track, xpPerMin, type Ctx } from '../core';
import { activeParty } from '../stats';
import { guardianUnits, heroUnits, waveUnits } from '../units';

export function nextBattleSeed(ctx: Ctx): number {
  const { s } = ctx;
  if (s.dev.fixedSeed) return s.dev.fixedSeed;
  const seed = s.battleSeed;
  s.battleSeed = mixSeed(seed, 0x51ed);
  return seed;
}

/** Отряд в бою — весь Легион. */
export function currentParty(ctx: Ctx): string[] {
  return activeParty(ctx.s);
}

/** Уровни мастерства связок игрока. */
export function comboMasteryOf(s: Ctx['s']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COMBOS) {
    const lvl = comboMastery(s.counters[`combo:${c.id}`] ?? 0).lvl;
    if (lvl) out[c.id] = lvl;
  }
  return out;
}

export interface BattleSummary {
  seed: number;
  win: boolean;
  time: number;
  kills: number;
  timeout: boolean;
  dmg: number;
  events?: CombatResult['events'];
  heroHp?: Record<string, number>;
}

/** Бой с общими настройками (dev-читы, ручное управление, мастерство) и учётом счётчиков. */
export function runBattle(ctx: Ctx, enemies: CombatUnitInit[], heroes: CombatUnitInit[], timeLimit: number, opt: { endless?: boolean } = {}): BattleSummary & { raw: CombatResult } {
  const { s, cfg } = ctx;
  assert(heroes.length > 0, 'emptyParty');
  const seed = nextBattleSeed(ctx);
  const res = simulateCombat(cfg, {
    seed,
    units: [...heroes, ...enemies],
    timeLimit,
    immortal: ctx.dev && !!s.dev.immortal,
    oneShot: ctx.dev && !!s.dev.oneShot,
    quiet: ctx.server,
    manual: ctx.control?.manual,
    inputs: ctx.control?.inputs,
    mastery: comboMasteryOf(s),
    endless: opt.endless,
  });
  if (res.kills) track(ctx, 'kills', res.kills);
  if (res.ults) track(ctx, 'ult', res.ults);
  if (res.chains) track(ctx, 'chain', res.chains);
  if (res.parries) track(ctx, 'parry', res.parries);
  if (res.combos) {
    track(ctx, 'combo', res.combos);
    for (const [id, n] of Object.entries(res.comboBy)) s.counters[`combo:${id}`] = (s.counters[`combo:${id}`] ?? 0) + n;
  }
  return { seed, win: res.win, time: res.time, kills: res.kills, timeout: res.timeout, dmg: res.dmgDealt, events: res.events, heroHp: res.heroHp, raw: res };
}

export function stripRaw(b: BattleSummary & { raw?: CombatResult }): BattleSummary {
  const { raw, ...rest } = b as BattleSummary & { raw?: CombatResult };
  void raw;
  return rest;
}

/** Этап, который штурмует отряд (следующий непройденный), или null — поход пройден. */
export function targetStage(ctx: { s: Ctx['s'] }): StageRef | null {
  const n = ctx.s.progress.stage + 1;
  return n > STAGE_COUNT ? null : stageRef(n);
}

export const campaignActions = {
  /** Волна этапа: победа даёт немного дохода и иногда вещь. */
  'battle.wave': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    const ref = targetStage(ctx);
    assert(ref, 'noTarget');
    assert(s.progress.wave < 3, 'wavesDone');
    const b = runBattle(ctx, waveUnits(cfg, ref, s.progress.wave), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.waveTime);
    let rewards: { gold: number; xp: number; item?: string } | null = null;
    if (b.win) {
      s.progress.wave++;
      const gold = Math.floor(goldPerMin(cfg, s, ref.n) * cfg.rewards.waveMin);
      const xp = Math.floor(xpPerMin(cfg, s, ref.n) * cfg.rewards.waveMin);
      give(ctx, { gold, xp });
      rewards = { gold, xp };
      if (ctx.rng.chance(cfg.rewards.waveItemChance)) {
        const uid = addItem(ctx, rollLoot(ctx, { lvl: ref.n }));
        if (uid) rewards.item = uid;
      }
    }
    ctx.events.push({ name: 'wave', props: { stage: ref.n, wave: s.progress.wave, win: b.win } });
    return { battle: stripRaw(b), stage: ref, wave: s.progress.wave, rewards };
  },

  /** Страж этапа: победа открывает следующий этап. */
  'battle.boss': (ctx: Ctx) => {
    const { s, cfg, now } = ctx;
    const ref = targetStage(ctx);
    assert(ref, 'noTarget');
    assert(s.progress.wave >= 3 || ctx.dev, 'wavesFirst');
    const b = runBattle(ctx, guardianUnits(cfg, ref), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTime);
    ctx.events.push({ name: b.win ? 'boss_win' : 'boss_lose', props: { stage: ref.n, time: b.time } });
    if (!b.win) {
      s.progress.fails++;
      s.progress.retryAt = now + cfg.battle.retryMinutes * 60000;
      return { battle: stripRaw(b), stage: ref, win: false };
    }
    const rewards = stageClearRewards(ctx, ref);
    s.progress.stage = ref.n;
    s.progress.wave = 0;
    s.progress.fails = 0;
    s.progress.retryAt = 0;
    track(ctx, 'bossWin', 1);
    if (ref.kind === 'boss' && ref.circle === 0 && !s.story.includes(`act${ref.act}`)) s.story.push(`act${ref.act}`);
    ctx.events.push({ name: 'stage_clear', props: { stage: ref.n } });
    const joined = joinHeroines(ctx);
    return { battle: stripRaw(b), stage: ref, win: true, rewards, joined };
  },

  /** Реванш со стражем сразу, не дожидаясь паузы. */
  'battle.retryNow': (ctx: Ctx) => {
    ctx.s.progress.retryAt = 0;
    return {};
  },

  /** Вернуться на волны этапа (после поражения стража — фармить дальше). */
  'battle.reset': (ctx: Ctx, _a: Action) => {
    ctx.s.progress.wave = 0;
    return {};
  },
};

/** Награды за этап: доход, вещи, кристаллы, Эмблемы и Тома (у владычиц). */
function stageClearRewards(ctx: Ctx, ref: StageRef) {
  const { s, cfg } = ctx;
  const R = cfg.rewards;
  const kind = ref.kind;
  const min = kind === 'boss' ? R.bossMin : kind === 'mini' ? R.miniMin : R.stageMin;
  const gold = Math.floor(goldPerMin(cfg, s, ref.n) * min);
  const xp = Math.floor(xpPerMin(cfg, s, ref.n) * min);
  const cur: Record<string, number> = { gold, xp };
  cur.crystals = kind === 'boss' ? R.bossCrystals : kind === 'mini' ? R.miniCrystals : ref.stage % 2 === 0 ? R.stageCrystals : 0;
  cur.emblems = kind === 'boss' ? R.bossEmblems : kind === 'mini' ? R.miniEmblems : ref.stage % 4 === 0 ? R.stageEmblems : 0;
  if (kind === 'boss') cur.books = R.bossBooks;
  else if (kind === 'mini') cur.books = 2;
  for (const k of Object.keys(cur)) if (!cur[k]) delete cur[k];
  give(ctx, cur);
  addAccountXp(ctx, R.accXp * (1 + ref.n / 20) * (kind === 'boss' ? 3 : kind === 'mini' ? 2 : 1));
  const items: string[] = [];
  const count = kind === 'boss' ? R.bossItems : kind === 'mini' ? R.miniItems : R.stageItems;
  const act = ACTS[ref.act - 1];
  void act;
  for (let i = 0; i < count; i++) {
    const uid = addItem(ctx, rollLoot(ctx, { lvl: ref.n, minRarity: kind === 'boss' ? 3 : kind === 'mini' ? 2 : 0 }));
    if (uid) items.push(uid);
  }
  return { cur, items };
}

/** Герои, которые присоединяются к Легиону после этого этапа. */
export function joinHeroines(ctx: Ctx): string[] {
  const out: string[] = [];
  for (const h of HEROINES) {
    if (ctx.s.heroines[h.id] || ctx.s.progress.stage < h.join) continue;
    if (addHeroine(ctx, h.id)) out.push(h.id);
  }
  return out;
}
