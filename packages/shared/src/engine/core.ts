import type { Config } from '../config';
import { ACHIEVEMENTS, HEROINE_MAP } from '../content';
import { Rng } from '../rng';
import type { ClassId, Currency, GameEvent, Item, PlayerState, Reward } from '../types';
import { CURRENCIES } from '../types';
import { generateItem, type LootOpts } from './loot';
import { diffOfGlobal, powerLevel } from './units';
import {
  accountXpToNext,
  activeParty,
  ascensionValue,
  constellationStats,
  equippedIndex,
  itemPower,
  goldToNext,
  inventoryCap,
  levelCap,
  xpToNext,
} from './stats';

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

/** Сквозной этап, который отряд фармит (последний пройденный). */
export function farmStage(s: PlayerState): number {
  return Math.max(1, s.progress.maxGlobal);
}

export function goldMult(s: PlayerState, _cfg: Config): number {
  const cons = constellationStats(s.constellation).stats;
  return 1 + (cons.goldPct ?? 0) + ascensionValue(s, 'gold') + ascensionValue(s, 'speed');
}

export function xpMult(s: PlayerState): number {
  const cons = constellationStats(s.constellation).stats;
  return 1 + (cons.xpPct ?? 0) + ascensionValue(s, 'xp') + ascensionValue(s, 'speed');
}

/** Уровень силы этапа фарма: от него зависят доход и уровень предметов. */
export function farmLevel(cfg: Config, s: PlayerState): number {
  return Math.round(powerLevel(cfg, farmStage(s)));
}

/** Доход золота в минуту на уровне силы L. */
export function goldPerMin(cfg: Config, s: PlayerState, L = farmLevel(cfg, s)): number {
  return cfg.income.goldBase * Math.pow(L + 1, cfg.income.goldExp) * goldMult(s, cfg);
}

export function xpPerMin(cfg: Config, s: PlayerState, L = farmLevel(cfg, s)): number {
  return cfg.income.xpBase * Math.pow(L + 1, cfg.income.xpExp) * xpMult(s);
}

export function accXpPerMin(cfg: Config, s: PlayerState): number {
  return cfg.income.accXpPerMin * (1 + farmLevel(cfg, s) / 60);
}

export function dustPerMin(cfg: Config, s: PlayerState): number {
  return (cfg.income.dustPerHour / 60) * (1 + farmLevel(cfg, s) / 40) * (1 + ascensionValue(s, 'dust'));
}

export function offlineBonus(s: PlayerState): number {
  return constellationStats(s.constellation).offline + ascensionValue(s, 'offline');
}

export function capMinutes(cfg: Config, s: PlayerState, now: number): number {
  let hours = cfg.income.capHours + constellationStats(s.constellation).capHours;
  if (s.shop.monthlyUntil > now) hours = cfg.income.maxCapHours;
  return Math.min(cfg.income.maxCapHours, hours) * 60;
}

export function x2Active(s: PlayerState, now: number): boolean {
  return s.boosts.x2Until > now || s.shop.passUntil > now;
}

/** Начислить в сундук доход за прошедшее время (онлайн и офлайн одинаково). */
export function settleChest(ctx: Ctx) {
  const { s, cfg, now } = ctx;
  const since = s.chest.since;
  if (now <= since) return;
  const realMin = (now - since) / 60000;
  // ускорение ×2: пересечение [since, now] с окном действия буста
  const x2End = Math.max(s.boosts.x2Until, s.shop.passUntil);
  const x2Min = Math.max(0, Math.min(now, x2End) - since) / 60000;
  let eff = realMin + Math.min(realMin, x2Min);
  const cap = capMinutes(cfg, s, now);
  eff = Math.min(eff, Math.max(0, cap - s.chest.minutes));
  s.chest.since = now;
  if (eff <= 0) return;
  const b = 1 + offlineBonus(s);
  s.chest.minutes += eff;
  s.chest.itemMin += eff;
  s.chest.gold += goldPerMin(cfg, s) * eff * b;
  s.chest.xp += xpPerMin(cfg, s) * eff * b;
  s.chest.accXp += accXpPerMin(cfg, s) * eff;
  s.chest.dust += dustPerMin(cfg, s) * eff;
}

