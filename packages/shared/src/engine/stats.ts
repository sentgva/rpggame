import type { Config } from '../config';
import {
  ASC_MAP,
  CLASSES,
  CONSTELLATIONS,
  GEM_STATS,
  HEROINE_MAP,
  LEGENDARY_MAP,
  MAIN_BASE,
  MYTHIC_MAP,
  SET_MAP,
  SKIN_MAP,
  TREES,
  parseGem,
} from '../content';
import type { SkillMod } from '../content/effects';
import type {
  ClassId,
  Element,
  EquipSlot,
  FinalStats,
  HeroRarity,
  HeroineState,
  Item,
  PlayerState,
  SpecialEffect,
  StatKey,
  Stats,
} from '../types';
import { EQUIP_SLOTS } from '../types';

export function addStats(target: Stats, src: Stats | undefined, mult = 1): Stats {
  if (!src) return target;
  for (const k in src) {
    const key = k as StatKey;
    target[key] = (target[key] ?? 0) + (src[key] ?? 0) * mult;
  }
  return target;
}

// ——— уровни и опыт ———

export function levelCap(cfg: Config, h: Pick<HeroineState, 'stars' | 'awakened'>): number {
  if (h.awakened) return cfg.hero.awakenCap;
  const caps = cfg.hero.levelCaps;
  return caps[Math.max(0, Math.min(caps.length - 1, h.stars - 1))];
}

/** Опыт до следующего уровня: XP(L) = 100·L^2.2 */
export function xpToNext(cfg: Config, lvl: number): number {
  return Math.floor(cfg.hero.xpBase * Math.pow(lvl, cfg.hero.xpExp));
}

export function goldToNext(cfg: Config, lvl: number): number {
  return Math.floor(cfg.hero.goldBase * Math.pow(lvl, cfg.hero.goldExp));
}

export function accountXpToNext(cfg: Config, lvl: number): number {
  return Math.floor(cfg.account.xpBase * Math.pow(lvl, cfg.account.xpExp));
}

export function maxStars(cfg: Config, rarity: HeroRarity): number {
  return cfg.hero.maxStars[rarity];
}

// ——— предметы ———

/** Кривая роста основных характеристик предмета от уровня. */
export function gearCurve(cfg: Config, lvl: number, stat: StatKey): number {
  return Math.pow(stat === 'def' ? cfg.gear.defGrowth : cfg.gear.growth, lvl);
}

export function isExpStat(stat: StatKey): boolean {
  return stat === 'hp' || stat === 'atk' || stat === 'def';
}

/** Основная характеристика с учётом заточки. */
export function itemMainValue(cfg: Config, item: Item): number {
  const exp = isExpStat(item.main.stat);
  const step = exp ? cfg.gear.enhanceStep : cfg.gear.enhanceStep * 0.4;
  const v = item.main.v * (1 + step * item.enh);
  return exp ? Math.round(v) : v;
}

/** Все характеристики, которые даёт предмет (основная + аффиксы + камни). */
export function itemStats(cfg: Config, item: Item): Stats {
  const s: Stats = {};
  s[item.main.stat] = itemMainValue(cfg, item);
  for (const a of item.affixes) addStats(s, { [statOfAffix(a.id)]: a.v });
  for (const g of item.gems) {
    if (!g) continue;
    const { type, lvl } = parseGem(g);
    const gs = GEM_STATS[type];
    addStats(s, { [gs.stat]: gs.values[lvl - 1] ?? 0 });
  }
  return s;
}

function statOfAffix(id: string): StatKey {
  return id as StatKey;
}

export function itemFx(item: Item): SpecialEffect | null {
  if (!item.fx) return null;
  const leg = LEGENDARY_MAP[item.fx];
  if (leg) return leg.fx;
  const myth = MYTHIC_MAP[item.fx];
  if (myth) return { id: 'classMod', s: myth.id };
  return null;
}

/** Грубая «сила» предмета для авто-экипировки и стрелок сравнения. */
export function itemPower(cfg: Config, item: Item): number {
  const s = itemStats(cfg, item);
  let p = statsPower(s, 1);
  if (item.fx) p *= 1.15;
  if (item.set) p *= 1.05;
  return Math.round(p);
}

