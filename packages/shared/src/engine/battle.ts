/**
 * Детерминированный симулятор боя. Один и тот же модуль работает на клиенте
 * (визуализация) и на сервере (проверка): при одинаковых seed и составе
 * результат совпадает бит в бит. Все входные характеристики — целые числа.
 */
import type { Config } from '../config';
import { ENEMY_MAP, SKILL_MAP, elementMult, artifactValue } from '../content';
import type { BossMechanic } from '../content/acts';
import type { BuffStat, SkillDef, SkillEffect, SkillMod, TargetRule } from '../content/effects';
import { Rng } from '../rng';
import type { ClassId, Element, FinalStats, SpecialEffect, Stats } from '../types';

export interface SkillRef {
  id: string;
  rank: number;
  mods: { mod: SkillMod; rank: number }[];
}

export type UnitKind = 'hero' | 'enemy' | 'mini' | 'boss' | 'summon';

export interface UnitInit {
  side: 0 | 1;
  slot: number;
  row: 'front' | 'back';
  kind: UnitKind;
  ref: string;
  element: Element;
  cls?: ClassId;
  targeting: 'nearest' | 'back' | 'healer';
  melee: boolean;
  stats: FinalStats;
  basic: SkillRef;
  skills: SkillRef[];
  ult?: SkillRef;
  fx: SpecialEffect[];
  mechanic?: BossMechanic;
  act?: number;
  lvl?: number;
  stars?: number;
  hpPct?: number;
  energy?: number;
}

export interface UnitSnap {
  uid: number;
  side: 0 | 1;
  slot: number;
  row: 'front' | 'back';
  kind: UnitKind;
  ref: string;
  el: Element;
  maxHp: number;
  hp: number;
  energy: number;
  lvl?: number;
  stars?: number;
  /** Тёмный двойник героини (механика Никты). */
  mirror?: boolean;
}

export interface DmgBreakdown {
  atk: number;
  k: number;
  defF: number;
  elem: number;
  crit: number;
  vr: number;
  bonus: number;
  taken: number;
}

export type BattleEvent =
  | { t: number; k: 'start'; units: UnitSnap[] }
  | { t: number; k: 'act'; u: number; s: string; kind: 'basic' | 'active' | 'ult'; tg: number[]; e: number }
  | { t: number; k: 'dmg'; u: number; tg: number; v: number; hp: number; sh: number; crit?: 1; miss?: 1; dot?: string; blk?: 1; te: number; br?: DmgBreakdown }
  | { t: number; k: 'heal'; u: number; tg: number; v: number; hp: number }
  | { t: number; k: 'shield'; tg: number; v: number; sh: number }
  | { t: number; k: 'status'; tg: number; st: string; on: 0 | 1 }
  | { t: number; k: 'energy'; tg: number; e: number }
  | { t: number; k: 'death'; tg: number }
  | { t: number; k: 'revive'; tg: number; hp: number }
  | { t: number; k: 'summon'; unit: UnitSnap }
  | { t: number; k: 'mech'; m: string; tg?: number; v?: number }
  | { t: number; k: 'end'; win: boolean };

/** Команда игрока: выпустить ульту героини u (не раньше t, мс); u = -1 — с момента t ульты снова автоматические. */
export interface BattleInput {
  t: number;
  u: number;
}

/** «Сокрушительный удар» босса: каст виден заранее, ульта или оглушение прерывают его. */
export const BOSS_CAST = {
  boss: { first: 6000, every: 11000, dur: 3200, dmg: 0.42 },
  mini: { first: 8000, every: 14000, dur: 3200, dmg: 0.28 },
} as const;

export interface BattleSetup {
  seed: number;
  units: UnitInit[];
  timeLimit: number;
  /** Ручные ульты героинь: ульта только по команде игрока (inputs). */
  manual?: boolean;
  inputs?: BattleInput[];
  immortal?: boolean;
  oneShot?: boolean;
  debug?: boolean;
  /** Не записывать события (быстрее для пересчёта на сервере). */
  quiet?: boolean;
  /** Артефакты отряда игрока (сторона 0). */
  artifacts?: { id: string; lvl: number }[];
}

export interface BattleResult {
  win: boolean;
  time: number;
  events: BattleEvent[];
  heroHp: Record<string, number>;
  dmgDone: Record<number, number>;
  healDone: Record<number, number>;
  kills: number;
  units: UnitSnap[];
  timeout: boolean;
}

interface Status {
  key: string;
  type: 'buff' | 'debuff' | 'dot' | 'hot' | 'cc' | 'taunt';
  stat?: BuffStat;
  value: number;
  dot?: string;
  cc?: string;
  amount: number;
  turns: number;
  src: number;
}

interface ActiveSkill {
  ref: SkillRef;
  def: SkillDef;
  cd: number;
  maxCd: number;
}

interface U {
  uid: number;
  side: 0 | 1;
  slot: number;
  row: 'front' | 'back';
  kind: UnitKind;
  ref: string;
  element: Element;
  cls?: ClassId;
  targeting: 'nearest' | 'back' | 'healer';
  melee: boolean;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  critDmg: number;
  acc: number;
  eva: number;
  pen: number;
  lifesteal: number;
  healPower: number;
  resist: number;
  energyRegen: number;
  bonus: Stats;
  energy: number;
  shield: number;
  alive: boolean;
  nextAt: number;
  basic: ActiveSkill;
  skills: ActiveSkill[];
  ult?: ActiveSkill;
  statuses: Status[];
  fx: Record<string, SpecialEffect>;
  used: Record<string, number>;
  killStacks: number;
  echoCount: number;
  summoner?: number;
  expireAt?: number;
  mechanic?: BossMechanic;
  act?: number;
  lvl?: number;
  stars?: number;
  turns: number;
  tide: number;
  field: number;
  phase: number;
  bloodStacks: number;
  firstDone: boolean;
  mirror?: boolean;
  /** Время окончания каста «Сокрушительного удара» (0 — не кастует). */
  casting: number;
}

interface Timer {
  at: number;
  run: () => void;
}

const PHASE_WEAK: Element[] = ['fire', 'water', 'nature'];
const ELEM_KEY: Record<Element, keyof Stats> = {
  fire: 'dmgFire',
  nature: 'dmgNature',
  water: 'dmgWater',
  light: 'dmgLight',
  dark: 'dmgDark',
};

export function simulateBattle(cfg: Config, setup: BattleSetup): BattleResult {
  return new Battle(cfg, setup).run();
}

class Battle {
  private rng: Rng;
  private units: U[] = [];
  private events: BattleEvent[] = [];
  private t = 0;
  private timers: Timer[] = [];
  private kills = 0;
  private dmgDone: Record<number, number> = {};
  private healDone: Record<number, number> = {};
  private readonly B: Config['battle'];
  private readonly S: Config['stat'];
  private limit: number;
  private deadMinions: number[] = [];
  /** Чем сейчас бьёт юнит (прерывание каста — только ультой). */
  private curKind: 'basic' | 'active' | 'ult' | null = null;
  /** Невыполненные команды игрока и момент, с которого ульты снова автоматические. */
  private pending: BattleInput[] = [];
  private autoFrom = Infinity;
  /** Артефакты отряда: id → сила; счётчик ударов отряда, метка охотницы, разовые срабатывания. */
  private artifact: Record<string, number> = {};
  private partyHits = 0;
  private markUid = -1;
  private artifactUsed: Record<string, 1> = {};
  private prismElements = 0;

  constructor(
    cfg: Config,
    private setup: BattleSetup,
  ) {
    this.rng = new Rng(setup.seed);
    this.B = cfg.battle;
    this.S = cfg.stat;
    this.limit = setup.timeLimit * 1000;
    for (const x of setup.inputs ?? []) {
      if (x.u < 0) this.autoFrom = Math.min(this.autoFrom, x.t);
      else this.pending.push({ ...x });
    }
    this.pending.sort((a, b) => a.t - b.t || a.u - b.u);
    for (const r of setup.artifacts ?? []) this.artifact[r.id] = artifactValue(r.id, r.lvl);
  }

