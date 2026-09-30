import type { ClassId, L10n } from '../types';
import { ENEMY_MAP, type EnemyDef } from './acts';
import { HEROINE_MAP, SKIN_MAP, isSwimwear, type Look } from './heroines';

/**
 * «Пляжный волейбол» Солнечного курорта (по мотивам Dead or Alive Xtreme Beach Volleyball): пара своих
 * героинь против пар соперниц. Лестница из 8 пар, в финале — Солара, королева острова. Матч — до 5 очков,
 * розыгрыш — мини-игра на тайминг: приём подачи → пас → удар. Прокачка не решает:
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
  knight: { rec: 3, set: 1, spk: 1 },
  assassin: { rec: 1, set: 1, spk: 3 },
  priestess: { rec: 2, set: 2, spk: 1 },
  ranger: { rec: 2, set: 1, spk: 2 },
  warlock: { rec: 1, set: 2, spk: 2 },
  hunter: { rec: 2, set: 2, spk: 1 },
};

/** Пляжная форма: героиня в купальнике летней коллекции играет лучше (+1 ко всем навыкам). */
export function volleyBeachForm(skin?: string): boolean {
  const sk = skin ? SKIN_MAP[skin] : undefined;
  return !!sk && sk.set === 'summer' && isSwimwear(sk.look.wear);
}

/** Облик героини на пляже: надетый купальник, иначе — её облик летней коллекции (если он есть). */
export function beachSkinOf(s: { heroines: Record<string, { skin?: string }>; skins: string[] }, hero: string): string | undefined {
  const cur = s.heroines[hero]?.skin;
  if (isSwimwear(cur ? SKIN_MAP[cur]?.look.wear : HEROINE_MAP[hero]?.look.wear)) return cur;
  return s.skins.find((k) => SKIN_MAP[k]?.hero === hero && isSwimwear(SKIN_MAP[k]?.look.wear)) ?? cur;
}

/** Навыки героини — по классу (+1 ко всему в пляжной форме). */
export function volleySkills(hero: string, skin?: string): VolleySkills {
  const k = { ...VOLLEY_CLASS[HEROINE_MAP[hero].cls] };
  if (volleyBeachForm(skin)) {
    k.rec++;
    k.set++;
    k.spk++;
  }
  return k;
}

