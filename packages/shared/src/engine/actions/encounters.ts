import { ACTS, ENCOUNTERS, ENCOUNTER_GAP, ENCOUNTER_MAP, ENCOUNTER_TTL, ENCOUNTER_UNLOCK, MIMIC_CHANCE, SUMMON_POOL, stageFromGlobal, type EncounterKind } from '../../content';
import type { Currency } from '../../types';
import type { Action } from '../apply';
import { addItem, assert, farmLevel, farmStage, give, goldPerMin, rollLoot, spend, track, vOneOf, xpPerMin, type Ctx } from '../core';
import { customEnemies, heroUnits } from '../units';
import { currentParty, runBattle, stripRaw } from './battle';

type Cur = Partial<Record<Currency, number>>;

const WEIGHTS: Record<EncounterKind, number> = { chest: 25, merchant: 14, shrine: 20, traveler: 14, gambler: 10, ambush: 17 };

/** Цены и награды встречи — от текущего дохода игрока (показываются в интерфейсе до выбора). */
export function encounterOffer(ctx: Pick<Ctx, 'cfg' | 's'>, kind: string) {
  const { cfg, s } = ctx;
  const gpm = goldPerMin(cfg, s);
  const xpm = xpPerMin(cfg, s);
  const L = farmLevel(cfg, s);
  const g = (min: number) => Math.max(10, Math.floor(gpm * min));
  switch (kind as EncounterKind) {
    case 'chest':
      return { loot: { gold: g(25), dust: 20 + Math.floor(L / 2), crystals: 15 } as Cur, win: { gold: g(50), crystals: 45, dust: 40 + L } as Cur };
    case 'merchant':
      return { scroll: { crystals: 150 } as Cur, epic: { gold: g(45) } as Cur };
    case 'shrine':
      return { gold: { gold: g(40) } as Cur, xp: { xp: Math.max(10, Math.floor(xpm * 40)) } as Cur, dust: { dust: 60 + L * 2 } as Cur };
    case 'traveler':
      return { help: { gold: g(15) } as Cur, shards: 5, thanks: { crystals: 5 } as Cur };
    case 'gambler':
      return { bet: { gold: g(20) } as Cur };
    case 'ambush':
      return { win: { gold: g(30), crystals: 30, dust: 40 + L } as Cur, pay: { gold: g(10) } as Cur };
  }
  return {};
}

/** Появление встречи (в общем шаге перед действием): детерминированно по времени и ГПСЧ состояния. */
export function rollEncounter(ctx: Ctx) {
  const { s, now } = ctx;
  if (s.encounter && now > s.encounter.until) s.encounter = null;
  if (s.progress.maxGlobalEver < ENCOUNTER_UNLOCK || s.encounter) return;
  if (s.encounterNext === undefined) {
    // первая встреча — через несколько минут после открытия
    s.encounterNext = now + 5 * 60000;
    return;
  }
  if (now < s.encounterNext) return;
  const total = ENCOUNTERS.reduce((a, e) => a + WEIGHTS[e.id], 0);
  let r = ctx.rng.int(total);
  let kind: EncounterKind = 'chest';
  for (const e of ENCOUNTERS) {
    r -= WEIGHTS[e.id];
    if (r < 0) {
      kind = e.id;
      break;
    }
  }
  s.encounter = { kind, at: now, until: now + ENCOUNTER_TTL * 60000 };
  const [a, b] = ENCOUNTER_GAP;
  s.encounterNext = now + (a + ctx.rng.int(b - a + 1)) * 60000;
}