  private emit(e: BattleEvent) {
    if (!this.setup.quiet) this.events.push(e);
  }

  // ——— подготовка ———

  private makeSkill(ref: SkillRef | undefined): ActiveSkill | undefined {
    if (!ref) return undefined;
    const def = SKILL_MAP[ref.id];
    if (!def) return undefined;
    let cdReduce = 0;
    for (const m of ref.mods) cdReduce += m.mod.cdReduce ?? 0;
    const maxCd = Math.max(1, (def.cd ?? 0) - cdReduce);
    return { ref, def, cd: def.kind === 'active' ? 1 : 0, maxCd };
  }

  private addUnit(init: UnitInit, t: number): U {
    const st = init.stats;
    const fx: Record<string, SpecialEffect> = {};
    for (const f of init.fx) {
      const prev = fx[f.id];
      // одинаковые эффекты складываются по силе
      fx[f.id] = prev ? { ...prev, v: (prev.v ?? 0) + (f.v ?? 0), n: Math.max(prev.n ?? 0, f.n ?? 0) } : { ...f };
    }
    const u: U = {
      uid: this.units.length,
      side: init.side,
      slot: init.slot,
      row: init.row,
      kind: init.kind,
      ref: init.ref,
      element: init.element,
      cls: init.cls,
      targeting: init.targeting,
      melee: init.melee,
      maxHp: Math.max(1, Math.round(st.hp)),
      hp: 0,
      atk: Math.max(1, Math.round(st.atk)),
      def: Math.max(0, Math.round(st.def)),
      spd: Math.max(20, Math.round(st.spd)),
      crit: st.crit,
      critDmg: st.critDmg,
      acc: st.acc,
      eva: st.eva,
      pen: st.pen,
      lifesteal: st.lifesteal,
      healPower: st.healPower,
      resist: st.resist,
      energyRegen: st.energyRegen,
      bonus: st.bonus,
      energy: init.energy ?? 0,
      shield: 0,
      alive: true,
      nextAt: 0,
      basic: this.makeSkill(init.basic)!,
      skills: init.skills.map((r) => this.makeSkill(r)).filter((x): x is ActiveSkill => !!x),
      ult: this.makeSkill(init.ult),
      statuses: [],
      fx,
      used: {},
      killStacks: 0,
      echoCount: 0,
      mechanic: init.mechanic,
      act: init.act,
      lvl: init.lvl,
      stars: init.stars,
      turns: 0,
      tide: 0,
      field: 0,
      phase: 0,
      bloodStacks: 0,
      firstDone: false,
      casting: 0,
    };
    u.hp = Math.max(1, Math.round(u.maxHp * (init.hpPct ?? 1)));
    const interval = this.interval(u);
    u.nextAt = t + Math.floor(interval * (0.35 + 0.08 * (init.slot % 6))) + init.side * 7 + init.slot;
    this.units.push(u);
    return u;
  }

  private snap(u: U): UnitSnap {
    return {
      uid: u.uid,
      side: u.side,
      slot: u.slot,
      row: u.row,
      kind: u.kind,
      ref: u.ref,
      el: u.element,
      maxHp: u.maxHp,
      hp: u.hp,
      energy: u.energy,
      lvl: u.lvl,
      stars: u.stars,
      mirror: u.mirror,
    };
  }

  run(): BattleResult {
    for (const init of this.setup.units) this.addUnit(init, 0);

    // ауры и стартовые эффекты
    for (const u of this.units) {
      const allies = this.units.filter((x) => x.side === u.side);
      const a = u.fx;
      if (a.auraAtk) for (const x of allies) x.atk = Math.round(x.atk * (1 + (a.auraAtk.v ?? 0)));
      if (a.auraDef) for (const x of allies) x.def = Math.round(x.def * (1 + (a.auraDef.v ?? 0)));
      if (a.auraSpd) for (const x of allies) x.spd += a.auraSpd.n ?? 0;
      if (a.auraCrit) for (const x of allies) x.crit += a.auraCrit.v ?? 0;
      if (a.auraHeal) for (const x of allies) x.healPower += a.auraHeal.v ?? 0;
    }
    for (const u of this.units) {
      if (u.fx.startShield) u.shield = Math.round(u.maxHp * (u.fx.startShield.v ?? 0));
      if (u.fx.startEnergy) u.energy = Math.max(u.energy, u.fx.startEnergy.n ?? 0);
      if (u.fx.tauntStart) this.addStatus(u, { key: 'taunt', type: 'taunt', value: 0, amount: 0, turns: u.fx.tauntStart.n ?? 2, src: u.uid });
    }

    this.setupArtifacts();
    this.emit({ t: 0, k: 'start', units: this.units.map((u) => this.snap(u)) });
    for (const u of this.units) if (u.shield > 0) this.emit({ t: 0, k: 'shield', tg: u.uid, v: u.shield, sh: u.shield });
    this.setupMechanics();
    this.setupCasts();

    let win = false;
    let timeout = false;
    let guard = 0;
    for (;;) {
      if (++guard > 20000) {
        timeout = true;
        break;
      }
      const res = this.checkEnd();
      if (res !== null) {
        win = res;
        break;
      }
      // ближайший таймер механики или ход юнита
      let actor: U | null = null;
      for (const u of this.units) {
        if (!u.alive) continue;
        if (!actor || u.nextAt < actor.nextAt || (u.nextAt === actor.nextAt && u.uid < actor.uid)) actor = u;
      }
      let timer: Timer | null = null;
      for (const tm of this.timers) if (!timer || tm.at < timer.at) timer = tm;
      const nextT = Math.min(actor ? actor.nextAt : Infinity, timer ? timer.at : Infinity);
      if (nextT > this.limit || nextT === Infinity) {
        timeout = true;
        this.t = this.limit;
        break;
      }
      this.t = nextT;
      if (timer && timer.at <= (actor ? actor.nextAt : Infinity)) {
        this.timers.splice(this.timers.indexOf(timer), 1);
        timer.run();
        continue;
      }
      this.takeTurn(actor!);
    }
    if (timeout) win = false;
    this.emit({ t: this.t, k: 'end', win });

    const heroHp: Record<string, number> = {};
    for (const u of this.units)
      if (u.side === 0 && u.kind === 'hero') heroHp[u.ref] = u.alive ? Math.max(0, u.hp / u.maxHp) : 0;
    return {
      win,
      time: this.t,
      events: this.events,
      heroHp,
      dmgDone: this.dmgDone,
      healDone: this.healDone,
      kills: this.kills,
      units: this.units.map((u) => this.snap(u)),
      timeout,
    };
  }

  /** Победа — когда пали все основные враги (призванные не считаются). */
  private checkEnd(): boolean | null {
    const heroesAlive = this.units.some((u) => u.side === 0 && u.alive && u.kind !== 'summon');
    const enemiesAlive = this.units.some((u) => u.side === 1 && u.alive && u.kind !== 'summon');
    if (!heroesAlive) return false;
    if (!enemiesAlive) return true;
    return null;
  }

  private interval(u: U): number {
    let spd = u.spd;
    for (const s of u.statuses) if (s.stat === 'spd') spd += s.value;
    spd = Math.max(20, spd);
    return Math.floor((this.B.actionInterval * 100) / spd);
  }

  // ——— эффективные характеристики ———

  private buffSum(u: U, stat: BuffStat): number {
    let v = 0;
    for (const s of u.statuses) if ((s.type === 'buff' || s.type === 'debuff') && s.stat === stat) v += s.value;
    return v;
  }

