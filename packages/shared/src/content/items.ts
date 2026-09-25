import type { ClassId, ItemSlot, L10n, SpecialEffect, StatKey, Stats } from '../types';
import type { ArmorWeight } from './classes';
import type { SkillMod } from './effects';

export const SLOT_NAMES: Record<ItemSlot | 'ring1' | 'ring2', L10n> = {
  weapon: { ru: 'Оружие', en: 'Weapon' },
  offhand: { ru: 'Второе оружие', en: 'Off-hand' },
  helmet: { ru: 'Шлем', en: 'Helmet' },
  armor: { ru: 'Броня', en: 'Armor' },
  gloves: { ru: 'Перчатки', en: 'Gloves' },
  boots: { ru: 'Сапоги', en: 'Boots' },
  belt: { ru: 'Пояс', en: 'Belt' },
  cloak: { ru: 'Плащ', en: 'Cloak' },
  amulet: { ru: 'Амулет', en: 'Amulet' },
  ring: { ru: 'Кольцо', en: 'Ring' },
  ring1: { ru: 'Кольцо I', en: 'Ring I' },
  ring2: { ru: 'Кольцо II', en: 'Ring II' },
};

export const ITEM_RARITY_NAMES: L10n[] = [
  { ru: 'Обычный', en: 'Common' },
  { ru: 'Необычный', en: 'Uncommon' },
  { ru: 'Редкий', en: 'Rare' },
  { ru: 'Эпический', en: 'Epic' },
  { ru: 'Легендарный', en: 'Legendary' },
  { ru: 'Мифический', en: 'Mythic' },
  { ru: 'Божественный', en: 'Divine' },
];

export const ITEM_RARITY_COLORS = ['#9A9A9A', '#4FBF5A', '#3D7BE0', '#9B4DE0', '#F08A24', '#E03A3A', 'rainbow'];
export const HERO_RARITY_COLORS: Record<string, string> = { R: '#3D7BE0', SR: '#9B4DE0', SSR: '#F08A24', UR: '#E03A3A' };

export const WEAPON_CLASS: Record<string, ClassId> = {
  sword: 'guardian',
  axe: 'berserker',
  bow: 'archer',
  staff: 'sorceress',
  wand: 'priestess',
  scythe: 'necromancer',
  daggers: 'assassin',
  lute: 'bard',
  shield: 'guardian',
  horn: 'berserker',
  quiver: 'archer',
  orb: 'sorceress',
  tome: 'priestess',
  grimoire: 'necromancer',
  dagger: 'assassin',
  songbook: 'bard',
};

export const ARMOR_CLASSES: Record<ArmorWeight, ClassId[]> = {
  heavy: ['guardian', 'berserker'],
  medium: ['archer', 'assassin', 'bard'],
  light: ['sorceress', 'priestess', 'necromancer'],
};

export interface BaseItemDef {
  id: string;
  slot: ItemSlot;
  /** Тип оружия / второго оружия или вес брони. */
  type: string;
  tier: number;
  name: L10n;
  /** Возможные основные характеристики. */
  mains: StatKey[];
}

