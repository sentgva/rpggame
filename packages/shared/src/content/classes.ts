import type { ClassId, Element, L10n } from '../types';

/**
 * Классы Легиона 3.0: базовые характеристики, поведение в «Живом бою» и набор навыков.
 * У каждого героя — обычная атака, умение (перезарядка, само), ульта (энергия, по кнопке или авто) и пассивка.
 */

/** Кому достаётся эффект навыка. */
export type TargetRule =
  /** текущая цель героя */
  | 'target'
  /** самый дальний враг (задний ряд) */
  | 'back'
  /** случайные враги (по удару на каждое попадание) */
  | 'random'
  /** все враги */
  | 'all'
  /** враг с наименьшим запасом здоровья */
  | 'lowest'
  | 'self'
  /** союзник с наименьшей долей здоровья */
  | 'allyLowest'
  /** все союзники */
  | 'allies';

export type BuffStat = 'atk' | 'haste' | 'dmgRed' | 'vuln' | 'crit';
export type MarkKind = 'daze' | 'root' | 'curse' | 'prey';
export type DotKind = 'poison' | 'burn' | 'bleed';

/** Элементарный эффект навыка. mult — от атаки применяющего (heal/shield — см. поле of). */
export type Fx =
  | { t: 'dmg'; mult: number; hits?: number; splash?: number; crit?: number; ls?: number }
  | { t: 'heal'; mult: number }
  | { t: 'shield'; mult: number; of: 'hp' | 'atk' }
  | { t: 'stun'; ms: number }
  | { t: 'dot'; mult: number; ms: number; kind: DotKind }
  | { t: 'buff'; stat: BuffStat; v: number; ms: number }
  | { t: 'taunt'; ms: number }
  | { t: 'mark'; kind: MarkKind; ms: number }
  | { t: 'cleanse' }
  | { t: 'energy'; v: number }
  | { t: 'revive'; pct: number }
  | { t: 'summon'; unit: string; count: number; mult: number; ms?: number };

export interface FxEntry {
  fx: Fx;
  /** Кому (по умолчанию — цели навыка). */
  to?: TargetRule;
}

export interface SkillDef {
  id: string;
  name: L10n;
  desc: L10n;
  kind: 'skill' | 'ult';
  /** Перезарядка умения, мс. */
  cd?: number;
  /** Первое применение, мс от начала боя. */
  first?: number;
  target: TargetRule;
  fx: FxEntry[];
  /** Визуальный эффект: slash, arrow, bolt, nova, heal, shield, dark, fire, ice, holy, poison, beast. */
  vfx: string;
}

export interface PassiveDef {
  name: L10n;
  /** Описание по ступеням: ★1, ★3, ★5. */
  desc: [L10n, L10n, L10n];
}

export interface ClassDef {
  id: ClassId;
  name: L10n;
  role: L10n;
  /** Где стоит в строю в начале боя (0…100, слева направо). */
  x: number;
  /** Дальность атаки и скорость бега (единицы поля в секунду). */
  range: number;
  speed: number;
  /** Интервал обычной атаки, мс. */
  interval: number;
  /** Базовые характеристики на 1-м уровне. */
  base: { hp: number; atk: number; def: number; crit?: number; critDmg?: number; heal?: number; dmgRed?: number };
  /** Вид обычной атаки (для показа): slash, daggers, bolt, arrow, orb, crossbow. */
  attack: string;
  /** Обычная атака задевает соседей цели (доля урона). */
  splash?: number;
  skill: SkillDef;
  ult: SkillDef;
  passive: PassiveDef;
  /** Оружие по умолчанию — для иконок снаряжения. */
  weapon: string;
}

const L = (ru: string, en: string): L10n => ({ ru, en });
const P = (a: [string, string], b: [string, string], c: [string, string]): [L10n, L10n, L10n] => [L(...a), L(...b), L(...c)];