/** Навыки пары: сумма; одна стихия — сыгранность, +1 ко всему. skins — облики героинь (пляжная форма). */
export function volleyTeam(heroes: string[], skins: Record<string, string | undefined> = {}): VolleySkills & { synergy: boolean } {
  const out = { rec: 0, set: 0, spk: 0 };
  for (const id of heroes) {
    const k = volleySkills(id, skins[id]);
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
  /** соперницы — жительницы острова (EnemyDef-персонажи, в боях не участвуют) */
  pair: [string, string];
  /** мастерство соперниц 0–1: скорость розыгрыша, как часто отбивают удары */
  skill: number;
  final: boolean;
}

type NpcLook = [id: string, ru: string, en: string, hair: string, style: Look['style'], skin: string, eyes: string, outfit: string, trim: string, acc: Look['acc'], accColor: string];
/** Соперницы пляжа: спортивные купальники с футболкой (swim4) или парео (swim). */
const NPCS: NpcLook[] = [
  ['v_coral', 'Корал', 'Coral', '#E07A6A', 'bob', '#C98E62', '#3D7BE0', '#3D7BE0', '#F2E6D8', 'bandana', '#3D9BE0'],
  ['v_ivy', 'Айви', 'Ivy', '#8AB060', 'ponytail', '#EBC09C', '#4E9A3C', '#7ACF5A', '#F2F0E6', 'flower', '#F4B8CC'],
  ['v_hanna', 'Ханна', 'Hanna', '#F0B040', 'bun', '#F4D3B8', '#6A4A2A', '#E03A6A', '#FFFFFF', 'flower', '#F2A0B0'],
  ['v_gwen', 'Гвен', 'Gwen', '#6A4A2A', 'braid', '#EBC09C', '#4FBF5A', '#E8641E', '#FFFFFF', 'flower', '#F2E6D8'],
  ['v_ruby', 'Руби', 'Ruby', '#B8322C', 'wild', '#C98E62', '#F0A030', '#E03A3A', '#F2D46B', 'bandana', '#B8322C'],
  ['v_fiona', 'Фиона', 'Fiona', '#F08A24', 'ponytail', '#EBC09C', '#8A3A1E', '#E0406A', '#6FD0E0', 'bandana', '#B8322C'],
  ['v_kana', 'Кана', 'Kana', '#2A3A6A', 'ponytail', '#F4D3B8', '#6FD0E0', '#1E1A2A', '#E03A3A', 'bandana', '#3D9BE0'],
  ['v_luna', 'Луна', 'Luna', '#8A8070', 'wild', '#C98E62', '#E0C040', '#1E1A2A', '#F2D46B', 'catEars', '#8A8070'],
  ['v_brianna', 'Брианна', 'Brianna', '#8A3A1E', 'short', '#C98E62', '#E0A13A', '#6FD0E0', '#F2E6D8', 'sunHat', '#E8C87A'],
  ['v_melody', 'Мелоди', 'Melody', '#A0C060', 'twintails', '#F4D3B8', '#4E9A3C', '#6FB0F0', '#FFFFFF', 'flower', '#F2F0E6'],
  ['v_aurora', 'Аврора', 'Aurora', '#FFE8A0', 'long', '#F4D3B8', '#F2D46B', '#C8901A', '#F2F0E6', 'halo', '#FFE8A0'],
  ['v_amber', 'Эмбер', 'Amber', '#C06A2A', 'bun', '#EBC09C', '#E0A13A', '#F08A24', '#FFFFFF', 'sunHat', '#E8C87A'],
  ['v_carmen', 'Кармен', 'Carmen', '#2A1E1E', 'long', '#C98E62', '#E0532A', '#E03A3A', '#1E1A1A', 'flower', '#E03A3A'],
  ['v_echo', 'Эхо', 'Echo', '#4A3A6A', 'bob', '#E8DCE8', '#C04AE0', '#E03A6A', '#F2E6D8', 'sunHat', '#E8C87A'],
  ['v_solara', 'Солара', 'Solara', '#FFD27A', 'long', '#C98E62', '#FF8A3A', '#FF3A8A', '#F2D46B', 'flower', '#FF5A7A'],
  ['v_lorelei', 'Лорелея', 'Lorelei', '#6FB0E0', 'long', '#F4D3B8', '#3D7BE0', '#6FD0E0', '#F2F0E6', 'tiara', '#F2F0E6'],
];
for (const [id, ru, en, hair, style, skin, eyes, outfit, trim, acc, accColor] of NPCS) {
  const def: EnemyDef = { id, act: 0, name: { ru, en }, role: 'rogue', element: 'light', kind: 'summon', skills: [], look: { hair, style, skin, eyes, outfit, trim, acc, accColor, wear: 'swim4', bust: 1, hips: 1 } };
  ENEMY_MAP[id] = def;
}

/** Пары лестницы: от новичков пляжа до королевы острова. */
const PAIRS: [string, string][] = [
  ['v_coral', 'v_ivy'],
  ['v_hanna', 'v_gwen'],
  ['v_ruby', 'v_fiona'],
  ['v_kana', 'v_luna'],
  ['v_brianna', 'v_melody'],
  ['v_aurora', 'v_amber'],
  ['v_carmen', 'v_echo'],
  ['v_solara', 'v_lorelei'],
];

export function volleyRival(rung: number): VolleyRival {
  const r = Math.max(1, Math.min(VOLLEY_RUNGS, rung));
  return { rung: r, pair: PAIRS[r - 1], skill: Math.round((0.12 + (r - 1) * 0.1) * 100) / 100, final: r === VOLLEY_RUNGS };
}

/** Имя: героиня Легиона или соперница с пляжа. */
function nameOf(id: string): L10n {
  return HEROINE_MAP[id]?.name ?? ENEMY_MAP[id]?.name ?? { ru: id, en: id };
}

/** Название пары: «Корал и Айви». */
export function volleyPairName(pair: string[]): L10n {
  const [a, b] = pair.map(nameOf);
  return { ru: `${a.ru} и ${b.ru}`, en: `${a.en} & ${b.en}` };
}

/**
 * Награда за матч: победа — жетоны и очки по ступени (разгром — +50% очков), поражение — утешительные.
 * За первую победу над парой — кристаллы, на 4-й и 8-й ступенях — Эмблемы.
 */
export function volleyReward(rung: number, won: boolean, big: boolean): { tokens: number; points: number } {
  if (!won) return { tokens: 15, points: 10 };
  const points = 40 + 8 * rung;
  return { tokens: 50 + 12 * rung, points: big ? Math.round(points * 1.5) : points };
}
export function volleyFirstReward(rung: number): { crystals: number; emblems: number; points: number } {
  const final = rung === VOLLEY_RUNGS;
  return { crystals: 15 * rung + (final ? 150 : 0), emblems: final ? 30 : rung === 4 ? 12 : 0, points: final ? 200 : 0 };
}
