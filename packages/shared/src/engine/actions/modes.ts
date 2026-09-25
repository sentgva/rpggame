import {
  ACTS,
  ARENA_BOT_NAMES,
  DUNGEON_MAP,
  EXPEDITION_MAP,
  EXPEDITION_QUESTS,
  GEM_TYPES,
  HEROINE_MAP,
  LAB_BUFFS,
  LAB_FLOORS,
  LAB_STEPS,
  RELICS,
  RELIC_MAP,
  SUMMON_POOL,
  TOWER_SKIN_FLOORS,
  abyssStage,
  dungeonStage,
  gemKey,
  towerStage,
} from '../../content';
import { Rng, hashStr, mixSeed } from '../../rng';
import type { ArenaOpponent, HeroineState, LabyrinthRun, SpecialEffect, Stats } from '../../types';
import type { Action } from '../apply';
import type { UnitInit } from '../battle';
import {
  assert,
  farmLevel,
  give,
  goldPerMin,
  requireUnlocked,
  scaleReward,
  spend,
  track,
  trackMax,
  vInt,
  vStr,
  vStrArr,
  xpPerMin,
  type Ctx,
} from '../core';
import { dayKey, weekKey } from '../state';
import { activeParty, addStats, buildHeroine, partyPower } from '../stats';
import { customEnemies, heroUnits } from '../units';
import { currentParty, runBattle, stripRaw } from './battle';
import { onExpedition } from './heroes';

// ——— подземелья ———

export function dungeonReward(ctx: Pick<Ctx, 'cfg' | 's'>, id: string, level: number) {
  const { cfg, s } = ctx;
  const n = dungeonStage(level);
  const def = DUNGEON_MAP[id];
  switch (def.reward) {
    case 'gold':
      return { cur: { gold: Math.floor(goldPerMin(cfg, s, n) * 90) } };
    case 'xp':
      return { cur: { xp: Math.floor(xpPerMin(cfg, s, n) * 90) } };
    case 'dust':
      return { cur: { dust: Math.floor(40 + 25 * Math.pow(level, 1.4)) } };
    case 'starDust':
      return { cur: { starDust: Math.floor(15 + 12 * level) } };
    default: {
      const lvl = Math.min(8, 1 + Math.floor((level - 1) / 3));
      return { gems: { count: 2 + Math.floor(level / 5), lvl } };
    }
  }
}

function grantDungeon(ctx: Ctx, id: string, level: number) {
  const r = dungeonReward(ctx, id, level);
  if ('cur' in r && r.cur) {
    give(ctx, r.cur);
    return { cur: r.cur };
  }
  const gems: Record<string, number> = {};
  const g = (r as { gems: { count: number; lvl: number } }).gems;
  for (let i = 0; i < g.count; i++) {
    const key = gemKey(GEM_TYPES[ctx.rng.int(GEM_TYPES.length)], g.lvl);
    gems[key] = (gems[key] ?? 0) + 1;
    ctx.s.gems[key] = (ctx.s.gems[key] ?? 0) + 1;
  }
  return { gems };
}

function dungeonEnemies(ctx: Ctx, id: string, level: number): UnitInit[] {
  const def = DUNGEON_MAP[id];
  const rng = new Rng(mixSeed(hashStr(id), level));
  const list = [
    { id: def.boss, tier: 'mini' as const },
    { id: rng.pick(def.enemies), tier: 'normal' as const },
    { id: rng.pick(def.enemies), tier: 'normal' as const },
    { id: rng.pick(def.enemies), tier: 'normal' as const },
  ];
  return customEnemies(ctx.cfg, dungeonStage(level), list, 0.85);
}

// ——— башня ———

