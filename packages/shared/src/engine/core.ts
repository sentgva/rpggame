import type { Config } from '../config';
import { ACHIEVEMENTS, HEROINE_MAP, STAGES_PER_CIRCLE, stageRef } from '../content';
import { Rng } from '../rng';
import type { Currency, GameEvent, Item, PlayerState, Reward } from '../types';
import { CURRENCIES } from '../types';
import type { CombatInput } from './combat';
import { generateItem, type LootOpts } from './loot';
import { accountXpToNext, bannerValue, equippedIndex, growth, inventoryCap, itemPower, legionMaxLevel, levelCost } from './stats';

export class GameError extends Error {
  constructor(
    public code: string,
    public params: Record<string, string | number> = {},
  ) {
    super(code);
  }
}

export interface Ctx {
  s: PlayerState;
  cfg: Config;
  now: number;
  rng: Rng;
  dev: boolean;
  server: boolean;
  events: GameEvent[];
  /** Ручное управление боем этого действия: ульты и щит по командам игрока. */
  control?: { manual: boolean; inputs: CombatInput[] };
}

export function assert(cond: unknown, code: string, params?: Record<string, string | number>): asserts cond {
  if (!cond) throw new GameError(code, params);
}

// ——— валидация параметров действий ———
export function vStr(v: unknown, name = 'param'): string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 64) throw new GameError('badParam', { name });
  return v;
}
export function vInt(v: unknown, min: number, max: number, name = 'param'): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new GameError('badParam', { name });
  return v;
}
export function vBool(v: unknown, name = 'param'): boolean {
  if (typeof v !== 'boolean') throw new GameError('badParam', { name });
  return v;
}
export function vOneOf<T extends string>(v: unknown, list: readonly T[], name = 'param'): T {
  if (typeof v !== 'string' || !list.includes(v as T)) throw new GameError('badParam', { name });
  return v as T;
}
export function vStrArr(v: unknown, maxLen: number, name = 'param'): string[] {
  if (!Array.isArray(v) || v.length > maxLen) throw new GameError('badParam', { name });
  return v.map((x) => vStr(x, name));
}

// ——— валюты ———
export function spend(ctx: Ctx, cost: Partial<Record<Currency, number>>) {
  for (const [c, v] of Object.entries(cost)) {
    const need = Math.ceil(v ?? 0);
    if (need <= 0) continue;
    if ((ctx.s.cur[c as Currency] ?? 0) < need) throw new GameError('notEnough', { cur: c });
  }
  for (const [c, v] of Object.entries(cost)) {
    const need = Math.ceil(v ?? 0);
    if (need > 0) ctx.s.cur[c as Currency] -= need;
  }
}

export function canAfford(s: PlayerState, cost: Partial<Record<Currency, number>>): boolean {
  return Object.entries(cost).every(([c, v]) => (s.cur[c as Currency] ?? 0) >= Math.ceil(v ?? 0));
}

export function give(ctx: Ctx, cur: Partial<Record<Currency, number>>) {
  for (const [c, v] of Object.entries(cur)) {
    if (!CURRENCIES.includes(c as Currency)) continue;
    const add = Math.floor(v ?? 0);
    if (add <= 0) continue;
    ctx.s.cur[c as Currency] = (ctx.s.cur[c as Currency] ?? 0) + add;
    if (c === 'gold') track(ctx, 'goldEarned', add);
  }
}

// ——— доход ———

/** Этап, который отряд фармит в сундук (последний пройденный). */
export function farmStage(s: PlayerState): number {
  return Math.max(1, s.progress.stage);
}

/** Уровень силы фарма: от него зависят доход и уровень вещей. */
export function farmLevel(_cfg: Config, s: PlayerState): number {
  return farmStage(s);
}

export function goldPerMin(cfg: Config, s: PlayerState, L = farmLevel(cfg, s)): number {
  return cfg.income.goldBase * growth(cfg, L) * (1 + bannerValue(s, 'gold'));
}

export function xpPerMin(cfg: Config, s: PlayerState, L = farmLevel(cfg, s)): number {
  return cfg.income.xpBase * growth(cfg, L) * (1 + bannerValue(s, 'xp'));
}

export function accXpPerMin(cfg: Config, s: PlayerState): number {
  return cfg.income.accXpPerMin * (1 + farmLevel(cfg, s) / 60);
}

export function steelPerMin(cfg: Config, s: PlayerState): number {
  return (cfg.income.steelPerHour / 60) * (1 + farmLevel(cfg, s) / 150);
}

/** Лимит накопления сундука (мин): 12 ч + «Привал» Знамени. */
export function capMinutes(cfg: Config, s: PlayerState, _now?: number): number {
  return cfg.income.capHours * 60 + bannerValue(s, 'chest');
}

export function x2Active(s: PlayerState, now: number): boolean {
  return s.boosts.x2Until > now;
}

