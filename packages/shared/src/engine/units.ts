import type { Config } from '../config';
import {
  ACTS,
  CLASSES,
  ENEMY_MAP,
  ENEMY_SKILLS,
  HEAVY_BY_ELEMENT,
  HEROINE_MAP,
  ROLE_STATS,
  passiveTier,
  stageRef,
  type EnemyDef,
  type EnemyMod,
  type HeroMod,
  type StageRef,
} from '../content';
import { Rng, mixSeed } from '../rng';
import type { FinalStats, PlayerState } from '../types';
import { combatStats, type CombatUnitInit, type SkillSlot } from './combat';
import { growth, heroStats, skillPower } from './stats';

/** Ряды на экране: соседи по строю не стоят друг на друге. */
const HERO_LANES = [1, 0, 2, 1, 2, 0];

/** Бойцы Легиона для боя. */
export function heroUnits(cfg: Config, s: PlayerState, party: string[], opt: { mod?: HeroMod } = {}): CombatUnitInit[] {
  return party.map((id, i) => {
    const h = s.heroines[id];
    const cls = CLASSES[HEROINE_MAP[id].cls];
    const b = heroStats(cfg, s, id, opt.mod);
    return {
      side: 0,
      ref: id,
      kind: 'hero',
      cls: cls.id,
      stats: b.stats,
      x: cls.x,
      lane: HERO_LANES[i % HERO_LANES.length],
      range: cls.range,
      speed: cls.speed,
      interval: cls.interval,
      splash: cls.splash,
      skills: [{ def: cls.skill, power: skillPower(cfg, h.skill) }],
      ult: { def: cls.ult, power: skillPower(cfg, h.ult) },
      passive: passiveTier(h.rank),
      sets4: b.sets4,
      leap: cls.id === 'assassin',
      lvl: b.level,
      rank: h.rank,
    };
  });
}

export type EnemyTier = 'normal' | 'elite' | 'mini' | 'boss';

/** Характеристики врага уровня lvl. */
export function enemyStats(cfg: Config, def: EnemyDef, lvl: number, tier: EnemyTier): FinalStats {
  const E = cfg.enemy;
  const r = ROLE_STATS[def.role];
  const g = Math.pow(E.growth, Math.max(0, lvl - 1));
  const k =
    tier === 'boss' ? { hp: E.bossHp, atk: E.bossAtk } : tier === 'mini' ? { hp: E.miniHp, atk: E.miniAtk } : tier === 'elite' ? { hp: E.eliteHp, atk: E.eliteAtk } : { hp: 1, atk: 1 };
  return combatStats({
    hp: E.hp0 * r.hp * g * k.hp,
    atk: E.atk0 * r.atk * g * k.atk,
    def: E.def0 * r.def * g,
    crit: 0.05,
    critDmg: 0.5,
    dmgRed: tier === 'boss' ? 0.1 : 0,
  });
}

/** Боец-враг. x — где он встанет в строю (приходит из-за правого края). */
export function enemyUnit(cfg: Config, id: string, lvl: number, tier: EnemyTier, i = 0, opt: { delay?: number; walkIn?: boolean } = {}): CombatUnitInit {
  const def = ENEMY_MAP[id];
  const r = ROLE_STATS[def.role];
  const skills: SkillSlot[] = [];
  let heavy: CombatUnitInit['heavy'];
  const sk = (sid: string) => ENEMY_SKILLS[sid];
  if (def.kind === 'boss' && def.skills.length) {
    // владычицы и колоссы: два умения и «Сокрушительный удар» (последнее в списке)
    for (const sid of def.skills.slice(0, -1)) if (sk(sid) && sk(sid).kind === 'skill') skills.push({ def: sk(sid), power: 1 });
    const ult = def.skills[def.skills.length - 1];
    heavy = { s: sk(ult)?.kind === 'ult' ? ult : HEAVY_BY_ELEMENT[def.element], every: 11000, first: 7000 };
  } else {
    const role = sk(`enemy.${def.role}`);
    if (role) skills.push({ def: role, power: 1 });
    if (def.kind === 'mini' && def.skills[1] && sk(def.skills[1])) skills.push({ def: sk(def.skills[1]), power: 1 });
    if (tier === 'mini' || tier === 'boss') heavy = { s: HEAVY_BY_ELEMENT[def.element], every: 13000, first: 8000 };
    else if (tier === 'elite') heavy = { s: HEAVY_BY_ELEMENT[def.element], every: 15000, first: 9000 };
  }
  const big = tier === 'boss' || tier === 'mini';
  const x = r.x + (i % 3) * 3 - (big ? 4 : 0);
  return {
    side: 1,
    ref: id,
    kind: tier === 'normal' ? 'enemy' : tier,
    role: def.role,
    stats: enemyStats(cfg, def, lvl, tier),
    x: opt.walkIn === false ? x : x + 30,
    lane: big ? 1 : [1, 0, 2][i % 3],
    range: r.range,
    speed: r.speed,
    interval: r.interval,
    skills,
    heavy,
    mech: tier === 'boss' ? def.mechanic : undefined,
    leap: def.role === 'rogue' && !big,
    delay: opt.delay,
    ccImmune: big,
    lvl,
  };
}

