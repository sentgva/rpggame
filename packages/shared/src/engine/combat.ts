/**
 * «Живой бой» — детерминированный симулятор реального времени (шаг 100 мс).
 * Один и тот же код работает на клиенте (показ и ручное управление) и на сервере (проверка):
 * при одинаковых seed, составе и командах результат совпадает.
 *
 * Поле — линия 0…100: герои слева, враги приходят справа. Каждый боец бежит к цели до своей
 * дальности и бьёт с интервалом; умения перезаряжаются сами, ульты копят энергию.
 * Ульты в окне цепи складываются в «Цепь Легиона», пары героев в цепи запускают связки,
 * «Сокрушительные удары» боссов парирует щит Рыцаря.
 */
import type { Config } from '../config';
import { COMBO_MASTERY_STEP, ENEMY_SKILLS, comboOf, type BossMechanic, type ComboDef, type DotKind, type EnemyRole, type Fx, type SkillDef, type TargetRule } from '../content';
import { Rng } from '../rng';
import type { ClassId, FinalStats, SetId } from '../types';

export const TICK = 100;

export type UnitKind = 'hero' | 'summon' | 'enemy' | 'elite' | 'mini' | 'boss';

export interface SkillSlot {
  def: SkillDef;
  /** Множитель силы (уровень навыка). */
  power: number;
}

export interface CombatUnitInit {
  side: 0 | 1;
  ref: string;
  kind: UnitKind;
  cls?: ClassId;
  role?: EnemyRole;
  stats: FinalStats;
  x: number;
  lane: number;
  range: number;
  speed: number;
  interval: number;
  splash?: number;
  skills: SkillSlot[];
  ult?: SkillSlot;
  /** «Сокрушительный удар» (боссы, мини-боссы, элита): id умения-ульты для имени и вида, период, первый замах. */
  heavy?: { s: string; every: number; first: number };
  mech?: BossMechanic;
  /** Ступень пассивки героя 0…2. */
  passive?: number;
  sets4?: SetId[];
  /** Прыжок за спину врага в начале боя (ассасины). */
  leap?: boolean;
  /** Появление через N мс. */
  delay?: number;
  /** Иммунитет к оглушениям (боссы и мини-боссы). */
  ccImmune?: boolean;
  lvl?: number;
  rank?: number;
  mirror?: boolean;
  /** Временный призыв: исчезает в этот момент. */
  expire?: number;
  /** Начальная доля здоровья (босс праздника между боями). */
  hpPct?: number;
}

/** Снимок бойца для показа. */
export interface UnitSnap {
  uid: number;
  side: 0 | 1;
  ref: string;
  kind: UnitKind;
  cls?: ClassId;
  role?: EnemyRole;
  x: number;
  lane: number;
  maxHp: number;
  hp: number;
  shield: number;
  energy: number;
  range: number;
  lvl?: number;
  rank?: number;
  mirror?: boolean;
  /** Чей призыв (uid). */
  owner?: number;
  heavy?: string;
}

/** Команда игрока: ульта героя u, щит Рыцаря или «Авто» до конца боя. */
export type CombatInput = { t: number; k: 'ult'; u: number } | { t: number; k: 'guard' } | { t: number; k: 'auto' };

export type CombatEvent =
  | { t: number; k: 'start'; units: UnitSnap[] }
  | { t: number; k: 'spawn'; unit: UnitSnap }
  /** Движение: координата в момент t и скорость (ед./с). */
  | { t: number; k: 'mv'; u: number; x: number; v: number }
  | { t: number; k: 'leap'; u: number; x: number }
  /** Атака: вид, умение, цель и время до попадания (полёт снаряда). */
  | { t: number; k: 'atk'; u: number; tg: number; kind: 'basic' | 'skill' | 'ult'; s?: string; hit: number }
  | { t: number; k: 'dmg'; u: number; tg: number; v: number; hp: number; sh: number; crit?: 1; dot?: DotKind; blk?: 1 }
  | { t: number; k: 'heal'; u: number; tg: number; v: number; hp: number }
  | { t: number; k: 'shield'; tg: number; v: number; sh: number }
  | { t: number; k: 'st'; tg: number; st: string; on: 0 | 1 }
  | { t: number; k: 'en'; tg: number; e: number }
  | { t: number; k: 'death'; tg: number }
  | { t: number; k: 'revive'; tg: number; hp: number }
  | { t: number; k: 'gone'; tg: number }
  /** Цепь Легиона: звено n, окно до until. */
  | { t: number; k: 'chain'; n: number; until: number }
  | { t: number; k: 'volley'; until: number }
  | { t: number; k: 'combo'; c: ComboDef['id']; u: number }
  /** Замах «Сокрушительного удара» (end = 0 — сорван). */
  | { t: number; k: 'cast'; u: number; s: string; end: number }
  /** Удар упал: 2 — идеальное парирование, 1 — блок щитом, 0 — полный урон. */
  | { t: number; k: 'heavy'; u: number; parry: 0 | 1 | 2 }
  | { t: number; k: 'guard'; until: number; ready: number }
  | { t: number; k: 'mech'; m: string; u: number }
  | { t: number; k: 'end'; win: boolean };

export interface CombatSetup {
  seed: number;
  units: CombatUnitInit[];
  /** Лимит времени, с. */
  timeLimit: number;
  manual?: boolean;
  inputs?: CombatInput[];
  immortal?: boolean;
  oneShot?: boolean;
  /** Не записывать события (пересчёт на сервере). */
  quiet?: boolean;
  /** Мастерство связок: id → уровень. */
  mastery?: Record<string, number>;
  /** Бой на урон (Колосс): до конца таймера, победа — только если босс пал. */
  endless?: boolean;
}

export interface CombatResult {
  win: boolean;
  timeout: boolean;
  /** Длительность, мс. */
  time: number;
  events: CombatEvent[];
  kills: number;
  /** Урон по сторонам врага (для Колосса) и по бойцам игрока. */
  dmgDealt: number;
  dmgBy: Record<number, number>;
  healBy: Record<number, number>;
  /** Доля здоровья героев в конце (ref → 0…1). */
  heroHp: Record<string, number>;
  units: UnitSnap[];
  ults: number;
  chains: number;
  combos: number;
  comboBy: Record<string, number>;
  parries: number;
}

interface Status {
  key: string;
  v: number;
  until: number;
  src: number;
}

interface Dot {
  src: number;
  kind: DotKind;
  perTick: number;
  until: number;
  next: number;
}

