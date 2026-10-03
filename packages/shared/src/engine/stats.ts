import type { Config } from '../config';
import {
  HEROINES,
  BANNER_MAP,
  BOND_STAT,
  CLASSES,
  HEROINE_MAP,
  ROSTER,
  SETS,
  SET_MAP,
  SKIN_MAP,
  SLOT_MAIN,
  fashionFits,
  fashionOfDay,
  type HeroMod,
} from '../content';
import type { FinalStats, GearSlot, HeroState, Item, PlayerState, SetId } from '../types';
import { GEAR_SLOTS } from '../types';

/** Рост характеристик за уровень/этап. */
export function growth(cfg: Config, lvl: number): number {
  return Math.pow(cfg.growth, Math.max(0, lvl - 1));
}

// ——— уровни, ранги, навыки ———

/** Потолок уровня героя по рангу. */
export function rankCap(cfg: Config, rank: number): number {
  const caps = cfg.hero.rankCaps;
  return caps[Math.max(0, Math.min(caps.length, rank) - 1)];
}

/** Эффективный уровень героя: уровень Легиона, но не выше потолка его ранга. */
export function heroLevel(cfg: Config, s: Pick<PlayerState, 'legion'>, h: Pick<HeroState, 'rank'>): number {
  return Math.min(s.legion.lvl, rankCap(cfg, h.rank));
}

/** Максимальный уровень Легиона — потолок высшего ранга. */
export function legionMaxLevel(cfg: Config): number {
  return cfg.hero.rankCaps[cfg.hero.rankCaps.length - 1];
}

/** Прорыв — переход с уровня, кратного breakEvery. */
export function isBreakthrough(cfg: Config, lvl: number): boolean {
  return lvl % cfg.hero.breakEvery === 0;
}

/**
 * Цена повышения уровня Легиона с lvl на lvl+1: «минуты дохода» на этапе того же номера,
 * растущие как levelA + levelB·lvl^levelK (прогресс быстрый в начале и плавно замедляется).
 */
export function levelCost(cfg: Config, lvl: number): { gold: number; xp: number } {
  const H = cfg.hero;
  const minutes = (H.levelA + H.levelB * Math.pow(lvl, H.levelK)) * (isBreakthrough(cfg, lvl) ? H.breakMult : 1);
  const g = growth(cfg, lvl);
  return { gold: Math.ceil(cfg.income.goldBase * g * minutes), xp: Math.ceil(cfg.income.xpBase * g * minutes) };
}

export function maxRank(cfg: Config): number {
  return cfg.hero.maxRank;
}

/** Цена следующего ранга (null — ранг максимальный). Золото — в «уровнях» на потолке текущего ранга. */
export function rankCost(cfg: Config, rank: number): { emblems: number; gold: number } | null {
  if (rank >= cfg.hero.maxRank) return null;
  const cap = rankCap(cfg, rank);
  return { emblems: cfg.hero.rankEmblems[rank - 1], gold: Math.ceil((levelCost(cfg, cap).gold * cfg.hero.rankGold[rank - 1]) / 20) };
}

/** Цена следующего уровня навыка (null — максимум). Золото растёт вместе с уровнем Легиона. */
export function skillCost(cfg: Config, s: Pick<PlayerState, 'legion'>, lvl: number): { books: number; gold: number } | null {
  if (lvl >= cfg.hero.maxSkill) return null;
  return { books: cfg.hero.skillBooks[lvl - 1], gold: Math.ceil((levelCost(cfg, s.legion.lvl).gold * cfg.hero.skillGold[lvl - 1]) / 20) };
}

/** Множитель силы навыка по уровню. */
export function skillPower(cfg: Config, lvl: number): number {
  return 1 + cfg.hero.skillStep * (lvl - 1);
}

export function accountXpToNext(cfg: Config, lvl: number): number {
  return Math.floor(cfg.account.xpBase * Math.pow(lvl, cfg.account.xpExp));
}

