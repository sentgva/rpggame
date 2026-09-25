import type { Config } from '../config';
import {
  AFFIXES,
  AFFIX_MAP,
  ARMOR_CLASSES,
  BASE_ITEMS,
  LEGENDARIES,
  MAIN_BASE,
  MYTHICS,
  SET_SLOTS,
  TIER_MULT,
  WEAPON_CLASS,
  type BaseItemDef,
} from '../content';
import type { Rng } from '../rng';
import type { ClassId, Item, ItemAffix, ItemRarity, ItemSlot, StatKey } from '../types';
import { gearCurve, isExpStat } from './stats';

export interface LootOpts {
  lvl: number;
  diff?: 0 | 1 | 2;
  /** Доп. бонус к шансу редкого лута (созвездие, Вознесение). */
  rarityBonus?: number;
  minRarity?: number;
  maxRarity?: number;
  forceRarity?: ItemRarity;
  slot?: ItemSlot;
  classes?: ClassId[];
  set?: string;
  setChance?: number;
  setPool?: string[];
  fx?: string;
  base?: string;
}

const SLOT_WEIGHTS: [ItemSlot, number][] = [
  ['weapon', 10],
  ['offhand', 7],
  ['helmet', 10],
  ['armor', 10],
  ['gloves', 10],
  ['boots', 10],
  ['belt', 9],
  ['cloak', 9],
  ['amulet', 7],
  ['ring', 12],
];

export function rollRarity(cfg: Config, rng: Rng, lvl: number, diff: number, bonus = 0): ItemRarity {
  const factor = 1 + cfg.gear.stageRarityBonus * Math.min(lvl, 300) + bonus;
  const w = cfg.gear.rarityWeights.map((x, r) => (r === 0 ? x : x * Math.pow(factor, r / 2)));
  let r = rng.weighted(w);
  r += cfg.gear.difficultyRarityShift[diff] ?? 0;
  return Math.min(5, r) as ItemRarity;
}

function baseTier(base: BaseItemDef[], lvl: number): number {
  const maxTier = Math.max(...base.map((b) => b.tier));
  const t = 1 + Math.floor(lvl / (280 / maxTier));
  return Math.min(maxTier, t);
}

function pickBase(rng: Rng, slot: ItemSlot, lvl: number, classes?: ClassId[], type?: string): BaseItemDef {
  let pool = BASE_ITEMS.filter((b) => b.slot === slot);
  if (type) {
    const typed = pool.filter((b) => b.type === type);
    if (typed.length) pool = typed;
  } else if (classes && classes.length && (slot === 'weapon' || slot === 'offhand' || ['helmet', 'armor', 'gloves', 'boots'].includes(slot))) {
    // 70% — под классы отряда, чтобы лут был полезным
    if (rng.chance(0.7)) {
      const cls = rng.pick(classes);
      const fit = pool.filter((b) => (slot === 'weapon' || slot === 'offhand' ? WEAPON_CLASS[b.type] === cls : ARMOR_CLASSES[b.type as 'heavy']?.includes(cls)));
      if (fit.length) pool = fit;
    }
    const types = [...new Set(pool.map((b) => b.type))];
    const t = rng.pick(types);
    pool = pool.filter((b) => b.type === t);
  }
  const tier = baseTier(pool, lvl);
  const candidates = pool.filter((b) => b.tier <= tier);
  let best = candidates[0] ?? pool[0];
  for (const b of candidates) if (b.tier > best.tier) best = b;
  return best;
}

