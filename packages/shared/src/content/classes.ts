import type { ClassId, Element, L10n, SpecialEffect, Stats } from '../types';
import type { SkillDef } from './effects';

export type ArmorWeight = 'heavy' | 'medium' | 'light';

export interface SpecDef {
  id: 'A' | 'B';
  name: L10n;
  desc: L10n;
  ult: string;
  passive: Stats;
  fx?: SpecialEffect;
}

export interface ClassDef {
  id: ClassId;
  name: L10n;
  role: L10n;
  row: 'front' | 'back';
  /** Приоритет целей: ассасины бьют задний ряд, лекари лечат союзниц. */
  targeting: 'nearest' | 'back' | 'healer';
  base: { hp: number; atk: number; def: number; spd: number; crit?: number; critDmg?: number; healPower?: number };
  weapon: string;
  offhand: string;
  armor: ArmorWeight;
  basic: string;
  ult: string;
  specs: [SpecDef, SpecDef];
  /** Бонус за 2 героини одного класса в отряде. */
  synergy: Stats;
  synergyText: L10n;
  branches: [L10n, L10n, L10n];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  guardian: {
    id: 'guardian',
    name: { ru: 'Страж', en: 'Guardian' },
    role: { ru: 'Танк, передний ряд', en: 'Tank, front row' },
    row: 'front',
    targeting: 'nearest',
    base: { hp: 1250, atk: 62, def: 85, spd: 95 },
    weapon: 'sword',
    offhand: 'shield',
    armor: 'heavy',
    basic: 'guardian.basic',
    ult: 'guardian.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Паладин', en: 'Paladin' },
        desc: { ru: 'Щиты на весь отряд', en: 'Shields for the whole party' },
        ult: 'guardian.ultA',
        passive: { shieldPower: 0.3, hpPct: 0.1 },
        fx: { id: 'guardianAngel' },
      },
      {
        id: 'B',
        name: { ru: 'Бастион', en: 'Bastion' },
        desc: { ru: 'Провокация и отражение урона', en: 'Taunt and damage reflection' },
        ult: 'guardian.ultB',
        passive: { defPct: 0.2, dmgReduce: 0.08 },
        fx: { id: 'thorns', v: 0.25 },
      },
    ],
    synergy: { defPct: 0.15 },
    synergyText: { ru: '+15% защиты отряду', en: '+15% party DEF' },
    branches: [
      { ru: 'Твердыня', en: 'Bulwark' },
      { ru: 'Возмездие', en: 'Retribution' },
      { ru: 'Клятва', en: 'Oath' },
    ],
  },
  berserker: {
    id: 'berserker',
    name: { ru: 'Берсерк', en: 'Berserker' },
    role: { ru: 'Ближний урон', en: 'Melee damage' },
    row: 'front',
    targeting: 'nearest',
    base: { hp: 980, atk: 96, def: 48, spd: 100 },
    weapon: 'axe',
    offhand: 'horn',
    armor: 'heavy',
    basic: 'berserker.basic',
    ult: 'berserker.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Кровавая фурия', en: 'Blood Fury' },
        desc: { ru: 'Вампиризм', en: 'Lifesteal' },
        ult: 'berserker.ultA',
        passive: { lifesteal: 0.15, atkPct: 0.1 },
        fx: { id: 'berserkLowHp', v: 0.05 },
      },
      {
        id: 'B',
        name: { ru: 'Воительница бури', en: 'Storm Warrior' },
        desc: { ru: 'Урон по площади', en: 'Area damage' },
        ult: 'berserker.ultB',
        passive: { dmgSkill: 0.2, atkPct: 0.1 },
        fx: { id: 'chain', v: 0.5 },
      },
    ],
    synergy: { lifesteal: 0.1 },
    synergyText: { ru: '+10% вампиризма отряду', en: '+10% party lifesteal' },
    branches: [
      { ru: 'Кровь', en: 'Blood' },
      { ru: 'Буря', en: 'Storm' },
      { ru: 'Ярость', en: 'Fury' },
    ],
  },
  archer: {
    id: 'archer',
    name: { ru: 'Лучница', en: 'Archer' },
    role: { ru: 'Дальний урон', en: 'Ranged damage' },
    row: 'back',
    targeting: 'nearest',
    base: { hp: 660, atk: 112, def: 32, spd: 106, crit: 0.1 },
    weapon: 'bow',
    offhand: 'quiver',
    armor: 'medium',
    basic: 'archer.basic',
    ult: 'archer.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Снайпер', en: 'Sniper' },
        desc: { ru: 'Криты по одной цели', en: 'Single-target crits' },
        ult: 'archer.ultA',
        passive: { crit: 0.12, critDmg: 0.3 },
        fx: { id: 'execute', v: 0.3 },
      },
      {
        id: 'B',
        name: { ru: 'Охотница', en: 'Huntress' },
        desc: { ru: 'Ловушки и яды', en: 'Traps and poisons' },
        ult: 'archer.ultB',
        passive: { dmgDot: 0.3, atkPct: 0.1 },
        fx: { id: 'poisonOnHit', v: 0.35 },
      },
    ],
    synergy: { crit: 0.1 },
    synergyText: { ru: '+10% шанса крита отряду', en: '+10% party crit chance' },
    branches: [
      { ru: 'Меткость', en: 'Marksman' },
      { ru: 'Ловушки', en: 'Trapper' },
      { ru: 'Ветер', en: 'Wind' },
    ],
  },
  sorceress: {
    id: 'sorceress',
    name: { ru: 'Волшебница', en: 'Sorceress' },
    role: { ru: 'Маг, урон по площади', en: 'Mage, area damage' },
    row: 'back',
    targeting: 'nearest',
    base: { hp: 610, atk: 122, def: 26, spd: 100 },
    weapon: 'staff',
    offhand: 'orb',
    armor: 'light',
    basic: 'sorceress.basic',
    ult: 'sorceress.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Архимаг', en: 'Archmage' },
        desc: { ru: 'Стихийные взрывы', en: 'Elemental explosions' },
        ult: 'sorceress.ultA',
        passive: { dmgUlt: 0.3, atkPct: 0.12 },
        fx: { id: 'burnOnHit', v: 0.3 },
      },
      {
        id: 'B',
        name: { ru: 'Ведьма бури', en: 'Storm Witch' },
        desc: { ru: 'Цепные молнии, контроль', en: 'Chain lightning, control' },
        ult: 'sorceress.ultB',
        passive: { dmgSkill: 0.2, energyRegen: 0.15 },
        fx: { id: 'critStun', v: 0.25 },
      },
    ],
    synergy: { dmgSkill: 0.15 },
    synergyText: { ru: '+15% урона умений отряду', en: '+15% party skill damage' },
    branches: [
      { ru: 'Пламя', en: 'Flame' },
      { ru: 'Лёд', en: 'Frost' },
      { ru: 'Аркана', en: 'Arcana' },
    ],
  },
  priestess: {
    id: 'priestess',
    name: { ru: 'Жрица', en: 'Priestess' },
    role: { ru: 'Лечение', en: 'Healing' },
    row: 'back',
    targeting: 'healer',
    base: { hp: 720, atk: 82, def: 36, spd: 100, healPower: 0.1 },
    weapon: 'wand',
    offhand: 'tome',
    armor: 'light',
    basic: 'priestess.basic',
    ult: 'priestess.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Святая', en: 'Saint' },
        desc: { ru: 'Мощное исцеление, воскрешение', en: 'Powerful healing, resurrection' },
        ult: 'priestess.ultA',
        passive: { healPower: 0.3, hpPct: 0.1 },
        fx: { id: 'overhealShield', v: 0.5 },
      },
      {
        id: 'B',
        name: { ru: 'Оракул', en: 'Oracle' },
        desc: { ru: 'Баффы и щиты', en: 'Buffs and shields' },
        ult: 'priestess.ultB',
        passive: { shieldPower: 0.3, energyRegen: 0.15 },
        fx: { id: 'auraAtk', v: 0.08 },
      },
    ],
    synergy: { healPower: 0.2 },
    synergyText: { ru: '+20% силы лечения отряду', en: '+20% party healing power' },
    branches: [
      { ru: 'Свет', en: 'Light' },
      { ru: 'Вера', en: 'Faith' },
      { ru: 'Кара', en: 'Judgment' },
    ],
  },
  necromancer: {
    id: 'necromancer',
    name: { ru: 'Некромантка', en: 'Necromancer' },
    role: { ru: 'Призыв, урон со временем', en: 'Summons, damage over time' },
    row: 'back',
    targeting: 'nearest',
    base: { hp: 690, atk: 102, def: 32, spd: 98 },
    weapon: 'scythe',
    offhand: 'grimoire',
    armor: 'light',
    basic: 'necromancer.basic',
    ult: 'necromancer.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Королева костей', en: 'Bone Queen' },
        desc: { ru: 'Армия скелетов', en: 'Skeleton army' },
        ult: 'necromancer.ultA',
        passive: { hpPct: 0.1, atkPct: 0.1 },
        fx: { id: 'summonOnAllyDeath', n: 3 },
      },
      {
        id: 'B',
        name: { ru: 'Чумная ведьма', en: 'Plague Witch' },
        desc: { ru: 'Проклятия, периодический урон', en: 'Curses, damage over time' },
        ult: 'necromancer.ultB',
        passive: { dmgDot: 0.4, pen: 0.1 },
        fx: { id: 'dotSpread' },
      },
    ],
    synergy: { dmgDot: 0.2 },
    synergyText: { ru: '+20% периодического урона отряду', en: '+20% party damage over time' },
    branches: [
      { ru: 'Кости', en: 'Bones' },
      { ru: 'Чума', en: 'Plague' },
      { ru: 'Души', en: 'Souls' },
    ],
  },
  assassin: {
    id: 'assassin',
    name: { ru: 'Ассасин', en: 'Assassin' },
    role: { ru: 'Взрывной урон по задним рядам', en: 'Burst damage to the back row' },
    row: 'back',
    targeting: 'back',
    base: { hp: 640, atk: 116, def: 30, spd: 120, crit: 0.15, critDmg: 0.2 },
    weapon: 'daggers',
    offhand: 'dagger',
    armor: 'medium',
    basic: 'assassin.basic',
    ult: 'assassin.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Теневой клинок', en: 'Shadow Blade' },
        desc: { ru: 'Невидимость и криты', en: 'Stealth and crits' },
        ult: 'assassin.ultA',
        passive: { critDmg: 0.4, eva: 0.1 },
        fx: { id: 'firstStrike', v: 0.6 },
      },
      {
        id: 'B',
        name: { ru: 'Ядовитая лилия', en: 'Venom Lily' },
        desc: { ru: 'Яды и ослабление', en: 'Poisons and weakening' },
        ult: 'assassin.ultB',
        passive: { dmgDot: 0.35, atkPct: 0.08 },
        fx: { id: 'poisonOnHit', v: 0.5 },
      },
    ],
    synergy: { critDmg: 0.2 },
    synergyText: { ru: '+20% крит. урона отряду', en: '+20% party crit damage' },
    branches: [
      { ru: 'Тень', en: 'Shadow' },
      { ru: 'Яд', en: 'Venom' },
      { ru: 'Клинки', en: 'Blades' },
    ],
  },
  bard: {
    id: 'bard',
    name: { ru: 'Бард', en: 'Bard' },
    role: { ru: 'Поддержка', en: 'Support' },
    row: 'back',
    targeting: 'nearest',
    base: { hp: 740, atk: 78, def: 40, spd: 110 },
    weapon: 'lute',
    offhand: 'songbook',
    armor: 'medium',
    basic: 'bard.basic',
    ult: 'bard.ult',
    specs: [
      {
        id: 'A',
        name: { ru: 'Муза', en: 'Muse' },
        desc: { ru: 'Ускорение и энергия отряду', en: 'Speed and energy for the party' },
        ult: 'bard.ultA',
        passive: { energyRegen: 0.25, spd: 10 },
        fx: { id: 'auraSpd', n: 8 },
      },
      {
        id: 'B',
        name: { ru: 'Сирена', en: 'Siren' },
        desc: { ru: 'Оглушение и дебаффы врагам', en: 'Stuns and debuffs on enemies' },
        ult: 'bard.ultB',
        passive: { acc: 0.15, atkPct: 0.1 },
        fx: { id: 'critStun', v: 0.3 },
      },
    ],
    synergy: { spd: 10 },
    synergyText: { ru: '+10 скорости отряду', en: '+10 party SPD' },
    branches: [
      { ru: 'Темп', en: 'Tempo' },
      { ru: 'Диссонанс', en: 'Discord' },
      { ru: 'Гармония', en: 'Harmony' },
    ],
  },
};