/** Начислить в сундук доход за прошедшее время (онлайн и офлайн одинаково). */
export function settleChest(ctx: Ctx) {
  const { s, cfg, now } = ctx;
  const since = s.chest.since;
  if (now <= since) return;
  const realMin = (now - since) / 60000;
  const x2Min = Math.max(0, Math.min(now, s.boosts.x2Until) - since) / 60000;
  let eff = realMin + Math.min(realMin, x2Min);
  const cap = capMinutes(cfg, s, now);
  eff = Math.min(eff, Math.max(0, cap - s.chest.minutes));
  s.chest.since = now;
  if (eff <= 0) return;
  s.chest.minutes += eff;
  s.chest.itemMin += eff;
  s.chest.gold += goldPerMin(cfg, s) * eff;
  s.chest.xp += xpPerMin(cfg, s) * eff;
  s.chest.accXp += accXpPerMin(cfg, s) * eff;
  s.chest.steel += steelPerMin(cfg, s) * eff;
}

// ——— предметы ———

export function newUid(s: PlayerState): string {
  return `i${(s.uidCounter++).toString(36)}`;
}

export function inventoryCount(s: PlayerState): number {
  return Object.keys(s.items).length;
}

/** Удача добычи: круг похода и Знамя. */
export function lootLuck(s: PlayerState, cfg: Config): number {
  const circle = Math.min(2, Math.floor((farmStage(s) - 1) / STAGES_PER_CIRCLE));
  return cfg.gear.circleShift[circle] + bannerValue(s, 'loot');
}

export function rollLoot(ctx: Ctx, o: Partial<LootOpts> & { lvl?: number } = {}): Item {
  const { s, cfg } = ctx;
  return generateItem(cfg, ctx.rng, newUid(s), { ...o, lvl: o.lvl ?? farmLevel(cfg, s), luck: o.luck ?? lootLuck(s, cfg), maxRarity: o.maxRarity ?? 4 });
}

/** Сталь и золото за разбор. */
export function salvageGain(cfg: Config, s: PlayerState, item: Item): { steel: number; gold: number } {
  const steel = Math.floor(cfg.gear.salvageSteel[item.rarity] * (1 + item.lvl / 300) + item.enh * item.enh * cfg.gear.enhSteel * 0.5);
  const gold = Math.floor(goldPerMin(cfg, s, item.lvl) * cfg.gear.salvageGoldMin * (1 + item.rarity));
  return { steel, gold };
}

export function salvageItem(ctx: Ctx, item: Item) {
  give(ctx, salvageGain(ctx.cfg, ctx.s, item));
  track(ctx, 'salvage', 1);
}

/**
 * Положить предмет в сумку: авторазбор ниже порога редкости; если сумка полна — разбирается самая
 * слабая свободная вещь (или новая, если она слабее). Возвращает uid или null, если вещь разобрана.
 */
export function addItem(ctx: Ctx, item: Item, opts: { keep?: boolean } = {}): string | null {
  const { s, cfg } = ctx;
  if (item.rarity >= 4) track(ctx, 'legendaryFound', 1);
  const auto = !opts.keep && s.settings.autoSalvage >= 0 && item.rarity < s.settings.autoSalvage;
  if (auto) {
    salvageItem(ctx, item);
    return null;
  }
  if (inventoryCount(s) >= inventoryCap(cfg, s)) {
    const weakest = weakestFreeItem(ctx);
    if (weakest && itemPower(cfg, weakest) < itemPower(cfg, item)) {
      salvageItem(ctx, weakest);
      delete s.items[weakest.uid];
    } else {
      salvageItem(ctx, item);
      return null;
    }
  }
  s.items[item.uid] = item;
  return item.uid;
}

/** Самая слабая вещь, которую можно разобрать без потерь: не надета, не закреплена, не заточена. */
function weakestFreeItem(ctx: Ctx): Item | null {
  const { s, cfg } = ctx;
  const idx = equippedIndex(s);
  let best: Item | null = null;
  let bestP = Infinity;
  for (const it of Object.values(s.items)) {
    if (idx[it.uid] || it.lock || it.enh > 0) continue;
    const p = itemPower(cfg, it);
    if (p < bestP) {
      best = it;
      bestP = p;
    }
  }
  return best;
}

// ——— Легион ———

export function addHeroine(ctx: Ctx, id: string): boolean {
  const { s } = ctx;
  if (s.heroines[id] || !HEROINE_MAP[id]) return false;
  s.heroines[id] = { id, rank: 1, skill: 1, ult: 1, gear: {} };
  ctx.events.push({ name: 'hero_join', props: { hero: id } });
  return true;
}