interface Pending {
  at: number;
  src: number;
  kind: 'basic' | 'skill' | 'ult' | 'combo';
  targets: number[];
  fx: { fx: Fx; to?: TargetRule }[];
  power: number;
  rule: TargetRule;
  /** обычная атака: доля урона соседям */
  splash?: number;
  /** ульта: множитель цепи */
  chainMult?: number;
  combo?: ComboDef['id'];
}

interface U {
  uid: number;
  side: 0 | 1;
  ref: string;
  kind: UnitKind;
  cls?: ClassId;
  role?: EnemyRole;
  mirror?: boolean;
  x: number;
  v: number;
  lane: number;
  range: number;
  speed: number;
  interval: number;
  splash: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  haste: number;
  crit: number;
  critDmg: number;
  skillDmg: number;
  lifesteal: number;
  heal: number;
  dmgRed: number;
  energyGain: number;
  bossDmg: number;
  shield: number;
  /** щит приливов (механика tideShield) */
  tide: number;
  alive: boolean;
  spawned: boolean;
  spawnAt: number;
  atkAt: number;
  skills: { def: SkillDef; power: number; at: number }[];
  ult?: SkillSlot;
  energy: number;
  enShown: number;
  ultCmd: boolean;
  /** когда ульта стала готова (−1 — не готова) */
  readyAt: number;
  heavy?: { s: string; every: number; nextAt: number; castEnd: number };
  mech?: BossMechanic;
  mechAt: number;
  mechStep: number;
  passive: number;
  sets4: Set<SetId>;
  leap: boolean;
  leapt: boolean;
  ccImmune: boolean;
  st: Status[];
  dots: Dot[];
  shots: number;
  owner?: number;
  expire?: number;
  respawnAt?: number;
  lvl?: number;
  rank?: number;
  target?: number;
}

const ULT_DELAY = 300;
const SKILL_DELAY = 200;
const PROJ_SPEED = 110;
const MAX_SUMMONS = 14;

