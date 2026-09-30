import {
  FISH,
  FISH_BAIT_MAX,
  FISH_BUY,
  FISH_COLLECTION,
  FISH_DAILY,
  FISH_MAP,
  FISH_PERFECT,
  FISH_RARITY,
  FISH_SPOTS,
  FISH_WATER_BONUS,
  HEROINE_MAP,
  type FishRarity,
  type FishSpot,
} from '../../content';
import type { FishingState } from '../../types';
import type { Action } from '../apply';
import { assert, give, goldPerMin, requireUnlocked, spend, track, vOneOf, vStr, type Ctx } from '../core';
import { dayKey } from '../state';
import { grantHeart } from './bond';

/** Рыбалка с дневной наживкой: каждый новый день — +FISH_DAILY (до запаса). */
export function fishingState(ctx: Pick<Ctx, 's' | 'now'>): FishingState {
  const today = dayKey(ctx.now);
  const f = ctx.s.fishing;
  if (!f) return { day: today, bait: FISH_DAILY, bought: 0, log: {}, milestones: [] };
  if (f.day === today) return f;
  return { ...f, day: today, bought: 0, bait: Math.min(FISH_BAIT_MAX, f.bait + FISH_DAILY) };
}

function copy(f: FishingState): FishingState {
  return { ...f, log: Object.fromEntries(Object.entries(f.log).map(([k, v]) => [k, { ...v }])), milestones: [...f.milestones], hook: f.hook ? { ...f.hook } : undefined };
}

/** Цена пачки наживки (золото — от дохода). */
export function fishBaitCost(ctx: Pick<Ctx, 'cfg' | 's'>): { gold: number } {
  return { gold: Math.max(200, Math.floor(goldPerMin(ctx.cfg, ctx.s) * FISH_BUY.goldMin)) };
}

const RARITIES: FishRarity[] = ['common', 'rare', 'epic', 'legend'];

export const fishingActions = {
  /** Заброс: тратит наживку; клюнувшая рыба и её вес решаются здесь (клиент только играет мини-игру). */
  'fish.cast': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    requireUnlocked(ctx, 'fishing');
    const spot = vOneOf<FishSpot>(a.spot, FISH_SPOTS.map((x) => x.id), 'spot');
    const def = FISH_SPOTS.find((x) => x.id === spot)!;
    assert(s.account.lvl >= def.level, 'levelTooLow', { lvl: def.level });
    let hero: string | undefined;
    if (a.hero) {
      hero = vStr(a.hero, 'hero');
      assert(s.heroines[hero], 'notOwned');
    }
    const f = copy(fishingState(ctx));
    assert(f.bait > 0, 'noBait');
    f.bait--;
    // водная спутница приманивает редких
    const water = hero && HEROINE_MAP[hero]?.element === 'water';
    const pool = FISH.filter((x) => x.spot === spot);
    const weights = RARITIES.filter((r) => pool.some((x) => x.rarity === r)).map((r) => [r, FISH_RARITY[r].weight * (water && r !== 'common' ? FISH_WATER_BONUS : 1)] as const);
    const total = weights.reduce((acc, [, w]) => acc + w, 0);
    let roll = ctx.rng.next() * total;
    let rarity: FishRarity = 'common';
    for (const [r, w] of weights) {
      roll -= w;
      if (roll < 0) {
        rarity = r;
        break;
      }
    }
    const fish = ctx.rng.pick(pool.filter((x) => x.rarity === rarity));
    const [w0, w1] = fish.weight;
    const weight = Math.round((w0 + (w1 - w0) * ctx.rng.next() ** 1.6) * 100) / 100;
    f.hook = { fish: fish.id, spot, weight, ...(hero ? { hero } : {}) };
    f.buddy = hero;
    s.fishing = f;
    return { fish: fish.id, rarity, weight, power: FISH_RARITY[rarity].power, bait: f.bait };
  },

  /** Итог мини-игры: вытащила или сорвалась. perfect — рыба ни разу не вышла из зоны. */
  'fish.reel': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const f = copy(fishingState(ctx));
    assert(f.hook, 'noHook');
    const hook = f.hook;
    f.hook = undefined;
    const ok = a.ok === true;
    if (!ok) {
      s.fishing = f;
      track(ctx, 'fishLost', 1);
      return { ok: false, fish: hook.fish };
    }
    const fish = FISH_MAP[hook.fish];
    const r = FISH_RARITY[fish.rarity];
    const perfect = a.perfect === true;
    const gold = Math.floor(goldPerMin(cfg, s) * r.goldMin * (perfect ? 1 + FISH_PERFECT : 1));
    const cur: Record<string, number> = { gold, dust: r.dust };
    if (r.crystals) cur.crystals = r.crystals;
    if (r.emblems) cur.emblems = r.emblems;
    give(ctx, cur);
    const prev = f.log[fish.id];
    const first = !prev;
    const record = !prev || hook.weight > prev.best;
    f.log[fish.id] = { n: (prev?.n ?? 0) + 1, best: Math.max(prev?.best ?? 0, hook.weight) };
    // коллекция видов
    const species = Object.keys(f.log).length;
    const collection: { species: number; crystals: number; emblems?: number; hearts?: number }[] = [];
    for (const m of FISH_COLLECTION) {
      if (species < m.species || f.milestones.includes(m.species)) continue;
      f.milestones.push(m.species);
      give(ctx, { crystals: m.crystals, emblems: m.emblems ?? 0 });
      const hearts = m.hearts ? grantHeart(ctx, m.hearts) : 0;
      collection.push({ ...m, hearts });
    }
    s.fishing = f;
    track(ctx, 'fishCaught', 1);
    if (fish.rarity === 'legend') track(ctx, 'fishLegend', 1);
    return { ok: true, fish: fish.id, rarity: fish.rarity, weight: hook.weight, perfect, cur, first, record, collection, species };
  },

  /** Пачка наживки за золото (несколько раз в день). */
  'fish.bait': (ctx: Ctx) => {
    requireUnlocked(ctx, 'fishing');
    const f = copy(fishingState(ctx));
    assert(f.bought < FISH_BUY.perDay, 'limitReached');
    spend(ctx, fishBaitCost(ctx));
    f.bought++;
    f.bait = Math.min(FISH_BAIT_MAX + FISH_BUY.bait, f.bait + FISH_BUY.bait);
    ctx.s.fishing = f;
    return { bait: f.bait };
  },
};
