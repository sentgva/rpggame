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
  /** Приоритет целей: ассасин бьёт задний ряд, жрица лечит союзниц. */
  targeting: 'nearest' | 'back' | 'healer';
  base: { hp: number; atk: number; def: number; spd: number; crit?: number; critDmg?: number; healPower?: number };
  weapon: string;
  offhand: string;
  armor: ArmorWeight;
  basic: string;
  /** Фирменное умение класса: есть с первого уровня, в ручном режиме — по кнопке. */
  sig: string;
  ult: string;
  specs: [SpecDef, SpecDef];
  /** Связка: что героиня делает для других и что получает от них. */
  combo: { gives: L10n; takes: L10n };
  branches: [L10n, L10n, L10n];
  /** Особые эффекты класса с первого уровня (например, волк у охотницы). */
  fx?: SpecialEffect[];
}

const L = (ru: string, en: string): L10n => ({ ru, en });

export const CLASSES: Record<ClassId, ClassDef> = {
  knight: {
    id: 'knight',
    name: L('Рыцарь', 'Knight'),
    role: L('Танк, передний ряд', 'Tank, front row'),
    row: 'front',
    targeting: 'nearest',
    base: { hp: 1300, atk: 64, def: 88, spd: 95 },
    weapon: 'sword',
    offhand: 'shield',
    armor: 'heavy',
    basic: 'knight.basic',
    sig: 'knight.bash',
    ult: 'knight.ult',
    specs: [
      {
        id: 'A',
        name: L('Паладин', 'Paladin'),
        desc: L('Щиты на весь отряд, спасает от гибели', 'Shields for the whole party, saves from death'),
        ult: 'knight.ultA',
        passive: { shieldPower: 0.3, hpPct: 0.1 },
        fx: { id: 'guardianAngel' },
      },
      {
        id: 'B',
        name: L('Бастион', 'Bastion'),
        desc: L('Провокация и отражение урона', 'Taunt and damage reflection'),
        ult: 'knight.ultB',
        passive: { defPct: 0.2, dmgReduce: 0.08 },
        fx: { id: 'thorns', v: 0.25 },
      },
    ],
    combo: {
      gives: L('Удар щитом ошеломляет врага — Ассасин бьёт ошеломлённых в спину', 'Shield Bash dazes a foe — the Assassin backstabs dazed enemies'),
      takes: L('Бьёт скованных Следопытом врагов — «Сокрушение»: оглушение и +30% урона', 'Hits enemies rooted by the Ranger — "Crush": stun and +30% damage'),
    },
    branches: [L('Твердыня', 'Bulwark'), L('Возмездие', 'Retribution'), L('Клятва', 'Oath')],
  },
  assassin: {
    id: 'assassin',
    name: L('Ассасин', 'Assassin'),
    role: L('Взрывной урон по заднему ряду', 'Burst damage to the back row'),
    row: 'back',
    targeting: 'back',
    base: { hp: 650, atk: 118, def: 30, spd: 122, crit: 0.15, critDmg: 0.2 },
    weapon: 'daggers',
    offhand: 'dagger',
    armor: 'medium',
    basic: 'assassin.basic',
    sig: 'assassin.venom',
    ult: 'assassin.ult',
    specs: [
      {
        id: 'A',
        name: L('Теневой клинок', 'Shadow Blade'),
        desc: L('Уклонение и криты', 'Evasion and crits'),
        ult: 'assassin.ultA',
        passive: { critDmg: 0.4, eva: 0.1 },
        fx: { id: 'firstStrike', v: 0.6 },
      },
      {
        id: 'B',
        name: L('Ядовитая лилия', 'Venom Lily'),
        desc: L('Яды и ослабление', 'Poisons and weakening'),
        ult: 'assassin.ultB',
        passive: { dmgDot: 0.35, atkPct: 0.08 },
        fx: { id: 'poisonOnHit', v: 0.5 },
      },
    ],
    combo: {
      gives: L('Ядовитый клинок травит — проклятие Колдуньи вызывает «Разложение»', 'Venom Blade poisons — the Warlock’s curse sets off "Decay"'),
      takes: L('По ошеломлённым Рыцарем — «Удар в спину»: верный крит и +30% урона', 'Against foes dazed by the Knight — "Backstab": sure crit and +30% damage'),
    },
    branches: [L('Тень', 'Shadow'), L('Яд', 'Venom'), L('Клинки', 'Blades')],
  },
  priestess: {
    id: 'priestess',
    name: L('Жрица', 'Priestess'),
    role: L('Лечение и благословения', 'Healing and blessings'),
    row: 'back',
    targeting: 'healer',
    base: { hp: 740, atk: 84, def: 38, spd: 100, healPower: 0.1 },
    weapon: 'wand',
    offhand: 'tome',
    armor: 'light',
    basic: 'priestess.basic',
    sig: 'priestess.bless',
    ult: 'priestess.ult',
    specs: [
      {
        id: 'A',
        name: L('Святая', 'Saint'),
        desc: L('Мощное исцеление, воскрешение', 'Powerful healing, resurrection'),
        ult: 'priestess.ultA',
        passive: { healPower: 0.3, hpPct: 0.1 },
        fx: { id: 'overhealShield', v: 0.5 },
      },
      {
        id: 'B',
        name: L('Оракул', 'Oracle'),
        desc: L('Щиты и усиление отряда', 'Shields and party buffs'),
        ult: 'priestess.ultB',
        passive: { shieldPower: 0.3, energyRegen: 0.15 },
        fx: { id: 'auraAtk', v: 0.08 },
      },
    ],
    combo: {
      gives: L('Благословение: союзница бьёт на 20% сильнее и лечится от своих ударов', 'Blessing: an ally hits 20% harder and heals from her strikes'),
      takes: L('Каждая связка отряда даёт ей энергию — «Вдохновение»', 'Every party combo gives her energy — "Inspiration"'),
    },
    branches: [L('Свет', 'Light'), L('Вера', 'Faith'), L('Кара', 'Judgment')],
  },
  ranger: {
    id: 'ranger',
    name: L('Следопыт', 'Ranger'),
    role: L('Дальний урон, силки', 'Ranged damage, snares'),
    row: 'back',
    targeting: 'nearest',
    base: { hp: 680, atk: 110, def: 34, spd: 108, crit: 0.1 },
    weapon: 'bow',
    offhand: 'quiver',
    armor: 'medium',
    basic: 'ranger.basic',
    sig: 'ranger.snare',
    ult: 'ranger.ult',
    specs: [
      {
        id: 'A',
        name: L('Снайпер', 'Sniper'),
        desc: L('Криты по одной цели', 'Single-target crits'),
        ult: 'ranger.ultA',
        passive: { crit: 0.12, critDmg: 0.3 },
        fx: { id: 'execute', v: 0.3 },
      },
      {
        id: 'B',
        name: L('Лесная тень', 'Forest Shade'),
        desc: L('Силки и яды на весь строй', 'Snares and poisons on the whole line'),
        ult: 'ranger.ultB',
        passive: { dmgDot: 0.3, atkPct: 0.1 },
        fx: { id: 'poisonOnHit', v: 0.35 },
      },
    ],
    combo: {
      gives: L('Ловчая сеть сковывает врага — Рыцарь «Сокрушает» скованных', 'Snare Net roots a foe — the Knight "Crushes" rooted enemies'),
      takes: L('Взрывает проклятия Колдуньи, по добыче Охотницы бьёт дважды', 'Detonates the Warlock’s curses, hits the Hunter’s prey twice'),
    },
    branches: [L('Меткость', 'Marksman'), L('Силки', 'Snares'), L('Ветер', 'Wind')],
  },
  warlock: {
    id: 'warlock',
    name: L('Колдунья', 'Warlock'),
    role: L('Маг: проклятия и пламя по площади', 'Mage: curses and area fire'),
    row: 'back',
    targeting: 'nearest',
    base: { hp: 620, atk: 124, def: 26, spd: 100 },
    weapon: 'staff',
    offhand: 'grimoire',
    armor: 'light',
    basic: 'warlock.basic',
    sig: 'warlock.hex',
    ult: 'warlock.ult',
    specs: [
      {
        id: 'A',
        name: L('Пироманка', 'Pyromancer'),
        desc: L('Огненные взрывы', 'Fire explosions'),
        ult: 'warlock.ultA',
        passive: { dmgUlt: 0.3, atkPct: 0.12 },
        fx: { id: 'burnOnHit', v: 0.3 },
      },
      {
        id: 'B',
        name: L('Ведьма проклятий', 'Hex Witch'),
        desc: L('Проклятия на весь строй, контроль', 'Curses on the whole line, control'),
        ult: 'warlock.ultB',
        passive: { dmgSkill: 0.2, energyRegen: 0.15 },
        fx: { id: 'critStun', v: 0.25 },
      },
    ],
    combo: {
      gives: L('Проклятие: враг получает больше урона, выстрелы Следопыта и Охотницы его взрывают', 'Hex: the foe takes more damage, and shots from the Ranger and Hunter detonate it'),
      takes: L('Проклятие на отравленного Ассасином — «Разложение»: весь яд срабатывает сразу', 'Hexing a foe poisoned by the Assassin — "Decay": all poison bursts at once'),
    },
    branches: [L('Пламя', 'Flame'), L('Проклятия', 'Hexes'), L('Пепел', 'Ash')],
  },
  hunter: {
    id: 'hunter',
    name: L('Охотница', 'Hunter'),
    role: L('Арбалет и волк-спутник', 'Crossbow and a wolf companion'),
    row: 'back',
    targeting: 'nearest',
    base: { hp: 760, atk: 102, def: 40, spd: 104 },
    weapon: 'crossbow',
    offhand: 'horn',
    armor: 'medium',
    basic: 'hunter.basic',
    sig: 'hunter.prey',
    ult: 'hunter.ult',
    specs: [
      {
        id: 'A',
        name: L('Вожак стаи', 'Pack Leader'),
        desc: L('Сильнее волк, больше волков', 'A stronger wolf, more wolves'),
        ult: 'hunter.ultA',
        passive: { hpPct: 0.1, atkPct: 0.1 },
        fx: { id: 'packLeader', v: 0.5 },
      },
      {
        id: 'B',
        name: L('Ледяная стрелка', 'Frost Shot'),
        desc: L('Морозные болты, заморозка', 'Frost bolts, freezing'),
        ult: 'hunter.ultB',
        passive: { crit: 0.08, dmgWater: 0.15 },
        fx: { id: 'frozenVuln', v: 0.3 },
      },
    ],
    combo: {
      gives: L('Метка добычи: весь отряд бьёт помеченного на 20% сильнее, волк бросается на него', 'Prey Mark: the whole party hits the marked foe 20% harder, the wolf leaps at it'),
      takes: L('Её болты взрывают проклятия Колдуньи', 'Her bolts detonate the Warlock’s curses'),
    },
    branches: [L('Стая', 'Pack'), L('Капканы', 'Traps'), L('Лёд', 'Frost')],
    fx: [{ id: 'companion', n: 1 }],
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

/** Базовые атаки, фирменные умения и ультимейты классов (включая ультимейты специализаций). */
export const CLASS_SKILLS: SkillDef[] = [
  // ——— Рыцарь ———
  { id: 'knight.basic', cls: 'knight', kind: 'basic', name: L('Удар мечом', 'Sword Strike'), target: 'enemy', effects: [{ t: 'dmg', mult: 1 }], vfx: 'slash' },
  {
    id: 'knight.bash',
    cls: 'knight',
    kind: 'active',
    name: L('Удар щитом', 'Shield Bash'),
    target: 'enemy',
    cd: 3,
    effects: [
      { t: 'dmg', mult: 1.3, perRank: 0.1 },
      { t: 'mark', mark: 'daze', turns: 2 },
      { t: 'cc', cc: 'stun', chance: 0.2, turns: 1 },
    ],
    vfx: 'shield',
  },
  {
    id: 'knight.ult',
    cls: 'knight',
    kind: 'ult',
    name: L('Стена эгиды', 'Aegis Wall'),
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 0.12, scale: 'hp', perRank: 0.02 },
      { t: 'taunt', target: 'self', turns: 2 },
    ],
    vfx: 'shield',
  },
  {
    id: 'knight.ultA',
    cls: 'knight',
    kind: 'ult',
    name: L('Священный оплот', 'Holy Bastion'),
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 0.2, scale: 'hp', perRank: 0.03 },
      { t: 'heal', mult: 0.08, scale: 'hp' },
      { t: 'cleanse' },
    ],
    vfx: 'holy',
  },
  {
    id: 'knight.ultB',
    cls: 'knight',
    kind: 'ult',
    name: L('Несокрушимая крепость', 'Unbreakable Fortress'),
    target: 'enemyAll',
    effects: [
      { t: 'taunt', target: 'self', turns: 3 },
      { t: 'buff', target: 'self', stat: 'dmgTaken', value: -0.4, turns: 3 },
      { t: 'dmg', mult: 1.2, perRank: 0.2 },
      { t: 'mark', mark: 'daze', turns: 2 },
    ],
    vfx: 'shield',
  },
  // ——— Ассасин ———
  { id: 'assassin.basic', cls: 'assassin', kind: 'basic', name: L('Удар кинжалом', 'Dagger Stab'), target: 'enemyBack', effects: [{ t: 'dmg', mult: 1 }], vfx: 'slash' },
  {
    id: 'assassin.venom',
    cls: 'assassin',
    kind: 'active',
    name: L('Ядовитый клинок', 'Venom Blade'),
    target: 'enemyBack',
    cd: 3,
    effects: [
      { t: 'dmg', mult: 1.4, perRank: 0.15 },
      { t: 'dot', dot: 'poison', mult: 0.45, turns: 3 },
    ],
    vfx: 'poison',
  },
  { id: 'assassin.ult', cls: 'assassin', kind: 'ult', name: L('Метка смерти', 'Death Mark'), target: 'enemyBack', effects: [{ t: 'dmg', mult: 3.6, perRank: 0.5, execute: 0.8 }], vfx: 'dark' },
  {
    id: 'assassin.ultA',
    cls: 'assassin',
    kind: 'ult',
    name: L('Танец теней', 'Shadow Dance'),
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
    name: L('Поцелуй лилии', "Lily's Kiss"),
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.0, perRank: 0.15 },
      { t: 'dot', dot: 'poison', mult: 1.0, perRank: 0.15, turns: 3 },
      { t: 'debuff', stat: 'atk', value: -0.2, turns: 2 },
    ],
    vfx: 'poison',
  },
  // ——— Жрица ———
  { id: 'priestess.basic', cls: 'priestess', kind: 'basic', name: L('Луч света', 'Light Ray'), target: 'enemy', effects: [{ t: 'dmg', mult: 0.9 }], vfx: 'holy' },
  {
    id: 'priestess.bless',
    cls: 'priestess',
    kind: 'active',
    name: L('Благословение', 'Blessing'),
    target: 'allyLowest',
    cd: 4,
    effects: [
      { t: 'heal', mult: 1.2, perRank: 0.2 },
      { t: 'mark', mark: 'bless', target: 'allyStrongest', turns: 3 },
      { t: 'energy', target: 'allyStrongest', amount: 15 },
    ],
    vfx: 'heal',
  },
  {
    id: 'priestess.ult',
    cls: 'priestess',
    kind: 'ult',
    name: L('Божественная милость', 'Divine Grace'),
    target: 'allyAll',
    effects: [{ t: 'heal', mult: 2.0, perRank: 0.3 }, { t: 'cleanse' }],
    vfx: 'heal',
  },
  {
    id: 'priestess.ultA',
    cls: 'priestess',
    kind: 'ult',
    name: L('Чудо', 'Miracle'),
    target: 'allyAll',
    effects: [{ t: 'revive', target: 'allyDead', pct: 0.4 }, { t: 'heal', mult: 2.6, perRank: 0.35 }, { t: 'cleanse' }],
    vfx: 'holy',
  },
  {
    id: 'priestess.ultB',
    cls: 'priestess',
    kind: 'ult',
    name: L('Пророчество', 'Prophecy'),
    target: 'allyAll',
    effects: [
      { t: 'shield', mult: 1.8, perRank: 0.3 },
      { t: 'mark', mark: 'bless', turns: 3 },
      { t: 'energy', amount: 20 },
    ],
    vfx: 'shield',
  },
  // ——— Следопыт ———
  { id: 'ranger.basic', cls: 'ranger', kind: 'basic', name: L('Выстрел', 'Shot'), target: 'enemy', effects: [{ t: 'dmg', mult: 1 }], vfx: 'arrow' },
  {
    id: 'ranger.snare',
    cls: 'ranger',
    kind: 'active',
    name: L('Ловчая сеть', 'Snare Net'),
    target: 'enemy',
    cd: 3,
    effects: [
      { t: 'dmg', mult: 1.0, perRank: 0.15 },
      { t: 'mark', mark: 'root', turns: 2 },
      { t: 'debuff', stat: 'spd', value: -20, turns: 2 },
    ],
    vfx: 'arrow',
  },
  { id: 'ranger.ult', cls: 'ranger', kind: 'ult', name: L('Дождь стрел', 'Arrow Rain'), target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.5, perRank: 0.25 }], vfx: 'arrow' },
  { id: 'ranger.ultA', cls: 'ranger', kind: 'ult', name: L('Смертельный выстрел', 'Deadeye'), target: 'enemyLowest', effects: [{ t: 'dmg', mult: 5, perRank: 0.8, execute: 1 }], vfx: 'arrow' },
  {
    id: 'ranger.ultB',
    cls: 'ranger',
    kind: 'ult',
    name: L('Колючие силки', 'Thorn Snares'),
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.2, perRank: 0.2 },
      { t: 'dot', dot: 'poison', mult: 0.6, turns: 3 },
      { t: 'mark', mark: 'root', turns: 2 },
    ],
    vfx: 'poison',
  },
  // ——— Колдунья ———
  { id: 'warlock.basic', cls: 'warlock', kind: 'basic', name: L('Огненная стрела', 'Fire Bolt'), target: 'enemy', effects: [{ t: 'dmg', mult: 1 }], vfx: 'fire' },
  {
    id: 'warlock.hex',
    cls: 'warlock',
    kind: 'active',
    name: L('Проклятие', 'Hex'),
    target: 'enemy',
    cd: 3,
    effects: [
      { t: 'dmg', mult: 0.8, perRank: 0.12 },
      { t: 'mark', mark: 'curse', turns: 3 },
      { t: 'debuff', stat: 'dmgTaken', value: 0.15, turns: 3 },
    ],
    vfx: 'dark',
  },
  {
    id: 'warlock.ult',
    cls: 'warlock',
    kind: 'ult',
    name: L('Адское пламя', 'Hellfire'),
    target: 'enemyAll',
    effects: [{ t: 'dmg', mult: 1.8, perRank: 0.3 }, { t: 'dot', dot: 'burn', mult: 0.3, turns: 2 }],
    vfx: 'fire',
  },
  {
    id: 'warlock.ultA',
    cls: 'warlock',
    kind: 'ult',
    name: L('Катаклизм', 'Cataclysm'),
    target: 'enemyAll',
    effects: [{ t: 'dmg', mult: 3.0, perRank: 0.4 }, { t: 'dot', dot: 'burn', mult: 0.5, turns: 3 }],
    vfx: 'fire',
  },
  {
    id: 'warlock.ultB',
    cls: 'warlock',
    kind: 'ult',
    name: L('Печать погибели', 'Seal of Doom'),
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.2, perRank: 0.2 },
      { t: 'mark', mark: 'curse', turns: 3 },
      { t: 'debuff', stat: 'dmgTaken', value: 0.2, turns: 3 },
      { t: 'debuff', stat: 'healRecv', value: -0.5, turns: 3 },
    ],
    vfx: 'dark',
  },
  // ——— Охотница ———
  { id: 'hunter.basic', cls: 'hunter', kind: 'basic', name: L('Болт арбалета', 'Crossbow Bolt'), target: 'enemy', effects: [{ t: 'dmg', mult: 1.05 }], vfx: 'arrow' },
  {
    id: 'hunter.prey',
    cls: 'hunter',
    kind: 'active',
    name: L('Метка добычи', 'Prey Mark'),
    target: 'enemy',
    cd: 4,
    effects: [
      { t: 'dmg', mult: 1.1, perRank: 0.15 },
      { t: 'mark', mark: 'prey', turns: 3 },
      { t: 'summon', target: 'self', unit: 'wolf', count: 1, mult: 0.45 },
    ],
    vfx: 'arrow',
  },
  {
    id: 'hunter.ult',
    cls: 'hunter',
    kind: 'ult',
    name: L('Зов стаи', 'Call of the Pack'),
    target: 'enemyRandom',
    effects: [
      { t: 'summon', target: 'self', unit: 'wolf', count: 1, mult: 0.45 },
      { t: 'dmg', mult: 0.9, perRank: 0.15, hits: 4 },
    ],
    vfx: 'arrow',
  },
  {
    id: 'hunter.ultA',
    cls: 'hunter',
    kind: 'ult',
    name: L('Вой вожака', "Leader's Howl"),
    target: 'allyAll',
    effects: [
      { t: 'summon', target: 'self', unit: 'wolf', count: 2, mult: 0.55 },
      { t: 'buff', stat: 'atk', value: 0.2, valuePerRank: 0.03, turns: 3 },
    ],
    vfx: 'song',
  },
  {
    id: 'hunter.ultB',
    cls: 'hunter',
    kind: 'ult',
    name: L('Ледяной залп', 'Frost Volley'),
    target: 'enemyAll',
    effects: [
      { t: 'dmg', mult: 1.6, perRank: 0.25 },
      { t: 'cc', cc: 'freeze', chance: 0.3, turns: 1 },
      { t: 'mark', mark: 'prey', turns: 2 },
    ],
    vfx: 'ice',
  },
];

