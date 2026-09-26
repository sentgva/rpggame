import type { Config } from '../config';
import { ACTS, ELITE_AFFIX_MAP, CLASSES, ENEMY_MAP, HEROINE_MAP, ROLE_STATS, SKILL_MAP, STAGES_PER_DIFF, stageAffixes, type EnemyDef, type EnemyMod, type StageRef } from '../content';
import { Rng, mixSeed } from '../rng';
import type { ClassId, FinalStats, PlayerState, SpecialEffect, Stats } from '../types';
import type { SkillRef, UnitInit, UnitKind } from './battle';
import { buildHeroine } from './stats';

const MELEE: ClassId[] = ['guardian', 'berserker', 'assassin'];

export interface PartyOptions {
  extra?: Stats;
  extraFx?: SpecialEffect[];
  hp?: Record<string, number>;
}

/** Юниты отряда игрока по активному пресету (слоты 0–1 — передний ряд, 2–4 — задний). */
export function heroUnits(cfg: Config, s: PlayerState, slots: (string | null)[], opt: PartyOptions = {}): UnitInit[] {
  const party = slots.filter((x): x is string => !!x && !!s.heroines[x]);
  const out: UnitInit[] = [];
  slots.forEach((id, slot) => {
    if (!id || !s.heroines[id]) return;
    if (opt.hp && opt.hp[id] !== undefined && opt.hp[id] <= 0) return;
    const h = s.heroines[id];
    const b = buildHeroine(cfg, s, h, { party, extra: opt.extra, extraFx: opt.extraFx });
    const cls = CLASSES[b.cls];
    out.push({
      side: 0,
      slot,
      row: slot < 2 ? 'front' : 'back',
      kind: 'hero',
      ref: id,
      element: b.element,
      cls: b.cls,
      targeting: cls.targeting,
      melee: MELEE.includes(b.cls),
      stats: b.stats,
      basic: b.basic,
      skills: b.skills,
      ult: b.ult,
      fx: b.fx,
      lvl: h.lvl,
      stars: h.stars,
      hpPct: opt.hp?.[id],
    });
  });
  return out;
}

/** Модификатор режима к врагам: множители здоровья, атаки, защиты и скорости. */
export function modEnemies(units: UnitInit[], m?: EnemyMod): UnitInit[] {
  if (!m) return units;
  return units.map((u) => ({
    ...u,
    stats: {
      ...u.stats,
      hp: Math.round(u.stats.hp * (m.hp ?? 1)),
      atk: Math.round(u.stats.atk * (m.atk ?? 1)),
      def: Math.round(u.stats.def * (m.def ?? 1)),
      spd: Math.round(u.stats.spd * (m.spd ?? 1)),
    },
  }));
}

export function diffOfGlobal(n: number): number {
  return Math.max(0, Math.min(2, Math.floor((n - 1) / STAGES_PER_DIFF)));
}

export function difficultyMultForGlobal(cfg: Config, n: number): number {
  return cfg.enemy.difficultyMult[diffOfGlobal(n)];
}

/** Сколько «этапов роста» даёт множитель сложности: ×25 ≈ 37 этапов, ×400 ≈ 70. */
function diffLevels(cfg: Config, d: number): number {
  return Math.log(cfg.enemy.difficultyMult[d] ?? 1) / Math.log(cfg.enemy.hpGrowth);
}

/**
 * Уровень силы врагов сквозного этапа n: номер этапа внутри сложности + эквивалент
 * множителя сложности. HP0·1.09^n·×25 ≡ HP0·1.09^(n+37), поэтому Hard 1-1 ≈ Normal 2-18,
 * а Normal 10-20 = 200, Hard 10-20 ≈ 237, Nightmare 10-20 ≈ 270. На этом уровне строятся
 * враги, доход и уровень выпадающих предметов.
 */
export function powerLevel(cfg: Config, n: number): number {
  const d = diffOfGlobal(n);
  return n - d * cfg.enemy.difficultyOffset + diffLevels(cfg, d);
}

