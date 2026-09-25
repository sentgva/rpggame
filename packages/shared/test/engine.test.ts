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
  artStyleOf,
  VECTOR_ART,
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

  it('коллекции: 20 летних и 20 бельевых, эксклюзивов мало, все продаются за кристаллы', () => {
    expect(setSkins.filter((x) => x.set === 'summer')).toHaveLength(20);
    expect(setSkins.filter((x) => x.set === 'lingerie')).toHaveLength(20);
    const exclusive = setSkins.filter((x) => x.source === 'shop');
    expect(exclusive.length).toBeGreaterThan(0);
    expect(exclusive.length).toBeLessThanOrEqual(10);
    for (const sk of setSkins) expect(SHOP_OFFERS.some((o) => o.shop === 'skins' && o.give.skin === sk.id)).toBe(true);
    expect(new Set(SKINS.map((x) => x.id)).size).toBe(SKINS.length);
  });

  it('у каждого облика есть рабочий источник', () => {
    for (const sk of setSkins) {
      if (sk.source === 'arena' || sk.source === 'labyrinth' || sk.source === 'event')
        expect(SHOP_OFFERS.some((o) => o.shop === sk.source && o.give.skin === sk.id)).toBe(true);
      if (sk.source === 'tower') expect(Object.values(TOWER_SKIN_FLOORS)).toContain(sk.id);
    }
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
});
