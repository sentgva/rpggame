import type { ClassId, Currency, Element, L10n, Stats, SpecialEffect } from '../types';

// ——— Подземелья ресурсов ———
export interface DungeonDef {
  id: string;
  name: L10n;
  reward: Currency | 'gems';
  element: Element;
  enemies: string[];
  boss: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: 'gold', name: { ru: 'Сокровищница гномок', en: 'Gnome Treasury' }, reward: 'gold', element: 'light', enemies: ['a8_golem', 'a8_automaton', 'a8_gnome_engineer', 'a8_mechanic'], boss: 'a8_mb2' },
  { id: 'xp', name: { ru: 'Библиотека валькирий', en: 'Valkyrie Library' }, reward: 'xp', element: 'light', enemies: ['a7_fallen_shield', 'a7_cloud_mage', 'a7_sky_priestess', 'a7_harpy_archer'], boss: 'a7_mb3' },
  { id: 'dust', name: { ru: 'Кузня вулкана', en: 'Volcano Forge' }, reward: 'dust', element: 'fire', enemies: ['a6_magma_warden', 'a6_demoness', 'a6_salamander', 'a6_pyromancer'], boss: 'a6_mb1' },
  { id: 'gems', name: { ru: 'Кристальные копи', en: 'Crystal Mines' }, reward: 'gems', element: 'water', enemies: ['a3_yeti', 'a3_ice_berserker', 'a3_snow_witch', 'a3_pass_archer'], boss: 'a3_mb1' },
  { id: 'starDust', name: { ru: 'Обсерватория', en: 'Observatory' }, reward: 'starDust', element: 'dark', enemies: ['a9_bone_warden', 'a9_banshee', 'a9_moon_archer', 'a9_lich'], boss: 'a9_mb2' },
];
export const DUNGEON_MAP: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));

/** Сквозной этап, которому соответствует уровень подземелья. */
export function dungeonStage(level: number): number {
  return 30 * level - 10;
}

// ——— Башня испытаний ———
export function towerStage(floor: number): number {
  return Math.round(8 + floor * 1.18);
}

export const TOWER_SKIN_FLOORS: Record<number, string> = {
  50: 'mirabel_pearl',
  100: 'keira_winter',
  200: 'seyra_autumn',
  300: 'celestine_nova',
};

// ——— Экспедиции ———
export interface ExpeditionQuestDef {
  id: string;
  name: L10n;
  hours: number;
  heroes: number;
  minStars: number;
  cls?: ClassId;
  element?: Element;
  reward: { gold?: number; shards?: number; forgeMats?: number; dust?: number; starDust?: number; crystals?: number; scrolls?: number };
}

export const EXPEDITION_QUESTS: ExpeditionQuestDef[] = [
  { id: 'patrol', name: { ru: 'Патруль опушки', en: 'Glade Patrol' }, hours: 1, heroes: 1, minStars: 1, reward: { gold: 60, dust: 5 } },
  { id: 'escort', name: { ru: 'Сопровождение каравана', en: 'Caravan Escort' }, hours: 2, heroes: 2, minStars: 1, reward: { gold: 150, forgeMats: 3 } },
  { id: 'herbs', name: { ru: 'Сбор трав', en: 'Herb Gathering' }, hours: 2, heroes: 1, minStars: 2, element: 'nature', reward: { gold: 100, shards: 3 } },
  { id: 'ruins', name: { ru: 'Разведка руин', en: 'Ruin Scouting' }, hours: 4, heroes: 2, minStars: 2, reward: { gold: 280, dust: 25, starDust: 5 } },
  { id: 'hunt', name: { ru: 'Большая охота', en: 'Great Hunt' }, hours: 4, heroes: 2, minStars: 2, cls: 'archer', reward: { gold: 320, shards: 5 } },
  { id: 'library', name: { ru: 'Запретная библиотека', en: 'Forbidden Library' }, hours: 6, heroes: 2, minStars: 3, cls: 'sorceress', reward: { gold: 420, scrolls: 1, starDust: 8 } },
  { id: 'shrine', name: { ru: 'Очищение святилища', en: 'Shrine Cleansing' }, hours: 6, heroes: 3, minStars: 3, element: 'light', reward: { gold: 500, shards: 8, crystals: 20 } },
  { id: 'mine', name: { ru: 'Заброшенная шахта', en: 'Abandoned Mine' }, hours: 8, heroes: 3, minStars: 3, reward: { gold: 700, forgeMats: 12, dust: 60 } },
  { id: 'crypt', name: { ru: 'Склеп королей', en: 'Crypt of Kings' }, hours: 8, heroes: 3, minStars: 4, element: 'dark', reward: { gold: 800, shards: 12, starDust: 20 } },
  { id: 'siege', name: { ru: 'Снятие осады', en: 'Lifting the Siege' }, hours: 12, heroes: 3, minStars: 4, cls: 'guardian', reward: { gold: 1200, crystals: 40, forgeMats: 20 } },
  { id: 'dragon', name: { ru: 'Логово дракониды', en: "Dragoness's Lair" }, hours: 12, heroes: 3, minStars: 5, element: 'fire', reward: { gold: 1500, shards: 20, crystals: 50 } },
  { id: 'stars', name: { ru: 'Звёздный маяк', en: 'Star Beacon' }, hours: 12, heroes: 3, minStars: 5, reward: { gold: 1400, starDust: 50, scrolls: 1 } },
];
export const EXPEDITION_MAP: Record<string, ExpeditionQuestDef> = Object.fromEntries(EXPEDITION_QUESTS.map((q) => [q.id, q]));

