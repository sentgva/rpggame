import {
  HEROINE_MAP,
  TOUR_CHAMP_REWARD,
  TOUR_ENTRIES,
  TOUR_LEVEL,
  TOUR_LOSSES,
  TOUR_PICKS,
  TOUR_WINS,
  tourEndCrystals,
  tourOffer,
  tourOpponent,
  tourWinReward,
  type FestivalDef,
} from '../../content';
import { mixSeed } from '../../rng';
import type { FestivalState, HeroineState, PlayerState, TourneyRun } from '../../types';
import type { Action } from '../apply';
import type { UnitInit } from '../battle';
import { assert, give, requireUnlocked, track, vInt, type Ctx } from '../core';
import type { Config } from '../../config';
import { heroUnits } from '../units';
import { runBattle, stripRaw } from './battle';
import { festCopy, requireFestival, tourOf } from './festival';

type Cur = Record<string, number>;

/** Сколько входов на турнир осталось сегодня (с купленными). */
export function tourEntriesLeft(f: FestivalState): number {
  const t = tourOf(f);
  return Math.max(0, TOUR_ENTRIES - t.entries) + t.bonus;
}

/** Передний ряд — щиты и берсерки. */
function frontFirst(ids: string[]): string[] {
  const front = (id: string) => (['guardian', 'berserker'].includes(HEROINE_MAP[id].cls) ? 0 : 1);
  return [...ids].sort((a, b) => front(a) - front(b));
}

/**
 * Юниты турнира: героини уровня lvl, звёзды — по редкости, без снаряжения, древа, близости и бонусов аккаунта.
 * Одинаково для обеих сторон — решают выбор и сочетания.
 */
export function tourUnits(cfg: Config, s: PlayerState, ids: string[], lvl: number, side: 0 | 1): UnitInit[] {
  const heroines: Record<string, HeroineState> = {};
  for (const id of ids) heroines[id] = { id, lvl, stars: cfg.hero.startStars[HEROINE_MAP[id].rarity], tree: {}, skills: [null, null], gear: {} };
  const fake = { ...s, heroines, items: {}, constellation: 0, ascension: { ...s.ascension, up: {} }, bond: {} } as PlayerState;
  const units = heroUnits(cfg, fake, frontFirst(ids));
  return side === 0 ? units : units.map((u) => ({ ...u, side: 1 as const }));
}

/** Соперницы следующего боя забега (с каждым поражением — новая команда того же раунда). */
export function tourNext(run: TourneyRun, def: FestivalDef) {
  return tourOpponent(mixSeed(run.seed, run.losses), run.wins + 1, def.hero);
}

function finish(ctx: Ctx, f: FestivalState, run: TourneyRun): Cur {
  run.phase = 'done';
  run.offer = [];
  const t = tourOf(f);
  f.tour = { ...t, run, best: Math.max(t.best, run.wins) };
  const crystals = tourEndCrystals(run.wins);
  const cur: Cur = crystals ? { crystals } : {};
  give(ctx, cur);
  return cur;
}

