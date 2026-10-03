import { HEROINES, HEROINE_MAP, SKINS, STAGE_COUNT } from '../../content';
import type { Currency, GearSlot, ItemRarity, SetId } from '../../types';
import { CURRENCIES, GEAR_SLOTS, MAX_RARITY, SET_IDS } from '../../types';
import type { Action } from '../apply';
import { addHeroine, addItem, assert, give, newUid, rollLoot, settleChest, vInt, vOneOf, vStr, type Ctx } from '../core';
import { createPlayer, dayKey } from '../state';
import { legionMaxLevel } from '../stats';
import { joinHeroines } from './campaign';

/** Режим разработчика. Доступ проверяет сервер по белому списку Telegram ID. */
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

  /** Герои: присоединить, ранг, навыки, облик. id = 'all' — всем. */
  'dev.hero': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    const ids = a.id === 'all' ? HEROINES.map((h) => h.id) : [vStr(a.id, 'id')];
    for (const id of ids) {
      assert(HEROINE_MAP[id], 'noHero');
      addHeroine(ctx, id);
      const h = s.heroines[id];
      if (a.rank !== undefined) h.rank = vInt(a.rank, 1, cfg.hero.maxRank, 'rank');
      if (a.skill !== undefined) h.skill = h.ult = vInt(a.skill, 1, cfg.hero.maxSkill, 'skill');
      if (a.skin !== undefined) {
        if (a.skin === null) delete h.skin;
        else {
          const skin = vStr(a.skin, 'skin');
          if (!s.skins.includes(skin)) s.skins.push(skin);
          h.skin = skin;
        }
      }
    }
    return { count: ids.length };
  },

  'dev.legion': (ctx: Ctx, a: Action) => {
    ctx.s.legion.lvl = vInt(a.lvl, 1, legionMaxLevel(ctx.cfg), 'lvl');
    return { lvl: ctx.s.legion.lvl };
  },

  'dev.skins': (ctx: Ctx) => {
    for (const sk of SKINS) if (!ctx.s.skins.includes(sk.id)) ctx.s.skins.push(sk.id);
    return {};
  },

  /** Предмет: слот, редкость, уровень, сет, заточка. */
  'dev.item': (ctx: Ctx, a: Action) => {
    const slot = a.slot === undefined ? undefined : (vOneOf(a.slot, GEAR_SLOTS, 'slot') as GearSlot);
    const rarity = vInt(a.rarity ?? 4, 0, MAX_RARITY, 'rarity') as ItemRarity;
    const count = a.count === undefined ? 1 : vInt(a.count, 1, 50, 'count');
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const it = rollLoot(ctx, { slot, rarity, maxRarity: MAX_RARITY, lvl: a.lvl === undefined ? undefined : vInt(a.lvl, 1, 1000, 'lvl') });
      if (a.set !== undefined && rarity >= 4) it.set = vOneOf(a.set, SET_IDS, 'set') as SetId;
      if (a.enh !== undefined) it.enh = vInt(a.enh, 0, ctx.cfg.gear.maxEnh, 'enh');
      const uid = addItem(ctx, it, { keep: true });
      if (uid) out.push(uid);
    }
    return { items: out };
  },

  /** Перейти на этап (пройдено stage этапов), открыть всё. */
  'dev.progress': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    if (a.stage !== undefined) {
      s.progress.stage = vInt(a.stage, 0, STAGE_COUNT, 'stage');
      s.progress.wave = 0;
      s.progress.fails = 0;
      s.progress.retryAt = 0;
      joinHeroines(ctx);
    }
    if (a.accLvl !== undefined) s.account.lvl = vInt(a.accLvl, 1, ctx.cfg.account.maxLevel, 'accLvl');
    if (a.tower !== undefined) s.modes.tower = vInt(a.tower, 0, 10000, 'tower');
    if (a.unlockAll !== undefined) s.dev.unlockAll = !!a.unlockAll;
    return { stage: s.progress.stage };
  },

  /** Перемотка офлайн-времени: как будто прошло N минут. */
  'dev.time': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const minutes = vInt(a.minutes, 1, 60 * 24 * 30, 'minutes');
    const ms = minutes * 60000;
    s.chest.since -= ms;
    s.lastSeen -= ms;
    s.progress.retryAt = Math.max(0, s.progress.retryAt - ms);
    settleChest(ctx);
    return { minutes };
  },

  'dev.resetDaily': (ctx: Ctx) => {
    const { s } = ctx;
    s.day.key = '';
    s.week.key = '';
    s.quests.login.last = dayKey(ctx.now - 86400000);
    s.quests.login.claimedKey = '';
    if (s.modes.raid) s.modes.raid.day = '';
    return {};
  },

  'dev.battle': (ctx: Ctx, a: Action) => {
    const d = ctx.s.dev;
    if (a.immortal !== undefined) d.immortal = !!a.immortal;
    if (a.oneShot !== undefined) d.oneShot = !!a.oneShot;
    if (a.speed !== undefined) d.speed = vInt(a.speed, 1, 10, 'speed');
    if (a.fixedSeed !== undefined) d.fixedSeed = a.fixedSeed === null ? null : vInt(a.fixedSeed, 1, 0xffffffff, 'fixedSeed');
    return { dev: d };
  },

  'dev.reset': (ctx: Ctx) => {
    const fresh = createPlayer(ctx.cfg, ctx.s.id, ctx.s.name, ctx.now, ctx.s.settings.lang);
    fresh.dev.used = true;
    for (const k of Object.keys(ctx.s) as (keyof typeof ctx.s)[]) if (!(k in fresh)) delete ctx.s[k];
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