// ——— предметы ———

export function newUid(s: PlayerState): string {
  return `i${(s.uidCounter++).toString(36)}`;
}

export function partyClasses(s: PlayerState): ClassId[] {
  const p = activeParty(s);
  const cls = p.map((id) => HEROINE_MAP[id]?.cls).filter(Boolean) as ClassId[];
  return cls.length ? cls : ['sorceress'];
}

export function lootBonus(s: PlayerState): number {
  return constellationStats(s.constellation).loot + ascensionValue(s, 'loot');
}

export function inventoryCount(s: PlayerState): number {
  return Object.keys(s.items).length;
}

/** Выдать предмет с учётом автопереплавки и лимита инвентаря. Возвращает uid или null, если переплавлен. */
export function addItem(ctx: Ctx, item: Item, opts: { noAutoSmelt?: boolean } = {}): string | null {
  const { s, cfg } = ctx;
  if (item.rarity >= 4) track(ctx, 'legendaryFound', 1);
  if (item.rarity >= 5) track(ctx, 'mythicFound', 1);
  const auto = !opts.noAutoSmelt && s.settings.autoSmelt >= 0 && item.rarity < s.settings.autoSmelt && !item.set;
  if (!auto && inventoryCount(s) >= inventoryCap(cfg, s)) {
    // инвентарь полон: переплавляем самый слабый свободный предмет, если новый сильнее
    const weakest = weakestFreeItem(ctx);
    if (weakest && cachedPower(cfg, weakest) < cachedPower(cfg, item)) {
      smeltGain(ctx, weakest);
      track(ctx, 'smelt', 1);
      delete s.items[weakest.uid];
      s.items[item.uid] = item;
      return item.uid;
    }
  }
  if (auto || inventoryCount(s) >= inventoryCap(cfg, s)) {
    smeltGain(ctx, item);
    track(ctx, 'smelt', 1);
    return null;
  }
  s.items[item.uid] = item;
  return item.uid;
}

const powerCache = new WeakMap<Item, { enh: number; p: number }>();
function cachedPower(cfg: Config, it: Item): number {
  const c = powerCache.get(it);
  if (c && c.enh === it.enh) return c.p;
  const p = itemPower(cfg, it);
  powerCache.set(it, { enh: it.enh, p });
  return p;
}

/** Самый слабый предмет, который можно переплавить без потерь: не надет, не заблокирован, без камней. */
function weakestFreeItem(ctx: Ctx): Item | null {
  const { s, cfg } = ctx;
  const idx = equippedIndex(s);
  let best: Item | null = null;
  let bestP = Infinity;
  for (const it of Object.values(s.items)) {
    if (idx[it.uid] || it.lock || it.enh > 0 || it.gems.some(Boolean)) continue;
    const p = cachedPower(cfg, it);
    if (p < bestP) {
      best = it;
      bestP = p;
    }
  }
  return best;
}

/** Предмет уровня lvl (уровень силы); сложность по умолчанию — текущего этапа фарма. */
export function rollLoot(ctx: Ctx, o: Partial<LootOpts> & { lvl: number }): Item {
  const { s, cfg } = ctx;
  return generateItem(cfg, ctx.rng, newUid(s), {
    diff: diffOfGlobal(farmStage(s)) as 0 | 1 | 2,
    classes: partyClasses(s),
    rarityBonus: lootBonus(s),
    ...o,
  });
}

