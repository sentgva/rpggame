import type { GearSlot, L10n, SetId, SubStat } from '../types';

/** Снаряжение 3.0: 4 слота, 6 редкостей, 8 доп. свойств, 6 сетов, слияние 3 → 1. */

export const SLOT_NAMES: Record<GearSlot, L10n> = {
  weapon: { ru: 'Оружие', en: 'Weapon' },
  helmet: { ru: 'Шлем', en: 'Helmet' },
  armor: { ru: 'Доспех', en: 'Armor' },
  boots: { ru: 'Сапоги', en: 'Boots' },
};

/** Что даёт слот как основное свойство. */
export const SLOT_MAIN: Record<GearSlot, 'atk' | 'hp' | 'def' | 'haste'> = {
  weapon: 'atk',
  helmet: 'hp',
  armor: 'def',
  boots: 'haste',
};

export const ITEM_RARITY_NAMES: L10n[] = [
  { ru: 'Обычный', en: 'Common' },
  { ru: 'Необычный', en: 'Uncommon' },
  { ru: 'Редкий', en: 'Rare' },
  { ru: 'Эпический', en: 'Epic' },
  { ru: 'Легендарный', en: 'Legendary' },
  { ru: 'Мифический', en: 'Mythic' },
];

export const ITEM_RARITY_COLORS = ['#A3ABBF', '#5FD38A', '#5AA8FF', '#B57BFF', '#FFC14D', '#FF5A6A'];

/** Виды предметов: для иконки (renderItemIcon: slot, type, tier) и названия. */
export interface ItemKindDef {
  id: string;
  slot: GearSlot;
  /** тип для иконки */
  type: string;
  /** названия по ступеням редкости: 0–1, 2–3, 4–5 */
  names: [L10n, L10n, L10n];
}

const N = (a: [string, string], b: [string, string], c: [string, string]): [L10n, L10n, L10n] => [
  { ru: a[0], en: a[1] },
  { ru: b[0], en: b[1] },
  { ru: c[0], en: c[1] },
];

export const ITEM_KINDS: ItemKindDef[] = [
  { id: 'sword', slot: 'weapon', type: 'sword', names: N(['Железный меч', 'Iron Sword'], ['Рунный меч', 'Runeblade'], ['Меч зари', 'Dawnsteel Sword']) },
  { id: 'daggers', slot: 'weapon', type: 'daggers', names: N(['Парные ножи', 'Twin Knives'], ['Кинжалы тени', 'Shadow Daggers'], ['Клыки Пустоты', 'Void Fangs']) },
  { id: 'wand', slot: 'weapon', type: 'wand', names: N(['Жезл послушницы', "Acolyte's Wand"], ['Жезл света', 'Wand of Light'], ['Жезл серафима', "Seraph's Wand"]) },
  { id: 'bow', slot: 'weapon', type: 'bow', names: N(['Охотничий лук', 'Hunting Bow'], ['Эльфийский лук', 'Elven Bow'], ['Лук небосвода', 'Skyvault Bow']) },
  { id: 'staff', slot: 'weapon', type: 'staff', names: N(['Посох ученицы', "Apprentice's Staff"], ['Посох проклятий', 'Staff of Hexes'], ['Посох Преисподней', 'Netherflame Staff']) },
  { id: 'crossbow', slot: 'weapon', type: 'bow', names: N(['Лёгкий арбалет', 'Light Crossbow'], ['Северный арбалет', 'Northern Crossbow'], ['Арбалет Вечной зимы', 'Crossbow of Endless Winter']) },
  { id: 'helm_heavy', slot: 'helmet', type: 'heavy', names: N(['Шлем стражника', "Guard's Helm"], ['Шлем паладина', "Paladin's Helm"], ['Корона бастиона', 'Bastion Crown']) },
  { id: 'helm_medium', slot: 'helmet', type: 'medium', names: N(['Кожаный капюшон', 'Leather Hood'], ['Капюшон следопыта', "Ranger's Hood"], ['Маска ночной тени', 'Nightshade Mask']) },
  { id: 'helm_light', slot: 'helmet', type: 'light', names: N(['Шёлковый обруч', 'Silk Circlet'], ['Диадема звёзд', 'Star Diadem'], ['Венец Эфира', 'Aether Crown']) },
  { id: 'armor_heavy', slot: 'armor', type: 'heavy', names: N(['Кольчуга', 'Chainmail'], ['Латы рыцаря', "Knight's Plate"], ['Латы зари', 'Dawnplate']) },
  { id: 'armor_medium', slot: 'armor', type: 'medium', names: N(['Кожаный жилет', 'Leather Vest'], ['Куртка охотника', "Hunter's Jacket"], ['Доспех теней', 'Shadow Harness']) },
  { id: 'armor_light', slot: 'armor', type: 'light', names: N(['Льняная мантия', 'Linen Robe'], ['Мантия мага', "Mage's Robe"], ['Облачение Эфира', 'Aether Vestment']) },
  { id: 'boots_heavy', slot: 'boots', type: 'heavy', names: N(['Окованные сапоги', 'Ironshod Boots'], ['Сабатоны', 'Sabatons'], ['Поступь титана', "Titan's Stride"]) },
  { id: 'boots_medium', slot: 'boots', type: 'medium', names: N(['Дорожные сапоги', 'Travel Boots'], ['Сапоги бегуньи', "Runner's Boots"], ['Сапоги ветра', 'Windwalkers']) },
  { id: 'boots_light', slot: 'boots', type: 'light', names: N(['Сандалии', 'Sandals'], ['Туфельки феи', 'Fairy Slippers'], ['Звёздные туфли', 'Starstep Slippers']) },
];
export const ITEM_KIND_MAP: Record<string, ItemKindDef> = Object.fromEntries(ITEM_KINDS.map((k) => [k.id, k]));
export const KINDS_BY_SLOT: Record<GearSlot, string[]> = {
  weapon: ITEM_KINDS.filter((k) => k.slot === 'weapon').map((k) => k.id),
  helmet: ITEM_KINDS.filter((k) => k.slot === 'helmet').map((k) => k.id),
  armor: ITEM_KINDS.filter((k) => k.slot === 'armor').map((k) => k.id),
  boots: ITEM_KINDS.filter((k) => k.slot === 'boots').map((k) => k.id),
};