  private effAtk(u: U): number {
    let mult = 1 + this.buffSum(u, 'atk') + u.killStacks * (u.fx.killStack?.v ?? 0) + u.bloodStacks * 0.15;
    const hpFrac = u.hp / u.maxHp;
    if (u.fx.lastStand && hpFrac < 0.3) mult += u.fx.lastStand.v ?? 0;
    if (u.fx.berserkLowHp) mult += Math.floor((1 - hpFrac) * 10) * (u.fx.berserkLowHp.v ?? 0);
    return u.atk * Math.max(0.1, mult);
  }

  private effDef(u: U): number {
    let mult = 1 + this.buffSum(u, 'def');
    if (u.fx.lastStand && u.hp / u.maxHp < 0.3) mult += u.fx.lastStand.v ?? 0;
    return u.def * Math.max(0, mult);
  }

  private hasCc(u: U): Status | undefined {
    return u.statuses.find((s) => s.type === 'cc' && (s.cc === 'stun' || s.cc === 'freeze'));
  }

  private isSilenced(u: U): boolean {
    return u.statuses.some((s) => s.type === 'cc' && s.cc === 'silence');
  }

  // ——— ход ———

  private takeTurn(u: U) {
    u.turns++;
    // периодический урон и лечение
    for (const s of [...u.statuses]) {
      if (!u.alive) break;
      if (s.type === 'dot') this.applyDamageRaw(this.units[s.src] ?? null, u, s.amount, { dot: s.dot });
      else if (s.type === 'hot') this.heal(this.units[s.src] ?? u, u, s.amount, true);
    }
    if (!u.alive) return;
    if (u.fx.cleanseTurn && this.rng.chance(u.fx.cleanseTurn.v ?? 0)) this.cleanse(u);

    // механики боссов, срабатывающие на ходу босса
    if (u.mechanic) this.bossTurnMechanic(u);
    if (!u.alive) return;

    const cc = this.hasCc(u);
    if (!cc) {
      this.act(u);
      // огонь растапливает лёд (механика Скади)
      if (u.side === 0 && u.element === 'fire') {
        for (const a of this.units)
          if (a.side === 0 && a.alive) {
            const fr = a.statuses.find((s) => s.cc === 'freeze');
            if (fr) {
              this.removeStatus(a, fr);
              this.emit({ t: this.t, k: 'mech', m: 'thaw', tg: a.uid });
            }
          }
      }
    }
    // конец хода: длительности и перезарядки
    for (const s of [...u.statuses]) {
      s.turns--;
      if (s.turns <= 0) this.removeStatus(u, s);
    }
    for (const sk of u.skills) if (sk.cd > 0) sk.cd--;
    u.nextAt = this.t + this.interval(u);
  }

  private act(u: U) {
    const silenced = this.isSilenced(u);
    let choice: ActiveSkill = u.basic;
    let kind: 'basic' | 'active' | 'ult' = 'basic';
    let ultReady = !silenced && !!u.ult && u.energy >= this.B.energyMax;
    // ручной режим: героиня держит ульту, пока игрок не скомандует
    if (ultReady && this.setup.manual && u.side === 0 && u.kind === 'hero' && this.t < this.autoFrom) {
      const i = this.pending.findIndex((x) => x.u === u.uid && x.t <= this.t);
      if (i < 0) ultReady = false;
      else this.pending.splice(i, 1);
    }
    if (ultReady && u.ult) {
      choice = u.ult;
      kind = 'ult';
    } else if (!silenced) {
      for (const sk of u.skills) {
        if (sk.cd > 0) continue;
        if (!this.skillUseful(u, sk.def)) continue;
        choice = sk;
        kind = 'active';
        break;
      }
    }
    if (kind === 'ult') u.energy = 0;
    else this.gainEnergy(u, this.B.energyPerAttack);
    this.useSkill(u, choice, kind);
    if (kind === 'active') {
      choice.cd = choice.maxCd;
      if (u.fx.echo) {
        u.echoCount++;
        const n = u.fx.echo.n ?? 5;
        if (u.echoCount % n === 0 && u.alive) {
          this.emit({ t: this.t, k: 'mech', m: 'echo', tg: u.uid });
          this.useSkill(u, choice, kind);
        }
      }
    }
    if (kind === 'ult') {
      const allies = this.alive(u.side);
      if (this.artifact.storm_heart && u.side === 0) for (const a of allies) if (a !== u) this.gainEnergy(a, this.artifact.storm_heart);
      if (u.fx.ultTeamHeal) for (const a of allies) this.heal(u, a, Math.round(this.effAtk(u) * (u.fx.ultTeamHeal.v ?? 0) * u.healPower));
      if (u.fx.shieldOnUlt) for (const a of allies) this.giveShield(u, a, Math.round(this.effAtk(u) * (u.fx.shieldOnUlt.v ?? 0)));
    }
    if (kind === 'basic' && u.alive && u.fx.doubleStrike && this.rng.chance(u.fx.doubleStrike.v ?? 0)) {
      this.useSkill(u, u.basic, 'basic');
    }
    u.firstDone = true;
  }

  private skillUseful(u: U, def: SkillDef): boolean {
    const first = def.effects[0];
    if (first?.t === 'heal') {
      const allies = this.alive(u.side);
      return allies.some((a) => a.hp < a.maxHp * 0.9);
    }
    if (first?.t === 'summon') {
      const mine = this.units.filter((x) => x.alive && x.summoner === u.uid).length;
      return mine < 4;
    }
    return true;
  }

  private gainEnergy(u: U, amount: number) {
    if (!u.alive) return;
    u.energy = Math.min(this.B.energyMax, u.energy + Math.round(amount * u.energyRegen));
  }

  // ——— цели ———

  private alive(side: 0 | 1): U[] {
    return this.units.filter((x) => x.side === side && x.alive);
  }

  private enemiesOf(u: U): U[] {
    return this.alive(u.side === 0 ? 1 : 0);
  }

  private pickSingleEnemy(u: U, rule: 'enemy' | 'enemyBack'): U | undefined {
    const foes = this.enemiesOf(u);
    if (!foes.length) return undefined;
    const taunters = foes.filter((f) => f.statuses.some((s) => s.type === 'taunt'));
    if (taunters.length) return taunters[this.rng.int(taunters.length)];
    const front = foes.filter((f) => f.row === 'front');
    const back = foes.filter((f) => f.row === 'back');
    if (rule === 'enemyBack' || u.targeting === 'back') {
      const pool = back.length ? back : front;
      return pool[this.rng.int(pool.length)];
    }
    if (front.length && back.length) {
      const pool = this.rng.chance(this.B.frontRowAggro) ? front : back;
      return pool[this.rng.int(pool.length)];
    }
    const pool = front.length ? front : back;
    return pool[this.rng.int(pool.length)];
  }

  private resolveTargets(u: U, rule: TargetRule, hits: number): U[] {
    switch (rule) {
      case 'enemy':
      case 'enemyBack': {
        const t = this.pickSingleEnemy(u, rule);
        return t ? [t] : [];
      }
      case 'enemyFront': {
        const foes = this.enemiesOf(u);
        const front = foes.filter((f) => f.row === 'front');
        return front.length ? front : foes;
      }
      case 'enemyAll':
        return this.enemiesOf(u);
      case 'enemyRandom': {
        const foes = this.enemiesOf(u);
        const out: U[] = [];
        if (!foes.length) return out;
        for (let i = 0; i < hits; i++) out.push(foes[this.rng.int(foes.length)]);
        return out;
      }
      case 'enemyLowest': {
        const foes = this.enemiesOf(u);
        let best: U | undefined;
        for (const f of foes) if (!best || f.hp / f.maxHp < best.hp / best.maxHp) best = f;
        return best ? [best] : [];
      }
      case 'self':
        return [u];
      case 'allyLowest': {
        let best: U | undefined;
        for (const a of this.alive(u.side)) if (!best || a.hp / a.maxHp < best.hp / best.maxHp) best = a;
        return best ? [best] : [];
      }
      case 'allyAll':
        return this.alive(u.side);
      case 'allyFront': {
        const al = this.alive(u.side);
        const front = al.filter((a) => a.row === 'front');
        return front.length ? front : al;
      }
      case 'allyDead': {
        const dead = this.units.find((x) => x.side === u.side && !x.alive && x.kind !== 'summon');
        return dead ? [dead] : [];
      }
      case 'allyStrongest': {
        let best: U | undefined;
        for (const a of this.alive(u.side)) if (a !== u && (!best || a.atk > best.atk)) best = a;
        return best ? [best] : [u];
      }
    }
  }

