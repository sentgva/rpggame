import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG as cfg,
  GameError,
  applyAction,
  bossUnits,
  createPlayer,
  elementMult,
  heroUnits,
  simulateBattle,
  stageRef,
  stateHash,
  xpToNext,
  levelCap,
  Rng,
  formatNum,
  capMinutes,
  powerLevel,
  stageForLevel,
  enemyStats,
  ENEMY_MAP,
  legionMult,
  BASE_ITEMS,
  canWear,
  SKINS,
  SKIN_MAP,
  SHOP_OFFERS,
  TOWER_SKIN_FLOORS,
  PASS_LEVELS,
  PASS_SKIN_LEVELS,
  PASS_SKIN_DUPE_CRYSTALS,
  passSkins,
  passReward,
  seasonKey,
  HERALDS,
  HERALD_BY_ELEMENT,
  COLOSSI,
  SUMMON_POOL,
  ELEMENTS,
  riftElement,
  riftTier,
  spireOpen,
  riftState,
  riftBoss,
  hordeState,
  spireParty,
  HEROINE_MAP,
  HORDE_SKIN_WAVES,
  SPIRE_SKINS,
  ENCOUNTER_MAP,
  encounterOffer,
  bondState,
  bondTraits,
  bondTopic,
  BOND_HEROES,
  BOND_SLEEP_SKIN,
  ARTIFACTS,
  ARTIFACT_BANNER,
  ARTIFACT_MAX,
  ARTIFACT_REFUND,
  ARTIFACT_SLOT3_LVL,
  activeArtifacts,
  artifactSlots,
  artifactText,
  artifactValue,
  type ArtifactPull,
  BATH_GAIN,
  ROOM_BONUS,
  ROOM_MAX,
  SLEEP_GAIN,
  CHANGELOG,
  CHANGELOG_LATEST,
  buildHeroine,
  artStyleOf,
  hordeBonus,
  hordeWaveReward,
  ENDGAME_SETS,
  MODE_SET,
  DAILY_QUESTS,
  DUNGEONS,
  dungeonOfDay,
  dungeonReward,
  towerMod,
  towerReward,
  VECTOR_ART,
  type PlayerState,
} from '../src';

const T0 = Date.UTC(2026, 8, 25, 10);

function fresh() {
  return createPlayer(cfg, '42', 'Tester', T0);
}

describe('формулы', () => {
  it('опыт до уровня: 100·L^2.2', () => {
    expect(xpToNext(cfg, 1)).toBe(100);
    expect(xpToNext(cfg, 10)).toBe(Math.floor(100 * Math.pow(10, 2.2)));
  });

  it('потолок уровня зависит от звёзд', () => {
    expect(levelCap(cfg, { stars: 1 })).toBe(20);
    expect(levelCap(cfg, { stars: 6 })).toBe(120);
    expect(levelCap(cfg, { stars: 6, awakened: true })).toBe(200);
  });

  it('круг стихий и свет/тьма', () => {
    expect(elementMult('fire', 'nature', 0.3)).toBeCloseTo(1.3);
    expect(elementMult('fire', 'water', 0.3)).toBeCloseTo(0.7);
    expect(elementMult('light', 'dark', 0.3)).toBeCloseTo(1.3);
    expect(elementMult('dark', 'light', 0.3)).toBeCloseTo(1.3);
    expect(elementMult('light', 'fire', 0.3)).toBe(1);
  });

  it('формат больших чисел', () => {
    expect(formatNum(999)).toBe('999');
    expect(formatNum(1500)).toBe('1.5K');
    expect(formatNum(2.5e6)).toBe('2.5M');
    expect(formatNum(1e36)).toMatch(/^1[a-z]{2}$/);
  });
});

describe('симулятор боя', () => {
  it('детерминирован: одинаковый seed — одинаковый бой', () => {
    const s = fresh();
    const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, 5))];
    const a = simulateBattle(cfg, { seed: 12345, units, timeLimit: 60 });
    const b = simulateBattle(cfg, { seed: 12345, units, timeLimit: 60 });
    expect(stateHash(a.events)).toBe(stateHash(b.events));
    expect(a.win).toBe(b.win);
    const c = simulateBattle(cfg, { seed: 999, units, timeLimit: 60 });
    expect(stateHash(c.events)).not.toBe(stateHash(a.events));
  });

  it('тихий режим сервера даёт тот же исход', () => {
    const s = fresh();
    const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, 3))];
    const loud = simulateBattle(cfg, { seed: 7, units, timeLimit: 60 });
    const quiet = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, quiet: true });
    expect(quiet.win).toBe(loud.win);
    expect(quiet.time).toBe(loud.time);
    expect(quiet.events.length).toBe(0);
  });

  it('таймер боя с боссом — 60 секунд', () => {
    const s = fresh();
    const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, 200))];
    const r = simulateBattle(cfg, { seed: 1, units, timeLimit: 60 });
    expect(r.win).toBe(false);
    expect(r.time).toBeLessThanOrEqual(60000);
  });

  it('все механики боссов актов отрабатывают без ошибок', () => {
    const s = fresh();
    for (let act = 1; act <= 10; act++) {
      const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, act * 20))];
      const r = simulateBattle(cfg, { seed: act, units, timeLimit: 60, immortal: true });
      expect(r.events.length).toBeGreaterThan(5);
    }
  });
});