const WEAPON_NAMES: Record<string, [string, string][]> = {
  sword: [['Железный меч', 'Iron Sword'], ['Рыцарский клинок', "Knight's Blade"], ['Рунный меч', 'Runeblade'], ['Меч зари', 'Dawnsteel Sword']],
  axe: [['Боевой топор', 'Battle Axe'], ['Секира берсерка', "Berserker's Greataxe"], ['Рунная секира', 'Rune Greataxe'], ['Топор Рагнарёка', 'Ragnarok Axe']],
  bow: [['Охотничий лук', 'Hunting Bow'], ['Длинный лук', 'Longbow'], ['Эльфийский лук', 'Elven Bow'], ['Лук небосвода', 'Skyvault Bow']],
  staff: [['Посох ученицы', "Apprentice's Staff"], ['Посох стихий', 'Elemental Staff'], ['Кристальный посох', 'Crystal Staff'], ['Посох архимага', "Archmage's Staff"]],
  wand: [['Жезл послушницы', "Acolyte's Wand"], ['Жезл света', 'Wand of Light'], ['Жемчужный жезл', 'Pearl Wand'], ['Жезл серафима', "Seraph's Wand"]],
  scythe: [['Серп', 'Sickle'], ['Коса жнеца', "Reaper's Scythe"], ['Костяная коса', 'Bone Scythe'], ['Коса лунной смерти', 'Moondeath Scythe']],
  daggers: [['Парные ножи', 'Twin Knives'], ['Кинжалы тени', 'Shadow Daggers'], ['Клинки ночи', 'Nightblades'], ['Клыки Пустоты', 'Void Fangs']],
  lute: [['Простая лютня', 'Simple Lute'], ['Лютня странницы', "Wanderer's Lute"], ['Серебряная лютня', 'Silver Lute'], ['Лютня сфер', 'Lute of the Spheres']],
};
const OFFHAND_NAMES: Record<string, [string, string][]> = {
  shield: [['Круглый щит', 'Round Shield'], ['Башенный щит', 'Tower Shield']],
  horn: [['Боевой рог', 'War Horn'], ['Рог предков', 'Ancestral Horn']],
  quiver: [['Колчан', 'Quiver'], ['Колчан ветров', 'Quiver of Winds']],
  orb: [['Сфера фокуса', 'Focus Orb'], ['Сфера бури', 'Storm Orb']],
  tome: [['Молитвенник', 'Prayer Book'], ['Фолиант откровений', 'Tome of Revelations']],
  grimoire: [['Гримуар', 'Grimoire'], ['Книга мёртвых', 'Book of the Dead']],
  dagger: [['Стилет', 'Stiletto'], ['Кинжал убийцы', "Assassin's Dagger"]],
  songbook: [['Песенник', 'Songbook'], ['Партитура героинь', 'Score of Heroines']],
};
const ARMOR_NAMES: Record<string, Record<ArmorWeight, [string, string][]>> = {
  helmet: {
    heavy: [['Стальной шлем', 'Steel Helm'], ['Шлем рыцаря', "Knight's Helm"], ['Крылатый шлем', 'Winged Helm']],
    medium: [['Кожаный капюшон', 'Leather Hood'], ['Капюшон следопыта', "Ranger's Hood"], ['Маска тени', 'Shadow Mask']],
    light: [['Шляпа ученицы', "Apprentice's Hat"], ['Диадема мага', "Mage's Circlet"], ['Корона звездочёта', "Stargazer's Crown"]],
  },
  armor: {
    heavy: [['Кольчуга', 'Chainmail'], ['Латы', 'Plate Armor'], ['Доспех валькирии', 'Valkyrie Plate']],
    medium: [['Кожаная куртка', 'Leather Jerkin'], ['Бригантина', 'Brigandine'], ['Доспех ночи', 'Nightweave Armor']],
    light: [['Мантия', 'Robe'], ['Шёлковое одеяние', 'Silk Vestments'], ['Одеяние эфира', 'Aether Raiment']],
  },
  gloves: {
    heavy: [['Латные рукавицы', 'Gauntlets'], ['Перчатки ярости', 'Gauntlets of Fury'], ['Кулаки титана', 'Titan Fists']],
    medium: [['Кожаные перчатки', 'Leather Gloves'], ['Перчатки лучницы', "Archer's Gloves"], ['Перчатки тени', 'Shadow Gloves']],
    light: [['Шёлковые перчатки', 'Silk Gloves'], ['Перчатки чародейки', "Sorceress's Gloves"], ['Перчатки звёзд', 'Starweave Gloves']],
  },
  boots: {
    heavy: [['Латные сапоги', 'Plate Boots'], ['Сапоги стража', "Warden's Boots"], ['Поступь титана', 'Titan Treads']],
    medium: [['Кожаные сапоги', 'Leather Boots'], ['Сапоги следопыта', "Tracker's Boots"], ['Шаги ветра', 'Windstep Boots']],
    light: [['Сандалии', 'Sandals'], ['Туфли чародейки', "Sorceress's Slippers"], ['Туфельки облаков', 'Cloudstep Slippers']],
  },
};
const MISC_NAMES: Record<string, [string, string][]> = {
  belt: [['Кожаный пояс', 'Leather Belt'], ['Пояс воительницы', "Warrior's Belt"], ['Пояс силы', 'Girdle of Might'], ['Пояс титанов', 'Belt of Titans']],
  cloak: [['Дорожный плащ', 'Travel Cloak'], ['Плащ с гербом', 'Crested Cloak'], ['Плащ сумрака', 'Twilight Cloak'], ['Плащ небес', 'Cloak of the Heavens']],
  amulet: [['Медальон', 'Medallion'], ['Амулет стихий', 'Elemental Amulet'], ['Амулет луны', 'Moon Amulet'], ['Слеза Трона', 'Tear of the Throne']],
  ring: [['Медное кольцо', 'Copper Ring'], ['Серебряное кольцо', 'Silver Ring'], ['Кольцо с печатью', 'Signet Ring'], ['Кольцо Печати Света', 'Ring of the Light Seal']],
};

const OFFHAND_MAIN: Record<string, StatKey[]> = {
  shield: ['def'],
  horn: ['atk'],
  quiver: ['atk'],
  orb: ['atk'],
  tome: ['def', 'hp'],
  grimoire: ['atk'],
  dagger: ['atk'],
  songbook: ['def', 'hp'],
};

export const BASE_ITEMS: BaseItemDef[] = [];
for (const [type, names] of Object.entries(WEAPON_NAMES))
  names.forEach(([ru, en], i) => BASE_ITEMS.push({ id: `${type}_${i + 1}`, slot: 'weapon', type, tier: i + 1, name: { ru, en }, mains: ['atk'] }));
for (const [type, names] of Object.entries(OFFHAND_NAMES))
  names.forEach(([ru, en], i) =>
    BASE_ITEMS.push({ id: `${type}_${i + 1}`, slot: 'offhand', type, tier: i * 2 + 1, name: { ru, en }, mains: OFFHAND_MAIN[type] }),
  );