export const CLASSES: Record<ClassId, ClassDef> = {
  knight: {
    id: 'knight',
    name: L('Рыцарь', 'Knight'),
    role: L('Танк: держит строй и парирует', 'Tank: holds the line and parries'),
    x: 34,
    range: 9,
    speed: 14,
    interval: 1300,
    base: { hp: 1500, atk: 58, def: 70, dmgRed: 0.15 },
    attack: 'slash',
    weapon: 'sword',
    skill: {
      id: 'knight.skill',
      kind: 'skill',
      name: L('Удар щитом', 'Shield Bash'),
      desc: L('160% урона и оглушение на 1,5 с', '160% damage and a 1.5 s stun'),
      cd: 7000,
      first: 2500,
      target: 'target',
      fx: [{ fx: { t: 'dmg', mult: 1.6 } }, { fx: { t: 'stun', ms: 1500 } }, { fx: { t: 'mark', kind: 'daze', ms: 3000 } }],
      vfx: 'shield',
    },
    ult: {
      id: 'knight.ult',
      kind: 'ult',
      name: L('Клятва стража', "Guardian's Oath"),
      desc: L('Провоцирует всех врагов на 4 с, даёт отряду щит в 12% своего здоровья, сам получает на 30% меньше урона', 'Taunts all foes for 4 s, shields the party for 12% of his HP, takes 30% less damage himself'),
      target: 'all',
      fx: [
        { fx: { t: 'taunt', ms: 4000 } },
        { fx: { t: 'shield', mult: 0.12, of: 'hp' }, to: 'allies' },
        { fx: { t: 'buff', stat: 'dmgRed', v: 0.3, ms: 5000 }, to: 'self' },
      ],
      vfx: 'holy',
    },
    passive: {
      name: L('Твердыня', 'Bulwark'),
      desc: P(
        ['−15% получаемого урона; щит Кассиана гасит 30% сокрушительных ударов', '−15% damage taken; Cassian’s shield blunts 30% of crushing blows'],
        ['Идеальное парирование даёт отряду щит в 8% его здоровья', 'A perfect parry shields the party for 8% of his HP'],
        ['−25% получаемого урона', '−25% damage taken'],
      ),
    },
  },
  assassin: {
    id: 'assassin',
    name: L('Ассасин', 'Assassin'),
    role: L('Прыгает в тыл врага, взрывной урон', 'Leaps behind enemy lines, burst damage'),
    x: 28,
    range: 8,
    speed: 20,
    interval: 700,
    base: { hp: 760, atk: 116, def: 30, crit: 0.15, critDmg: 0.3 },
    attack: 'daggers',
    weapon: 'daggers',
    skill: {
      id: 'assassin.skill',
      kind: 'skill',
      name: L('Ядовитый клинок', 'Venom Blade'),
      desc: L('180% урона и яд: ещё 120% за 4 с', '180% damage plus poison: another 120% over 4 s'),
      cd: 6000,
      first: 1500,
      target: 'target',
      fx: [{ fx: { t: 'dmg', mult: 1.8 } }, { fx: { t: 'dot', mult: 1.2, ms: 4000, kind: 'poison' } }],
      vfx: 'poison',
    },
    ult: {
      id: 'assassin.ult',
      kind: 'ult',
      name: L('Танец теней', 'Shadow Dance'),
      desc: L('5 ударов по случайным врагам по 120%, шанс крита +50%', '5 strikes at random foes for 120% each, +50% crit chance'),
      target: 'random',
      fx: [{ fx: { t: 'dmg', mult: 1.2, hits: 5, crit: 0.5 } }],
      vfx: 'dark',
    },
    passive: {
      name: L('Из тени', 'From the Shadows'),
      desc: P(
        ['В начале боя прыгает в тыл врага; +30% крит. урона по целям с здоровьем ниже 50%', 'Leaps behind enemy lines at the start; +30% crit damage vs targets below 50% HP'],
        ['Убийство восстанавливает 15 энергии', 'Kills restore 15 energy'],
        ['+60% крит. урона по раненым целям', '+60% crit damage vs wounded targets'],
      ),
    },
  },
  priestess: {
    id: 'priestess',
    name: L('Жрица', 'Priestess'),
    role: L('Лечение, благословения, воскрешение', 'Healing, blessings, revival'),
    x: 14,
    range: 36,
    speed: 13,
    interval: 1200,
    base: { hp: 800, atk: 80, def: 36, heal: 0.15 },
    attack: 'bolt',
    weapon: 'wand',
    skill: {
      id: 'priestess.skill',
      kind: 'skill',
      name: L('Благословение', 'Blessing'),
      desc: L('Лечит самого раненого на 250% атаки и даёт ему +15% урона на 5 с', 'Heals the most wounded ally for 250% ATK and grants +15% damage for 5 s'),
      cd: 5000,
      first: 1500,
      target: 'allyLowest',
      fx: [{ fx: { t: 'heal', mult: 2.5 } }, { fx: { t: 'buff', stat: 'atk', v: 0.15, ms: 5000 } }],
      vfx: 'heal',
    },
    ult: {
      id: 'priestess.ult',
      kind: 'ult',
      name: L('Свет Эфира', 'Aether Light'),
      desc: L('Лечит весь отряд на 200% атаки, снимает оглушение и яды; раз за бой поднимает павшего', 'Heals the whole party for 200% ATK and cleanses stuns and poisons; once per battle revives the fallen'),
      target: 'allies',
      fx: [{ fx: { t: 'heal', mult: 2.0 } }, { fx: { t: 'cleanse' } }, { fx: { t: 'revive', pct: 0.3 } }],
      vfx: 'holy',
    },
    passive: {
      name: L('Милосердие', 'Mercy'),
      desc: P(
        ['Излишек лечения превращается в щит (50%)', 'Overhealing becomes a shield (50%)'],
        ['+15% силы лечения', '+15% healing power'],
        ['Каждая связка в цепи даёт ей 20 энергии', 'Every combo in a chain gives her 20 energy'],
      ),
    },
  },
  ranger: {
    id: 'ranger',
    name: L('Следопыт', 'Ranger'),
    role: L('Дальний урон, оковы', 'Long-range damage, snares'),
    x: 18,
    range: 46,
    speed: 14,
    interval: 1000,
    base: { hp: 820, atk: 104, def: 36 },
    attack: 'arrow',
    weapon: 'bow',
    skill: {
      id: 'ranger.skill',
      kind: 'skill',
      name: L('Оковы', 'Snare'),
      desc: L('140% урона и оковы: цель не двигается и не бьёт 2 с', '140% damage and a snare: the target can’t move or attack for 2 s'),
      cd: 8000,
      first: 3000,
      target: 'target',
      fx: [{ fx: { t: 'dmg', mult: 1.4 } }, { fx: { t: 'stun', ms: 2000 } }, { fx: { t: 'mark', kind: 'root', ms: 3000 } }],
      vfx: 'arrow',
    },
    ult: {
      id: 'ranger.ult',
      kind: 'ult',
      name: L('Град стрел', 'Arrow Rain'),
      desc: L('7 стрел по случайным врагам по 100%', '7 arrows at random foes for 100% each'),
      target: 'random',
      fx: [{ fx: { t: 'dmg', mult: 1.0, hits: 7 } }],
      vfx: 'arrow',
    },
    passive: {
      name: L('Меткий глаз', 'Keen Eye'),
      desc: P(
        ['+20% урона по далёким целям', '+20% damage to distant targets'],
        ['Каждая 4-я стрела бьёт дважды', 'Every 4th arrow hits twice'],
        ['+40% урона по далёким целям', '+40% damage to distant targets'],
      ),
    },
  },
  warlock: {
    id: 'warlock',
    name: L('Колдунья', 'Warlock'),
    role: L('Урон по площади, проклятия', 'Area damage, curses'),
    x: 12,
    range: 40,
    speed: 12,
    interval: 1400,
    base: { hp: 740, atk: 120, def: 32 },
    attack: 'orb',
    weapon: 'staff',
    splash: 0.3,
    skill: {
      id: 'warlock.skill',
      kind: 'skill',
      name: L('Проклятие', 'Hex'),
      desc: L('120% урона; проклятая цель 6 с получает на 20% больше урона', '120% damage; the hexed target takes 20% more damage for 6 s'),
      cd: 7000,
      first: 2000,
      target: 'target',
      fx: [{ fx: { t: 'dmg', mult: 1.2 } }, { fx: { t: 'mark', kind: 'curse', ms: 6000 } }],
      vfx: 'dark',
    },
    ult: {
      id: 'warlock.ult',
      kind: 'ult',
      name: L('Звездопад', 'Starfall'),
      desc: L('220% урона всем врагам и ожог: ещё 80% за 3 с', '220% damage to all foes plus a burn: another 80% over 3 s'),
      target: 'all',
      fx: [{ fx: { t: 'dmg', mult: 2.2 } }, { fx: { t: 'dot', mult: 0.8, ms: 3000, kind: 'burn' } }],
      vfx: 'fire',
    },
    passive: {
      name: L('Тёмный пакт', 'Dark Pact'),
      desc: P(
        ['Обычная атака задевает соседей (30%); убийство даёт 10 энергии', 'Basic attacks splash neighbours (30%); kills grant 10 energy'],
        ['Проклятые враги взрываются при гибели (60% атаки рядом)', 'Hexed foes explode on death (60% ATK nearby)'],
        ['Проклятие усиливает урон по цели до +35%', 'Hex raises damage taken to +35%'],
      ),
    },
  },
  hunter: {
    id: 'hunter',
    name: L('Охотница', 'Hunter'),
    role: L('Арбалет и волк Снег', 'Crossbow and Snow the wolf'),
    x: 20,
    range: 44,
    speed: 14,
    interval: 900,
    base: { hp: 860, atk: 96, def: 42 },
    attack: 'crossbow',
    weapon: 'crossbow',
    skill: {
      id: 'hunter.skill',
      kind: 'skill',
      name: L('Метка добычи', 'Mark the Prey'),
      desc: L('130% урона; 6 с отряд бьёт добычу на 25% сильнее, Снег бросается на неё', '130% damage; for 6 s the party hits the prey 25% harder and Snow pounces on it'),
      cd: 9000,
      first: 2000,
      target: 'target',
      fx: [{ fx: { t: 'dmg', mult: 1.3 } }, { fx: { t: 'mark', kind: 'prey', ms: 6000 } }],
      vfx: 'beast',
    },
    ult: {
      id: 'hunter.ult',
      kind: 'ult',
      name: L('Стая', 'The Pack'),
      desc: L('Призывает двух призрачных волков на 8 с и бьёт 150% всем врагам', 'Summons two spirit wolves for 8 s and deals 150% to all foes'),
      target: 'all',
      fx: [{ fx: { t: 'dmg', mult: 1.5 } }, { fx: { t: 'summon', unit: 'spiritWolf', count: 2, mult: 0.45, ms: 8000 }, to: 'self' }],
      vfx: 'beast',
    },
    passive: {
      name: L('Снег', 'Snow'),
      desc: P(
        ['С ней сражается волк Снег (возвращается через 10 с после гибели)', 'Snow the wolf fights alongside her (returns 10 s after falling)'],
        ['Снег сильнее на 50%', 'Snow is 50% stronger'],
        ['Добыча получает +40% урона', 'Prey takes +40% damage'],
      ),
    },
  },
};