describe('действия', () => {
  it('не мутирует исходное состояние', () => {
    const s = fresh();
    const before = stateHash(s);
    applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + 1000 });
    expect(stateHash(s)).toBe(before);
  });

  it('клиент и сервер получают одинаковое состояние', () => {
    const s = fresh();
    const a = applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + 5000 });
    const b = applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + 5000, server: true });
    expect(stateHash(a.state)).toBe(stateHash(b.state));
  });

  it('стиль графики: вектор по умолчанию, переключается на пиксели, мусор отклоняется', () => {
    const s = fresh();
    expect(s.settings.artStyle ?? 'vector').toBe('vector');
    const r = applyAction(s, { type: 'settings', patch: { artStyle: 'pixel' } }, { cfg, now: T0 });
    expect(r.state.settings.artStyle).toBe('pixel');
    expect(() => applyAction(s, { type: 'settings', patch: { artStyle: '3d' } }, { cfg, now: T0 })).toThrow(GameError);
    // пока векторный стиль выключен, рисуем пикселями при любом сохранённом выборе
    expect(artStyleOf(undefined)).toBe(VECTOR_ART ? 'vector' : 'pixel');
    expect(artStyleOf('vector')).toBe(VECTOR_ART ? 'vector' : 'pixel');
    expect(artStyleOf('pixel')).toBe('pixel');
  });

  it('полный сброс: игра с нуля, настройки сохраняются, без подтверждения — ошибка', () => {
    let s = fresh();
    s = applyAction(s, { type: 'settings', patch: { lang: 'en', music: 0.2 } }, { cfg, now: T0 }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e6 }, { cfg, now: T0 + 1000, dev: true }).state;
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl: 20 }, { cfg, now: T0 + 2000, dev: true }).state;
    expect(() => applyAction(s, { type: 'account.reset' }, { cfg, now: T0 + 3000 })).toThrow(GameError);
    const r = applyAction(s, { type: 'account.reset', confirm: 'RESET' }, { cfg, now: T0 + 3000 }).state;
    const base = createPlayer(cfg, '42', 'Tester', T0 + 3000);
    expect(Object.keys(r.heroines).sort()).toEqual(Object.keys(base.heroines).sort());
    expect(r.cur.gold).toBe(base.cur.gold);
    expect(r.progress).toEqual(base.progress);
    expect(r.tutorial).toBe(0);
    expect(r.settings.lang).toBe('en');
    expect(r.settings.music).toBe(0.2);
    expect(r.dev.used).toBe(true);
    // клиент и сервер получают одно и то же
    const srv = applyAction(s, { type: 'account.reset', confirm: 'RESET' }, { cfg, now: T0 + 3000, server: true }).state;
    expect(stateHash(srv)).toBe(stateHash(r));
  });

  it('dev-действия запрещены без флага разработчика', () => {
    const s = fresh();
    expect(() => applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'max' }, { cfg, now: T0 })).toThrow(GameError);
    const r = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1000 }, { cfg, now: T0, dev: true });
    expect(r.state.cur.gold).toBe(s.cur.gold + 1000);
    expect(r.state.dev.used).toBe(true);
  });

  it('серверные действия (почта) недоступны клиенту', () => {
    const s = fresh();
    const mail = { id: 'm1', title: { ru: 'т', en: 't' }, body: { ru: 'т', en: 't' }, at: T0, rewards: { cur: { crystals: 10 } } };
    expect(() => applyAction(s, { type: 'mail.add', mail }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'mail.add', mail }, { cfg, now: T0, server: true })).toThrow(GameError);
    const r = applyAction(s, { type: 'mail.add', mail }, { cfg, now: T0, trusted: true });
    expect(r.state.mail.some((m) => m.id === 'm1')).toBe(true);
  });

  it('без рекламы: два бесплатных быстрых сбора и ускорения ×2 с дневным лимитом', () => {
    let s = fresh();
    s = applyAction(s, { type: 'chest.quick', method: 'free' }, { cfg, now: T0 }).state;
    s = applyAction(s, { type: 'chest.quick', method: 'free' }, { cfg, now: T0 }).state;
    expect(() => applyAction(s, { type: 'chest.quick', method: 'free' }, { cfg, now: T0 })).toThrow(GameError);
    for (let i = 0; i < cfg.income.x2PerDay; i++) s = applyAction(s, { type: 'boost.x2' }, { cfg, now: T0 }).state;
    expect(s.boosts.x2Until).toBe(T0 + cfg.income.x2PerDay * cfg.income.x2Minutes * 60000);
    expect(() => applyAction(s, { type: 'boost.x2' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('офлайн-доход ограничен 12 часами', () => {
    const s = fresh();
    s.progress.maxGlobal = 10;
    const r24 = applyAction(s, { type: 'sync' }, { cfg, now: T0 + 24 * 3600000 });
    expect(r24.state.chest.minutes).toBeCloseTo(capMinutes(cfg, s, T0), 3);
    expect(r24.state.chest.minutes).toBe(12 * 60);
  });

  it('гарант призыва: SSR не позже 60-го', () => {
    let s = fresh();
    s.cur.scrolls = 1000;
    const rarities: string[] = [];
    for (let i = 0; i < 12; i++) {
      const r = applyAction(s, { type: 'summon', count: 10, pay: 'scrolls' }, { cfg, now: T0 });
      s = r.state;
      rarities.push(...r.result.pulls.map((p: { rarity: string }) => p.rarity));
    }
    let sinceSSR = 0;
    for (const r of rarities) {
      sinceSSR++;
      if (r === 'SSR' || r === 'UR') sinceSSR = 0;
      expect(sinceSSR).toBeLessThan(60);
    }
  });

  it('заточка: до +10 всегда успешно', () => {
    let s = fresh();
    s.cur.gold = 1e12;
    s.cur.dust = 1e9;
    const g = applyAction(s, { type: 'dev.item', slot: 'weapon', rarity: 3, lvl: 10 }, { cfg, now: T0, dev: true });
    s = g.state;
    const uid = g.result.uid as string;
    for (let i = 0; i < 10; i++) {
      const r = applyAction(s, { type: 'item.enhance', uid }, { cfg, now: T0 });
      expect(r.result.ok).toBe(true);
      s = r.state;
    }
    expect(s.items[uid].enh).toBe(10);
  });

  it('полный цикл этапа: 3 волны → босс', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = applyAction(s, { type: 'battle.wave' }, { cfg, now: T0 + i }).state;
    expect(s.progress.wave).toBe(3);
    const r = applyAction(s, { type: 'battle.boss' }, { cfg, now: T0 + 10 });
    expect(r.result.win).toBe(true);
    expect(r.state.progress.cleared[0]).toBe(1);
    expect(r.state.progress.wave).toBe(0);
  });

  it('Вознесение даёт Эфир и сбрасывает этапы', () => {
    let s = fresh();
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 101 }, { cfg, now: T0, dev: true }).state;
    s.heroines.lira.lvl = 50;
    const r = applyAction(s, { type: 'ascend' }, { cfg, now: T0, dev: true });
    expect(r.result.ether).toBe(Math.floor(10 * Math.pow(100 / 50, 1.6)));
    expect(r.state.progress.maxGlobal).toBe(0);
    expect(r.state.heroines.lira.lvl).toBe(1);
    expect(r.state.progress.maxGlobalEver).toBe(100);
    expect(legionMult(cfg, r.state)).toBeCloseTo(1 + cfg.ascension.cyclePower);
  });

  it('полный инвентарь: переплавляется самый слабый свободный предмет, а не новый', () => {
    let s = fresh();
    const cap = cfg.inventory.start;
    // забиваем инвентарь слабыми предметами
    for (let i = Object.keys(s.items).length; i < cap; i++) s = applyAction(s, { type: 'dev.item', slot: 'ring', rarity: 0, lvl: 1 }, { cfg, now: T0, dev: true }).state;
    expect(Object.keys(s.items).length).toBe(cap);
    const r = applyAction(s, { type: 'dev.item', slot: 'weapon', rarity: 3, lvl: 100 }, { cfg, now: T0, dev: true });
    expect(r.result.uid).toBeTruthy();
    expect(r.state.items[r.result.uid as string]).toBeTruthy();
    expect(Object.keys(r.state.items).length).toBe(cap);
  });

  it('«Надеть лучшее» переносит заточку на более сильный предмет', () => {
    let s = fresh();
    s.cur.gold = 1e15;
    s.cur.dust = 1e12;
    const base = BASE_ITEMS.find((b) => b.slot === 'weapon' && canWear('sorceress', b))!.id;
    const old = applyAction(s, { type: 'dev.item', slot: 'weapon', rarity: 2, lvl: 10, base }, { cfg, now: T0, dev: true });
    s = old.state;
    const oldUid = old.result.uid as string;
    s = applyAction(s, { type: 'item.equip', hero: 'lira', uid: oldUid }, { cfg, now: T0 }).state;
    for (let i = 0; i < 10; i++) s = applyAction(s, { type: 'item.enhance', uid: oldUid }, { cfg, now: T0 }).state;
    const nu = applyAction(s, { type: 'dev.item', slot: 'weapon', rarity: 2, lvl: 40, base }, { cfg, now: T0, dev: true });
    s = nu.state;
    const newUid = nu.result.uid as string;
    s = applyAction(s, { type: 'item.autoEquip', hero: 'lira' }, { cfg, now: T0 }).state;
    expect(s.heroines.lira.gear.weapon).toBe(newUid);
    expect(s.items[newUid].enh).toBe(10);
    expect(s.items[oldUid].enh).toBe(0);
  });
});