/** Весовая оценка набора характеристик (для сравнения предметов). */
export function statsPower(s: Stats, scale: number): number {
  let p = 0;
  p += (s.atk ?? 0) * 6;
  p += (s.hp ?? 0) * 0.5;
  p += (s.def ?? 0) * 3;
  p += (s.spd ?? 0) * 60 * scale;
  const pctW = 900 * scale;
  p += ((s.atkPct ?? 0) * 1.2 + (s.hpPct ?? 0) + (s.defPct ?? 0) * 0.8) * pctW;
  p += ((s.crit ?? 0) * 1.5 + (s.critDmg ?? 0) * 0.6 + (s.pen ?? 0) * 1.4 + (s.lifesteal ?? 0) + (s.eva ?? 0) + (s.acc ?? 0) * 0.6) * pctW;
  p += ((s.healPower ?? 0) * 0.5 + (s.resist ?? 0) * 0.6 + (s.energyRegen ?? 0) * 0.9 + (s.dmgReduce ?? 0) * 2) * pctW;
  p +=
    ((s.dmgFire ?? 0) + (s.dmgNature ?? 0) + (s.dmgWater ?? 0) + (s.dmgLight ?? 0) + (s.dmgDark ?? 0) + (s.dmgBoss ?? 0) + (s.dmgSkill ?? 0) + (s.dmgUlt ?? 0) + (s.dmgBasic ?? 0) + (s.dmgDot ?? 0) + (s.shieldPower ?? 0)) *
    0.5 *
    pctW;
  p += ((s.goldPct ?? 0) + (s.xpPct ?? 0) + (s.lootDouble ?? 0) * 3) * 0.3 * pctW;
  p += (s.skillRank ?? 0) * 300 * scale;
  return p;
}

// ——— героиня ———

export interface SkillSlot {
  id: string;
  rank: number;
  mods: { mod: SkillMod; rank: number }[];
}

export interface HeroBuild {
  id: string;
  cls: ClassId;
  element: Element;
  rarity: HeroRarity;
  lvl: number;
  stars: number;
  stats: FinalStats;
  power: number;
  fx: SpecialEffect[];
  basic: SkillSlot;
  skills: SkillSlot[];
  ult: SkillSlot;
  /** Все бонусы (для отображения). */
  raw: Stats;
  sets: Record<string, number>;
}

export interface BuildContext {
  /** Состав отряда для бонусов синергии. */
  party?: string[];
  /** Доп. характеристики (реликвии лабиринта и т. д.). */
  extra?: Stats;
  extraFx?: SpecialEffect[];
}

const AWAKEN_FX: Record<ClassId, SpecialEffect> = {
  guardian: { id: 'startShield', v: 0.4 },
  berserker: { id: 'killStack', v: 0.15, n: 5 },
  archer: { id: 'doubleStrike', v: 0.35 },
  sorceress: { id: 'echo', n: 3 },
  priestess: { id: 'guardianAngel' },
  necromancer: { id: 'summonOnAllyDeath', n: 4 },
  assassin: { id: 'execute', v: 0.6 },
  bard: { id: 'startEnergy', n: 50 },
};

/** Бонусы созвездия аккаунта (для всего отряда). */
export function constellationStats(stars: number): { stats: Stats; offline: number; loot: number; inv: number; capHours: number } {
  const stats: Stats = {};
  let offline = 0,
    loot = 0,
    inv = 0,
    capHours = 0;
  CONSTELLATIONS.forEach((c, i) => {
    const n = Math.max(0, Math.min(20, stars - i * 20));
    if (n <= 0) return;
    addStats(stats, c.perStar, n);
    offline += (c.special?.offline ?? 0) * n;
    loot += (c.special?.loot ?? 0) * n;
    inv += (c.special?.inv ?? 0) * n;
    capHours += (c.special?.capHours ?? 0) * n;
  });
  return { stats, offline, loot, inv, capHours };
}

export function ascensionValue(s: PlayerState, id: string): number {
  const def = ASC_MAP[id];
  return def ? (s.ascension.up[id] ?? 0) * def.per : 0;
}

/** Очки навыков героини: 1 за уровень + 1 за 10 звёзд созвездия + награды за боссов актов. */
export function skillPoints(s: PlayerState, h: HeroineState): number {
  const bossPts = Math.min(10, Math.floor(s.progress.maxGlobalEver / 20));
  return h.lvl + Math.floor(s.constellation / 10) + bossPts;
}

export function spentPoints(h: HeroineState): number {
  let n = 0;
  for (const k in h.tree) n += h.tree[k];
  return n;
}

export function branchPoints(h: HeroineState, cls: ClassId, branch: number): number {
  let n = 0;
  for (const node of TREES[cls]) if (node.branch === branch) n += h.tree[node.id] ?? 0;
  return n;
}

export function ultRank(h: HeroineState): number {
  return Math.min(7, Math.max(1, h.stars) + (h.awakened ? 1 : 0));
}

