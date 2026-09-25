import type { ClassId, Element, L10n, SpecialEffect, StatKey } from '../types';

/** Правило выбора целей умения. */
export type TargetRule =
  | 'enemy'
  | 'enemyBack'
  | 'enemyFront'
  | 'enemyAll'
  | 'enemyRandom'
  | 'enemyLowest'
  | 'self'
  | 'allyLowest'
  | 'allyAll'
  | 'allyFront'
  | 'allyDead'
  | 'allyStrongest';

export type DotKind = 'burn' | 'poison' | 'bleed';
export type CcKind = 'stun' | 'freeze' | 'silence';
/** Характеристики, которые можно временно менять баффами/дебаффами. */
export type BuffStat = 'atk' | 'def' | 'spd' | 'crit' | 'critDmg' | 'acc' | 'eva' | 'dmgTaken' | 'dmg' | 'healRecv';

export interface SkillEffect {
  t: 'dmg' | 'heal' | 'shield' | 'dot' | 'cc' | 'buff' | 'debuff' | 'taunt' | 'energy' | 'summon' | 'revive' | 'cleanse' | 'hot';
  target?: TargetRule;
  /** Множитель от характеристики scale (1.8 = 180%). */
  mult?: number;
  /** Прирост mult за каждый ранг выше первого. */
  perRank?: number;
  scale?: 'atk' | 'hp' | 'def';
  hits?: number;
  dot?: DotKind;
  cc?: CcKind;
  chance?: number;
  turns?: number;
  stat?: BuffStat;
  value?: number;
  valuePerRank?: number;
  amount?: number;
  count?: number;
  unit?: string;
  pct?: number;
  lifesteal?: number;
  /** Бонус к множителю по целям ниже 30% HP. */
  execute?: number;
  element?: Element;
}

export interface SkillDef {
  id: string;
  cls: ClassId | 'enemy';
  kind: 'basic' | 'active' | 'ult';
  name: L10n;
  target: TargetRule;
  cd?: number;
  effects: SkillEffect[];
  /** Визуальный эффект для клиента. */
  vfx?: 'slash' | 'arrow' | 'bolt' | 'nova' | 'heal' | 'shield' | 'dark' | 'song' | 'poison' | 'fire' | 'ice' | 'holy';
}

export interface SkillMod {
  skill: string;
  addEffects?: SkillEffect[];
  extraHits?: number;
  cdReduce?: number;
  /** Прибавка к множителю всех dmg/heal/shield эффектов за ранг. */
  multBonus?: number;
}

export type SpecialEffectId =
  | 'phoenix'
  | 'echo'
  | 'killStack'
  | 'firstStrike'
  | 'execute'
  | 'startShield'
  | 'thorns'
  | 'counter'
  | 'lastStand'
  | 'overhealShield'
  | 'dotSpread'
  | 'doubleStrike'
  | 'critEnergy'
  | 'ultTeamHeal'
  | 'critStun'
  | 'ccImmuneFirst'
  | 'auraAtk'
  | 'auraDef'
  | 'auraSpd'
  | 'auraCrit'
  | 'auraHeal'
  | 'bleedOnHit'
  | 'burnOnHit'
  | 'poisonOnHit'
  | 'startEnergy'
  | 'guardianAngel'
  | 'cleanseTurn'
  | 'summonOnAllyDeath'
  | 'chain'
  | 'tauntStart'
  | 'frozenVuln'
  | 'energyOnKill'
  | 'healOnKill'
  | 'shieldOnUlt'
  | 'berserkLowHp'
  | 'secondWind'
  | 'immuneBlind'
  | 'classMod';

export interface SpecialEffectDef {
  id: SpecialEffectId;
  name: L10n;
  /** Шаблон описания: {v} — процент от v, {n} — число n, {vn} — v как число. */
  desc: L10n;
}