// ——— снаряжение ———

/** Основные свойства предмета: оружие — атака, шлем — здоровье, доспех — защита, сапоги — скорость и немного здоровья. */
export function itemMain(cfg: Config, it: Pick<Item, 'slot' | 'rarity' | 'lvl' | 'enh'>): { atk?: number; hp?: number; def?: number; haste?: number } {
  const G = cfg.gear;
  const r = G.rarityMult[it.rarity] * (1 + G.enhStep * it.enh);
  const g = growth(cfg, it.lvl);
  switch (SLOT_MAIN[it.slot]) {
    case 'atk':
      return { atk: Math.round(G.atk0 * g * r) };
    case 'hp':
      return { hp: Math.round(G.hp0 * g * r) };
    case 'def':
      return { def: Math.round(G.def0 * g * r) };
    case 'haste':
      return { haste: Math.round((G.haste0 + G.hasteGrowth * it.lvl) * r * 1000) / 1000, hp: Math.round(G.hp0 * G.bootsHp * g * r) };
  }
}

/** Сила предмета — для сравнения «лучше/хуже» и «Надеть лучшее». */
export function itemPower(cfg: Config, it: Item): number {
  const m = itemMain(cfg, it);
  const g = growth(cfg, it.lvl);
  // доп. свойства переводим в «эквивалент атаки» уровня предмета
  const sub = it.subs.reduce((n, x) => n + x.v * SUB_WEIGHT[x.s], 0);
  const base = (m.atk ?? 0) * 4 + (m.hp ?? 0) * 0.4 + (m.def ?? 0) * 3 + (m.haste ?? 0) * 900 * g;
  return Math.round(base + sub * 900 * g + (it.set ? 120 * g : 0));
}
const SUB_WEIGHT: Record<string, number> = { atkPct: 1, hpPct: 0.8, defPct: 0.6, crit: 1.6, critDmg: 0.7, haste: 1.4, skillDmg: 0.9, lifesteal: 1.2 };

/** Где надет предмет: uid → герой и слот. */
export function equippedIndex(s: PlayerState): Record<string, { hero: string; slot: GearSlot }> {
  const out: Record<string, { hero: string; slot: GearSlot }> = {};
  for (const h of Object.values(s.heroines)) {
    for (const slot of GEAR_SLOTS) {
      const uid = h.gear[slot];
      if (uid) out[uid] = { hero: h.id, slot };
    }
  }
  return out;
}

/** Сколько вещей каждого сета надето на героя. */
export function setCounts(s: PlayerState, h: HeroState): Partial<Record<SetId, number>> {
  const out: Partial<Record<SetId, number>> = {};
  for (const slot of GEAR_SLOTS) {
    const it = h.gear[slot] ? s.items[h.gear[slot]!] : undefined;
    if (it?.set) out[it.set] = (out[it.set] ?? 0) + 1;
  }
  return out;
}

// ——— характеристики героя ———

export interface HeroBuild {
  stats: FinalStats;
  level: number;
  /** Сеты, собранные на 4 вещи. */
  sets4: SetId[];
  power: number;
}

/** Бонус Знамени Легиона (доля или минуты). */
export function bannerValue(s: Pick<PlayerState, 'banner'>, id: string): number {
  const def = BANNER_MAP[id];
  return def ? (s.banner[id] ?? 0) * def.per : 0;
}

