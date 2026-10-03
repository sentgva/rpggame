import type { Currency, Element, FinalStats, L10n } from '../types';

/** Режимы 3.0: Башня испытаний, Подземелья, Колосс и Знамя Легиона. */

/** Множители характеристик врагов. */
export interface EnemyMod {
  hp?: number;
  atk?: number;
  def?: number;
  haste?: number;
}

/** Прибавки отряду: atk/hp/def — проценты к характеристике, остальное — прибавка к значению. */
export type HeroMod = Partial<Record<keyof FinalStats, number>>;

export interface TowerMod {
  id: string;
  name: L10n;
  desc: L10n;
  enemy?: EnemyMod;
  hero?: HeroMod;
}

export const TOWER_MODS: TowerMod[] = [
  { id: 'giants', name: { ru: 'Великаны', en: 'Giants' }, desc: { ru: 'Враги: +40% здоровья, −10% скорости', en: 'Enemies: +40% HP, −10% speed' }, enemy: { hp: 1.4, haste: 0.9 } },
  { id: 'frenzy', name: { ru: 'Бешенство', en: 'Frenzy' }, desc: { ru: 'Враги: +20% атаки и +15% скорости', en: 'Enemies: +20% attack, +15% speed' }, enemy: { atk: 1.2, haste: 1.15 } },
  { id: 'ironclad', name: { ru: 'Железная шкура', en: 'Ironclad' }, desc: { ru: 'Враги: +60% защиты', en: 'Enemies: +60% defense' }, enemy: { def: 1.6 } },
  { id: 'glass', name: { ru: 'Стеклянные пушки', en: 'Glass Cannons' }, desc: { ru: 'Враги: −30% здоровья, но +35% атаки', en: 'Enemies: −30% HP, but +35% attack' }, enemy: { hp: 0.7, atk: 1.35 } },
  { id: 'blessing', name: { ru: 'Благословение', en: 'Blessing' }, desc: { ru: 'Ваш отряд: +25% лечения и +10% здоровья', en: 'Your squad: +25% healing, +10% HP' }, hero: { heal: 0.25, hp: 0.1 } },
  { id: 'storm', name: { ru: 'Эфирная буря', en: 'Aether Storm' }, desc: { ru: 'Ваш отряд: +30% урона навыков и +25% энергии', en: 'Your squad: +30% skill damage, +25% energy' }, hero: { skillDmg: 0.3, energy: 0.25 } },
  { id: 'calm', name: { ru: 'Затишье', en: 'Calm' }, desc: { ru: 'Без особых условий', en: 'No special conditions' } },
];
export const TOWER_MOD_MAP: Record<string, TowerMod> = Object.fromEntries(TOWER_MODS.map((m) => [m.id, m]));

/** Условие этажа Башни (на каждом 10-м — хозяйка этажа без условий). */
export function towerMod(floor: number): TowerMod | null {
  if (floor % 10 === 0) return null;
  return TOWER_MODS[(floor * 5 + Math.floor(floor / 7)) % TOWER_MODS.length];
}

/** Уровень врагов этажа Башни. */
export function towerLevel(floor: number): number {
  return Math.round(6 + floor * 1.7);
}

/** Награда за первое прохождение этажа: кристаллы и Тома; каждый 10-й — веха. */
export function towerReward(floor: number): { cur: Partial<Record<Currency, number>>; item?: 3 | 4; milestone: boolean } {
  const milestone = floor % 10 === 0;
  const cur: Partial<Record<Currency, number>> = { crystals: 10 + Math.floor(floor / 5) * 2 };
  if (floor % 3 === 0) cur.books = 1 + Math.floor(floor / 60);
  if (floor % 5 === 0) cur.emblems = 3 + Math.floor(floor / 25);
  if (milestone) {
    cur.crystals = (cur.crystals ?? 0) + 80;
    cur.emblems = (cur.emblems ?? 0) + 10;
  }
  return { cur, item: milestone ? (floor % 50 === 0 ? 4 : 3) : undefined, milestone };
}

/** Этажи, где Башня дарит облик коллекции (по порядку из пула 'tower'). */
export const TOWER_SKIN_EVERY = 25;

// ——— Тактики (бой с боссом праздника) ———

export interface Tactic {
  id: string;
  name: L10n;
  desc: L10n;
  mod: HeroMod;
}
export const TACTICS: Tactic[] = [
  { id: 'none', name: { ru: 'Без тактики', en: 'No tactic' }, desc: { ru: 'Отряд как есть', en: 'The squad as is' }, mod: {} },
  { id: 'assault', name: { ru: 'Натиск', en: 'Assault' }, desc: { ru: '+30% атаки, −20% здоровья', en: '+30% attack, −20% health' }, mod: { atk: 0.3, hp: -0.2 } },
  { id: 'bastion', name: { ru: 'Бастион', en: 'Bastion' }, desc: { ru: '+35% здоровья, −12% урона по вам, −15% атаки', en: '+35% health, −12% damage taken, −15% attack' }, mod: { hp: 0.35, dmgRed: 0.12, atk: -0.15 } },
  { id: 'ritual', name: { ru: 'Ритуал', en: 'Ritual' }, desc: { ru: '+40% урона навыков, +30% энергии, −10% атаки', en: '+40% skill damage, +30% energy, −10% attack' }, mod: { skillDmg: 0.4, energy: 0.3, atk: -0.1 } },
];
export const TACTIC_MAP: Record<string, Tactic> = Object.fromEntries(TACTICS.map((x) => [x.id, x]));

// ——— Подземелья ———

