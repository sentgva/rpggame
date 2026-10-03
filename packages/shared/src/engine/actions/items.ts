import type { Config } from '../../config';
import type { GearSlot, Item, PlayerState } from '../../types';
import { GEAR_SLOTS, MAX_RARITY } from '../../types';
import type { Action } from '../apply';
import { assert, goldPerMin, newUid, salvageItem, spend, track, trackMax, vInt, vOneOf, vStr, vStrArr, type Ctx } from '../core';
import { mergeItems } from '../loot';
import { activeParty, equippedIndex, itemPower } from '../stats';

/** Цена следующей ступени заточки (null — максимум). */
export function enhanceCost(cfg: Config, s: PlayerState, it: Item): { gold: number; steel: number } | null {
  if (it.enh >= cfg.gear.maxEnh) return null;
  const n = it.enh + 1;
  return {
    steel: Math.ceil(cfg.gear.enhSteel * Math.pow(n, 1.5) * (1 + it.rarity * 0.5)),
    gold: Math.ceil(goldPerMin(cfg, s, it.lvl) * cfg.gear.enhGoldMin * n),
  };
}

/** Тройки для слияния: свободные вещи одного слота и редкости (кроме закреплённых и мифических). */
export function mergeGroups(s: PlayerState, maxRarity = MAX_RARITY - 1): Item[][] {
  const idx = equippedIndex(s);
  const groups: Record<string, Item[]> = {};
  for (const it of Object.values(s.items)) {
    if (idx[it.uid] || it.lock || it.rarity > maxRarity || it.rarity >= MAX_RARITY) continue;
    (groups[`${it.slot}:${it.rarity}`] ??= []).push(it);
  }
  return Object.values(groups).filter((g) => g.length >= 3);
}

/** Надеть лучшие вещи: по каждому слоту лучшие вещи Легиона раздаются героям по порядку строя. */
export function autoEquipParty(ctx: Ctx, heroes = activeParty(ctx.s)): number {
  const { s, cfg } = ctx;
  let changes = 0;
  const idx = equippedIndex(s);
  for (const slot of GEAR_SLOTS) {
    // кандидаты: свободные вещи слота и надетые на этих героев
    const pool = Object.values(s.items).filter((it) => it.slot === slot && (!idx[it.uid] || heroes.includes(idx[it.uid].hero)));
    pool.sort((a, b) => itemPower(cfg, b) - itemPower(cfg, a) || (a.uid < b.uid ? -1 : 1));
    heroes.forEach((id, i) => {
      const it = pool[i];
      const h = s.heroines[id];
      if (!it) return;
      if (h.gear[slot] !== it.uid) {
        h.gear[slot] = it.uid;
        changes++;
      }
    });
  }
  // одна вещь не может висеть на двух героях: оставляем последнее назначение
  const seen = new Set<string>();
  for (const id of heroes) {
    const h = s.heroines[id];
    for (const slot of GEAR_SLOTS) {
      const uid = h.gear[slot];
      if (!uid) continue;
      if (seen.has(uid)) delete h.gear[slot];
      else seen.add(uid);
    }
  }
  return changes;
}

function freeItem(ctx: Ctx, uid: string): Item {
  const it = ctx.s.items[uid];
  assert(it, 'noItem');
  return it;
}

function unequipEverywhere(s: PlayerState, uid: string) {
  for (const h of Object.values(s.heroines)) for (const slot of GEAR_SLOTS) if (h.gear[slot] === uid) delete h.gear[slot];
}