  // ——— умения ———

  private skillEffects(sk: ActiveSkill): { effects: SkillEffect[]; extraHits: number } {
    const rank = sk.ref.rank;
    let extraHits = 0;
    let multBonus = 0;
    const added: SkillEffect[] = [];
    for (const { mod, rank: mr } of sk.ref.mods) {
      extraHits += mod.extraHits ?? 0;
      multBonus += (mod.multBonus ?? 0) * mr;
      for (const e of mod.addEffects ?? []) {
        added.push({
          ...e,
          mult: e.mult !== undefined ? e.mult * mr : undefined,
          chance: e.chance !== undefined ? Math.min(1, e.chance * mr) : undefined,
          value: e.value !== undefined ? e.value * mr : undefined,
          count: e.count,
        });
      }
    }
    const effects = sk.def.effects.map((e) => {
      const out: SkillEffect = { ...e };
      if (e.mult !== undefined) {
        const per = e.perRank ?? e.mult * 0.2;
        out.mult = e.mult + per * (rank - 1);
        if (e.t === 'dmg' || e.t === 'heal' || e.t === 'shield') out.mult += multBonus * (e.scale === 'hp' ? 0.05 : 1);
      }
      if (e.value !== undefined && e.valuePerRank !== undefined) out.value = e.value + e.valuePerRank * (rank - 1);
      return out;
    });
    return { effects: [...effects, ...added], extraHits };
  }

  private useSkill(u: U, sk: ActiveSkill, kind: 'basic' | 'active' | 'ult') {
    if (!u.alive) return;
    const prevKind = this.curKind;
    this.curKind = kind;
    try {
      this.useSkillInner(u, sk, kind);
    } finally {
      this.curKind = prevKind;
    }
  }

  private useSkillInner(u: U, sk: ActiveSkill, kind: 'basic' | 'active' | 'ult') {
    const { effects, extraHits } = this.skillEffects(sk);
    const firstDmg = effects.find((e) => e.t === 'dmg');
    const hits = (firstDmg?.hits ?? 1) + (firstDmg ? extraHits : 0);
    const primary = this.resolveTargets(u, sk.def.target, sk.def.target === 'enemyRandom' ? hits : 1);
    this.emit({ t: this.t, k: 'act', u: u.uid, s: sk.def.id, kind, tg: [...new Set(primary.map((x) => x.uid))], e: u.energy });

    for (const eff of effects) {
      if (!u.alive && eff.t !== 'revive') break;
      let targets = eff.target ? this.resolveTargets(u, eff.target, eff.hits ?? 1) : primary;
      if (eff.t !== 'dmg') targets = [...new Set(targets)];
      targets = targets.filter((x) => x.alive || eff.t === 'revive');
      if (!targets.length) continue;
      switch (eff.t) {
        case 'dmg': {
          const perTarget = sk.def.target === 'enemyRandom' && !eff.target ? 1 : (eff.hits ?? 1) + (eff === firstDmg ? extraHits : 0);
          for (const tg of targets) {
            for (let h = 0; h < perTarget; h++) {
              if (!tg.alive) break;
              this.strike(u, tg, eff, kind, sk.def);
            }
          }
          if (kind === 'basic' && u.fx.chain && eff === firstDmg) {
            const others = this.enemiesOf(u).filter((x) => !targets.includes(x));
            if (others.length) this.strike(u, others[this.rng.int(others.length)], { ...eff, mult: (eff.mult ?? 1) * (u.fx.chain.v ?? 0.5) }, kind, sk.def);
          }
          break;
        }
        case 'heal': {
          for (const tg of targets) {
            // щит от HP заклинателя не больше HP цели: иначе босс (HP ×14) делает свиту бессмертной
            const base = eff.scale === 'hp' ? Math.min(u.maxHp, tg.maxHp) : eff.scale === 'def' ? this.effDef(u) : this.effAtk(u);
            this.heal(u, tg, Math.round(base * (eff.mult ?? 1) * u.healPower));
          }
          break;
        }
        case 'shield': {
          for (const tg of targets) {
            // щит от HP заклинателя не больше HP цели: иначе босс (HP ×14) делает свиту бессмертной
            const base = eff.scale === 'hp' ? Math.min(u.maxHp, tg.maxHp) : eff.scale === 'def' ? this.effDef(u) : this.effAtk(u);
            this.giveShield(u, tg, Math.round(base * (eff.mult ?? 1) * (1 + (u.bonus.shieldPower ?? 0))));
          }
          break;
        }
        case 'dot': {
          for (const tg of targets) this.applyDot(u, tg, eff.dot ?? 'poison', eff.mult ?? 0.3, eff.turns ?? 2, eff.element);
          break;
        }
        case 'hot': {
          for (const tg of targets) {
            const amount = Math.round(this.effAtk(u) * (eff.mult ?? 0.3) * u.healPower);
            this.addStatus(tg, { key: `hot:${u.uid}`, type: 'hot', value: 0, amount, turns: eff.turns ?? 3, src: u.uid });
          }
          break;
        }
        case 'cc': {
          for (const tg of targets) this.applyCc(u, tg, eff.cc ?? 'stun', eff.chance ?? 1, eff.turns ?? 1);
          break;
        }
        case 'buff':
        case 'debuff': {
          for (const tg of targets) {
            if (eff.t === 'debuff' && tg.side !== u.side) {
              if (eff.stat === 'acc' && tg.fx.immuneBlind) continue;
              const chance = (eff.chance ?? 1) * (1 - Math.min(this.S.resistMax, tg.resist));
              if (!this.rng.chance(chance)) continue;
            }
            this.addStatus(tg, {
              key: `${eff.t}:${eff.stat}:${sk.def.id}`,
              type: eff.t,
              stat: eff.stat,
              value: eff.value ?? 0,
              amount: 0,
              turns: eff.turns ?? 2,
              src: u.uid,
            });
          }
          break;
        }
        case 'taunt': {
          for (const tg of targets) this.addStatus(tg, { key: 'taunt', type: 'taunt', value: 0, amount: 0, turns: eff.turns ?? 2, src: u.uid });
          break;
        }
        case 'energy': {
          for (const tg of targets) {
            if (tg === u && kind === 'ult') continue;
            tg.energy = Math.min(this.B.energyMax, tg.energy + (eff.amount ?? 10));
            this.emit({ t: this.t, k: 'energy', tg: tg.uid, e: tg.energy });
          }
          break;
        }
        case 'summon': {
          this.summon(u, eff.unit ?? 'skeleton', eff.count ?? 1, eff.mult ?? 0.5);
          break;
        }
        case 'revive': {
          for (const tg of targets) if (!tg.alive) this.revive(tg, eff.pct ?? 0.3);
          break;
        }
        case 'cleanse': {
          for (const tg of targets) this.cleanse(tg);
          break;
        }
      }
    }
  }

  // ——— урон ———