export function simulateCombat(cfg: Config, setup: CombatSetup): CombatResult {
  const C = cfg.battle;
  const St = cfg.stat;
  const rng = new Rng(setup.seed);
  const events: CombatEvent[] = [];
  const quiet = !!setup.quiet;
  const emit = (e: CombatEvent) => {
    if (!quiet) events.push(e);
  };
  const units: U[] = [];
  const pending: Pending[] = [];
  const dmgBy: Record<number, number> = {};
  const healBy: Record<number, number> = {};
  const comboBy: Record<string, number> = {};
  let manual = !!setup.manual;
  const inputs = [...(setup.inputs ?? [])].sort((a, b) => a.t - b.t);
  let inputIdx = 0;
  let t = 0;
  let kills = 0;
  let dmgDealt = 0;
  let ults = 0;
  let chains = 0;
  let combos = 0;
  let parries = 0;
  const chain = { n: 0, until: -1, last: null as ClassId | null };
  let volleyUntil = -1;
  const guard = { at: -99999, ready: 0 };
  let reviveUsed = false;
  const limit = setup.timeLimit * 1000;

  // ——— создание бойцов ———
  const make = (init: CombatUnitInit, owner?: number): U => {
    const s = init.stats;
    const u: U = {
      uid: units.length,
      side: init.side,
      ref: init.ref,
      kind: init.kind,
      cls: init.cls,
      role: init.role,
      mirror: init.mirror,
      x: init.x,
      v: 0,
      lane: init.lane,
      range: init.range,
      speed: init.speed,
      interval: init.interval,
      splash: init.splash ?? 0,
      maxHp: Math.max(1, Math.round(s.hp)),
      hp: Math.max(1, Math.round(s.hp * (init.hpPct ?? 1))),
      atk: Math.max(1, Math.round(s.atk)),
      def: Math.max(0, Math.round(s.def)),
      haste: s.haste,
      crit: s.crit,
      critDmg: s.critDmg,
      skillDmg: s.skillDmg,
      lifesteal: s.lifesteal,
      heal: s.heal,
      dmgRed: s.dmgRed,
      energyGain: s.energy,
      bossDmg: s.bossDmg,
      shield: 0,
      tide: 0,
      alive: true,
      spawned: false,
      spawnAt: t + (init.delay ?? 0),
      atkAt: 0,
      skills: init.skills.map((x) => ({ def: x.def, power: x.power, at: t + (x.def.first ?? 3000) })),
      ult: init.ult,
      energy: 0,
      enShown: 0,
      ultCmd: false,
      readyAt: -1,
      heavy: init.heavy ? { s: init.heavy.s, every: init.heavy.every, nextAt: t + init.heavy.first, castEnd: 0 } : undefined,
      mech: init.mech,
      mechAt: 0,
      mechStep: 0,
      passive: init.passive ?? 0,
      sets4: new Set(init.sets4 ?? []),
      leap: !!init.leap,
      leapt: false,
      ccImmune: !!init.ccImmune,
      st: [],
      dots: [],
      shots: 0,
      owner,
      expire: init.expire,
      lvl: init.lvl,
      rank: init.rank,
    };
    units.push(u);
    return u;
  };
  const snap = (u: U): UnitSnap => ({
    uid: u.uid,
    side: u.side,
    ref: u.ref,
    kind: u.kind,
    cls: u.cls,
    role: u.role,
    x: round1(u.x),
    lane: u.lane,
    maxHp: u.maxHp,
    hp: u.hp,
    shield: u.shield,
    energy: u.energy,
    range: u.range,
    lvl: u.lvl,
    rank: u.rank,
    mirror: u.mirror,
    owner: u.owner,
    heavy: u.heavy?.s,
  });

  for (const init of setup.units) make(init);
  const startUnits: U[] = [];
  for (const u of units) {
    if (u.spawnAt <= 0) {
      u.spawned = true;
      startUnits.push(u);
    }
  }
  // волк Охотницы и стартовые щиты
  for (const u of [...units]) onSpawn(u, false);
  emit({ t: 0, k: 'start', units: units.filter((u) => u.spawned).map(snap) });
  for (const u of units) if (u.spawned && u.shield > 0) emit({ t: 0, k: 'shield', tg: u.uid, v: u.shield, sh: u.shield });

  function onSpawn(u: U, announce: boolean) {
    if (!u.spawned) return;
    if (u.sets4.has('bastion')) u.shield += Math.round(u.maxHp * 0.25);
    if (u.mech === 'tideShield') u.tide = Math.round(u.maxHp * 0.3);
    if (u.cls === 'hunter' && u.kind === 'hero') summonWolf(u, announce);
    if (announce) emit({ t, k: 'spawn', unit: snap(u) });
  }

  function summonWolf(owner: U, announce: boolean) {
    const k = owner.passive >= 1 ? 1.5 : 1;
    const w = make(
      {
        side: owner.side,
        ref: 'wolf',
        kind: 'summon',
        stats: stat({ hp: owner.maxHp * 0.6 * k, atk: owner.atk * 0.45 * k, def: owner.def * 0.8 }),
        x: owner.x + 10,
        lane: (owner.lane + 1) % 3,
        range: 8,
        speed: 22,
        interval: 800,
        skills: [],
      },
      owner.uid,
    );
    w.spawned = true;
    if (announce) emit({ t, k: 'spawn', unit: snap(w) });
  }

  // ——— выборка ———
  const alive = (u: U) => u.alive && u.spawned;
  const foes = (u: U) => units.filter((x) => x.side !== u.side && alive(x));
  const friends = (u: U) => units.filter((x) => x.side === u.side && alive(x));
  const has = (u: U, key: string) => u.st.some((s) => s.key === key && s.until > t);
  const stv = (u: U, key: string) => u.st.reduce((n, s) => (s.key === key && s.until > t ? n + s.v : n), 0);
  const stunned = (u: U) => has(u, 'stun') || has(u, 'freeze');
  const hasteOf = (u: U) => Math.max(-0.7, u.haste + stv(u, 'buff:haste') + (u.side === 0 && t < huntUntil ? 0.3 : 0) + (u.kind === 'summon' && u.side === 0 && t < huntUntil ? 0.3 : 0));
  let huntUntil = -1;

  function nearest(u: U, list: U[]): U | undefined {
    let best: U | undefined;
    let bd = Infinity;
    for (const x of list) {
      const d = Math.abs(x.x - u.x);
      if (d < bd - 1e-9) {
        best = x;
        bd = d;
      }
    }
    return best;
  }

  /** Цель обычной атаки и умений «по цели». */
  function pickTarget(u: U): U | undefined {
    const list = foes(u);
    if (!list.length) return undefined;
    // провокация: обязан бить провокатора
    const taunt = u.st.find((s) => s.key === 'taunt' && s.until > t);
    if (taunt) {
      const src = units[taunt.src];
      if (src && alive(src)) return src;
    }
    // ассасины Легиона держат задний ряд врага
    if (u.side === 0 && u.cls === 'assassin') return backOf(u, list);
    if (u.side === 1 && u.role === 'rogue' && u.kind !== 'summon') return backOf(u, list);
    // по добыче Охотницы бьют стрелки и волки
    if (u.side === 0 && (u.range > 15 || u.ref === 'wolf' || u.ref === 'spiritWolf')) {
      const prey = list.find((x) => has(x, 'mark:prey'));
      if (prey) return prey;
    }
    // удерживаем прежнюю цель, пока она жива
    if (u.target !== undefined) {
      const cur = units[u.target];
      if (cur && alive(cur) && cur.side !== u.side) return cur;
    }
    return nearest(u, list);
  }

  function backOf(u: U, list: U[]): U {
    // «задний ряд» — самый дальний от своих
    let best = list[0];
    for (const x of list) if ((u.side === 0 ? x.x > best.x : x.x < best.x) || (x.x === best.x && x.uid < best.uid)) best = x;
    return best;
  }

  function resolveTargets(u: U, rule: TargetRule, hits: number, current?: U): U[] {
    switch (rule) {
      case 'target':
        return current ? [current] : [];
      case 'back': {
        const list = foes(u);
        return list.length ? [backOf(u, list)] : [];
      }
      case 'random': {
        const list = foes(u);
        if (!list.length) return [];
        const out: U[] = [];
        for (let i = 0; i < hits; i++) out.push(list[rng.int(list.length)]);
        return out;
      }
      case 'all':
        return foes(u);
      case 'lowest': {
        const list = foes(u);
        return list.length ? [list.reduce((a, b) => (b.hp < a.hp ? b : a))] : [];
      }
      case 'self':
        return [u];
      case 'allyLowest': {
        const list = friends(u);
        return list.length ? [list.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a))] : [];
      }
      case 'allies':
        return friends(u);
    }
  }

  // ——— движение ———
  function setVel(u: U, v: number) {
    if (u.v === v) return;
    u.v = v;
    emit({ t, k: 'mv', u: u.uid, x: round1(u.x), v });
  }

  function moveToward(u: U, tx: number, range: number) {
    const dx = tx - u.x;
    const dist = Math.abs(dx);
    if (dist <= range) {
      setVel(u, 0);
      return true;
    }
    const step = (u.speed * (1 + Math.max(0, hasteOf(u)) * 0.3) * TICK) / 1000;
    const dir = Math.sign(dx);
    const go = Math.min(step, dist - range);
    setVel(u, round1(dir * u.speed));
    u.x = clamp(u.x + dir * go, -12, 112);
    return Math.abs(tx - u.x) <= range + 1e-6;
  }

  // ——— статусы ———
  function addStatus(tg: U, key: string, v: number, ms: number, src: number) {
    const ex = tg.st.find((s) => s.key === key && s.src === src);
    const wasOn = has(tg, key);
    if (ex) {
      ex.until = Math.max(ex.until, t + ms);
      ex.v = v;
    } else tg.st.push({ key, v, until: t + ms, src });
    if (!wasOn) emit({ t, k: 'st', tg: tg.uid, st: key, on: 1 });
  }

  function stun(tg: U, ms: number, src: number, force = false) {
    if (!alive(tg)) return;
    if (tg.ccImmune && !force) return;
    addStatus(tg, 'stun', 1, ms, src);
    setVel(tg, 0);
    // оглушение срывает замах удара
    if (tg.heavy && tg.heavy.castEnd > 0) {
      tg.heavy.castEnd = 0;
      tg.heavy.nextAt = t + Math.round(tg.heavy.every * 0.6);
      emit({ t, k: 'cast', u: tg.uid, s: tg.heavy.s, end: 0 });
    }
  }

  function expireStatuses(u: U) {
    if (!u.st.length) return;
    const keep: Status[] = [];
    const ended = new Set<string>();
    for (const s of u.st) {
      if (s.until > t) keep.push(s);
      else ended.add(s.key);
    }
    u.st = keep;
    for (const key of ended) if (!keep.some((s) => s.key === key)) emit({ t, k: 'st', tg: u.uid, st: key, on: 0 });
  }

  // ——— энергия ———
  function addEnergy(u: U, v: number) {
    if (!u.ult || !alive(u) || v <= 0) return;
    const before = u.energy;
    u.energy = Math.min(100, u.energy + v * (1 + u.energyGain));
    const shown = Math.floor(u.energy / 5) * 5;
    if (shown !== u.enShown || (before < 100 && u.energy >= 100)) {
      u.enShown = shown;
      emit({ t, k: 'en', tg: u.uid, e: Math.floor(u.energy) });
    }
  }

  // ——— урон и лечение ———
  function atkOf(u: U): number {
    let a = u.atk * (1 + stv(u, 'buff:atk'));
    if (u.side === 0 && t < volleyUntil) a *= 1 + C.volleyDmg;
    if (u.side === 0 && has(u, 'blind')) a *= 0.5;
    return a;
  }

  function vulnOf(tg: U, src: U): number {
    let v = stv(tg, 'buff:vuln') + stv(tg, 'stagger');
    if (has(tg, 'mark:curse')) v += hasPassive('warlock', 2) ? 0.35 : 0.2;
    if (src.side === 0 && has(tg, 'mark:prey')) v += hasPassive('hunter', 2) ? 0.4 : 0.25;
    return v;
  }

  /** Есть ли в Легионе герой класса cls с пассивкой не ниже tier. */
  function hasPassive(cls: ClassId, tier: number): boolean {
    return units.some((u) => u.side === 0 && u.cls === cls && u.kind === 'hero' && u.passive >= tier);
  }

  interface HitOpt {
    skill?: boolean;
    ult?: boolean;
    crit?: number;
    sureCrit?: boolean;
    ls?: number;
    chainMult?: number;
    basic?: boolean;
    flat?: number;
    noDef?: boolean;
    dot?: DotKind;
    combo?: boolean;
  }

  function damage(src: U, tg: U, mult: number, o: HitOpt = {}): number {
    if (!alive(tg)) return 0;
    let raw = o.flat ?? atkOf(src) * mult;
    if (o.skill || o.ult || o.combo) raw *= 1 + src.skillDmg;
    if (o.ult) {
      if (src.sets4.has('fury')) raw *= 1.3;
      raw *= o.chainMult ?? 1;
    }
    let crit = false;
    if (!o.dot) {
      const chance = src.crit + stv(src, 'buff:crit') + (o.crit ?? 0);
      if (o.sureCrit || rng.next() < chance) {
        crit = true;
        let cd = src.critDmg;
        if (src.cls === 'assassin' && tg.hp < tg.maxHp * 0.5) cd += src.passive >= 2 ? 0.6 : 0.3;
        raw *= 1 + cd;
      }
    }
    raw *= 1 + vulnOf(tg, src);
    if (!o.noDef) raw *= 1 - Math.min(St.defMax, tg.def / (tg.def + St.defK * Math.max(1, src.atk)));
    raw *= 1 - Math.min(St.dmgRedMax, tg.dmgRed + stv(tg, 'buff:dmgRed'));
    if (tg.kind === 'boss' || tg.kind === 'mini') raw *= 1 + src.bossDmg;
    if (tg.mech === 'skyborne' && src.range <= 10) raw *= 0.5;
    if (src.cls === 'ranger' && src.kind === 'hero' && Math.abs(tg.x - src.x) >= 30) raw *= src.passive >= 2 ? 1.4 : 1.2;
    if (!o.dot) raw *= rng.float(0.95, 1.05);
    let dmg = Math.max(1, Math.round(raw));
    if (setup.oneShot && src.side === 0) dmg = tg.hp + tg.shield + tg.tide;
    let left = dmg;
    // щит приливов: обычные атаки бьют его вчетверо слабее
    if (tg.tide > 0) {
      const eff = o.basic ? 0.25 : 1;
      const absorb = Math.min(tg.tide, left * eff);
      tg.tide -= absorb;
      left -= absorb / eff;
      if (tg.tide <= 0) emit({ t, k: 'mech', m: 'tideBroken', u: tg.uid });
    }
    if (tg.shield > 0) {
      const absorb = Math.min(tg.shield, left);
      tg.shield -= absorb;
      left -= absorb;
    }
    left = Math.round(left);
    if (setup.immortal && tg.side === 0) left = Math.min(left, tg.hp - 1);
    tg.hp = Math.max(0, tg.hp - left);
    dmgBy[src.uid] = (dmgBy[src.uid] ?? 0) + dmg;
    if (src.side === 0) dmgDealt += dmg;
    emit({ t, k: 'dmg', u: src.uid, tg: tg.uid, v: dmg, hp: tg.hp, sh: Math.round(tg.shield + tg.tide), crit: crit ? 1 : undefined, dot: o.dot });
    // энергия от полученного удара
    if (tg.side === 0) addEnergy(tg, C.energyTaken);
    const ls = src.lifesteal + (o.ls ?? 0) + (src.mech === 'bloodThirst' ? 0.3 : 0);
    if (ls > 0 && !o.dot) healUnit(src, src, dmg * ls, true);
    if (tg.hp <= 0) kill(tg, src);
    return dmg;
  }

  function healUnit(src: U, tg: U, amount: number, raw = false) {
    if (!alive(tg)) return;
    let v = amount;
    if (!raw) {
      v *= 1 + src.heal;
      if (src.sets4.has('grace') && tg !== src) v *= 1.25;
    }
    v = Math.round(v);
    if (v <= 0) return;
    const missing = tg.maxHp - tg.hp;
    const real = Math.min(missing, v);
    tg.hp += real;
    healBy[src.uid] = (healBy[src.uid] ?? 0) + real;
    if (real > 0) emit({ t, k: 'heal', u: src.uid, tg: tg.uid, v: real, hp: tg.hp });
    // Милосердие Жрицы: излишек — в щит
    const over = v - real;
    if (over > 0 && !raw && src.cls === 'priestess' && src.kind === 'hero') giveShield(tg, over * 0.5);
  }

  function giveShield(tg: U, v: number) {
    if (!alive(tg)) return;
    const add = Math.round(Math.min(v, tg.maxHp));
    if (add <= 0) return;
    tg.shield = Math.min(tg.maxHp, tg.shield + add);
    emit({ t, k: 'shield', tg: tg.uid, v: add, sh: Math.round(tg.shield) });
  }

  function kill(tg: U, src: U) {
    if (!tg.alive) return;
    tg.alive = false;
    tg.v = 0;
    tg.dots = [];
    if (tg.heavy) tg.heavy.castEnd = 0;
    emit({ t, k: 'death', tg: tg.uid });
    if (tg.side === 1 && tg.kind !== 'summon') kills++;
    if (tg.side === 1) {
      if (src.cls === 'warlock' && src.kind === 'hero') addEnergy(src, 10);
      if (src.cls === 'assassin' && src.kind === 'hero' && src.passive >= 1) addEnergy(src, 15);
      // проклятые взрываются
      if (has(tg, 'mark:curse') && hasPassive('warlock', 1)) {
        const lira = units.find((u) => u.side === 0 && u.cls === 'warlock' && u.kind === 'hero');
        if (lira) for (const n of foes(lira)) if (Math.abs(n.x - tg.x) <= 15) damage(lira, n, 0.6, { skill: true });
      }
    }
    // Снег вернётся через 10 секунд
    if (tg.ref === 'wolf' && tg.owner !== undefined) {
      const o = units[tg.owner];
      if (o && o.alive) o.respawnAt = t + 10000;
    }
  }

  // ——— эффекты навыков ———
  function applyFx(src: U, rule: TargetRule, entries: { fx: Fx; to?: TargetRule }[], targets: U[], power: number, kind: Pending['kind'], chainMult = 1) {
    const isUlt = kind === 'ult';
    const isSkill = kind === 'skill';
    for (const { fx, to } of entries) {
      const list = to && to !== rule ? resolveTargets(src, to, 1, targets[0]) : targets;
      switch (fx.t) {
        case 'dmg': {
          const hits = rule === 'random' && !to ? 1 : fx.hits ?? 1;
          for (const tg of list) {
            for (let i = 0; i < hits; i++) {
              if (!alive(tg)) break;
              damage(src, tg, fx.mult * power, { skill: isSkill, ult: isUlt, crit: fx.crit, ls: fx.ls, chainMult, combo: kind === 'combo' });
            }
            if (fx.splash) for (const n of foes(src)) if (n !== tg && Math.abs(n.x - tg.x) <= 12) damage(src, n, fx.mult * power * fx.splash, { skill: isSkill, ult: isUlt });
          }
          break;
        }
        case 'heal':
          for (const tg of list) healUnit(src, tg, atkOf(src) * fx.mult * power);
          break;
        case 'shield':
          for (const tg of list) giveShield(tg, (fx.of === 'hp' ? src.maxHp : atkOf(src)) * fx.mult * power * (src.sets4.has('grace') && tg !== src ? 1.25 : 1));
          break;
        case 'stun':
          for (const tg of list) stun(tg, fx.ms, src.uid);
          break;
        case 'dot':
          for (const tg of list) {
            if (!alive(tg)) continue;
            const total = atkOf(src) * fx.mult * power * (1 + src.skillDmg) * (1 - Math.min(St.defMax, tg.def / (tg.def + St.defK * src.atk)));
            const ticks = Math.max(1, Math.round(fx.ms / 500));
            tg.dots.push({ src: src.uid, kind: fx.kind, perTick: total / ticks, until: t + fx.ms, next: t + 500 });
            addStatus(tg, `dot:${fx.kind}`, 1, fx.ms, src.uid);
          }
          break;
        case 'buff':
          for (const tg of list) addStatus(tg, `buff:${fx.stat}`, fx.v, fx.ms, src.uid);
          break;
        case 'taunt':
          for (const tg of list) {
            if (tg.ccImmune && tg.kind === 'boss') continue;
            addStatus(tg, 'taunt', 1, fx.ms, src.uid);
            tg.target = src.uid;
          }
          break;
        case 'mark':
          for (const tg of list) addStatus(tg, `mark:${fx.kind}`, 1, fx.ms, src.uid);
          // Снег бросается на добычу
          if (fx.kind === 'prey') {
            const wolf = units.find((w) => w.ref === 'wolf' && w.owner === src.uid && alive(w));
            if (wolf && list[0] && alive(list[0])) {
              wolf.x = clamp(list[0].x + (src.side === 0 ? -6 : 6), -12, 112);
              emit({ t, k: 'leap', u: wolf.uid, x: round1(wolf.x) });
              damage(wolf, list[0], 1.5, { skill: true });
            }
          }
          break;
        case 'cleanse':
          for (const tg of list) {
            const had = tg.st.some((s) => (s.key === 'stun' || s.key === 'freeze' || s.key === 'blind' || s.key.startsWith('dot:')) && s.until > t);
            tg.st = tg.st.filter((s) => {
              const bad = s.key === 'stun' || s.key === 'freeze' || s.key === 'blind' || s.key.startsWith('dot:') || (s.key.startsWith('buff:') && s.v < 0);
              if (bad && s.until > t) emit({ t, k: 'st', tg: tg.uid, st: s.key, on: 0 });
              return !bad;
            });
            tg.dots = [];
            void had;
          }
          break;
        case 'energy':
          for (const tg of list) addEnergy(tg, fx.v);
          break;
        case 'revive': {
          if (reviveUsed && src.side === 0) break;
          const dead = units.find((u) => u.side === src.side && u.kind === 'hero' && !u.alive && u.spawned);
          if (dead) {
            if (src.side === 0) reviveUsed = true;
            dead.alive = true;
            dead.hp = Math.round(dead.maxHp * fx.pct);
            dead.st = [];
            emit({ t, k: 'revive', tg: dead.uid, hp: dead.hp });
          }
          break;
        }
        case 'summon': {
          const count = Math.min(fx.count, MAX_SUMMONS - units.filter((u) => u.kind === 'summon' && alive(u)).length);
          for (let i = 0; i < count; i++) {
            const isWolf = fx.unit === 'spiritWolf';
            const m = make(
              {
                side: src.side,
                ref: fx.unit,
                kind: 'summon',
                stats: stat({ hp: src.maxHp * fx.mult * (isWolf ? 0.8 : 1.5), atk: src.atk * fx.mult, def: src.def * 0.5 }),
                x: clamp(src.x + (src.side === 0 ? 6 + i * 4 : -6 - i * 4), -10, 110),
                lane: (src.lane + i + 1) % 3,
                range: fx.unit === 'drone' ? 36 : 8,
                speed: isWolf ? 24 : 12,
                interval: isWolf ? 600 : 1100,
                skills: [],
                expire: fx.ms ? t + fx.ms : undefined,
              },
              src.uid,
            );
            m.spawned = true;
            emit({ t, k: 'spawn', unit: snap(m) });
          }
          break;
        }
      }
    }
  }

  // ——— связки ———
  function playCombo(id: ComboDef['id'], a: U, b: U) {
    combos++;
    comboBy[id] = (comboBy[id] ?? 0) + 1;
    const m = 1 + COMBO_MASTERY_STEP * (setup.mastery?.[id] ?? 0);
    const by = (cls: ClassId) => (a.cls === cls ? a : b.cls === cls ? b : b);
    emit({ t, k: 'combo', c: id, u: b.uid });
    switch (id) {
      case 'backstab': {
        const k = by('assassin');
        const list = foes(k);
        if (list.length) damage(k, list.reduce((x, y) => (y.hp < x.hp ? y : x)), 3 * m, { combo: true, sureCrit: true });
        break;
      }
      case 'decay': {
        const l = by('warlock');
        applyFx(l, 'all', [{ fx: { t: 'dot', mult: 2 * m, ms: 5000, kind: 'poison' } }, { fx: { t: 'buff', stat: 'vuln', v: 0.15, ms: 5000 } }], foes(l), 1, 'combo');
        break;
      }
      case 'detonate': {
        const s = a.cls === 'ranger' || a.cls === 'hunter' ? a : b;
        for (const tg of foes(s)) damage(s, tg, 1.8 * m, { combo: true });
        break;
      }
      case 'crush': {
        const k = by('knight');
        for (const tg of foes(k)) {
          stun(tg, 2000, k.uid, true);
          damage(k, tg, 1.0 * m, { combo: true });
        }
        break;
      }
      case 'hunt':
        huntUntil = t + 6000;
        break;
      case 'grace': {
        const p = by('priestess');
        for (const tg of friends(p)) {
          healUnit(p, tg, atkOf(p) * m);
          if (tg.kind === 'hero') addEnergy(tg, 15);
        }
        if (p.passive >= 2) addEnergy(p, 20);
        break;
      }
    }
  }

  // ——— ульта ———
  /** Авто: ульта сразу, если цепь открыта или никто не готов следом; иначе ждём соседа до 2 с. */
  function autoUltNow(u: U): boolean {
    if (t <= chain.until || t - u.readyAt >= 2000) return true;
    return !units.some((x) => x !== u && x.side === 0 && x.kind === 'hero' && alive(x) && x.ult && x.energy >= 75 && x.energy < 100);
  }

  function castUlt(u: U) {
    u.readyAt = -1;
    const ult = u.ult!;
    const cur = pickTarget(u);
    u.energy = 0;
    u.enShown = 0;
    u.ultCmd = false;
    ults++;
    emit({ t, k: 'en', tg: u.uid, e: 0 });
    let chainMult = 1;
    if (u.side === 0 && u.kind === 'hero') {
      const prev = chain.last;
      chain.n = t <= chain.until ? chain.n + 1 : 1;
      chain.until = t + C.chainWindow;
      chainMult = 1 + C.chainStep * (Math.min(C.chainMax, chain.n) - 1);
      emit({ t, k: 'chain', n: chain.n, until: chain.until });
      if (chain.n === 3) {
        chains++;
        volleyUntil = t + C.volleyMs;
        emit({ t, k: 'volley', until: volleyUntil });
        for (const h of friends(u)) if (h !== u && h.kind === 'hero') addEnergy(h, C.volleyEnergy);
      }
      if (chain.n >= 2 && prev && u.cls) {
        const c = comboOf(prev, u.cls);
        if (c) {
          const partner = units.find((x) => x.side === 0 && x.kind === 'hero' && x.cls === prev && x.alive) ?? u;
          pending.push({ at: t + ULT_DELAY + TICK, src: u.uid, kind: 'combo', targets: [partner.uid], fx: [], power: 1, rule: 'self', combo: c.id });
        }
      }
      chain.last = u.cls ?? null;
    }
    const targets = resolveTargets(u, ult.def.target, ult.def.fx[0]?.fx.t === 'dmg' ? (ult.def.fx[0].fx as { hits?: number }).hits ?? 1 : 1, cur);
    emit({ t, k: 'atk', u: u.uid, tg: targets[0]?.uid ?? u.uid, kind: 'ult', s: ult.def.id, hit: ULT_DELAY });
    pending.push({ at: t + ULT_DELAY, src: u.uid, kind: 'ult', targets: targets.map((x) => x.uid), fx: ult.def.fx, power: ult.power, rule: ult.def.target, chainMult });
  }

  // ——— «Сокрушительный удар» ———
  function landHeavy(b: U) {
    const h = b.heavy!;
    h.castEnd = 0;
    h.nextAt = t + h.every;
    const knight = units.find((u) => u.side === 0 && u.cls === 'knight' && u.kind === 'hero' && alive(u));
    let parry: 0 | 1 | 2 = 0;
    if (knight) {
      if (t - guard.at >= 0 && t - guard.at <= C.parryWindow) parry = 2;
      else if (!manual && rng.next() < C.autoParry) parry = 2;
      else parry = 1;
    }
    emit({ t, k: 'heavy', u: b.uid, parry });
    if (parry === 2) {
      parries++;
      addStatus(b, 'stagger', C.parryVuln, C.parryStun, knight!.uid);
      stun(b, C.parryStun, knight!.uid, true);
      for (const hero of units) if (hero.side === 0 && hero.kind === 'hero' && alive(hero)) addEnergy(hero, C.parryEnergy);
      if (knight!.passive >= 1) for (const hero of units) if (hero.side === 0 && alive(hero)) giveShield(hero, knight!.maxHp * 0.08);
      return;
    }
    const k = parry === 1 ? 1 - C.guardBlock : 1;
    for (const hero of foes(b)) damage(b, hero, C.heavyMult * k, { skill: true });
  }

  // ——— механики боссов ———
  /** Сработать ли механике сейчас: первый раз — через first мс, дальше — каждые every мс. */
  function due(b: U, first: number, every: number): boolean {
    if (b.mechAt === 0) {
      b.mechAt = t + first;
      return false;
    }
    if (t < b.mechAt) return false;
    b.mechAt = t + every;
    return true;
  }

  function mechanics(b: U) {
    if (!b.mech || !alive(b)) return;
    const hpPct = b.hp / b.maxHp;
    switch (b.mech) {
      case 'vines':
        if (due(b, 6000, 12000)) {
          emit({ t, k: 'mech', m: 'vines', u: b.uid });
          for (let i = 0; i < 2; i++) {
            const v = make({ side: 1, ref: 'vine', kind: 'summon', stats: stat({ hp: b.maxHp * 0.05, atk: b.atk * 0.2, def: b.def * 0.5 }), x: clamp(b.x - 8 - i * 4, 0, 100), lane: i * 2, range: 30, speed: 0, interval: 2000, skills: [] }, b.uid);
            v.spawned = true;
            emit({ t, k: 'spawn', unit: snap(v) });
          }
        }
        if (t % 1000 === 0) {
          const n = units.filter((v) => v.ref === 'vine' && v.owner === b.uid && alive(v)).length;
          if (n) healUnit(b, b, b.maxHp * 0.008 * n, true);
        }
        break;
      case 'sandstorm':
        if (due(b, 8000, 15000)) {
          emit({ t, k: 'mech', m: 'sandstorm', u: b.uid });
          for (const h of foes(b)) addStatus(h, 'blind', 1, 4000, b.uid);
        }
        break;
      case 'freeze':
        if (due(b, 6000, 10000)) {
          const list = foes(b).filter((h) => h.kind === 'hero');
          if (list.length) {
            const tg = list[rng.int(list.length)];
            emit({ t, k: 'mech', m: 'freeze', u: tg.uid });
            addStatus(tg, 'freeze', 1, 3000, b.uid);
            setVel(tg, 0);
          }
        }
        break;
      case 'tideShield':
        if (due(b, 20000, 20000) && b.tide < b.maxHp * 0.3) {
          b.tide = Math.round(b.maxHp * 0.3);
          emit({ t, k: 'mech', m: 'tide', u: b.uid });
          emit({ t, k: 'shield', tg: b.uid, v: 0, sh: Math.round(b.shield + b.tide) });
        }
        break;
      case 'bloodThirst':
        if (due(b, 10000, 10000)) {
          b.atk = Math.round(b.atk * 1.12);
          emit({ t, k: 'mech', m: 'bloodThirst', u: b.uid });
        }
        break;
      case 'fireField':
        if (t > 0 && t % 1000 === 0) for (const h of foes(b)) damage(b, h, 0, { flat: b.atk * 0.04 * (1 + t / 20000), noDef: true, dot: 'burn' });
        break;
      case 'skyborne':
        break;
      case 'phases':
        if ((b.mechStep === 0 && hpPct <= 0.66) || (b.mechStep === 1 && hpPct <= 0.33)) {
          b.mechStep++;
          b.haste += 0.3;
          emit({ t, k: 'mech', m: 'phase', u: b.uid });
          for (const h of foes(b)) damage(b, h, 1.2, { skill: true });
        }
        break;
      case 'raiseDead':
        if (due(b, 12000, 12000)) {
          emit({ t, k: 'mech', m: 'raiseDead', u: b.uid });
          const dead = units.filter((u) => u.side === 1 && !u.alive && u.spawned && u.kind !== 'boss' && u.kind !== 'summon');
          if (dead.length) {
            for (const d of dead.slice(0, 2)) {
              d.alive = true;
              d.hp = Math.round(d.maxHp * 0.5);
              d.st = [];
              d.dots = [];
              emit({ t, k: 'revive', tg: d.uid, hp: d.hp });
            }
          } else applyFx(b, 'self', [{ fx: { t: 'summon', unit: 'skeleton', count: 2, mult: 0.3 } }], [b], 1, 'skill');
        }
        break;
      case 'mirror':
        if (b.mechStep === 0 && hpPct <= 0.5) {
          b.mechStep = 1;
          const strongest = units.filter((u) => u.side === 0 && u.kind === 'hero' && alive(u)).sort((x, y) => y.atk - x.atk || x.uid - y.uid)[0];
          if (strongest) {
            emit({ t, k: 'mech', m: 'mirror', u: b.uid });
            const m = make(
              {
                side: 1,
                ref: strongest.ref,
                kind: 'summon',
                cls: strongest.cls,
                mirror: true,
                stats: stat({ hp: strongest.maxHp * 0.8, atk: strongest.atk * 0.6, def: strongest.def, crit: strongest.crit, critDmg: strongest.critDmg }),
                x: clamp(b.x - 10, 0, 100),
                lane: (b.lane + 1) % 3,
                range: strongest.range,
                speed: strongest.speed,
                interval: strongest.interval,
                skills: strongest.skills.map((x) => ({ def: x.def, power: x.power * 0.6 })),
              },
              b.uid,
            );
            m.spawned = true;
            emit({ t, k: 'spawn', unit: snap(m) });
          }
        }
        break;
    }
  }

  // ——— команды игрока ———
  function processInputs() {
    while (inputIdx < inputs.length && inputs[inputIdx].t <= t) {
      const inp = inputs[inputIdx++];
      if (inp.k === 'auto') manual = false;
      else if (inp.k === 'ult') {
        const u = units[inp.u];
        if (u && u.side === 0 && u.ult && alive(u)) u.ultCmd = true;
      } else if (inp.k === 'guard') {
        const knight = units.find((u) => u.side === 0 && u.cls === 'knight' && u.kind === 'hero' && alive(u));
        if (knight && t >= guard.ready) {
          guard.at = inp.t;
          guard.ready = t + C.guardCd;
          emit({ t, k: 'guard', until: inp.t + C.parryWindow, ready: guard.ready });
        }
      }
    }
  }

  // ——— шаг бойца ———
  function act(u: U) {
    if (!alive(u)) return;
    if (u.expire !== undefined && t >= u.expire) {
      u.alive = false;
      emit({ t, k: 'gone', tg: u.uid });
      return;
    }
    // прыжок в тыл
    if (u.leap && !u.leapt) {
      const list = foes(u);
      if (list.length && list.every((x) => Math.abs(x.x - u.x) < 60)) {
        u.leapt = true;
        const back = backOf(u, list);
        u.x = clamp(back.x + (u.side === 0 ? 7 : -7), -8, 108);
        setVel(u, 0);
        emit({ t, k: 'leap', u: u.uid, x: round1(u.x) });
        u.atkAt = t + 300;
      }
    }
    if (stunned(u)) return;
    // замах удара
    if (u.heavy && u.heavy.castEnd > 0) {
      if (t >= u.heavy.castEnd) landHeavy(u);
      return;
    }
    const list = foes(u);
    if (!list.length) {
      setVel(u, 0);
      return;
    }
    if (u.heavy && t >= u.heavy.nextAt) {
      u.heavy.castEnd = t + C.heavyCast;
      setVel(u, 0);
      emit({ t, k: 'cast', u: u.uid, s: u.heavy.s, end: u.heavy.castEnd });
      return;
    }
    // ульта
    if (u.ult && u.energy >= 100) {
      if (u.readyAt < 0) u.readyAt = t;
      if (u.side === 1 || u.ultCmd || (!manual && autoUltNow(u))) {
        castUlt(u);
        return;
      }
    }
    const target = pickTarget(u);
    if (!target) return;
    u.target = target.uid;
    const dist = Math.abs(target.x - u.x);
    // умения
    for (const sk of u.skills) {
      if (t < sk.at) continue;
      const rule = sk.def.target;
      const needRange = rule === 'target' || rule === 'lowest';
      if (needRange && dist > u.range + 2) continue;
      if (rule === 'allyLowest') {
        const low = resolveTargets(u, rule, 1)[0];
        if (!low || low.hp / low.maxHp > 0.9) {
          sk.at = t + 500;
          continue;
        }
      }
      const firstFx = sk.def.fx[0]?.fx;
      const hits = firstFx && firstFx.t === 'dmg' ? firstFx.hits ?? 1 : 1;
      const targets = resolveTargets(u, rule, hits, target);
      if (!targets.length) continue;
      const cd = (sk.def.cd ?? 8000) / (1 + Math.max(0, hasteOf(u))) * (u.sets4.has('eclipse') ? 0.8 : 1);
      sk.at = t + Math.round(cd);
      const delay = u.range > 15 && rule !== 'self' && rule !== 'allies' && rule !== 'allyLowest' ? flight(u, targets[0]) : SKILL_DELAY;
      emit({ t, k: 'atk', u: u.uid, tg: targets[0].uid, kind: 'skill', s: sk.def.id, hit: delay });
      pending.push({ at: t + delay, src: u.uid, kind: 'skill', targets: targets.map((x) => x.uid), fx: sk.def.fx, power: sk.power, rule });
      if (u.kind === 'hero') addEnergy(u, 5);
      setVel(u, 0);
      return;
    }
    // подойти и ударить
    if (dist > u.range) {
      moveToward(u, target.x, u.range);
      return;
    }
    setVel(u, 0);
    if (t < u.atkAt) return;
    const interval = Math.max(250, u.interval / (1 + hasteOf(u)));
    u.atkAt = t + Math.round(interval);
    const delay = u.range > 15 ? flight(u, target) : TICK;
    emit({ t, k: 'atk', u: u.uid, tg: target.uid, kind: 'basic', hit: delay });
    pending.push({ at: t + delay, src: u.uid, kind: 'basic', targets: [target.uid], fx: [], power: 1, rule: 'target', splash: u.splash });
  }

  function flight(u: U, tg: U): number {
    return Math.max(TICK, Math.round((Math.abs(tg.x - u.x) / PROJ_SPEED) * 1000 / TICK) * TICK);
  }

  function resolvePending() {
    if (!pending.length) return;
    const due: Pending[] = [];
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].at <= t) {
        due.push(pending[i]);
        pending.splice(i, 1);
      }
    }
    due.sort((a, b) => a.at - b.at || a.src - b.src);
    for (const p of due) {
      const src = units[p.src];
      if (p.kind === 'combo') {
        const partner = units[p.targets[0]];
        if (p.combo) playCombo(p.combo, partner, src);
        continue;
      }
      if (!src.alive && p.kind !== 'basic') continue;
      if (p.kind === 'basic') {
        const tg = units[p.targets[0]];
        if (!tg || !alive(tg)) continue;
        let n = 1;
        if (src.cls === 'ranger' && src.kind === 'hero' && src.passive >= 1) {
          src.shots++;
          if (src.shots % 4 === 0) n = 2;
        }
        for (let i = 0; i < n && alive(tg); i++) damage(src, tg, 1, { basic: true });
        if (p.splash) for (const nb of foes(src)) if (nb !== tg && Math.abs(nb.x - tg.x) <= 10) damage(src, nb, p.splash, { basic: true });
        if (src.side === 0 && src.alive) addEnergy(src, C.energyPerHit);
        continue;
      }
      const targets = p.targets.map((id) => units[id]).filter((x) => x && (alive(x) || p.fx.some((f) => f.fx.t === 'revive')));
      applyFx(src, p.rule, p.fx, targets.length ? targets : [], p.power, p.kind, p.chainMult);
    }
  }

  function tickDots(u: U) {
    if (!u.dots.length || !alive(u)) return;
    for (const d of u.dots) {
      if (t >= d.next && d.next <= d.until) {
        d.next += 500;
        const src = units[d.src];
        damage(src, u, 0, { flat: d.perTick, noDef: true, dot: d.kind });
        if (!alive(u)) return;
      }
    }
    u.dots = u.dots.filter((d) => d.next <= d.until);
  }

  // ——— главный цикл ———
  let win = false;
  let timeout = false;
  for (t = 0; ; t += TICK) {
    processInputs();
    // появления
    for (const u of units) {
      if (!u.spawned && u.alive && t >= u.spawnAt) {
        u.spawned = true;
        onSpawn(u, true);
      }
      if (u.respawnAt !== undefined && t >= u.respawnAt && u.alive) {
        u.respawnAt = undefined;
        summonWolf(u, true);
      }
    }
    for (const u of units) {
      if (!alive(u)) continue;
      expireStatuses(u);
      tickDots(u);
    }
    for (const u of units) if (u.mech) mechanics(u);
    resolvePending();
    const order = units.filter(alive);
    for (const u of order) act(u);
    if (t % 1000 === 0 && t > 0) for (const u of units) if (u.side === 0 && alive(u)) addEnergy(u, C.energyRegen);
    // итог
    const heroesAlive = units.some((u) => u.side === 0 && u.kind === 'hero' && alive(u));
    const enemiesLeft = units.some((u) => u.side === 1 && u.alive && (u.kind !== 'summon' || u.mirror) && (u.spawned || u.spawnAt > t));
    if (!heroesAlive) {
      win = false;
      break;
    }
    if (!enemiesLeft) {
      win = true;
      break;
    }
    if (t >= limit) {
      timeout = true;
      win = false;
      break;
    }
  }
  for (const u of units) if (u.v !== 0 && alive(u)) setVel(u, 0);
  emit({ t, k: 'end', win });

  const heroHp: Record<string, number> = {};
  for (const u of units) if (u.side === 0 && u.kind === 'hero') heroHp[u.ref] = u.alive ? Math.round((u.hp / u.maxHp) * 1000) / 1000 : 0;
  return {
    win,
    timeout,
    time: t,
    events,
    kills,
    dmgDealt,
    dmgBy,
    healBy,
    heroHp,
    units: units.map(snap),
    ults,
    chains,
    combos,
    comboBy,
    parries,
  };
}

function stat(p: Partial<FinalStats>): FinalStats {
  return {
    hp: Math.round(p.hp ?? 1),
    atk: Math.round(p.atk ?? 1),
    def: Math.round(p.def ?? 0),
    haste: p.haste ?? 0,
    crit: p.crit ?? 0.05,
    critDmg: p.critDmg ?? 0.5,
    skillDmg: p.skillDmg ?? 0,
    lifesteal: p.lifesteal ?? 0,
    heal: p.heal ?? 0,
    dmgRed: p.dmgRed ?? 0,
    energy: p.energy ?? 0,
    bossDmg: p.bossDmg ?? 0,
  };
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Умение врага по id (для имён и вида в интерфейсе). */
export function enemySkill(id: string): SkillDef | undefined {
  return ENEMY_SKILLS[id];
}

export { stat as combatStats };