/** Обратное к powerLevel: самый ранний сквозной этап с врагами уровня lvl (для подписей «≈ этап»). */
export function stageForLevel(cfg: Config, lvl: number): number {
  for (let d = 0; d < 3; d++) {
    const n = Math.round(lvl + d * cfg.enemy.difficultyOffset - diffLevels(cfg, d));
    if (n <= (d + 1) * STAGES_PER_DIFF || d === 2) return Math.max(1, Math.min(3 * STAGES_PER_DIFF, n));
  }
  return 1;
}

export type EnemyTier = 'normal' | 'elite' | 'mini' | 'boss';

/** Характеристики врага уровня силы L: HP = HP0·1.09^L, ATK = ATK0·1.08^L. */
export function enemyStats(cfg: Config, L: number, def: EnemyDef, tier: EnemyTier, mult = 1): FinalStats {
  const E = cfg.enemy;
  const role = ROLE_STATS[def.role];
  let hpM = 1;
  let atkM = 1;
  if (tier !== 'normal') {
    hpM = E.bossHp;
    atkM = E.bossAtk;
    if (tier === 'mini') {
      hpM *= E.miniMult;
      atkM *= Math.sqrt(E.miniMult);
    }
    if (tier === 'boss') {
      hpM *= E.actBossMult;
      atkM *= Math.sqrt(E.actBossMult);
    }
  }
  const hp = E.hp0 * Math.pow(E.hpGrowth, L) * mult * role.hp * hpM;
  const atk = E.atk0 * Math.pow(E.atkGrowth, L) * mult * role.atk * atkM;
  const def0 = E.def0 * Math.pow(E.defGrowth, L) * role.def;
  const n = L;
  return {
    hp: Math.max(1, Math.round(hp)),
    atk: Math.max(1, Math.round(atk)),
    def: Math.round(def0),
    spd: Math.round(role.spd + Math.min(40, n / 7)),
    crit: 0.05 + Math.min(0.2, n / 1500),
    critDmg: 1.5,
    acc: Math.min(0.3, n / 1000),
    eva: def.role === 'rogue' ? 0.05 : 0,
    pen: Math.min(0.3, n / 1000),
    lifesteal: 0,
    healPower: 1,
    resist: Math.min(0.4, n / 700) + (tier === 'boss' ? 0.1 : 0),
    energyRegen: tier === 'normal' ? 1 : 1.2,
    bonus: {},
  };
}

function enemySkillRefs(def: EnemyDef): { basic: SkillRef; skills: SkillRef[]; ult?: SkillRef } {
  const basic: SkillRef = { id: def.role === 'rogue' ? 'enemy.basicBack' : 'enemy.basic', rank: 1, mods: [] };
  const skills: SkillRef[] = [];
  let ult: SkillRef | undefined;
  for (const id of def.skills) {
    const sk = SKILL_MAP[id];
    if (!sk) continue;
    if (sk.kind === 'ult') ult = { id, rank: 1, mods: [] };
    else skills.push({ id, rank: 1, mods: [] });
  }
  return { basic, skills, ult };
}

export function enemyUnit(cfg: Config, L: number, id: string, slot: number, tier: EnemyTier, mult = 1): UnitInit {
  const def = ENEMY_MAP[id];
  const role = ROLE_STATS[def.role];
  const kind: UnitKind = tier === 'normal' ? 'enemy' : tier === 'boss' ? 'boss' : 'mini';
  const refs = enemySkillRefs(def);
  // элитные и мини-боссы получают доступ к ультимейту-«ярости»
  if (!refs.ult && tier !== 'normal') refs.ult = { id: def.role === 'healer' ? 'mb.heal' : 'mb.storm', rank: 1, mods: [] };
  return {
    side: 1,
    slot,
    row: tier === 'normal' ? role.row : 'front',
    kind,
    ref: id,
    element: def.element,
    targeting: def.role === 'rogue' ? 'back' : def.role === 'healer' ? 'healer' : 'nearest',
    melee: def.role === 'tank' || def.role === 'brute' || def.role === 'rogue',
    stats: enemyStats(cfg, L, def, tier, mult),
    basic: refs.basic,
    skills: refs.skills,
    ult: tier === 'normal' ? undefined : refs.ult,
    fx: [],
    mechanic: tier === 'boss' ? def.mechanic : undefined,
    act: def.act,
    lvl: Math.max(1, Math.round(L)),
  };
}