/** Бой встречи: мимик или засада — сильнее обычной волны этапа. */
function encounterFight(ctx: Ctx, kind: 'mimic' | 'ambush') {
  const { cfg, s } = ctx;
  const act = ACTS[stageFromGlobal(Math.max(1, farmStage(s))).act - 1];
  const L = farmLevel(cfg, s) + (kind === 'mimic' ? 3 : 4);
  const list =
    kind === 'mimic'
      ? [{ id: act.minis[ctx.rng.int(3)], tier: 'mini' as const }, { id: ctx.rng.pick(act.enemies), tier: 'elite' as const }]
      : [0, 1, 2].map(() => ({ id: ctx.rng.pick(act.enemies), tier: 'elite' as const })).concat([{ id: ctx.rng.pick(act.enemies), tier: 'elite' as const }]);
  return runBattle(ctx, customEnemies(cfg, L, list), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
}

export const encounterActions = {
  'encounter.resolve': (ctx: Ctx, a: Action) => {
    const { s, cfg, now } = ctx;
    const e = s.encounter;
    assert(e && now <= e.until, 'noEncounter');
    const def = ENCOUNTER_MAP[e.kind];
    assert(def, 'noEncounter');
    const choice = vOneOf(a.choice, def.choices.map((c) => c.id), 'choice');
    const o = encounterOffer(ctx, e.kind) as Record<string, unknown>;
    s.encounter = null;
    track(ctx, 'encounter', 1);
    const out: { kind: string; choice: string; outcome: string; cur?: Cur; spent?: Cur; items?: string[]; shards?: Record<string, number>; battle?: unknown; win?: boolean } = {
      kind: e.kind,
      choice,
      outcome: 'ok',
    };
    // суммы в предложении уже посчитаны от дохода игрока — выдаём как есть
    const grant = (c: Cur) => {
      give(ctx, c);
      out.cur = { ...c };
    };
    switch (e.kind as EncounterKind) {
      case 'chest':
        if (choice === 'leave') out.outcome = 'left';
        else if (ctx.rng.chance(MIMIC_CHANCE)) {
          const b = encounterFight(ctx, 'mimic');
          out.battle = stripRaw(b);
          out.win = b.win;
          out.outcome = b.win ? 'mimicWin' : 'mimicLose';
          if (b.win) grant(o.win as Cur);
        } else grant(o.loot as Cur);
        break;
      case 'merchant':
        if (choice === 'scroll') {
          spend(ctx, o.scroll as Cur);
          out.spent = o.scroll as Cur;
          give(ctx, { scrolls: 1 });
          out.cur = { scrolls: 1 };
        } else if (choice === 'epic') {
          spend(ctx, o.epic as Cur);
          out.spent = o.epic as Cur;
          const uid = addItem(ctx, rollLoot(ctx, { lvl: farmLevel(cfg, s), forceRarity: 3 }), { noAutoSmelt: true });
          assert(uid, 'inventoryFull');
          out.items = [uid];
        } else out.outcome = 'left';
        break;
      case 'shrine':
        grant(o[choice] as Cur);
        break;
      case 'traveler':
        if (choice === 'help') {
          spend(ctx, o.help as Cur);
          out.spent = o.help as Cur;
          const pool = [...SUMMON_POOL.SR, ...SUMMON_POOL.SSR];
          const hero = pool[ctx.rng.int(pool.length)];
          s.shards[hero] = (s.shards[hero] ?? 0) + (o.shards as number);
          out.shards = { [hero]: o.shards as number };
        } else grant(o.thanks as Cur);
        break;
      case 'gambler':
        if (choice === 'bet') {
          const bet = o.bet as Cur;
          spend(ctx, bet);
          out.spent = bet;
          if (ctx.rng.chance(0.5)) {
            give(ctx, { gold: (bet.gold ?? 0) * 2 });
            out.cur = { gold: (bet.gold ?? 0) * 2 };
            out.outcome = 'lucky';
          } else out.outcome = 'unlucky';
        } else out.outcome = 'left';
        break;
      case 'ambush':
        if (choice === 'fight') {
          const b = encounterFight(ctx, 'ambush');
          out.battle = stripRaw(b);
          out.win = b.win;
          out.outcome = b.win ? 'ambushWin' : 'ambushLose';
          if (b.win) grant(o.win as Cur);
        } else {
          spend(ctx, o.pay as Cur);
          out.spent = o.pay as Cur;
          out.outcome = 'paid';
        }
        break;
    }
    ctx.events.push({ name: 'encounter', props: { kind: e.kind, choice, outcome: out.outcome } });
    return out;
  },
};