/**
 * Связки — пары героев в «Цепи Легиона» (порядок не важен): вторая ульта пары в цепи запускает эффект связки.
 * from/to — для интерфейса и сцен у костра.
 */
export interface ComboDef {
  id: 'backstab' | 'decay' | 'detonate' | 'crush' | 'hunt' | 'grace';
  name: L10n;
  desc: L10n;
  from: ClassId;
  to: ClassId[];
  vfx: string;
}

export const COMBOS: ComboDef[] = [
  { id: 'backstab', name: L('Удар в спину', 'Backstab'), desc: L('Кейра бьёт самого раненого врага на 300% атаки — всегда критом', 'Keira strikes the most wounded foe for 300% ATK — always a crit'), from: 'knight', to: ['assassin'], vfx: 'dark' },
  { id: 'decay', name: L('Разложение', 'Decay'), desc: L('Яд и проклятие: все враги получают 200% атаки Лиры за 5 с и +15% урона', 'Poison meets hex: all foes take 200% of Lira’s ATK over 5 s and +15% damage'), from: 'assassin', to: ['warlock'], vfx: 'poison' },
  { id: 'detonate', name: L('Детонация', 'Detonation'), desc: L('Взрыв по всем врагам на 180% атаки стрелка', 'An explosion hits all foes for 180% of the shooter’s ATK'), from: 'warlock', to: ['ranger', 'hunter'], vfx: 'fire' },
  { id: 'crush', name: L('Сокрушение', 'Crush'), desc: L('Все враги оглушены на 2 с и получают 100% атаки Кассиана', 'All foes are stunned for 2 s and take 100% of Cassian’s ATK'), from: 'ranger', to: ['knight'], vfx: 'shield' },
  { id: 'hunt', name: L('Травля', 'The Hunt'), desc: L('Отряд ускоряется на 30% на 6 с, волки впадают в ярость', 'The party gains 30% speed for 6 s, wolves go into a frenzy'), from: 'hunter', to: ['knight', 'assassin', 'ranger'], vfx: 'beast' },
  { id: 'grace', name: L('Благодать', 'Grace'), desc: L('Отряд лечится на 100% атаки Мирабель и получает 15 энергии', 'The party heals for 100% of Mirabel’s ATK and gains 15 energy'), from: 'priestess', to: ['knight', 'assassin', 'ranger', 'warlock', 'hunter'], vfx: 'heal' },
];
export const COMBO_MAP: Record<string, ComboDef> = Object.fromEntries(COMBOS.map((c) => [c.id, c]));

/** Связка пары классов (порядок не важен) или null. */
export function comboOf(a: ClassId, b: ClassId): ComboDef | null {
  return COMBOS.find((c) => (c.from === a && c.to.includes(b)) || (c.from === b && c.to.includes(a))) ?? null;
}

/** Мастерство связок: каждая сыгранная связка копится, 10 уровней, +8% к силе связки за уровень. */
export const COMBO_MASTERY = [10, 40, 120, 300, 700, 1500, 3000, 6000, 12000, 25000];
export const COMBO_MASTERY_STEP = 0.08;
export function comboMastery(count: number): { lvl: number; next: number | null; from: number } {
  let lvl = 0;
  while (lvl < COMBO_MASTERY.length && count >= COMBO_MASTERY[lvl]) lvl++;
  return { lvl, next: COMBO_MASTERY[lvl] ?? null, from: lvl > 0 ? COMBO_MASTERY[lvl - 1] : 0 };
}

/** Ступень пассивки по рангу: ★1 → 0, ★3 → 1, ★5 → 2. */
export function passiveTier(rank: number): number {
  return rank >= 5 ? 2 : rank >= 3 ? 1 : 0;
}

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