export const SPECIAL_EFFECTS: Record<SpecialEffectId, SpecialEffectDef> = {
  phoenix: {
    id: 'phoenix',
    name: { ru: 'Сердце феникса', en: 'Phoenix Heart' },
    desc: { ru: 'Раз за бой воскресает с {v} HP', en: 'Once per battle revives with {v} HP' },
  },
  echo: {
    id: 'echo',
    name: { ru: 'Эхо', en: 'Echo' },
    desc: { ru: 'Каждое {n}-е умение повторяется бесплатно', en: 'Every {n}th skill is repeated for free' },
  },
  killStack: {
    id: 'killStack',
    name: { ru: 'Жажда битвы', en: 'Battle Thirst' },
    desc: {
      ru: 'После смерти врага +{v} ATK на 3 хода (до {n} стаков)',
      en: 'After an enemy dies +{v} ATK for 3 turns (up to {n} stacks)',
    },
  },
  firstStrike: {
    id: 'firstStrike',
    name: { ru: 'Первый удар', en: 'First Strike' },
    desc: { ru: 'Первое действие в бою наносит +{v} урона', en: 'First action in battle deals +{v} damage' },
  },
  execute: {
    id: 'execute',
    name: { ru: 'Казнь', en: 'Execute' },
    desc: { ru: '+{v} урона по целям ниже 30% HP', en: '+{v} damage to targets below 30% HP' },
  },
  startShield: {
    id: 'startShield',
    name: { ru: 'Барьер', en: 'Barrier' },
    desc: { ru: 'В начале боя щит на {v} макс. HP', en: 'Shield for {v} of max HP at battle start' },
  },
  thorns: {
    id: 'thorns',
    name: { ru: 'Шипы', en: 'Thorns' },
    desc: { ru: 'Отражает {v} полученного урона', en: 'Reflects {v} of damage taken' },
  },
  counter: {
    id: 'counter',
    name: { ru: 'Контратака', en: 'Counter' },
    desc: { ru: '{v} шанс контратаковать при получении удара', en: '{v} chance to counterattack when hit' },
  },
  lastStand: {
    id: 'lastStand',
    name: { ru: 'Последний рубеж', en: 'Last Stand' },
    desc: { ru: 'Ниже 30% HP: +{v} ATK и DEF', en: 'Below 30% HP: +{v} ATK and DEF' },
  },
  overhealShield: {
    id: 'overhealShield',
    name: { ru: 'Избыток света', en: 'Overflowing Light' },
    desc: { ru: '{v} избыточного лечения превращается в щит', en: '{v} of overhealing becomes a shield' },
  },
  dotSpread: {
    id: 'dotSpread',
    name: { ru: 'Эпидемия', en: 'Epidemic' },
    desc: {
      ru: 'Когда враг с периодическим уроном погибает, эффекты переходят на соседа',
      en: 'When an enemy with damage-over-time dies, its effects spread to another enemy',
    },
  },
  doubleStrike: {
    id: 'doubleStrike',
    name: { ru: 'Двойной удар', en: 'Double Strike' },
    desc: { ru: '{v} шанс атаковать дважды', en: '{v} chance to attack twice' },
  },
  critEnergy: {
    id: 'critEnergy',
    name: { ru: 'Искра', en: 'Spark' },
    desc: { ru: '+{n} энергии за критический удар', en: '+{n} energy per critical hit' },
  },
  ultTeamHeal: {
    id: 'ultTeamHeal',
    name: { ru: 'Благословение', en: 'Blessing' },
    desc: { ru: 'После ультимейта лечит отряд на {v} ATK', en: 'After ultimate heals the party for {v} ATK' },
  },
  critStun: {
    id: 'critStun',
    name: { ru: 'Оглушающий крит', en: 'Stunning Crit' },
    desc: { ru: 'Крит оглушает цель с шансом {v}', en: 'Crits stun the target with {v} chance' },
  },
  ccImmuneFirst: {
    id: 'ccImmuneFirst',
    name: { ru: 'Несломленная', en: 'Unbroken' },
    desc: { ru: 'Иммунитет к первому эффекту контроля', en: 'Immune to the first control effect' },
  },
  auraAtk: {
    id: 'auraAtk',
    name: { ru: 'Аура ярости', en: 'Aura of Fury' },
    desc: { ru: 'Отряд получает +{v} ATK', en: 'Party gains +{v} ATK' },
  },
  auraDef: {
    id: 'auraDef',
    name: { ru: 'Аура стойкости', en: 'Aura of Resolve' },
    desc: { ru: 'Отряд получает +{v} DEF', en: 'Party gains +{v} DEF' },
  },
  auraSpd: {
    id: 'auraSpd',
    name: { ru: 'Аура ветра', en: 'Aura of Wind' },
    desc: { ru: 'Отряд получает +{n} SPD', en: 'Party gains +{n} SPD' },
  },
  auraCrit: {
    id: 'auraCrit',
    name: { ru: 'Аура точности', en: 'Aura of Precision' },
    desc: { ru: 'Отряд получает +{v} к шансу крита', en: 'Party gains +{v} crit chance' },
  },
  auraHeal: {
    id: 'auraHeal',
    name: { ru: 'Аура исцеления', en: 'Aura of Healing' },
    desc: { ru: 'Отряд получает +{v} к силе лечения', en: 'Party gains +{v} healing power' },
  },
  bleedOnHit: {
    id: 'bleedOnHit',
    name: { ru: 'Кровопускание', en: 'Bloodletting' },
    desc: { ru: '{v} шанс вызвать кровотечение при атаке', en: '{v} chance to cause bleeding on attack' },
  },
  burnOnHit: {
    id: 'burnOnHit',
    name: { ru: 'Поджог', en: 'Ignite' },
    desc: { ru: '{v} шанс поджечь цель при атаке', en: '{v} chance to burn the target on attack' },
  },
  poisonOnHit: {
    id: 'poisonOnHit',
    name: { ru: 'Отравление', en: 'Envenom' },
    desc: { ru: '{v} шанс отравить цель при атаке', en: '{v} chance to poison the target on attack' },
  },
  startEnergy: {
    id: 'startEnergy',
    name: { ru: 'Заряд', en: 'Charged' },
    desc: { ru: 'Начинает бой с {n} энергии', en: 'Starts battle with {n} energy' },
  },
  guardianAngel: {
    id: 'guardianAngel',
    name: { ru: 'Ангел-хранитель', en: 'Guardian Angel' },
    desc: {
      ru: 'Раз за бой спасает союзницу от смерти и даёт ей щит',
      en: 'Once per battle saves an ally from death and shields her',
    },
  },
  cleanseTurn: {
    id: 'cleanseTurn',
    name: { ru: 'Очищение', en: 'Purity' },
    desc: { ru: '{v} шанс снять с себя дебаффы в начале хода', en: '{v} chance to cleanse debuffs at turn start' },
  },
  summonOnAllyDeath: {
    id: 'summonOnAllyDeath',
    name: { ru: 'Костяной долг', en: 'Bone Debt' },
    desc: {
      ru: 'Когда союзница погибает, призывает скелета (до {n} за бой)',
      en: 'When an ally dies, summons a skeleton (up to {n} per battle)',
    },
  },
  chain: {
    id: 'chain',
    name: { ru: 'Цепь', en: 'Chain' },
    desc: { ru: 'Базовая атака перескакивает на вторую цель ({v} урона)', en: 'Basic attack chains to a second target ({v} damage)' },
  },
  tauntStart: {
    id: 'tauntStart',
    name: { ru: 'Вызов', en: 'Challenge' },
    desc: { ru: 'Провоцирует врагов первые {n} хода', en: 'Taunts enemies for the first {n} turns' },
  },
  frozenVuln: {
    id: 'frozenVuln',
    name: { ru: 'Абсолютный ноль', en: 'Absolute Zero' },
    desc: {
      ru: 'Замороженные и оглушённые враги получают +{v} урона',
      en: 'Frozen and stunned enemies take +{v} damage',
    },
  },
  energyOnKill: {
    id: 'energyOnKill',
    name: { ru: 'Поглощение души', en: 'Soul Harvest' },
    desc: { ru: '+{n} энергии за убийство', en: '+{n} energy per kill' },
  },
  healOnKill: {
    id: 'healOnKill',
    name: { ru: 'Пир', en: 'Feast' },
    desc: { ru: 'Восстанавливает {v} макс. HP за убийство', en: 'Restores {v} max HP per kill' },
  },
  shieldOnUlt: {
    id: 'shieldOnUlt',
    name: { ru: 'Сияние', en: 'Radiance' },
    desc: { ru: 'После ультимейта отряд получает щит на {v} ATK', en: 'After ultimate the party gains a shield of {v} ATK' },
  },
  berserkLowHp: {
    id: 'berserkLowHp',
    name: { ru: 'Кровавое безумие', en: 'Blood Frenzy' },
    desc: { ru: '+{v} ATK за каждые 10% потерянного HP', en: '+{v} ATK per 10% HP missing' },
  },
  secondWind: {
    id: 'secondWind',
    name: { ru: 'Второе дыхание', en: 'Second Wind' },
    desc: { ru: 'Раз за бой ниже 30% HP лечится на {v} макс. HP', en: 'Once per battle below 30% HP heals {v} of max HP' },
  },
  immuneBlind: {
    id: 'immuneBlind',
    name: { ru: 'Зоркость', en: 'Clear Sight' },
    desc: { ru: 'Иммунитет к ослеплению (снижению точности)', en: 'Immune to blind (accuracy reduction)' },
  },
  classMod: {
    id: 'classMod',
    name: { ru: 'Сила класса', en: 'Class Power' },
    desc: { ru: 'Меняет умение класса', en: 'Changes a class skill' },
  },
};