describe('ручные ульты и Сокрушительный удар', () => {
  function bossState(lvl = 20) {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 20 }, { cfg, now: T0, dev: true }).state;
    s.progress.wave = 3;
    return s;
  }
  type Ev = { t: number; k: string; kind?: string; u?: number; m?: string; units?: { uid: number; side: number; kind: string }[] };
  const boss = (s: PlayerState, extra: Record<string, unknown> = {}, server = false) =>
    applyAction(s, { type: 'battle.boss', ...extra }, { cfg, now: T0 + 1000, server }).result as { win: boolean; battle: { events: Ev[] } };

  it('босс готовит удар; без команд в ручном режиме героини не выпускают ульты', () => {
    const s = bossState();
    const auto = boss(s).battle.events;
    expect(auto.some((e) => e.k === 'mech' && e.m === 'castStart')).toBe(true);
    const manual = boss(s, { manual: true, inputs: [] }).battle.events;
    const heroes = new Set((manual[0].units ?? []).filter((u) => u.side === 0).map((u) => u.uid));
    expect(manual.some((e) => e.k === 'act' && e.kind === 'ult' && heroes.has(e.u!))).toBe(false);
  });

  it('команда игрока: прошлое не меняется, ульта выходит после команды, сервер получает тот же бой', () => {
    const s = bossState();
    const base = boss(s, { manual: true, inputs: [] }).battle.events;
    const hero = (base[0].units ?? []).find((u) => u.side === 0 && u.kind === 'hero')!.uid;
    const T = 5000;
    const inputs = [{ t: T, u: hero }];
    const withCmd = boss(s, { manual: true, inputs });
    const ev = withCmd.battle.events;
    // всё до команды — как без неё
    const before = (list: Ev[]) => JSON.stringify(list.filter((e) => e.t < T));
    expect(before(ev)).toBe(before(base));
    const ult = ev.find((e) => e.k === 'act' && e.kind === 'ult' && e.u === hero);
    if (ult) expect(ult.t).toBeGreaterThanOrEqual(T);
    // тот же бой на сервере (тихий режим)
    const srv = boss(s, { manual: true, inputs }, true);
    expect(srv.win).toBe(withCmd.win);
    // «Авто» с момента t: дальше ульты сами
    const autoFrom = boss(s, { manual: true, inputs: [{ t: 1, u: -1 }] }).battle.events;
    expect(JSON.stringify(autoFrom)).toBe(JSON.stringify(boss(s).battle.events));
  });

  it('ульта во время каста прерывает удар', () => {
    const s = bossState(22);
    const base = boss(s, { manual: true, inputs: [] }).battle.events;
    const cast = base.find((e) => e.k === 'mech' && e.m === 'castStart');
    expect(cast).toBeTruthy();
    const heroes = (base[0].units ?? []).filter((u) => u.side === 0 && u.kind === 'hero').map((u) => u.uid);
    const ev = boss(s, { manual: true, inputs: heroes.map((u) => ({ t: cast!.t + 1, u })) }).battle.events;
    expect(ev.some((e) => e.k === 'mech' && e.m === 'interrupt')).toBe(true);
  });

  it('кривые команды отклоняются', () => {
    const s = bossState();
    expect(() => boss(s, { manual: true, inputs: 'x' })).toThrow(GameError);
    expect(() => boss(s, { manual: true, inputs: [{ t: -5, u: 0 }] })).toThrow(GameError);
    expect(() => boss(s, { manual: true, inputs: Array.from({ length: 200 }, () => ({ t: 1, u: 0 })) })).toThrow(GameError);
  });
});

