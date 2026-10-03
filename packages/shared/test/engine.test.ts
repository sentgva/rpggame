import { describe, expect, it } from 'vitest';
import {
  ACTS,
  ACT_BOSSES,
  ADJ_PATS,
  ADJ_PAT_BOND,
  BANNER,
  BATH_GAIN,
  BOND_HEROES,
  BOND_SLEEP_SKIN,
  BOND_SPA_SKIN,
  CAMPFIRE,
  CAMP_BOND,
  CAMP_MASTERY,
  CHANGELOG,
  CHANGELOG_LATEST,
  CLASSES,
  CLASS_IDS,
  COMBOS,
  DEFAULT_CONFIG as cfg,
  DUNGEON_DAY_BONUS,
  DUNGEONS,
  FASHION_BONUS,
  FESTIVALS,
  FESTIVAL_DAYS,
  FESTIVAL_EPOCH,
  FESTIVAL_ONLY_SKINS,
  FEST_GOALS,
  FEST_MILESTONES,
  FEST_STAGES,
  FEST_STAR_POINTS,
  FEST_TASK_MAP,
  FEST_TASK_REWARD,
  FEST_TICKETS,
  FISH_DAILY,
  FISH_MAP,
  GameError,
  HEROINES,
  HEROINE_MAP,
  MALE_WEAR,
  MAX_RARITY,
  MINE_START,
  MINE_START_IDX,
  MINE_W,
  PASS_LEVELS,
  PASS_SKIN_LEVELS,
  PASS_SKIN_POOL,
  PHOTO_ALBUM_MAX,
  PHOTO_DAILY,
  RAID_TIERS,
  ROOM_BONUS,
  ROOM_MAX,
  ROSTER,
  SHOP_OFFERS,
  SKINS,
  SKIN_MAP,
  SLEEP_GAIN,
  SORTIE_BOSS_AT,
  SORTIE_DAILY,
  STAGE_COUNT,
  STARTER_HEROINES,
  STATE_VERSION,
  VOLLEY_DAILY,
  VOLLEY_POINTS,
  adjutantSkins,
  adjutantState,
  applyAction,
  bannerCost,
  bondState,
  bondTopic,
  bondTraits,
  campCombos,
  campfireScene,
  campfireState,
  capMinutes,
  comboOf,
  createPlayer,
  dayKey,
  dungeonOfDay,
  dungeonPrize,
  enhanceCost,
  fashionFits,
  fashionOfDay,
  festBoss,
  festBossReward,
  festClaimable,
  festDailyTasks,
  festFirstReward,
  festGoalValue,
  festShopNow,
  festStageEnemies,
  festivalAt,
  festivalState,
  formatNum,
  generateItem,
  guardianUnits,
  heroLevel,
  heroStats,
  heroUnits,
  isSwimwear,
  levelCost,
  mergeItems,
  migrate,
  mineBoard,
  mineOf,
  passSkins,
  passReward,
  photoScore,
  photoTaste,
  raidBoss,
  rankCap,
  rankCost,
  scheduleStart,
  scheduleStop,
  simulateCombat,
  skillCost,
  sortieReward,
  sortieTierOpen,
  stageLabel,
  stageRef,
  stateHash,
  towerEnemies,
  waveUnits,
  Rng,
  type CombatEvent,
  type FestivalSchedule,
  type Item,
  type PlayerState,
} from '../src';

const T0 = Date.UTC(2026, 8, 25, 10);
const DAY = 86400000;

function fresh(): PlayerState {
  return createPlayer(cfg, '42', 'Tester', T0);
}
/** Действие от имени игрока (dev — разрешить dev-действия). */
function act(s: PlayerState, a: Record<string, unknown>, now = T0 + 1000, dev = true) {
  return applyAction(s, a as never, { cfg, now, dev });
}
/** Весь Легион, уровень и этап. */
function legion(lvl = 30, stage = 20): PlayerState {
  let s = fresh();
  s = act(s, { type: 'dev.hero', id: 'all' }).state;
  s = act(s, { type: 'dev.legion', lvl }).state;
  s = act(s, { type: 'dev.progress', stage }).state;
  return s;
}

describe('формулы', () => {
  it('цена уровня растёт, Прорыв каждые 20 уровней дороже', () => {
    expect(levelCost(cfg, 2).gold).toBeGreaterThan(levelCost(cfg, 1).gold);
    expect(levelCost(cfg, 20).gold).toBeGreaterThan(levelCost(cfg, 21).gold);
    expect(levelCost(cfg, 100).xp).toBeGreaterThan(0);
  });

  it('потолок уровня — по рангу; эффективный уровень героя не выше потолка', () => {
    expect(rankCap(cfg, 1)).toBe(cfg.hero.rankCaps[0]);
    expect(rankCap(cfg, cfg.hero.maxRank)).toBe(STAGE_COUNT);
    expect(heroLevel(cfg, { legion: { lvl: 100 } }, { rank: 1 })).toBe(rankCap(cfg, 1));
    expect(rankCost(cfg, cfg.hero.maxRank)).toBeNull();
    expect(skillCost(cfg, fresh(), cfg.hero.maxSkill)).toBeNull();
  });

  it('этапы: 3 круга × 10 актов × 20; стражи 5/10/15 — мини-боссы, 20 — владычица', () => {
    expect(STAGE_COUNT).toBe(600);
    expect(stageRef(1)).toMatchObject({ circle: 0, act: 1, stage: 1, kind: 'normal' });
    expect(stageRef(5).kind).toBe('mini');
    expect(stageRef(20).kind).toBe('boss');
    expect(stageRef(201)).toMatchObject({ circle: 1, act: 1, stage: 1 });
    expect(stageLabel(stageRef(220))).toBe('II·1-20');
  });

  it('формат больших чисел', () => {
    expect(formatNum(999)).toBe('999');
    expect(formatNum(1500)).toBe('1.5K');
    expect(formatNum(2.5e9)).toBe('2.5B');
  });
});

