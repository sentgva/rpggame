import { describe, expect, it } from 'vitest';
import {
  PHOTO_DAILY,
  PHOTO_ALBUM_MAX,
  FISH,
  FISH_DAILY,
  FISH_MAP,
  FISH_COLLECTION,
  ABYSS_PACTS,
  ABYSS_HEAT_MILESTONES,
  abyssOmen,
  abyssReward,
  EXPEDITION_EVENTS,
  VOLLEY_DAILY,
  VOLLEY_POINTS,
  VOLLEY_RUNGS,
  volleyTeam,
  volleyRival,
  isSwimwear,
  photoTaste,
  photoScore,
  photoOutfitFits,
  DEFAULT_CONFIG as cfg,
  GameError,
  applyAction,
  bossUnits,
  createPlayer,
  migrate,
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
  PASS_LEVELS,
  passSkins,
  passReward,
  COLOSSI,
  ELEMENTS,
  riftElement,
  riftTier,
  spireOpen,
  riftState,
  riftBoss,
  hordeState,
  spireParty,
  spireReward,
  HEROINES,
  HEROINE_MAP,
  ROSTER,
  STARTER_HEROINES,
  CLASSES,
  CLASS_IDS,
  COMBOS,
  COMBO,
  COMBO_MASTERY,
  comboMastery,
  comboMasteryOf,
  SIG_HOLD,
  activeParty,
  rankCost,
  sigRank,
  ENCOUNTER_MAP,
  encounterOffer,
  bondState,
  bondTraits,
  bondTopic,
  BOND_HEROES,
  BOND_SPA_SKIN,
  BOND_SLEEP_SKIN,
  ARTIFACTS,
  ARTIFACT_MAX,
  ARTIFACT_SLOT3_LVL,
  ARTIFACT_TIER_STAGE,
  activeArtifacts,
  artifactCost,
  artifactOpen,
  artifactSlots,
  artifactText,
  artifactValue,
  BATH_GAIN,
  ROOM_BONUS,
  ROOM_MAX,
  SLEEP_GAIN,
  CHANGELOG,
  CHANGELOG_LATEST,
  buildHeroine,
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
  FESTIVALS,
  FESTIVAL_DAYS,
  FESTIVAL_EPOCH,
  FESTIVAL_SKILLS,
  FEST_GOALS,
  FEST_MILESTONES,
  FEST_STAGES,
  FEST_STAR_POINTS,
  FEST_TASKS_FEST,
  FEST_TASK_MAP,
  FEST_TASK_REWARD,
  FEST_TICKETS,
  SKILL_MAP,
  dayKey,
  festBoss,
  festBossReward,
  festBought,
  festClaimable,
  festDailyTasks,
  festFirstReward,
  festGoalValue,
  festShopNow,
  festStageEnemies,
  festStageLevel,
  festivalAt,
  festivalState,
  festivalNext,
  festivalUpcoming,
  scheduleAuto,
  schedulePlan,
  scheduleRemove,
  scheduleSetEnd,
  scheduleStart,
  scheduleStop,
  skinFestival,
  type FestivalSchedule,
  ELITE_AFFIX_MAP,
  FEST_TASKS_KIND,
  MINE_DAILY,
  MINE_START,
  MINE_START_IDX,
  MINE_W,
  festGoalsFor,
  mineBoard,
  mineNeedsFight,
  mineOf,
  mineVisible,
  stageAffixes,
  withAffixes,
  CAMPFIRE,
  CAMP_BOND,
  CAMP_MASTERY,
  campCombos,
  campfireScene,
  campfireState,
  type BattleEvent,
  type PlayerState,
  FESTIVAL_ONLY_SKINS,
  MALE_WEAR,
  PASS_SKIN_POOL,
  PASS_SKIN_LEVELS,
  STATE_VERSION,
  adjutantState,
  adjutantSkins,
  ADJ_PATS,
  ADJ_PAT_BOND,
  fashionOfDay,
  fashionFits,
  FASHION_BONUS,
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

  it('потолок уровня зависит от ранга', () => {
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
    const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 5))];
    const a = simulateBattle(cfg, { seed: 12345, units, timeLimit: 60 });
    const b = simulateBattle(cfg, { seed: 12345, units, timeLimit: 60 });
    expect(stateHash(a.events)).toBe(stateHash(b.events));
    expect(a.win).toBe(b.win);
    const c = simulateBattle(cfg, { seed: 999, units, timeLimit: 60 });
    expect(stateHash(c.events)).not.toBe(stateHash(a.events));
  });

  it('тихий режим сервера даёт тот же исход', () => {
    const s = fresh();
    const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 3))];
    const loud = simulateBattle(cfg, { seed: 7, units, timeLimit: 60 });
    const quiet = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, quiet: true });
    expect(quiet.win).toBe(loud.win);
    expect(quiet.time).toBe(loud.time);
    expect(quiet.events.length).toBe(0);
  });

  it('таймер боя с боссом — 60 секунд', () => {
    const s = fresh();
    const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 200))];
    const r = simulateBattle(cfg, { seed: 1, units, timeLimit: 60 });
    expect(r.win).toBe(false);
    expect(r.time).toBeLessThanOrEqual(60000);
  });

  it('все механики боссов актов отрабатывают без ошибок', () => {
    const s = fresh();
    for (let act = 1; act <= 10; act++) {
      const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, act * 20))];
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
    const base = BASE_ITEMS.find((b) => b.slot === 'weapon' && canWear('warlock', b))!.id;
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

  it('«Снять всё» снимает все вещи, а предметы остаются в инвентаре', () => {
    let s = fresh();
    for (const slot of ['weapon', 'armor', 'ring'] as const) {
      const g = applyAction(s, { type: 'dev.item', slot, rarity: 2, lvl: 10 }, { cfg, now: T0, dev: true });
      s = g.state;
    }
    s = applyAction(s, { type: 'item.autoEquip', hero: 'lira' }, { cfg, now: T0 }).state;
    const worn = Object.values(s.heroines.lira.gear).filter(Boolean) as string[];
    expect(worn.length).toBeGreaterThan(0);
    const r = applyAction(s, { type: 'item.unequipAll', hero: 'lira' }, { cfg, now: T0 });
    expect(r.result).toEqual({ removed: worn.length });
    expect(Object.values(r.state.heroines.lira.gear).filter(Boolean)).toHaveLength(0);
    for (const uid of worn) expect(r.state.items[uid]).toBeTruthy();
    expect(() => applyAction(s, { type: 'item.unequipAll', hero: 'nobody' }, { cfg, now: T0 })).toThrow('noHero');
  });
});

describe('Легион из шести', () => {
  const D = { cfg, now: T0, dev: true };

  it('шесть героинь — шесть разных классов; старт — Рыцарь и Колдунья', () => {
    expect(ROSTER).toHaveLength(6);
    expect(new Set(HEROINES.map((h) => h.cls))).toEqual(new Set(CLASS_IDS));
    expect(CLASS_IDS.sort()).toEqual(['assassin', 'hunter', 'knight', 'priestess', 'ranger', 'warlock']);
    expect(STARTER_HEROINES.sort()).toEqual(['cassian', 'lira']);
    const s = fresh();
    expect(Object.keys(s.heroines).sort()).toEqual(['cassian', 'lira']);
    expect(activeParty(s)).toEqual(ROSTER.filter((id) => s.heroines[id]));
    // у каждого класса своё оружие, фирменное умение, ульта и две специализации
    for (const id of CLASS_IDS) {
      const c = CLASSES[id];
      expect(SKILL_MAP[c.basic]).toBeDefined();
      expect(SKILL_MAP[c.sig]?.kind).toBe('active');
      expect(SKILL_MAP[c.ult]?.kind).toBe('ult');
      for (const sp of c.specs) expect(SKILL_MAP[sp.ult]?.kind).toBe('ult');
    }
    expect(new Set(CLASS_IDS.map((id) => CLASSES[id].weapon)).size).toBe(6);
    // фигуры без откровенных нарядов: у базовых героинь нет купальников
    for (const h of HEROINES) expect(isSwimwear(h.look.wear)).toBe(false);
  });

  it('гачи нет: призыва, найма и пресетов отряда не существует', () => {
    const s = fresh();
    for (const type of ['summon', 'summon.free', 'hero.recruit', 'party.set', 'party.use', 'hero.star', 'artifact.summon'])
      expect(() => applyAction(s, { type, count: 1, pay: 'crystals', id: 'lira' }, { cfg, now: T0 })).toThrow('unknownAction');
    expect('shards' in s).toBe(false);
    expect('party' in s).toBe(false);
  });

  it('героини присоединяются по ходу кампании и здороваются', () => {
    let s = fresh();
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 3 }, D).state;
    s = { ...s, progress: { ...s.progress, wave: 3 }, dev: { ...s.dev, oneShot: true } };
    const r = applyAction(s, { type: 'battle.boss' }, D);
    expect(r.result.win).toBe(true);
    const next = HEROINES.filter((h) => h.join > 0 && h.join <= 3).map((h) => h.id);
    expect(next.length).toBeGreaterThan(0);
    expect(r.result.joined).toEqual(next);
    for (const id of next) expect(r.state.heroines[id]).toMatchObject({ lvl: 1, stars: 1 });
    expect(r.events.some((e) => e.name === 'hero_join')).toBe(true);
    for (const h of HEROINES) expect(h.hello.ru.length).toBeGreaterThan(10);
    // вся шестёрка — к 15-му этапу
    expect(Math.max(...HEROINES.map((h) => h.join))).toBeLessThanOrEqual(15);
  });

  it('ранги: Эмблемы и золото; открываются с 10-го этапа; выше 6-го нельзя; пробуждение — на 6-м', () => {
    let s = fresh();
    expect(() => applyAction(s, { type: 'hero.rank', id: 'cassian' }, { cfg, now: T0 })).toThrow('locked');
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 11 }, D).state;
    expect(() => applyAction(s, { type: 'hero.rank', id: 'cassian' }, { cfg, now: T0 })).toThrow('notEnough');
    s = applyAction(s, { type: 'dev.cur', cur: 'emblems', op: 'set', amount: 10000 }, D).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'set', amount: 1e12 }, D).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'crystals', op: 'set', amount: 1e6 }, D).state;
    const cost = rankCost(cfg, s.heroines.cassian)!;
    expect(cost).toEqual({ emblems: cfg.hero.rankEmblems[0], goldMin: cfg.hero.rankGold[0] });
    const before = buildHeroine(cfg, s, s.heroines.cassian).power;
    const r = applyAction(s, { type: 'hero.rank', id: 'cassian' }, { cfg, now: T0 });
    expect(r.state.heroines.cassian.stars).toBe(2);
    expect(r.state.cur.emblems).toBe(10000 - cost.emblems);
    expect(r.state.cur.gold).toBeLessThan(1e12);
    expect(levelCap(cfg, r.state.heroines.cassian)).toBe(cfg.hero.levelCaps[1]);
    expect(buildHeroine(cfg, r.state, r.state.heroines.cassian).power).toBeGreaterThan(before);
    s = r.state;
    expect(() => applyAction(s, { type: 'hero.awaken', id: 'cassian' }, { cfg, now: T0 })).toThrow('cannotAwaken');
    for (let i = 2; i < cfg.hero.maxRank; i++) s = applyAction(s, { type: 'hero.rank', id: 'cassian' }, { cfg, now: T0 }).state;
    expect(s.heroines.cassian.stars).toBe(cfg.hero.maxRank);
    expect(rankCost(cfg, s.heroines.cassian)).toBeNull();
    expect(() => applyAction(s, { type: 'hero.rank', id: 'cassian' }, { cfg, now: T0 })).toThrow('maxRank');
    const e0 = s.cur.emblems;
    s = applyAction(s, { type: 'hero.awaken', id: 'cassian' }, { cfg, now: T0 }).state;
    expect(s.heroines.cassian.awakened).toBe(true);
    expect(e0 - s.cur.emblems).toBe(cfg.hero.awakenEmblems);
    expect(levelCap(cfg, s.heroines.cassian)).toBe(cfg.hero.awakenCap);
    expect(() => applyAction(s, { type: 'hero.rank', id: 'nobody' }, { cfg, now: T0 })).toThrow('noHero');
  });

  it('фирменное умение класса всегда в бою, его ранг растёт с уровнем', () => {
    const s = fresh();
    for (const id of Object.keys(s.heroines)) {
      const b = buildHeroine(cfg, s, s.heroines[id]);
      expect(b.skills[0].id).toBe(CLASSES[HEROINE_MAP[id].cls].sig);
    }
    expect(sigRank({ lvl: 1 })).toBe(1);
    expect(sigRank({ lvl: 50 })).toBe(3);
    expect(sigRank({ lvl: 200 })).toBe(5);
  });

  it('новичку — Эмблемы в приветственном письме; старые сохранения эпохи гачи начинаются заново', () => {
    const s = fresh();
    expect(s.mail[0].rewards?.cur?.emblems).toBeGreaterThanOrEqual(cfg.hero.rankEmblems[0]);
    const old = { ...s, v: 1, heroines: { coral: { id: 'coral', lvl: 90, stars: 5, tree: {}, skills: [null, null], gear: {} } } } as PlayerState;
    const m = migrate(cfg, old, T0 + 1000);
    expect(Object.keys(m.heroines).sort()).toEqual(['cassian', 'lira']);
    expect(m.v).toBe(s.v);
    // текущая версия дополняется без сброса
    const cur = migrate(cfg, { ...s, cur: { ...s.cur, gold: 777 } }, T0 + 1000);
    expect(cur.cur.gold).toBe(777);
  });

  it('v2 → v3: Астрид и Сейра становятся Кассианом и Элианом — прогресс, облики и сцены костра сохраняются', () => {
    const s = fresh();
    const lvl = s.heroines.cassian.lvl + 7;
    const json = JSON.stringify({ ...s, heroines: { ...s.heroines, cassian: { ...s.heroines.cassian, lvl } }, skins: ['cassian_summer'], campfire: { day: '2026-09-30', done: true, seen: ['cassian_lira', 'lira_elian'] } })
      .replace(/cassian/g, 'astrid')
      .replace(/elian/g, 'seyra');
    const old = { ...(JSON.parse(json) as PlayerState), v: 2 };
    expect(old.heroines.astrid).toBeDefined();
    const m = migrate(cfg, old, T0 + 1000);
    expect(m.v).toBe(STATE_VERSION);
    expect(m.heroines.cassian.lvl).toBe(lvl);
    expect(m.heroines.cassian.id).toBe('cassian');
    expect((m.heroines as Record<string, unknown>).astrid).toBeUndefined();
    expect(m.skins).toEqual(['cassian_summer']);
    expect(m.campfire?.seen).toEqual(['cassian_lira', 'lira_elian']);
    expect(HEROINE_MAP.cassian.look.male && HEROINE_MAP.elian.look.male).toBe(true);
  });

  it('экспедиции берут героинь из отряда (они не покидают бой), но одна героиня — в одной экспедиции', () => {
    let s = applyAction(fresh(), { type: 'dev.progress', diff: 0, idx: 20 }, D).state;
    s = { ...s, modes: { ...s.modes, expeditionBoard: { day: dayKey(T0), quests: ['patrol', 'escort'] } } };
    s = applyAction(s, { type: 'expedition.start', quest: 'patrol', heroes: ['cassian'] }, { cfg, now: T0 }).state;
    expect(s.modes.expeditions).toHaveLength(1);
    expect(activeParty(s)).toContain('cassian');
    expect(() => applyAction(s, { type: 'expedition.start', quest: 'escort', heroes: ['cassian', 'lira'] }, { cfg, now: T0 })).toThrow('onExpedition');
  });
});