describe('встречи', () => {
  function ready() {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl: 25 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 20 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e9 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'crystals', op: 'add', amount: 10000 }, { cfg, now: T0, dev: true }).state;
    return s;
  }
  const at = (s: PlayerState, kind: string, now = T0 + 1000) => ({ ...s, encounter: { kind, at: now, until: now + 600000 } }) as PlayerState;

  it('появляется через несколько минут, одна за раз, истекает', () => {
    let s = ready();
    s = applyAction(s, { type: 'sync' }, { cfg, now: T0 }).state;
    expect(s.encounter ?? null).toBeNull();
    expect(s.encounterNext).toBe(T0 + 5 * 60000);
    s = applyAction(s, { type: 'sync' }, { cfg, now: T0 + 5 * 60000 + 1 }).state;
    expect(s.encounter).toBeTruthy();
    expect(ENCOUNTER_MAP[s.encounter!.kind]).toBeTruthy();
    const next = s.encounterNext!;
    expect(next - (T0 + 5 * 60000 + 1)).toBeGreaterThanOrEqual(15 * 60000);
    // пока встреча висит, новая не появляется; после истечения — исчезает
    s = applyAction(s, { type: 'sync' }, { cfg, now: T0 + 10 * 60000 }).state;
    expect(s.encounter).toBeTruthy();
    s = applyAction(s, { type: 'sync' }, { cfg, now: s.encounter!.until + 1 }).state;
    if (s.encounter) expect(s.encounter.at).toBeGreaterThan(T0 + 10 * 60000);
    expect(() => applyAction({ ...s, encounter: null }, { type: 'encounter.resolve', choice: 'leave' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('выборы: алтарь, торговка, путница, игрок, засада, сундук', () => {
    const s = ready();
    const g = applyAction(at(s, 'shrine'), { type: 'encounter.resolve', choice: 'gold' }, { cfg, now: T0 + 2000 });
    const offer = encounterOffer({ cfg, s }, 'shrine') as { gold: { gold: number } };
    expect((g.result as { cur: { gold: number } }).cur.gold).toBe(offer.gold.gold);
    const r1 = applyAction(at(s, 'shrine'), { type: 'encounter.resolve', choice: 'dust' }, { cfg, now: T0 + 2000 });
    expect(r1.state.cur.dust).toBeGreaterThan(s.cur.dust);
    expect(r1.state.encounter).toBeNull();
    const r2 = applyAction(at(s, 'merchant'), { type: 'encounter.resolve', choice: 'scroll' }, { cfg, now: T0 + 2000 });
    expect(r2.state.cur.scrolls).toBe(s.cur.scrolls + 1);
    expect(r2.state.cur.crystals).toBe(s.cur.crystals - 150);
    const r3 = applyAction(at(s, 'traveler'), { type: 'encounter.resolve', choice: 'help' }, { cfg, now: T0 + 2000 });
    expect(Object.values((r3.result as { shards: Record<string, number> }).shards)[0]).toBe(5);
    const r4 = applyAction(at(s, 'gambler'), { type: 'encounter.resolve', choice: 'bet' }, { cfg, now: T0 + 2000 });
    expect(['lucky', 'unlucky']).toContain((r4.result as { outcome: string }).outcome);
    const r5 = applyAction(at(s, 'ambush'), { type: 'encounter.resolve', choice: 'fight' }, { cfg, now: T0 + 2000 });
    expect((r5.result as { battle: unknown }).battle).toBeTruthy();
    const r6 = applyAction(at(s, 'chest'), { type: 'encounter.resolve', choice: 'open' }, { cfg, now: T0 + 2000 });
    expect(['ok', 'mimicWin', 'mimicLose']).toContain((r6.result as { outcome: string }).outcome);
    expect(() => applyAction(at(s, 'chest'), { type: 'encounter.resolve', choice: 'bet' }, { cfg, now: T0 + 2000 })).toThrow(GameError);
    // без золота откупиться нельзя — встреча остаётся
    const poor = { ...at(s, 'ambush'), cur: { ...s.cur, gold: 0 } } as PlayerState;
    expect(() => applyAction(poor, { type: 'encounter.resolve', choice: 'pay' }, { cfg, now: T0 + 2000 })).toThrow(GameError);
    // клиент и сервер получают одно и то же
    const c = applyAction(at(s, 'chest'), { type: 'encounter.resolve', choice: 'open' }, { cfg, now: T0 + 2000 });
    const sv = applyAction(at(s, 'chest'), { type: 'encounter.resolve', choice: 'open' }, { cfg, now: T0 + 2000, server: true });
    expect(stateHash(sv.state)).toBe(stateHash(c.state));
  });
});

describe('уход за героинями', () => {
  function withUr() {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'velvet', lvl: 10 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e9 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'crystals', op: 'add', amount: 100000 }, { cfg, now: T0, dev: true }).state;
    return s;
  }

  it('купальник для источников есть у каждой UR-героини, скрытые облики не продаются и не носятся', async () => {
    const { BOND_HEROES, BOND_SPA_SKIN, SKINS, SKIN_MAP } = await import('../src');
    for (const id of BOND_HEROES) {
      const skin = BOND_SPA_SKIN[id];
      expect(SKIN_MAP[skin]?.hero).toBe(id);
      expect(SKIN_MAP[skin].look.wear).toMatch(/^swim/);
      if (skin.endsWith('_spa')) expect(SKINS.some((x) => x.id === skin)).toBe(false);
    }
    let s = withUr();
    expect(() => applyAction(s, { type: 'hero.skin', id: 'velvet', skin: 'velvet_spa' }, { cfg, now: T0 })).toThrow('noSkin');
    s = applyAction(s, { type: 'bond.spa', hero: 'velvet' }, { cfg, now: T0 }).state;
    expect(s.heroines.velvet.skin).toBeUndefined();
  });

  const A = (s: PlayerState, a: Record<string, unknown>, now = T0 + 1000) => applyAction(s, { type: 'x', ...a } as never, { cfg, now });

  it('только UR и только свои; дневные лимиты; новый день — снова можно', () => {
    let s = withUr();
    expect(() => A(s, { type: 'bond.spa', hero: 'lira' })).toThrow(GameError); // не UR
    expect(() => A(s, { type: 'bond.spa', hero: 'isolde' })).toThrow(GameError); // нет героини
    for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }).state;
    expect(() => A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 })).toThrow(GameError);
    s = A(s, { type: 'bond.spa', hero: 'velvet' }).state;
    expect(() => A(s, { type: 'bond.spa', hero: 'velvet' })).toThrow(GameError);
    // свидания — с 3-го уровня
    expect(() => A(s, { type: 'bond.date', hero: 'velvet', place: 'lake' })).toThrow(GameError);
    expect(bondState({ s, now: T0 + 86400000 }, 'velvet').talk).toBe(0);
    expect(() => A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }, T0 + 86400000)).not.toThrow();
  });

  it('ответы и угощения: любимое даёт больше; уровни, награды и бонус к статам', () => {
    let s = withUr();
    const best = A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }).result as { xp: number };
    const bad = A(s, { type: 'bond.talk', hero: 'velvet', answer: 2 }).result as { xp: number };
    expect(best.xp).toBeGreaterThan(bad.xp);
    const t = bondTraits('velvet');
    const fav = A(s, { type: 'bond.treat', hero: 'velvet', treat: t.treat }).result as { like: number; xp: number };
    const dis = A(s, { type: 'bond.treat', hero: 'velvet', treat: t.dislike }).result as { like: number; xp: number };
    expect(fav.like).toBe(0);
    expect(fav.xp).toBeGreaterThan(dis.xp);
    const before = buildHeroine(cfg, s, s.heroines.velvet).power;
    // много дней заботы: до 10-го уровня
    const crystals0 = s.cur.crystals;
    for (let d = 0; d < 40 && (s.bond?.velvet?.lvl ?? 0) < 10; d++) {
      const now = T0 + d * 86400000 + 1000;
      for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }, now).state;
      for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.treat', hero: 'velvet', treat: t.treat }, now).state;
      s = A(s, { type: 'bond.spa', hero: 'velvet' }, now).state;
      if ((s.bond?.velvet?.lvl ?? 0) >= 3) s = A(s, { type: 'bond.date', hero: 'velvet', place: t.place }, now).state;
    }
    expect(s.bond!.velvet.lvl).toBe(10);
    expect(s.cur.crystals).toBeGreaterThan(crystals0 - 40 * 30); // награды пиков покрыли источники
    expect(buildHeroine(cfg, s, s.heroines.velvet).power).toBeGreaterThan(before * 1.15);
    // наряд близости — только за 10 Сердец Эфира
    expect(() => A(s, { type: 'bond.costume', hero: 'velvet' })).toThrow(GameError);
    s = { ...s, bondHearts: 10 };
    const c = A(s, { type: 'bond.costume', hero: 'velvet' });
    expect(c.state.skins).toContain('velvet_bond');
    expect(c.state.bondHearts).toBe(0);
    expect(SKIN_MAP.velvet_bond.set).toBe('bond');
  });

  it('резиденция: комнаты строятся и улучшаются до 5; гостиная усиливает разговоры', () => {
    let s = withUr();
    const plain = (A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }).result as { xp: number }).xp;
    const gold0 = s.cur.gold;
    for (let i = 0; i < ROOM_MAX; i++) s = A(s, { type: 'home.build', room: 'living' }).state;
    expect(s.home!.rooms.living).toBe(ROOM_MAX);
    expect(s.cur.gold).toBeLessThan(gold0);
    expect(() => A(s, { type: 'home.build', room: 'living' })).toThrow('maxLevel');
    expect(() => A(s, { type: 'home.build', room: 'attic' })).toThrow(GameError);
    const boosted = (A(s, { type: 'bond.talk', hero: 'velvet', answer: 0 }).result as { xp: number }).xp;
    expect(boosted).toBe(Math.round(plain * (1 + ROOM_BONUS * ROOM_MAX)));
  });

  it('ванна — только с ванной комнатой и раз в день', () => {
    let s = withUr();
    expect(() => A(s, { type: 'bond.bath', hero: 'velvet' })).toThrow('locked');
    s = A(s, { type: 'home.build', room: 'bath' }).state;
    const r = A(s, { type: 'bond.bath', hero: 'velvet' });
    expect((r.result as { xp: number }).xp).toBe(BATH_GAIN.base + BATH_GAIN.perLvl);
    s = r.state;
    expect(() => A(s, { type: 'bond.bath', hero: 'velvet' })).toThrow('usedToday');
    expect(() => A(s, { type: 'bond.bath', hero: 'velvet' }, T0 + 86400000)).not.toThrow();
  });

  it('ночёвка: спальня, близость 5, одна героиня за ночь; утром — подарок', () => {
    let s = withUr();
    s = applyAction(s, { type: 'dev.hero', id: 'isolde', lvl: 10 }, { cfg, now: T0, dev: true }).state;
    expect(() => A(s, { type: 'bond.sleep', hero: 'velvet' })).toThrow('locked'); // нет спальни
    s = A(s, { type: 'home.build', room: 'bedroom' }).state;
    expect(() => A(s, { type: 'bond.sleep', hero: 'velvet' })).toThrow('locked'); // близость мала
    s = { ...s, bond: { velvet: { lvl: 5, xp: 0, day: 'x', talk: 0, treat: 0, spa: false, date: false }, isolde: { lvl: 6, xp: 0, day: 'x', talk: 0, treat: 0, spa: false, date: false } } };
    const gold0 = s.cur.gold;
    const r = A(s, { type: 'bond.sleep', hero: 'velvet' });
    const res = r.result as { xp: number; gift: { gold: number; xp: number } };
    expect(res.xp).toBe(SLEEP_GAIN.base + SLEEP_GAIN.perLvl);
    expect(res.gift.gold).toBeGreaterThan(0);
    expect(r.state.cur.gold).toBe(gold0 + res.gift.gold);
    s = r.state;
    expect(s.home!.sleptWith).toBe('velvet');
    expect(() => A(s, { type: 'bond.sleep', hero: 'isolde' })).toThrow('usedToday'); // одна за ночь
    expect(() => A(s, { type: 'bond.sleep', hero: 'isolde' }, T0 + 86400000)).not.toThrow();
    // пижама — скрытый облик
    expect(SKIN_MAP[BOND_SLEEP_SKIN.velvet].look.wear).toBe('silk');
    expect(SKINS.some((x) => x.id === BOND_SLEEP_SKIN.velvet)).toBe(false);
  });

  it('темы разговоров детерминированы и есть у всех UR', () => {
    for (const id of BOND_HEROES) {
      const a = bondTopic(id, '2026-09-26', 0);
      expect(a).toEqual(bondTopic(id, '2026-09-26', 0));
      expect(a.topic.answers).toHaveLength(3);
      expect(SKIN_MAP[`${id}_bond`]).toBeTruthy();
    }
  });

  it('«Что нового»: новичкам уже прочитано, отметка сохраняется', () => {
    const s = fresh();
    expect(s.settings.news).toBe(CHANGELOG_LATEST);
    const r = applyAction({ ...s, settings: { ...s.settings, news: undefined } }, { type: 'news.seen', id: CHANGELOG[1].id }, { cfg, now: T0 });
    expect(r.state.settings.news).toBe(CHANGELOG[1].id);
    expect(() => applyAction(s, { type: 'news.seen', id: 'nope' }, { cfg, now: T0 })).toThrow(GameError);
  });
});

