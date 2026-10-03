import type { Config } from '../../config';
import {
  ACTS,
  DUNGEON_DAY_BONUS,
  DUNGEON_LEVELS,
  DUNGEON_MAP,
  DUNGEONS,
  ENEMY_MAP,
  RAID_COLOSSUS,
  RAID_HP,
  RAID_TIERS,
  SKINS,
  TOWER_SKIN_EVERY,
  dungeonOfDay,
  dungeonReward,
  raidElement,
  towerLevel,
  towerMod,
  towerReward,
} from '../../content';
import { Rng, mixSeed } from '../../rng';
import type { PlayerState, RaidState } from '../../types';
import type { Action } from '../apply';
import type { CombatUnitInit } from '../combat';
import { addItem, assert, give, goldPerMin, requireUnlocked, rollLoot, track, trackMax, vInt, vOneOf, xpPerMin, type Ctx } from '../core';
import { dayKey, weekKey } from '../state';
import { customEnemies, enemyStats, enemyUnit, heroUnits, modEnemies } from '../units';
import { currentParty, runBattle, stripRaw } from './campaign';

// ——— Башня ———

/** Враги этажа: каждый 10-й — владычица, каждый 5-й — мини-босс, иначе элитная тройка. */
export function towerEnemies(cfg: Config, floor: number): CombatUnitInit[] {
  const lvl = towerLevel(floor);
  const act = ACTS[(Math.floor((floor - 1) / 10) % ACTS.length)];
  const rng = new Rng(mixSeed(floor, 0x70e7));
  let units: CombatUnitInit[];
  if (floor % 10 === 0) units = [enemyUnit(cfg, act.boss, lvl, 'boss', 0), enemyUnit(cfg, rng.pick(act.enemies), lvl, 'normal', 1, { delay: 400 })];
  else if (floor % 5 === 0) units = [enemyUnit(cfg, rng.pick(act.minis), lvl, 'mini', 0), ...[1, 2].map((i) => enemyUnit(cfg, rng.pick(act.enemies), lvl, 'normal', i, { delay: 300 * i }))];
  else units = [enemyUnit(cfg, rng.pick(act.enemies), lvl, 'elite', 0), ...[1, 2, 3].map((i) => enemyUnit(cfg, rng.pick(act.enemies), lvl, 'normal', i, { delay: 250 * i }))];
  return modEnemies(units, towerMod(floor)?.enemy);
}

/** Облик-награда этажа (каждый 25-й, по порядку из пула 'tower'). */
export function towerSkin(floor: number): string | null {
  if (floor % TOWER_SKIN_EVERY !== 0) return null;
  const pool = SKINS.filter((x) => x.source === 'tower');
  return pool[floor / TOWER_SKIN_EVERY - 1]?.id ?? null;
}

// ——— Подземелья ———

export function dungeonKeysLeft(ctx: Pick<Ctx, 'cfg' | 's'>, id: string): number {
  return ctx.cfg.modes.dungeonKeys - (ctx.s.day.keys[id] ?? 0);
}

export function dungeonEnemies(cfg: Config, id: string, tier: number): CombatUnitInit[] {
  const lvl = DUNGEON_LEVELS[tier - 1];
  const act = ACTS[DUNGEON_MAP[id].act - 1];
  const rng = new Rng(mixSeed(tier, id.length, 0xd0d0));
  const list = [
    { id: rng.pick(act.minis), tier: 'mini' as const },
    { id: rng.pick(act.enemies) },
    { id: rng.pick(act.enemies) },
    { id: rng.pick(act.enemies) },
  ];
  return customEnemies(cfg, lvl, list);
}

/** Награда ступени (с бонусом подземелья дня). */
export function dungeonPrize(cfg: Config, s: PlayerState, id: string, tier: number, now: number): { gold?: number; xp?: number; books?: number; steel?: number; items: number } {
  const r = dungeonReward(id as 'gold', tier);
  const L = DUNGEON_LEVELS[tier - 1];
  const k = dungeonOfDay(now) === id ? DUNGEON_DAY_BONUS : 1;
  const out: { gold?: number; xp?: number; books?: number; steel?: number; items: number } = { items: r.items ?? 0 };
  if (r.goldMin) out.gold = Math.floor(goldPerMin(cfg, s, L) * r.goldMin * k);
  if (r.xpMin) out.xp = Math.floor(xpPerMin(cfg, s, L) * r.xpMin * k);
  if (r.books) out.books = Math.floor(r.books * k);
  if (r.steel) out.steel = Math.floor(r.steel * k);
  return out;
}

function grantDungeon(ctx: Ctx, id: string, tier: number) {
  const prize = dungeonPrize(ctx.cfg, ctx.s, id, tier, ctx.now);
  const { items: n, ...cur } = prize;
  give(ctx, cur);
  const items: string[] = [];
  for (let i = 0; i < n; i++) {
    const uid = addItem(ctx, rollLoot(ctx, { lvl: DUNGEON_LEVELS[tier - 1], minRarity: 2 }));
    if (uid) items.push(uid);
  }
  track(ctx, 'dungeon', 1);
  return { cur, items };
}

// ——— Колосс ———