const ARMOR_MAIN: Record<string, StatKey[]> = { helmet: ['hp', 'def'], armor: ['hp', 'def'], gloves: ['atk', 'crit'], boots: ['spd', 'eva'] };
for (const [slot, weights] of Object.entries(ARMOR_NAMES))
  for (const [w, names] of Object.entries(weights))
    names.forEach(([ru, en], i) =>
      BASE_ITEMS.push({ id: `${slot}_${w}_${i + 1}`, slot: slot as ItemSlot, type: w, tier: i + 1, name: { ru, en }, mains: ARMOR_MAIN[slot] }),
    );
const MISC_MAIN: Record<string, StatKey[]> = {
  belt: ['hp'],
  cloak: ['def', 'resist'],
  amulet: ['atkPct', 'hpPct', 'defPct', 'critDmg', 'energyRegen'],
  ring: ['atk', 'hp', 'crit', 'pen', 'acc'],
};
for (const [slot, names] of Object.entries(MISC_NAMES))
  names.forEach(([ru, en], i) =>
    BASE_ITEMS.push({ id: `${slot}_${i + 1}`, slot: slot as ItemSlot, type: slot, tier: i + 1, name: { ru, en }, mains: MISC_MAIN[slot] }),
  );

export const BASE_ITEM_MAP: Record<string, BaseItemDef> = Object.fromEntries(BASE_ITEMS.map((b) => [b.id, b]));

/** Может ли класс надеть базовый предмет. */
export function canWear(cls: ClassId, base: BaseItemDef): boolean {
  if (base.slot === 'weapon' || base.slot === 'offhand') return WEAPON_CLASS[base.type] === cls;
  if (base.type === 'heavy' || base.type === 'medium' || base.type === 'light') return ARMOR_CLASSES[base.type as ArmorWeight].includes(cls);
  return true;
}

/** Основные характеристики: «exp» растут экспоненциально с уровнем предмета, «bounded» — ограниченно. */
export const MAIN_BASE: Partial<Record<StatKey, { v: number; exp: boolean }>> = {
  atk: { v: 14, exp: true },
  hp: { v: 130, exp: true },
  def: { v: 12, exp: true },
  spd: { v: 3, exp: false },
  crit: { v: 0.025, exp: false },
  eva: { v: 0.02, exp: false },
  resist: { v: 0.03, exp: false },
  atkPct: { v: 0.05, exp: false },
  hpPct: { v: 0.06, exp: false },
  defPct: { v: 0.06, exp: false },
  critDmg: { v: 0.08, exp: false },
  energyRegen: { v: 0.05, exp: false },
  pen: { v: 0.02, exp: false },
  acc: { v: 0.03, exp: false },
};

export interface AffixDef {
  id: string;
  stat: StatKey;
  /** Значение T1 на уровне 0 (для exp — масштабируется кривой снаряжения). */
  base: number;
  exp: boolean;
  weight: number;
  slots?: ItemSlot[];
}

const A = (id: string, stat: StatKey, base: number, exp: boolean, weight: number, slots?: ItemSlot[]): AffixDef => ({ id, stat, base, exp, weight, slots });
const JEWEL: ItemSlot[] = ['amulet', 'ring'];
const WPN: ItemSlot[] = ['weapon', 'offhand'];

export const AFFIXES: AffixDef[] = [
  A('hp', 'hp', 45, true, 10),
  A('atk', 'atk', 5, true, 10),
  A('def', 'def', 4, true, 10),
  A('hpPct', 'hpPct', 0.03, false, 8),
  A('atkPct', 'atkPct', 0.025, false, 8),
  A('defPct', 'defPct', 0.03, false, 8),
  A('spd', 'spd', 2, false, 5, ['boots', 'gloves', 'amulet', 'ring', 'cloak']),
  A('crit', 'crit', 0.012, false, 6),
  A('critDmg', 'critDmg', 0.03, false, 6),
  A('acc', 'acc', 0.015, false, 4),
  A('eva', 'eva', 0.012, false, 4, ['boots', 'cloak', 'helmet', 'armor', 'ring']),
  A('pen', 'pen', 0.012, false, 4, ['weapon', 'offhand', 'gloves', 'amulet', 'ring']),
  A('lifesteal', 'lifesteal', 0.01, false, 3, ['weapon', 'offhand', 'amulet', 'ring', 'gloves']),
  A('healPower', 'healPower', 0.025, false, 3),
  A('resist', 'resist', 0.015, false, 4),
  A('energyRegen', 'energyRegen', 0.02, false, 4),
  A('dmgFire', 'dmgFire', 0.025, false, 3),
  A('dmgNature', 'dmgNature', 0.025, false, 3),
  A('dmgWater', 'dmgWater', 0.025, false, 3),
  A('dmgLight', 'dmgLight', 0.025, false, 3),
  A('dmgDark', 'dmgDark', 0.025, false, 3),
  A('dmgBoss', 'dmgBoss', 0.03, false, 3, [...WPN, ...JEWEL, 'gloves']),
  A('dmgSkill', 'dmgSkill', 0.025, false, 3),
  A('dmgUlt', 'dmgUlt', 0.03, false, 3),
  A('dmgBasic', 'dmgBasic', 0.03, false, 3),
  A('dmgDot', 'dmgDot', 0.03, false, 3),
  A('dmgReduce', 'dmgReduce', 0.008, false, 3, ['helmet', 'armor', 'belt', 'cloak', 'offhand']),
  A('shieldPower', 'shieldPower', 0.03, false, 2),
  A('goldPct', 'goldPct', 0.03, false, 2, ['amulet', 'ring', 'belt', 'boots']),
  A('xpPct', 'xpPct', 0.03, false, 2, ['amulet', 'ring', 'belt', 'helmet']),
  A('lootDouble', 'lootDouble', 0.01, false, 1, ['amulet', 'ring']),
  A('skillRank', 'skillRank', 1, false, 0.4, ['weapon', 'amulet']),
];
export const AFFIX_MAP: Record<string, AffixDef> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));
/** Множители тиров T1…T5. */
export const TIER_MULT = [1, 1.4, 1.85, 2.4, 3.1];