describe('Живой бой', () => {
  const setup = (seed = 7, extra: Partial<Parameters<typeof simulateCombat>[1]> = {}) => {
    const s = legion(40, 40);
    return { seed, units: [...heroUnits(cfg, s, ROSTER), ...guardianUnits(cfg, stageRef(35))], timeLimit: 60, ...extra };
  };

  it('детерминирован: одинаковый seed — одинаковый бой; тихий режим даёт тот же исход', () => {
    const a = simulateCombat(cfg, setup());
    const b = simulateCombat(cfg, setup());
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
    const q = simulateCombat(cfg, setup(7, { quiet: true }));
    expect(q.events).toHaveLength(0);
    expect(q.win).toBe(a.win);
    expect(q.time).toBe(a.time);
    expect(q.dmgDealt).toBe(a.dmgDealt);
  });

  it('бойцы бегут, бьют, копят энергию; ассасин прыгает в тыл, у Охотницы — волк', () => {
    const r = simulateCombat(cfg, setup());
    const kinds = new Set(r.events.map((e) => e.k));
    for (const k of ['start', 'mv', 'atk', 'dmg', 'en', 'chain', 'death', 'end']) expect(kinds.has(k as CombatEvent['k'])).toBe(true);
    expect(r.events.some((e) => e.k === 'leap')).toBe(true);
    const start = r.events[0] as Extract<CombatEvent, { k: 'start' }>;
    expect(start.units.some((u) => u.ref === 'wolf' && u.side === 0)).toBe(true);
    expect(r.ults).toBeGreaterThan(0);
  });

  it('цепь Легиона: третья ульта подряд — залп, пары героев — связки', () => {
    let chains = 0;
    let combos = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const r = simulateCombat(cfg, setup(seed));
      chains += r.chains;
      combos += r.combos;
      for (const e of r.events) if (e.k === 'combo') expect(COMBOS.map((c) => c.id)).toContain(e.c);
    }
    expect(chains).toBeGreaterThan(0);
    expect(combos).toBeGreaterThan(0);
    expect(comboOf('knight', 'assassin')?.id).toBe('backstab');
    expect(comboOf('assassin', 'knight')?.id).toBe('backstab');
    expect(comboOf('priestess', 'warlock')?.id).toBe('grace');
  });

  it('ручной режим: ульты только по команде; прошлое не меняется', () => {
    const idle = simulateCombat(cfg, setup(3, { manual: true }));
    expect(idle.ults).toBe(0);
    const died = (uid: number) => idle.events.some((e) => e.k === 'death' && e.tg === uid);
    const ready = idle.events.find((e) => e.k === 'en' && e.e >= 100 && !died(e.tg)) as Extract<CombatEvent, { k: 'en' }>;
    expect(ready).toBeTruthy();
    const t = ready.t + 100;
    const cmd = simulateCombat(cfg, setup(3, { manual: true, inputs: [{ t, k: 'ult', u: ready.tg }] }));
    expect(cmd.ults).toBe(1);
    const before = (r: typeof idle) => JSON.stringify(r.events.filter((e) => e.t < t));
    expect(before(cmd)).toBe(before(idle));
    // «Авто» до конца боя
    const auto = simulateCombat(cfg, setup(3, { manual: true, inputs: [{ t: 1000, k: 'auto' }] }));
    expect(auto.ults).toBeGreaterThan(0);
  });

  it('парирование: щит в последний миг замаха гасит удар и оглушает стража', () => {
    const base = simulateCombat(cfg, setup(5, { manual: true }));
    const cast = base.events.find((e) => e.k === 'cast' && e.end > 0) as Extract<CombatEvent, { k: 'cast' }>;
    expect(cast).toBeTruthy();
    const heavy = base.events.find((e) => e.k === 'heavy') as Extract<CombatEvent, { k: 'heavy' }>;
    expect(heavy.parry).toBe(1); // Кассиан жив — блок щитом
    const perfect = simulateCombat(cfg, setup(5, { manual: true, inputs: [{ t: cast.end - 500, k: 'guard' }] }));
    const h2 = perfect.events.find((e) => e.k === 'heavy') as Extract<CombatEvent, { k: 'heavy' }>;
    expect(h2.parry).toBe(2);
    expect(perfect.parries).toBe(1);
    expect(perfect.events.some((e) => e.k === 'st' && e.tg === cast.u && e.st === 'stagger' && e.on === 1)).toBe(true);
    // слишком рано — щит не успевает
    const early = simulateCombat(cfg, setup(5, { manual: true, inputs: [{ t: cast.t - 3000 > 0 ? cast.t - 3000 : 100, k: 'guard' }] }));
    expect((early.events.find((e) => e.k === 'heavy') as Extract<CombatEvent, { k: 'heavy' }>).parry).toBe(1);
  });

  it('все владычицы актов и их механики отрабатывают без ошибок', () => {
    const s = legion(200, 200);
    for (const act of ACTS) {
      const ref = stageRef(act.id * 20);
      const units = guardianUnits(cfg, ref);
      expect(units[0].ref).toBe(act.boss);
      expect(units[0].mech).toBe(ACT_BOSSES.find((b) => b.id === act.boss)!.mechanic);
      const r = simulateCombat(cfg, { seed: act.id, units: [...heroUnits(cfg, s, ROSTER), ...units], timeLimit: 60 });
      expect(r.events[r.events.length - 1].k).toBe('end');
    }
  });

  it('волны и стражи: состав растёт, враги приходят из-за края', () => {
    const ref = stageRef(3);
    expect(waveUnits(cfg, ref, 0)).toHaveLength(cfg.enemy.waveSizes[0]);
    expect(waveUnits(cfg, ref, 2)).toHaveLength(cfg.enemy.waveSizes[2]);
    expect(waveUnits(cfg, ref, 0).every((u) => u.x > 90)).toBe(true);
    expect(guardianUnits(cfg, stageRef(4))[0].kind).toBe('elite');
    expect(guardianUnits(cfg, stageRef(10))[0].kind).toBe('mini');
  });
});