export const tourneyActions = {
  /** Вход на турнир: новый забег и первое предложение драфта. */
  'tour.start': (ctx: Ctx) => {
    requireUnlocked(ctx, 'events');
    const f = festCopy(ctx, requireFestival(ctx, 'tourney'));
    const t = tourOf(f);
    assert(!t.run || t.run.phase === 'done', 'runActive');
    assert(tourEntriesLeft(f) > 0, 'noAttempts');
    const seed = ctx.rng.fork();
    const run: TourneyRun = { seed, picks: [], offer: tourOffer(seed, 0, []), phase: 'draft', wins: 0, losses: 0 };
    f.tour = t.entries < TOUR_ENTRIES ? { ...t, entries: t.entries + 1, run } : { ...t, bonus: t.bonus - 1, run };
    ctx.s.festival = f;
    return { run, festival: f };
  },

  /** Выбор героини драфта (index — одна из трёх предложенных). */
  'tour.pick': (ctx: Ctx, a: Action) => {
    const f = festCopy(ctx, requireFestival(ctx, 'tourney'));
    const run = f.tour?.run;
    assert(run && run.phase === 'draft', 'noRun');
    const id = run.offer[vInt(a.index, 0, run.offer.length - 1, 'index')];
    run.picks.push(id);
    if (run.picks.length < TOUR_PICKS) run.offer = tourOffer(run.seed, run.picks.length, run.picks);
    else {
      run.offer = [];
      run.phase = 'fight';
      track(ctx, 'tourDraft', 1);
    }
    ctx.s.festival = f;
    return { run, festival: f };
  },

  /** Бой с соперницами раунда. Победа — награда и замена на выбор; 7 побед — чемпионка; 3 поражения — конец. */
  'tour.fight': (ctx: Ctx) => {
    const { s, cfg } = ctx;
    const fn = requireFestival(ctx, 'tourney');
    const f = festCopy(ctx, fn);
    const run = f.tour?.run;
    assert(run && run.phase === 'fight', 'noRun');
    const opp = tourNext(run, fn.def);
    const b = runBattle(ctx, tourUnits(cfg, s, opp.team, opp.lvl, 1), tourUnits(cfg, s, run.picks, TOUR_LEVEL, 0), cfg.battle.bossTimeLimit, { noArtifacts: true });
    track(ctx, 'tourFight', 1);
    const cur: Cur = {};
    let points = 0;
    let shards: Record<string, number> | undefined;
    let champion = false;
    if (b.win) {
      run.wins++;
      const r = tourWinReward(run.wins);
      cur.eventTokens = r.tokens;
      points += r.points;
      track(ctx, 'tourWin', 1);
      f.tour = { ...tourOf(f), wins: tourOf(f).wins + 1 };
      if (run.wins >= TOUR_WINS) {
        champion = true;
        cur.eventTokens += TOUR_CHAMP_REWARD.tokens;
        cur.crystals = TOUR_CHAMP_REWARD.crystals;
        points += TOUR_CHAMP_REWARD.points;
        s.shards[fn.def.hero] = (s.shards[fn.def.hero] ?? 0) + TOUR_CHAMP_REWARD.shards;
        shards = { [fn.def.hero]: TOUR_CHAMP_REWARD.shards };
        f.tour = { ...tourOf(f), champs: tourOf(f).champs + 1 };
      } else {
        run.phase = 'swap';
        run.offer = tourOffer(run.seed, 100 + run.wins, run.picks);
      }
    } else run.losses++;
    give(ctx, cur);
    f.points += points;
    let end: Cur | undefined;
    if (run.wins >= TOUR_WINS || run.losses >= TOUR_LOSSES) end = finish(ctx, f, run);
    else f.tour = { ...tourOf(f), run };
    s.festival = f;
    ctx.events.push({ name: 'tour_fight', props: { win: b.win, wins: run.wins, losses: run.losses } });
    return { battle: stripRaw(b), win: b.win, opponent: opp, run, reward: { cur, points, shards, end, champion }, festival: f };
  },

  /** После победы: заменить героиню отряда (slot) на предложенную (index) или оставить отряд как есть. */
  'tour.swap': (ctx: Ctx, a: Action) => {
    const f = festCopy(ctx, requireFestival(ctx, 'tourney'));
    const run = f.tour?.run;
    assert(run && run.phase === 'swap', 'noRun');
    if (a.index !== undefined) {
      const id = run.offer[vInt(a.index, 0, run.offer.length - 1, 'index')];
      run.picks[vInt(a.slot, 0, run.picks.length - 1, 'slot')] = id;
    }
    run.phase = 'fight';
    run.offer = [];
    f.tour = { ...tourOf(f), run };
    ctx.s.festival = f;
    return { run, festival: f };
  },

  /** Досрочно завершить забег: награда за достигнутые победы. */
  'tour.retire': (ctx: Ctx) => {
    const f = festCopy(ctx, requireFestival(ctx, 'tourney'));
    const run = f.tour?.run;
    assert(run && run.phase !== 'done', 'noRun');
    const cur = finish(ctx, f, run);
    ctx.s.festival = f;
    return { cur, run, festival: f };
  },
};