describe('связки классов и ручное управление', () => {
  const D = { cfg, now: T0, dev: true };
  function legion(lvl = 40) {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl, stars: 3 }, D).state;
    return s;
  }
  const fight = (s: PlayerState, seed: number, extra: Partial<Parameters<typeof simulateBattle>[1]> = {}) =>
    simulateBattle(cfg, { seed, units: [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 40))], timeLimit: 60, ...extra });

  it('метки одной героини усиливают удар другой: связки случаются сами, счётчик совпадает', () => {
    const s = legion();
    const seen = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const r = fight(s, seed);
      const combos = r.events.filter((e): e is Extract<BattleEvent, { k: 'combo' }> => e.k === 'combo');
      const heroes = new Set(r.units.filter((u) => u.side === 0).map((u) => u.uid));
      expect(r.combos).toBe(combos.filter((c) => heroes.has(c.u)).length);
      for (const c of combos) seen.add(c.c);
    }
    for (const id of ['backstab', 'crush', 'detonate', 'hunt']) expect(seen.has(id)).toBe(true);
    for (const c of COMBOS) {
      expect(CLASSES[c.from]).toBeDefined();
      for (const to of c.to) expect(CLASSES[to]).toBeDefined();
    }
  });

  it('удар в спину по ошеломлённому — всегда крит', () => {
    const s = legion();
    let checked = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const ev = fight(s, seed).events;
      ev.forEach((e, i) => {
        if (e.k !== 'combo' || e.c !== 'backstab') return;
        const hit = ev.slice(i + 1).find((x) => x.k === 'dmg' && x.u === e.u && x.tg === e.tg && !x.dot);
        if (hit && hit.k === 'dmg' && !hit.miss) {
          expect(hit.crit).toBe(1);
          checked++;
        }
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('без Рыцаря нет ошеломления — и нет удара в спину', () => {
    let s = legion();
    const { cassian, ...rest } = s.heroines;
    void cassian;
    s = { ...s, heroines: rest };
    for (let seed = 1; seed <= 4; seed++) expect(fight(s, seed).events.some((e) => e.k === 'combo' && e.c === 'backstab')).toBe(false);
  });

  it('волк Охотницы встаёт рядом с начала боя; вожак стаи усиливает волков', () => {
    const s = legion();
    const r = fight(s, 3);
    const wolves = r.events.filter((e): e is Extract<BattleEvent, { k: 'summon' }> => e.k === 'summon' && e.unit.ref === 'wolf');
    expect(wolves.some((e) => e.t === 0 && e.unit.side === 0)).toBe(true);
    const hunter = heroUnits(cfg, s, ['ulfa'])[0];
    expect(hunter.fx.some((f) => f.id === 'companion')).toBe(true);
    const lead = { ...hunter, fx: [...hunter.fx, { id: 'packLeader', v: 0.5 }] };
    const hp = (u: typeof hunter) =>
      (simulateBattle(cfg, { seed: 1, units: [u, ...bossUnits(cfg, stageRef(0, 5))], timeLimit: 5 }).events.find((e) => e.k === 'summon') as Extract<BattleEvent, { k: 'summon' }>).unit.maxHp;
    expect(hp(lead)).toBeGreaterThan(hp(hunter));
  });

  it('ручной режим: фирменное умение ждёт команды (не дольше SIG_HOLD), команда выпускает его раньше', () => {
    const s = legion();
    const base = fight(s, 5, { manual: true, inputs: [] }).events;
    const sig = base.filter((e): e is Extract<BattleEvent, { k: 'sig' }> => e.k === 'sig');
    const hero = sig[0].u;
    const ready = sig.find((e) => e.u === hero && e.r === 1)!;
    const used = sig.find((e) => e.u === hero && e.r === 0 && e.t > ready.t)!;
    expect(used.t - ready.t).toBeGreaterThanOrEqual(SIG_HOLD);
    const cmd = fight(s, 5, { manual: true, inputs: [{ t: ready.t + 1, u: hero, s: 1 }] }).events;
    const used2 = cmd.find((e) => e.k === 'sig' && e.u === hero && e.r === 0 && e.t > ready.t)!;
    expect(used2.t).toBeLessThan(used.t);
    // до команды бой тот же
    const before = (l: BattleEvent[]) => JSON.stringify(l.filter((e) => e.t <= ready.t));
    expect(before(cmd)).toBe(before(base));
    // авто-режим: ждать не нужно
    const auto = fight(s, 5).events;
    const r2 = auto.find((e) => e.k === 'sig' && e.u === hero && e.r === 1)!;
    const u2 = auto.find((e) => e.k === 'sig' && e.u === hero && e.r === 0 && e.t > r2.t)!;
    expect(u2.t - r2.t).toBeLessThan(SIG_HOLD);
  });

  it('мастерство связок: растёт от сыгранных связок и усиливает их', () => {
    expect(comboMastery(0).lvl).toBe(0);
    expect(comboMastery(COMBO_MASTERY[0]).lvl).toBe(1);
    expect(comboMastery(1e9).lvl).toBe(COMBO_MASTERY.length);
    const s = legion();
    const all = Object.fromEntries(COMBOS.map((c) => [c.id, 10]));
    const dmg = (r: ReturnType<typeof fight>) => Object.entries(r.dmgDone).reduce((a, [uid, v]) => (r.units[Number(uid)]?.side === 0 ? a + v : a), 0);
    const base = fight(s, 2, { timeLimit: 8 });
    const pro = fight(s, 2, { timeLimit: 8, mastery: all });
    expect(dmg(pro)).toBeGreaterThan(dmg(base));
    // счётчики связок копятся по видам и превращаются в уровни мастерства
    let p = applyAction(s, { type: 'dev.progress', diff: 0, idx: 30 }, D).state;
    p = { ...p, progress: { ...p.progress, wave: 3 }, counters: { ...p.counters, 'combo:backstab': COMBO_MASTERY[2] } };
    expect(comboMasteryOf(p).backstab).toBe(3);
    const r = applyAction(p, { type: 'battle.boss' }, { cfg, now: T0 + 1000 });
    expect(r.state.counters['combo:backstab']).toBeGreaterThanOrEqual(COMBO_MASTERY[2]);
  });

  it('связки считаются в заданиях; команда с кривым s отклоняется', () => {
    let s = legion();
    s = applyAction(s, { type: 'dev.progress', diff: 0, idx: 30 }, D).state;
    s = { ...s, progress: { ...s.progress, wave: 3 } };
    const r = applyAction(s, { type: 'battle.boss' }, { cfg, now: T0 + 1000 });
    expect(r.result.battle.combos).toBeGreaterThan(0);
    expect(r.state.quests.daily.combo).toBe(r.result.battle.combos);
    expect(r.state.counters.combo).toBe(r.result.battle.combos);
    expect(() => applyAction(s, { type: 'battle.boss', manual: true, inputs: [{ t: 1, u: 0, s: 2 }] }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'battle.boss', manual: true, inputs: [{ t: 1, u: 0, s: 1 }] }, { cfg, now: T0 })).not.toThrow();
    expect(COMBO.backstab).toBeGreaterThan(0);
  });
});

describe('ручные ульты и Сокрушительный удар', () => {
  function bossState(lvl = 20) {
    let s = fresh();
    // тройка героинь: бой с боссом длится дольше первого каста
    for (const id of ['cassian', 'lira', 'mirabel']) s = applyAction(s, { type: 'dev.hero', id, lvl }, { cfg, now: T0, dev: true }).state;
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
    expect(() => boss(s, { manual: true, inputs: Array.from({ length: 250 }, () => ({ t: 1, u: 0 })) })).toThrow(GameError);
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
    expect(r2.state.cur.emblems).toBe(s.cur.emblems + 6);
    expect(r2.state.cur.crystals).toBe(s.cur.crystals - 150);
    const r3 = applyAction(at(s, 'traveler'), { type: 'encounter.resolve', choice: 'help' }, { cfg, now: T0 + 2000 });
    expect(r3.state.cur.emblems).toBe(s.cur.emblems + 2);
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
  // Мирабель присоединяется по ходу кампании — в тестах её выдаём сразу
  function withHero() {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'mirabel', lvl: 10 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e9 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'crystals', op: 'add', amount: 100000 }, { cfg, now: T0, dev: true }).state;
    return s;
  }

  it('общение — со всей шестёркой; купальник для источников скрытый и в бою не носится', () => {
    expect(BOND_HEROES.sort()).toEqual([...ROSTER].sort());
    for (const id of BOND_HEROES) {
      const skin = BOND_SPA_SKIN[id];
      expect(SKIN_MAP[skin]?.hero).toBe(id);
      expect(isSwimwear(SKIN_MAP[skin].look.wear)).toBe(true);
      expect(SKINS.some((x) => x.id === skin)).toBe(false);
    }
    let s = withHero();
    expect(() => applyAction(s, { type: 'hero.skin', id: 'mirabel', skin: BOND_SPA_SKIN.mirabel }, { cfg, now: T0 })).toThrow('noSkin');
    s = applyAction(s, { type: 'bond.spa', hero: 'mirabel' }, { cfg, now: T0 }).state;
    expect(s.heroines.mirabel.skin).toBeUndefined();
  });

  const A = (s: PlayerState, a: Record<string, unknown>, now = T0 + 1000) => applyAction(s, { type: 'x', ...a } as never, { cfg, now });

  it('только свои героини; дневные лимиты; новый день — снова можно', () => {
    let s = withHero();
    expect(() => A(s, { type: 'bond.spa', hero: 'keira' })).toThrow(GameError); // ещё не в Легионе
    expect(() => A(s, { type: 'bond.spa', hero: 'nobody' })).toThrow(GameError);
    expect(() => A(s, { type: 'bond.talk', hero: 'lira', answer: 0 })).not.toThrow(); // стартовая героиня — тоже
    for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).state;
    expect(() => A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 })).toThrow(GameError);
    s = A(s, { type: 'bond.spa', hero: 'mirabel' }).state;
    expect(() => A(s, { type: 'bond.spa', hero: 'mirabel' })).toThrow(GameError);
    // свидания — с 3-го уровня
    expect(() => A(s, { type: 'bond.date', hero: 'mirabel', place: 'lake' })).toThrow(GameError);
    expect(bondState({ s, now: T0 + 86400000 }, 'mirabel').talk).toBe(0);
    expect(() => A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }, T0 + 86400000)).not.toThrow();
  });

  it('ответы и угощения: любимое даёт больше; уровни, награды (Эмблемы) и бонус к статам', () => {
    let s = withHero();
    const best = A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number };
    const bad = A(s, { type: 'bond.talk', hero: 'mirabel', answer: 2 }).result as { xp: number };
    expect(best.xp).toBeGreaterThan(bad.xp);
    const t = bondTraits('mirabel');
    const fav = A(s, { type: 'bond.treat', hero: 'mirabel', treat: t.treat }).result as { like: number; xp: number };
    const dis = A(s, { type: 'bond.treat', hero: 'mirabel', treat: t.dislike }).result as { like: number; xp: number };
    expect(fav.like).toBe(0);
    expect(fav.xp).toBeGreaterThan(dis.xp);
    const before = buildHeroine(cfg, s, s.heroines.mirabel).power;
    const e0 = s.cur.emblems;
    for (let d = 0; d < 40 && (s.bond?.mirabel?.lvl ?? 0) < 10; d++) {
      const now = T0 + d * 86400000 + 1000;
      for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }, now).state;
      for (let i = 0; i < 3; i++) s = A(s, { type: 'bond.treat', hero: 'mirabel', treat: t.treat }, now).state;
      s = A(s, { type: 'bond.spa', hero: 'mirabel' }, now).state;
      if ((s.bond?.mirabel?.lvl ?? 0) >= 3) s = A(s, { type: 'bond.date', hero: 'mirabel', place: t.place }, now).state;
    }
    expect(s.bond!.mirabel.lvl).toBe(10);
    expect(s.cur.emblems).toBeGreaterThan(e0 + 40);
    expect(buildHeroine(cfg, s, s.heroines.mirabel).power).toBeGreaterThan(before * 1.15);
    // наряд близости — только за 10 Сердец Эфира
    expect(() => A(s, { type: 'bond.costume', hero: 'mirabel' })).toThrow(GameError);
    s = { ...s, bondHearts: 10 };
    const c = A(s, { type: 'bond.costume', hero: 'mirabel' });
    expect(c.state.skins).toContain('mirabel_bond');
    expect(c.state.bondHearts).toBe(0);
    expect(SKIN_MAP.mirabel_bond.set).toBe('bond');
    expect(isSwimwear(SKIN_MAP.mirabel_bond.look.wear)).toBe(false);
  });

  it('резиденция: комнаты строятся и улучшаются до 5; гостиная усиливает разговоры', () => {
    let s = withHero();
    const plain = (A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number }).xp;
    const gold0 = s.cur.gold;
    for (let i = 0; i < ROOM_MAX; i++) s = A(s, { type: 'home.build', room: 'living' }).state;
    expect(s.home!.rooms.living).toBe(ROOM_MAX);
    expect(s.cur.gold).toBeLessThan(gold0);
    expect(() => A(s, { type: 'home.build', room: 'living' })).toThrow('maxLevel');
    expect(() => A(s, { type: 'home.build', room: 'attic' })).toThrow(GameError);
    const boosted = (A(s, { type: 'bond.talk', hero: 'mirabel', answer: 0 }).result as { xp: number }).xp;
    expect(boosted).toBe(Math.round(plain * (1 + ROOM_BONUS * ROOM_MAX)));
  });

  it('ванна — только с ванной комнатой и раз в день', () => {
    let s = withHero();
    expect(() => A(s, { type: 'bond.bath', hero: 'mirabel' })).toThrow('locked');
    s = A(s, { type: 'home.build', room: 'bath' }).state;
    const r = A(s, { type: 'bond.bath', hero: 'mirabel' });
    expect((r.result as { xp: number }).xp).toBe(BATH_GAIN.base + BATH_GAIN.perLvl);
    s = r.state;
    expect(() => A(s, { type: 'bond.bath', hero: 'mirabel' })).toThrow('usedToday');
    expect(() => A(s, { type: 'bond.bath', hero: 'mirabel' }, T0 + 86400000)).not.toThrow();
  });

  it('ночёвка: спальня, близость 5, одна героиня за ночь; утром — подарок', () => {
    let s = withHero();
    expect(() => A(s, { type: 'bond.sleep', hero: 'mirabel' })).toThrow('locked'); // нет спальни
    s = A(s, { type: 'home.build', room: 'bedroom' }).state;
    expect(() => A(s, { type: 'bond.sleep', hero: 'mirabel' })).toThrow('locked'); // близость мала
    s = { ...s, bond: { mirabel: { lvl: 5, xp: 0, day: 'x', talk: 0, treat: 0, spa: false, date: false }, lira: { lvl: 6, xp: 0, day: 'x', talk: 0, treat: 0, spa: false, date: false } } };
    const gold0 = s.cur.gold;
    const r = A(s, { type: 'bond.sleep', hero: 'mirabel' });
    const res = r.result as { xp: number; gift: { gold: number; xp: number } };
    expect(res.xp).toBe(SLEEP_GAIN.base + SLEEP_GAIN.perLvl);
    expect(res.gift.gold).toBeGreaterThan(0);
    expect(r.state.cur.gold).toBe(gold0 + res.gift.gold);
    s = r.state;
    expect(s.home!.sleptWith).toBe('mirabel');
    expect(() => A(s, { type: 'bond.sleep', hero: 'lira' })).toThrow('usedToday'); // одна за ночь
    expect(() => A(s, { type: 'bond.sleep', hero: 'lira' }, T0 + 86400000)).not.toThrow();
    // пижама — скрытый облик
    expect(SKIN_MAP[BOND_SLEEP_SKIN.mirabel].look.wear).toBe('silk');
    expect(SKINS.some((x) => x.id === BOND_SLEEP_SKIN.mirabel)).toBe(false);
  });

  it('темы разговоров детерминированы и есть у всей шестёрки', () => {
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
    const r = applyAction({ ...s, settings: { ...s.settings, news: undefined } }, { type: 'news.seen', id: CHANGELOG[0].id }, { cfg, now: T0 });
    expect(r.state.settings.news).toBe(CHANGELOG[0].id);
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
  it('облики: самые открытые купальники — только на курорте; коллекции — в магазинах и пропуске', () => {
    const fest = SKINS.filter((x) => FESTIVAL_ONLY_SKINS.has(x.id));
    expect(fest.map((x) => x.hero).sort()).toEqual([...ROSTER].sort());
    for (const sk of fest) {
      expect(sk.set).toBe('summer');
      expect(isSwimwear(sk.look.wear)).toBe(true);
      expect(skinFestival(sk.id)?.def.id).toBe('resort');
      expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id)).toBe(false);
    }
    expect(skinFestival('mirabel_summer')?.final).toBe(true);
    // у героев — мужские купальники, у героинь — женские
    for (const sk of SKINS) {
      if (!sk.look.wear) continue;
      expect(MALE_WEAR.has(sk.look.wear)).toBe(!!HEROINE_MAP[sk.hero].look.male);
    }
    // коллекции: у каждой героини бикини и бельё, всё добывается — в магазине, у лавок режимов или в пропуске
    for (const h of HEROINES.filter((x) => !x.look.male)) {
      expect(SKINS.filter((x) => x.hero === h.id && x.set === 'summer').length).toBeGreaterThanOrEqual(4);
      expect(SKINS.filter((x) => x.hero === h.id && x.set === 'lingerie').length).toBeGreaterThanOrEqual(3);
    }
    for (const sk of SKINS.filter((x) => x.set && x.set !== 'bond' && !FESTIVAL_ONLY_SKINS.has(x.id)))
      expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id) || PASS_SKIN_POOL.includes(sk.id)).toBe(true);
    // наряды близости не продаются
    for (const sk of SKINS.filter((x) => x.set === 'bond')) expect(SHOP_OFFERS.some((o) => o.give.skin === sk.id)).toBe(false);
    expect(new Set(SKINS.map((x) => x.id)).size).toBe(SKINS.length);
    // базовые наряды — классовые: купальники есть только в обликах
    for (const h of HEROINES) expect(isSwimwear(h.look.wear)).toBe(false);
    // пропуск: четыре облика сезона на ключевых уровнях
    expect(passSkins('s0')).toHaveLength(PASS_SKIN_LEVELS.length);
    expect(passReward(15, 's0').skin).toBe(passSkins('s0')[0]);
  });

  it('«забрать всё»: все уровни и бонусные сундуки; Эмблемы — на ранги', () => {
    let s = fresh();
    s.shop.passXp = PASS_LEVELS * 100 + 450; // 50 уровней + 2 бонусных сундука
    const e0 = s.cur.emblems;
    const r = applyAction(s, { type: 'pass.claimAll' }, { cfg, now: T0 });
    s = r.state;
    expect(s.shop.passClaimed).toHaveLength(PASS_LEVELS);
    expect(s.shop.passBonus).toBe(2);
    expect(s.cur.emblems - e0).toBeGreaterThanOrEqual(50);
    for (const sk of passSkins(s.shop.passSeason)) expect(s.skins).toContain(sk);
    expect(() => applyAction(s, { type: 'pass.claimAll' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('лавки продают Эмблемы, а не осколки и свитки', () => {
    for (const o of SHOP_OFFERS) expect(JSON.stringify(o)).not.toMatch(/shard|scroll/i);
    expect(SHOP_OFFERS.filter((o) => o.shop === 'emblems').length).toBeGreaterThan(0);
    let s = { ...fresh(), cur: { ...fresh().cur, crystals: 10000 } };
    s = applyAction(s, { type: 'shop.buy', offer: 'em_5' }, { cfg, now: T0 }).state;
    expect(s.cur.emblems).toBe(5);
  });
});

describe('Колоссы и режимы', () => {
  // T0 — пятница 25.09.2026: Колосс Бездны и тёмный шпиль
  function strong() {
    let s = fresh();
    s = applyAction(s, { type: 'dev.hero', id: 'all', lvl: 30 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.progress', unlockAll: true, diff: 0, idx: 20 }, { cfg, now: T0, dev: true }).state;
    return s;
  }

  it('5 Колоссов; расписание: будни по стихиям, выходные — все шпили', () => {
    expect(COLOSSI).toHaveLength(5);
    expect(riftElement(Date.UTC(2026, 8, 21, 12))).toBe('fire'); // пн
    expect(riftElement(T0)).toBe('dark'); // пт
    expect(spireOpen('dark', T0)).toBe(true);
    expect(spireOpen('fire', T0)).toBe(false);
    for (const el of ELEMENTS) expect(spireOpen(el, Date.UTC(2026, 8, 26, 12))).toBe(true); // сб
    expect(riftTier(0, 100)).toBe(0);
    expect(riftTier(5, 100)).toBe(4);
    expect(riftTier(1, 100, true)).toBe(10);
  });

  it('Разлом: 3 попытки в день, награда по урону (с Эмблемами), быстрая зачистка', () => {
    let s = strong();
    const boss = riftBoss({ cfg, s, now: T0 });
    expect(boss.element).toBe('dark');
    const e0 = s.cur.emblems;
    const r1 = applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 });
    s = r1.state;
    const res = r1.result as { dmg: number; tier: number };
    expect(res.dmg).toBeGreaterThan(0);
    expect(res.tier).toBeGreaterThan(0);
    expect(s.cur.emblems - e0).toBe(Math.ceil(res.tier / 2));
    s = applyAction(s, { type: 'rift.sweep' }, { cfg, now: T0 + 1000 }).state;
    expect(riftState({ s, now: T0 }).used).toBe(cfg.modes.riftAttempts);
    expect(s.cur.emblems - e0).toBe(Math.ceil(res.tier / 2) * cfg.modes.riftAttempts);
    expect(() => applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 + 2000 })).toThrow(GameError);
    expect(riftState({ s, now: T0 + 86400000 }).used).toBe(0);
  });

  it('Шпиль: весь Легион против одной стихии, закрытый шпиль не пускает, веха даёт Эмблемы', () => {
    let s = strong();
    expect(spireParty({ cfg, s, now: T0 }, 'dark')).toEqual(activeParty(s));
    expect(() => applyAction(s, { type: 'spire.fight', element: 'fire' }, { cfg, now: T0 })).toThrow(GameError);
    s.modes.spires = { dark: 9 };
    expect(spireReward(10, 'dark').emblems).toBeGreaterThan(0);
    const r = applyAction(s, { type: 'spire.fight', element: 'dark' }, { cfg, now: T0 });
    if ((r.result as { win: boolean }).win) {
      expect(r.state.modes.spires?.dark).toBe(10);
      expect(r.state.cur.emblems - s.cur.emblems).toBe(spireReward(10, 'dark').emblems);
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
    s.modes.horde = { ...s.modes.horde!, wave: 3, offer: ['fury', 'mend', 'greed'] };
    expect(() => applyAction(s, { type: 'horde.fight' }, { cfg, now: T0 + 1000 })).toThrow(GameError);
    const hurt = { ...s.modes.horde!.hp };
    const ids = Object.keys(hurt);
    hurt[ids[0]] = 0;
    hurt[ids[1]] = 0.4;
    s.modes.horde = { ...s.modes.horde!, hp: hurt };
    const m = applyAction(s, { type: 'horde.bless', index: 1 }, { cfg, now: T0 + 1000 }).state;
    expect(m.modes.horde!.hp[ids[0]]).toBeCloseTo(0.3);
    expect(m.modes.horde!.hp[ids[1]]).toBeCloseTo(0.9);
    expect(m.modes.horde!.blessings).toEqual([]);
    expect(m.modes.horde!.offer).toBeUndefined();
    const f = applyAction(s, { type: 'horde.bless', index: 0 }, { cfg, now: T0 + 1000 }).state;
    expect(hordeBonus(f.modes.horde!).stats.atkPct).toBeCloseTo(0.2);
    expect(() => applyAction(f, { type: 'horde.fight' }, { cfg, now: T0 + 2000 })).not.toThrow();
    const g = applyAction(s, { type: 'horde.bless', index: 2 }, { cfg, now: T0 + 1000 }).state;
    expect(hordeBonus(g.modes.horde!).rewardPct).toBeCloseTo(0.5);
    expect(hordeWaveReward({ cfg, s: g }, 4, 0.5).cur.gold).toBeGreaterThan(hordeWaveReward({ cfg, s: g }, 4).cur.gold);
    expect(hordeWaveReward({ cfg, s: g }, 10).cur.emblems).toBeGreaterThan(0);
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

  it('Башня: модификатор этажа, «Испытание» с двойной наградой, Эмблемы у стражей', () => {
    let s = strong();
    s.modes.tower = 20;
    expect(towerMod(21)).toBeTruthy();
    expect(towerMod(30)).toBeNull();
    expect(towerReward(21, true).crystals).toBe(towerReward(21).crystals * 2);
    expect(towerReward(20).emblems).toBeGreaterThan(0);
    expect(towerReward(50).emblems).toBeGreaterThan(towerReward(40).emblems);
    expect(towerReward(21).emblems).toBe(0);
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

  it('Сеты режимов: не куются, выпадают в Разломе и Нашествии', () => {
    let s = strong();
    s = applyAction(s, { type: 'dev.cur', cur: 'forgeMats', op: 'add', amount: 10000 }, { cfg, now: T0, dev: true }).state;
    s = applyAction(s, { type: 'dev.cur', cur: 'gold', op: 'add', amount: 1e12 }, { cfg, now: T0, dev: true }).state;
    expect(() => applyAction(s, { type: 'forge.craft', recipe: 'setLegendary', set: 'colossus' }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'forge.craft', recipe: 'setLegendary', set: 'nope' }, { cfg, now: T0 })).toThrow(GameError);
    expect(ENDGAME_SETS).not.toContain('colossus');
    expect(MODE_SET).toEqual({ rift: 'colossus', horde: 'warband', spires: 'prism', tower: 'harlequin' });
    const r = applyAction(s, { type: 'rift.fight' }, { cfg, now: T0 });
    const res = r.result as { tier: number; reward: { items?: string[] } };
    if (res.tier >= 4) {
      expect(res.reward.items).toHaveLength(1);
      expect(r.state.items[res.reward.items![0]].set).toBe('colossus');
    } else expect(res.reward.items).toBeUndefined();
    const h = applyAction(s, { type: 'horde.start' }, { cfg, now: T0 }).state;
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
    s.modes.dungeons = { gold: 3, xp: 2 };
    const d = applyAction(s, { type: 'dungeon.sweepAll' }, { cfg, now: T0 });
    expect((d.result as { times: number }).times).toBe(cfg.modes.dungeonKeys * 2);
    expect(() => applyAction(d.state, { type: 'dungeon.sweepAll' }, { cfg, now: T0 })).toThrow(GameError);
  });

  it('Арена: соперник — другой отряд Легиона того же размера', () => {
    let s = strong();
    s = applyAction(s, { type: 'dev.progress', accLvl: 25 }, { cfg, now: T0, dev: true }).state;
    const r = applyAction(s, { type: 'arena.opponents' }, { cfg, now: T0 });
    for (const o of r.state.modes.arena.opponents) {
      expect(o.team).toHaveLength(activeParty(s).length);
      for (const m of o.team) expect(ROSTER).toContain(m.id);
    }
  });
});

describe('артефакты: мастерская', () => {
  const D = { cfg, now: T0, dev: true };
  function ready(stage = 40) {
    let s = fresh();
    s = { ...s, progress: { ...s.progress, maxGlobalEver: stage } };
    for (const cur of ['forgeMats', 'starDust', 'crystals'] as const) s = applyAction(s, { type: 'dev.cur', cur, op: 'set', amount: 1e6 }, D).state;
    return s;
  }

  it('закрыты до этапа 25; изготовление без случайности, новый артефакт встаёт в слот', () => {
    expect(() => applyAction(fresh(), { type: 'artifact.craft', id: 'war_drum' }, { cfg, now: T0 })).toThrow('locked');
    const s = ready();
    const cost = artifactCost('war_drum', 0)!;
    const r = applyAction(s, { type: 'artifact.craft', id: 'war_drum' }, { cfg, now: T0 });
    expect(r.result).toMatchObject({ id: 'war_drum', lvl: 1, isNew: true });
    expect(s.cur.forgeMats - r.state.cur.forgeMats).toBe(cost.forgeMats);
    expect(r.state.artifacts!.slots).toContain('war_drum');
    expect(() => applyAction(s, { type: 'artifact.summon', count: 1 }, { cfg, now: T0 })).toThrow('unknownAction');
  });

  it('улучшение до 5 дорожает; ступени открываются по ходу кампании', () => {
    let s = ready();
    for (let l = 0; l < ARTIFACT_MAX; l++) s = applyAction(s, { type: 'artifact.craft', id: 'dew_flask' }, { cfg, now: T0 }).state;
    expect(s.artifacts!.owned.dew_flask).toBe(ARTIFACT_MAX);
    expect(() => applyAction(s, { type: 'artifact.craft', id: 'dew_flask' }, { cfg, now: T0 })).toThrow('maxRank');
    expect(artifactCost('dew_flask', 4)!.forgeMats).toBeGreaterThan(artifactCost('dew_flask', 0)!.forgeMats!);
    const ur = ARTIFACTS.find((a) => a.rarity === 'UR')!;
    expect(artifactOpen(s, ur.id)).toBe(false);
    expect(() => applyAction(s, { type: 'artifact.craft', id: ur.id }, { cfg, now: T0 })).toThrow('requirements');
    const late = ready(ARTIFACT_TIER_STAGE.UR);
    expect(() => applyAction(late, { type: 'artifact.craft', id: ur.id }, { cfg, now: T0 })).not.toThrow();
    const poor = { ...ready(), cur: { ...ready().cur, forgeMats: 0 } };
    expect(() => applyAction(poor, { type: 'artifact.craft', id: 'ember_charm' }, { cfg, now: T0 })).toThrow('notEnough');
  });

  it('слоты: 2, с 40-го уровня аккаунта — 3; артефакт один на отряд; чужой не поставить', () => {
    let s = ready();
    for (const id of ['ember_charm', 'dew_flask', 'war_drum']) s = applyAction(s, { type: 'artifact.craft', id }, { cfg, now: T0 }).state;
    const [a, b] = ['ember_charm', 'dew_flask'];
    s = applyAction(s, { type: 'artifact.equip', slot: 0, id: a }, { cfg, now: T0 }).state;
    s = applyAction(s, { type: 'artifact.equip', slot: 1, id: a }, { cfg, now: T0 }).state;
    expect(s.artifacts!.slots.slice(0, 2)).toEqual([null, a]);
    s = applyAction(s, { type: 'artifact.equip', slot: 0, id: b }, { cfg, now: T0 }).state;
    expect(activeArtifacts(s).map((x) => x.id).sort()).toEqual([a, b].sort());
    expect(() => applyAction(s, { type: 'artifact.equip', slot: 2, id: a }, { cfg, now: T0 })).toThrow(GameError);
    expect(() => applyAction(s, { type: 'artifact.equip', slot: 0, id: 'alarm_bell' }, { cfg, now: T0 })).toThrow(GameError);
    const hi = { ...s, account: { ...s.account, lvl: ARTIFACT_SLOT3_LVL } };
    expect(() => applyAction(hi, { type: 'artifact.equip', slot: 2, id: 'war_drum' }, { cfg, now: T0 })).not.toThrow();
    s = applyAction(s, { type: 'artifact.equip', slot: 1, id: null }, { cfg, now: T0 }).state;
    expect(activeArtifacts(s).map((x) => x.id)).toEqual([b]);
  });

  it('механики срабатывают в бою; без артефактов бой прежний; бой детерминирован', () => {
    let s = fresh();
    for (const id of ['lira', 'cassian', 'elian', 'keira']) s = applyAction(s, { type: 'dev.hero', id, lvl: 20 }, D).state;
    const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 36))];
    const base = simulateBattle(cfg, { seed: 7, units, timeLimit: 60 });
    expect(simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: [] }).events).toEqual(base.events);
    const mechs = (arts: { id: string; lvl: number }[]) => {
      const r = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: arts });
      expect(simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: arts }).events).toEqual(r.events);
      return new Set(r.events.filter((e) => e.k === 'mech').map((e) => (e as { m: string }).m));
    };
    const seen = mechs(ARTIFACTS.map((a) => ({ id: a.id, lvl: 3 })));
    for (const id of ['ember_charm', 'thunder_bell', 'hunter_mark', 'omen_ward', 'time_chain']) expect(seen.has(`artifact:${id}`)).toBe(true);
    const start = simulateBattle(cfg, { seed: 7, units, timeLimit: 60, artifacts: [{ id: 'war_drum', lvl: 5 }] }).events[0] as { units: { side: number; energy: number }[] };
    expect(start.units.filter((u) => u.side === 0).every((u) => u.energy >= artifactValue('war_drum', 5))).toBe(true);
  });

  it('пепел феникса и рог валькирии спасают отряд в тяжёлом бою', () => {
    let s = fresh();
    for (const id of ['lira', 'cassian']) s = applyAction(s, { type: 'dev.hero', id, lvl: 5 }, D).state;
    const units = [...heroUnits(cfg, s, activeParty(s)), ...bossUnits(cfg, stageRef(0, 30))];
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

describe('праздники Легиона', () => {
  const DAY = 86400000;
  const T1 = FESTIVAL_EPOCH + 10 * 3600000;
  const D = { cfg, now: T1, dev: true };
  function ready(oneShot = true): PlayerState {
    let s = fresh();
    for (const id of ['lira', 'cassian', 'elian', 'keira']) s = applyAction(s, { type: 'dev.hero', id, lvl: 30 }, D).state;
    s = { ...s, account: { ...s.account, lvl: 12 } };
    return { ...s, dev: { ...s.dev, oneShot } };
  }
  const act = (s: PlayerState, a: Record<string, unknown>, now = T1) => applyAction(s, a as never, { cfg, now, dev: true });

  it('праздники сменяются каждые 14 дней по кругу', () => {
    const ids = [0, 1, 2, 3, 4, 5].map((k) => festivalAt(FESTIVAL_EPOCH + k * FESTIVAL_DAYS * DAY + 1000)!.def.id);
    expect(ids).toEqual(['bloodmoon', 'resort', 'tides', 'mine', 'sakura', 'bloodmoon']);
    // летний курорт идёт с 26.09.2026
    expect(festivalAt(Date.UTC(2026, 8, 30))!.def.id).toBe('resort');
    for (let k = 0; k < FESTIVALS.length; k++) expect(FESTIVALS[k].kind === 'trail' && FESTIVALS[(k + 1) % FESTIVALS.length].kind === 'trail' && k !== FESTIVALS.length - 1).toBe(false);
    const f = festivalAt(T1)!;
    expect(f.end - f.start).toBe(FESTIVAL_DAYS * DAY);
    expect(f.start).toBeLessThanOrEqual(T1);
    expect(festivalAt(FESTIVAL_EPOCH - 1000)!.def.id).toBe(FESTIVALS[FESTIVALS.length - 1].id);
  });

  it('покровительницы праздников — героини Легиона; у пути — колосс и противница-испытание', () => {
    for (const fd of FESTIVALS) {
      expect(ROSTER).toContain(fd.hero);
      if (fd.kind === 'trail') {
        expect(ENEMY_MAP[fd.trail!.boss]?.colossus).toBe(true);
        expect(ENEMY_MAP[fd.trail!.trialBoss]?.look).toBeTruthy();
      }
      for (const sk of [fd.finalSkin, ...fd.shopSkins].filter(Boolean) as string[]) expect(SKIN_MAP[sk]?.source).toBe('event');
      for (const sk of FESTIVAL_SKILLS) expect(SKILL_MAP[sk.id]).toBeDefined();
    }
    expect(FEST_MILESTONES.filter((m) => m.skin).length).toBeLessThanOrEqual(1);
    expect(FEST_MILESTONES.every((m, i) => i === 0 || m.at > FEST_MILESTONES[i - 1].at)).toBe(true);
    expect(FEST_MILESTONES.reduce((a, m) => a + (m.cur?.emblems ?? 0), 0)).toBeGreaterThan(50);
  });

  it('путь: закрыт до 10-го уровня, этапы по порядку, повтор — за билет, 3★ — быстрый рейд', () => {
    expect(() => act(fresh(), { type: 'fest.stage', stage: 1 })).toThrow('locked');
    let s = ready();
    expect(() => act(s, { type: 'fest.stage', stage: 2 })).toThrow('locked');
    const t0 = s.cur.eventTokens;
    let r = act(s, { type: 'fest.stage', stage: 1 });
    s = r.state;
    const res = r.result as { win: boolean; stars: number; reward: { points: number; first: boolean } };
    expect(res.win).toBe(true);
    expect(res.stars).toBe(3);
    expect(res.reward.first).toBe(true);
    expect(s.cur.eventTokens - t0).toBe(festFirstReward(1).tokens);
    expect(s.festival!.points).toBe(festFirstReward(1).points + 3 * FEST_STAR_POINTS);
    expect(s.festival!.tickets).toBe(FEST_TICKETS);
    r = act(s, { type: 'fest.stage', stage: 1 });
    s = r.state;
    expect(s.festival!.tickets).toBe(FEST_TICKETS - 1);
    expect(s.quests.daily.festRaid).toBe(1);
    s = act(s, { type: 'fest.sweep', stage: 1, times: FEST_TICKETS - 1 }).state;
    expect(s.festival!.tickets).toBe(0);
    expect(() => act(s, { type: 'fest.sweep', stage: 1 })).toThrow('noTickets');
    expect(() => act(s, { type: 'fest.stage', stage: 1 })).toThrow('noTickets');
    expect(() => act(s, { type: 'fest.stage', stage: 2 })).not.toThrow();
    expect(festivalState({ s, cfg, now: T1 + DAY }).tickets).toBe(FEST_TICKETS);
    const two = { ...s, festival: { ...s.festival!, stars: [2, ...s.festival!.stars.slice(1)], tickets: 3 } };
    expect(() => act(two, { type: 'fest.sweep', stage: 1 })).toThrow('notDone');
  });

  it('последний этап — испытание; главы пути дают Эмблемы', () => {
    let s = ready();
    const e0 = s.cur.emblems;
    for (let st = 1; st <= FEST_STAGES; st++) s = act(s, { type: 'fest.stage', stage: st }).state;
    expect(s.festival!.stars.every((x) => x === 3)).toBe(true);
    const total = Array.from({ length: FEST_STAGES }, (_, i) => festFirstReward(i + 1).emblems).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(s.cur.emblems - e0).toBe(total);
    const units = festStageEnemies(cfg, festivalAt(T1)!.def, s.festival!.lvl, FEST_STAGES);
    expect(units.some((u) => u.kind === 'boss' && u.ref === festivalAt(T1)!.def.trail!.trialBoss)).toBe(true);
    expect(festGoalValue(s, s.festival!, 'stars')).toBe(54);
  });

  it('босс праздника: урон копится, победа поднимает уровень; три попытки в день', () => {
    let s = ready(false);
    s = { ...s, progress: { ...s.progress, maxGlobal: 80, maxGlobalEver: 80 } };
    const b0 = festBoss({ s, cfg, now: T1 }, festivalAt(T1)!.def);
    let r = act(s, { type: 'fest.boss' });
    s = r.state;
    const res = r.result as { dmg: number; killed: boolean };
    expect(res.dmg).toBeGreaterThan(0);
    expect(res.killed).toBe(false);
    expect(s.festival!.boss.dmg).toBe(res.dmg);
    expect(festBoss({ s, cfg, now: T1 }, festivalAt(T1)!.def).left).toBe(b0.hp - res.dmg);
    s = { ...s, dev: { ...s.dev, oneShot: true } };
    const e0 = s.cur.emblems;
    r = act(s, { type: 'fest.boss', tactic: 'assault' });
    s = r.state;
    expect((r.result as { killed: boolean }).killed).toBe(true);
    expect(s.festival!.boss).toMatchObject({ lvl: 2, dmg: 0, kills: 1, used: 2 });
    expect(s.cur.emblems - e0).toBe(festBossReward(1, true).emblems);
    expect(festBoss({ s, cfg, now: T1 }, festivalAt(T1)!.def).level).toBeGreaterThan(b0.level);
    s = act(s, { type: 'fest.boss' }).state;
    expect(() => act(s, { type: 'fest.boss' })).toThrow('noAttempts');
    expect(() => act(s, { type: 'fest.boss' }, T1 + DAY)).not.toThrow();
  });

  it('задания дня и цели праздника', () => {
    let s = ready();
    const ids = festDailyTasks(dayKey(T1), festivalAt(T1)!.cycle);
    expect(new Set(ids).size).toBe(4);
    expect(FEST_TASKS_FEST.map((t) => t.id)).toContain(ids[0]);
    expect(festDailyTasks(dayKey(T1), festivalAt(T1)!.cycle)).toEqual(ids);
    expect(() => act(s, { type: 'fest.task', id: ids[1] })).toThrow('notDone');
    expect(() => act(s, { type: 'fest.task', id: 'nope' })).toThrow(GameError);
    const t = FEST_TASK_MAP[ids[1]];
    s = act(s, { type: 'sync' }).state;
    s = { ...s, quests: { ...s.quests, daily: { ...s.quests.daily, [t.counter]: t.target } } };
    expect(festClaimable({ s, cfg, now: T1 })).toBe(1);
    s = act(s, { type: 'fest.task', id: ids[1] }).state;
    expect(s.festival!.tasksDone).toBe(1);
    expect(s.festival!.points).toBe(FEST_TASK_REWARD.points);
    expect(() => act(s, { type: 'fest.task', id: ids[1] })).toThrow('claimed');
    const g = FEST_GOALS.find((x) => x.metric === 'bossWin')!;
    expect(() => act(s, { type: 'fest.goal', id: g.id })).toThrow('notDone');
    s = { ...s, counters: { ...s.counters, bossWin: (s.festival!.base.bossWin ?? 0) + g.target } };
    const r = act(s, { type: 'fest.goal', id: g.id });
    expect(r.state.festival!.points).toBe(s.festival!.points + g.points);
    expect(() => act(r.state, { type: 'fest.goal', id: g.id })).toThrow('claimed');
  });

  it('шкала наград: всё разом, Эмблемы и сердца', () => {
    let s = ready();
    s = act(s, { type: 'sync' }).state;
    s = { ...s, festival: { ...festivalState({ s, cfg, now: T1 }), points: 100000 } };
    const e0 = s.cur.emblems;
    const r = act(s, { type: 'fest.claim', index: 'all' });
    expect(r.state.festival!.claimed).toHaveLength(FEST_MILESTONES.length);
    expect(r.state.cur.emblems - e0).toBe(FEST_MILESTONES.reduce((a, m) => a + (m.cur?.emblems ?? 0), 0));
    expect(() => act(r.state, { type: 'fest.claim', index: 'all' })).toThrow('notDone');
  });

  it('лавка праздника: Эмблемы, лимит на праздник', () => {
    let s = ready();
    s = { ...s, cur: { ...s.cur, eventTokens: 100000 } };
    const { def, offers } = festShopNow({ cfg, now: T1 })!;
    const em = offers.find((o) => o.id === 'fs_emblems')!;
    const e0 = s.cur.emblems;
    for (let i = 0; i < em.limit; i++) s = act(s, { type: 'fest.buy', offer: em.id }).state;
    expect(s.cur.emblems - e0).toBe(em.limit * em.give.cur!.emblems!);
    expect(() => act(s, { type: 'fest.buy', offer: em.id })).toThrow('limitReached');
    const later = T1 + FESTIVALS.length * FESTIVAL_DAYS * DAY;
    expect(festivalAt(later)!.def.id).toBe(def.id);
    expect(() => act(s, { type: 'fest.buy', offer: em.id }, later)).not.toThrow();
    expect(festBought(s, em.id, undefined, festivalAt(T1)!.cycle)).toBe(em.limit);
  });

  it('новый праздник начинается с чистого листа и фиксирует уровень врагов', () => {
    let s = ready();
    s = act(s, { type: 'fest.stage', stage: 1 }).state;
    expect(s.festival!.points).toBeGreaterThan(0);
    const next = T1 + 2 * FESTIVAL_DAYS * DAY;
    const f = festivalState({ s, cfg, now: next });
    expect(f.cycle).toBe(s.festival!.cycle + 2);
    expect(f.points).toBe(0);
    expect(f.stars.every((x) => x === 0)).toBe(true);
    expect(festStageLevel(f.lvl, 1)).toBeLessThan(festStageLevel(f.lvl, 17));
    s = act(s, { type: 'fest.stage', stage: 1 }, next).state;
    expect(s.festival!.cycle).toBe(f.cycle);
  });
});

describe('свойства элиты', () => {
  it('появляются с 11-го этапа: Normal — одно, Hard/Nightmare — два; владычицы — только на Hard/Nightmare', () => {
    expect(stageAffixes(stageRef(0, 10))).toEqual([]);
    const n = stageAffixes(stageRef(0, 12));
    expect(n).toHaveLength(1);
    expect(stageAffixes(stageRef(0, 12))).toEqual(n);
    expect(stageAffixes(stageRef(1, 12))).toHaveLength(2);
    expect(stageAffixes(stageRef(0, 20))).toEqual([]);
    expect(stageAffixes(stageRef(2, 20))).toHaveLength(1);
    for (let i = 11; i <= 60; i++) for (const id of stageAffixes(stageRef(0, i))) expect(ELITE_AFFIX_MAP[id]).toBeDefined();
  });

  it('босс этапа получает свойства, свита — нет', () => {
    for (let i = 11; i <= 40; i++) {
      const ref = stageRef(1, i);
      const ids = stageAffixes(ref);
      const units = bossUnits(cfg, ref);
      const boss = units.find((u) => u.kind !== 'enemy')!;
      const plain = withAffixes(boss, []);
      expect(plain).toBe(boss);
      for (const id of ids) {
        const a = ELITE_AFFIX_MAP[id];
        if (a.fx) expect(boss.fx.some((f) => f.id === a.fx!.id)).toBe(true);
        if (a.lifesteal) expect(boss.stats.lifesteal).toBeGreaterThanOrEqual(a.lifesteal);
      }
      expect(units.filter((u) => u.kind === 'enemy').every((u) => u.fx.length === 0)).toBe(true);
    }
  });
});

describe('облики праздников: где получить', () => {
  it('ближайшие даты праздника; облик без праздника — null', () => {
    const DAY = 86400000;
    const now = FESTIVAL_EPOCH + DAY;
    expect(skinFestival('nope')).toBeNull();
    const sak = festivalNext('sakura', now)!;
    expect(sak.active).toBe(false);
    expect(festivalAt(sak.start)!.def.id).toBe('sakura');
    expect(festivalNext('bloodmoon', now)).toMatchObject({ active: true, start: FESTIVAL_EPOCH });
  });
});

describe('расписание праздников (из бота)', () => {
  const DAY = 86400000;
  const now = FESTIVAL_EPOCH + 3 * DAY;
  const withSched = (sched: FestivalSchedule | undefined) => ({ ...cfg, festival: sched });

  it('стоп: праздника нет, действия праздника закрыты; старт — идёт выбранный', () => {
    const stop = scheduleStop(undefined, now);
    expect(stop.ok).toBe(true);
    const sched = (stop as { sched: FestivalSchedule }).sched;
    expect(festivalAt(now + 1000, sched)).toBeNull();
    expect(festivalUpcoming(now + 1000, sched)).toHaveLength(0);
    let s = fresh();
    s = { ...s, account: { ...s.account, lvl: 12 } };
    expect(() => applyAction(s, { type: 'fest.stage', stage: 1 }, { cfg: withSched(sched), now: now + 1000 })).toThrow('noFestival');
    expect(festClaimable({ s, cfg: withSched(sched), now: now + 1000 })).toBe(0);
    // повторная остановка — праздника уже нет
    expect(scheduleStop(sched, now + 2000).ok).toBe(false);
    const start = scheduleStart(sched, 'tides', now + 5000, 7) as { ok: true; sched: FestivalSchedule };
    const cur = festivalAt(now + 6000, start.sched)!;
    expect(cur.def.id).toBe('tides');
    expect(cur.end - cur.start).toBe(7 * DAY - 0);
    expect(() => applyAction(s, { type: 'fest.stage', stage: 1 }, { cfg: withSched(start.sched), now: now + 6000, dev: true })).not.toThrow('noFestival');
  });

  it('продление того же праздника сохраняет прогресс, другой праздник начинается с нуля', () => {
    let s = fresh();
    s = { ...s, account: { ...s.account, lvl: 12 }, dev: { ...s.dev, oneShot: true } };
    for (const id of ['lira', 'cassian']) s = applyAction(s, { type: 'dev.hero', id, lvl: 20 }, { cfg, now, dev: true }).state;
    s = applyAction(s, { type: 'fest.stage', stage: 1 }, { cfg, now, dev: true }).state;
    const pts = s.festival!.points;
    expect(pts).toBeGreaterThan(0);
    // та же «Кровавая Луна», просто дольше — номер праздника прежний
    const ext = (scheduleStart(undefined, 'bloodmoon', now, 30) as { sched: FestivalSchedule }).sched;
    expect(festivalAt(now + 20 * DAY, ext)!.def.id).toBe('bloodmoon');
    expect(festivalState({ s, cfg: withSched(ext), now: now + 20 * DAY }).points).toBe(pts);
    // сменили праздник — новый прогресс
    const other = (scheduleStart(ext, 'sakura', now + DAY, 10) as { sched: FestivalSchedule }).sched;
    const f = festivalState({ s, cfg: withSched(other), now: now + 2 * DAY });
    expect(f.points).toBe(0);
    expect(f.fest).toBe('sakura');
  });

  it('план по датам: без наложений, не в прошлом; конец и удаление; возврат к ротации', () => {
    const plan = schedulePlan(undefined, 'sakura', now + 20 * DAY, now + 30 * DAY, now) as { ok: true; sched: FestivalSchedule };
    expect(plan.ok).toBe(true);
    // идущая по ротации «Кровавая Луна» осталась, «Сакура» — следом
    expect(festivalUpcoming(now, plan.sched).map((x) => x.def.id)).toEqual(['bloodmoon', 'sakura']);
    expect(festivalAt(now + 15 * DAY, plan.sched)).toBeNull();
    expect(festivalAt(now + 25 * DAY, plan.sched)!.def.id).toBe('sakura');
    expect(schedulePlan(plan.sched, 'tides', now + 25 * DAY, now + 35 * DAY, now)).toMatchObject({ ok: false, error: 'overlap' });
    expect(schedulePlan(plan.sched, 'tides', now - 5 * DAY, now - DAY, now)).toMatchObject({ ok: false, error: 'past' });
    expect(schedulePlan(plan.sched, 'tides', now + 5 * DAY, now + 2 * DAY, now)).toMatchObject({ ok: false, error: 'badDates' });
    const end = scheduleSetEnd(plan.sched, now + 5 * DAY, now) as { ok: true; sched: FestivalSchedule };
    expect(festivalAt(now + 6 * DAY, end.sched)).toBeNull();
    expect(scheduleSetEnd(plan.sched, now + 25 * DAY, now)).toMatchObject({ ok: false, error: 'overlap' });
    const rm = scheduleRemove(end.sched, 2, now) as { ok: true; sched: FestivalSchedule };
    expect(festivalUpcoming(now, rm.sched).map((x) => x.def.id)).toEqual(['bloodmoon']);
    expect(scheduleRemove(rm.sched, 5, now).ok).toBe(false);
    const auto = scheduleAuto(rm.sched, now);
    expect(festivalAt(now, auto)!.def.id).toBe('bloodmoon');
    // номера праздников из бота не пересекаются с ротацией
    const cycles = plan.sched.entries.map((e) => e.cycle);
    expect(new Set(cycles).size).toBe(cycles.length);
    expect(Math.max(...cycles)).toBeGreaterThan(1_000_000);
  });
});

describe('«Что нового»', () => {
  it('только главное: до 3 пунктов, у каждой записи иконка, суть и существующая героиня', () => {
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length);
    for (const e of CHANGELOG) {
      expect(e.items.length).toBeGreaterThan(0);
      expect(e.items.length).toBeLessThanOrEqual(3);
      expect(e.icon).toBeTruthy();
      expect(e.lead.ru && e.lead.en).toBeTruthy();
      if (e.art) {
        expect(HEROINE_MAP[e.art.hero]).toBeDefined();
        if (e.art.skin) expect(SKIN_MAP[e.art.skin]?.hero).toBe(e.art.hero);
      }
    }
  });
});

describe('Самоцветные копи', () => {
  const DAY = 86400000;
  const TM = FESTIVAL_EPOCH + 3 * FESTIVAL_DAYS * DAY + 3600000; // идут копи
  function ready(now: number, oneShot = false): PlayerState {
    let s = fresh();
    for (const id of ['lira', 'cassian', 'elian', 'keira']) s = applyAction(s, { type: 'dev.hero', id, lvl: 30 }, { cfg, now, dev: true }).state;
    s = { ...s, account: { ...s.account, lvl: 12 } };
    return { ...s, dev: { ...s.dev, oneShot } };
  }
  const act = (s: PlayerState, a: Record<string, unknown>, now: number) => applyAction(s, a as never, { cfg, now, dev: true });

  it('у каждого праздника свой вид: в копях нет пути; турнира больше нет', () => {
    expect(festivalAt(TM)!.def.kind).toBe('mine');
    const s = ready(TM);
    expect(() => act(s, { type: 'fest.stage', stage: 1 }, TM)).toThrow('noFestival');
    expect(() => act(s, { type: 'tour.start' }, TM)).toThrow('unknownAction');
    expect(FESTIVALS.some((f) => (f.kind as string) === 'tourney')).toBe(false);
    const tm = festDailyTasks(dayKey(TM), festivalAt(TM)!.cycle, 'mine');
    expect(FEST_TASKS_KIND.mine.map((t) => t.id)).toContain(tm[0]);
    expect(festGoalsFor('mine').some((g) => g.metric === 'mineFloor')).toBe(true);
    expect(festGoalsFor('mine').some((g) => g.metric === 'stars')).toBe(false);
  });

  it('копи: копать рядом с раскопанным, кирка за шаг, соседи видны, лестница ведёт ниже', () => {
    let s = ready(TM, true);
    const m0 = mineOf(s, festivalState({ s, cfg, now: TM }));
    expect(m0.picks).toBe(MINE_START);
    expect(m0.dug).toEqual([MINE_START_IDX]);
    expect(() => act(s, { type: 'mine.dig', cell: 0 }, TM)).toThrow(GameError);
    const board = mineBoard(m0.seed, 1);
    expect(board.filter((t) => t === 'stairs')).toHaveLength(1);
    expect(mineBoard(m0.seed, 1)).toEqual(board);
    expect(mineVisible([MINE_START_IDX]).size).toBe(4);
    const stairs = board.indexOf('stairs');
    const path: number[] = [];
    let cur = MINE_START_IDX;
    while (cur !== stairs) {
      const [cx, cy] = [cur % MINE_W, Math.floor(cur / MINE_W)];
      const [tx, ty] = [stairs % MINE_W, Math.floor(stairs / MINE_W)];
      cur = cx !== tx ? cur + Math.sign(tx - cx) : cur + Math.sign(ty - cy) * MINE_W;
      path.push(cur);
    }
    for (const cell of path) s = act(s, { type: 'mine.dig', cell }, TM).state;
    const m = s.festival!.mine!;
    expect(m.floor).toBe(2);
    expect(m.best).toBe(2);
    expect(m.dug).toEqual([MINE_START_IDX]);
    expect(m.steps).toBe(path.length);
    expect(s.quests.daily.mineStep).toBe(path.length);
    expect(s.festival!.points).toBeGreaterThan(0);
  });

  it('копи: без кирок не копать; за день — новые кирки; лавка продаёт кирки', () => {
    let s = ready(TM, true);
    s = { ...s, festival: { ...festivalState({ s, cfg, now: TM }), mine: { ...mineOf(s, festivalState({ s, cfg, now: TM })), picks: 0 } } };
    const cell = MINE_START_IDX - MINE_W;
    expect(() => act(s, { type: 'mine.dig', cell }, TM)).toThrow('noPicks');
    expect(festivalState({ s, cfg, now: TM + DAY }).mine!.picks).toBe(MINE_DAILY);
    s = { ...s, cur: { ...s.cur, eventTokens: 10000 } };
    s = act(s, { type: 'fest.buy', offer: 'fs_picks' }, TM).state;
    expect(s.festival!.mine!.picks).toBe(10);
    expect(() => act(s, { type: 'mine.dig', cell }, TM)).not.toThrow();
    expect(() => act(s, { type: 'fest.buy', offer: 'fs_entry' }, TM)).toThrow(GameError);
    expect(mineNeedsFight('monster', 1)).toBe(true);
    expect(mineNeedsFight('stairs', 1)).toBe(false);
    expect(mineNeedsFight('stairs', 3)).toBe(true);
  });
});

describe('Фотосессия', () => {
  const act = (s: PlayerState, a: Record<string, unknown>, now = T0) => applyAction(s, a as never, { cfg, now, dev: true });
  const owned = (id: string) => act(fresh(), { type: 'dev.hero', id, lvl: 10 }).state;

  it('звёзды: за любимые место, позу, выражение и наряд под место; смазанный кадр — минус звезда', () => {
    const t = photoTaste('mirabel');
    const best = photoScore('mirabel', { ...t, skin: undefined, timing: 'perfect' });
    expect(best.stars).toBe(t.loc === 'camp' ? 5 : 4);
    expect(best.match).toMatchObject({ loc: true, pose: true, face: true });
    const other = (['beach', 'sunset', 'onsen', 'sakura', 'stars', 'camp'] as const).find((l) => l !== t.loc && l !== 'camp')!;
    expect(photoScore('mirabel', { ...t, loc: other, timing: 'miss' }).stars).toBe(2);
    expect(photoOutfitFits('camp', undefined)).toBe(true);
    expect(photoOutfitFits('beach', 'mirabel_bond')).toBe(false);
    const tastes = new Set(ROSTER.map((h) => JSON.stringify(photoTaste(h))));
    expect(tastes.size).toBeGreaterThan(3);
  });

  it('награда — за первые кадры дня, каждый кадр в альбоме, угаданное запоминается', () => {
    let s = owned('mirabel');
    const t = photoTaste('mirabel');
    const c0 = s.cur.crystals;
    const shot = { type: 'photo.shoot', hero: 'mirabel', loc: t.loc, pose: t.pose, face: t.face, timing: 'perfect' };
    let lastResult: any;
    for (let i = 0; i < PHOTO_DAILY + 1; i++) {
      const r = act(s, shot);
      s = r.state;
      lastResult = r.result;
      if (i < PHOTO_DAILY) expect((r.result as any).rewarded).toBe(true);
    }
    expect(lastResult.rewarded).toBe(false);
    expect(s.cur.crystals).toBeGreaterThan(c0);
    expect(s.photo!.album.length).toBe(PHOTO_DAILY + 1);
    expect(s.photo!.known.mirabel).toMatchObject({ loc: t.loc, pose: t.pose, face: t.face });
    expect((s.bond?.mirabel?.xp ?? 0) + (s.bond?.mirabel?.lvl ?? 0)).toBeGreaterThan(0);
    expect((act(s, shot, T0 + 86400000).result as any).rewarded).toBe(true);
    for (let i = 0; i < PHOTO_ALBUM_MAX + 3; i++) s = act(s, shot).state;
    expect(s.photo!.album.length).toBe(PHOTO_ALBUM_MAX);
    s = act(s, { type: 'photo.delete', index: 0 }).state;
    expect(s.photo!.album.length).toBe(PHOTO_ALBUM_MAX - 1);
  });

  it('нельзя снимать чужую героиню и в чужом облике', () => {
    const s = owned('mirabel');
    expect(() => act(s, { type: 'photo.shoot', hero: 'keira', loc: 'beach', pose: 'hips', face: 'smile', timing: 'good' })).toThrow('notOwned');
    const foreign = SKINS.find((k) => k.hero !== 'mirabel')!;
    expect(() => act(s, { type: 'photo.shoot', hero: 'mirabel', skin: foreign.id, loc: 'beach', pose: 'hips', face: 'smile', timing: 'good' })).toThrow('badParam');
    expect(() => act(s, { type: 'photo.shoot', hero: 'mirabel', skin: 'mirabel_bond', loc: 'beach', pose: 'hips', face: 'smile', timing: 'good' })).toThrow('notOwned');
    expect(() => act(s, { type: 'photo.shoot', hero: 'mirabel', loc: 'bedroom', pose: 'hips', face: 'smile', timing: 'good' })).toThrow('badParam');
  });
});

describe('Рыбалка, договоры Бездны, события экспедиций', () => {
  const act = (s: PlayerState, a: Record<string, unknown>, now = T0) => applyAction(s, a as never, { cfg, now, dev: true });
  const opened = () => act(act(fresh(), { type: 'dev.hero', id: 'all', lvl: 30 }).state, { type: 'dev.progress', unlockAll: true, diff: 0, idx: 20, accLvl: 30 }).state;

  it('рыбалка: заброс тратит наживку, рыба с места, улов даёт награды и запись в книгу', () => {
    let s = opened();
    const r = act(s, { type: 'fish.cast', spot: 'lake' });
    s = r.state;
    const cast = r.result as any;
    expect(FISH_MAP[cast.fish].spot).toBe('lake');
    expect(cast.bait).toBe(FISH_DAILY - 1);
    expect(s.fishing!.hook?.fish).toBe(cast.fish);
    const g0 = s.cur.gold;
    const reel = act(s, { type: 'fish.reel', ok: true, perfect: true });
    s = reel.state;
    expect((reel.result as any).first).toBe(true);
    expect(s.cur.gold).toBeGreaterThan(g0);
    expect(s.fishing!.log[cast.fish].n).toBe(1);
    expect(s.fishing!.hook).toBeUndefined();
    expect(() => act(s, { type: 'fish.reel', ok: true })).toThrow('noHook');
    // сорвалась — без награды
    s = act(s, { type: 'fish.cast', spot: 'lake' }).state;
    const g1 = s.cur.gold;
    s = act(s, { type: 'fish.reel', ok: false }).state;
    expect(s.cur.gold).toBe(g1);
  });

  it('рыбалка: места по уровню аккаунта, наживка кончается и восполняется утром, покупка', () => {
    let s = act(opened(), { type: 'dev.progress', accLvl: 5 }).state;
    expect(() => act(s, { type: 'fish.cast', spot: 'moon' })).toThrow('levelTooLow');
    expect(() => act(s, { type: 'fish.cast', spot: 'deep' })).toThrow('badParam');
    for (let i = 0; i < FISH_DAILY; i++) s = act(act(s, { type: 'fish.cast', spot: 'lake' }).state, { type: 'fish.reel', ok: false }).state;
    expect(() => act(s, { type: 'fish.cast', spot: 'lake' })).toThrow('noBait');
    s = act(s, { type: 'dev.cur', cur: 'gold', op: 'max' }).state;
    s = act(s, { type: 'fish.bait' }).state;
    expect(s.fishing!.bait).toBeGreaterThan(0);
    expect(act(s, { type: 'fish.cast', spot: 'lake' }, T0 + 86400000).result).toMatchObject({ bait: expect.any(Number) });
  });

  it('рыбалка: коллекция видов даёт разовые награды', () => {
    let s = opened();
    // «поймали» 4 вида заранее — пятый откроет первую награду
    const lake = FISH.filter((f) => f.spot !== 'lake').slice(0, FISH_COLLECTION[0].species - 1);
    s = { ...s, fishing: { day: '', bait: 99, bought: 0, milestones: [], log: Object.fromEntries(lake.map((f) => [f.id, { n: 1, best: 1 }])) } };
    const c0 = s.cur.crystals;
    s = act(s, { type: 'fish.cast', spot: 'lake' }).state;
    const r = act(s, { type: 'fish.reel', ok: true });
    expect((r.result as any).collection).toHaveLength(1);
    expect(r.state.fishing!.milestones).toEqual([FISH_COLLECTION[0].species]);
    expect(r.state.cur.crystals).toBeGreaterThanOrEqual(c0 + FISH_COLLECTION[0].crystals);
  });

  it('Бездна: договоры повышают жар и награду, рубежи жара — один раз, неизвестный договор — ошибка', () => {
    const s = opened();
    expect(() => act(s, { type: 'abyss.fight', pacts: ['nope'] })).toThrow('badParam');
    expect(() => act(s, { type: 'abyss.fight', pacts: ['blood', 'blood'] })).toThrow('badParam');
    const two = ['frail', 'hourglass'];
    const heat = ABYSS_PACTS.filter((p) => two.includes(p.id)).reduce((a, p) => a + p.heat, 0);
    const res = act(s, { type: 'abyss.fight', pacts: two }).result as any;
    expect(res.heat).toBe(heat);
    expect(res.omen).toBe(abyssOmen(1)?.id ?? null);
    // награда: ×(1 + жар/100), рубежи — только не взятые
    const plain = abyssReward(7, 0, []);
    const hot = abyssReward(7, 130, []);
    expect(plain.milestones).toEqual([]);
    expect(hot.milestones.map((m) => m.heat)).toEqual(ABYSS_HEAT_MILESTONES.filter((m) => m.heat <= 130).map((m) => m.heat));
    expect(hot.cur.divineMats).toBeGreaterThan(plain.cur.divineMats);
    expect(hot.cur.crystals).toBeGreaterThan(plain.cur.crystals + 250);
    expect(abyssReward(7, 130, [60, 120]).milestones).toEqual([]);
    // знамения: у стражей нет, у остальных — есть
    expect(abyssOmen(5)).toBeNull();
    expect(abyssOmen(7)).not.toBeNull();
  });

  it('экспедиции: по возвращении иногда случается событие с выбором, награда — после выбора', () => {
    let s = opened();
    const exp = (id: string) => ({ id, quest: 'ruins', heroes: ['lira'], start: T0 - 5e6, end: T0 - 1 });
    s = { ...s, modes: { ...s.modes, expeditions: Array.from({ length: 12 }, (_, i) => exp('x' + i)) } };
    const r = act(s, { type: 'expedition.claimAll' });
    const res = r.result as any;
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.n + res.events.length).toBe(12);
    s = r.state;
    expect(s.modes.expeditions).toHaveLength(res.events.length);
    const { id, event } = res.events[0];
    expect(EXPEDITION_EVENTS.map((e) => e.id)).toContain(event);
    // повторный claim не перебрасывает событие
    expect(act(s, { type: 'expedition.claim', id }).result).toMatchObject({ event, id });
    expect(() => act(s, { type: 'expedition.event', id, choice: 'c' })).toThrow('badParam');
    const d0 = s.cur.gold;
    const out = act(s, { type: 'expedition.event', id, choice: 'b' });
    expect((out.result as any).text).toBeTruthy();
    expect(out.state.modes.expeditions.find((e) => e.id === id)).toBeUndefined();
    expect(out.state.cur.gold).toBeGreaterThan(d0);
    expect(() => act(out.state, { type: 'expedition.event', id, choice: 'a' })).toThrow('badParam');
  });
});