export function buildHeroine(cfg: Config, s: PlayerState, h: HeroineState, ctx: BuildContext = {}): HeroBuild {
  const def = HEROINE_MAP[h.id];
  const cls = CLASSES[def.cls];
  const rarityMult = cfg.stat.rarityMult[def.rarity];
  const lvlMult = 1 + cfg.stat.levelGrowth * (h.lvl - 1);
  const starMult = 1 + cfg.stat.starGrowth * (h.stars - 1);
  const m = rarityMult * lvlMult * starMult;

  const add: Stats = {};
  const fx: SpecialEffect[] = [];
  const sets: Record<string, number> = {};

  // снаряжение
  for (const slot of EQUIP_SLOTS) {
    const uid = h.gear[slot];
    const item = uid ? s.items[uid] : undefined;
    if (!item) continue;
    addStats(add, itemStats(cfg, item));
    if (item.set) sets[item.set] = (sets[item.set] ?? 0) + 1;
    const f = itemFx(item);
    if (f) fx.push(f);
  }
  for (const [setId, count] of Object.entries(sets)) {
    const set = SET_MAP[setId];
    if (!set) continue;
    if (count >= 2) addStats(add, set.bonus2);
    if (count >= 4) {
      addStats(add, set.bonus4);
      if (set.fx4) fx.push(set.fx4);
    }
    if (count >= 6) {
      addStats(add, set.bonus6);
      fx.push(set.fx6);
    }
  }

  // древо навыков
  const treeMods: { mod: SkillMod; rank: number }[] = [];
  const learnedSkills = new Map<string, number>();
  for (const node of TREES[def.cls]) {
    const r = h.tree[node.id] ?? 0;
    if (r <= 0) continue;
    if (node.kind === 'passive') addStats(add, node.stats, r);
    else if (node.kind === 'key' && node.fx) fx.push(node.fx);
    else if (node.kind === 'active' && node.skill) learnedSkills.set(node.skill, r);
    else if (node.kind === 'mod' && node.mod) treeMods.push({ mod: node.mod, rank: r });
  }

  // специализация, пробуждение, облик
  let ultId = cls.ult;
  if (h.spec) {
    const spec = cls.specs[h.spec === 'A' ? 0 : 1];
    ultId = spec.ult;
    addStats(add, spec.passive);
    if (spec.fx) fx.push(spec.fx);
  }
  if (h.awakened) {
    addStats(add, { hpPct: 0.2, atkPct: 0.2, defPct: 0.2 });
    fx.push(AWAKEN_FX[def.cls]);
  }
  if (h.skin && SKIN_MAP[h.skin]) {
    const b = cfg.stat.skinBonus;
    addStats(add, { hpPct: b, atkPct: b, defPct: b });
  }

  // общие бонусы аккаунта
  addStats(add, constellationStats(s.constellation).stats);
  addStats(add, {
    atkPct: ascensionValue(s, 'atk'),
    hpPct: ascensionValue(s, 'hp'),
    crit: ascensionValue(s, 'crit'),
  });

  // синергия отряда
  if (ctx.party) {
    const members = ctx.party.map((id) => HEROINE_MAP[id]).filter(Boolean);
    const sameElem = members.filter((x) => x.element === def.element).length;
    if (sameElem >= 3) addStats(add, { atkPct: 0.1 });
    const sameCls = members.filter((x) => x.cls === def.cls).length;
    if (sameCls >= 2) addStats(add, cls.synergy);
    // синергия других классов, у которых ≥2 героини, действует на весь отряд
    const counts: Record<string, number> = {};
    for (const x of members) counts[x.cls] = (counts[x.cls] ?? 0) + 1;
    for (const [c, n] of Object.entries(counts)) if (n >= 2 && c !== def.cls) addStats(add, CLASSES[c as ClassId].synergy);
  }
  addStats(add, ctx.extra);
  if (ctx.extraFx) fx.push(...ctx.extraFx);

  const base = cls.base;
  const stats: FinalStats = {
    hp: Math.round((base.hp * m + (add.hp ?? 0)) * (1 + (add.hpPct ?? 0))),
    atk: Math.round((base.atk * m + (add.atk ?? 0)) * (1 + (add.atkPct ?? 0))),
    def: Math.round((base.def * m + (add.def ?? 0)) * (1 + (add.defPct ?? 0))),
    spd: Math.round(base.spd + (add.spd ?? 0)),
    crit: cfg.stat.critBase + (base.crit ?? 0) + (add.crit ?? 0),
    critDmg: cfg.stat.critDmgBase + (base.critDmg ?? 0) + (add.critDmg ?? 0),
    acc: add.acc ?? 0,
    eva: add.eva ?? 0,
    pen: add.pen ?? 0,
    lifesteal: add.lifesteal ?? 0,
    healPower: 1 + (base.healPower ?? 0) + (add.healPower ?? 0),
    resist: add.resist ?? 0,
    energyRegen: 1 + (add.energyRegen ?? 0),
    bonus: pickBonus(add),
  };

  // умения
  const rankBonus = Math.min(3, Math.floor(add.skillRank ?? 0));
  const modsFor = (skillId: string) => treeMods.filter((x) => x.mod.skill === skillId);
  const classMods = fx
    .filter((f) => f.id === 'classMod' && f.s)
    .map((f) => MYTHIC_MAP[f.s!])
    .filter((x) => x && x.cls === def.cls);
  const basicMods = classMods.filter((x) => x.target === 'basic').map((x) => ({ mod: { ...x.mod, skill: cls.basic }, rank: 1 }));
  const ultMods = classMods.filter((x) => x.target === 'ult').map((x) => ({ mod: { ...x.mod, skill: ultId }, rank: 1 }));

  const skills: SkillSlot[] = [];
  for (const sid of h.skills) {
    if (!sid) continue;
    const r = learnedSkills.get(sid);
    if (!r) continue;
    skills.push({ id: sid, rank: Math.min(8, r + rankBonus), mods: modsFor(sid) });
  }

  const build: HeroBuild = {
    id: h.id,
    cls: def.cls,
    element: def.element,
    rarity: def.rarity,
    lvl: h.lvl,
    stars: h.stars,
    stats,
    power: 0,
    fx: fx.filter((f) => f.id !== 'classMod'),
    basic: { id: cls.basic, rank: 1, mods: basicMods },
    skills,
    ult: { id: ultId, rank: ultRank(h) + rankBonus, mods: ultMods },
    raw: add,
    sets,
  };
  build.power = heroPower(build);
  return build;
}