// ——— Сеты: по 2 на акт + 6 эндгейм-сетов ———
export interface SetDef {
  id: string;
  name: L10n;
  act: number;
  bonus2: Stats;
  bonus4: Stats;
  fx4?: SpecialEffect;
  bonus6?: Stats;
  fx6: SpecialEffect;
  /** Сет режима: только добыча в своём режиме (не куётся и не выпадает в кампании). */
  mode?: 'rift' | 'horde' | 'spires' | 'tower';
}
export const SET_SLOTS: ItemSlot[] = ['helmet', 'armor', 'gloves', 'boots', 'belt', 'cloak'];

const S = (id: string, ru: string, en: string, act: number, b2: Stats, b4: Stats, fx6: SpecialEffect, fx4?: SpecialEffect): SetDef => ({
  id,
  name: { ru, en },
  act,
  bonus2: b2,
  bonus4: b4,
  fx4,
  fx6,
});

export const SETS: SetDef[] = [
  S('verdant', 'Облачение дриады', 'Dryad Raiment', 1, { hpPct: 0.12 }, { healPower: 0.2 }, { id: 'secondWind', v: 0.3 }),
  S('outlaw', 'Снаряжение разбойницы', 'Outlaw Gear', 1, { atkPct: 0.1 }, { crit: 0.1 }, { id: 'doubleStrike', v: 0.25 }),
  S('sandQueen', 'Облачение Песчаной королевы', "Sand Queen's Regalia", 2, { hpPct: 0.15 }, {}, { id: 'killStack', v: 0.1, n: 5 }, { id: 'immuneBlind' }),
  S('scorpion', 'Жало скорпиона', "Scorpion's Sting", 2, { dmgDot: 0.2 }, {}, { id: 'dotSpread' }, { id: 'poisonOnHit', v: 0.3 }),
  S('winter', 'Зимний двор', 'Winter Court', 3, { dmgWater: 0.15 }, { resist: 0.15 }, { id: 'frozenVuln', v: 0.4 }),
  S('harpy', 'Перья гарпии', 'Harpy Plumes', 3, { spd: 10 }, { eva: 0.1 }, { id: 'firstStrike', v: 0.5 }),
  S('tides', 'Доспех приливов', 'Tidal Armor', 4, { shieldPower: 0.2 }, { defPct: 0.15 }, { id: 'startShield', v: 0.3 }),
  S('siren', 'Песнь сирены', "Siren's Song", 4, { energyRegen: 0.15 }, { dmgUlt: 0.25 }, { id: 'startEnergy', n: 40 }),
  S('countess', 'Наряд графини', "Countess's Attire", 5, { lifesteal: 0.08 }, { atkPct: 0.15 }, { id: 'healOnKill', v: 0.15 }),
  S('gargoyle', 'Камень горгульи', 'Gargoyle Stone', 5, { defPct: 0.15 }, { dmgReduce: 0.1 }, { id: 'thorns', v: 0.3 }),
  S('inferno', 'Инферно', 'Inferno', 6, { dmgFire: 0.15 }, {}, { id: 'berserkLowHp', v: 0.05 }, { id: 'burnOnHit', v: 0.3 }),
  S('succubus', 'Искушение', 'Temptation', 6, { critDmg: 0.25 }, { crit: 0.1 }, { id: 'critEnergy', n: 15 }),
  S('valkyrie', 'Доспех валькирии', 'Valkyrie Armor', 7, { hpPct: 0.15 }, { dmgLight: 0.2 }, { id: 'guardianAngel' }),
  S('griffon', 'Упряжь грифона', 'Griffon Harness', 7, { spd: 12 }, { dmgBasic: 0.25 }, { id: 'chain', v: 0.5 }),
  S('clockwork', 'Часовой механизм', 'Clockwork', 8, { acc: 0.15 }, { pen: 0.12 }, { id: 'echo', n: 4 }),
  S('tinker', 'Инструменты гномки', "Tinker's Tools", 8, { dmgSkill: 0.15 }, { energyRegen: 0.2 }, { id: 'critStun', v: 0.25 }),
  S('lich', 'Регалии лича', "Lich's Regalia", 9, { dmgDark: 0.15 }, { dmgDot: 0.25 }, { id: 'summonOnAllyDeath', n: 2 }),
  S('banshee', 'Вуаль банши', "Banshee's Veil", 9, { resist: 0.15 }, { eva: 0.12 }, { id: 'counter', v: 0.3 }),
  S('chaos', 'Облачение Хаоса', 'Chaos Raiment', 10, { atkPct: 0.15 }, { dmgBoss: 0.25 }, { id: 'execute', v: 0.5 }),
  S('throne', 'Регалии Трона', 'Throne Regalia', 10, { hpPct: 0.15, atkPct: 0.1 }, { critDmg: 0.3 }, { id: 'phoenix', v: 0.4 }),
  S('abyss', 'Доспех Бездны', 'Abyssal Armor', 11, { dmgBoss: 0.2 }, { pen: 0.15 }, { id: 'killStack', v: 0.15, n: 5 }),
  S('eternity', 'Вечность', 'Eternity', 11, { hpPct: 0.2 }, { dmgReduce: 0.12 }, { id: 'secondWind', v: 0.5 }),
  S('starfall', 'Звездопад', 'Starfall', 11, { crit: 0.12 }, { critDmg: 0.4 }, { id: 'critEnergy', n: 20 }),
  S('aether', 'Эфирное облачение', 'Aether Vestments', 11, { energyRegen: 0.25 }, { dmgUlt: 0.35 }, { id: 'ultTeamHeal', v: 1.5 }),
  S('valhalla', 'Вальхалла', 'Valhalla', 11, { atkPct: 0.2 }, { lifesteal: 0.12 }, { id: 'lastStand', v: 0.4 }),
  S('nightmare', 'Кошмар', 'Nightmare', 11, { dmgSkill: 0.25 }, { dmgDot: 0.35 }, { id: 'echo', n: 3 }),
  // ——— сеты режимов: добываются только в своём режиме ———
  { ...S('colossus', 'Доспех Колосса', 'Colossus Plate', 12, { hpPct: 0.18 }, { dmgBoss: 0.3 }, { id: 'auraDef', v: 0.15 }), mode: 'rift' },
  { ...S('warband', 'Знамя Орды', 'Warband Banner', 12, { atkPct: 0.12 }, { lifesteal: 0.1 }, { id: 'killStack', v: 0.12, n: 6 }), mode: 'horde' },
  { ...S('prism', 'Стихийная призма', 'Elemental Prism', 12, { resist: 0.12, energyRegen: 0.1 }, { dmgSkill: 0.2 }, { id: 'cleanseTurn', v: 0.35 }), mode: 'spires' },
  { ...S('harlequin', 'Наряд арлекина', 'Harlequin Motley', 12, { eva: 0.1 }, { crit: 0.12 }, { id: 'auraCrit', v: 0.1 }), mode: 'tower' },
];
export const SET_MAP: Record<string, SetDef> = Object.fromEntries(SETS.map((s) => [s.id, s]));
export const ENDGAME_SETS = SETS.filter((s) => s.act > 10 && !s.mode).map((s) => s.id);
/** Сет, который добывается в режиме. */
export const MODE_SET: Record<NonNullable<SetDef['mode']>, string> = Object.fromEntries(SETS.filter((s) => s.mode).map((s) => [s.mode!, s.id])) as Record<NonNullable<SetDef['mode']>, string>;

