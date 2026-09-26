import { AFFIX_MAP, HEROINES, HEROINE_MAP, SET_MAP, SET_SLOTS, SKINS, STAGES_PER_DIFF, TREES } from '../../content';
import type { Currency, Difficulty, Item, ItemRarity, ItemSlot } from '../../types';
import { CURRENCIES, ITEM_SLOTS } from '../../types';
import type { Action } from '../apply';
import { addHeroine, addItem, assert, farmLevel, give, newUid, rollLoot, settleChest, vInt, vOneOf, vStr, type Ctx } from '../core';
import { affixValue } from '../loot';
import { createPlayer, dayKey, weekKey } from '../state';

/** Режим разработчика (раздел 16 ТЗ). Доступ проверяет сервер по белому списку Telegram ID. */
export const devActions = {
  'dev.cur': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const cur = vOneOf(a.cur, CURRENCIES, 'cur') as Currency;
    const op = vOneOf(a.op, ['add', 'sub', 'set', 'max', 'zero'] as const, 'op');
    const amount = typeof a.amount === 'number' && isFinite(a.amount) ? Math.max(0, Math.floor(a.amount)) : 0;
    if (op === 'add') s.cur[cur] += amount;
    else if (op === 'sub') s.cur[cur] = Math.max(0, s.cur[cur] - amount);
    else if (op === 'set') s.cur[cur] = amount;
    else if (op === 'max') s.cur[cur] = 1e15;
    else s.cur[cur] = 0;
    return { cur, value: s.cur[cur] };
  },

  'dev.hero': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const ids = a.id === 'all' ? HEROINES.map((h) => h.id) : [vStr(a.id, 'id')];
    for (const id of ids) {
      assert(HEROINE_MAP[id], 'noHero');
      addHeroine(ctx, id);
      const h = s.heroines[id];
      const def = HEROINE_MAP[id];
      if (a.stars !== undefined) h.stars = vInt(a.stars, 1, cfg.hero.maxStars[def.rarity], 'stars');
      if (a.awaken !== undefined) h.awakened = !!a.awaken && def.rarity === 'UR';
      if (a.lvl !== undefined) h.lvl = vInt(a.lvl, 1, cfg.hero.awakenCap, 'lvl');
      if (a.spec !== undefined) h.spec = a.spec === null ? undefined : vOneOf(a.spec, ['A', 'B'] as const, 'spec');
      if (a.skin !== undefined) {
        if (a.skin === null) delete h.skin;
        else {
          const skin = vStr(a.skin, 'skin');
          if (!s.skins.includes(skin)) s.skins.push(skin);
          h.skin = skin;
        }
      }
      if (a.fullTree) {
        for (const node of TREES[def.cls]) h.tree[node.id] = node.max;
        const actives = TREES[def.cls].filter((n) => n.kind === 'active').map((n) => n.skill!);
        h.skills = [actives[0] ?? null, actives[2] ?? null];
      }
    }
    return { count: ids.length };
  },

  'dev.skins': (ctx: Ctx) => {
    for (const sk of SKINS) if (!ctx.s.skins.includes(sk.id)) ctx.s.skins.push(sk.id);
    return {};
  },

  /** Конструктор предмета: слот, редкость, уровень, аффиксы, заточка, камни. */
  'dev.item': (ctx: Ctx, a: Action) => {
    const slot = vOneOf(a.slot, ITEM_SLOTS, 'slot') as ItemSlot;
    const rarity = vInt(a.rarity, 0, 6, 'rarity') as ItemRarity;
    const lvl = vInt(a.lvl, 1, 2000, 'lvl');
    const it: Item = rollLoot(ctx, {
      lvl,
      forceRarity: rarity,
      slot,
      set: a.set ? vStr(a.set, 'set') : undefined,
      fx: a.fx ? vStr(a.fx, 'fx') : undefined,
      base: a.base ? vStr(a.base, 'base') : undefined,
    });
    if (Array.isArray(a.affixes)) {
      it.affixes = [];
      for (const raw of a.affixes as { id: unknown; tier: unknown; v?: unknown }[]) {
        const id = vStr(raw.id, 'affix');
        assert(AFFIX_MAP[id], 'badParam', { name: 'affix' });
        const tier = vInt(raw.tier, 1, 5, 'tier');
        const v = typeof raw.v === 'number' && isFinite(raw.v) ? raw.v : affixValue(ctx.cfg, id, tier, lvl, 1);
        it.affixes.push({ id, tier, v });
      }
    }
    if (a.enh !== undefined) it.enh = vInt(a.enh, 0, ctx.cfg.gear.enhanceMax, 'enh');
    if (Array.isArray(a.gems)) {
      it.sockets = Math.max(it.sockets, (a.gems as unknown[]).length);
      it.gems = (a.gems as unknown[]).map((g) => (g ? vStr(g, 'gem') : null));
    }
    const uid = addItem(ctx, it, { noAutoSmelt: true });
    assert(uid, 'inventoryFull');
    return { uid };
  },

  'dev.fullSet': (ctx: Ctx, a: Action) => {
    const set = vStr(a.set, 'set');
    assert(SET_MAP[set], 'badParam', { name: 'set' });
    const rarity = (a.rarity !== undefined ? vInt(a.rarity, 3, 6, 'rarity') : 4) as ItemRarity;
    const lvl = a.lvl !== undefined ? vInt(a.lvl, 1, 2000, 'lvl') : farmLevel(ctx.cfg, ctx.s);
    const uids: string[] = [];
    for (const slot of SET_SLOTS) {
      const it = rollLoot(ctx, { lvl, forceRarity: rarity, slot, set });
      const uid = addItem(ctx, it, { noAutoSmelt: true });
      if (uid) uids.push(uid);
    }
    return { uids };
  },

  /** Перейти на любой акт/этап/сложность, этаж Башни, уровень Бездны; уровень аккаунта; открыть все режимы. */
  'dev.progress': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    if (a.diff !== undefined && a.idx !== undefined) {
      const diff = vInt(a.diff, 0, 2, 'diff') as Difficulty;
      const idx = vInt(a.idx, 1, STAGES_PER_DIFF, 'idx');
      // этап idx становится текущей целью: пройдены все предыдущие
      for (let d = 0; d < 3; d++) s.progress.cleared[d] = d < diff ? STAGES_PER_DIFF : d === diff ? idx - 1 : 0;
      s.progress.diff = diff;
      s.progress.wave = 0;
      // последний пройденный сквозной этап
      s.progress.maxGlobal = diff * STAGES_PER_DIFF + idx - 1;
      s.progress.maxGlobalEver = Math.max(s.progress.maxGlobalEver, s.progress.maxGlobal);
    }
    if (a.wave !== undefined) s.progress.wave = vInt(a.wave, 0, 3, 'wave');
    if (a.tower !== undefined) s.modes.tower = vInt(a.tower, 0, ctx.cfg.modes.towerFloors, 'tower');
    if (a.abyss !== undefined) s.modes.abyss = vInt(a.abyss, 0, 100000, 'abyss');
    if (a.accLvl !== undefined) {
      s.account.lvl = vInt(a.accLvl, 1, ctx.cfg.account.maxLevel, 'accLvl');
      s.account.xp = 0;
    }
    if (a.unlockAll !== undefined) s.dev.unlockAll = !!a.unlockAll;
    if (a.constellation !== undefined) s.constellation = vInt(a.constellation, 0, 240, 'constellation');
    return { progress: s.progress };
  },

  /** Перемотка офлайн-времени: сдвигаем «прошлое» назад, как будто прошло N минут. */
  'dev.time': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const minutes = vInt(a.minutes, 1, 60 * 24 * 30, 'minutes');
    const ms = minutes * 60000;
    s.chest.since -= ms;
    for (const e of s.modes.expeditions) {
      e.start -= ms;
      e.end -= ms;
    }
    s.lastSeen -= ms;
    s.progress.retryAt = Math.max(0, s.progress.retryAt - ms);
    if (s.encounterNext !== undefined) s.encounterNext -= ms;
    if (s.encounter) s.encounter = { ...s.encounter, at: s.encounter.at - ms, until: s.encounter.until - ms };
    settleChest(ctx);
    return { minutes };
  },

  'dev.resetDaily': (ctx: Ctx) => {
    const { s } = ctx;
    s.day.key = '';
    s.week.key = '';
    s.quests.login.last = dayKey(ctx.now - 86400000);
    s.quests.login.claimedKey = '';
    if (s.modes.lab) s.modes.lab.week = `${weekKey(ctx.now)}-old`;
    s.modes.expeditionBoard.day = '';
    s.modes.arena.refreshDay = '';
    return {};
  },

  'dev.battle': (ctx: Ctx, a: Action) => {
    const d = ctx.s.dev;
    if (a.immortal !== undefined) d.immortal = !!a.immortal;
    if (a.oneShot !== undefined) d.oneShot = !!a.oneShot;
    if (a.log !== undefined) d.log = !!a.log;
    if (a.speed !== undefined) d.speed = vInt(a.speed, 1, 10, 'speed');
    if (a.fixedSeed !== undefined) d.fixedSeed = a.fixedSeed === null ? null : vInt(a.fixedSeed, 1, 0xffffffff, 'fixedSeed');
    return { dev: d };
  },

  'dev.gems': (ctx: Ctx, a: Action) => {
    const lvl = vInt(a.lvl, 1, 8, 'lvl');
    const n = a.count !== undefined ? vInt(a.count, 1, 999, 'count') : 3;
    for (const t of ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst']) ctx.s.gems[`${t}:${lvl}`] = (ctx.s.gems[`${t}:${lvl}`] ?? 0) + n;
    return {};
  },

  'dev.reset': (ctx: Ctx) => {
    const fresh = createPlayer(ctx.cfg, ctx.s.id, ctx.s.name, ctx.now, ctx.s.settings.lang);
    fresh.dev.used = true;
    Object.assign(ctx.s, fresh);
    return {};
  },

  'dev.mail': (ctx: Ctx, a: Action) => {
    const crystals = vInt(a.crystals ?? 100, 0, 1e9, 'crystals');
    ctx.s.mail.push({
      id: `dev${newUid(ctx.s)}`,
      title: { ru: 'Компенсация', en: 'Compensation' },
      body: { ru: 'Тестовое письмо из режима разработчика.', en: 'Test mail from developer mode.' },
      at: ctx.now,
      rewards: { cur: { crystals } },
    });
    return {};
  },

  'dev.give': (ctx: Ctx, a: Action) => {
    give(ctx, (a.cur ?? {}) as Partial<Record<Currency, number>>);
    return {};
  },
};
