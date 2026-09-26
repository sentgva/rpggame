import {
  BOND_COSTUME_HEARTS,
  BOND_DATE_LVL,
  BOND_GAIN,
  BOND_HEROES,
  BOND_LIMITS,
  BOND_MAX,
  BOND_MILESTONES,
  BOND_SPA_COST,
  BOND_XP,
  PLACES,
  TREATS,
  bondTopic,
  bondTraits,
  type Place,
  type Treat,
} from '../../content';
import type { BondState } from '../../types';
import type { Action } from '../apply';
import { assert, give, goldPerMin, spend, track, vInt, vOneOf, vStr, type Ctx } from '../core';
import { dayKey } from '../state';

/** Цены угощения и свидания — от дохода (минуты золота). */
export function bondCosts(ctx: Pick<Ctx, 'cfg' | 's'>) {
  const gpm = goldPerMin(ctx.cfg, ctx.s);
  return { treat: { gold: Math.max(50, Math.floor(gpm * 8)) }, date: { gold: Math.max(200, Math.floor(gpm * 30)) }, spa: { ...BOND_SPA_COST } };
}

/** Близость с героиней (сброс дневных счётчиков — по дню). */
export function bondState(ctx: Pick<Ctx, 's' | 'now'>, hero: string): BondState {
  const today = dayKey(ctx.now);
  const b = ctx.s.bond?.[hero];
  if (!b) return { lvl: 0, xp: 0, day: today, talk: 0, treat: 0, spa: false, date: false };
  return b.day === today ? b : { ...b, day: today, talk: 0, treat: 0, spa: false, date: false };
}

function heroFor(ctx: Ctx, a: Action): string {
  const hero = vStr(a.hero, 'hero');
  assert(BOND_HEROES.includes(hero), 'badParam', { name: 'hero' });
  assert(ctx.s.heroines[hero], 'notOwned');
  return hero;
}

/** Опыт близости с повышением уровней и наградами пиков. */
function gain(ctx: Ctx, hero: string, b: BondState, xp: number) {
  const out = { xp, levelUps: [] as number[], rewards: {} as Record<string, number>, shards: 0 };
  b.xp += xp;
  while (b.lvl < BOND_MAX && b.xp >= BOND_XP[b.lvl]) {
    b.xp -= BOND_XP[b.lvl];
    b.lvl++;
    out.levelUps.push(b.lvl);
    const m = BOND_MILESTONES[b.lvl];
    if (m) {
      give(ctx, { crystals: m.crystals, scrolls: m.scrolls ?? 0 });
      out.rewards.crystals = (out.rewards.crystals ?? 0) + m.crystals;
      if (m.scrolls) out.rewards.scrolls = (out.rewards.scrolls ?? 0) + m.scrolls;
      if (m.shards) {
        ctx.s.shards[hero] = (ctx.s.shards[hero] ?? 0) + m.shards;
        out.shards += m.shards;
      }
    }
    track(ctx, 'bondLevel', 1);
  }
  if (b.lvl >= BOND_MAX) b.xp = 0;
  ctx.s.bond = { ...(ctx.s.bond ?? {}), [hero]: b };
  track(ctx, 'bondCare', 1);
  return { ...out, lvl: b.lvl, cur: b.xp };
}

export const bondActions = {
  /** Разговор: тема дня, ответ — индекс исходного ответа (0 — лучший, 2 — неудачный). */
  'bond.talk': (ctx: Ctx, a: Action) => {
    const hero = heroFor(ctx, a);
    const b = { ...bondState(ctx, hero) };
    assert(b.talk < BOND_LIMITS.talk, 'usedToday');
    const answer = vInt(a.answer, 0, 2, 'answer');
    const { index } = bondTopic(hero, b.day, b.talk);
    b.talk++;
    return { hero, topic: index, answer, ...gain(ctx, hero, b, BOND_GAIN.talk[answer]) };
  },

  'bond.treat': (ctx: Ctx, a: Action) => {
    const hero = heroFor(ctx, a);
    const b = { ...bondState(ctx, hero) };
    assert(b.treat < BOND_LIMITS.treat, 'usedToday');
    const treat = vOneOf(a.treat, TREATS.map((x) => x.id), 'treat') as Treat;
    spend(ctx, bondCosts(ctx).treat);
    const t = bondTraits(hero);
    const like = treat === t.treat ? 0 : treat === t.dislike ? 2 : 1;
    b.treat++;
    return { hero, treat, like, ...gain(ctx, hero, b, [BOND_GAIN.treatFav, BOND_GAIN.treat, BOND_GAIN.treatBad][like]) };
  },

  /** Горячие источники (в купальниках): раз в день, за кристаллы. */
  'bond.spa': (ctx: Ctx, a: Action) => {
    const hero = heroFor(ctx, a);
    const b = { ...bondState(ctx, hero) };
    assert(!b.spa, 'usedToday');
    spend(ctx, bondCosts(ctx).spa);
    b.spa = true;
    return { hero, ...gain(ctx, hero, b, BOND_GAIN.spa) };
  },

  /** Свидание: с 3-го уровня близости, раз в день; любимое место — больше близости. */
  'bond.date': (ctx: Ctx, a: Action) => {
    const hero = heroFor(ctx, a);
    const b = { ...bondState(ctx, hero) };
    assert(b.lvl >= BOND_DATE_LVL, 'locked', { feature: 'date' });
    assert(!b.date, 'usedToday');
    const place = vOneOf(a.place, PLACES.map((x) => x.id), 'place') as Place;
    spend(ctx, bondCosts(ctx).date);
    const fav = place === bondTraits(hero).place;
    b.date = true;
    return { hero, place, fav, ...gain(ctx, hero, b, fav ? BOND_GAIN.dateFav : BOND_GAIN.date) };
  },

  /** Наряд близости: только на 10-м уровне и за Сердца Эфира. */
  'bond.costume': (ctx: Ctx, a: Action) => {
    const hero = heroFor(ctx, a);
    const { s } = ctx;
    const id = `${hero}_bond`;
    assert(!s.skins.includes(id), 'owned');
    assert(bondState(ctx, hero).lvl >= BOND_MAX, 'locked', { feature: 'bondCostume' });
    assert((s.bondHearts ?? 0) >= BOND_COSTUME_HEARTS, 'notEnough', { cur: 'hearts' });
    s.bondHearts = (s.bondHearts ?? 0) - BOND_COSTUME_HEARTS;
    s.skins.push(id);
    ctx.events.push({ name: 'bond_costume', props: { hero } });
    return { skin: id };
  },
};

/** Сердце Эфира за подвиг в тяжёлом режиме. */
export function grantHeart(ctx: Ctx, n = 1): number {
  ctx.s.bondHearts = (ctx.s.bondHearts ?? 0) + n;
  return n;
}