/** Раскладка врагов по слотам: сначала передний ряд. */
function arrange(cfg: Config, L: number, list: { id: string; tier: EnemyTier }[], mult = 1): UnitInit[] {
  const front = list.filter((x) => x.tier !== 'normal' || ROLE_STATS[ENEMY_MAP[x.id].role].row === 'front');
  const back = list.filter((x) => !front.includes(x));
  const out: UnitInit[] = [];
  let slot = 0;
  for (const x of front) out.push(enemyUnit(cfg, L, x.id, slot++, x.tier, mult));
  for (const x of back) out.push(enemyUnit(cfg, L, x.id, slot++, x.tier, mult));
  return out;
}

/** Состав волны (детерминированно от этапа и номера волны). */
export function waveComposition(cfg: Config, ref: StageRef, wave: number): string[] {
  const act = ACTS[ref.act - 1];
  const rng = new Rng(mixSeed(ref.diff, ref.idx, wave, 0x77));
  const sizes = cfg.enemy.waveSizes;
  let count = sizes[Math.min(sizes.length - 1, wave)];
  if (ref.idx <= 2) count = Math.min(count, 2 + wave);
  const front = act.enemies.filter((id) => ROLE_STATS[ENEMY_MAP[id].role].row === 'front');
  const ids: string[] = [rng.pick(front)];
  while (ids.length < count) ids.push(rng.pick(act.enemies));
  return ids;
}

export function waveUnits(cfg: Config, ref: StageRef, wave: number): UnitInit[] {
  return arrange(
    cfg,
    powerLevel(cfg, ref.n),
    waveComposition(cfg, ref, wave).map((id) => ({ id, tier: 'normal' as EnemyTier })),
  );
}

/** Босс этапа: элитный враг (обычный этап), мини-босс (каждый 5-й) или владычица (20-й) + свита. */
export function bossUnits(cfg: Config, ref: StageRef): UnitInit[] {
  const act = ACTS[ref.act - 1];
  const rng = new Rng(mixSeed(ref.diff, ref.idx, 0xb055));
  let boss: { id: string; tier: EnemyTier };
  if (ref.kind === 'boss') boss = { id: act.boss, tier: 'boss' };
  else if (ref.kind === 'mini') boss = { id: act.minis[ref.stage / 5 - 1], tier: 'mini' };
  else boss = { id: rng.pick(act.enemies), tier: 'elite' };
  const adds = [rng.pick(act.enemies), rng.pick(act.enemies)];
  const units = arrange(cfg, powerLevel(cfg, ref.n), [boss, ...adds.map((id) => ({ id, tier: 'normal' as EnemyTier }))]);
  const affixes = stageAffixes(ref);
  return units.map((u) => (u.ref === boss.id && u.kind !== 'enemy' ? withAffixes(u, affixes) : u));
}

/** Свойства элиты: характеристики и особые эффекты поверх обычного босса. */
export function withAffixes(u: UnitInit, ids: string[]): UnitInit {
  if (!ids.length) return u;
  const st = { ...u.stats };
  const fx = [...u.fx];
  for (const id of ids) {
    const a = ELITE_AFFIX_MAP[id];
    if (!a) continue;
    if (a.hp) st.hp = Math.round(st.hp * a.hp);
    if (a.atk) st.atk = Math.round(st.atk * a.atk);
    if (a.def) st.def = Math.round(st.def * a.def);
    st.spd += a.spd ?? 0;
    st.lifesteal += a.lifesteal ?? 0;
    st.crit += a.crit ?? 0;
    st.critDmg += a.critDmg ?? 0;
    if (a.fx) fx.push(a.fx);
  }
  return { ...u, stats: st, fx };
}

/** Произвольный отряд врагов уровня силы L (подземелья, Башня, Бездна, Лабиринт). */
export function customEnemies(cfg: Config, n: number, list: { id: string; tier: EnemyTier }[], mult = 1): UnitInit[] {
  return arrange(cfg, n, list, mult);
}

export { HEROINE_MAP };