export function heroStats(cfg: Config, s: PlayerState, id: string, mod?: HeroMod): HeroBuild {
  const h = s.heroines[id];
  const def = HEROINE_MAP[id];
  const cls = CLASSES[def.cls];
  const St = cfg.stat;
  const lvl = heroLevel(cfg, s, h);
  const g = growth(cfg, lvl) * Math.pow(cfg.hero.rankMult, h.rank - 1);
  let hp = cls.base.hp * g;
  let atk = cls.base.atk * g;
  let def_ = cls.base.def * g;
  let haste = 0;
  const pct = { atk: 0, hp: 0, def: 0 };
  let crit = St.critBase + (cls.base.crit ?? 0);
  let critDmg = St.critDmgBase + (cls.base.critDmg ?? 0);
  let skillDmg = 0;
  let lifesteal = 0;
  let heal = cls.base.heal ?? 0;
  let dmgRed = cls.base.dmgRed ?? 0;
  let energy = 0;
  // снаряжение
  for (const slot of GEAR_SLOTS) {
    const it = h.gear[slot] ? s.items[h.gear[slot]!] : undefined;
    if (!it) continue;
    const m = itemMain(cfg, it);
    atk += m.atk ?? 0;
    hp += m.hp ?? 0;
    def_ += m.def ?? 0;
    haste += m.haste ?? 0;
    for (const sub of it.subs) {
      switch (sub.s) {
        case 'atkPct':
          pct.atk += sub.v;
          break;
        case 'hpPct':
          pct.hp += sub.v;
          break;
        case 'defPct':
          pct.def += sub.v;
          break;
        case 'crit':
          crit += sub.v;
          break;
        case 'critDmg':
          critDmg += sub.v;
          break;
        case 'haste':
          haste += sub.v;
          break;
        case 'skillDmg':
          skillDmg += sub.v;
          break;
        case 'lifesteal':
          lifesteal += sub.v;
          break;
      }
    }
  }
  // сеты
  const counts = setCounts(s, h);
  const sets4: SetId[] = [];
  for (const set of SETS) {
    const n = counts[set.id] ?? 0;
    if (n >= 2) {
      const b = set.two;
      if (b.stat === 'atk') pct.atk += b.v;
      else if (b.stat === 'hp') pct.hp += b.v;
      else if (b.stat === 'haste') haste += b.v;
      else if (b.stat === 'crit') crit += b.v;
      else if (b.stat === 'heal') heal += b.v;
      else if (b.stat === 'skillDmg') skillDmg += b.v;
    }
    if (n >= 4) sets4.push(set.id);
  }
  if (sets4.includes('predator')) critDmg += 0.35;
  if (sets4.includes('gale')) energy += 0.25;
  // пассивки по рангу
  if (def.cls === 'knight' && h.rank >= 5) dmgRed += 0.1;
  if (def.cls === 'priestess' && h.rank >= 3) heal += 0.15;
  // Знамя, близость, облик и «Модный день»
  pct.atk += bannerValue(s, 'atk');
  pct.hp += bannerValue(s, 'hp');
  pct.def += bannerValue(s, 'def');
  const bond = (s.bond?.[id]?.lvl ?? 0) * BOND_STAT;
  let look = 0;
  if (h.skin && SKIN_MAP[h.skin]) {
    look += St.skinBonus;
    if (s.day?.key && fashionFits(h.skin, fashionOfDay(s.day.key))) look += St.fashionBonus;
  }
  pct.atk += bond + look;
  pct.hp += bond + look;
  pct.def += bond + look;
  // условия режима
  if (mod) {
    pct.atk += mod.atk ?? 0;
    pct.hp += mod.hp ?? 0;
    pct.def += mod.def ?? 0;
    haste += mod.haste ?? 0;
    heal += mod.heal ?? 0;
    skillDmg += mod.skillDmg ?? 0;
    energy += mod.energy ?? 0;
    dmgRed += mod.dmgRed ?? 0;
    crit += mod.crit ?? 0;
  }
  const stats: FinalStats = {
    hp: Math.max(1, Math.round(hp * (1 + pct.hp))),
    atk: Math.max(1, Math.round(atk * (1 + pct.atk))),
    def: Math.max(0, Math.round(def_ * (1 + pct.def))),
    haste: Math.min(St.hasteMax, round3(haste)),
    crit: Math.min(St.critMax, round3(crit)),
    critDmg: round3(critDmg),
    skillDmg: round3(skillDmg),
    lifesteal: Math.min(St.lifestealMax, round3(lifesteal)),
    heal: round3(heal),
    dmgRed: Math.min(St.dmgRedMax, round3(dmgRed)),
    energy: round3(energy),
    bossDmg: 0,
  };
  return { stats, level: lvl, sets4, power: statPower(stats) };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Сила бойца одним числом (для интерфейса и сравнения). */
export function statPower(st: FinalStats): number {
  const dps = st.atk * (1 + st.crit * st.critDmg) * (1 + st.haste) * (1 + st.skillDmg * 0.5);
  return Math.round(dps * 4 + st.hp * 0.4 + st.def * 3);
}

/** Легион в строю — все присоединившиеся герои в порядке ростера. */
export function activeParty(s: PlayerState): string[] {
  return ROSTER.filter((id) => s.heroines[id]);
}

export function partyPower(cfg: Config, s: PlayerState): number {
  return activeParty(s).reduce((n, id) => n + heroStats(cfg, s, id).power, 0);
}

/** Множитель силы врагов на первых этапах: от easeFrom на 1-м до 1 на easeUntil. */
export function enemyEase(cfg: Config, lvl: number): number {
  const E = cfg.enemy;
  if (lvl >= E.easeUntil) return 1;
  return E.easeFrom + ((1 - E.easeFrom) * Math.max(0, lvl - 1)) / (E.easeUntil - 1);
}

/** Рекомендуемая сила для этапа уровня n: шесть героев уровня n с редким снаряжением того же уровня. */
export function recommendedPower(cfg: Config, n: number): number {
  const g = growth(cfg, n) * enemyEase(cfg, n);
  // сколько героев уже в Легионе к этому этапу
  const heroes = Math.max(2, HEROINES.filter((h) => h.join < n).length);
  const rank = cfg.hero.rankCaps.findIndex((c) => c >= n) + 1 || cfg.hero.maxRank;
  const r = Math.pow(cfg.hero.rankMult, rank - 1);
  const G = cfg.gear;
  const atk = (100 * r + G.atk0 * G.rarityMult[2]) * g;
  const hp = (900 * r + G.hp0 * G.rarityMult[2] * 1.5) * g;
  const def = (40 * r + G.def0 * G.rarityMult[2]) * g;
  return Math.round(heroes * 0.85 * (atk * 1.1 * 4 + hp * 0.4 + def * 3));
}

export function inventoryCap(cfg: Config, s: PlayerState): number {
  return s.invCap || cfg.inventory.start;
}

/** Есть ли что улучшить у героя (для красных точек). */
export function heroCanUpgrade(cfg: Config, s: PlayerState, id: string): boolean {
  const h = s.heroines[id];
  if (!h) return false;
  const rc = rankCost(cfg, h.rank);
  if (rc && s.legion.lvl >= rankCap(cfg, h.rank) && s.cur.emblems >= rc.emblems && s.cur.gold >= rc.gold) return true;
  for (const lvl of [h.skill, h.ult]) {
    const c = skillCost(cfg, s, lvl);
    if (c && s.cur.books >= c.books && s.cur.gold >= c.gold) return true;
  }
  return false;
}

export { SET_MAP };

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Компактный формат больших чисел: 1.2K, 3.4M … затем aa, ab… */
export function formatNum(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  let v = Math.abs(n);
  if (v < 1000) return (neg ? '-' : '') + (v < 10 && v % 1 ? v.toFixed(1) : Math.floor(v).toString());
  let i = 0;
  while (v >= 1000 && i < 400) {
    v /= 1000;
    i++;
  }
  let suf: string;
  if (i < SUFFIXES.length) suf = SUFFIXES[i];
  else {
    const k = i - SUFFIXES.length;
    suf = String.fromCharCode(97 + (Math.floor(k / 26) % 26)) + String.fromCharCode(97 + (k % 26));
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return (neg ? '-' : '') + v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') + suf;
}