export function mainValue(cfg: Config, stat: StatKey, lvl: number, rarity: number, roll: number): number {
  const mb = MAIN_BASE[stat] ?? { v: 0.02, exp: false };
  const rm = cfg.gear.rarityMain[rarity] ?? 1;
  if (mb.exp) return Math.max(1, Math.round(mb.v * gearCurve(cfg, lvl, stat) * rm * roll));
  return round4(mb.v * (1 + Math.min(lvl, 300) / 150) * rm * roll);
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export function rollTier(cfg: Config, rng: Rng, rarity: number): number {
  const w = cfg.gear.tierWeights.map((x, t) => x * Math.pow(1 + 0.25 * rarity, t));
  return rng.weighted(w) + 1;
}

export function affixValue(cfg: Config, id: string, tier: number, lvl: number, roll: number): number {
  const a = AFFIX_MAP[id];
  if (!a) return 0;
  if (a.stat === 'skillRank') return 1;
  const tm = TIER_MULT[tier - 1] ?? 1;
  if (a.exp) return Math.max(1, Math.round(a.base * gearCurve(cfg, lvl, a.stat) * tm * roll));
  return round4(a.base * tm * (1 + Math.min(lvl, 300) / 200) * roll);
}

export function rollAffix(cfg: Config, rng: Rng, item: Pick<Item, 'slot' | 'main' | 'affixes' | 'lvl' | 'rarity'>, exclude: string[] = []): ItemAffix | null {
  const taken = new Set([...item.affixes.map((a) => a.id), ...exclude, item.main.stat]);
  const pool = AFFIXES.filter((a) => !taken.has(a.id) && (!a.slots || a.slots.includes(item.slot)));
  if (!pool.length) return null;
  const a = pool[rng.weighted(pool.map((p) => p.weight))];
  const tier = rollTier(cfg, rng, item.rarity);
  return { id: a.id, tier, v: affixValue(cfg, a.id, tier, item.lvl, rng.float(0.9, 1.1)) };
}

/** Сгенерировать предмет. uid назначается вызывающим. */
export function generateItem(cfg: Config, rng: Rng, uid: string, o: LootOpts): Item {
  let rarity: ItemRarity = o.forceRarity ?? rollRarity(cfg, rng, o.lvl, o.diff ?? 0, o.rarityBonus ?? 0);
  if (o.minRarity !== undefined && rarity < o.minRarity) rarity = o.minRarity as ItemRarity;
  if (o.maxRarity !== undefined && rarity > o.maxRarity) rarity = o.maxRarity as ItemRarity;
  const lvl = Math.max(1, Math.round(o.lvl));

  let slot: ItemSlot = o.slot ?? SLOT_WEIGHTS[rng.weighted(SLOT_WEIGHTS.map((x) => x[1]))][0];
  let fx: string | undefined = o.fx;
  let forcedType: string | undefined;

  if (rarity === 5 && !fx) {
    // мифический: оружие класса с эффектом, меняющим умение класса
    const classes = o.classes && o.classes.length ? o.classes : (['sorceress'] as ClassId[]);
    const cls = rng.pick(classes);
    const myth = rng.pick(MYTHICS.filter((m) => m.cls === cls));
    fx = myth.id;
    slot = o.slot === 'offhand' ? 'offhand' : 'weapon';
    forcedType = Object.entries(WEAPON_CLASS).find(([t, c]) => c === cls && BASE_ITEMS.some((b) => b.slot === slot && b.type === t))?.[0];
  } else if ((rarity === 4 || rarity === 6) && !fx) {
    let pool = LEGENDARIES.filter((l) => l.slot === slot);
    if (o.classes && o.classes.length) {
      const fit = pool.filter((l) => !l.type || o.classes!.includes(WEAPON_CLASS[l.type]));
      if (fit.length) pool = fit;
    }
    if (!pool.length) pool = LEGENDARIES.filter((l) => !l.type);
    const leg = rng.pick(pool);
    fx = leg.id;
    slot = leg.slot;
    forcedType = leg.type;
  }
  if (fx && !forcedType) {
    const leg = LEGENDARIES.find((l) => l.id === fx);
    if (leg) {
      slot = leg.slot;
      forcedType = leg.type;
    }
  }

  const base = o.base ? BASE_ITEMS.find((b) => b.id === o.base)! : pickBase(rng, slot, lvl, o.classes, forcedType);
  const mainStat = rng.pick(base.mains);
  const item: Item = {
    uid,
    base: base.id,
    slot: base.slot,
    rarity,
    lvl,
    main: { stat: mainStat, v: mainValue(cfg, mainStat, lvl, rarity, rng.float(0.95, 1.05)) },
    affixes: [],
    enh: 0,
    sockets: rarity === 4 ? 1 + rng.int(2) : (cfg.gear.sockets[rarity] ?? 0),
    gems: [],
    isNew: true,
  };
  item.gems = new Array(item.sockets).fill(null);
  if (fx) item.fx = fx;

  const count = cfg.gear.affixCount[rarity] ?? 0;
  for (let i = 0; i < count; i++) {
    const a = rollAffix(cfg, rng, item);
    if (a) item.affixes.push(a);
  }

  // сеты — на эпических и выше в слотах брони/пояса/плаща
  if (rarity >= 3 && SET_SLOTS.includes(item.slot)) {
    if (o.set) item.set = o.set;
    else if (o.setPool && o.setPool.length && rng.chance(o.setChance ?? 0)) item.set = rng.pick(o.setPool);
  }
  return item;
}

export function isExp(stat: StatKey): boolean {
  return isExpStat(stat);
}