/** Название предмета по виду и редкости. */
export function itemName(kind: string, rarity: number): L10n {
  const k = ITEM_KIND_MAP[kind];
  if (!k) return { ru: '?', en: '?' };
  return k.names[rarity >= 4 ? 2 : rarity >= 2 ? 1 : 0];
}

/** Доп. свойства: базовое значение (×subMult редкости) и разброс ±25%. */
export const SUB_DEFS: Record<SubStat, { name: L10n; base: number }> = {
  atkPct: { name: { ru: 'Атака', en: 'Attack' }, base: 0.06 },
  hpPct: { name: { ru: 'Здоровье', en: 'Health' }, base: 0.07 },
  defPct: { name: { ru: 'Защита', en: 'Defense' }, base: 0.08 },
  crit: { name: { ru: 'Шанс крита', en: 'Crit chance' }, base: 0.035 },
  critDmg: { name: { ru: 'Крит. урон', en: 'Crit damage' }, base: 0.08 },
  haste: { name: { ru: 'Скорость', en: 'Speed' }, base: 0.04 },
  skillDmg: { name: { ru: 'Урон навыков', en: 'Skill damage' }, base: 0.07 },
  lifesteal: { name: { ru: 'Вампиризм', en: 'Lifesteal' }, base: 0.025 },
};

export interface SetDef {
  id: SetId;
  name: L10n;
  /** Бонус за 2 вещи (характеристики) и за 4 (особый эффект в бою). */
  two: { stat: 'atk' | 'hp' | 'haste' | 'crit' | 'heal' | 'skillDmg'; v: number; text: L10n };
  four: L10n;
  color: string;
}

export const SETS: SetDef[] = [
  { id: 'fury', name: { ru: 'Ярость', en: 'Fury' }, color: '#FF6A4A', two: { stat: 'atk', v: 0.12, text: { ru: '+12% атаки', en: '+12% attack' } }, four: { ru: 'Ульты наносят +30% урона', en: 'Ultimates deal +30% damage' } },
  { id: 'bastion', name: { ru: 'Оплот', en: 'Bastion' }, color: '#6AA8FF', two: { stat: 'hp', v: 0.15, text: { ru: '+15% здоровья', en: '+15% health' } }, four: { ru: 'В начале боя — щит в 25% здоровья', en: 'Starts battle with a shield of 25% HP' } },
  { id: 'gale', name: { ru: 'Вихрь', en: 'Gale' }, color: '#5FE0C0', two: { stat: 'haste', v: 0.1, text: { ru: '+10% скорости', en: '+10% speed' } }, four: { ru: '+25% набора энергии', en: '+25% energy gain' } },
  { id: 'predator', name: { ru: 'Хищник', en: 'Predator' }, color: '#FFB84A', two: { stat: 'crit', v: 0.08, text: { ru: '+8% шанса крита', en: '+8% crit chance' } }, four: { ru: '+35% крит. урона', en: '+35% crit damage' } },
  { id: 'grace', name: { ru: 'Благодать', en: 'Grace' }, color: '#FF9AD0', two: { stat: 'heal', v: 0.15, text: { ru: '+15% силы лечения', en: '+15% healing' } }, four: { ru: 'Лечение и щиты союзникам сильнее на 25%', en: 'Heals and shields on allies are 25% stronger' } },
  { id: 'eclipse', name: { ru: 'Затмение', en: 'Eclipse' }, color: '#B57BFF', two: { stat: 'skillDmg', v: 0.12, text: { ru: '+12% урона навыков', en: '+12% skill damage' } }, four: { ru: 'Умения перезаряжаются на 20% быстрее', en: 'Skills recharge 20% faster' } },
];
export const SET_MAP: Record<SetId, SetDef> = Object.fromEntries(SETS.map((s) => [s.id, s])) as Record<SetId, SetDef>;