describe('действия', () => {
  it('не мутирует исходное состояние; клиент и сервер получают одинаковое состояние', () => {
    const s = fresh();
    const copy = JSON.stringify(s);
    const a = applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + 1000 });
    expect(JSON.stringify(s)).toBe(copy);
    const b = applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + 1000, server: true });
    expect(stateHash(a.state)).toBe(stateHash(b.state));
  });

  it('dev-действия запрещены без флага; серверные — недоступны клиенту', () => {
    expect(() => applyAction(fresh(), { type: 'dev.cur', cur: 'gold', op: 'max' }, { cfg, now: T0 })).toThrow('forbidden');
    expect(() => applyAction(fresh(), { type: 'mail.send', title: 'x' }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(fresh(), { type: 'nope' }, { cfg, now: T0 })).toThrow('unknownAction');
  });

  it('полный сброс: игра с нуля, настройки сохраняются, без подтверждения — нельзя', () => {
    let s = legion(50, 50);
    s = act(s, { type: 'settings', patch: { music: 0.1 } }).state;
    expect(() => act(s, { type: 'account.reset' })).toThrow(GameError);
    s = act(s, { type: 'account.reset', confirm: 'RESET' }).state;
    expect(s.progress.stage).toBe(0);
    expect(s.legion.lvl).toBe(1);
    expect(Object.keys(s.heroines).sort()).toEqual([...STARTER_HEROINES].sort());
    expect(s.settings.music).toBe(0.1);
  });

  it('миграция: сохранения до 3.0 начинаются заново, текущие — дополняются', () => {
    const old = { ...fresh(), v: 3, heroines: { lira: { id: 'lira', lvl: 50, stars: 3 } } } as unknown as PlayerState;
    const m = migrate(cfg, old, T0);
    expect(m.v).toBe(STATE_VERSION);
    expect(m.heroines.lira).toMatchObject({ rank: 1, skill: 1, ult: 1 });
    const cur = { ...fresh() } as Partial<PlayerState>;
    delete cur.banner;
    const m2 = migrate(cfg, cur as PlayerState, T0);
    expect(m2.banner).toEqual({});
  });

  it('сундук: доход копится до 12 ч; быстрый сбор дважды в день бесплатно; ускорение ×2', () => {
    let s = act(fresh(), { type: 'dev.progress', stage: 10 }).state;
    const later = T0 + 20 * 3600000;
    const r = act(s, { type: 'chest.collect' }, later);
    expect(r.result.minutes).toBeCloseTo(capMinutes(cfg, s), 0);
    expect(r.result.gold).toBeGreaterThan(0);
    s = r.state;
    s = act(s, { type: 'chest.quick', method: 'free' }, later).state;
    s = act(s, { type: 'chest.quick', method: 'free' }, later).state;
    expect(() => act(s, { type: 'chest.quick', method: 'free' }, later)).toThrow('usedToday');
    expect(() => act(s, { type: 'chest.quick', method: 'free' }, later + DAY)).not.toThrow();
    for (let i = 0; i < cfg.income.x2PerDay; i++) s = act(s, { type: 'boost.x2' }, later).state;
    expect(s.boosts.x2Until).toBeGreaterThan(later);
    expect(() => act(s, { type: 'boost.x2' }, later)).toThrow('usedToday');
  });

  it('поход: 3 волны → страж; победа открывает этап, герои присоединяются', () => {
    let s = fresh();
    s = { ...s, dev: { ...s.dev, oneShot: true } };
    expect(() => act(s, { type: 'battle.boss' }, T0 + 1000, false)).toThrow('wavesFirst');
    for (let i = 0; i < 3; i++) {
      const r = act(s, { type: 'battle.wave' });
      expect(r.result.battle.win).toBe(true);
      expect(r.result.rewards.gold).toBeGreaterThan(0);
      s = r.state;
    }
    expect(() => act(s, { type: 'battle.wave' })).toThrow('wavesDone');
    const r = act(s, { type: 'battle.boss' });
    expect(r.result.win).toBe(true);
    s = r.state;
    expect(s.progress).toMatchObject({ stage: 1, wave: 0 });
    // Мирабель — после 2-го этапа
    for (let i = 0; i < 3; i++) s = act(s, { type: 'battle.wave' }).state;
    const r2 = act(s, { type: 'battle.boss' });
    expect(r2.result.joined).toContain('mirabel');
    expect(HEROINE_MAP.mirabel.join).toBe(2);
  });

  it('поражение стража — пауза до реванша; ошибочные команды боя отклоняются', () => {
    let s = act(fresh(), { type: 'dev.progress', stage: 150 }).state;
    s = { ...s, progress: { ...s.progress, wave: 3 } };
    const r = act(s, { type: 'battle.boss' });
    expect(r.result.win).toBe(false);
    expect(r.state.progress.retryAt).toBeGreaterThan(T0);
    expect(() => act(s, { type: 'battle.boss', manual: true, inputs: [{ t: -1, k: 'ult', u: 0 }] })).toThrow('badParam');
    expect(() => act(s, { type: 'battle.boss', manual: true, inputs: [{ t: 10, k: 'jump' }] })).toThrow('badParam');
    expect(() => act(s, { type: 'battle.boss', manual: true, inputs: [{ t: 10, k: 'guard' }] })).not.toThrow();
  });
});

