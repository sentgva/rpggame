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

/** Подземелье дня: награда ×1.5 (подземелья сменяются по кругу каждый день, UTC). */
export const DUNGEON_DAY_BONUS = 1.5;
export function dungeonOfDay(now: number): string {
  return DUNGEONS[Math.floor(now / 86400000) % DUNGEONS.length].id;
}

/** Уровень силы врагов подземелья (1 → 10, 20 → 257 ≈ Hard 10-20). */
export function dungeonStage(level: number): number {
  return 13 * level - 3;
}

// ——— Башня испытаний ———
/** Уровень силы врагов этажа Башни (500-й этаж ≈ 283, чуть выше Nightmare 10-20). */
export function towerStage(floor: number): number {
  return Math.round(8 + floor * 0.55);
}

export const TOWER_SKIN_FLOORS: Record<number, string> = {
  50: 'mirabel_pearl',
  100: 'keira_winter',
  150: 'coral_beach',
  200: 'seyra_autumn',
  250: 'brianna_beach',
  300: 'celestine_nova',
  350: 'ophelia_lace',
  450: 'elegy_lace',
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
/** Уровень силы врагов Бездны: продолжение после Nightmare 10-20 (≈270). */
export function abyssStage(level: number): number {
  return 270 + level;
}

// ——— Разлом Колосса (мировой босс) ———
/** Колосс дня: пн — пламя, вт — глубины, ср — чаща, чт — заря, пт — бездна; в выходные — по кругу. */
export const RIFT_ROTATION: Element[] = ['fire', 'water', 'nature', 'light', 'dark'];

export const RIFT_COLOSSUS: Record<Element, string> = {
  fire: 'colossus_pyra',
  water: 'colossus_tidea',
  nature: 'colossus_verda',
  light: 'colossus_sola',
  dark: 'colossus_umbra',
};

/** Пороги ярусов награды: доля HP Колосса, снятая за бой (ярус 10 — убийство или 40%). */
export const RIFT_TIERS = [0.01, 0.02, 0.035, 0.05, 0.07, 0.1, 0.14, 0.2, 0.28, 0.4];

export function riftElement(now: number): Element {
  const day = new Date(now).getUTCDay(); // 0 — воскресенье
  if (day >= 1 && day <= 5) return RIFT_ROTATION[day - 1];
  const week = Math.floor(now / (7 * 86400000));
  return RIFT_ROTATION[(week * 2 + (day === 6 ? 0 : 1)) % RIFT_ROTATION.length];
}

export function riftTier(dmg: number, hp: number, killed = false): number {
  if (killed) return RIFT_TIERS.length;
  let t = 0;
  for (const th of RIFT_TIERS) if (dmg >= hp * th) t++;
  return t;
}

// ——— Стихийные шпили ———
/** Какие шпили открыты: в будни — по одному, в выходные — все. */
export function spireOpen(el: Element, now: number): boolean {
  const day = new Date(now).getUTCDay();
  if (day === 0 || day === 6) return true;
  return RIFT_ROTATION[day - 1] === el;
}

/** Уровень силы врагов шпиля: отряд одной стихии слабее полного, поэтому растёт мягче Башни. */
export function spireStage(floor: number): number {
  return Math.round(4 + floor * 1.6);
}

// ——— Нашествие ———
/** Уровень силы волны: от чуть ниже текущего фарма и выше с каждой волной. */
export function hordeStage(farm: number, wave: number): number {
  return Math.max(1, farm - 12) + Math.round(wave * 2.2);
}

// ——— Интерактивность режимов: решения игрока ———

/** Множители характеристик врагов (1 — без изменений). */
export interface EnemyMod {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
}

/** Нашествие: каждые N волн — выбор одного из трёх благословений на весь забег. */
export const HORDE_BLESS_EVERY = 3;
export interface HordeBlessing {
  id: string;
  name: L10n;
  desc: L10n;
  /** Бонус отряду до конца забега (складывается). */
  stats?: Stats;
  /** Мгновенно: лечение выживших (доля HP) и подъём павших (доля HP). */
  heal?: number;
  revive?: number;
  /** Надбавка к золоту и пыли за волны. */
  rewardPct?: number;
}
export const HORDE_BLESSINGS: HordeBlessing[] = [
  { id: 'fury', name: { ru: 'Ярость', en: 'Fury' }, desc: { ru: '+20% к атаке отряда', en: '+20% squad attack' }, stats: { atkPct: 0.2 } },
  { id: 'bulwark', name: { ru: 'Стена щитов', en: 'Shield Wall' }, desc: { ru: '+25% к здоровью', en: '+25% health' }, stats: { hpPct: 0.25 } },
  { id: 'haste', name: { ru: 'Попутный ветер', en: 'Tailwind' }, desc: { ru: '+12 к скорости', en: '+12 speed' }, stats: { spd: 12 } },
  { id: 'keen', name: { ru: 'Острый глаз', en: 'Keen Eye' }, desc: { ru: '+10% шанса и +25% урона крита', en: '+10% crit chance, +25% crit damage' }, stats: { crit: 0.1, critDmg: 0.25 } },
  { id: 'leech', name: { ru: 'Жажда крови', en: 'Bloodthirst' }, desc: { ru: '+10% вампиризма', en: '+10% lifesteal' }, stats: { lifesteal: 0.1 } },
  { id: 'arcane', name: { ru: 'Эфирный прилив', en: 'Aether Surge' }, desc: { ru: '+30% урона ультимейтов и +20% энергии', en: '+30% ultimate damage, +20% energy' }, stats: { dmgUlt: 0.3, energyRegen: 0.2 } },
  { id: 'stone', name: { ru: 'Каменная кожа', en: 'Stoneskin' }, desc: { ru: '−12% получаемого урона', en: '−12% damage taken' }, stats: { dmgReduce: 0.12 } },
  { id: 'pact', name: { ru: 'Кровавый пакт', en: 'Blood Pact' }, desc: { ru: '+40% к атаке, но −20% здоровья', en: '+40% attack, but −20% health' }, stats: { atkPct: 0.4, hpPct: -0.2 } },
  { id: 'mend', name: { ru: 'Передышка', en: 'Respite' }, desc: { ru: 'Выжившие лечатся на 50%, павшие встают с 30% HP', en: 'Survivors heal 50%, the fallen rise with 30% HP' }, heal: 0.5, revive: 0.3 },
  { id: 'greed', name: { ru: 'Жадность', en: 'Greed' }, desc: { ru: '+50% золота и пыли за волны', en: '+50% gold and dust per wave' }, rewardPct: 0.5 },
];
export const HORDE_BLESSING_MAP: Record<string, HordeBlessing> = Object.fromEntries(HORDE_BLESSINGS.map((b) => [b.id, b]));

/** Башня: у каждого обычного этажа свой модификатор (у этажей со стражем — нет). */
export interface TowerMod {
  id: string;
  name: L10n;
  desc: L10n;
  enemy?: EnemyMod;
  hero?: Stats;
}
export const TOWER_MODS: TowerMod[] = [
  { id: 'giants', name: { ru: 'Великаны', en: 'Giants' }, desc: { ru: 'Враги: +40% здоровья, −10% скорости', en: 'Enemies: +40% HP, −10% speed' }, enemy: { hp: 1.4, spd: 0.9 } },
  { id: 'frenzy', name: { ru: 'Бешенство', en: 'Frenzy' }, desc: { ru: 'Враги: +20% атаки и +15% скорости', en: 'Enemies: +20% attack, +15% speed' }, enemy: { atk: 1.2, spd: 1.15 } },
  { id: 'ironclad', name: { ru: 'Железная шкура', en: 'Ironclad' }, desc: { ru: 'Враги: +60% защиты', en: 'Enemies: +60% defense' }, enemy: { def: 1.6 } },
  { id: 'glass', name: { ru: 'Стеклянные пушки', en: 'Glass Cannons' }, desc: { ru: 'Враги: −30% здоровья, но +35% атаки', en: 'Enemies: −30% HP, but +35% attack' }, enemy: { hp: 0.7, atk: 1.35 } },
  { id: 'blessing', name: { ru: 'Благословение', en: 'Blessing' }, desc: { ru: 'Ваши героини: +25% лечения и +10% здоровья', en: 'Your heroines: +25% healing, +10% HP' }, hero: { healPower: 0.25, hpPct: 0.1 } },
  { id: 'storm', name: { ru: 'Эфирная буря', en: 'Aether Storm' }, desc: { ru: 'Ваши героини: +40% урона ультимейтов и +25% энергии', en: 'Your heroines: +40% ultimate damage, +25% energy' }, hero: { dmgUlt: 0.4, energyRegen: 0.25 } },
  { id: 'calm', name: { ru: 'Затишье', en: 'Calm' }, desc: { ru: 'Без особых условий', en: 'No special conditions' } },
];
export const TOWER_MOD_MAP: Record<string, TowerMod> = Object.fromEntries(TOWER_MODS.map((m) => [m.id, m]));

export function towerMod(floor: number): TowerMod | null {
  if (floor % 10 === 0) return null;
  // перемешиваем, чтобы соседние этажи не повторялись по кругу
  return TOWER_MODS[(floor * 5 + Math.floor(floor / 7)) % TOWER_MODS.length];
}

/** Испытание в Башне: враги сильнее, награда вдвое больше. */
export const TOWER_HARD: EnemyMod = { hp: 1.6, atk: 1.3 };
export const TOWER_HARD_REWARD = 2;

/** Разлом: тактика перед атакой на Колосса. */
export interface RiftTactic {
  id: string;
  name: L10n;
  desc: L10n;
  stats: Stats;
}
export const RIFT_TACTICS: RiftTactic[] = [
  { id: 'none', name: { ru: 'Без тактики', en: 'No tactic' }, desc: { ru: 'Отряд как есть', en: 'The squad as is' }, stats: {} },
  { id: 'assault', name: { ru: 'Натиск', en: 'Assault' }, desc: { ru: '+30% атаки, −20% здоровья', en: '+30% attack, −20% health' }, stats: { atkPct: 0.3, hpPct: -0.2 } },
  { id: 'bastion', name: { ru: 'Бастион', en: 'Bastion' }, desc: { ru: '+35% здоровья, −12% урона по вам, −15% атаки', en: '+35% health, −12% damage taken, −15% attack' }, stats: { hpPct: 0.35, dmgReduce: 0.12, atkPct: -0.15 } },
  { id: 'ritual', name: { ru: 'Ритуал', en: 'Ritual' }, desc: { ru: '+40% урона ультимейтов, +30% энергии, −10% атаки', en: '+40% ultimate damage, +30% energy, −10% attack' }, stats: { dmgUlt: 0.4, energyRegen: 0.3, atkPct: -0.1 } },
];
export const RIFT_TACTIC_MAP: Record<string, RiftTactic> = Object.fromEntries(RIFT_TACTICS.map((x) => [x.id, x]));
