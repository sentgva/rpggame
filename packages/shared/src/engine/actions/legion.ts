import { HEROINE_MAP, SKIN_MAP } from '../../content';
import type { Action } from '../apply';
import { assert, levelUpLegion, spend, track, vInt, vOneOf, vStr, type Ctx } from '../core';
import { legionMaxLevel, rankCap, rankCost, skillCost } from '../stats';

export const legionActions = {
  /** Уровень Легиона: n раз подряд (или до упора, n = 0). */
  'legion.level': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const n = a.n === undefined ? 1 : vInt(a.n, 0, 1000, 'n');
    assert(s.legion.lvl < legionMaxLevel(cfg), 'maxLevel');
    const done = levelUpLegion(ctx, n === 0 ? 1000 : n);
    assert(done > 0, 'notEnough', { cur: 'gold' });
    return { lvl: s.legion.lvl, done };
  },

  /** Ранг героя: открывает потолок уровня и усиливает его. */
  'hero.rank': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const id = vStr(a.id, 'id');
    const h = s.heroines[id];
    assert(h, 'noHero');
    const cost = rankCost(cfg, h.rank);
    assert(cost, 'maxRank');
    assert(s.legion.lvl >= rankCap(cfg, h.rank) || ctx.dev, 'needLevel', { lvl: rankCap(cfg, h.rank) });
    spend(ctx, cost);
    h.rank++;
    track(ctx, 'rankUp', 1);
    ctx.events.push({ name: 'hero_rank', props: { hero: id, rank: h.rank } });
    return { rank: h.rank };
  },

  /** Уровень умения или ульты. */
  'hero.skill': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const id = vStr(a.id, 'id');
    const which = vOneOf(a.which, ['skill', 'ult'] as const, 'which');
    const h = s.heroines[id];
    assert(h, 'noHero');
    const cost = skillCost(cfg, s, h[which]);
    assert(cost, 'maxRank');
    spend(ctx, cost);
    h[which]++;
    track(ctx, 'skillUp', 1);
    return { lvl: h[which] };
  },

  /** Сменить облик (null — классический наряд). */
  'hero.skin': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const id = vStr(a.id, 'id');
    const h = s.heroines[id];
    assert(h, 'noHero');
    if (a.skin === null || a.skin === undefined) delete h.skin;
    else {
      const sk = vStr(a.skin, 'skin');
      assert(SKIN_MAP[sk]?.hero === id && HEROINE_MAP[id] && s.skins.includes(sk), 'noSkin');
      h.skin = sk;
    }
    return {};
  },
};