const BONUS_KEYS: StatKey[] = [
  'dmgFire',
  'dmgNature',
  'dmgWater',
  'dmgLight',
  'dmgDark',
  'dmgBoss',
  'dmgSkill',
  'dmgUlt',
  'dmgBasic',
  'dmgDot',
  'dmgReduce',
  'shieldPower',
  'goldPct',
  'xpPct',
  'lootDouble',
  'skillRank',
];
function pickBonus(add: Stats): Stats {
  const b: Stats = {};
  for (const k of BONUS_KEYS) if (add[k]) b[k] = add[k];
  return b;
}

/** Сила героини — единая метрика для UI, авто-экипировки и подбора соперников. */
export function heroPower(b: Pick<HeroBuild, 'stats' | 'skills' | 'fx'>): number {
  const st = b.stats;
  const crit = Math.min(0.8, st.crit);
  const offense = st.atk * (1 + crit * (st.critDmg - 1)) * (st.spd / 100) * (1 + (st.bonus.dmgSkill ?? 0) * 0.3);
  const defense = st.hp * 0.5 + st.def * 3;
  const extras = 1 + b.skills.length * 0.06 + b.fx.length * 0.03;
  return Math.round((offense * 6 + defense) * extras);
}

export function heroEquipSlotFor(item: Item): EquipSlot[] {
  if (item.slot === 'ring') return ['ring1', 'ring2'];
  return [item.slot as EquipSlot];
}

/** Обратный индекс: какой героиней надет предмет. */
export function equippedIndex(s: PlayerState): Record<string, { hero: string; slot: EquipSlot }> {
  const idx: Record<string, { hero: string; slot: EquipSlot }> = {};
  for (const h of Object.values(s.heroines)) {
    for (const slot of EQUIP_SLOTS) {
      const uid = h.gear[slot];
      if (uid) idx[uid] = { hero: h.id, slot };
    }
  }
  return idx;
}

export function activeParty(s: PlayerState): string[] {
  const preset = s.party.presets[s.party.active] ?? [];
  return preset.filter((x): x is string => !!x && !!s.heroines[x]);
}

export function partyPower(cfg: Config, s: PlayerState): number {
  const party = activeParty(s);
  return party.reduce((sum, id) => sum + buildHeroine(cfg, s, s.heroines[id], { party }).power, 0);
}

export function partySlots(cfg: Config, s: PlayerState): number {
  let n = 1;
  for (const [lvl, slots] of cfg.account.partySlots) if (s.account.lvl >= lvl) n = slots;
  return n;
}

export function inventoryCap(cfg: Config, s: PlayerState): number {
  return Math.min(cfg.inventory.max, s.invCap + constellationStats(s.constellation).inv);
}

export { MAIN_BASE };