describe('Легион', () => {
  it('шесть героев — шесть классов; у каждого умение, ульта и пассивка', () => {
    expect(HEROINES).toHaveLength(6);
    expect(new Set(HEROINES.map((h) => h.cls)).size).toBe(6);
    expect(CLASS_IDS.every((c) => CLASSES[c].skill.kind === 'skill' && CLASSES[c].ult.kind === 'ult' && CLASSES[c].passive.desc.length === 3)).toBe(true);
    expect(STARTER_HEROINES.sort()).toEqual(['cassian', 'lira']);
  });

  it('уровень Легиона — общий; потолок по рангу; ранг — Эмблемы + золото и только на потолке', () => {
    let s = fresh();
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    s = act(s, { type: 'dev.cur', cur: 'xp', op: 'max' }).state;
    s = act(s, { type: 'legion.level', n: 10 }).state;
    expect(s.legion.lvl).toBe(11);
    const atk11 = heroStats(cfg, s, 'lira').stats.atk;
    s = act(s, { type: 'legion.level', n: 200 }).state;
    expect(s.legion.lvl).toBe(211);
    expect(heroLevel(cfg, s, s.heroines.lira)).toBe(rankCap(cfg, 1));
    expect(heroStats(cfg, s, 'lira').stats.atk).toBeGreaterThan(atk11);
    // ранг: нужны Эмблемы
    expect(() => act(s, { type: 'hero.rank', id: 'lira' }, T0 + 1000, false)).toThrow('notEnough');
    s = act(s, { type: 'dev.cur', cur: 'emblems', op: 'set', amount: 1000 }).state;
    const before = heroStats(cfg, s, 'lira').stats.atk;
    s = act(s, { type: 'hero.rank', id: 'lira' }, T0 + 1000, false).state;
    expect(s.heroines.lira.rank).toBe(2);
    expect(heroStats(cfg, s, 'lira').stats.atk).toBeGreaterThan(before * 1.5);
    // ранг до потолка уровня — нельзя
    let low = act(fresh(), { type: 'dev.cur', cur: 'emblems', op: 'set', amount: 1000 }).state;
    low = act(low, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    expect(() => act(low, { type: 'hero.rank', id: 'lira' }, T0 + 1000, false)).toThrow('needLevel');
  });

  it('навыки: Тома + золото, до 10-го уровня; сила навыка растёт', () => {
    let s = act(fresh(), { type: 'dev.cur', cur: 'books', op: 'max' }).state;
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    for (let i = 1; i < cfg.hero.maxSkill; i++) s = act(s, { type: 'hero.skill', id: 'cassian', which: 'ult' }).state;
    expect(s.heroines.cassian.ult).toBe(cfg.hero.maxSkill);
    expect(() => act(s, { type: 'hero.skill', id: 'cassian', which: 'ult' })).toThrow('maxRank');
    expect(() => act(s, { type: 'hero.skill', id: 'cassian', which: 'x' })).toThrow('badParam');
    expect(heroUnits(cfg, s, ['cassian'])[0].ult!.power).toBeCloseTo(1 + cfg.hero.skillStep * 9);
  });

  it('облик: только свой и купленный; облик даёт прибавку', () => {
    let s = fresh();
    expect(() => act(s, { type: 'hero.skin', id: 'lira', skin: 'lira_beach' })).toThrow('noSkin');
    s = act(s, { type: 'dev.skins' }).state;
    expect(() => act(s, { type: 'hero.skin', id: 'lira', skin: 'keira_night' })).toThrow('noSkin');
    const base = heroStats(cfg, s, 'lira').stats.hp;
    s = act(s, { type: 'hero.skin', id: 'lira', skin: 'lira_hell' }).state;
    expect(heroStats(cfg, s, 'lira').stats.hp).toBeGreaterThan(base);
    s = act(s, { type: 'hero.skin', id: 'lira', skin: null }).state;
    expect(s.heroines.lira.skin).toBeUndefined();
  });
});

describe('снаряжение', () => {
  const item = (rarity: number, slot: Item['slot'] = 'weapon', lvl = 10, seed = 1) => generateItem(cfg, new Rng(seed), `t${seed}`, { lvl, slot, rarity: rarity as Item['rarity'], maxRarity: MAX_RARITY });

  it('редкость задаёт число доп. свойств; легендарные и мифические — с сетом', () => {
    for (let r = 0; r <= MAX_RARITY; r++) {
      const it = item(r, 'helmet', 10, r + 1);
      expect(it.subs).toHaveLength(cfg.gear.subCount[r]);
      expect(!!it.set).toBe(r >= 4);
      expect(new Set(it.subs.map((x) => x.s)).size).toBe(it.subs.length);
    }
  });

  it('слияние: 3 → 1 следующей редкости, уровень и заточка — лучшие', () => {
    const a = { ...item(2, 'armor', 10, 1), enh: 3 };
    const b = item(2, 'armor', 30, 2);
    const c = item(2, 'armor', 20, 3);
    const m = mergeItems(cfg, new Rng(9), 'm1', [a, b, c]);
    expect(m.rarity).toBe(3);
    expect(m.lvl).toBe(30);
    expect(m.enh).toBe(3);
    expect(m.subs).toHaveLength(cfg.gear.subCount[3]);
  });

  it('действия: надеть, слить (с надетой вещью), заточить, разобрать, закрепить', () => {
    let s = legion(30, 30);
    s = act(s, { type: 'dev.item', slot: 'weapon', rarity: 1, count: 3 }).state;
    const uids = Object.keys(s.items);
    s = act(s, { type: 'item.equip', uid: uids[0], hero: 'keira' }).state;
    expect(s.heroines.keira.gear.weapon).toBe(uids[0]);
    // одна вещь — на одном герое
    s = act(s, { type: 'item.equip', uid: uids[0], hero: 'lira' }).state;
    expect(s.heroines.keira.gear.weapon).toBeUndefined();
    const r = act(s, { type: 'item.merge', uids });
    s = r.state;
    expect(Object.keys(s.items)).toHaveLength(1);
    expect(s.items[r.result.item].rarity).toBe(2);
    expect(s.heroines.lira.gear.weapon).toBe(r.result.item);
    expect(() => act(s, { type: 'item.merge', uids: [r.result.item, r.result.item, r.result.item] })).toThrow('badParam');
    // заточка: золото + Сталь
    expect(() => act(s, { type: 'item.enhance', uid: r.result.item }, T0 + 1000, false)).toThrow('notEnough');
    s = act(s, { type: 'dev.cur', cur: 'steel', op: 'max' }).state;
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    s = act(s, { type: 'item.enhance', uid: r.result.item, n: 15 }).state;
    expect(s.items[r.result.item].enh).toBe(cfg.gear.maxEnh);
    expect(enhanceCost(cfg, s, s.items[r.result.item])).toBeNull();
    // надетое не разбирается, закреплённое — тоже
    expect(() => act(s, { type: 'item.salvage', uids: [r.result.item] })).toThrow('equipped');
    s = act(s, { type: 'dev.item', slot: 'boots', rarity: 0 }).state;
    const boots = Object.values(s.items).find((x) => x.slot === 'boots')!;
    s = act(s, { type: 'item.lock', uid: boots.uid }).state;
    expect(() => act(s, { type: 'item.salvage', uids: [boots.uid] })).toThrow('locked');
    s = act(s, { type: 'item.lock', uid: boots.uid }).state;
    const st0 = s.cur.steel;
    s = act(s, { type: 'item.salvage', uids: [boots.uid] }).state;
    expect(s.items[boots.uid]).toBeUndefined();
    expect(s.cur.steel).toBeGreaterThanOrEqual(st0);
  });

  it('«Слить всё» и «Надеть лучшее» на весь Легион', () => {
    let s = legion(30, 30);
    s = act(s, { type: 'dev.item', slot: 'helmet', rarity: 0, count: 9 }).state;
    const r = act(s, { type: 'item.mergeAll' });
    s = r.state;
    expect(r.result.made.length).toBeGreaterThanOrEqual(3);
    expect(Object.values(s.items).some((x) => x.rarity >= 2)).toBe(true);
    expect(() => act(fresh(), { type: 'item.mergeAll' })).toThrow('nothingToMerge');
    s = act(s, { type: 'dev.item', slot: 'weapon', rarity: 3, count: 6 }).state;
    s = act(s, { type: 'party.autoEquip' }).state;
    const worn = ROSTER.map((id) => s.heroines[id].gear.weapon).filter(Boolean);
    expect(new Set(worn).size).toBe(worn.length);
    expect(worn.length).toBe(6);
  });

  it('полная сумка: разбирается самая слабая свободная вещь; авторазбор ниже порога', () => {
    let s = legion(30, 30);
    s = { ...s, invCap: 5, settings: { ...s.settings, autoSalvage: -1 } };
    s = act(s, { type: 'dev.item', slot: 'weapon', rarity: 0, count: 5, lvl: 1 }).state;
    s = act(s, { type: 'dev.item', slot: 'weapon', rarity: 4, lvl: 30 }).state;
    expect(Object.keys(s.items)).toHaveLength(5);
    expect(Object.values(s.items).some((x) => x.rarity === 4)).toBe(true);
  });
});

describe('режимы', () => {
  it('Башня: этажи по порядку, награды за первое прохождение, условия этажей', () => {
    let s = legion(60, 60);
    expect(() => act(fresh(), { type: 'tower.fight' })).toThrow('locked');
    s = { ...s, dev: { ...s.dev, oneShot: true } };
    const c0 = s.cur.crystals;
    for (let i = 0; i < 10; i++) s = act(s, { type: 'tower.fight' }).state;
    expect(s.modes.tower).toBe(10);
    expect(s.cur.crystals).toBeGreaterThan(c0 + 80);
    expect(towerEnemies(cfg, 10)[0].kind).toBe('boss');
    expect(towerEnemies(cfg, 5)[0].kind).toBe('mini');
  });

  it('Подземелья: ключи на день, ступени по порядку, зачистка пройденного, подземелье дня ×1,5', () => {
    let s = legion(80, 80);
    s = { ...s, dev: { ...s.dev, oneShot: true } };
    expect(() => act(s, { type: 'dungeon.fight', id: 'gold', tier: 2 })).toThrow('badParam');
    expect(() => act(s, { type: 'dungeon.sweep', id: 'gold' })).toThrow('notCleared');
    s = act(s, { type: 'dungeon.fight', id: 'gold', tier: 1 }).state;
    expect(s.modes.dungeons.gold).toBe(1);
    s = act(s, { type: 'dungeon.sweep', id: 'gold' }).state;
    expect(() => act(s, { type: 'dungeon.sweep', id: 'gold' })).toThrow('noKeys');
    expect(() => act(s, { type: 'dungeon.sweep', id: 'gold' }, T0 + DAY)).not.toThrow();
    const day = dungeonOfDay(T0);
    const other = DUNGEONS.find((d) => d.id !== day)!.id;
    const a = dungeonPrize(cfg, s, day, 3, T0);
    const b = dungeonPrize(cfg, s, other, 3, T0);
    const key = (p: typeof a) => p.gold ?? p.books ?? p.steel ?? 0;
    const base = dungeonPrize(cfg, s, day, 3, T0 + DAY * 3 === T0 ? T0 : T0 + DAY);
    void b;
    if (dungeonOfDay(T0 + DAY) !== day) expect(key(a)).toBeCloseTo(key(base) * DUNGEON_DAY_BONUS, -1);
  });

  it('Колосс: 3 попытки в день, пороги урона дают награды один раз за день', () => {
    let s = legion(120, 120);
    const boss = raidBoss(cfg, s, T0);
    expect(boss.unit.ref).toMatch(/^colossus_/);
    const r = act(s, { type: 'raid.fight' });
    s = r.state;
    expect(r.result.dmg).toBeGreaterThan(0);
    const got = RAID_TIERS.filter((t) => r.result.share >= t.at).length;
    expect(s.modes.raid!.tiers).toHaveLength(got);
    for (let i = 1; i < cfg.modes.raidAttempts; i++) s = act(s, { type: 'raid.fight' }).state;
    expect(() => act(s, { type: 'raid.fight' })).toThrow('usedToday');
    expect(() => act(s, { type: 'raid.fight' }, T0 + DAY)).not.toThrow();
  });

  it('Знамя Легиона: улучшения за золото, цена растёт, бонус работает', () => {
    let s = legion(30, 30);
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    const atk = heroStats(cfg, s, 'lira').stats.atk;
    const c1 = bannerCost(cfg, s, 'atk')!;
    s = act(s, { type: 'banner.buy', id: 'atk' }).state;
    expect(bannerCost(cfg, s, 'atk')!).toBeGreaterThan(c1);
    expect(heroStats(cfg, s, 'lira').stats.atk).toBeGreaterThan(atk);
    expect(BANNER.length).toBeGreaterThanOrEqual(6);
    expect(() => act(s, { type: 'banner.buy', id: 'nope' })).toThrow('badParam');
    const capped = { ...s, banner: { chest: BANNER.find((b) => b.id === 'chest')!.max } };
    expect(capMinutes(cfg, capped)).toBeGreaterThan(capMinutes(cfg, s));
    expect(() => act(capped, { type: 'banner.buy', id: 'chest' })).toThrow('maxRank');
  });
});

describe('задания, пропуск, лавки', () => {
  it('«Забрать всё»: задания, сундуки активности; пропуск — все уровни', () => {
    let s = fresh();
    s = { ...s, quests: { ...s.quests, daily: { ...s.quests.daily, chestCollect: 5, bossWin: 5 } } };
    const r = act(s, { type: 'quest.claimAll' });
    expect(r.result.n).toBeGreaterThanOrEqual(3);
    s = r.state;
    expect(() => act(s, { type: 'quest.claimAll' })).toThrow('notDone');
    s.shop.passXp = PASS_LEVELS * 100 + 450;
    const e0 = s.cur.emblems;
    s = act(s, { type: 'pass.claimAll' }).state;
    expect(s.shop.passClaimed).toHaveLength(PASS_LEVELS);
    expect(s.cur.emblems - e0).toBeGreaterThanOrEqual(50);
    for (const sk of passSkins(s.shop.passSeason)) expect(s.skins).toContain(sk);
  });

  it('лавки: Эмблемы за кристаллы, облики коллекций; праздничные облики — только на празднике', () => {
    let s = { ...fresh(), cur: { ...fresh().cur, crystals: 10000 } };
    s = act(s, { type: 'shop.buy', offer: 'em_10' }).state;
    expect(s.cur.emblems).toBe(10);
    for (const sk of SKINS.filter((x) => FESTIVAL_ONLY_SKINS.has(x.id))) expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id)).toBe(false);
    for (const sk of SKINS.filter((x) => x.set && x.set !== 'bond' && !FESTIVAL_ONLY_SKINS.has(x.id)))
      expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id) || PASS_SKIN_POOL.includes(sk.id) || sk.source === 'tower').toBe(true);
    for (const sk of SKINS) if (sk.look.wear) expect(MALE_WEAR.has(sk.look.wear)).toBe(!!HEROINE_MAP[sk.hero].look.male);
    expect(passSkins('s0')).toHaveLength(PASS_SKIN_LEVELS.length);
    expect(passReward(15, 's0').skin).toBe(passSkins('s0')[0]);
    expect(new Set(SKINS.map((x) => x.id)).size).toBe(SKINS.length);
  });
});