// ——— Легендарные предметы с уникальными эффектами ———
export interface UniqueDef {
  id: string;
  name: L10n;
  slot: ItemSlot;
  type?: string;
  fx: SpecialEffect;
  mythic?: boolean;
}

export const LEGENDARIES: UniqueDef[] = [
  { id: 'morningStar', name: { ru: 'Посох Утренней звезды', en: 'Staff of the Morning Star' }, slot: 'weapon', type: 'staff', fx: { id: 'echo', n: 5 } },
  { id: 'bloodreaver', name: { ru: 'Секира Кровопийцы', en: 'Bloodreaver' }, slot: 'weapon', type: 'axe', fx: { id: 'healOnKill', v: 0.1 } },
  { id: 'windwhisper', name: { ru: 'Лук Шепчущего ветра', en: 'Windwhisper Bow' }, slot: 'weapon', type: 'bow', fx: { id: 'doubleStrike', v: 0.25 } },
  { id: 'oathkeeper', name: { ru: 'Хранитель клятвы', en: 'Oathkeeper' }, slot: 'weapon', type: 'sword', fx: { id: 'guardianAngel' } },
  { id: 'dawnWand', name: { ru: 'Жезл Рассвета', en: 'Wand of Dawn' }, slot: 'weapon', type: 'wand', fx: { id: 'overhealShield', v: 0.4 } },
  { id: 'soulreaper', name: { ru: 'Жнец душ', en: 'Soulreaper' }, slot: 'weapon', type: 'scythe', fx: { id: 'energyOnKill', n: 25 } },
  { id: 'twinFangs', name: { ru: 'Близнецы-клыки', en: 'Twin Fangs' }, slot: 'weapon', type: 'daggers', fx: { id: 'bleedOnHit', v: 0.4 } },
  { id: 'lullabyLute', name: { ru: 'Лютня колыбельной', en: 'Lullaby Lute' }, slot: 'weapon', type: 'lute', fx: { id: 'critStun', v: 0.25 } },
  { id: 'bastionShield', name: { ru: 'Щит Бастиона', en: 'Bastion Shield' }, slot: 'offhand', type: 'shield', fx: { id: 'thorns', v: 0.3 } },
  { id: 'hornOfWar', name: { ru: 'Рог Войны', en: 'Horn of War' }, slot: 'offhand', type: 'horn', fx: { id: 'auraAtk', v: 0.06 } },
  { id: 'quiverOfStars', name: { ru: 'Колчан звёзд', en: 'Quiver of Stars' }, slot: 'offhand', type: 'quiver', fx: { id: 'chain', v: 0.4 } },
  { id: 'phoenixOrb', name: { ru: 'Сфера феникса', en: 'Phoenix Orb' }, slot: 'offhand', type: 'orb', fx: { id: 'phoenix', v: 0.3 } },
  { id: 'tomeOfDawn', name: { ru: 'Фолиант Зари', en: 'Tome of Dawn' }, slot: 'offhand', type: 'tome', fx: { id: 'shieldOnUlt', v: 1.0 } },
  { id: 'necronomicon', name: { ru: 'Некрономикон', en: 'Necronomicon' }, slot: 'offhand', type: 'grimoire', fx: { id: 'dotSpread' } },
  { id: 'executioner', name: { ru: 'Кинжал палача', en: "Executioner's Dagger" }, slot: 'offhand', type: 'dagger', fx: { id: 'execute', v: 0.3 } },
  { id: 'songOfHope', name: { ru: 'Песнь надежды', en: 'Song of Hope' }, slot: 'offhand', type: 'songbook', fx: { id: 'auraHeal', v: 0.15 } },
  { id: 'crownOfThorns', name: { ru: 'Терновый венец', en: 'Crown of Thorns' }, slot: 'helmet', fx: { id: 'thorns', v: 0.2 } },
  { id: 'aegisPlate', name: { ru: 'Латы Эгиды', en: 'Aegis Plate' }, slot: 'armor', fx: { id: 'startShield', v: 0.2 } },
  { id: 'furyGauntlets', name: { ru: 'Перчатки неистовства', en: 'Gauntlets of Frenzy' }, slot: 'gloves', fx: { id: 'killStack', v: 0.08, n: 5 } },
  { id: 'hasteBoots', name: { ru: 'Сапоги стремительности', en: 'Boots of Haste' }, slot: 'boots', fx: { id: 'auraSpd', n: 6 } },
  { id: 'windBoots', name: { ru: 'Второе дыхание', en: 'Second Wind Treads' }, slot: 'boots', fx: { id: 'secondWind', v: 0.3 } },
  { id: 'giantBelt', name: { ru: 'Пояс великанши', en: "Giantess's Belt" }, slot: 'belt', fx: { id: 'lastStand', v: 0.3 } },
  { id: 'shadowCloak', name: { ru: 'Плащ теней', en: 'Cloak of Shadows' }, slot: 'cloak', fx: { id: 'ccImmuneFirst' } },
  { id: 'emberAmulet', name: { ru: 'Амулет углей', en: 'Amulet of Embers' }, slot: 'amulet', fx: { id: 'burnOnHit', v: 0.3 } },
  { id: 'tideAmulet', name: { ru: 'Амулет приливов', en: 'Amulet of Tides' }, slot: 'amulet', fx: { id: 'startEnergy', n: 30 } },
  { id: 'venomRing', name: { ru: 'Кольцо яда', en: 'Ring of Venom' }, slot: 'ring', fx: { id: 'poisonOnHit', v: 0.3 } },
  { id: 'sparkRing', name: { ru: 'Кольцо искр', en: 'Ring of Sparks' }, slot: 'ring', fx: { id: 'critEnergy', n: 10 } },
  { id: 'firstBloodRing', name: { ru: 'Кольцо первой крови', en: 'Ring of First Blood' }, slot: 'ring', fx: { id: 'firstStrike', v: 0.5 } },
  // ——— новые легендарки ———
  { id: 'foxfireBow', name: { ru: 'Лук лисьего огня', en: 'Foxfire Bow' }, slot: 'weapon', type: 'bow', fx: { id: 'burnOnHit', v: 0.4 } },
  { id: 'tidecaller', name: { ru: 'Посох Зова прилива', en: 'Tidecaller Staff' }, slot: 'weapon', type: 'staff', fx: { id: 'startEnergy', n: 40 } },
  { id: 'snowfang', name: { ru: 'Снежные клыки', en: 'Snowfangs' }, slot: 'weapon', type: 'daggers', fx: { id: 'frozenVuln', v: 0.35 } },
  { id: 'arenaAxe', name: { ru: 'Секира любимицы арены', en: "Crowd-Pleaser's Axe" }, slot: 'weapon', type: 'axe', fx: { id: 'killStack', v: 0.1, n: 5 } },
  { id: 'gladiatorShield', name: { ru: 'Щит гладиатора', en: "Gladiator's Shield" }, slot: 'offhand', type: 'shield', fx: { id: 'tauntStart', n: 2 } },
  { id: 'harlequinMask', name: { ru: 'Маска арлекина', en: 'Harlequin Mask' }, slot: 'helmet', fx: { id: 'auraCrit', v: 0.08 } },
  { id: 'coinBelt', name: { ru: 'Пояс звенящих монет', en: 'Belt of Jingling Coins' }, slot: 'belt', fx: { id: 'auraSpd', n: 4 } },
  { id: 'dragonHeart', name: { ru: 'Сердце морского дракона', en: 'Heart of the Sea Dragon' }, slot: 'amulet', fx: { id: 'cleanseTurn', v: 0.4 } },
  { id: 'bulwarkCloak', name: { ru: 'Плащ несокрушимой', en: 'Cloak of the Unyielding' }, slot: 'cloak', fx: { id: 'auraDef', v: 0.1 } },
];
export const LEGENDARY_MAP: Record<string, UniqueDef> = Object.fromEntries(LEGENDARIES.map((x) => [x.id, x]));