function towerEnemies(ctx: Ctx, floor: number): UnitInit[] {
  const act = ACTS[(floor - 1) % 10];
  const rng = new Rng(mixSeed(floor, 0x70e7));
  const list: { id: string; tier: 'normal' | 'mini' | 'boss' | 'elite' }[] = [];
  if (floor % 10 === 0) {
    const bossAct = ACTS[(Math.floor(floor / 10) - 1) % 10];
    list.push({ id: floor % 50 === 0 ? bossAct.boss : bossAct.minis[(floor / 10) % 3], tier: floor % 50 === 0 ? 'boss' : 'mini' });
  }
  const count = floor % 10 === 0 ? 2 : 4 + (floor > 100 ? 1 : 0);
  for (let i = 0; i < count; i++) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  return customEnemies(ctx.cfg, towerStage(floor), list);
}

export function towerReward(floor: number) {
  const boss = floor % 10 === 0;
  return {
    crystals: (2 + Math.floor(floor / 40)) * (boss ? 4 : 1),
    starDust: Math.floor((5 + floor / 5) * (boss ? 3 : 1)),
    skin: TOWER_SKIN_FLOORS[floor],
  };
}

// ——— экспедиции ———

export function expeditionBoard(ctx: Ctx): string[] {
  const { s, now } = ctx;
  const today = dayKey(now);
  if (s.modes.expeditionBoard.day !== today) {
    const rng = new Rng(mixSeed(hashStr(s.id), hashStr(today)));
    const pool = [...EXPEDITION_QUESTS.map((q) => q.id)];
    rng.shuffle(pool);
    s.modes.expeditionBoard = { day: today, quests: pool.slice(0, 6) };
  }
  return s.modes.expeditionBoard.quests;
}

export function expeditionSlots(ctx: Pick<Ctx, 'cfg' | 's'>): number {
  let n = 3;
  for (const [lvl, slots] of ctx.cfg.modes.expeditionSlots) if (ctx.s.account.lvl >= lvl) n = slots;
  return n;
}

// ——— лабиринт ———

function labNodeOptions(rng: Rng, step: number): string[] {
  if (step === LAB_STEPS - 1) return ['boss'];
  const kinds = ['fight', 'fight', 'elite', 'shrine', 'relic', 'spring', 'treasure'];
  const out = new Set<string>();
  while (out.size < 3) out.add(rng.pick(kinds));
  return [...out];
}

function labExtras(run: LabyrinthRun): { extra: Stats; extraFx: SpecialEffect[] } {
  const extra: Stats = { ...run.buffs };
  const extraFx: SpecialEffect[] = [];
  for (const r of run.relics) {
    const def = RELIC_MAP[r];
    if (!def) continue;
    addStats(extra, def.stats);
    if (def.fx) extraFx.push(def.fx);
  }
  return { extra, extraFx };
}

function labEnemies(ctx: Ctx, run: LabyrinthRun, kind: string): UnitInit[] {
  const rng = new Rng(mixSeed(run.seed, run.floor, run.node, 0x1ab));
  const L = farmLevel(ctx.cfg, ctx.s);
  const n = Math.max(10, Math.floor(L * 0.92) + run.floor * 3 + run.node);
  const act = ACTS[rng.int(Math.max(1, Math.min(10, Math.ceil(Math.min(200, L) / 20))))];
  const list: { id: string; tier: 'normal' | 'elite' | 'mini' | 'boss' }[] = [];
  if (kind === 'boss') list.push({ id: run.floor === LAB_FLOORS - 1 ? act.boss : act.minis[run.floor % 3], tier: run.floor === LAB_FLOORS - 1 ? 'boss' : 'mini' });
  if (kind === 'elite') list.push({ id: rng.pick(act.enemies), tier: 'elite' });
  const count = kind === 'fight' ? 4 : 2;
  for (let i = 0; i < count; i++) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  return customEnemies(ctx.cfg, n, list, kind === 'boss' ? 0.6 : 0.8);
}

