import { ACTS, AFFIX_REWARD, COMBOS, HEROINES, STAGES_PER_DIFF, comboMastery, stageAffixes, stageRef, type StageRef } from '../../content';
import { activeArtifacts } from './artifacts';
import { mixSeed } from '../../rng';
import type { Difficulty } from '../../types';
import { simulateBattle, type BattleResult, type UnitInit } from '../battle';
import {
  addAccountXp,
  addHeroine,
  addItem,
  assert,
  give,
  goldPerMin,
  rollLoot,
  track,
  vInt,
  xpPerMin,
  type Ctx,
} from '../core';
import { bossUnits, heroUnits, powerLevel, waveUnits } from '../units';
import { activeParty } from '../stats';
import type { Action } from '../apply';

export function nextBattleSeed(ctx: Ctx): number {
  const { s } = ctx;
  if (s.dev.fixedSeed) return s.dev.fixedSeed;
  const seed = s.battleSeed;
  s.battleSeed = mixSeed(seed, 0x51ed);
  return seed;
}

/** Отряд в бою — весь Легион (героини, что уже присоединились). */
export function currentParty(ctx: Ctx): string[] {
  return activeParty(ctx.s);
}

export interface BattleSummary {
  seed: number;
  win: boolean;
  time: number;
  kills: number;
  timeout: boolean;
  events?: BattleResult['events'];
  heroHp?: Record<string, number>;
  dmgDone?: Record<number, number>;
  combos?: number;
}

/** Запуск боя с общими настройками (dev-читы, таймер). noArtifacts — бой без артефактов отряда (турнир). */
export function runBattle(ctx: Ctx, enemies: UnitInit[], heroes: UnitInit[], timeLimit: number, opt: { noArtifacts?: boolean } = {}): BattleSummary & { raw: BattleResult } {
  const { s, cfg } = ctx;
  assert(heroes.length > 0, 'emptyParty');
  const seed = nextBattleSeed(ctx);
  const res = simulateBattle(cfg, {
    seed,
    units: [...heroes, ...enemies],
    timeLimit,
    immortal: ctx.dev && !!s.dev.immortal,
    oneShot: ctx.dev && !!s.dev.oneShot,
    debug: ctx.dev && !!s.dev.log,
    quiet: ctx.server,
    manual: ctx.control?.manual,
    inputs: ctx.control?.inputs,
    artifacts: opt.noArtifacts ? [] : activeArtifacts(s),
    mastery: comboMasteryOf(s),
  });
  if (res.combos) {
    track(ctx, 'combo', res.combos);
    // сыгранность: счётчик каждой связки растит её мастерство
    for (const [id, n] of Object.entries(res.comboBy)) ctx.s.counters[`combo:${id}`] = (ctx.s.counters[`combo:${id}`] ?? 0) + n;
  }
  return {
    seed,
    win: res.win,
    time: res.time,
    kills: res.kills,
    timeout: res.timeout,
    events: res.events,
    heroHp: res.heroHp,
    dmgDone: res.dmgDone,
    combos: res.combos,
    raw: res,
  };
}

/** Уровни мастерства связок игрока (по счётчикам сыгранных связок). */
export function comboMasteryOf(s: Ctx['s']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COMBOS) {
    const lvl = comboMastery(s.counters[`combo:${c.id}`] ?? 0).lvl;
    if (lvl) out[c.id] = lvl;
  }
  return out;
}

export function stripRaw(b: BattleSummary & { raw?: BattleResult }): BattleSummary {
  const { raw, ...rest } = b as any;
  void raw;
  return rest;
}

/** Текущий этап, который штурмует отряд (следующий непройденный в выбранной сложности). */
export function targetStage(ctx: { s: Ctx['s'] }): StageRef | null {
  const { s } = ctx;
  const idx = s.progress.cleared[s.progress.diff] + 1;
  if (idx > STAGES_PER_DIFF) return null;
  return stageRef(s.progress.diff, idx);
}

export function difficultyUnlocked(s: Ctx['s'], diff: number): boolean {
  if (diff === 0) return true;
  if (s.dev.unlockAll) return true;
  return s.progress.cleared[diff - 1] >= STAGES_PER_DIFF || s.progress.maxGlobalEver >= diff * STAGES_PER_DIFF;
}