describe('Лагерь: близость, фото, костёр, адъютант', () => {
  const withHero = () => {
    let s = act(fresh(), { type: 'dev.hero', id: 'mirabel' }).state;
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e12 }).state;
    return act(s, { type: 'dev.cur', cur: 'crystals', op: 'add', amount: 100000 }).state;
  };

  it('общение: лимиты дня, любимое даёт больше; близость усиливает героя', () => {
    let s = withHero();
    expect(BOND_HEROES.sort()).toEqual([...ROSTER].sort());
    expect(() => act(s, { type: 'bond.spa', hero: 'keira' })).toThrow(GameError);
    const best = act(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number };
    const bad = act(s, { type: 'bond.talk', hero: 'mirabel', answer: 2 }).result as { xp: number };
    expect(best.xp).toBeGreaterThan(bad.xp);
    const t = bondTraits('mirabel');
    const before = heroStats(cfg, s, 'mirabel').power;
    for (let d = 0; d < 40 && (s.bond?.mirabel?.lvl ?? 0) < 10; d++) {
      const now = T0 + d * DAY + 1000;
      for (let i = 0; i < 3; i++) s = act(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }, now).state;
      for (let i = 0; i < 3; i++) s = act(s, { type: 'bond.treat', hero: 'mirabel', treat: t.treat }, now).state;
      s = act(s, { type: 'bond.spa', hero: 'mirabel' }, now).state;
      if ((s.bond?.mirabel?.lvl ?? 0) >= 3) s = act(s, { type: 'bond.date', hero: 'mirabel', place: t.place }, now).state;
    }
    expect(s.bond!.mirabel.lvl).toBe(10);
    expect(heroStats(cfg, s, 'mirabel').power).toBeGreaterThan(before * 1.1);
    expect(() => act(s, { type: 'hero.skin', id: 'mirabel', skin: BOND_SPA_SKIN.mirabel })).toThrow('noSkin');
    for (const id of BOND_HEROES) expect(bondTopic(id, '2026-09-26', 0).topic.answers).toHaveLength(3);
  });

  it('резиденция: гостиная усиливает разговоры; ванна и ночёвка — раз в день', () => {
    let s = withHero();
    const plain = (act(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number }).xp;
    for (let i = 0; i < ROOM_MAX; i++) s = act(s, { type: 'home.build', room: 'living' }).state;
    const boosted = (act(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number }).xp;
    expect(boosted).toBe(Math.round(plain * (1 + ROOM_BONUS * ROOM_MAX)));
    s = act(s, { type: 'home.build', room: 'bath' }).state;
    expect((act(s, { type: 'bond.bath', hero: 'mirabel' }).result as { xp: number }).xp).toBe(BATH_GAIN.base + BATH_GAIN.perLvl);
    s = act(s, { type: 'home.build', room: 'bedroom' }).state;
    s = { ...s, bond: { mirabel: { lvl: 5, xp: 0, day: 'x', talk: 0, treat: 0, spa: false, date: false } } };
    const r = act(s, { type: 'bond.sleep', hero: 'mirabel' });
    expect((r.result as { xp: number }).xp).toBe(SLEEP_GAIN.base + SLEEP_GAIN.perLvl);
    expect(SKIN_MAP[BOND_SLEEP_SKIN.mirabel].look.wear).toBe('silk');
  });

  it('фотосессия: звёзды за вкусы героя, награда за первые кадры дня, альбом ограничен', () => {
    let s = withHero();
    const t = photoTaste('mirabel');
    expect(photoScore('mirabel', { ...t, skin: undefined, timing: 'perfect' }).match).toMatchObject({ loc: true, pose: true, face: true });
    const shot = { type: 'photo.shoot', hero: 'mirabel', loc: t.loc, pose: t.pose, face: t.face, timing: 'perfect' };
    for (let i = 0; i < PHOTO_DAILY; i++) {
      const r = act(s, shot);
      expect((r.result as { rewarded: boolean }).rewarded).toBe(true);
      s = r.state;
    }
    expect((act(s, shot).result as { rewarded: boolean }).rewarded).toBe(false);
    for (let i = 0; i < PHOTO_ALBUM_MAX + 3; i++) s = act(s, shot).state;
    expect(s.photo!.album.length).toBe(PHOTO_ALBUM_MAX);
    expect(() => act(s, { ...shot, hero: 'keira' })).toThrow('notOwned');
  });

  it('вечер у костра: сцена на каждую пару, раз в день, связка пары сыгрывается', () => {
    const pairs = new Set(CAMPFIRE.map((c) => [c.a, c.b].sort().join('+')));
    expect(pairs.size).toBe((ROSTER.length * (ROSTER.length - 1)) / 2);
    expect(campCombos('cassian', 'keira')).toContain('backstab');
    let s = fresh();
    expect(campfireScene({ s, now: T0 })!.id).toBe('cassian_lira');
    const r = act(s, { type: 'camp.talk', choice: 'a' });
    s = r.state;
    expect(bondState({ s, now: T0 }, 'lira').xp).toBe(CAMP_BOND.other);
    expect(campfireState({ s, now: T0 }).done).toBe(true);
    expect(() => act(s, { type: 'camp.talk', choice: 'both' })).toThrow('usedToday');
    s = act(s, { type: 'dev.hero', id: 'keira' }).state;
    const before = s.counters['combo:backstab'] ?? 0;
    let day = 1;
    while (campfireScene({ s, now: T0 + day * DAY })!.id !== 'cassian_keira' && day < 10) s = act(s, { type: 'camp.talk', choice: 'both' }, T0 + day++ * DAY).state;
    s = act(s, { type: 'camp.talk', choice: 'both' }, T0 + day * DAY).state;
    expect(s.counters['combo:backstab']).toBe(before + CAMP_MASTERY);
  });

  it('адъютант и модный день', () => {
    let s = fresh();
    expect(adjutantState({ s, now: T0 })?.hero).toBe(Object.keys(s.heroines)[0]);
    expect(() => act(s, { type: 'adj.set', hero: 'keira' })).toThrow('notOwned');
    s = act(s, { type: 'adj.set', hero: 'lira', skin: BOND_SPA_SKIN.lira }).state;
    expect(adjutantSkins(s, 'lira')).not.toContain(BOND_SLEEP_SKIN.lira);
    for (let i = 0; i < ADJ_PATS; i++) s = act(s, { type: 'adj.pat', zone: 'head' }).state;
    expect(bondState({ s, now: T0 }, 'lira').xp).toBeGreaterThanOrEqual(ADJ_PATS * ADJ_PAT_BOND);
    expect(() => act(s, { type: 'adj.pat', zone: 'head' })).toThrow('usedToday');
    expect(fashionOfDay('2026-10-05')).toBe('summer');
    expect(fashionFits('lira_beach', 'summer')).toBe(true);
    s = act(s, { type: 'dev.skins' }).state;
    s = act(s, { type: 'hero.skin', id: 'lira', skin: 'lira_beach' }).state;
    const at = (day: string) => heroStats(cfg, { ...s, day: { ...s.day, key: day } }, 'lira').stats.atk;
    expect(at('2026-10-05') / at('2026-10-06')).toBeCloseTo((1 + 0.03 + FASHION_BONUS) / 1.03, 1);
  });

  it('«Что нового»: короткие записи с иконкой; новичкам уже прочитано', () => {
    expect(fresh().settings.news).toBe(CHANGELOG_LATEST);
    for (const e of CHANGELOG) {
      expect(e.items.length).toBeGreaterThan(0);
      expect(e.items.length).toBeLessThanOrEqual(3);
      if (e.art) expect(HEROINE_MAP[e.art.hero]).toBeDefined();
    }
    expect(() => act(fresh(), { type: 'news.seen', id: 'nope' })).toThrow(GameError);
  });
});