export interface DungeonDef {
  id: 'gold' | 'library' | 'forge';
  name: L10n;
  desc: L10n;
  icon: string;
  /** Стихия врагов и фон. */
  act: number;
}

export const DUNGEONS: DungeonDef[] = [
  { id: 'gold', name: { ru: 'Золотая жила', en: 'Gold Vein' }, desc: { ru: 'Много золота', en: 'Lots of gold' }, icon: 'gold', act: 2 },
  { id: 'library', name: { ru: 'Библиотека', en: 'Library' }, desc: { ru: 'Тома знаний и опыт', en: 'Tomes and XP' }, icon: 'books', act: 9 },
  { id: 'forge', name: { ru: 'Кузня', en: 'Forge' }, desc: { ru: 'Сталь и снаряжение', en: 'Steel and gear' }, icon: 'steel', act: 6 },
];
export const DUNGEON_MAP: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));

/** Уровни врагов по ступеням подземелья. */
export const DUNGEON_LEVELS = [8, 20, 35, 55, 80, 110, 150, 200, 260, 330, 410, 500];

/** Подземелье дня: награда ×1,5. */
export const DUNGEON_DAY_BONUS = 1.5;
export function dungeonOfDay(now: number): DungeonDef['id'] {
  const day = Math.floor(now / 86400000);
  return DUNGEONS[day % DUNGEONS.length].id;
}

/** Награда ступени: золото и опыт — в минутах дохода на уровне ступени, остальное — штуками. */
export function dungeonReward(id: DungeonDef['id'], tier: number): { goldMin?: number; xpMin?: number; books?: number; steel?: number; items?: number } {
  const t = tier;
  switch (id) {
    case 'gold':
      return { goldMin: 60 + t * 10 };
    case 'library':
      return { books: 2 + t, xpMin: 30 + t * 5 };
    case 'forge':
      return { steel: 20 + t * 12, items: 1 + Math.floor(t / 4) };
  }
}

// ——— Колосс (рейд-босс) ———

/** Колосс дня недели: стихия → id колосса. */
export const RAID_ROTATION: Element[] = ['fire', 'water', 'nature', 'light', 'dark'];
export const RAID_COLOSSUS: Record<Element, string> = {
  fire: 'colossus_pyra',
  water: 'colossus_tidea',
  nature: 'colossus_verda',
  light: 'colossus_sola',
  dark: 'colossus_umbra',
};
export function raidElement(now: number): Element {
  const day = Math.floor(now / 86400000);
  return RAID_ROTATION[day % RAID_ROTATION.length];
}

/** Здоровье колосса в «здоровьях обычного врага» его уровня. */
export const RAID_HP = 400;
/** Пороги урона (доля здоровья колосса) и награды за них — раз в день. */
export const RAID_TIERS: { at: number; cur: Partial<Record<Currency, number>> }[] = [
  { at: 0.02, cur: { crystals: 20, steel: 20 } },
  { at: 0.05, cur: { books: 2, steel: 30 } },
  { at: 0.1, cur: { crystals: 30, emblems: 3 } },
  { at: 0.18, cur: { books: 3, steel: 50 } },
  { at: 0.28, cur: { crystals: 50, emblems: 5 } },
  { at: 0.4, cur: { books: 4, steel: 80 } },
  { at: 0.55, cur: { crystals: 80, emblems: 8 } },
  { at: 0.75, cur: { books: 6, steel: 120 } },
  { at: 1, cur: { crystals: 150, emblems: 15 } },
];

// ——— Знамя Легиона ———

export interface BannerDef {
  id: 'atk' | 'hp' | 'def' | 'gold' | 'xp' | 'loot' | 'chest';
  name: L10n;
  desc: L10n;
  icon: string;
  /** Прибавка за уровень (доля или минуты для chest). */
  per: number;
  max: number;
  /** Множитель цены (в минутах дохода золота). */
  price: number;
}

export const BANNER: BannerDef[] = [
  { id: 'atk', name: { ru: 'Клинок', en: 'Blade' }, desc: { ru: '+2% атаки Легиона', en: '+2% Legion attack' }, icon: 'sword', per: 0.02, max: 50, price: 8 },
  { id: 'hp', name: { ru: 'Щит', en: 'Shield' }, desc: { ru: '+2% здоровья Легиона', en: '+2% Legion health' }, icon: 'shield', per: 0.02, max: 50, price: 8 },
  { id: 'def', name: { ru: 'Твердь', en: 'Bedrock' }, desc: { ru: '+2% защиты Легиона', en: '+2% Legion defense' }, icon: 'armor', per: 0.02, max: 50, price: 6 },
  { id: 'gold', name: { ru: 'Казна', en: 'Treasury' }, desc: { ru: '+5% золота', en: '+5% gold' }, icon: 'gold', per: 0.05, max: 60, price: 10 },
  { id: 'xp', name: { ru: 'Летопись', en: 'Chronicle' }, desc: { ru: '+5% опыта', en: '+5% XP' }, icon: 'xp', per: 0.05, max: 60, price: 10 },
  { id: 'loot', name: { ru: 'Удача', en: 'Fortune' }, desc: { ru: '+4% к шансу редких вещей', en: '+4% rare item chance' }, icon: 'clover', per: 0.04, max: 25, price: 14 },
  { id: 'chest', name: { ru: 'Привал', en: 'Rest' }, desc: { ru: '+30 мин к лимиту сундука', en: '+30 min chest limit' }, icon: 'chest', per: 30, max: 24, price: 16 },
];
export const BANNER_MAP: Record<string, BannerDef> = Object.fromEntries(BANNER.map((b) => [b.id, b]));