function labAdvance(ctx: Ctx, run: LabyrinthRun) {
  run.node++;
  if (run.node >= LAB_STEPS) {
    run.node = 0;
    run.floor++;
  }
  if (run.floor >= LAB_FLOORS) {
    run.done = true;
    run.won = true;
    const coins = 300 + run.coins;
    give(ctx, { labCoins: coins, crystals: 150 });
    track(ctx, 'labWin', 1);
    ctx.s.modes.labBest = Math.max(ctx.s.modes.labBest, LAB_FLOORS);
    return;
  }
  const rng = new Rng(mixSeed(run.seed, run.floor, run.node));
  run.choices = labNodeOptions(rng, run.node);
}

// ——— арена ———

function botTeam(rng: Rng): { id: string; lvl: number; stars: number }[] {
  const pool = [...SUMMON_POOL.R, ...SUMMON_POOL.SR, ...SUMMON_POOL.SSR, ...SUMMON_POOL.UR];
  rng.shuffle(pool);
  return pool.slice(0, 5).map((id) => ({ id, lvl: 1, stars: 1 }));
}

export function arenaOpponents(ctx: Ctx, force = false): ArenaOpponent[] {
  const { s, cfg, now } = ctx;
  const today = dayKey(now);
  if (!force && s.modes.arena.refreshDay === today && s.modes.arena.opponents.length) return s.modes.arena.opponents;
  const myPower = Math.max(1000, partyPower(cfg, s));
  const rating = s.modes.arena.rating;
  const opps: ArenaOpponent[] = [];
  for (let i = 0; i < 3; i++) {
    const seed = ctx.rng.fork();
    const rng = new Rng(seed);
    const f = [0.8, 0.95, 1.12][i] * rng.float(0.95, 1.05);
    opps.push({
      id: `bot${seed.toString(36)}`,
      name: `${rng.pick(ARENA_BOT_NAMES)}${rng.int(90) + 10}`,
      rating: Math.max(0, Math.round(rating + (i - 1) * 60 + rng.range(-20, 20))),
      power: Math.round(myPower * f),
      seed,
      team: botTeam(rng),
    });
  }
  s.modes.arena.opponents = opps;
  s.modes.arena.refreshDay = today;
  return opps;
}

/** Юниты бота арены: героини без снаряжения, масштабированные до заданной силы. */
function arenaUnits(ctx: Ctx, opp: ArenaOpponent): UnitInit[] {
  const { cfg, s } = ctx;
  const fake = { ...s, heroines: {} as Record<string, HeroineState>, items: {}, constellation: 0, ascension: { ...s.ascension, up: {} } };
  const avgLvl = Math.max(1, Math.round(activeParty(s).reduce((sum, id) => sum + s.heroines[id].lvl, 0) / Math.max(1, activeParty(s).length)));
  for (const m of opp.team) fake.heroines[m.id] = { id: m.id, lvl: avgLvl, stars: Math.max(1, cfg.hero.startStars[HEROINE_MAP[m.id].rarity]), tree: {}, skills: [null, null], gear: {} };
  const slots = opp.team.map((m) => m.id);
  const units = heroUnits(cfg, fake as typeof s, slots);
  const raw = opp.team.reduce((sum, m) => sum + buildHeroine(cfg, fake as typeof s, fake.heroines[m.id], { party: slots }).power, 0);
  const k = opp.power / Math.max(1, raw);
  return units.map((u) => ({
    ...u,
    side: 1 as const,
    stats: { ...u.stats, hp: Math.round(u.stats.hp * k), atk: Math.round(u.stats.atk * Math.sqrt(k)), def: Math.round(u.stats.def * Math.sqrt(k)) },
  }));
}