describe('рыбалка и вылазка', () => {
  it('рыбалка: заброс тратит наживку, улов даёт награду', () => {
    let s = act(legion(30, 30), { type: 'dev.progress', accLvl: 30 }).state;
    const r = act(s, { type: 'fish.cast', spot: 'lake' });
    s = r.state;
    expect(FISH_MAP[(r.result as { fish: string }).fish].spot).toBe('lake');
    expect((r.result as { bait: number }).bait).toBe(FISH_DAILY - 1);
    const g0 = s.cur.gold;
    s = act(s, { type: 'fish.reel', ok: true, perfect: true }).state;
    expect(s.cur.gold).toBeGreaterThan(g0);
    expect(() => act(s, { type: 'fish.reel', ok: true })).toThrow('noHook');
  });

  it('вылазка: открывается походом, три забега с наградой в день, итог проверяется', () => {
    expect(() => act(fresh(), { type: 'sortie.start', tier: 'normal', hero: 'lira' })).toThrow('locked');
    let s = legion(30, 20);
    for (let i = 0; i < SORTIE_DAILY; i++) {
      const r = act(s, { type: 'sortie.start', tier: 'normal', hero: 'lira' });
      expect(r.result.rewarded).toBe(true);
      s = r.state;
    }
    const start = act(s, { type: 'sortie.start', tier: 'normal', hero: 'cassian' }, T0 + DAY);
    s = start.state;
    const end = T0 + DAY + (SORTIE_BOSS_AT + 20) * 1000;
    expect(() => act(s, { type: 'sortie.finish', id: start.result.id, time: 100, kills: 50, boss: true }, end)).toThrow('badParam');
    const r = act(s, { type: 'sortie.finish', id: start.result.id, time: SORTIE_BOSS_AT + 10, kills: 900, boss: true }, end);
    expect(r.result.reward.emblems).toBeGreaterThanOrEqual(10);
    expect(r.result.reward.books).toBeGreaterThan(0);
    expect(sortieTierOpen(r.state, 'hard')).toBe(true);
    expect(sortieReward(cfg, s, 'normal', { time: 150, kills: 300, boss: false }).emblems!).toBeLessThan(r.result.reward.emblems);
  });
});