  private strike(u: U, tg: U, eff: SkillEffect, kind: 'basic' | 'active' | 'ult', def: SkillDef, isCounter = false) {
    if (!tg.alive || !u.alive) return;
    const el = eff.element ?? u.element;
    // промах: уклонение цели против точности атакующей (ослепление снижает точность)
    const acc = u.acc + this.buffSum(u, 'acc');
    const eva = Math.min(this.S.evaMax, tg.eva + this.buffSum(tg, 'eva'));
    const miss = Math.min(0.75, Math.max(0, eva - acc));
    if (miss > 0 && this.rng.chance(miss)) {
      this.emit({ t: this.t, k: 'dmg', u: u.uid, tg: tg.uid, v: 0, hp: tg.hp, sh: tg.shield, miss: 1, te: tg.energy });
      return;
    }
    void def;
    const atk = this.effAtk(u);
    const k = eff.mult ?? 1;
    const pen = Math.min(this.S.penMax, Math.max(0, u.pen));
    const defF = this.B.defConst / (this.B.defConst + this.effDef(tg) * (1 - pen));
    let elem = elementMult(el, tg.element, this.B.elemAdv);
    const critChance = Math.min(this.S.critMax, u.crit + this.buffSum(u, 'crit'));
    const isCrit = this.rng.chance(critChance);
    const crit = isCrit ? Math.max(1, u.critDmg + this.buffSum(u, 'critDmg')) : 1;
    const vr = this.rng.float(this.B.varianceMin, this.B.varianceMax);
    let bonus = 1 + (u.bonus[ELEM_KEY[el]] ?? 0) + this.buffSum(u, 'dmg');
    if (kind === 'basic') bonus += u.bonus.dmgBasic ?? 0;
    else if (kind === 'active') bonus += u.bonus.dmgSkill ?? 0;
    else bonus += u.bonus.dmgUlt ?? 0;
    if (tg.kind === 'boss' || tg.kind === 'mini') bonus += u.bonus.dmgBoss ?? 0;
    const low = tg.hp / tg.maxHp < 0.3;
    if (low && eff.execute) bonus += eff.execute;
    if (low && u.fx.execute) bonus += u.fx.execute.v ?? 0;
    if (!u.firstDone && u.fx.firstStrike) bonus += u.fx.firstStrike.v ?? 0;
    if (u.fx.frozenVuln && this.hasCc(tg)) bonus += u.fx.frozenVuln.v ?? 0;
    if (u.side === 0) {
      if (tg.uid === this.markUid && this.artifact.hunter_mark) bonus += this.artifact.hunter_mark;
      if (this.artifact.aether_prism) bonus += this.artifact.aether_prism * this.prismElements;
    }
    let taken = 1 + this.buffSum(tg, 'dmgTaken') - Math.min(this.S.dmgReduceMax, tg.bonus.dmgReduce ?? 0);
    // механики
    if (tg.mechanic === 'skyborne' && u.melee) taken *= 0.5;
    if (tg.mechanic === 'phases') elem *= el === PHASE_WEAK[tg.phase % 3] ? 1.6 : 0.75;
    taken = Math.max(0.1, taken);

    let dmg = Math.floor(atk * k * defF * elem * crit * vr * bonus * taken);
    if (dmg < 1) dmg = 1;
    if (this.setup.oneShot && u.side === 0) dmg = tg.hp + tg.shield + tg.tide;
    const br = this.setup.debug ? { atk: Math.round(atk), k, defF, elem, crit, vr, bonus, taken } : undefined;

    // щит приливов Талассии: базовые атаки не пробивают
    if (tg.tide > 0) {
      if (kind === 'basic') {
        this.emit({ t: this.t, k: 'dmg', u: u.uid, tg: tg.uid, v: 0, hp: tg.hp, sh: tg.shield, blk: 1, te: tg.energy });
        return;
      }
      const absorbed = Math.min(tg.tide, dmg);
      tg.tide -= absorbed;
      dmg -= absorbed;
      if (tg.tide <= 0) this.emit({ t: this.t, k: 'mech', m: 'tideBreak', tg: tg.uid });
      if (dmg <= 0) {
        this.emit({ t: this.t, k: 'dmg', u: u.uid, tg: tg.uid, v: absorbed, hp: tg.hp, sh: tg.shield, blk: 1, te: tg.energy });
        return;
      }
    }

    const dealt = this.applyDamageRaw(u, tg, dmg, { crit: isCrit, br });
    if (dealt > 0) {
      // вампиризм
      const ls = Math.min(this.S.lifestealMax, u.lifesteal) + (eff.lifesteal ?? 0) + (u.mechanic === 'bloodThirst' ? 1 : 0);
      if (ls > 0 && u.alive) this.heal(u, u, Math.round(dealt * ls));
      // эффекты при попадании
      if (u.fx.bleedOnHit && this.rng.chance(u.fx.bleedOnHit.v ?? 0)) this.applyDot(u, tg, 'bleed', 0.3, 2);
      if (u.fx.burnOnHit && this.rng.chance(u.fx.burnOnHit.v ?? 0)) this.applyDot(u, tg, 'burn', 0.3, 2);
      if (u.fx.poisonOnHit && this.rng.chance(u.fx.poisonOnHit.v ?? 0)) this.applyDot(u, tg, 'poison', 0.35, 3);
      if (u.side === 0 && !isCounter) this.onPartyHit(u, tg);
      if (isCrit) {
        if (u.fx.critEnergy) this.gainEnergy(u, u.fx.critEnergy.n ?? 10);
        if (u.fx.critStun && tg.alive && this.rng.chance(u.fx.critStun.v ?? 0)) this.applyCc(u, tg, 'stun', 1, 1);
      }
      // ответные эффекты
      if (tg.alive && tg.fx.thorns && u.alive) {
        const refl = Math.max(1, Math.round(dealt * (tg.fx.thorns.v ?? 0)));
        this.applyDamageRaw(tg, u, refl, { dot: 'thorns' });
      }
      if (!isCounter && tg.alive && u.alive && tg.fx.counter && this.rng.chance(tg.fx.counter.v ?? 0)) {
        this.emit({ t: this.t, k: 'act', u: tg.uid, s: tg.basic.def.id, kind: 'basic', tg: [u.uid], e: tg.energy });
        this.strike(tg, u, { t: 'dmg', mult: 1 }, 'basic', tg.basic.def, true);
      }
    }
  }

  /** Нанести урон (с учётом щита). Возвращает урон по HP+щиту. */
  private applyDamageRaw(src: U | null, tg: U, dmg: number, opt: { crit?: boolean; dot?: string; br?: DmgBreakdown }): number {
    if (!tg.alive) return 0;
    if (this.setup.oneShot && src?.side === 0 && opt.dot) dmg = tg.hp + tg.shield;
    let absorbed = 0;
    if (tg.shield > 0) {
      absorbed = Math.min(tg.shield, dmg);
      tg.shield -= absorbed;
    }
    const hpDmg = dmg - absorbed;
    tg.hp -= hpDmg;
    // ульта сбивает «Сокрушительный удар»
    if (tg.casting && src && src.side !== tg.side && this.curKind === 'ult' && !opt.dot) this.interrupt(tg);
    if (this.setup.immortal && tg.side === 0 && tg.hp < 1) tg.hp = 1;
    if (src) this.dmgDone[src.uid] = (this.dmgDone[src.uid] ?? 0) + dmg;
    if (!opt.dot) this.gainEnergy(tg, this.B.energyPerHit);
    this.emit({
      t: this.t,
      k: 'dmg',
      u: src ? src.uid : -1,
      tg: tg.uid,
      v: dmg,
      hp: Math.max(0, tg.hp),
      sh: tg.shield,
      crit: opt.crit ? 1 : undefined,
      dot: opt.dot,
      te: tg.energy,
      br: opt.br,
    });
    // второе дыхание
    if (tg.hp > 0 && tg.fx.secondWind && !tg.used.secondWind && tg.hp < tg.maxHp * 0.3) {
      tg.used.secondWind = 1;
      this.heal(tg, tg, Math.round(tg.maxHp * (tg.fx.secondWind.v ?? 0.3)));
    }
    if (tg.hp <= 0) this.onLethal(src, tg);
    if (tg.side === 0 && hpDmg > 0) this.onPartyHurt(tg);
    return dmg;
  }