// ——— Мифические эффекты: меняют умение класса ———
export interface MythicDef {
  id: string;
  cls: ClassId;
  name: L10n;
  desc: L10n;
  target: 'basic' | 'ult';
  mod: Omit<SkillMod, 'skill'>;
}

export const MYTHICS: MythicDef[] = [
  { id: 'myth_guardian_a', cls: 'guardian', name: { ru: 'Вечный бастион', en: 'Eternal Bastion' }, desc: { ru: 'Ультимейт также лечит отряд на 10% HP стража', en: 'Ultimate also heals the party for 10% of her HP' }, target: 'ult', mod: { addEffects: [{ t: 'heal', target: 'allyAll', mult: 0.1, scale: 'hp' }] } },
  { id: 'myth_guardian_b', cls: 'guardian', name: { ru: 'Щитовой натиск', en: 'Shield Rush' }, desc: { ru: 'Базовая атака даёт щит на 5% HP', en: 'Basic attack grants a shield of 5% HP' }, target: 'basic', mod: { addEffects: [{ t: 'shield', target: 'self', mult: 0.05, scale: 'hp' }] } },
  { id: 'myth_berserker_a', cls: 'berserker', name: { ru: 'Круговой замах', en: 'Sweeping Swing' }, desc: { ru: 'Базовая атака бьёт весь передний ряд', en: 'Basic attack hits the whole front row' }, target: 'basic', mod: { addEffects: [{ t: 'dmg', target: 'enemyFront', mult: 0.5 }] } },
  { id: 'myth_berserker_b', cls: 'berserker', name: { ru: 'Бесконечное буйство', en: 'Endless Rampage' }, desc: { ru: 'Ультимейт наносит 2 дополнительных удара', en: 'Ultimate strikes 2 extra times' }, target: 'ult', mod: { extraHits: 2 } },
  { id: 'myth_archer_a', cls: 'archer', name: { ru: 'Двойная стрела', en: 'Twin Arrow' }, desc: { ru: 'Базовая атака выпускает две стрелы', en: 'Basic attack fires two arrows' }, target: 'basic', mod: { extraHits: 1 } },
  { id: 'myth_archer_b', cls: 'archer', name: { ru: 'Отравленный дождь', en: 'Venom Rain' }, desc: { ru: 'Ультимейт отравляет на 3 хода', en: 'Ultimate poisons for 3 turns' }, target: 'ult', mod: { addEffects: [{ t: 'dot', dot: 'poison', mult: 0.6, turns: 3 }] } },
  { id: 'myth_sorceress_a', cls: 'sorceress', name: { ru: 'Ледяной метеор', en: 'Frost Meteor' }, desc: { ru: 'Ультимейт замораживает с шансом 30%', en: 'Ultimate freezes with 30% chance' }, target: 'ult', mod: { addEffects: [{ t: 'cc', cc: 'freeze', chance: 0.3, turns: 1 }] } },
  { id: 'myth_sorceress_b', cls: 'sorceress', name: { ru: 'Раздвоенная молния', en: 'Forked Bolt' }, desc: { ru: 'Базовая атака поражает ещё одну цель', en: 'Basic attack hits one more target' }, target: 'basic', mod: { addEffects: [{ t: 'dmg', target: 'enemyRandom', mult: 0.7 }] } },
  { id: 'myth_priestess_a', cls: 'priestess', name: { ru: 'Сияющее исцеление', en: 'Radiant Healing' }, desc: { ru: 'Ультимейт также даёт щит', en: 'Ultimate also grants a shield' }, target: 'ult', mod: { addEffects: [{ t: 'shield', mult: 1.0 }] } },
  { id: 'myth_priestess_b', cls: 'priestess', name: { ru: 'Воскрешение', en: 'Resurrection' }, desc: { ru: 'Ультимейт воскрешает павшую союзницу с 30% HP', en: 'Ultimate revives a fallen ally with 30% HP' }, target: 'ult', mod: { addEffects: [{ t: 'revive', target: 'allyDead', pct: 0.3 }] } },
  { id: 'myth_necromancer_a', cls: 'necromancer', name: { ru: 'Легион костей', en: 'Bone Legion' }, desc: { ru: 'Ультимейт призывает ещё 2 скелетов', en: 'Ultimate summons 2 more skeletons' }, target: 'ult', mod: { addEffects: [{ t: 'summon', target: 'self', unit: 'skeleton', count: 2, mult: 0.5 }] } },
  { id: 'myth_necromancer_b', cls: 'necromancer', name: { ru: 'Чумная коса', en: 'Plague Scythe' }, desc: { ru: 'Базовая атака отравляет', en: 'Basic attack poisons' }, target: 'basic', mod: { addEffects: [{ t: 'dot', dot: 'poison', mult: 0.4, turns: 2 }] } },
  { id: 'myth_assassin_a', cls: 'assassin', name: { ru: 'Удар милосердия', en: 'Coup de Grâce' }, desc: { ru: 'Базовая атака +40% урона и казнь', en: 'Basic attack +40% damage and executes' }, target: 'basic', mod: { multBonus: 0.4, addEffects: [] } },
  { id: 'myth_assassin_b', cls: 'assassin', name: { ru: 'Метка бездны', en: 'Abyssal Mark' }, desc: { ru: 'Ультимейт поражает ещё одну цель', en: 'Ultimate hits one more target' }, target: 'ult', mod: { extraHits: 1 } },
  { id: 'myth_bard_a', cls: 'bard', name: { ru: 'Бесконечная песнь', en: 'Endless Song' }, desc: { ru: 'Ультимейт даёт отряду ещё 30 энергии', en: 'Ultimate grants 30 more energy to the party' }, target: 'ult', mod: { addEffects: [{ t: 'energy', amount: 30 }] } },
  { id: 'myth_bard_b', cls: 'bard', name: { ru: 'Громовой аккорд', en: 'Thunder Chord' }, desc: { ru: 'Базовая атака оглушает с шансом 20%', en: 'Basic attack stuns with 20% chance' }, target: 'basic', mod: { addEffects: [{ t: 'cc', cc: 'stun', chance: 0.2, turns: 1 }] } },
];
export const MYTHIC_MAP: Record<string, MythicDef> = Object.fromEntries(MYTHICS.map((x) => [x.id, x]));