describe('праздники Легиона', () => {
  const T1 = FESTIVAL_EPOCH + 10 * 3600000;
  const ready = (oneShot = true): PlayerState => {
    let s = legion(40, 30);
    s = act(s, { type: 'dev.progress', accLvl: 20 }, T1).state;
    return { ...s, dev: { ...s.dev, oneShot } };
  };

  it('праздники сменяются каждые 14 дней по кругу', () => {
    const ids = [0, 1, 2, 3, 4, 5].map((k) => festivalAt(FESTIVAL_EPOCH + k * FESTIVAL_DAYS * DAY + 1000)!.def.id);
    expect(ids).toEqual(['bloodmoon', 'resort', 'tides', 'mine', 'sakura', 'bloodmoon']);
    for (const fd of FESTIVALS) expect(ROSTER).toContain(fd.hero);
  });

  it('путь: этапы по порядку, звёзды, повтор за билет', () => {
    expect(() => act(fresh(), { type: 'fest.stage', stage: 1 }, T1)).toThrow('locked');
    let s = ready();
    expect(() => act(s, { type: 'fest.stage', stage: 2 }, T1)).toThrow('locked');
    const t0 = s.cur.eventTokens;
    let r = act(s, { type: 'fest.stage', stage: 1 }, T1);
    s = r.state;
    expect((r.result as { stars: number }).stars).toBe(3);
    expect(s.cur.eventTokens - t0).toBe(festFirstReward(1).tokens);
    expect(s.festival!.points).toBe(festFirstReward(1).points + 3 * FEST_STAR_POINTS);
    r = act(s, { type: 'fest.stage', stage: 1 }, T1);
    expect(r.state.festival!.tickets).toBe(FEST_TICKETS - 1);
    for (let st = 2; st <= FEST_STAGES; st++) s = act(s, { type: 'fest.stage', stage: st }, T1).state;
    expect(festGoalValue(s, s.festival!, 'stars')).toBe(FEST_STAGES * 3);
    const units = festStageEnemies(cfg, festivalAt(T1)!.def, s.festival!.lvl, FEST_STAGES);
    expect(units.some((u) => u.kind === 'boss')).toBe(true);
  });

  it('босс праздника: урон копится, победа поднимает уровень; три попытки', () => {
    let s = ready(false);
    const def = festivalAt(T1)!.def;
    const b0 = festBoss({ s, cfg, now: T1 }, def);
    let r = act(s, { type: 'fest.boss' }, T1);
    s = r.state;
    const dmg = (r.result as { dmg: number }).dmg;
    expect(dmg).toBeGreaterThan(0);
    expect(festBoss({ s, cfg, now: T1 }, def).left).toBe(b0.hp - dmg);
    s = { ...s, dev: { ...s.dev, oneShot: true } };
    const e0 = s.cur.emblems;
    r = act(s, { type: 'fest.boss', tactic: 'assault' }, T1);
    s = r.state;
    expect((r.result as { killed: boolean }).killed).toBe(true);
    expect(s.cur.emblems - e0).toBe(festBossReward(1, true).emblems);
    s = act(s, { type: 'fest.boss' }, T1).state;
    expect(() => act(s, { type: 'fest.boss' }, T1)).toThrow('noAttempts');
    expect(() => act(s, { type: 'fest.boss', tactic: 'nope' }, T1 + DAY)).toThrow('badParam');
  });

  it('задания, цели, шкала наград и лавка праздника', () => {
    let s = ready();
    s = act(s, { type: 'sync' }, T1).state;
    const ids = festDailyTasks(dayKey(T1), festivalAt(T1)!.cycle);
    const t = FEST_TASK_MAP[ids[1]];
    s = { ...s, quests: { ...s.quests, daily: { ...s.quests.daily, [t.counter]: t.target } } };
    expect(festClaimable({ s, cfg, now: T1 })).toBeGreaterThanOrEqual(1);
    s = act(s, { type: 'fest.task', id: ids[1] }, T1).state;
    expect(s.festival!.points).toBe(FEST_TASK_REWARD.points);
    const g = FEST_GOALS.find((x) => x.metric === 'bossWin')!;
    s = { ...s, counters: { ...s.counters, bossWin: (s.festival!.base.bossWin ?? 0) + g.target } };
    s = act(s, { type: 'fest.goal', id: g.id }, T1).state;
    s = { ...s, festival: { ...s.festival!, points: 100000 } };
    const r = act(s, { type: 'fest.claim', index: 'all' }, T1);
    expect(r.state.festival!.claimed).toHaveLength(FEST_MILESTONES.length);
    s = { ...r.state, cur: { ...r.state.cur, eventTokens: 100000 } };
    const em = festShopNow({ cfg, now: T1 })!.offers.find((o) => o.id === 'fs_emblems')!;
    for (let i = 0; i < em.limit; i++) s = act(s, { type: 'fest.buy', offer: em.id }, T1).state;
    expect(() => act(s, { type: 'fest.buy', offer: em.id }, T1)).toThrow('limitReached');
  });

  it('расписание из бота: стоп закрывает праздник, старт — запускает выбранный', () => {
    const now = FESTIVAL_EPOCH + 3 * DAY;
    const stop = scheduleStop(undefined, now) as { ok: true; sched: FestivalSchedule };
    expect(festivalAt(now + 1000, stop.sched)).toBeNull();
    const start = scheduleStart(stop.sched, 'tides', now + 5000, 7) as { ok: true; sched: FestivalSchedule };
    expect(festivalAt(now + 6000, start.sched)!.def.id).toBe('tides');
    expect(() => applyAction(ready(), { type: 'fest.stage', stage: 1 }, { cfg: { ...cfg, festival: stop.sched }, now: now + 1000 })).toThrow('noFestival');
  });

  it('копи и волейбол работают на новом бою', () => {
    const TM = FESTIVAL_EPOCH + 3 * FESTIVAL_DAYS * DAY + 3600000;
    let s = ready();
    const m0 = mineOf(s, festivalState({ s, cfg, now: TM }));
    expect(m0.picks).toBe(MINE_START);
    const board = mineBoard(m0.seed, 1);
    const stairs = board.indexOf('stairs');
    let cur = MINE_START_IDX;
    while (cur !== stairs) {
      const [cx, cy] = [cur % MINE_W, Math.floor(cur / MINE_W)];
      const [tx, ty] = [stairs % MINE_W, Math.floor(stairs / MINE_W)];
      cur = cx !== tx ? cur + Math.sign(tx - cx) : cur + Math.sign(ty - cy) * MINE_W;
      s = act(s, { type: 'mine.dig', cell: cur }, TM).state;
    }
    expect(s.festival!.mine!.floor).toBe(2);
    const TR = FESTIVAL_EPOCH + FESTIVAL_DAYS * DAY + 3600000;
    let v = ready();
    v = act(v, { type: 'volley.start', heroes: ['cassian', 'lira'], rung: 1 }, TR).state;
    const res = act(v, { type: 'volley.end', us: VOLLEY_POINTS, them: 1, spikes: 3 }, TR + 20000).result as { won: boolean };
    expect(res.won).toBe(true);
    expect(VOLLEY_DAILY).toBeGreaterThan(0);
  });
});

describe('облики', () => {
  it('летние облики праздника — у всех шестерых; базовые наряды — не купальники', () => {
    const fest = SKINS.filter((x) => FESTIVAL_ONLY_SKINS.has(x.id));
    expect(fest.map((x) => x.hero).sort()).toEqual([...ROSTER].sort());
    for (const sk of fest) expect(isSwimwear(sk.look.wear)).toBe(true);
    for (const h of HEROINES) expect(isSwimwear(h.look.wear)).toBe(false);
    for (const h of HEROINES.filter((x) => !x.look.male)) {
      expect(SKINS.filter((x) => x.hero === h.id && x.set === 'summer').length).toBeGreaterThanOrEqual(4);
      expect(SKINS.filter((x) => x.hero === h.id && x.set === 'lingerie').length).toBeGreaterThanOrEqual(3);
    }
  });
});
