import type { ClassId, HeroRarity, L10n } from '../types';
import { HEROINE_MAP, SKIN_MAP } from './heroines';

/**
 * «Пляжный волейбол» Солнечного курорта (по мотивам Dead or Alive Xtreme Beach Volleyball): пара своих
 * героинь против пар соперниц. Лестница из 8 пар, в финале — Солара, королева пляжа. Матч — до 5 очков,
 * розыгрыш — мини-игра на тайминг: приём подачи → пас → удар. Прокачка не решает (как на Турнире):
 * у каждой героини пляжные навыки по классу, и пару нужно подобрать — приёмщицу к нападающей.
 */
export const VOLLEY_RUNGS = 8;
/** Матч — до стольких очков. */
export const VOLLEY_POINTS = 5;
/** Бесплатных матчей в день. */
export const VOLLEY_DAILY = 5;
/** Матч не может длиться меньше (мс) — защита от мгновенных «побед». */
export const VOLLEY_MIN_MS = 8000;

export interface VolleySkills {
  /** приём: шире окно приёма подачи */
  rec: number;
  /** пас: шире окно паса, точный пас усиливает удар */
  set: number;
  /** удар: шире окно удара, соперницам труднее отбить */
  spk: number;
}

/** Пляжные навыки по классу (сумма у всех — 5). */
export const VOLLEY_CLASS: Record<ClassId, VolleySkills> = {
  guardian: { rec: 3, set: 1, spk: 1 },
  berserker: { rec: 1, set: 1, spk: 3 },
  archer: { rec: 2, set: 1, spk: 2 },
  sorceress: { rec: 1, set: 2, spk: 2 },
  priestess: { rec: 2, set: 2, spk: 1 },
  necromancer: { rec: 2, set: 2, spk: 1 },
  assassin: { rec: 2, set: 1, spk: 2 },
  bard: { rec: 1, set: 3, spk: 1 },
};
/** Редкие героини сильнее в своём главном навыке. */
const RARITY_BONUS: Record<HeroRarity, number> = { R: 0, SR: 0, SSR: 1, UR: 1 };

/** Навыки героини: класс + бонус редкости к главному навыку. */
export function volleySkills(hero: string): VolleySkills {
  const h = HEROINE_MAP[hero];
  const base = { ...VOLLEY_CLASS[h.cls] };
  const top = (Object.keys(base) as (keyof VolleySkills)[]).reduce((a, b) => (base[b] > base[a] ? b : a));
  base[top] += RARITY_BONUS[h.rarity];
  return base;
}

/** Навыки пары: сумма; одна стихия — сыгранность, +1 ко всему. */
export function volleyTeam(heroes: string[]): VolleySkills & { synergy: boolean } {
  const out = { rec: 0, set: 0, spk: 0 };
  for (const id of heroes) {
    const k = volleySkills(id);
    out.rec += k.rec;
    out.set += k.set;
    out.spk += k.spk;
  }
  const synergy = heroes.length === 2 && HEROINE_MAP[heroes[0]].element === HEROINE_MAP[heroes[1]].element;
  if (synergy) {
    out.rec++;
    out.set++;
    out.spk++;
  }
  return { ...out, synergy };
}

export interface VolleyRival {
  rung: number;
  pair: [string, string];
  /** мастерство соперниц 0–1: скорость розыгрыша, как часто отбивают удары */
  skill: number;
  final: boolean;
}

/** Пары лестницы: от новичков пляжа до королевы. */
const PAIRS: [string, string][] = [
  ['coral', 'seyra'],
  ['hanna', 'gwendolyn'],
  ['keira', 'fiona'],
  ['kana', 'ulfa'],
  ['brianna', 'melody'],
  ['aurora', 'amber'],
  ['carmen', 'echo'],
  ['solara', 'lorelei'],
];

export function volleyRival(rung: number): VolleyRival {
  const r = Math.max(1, Math.min(VOLLEY_RUNGS, rung));
  return { rung: r, pair: PAIRS[r - 1], skill: Math.round((0.12 + (r - 1) * 0.1) * 100) / 100, final: r === VOLLEY_RUNGS };
}

/** Облик соперницы на пляже: купальник из летней коллекции, если он есть. */
export function volleyRivalSkin(hero: string): string | undefined {
  return SKIN_MAP[`${hero}_beach`] ? `${hero}_beach` : undefined;
}

/** Название пары: «Корал и Сейра». */
export function volleyPairName(pair: string[]): L10n {
  const [a, b] = pair.map((id) => HEROINE_MAP[id].name);
  return { ru: `${a.ru} и ${b.ru}`, en: `${a.en} & ${b.en}` };
}

/**
 * Награда за матч: победа — жетоны и очки по ступени (разгром — +50% очков), поражение — утешительные.
 * За первую победу над парой — кристаллы, на 4-й и 8-й ступенях — осколки героини праздника.
 */
export function volleyReward(rung: number, won: boolean, big: boolean): { tokens: number; points: number } {
  if (!won) return { tokens: 15, points: 10 };
  const points = 40 + 8 * rung;
  return { tokens: 50 + 12 * rung, points: big ? Math.round(points * 1.5) : points };
}
export function volleyFirstReward(rung: number): { crystals: number; shards: number; points: number } {
  const final = rung === VOLLEY_RUNGS;
  return { crystals: 15 * rung + (final ? 150 : 0), shards: final ? 25 : rung === 4 ? 10 : 0, points: final ? 200 : 0 };
}