describe('уровень силы врагов', () => {
  it('Normal совпадает с номером этапа, Hard = +log(25), Nightmare = +log(400)', () => {
    expect(powerLevel(cfg, 150)).toBeCloseTo(150);
    expect(powerLevel(cfg, 201)).toBeCloseTo(1 + Math.log(25) / Math.log(1.09));
    expect(powerLevel(cfg, 600)).toBeCloseTo(200 + Math.log(400) / Math.log(1.09));
  });

  it('HP врага Hard = ×25 от того же этапа Normal', () => {
    const def = ENEMY_MAP[Object.keys(ENEMY_MAP)[0]];
    const normal = enemyStats(cfg, powerLevel(cfg, 50), def, 'normal');
    const hard = enemyStats(cfg, powerLevel(cfg, 250), def, 'normal');
    expect(hard.hp / normal.hp).toBeCloseTo(25, 0);
  });

  it('stageForLevel — обратное к powerLevel', () => {
    for (const n of [1, 77, 200, 260, 600]) expect(powerLevel(cfg, stageForLevel(cfg, powerLevel(cfg, n)))).toBeCloseTo(powerLevel(cfg, n), 0);
  });
});

describe('ГПСЧ', () => {
  it('воспроизводим', () => {
    const a = new Rng(5);
    const b = new Rng(5);
    for (let i = 0; i < 100; i++) expect(a.u32()).toBe(b.u32());
  });
});

describe('облики и боевой пропуск', () => {
  const setSkins = SKINS.filter((x) => x.set);

  it('коллекции: 20 летних, 20 бельевых и 15 маскарадных, эксклюзивов мало, все продаются за кристаллы', () => {
    expect(setSkins.filter((x) => x.set === 'summer')).toHaveLength(20);
    expect(setSkins.filter((x) => x.set === 'lingerie')).toHaveLength(20);
    expect(setSkins.filter((x) => x.set === 'masquerade')).toHaveLength(15);
    const exclusive = setSkins.filter((x) => x.source === 'shop');
    expect(exclusive.length).toBeGreaterThan(0);
    expect(exclusive.length).toBeLessThanOrEqual(10);
    // все облики коллекций продаются за кристаллы — кроме нарядов близости (только уход и Сердца Эфира)
    for (const sk of setSkins.filter((x) => x.set !== 'bond')) expect(SHOP_OFFERS.some((o) => o.shop === 'skins' && o.give.skin === sk.id)).toBe(true);
    for (const sk of setSkins.filter((x) => x.set === 'bond')) expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id)).toBe(false);
    expect(new Set(SKINS.map((x) => x.id)).size).toBe(SKINS.length);
  });

  it('у каждого облика есть рабочий источник', () => {
    for (const sk of setSkins) {
      if (sk.source === 'arena' || sk.source === 'labyrinth' || sk.source === 'event')
        expect(SHOP_OFFERS.some((o) => o.shop === sk.source && o.give.skin === sk.id)).toBe(true);
      if (sk.source === 'tower') expect(Object.values(TOWER_SKIN_FLOORS)).toContain(sk.id);
      if (sk.source === 'spire') expect(Object.values(SPIRE_SKINS)).toContain(sk.id);
      if (sk.source === 'horde') expect(Object.values(HORDE_SKIN_WAVES)).toContain(sk.id);
    }
    for (const id of [...Object.values(SPIRE_SKINS), ...Object.values(HORDE_SKIN_WAVES)]) expect(SKIN_MAP[id]?.source).toMatch(/spire|horde/);
    for (const id of Object.values(TOWER_SKIN_FLOORS)) expect(SKIN_MAP[id]).toBeTruthy();
    // облики пропуска попадают в ротацию сезонов
    const rotated = new Set<string>();
    for (let n = 0; n < 12; n++) for (const id of passSkins(`s${n}`)) rotated.add(id);
    for (const sk of setSkins.filter((x) => x.source === 'pass')) expect(rotated.has(sk.id)).toBe(true);
  });

  it('каждый сезон — своя четвёрка обликов', () => {
    const a = passSkins('s0');
    const b = passSkins('s1');
    expect(a).toHaveLength(PASS_SKIN_LEVELS.length);
    expect(new Set(a).size).toBe(a.length);
    expect(a).not.toEqual(b);
    for (const id of [...a, ...b]) expect(SKIN_MAP[id]).toBeTruthy();
    expect(passReward(PASS_SKIN_LEVELS[0], 's1').skin).toBe(b[0]);
  });

  it('«забрать всё»: все уровни, облики сезона, бонусные сундуки; повторный облик → кристаллы', () => {
    let s = fresh();
    const season = seasonKey(T0);
    const skins = passSkins(season);
    s.skins.push(skins[0]);
    s.shop.passXp = PASS_LEVELS * 100 + 450; // 50 уровней + 2 бонусных сундука
    const before = s.cur.crystals;
    const r = applyAction(s, { type: 'pass.claimAll' }, { cfg, now: T0 });
    s = r.state;
    expect(s.shop.passClaimed).toHaveLength(PASS_LEVELS);
    for (const id of skins) expect(s.skins).toContain(id);
    expect((r.result as { skins?: string[] }).skins).not.toContain(skins[0]);
    expect(s.shop.passBonus).toBe(2);
    expect(s.cur.crystals).toBeGreaterThan(before + PASS_SKIN_DUPE_CRYSTALS);
    expect(() => applyAction(s, { type: 'pass.claimAll' }, { cfg, now: T0 })).toThrow(GameError);
  });
});

