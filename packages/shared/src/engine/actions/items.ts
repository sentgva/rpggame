import { ACTS, BASE_ITEM_MAP, ENDGAME_SETS, GEM_TYPES, HEROINE_MAP, RECIPES, SET_MAP, SET_SLOTS, canWear, gemKey, parseGem } from '../../content';
import type { EquipSlot, Item, ItemSlot } from '../../types';
import { EQUIP_SLOTS, equipSlotToItemSlot } from '../../types';
import type { Action } from '../apply';
import { addItem, assert, farmLevel, rollLoot, smeltGain, spend, track, trackMax, vInt, vOneOf, vStr, vStrArr, type Ctx } from '../core';
import { rollAffix } from '../loot';
import { equippedIndex, itemPower } from '../stats';

function item(ctx: Ctx, uid: unknown): Item {
  const id = vStr(uid, 'uid');
  const it = ctx.s.items[id];
  assert(it, 'noItem');
  return it;
}

export function enhanceCost(ctx: Pick<Ctx, 'cfg'>, it: Item, level = it.enh): { gold: number; dust: number } {
  const G = ctx.cfg.gear;
  return {
    gold: Math.floor(G.enhanceGoldBase * Math.pow(it.lvl + 10, G.enhanceGoldExp) * Math.pow(G.enhanceGoldGrowth, level)),
    dust: Math.floor(G.enhanceDustBase * (level + 1) * (1 + it.rarity * 0.5)),
  };
}

/** Цена переноса заточки: доля от стоимости заточки целевого предмета до того же уровня. */
function transferGold(ctx: Pick<Ctx, 'cfg'>, from: Item, to: Item): number {
  let gold = 0;
  for (let e = to.enh; e < from.enh; e++) gold += enhanceCost(ctx, to, e).gold;
  return Math.floor(gold * ctx.cfg.gear.transferCostPct);
}

export function enhanceChance(ctx: Pick<Ctx, 'cfg'>, it: Item): number {
  const G = ctx.cfg.gear;
  if (it.enh < G.enhanceSafe) return 1;
  return Math.min(1, (G.enhanceChance[it.enh - G.enhanceSafe] ?? 0.3) + (it.luck ?? 0));
}

export function reforgeCost(ctx: Pick<Ctx, 'cfg'>, it: Item): { gold: number; dust: number } {
  return {
    gold: Math.floor(ctx.cfg.gear.reforgeGoldBase * Math.pow(it.lvl + 10, 1.2) * (1 + it.rarity)),
    dust: 10 * (1 + it.rarity * 2),
  };
}

export function forgeGoldCost(ctx: Pick<Ctx, 'cfg' | 's'>, kind: string): number {
  const n = farmLevel(ctx.cfg, ctx.s);
  const mult = kind === 'divine' ? 20 : kind === 'legendary' || kind === 'setLegendary' ? 8 : 3;
  return Math.floor(500 * Math.pow(n + 10, 1.3) * mult);
}

function unequipEverywhere(ctx: Ctx, uid: string) {
  const idx = equippedIndex(ctx.s)[uid];
  if (idx) delete ctx.s.heroines[idx.hero].gear[idx.slot];
}

function slotsFor(it: Item): EquipSlot[] {
  return it.slot === 'ring' ? ['ring1', 'ring2'] : [it.slot as EquipSlot];
}

export function autoEquipHero(ctx: Ctx, heroId: string): number {
  const { s, cfg } = ctx;
  const h = s.heroines[heroId];
  const cls = HEROINE_MAP[heroId].cls;
  const idx = equippedIndex(s);
  let changes = 0;
  for (const slot of EQUIP_SLOTS) {
    const itemSlot = equipSlotToItemSlot(slot);
    const current = h.gear[slot] ? s.items[h.gear[slot]!] : undefined;
    let best = current;
    let bestP = current ? itemPower(cfg, current) : -1;
    let bestTransfer = 0;
    for (const it of Object.values(s.items)) {
      if (it.slot !== itemSlot) continue;
      const owner = idx[it.uid];
      if (owner && !(owner.hero === heroId && owner.slot === slot)) continue;
      if (!canWear(cls, BASE_ITEM_MAP[it.base])) continue;
      let p = itemPower(cfg, it);
      let transfer = 0;
      // новый предмет может оказаться лучше, если перенести на него заточку старого
      if (current && it !== current && current.enh > it.enh) {
        const pt = itemPower(cfg, { ...it, enh: current.enh });
        const cost = transferGold(ctx, current, it);
        if (pt > p && pt > bestP && s.cur.gold >= cost) {
          p = pt;
          transfer = cost;
        }
      }
      if (p > bestP) {
        best = it;
        bestP = p;
        bestTransfer = transfer;
      }
    }
    if (best && best !== current) {
      if (bestTransfer > 0 && current) {
        spend(ctx, { gold: bestTransfer });
        best.enh = current.enh;
        current.enh = 0;
      }
      h.gear[slot] = best.uid;
      idx[best.uid] = { hero: heroId, slot };
      if (current) delete idx[current.uid];
      changes++;
    }
  }
  return changes;
}