/** Состав волны этапа: 3/4/5 врагов акта, хотя бы один в ближнем бою. */
export function waveUnits(cfg: Config, ref: StageRef, wave: number): CombatUnitInit[] {
  const act = ACTS[ref.act - 1];
  const rng = new Rng(mixSeed(ref.n, wave, 0x3a7e));
  const size = cfg.enemy.waveSizes[Math.min(wave, cfg.enemy.waveSizes.length - 1)];
  const front = act.enemies.filter((id) => ['tank', 'brute'].includes(ENEMY_MAP[id].role));
  const ids = [rng.pick(front)];
  while (ids.length < size) ids.push(rng.pick(act.enemies));
  return ids.map((id, i) => enemyUnit(cfg, id, ref.n, 'normal', i, { delay: i * 250 }));
}

/** Страж этапа: элита акта (обычный этап), мини-босс (5, 10, 15) или владычица (20) — со свитой. */
export function guardianUnits(cfg: Config, ref: StageRef): CombatUnitInit[] {
  const act = ACTS[ref.act - 1];
  const rng = new Rng(mixSeed(ref.n, 0x6a7d));
  let lead: CombatUnitInit;
  if (ref.kind === 'boss') lead = enemyUnit(cfg, act.boss, ref.n, 'boss', 0);
  else if (ref.kind === 'mini') lead = enemyUnit(cfg, act.minis[ref.stage / 5 - 1], ref.n, 'mini', 0);
  else lead = enemyUnit(cfg, rng.pick(act.enemies), ref.n, 'elite', 0);
  const escort = act.enemies.filter((id) => id !== lead.ref);
  const adds = [rng.pick(escort), rng.pick(escort)].map((id, i) => enemyUnit(cfg, id, ref.n, 'normal', i + 1, { delay: 400 + i * 300 }));
  return [lead, ...adds];
}

/** Враги по списку (режимы и праздники). */
export function customEnemies(cfg: Config, lvl: number, list: { id: string; tier?: EnemyTier }[]): CombatUnitInit[] {
  return list.map((e, i) => enemyUnit(cfg, e.id, lvl, e.tier ?? 'normal', i, { delay: i * 200 }));
}

/** Применить условие режима к врагам. */
export function modEnemies(units: CombatUnitInit[], mod?: EnemyMod): CombatUnitInit[] {
  if (!mod) return units;
  return units.map((u) => ({
    ...u,
    stats: {
      ...u.stats,
      hp: Math.round(u.stats.hp * (mod.hp ?? 1)),
      atk: Math.round(u.stats.atk * (mod.atk ?? 1)),
      def: Math.round(u.stats.def * (mod.def ?? 1)),
      haste: u.stats.haste + (mod.haste ? mod.haste - 1 : 0),
    },
  }));
}

/** Уровень врагов этапа (для подписи «рекомендуемая сила» и наград). */
export function stageLevel(n: number): number {
  return stageRef(n).n;
}