/** Поднять уровень Легиона на n (пока хватает золота и опыта). Возвращает, на сколько поднялся. */
export function levelUpLegion(ctx: Ctx, n: number): number {
  const { s, cfg } = ctx;
  let done = 0;
  const max = legionMaxLevel(cfg);
  while (done < n && s.legion.lvl < max) {
    const c = levelCost(cfg, s.legion.lvl);
    if (s.cur.gold < c.gold || s.cur.xp < c.xp) break;
    s.cur.gold -= c.gold;
    s.cur.xp -= c.xp;
    s.legion.lvl++;
    done++;
  }
  if (done) {
    track(ctx, 'legionLevel', done);
    trackMax(ctx, 'legionLevelMax', s.legion.lvl);
  }
  return done;
}

// ——— аккаунт ———

export function addAccountXp(ctx: Ctx, amount: number) {
  const { s, cfg } = ctx;
  s.account.xp += Math.floor(amount);
  while (s.account.lvl < cfg.account.maxLevel) {
    const need = accountXpToNext(cfg, s.account.lvl);
    if (s.account.xp < need) break;
    s.account.xp -= need;
    s.account.lvl++;
    if (s.account.lvl % 5 === 0) give(ctx, { crystals: cfg.account.crystalsPer5 * (1 + Math.floor(s.account.lvl / 50)) });
    ctx.events.push({ name: 'account_level', props: { lvl: s.account.lvl } });
  }
  if (s.account.lvl >= cfg.account.maxLevel) s.account.xp = 0;
}

// ——— счётчики, задания ———

export function track(ctx: Ctx, key: string, n = 1) {
  const { s } = ctx;
  s.counters[key] = (s.counters[key] ?? 0) + n;
  s.quests.daily[key] = (s.quests.daily[key] ?? 0) + n;
  s.quests.weekly[key] = (s.quests.weekly[key] ?? 0) + n;
}

export function trackMax(ctx: Ctx, key: string, v: number) {
  if ((ctx.s.counters[key] ?? 0) < v) ctx.s.counters[key] = v;
}

/** Значение метрики для достижений. */
export function metric(s: PlayerState, key: string): number {
  switch (key) {
    case 'maxStage':
      return s.progress.stage;
    case 'legionLevel':
      return s.legion.lvl;
    case 'heroCount':
      return Object.keys(s.heroines).length;
    case 'rankTotal':
      return Object.values(s.heroines).reduce((n, h) => n + h.rank, 0);
    case 'towerFloor':
      return s.modes.tower;
    case 'loginDays':
      return s.quests.login.total;
    case 'accountLevel':
      return s.account.lvl;
    default:
      return s.counters[key] ?? 0;
  }
}

export function achievementClaimable(s: PlayerState): number {
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    const claimed = s.achievements[a.id] ?? 0;
    const v = metric(s, a.metric);
    for (let i = claimed; i < a.tiers.length; i++) if (v >= a.tiers[i]) n++;
  }
  return n;
}

// ——— награды ———

/** Золото и опыт в наградах контента заданы в «минутах дохода» текущего этапа. */
export function scaleReward(cfg: Config, s: PlayerState, cur: Partial<Record<Currency, number>>): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = { ...cur };
  if (cur.gold) out.gold = Math.floor(cur.gold * goldPerMin(cfg, s));
  if (cur.xp) out.xp = Math.floor(cur.xp * xpPerMin(cfg, s));
  return out;
}

export function grantReward(ctx: Ctx, r: Reward): Reward {
  const out: Reward = {};
  if (r.cur) {
    give(ctx, r.cur);
    out.cur = r.cur;
  }
  if (r.heroes) {
    for (const id of r.heroes) addHeroine(ctx, id);
    out.heroes = r.heroes;
  }
  if (r.items) {
    out.items = [];
    for (const it of r.items) {
      const item = { ...it, uid: newUid(ctx.s) };
      if (addItem(ctx, item, { keep: true })) out.items.push(item);
    }
  }
  if (r.skins) {
    for (const sk of r.skins) if (!ctx.s.skins.includes(sk)) ctx.s.skins.push(sk);
    out.skins = r.skins;
  }
  if (r.accXp) addAccountXp(ctx, r.accXp);
  return out;
}

export function isUnlocked(ctx: Ctx | { s: PlayerState; cfg: Config }, feature: string): boolean {
  const { s, cfg } = ctx;
  if (s.dev.unlockAll) return true;
  const byStage = (cfg.unlocks.stage as Record<string, number>)[feature];
  if (byStage !== undefined) return s.progress.stage + 1 >= byStage;
  const byLevel = (cfg.unlocks.level as Record<string, number>)[feature];
  if (byLevel !== undefined) return s.account.lvl >= byLevel;
  return true;
}

export function requireUnlocked(ctx: Ctx, feature: string) {
  assert(isUnlocked(ctx, feature), 'locked', { feature });
}

/** Подпись этапа n для уведомлений. */
export function stageOf(n: number) {
  return stageRef(Math.max(1, n));
}

export { equippedIndex };