/**
 * Связки классов: метка одной героини + удар другой. Числа — в движке боя (battle.ts, combo*).
 * Для интерфейса: кто ставит метку и кто её использует.
 */
export interface ComboDef {
  id: 'backstab' | 'decay' | 'detonate' | 'crush' | 'hunt' | 'grace';
  name: L10n;
  desc: L10n;
  from: ClassId;
  to: ClassId[];
}
export const COMBOS: ComboDef[] = [
  { id: 'backstab', name: L('Удар в спину', 'Backstab'), desc: L('Ассасин по ошеломлённому Рыцарем: верный крит и +30% урона', 'Assassin vs a foe dazed by the Knight: sure crit and +30% damage'), from: 'knight', to: ['assassin'] },
  { id: 'decay', name: L('Разложение', 'Decay'), desc: L('Проклятие Колдуньи на отравленного Ассасином: весь яд срабатывает сразу, ×1,5', 'The Warlock hexes a foe poisoned by the Assassin: all poison bursts at once, ×1.5'), from: 'assassin', to: ['warlock'] },
  { id: 'detonate', name: L('Взрыв проклятия', 'Hex Burst'), desc: L('Выстрел Следопыта или Охотницы по проклятому: +50% урона и осколки по соседу', 'A Ranger or Hunter shot at a hexed foe: +50% damage and shrapnel to a neighbour'), from: 'warlock', to: ['ranger', 'hunter'] },
  { id: 'crush', name: L('Сокрушение', 'Crush'), desc: L('Рыцарь по скованному Следопытом: оглушение и +30% урона', 'The Knight vs a foe rooted by the Ranger: stun and +30% damage'), from: 'ranger', to: ['knight'] },
  { id: 'hunt', name: L('Травля', 'The Hunt'), desc: L('По добыче Охотницы весь отряд бьёт на 20% сильнее, Следопыт стреляет дважды', 'The whole party hits the Hunter’s prey 20% harder, the Ranger shoots twice'), from: 'hunter', to: ['knight', 'assassin', 'priestess', 'ranger', 'warlock', 'hunter'] },
  { id: 'grace', name: L('Благодать', 'Grace'), desc: L('Благословлённая Жрицей: +20% урона и лечение от ударов; каждая связка даёт Жрице энергию', 'Blessed by the Priestess: +20% damage and healing from hits; every combo gives the Priestess energy'), from: 'priestess', to: ['knight', 'assassin', 'ranger', 'warlock', 'hunter'] },
];
export const COMBO_MAP: Record<string, ComboDef> = Object.fromEntries(COMBOS.map((c) => [c.id, c]));