export const battleActions = {
  'stage.diff': (ctx: Ctx, a: Action) => {
    const diff = vInt(a.diff, 0, 2, 'diff') as Difficulty;
    assert(difficultyUnlocked(ctx.s, diff), 'locked', { feature: diff === 1 ? 'hard' : 'nightmare' });
    if (ctx.s.progress.diff !== diff) {
      ctx.s.progress.diff = diff;
      ctx.s.progress.wave = 0;
    }
    return { diff };
  },

  'battle.wave': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    const ref = targetStage(ctx);
    assert(ref, 'noTarget');
    assert(s.progress.wave < 3, 'wavesDone');
    const heroes = heroUnits(cfg, s, currentParty(ctx));
    const b = runBattle(ctx, waveUnits(cfg, ref, s.progress.wave), heroes, cfg.battle.waveTimeLimit);
    let rewards: { gold: number; xp: number } | null = null;
    track(ctx, 'kills', b.kills);
    if (b.win) {
      s.progress.wave++;
      const L = powerLevel(cfg, ref.n);
      const gold = Math.floor(goldPerMin(cfg, s, L) * cfg.rewards.waveGoldMin);
      const xp = Math.floor(xpPerMin(cfg, s, L) * cfg.rewards.waveXpMin);
      give(ctx, { gold, xp });
      rewards = { gold, xp };
    }
    ctx.events.push({ name: 'wave', props: { stage: ref.n, wave: s.progress.wave, win: b.win } });
    return { battle: stripRaw(b), stage: ref, wave: s.progress.wave, rewards };
  },

  'battle.boss': (ctx: Ctx) => {
    const { s, cfg, now } = ctx;
    const ref = targetStage(ctx);
    assert(ref, 'noTarget');
    assert(s.progress.wave >= 3 || ctx.dev, 'wavesFirst');
    const heroes = heroUnits(cfg, s, currentParty(ctx));
    const b = runBattle(ctx, bossUnits(cfg, ref), heroes, cfg.battle.bossTimeLimit);
    track(ctx, 'kills', b.kills);
    ctx.events.push({ name: b.win ? 'boss_win' : 'boss_lose', props: { stage: ref.n, diff: ref.diff, time: b.time } });
    if (!b.win) {
      s.progress.bossFails++;
      s.progress.retryAt = now + cfg.battle.retryMinutes * 60000;
      return { battle: stripRaw(b), stage: ref, win: false };
    }
    const rewards = stageClearRewards(ctx, ref);
    s.progress.cleared[ref.diff] = ref.idx;
    s.progress.maxGlobal = Math.max(s.progress.maxGlobal, ref.n);
    s.progress.maxGlobalEver = Math.max(s.progress.maxGlobalEver, ref.n);
    s.progress.wave = 0;
    s.progress.bossFails = 0;
    s.progress.retryAt = 0;
    track(ctx, 'bossWin', 1);
    // Кошмар 10-20 пройден — финал сюжета
    if (ref.kind === 'boss' && ref.act === 10 && !s.story.includes('act10')) s.story.push('act10');
    // после последнего этапа сложности автоматически переходим на следующую
    if (ref.idx === STAGES_PER_DIFF && ref.diff < 2) {
      s.progress.diff = (ref.diff + 1) as Difficulty;
      s.progress.wave = 0;
    }
    ctx.events.push({ name: 'stage_clear', props: { stage: ref.n } });
    // по ходу кампании к Легиону присоединяются новые героини
    const joined = joinHeroines(ctx);
    return { battle: stripRaw(b), stage: ref, win: true, rewards, joined };
  },

  /** Реванш: сбрасываем таймер автоповтора. */
  'battle.retryNow': (ctx: Ctx) => {
    ctx.s.progress.retryAt = 0;
    return {};
  },
};

/** Награды за первое прохождение этапа (босс этапа / мини-босс / владычица). */
function stageClearRewards(ctx: Ctx, ref: StageRef) {
  const { s, cfg } = ctx;
  const R = cfg.rewards;
  const L = powerLevel(cfg, ref.n);
  // свойства элиты: за каждое — прибавка к золоту и опыту
  const k = (ref.kind === 'boss' ? 3 : ref.kind === 'mini' ? 1.5 : 1) * (1 + AFFIX_REWARD * stageAffixes(ref).length);
  const gold = Math.floor(goldPerMin(cfg, s, L) * R.bossGoldMin * k);
  const xp = Math.floor(xpPerMin(cfg, s, L) * R.bossXpMin * k);
  const cur: Record<string, number> = { gold, xp };
  // кристаллы и осколки — только за первое прохождение (не повторяются после Вознесения)
  const first = ref.n > s.progress.maxGlobalEver;
  let crystals = 0;
  if (first && ref.kind === 'boss') crystals += R.actBossCrystals * (1 + ref.diff);
  else if (first && ref.stage % R.bossCrystalsEvery === 0) crystals += R.bossCrystals * (1 + ref.diff);
  if (crystals) cur.crystals = crystals;
  const starDust = Math.floor((ref.kind === 'boss' ? R.actBossStarDust : ref.kind === 'mini' ? R.bossStarDust * 2 : ref.stage % 2 === 0 ? R.bossStarDust : 0) * (1 + L / 50));
  if (starDust) cur.starDust = starDust;
  if (ref.kind !== 'normal') cur.forgeMats = ref.kind === 'boss' ? 10 : 3;
  give(ctx, cur);
  addAccountXp(ctx, R.bossAccXp * (1 + L / 10));
  s.lastBoss = { gold, xp, at: ctx.now };

  const act = ACTS[ref.act - 1];
  const items: string[] = [];
  const count = ref.kind === 'boss' ? R.actBossItems : ref.kind === 'mini' ? 2 : R.bossItems;
  for (let i = 0; i < count; i++) {
    const it = rollLoot(ctx, {
      lvl: L,
      diff: ref.diff,
      minRarity: ref.kind === 'boss' ? 3 : ref.kind === 'mini' ? 1 : 0,
      setPool: act.sets,
      setChance: ref.kind === 'boss' ? 0.6 : 0.1,
    });
    const uid = addItem(ctx, it);
    if (uid) items.push(uid);
  }
  // Эмблемы за первое прохождение: боссы актов — много, каждый 5-й этап — понемногу
  let emblems = 0;
  if (first && ref.kind === 'boss') emblems = R.actBossEmblems * (1 + ref.diff);
  else if (first && ref.stage % R.bossCrystalsEvery === 0) emblems = R.bossEmblems * (1 + ref.diff) * 2;
  if (emblems) {
    give(ctx, { emblems });
    cur.emblems = emblems;
  }
  return { cur, items };
}

/** Героини, которые присоединяются к Легиону после этого этапа (по прогрессу кампании). */
export function joinHeroines(ctx: Ctx): string[] {
  const out: string[] = [];
  for (const h of HEROINES) {
    if (ctx.s.heroines[h.id] || ctx.s.progress.maxGlobalEver < h.join) continue;
    if (addHeroine(ctx, h.id)) out.push(h.id);
  }
  return out;
}