function isEquipped(ctx: Ctx, uid: string): boolean {
  return !!equippedIndex(ctx.s)[uid];
}

export const itemActions = {
  'item.equip': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const heroId = vStr(a.hero, 'hero');
    const h = s.heroines[heroId];
    assert(h, 'noHero');
    const it = item(ctx, a.uid);
    assert(canWear(HEROINE_MAP[heroId].cls, BASE_ITEM_MAP[it.base]), 'cannotWear');
    const options = slotsFor(it);
    let slot: EquipSlot;
    if (a.slot !== undefined) slot = vOneOf(a.slot, options, 'slot');
    else slot = options.find((x) => !h.gear[x]) ?? options[0];
    unequipEverywhere(ctx, it.uid);
    h.gear[slot] = it.uid;
    it.isNew = false;
    return { slot };
  },

  'item.unequip': (ctx: Ctx, a: Action) => {
    const h = ctx.s.heroines[vStr(a.hero, 'hero')];
    assert(h, 'noHero');
    const slot = vOneOf(a.slot, EQUIP_SLOTS, 'slot');
    delete h.gear[slot];
    return {};
  },

  'item.autoEquip': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const ids = a.hero ? [vStr(a.hero, 'hero')] : (s.party.presets[s.party.active].filter(Boolean) as string[]);
    let changes = 0;
    for (const id of ids) if (s.heroines[id]) changes += autoEquipHero(ctx, id);
    return { changes };
  },

  'item.enhance': (ctx: Ctx, a: Action) => {
    const { cfg } = ctx;
    const it = item(ctx, a.uid);
    assert(it.enh < cfg.gear.enhanceMax, 'maxEnhance');
    const cost = enhanceCost(ctx, it);
    spend(ctx, cost);
    const chance = enhanceChance(ctx, it);
    const ok = ctx.rng.chance(chance);
    track(ctx, 'enhance', 1);
    if (ok) {
      it.enh++;
      it.luck = 0;
      trackMax(ctx, 'maxEnhance', it.enh);
    } else {
      // при неудаче уровень не падает, растёт «удача» следующей попытки
      it.luck = (it.luck ?? 0) + cfg.gear.enhanceLuck;
    }
    return { ok, enh: it.enh, luck: it.luck ?? 0 };
  },

  'item.lock': (ctx: Ctx, a: Action) => {
    const it = item(ctx, a.uid);
    it.lock = !it.lock;
    return { lock: it.lock };
  },

  'item.seen': (ctx: Ctx) => {
    for (const it of Object.values(ctx.s.items)) if (it.isNew) it.isNew = false;
    return {};
  },

  'item.smelt': (ctx: Ctx, a: Action) => {
    const uids = vStrArr(a.uids, 500, 'uids');
    let n = 0;
    const before = { dust: ctx.s.cur.dust, forgeMats: ctx.s.cur.forgeMats };
    for (const uid of uids) {
      const it = ctx.s.items[uid];
      if (!it || it.lock || isEquipped(ctx, uid)) continue;
      smeltGain(ctx, it);
      delete ctx.s.items[uid];
      n++;
    }
    assert(n > 0, 'nothingToSmelt');
    track(ctx, 'smelt', n);
    return { count: n, dust: ctx.s.cur.dust - before.dust, forgeMats: ctx.s.cur.forgeMats - before.forgeMats };
  },

  /** Массовая переплавка по фильтру редкости: всё ниже maxRarity (не надетое и не заблокированное). */
  'item.smeltFilter': (ctx: Ctx, a: Action) => {
    const below = vInt(a.below, 1, 6, 'below');
    const idx = equippedIndex(ctx.s);
    const uids = Object.values(ctx.s.items)
      .filter((it) => it.rarity < below && !it.lock && !idx[it.uid])
      .map((it) => it.uid);
    assert(uids.length > 0, 'nothingToSmelt');
    return itemActions['item.smelt'](ctx, { type: 'item.smelt', uids });
  },

  'item.reforge': (ctx: Ctx, a: Action) => {
    const it = item(ctx, a.uid);
    const i = vInt(a.index, 0, it.affixes.length - 1, 'index');
    spend(ctx, reforgeCost(ctx, it));
    const old = it.affixes[i];
    const rest = it.affixes.filter((_, j) => j !== i);
    const next = rollAffix(ctx.cfg, ctx.rng, { ...it, affixes: rest }, [old.id]);
    assert(next, 'noAffix');
    it.affixes[i] = next;
    track(ctx, 'reforge', 1);
    return { affix: next, old };
  },

  'item.socket': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const it = item(ctx, a.uid);
    const i = vInt(a.index, 0, Math.max(0, it.sockets - 1), 'index');
    assert(i < it.sockets, 'noSocket');
    const gem = vStr(a.gem, 'gem');
    assert((s.gems[gem] ?? 0) > 0, 'noGem');
    const prev = it.gems[i];
    if (prev) s.gems[prev] = (s.gems[prev] ?? 0) + 1;
    s.gems[gem]--;
    if (s.gems[gem] <= 0) delete s.gems[gem];
    it.gems[i] = gem;
    return {};
  },

  'item.unsocket': (ctx: Ctx, a: Action) => {
    const it = item(ctx, a.uid);
    const i = vInt(a.index, 0, Math.max(0, it.sockets - 1), 'index');
    const g = it.gems[i];
    assert(g, 'noGem');
    ctx.s.gems[g] = (ctx.s.gems[g] ?? 0) + 1;
    it.gems[i] = null;
    return {};
  },

  'gem.combine': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const gem = vStr(a.gem, 'gem');
    const { type, lvl } = parseGem(gem);
    assert(GEM_TYPES.includes(type) && lvl >= 1 && lvl < cfg.gems.maxLevel, 'badParam', { name: 'gem' });
    const times = a.all ? Math.floor((s.gems[gem] ?? 0) / cfg.gems.combine) : 1;
    assert(times >= 1 && (s.gems[gem] ?? 0) >= cfg.gems.combine * times, 'noGem');
    s.gems[gem] -= cfg.gems.combine * times;
    if (s.gems[gem] <= 0) delete s.gems[gem];
    const next = gemKey(type, lvl + 1);
    s.gems[next] = (s.gems[next] ?? 0) + times;
    return { gem: next, count: times };
  },

  /** Перенос заточки на новый предмет того же слота за 20% стоимости. */
  'item.transfer': (ctx: Ctx, a: Action) => {
    const from = item(ctx, a.from);
    const to = item(ctx, a.to);
    assert(from.uid !== to.uid && from.slot === to.slot, 'badParam', { name: 'to' });
    assert(from.enh > to.enh, 'nothingToTransfer');
    spend(ctx, { gold: transferGold(ctx, from, to) });
    to.enh = from.enh;
    from.enh = 0;
    return { enh: to.enh };
  },

  'forge.craft': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const recipe = RECIPES.find((r) => r.id === a.recipe);
    assert(recipe, 'badParam', { name: 'recipe' });
    assert(s.progress.maxGlobalEver >= recipe.unlockGlobal || s.dev.unlockAll, 'locked', { feature: 'forge' });
    const n = farmLevel(ctx.cfg, s);
    const slot = a.slot !== undefined ? (vStr(a.slot, 'slot') as ItemSlot) : undefined;
    const cost = { ...recipe.cost, gold: forgeGoldCost(ctx, recipe.kind) };
    let crafted: Item;
    if (recipe.kind === 'epic') {
      spend(ctx, cost);
      crafted = rollLoot(ctx, { lvl: n, forceRarity: 3, slot });
    } else if (recipe.kind === 'legendary') {
      spend(ctx, cost);
      crafted = rollLoot(ctx, { lvl: n, forceRarity: 4, slot });
    } else if (recipe.kind === 'setLegendary') {
      const set = vStr(a.set, 'set');
      // сеты режимов не куются — только добыча в режиме
      assert(SET_MAP[set] && !SET_MAP[set].mode, 'badParam', { name: 'set' });
      const act = ACTS.find((x) => x.sets.includes(set));
      const unlocked = act ? s.progress.maxGlobalEver >= act.id * 20 : s.progress.maxGlobalEver >= 600;
      assert(unlocked || s.dev.unlockAll, 'locked', { feature: 'set' });
      const setSlot = slot && SET_SLOTS.includes(slot) ? slot : SET_SLOTS[ctx.rng.int(SET_SLOTS.length)];
      spend(ctx, cost);
      crafted = rollLoot(ctx, { lvl: n, forceRarity: 4, slot: setSlot, set });
    } else {
      // божественный из трёх мифических
      const uids = vStrArr(a.uids, 3, 'uids');
      assert(uids.length === 3 && new Set(uids).size === 3, 'badParam', { name: 'uids' });
      const idx = equippedIndex(s);
      for (const u of uids) {
        const it = s.items[u];
        assert(it && it.rarity === 5 && !idx[u] && !it.lock, 'needMythic');
      }
      const set = a.set ? vStr(a.set, 'set') : ENDGAME_SETS[ctx.rng.int(ENDGAME_SETS.length)];
      assert(SET_MAP[set] && !SET_MAP[set].mode, 'badParam', { name: 'set' });
      const setSlot = slot && SET_SLOTS.includes(slot) ? slot : SET_SLOTS[ctx.rng.int(SET_SLOTS.length)];
      spend(ctx, cost);
      for (const u of uids) delete s.items[u];
      crafted = rollLoot(ctx, { lvl: n, forceRarity: 6, slot: setSlot, set });
    }
    const uid = addItem(ctx, crafted, { noAutoSmelt: true });
    assert(uid, 'inventoryFull');
    track(ctx, 'forge', 1);
    return { uid };
  },
};

