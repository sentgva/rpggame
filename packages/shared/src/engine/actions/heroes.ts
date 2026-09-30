import { HEROINE_MAP, SKIN_MAP, TIER_REQ, TREES, TREE_NODE_MAP } from '../../content';
import type { Action } from '../apply';
import { assert, goldPerMin, requireUnlocked, spend, track, vInt, vOneOf, vStr, type Ctx } from '../core';
import { branchPoints, goldToNext, levelCap, maxRank, rankCost, skillPoints, spentPoints, xpToNext } from '../stats';

function hero(ctx: Ctx, a: Action) {
  const id = vStr(a.id, 'id');
  const h = ctx.s.heroines[id];
  assert(h, 'noHero');
  return h;
}

export function onExpedition(ctx: Ctx, id: string): boolean {
  return ctx.s.modes.expeditions.some((e) => e.heroes.includes(id));
}

export const heroActions = {
  'hero.level': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const h = hero(ctx, a);
    const times = a.times === undefined ? 1 : vInt(a.times, 1, 500, 'times');
    let done = 0;
    for (let i = 0; i < times; i++) {
      if (h.lvl >= levelCap(cfg, h)) break;
      const xp = xpToNext(cfg, h.lvl);
      const gold = goldToNext(cfg, h.lvl);
      if (s.cur.xp < xp || s.cur.gold < gold) break;
      s.cur.xp -= xp;
      s.cur.gold -= gold;
      h.lvl++;
      done++;
    }
    assert(done > 0, h.lvl >= levelCap(cfg, h) ? 'levelCap' : 'notEnough', { cur: 'xp' });
    track(ctx, 'heroLevel', done);
    return { lvl: h.lvl, done };
  },

  /** Ранг героини: Эмблемы + золото (минуты дохода). Ранг поднимает потолок уровня и множитель характеристик. */
  'hero.rank': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'ranks');
    const h = hero(ctx, a);
    const cost = rankCost(cfg, h);
    assert(cost, 'maxRank');
    spend(ctx, { emblems: cost.emblems, gold: Math.ceil(goldPerMin(cfg, s) * cost.goldMin) });
    h.stars++;
    track(ctx, 'heroRank', 1);
    ctx.events.push({ name: 'hero_rank', props: { hero: h.id, rank: h.stars } });
    return { rank: h.stars };
  },

  /** Пробуждение на высшем ранге: потолок уровня 200 и особый эффект класса. */
  'hero.awaken': (ctx: Ctx, a: Action) => {
    const { cfg } = ctx;
    const h = hero(ctx, a);
    assert(h.stars >= maxRank(cfg) && !h.awakened, 'cannotAwaken');
    spend(ctx, { emblems: cfg.hero.awakenEmblems, crystals: cfg.hero.awakenCrystals });
    h.awakened = true;
    ctx.events.push({ name: 'hero_awaken', props: { hero: h.id } });
    return {};
  },

  'hero.spec': (ctx: Ctx, a: Action) => {
    const { cfg } = ctx;
    const h = hero(ctx, a);
    const spec = vOneOf(a.spec, ['A', 'B'] as const, 'spec');
    assert(h.lvl >= cfg.hero.specLevel, 'levelTooLow', { lvl: cfg.hero.specLevel });
    if (h.spec && h.spec !== spec) spend(ctx, { crystals: 500 });
    h.spec = spec;
    return { spec };
  },

  'hero.skin': (ctx: Ctx, a: Action) => {
    const h = hero(ctx, a);
    if (a.skin === null) {
      delete h.skin;
      return {};
    }
    const skin = vStr(a.skin, 'skin');
    assert(SKIN_MAP[skin]?.hero === h.id && ctx.s.skins.includes(skin), 'noSkin');
    h.skin = skin;
    return {};
  },

  'tree.learn': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    requireUnlocked(ctx, 'tree');
    const h = hero(ctx, a);
    const cls = HEROINE_MAP[h.id].cls;
    const nodeId = vStr(a.node, 'node');
    const node = TREE_NODE_MAP[nodeId];
    assert(node && node.cls === cls, 'badNode');
    const ranks = a.ranks === undefined ? 1 : vInt(a.ranks, 1, 10, 'ranks');
    let learned = 0;
    for (let i = 0; i < ranks; i++) {
      const cur = h.tree[nodeId] ?? 0;
      if (cur >= node.max) break;
      if (skillPoints(s, h) - spentPoints(h) <= 0) break;
      if (branchPoints(h, cls, node.branch) < TIER_REQ[node.tier]) break;
      if (node.kind === 'mod' && node.mod) {
        const skillNode = TREES[cls].find((n) => n.skill === node.mod!.skill);
        if (!skillNode || !(h.tree[skillNode.id] > 0)) break;
      }
      h.tree[nodeId] = cur + 1;
      learned++;
    }
    assert(learned > 0, (h.tree[nodeId] ?? 0) >= node.max ? 'maxRank' : skillPoints(s, h) - spentPoints(h) <= 0 ? 'noPoints' : 'tierLocked');
    // новое активное умение автоматически ставим в свободный слот
    if (node.kind === 'active' && node.skill && !h.skills.includes(node.skill)) {
      const free = h.skills.findIndex((x) => !x);
      if (free >= 0) h.skills[free] = node.skill;
    }
    return { rank: h.tree[nodeId] };
  },

  'tree.reset': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const h = hero(ctx, a);
    if (h.lvl >= cfg.hero.treeFreeResetLevel) {
      const discount = !s.week.treeDiscount;
      spend(ctx, { crystals: Math.ceil(cfg.hero.treeResetCost * (discount ? 0.5 : 1)) });
      s.week.treeDiscount = true;
    }
    h.tree = {};
    h.skills = [null, null];
    h.treeResets = (h.treeResets ?? 0) + 1;
    return {};
  },

  'hero.skills': (ctx: Ctx, a: Action) => {
    const h = hero(ctx, a);
    assert(Array.isArray(a.skills) && a.skills.length === 2, 'badParam', { name: 'skills' });
    const cls = HEROINE_MAP[h.id].cls;
    const next: (string | null)[] = [];
    for (const sid of a.skills as unknown[]) {
      if (sid === null) {
        next.push(null);
        continue;
      }
      const id = vStr(sid, 'skill');
      const node = TREES[cls].find((n) => n.kind === 'active' && n.skill === id);
      assert(node && (h.tree[node.id] ?? 0) > 0, 'skillNotLearned');
      assert(!next.includes(id), 'badParam', { name: 'skills' });
      next.push(id);
    }
    h.skills = next;
    return {};
  },
};
