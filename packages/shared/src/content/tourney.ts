import { Rng, mixSeed } from '../rng';
import type { HeroRarity, L10n } from '../types';
import { HEROINES, HEROINE_MAP } from './heroines';
import { ARENA_BOT_NAMES } from './modes';

/**
 * «Турнир Валькирий»: драфт чужими героинями. Игрок собирает отряд из пяти, выбирая одну из трёх
 * предложенных, и бьётся с командами соперниц до 3 поражений или 7 побед; после победы можно
 * заменить одну героиню. Все героини турнира одного уровня — решают выбор и сочетания, а не прокачка.
 */
export const TOUR_ENTRIES = 2;
export const TOUR_PICKS = 5;
export const TOUR_WINS = 7;
export const TOUR_LOSSES = 3;
/** Уровень героинь игрока на турнире. */
export const TOUR_LEVEL = 40;

/** Вес редкости в предложениях драфта: UR — редкость, но бывает. */
const OFFER_W: Record<HeroRarity, number> = { R: 20, SR: 34, SSR: 30, UR: 16 };

function weightedPick(rng: Rng, pool: string[], weight: (id: string) => number): string {
  const total = pool.reduce((a, id) => a + weight(id), 0);
  let r = rng.next() * total;
  for (const id of pool) {
    r -= weight(id);
    if (r < 0) return id;
  }
  return pool[pool.length - 1];
}

/** Три разные героини на выбор (без уже взятых в отряд). step — номер выбора в забеге. */
export function tourOffer(seed: number, step: number, exclude: string[]): string[] {
  const rng = new Rng(mixSeed(seed, step, 0x70a1));
  const pool = HEROINES.map((h) => h.id).filter((id) => !exclude.includes(id));
  const out: string[] = [];
  while (out.length < 3 && pool.length) {
    const id = weightedPick(rng, pool, (x) => OFFER_W[HEROINE_MAP[x].rarity]);
    out.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
  return out;
}

export interface TourOpponent {
  name: L10n;
  lvl: number;
  team: string[];
  /** финал: команда чемпионки */
  final: boolean;
}

const NAMES = ARENA_BOT_NAMES.filter((n) => n !== 'Freya');

/**
 * Соперницы раунда: с каждым раундом выше уровень и чаще редкие героини.
 * Седьмой раунд — финал с чемпионкой праздника во главе.
 */
export function tourOpponent(seed: number, round: number, champion: string): TourOpponent {
  const rng = new Rng(mixSeed(seed, round, 0x0dd5));
  const w: Record<HeroRarity, number> = { R: Math.max(3, 26 - round * 4), SR: Math.max(10, 34 - round * 3), SSR: 28 + round * 2, UR: 12 + round * 5 };
  const final = round >= TOUR_WINS;
  const team: string[] = final ? [champion] : [];
  const pool = HEROINES.map((h) => h.id).filter((id) => id !== champion);
  while (team.length < TOUR_PICKS) {
    const id = weightedPick(rng, pool, (x) => w[HEROINE_MAP[x].rarity]);
    team.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
  const lead = final ? HEROINE_MAP[champion].name : { ru: rng.pick(NAMES), en: '' };
  const name: L10n = final
    ? { ru: `Чемпионка ${lead.ru}`, en: `Champion ${lead.en}` }
    : { ru: `Дружина ${lead.ru}`, en: `${lead.ru}'s Band` };
  return { name, lvl: TOUR_LEVEL + 2 + Math.round((round - 1) * 2.5), team, final };
}

/** Награда за победу в раунде (раунд = число побед после боя). */
export function tourWinReward(round: number): { tokens: number; points: number } {
  return { tokens: 40 + 8 * round, points: 30 + 5 * round };
}

/** Чемпионке турнира — сундук с осколками героини праздника. */
export const TOUR_CHAMP_REWARD = { tokens: 300, points: 200, shards: 15, crystals: 100 };

/** Итог забега: кристаллы по числу побед. */
export function tourEndCrystals(wins: number): number {
  return [0, 0, 10, 20, 35, 50, 70, 100][Math.max(0, Math.min(TOUR_WINS, wins))];
}