export function fxText(fx: SpecialEffect, lang: 'ru' | 'en'): string {
  const def = SPECIAL_EFFECTS[fx.id as SpecialEffectId];
  if (!def) return fx.id;
  return def.desc[lang]
    .replace('{v}', `${Math.round((fx.v ?? 0) * 100)}%`)
    .replace('{vn}', String(fx.v ?? 0))
    .replace('{n}', String(fx.n ?? 0));
}

/** Человекочитаемые названия характеристик. */
export const STAT_NAMES: Record<StatKey, L10n> = {
  hp: { ru: 'Здоровье', en: 'HP' },
  atk: { ru: 'Атака', en: 'ATK' },
  def: { ru: 'Защита', en: 'DEF' },
  spd: { ru: 'Скорость', en: 'SPD' },
  hpPct: { ru: 'Здоровье', en: 'HP' },
  atkPct: { ru: 'Атака', en: 'ATK' },
  defPct: { ru: 'Защита', en: 'DEF' },
  crit: { ru: 'Шанс крита', en: 'Crit chance' },
  critDmg: { ru: 'Крит. урон', en: 'Crit damage' },
  acc: { ru: 'Точность', en: 'Accuracy' },
  eva: { ru: 'Уклонение', en: 'Evasion' },
  pen: { ru: 'Пробивание', en: 'Penetration' },
  lifesteal: { ru: 'Вампиризм', en: 'Lifesteal' },
  healPower: { ru: 'Сила лечения', en: 'Healing power' },
  resist: { ru: 'Сопротивление', en: 'Resistance' },
  energyRegen: { ru: 'Реген. энергии', en: 'Energy regen' },
  dmgFire: { ru: 'Урон огнём', en: 'Fire damage' },
  dmgNature: { ru: 'Урон природой', en: 'Nature damage' },
  dmgWater: { ru: 'Урон водой', en: 'Water damage' },
  dmgLight: { ru: 'Урон светом', en: 'Light damage' },
  dmgDark: { ru: 'Урон тьмой', en: 'Dark damage' },
  dmgBoss: { ru: 'Урон по боссам', en: 'Boss damage' },
  dmgSkill: { ru: 'Урон умений', en: 'Skill damage' },
  dmgUlt: { ru: 'Урон ультимейта', en: 'Ultimate damage' },
  dmgBasic: { ru: 'Урон базовой атаки', en: 'Basic attack damage' },
  dmgDot: { ru: 'Периодический урон', en: 'Damage over time' },
  dmgReduce: { ru: 'Снижение урона', en: 'Damage reduction' },
  shieldPower: { ru: 'Сила щитов', en: 'Shield power' },
  goldPct: { ru: 'Золото с врагов', en: 'Gold from enemies' },
  xpPct: { ru: 'Опыт', en: 'Experience' },
  lootDouble: { ru: 'Шанс двойного лута', en: 'Double loot chance' },
  skillRank: { ru: 'Ранг умений', en: 'Skill rank' },
};

