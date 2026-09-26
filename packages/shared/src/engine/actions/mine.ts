import {
  ACTS,
  MINE_START_IDX,
  MINE_W,
  MINE_H,
  mineBoard,
  mineCanDig,
  mineChest,
  mineDescendBonus,
  mineGuarded,
  mineMonsterLevel,
  mineReward,
  type FestivalDef,
  type MineTile,
} from '../../content';
import { Rng, mixSeed } from '../../rng';
import type { MineState } from '../../types';
import type { Action } from '../apply';
import type { UnitInit } from '../battle';
import { assert, give, requireUnlocked, track, vInt, type Ctx } from '../core';
import type { Config } from '../../config';
import { customEnemies, heroUnits } from '../units';
import { currentParty, runBattle, stripRaw } from './battle';
import { grantHeart } from './bond';
import { festCopy, mineOf, requireFestival } from './festival';

type Cur = Record<string, number>;

/** Нужен ли бой, чтобы раскопать клетку: чудовище или страж лестницы. */
export function mineNeedsFight(tile: MineTile, floor: number): boolean {
  return tile === 'monster' || (tile === 'stairs' && mineGuarded(floor));
}

/** Враги клетки: чудовища акта этажа; страж лестницы — мини-босс со свитой. */
export function mineEnemies(cfg: Config, def: FestivalDef, base: number, m: Pick<MineState, 'seed' | 'floor'>, cell: number, guard: boolean): UnitInit[] {
  const acts = def.mine?.acts ?? [8];
  const act = ACTS[acts[(m.floor - 1) % acts.length] - 1];
  const rng = new Rng(mixSeed(m.seed, m.floor, cell, 0x6e11));
  const list: { id: string; tier: 'normal' | 'elite' | 'mini' }[] = [];
  if (guard) list.push({ id: act.minis[m.floor % 3], tier: 'mini' });
  else if (m.floor >= 4 && rng.chance(0.35)) list.push({ id: rng.pick(act.enemies), tier: 'elite' });
  const count = guard ? 1 : 3 + (m.floor >= 7 ? 1 : 0);
  for (let i = 0; i < count; i++) list.push({ id: rng.pick(act.enemies), tier: 'normal' });
  return customEnemies(cfg, mineMonsterLevel(base, m.floor), list);
}

export const mineActions = {
  /** Копать клетку cell (индекс на поле 7×8). Стоит одну кирку; чудовище или страж — бой своим отрядом. */
  'mine.dig': (ctx: Ctx, a: Action) => {
    const { s, cfg } = ctx;
    requireUnlocked(ctx, 'events');
    const fn = requireFestival(ctx, 'mine');
    const f = festCopy(ctx, fn);
    const m: MineState = { ...mineOf(s, f), dug: [...mineOf(s, f).dug] };
    const cell = vInt(a.cell, 0, MINE_W * MINE_H - 1, 'cell');
    assert(mineCanDig(m.dug, cell), 'badParam', { name: 'cell' });
    assert(m.picks > 0, 'noPicks');
    m.picks--;
    m.steps++;
    track(ctx, 'mineStep', 1);
    const tile = mineBoard(m.seed, m.floor)[cell];
    let battle = null;
    if (mineNeedsFight(tile, m.floor)) {
      const b = runBattle(ctx, mineEnemies(cfg, fn.def, f.lvl, m, cell, tile === 'stairs'), heroUnits(cfg, s, currentParty(ctx)), cfg.battle.bossTimeLimit);
      battle = stripRaw(b);
      if (!b.win) {
        // проиграли — кирка потрачена, клетка осталась нетронутой
        f.mine = m;
        s.festival = f;
        return { battle, win: false, tile, cell, festival: f };
      }
      track(ctx, 'mineWin', 1);
    }
    const r = mineReward(tile, m.floor);
    const cur: Cur = r.tokens ? { eventTokens: r.tokens } : {};
    let points = r.points;
    let shards = 0;
    let hearts = 0;
    m.picks = Math.max(0, m.picks + r.picks);
    if (tile === 'chest') {
      const c = mineChest(ctx.rng, m.floor);
      for (const [k, v] of Object.entries(c.cur ?? {})) cur[k] = (cur[k] ?? 0) + (v ?? 0);
      shards += c.shards ?? 0;
      m.chests++;
      track(ctx, 'mineChest', 1);
    }
    if (tile === 'stairs') {
      m.floor++;
      m.best = Math.max(m.best, m.floor);
      m.dug = [MINE_START_IDX];
      const bonus = mineDescendBonus(m.floor);
      shards += bonus.shards;
      if (bonus.heart) hearts += grantHeart(ctx);
      track(ctx, 'mineFloor', 1);
    } else m.dug.push(cell);
    give(ctx, cur);
    if (shards) s.shards[fn.def.hero] = (s.shards[fn.def.hero] ?? 0) + shards;
    f.points += points;
    f.mine = m;
    s.festival = f;
    return {
      battle,
      win: true,
      tile,
      cell,
      reward: { cur, points, picks: r.picks, shards: shards ? { [fn.def.hero]: shards } : undefined, hearts: hearts || undefined, floor: tile === 'stairs' ? m.floor : undefined },
      festival: f,
    };
  },
};