describe('Солнечный курорт: пляжный волейбол', () => {
  const DAY = 86400000;
  // второй праздник ротации — летний курорт
  const TR = FESTIVAL_EPOCH + 1 * FESTIVAL_DAYS * DAY + 3600000;
  const act = (s: PlayerState, a: Record<string, unknown>, now = TR) => applyAction(s, a as never, { cfg, now, dev: true });
  const ready = () => {
    let s = act(fresh(), { type: 'dev.progress', unlockAll: true, accLvl: 20 }).state;
    s = act(s, { type: 'dev.hero', id: 'mirabel', lvl: 10 }).state;
    return s;
  };
  const pair = ['cassian', 'lira'];

  it('курорт — праздник пляжного волейбола; соперницы — жительницы острова, а не героини', () => {
    expect(festivalAt(TR)!.def.id).toBe('resort');
    expect(festivalAt(TR)!.def.kind).toBe('volley');
    // летняя коллекция: финал шкалы — Мирабель, остальные пять — в лавке курорта
    const def = festivalAt(TR)!.def;
    expect(def.finalSkin).toBe('mirabel_summer');
    expect(def.shopSkins).toHaveLength(5);
    let s = { ...ready(), cur: { ...ready().cur, eventTokens: 100000 } };
    const offer = festShopNow({ cfg, now: TR })!.offers.find((o) => o.give.skin === 'cassian_summer')!;
    s = act(s, { type: 'fest.buy', offer: offer.id }).state;
    expect(s.skins).toContain('cassian_summer');
    expect(() => act(s, { type: 'fest.buy', offer: offer.id })).toThrow(GameError);
    s = act(s, { type: 'sync' }).state;
    s = { ...s, festival: { ...festivalState({ s, cfg, now: TR }), points: 100000 } };
    expect(act(s, { type: 'fest.claim', index: 'all' }).state.skins).toContain('mirabel_summer');
    // в купальнике — пляжная форма в матче
    s = act(s, { type: 'hero.skin', id: 'cassian', skin: 'cassian_summer' }).state;
    const m = act(s, { type: 'volley.start', heroes: ['cassian', 'lira'], rung: 1 }).result as any;
    expect(m.team.rec).toBe(volleyTeam(['cassian', 'lira'], { cassian: 'cassian_summer' }).rec);
    for (let r = 1; r <= VOLLEY_RUNGS; r++) for (const id of volleyRival(r).pair) {
      expect(ENEMY_MAP[id]).toBeTruthy();
      expect(HEROINE_MAP[id]).toBeUndefined();
    }
  });

  it('навыки пары: по классам, одна стихия — сыгранность; лестница ведёт к финалу', () => {
    const t1 = volleyTeam(['cassian', 'keira']);
    expect(t1.rec + t1.set + t1.spk).toBeGreaterThanOrEqual(10);
    expect(volleyTeam(['cassian', 'mirabel']).synergy).toBe(true); // оба — свет
    expect(volleyTeam(['cassian', 'lira']).synergy).toBe(false);
    // пляжная форма: героиня в летнем бикини — +1 ко всем навыкам
    const plain = volleyTeam(['cassian', 'lira']);
    const beach = volleyTeam(['cassian', 'lira'], { cassian: 'cassian_summer' });
    expect(beach.rec - plain.rec + beach.set - plain.set + beach.spk - plain.spk).toBe(3);
    expect(volleyTeam(['cassian', 'lira'], { cassian: 'cassian_bond' }).rec).toBe(plain.rec);
    expect(volleyRival(VOLLEY_RUNGS).pair).toContain('v_solara');
    expect(volleyRival(VOLLEY_RUNGS).final).toBe(true);
    expect(volleyRival(1).skill).toBeLessThan(volleyRival(VOLLEY_RUNGS).skill);
  });

  it('матч: тратит матч дня, победа двигает лестницу и даёт очки праздника; нельзя перепрыгнуть ступень', () => {
    let s = ready();
    expect(() => act(s, { type: 'volley.start', heroes: pair, rung: 2 })).toThrow('requirements');
    expect(() => act(s, { type: 'volley.start', heroes: ['cassian', 'cassian'], rung: 1 })).toThrow('badParam');
    expect(() => act(s, { type: 'volley.start', heroes: ['cassian', 'keira'], rung: 1 })).toThrow('notOwned');
    s = act(s, { type: 'volley.start', heroes: pair, rung: 1 }).state;
    expect(() => act(s, { type: 'volley.end', us: VOLLEY_POINTS, them: 0 })).toThrow('badParam');
    expect(() => act(s, { type: 'volley.end', us: 3, them: 2 }, TR + 20000)).toThrow('badParam');
    const p0 = festivalState({ s, cfg, now: TR }).points;
    const r = act(s, { type: 'volley.end', us: VOLLEY_POINTS, them: 1, spikes: 3 }, TR + 20000);
    const res = r.result as any;
    expect(res.won).toBe(true);
    expect(res.big).toBe(true);
    expect(res.reward.first).toBe(true);
    s = r.state;
    const f = festivalState({ s, cfg, now: TR + 20000 });
    expect(f.volley!.best).toBe(1);
    expect(f.volley!.big).toBe(1);
    expect(f.points).toBeGreaterThan(p0);
    expect(s.quests.daily.volSpike).toBe(3);
    expect(() => act(s, { type: 'volley.end', us: VOLLEY_POINTS, them: 0 }, TR + 30000)).toThrow('noRun');
    s = act(s, { type: 'volley.start', heroes: pair, rung: 2 }, TR + 30000).state;
    const lost = act(s, { type: 'volley.end', us: 2, them: VOLLEY_POINTS }, TR + 60000);
    expect((lost.result as any).won).toBe(false);
    expect(festivalState({ s: lost.state, cfg, now: TR + 60000 }).volley!.best).toBe(1);
  });

  it('матчи дня кончаются, завтра — снова; купленные матчи не сгорают', () => {
    let s = ready();
    for (let i = 0; i < VOLLEY_DAILY; i++) s = act(act(s, { type: 'volley.start', heroes: pair, rung: 1 }).state, { type: 'volley.end', forfeit: true }).state;
    expect(() => act(s, { type: 'volley.start', heroes: pair, rung: 1 })).toThrow('noAttempts');
    s = { ...s, cur: { ...s.cur, eventTokens: 10000 } };
    s = act(s, { type: 'fest.buy', offer: 'fs_match' }).state;
    s = act(s, { type: 'volley.start', heroes: pair, rung: 1 }).state;
    expect(festivalState({ s, cfg, now: TR }).volley!.bonus).toBe(0);
    expect(() => act(act(s, { type: 'volley.end', forfeit: true }).state, { type: 'volley.start', heroes: pair, rung: 1 })).toThrow('noAttempts');
    expect(act(s, { type: 'volley.start', heroes: pair, rung: 1 }, TR + DAY).result).toMatchObject({ left: VOLLEY_DAILY - 1 });
  });
});

