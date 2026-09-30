import { VOLLEY_DAILY, VOLLEY_MIN_MS, VOLLEY_POINTS, VOLLEY_RUNGS, volleyFirstReward, volleyReward, volleyRival, volleyTeam } from '../../content';
import type { FestivalState } from '../../types';
import type { Action } from '../apply';
import { assert, give, requireUnlocked, track, vInt, vStrArr, type Ctx } from '../core';
import { festCopy, requireFestival, volleyOf } from './festival';

type Cur = Record<string, number>;

/** Сколько матчей на пляже осталось сегодня (с купленными). */
export function volleyLeft(f: FestivalState): number {
  const v = volleyOf(f);
  return Math.max(0, VOLLEY_DAILY - v.used) + v.bonus;
}

export const volleyActions = {
  /**
   * Выход на корт: своя пара (две разные героини) против пары ступени rung (пройденные — можно переиграть,
   * следующая — открыта). Тратит матч дня (или купленный); незаконченный прошлый матч засчитывается поражением.
   */
  'volley.start': (ctx: Ctx, a: Action) => {
    const { s, now } = ctx;
    requireUnlocked(ctx, 'events');
    const f = festCopy(ctx, requireFestival(ctx, 'volley'));
    const v = volleyOf(f);
    const heroes = vStrArr(a.heroes, 2, 'heroes');
    assert(heroes.length === 2 && heroes[0] !== heroes[1], 'badParam', { name: 'heroes' });
    for (const id of heroes) assert(s.heroines[id], 'notOwned');
    const rung = vInt(a.rung, 1, VOLLEY_RUNGS, 'rung');
    assert(rung <= v.best + 1, 'requirements');
    assert(volleyLeft(f) > 0, 'noAttempts');
    const paid = v.used >= VOLLEY_DAILY;
    f.volley = { ...v, used: paid ? v.used : v.used + 1, bonus: paid ? v.bonus - 1 : v.bonus, match: { rung, heroes, at: now } };
    s.festival = f;
    track(ctx, 'volMatch', 1);
    return { rival: volleyRival(rung), team: volleyTeam(heroes), left: volleyLeft(f), festival: f };
  },

  /**
   * Итог матча (до VOLLEY_POINTS очков). forfeit — сдаться. spikes — очки, забитые ударом.
   * Победа — жетоны и очки праздника; первая победа над парой — кристаллы, на 4-й и 8-й — осколки героини.
   */
  'volley.end': (ctx: Ctx, a: Action) => {
    const { s, now } = ctx;
    const fn = requireFestival(ctx, 'volley');
    const f = festCopy(ctx, fn);
    const v = volleyOf(f);
    const m = v.match;
    assert(m, 'noRun');
    const forfeit = a.forfeit === true;
    const us = forfeit ? 0 : vInt(a.us, 0, VOLLEY_POINTS, 'us');
    const them = forfeit ? VOLLEY_POINTS : vInt(a.them, 0, VOLLEY_POINTS, 'them');
    const won = us === VOLLEY_POINTS && them < VOLLEY_POINTS;
    assert(forfeit || won || (them === VOLLEY_POINTS && us < VOLLEY_POINTS), 'badParam', { name: 'score' });
    // матч не может закончиться мгновенно
    if (won) assert(now - m.at >= VOLLEY_MIN_MS, 'badParam', { name: 'score' });
    const spikes = forfeit ? 0 : vInt(a.spikes ?? 0, 0, us, 'spikes');
    const big = won && them <= 1;
    // сдалась — без утешительной награды
    const r = forfeit ? { tokens: 0, points: 0 } : volleyReward(m.rung, won, big);
    const cur: Cur = r.tokens ? { eventTokens: r.tokens } : {};
    let points = r.points;
    let first: ReturnType<typeof volleyFirstReward> | null = null;
    const next = { ...v, match: undefined };
    if (won) {
      next.wins++;
      if (big) next.big++;
      track(ctx, 'volWin', 1);
      if (m.rung > v.best) {
        next.best = m.rung;
        first = volleyFirstReward(m.rung);
        if (first.crystals) cur.crystals = first.crystals;
        points += first.points;
        if (first.emblems) cur.emblems = first.emblems;
      }
    }
    if (spikes) track(ctx, 'volSpike', spikes);
    give(ctx, cur);
    f.points += points;
    f.volley = next;
    s.festival = f;
    ctx.events.push({ name: 'volley_end', props: { rung: m.rung, won, us, them } });
    return { won, big, us, them, rung: m.rung, reward: { cur, points, first: !!first }, festival: f };
  },
};