  private onLethal(src: U | null, tg: U) {
    // ангел-хранитель союзницы
    if (tg.kind !== 'summon') {
      const angel = this.units.find((a) => a.side === tg.side && a.alive && a.fx.guardianAngel && !a.used.guardianAngel);
      if (angel) {
        angel.used.guardianAngel = 1;
        tg.hp = 1;
        this.emit({ t: this.t, k: 'mech', m: 'angel', tg: tg.uid });
        this.giveShield(angel, tg, Math.round(tg.maxHp * 0.2));
        return;
      }
    }
    tg.hp = 0;
    tg.alive = false;
    tg.shield = 0;
    const hadDots = tg.statuses.filter((s) => s.type === 'dot');
    tg.statuses = [];
    this.emit({ t: this.t, k: 'death', tg: tg.uid });
    if (tg.side === 1 && tg.kind !== 'summon') this.kills++;
    if (tg.side === 1 && tg.kind === 'enemy') this.deadMinions.push(tg.uid);

    // феникс
    if (tg.fx.phoenix && !tg.used.phoenix) {
      tg.used.phoenix = 1;
      this.revive(tg, tg.fx.phoenix.v ?? 0.3);
      this.emit({ t: this.t, k: 'mech', m: 'phoenix', tg: tg.uid });
    }
    if (!tg.alive && tg.side === 0 && tg.kind === 'hero' && this.artifact.phoenix_ash && !this.artifactUsed.phoenix_ash) {
      this.artifactUsed.phoenix_ash = 1;
      this.revive(tg, this.artifact.phoenix_ash);
      this.emit({ t: this.t, k: 'mech', m: 'artifact:phoenix_ash', tg: tg.uid });
    }
    // эффекты убийцы
    if (src && src.alive && src.side !== tg.side) {
      if (src.fx.killStack) {
        const max = src.fx.killStack.n ?? 5;
        if (src.killStacks < max) src.killStacks++;
      }
      if (src.fx.energyOnKill) this.gainEnergy(src, src.fx.energyOnKill.n ?? 20);
      if (src.fx.healOnKill) this.heal(src, src, Math.round(src.maxHp * (src.fx.healOnKill.v ?? 0.1)));
    }
    // эпидемия: периодический урон переходит на соседа
    if (hadDots.length) {
      const spreader = this.units.find((x) => x.side !== tg.side && x.alive && x.fx.dotSpread);
      if (spreader) {
        const others = this.alive(tg.side);
        if (others.length) {
          const next = others[this.rng.int(others.length)];
          for (const d of hadDots) this.addStatus(next, { ...d, key: `${d.key}:s${this.t}`, turns: Math.max(1, d.turns) });
        }
      }
    }
    // костяной долг: призыв скелета при гибели союзницы
    if (tg.kind === 'hero') {
      for (const nec of this.units) {
        if (nec.side !== tg.side || !nec.alive || !nec.fx.summonOnAllyDeath) continue;
        const used = nec.used.summonOnAllyDeath ?? 0;
        if (used >= (nec.fx.summonOnAllyDeath.n ?? 2)) continue;
        nec.used.summonOnAllyDeath = used + 1;
        this.summon(nec, 'skeleton', 1, 0.6);
      }
    }
  }

  private heal(src: U, tg: U, amount: number, isHot = false) {
    if (!tg.alive || amount <= 0) return;
    const mult = Math.max(0, 1 + this.buffSum(tg, 'healRecv'));
    amount = Math.round(amount * mult);
    const missing = tg.maxHp - tg.hp;
    const real = Math.min(missing, amount);
    tg.hp += real;
    if (real > 0 || !isHot) this.emit({ t: this.t, k: 'heal', u: src.uid, tg: tg.uid, v: real, hp: tg.hp });
    this.healDone[src.uid] = (this.healDone[src.uid] ?? 0) + real;
    const over = amount - real;
    if (over > 0 && src.fx.overhealShield) this.giveShield(src, tg, Math.round(over * (src.fx.overhealShield.v ?? 0.5)));
  }

  private giveShield(_src: U, tg: U, amount: number) {
    if (!tg.alive || amount <= 0) return;
    tg.shield = Math.min(tg.maxHp, tg.shield + amount);
    this.emit({ t: this.t, k: 'shield', tg: tg.uid, v: amount, sh: tg.shield });
  }

  private applyDot(u: U, tg: U, kind: string, mult: number, turns: number, element?: Element) {
    if (!tg.alive) return;
    const el = element ?? u.element;
    const pen = Math.min(this.S.penMax, Math.max(0, u.pen));
    const defF = this.B.defConst / (this.B.defConst + this.effDef(tg) * (1 - pen) * 0.5);
    const amount = Math.max(
      1,
      Math.round(this.effAtk(u) * mult * (1 + (u.bonus.dmgDot ?? 0)) * defF * elementMult(el, tg.element, this.B.elemAdv)),
    );
    const same = tg.statuses.filter((s) => s.type === 'dot' && s.dot === kind);
    if (same.length >= 3) this.removeStatus(tg, same[0]);
    this.addStatus(tg, { key: `dot:${kind}:${u.uid}:${this.t}`, type: 'dot', dot: kind, value: 0, amount, turns, src: u.uid });
  }

  private applyCc(u: U, tg: U, cc: string, chance: number, turns: number) {
    if (!tg.alive) return;
    const resist = tg.side !== u.side ? Math.min(this.S.resistMax, tg.resist) : 0;
    if (!this.rng.chance(chance * (1 - resist))) return;
    if (tg.fx.ccImmuneFirst && !tg.used.ccImmune) {
      tg.used.ccImmune = 1;
      this.emit({ t: this.t, k: 'mech', m: 'immune', tg: tg.uid });
      return;
    }
    // боссы устойчивее к контролю
    if ((tg.kind === 'boss' || tg.kind === 'mini') && !this.rng.chance(0.5)) return;
    this.addStatus(tg, { key: `cc:${cc}`, type: 'cc', cc, value: 0, amount: 0, turns, src: u.uid });
  }

  private addStatus(tg: U, st: Status) {
    const existing = tg.statuses.find((s) => s.key === st.key);
    if (existing) {
      existing.turns = Math.max(existing.turns, st.turns);
      if (Math.abs(st.value) > Math.abs(existing.value)) existing.value = st.value;
      if (st.amount > existing.amount) existing.amount = st.amount;
      return;
    }
    tg.statuses.push({ ...st });
    this.emit({ t: this.t, k: 'status', tg: tg.uid, st: statusLabel(st), on: 1 });
    if (tg.casting && st.type === 'cc' && (st.cc === 'stun' || st.cc === 'freeze')) this.interrupt(tg, false);
  }

  // ——— артефакты отряда ———