export const modeActions = {
  'dungeon.fight': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'dungeons');
    const id = vStr(a.id, 'id');
    assert(DUNGEON_MAP[id], 'badParam', { name: 'id' });
    const cleared = s.modes.dungeons[id] ?? 0;
    const level = vInt(a.level, 1, Math.min(cfg.modes.dungeonLevels, cleared + 1), 'level');
    assert((s.day.keys[id] ?? 0) < cfg.modes.dungeonKeys, 'noKeys');
    const b = runBattle(ctx, dungeonEnemies(ctx, id, level), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
    let reward = null;
    if (b.win) {
      s.day.keys[id] = (s.day.keys[id] ?? 0) + 1;
      s.modes.dungeons[id] = Math.max(cleared, level);
      reward = grantDungeon(ctx, id, level);
      track(ctx, 'dungeon', 1);
    }
    ctx.events.push({ name: 'dungeon', props: { id, level, win: b.win } });
    return { battle: stripRaw(b), win: b.win, reward };
  },

  /** Повтор-зачистка пройденного уровня без боя. */
  'dungeon.sweep': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'dungeons');
    const id = vStr(a.id, 'id');
    assert(DUNGEON_MAP[id], 'badParam', { name: 'id' });
    const level = vInt(a.level, 1, s.modes.dungeons[id] ?? 0, 'level');
    const times = a.times === undefined ? 1 : vInt(a.times, 1, cfg.modes.dungeonKeys, 'times');
    const left = cfg.modes.dungeonKeys - (s.day.keys[id] ?? 0);
    assert(left >= times, 'noKeys');
    const rewards = [];
    for (let i = 0; i < times; i++) {
      s.day.keys[id] = (s.day.keys[id] ?? 0) + 1;
      rewards.push(grantDungeon(ctx, id, level));
      track(ctx, 'dungeon', 1);
    }
    return { rewards };
  },

  'tower.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'tower');
    const floor = s.modes.tower + 1;
    assert(floor <= cfg.modes.towerFloors, 'maxRank');
    const b = runBattle(ctx, towerEnemies(ctx, floor), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
    let reward = null;
    if (b.win) {
      s.modes.tower = floor;
      const r = towerReward(floor);
      give(ctx, { crystals: r.crystals, starDust: r.starDust });
      if (r.skin && !s.skins.includes(r.skin)) s.skins.push(r.skin);
      reward = r;
      track(ctx, 'towerWin', 1);
    }
    ctx.events.push({ name: 'tower', props: { floor, win: b.win } });
    return { battle: stripRaw(b), win: b.win, floor, reward };
  },

  'abyss.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'abyss');
    const level = s.modes.abyss + 1;
    const n = abyssStage(level);
    const act = ACTS[(level - 1) % 10];
    const rng = new Rng(mixSeed(level, 0xab55));
    const list = [
      { id: level % 5 === 0 ? act.boss : rng.pick(act.enemies), tier: (level % 5 === 0 ? 'boss' : 'elite') as 'boss' | 'elite' },
      { id: rng.pick(act.enemies), tier: 'normal' as const },
      { id: rng.pick(act.enemies), tier: 'normal' as const },
      { id: rng.pick(act.enemies), tier: 'normal' as const },
    ];
    const b = runBattle(ctx, customEnemies(cfg, n, list), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
    let reward = null;
    if (b.win) {
      s.modes.abyss = level;
      const cur = { divineMats: 1 + Math.floor(level / 5), crystals: level % 10 === 0 ? 100 : 10 };
      give(ctx, cur);
      trackMax(ctx, 'abyssBest', level);
      reward = cur;
    }
    return { battle: stripRaw(b), win: b.win, level, reward };
  },

  'expedition.start': (ctx: Ctx, a: Action) => {
    const { s, now } = ctx;
    requireUnlocked(ctx, 'expeditions');
    const questId = vStr(a.quest, 'quest');
    const board = expeditionBoard(ctx);
    assert(board.includes(questId), 'badParam', { name: 'quest' });
    const q = EXPEDITION_MAP[questId];
    assert(s.modes.expeditions.length < expeditionSlots(ctx), 'noSlots');
    const heroes = vStrArr(a.heroes, 3, 'heroes');
    assert(heroes.length === q.heroes && new Set(heroes).size === heroes.length, 'badParam', { name: 'heroes' });
    const party = activeParty(s);
    for (const id of heroes) {
      const h = s.heroines[id];
      assert(h, 'noHero');
      assert(!party.includes(id), 'inParty');
      assert(!onExpedition(ctx, id), 'onExpedition');
      assert(h.stars >= q.minStars, 'requirements');
    }
    if (q.cls) assert(heroes.some((id) => HEROINE_MAP[id].cls === q.cls), 'requirements');
    if (q.element) assert(heroes.some((id) => HEROINE_MAP[id].element === q.element), 'requirements');
    const exp = { id: `e${(s.uidCounter++).toString(36)}`, quest: questId, heroes, start: now, end: now + q.hours * 3600000 };
    s.modes.expeditions.push(exp);
    s.modes.expeditionBoard.quests = board.filter((x) => x !== questId);
    return { expedition: exp };
  },

  'expedition.claim': (ctx: Ctx, a: Action) => {
    const { s, cfg, now } = ctx;
    const id = vStr(a.id, 'id');
    const e = s.modes.expeditions.find((x) => x.id === id);
    assert(e, 'badParam', { name: 'id' });
    assert(now >= e.end, 'notDone');
    const q = EXPEDITION_MAP[e.quest];
    const r = q.reward;
    const cur = scaleReward(cfg, s, { gold: r.gold, forgeMats: r.forgeMats, dust: r.dust, starDust: r.starDust, crystals: r.crystals, scrolls: r.scrolls });
    give(ctx, cur);
    let shards: Record<string, number> | undefined;
    if (r.shards) {
      const hero = e.heroes[ctx.rng.int(e.heroes.length)];
      s.shards[hero] = (s.shards[hero] ?? 0) + r.shards;
      shards = { [hero]: r.shards };
    }
    s.modes.expeditions = s.modes.expeditions.filter((x) => x.id !== id);
    track(ctx, 'expedition', 1);
    return { cur, shards };
  },

  'expedition.cancel': (ctx: Ctx, a: Action) => {
    const id = vStr(a.id, 'id');
    ctx.s.modes.expeditions = ctx.s.modes.expeditions.filter((x) => x.id !== id);
    return {};
  },

  'expedition.board': (ctx: Ctx) => ({ board: expeditionBoard(ctx) }),

  'lab.start': (ctx: Ctx) => {
    const { s, now } = ctx;
    requireUnlocked(ctx, 'labyrinth');
    const week = weekKey(now);
    assert(!s.modes.lab || s.modes.lab.week !== week, 'usedWeek');
    const seed = ctx.rng.fork();
    const party = activeParty(s);
    const run: LabyrinthRun = {
      week,
      floor: 0,
      node: 0,
      choices: [],
      hp: Object.fromEntries(party.map((id) => [id, 1])),
      relics: [],
      buffs: {},
      coins: 0,
      seed,
    };
    run.choices = labNodeOptions(new Rng(mixSeed(seed, 0, 0)), 0);
    s.modes.lab = run;
    return { run };
  },

  'lab.choose': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const run = s.modes.lab;
    assert(run && !run.done && run.week === weekKey(ctx.now), 'noRun');
    assert(!run.pending, 'pickFirst');
    const i = vInt(a.index, 0, run.choices.length - 1, 'index');
    const kind = run.choices[i];
    const rng = new Rng(mixSeed(run.seed, run.floor, run.node, 0xc4));
    if (kind === 'fight' || kind === 'elite' || kind === 'boss') {
      const { extra, extraFx } = labExtras(run);
      const slots = currentParty(ctx).map((id) => (id && run.hp[id] !== undefined ? id : null));
      const heroes = heroUnits(cfg, s, slots, { extra, extraFx, hp: run.hp });
      const b = runBattle(ctx, labEnemies(ctx, run, kind), heroes, cfg.battle.bossTimeLimit);
      for (const [id, hp] of Object.entries(b.heroHp ?? {})) run.hp[id] = hp;
      if (!b.win) {
        run.done = true;
        run.won = false;
        const coins = Math.floor(run.coins / 2) + run.floor * 40;
        give(ctx, { labCoins: coins });
        return { battle: stripRaw(b), win: false, coins };
      }
      run.coins += kind === 'boss' ? 80 : kind === 'elite' ? 50 : 25;
      labAdvance(ctx, run);
      return { battle: stripRaw(b), win: true, run };
    }
    if (kind === 'shrine') {
      const opts = [...LAB_BUFFS.map((x) => x.id)];
      rng.shuffle(opts);
      run.pending = { kind: 'buff', options: opts.slice(0, 3) };
      return { run };
    }
    if (kind === 'relic') {
      const opts = RELICS.map((r) => r.id).filter((id) => !run.relics.includes(id));
      rng.shuffle(opts);
      run.pending = { kind: 'relic', options: opts.slice(0, 3) };
      return { run };
    }
    if (kind === 'spring') {
      for (const id of Object.keys(run.hp)) run.hp[id] = run.hp[id] <= 0 ? 0.3 : Math.min(1, run.hp[id] + 0.4);
    } else if (kind === 'treasure') {
      run.coins += 60;
    }
    labAdvance(ctx, run);
    return { run };
  },

  'lab.pick': (ctx: Ctx, a: Action) => {
    const run = ctx.s.modes.lab;
    assert(run && run.pending && !run.done, 'noRun');
    const i = vInt(a.index, 0, run.pending.options.length - 1, 'index');
    const id = run.pending.options[i];
    if (run.pending.kind === 'relic') run.relics.push(id);
    else addStats(run.buffs, LAB_BUFFS.find((b) => b.id === id)?.stats);
    run.pending = undefined;
    labAdvance(ctx, run);
    return { run };
  },

  'lab.abandon': (ctx: Ctx) => {
    const run = ctx.s.modes.lab;
    assert(run && !run.done, 'noRun');
    run.done = true;
    run.won = false;
    give(ctx, { labCoins: Math.floor(run.coins / 2) });
    return {};
  },

  'arena.opponents': (ctx: Ctx) => {
    requireUnlocked(ctx, 'arena');
    return { opponents: arenaOpponents(ctx) };
  },

  'arena.refresh': (ctx: Ctx) => {
    requireUnlocked(ctx, 'arena');
    spend(ctx, { crystals: 10 });
    return { opponents: arenaOpponents(ctx, true) };
  },

  'arena.fight': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'arena');
    const opps = arenaOpponents(ctx);
    const i = vInt(a.index, 0, opps.length - 1, 'index');
    const limit = cfg.modes.arenaFights + s.day.arenaBought;
    assert(s.day.arena < limit, 'noAttempts');
    s.day.arena++;
    const opp = opps[i];
    const b = runBattle(ctx, arenaUnits(ctx, opp), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
    const ar = s.modes.arena;
    const diff = opp.rating - ar.rating;
    const delta = Math.max(8, Math.min(32, Math.round(20 + diff / 25)));
    if (b.win) {
      ar.rating += delta;
      ar.wins++;
      give(ctx, { arenaTokens: 10 });
      track(ctx, 'arenaWin', 1);
    } else {
      ar.rating = Math.max(0, ar.rating - Math.max(5, Math.round(delta / 2)));
      ar.losses++;
      give(ctx, { arenaTokens: 3 });
    }
    track(ctx, 'arenaFight', 1);
    // заменяем побеждённого соперника новым
    s.modes.arena.opponents = opps;
    arenaOpponents(ctx, true);
    return { battle: stripRaw(b), win: b.win, rating: ar.rating, delta: b.win ? delta : -Math.max(5, Math.round(delta / 2)) };
  },

  'arena.buy': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'arena');
    assert(s.day.arenaBought < 5, 'limitReached');
    spend(ctx, { crystals: cfg.modes.arenaBuyCost });
    s.day.arenaBought++;
    return {};
  },
};