// ——— Лабиринт ———
export type LabNodeKind = 'fight' | 'elite' | 'shrine' | 'relic' | 'spring' | 'treasure' | 'boss';

export interface RelicDef {
  id: string;
  name: L10n;
  stats?: Stats;
  fx?: SpecialEffect;
}

export const RELICS: RelicDef[] = [
  { id: 'r_blade', name: { ru: 'Древний клинок', en: 'Ancient Blade' }, stats: { atkPct: 0.2 } },
  { id: 'r_aegis', name: { ru: 'Малая эгида', en: 'Lesser Aegis' }, stats: { hpPct: 0.25 } },
  { id: 'r_boots', name: { ru: 'Сапоги ветра', en: 'Wind Boots' }, stats: { spd: 15 } },
  { id: 'r_eye', name: { ru: 'Око ястреба', en: "Hawk's Eye" }, stats: { crit: 0.15, acc: 0.1 } },
  { id: 'r_fang', name: { ru: 'Клык вампира', en: 'Vampire Fang' }, stats: { lifesteal: 0.12 } },
  { id: 'r_chalice', name: { ru: 'Святой кубок', en: 'Holy Chalice' }, stats: { healPower: 0.4 } },
  { id: 'r_skull', name: { ru: 'Череп лича', en: "Lich's Skull" }, stats: { dmgDot: 0.5 } },
  { id: 'r_hourglass', name: { ru: 'Песочные часы', en: 'Hourglass' }, stats: { energyRegen: 0.3 } },
  { id: 'r_phoenix', name: { ru: 'Перо феникса', en: 'Phoenix Feather' }, fx: { id: 'phoenix', v: 0.3 } },
  { id: 'r_mirror', name: { ru: 'Зеркало шипов', en: 'Mirror of Thorns' }, fx: { id: 'thorns', v: 0.25 } },
  { id: 'r_bell', name: { ru: 'Колокол оглушения', en: 'Stunning Bell' }, fx: { id: 'critStun', v: 0.25 } },
  { id: 'r_crown', name: { ru: 'Корона воли', en: 'Crown of Will' }, fx: { id: 'ccImmuneFirst' } },
  { id: 'r_horn', name: { ru: 'Рог атаки', en: 'Horn of Assault' }, fx: { id: 'firstStrike', v: 0.6 } },
  { id: 'r_orb', name: { ru: 'Сфера заряда', en: 'Charged Orb' }, fx: { id: 'startEnergy', n: 40 } },
  { id: 'r_scales', name: { ru: 'Весы судьбы', en: 'Scales of Fate' }, stats: { critDmg: 0.5 } },
];
export const RELIC_MAP: Record<string, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

export const LAB_BUFFS: { id: string; name: L10n; stats: Stats }[] = [
  { id: 'b_atk', name: { ru: 'Благословение силы', en: 'Blessing of Might' }, stats: { atkPct: 0.1 } },
  { id: 'b_hp', name: { ru: 'Благословение жизни', en: 'Blessing of Life' }, stats: { hpPct: 0.12 } },
  { id: 'b_def', name: { ru: 'Благословение стали', en: 'Blessing of Steel' }, stats: { defPct: 0.15 } },
  { id: 'b_spd', name: { ru: 'Благословение ветра', en: 'Blessing of Wind' }, stats: { spd: 8 } },
  { id: 'b_crit', name: { ru: 'Благословение удачи', en: 'Blessing of Luck' }, stats: { crit: 0.08 } },
  { id: 'b_energy', name: { ru: 'Благословение эфира', en: 'Blessing of Aether' }, stats: { energyRegen: 0.15 } },
];

export const LAB_FLOORS = 3;
export const LAB_STEPS = 6;

// ——— Арена ———
export const ARENA_LEAGUES: { id: string; name: L10n; min: number; weekly: number }[] = [
  { id: 'bronze', name: { ru: 'Бронза', en: 'Bronze' }, min: 0, weekly: 100 },
  { id: 'silver', name: { ru: 'Серебро', en: 'Silver' }, min: 1200, weekly: 200 },
  { id: 'gold', name: { ru: 'Золото', en: 'Gold' }, min: 1400, weekly: 350 },
  { id: 'platinum', name: { ru: 'Платина', en: 'Platinum' }, min: 1600, weekly: 500 },
  { id: 'diamond', name: { ru: 'Алмаз', en: 'Diamond' }, min: 1800, weekly: 700 },
  { id: 'master', name: { ru: 'Мастер', en: 'Master' }, min: 2000, weekly: 900 },
  { id: 'legend', name: { ru: 'Легенда', en: 'Legend' }, min: 2200, weekly: 1200 },
];

export function arenaLeague(rating: number) {
  let l = ARENA_LEAGUES[0];
  for (const x of ARENA_LEAGUES) if (rating >= x.min) l = x;
  return l;
}

export const ARENA_BOT_NAMES = [
  'Freya', 'Hilda', 'Runa', 'Svala', 'Eira', 'Kara', 'Nessa', 'Mira', 'Tova', 'Ylva', 'Brynja', 'Alva',
  'Ingrid', 'Solveig', 'Thyra', 'Gunnhild', 'Revna', 'Asta', 'Liv', 'Sigrun',
];

// ——— Бездна ———
export function abyssStage(level: number): number {
  return 600 + level;
}