/** Характеристики, которые хранятся в долях и отображаются в процентах. */
export const PCT_STATS: ReadonlySet<StatKey> = new Set<StatKey>([
  'hpPct',
  'atkPct',
  'defPct',
  'crit',
  'critDmg',
  'acc',
  'eva',
  'pen',
  'lifesteal',
  'healPower',
  'resist',
  'energyRegen',
  'dmgFire',
  'dmgNature',
  'dmgWater',
  'dmgLight',
  'dmgDark',
  'dmgBoss',
  'dmgSkill',
  'dmgUlt',
  'dmgBasic',
  'dmgDot',
  'dmgReduce',
  'shieldPower',
  'goldPct',
  'xpPct',
  'lootDouble',
]);

export function statText(stat: StatKey, v: number, lang: 'ru' | 'en'): string {
  const name = STAT_NAMES[stat]?.[lang] ?? stat;
  if (PCT_STATS.has(stat)) {
    const pct = Math.round(v * 1000) / 10;
    return `+${pct}% ${name}`;
  }
  return `+${formatNum(v)} ${name}`;
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Компактный формат больших чисел: 1.2K, 3.4M … затем aa, ab… */
export function formatNum(n: number): string {
  if (!isFinite(n)) return '∞';
  const neg = n < 0;
  let v = Math.abs(n);
  if (v < 1000) return (neg ? '-' : '') + (v < 10 && v % 1 ? v.toFixed(1) : Math.floor(v).toString());
  let i = 0;
  while (v >= 1000 && i < 400) {
    v /= 1000;
    i++;
  }
  let suf: string;
  if (i < SUFFIXES.length) suf = SUFFIXES[i];
  else {
    const k = i - SUFFIXES.length;
    suf = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + (k % 26));
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return (neg ? '-' : '') + v.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') + suf;
}