export function raidState(ctx: { s: PlayerState; now: number }): RaidState {
  const day = dayKey(ctx.now);
  const week = weekKey(ctx.now);
  const r = ctx.s.modes.raid;
  if (!r) return { day, used: 0, bestDay: 0, week, bestWeek: 0, best: 0, tiers: [] };
  return {
    ...r,
    day,
    used: r.day === day ? r.used : 0,
    bestDay: r.day === day ? r.bestDay : 0,
    tiers: r.day === day ? r.tiers : [],
    week,
    bestWeek: r.week === week ? r.bestWeek : 0,
  };
}

/** Уровень колосса растёт с походом. */
export function raidLevel(s: PlayerState): number {
  return Math.max(10, s.progress.stage);
}

/** Колосс дня: юнит и его полное здоровье. */
export function raidBoss(cfg: Config, s: PlayerState, now: number): { unit: CombatUnitInit; hp: number; id: string } {
  const id = RAID_COLOSSUS[raidElement(now)];
  const lvl = raidLevel(s);
  const unit = enemyUnit(cfg, id, lvl, 'boss', 0, { walkIn: true });
  const base = enemyStats(cfg, ENEMY_MAP[id], lvl, 'normal').hp;
  const hp = Math.round(base * RAID_HP);
  unit.stats = { ...unit.stats, hp };
  return { unit, hp, id };
}

export const modeActions = {
  'tower.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'tower');
    const floor = s.modes.tower + 1;
    const b = runBattle(ctx, towerEnemies(cfg, floor), heroUnits(cfg, s, currentParty(ctx), { mod: towerMod(floor)?.hero }), cfg.modes.towerTime);
    if (!b.win) return { battle: stripRaw(b), floor, win: false };
    s.modes.tower = floor;
    track(ctx, 'towerWin', 1);
    trackMax(ctx, 'towerFloor', floor);
    const r = towerReward(floor);
    give(ctx, r.cur);
    const items: string[] = [];
    if (r.item) {
      const uid = addItem(ctx, rollLoot(ctx, { lvl: towerLevel(floor), rarity: r.item }), { keep: true });
      if (uid) items.push(uid);
    }
    const skin = towerSkin(floor);
    if (skin && !s.skins.includes(skin)) s.skins.push(skin);
    return { battle: stripRaw(b), floor, win: true, rewards: { cur: r.cur, items, skin } };
  },

  'dungeon.fight': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'dungeons');
    const id = vOneOf(a.id, DUNGEONS.map((d) => d.id), 'id');
    const best = s.modes.dungeons[id] ?? 0;
    const tier = vInt(a.tier, 1, Math.min(cfg.modes.dungeonTiers, best + 1), 'tier');
    assert(dungeonKeysLeft(ctx, id) > 0, 'noKeys');
    const b = runBattle(ctx, dungeonEnemies(cfg, id, tier), heroUnits(cfg, s, currentParty(ctx)), cfg.modes.dungeonTime);
    if (!b.win) return { battle: stripRaw(b), win: false };
    s.day.keys[id] = (s.day.keys[id] ?? 0) + 1;
    if (tier > best) s.modes.dungeons[id] = tier;
    return { battle: stripRaw(b), win: true, rewards: grantDungeon(ctx, id, tier) };
  },

  /** Зачистка пройденной ступени без боя. */
  'dungeon.sweep': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    requireUnlocked(ctx, 'dungeons');
    const id = vOneOf(a.id, DUNGEONS.map((d) => d.id), 'id');
    const best = s.modes.dungeons[id] ?? 0;
    assert(best > 0, 'notCleared');
    const tier = a.tier === undefined ? best : vInt(a.tier, 1, best, 'tier');
    assert(dungeonKeysLeft(ctx, id) > 0, 'noKeys');
    s.day.keys[id] = (s.day.keys[id] ?? 0) + 1;
    return { rewards: grantDungeon(ctx, id, tier) };
  },

  /** Колосс: бой на урон 60 с; новые пороги урона за день дают награды. */
  'raid.fight': (ctx: Ctx) => {
    const { s, cfg, now } = ctx;
    requireUnlocked(ctx, 'raid');
    const r = raidState(ctx);
    assert(r.used < cfg.modes.raidAttempts, 'usedToday');
    const boss = raidBoss(cfg, s, now);
    const b = runBattle(ctx, [boss.unit], heroUnits(cfg, s, currentParty(ctx)), cfg.modes.raidTime, { endless: true });
    const dmg = Math.min(boss.hp, b.dmg);
    const share = dmg / boss.hp;
    r.used++;
    r.bestDay = Math.max(r.bestDay, dmg);
    r.bestWeek = Math.max(r.bestWeek, dmg);
    r.best = Math.max(r.best, dmg);
    const cur: Record<string, number> = {};
    RAID_TIERS.forEach((tier, i) => {
      if (share >= tier.at && !r.tiers.includes(i)) {
        r.tiers.push(i);
        for (const [k, v] of Object.entries(tier.cur)) cur[k] = (cur[k] ?? 0) + (v ?? 0);
      }
    });
    give(ctx, cur);
    s.modes.raid = r;
    track(ctx, 'raid', 1);
    return { battle: stripRaw(b), dmg, share, hp: boss.hp, rewards: { cur } };
  },
};