describe('Вестницы, Колоссы и новые режимы', () => {
  // T0 — пятница 25.09.2026: Колосс Бездны и тёмный шпиль
  function strong() {
    let s = fresh();
    // отряд, уверенно проходящий свой этап (как у живого игрока), а не голые dev-героини
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl: 30 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.progress', unlockAll: true, diff: 0, idx: 20 }, { cfg, now: T0, dev: true }).state;
    return s;
  }

  it('5 Вестниц (по стихии) не выпадают в призыве; 5 Колоссов', () => {
    expect(HERALDS).toHaveLength(5);
    expect(new Set(HERALDS.map((h) => h.element)).size).toBe(5);
    for (const el of ELEMENTS) expect(HERALD_BY_ELEMENT[el]).toBeTruthy();
    const pool = Object.values(SUMMON_POOL).flat();
    for (const h of HERALDS) expect(pool).not.toContain(h.id);
    expect(COLOSSI).toHaveLength(5);
  });

  it('расписание: будни по стихиям, выходные — все шпили', () => {
    expect(riftElement(Date.UTC(2026, 8, 21, 12))).toBe('fire'); // пн
    expect(riftElement(T0)).toBe('dark'); // пт
    expect(spireOpen('dark', T0)).toBe(true);
    expect(spireOpen('fire', T0)).toBe(false);
    for (const el of ELEMENTS) expect(spireOpen(el, Date.UTC(2026, 8, 26, 12))).toBe(true); // сб
    expect(riftTier(0, 100)).toBe(0);
    expect(riftTier(5, 100)).toBe(4);
    expect(riftTier(1, 100, true)).toBe(10);
  });

  it('Разлом: 3 попытки в день, награда по урону, осколки Вестницы дня, быстрая зачистка', () => {
    let s = strong();
    const boss = riftBoss({ cfg, s, now: T0 });
    expect(boss.element).toBe('dark');
    const r1 = applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 });
    s = r1.state;
    const res = r1.result as { dmg: number; tier: number };
    expect(res.dmg).toBeGreaterThan(0);
    expect(res.tier).toBeGreaterThan(0);
    expect(s.shards.nocturna ?? 0).toBe(res.tier);
    s = applyAction(s, { type: 'rift.sweep' }, { cfg, now: T0 + 1000 }).state;
    expect(riftState({ s, now: T0 }).used).toBe(cfg.modes.riftAttempts);
    expect(s.shards.nocturna).toBe(res.tier * cfg.modes.riftAttempts);
    expect(() => applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 + 2000 })).toThrow(GameError);
    // на следующий день попытки снова есть
    expect(riftState({ s, now: T0 + 86400000 }).used).toBe(0);
  });

  it('Шпиль: только героини своей стихии, закрытый шпиль не пускает, веха даёт осколки', () => {
    let s = strong();
    const party = spireParty({ cfg, s, now: T0 }, 'dark').filter(Boolean) as string[];
    expect(party.length).toBeGreaterThan(0);
    for (const id of party) expect(HEROINE_MAP[id].element).toBe('dark');
    expect(() => applyAction(s, { type: 'spire.fight', element: 'fire' }, { cfg, now: T0 })).toThrow(GameError);
    s.modes.spires = { dark: 9 };
    const r = applyAction(s, { type: 'spire.fight', element: 'dark' }, { cfg, now: T0 });
    if ((r.result as { win: boolean }).win) {
      expect(r.state.modes.spires?.dark).toBe(10);
      expect(r.state.shards.nocturna).toBe(10);
    }
  });

  it('Нашествие: один забег в день, здоровье переносится, отступление', () => {
    let s = strong();
    s = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
    expect(hordeState({ s, now: T0 }).active).toBe(true);
    const r = applyAction(s, { type: 'horde.fight' }, { cfg, now: T0 + 1000 });
    s = r.state;
    const h = hordeState({ s, now: T0 });
    if ((r.result as { win: boolean }).win) {
      expect(h.wave).toBe(1);
      expect(Object.values(h.hp).every((v) => v <= 1)).toBe(true);
      s = applyAction(s, { type: 'horde.retreat' }, { cfg, now: T0 + 2000 }).state;
    }
    expect(hordeState({ s, now: T0 }).active).toBe(false);
    expect(() => applyAction(s, { type: 'horde.start' }, { cfg, now: T0 + 3000 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'horde.start' }, { cfg, now: T0 + 86400000 })).not.toThrow();
  });

  it('Нашествие: после каждой 3-й волны — выбор благословения, без выбора дальше нельзя', () => {
    let s = strong();
    s = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
    // подставляем состояние после 3-й волны с предложением
    s.modes.horde = { ...s.modes.horde!, wave: 3, offer: ['fury', 'mend', 'greed'] };
    expect(() => applyAction(s, { type: 'horde.fight' }, { cfg, now: T0 + 1000 })).toThrow(GameError);
    const hurt = { ...s.modes.horde!.hp };
    const ids = Object.keys(hurt);
    hurt[ids[0]] = 0;
    hurt[ids[1]] = 0.4;
    s.modes.horde = { ...s.modes.horde!, hp: hurt };
    // «Передышка» — мгновенно: лечит живых и поднимает павших, в список благословений не попадает
    const m = applyAction(s, { type: 'horde.bless', index: 1 }, { cfg, now: T0 + 1000 }).state;
    expect(m.modes.horde!.hp[ids[0]]).toBeCloseTo(0.3);
    expect(m.modes.horde!.hp[ids[1]]).toBeCloseTo(0.9);
    expect(m.modes.horde!.blessings).toEqual([]);
    expect(m.modes.horde!.offer).toBeUndefined();
    // «Ярость» копится в бонусах забега и действует в бою
    const f = applyAction(s, { type: 'horde.bless', index: 0 }, { cfg, now: T0 + 1000 }).state;
    expect(hordeBonus(f.modes.horde!).stats.atkPct).toBeCloseTo(0.2);
    expect(() => applyAction(f, { type: 'horde.fight' }, { cfg, now: T0 + 2000 })).not.toThrow();
    // «Жадность» увеличивает золото за волну
    const g = applyAction(s, { type: 'horde.bless', index: 2 }, { cfg, now: T0 + 1000 }).state;
    expect(hordeBonus(g.modes.horde!).rewardPct).toBeCloseTo(0.5);
    expect(hordeWaveReward({ cfg, s: g }, 4, 0.5).cur.gold).toBeGreaterThan(hordeWaveReward({ cfg, s: g }, 4).cur.gold);
  });

  it('Нашествие: золото за волну — ровно как в подсказке (не в минутах дохода)', () => {
    let s = strong();
    s = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
    const r = applyAction(s, { type: 'horde.fight' }, { cfg, now: T0 + 1000 });
    const res = r.result as { win: boolean; reward: { cur: Record<string, number> } | null };
    if (res.win) {
      expect(res.reward!.cur.gold).toBe(hordeWaveReward({ cfg, s }, 1).cur.gold);
      expect(r.state.cur.gold - s.cur.gold).toBeLessThan(hordeWaveReward({ cfg, s }, 1).cur.gold * 3);
    }
  });

  it('Нашествие: благословение предлагается ровно после 3-й волны', () => {
    let s = strong();
    s = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
    s.modes.horde = { ...s.modes.horde!, wave: 2 };
    const r = applyAction(s, { type: 'horde.fight' }, { cfg, now: T0 + 1000 });
    if ((r.result as { win: boolean }).win && r.state.modes.horde!.active) expect(r.state.modes.horde!.offer).toHaveLength(3);
  });

  it('Башня: модификатор этажа и «Испытание» с двойной наградой', () => {
    let s = strong();
    s.modes.tower = 20;
    expect(towerMod(21)).toBeTruthy();
    expect(towerMod(30)).toBeNull();
    expect(towerReward(21, true).crystals).toBe(towerReward(21).crystals * 2);
    const easy = applyAction(s, { type: 'tower.fight' }, { cfg, now: T0 });
    const hard = applyAction(s, { type: 'tower.fight', hard: true }, { cfg, now: T0 });
    expect((hard.result as { hard: boolean }).hard).toBe(true);
    expect((easy.result as { mod: string }).mod).toBe(towerMod(21)!.id);
    if ((hard.result as { win: boolean }).win) expect(hard.state.cur.crystals - s.cur.crystals).toBe(towerReward(21, true).crystals);
  });

  it('Разлом: тактика меняет бой, неизвестная тактика — ошибка', () => {
    const s = strong();
    const plain = applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 }).result as { dmg: number; tactic: string };
    const assault = applyAction(s, { type: 'rift.fight', tactic: 'assault' }, { cfg, now: T0 }).result as { dmg: number; tactic: string };
    expect(plain.tactic).toBe('none');
    expect(assault.tactic).toBe('assault');
    expect(assault.dmg).not.toBe(plain.dmg);
    expect(() => applyAction(s, { type: 'rift.fight', tactic: 'cheat' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('Облики «Маскарада» за рубежи: 25-й этаж шпиля и рекорды Нашествия', () => {
    let s = strong();
    s.modes.spires = { dark: 24 };
    for (let i = 0; i < 3 && !s.skins.includes(SPIRE_SKINS.dark); i++) {
      const r = applyAction(s, { type: 'spire.fight', element: 'dark' }, { cfg, now: T0 + i });
      if ((r.result as { win: boolean }).win) {
        s = r.state;
        expect(s.skins).toContain(SPIRE_SKINS.dark);
      }
    }
    let h = strong();
    h = applyAction(h, { type: 'horde.start' }, { cfg, now: T0 }).state;
    h.modes.horde = { ...h.modes.horde!, wave: 40 };
    const r = applyAction(h, { type: 'horde.fight' }, { cfg, now: T0 + 1000 });
    if ((r.result as { win: boolean }).win) {
      expect(r.state.skins).toEqual(expect.arrayContaining([HORDE_SKIN_WAVES[20], HORDE_SKIN_WAVES[40]]));
      expect(r.state.skins).not.toContain(HORDE_SKIN_WAVES[60]);
    }
  });

  it('Сеты режимов: не куются, выпадают в Разломе и Нашествии', () => {
    let s = strong();
    s = applyAction(s, { type: 'dev.cur', cur: 'forgeMats', op: 'add', amount: 10000 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e12 }, { cfg, now: T0, dev: true }).state;
    expect(() => applyAction(s, { type: 'forge.craft', recipe: 'setLegendary', set: 'colossus' }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'forge.craft', recipe: 'setLegendary', set: 'nope' }, { cfg, now: T0 })).toThrow(GameError);
    expect(ENDGAME_SETS).not.toContain('colossus');
    expect(MODE_SET).toEqual({ rift: 'colossus', horde: 'warband', spires: 'prism', tower: 'harlequin' });
    // Разлом: ярус 4+ — часть «Доспеха Колосса»
    const r = applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 });
    const res = r.result as { tier: number; reward: { items?: string[] } };
    if (res.tier >= 4) {
      expect(res.reward.items).toHaveLength(1);
      expect(r.state.items[res.reward.items![0]].set).toBe('colossus');
    } else expect(res.reward.items).toBeUndefined();
    // Нашествие: 10-я волна — часть «Знамени Орды»
    let h = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
    h.modes.horde = { ...h.modes.horde!, wave: 9 };
    const w = applyAction(h, { type: 'horde.fight' }, { cfg, now: T0 + 1000 });
    const wr = w.result as { win: boolean; reward: { items?: string[] } | null };
    if (wr.win) expect(w.state.items[wr.reward!.items![0]].set).toBe('warband');
  });

  it('Подземелье дня: награда ×1.5', () => {
    const s = strong();
    const id = dungeonOfDay(T0);
    const base = dungeonReward({ cfg, s }, id, 5) as { cur?: Record<string, number>; gems?: { count: number } };
    const hot = dungeonReward({ cfg, s, now: T0 }, id, 5) as { cur?: Record<string, number>; gems?: { count: number } };
    const other = DUNGEONS.find((d) => d.id !== id)!.id;
    const v = (x: typeof base) => (x.cur ? Object.values(x.cur)[0] : x.gems!.count);
    expect(v(hot)).toBeGreaterThan(v(base));
    expect(dungeonReward({ cfg, s, now: T0 }, other, 5)).toEqual(dungeonReward({ cfg, s }, other, 5));
  });

  it('Удобство: «Забрать всё» в заданиях и экспедициях, «Зачистить все» подземелья', () => {
    const s = strong();
    for (const qd of DAILY_QUESTS.slice(0, 3)) s.quests.daily[qd.counter] = qd.target;
    const q = applyAction(s, { type: 'quest.claimAll' }, { cfg, now: T0 + 20000 });
    expect((q.result as { n: number }).n).toBeGreaterThanOrEqual(3);
    for (const qd of DAILY_QUESTS.slice(0, 3)) expect(q.state.quests.dailyClaimed).toContain(qd.id);
    expect(() => applyAction(q.state, { type: 'quest.claimAll' }, { cfg, now: T0 + 20000 })).toThrow(GameError);
    // подземелья: пройденный уровень есть — все ключи уходят за раз
    s.modes.dungeons = { gold: 3, xp: 2 };
    const d = applyAction(s, { type: 'dungeon.sweepAll' }, { cfg, now: T0 });
    expect((d.result as { times: number }).times).toBe(cfg.modes.dungeonKeys * 2);
    expect(() => applyAction(d.state, { type: 'dungeon.sweepAll' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('5 новых героинь в призыве, у каждой есть облик «Маскарада»', () => {
    const pool = Object.values(SUMMON_POOL).flat();
    for (const id of ['zarina', 'yuki', 'melusine', 'roxana', 'tamamo']) {
      expect(HEROINE_MAP[id]).toBeTruthy();
      expect(pool).toContain(id);
      expect(SKIN_MAP[`${id}_masq`]).toBeTruthy();
    }
  });
});

describe('артефакты', () => {
  const D = { cfg, now: T0, dev: true };
  function ready() {
    let s = fresh();
    s = { ...s, progress: { ...s.progress, maxGlobalEver: 40 } };
    s = applyAction(s, { type: 'dev.cur', cur: 'crystals', op: 'add', amount: 1e6 }, D).state;
    return s;
  }

  it('закрыты до этапа 25; бесплатный призыв раз в день; 10 призывов — 10 артефактов', () => {
    const f = fresh();
    expect(() => applyAction(f, { type: 'artifact.summon', count: 1 }, { cfg, now: T0 })).toThrow('locked');
    let s = ready();
    const c0 = s.cur.crystals;
    const free = applyAction(s, { type: 'artifact.summon', free: true }, { cfg, now: T0 });
    expect(free.state.cur.crystals).toBe(c0);
    expect(() => applyAction(free.state, { type: 'artifact.summon', free: true }, { cfg, now: T0 })).toThrow('usedToday');
    expect(() => applyAction(free.state, { type: 'artifact.summon', free: true }, { cfg, now: T0 + 86400000 })).not.toThrow();
    s = free.state;
    const ten = applyAction(s, { type: 'artifact.summon', count: 10 }, { cfg, now: T0 });
    expect((ten.result as { pulls: unknown[] }).pulls).toHaveLength(10);
    expect(ten.state.cur.crystals).toBeLessThanOrEqual(c0 - ARTIFACT_BANNER.cost10 + 10 * ARTIFACT_REFUND.UR);
    // первый артефакт сам встаёт в слот
    expect(ten.state.artifacts!.slots.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('гарантия UR, дубликаты повышают уровень до 5, дальше — кристаллы', () => {
    let s = ready();
    let ur = false;
    const lvls: Record<string, number> = {};
    let refunds = 0;
    for (let i = 0; i < 40 && !ur; i++) {
      const r = applyAction(s, { type: 'artifact.summon', count: 10 }, { cfg, now: T0 });
      s = r.state;
      for (const p of (r.result as { pulls: ArtifactPull[] }).pulls) {
        if (p.rarity === 'UR') ur = true;
        expect(p.lvl).toBe(Math.min(ARTIFACT_MAX, (lvls[p.id] ?? 0) + 1));
        if (p.refund) refunds++;
        lvls[p.id] = p.lvl;
      }
      expect(s.artifacts!.pityUR).toBeLessThan(ARTIFACT_BANNER.pityUR);
    }
    expect(ur).toBe(true);
    // много призывов: R-артефакты доходят до 5 и дальше дают кристаллы
    for (let i = 0; i < 12; i++) s = applyAction(s, { type: 'artifact.summon', count: 10 }, { cfg, now: T0 }).state;
    expect(Object.values(s.artifacts!.owned).every((l) => l >= 1 && l <= ARTIFACT_MAX)).toBe(true);
    expect(Object.values(s.artifacts!.owned).some((l) => l === ARTIFACT_MAX)).toBe(true);
    void refunds;
  });

  it('слоты: 2, с 40-го уровня аккаунта — 3; артефакт один на отряд; чужой не поставить', () => {
    let s = ready();
    for (let i = 0; i < 5; i++) s = applyAction(s, { type: 'artifact.summon', count: 10 }, { cfg, now: T0 }).state;
    const [a, b] = Object.keys(s.artifacts!.owned);
    s = applyAction(s, { type: 'artifact.equip', slot: 0, id: a }, { cfg, now: T0 }).state;
    s = applyAction(s, { type: 'artifact.equip', slot: 1, id: a }, { cfg, now: T0 }).state;
    expect(s.artifacts!.slots.slice(0, 2)).toEqual([null, a]);
    s = applyAction(s, { type: 'artifact.equip', slot: 0, id: b }, { cfg, now: T0 }).state;
    expect(activeArtifacts(s).map((x) => x.id).sort()).toEqual([a, b].sort());
    expect(() => applyAction(s, { type: 'artifact.equip', slot: 2, id: a }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'artifact.equip', slot: 0, id: 'nope' }, { cfg, now: T0 })).toThrow(GameError);
    const hi = { ...s, account: { ...s.account, lvl: ARTIFACT_SLOT3_LVL } };
    expect(() => applyAction(hi, { type: 'artifact.equip', slot: 2, id: a }, { cfg, now: T0 })).not.toThrow();
    s = applyAction(s, { type: 'artifact.equip', slot: 1, id: null }, { cfg, now: T0 }).state;
    expect(activeArtifacts(s).map((x) => x.id)).toEqual([b]);
  });

  it('механики срабатывают в бою; без артефактов бой прежний; бой детерминирован', () => {
    let s = fresh();
    for (const id of ['lira', 'astrid', 'seyra', 'keira']) s = applyAction(s, { type: 'dev.hero', id, lvl: 20 }, D).state;
    s = { ...s, party: { ...s.party, presets: [['lira', 'astrid', 'seyra', 'keira', null, null], ...s.party.presets.slice(1)] } };
    const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, 30))];
    const base = simulateBattle(cfg, { seed: 7, units, timeLimit: 60 });
    expect(simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: [] }).events).toEqual(base.events);
    const mechs = (arts: { id: string; lvl: number }[]) => {
      const r = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: arts });
      expect(simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: arts }).events).toEqual(r.events);
      return new Set(r.events.filter((e) => e.k === 'mech').map((e) => (e as { m: string }).m));
    };
    const all = ARTIFACTS.map((a) => ({ id: a.id, lvl: 3 }));
    const seen = mechs(all);
    for (const id of ['ember_charm', 'thunder_bell', 'hunter_mark', 'omen_ward', 'time_chain']) expect(seen.has(`artifact:${id}`)).toBe(true);
    // барабан: энергия на старте
    const start = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: [{ id: 'war_drum', lvl: 5 }] }).events[0] as { units: { side: number; energy: number }[] };
    expect(start.units.filter((u) => u.side === 0).every((u) => u.energy >= artifactValue('war_drum', 5))).toBe(true);
    // призма усиливает урон: бой не дольше
    const prism = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: [{ id: 'aether_prism', lvl: 5 }] });
    if (base.win && prism.win) expect(prism.time).toBeLessThanOrEqual(base.time);
  });

  it('пепел феникса и рог валькирии спасают отряд в тяжёлом бою', () => {
    let s = fresh();
    for (const id of ['lira', 'astrid']) s = applyAction(s, { type: 'dev.hero', id, lvl: 5 }, D).state;
    s = { ...s, party: { ...s.party, presets: [['lira', 'astrid', null, null, null, null], ...s.party.presets.slice(1)] } };
    const units = [...heroUnits(cfg, s, s.party.presets[0]), ...bossUnits(cfg, stageRef(0, 30))];
    const r = simulateBattle(cfg, { seed: 3, units, timeLimit: 60, artifacts: [{ id: 'phoenix_ash', lvl: 1 }, { id: 'valkyrie_horn', lvl: 1 }] });
    const ms = r.events.filter((e) => e.k === 'mech').map((e) => (e as { m: string }).m);
    expect(ms).toContain('artifact:valkyrie_horn');
    expect(ms).toContain('artifact:phoenix_ash');
    expect(ms.filter((m) => m === 'artifact:phoenix_ash')).toHaveLength(1);
  });

  it('текст силы: проценты, секунды, числа', () => {
    expect(artifactText('dew_flask', 1, 'ru')).toContain('5%');
    expect(artifactText('time_chain', 5, 'en')).toContain('1.2 s');
    expect(artifactText('war_drum', 2, 'ru')).toContain('11');
    expect(artifactSlots(1)).toBe(2);
    expect(artifactSlots(ARTIFACT_SLOT3_LVL)).toBe(3);
  });
});