  private setupArtifacts() {
    const r = this.artifact;
    const heroes = this.units.filter((u) => u.side === 0 && u.kind === 'hero');
    if (r.war_drum) for (const h of heroes) h.energy = Math.min(this.B.energyMax, h.energy + Math.round(r.war_drum));
    if (r.aether_prism) this.prismElements = new Set(heroes.map((h) => h.element)).size;
    if (r.dew_flask) {
      const tick = (at: number) =>
        this.timers.push({
          at,
          run: () => {
            let low: U | null = null;
            for (const h of this.alive(0)) if (h.kind !== 'summon' && h.hp < h.maxHp && (!low || h.hp / h.maxHp < low.hp / low.maxHp)) low = h;
            if (low) {
              this.emit({ t: this.t, k: 'mech', m: 'artifact:dew_flask', tg: low.uid });
              this.heal(low, low, Math.round(low.maxHp * r.dew_flask));
            }
            tick(this.t + 10000);
          },
        });
      tick(10000);
    }
    if (r.hunter_mark) {
      const mark = (at: number) =>
        this.timers.push({
          at,
          run: () => {
            let best: U | null = null;
            for (const e of this.alive(1)) if (e.kind !== 'summon' && (!best || e.hp > best.hp)) best = e;
            if (best && best.uid !== this.markUid) {
              this.markUid = best.uid;
              this.emit({ t: this.t, k: 'mech', m: 'artifact:hunter_mark', tg: best.uid });
            }
            mark(this.t + 12000);
          },
        });
      mark(0);
    }
    if (r.time_chain) {
      const stop = (at: number) =>
        this.timers.push({
          at,
          run: () => {
            const delay = Math.round(r.time_chain * 1000);
            for (const e of this.alive(1)) e.nextAt += delay;
            this.emit({ t: this.t, k: 'mech', m: 'artifact:time_chain', v: delay });
            stop(this.t + 15000);
          },
        });
      stop(15000);
    }
  }

  /** Удар отряда: считаем для «Тлеющего амулета» и «Громового колокольчика». */
  private onPartyHit(u: U, tg: U) {
    if (!this.artifact.ember_charm && !this.artifact.thunder_bell) return;
    this.partyHits++;
    if (this.artifact.ember_charm && this.partyHits % 6 === 0 && tg.alive) {
      this.emit({ t: this.t, k: 'mech', m: 'artifact:ember_charm', tg: tg.uid });
      this.applyDot(u, tg, 'burn', this.artifact.ember_charm, 2);
    }
    if (this.artifact.thunder_bell && this.partyHits % 8 === 0) {
      const foes = this.alive(1);
      if (foes.length) {
        const f = foes[this.rng.int(foes.length)];
        this.emit({ t: this.t, k: 'mech', m: 'artifact:thunder_bell', tg: f.uid });
        this.applyDamageRaw(u, f, Math.max(1, Math.round(this.effAtk(u) * this.artifact.thunder_bell)), { dot: 'lightning' });
      }
    }
  }

  /** Героиня ранена: «Колокол тревоги» и «Рог Валькирии». */
  private onPartyHurt(tg: U) {
    const r = this.artifact;
    if (r.alarm_bell && tg.alive && tg.kind === 'hero' && !tg.used.alarmBell && tg.hp < tg.maxHp * 0.5) {
      tg.used.alarmBell = 1;
      this.emit({ t: this.t, k: 'mech', m: 'artifact:alarm_bell', tg: tg.uid });
      this.giveShield(tg, tg, Math.round(tg.maxHp * r.alarm_bell));
    }
    if (r.valkyrie_horn && !this.artifactUsed.valkyrie_horn) {
      let hp = 0;
      let max = 0;
      for (const h of this.units)
        if (h.side === 0 && h.kind === 'hero') {
          hp += h.alive ? h.hp : 0;
          max += h.maxHp;
        }
      if (max > 0 && hp < max * 0.5 && this.alive(0).length) {
        this.artifactUsed.valkyrie_horn = 1;
        this.emit({ t: this.t, k: 'mech', m: 'artifact:valkyrie_horn' });
        for (const h of this.alive(0)) {
          this.heal(h, h, Math.round(h.maxHp * r.valkyrie_horn));
          this.addStatus(h, { key: 'artifact:horn', type: 'buff', stat: 'atk', value: r.valkyrie_horn, amount: 0, turns: 3, src: h.uid });
        }
      }
    }
  }

  // ——— «Сокрушительный удар» ———

  private setupCasts() {
    for (const boss of this.units) {
      if (boss.side !== 1 || (boss.kind !== 'boss' && boss.kind !== 'mini')) continue;
      const c = BOSS_CAST[boss.kind];
      const schedule = (at: number) =>
        this.timers.push({
          at,
          run: () => {
            if (!boss.alive) return;
            // оглушённый или замороженный босс не начинает каст — попробует чуть позже
            if (this.hasCc(boss)) return schedule(this.t + 1500);
            const end = this.t + c.dur;
            // каст идёт параллельно обычным атакам — это дополнительная угроза, а не пауза босса
            boss.casting = end;
            this.emit({ t: this.t, k: 'mech', m: 'castStart', tg: boss.uid, v: c.dur });
            if (this.artifact.omen_ward) {
              this.emit({ t: this.t, k: 'mech', m: 'artifact:omen_ward' });
              for (const h of this.alive(0)) this.giveShield(h, h, Math.round(h.maxHp * this.artifact.omen_ward));
            }
            this.timers.push({ at: end, run: () => this.castHit(boss, end, c.dmg) });
            schedule(this.t + c.every);
          },
        });
      schedule(c.first + boss.uid * 250);
    }
  }

  private castHit(boss: U, end: number, pct: number) {
    if (!boss.alive || boss.casting !== end) return;
    boss.casting = 0;
    this.emit({ t: this.t, k: 'mech', m: 'castHit', tg: boss.uid });
    for (const h of this.alive(0)) this.applyDamageRaw(boss, h, Math.max(1, Math.round(h.maxHp * pct)), {});
  }

  /** Сбить каст: ульта (с оглушением босса) или контроль. */
  private interrupt(boss: U, stun = true) {
    boss.casting = 0;
    this.emit({ t: this.t, k: 'mech', m: 'interrupt', tg: boss.uid });
    if (stun) {
      boss.statuses.push({ key: 'cc:stun', type: 'cc', cc: 'stun', value: 0, amount: 0, turns: 1, src: boss.uid });
      this.emit({ t: this.t, k: 'status', tg: boss.uid, st: 'stun', on: 1 });
    }
  }

  private removeStatus(tg: U, st: Status) {
    const i = tg.statuses.indexOf(st);
    if (i >= 0) tg.statuses.splice(i, 1);
    this.emit({ t: this.t, k: 'status', tg: tg.uid, st: statusLabel(st), on: 0 });
  }

  private cleanse(tg: U) {
    for (const s of [...tg.statuses]) {
      if (s.type === 'dot' || s.type === 'cc' || s.type === 'debuff') this.removeStatus(tg, s);
    }
  }

  private revive(tg: U, pct: number) {
    tg.alive = true;
    tg.hp = Math.max(1, Math.round(tg.maxHp * pct));
    tg.energy = 0;
    tg.statuses = [];
    tg.nextAt = this.t + this.interval(tg);
    this.emit({ t: this.t, k: 'revive', tg: tg.uid, hp: tg.hp });
  }

