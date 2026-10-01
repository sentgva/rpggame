import { SORTIE_BOSS_AT, SORTIE_DAILY, SORTIE_TIER_MAP, SORTIE_TIERS, type SortieTierId } from '../../content';
import type { Config } from '../../config';
import type { Currency, PlayerState, SortieState } from '../../types';
import type { Action } from '../apply';
import { assert, give, requireUnlocked, scaleReward, track, vBool, vInt, vOneOf, vStr, type Ctx } from '../core';
import { dayKey } from '../state';

/** Вылазка сегодня: новый день — снова три награждаемых забега. */
export function sortieState(ctx: { s: PlayerState; now: number }): SortieState {
  const today = dayKey(ctx.now);
  const v = ctx.s.sortie ?? { day: today, runs: 0, best: {} };
  return v.day === today ? v : { ...v, day: today, runs: 0 };
}

/** Открыта ли сложность (следующая — после победы над боссом на предыдущей). */
export function sortieTierOpen(s: PlayerState, tier: SortieTierId): boolean {
  const t = SORTIE_TIER_MAP[tier];
  return !t.after || !!s.sortie?.best[t.after]?.boss;
}

/** Награда за забег: минуты дохода, Эмблемы, кристаллы и звёздная пыль — по доле пройденного и боссу. */
export function sortieReward(cfg: Config, s: PlayerState, tier: SortieTierId, res: { time: number; kills: number; boss: boolean }): Partial<Record<Currency, number>> {
  const k = SORTIE_TIER_MAP[tier].reward;
  const p = Math.max(0, Math.min(1, res.time / SORTIE_BOSS_AT));
  const minutes = Math.round((10 + 40 * p + (res.boss ? 30 : 0)) * k);
  return {
    ...scaleReward(cfg, s, { gold: minutes, xp: minutes }),
    emblems: Math.round((1 + 7 * p + (res.boss ? 6 : 0)) * k),
    crystals: Math.round((res.boss ? 40 : 15 * p) * k),
    starDust: Math.round((5 + 20 * p) * k),
  };
}

export const sortieActions = {
  /** Начать вылазку: героем из Легиона; первые три в день — с наградой. */
  'sortie.start': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    requireUnlocked(ctx, 'sortie');
    const tier = vOneOf(a.tier, SORTIE_TIERS.map((t) => t.id), 'tier');
    assert(sortieTierOpen(s, tier), 'locked', { feature: 'sortie' });
    const hero = vStr(a.hero, 'hero');
    assert(s.heroines[hero], 'notOwned');
    const st = sortieState(ctx);
    const rewarded = st.runs < SORTIE_DAILY;
    const id = (s.uidCounter = (s.uidCounter ?? 1) + 1);
    s.sortie = { ...st, runs: st.runs + (rewarded ? 1 : 0), active: { id, tier, hero, at: ctx.now, rewarded } };
    track(ctx, 'sortie', 1);
    return { id, tier, hero, rewarded, left: SORTIE_DAILY - s.sortie.runs };
  },
  /** Итог вылазки: сервер проверяет, что результат правдоподобен (время по часам, темп убийств). */
  'sortie.finish': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const st = sortieState(ctx);
    const run = s.sortie?.active;
    assert(run && run.id === vInt(a.id, 0, 1e12, 'id'), 'requirements');
    const time = vInt(a.time, 0, SORTIE_BOSS_AT + 240, 'time');
    const kills = vInt(a.kills, 0, 100000, 'kills');
    const boss = vBool(a.boss, 'boss');
    // игровое время не может обогнать реальное (пауза только замедляет), темп убийств ограничен
    const real = (ctx.now - run.at) / 1000;
    assert(time <= real * 1.05 + 3, 'badParam', { name: 'time' });
    assert(kills <= 20 + time * 7, 'badParam', { name: 'kills' });
    assert(!boss || time >= SORTIE_BOSS_AT, 'badParam', { name: 'boss' });
    const tier = run.tier as SortieTierId;
    const prev = st.best[tier];
    const best = { ...st.best };
    if (!prev || boss > prev.boss || time > prev.time || (time === prev.time && kills > prev.kills))
      best[tier] = { time: Math.max(time, prev?.time ?? 0), kills: Math.max(kills, prev?.kills ?? 0), boss: boss || !!prev?.boss };
    let reward: Partial<Record<Currency, number>> = {};
    if (run.rewarded) {
      reward = sortieReward(ctx.cfg, s, tier, { time, kills, boss });
      give(ctx, reward);
    }
    s.sortie = { day: st.day, runs: st.runs, best };
    track(ctx, 'sortieKills', kills);
    if (boss) track(ctx, 'sortieBoss', 1);
    ctx.events.push({ name: 'sortie_end', props: { tier, time, kills, boss: boss ? 1 : 0 } });
    return { tier, time, kills, boss, rewarded: run.rewarded, reward, best: best[tier] };
  },
};