describe('Вечер у костра', () => {
  const act = (s: PlayerState, a: Record<string, unknown>, now = T0) => applyAction(s, a as never, { cfg, now, dev: true });

  it('сцена на каждую пару героинь, реплики и ответы на обоих языках', () => {
    const pairs = new Set(CAMPFIRE.map((c) => [c.a, c.b].sort().join('+')));
    expect(pairs.size).toBe((ROSTER.length * (ROSTER.length - 1)) / 2);
    for (const c of CAMPFIRE) {
      expect(ROSTER).toContain(c.a);
      expect(ROSTER).toContain(c.b);
      expect(c.lines.length).toBeGreaterThanOrEqual(3);
      for (const [, l] of c.lines) expect(l.ru && l.en).toBeTruthy();
      for (const k of ['a', 'b', 'both'] as const) expect(c.choices[k].ru && c.replies[k][1].en).toBeTruthy();
    }
    expect(campCombos('cassian', 'keira')).toContain('backstab');
    expect(campCombos('elian', 'ulfa')).toEqual(expect.arrayContaining(['hunt']));
  });

  it('раз в день: близость обеим, их связка сыгрывается; завтра — новая пара', () => {
    let s = fresh();
    const sc = campfireScene({ s, now: T0 })!;
    expect(sc.id).toBe('cassian_lira');
    expect(() => act(s, { type: 'camp.talk', choice: 'x' })).toThrow('badParam');
    const r = act(s, { type: 'camp.talk', choice: 'a' });
    s = r.state;
    expect(bondState({ s, now: T0 }, 'cassian').xp + bondState({ s, now: T0 }, 'cassian').lvl * 1000).toBeGreaterThanOrEqual(CAMP_BOND.favored);
    expect(bondState({ s, now: T0 }, 'lira').xp).toBe(CAMP_BOND.other);
    expect(campfireState({ s, now: T0 }).done).toBe(true);
    expect(campfireScene({ s, now: T0 })!.id).toBe('cassian_lira');
    expect(() => act(s, { type: 'camp.talk', choice: 'both' })).toThrow('usedToday');
    // с Кейрой в Легионе у Астрид появляется новая сцена и «Удар в спину» сыгрывается у костра
    s = act(s, { type: 'dev.hero', id: 'keira', lvl: 5 }).state;
    const next = campfireScene({ s, now: T0 + 86400000 })!;
    expect(next.id).not.toBe('cassian_lira');
    const before = s.counters['combo:backstab'] ?? 0;
    let day = 1;
    while (campfireScene({ s, now: T0 + day * 86400000 })!.id !== 'cassian_keira' && day < 10) {
      s = act(s, { type: 'camp.talk', choice: 'both' }, T0 + day * 86400000).state;
      day++;
    }
    s = act(s, { type: 'camp.talk', choice: 'both' }, T0 + day * 86400000).state;
    expect(s.counters['combo:backstab']).toBe(before + CAMP_MASTERY);
    expect(s.counters.campfire).toBeGreaterThanOrEqual(2);
  });
});