  private summon(owner: U, unitId: string, count: number, mult: number) {
    let tmplId = unitId;
    if (unitId === 'minion') {
      const actEnemies = Object.values(ENEMY_MAP).filter((e) => e.kind === 'normal' && e.act === (owner.act ?? 1));
      tmplId = actEnemies.length ? actEnemies[1 % actEnemies.length].id : 'skeleton';
    }
    const tmpl = ENEMY_MAP[tmplId];
    for (let i = 0; i < count; i++) {
      const mine = this.units.filter((x) => x.alive && x.summoner === owner.uid).length;
      if (mine >= 4) return;
      const slot = 5 + this.units.filter((x) => x.side === owner.side && x.slot >= 5).length;
      const isVine = tmplId === 'vine';
      const hpBase = owner.maxHp * mult * (owner.side === 0 ? 1.4 : 1);
      const init: UnitInit = {
        side: owner.side,
        slot,
        row: isVine ? 'back' : 'front',
        kind: 'summon',
        ref: tmplId,
        element: tmpl?.element ?? owner.element,
        targeting: 'nearest',
        melee: true,
        stats: {
          hp: Math.max(1, Math.round(hpBase)),
          atk: Math.max(1, Math.round(owner.atk * mult * (isVine ? 0.2 : 1))),
          def: Math.round(owner.def * 0.8),
          spd: 100,
          crit: 0.05,
          critDmg: 1.5,
          acc: 0,
          eva: 0,
          pen: 0,
          lifesteal: 0,
          healPower: 1,
          resist: 0,
          energyRegen: 1,
          bonus: {},
        },
        basic: { id: 'enemy.basic', rank: 1, mods: [] },
        skills: [],
        fx: [],
        act: owner.act,
      };
      const u = this.addUnit(init, this.t);
      u.summoner = owner.uid;
      u.nextAt = this.t + Math.floor(this.interval(u) * 0.6);
      if (isVine) u.expireAt = this.t + 10000;
      this.emit({ t: this.t, k: 'summon', unit: this.snap(u) });
      if (isVine) {
        const vine = u;
        this.timers.push({
          at: vine.expireAt!,
          run: () => {
            if (!vine.alive) return;
            const boss = this.units[vine.summoner!];
            vine.alive = false;
            this.emit({ t: this.t, k: 'death', tg: vine.uid });
            if (boss?.alive) {
              this.emit({ t: this.t, k: 'mech', m: 'vineHeal', tg: boss.uid });
              this.heal(boss, boss, Math.round(boss.maxHp * 0.1));
            }
          },
        });
      }
    }
  }

  // ——— механики боссов ———

  private setupMechanics() {
    for (const boss of this.units) {
      if (!boss.mechanic) continue;
      const every = (period: number, first: number, fn: () => void) => {
        const schedule = (at: number) => {
          this.timers.push({
            at,
            run: () => {
              if (!boss.alive) return;
              fn();
              schedule(at + period);
            },
          });
        };
        schedule(first);
      };
      switch (boss.mechanic) {
        case 'vines':
          every(12000, 4000, () => {
            this.emit({ t: this.t, k: 'mech', m: 'vines', tg: boss.uid });
            this.summon(boss, 'vine', 2, 0.05);
          });
          break;
        case 'sandstorm':
          every(15000, 15000, () => {
            this.emit({ t: this.t, k: 'mech', m: 'sandstorm', tg: boss.uid });
            for (const h of this.alive(0)) {
              if (h.fx.immuneBlind) continue;
              this.addStatus(h, { key: 'debuff:acc:sandstorm', type: 'debuff', stat: 'acc', value: -0.5, amount: 0, turns: 3, src: boss.uid });
            }
          });
          break;
        case 'freeze':
          every(12000, 6000, () => {
            const heroes = this.alive(0).filter((h) => h.kind !== 'summon');
            if (!heroes.length) return;
            const tg = heroes[this.rng.int(heroes.length)];
            this.emit({ t: this.t, k: 'mech', m: 'freeze', tg: tg.uid });
            if (tg.fx.ccImmuneFirst && !tg.used.ccImmune) {
              tg.used.ccImmune = 1;
              return;
            }
            this.addStatus(tg, { key: 'cc:freeze', type: 'cc', cc: 'freeze', value: 0, amount: 0, turns: 3, src: boss.uid });
          });
          break;
        case 'tideShield':
          boss.tide = Math.round(boss.maxHp * 0.3);
          this.emit({ t: 0, k: 'mech', m: 'tide', tg: boss.uid, v: boss.tide });
          every(20000, 20000, () => {
            boss.tide = Math.round(boss.maxHp * 0.3);
            this.emit({ t: this.t, k: 'mech', m: 'tide', tg: boss.uid, v: boss.tide });
          });
          break;
        case 'bloodThirst':
          every(10000, 10000, () => {
            boss.bloodStacks++;
            this.emit({ t: this.t, k: 'mech', m: 'bloodThirst', tg: boss.uid, v: boss.bloodStacks });
          });
          break;
        case 'mirror': {
          const heroes = this.alive(0).filter((h) => h.kind === 'hero');
          let best: U | undefined;
          for (const h of heroes) if (!best || h.atk > best.atk) best = h;
          if (best) this.spawnMirror(boss, best);
          break;
        }
        default:
          break;
      }
    }
  }

  private spawnMirror(boss: U, hero: U) {
    const init: UnitInit = {
      side: 1,
      slot: 5 + this.units.filter((x) => x.side === 1 && x.slot >= 5).length,
      row: 'front',
      kind: 'summon',
      ref: hero.ref,
      element: 'dark',
      cls: hero.cls,
      targeting: hero.targeting,
      melee: hero.melee,
      stats: {
        hp: Math.round(Math.max(hero.maxHp, boss.maxHp * 0.25)),
        atk: Math.round(Math.max(hero.atk, boss.atk * 0.6)),
        def: hero.def,
        spd: hero.spd,
        crit: hero.crit,
        critDmg: hero.critDmg,
        acc: hero.acc,
        eva: hero.eva,
        pen: hero.pen,
        lifesteal: hero.lifesteal,
        healPower: hero.healPower,
        resist: hero.resist,
        energyRegen: hero.energyRegen,
        bonus: { ...hero.bonus },
      },
      basic: hero.basic.ref,
      skills: hero.skills.map((s) => s.ref),
      ult: hero.ult?.ref,
      fx: [],
      act: boss.act,
    };
    const u = this.addUnit(init, this.t);
    u.summoner = boss.uid;
    u.mirror = true;
    this.emit({ t: this.t, k: 'mech', m: 'mirror', tg: hero.uid });
    this.emit({ t: this.t, k: 'summon', unit: this.snap(u) });
  }

  private bossTurnMechanic(boss: U) {
    switch (boss.mechanic) {
      case 'fireField': {
        boss.field++;
        this.emit({ t: this.t, k: 'mech', m: 'fireField', tg: boss.uid, v: boss.field });
        const dmg = Math.max(1, Math.round(boss.atk * 0.06 * boss.field));
        for (const h of this.alive(0)) this.applyDamageRaw(boss, h, Math.round(dmg * (this.B.defConst / (this.B.defConst + this.effDef(h) * 0.5))), { dot: 'burn' });
        break;
      }
      case 'phases': {
        const frac = boss.hp / boss.maxHp;
        const phase = frac < 0.33 ? 2 : frac < 0.66 ? 1 : 0;
        if (phase !== boss.phase) {
          boss.phase = phase;
          this.emit({ t: this.t, k: 'mech', m: `phase${phase}`, tg: boss.uid });
          if (phase > 0) this.summon(boss, 'drone', 1, 0.2);
        }
        break;
      }
      case 'raiseDead': {
        if (boss.turns % 3 === 0 && this.deadMinions.length) {
          this.emit({ t: this.t, k: 'mech', m: 'raiseDead', tg: boss.uid });
          for (const uid of this.deadMinions.splice(0, 2)) {
            const m = this.units[uid];
            if (m && !m.alive) this.revive(m, 0.5);
          }
        }
        break;
      }
      case 'mirror': {
        if (!boss.used.mirror2 && boss.hp < boss.maxHp * 0.5) {
          boss.used.mirror2 = 1;
          const heroes = this.alive(0).filter((h) => h.kind === 'hero');
          let best: U | undefined;
          for (const h of heroes) if (!best || h.atk > best.atk) best = h;
          if (best) this.spawnMirror(boss, best);
        }
        break;
      }
      default:
        break;
    }
  }
}

function statusLabel(st: Status): string {
  if (st.type === 'dot') return st.dot ?? 'dot';
  if (st.type === 'cc') return st.cc ?? 'cc';
  if (st.type === 'taunt') return 'taunt';
  if (st.type === 'hot') return 'hot';
  return `${st.type}:${st.stat}`;
}