export function smeltGain(ctx: Ctx, item: Item) {
  const { cfg } = ctx;
  const dust = Math.floor(cfg.gear.smeltDust[item.rarity] * (1 + item.lvl / 50) + item.enh * item.enh * 3);
  const forge = cfg.gear.smeltForge[item.rarity];
  give(ctx, { dust, forgeMats: forge });
  if (item.rarity >= 5) give(ctx, { divineMats: item.rarity === 6 ? 20 : 5 });
  for (const g of item.gems) if (g) ctx.s.gems[g] = (ctx.s.gems[g] ?? 0) + 1;
}

// ——— героини ———

/** Автопрокачка: тратим опыт и золото на самых отстающих героинь отряда. */
export function autoLevelParty(ctx: Ctx): Record<string, number> {
  const { s, cfg } = ctx;
  const gained: Record<string, number> = {};
  const party = activeParty(s);
  for (let guard = 0; guard < 2000; guard++) {
    let target: string | null = null;
    for (const id of party) {
      const h = s.heroines[id];
      if (h.lvl >= levelCap(cfg, h)) continue;
      if (!target || h.lvl < s.heroines[target].lvl) target = id;
    }
    if (!target) break;
    const h = s.heroines[target];
    const xp = xpToNext(cfg, h.lvl);
    const gold = goldToNext(cfg, h.lvl);
    if (s.cur.xp < xp || s.cur.gold < gold) break;
    s.cur.xp -= xp;
    s.cur.gold -= gold;
    h.lvl++;
    gained[target] = (gained[target] ?? 0) + 1;
    track(ctx, 'heroLevel', 1);
  }
  return gained;
}

export function addHeroine(ctx: Ctx, id: string): boolean {
  const { s, cfg } = ctx;
  if (s.heroines[id]) return false;
  const def = HEROINE_MAP[id];
  s.heroines[id] = {
    id,
    lvl: 1,
    stars: cfg.hero.startStars[def.rarity],
    tree: {},
    skills: [null, null],
    gear: {},
  };
  ctx.events.push({ name: 'hero_get', props: { hero: id, rarity: def.rarity } });
  return true;
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
      return s.progress.maxGlobalEver;
    case 'heroCount':
      return Object.keys(s.heroines).length;
    case 'maxHeroLevel':
      return Math.max(0, ...Object.values(s.heroines).map((h) => h.lvl));
    case 'towerFloor':
      return s.modes.tower;
    case 'ascensions':
      return s.ascension.count;
    case 'constellation':
      return s.constellation;
    case 'abyssLevel':
      return s.modes.abyss;
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
    const v = metric(s, a.id === 'stage' ? 'maxStage' : a.metric);
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
  if (r.shards) {
    for (const [id, n] of Object.entries(r.shards)) ctx.s.shards[id] = (ctx.s.shards[id] ?? 0) + n;
    out.shards = r.shards;
  }
  if (r.heroes) {
    for (const id of r.heroes) {
      if (!addHeroine(ctx, id)) {
        const def = HEROINE_MAP[id];
        ctx.s.shards[id] = (ctx.s.shards[id] ?? 0) + ctx.cfg.hero.dupeShards[def.rarity];
      }
    }
    out.heroes = r.heroes;
  }
  if (r.items) {
    out.items = [];
    for (const it of r.items) {
      const item = { ...it, uid: newUid(ctx.s) };
      if (addItem(ctx, item, { noAutoSmelt: true })) out.items.push(item);
    }
  }
  if (r.gems) {
    for (const [g, n] of Object.entries(r.gems)) ctx.s.gems[g] = (ctx.s.gems[g] ?? 0) + n;
    out.gems = r.gems;
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
  if (byStage !== undefined) return s.progress.maxGlobalEver + 1 >= byStage;
  const byLevel = (cfg.unlocks.level as Record<string, number>)[feature];
  if (byLevel !== undefined) return s.account.lvl >= byLevel;
  return true;
}

export function requireUnlocked(ctx: Ctx, feature: string) {
  assert(isUnlocked(ctx, feature), 'locked', { feature });
}

export { equippedIndex };