export const itemActions = {
  'item.equip': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const it = freeItem(ctx, vStr(a.uid, 'uid'));
    const h = s.heroines[vStr(a.hero, 'hero')];
    assert(h, 'noHero');
    unequipEverywhere(s, it.uid);
    h.gear[it.slot] = it.uid;
    it.isNew = false;
    return {};
  },

  'item.unequip': (ctx: Ctx, a: Action) => {
    const h = ctx.s.heroines[vStr(a.hero, 'hero')];
    assert(h, 'noHero');
    const slot = vOneOf(a.slot, GEAR_SLOTS, 'slot') as GearSlot;
    delete h.gear[slot];
    return {};
  },

  'hero.unequipAll': (ctx: Ctx, a: Action) => {
    const h = ctx.s.heroines[vStr(a.hero, 'hero')];
    assert(h, 'noHero');
    h.gear = {};
    return {};
  },

  /** «Надеть лучшее»: на одного героя (hero) или на весь Легион. */
  'party.autoEquip': (ctx: Ctx, a: Action) => {
    const heroes = a.hero === undefined ? activeParty(ctx.s) : [vStr(a.hero, 'hero')];
    for (const id of heroes) assert(ctx.s.heroines[id], 'noHero');
    if (heroes.length === 1) {
      // одному герою — только свободные вещи и его собственные
      const { s, cfg } = ctx;
      const h = s.heroines[heroes[0]];
      const idx = equippedIndex(s);
      let changes = 0;
      for (const slot of GEAR_SLOTS) {
        const pool = Object.values(s.items).filter((it) => it.slot === slot && (!idx[it.uid] || idx[it.uid].hero === h.id));
        pool.sort((x, y) => itemPower(cfg, y) - itemPower(cfg, x) || (x.uid < y.uid ? -1 : 1));
        if (pool[0] && h.gear[slot] !== pool[0].uid) {
          h.gear[slot] = pool[0].uid;
          changes++;
        }
      }
      return { changes };
    }
    return { changes: autoEquipParty(ctx, heroes) };
  },

  /** Заточка на n ступеней (по умолчанию одну). */
  'item.enhance': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const it = freeItem(ctx, vStr(a.uid, 'uid'));
    const n = a.n === undefined ? 1 : vInt(a.n, 1, 15, 'n');
    let done = 0;
    for (let i = 0; i < n; i++) {
      const cost = enhanceCost(cfg, s, it);
      if (!cost) break;
      if (s.cur.gold < cost.gold || s.cur.steel < cost.steel) {
        if (done === 0) spend(ctx, cost);
        break;
      }
      spend(ctx, cost);
      it.enh++;
      done++;
    }
    assert(done > 0, 'maxRank');
    track(ctx, 'forge', done);
    track(ctx, 'enhance', done);
    trackMax(ctx, 'maxEnhance', it.enh);
    return { enh: it.enh };
  },

  /** Слияние трёх вещей одного слота и редкости в одну следующей редкости. */
  'item.merge': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const uids = vStrArr(a.uids, 3, 'uids');
    assert(uids.length === 3 && new Set(uids).size === 3, 'badParam', { name: 'uids' });
    const items = uids.map((u) => freeItem(ctx, u));
    const [x] = items;
    assert(items.every((it) => it.slot === x.slot && it.rarity === x.rarity), 'mergeMismatch');
    assert(x.rarity < MAX_RARITY, 'maxRank');
    assert(items.every((it) => !it.lock), 'locked', { feature: 'item' });
    // если одна из вещей надета — результат надевается на её место
    const idx = equippedIndex(s);
    const wearer = items.map((it) => idx[it.uid]).find(Boolean);
    const out = mergeItems(cfg, ctx.rng, newUid(s), items);
    for (const it of items) {
      unequipEverywhere(s, it.uid);
      delete s.items[it.uid];
    }
    s.items[out.uid] = out;
    if (wearer) s.heroines[wearer.hero].gear[wearer.slot] = out.uid;
    track(ctx, 'merge', 1);
    track(ctx, 'forge', 1);
    if (out.rarity >= 5) track(ctx, 'mythicMade', 1);
    return { item: out.uid, rarity: out.rarity };
  },

  /** «Слить всё»: свободные вещи до указанной редкости (по умолчанию — до эпических включительно). */
  'item.mergeAll': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const maxRarity = a.max === undefined ? Math.min(cfg.gear.mergeMax, MAX_RARITY - 1) - 1 : vInt(a.max, 0, MAX_RARITY - 1, 'max');
    const made: string[] = [];
    for (let r = 0; r <= maxRarity; r++) {
      for (const group of mergeGroups(s, r).filter((g) => g[0].rarity === r)) {
        group.sort((x, y) => itemPower(cfg, y) - itemPower(cfg, x) || (x.uid < y.uid ? -1 : 1));
        for (let i = 0; i + 3 <= group.length; i += 3) {
          const trio = group.slice(i, i + 3);
          const out = mergeItems(cfg, ctx.rng, newUid(s), trio);
          for (const it of trio) delete s.items[it.uid];
          s.items[out.uid] = out;
          made.push(out.uid);
          if (out.rarity >= 5) track(ctx, 'mythicMade', 1);
        }
      }
    }
    assert(made.length > 0, 'nothingToMerge');
    track(ctx, 'merge', made.length);
    track(ctx, 'forge', made.length);
    return { made };
  },

  /** Разобрать вещи на Сталь и золото. */
  'item.salvage': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const idx = equippedIndex(s);
    let uids: string[];
    if (a.below !== undefined) {
      const below = vInt(a.below, 1, MAX_RARITY, 'below');
      uids = Object.values(s.items)
        .filter((it) => it.rarity < below && !idx[it.uid] && !it.lock && it.enh === 0)
        .map((it) => it.uid);
    } else uids = vStrArr(a.uids, 500, 'uids');
    assert(uids.length > 0, 'nothingToSalvage');
    const before = { steel: s.cur.steel, gold: s.cur.gold };
    for (const uid of uids) {
      const it = freeItem(ctx, uid);
      assert(!idx[uid], 'equipped');
      assert(!it.lock, 'locked', { feature: 'item' });
      salvageItem(ctx, it);
      delete s.items[uid];
    }
    return { n: uids.length, steel: s.cur.steel - before.steel, gold: s.cur.gold - before.gold };
  },

  'item.lock': (ctx: Ctx, a: Action) => {
    const it = freeItem(ctx, vStr(a.uid, 'uid'));
    it.lock = !it.lock;
    return { lock: it.lock };
  },

  /** Снять отметку «новое» со всех вещей. */
  'item.seen': (ctx: Ctx) => {
    for (const it of Object.values(ctx.s.items)) if (it.isNew) it.isNew = false;
    return {};
  },
};
