import { ADJ_PATS, ADJ_PAT_BOND, BOND_HEROES, BOND_SLEEP_LVL, BOND_SLEEP_SKIN, BOND_SPA_SKIN, SKIN_MAP } from '../../content';
import type { AdjutantState, PlayerState } from '../../types';
import type { Action } from '../apply';
import { assert, vOneOf, vStr, type Ctx } from '../core';
import { dayKey } from '../state';
import { bondGain, bondState } from './bond';

/** Адъютант сегодня: по умолчанию — первый из отряда; новый день — ласки заново. */
export function adjutantState(ctx: { s: PlayerState; now: number }): AdjutantState | null {
  const { s } = ctx;
  const today = dayKey(ctx.now);
  const a = s.adjutant && s.heroines[s.adjutant.hero] ? s.adjutant : null;
  const hero = a?.hero ?? Object.keys(s.heroines)[0];
  if (!hero) return null;
  const skin = a?.skin && adjutantSkins(s, hero).includes(a.skin) ? a.skin : undefined;
  return { hero, skin, day: today, pats: a && a.day === today ? a.pats : 0 };
}

/** Наряды, в которых может стоять адъютант: свои облики, купальник для источников и (с близости) пижама. */
export function adjutantSkins(s: PlayerState, hero: string): string[] {
  const out = s.skins.filter((k) => SKIN_MAP[k]?.hero === hero);
  if (BOND_SPA_SKIN[hero]) out.push(BOND_SPA_SKIN[hero]);
  if (BOND_SLEEP_SKIN[hero] && (s.bond?.[hero]?.lvl ?? 0) >= BOND_SLEEP_LVL) out.push(BOND_SLEEP_SKIN[hero]);
  return out;
}

export const adjutantActions = {
  /** Выбрать адъютанта и его наряд (только из своих героев и доступных нарядов). */
  'adj.set': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const hero = vStr(a.hero, 'hero');
    assert(s.heroines[hero], 'notOwned');
    const skin = a.skin === undefined || a.skin === null || a.skin === '' ? undefined : vStr(a.skin, 'skin');
    if (skin) assert(adjutantSkins(s, hero).includes(skin), 'noSkin');
    const cur = adjutantState(ctx);
    s.adjutant = { hero, skin, day: cur?.day ?? dayKey(ctx.now), pats: cur?.pats ?? 0 };
    return { hero, skin };
  },
  /** Касание адъютанта: первые касания за день дают близость. */
  'adj.pat': (ctx: Ctx, a: Action) => {
    const { s } = ctx;
    const zone = vOneOf(a.zone, ['head', 'body'] as const, 'zone');
    const st = adjutantState(ctx);
    assert(st, 'requirements');
    assert(st.pats < ADJ_PATS, 'usedToday');
    s.adjutant = { ...st, pats: st.pats + 1 };
    const bond = BOND_HEROES.includes(st.hero) ? bondGain(ctx, st.hero, { ...bondState(ctx, st.hero) }, ADJ_PAT_BOND) : null;
    ctx.events.push({ name: 'adj_pat', props: { hero: st.hero, zone } });
    return { zone, bond, left: ADJ_PATS - st.pats - 1 };
  },
};