// ——— Камни ———
export const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'] as const;
export type GemType = (typeof GEM_TYPES)[number];
export const GEM_STATS: Record<GemType, { stat: StatKey; values: number[]; name: L10n; color: string }> = {
  ruby: { stat: 'atkPct', values: [0.02, 0.035, 0.05, 0.07, 0.09, 0.12, 0.15, 0.2], name: { ru: 'Рубин', en: 'Ruby' }, color: '#E03A3A' },
  sapphire: { stat: 'defPct', values: [0.025, 0.04, 0.06, 0.08, 0.1, 0.13, 0.17, 0.22], name: { ru: 'Сапфир', en: 'Sapphire' }, color: '#3D7BE0' },
  emerald: { stat: 'hpPct', values: [0.025, 0.04, 0.06, 0.08, 0.1, 0.13, 0.17, 0.22], name: { ru: 'Изумруд', en: 'Emerald' }, color: '#4FBF5A' },
  topaz: { stat: 'crit', values: [0.01, 0.015, 0.022, 0.03, 0.04, 0.05, 0.065, 0.08], name: { ru: 'Топаз', en: 'Topaz' }, color: '#F2C040' },
  amethyst: { stat: 'critDmg', values: [0.03, 0.05, 0.07, 0.1, 0.13, 0.17, 0.21, 0.26], name: { ru: 'Аметист', en: 'Amethyst' }, color: '#9B4DE0' },
};