export const ELEMENT_NAMES: Record<Element, L10n> = {
  fire: { ru: 'Огонь', en: 'Fire' },
  nature: { ru: 'Природа', en: 'Nature' },
  water: { ru: 'Вода', en: 'Water' },
  light: { ru: 'Свет', en: 'Light' },
  dark: { ru: 'Тьма', en: 'Dark' },
};

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#E8552E',
  nature: '#4FBF5A',
  water: '#3D9BE0',
  light: '#F2D46B',
  dark: '#9B4DE0',
};

/**
 * Множитель стихии: круг Огонь → Природа → Вода → Огонь (+30% / −30%),
 * Свет и Тьма взаимно сильны (+30%) и нейтральны к остальным.
 */
export function elementMult(att: Element, def: Element, adv: number): number {
  if ((att === 'light' && def === 'dark') || (att === 'dark' && def === 'light')) return 1 + adv;
  const beats: Partial<Record<Element, Element>> = { fire: 'nature', nature: 'water', water: 'fire' };
  if (beats[att] === def) return 1 + adv;
  if (beats[def] === att) return 1 - adv;
  return 1;
}

/** Базовые атаки и ультимейты классов (включая ультимейты специализаций). */
export const CLASS_SKILLS: SkillDef[] = [
  // Страж
  {
    id: 'guardian.basic',
    cls: 'guardian',
    kind: 'basic',
    name: { ru: 'Удар мечом', en: 'Sword Strike' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'slash',
  },
  {
    id: 'guardian.ult',
    cls: 'guardian',
    kind: 'ult',
    name: { ru: 'Стена эгиды', en: 'Aegis Wall' },
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 0.12, scale: 'hp', perRank: 0.02 },
      { t: 'taunt', target: 'self', turns: 2 },
    ],
    vfx: 'shield',
  },
  {
    id: 'guardian.ultA',
    cls: 'guardian',
    kind: 'ult',
    name: { ru: 'Священный оплот', en: 'Holy Bastion' },
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 0.2, scale: 'hp', perRank: 0.03 },
      { t: 'heal', mult: 0.08, scale: 'hp' },
      { t: 'cleanse' },
    ],
    vfx: 'holy',
  },
  {
    id: 'guardian.ultB',
    cls: 'guardian',
    kind: 'ult',
    name: { ru: 'Несокрушимая крепость', en: 'Unbreakable Fortress' },
    target: 'enemyAll',
    effects: [
      { t: 'taunt', target: 'self', turns: 3 },
      { t: 'buff', target: 'self', stat: 'dmgTaken', value: -0.4, turns: 3 },
      { t: 'dmg', mult: 1.2, perRank: 0.2, scale: 'atk' },
      { t: 'cc', cc: 'stun', chance: 0.3, turns: 1 },
    ],
    vfx: 'shield',
  },
  // Берсерк
  {
    id: 'berserker.basic',
    cls: 'berserker',
    kind: 'basic',
    name: { ru: 'Рубящий удар', en: 'Cleave' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'slash',
  },
  {
    id: 'berserker.ult',
    cls: 'berserker',
    kind: 'ult',
    name: { ru: 'Буйство', en: 'Rampage' },
    target: 'enemyRandom',
    effects: [{ t: 'dmg', mult: 1.3, perRank: 0.2, hits: 3 }],
    vfx: 'slash',
  },
  {
    id: 'berserker.ultA',
    cls: 'berserker',
    kind: 'ult',
    name: { ru: 'Кровавая жатва', en: 'Blood Harvest' },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.8, perRank: 0.25, lifesteal: 0.5 },
      { t: 'dot', dot: 'bleed', mult: 0.4, turns: 3 },
    ],
    vfx: 'slash',
  },
  {
    id: 'berserker.ultB',
    cls: 'berserker',
    kind: 'ult',
    name: { ru: 'Громовой вихрь', en: 'Thunder Whirl' },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 2.2, perRank: 0.3 },
      { t: 'cc', cc: 'stun', chance: 0.35, turns: 1 },
    ],
    vfx: 'bolt',
  },
  // Лучница
  {
    id: 'archer.basic',
    cls: 'archer',
    kind: 'basic',
    name: { ru: 'Выстрел', en: 'Shot' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'arrow',
  },
  {
    id: 'archer.ult',
    cls: 'archer',
    kind: 'ult',
    name: { ru: 'Дождь стрел', en: 'Arrow Rain' },
    target: 'enemyAll',
    effects: [{ t: 'dmg', mult: 1.5, perRank: 0.25 }],
    vfx: 'arrow',
  },
  {
    id: 'archer.ultA',
    cls: 'archer',
    kind: 'ult',
    name: { ru: 'Смертельный выстрел', en: 'Deadeye' },
    target: 'enemyLowest',
    effects: [{ t: 'dmg', mult: 5, perRank: 0.8, execute: 1 }],
    vfx: 'arrow',
  },
  {
    id: 'archer.ultB',
    cls: 'archer',
    kind: 'ult',
    name: { ru: 'Капкан охотницы', en: "Huntress's Snare" },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.2, perRank: 0.2 },
      { t: 'dot', dot: 'poison', mult: 0.6, turns: 3 },
      { t: 'debuff', stat: 'spd', value: -20, turns: 2 },
    ],
    vfx: 'poison',
  },
  // Волшебница
  {
    id: 'sorceress.basic',
    cls: 'sorceress',
    kind: 'basic',
    name: { ru: 'Магическая стрела', en: 'Magic Bolt' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'bolt',
  },
  {
    id: 'sorceress.ult',
    cls: 'sorceress',
    kind: 'ult',
    name: { ru: 'Метеор', en: 'Meteor' },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 2.0, perRank: 0.3 },
      { t: 'dot', dot: 'burn', mult: 0.3, turns: 2 },
    ],
    vfx: 'fire',
  },
  {
    id: 'sorceress.ultA',
    cls: 'sorceress',
    kind: 'ult',
    name: { ru: 'Катаклизм', en: 'Cataclysm' },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 3.0, perRank: 0.4 },
      { t: 'dot', dot: 'burn', mult: 0.5, turns: 3 },
    ],
    vfx: 'fire',
  },
  {
    id: 'sorceress.ultB',
    cls: 'sorceress',
    kind: 'ult',
    name: { ru: 'Буря молний', en: 'Lightning Storm' },
    target: 'enemyRandom',
    effects: [
      { t: 'dmg', mult: 1.1, perRank: 0.15, hits: 6 },
      { t: 'cc', cc: 'stun', chance: 0.25, turns: 1 },
    ],
    vfx: 'bolt',
  },
  // Жрица
  {
    id: 'priestess.basic',
    cls: 'priestess',
    kind: 'basic',
    name: { ru: 'Луч света', en: 'Light Ray' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 0.9 }],
    vfx: 'holy',
  },
  {
    id: 'priestess.ult',
    cls: 'priestess',
    kind: 'ult',
    name: { ru: 'Божественная милость', en: 'Divine Grace' },
    target: 'allyAll',
    effects: [
      { t: 'heal', mult: 2.0, perRank: 0.3 },
      { t: 'cleanse' },
    ],
    vfx: 'heal',
  },
  {
    id: 'priestess.ultA',
    cls: 'priestess',
    kind: 'ult',
    name: { ru: 'Чудо', en: 'Miracle' },
    target: 'allyAll',
    effects: [
      { t: 'revive', target: 'allyDead', pct: 0.4 },
      { t: 'heal', mult: 2.6, perRank: 0.35 },
      { t: 'cleanse' },
    ],
    vfx: 'holy',
  },
  {
    id: 'priestess.ultB',
    cls: 'priestess',
    kind: 'ult',
    name: { ru: 'Пророчество', en: 'Prophecy' },
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 1.8, perRank: 0.3 },
      { t: 'buff', stat: 'atk', value: 0.25, turns: 3 },
      { t: 'energy', amount: 20 },
    ],
    vfx: 'shield',
  },
  // Некромантка
  {
    id: 'necromancer.basic',
    cls: 'necromancer',
    kind: 'basic',
    name: { ru: 'Удар косы', en: 'Scythe Swing' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'dark',
  },
  {
    id: 'necromancer.ult',
    cls: 'necromancer',
    kind: 'ult',
    name: { ru: 'Армия мёртвых', en: 'Army of the Dead' },
    target: 'enemyAll',
    effects: [
      { t: 'summon', target: 'self', unit: 'skeleton', count: 2, mult: 0.6, perRank: 0.1 },
      { t: 'dmg', mult: 1.2, perRank: 0.2 },
    ],
    vfx: 'dark',
  },
  {
    id: 'necromancer.ultA',
    cls: 'necromancer',
    kind: 'ult',
    name: { ru: 'Костяной легион', en: 'Bone Legion' },
    target: 'enemyAll',
    effects: [
      { t: 'summon', target: 'self', unit: 'skeleton', count: 3, mult: 0.9, perRank: 0.12 },
      { t: 'dmg', mult: 1.5, perRank: 0.2 },
    ],
    vfx: 'dark',
  },
  {
    id: 'necromancer.ultB',
    cls: 'necromancer',
    kind: 'ult',
    name: { ru: 'Великий мор', en: 'Great Pestilence' },
    target: 'enemyAll',
    effects: [
      { t: 'dot', dot: 'poison', mult: 1.2, perRank: 0.2, turns: 4 },
      { t: 'debuff', stat: 'dmgTaken', value: 0.2, turns: 3 },
      { t: 'debuff', stat: 'healRecv', value: -0.5, turns: 3 },
    ],
    vfx: 'poison',
  },
  // Ассасин
  {
    id: 'assassin.basic',
    cls: 'assassin',
    kind: 'basic',
    name: { ru: 'Удар кинжалом', en: 'Dagger Stab' },
    target: 'enemyBack',
    effects: [{ t: 'dmg', mult: 1 }],
    vfx: 'slash',
  },
  {
    id: 'assassin.ult',
    cls: 'assassin',
    kind: 'ult',
    name: { ru: 'Метка смерти', en: 'Death Mark' },
    target: 'enemyBack',
    effects: [{ t: 'dmg', mult: 3.6, perRank: 0.5, execute: 0.8 }],
    vfx: 'dark',
  },
  {
    id: 'assassin.ultA',
    cls: 'assassin',
    kind: 'ult',
    name: { ru: 'Танец теней', en: 'Shadow Dance' },
    target: 'enemyRandom',
    effects: [
      { t: 'buff', target: 'self', stat: 'eva', value: 0.4, turns: 2 },
      { t: 'buff', target: 'self', stat: 'crit', value: 0.5, turns: 2 },
      { t: 'dmg', mult: 1.4, perRank: 0.2, hits: 5 },
    ],
    vfx: 'dark',
  },
  {
    id: 'assassin.ultB',
    cls: 'assassin',
    kind: 'ult',
    name: { ru: 'Поцелуй лилии', en: "Lily's Kiss" },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.0, perRank: 0.15 },
      { t: 'dot', dot: 'poison', mult: 1.0, perRank: 0.15, turns: 3 },
      { t: 'debuff', stat: 'atk', value: -0.2, turns: 2 },
    ],
    vfx: 'poison',
  },
  // Бард
  {
    id: 'bard.basic',
    cls: 'bard',
    kind: 'basic',
    name: { ru: 'Звуковая волна', en: 'Sound Wave' },
    target: 'enemy',
    effects: [{ t: 'dmg', mult: 0.95 }],
    vfx: 'song',
  },
  {
    id: 'bard.ult',
    cls: 'bard',
    kind: 'ult',
    name: { ru: 'Гимн легиона', en: 'Legion Anthem' },
    target: 'allyAll',
    effects: [
      { t: 'buff', stat: 'atk', value: 0.25, valuePerRank: 0.04, turns: 3 },
      { t: 'buff', stat: 'spd', value: 15, turns: 3 },
      { t: 'energy', amount: 25 },
    ],
    vfx: 'song',
  },
  {
    id: 'bard.ultA',
    cls: 'bard',
    kind: 'ult',
    name: { ru: 'Вдохновение', en: 'Inspiration' },
    target: 'allyAll',
    effects: [
      { t: 'buff', stat: 'atk', value: 0.35, valuePerRank: 0.05, turns: 3 },
      { t: 'buff', stat: 'spd', value: 25, turns: 3 },
      { t: 'energy', amount: 40 },
    ],
    vfx: 'song',
  },
  {
    id: 'bard.ultB',
    cls: 'bard',
    kind: 'ult',
    name: { ru: 'Песнь сирены', en: "Siren's Song" },
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.3, perRank: 0.2 },
      { t: 'cc', cc: 'stun', chance: 0.6, turns: 1 },
      { t: 'debuff', stat: 'def', value: -0.25, turns: 3 },
    ],
    vfx: 'song',
  },
];
