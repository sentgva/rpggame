import { CAMPFIRE, CAMPFIRE_MAP, CAMP_BOND, CAMP_MASTERY, campCombos, type CampScene } from '../../content';
import { hashStr } from '../../rng';
import type { CampfireState, PlayerState } from '../../types';
import type { Action } from '../apply';
import { assert, track, vOneOf, type Ctx } from '../core';
import { dayKey } from '../state';
import { bondGain, bondState } from './bond';

/** Вечер у костра: сегодняшний разговор (новый день — новый вечер). */
export function campfireState(ctx: { s: PlayerState; now: number }): CampfireState {
  const today = dayKey(ctx.now);
  const c = ctx.s.campfire ?? { day: '', done: false, seen: [] };
  return c.day === today ? c : { day: today, done: false, seen: c.seen };
}

/** Пара вечера: сначала — ещё не виденные сцены из героинь, что уже в Легионе. */
export function campfireScene(ctx: { s: PlayerState; now: number }): CampScene | null {
  const { s } = ctx;
  const st = campfireState(ctx);
  if (st.done && st.scene && CAMPFIRE_MAP[st.scene]) return CAMPFIRE_MAP[st.scene];
  const avail = CAMPFIRE.filter((sc) => s.heroines[sc.a] && s.heroines[sc.b]);
  if (!avail.length) return null;
  const unseen = avail.filter((sc) => !st.seen.includes(sc.id));
  const pool = unseen.length ? unseen : avail;
  return pool[hashStr(`${s.id}:${st.day}`) % pool.length];
}

export const campfireActions = {
  /** Ответ Командора у костра: поддержать одну из героинь или помирить обеих. */
  'camp.talk': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const st = campfireState(ctx);
    assert(!st.done, 'usedToday');
    const sc = campfireScene(ctx);
    assert(sc, 'requirements');
    const choice = vOneOf(a.choice, ['a', 'b', 'both'] as const, 'choice');
    const gains: Record<string, number> =
      choice === 'both'
        ? { [sc.a]: CAMP_BOND.both, [sc.b]: CAMP_BOND.both }
        : choice === 'a'
          ? { [sc.a]: CAMP_BOND.favored, [sc.b]: CAMP_BOND.other }
          : { [sc.a]: CAMP_BOND.other, [sc.b]: CAMP_BOND.favored };
    const bond: Record<string, ReturnType<typeof bondGain>> = {};
    for (const [hero, xp] of Object.entries(gains)) bond[hero] = bondGain(ctx, hero, { ...bondState(ctx, hero) }, xp);
    // сыгранность: их общая связка засчитывается в мастерство
    const combos = campCombos(sc.a, sc.b);
    for (const c of combos) s.counters[`combo:${c}`] = (s.counters[`combo:${c}`] ?? 0) + CAMP_MASTERY;
    s.campfire = { day: st.day, done: true, scene: sc.id, seen: [...new Set([...st.seen, sc.id])] };
    track(ctx, 'campfire', 1);
    ctx.events.push({ name: 'campfire', props: { scene: sc.id, choice } });
    return { scene: sc.id, choice, reply: sc.replies[choice], bond, combos, mastery: CAMP_MASTERY };
  },
};