export function gemKey(type: GemType, lvl: number): string {
  return `${type}:${lvl}`;
}
export function parseGem(key: string): { type: GemType; lvl: number } {
  const [t, l] = key.split(':');
  return { type: t as GemType, lvl: Number(l) };
}

// ——— Кузница ———
export interface RecipeDef {
  id: string;
  name: L10n;
  kind: 'epic' | 'setLegendary' | 'divine' | 'legendary';
  cost: { gold?: number; forgeMats?: number; divineMats?: number; crystals?: number };
  /** Этап (сквозной), после которого рецепт открыт (босс акта). */
  unlockGlobal: number;
}

export const RECIPES: RecipeDef[] = [
  { id: 'epic', name: { ru: 'Гарантированный Эпический', en: 'Guaranteed Epic' }, kind: 'epic', cost: { forgeMats: 30, gold: 1 }, unlockGlobal: 20 },
  { id: 'legendary', name: { ru: 'Легендарный предмет', en: 'Legendary Item' }, kind: 'legendary', cost: { forgeMats: 150, gold: 1 }, unlockGlobal: 60 },
  { id: 'setLegendary', name: { ru: 'Легендарный из сета', en: 'Legendary Set Piece' }, kind: 'setLegendary', cost: { forgeMats: 200, gold: 1 }, unlockGlobal: 40 },
  { id: 'divine', name: { ru: 'Божественный из 3 Мифических', en: 'Divine from 3 Mythics' }, kind: 'divine', cost: { divineMats: 50, gold: 1 }, unlockGlobal: 400 },
];