describe('фансервис: адъютант, модный день', () => {
  const D = { cfg, dev: true };
  const act = (s: PlayerState, a: Record<string, unknown>, now = T0) => applyAction(s, { type: 'x', ...a } as never, { cfg, now });

  it('адъютант: по умолчанию первый в Легионе; только свои герои и доступные наряды', () => {
    let s = fresh();
    expect(adjutantState({ s, now: T0 })?.hero).toBe(Object.keys(s.heroines)[0]);
    expect(() => act(s, { type: 'adj.set', hero: 'keira' })).toThrow('notOwned');
    expect(() => act(s, { type: 'adj.set', hero: 'lira', skin: 'lira_beach' })).toThrow('noSkin');
    // купальник для источников доступен всегда, пижама — с близости 5
    s = act(s, { type: 'adj.set', hero: 'lira', skin: BOND_SPA_SKIN.lira }).state;
    expect(s.adjutant).toMatchObject({ hero: 'lira', skin: BOND_SPA_SKIN.lira });
    expect(adjutantSkins(s, 'lira')).not.toContain(BOND_SLEEP_SKIN.lira);
    s = applyAction(s, { type: 'dev.skins' }, { ...D, now: T0 }).state;
    s = act(s, { type: 'adj.set', hero: 'lira', skin: 'lira_beach' }).state;
    expect(adjutantState({ s, now: T0 })?.skin).toBe('lira_beach');
    s = act(s, { type: 'adj.set', hero: 'cassian', skin: null }).state;
    expect(adjutantState({ s, now: T0 })).toMatchObject({ hero: 'cassian', skin: undefined });
  });

  it('адъютант: первые касания за день дают близость, потом — только реакция', () => {
    let s = act(fresh(), { type: 'adj.set', hero: 'lira' }).state;
    const xp0 = bondState({ s, now: T0 }, 'lira').xp;
    for (let i = 0; i < ADJ_PATS; i++) s = act(s, { type: 'adj.pat', zone: i % 2 ? 'head' : 'body' }).state;
    expect(bondState({ s, now: T0 }, 'lira').xp + bondState({ s, now: T0 }, 'lira').lvl * 1000).toBeGreaterThanOrEqual(xp0 + ADJ_PATS * ADJ_PAT_BOND);
    expect(() => act(s, { type: 'adj.pat', zone: 'head' })).toThrow('usedToday');
    expect(() => act(s, { type: 'adj.pat', zone: 'feet' }, T0 + 86400000)).toThrow('badParam');
    // новый день — снова можно
    s = act(s, { type: 'adj.pat', zone: 'head' }, T0 + 86400000).state;
    expect(s.adjutant?.pats).toBe(1);
  });

  it('модный день: тема по дню недели, облик из коллекции дня — +10% к силе', () => {
    expect(fashionOfDay('2026-10-04')).toBe('any'); // воскресенье
    expect(fashionOfDay('2026-10-05')).toBe('summer'); // понедельник
    expect(fashionOfDay('2026-10-06')).toBe('lingerie');
    expect(fashionOfDay('2026-10-07')).toBe('masquerade');
    expect(fashionFits('lira_beach', 'summer')).toBe(true);
    expect(fashionFits('lira_beach', 'lingerie')).toBe(false);
    expect(fashionFits('lira_beach', 'any')).toBe(true);
    expect(fashionFits(undefined, 'any')).toBe(false);
    let s = applyAction(fresh(), { type: 'dev.skins' }, { ...D, now: T0 }).state;
    s = act(s, { type: 'hero.skin', id: 'lira', skin: 'lira_beach' }).state;
    const at = (day: string) => buildHeroine(cfg, { ...s, day: { ...s.day, key: day } }, s.heroines.lira).stats.atk;
    // понедельник (Пляжный день) против вторника (Будуар)
    expect(at('2026-10-05') / at('2026-10-06')).toBeCloseTo((1 + 0.03 + FASHION_BONUS) / 1.03, 1);
    expect(at('2026-10-05')).toBeGreaterThan(at('2026-10-06'));
  });
});
