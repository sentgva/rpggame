import type { Config } from '../config';
import { KINDS_BY_SLOT, SUB_DEFS } from '../content';
import type { Rng } from '../rng';
import type { GearSlot, Item, ItemRarity, SetId, SubStat } from '../types';
import { GEAR_SLOTS, MAX_RARITY, SET_IDS, SUB_STATS } from '../types';

export interface LootOpts {
  lvl: number;
  slot?: GearSlot;
  /** Точная редкость. */
  rarity?: ItemRarity;
  /** Не ниже этой редкости. */
  minRarity?: number;
  /** Не выше этой редкости (обычный дроп — до легендарной). */
  maxRarity?: number;
  /** Сдвиг весов редкости (круг похода, Знамя «Удача»). */
  luck?: number;
  set?: SetId;
}

/** Случайная редкость по весам; luck смещает веса к редким. */
export function rollRarity(cfg: Config, rng: Rng, luck = 0): ItemRarity {
  const w = cfg.gear.rarityWeights.map((v, i) => v * Math.pow(1 + luck, i));
  return rng.weighted(w) as ItemRarity;
}

export function rollSub(cfg: Config, rng: Rng, rarity: number, exclude: SubStat[]): { s: SubStat; v: number } {
  const pool = SUB_STATS.filter((x) => !exclude.includes(x));
  const s = rng.pick(pool.length ? pool : SUB_STATS);
  const v = Math.round(SUB_DEFS[s].base * cfg.gear.subMult[rarity] * rng.float(0.75, 1.25) * 1000) / 1000;
  return { s, v };
}

/** Новый предмет. */
export function generateItem(cfg: Config, rng: Rng, uid: string, o: LootOpts): Item {
  let rarity = o.rarity ?? rollRarity(cfg, rng, o.luck ?? 0);
  if (o.minRarity !== undefined && rarity < o.minRarity) rarity = o.minRarity as ItemRarity;
  if (o.maxRarity !== undefined && rarity > o.maxRarity) rarity = o.maxRarity as ItemRarity;
  rarity = Math.min(MAX_RARITY, rarity) as ItemRarity;
  const slot = o.slot ?? rng.pick(GEAR_SLOTS);
  const kind = rng.pick(KINDS_BY_SLOT[slot]);
  const subs: Item['subs'] = [];
  for (let i = 0; i < cfg.gear.subCount[rarity]; i++) subs.push(rollSub(cfg, rng, rarity, subs.map((x) => x.s)));
  const item: Item = { uid, slot, rarity, lvl: Math.max(1, Math.round(o.lvl)), kind, subs, enh: 0, isNew: true };
  if (rarity >= 4) item.set = o.set ?? rng.pick(SET_IDS);
  return item;
}

/**
 * Слияние трёх вещей одного слота и редкости: следующая редкость, уровень — лучший из трёх,
 * вид и сет — от лучшей вещи, заточка — наибольшая; доп. свойства сохраняются и добавляются новые.
 */
export function mergeItems(cfg: Config, rng: Rng, uid: string, items: Item[]): Item {
  const best = [...items].sort((a, b) => b.lvl - a.lvl || b.enh - a.enh || (a.uid < b.uid ? -1 : 1))[0];
  const rarity = Math.min(MAX_RARITY, best.rarity + 1) as ItemRarity;
  const k = cfg.gear.subMult[rarity] / cfg.gear.subMult[best.rarity];
  const subs = best.subs.map((x) => ({ s: x.s, v: Math.round(x.v * k * 1000) / 1000 }));
  while (subs.length < cfg.gear.subCount[rarity]) subs.push(rollSub(cfg, rng, rarity, subs.map((x) => x.s)));
  const set = rarity >= 4 ? best.set ?? items.find((x) => x.set)?.set ?? rng.pick(SET_IDS) : undefined;
  const out: Item = {
    uid,
    slot: best.slot,
    rarity,
    lvl: Math.max(...items.map((x) => x.lvl)),
    kind: best.kind,
    subs,
    enh: Math.max(...items.map((x) => x.enh)),
    isNew: true,
  };
  if (set) out.set = set;
  return out;
}
