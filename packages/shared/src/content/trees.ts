import type { ClassId, L10n, SpecialEffect, Stats } from '../types';
import type { SkillDef, SkillEffect, SkillMod } from './effects';

/**
 * Древо навыков: у каждого из шести классов 3 ветки по 10 узлов (всего 30 узлов, 120 рангов).
 * Ярус 2 открывается после 10 очков в ветке, ярус 3 — после 20, ключевой талант — после 30.
 */
export interface TreeNode {
  id: string;
  cls: ClassId;
  branch: 0 | 1 | 2;
  tier: 1 | 2 | 3 | 4;
  kind: 'passive' | 'active' | 'mod' | 'key';
  max: number;
  /** Бонус за ранг (для пассивок). */
  stats?: Stats;
  skill?: string;
  mod?: SkillMod;
  fx?: SpecialEffect;
  name: L10n;
}

export const TIER_REQ = [0, 0, 10, 20, 30];

interface BranchSpec {
  passives: [Stats, Stats, Stats, Stats, Stats];
  skills: [SkillDef, SkillDef];
  mods: [Omit<SkillMod, 'skill'> & { name: L10n }, Omit<SkillMod, 'skill'> & { name: L10n }];
  key: { fx: SpecialEffect; name: L10n };
}

export const TREE_SKILLS: SkillDef[] = [];
export const TREE_NODES: TreeNode[] = [];
export const TREES: Record<ClassId, TreeNode[]> = {} as Record<ClassId, TreeNode[]>;

function sk(
  cls: ClassId,
  id: string,
  ru: string,
  en: string,
  target: SkillDef['target'],
  cd: number,
  effects: SkillEffect[],
  vfx: SkillDef['vfx'],
): SkillDef {
  return { id: `${cls}.${id}`, cls, kind: 'active', name: { ru, en }, target, cd, effects, vfx };
}

function defineTree(cls: ClassId, branches: [BranchSpec, BranchSpec, BranchSpec]) {
  const nodes: TreeNode[] = [];
  branches.forEach((b, bi) => {
    const branch = bi as 0 | 1 | 2;
    const p = (i: number, tier: 1 | 2 | 3, max: number): TreeNode => ({
      id: `${cls}.b${bi}.p${i}`,
      cls,
      branch,
      tier,
      kind: 'passive',
      max,
      stats: b.passives[i],
      name: { ru: '', en: '' },
    });
    const [s1, s2] = b.skills;
    TREE_SKILLS.push(s1, s2);
    nodes.push(
      p(0, 1, 5),
      { id: `${cls}.b${bi}.s0`, cls, branch, tier: 1, kind: 'active', max: 5, skill: s1.id, name: s1.name },
      p(1, 1, 5),
      {
        id: `${cls}.b${bi}.m0`,
        cls,
        branch,
        tier: 2,
        kind: 'mod',
        max: 3,
        mod: { ...b.mods[0], skill: s1.id },
        name: b.mods[0].name,
      },
      p(2, 2, 5),
      { id: `${cls}.b${bi}.s1`, cls, branch, tier: 2, kind: 'active', max: 5, skill: s2.id, name: s2.name },
      {
        id: `${cls}.b${bi}.m1`,
        cls,
        branch,
        tier: 3,
        kind: 'mod',
        max: 3,
        mod: { ...b.mods[1], skill: s2.id },
        name: b.mods[1].name,
      },
      p(3, 3, 5),
      p(4, 3, 3),
      { id: `${cls}.b${bi}.k`, cls, branch, tier: 4, kind: 'key', max: 1, fx: b.key.fx, name: b.key.name },
    );
  });
  // модификаторы требуют изученного умения: проверяется в логике древа
  for (const n of nodes) {
    delete (n.mod as any)?.name;
  }
  TREES[cls] = nodes;
  TREE_NODES.push(...nodes);
}

// ——— Рыцарь ———
defineTree('knight', [
  {
    passives: [{ hpPct: 0.03 }, { defPct: 0.03 }, { dmgReduce: 0.01 }, { resist: 0.02 }, { shieldPower: 0.05 }],
    skills: [
      sk('knight', 'shieldBash', 'Удар щитом', 'Shield Bash', 'enemy', 3, [
        { t: 'dmg', mult: 1.4, perRank: 0.25, scale: 'atk' },
        { t: 'cc', cc: 'stun', chance: 0.3, turns: 1 },
      ], 'shield'),
      sk('knight', 'ironSkin', 'Железная кожа', 'Iron Skin', 'self', 4, [
        { t: 'buff', stat: 'dmgTaken', value: -0.3, valuePerRank: -0.03, turns: 2 },
        { t: 'taunt', turns: 2 },
      ], 'shield'),
    ],
    mods: [
      { name: { ru: 'Сотрясение', en: 'Concussion' }, addEffects: [{ t: 'cc', cc: 'stun', chance: 0.1, turns: 1 }] },
      { name: { ru: 'Стальной ответ', en: 'Steel Reply' }, addEffects: [{ t: 'shield', target: 'self', mult: 0.05, scale: 'hp' }] },
    ],
    key: { fx: { id: 'startShield', v: 0.25 }, name: { ru: 'Незыблемость', en: 'Immovable' } },
  },
  {
    passives: [{ atkPct: 0.03 }, { critDmg: 0.04 }, { lifesteal: 0.01 }, { crit: 0.01 }, { dmgBasic: 0.05 }],
    skills: [
      sk('knight', 'judgement', 'Правосудие', 'Judgement', 'enemy', 3, [
        { t: 'dmg', mult: 1.8, perRank: 0.3, scale: 'atk' },
      ], 'holy'),
      sk('knight', 'riposte', 'Рипост', 'Riposte', 'enemyFront', 4, [
        { t: 'dmg', mult: 1.2, perRank: 0.2, scale: 'atk' },
        { t: 'debuff', stat: 'atk', value: -0.15, turns: 2 },
      ], 'slash'),
    ],
    mods: [
      { name: { ru: 'Кара щитом', en: 'Shield Smite' }, multBonus: 0.15 },
      { name: { ru: 'Обезоруживание', en: 'Disarm' }, addEffects: [{ t: 'cc', cc: 'silence', chance: 0.15, turns: 1 }] },
    ],
    key: { fx: { id: 'counter', v: 0.3 }, name: { ru: 'Возмездие', en: 'Retaliation' } },
  },
  {
    passives: [{ hpPct: 0.02, defPct: 0.02 }, { healPower: 0.04 }, { shieldPower: 0.05 }, { hpPct: 0.04 }, { resist: 0.03 }],
    skills: [
      sk('knight', 'rally', 'Сплочение', 'Rally', 'allyAll', 4, [
        { t: 'shield', mult: 0.06, perRank: 0.01, scale: 'hp' },
      ], 'shield'),
      sk('knight', 'oath', 'Клятва защитницы', "Defender's Oath", 'allyAll', 5, [
        { t: 'buff', stat: 'def', value: 0.2, valuePerRank: 0.04, turns: 3 },
        { t: 'heal', mult: 0.05, scale: 'hp' },
      ], 'holy'),
    ],
    mods: [
      { name: { ru: 'Единство', en: 'Unity' }, multBonus: 0.02 },
      { name: { ru: 'Благая весть', en: 'Good Tidings' }, addEffects: [{ t: 'cleanse' }] },
    ],
    key: { fx: { id: 'guardianAngel' }, name: { ru: 'Ангел-хранитель', en: 'Guardian Angel' } },
  },
]);

// ——— Ассасин ———
defineTree('assassin', [
  {
    passives: [{ crit: 0.012 }, { critDmg: 0.06 }, { eva: 0.012 }, { critDmg: 0.07 }, { crit: 0.015 }],
    skills: [
      sk('assassin', 'backstab', 'Удар в спину', 'Backstab', 'enemyBack', 3, [
        { t: 'dmg', mult: 2.2, perRank: 0.4 },
      ], 'slash'),
      sk('assassin', 'vanish', 'Исчезновение', 'Vanish', 'self', 5, [
        { t: 'buff', stat: 'eva', value: 0.35, valuePerRank: 0.03, turns: 2 },
        { t: 'buff', stat: 'crit', value: 0.3, turns: 2 },
      ], 'dark'),
    ],
    mods: [
      { name: { ru: 'Из тени', en: 'From the Shadows' }, multBonus: 0.2 },
      { name: { ru: 'Сумрак', en: 'Dusk' }, addEffects: [{ t: 'energy', target: 'self', amount: 20 }] },
    ],
    key: { fx: { id: 'firstStrike', v: 0.8 }, name: { ru: 'Первая кровь', en: 'First Blood' } },
  },
  {
    passives: [{ dmgDot: 0.05 }, { pen: 0.015 }, { dmgNature: 0.04 }, { dmgDot: 0.06 }, { atkPct: 0.03 }],
    skills: [
      sk('assassin', 'toxicBlade', 'Отравленный клинок', 'Toxic Blade', 'enemy', 3, [
        { t: 'dmg', mult: 1.2, perRank: 0.2 },
        { t: 'dot', dot: 'poison', mult: 0.6, perRank: 0.1, turns: 3 },
      ], 'poison'),
      sk('assassin', 'weaken', 'Ослабление', 'Weaken', 'enemyAll', 4, [
        { t: 'debuff', stat: 'atk', value: -0.15, valuePerRank: -0.02, turns: 2 },
        { t: 'debuff', stat: 'def', value: -0.15, turns: 2 },
      ], 'poison'),
    ],
    mods: [
      { name: { ru: 'Паралич', en: 'Paralysis' }, addEffects: [{ t: 'cc', cc: 'stun', chance: 0.15, turns: 1 }] },
      { name: { ru: 'Разложение', en: 'Decay' }, addEffects: [{ t: 'dot', dot: 'poison', mult: 0.3, turns: 2 }] },
    ],
    key: { fx: { id: 'poisonOnHit', v: 0.5 }, name: { ru: 'Ядовитая кровь', en: 'Venom Blood' } },
  },
  {
    passives: [{ atkPct: 0.03 }, { spd: 2 }, { dmgBasic: 0.05 }, { spd: 3 }, { lifesteal: 0.015 }],
    skills: [
      sk('assassin', 'bladeFlurry', 'Шквал клинков', 'Blade Flurry', 'enemyRandom', 3, [
        { t: 'dmg', mult: 0.6, perRank: 0.1, hits: 4 },
      ], 'slash'),
      sk('assassin', 'fanOfKnives', 'Веер ножей', 'Fan of Knives', 'enemyAll', 4, [
        { t: 'dmg', mult: 0.9, perRank: 0.15 },
        { t: 'dot', dot: 'bleed', mult: 0.3, turns: 2 },
      ], 'slash'),
    ],
    mods: [
      { name: { ru: 'Танец лезвий', en: 'Blade Dance' }, extraHits: 1 },
      { name: { ru: 'Кровавый веер', en: 'Bloody Fan' }, multBonus: 0.12 },
    ],
    key: { fx: { id: 'bleedOnHit', v: 0.4 }, name: { ru: 'Тысяча порезов', en: 'Thousand Cuts' } },
  },
]);

// ——— Жрица ———
defineTree('priestess', [
  {
    passives: [{ healPower: 0.04 }, { hpPct: 0.03 }, { healPower: 0.05 }, { energyRegen: 0.03 }, { healPower: 0.06 }],
    skills: [
      sk('priestess', 'heal', 'Исцеление', 'Heal', 'allyLowest', 2, [
        { t: 'heal', mult: 2.2, perRank: 0.4 },
      ], 'heal'),
      sk('priestess', 'prayer', 'Молитва', 'Prayer', 'allyAll', 4, [
        { t: 'heal', mult: 1.0, perRank: 0.18 },
      ], 'heal'),
    ],
    mods: [
      { name: { ru: 'Обновление', en: 'Renew' }, addEffects: [{ t: 'hot', mult: 0.4, turns: 3 }] },
      { name: { ru: 'Благодать', en: 'Grace' }, addEffects: [{ t: 'cleanse' }] },
    ],
    key: { fx: { id: 'overhealShield', v: 0.5 }, name: { ru: 'Избыток света', en: 'Overflowing Light' } },
  },
  {
    passives: [{ shieldPower: 0.05 }, { defPct: 0.03 }, { resist: 0.03 }, { shieldPower: 0.06 }, { atkPct: 0.02 }],
    skills: [
      sk('priestess', 'aegis', 'Святой щит', 'Holy Shield', 'allyLowest', 3, [
        { t: 'shield', mult: 2.0, perRank: 0.35 },
      ], 'shield'),
      sk('priestess', 'hymn', 'Гимн веры', 'Hymn of Faith', 'allyAll', 5, [
        { t: 'buff', stat: 'atk', value: 0.15, valuePerRank: 0.03, turns: 3 },
        { t: 'buff', stat: 'def', value: 0.15, turns: 3 },
      ], 'holy'),
    ],
    mods: [
      { name: { ru: 'Твёрдая вера', en: 'Steadfast Faith' }, addEffects: [{ t: 'buff', stat: 'dmgTaken', value: -0.1, turns: 2 }] },
      { name: { ru: 'Воодушевление', en: 'Uplift' }, addEffects: [{ t: 'energy', amount: 10 }] },
    ],
    key: { fx: { id: 'shieldOnUlt', v: 1.5 }, name: { ru: 'Сияние', en: 'Radiance' } },
  },
  {
    passives: [{ dmgLight: 0.05 }, { atkPct: 0.03 }, { crit: 0.012 }, { dmgLight: 0.05 }, { pen: 0.02 }],
    skills: [
      sk('priestess', 'smite', 'Кара небес', 'Smite', 'enemy', 3, [
        { t: 'dmg', mult: 1.7, perRank: 0.3, element: 'light' },
      ], 'holy'),
      sk('priestess', 'holyNova', 'Святая вспышка', 'Holy Nova', 'enemyAll', 4, [
        { t: 'dmg', mult: 0.8, perRank: 0.12, element: 'light' },
        { t: 'heal', target: 'allyAll', mult: 0.5 },
      ], 'holy'),
    ],
    mods: [
      { name: { ru: 'Ослепление', en: 'Blinding Light' }, addEffects: [{ t: 'debuff', stat: 'acc', value: -0.2, turns: 2 }] },
      { name: { ru: 'Очищающий огонь', en: 'Purging Fire' }, addEffects: [{ t: 'dot', dot: 'burn', mult: 0.3, turns: 2 }] },
    ],
    key: { fx: { id: 'ultTeamHeal', v: 1.2 }, name: { ru: 'Благовест', en: 'Benediction' } },
  },
]);

// ——— Следопыт ———
defineTree('ranger', [
  {
    passives: [{ crit: 0.012 }, { critDmg: 0.05 }, { acc: 0.02 }, { pen: 0.015 }, { dmgBoss: 0.05 }],
    skills: [
      sk('ranger', 'aimedShot', 'Прицельный выстрел', 'Aimed Shot', 'enemyLowest', 3, [
        { t: 'dmg', mult: 2.0, perRank: 0.35 },
      ], 'arrow'),
      sk('ranger', 'piercing', 'Пронзающая стрела', 'Piercing Arrow', 'enemyBack', 4, [
        { t: 'dmg', mult: 2.4, perRank: 0.4 },
        { t: 'debuff', stat: 'def', value: -0.2, turns: 2 },
      ], 'arrow'),
    ],
    mods: [
      { name: { ru: 'Ахиллесова пята', en: "Achilles' Heel" }, addEffects: [{ t: 'debuff', stat: 'eva', value: -0.1, turns: 2 }] },
      { name: { ru: 'Навылет', en: 'Through and Through' }, extraHits: 1 },
    ],
    key: { fx: { id: 'execute', v: 0.4 }, name: { ru: 'Охотница за головами', en: 'Headhunter' } },
  },
  {
    passives: [{ dmgDot: 0.05 }, { atkPct: 0.02 }, { dmgNature: 0.04 }, { dmgDot: 0.06 }, { pen: 0.02 }],
    skills: [
      sk('ranger', 'venomArrow', 'Отравленная стрела', 'Venom Arrow', 'enemy', 3, [
        { t: 'dmg', mult: 1.2, perRank: 0.2 },
        { t: 'dot', dot: 'poison', mult: 0.5, perRank: 0.08, turns: 3 },
      ], 'poison'),
      sk('ranger', 'bearTrap', 'Капкан', 'Bear Trap', 'enemyFront', 4, [
        { t: 'dmg', mult: 1.0, perRank: 0.15 },
        { t: 'mark', mark: 'root', turns: 2 },
        { t: 'dot', dot: 'bleed', mult: 0.3, turns: 2 },
      ], 'slash'),
    ],
    mods: [
      { name: { ru: 'Токсин', en: 'Toxin' }, addEffects: [{ t: 'debuff', stat: 'healRecv', value: -0.3, turns: 3 }] },
      { name: { ru: 'Зубья', en: 'Serrated' }, multBonus: 0.15 },
    ],
    key: { fx: { id: 'dotSpread' }, name: { ru: 'Эпидемия', en: 'Epidemic' } },
  },
  {
    passives: [{ spd: 2 }, { eva: 0.015 }, { energyRegen: 0.03 }, { spd: 3 }, { crit: 0.015 }],
    skills: [
      sk('ranger', 'multiShot', 'Залп', 'Multi-Shot', 'enemyRandom', 3, [
        { t: 'dmg', mult: 0.7, perRank: 0.12, hits: 3 },
      ], 'arrow'),
      sk('ranger', 'tailwind', 'Попутный ветер', 'Tailwind', 'allyAll', 5, [
        { t: 'buff', stat: 'spd', value: 15, valuePerRank: 3, turns: 3 },
      ], 'song'),
    ],
    mods: [
      { name: { ru: 'Шквал', en: 'Barrage' }, extraHits: 1 },
      { name: { ru: 'Свежий ветер', en: 'Fresh Breeze' }, addEffects: [{ t: 'energy', amount: 10 }] },
    ],
    key: { fx: { id: 'doubleStrike', v: 0.3 }, name: { ru: 'Двойная тетива', en: 'Double String' } },
  },
]);

// ——— Колдунья: «Пламя», «Проклятия», «Пепел» ———
defineTree('warlock', [
  {
    passives: [{ dmgFire: 0.04 }, { atkPct: 0.02 }, { dmgSkill: 0.04 }, { dmgFire: 0.05 }, { pen: 0.02 }],
    skills: [
      sk('warlock', 'fireball', 'Огненный шар', 'Fireball', 'enemy', 3, [
        { t: 'dmg', mult: 1.8, perRank: 0.4, element: 'fire' },
      ], 'fire'),
      sk('warlock', 'flameWave', 'Огненная волна', 'Flame Wave', 'enemyAll', 4, [
        { t: 'dmg', mult: 0.9, perRank: 0.15, element: 'fire' },
      ], 'fire'),
    ],
    mods: [
      { name: { ru: 'Поджог', en: 'Ignite' }, addEffects: [{ t: 'dot', dot: 'burn', mult: 0.3, turns: 3 }] },
      { name: { ru: 'Пекло', en: 'Inferno' }, addEffects: [{ t: 'dot', dot: 'burn', mult: 0.25, turns: 2 }] },
    ],
    key: { fx: { id: 'phoenix', v: 0.3 }, name: { ru: 'Сердце феникса', en: 'Phoenix Heart' } },
  },
  {
    passives: [{ dmgDot: 0.05 }, { dmgDark: 0.04 }, { dmgDot: 0.06 }, { pen: 0.02 }, { dmgDot: 0.08 }],
    skills: [
      sk('warlock', 'blight', 'Порча', 'Blight', 'enemyAll', 3, [
        { t: 'dot', dot: 'burn', mult: 0.5, perRank: 0.1, turns: 3 },
      ], 'dark'),
      sk('warlock', 'doom', 'Рок', 'Doom', 'enemy', 4, [
        { t: 'mark', mark: 'curse', turns: 3 },
        { t: 'debuff', stat: 'dmgTaken', value: 0.25, valuePerRank: 0.04, turns: 3 },
        { t: 'dot', dot: 'burn', mult: 0.6, turns: 3 },
      ], 'dark'),
    ],
    mods: [
      { name: { ru: 'Гниение', en: 'Rot' }, addEffects: [{ t: 'debuff', stat: 'healRecv', value: -0.3, turns: 3 }] },
      { name: { ru: 'Слабость', en: 'Weakness' }, addEffects: [{ t: 'debuff', stat: 'atk', value: -0.15, turns: 3 }] },
    ],
    key: { fx: { id: 'dotSpread' }, name: { ru: 'Пожар проклятий', en: 'Hexfire' } },
  },
  {
    passives: [{ energyRegen: 0.03 }, { dmgUlt: 0.05 }, { critDmg: 0.04 }, { energyRegen: 0.04 }, { dmgUlt: 0.06 }],
    skills: [
      sk('warlock', 'emberSparks', 'Пепельные искры', 'Ember Sparks', 'enemyRandom', 3, [
        { t: 'dmg', mult: 0.6, perRank: 0.1, hits: 3 },
      ], 'bolt'),
      sk('warlock', 'ashRitual', 'Пепельный обряд', 'Ash Ritual', 'allyAll', 5, [
        { t: 'energy', amount: 15 },
        { t: 'buff', stat: 'dmg', value: 0.1, valuePerRank: 0.02, turns: 2 },
      ], 'nova'),
    ],
    mods: [
      { name: { ru: 'Многозарядность', en: 'Multicast' }, extraHits: 1 },
      { name: { ru: 'Поток', en: 'Flow' }, addEffects: [{ t: 'energy', target: 'self', amount: 15 }] },
    ],
    key: { fx: { id: 'echo', n: 5 }, name: { ru: 'Эхо пепла', en: 'Echo of Ash' } },
  },
]);

// ——— Охотница: «Стая», «Капканы», «Лёд» ———
defineTree('hunter', [
  {
    passives: [{ hpPct: 0.03 }, { atkPct: 0.02 }, { defPct: 0.03 }, { atkPct: 0.03 }, { hpPct: 0.04 }],
    skills: [
      sk('hunter', 'howl', 'Вой', 'Howl', 'self', 4, [
        { t: 'summon', unit: 'wolf', count: 1, mult: 0.45, perRank: 0.06 },
        { t: 'buff', target: 'allyAll', stat: 'spd', value: 10, valuePerRank: 2, turns: 2 },
      ], 'song'),
      sk('hunter', 'packHunt', 'Загонная охота', 'Pack Hunt', 'enemy', 3, [
        { t: 'dmg', mult: 1.6, perRank: 0.28 },
        { t: 'mark', mark: 'prey', turns: 2 },
      ], 'arrow'),
    ],
    mods: [
      { name: { ru: 'Матёрый волк', en: 'Seasoned Wolf' }, addEffects: [{ t: 'buff', target: 'allyAll', stat: 'atk', value: 0.08, turns: 2 }] },
      { name: { ru: 'Кровавый след', en: 'Blood Trail' }, addEffects: [{ t: 'dot', dot: 'bleed', mult: 0.35, turns: 2 }] },
    ],
    key: { fx: { id: 'companion', n: 2 }, name: { ru: 'Стая', en: 'The Pack' } },
  },
  {
    passives: [{ dmgDot: 0.05 }, { pen: 0.015 }, { atkPct: 0.02 }, { dmgDot: 0.06 }, { crit: 0.012 }],
    skills: [
      sk('hunter', 'steelTrap', 'Стальной капкан', 'Steel Trap', 'enemyFront', 3, [
        { t: 'dmg', mult: 1.1, perRank: 0.18 },
        { t: 'mark', mark: 'root', turns: 2 },
        { t: 'dot', dot: 'bleed', mult: 0.4, turns: 2 },
      ], 'slash'),
      sk('hunter', 'netVolley', 'Залп сетей', 'Net Volley', 'enemyAll', 4, [
        { t: 'dmg', mult: 0.7, perRank: 0.12 },
        { t: 'debuff', stat: 'spd', value: -20, turns: 2 },
      ], 'arrow'),
    ],
    mods: [
      { name: { ru: 'Зазубрины', en: 'Barbs' }, multBonus: 0.15 },
      { name: { ru: 'Путы', en: 'Bindings' }, addEffects: [{ t: 'debuff', stat: 'eva', value: -0.15, turns: 2 }] },
    ],
    key: { fx: { id: 'bleedOnHit', v: 0.35 }, name: { ru: 'Капканщица', en: 'Trapper' } },
  },
  {
    passives: [{ dmgWater: 0.04 }, { crit: 0.012 }, { critDmg: 0.05 }, { dmgWater: 0.05 }, { acc: 0.02 }],
    skills: [
      sk('hunter', 'frostBolt', 'Морозный болт', 'Frost Bolt', 'enemy', 3, [
        { t: 'dmg', mult: 1.7, perRank: 0.3, element: 'water' },
        { t: 'cc', cc: 'freeze', chance: 0.25, turns: 1 },
      ], 'ice'),
      sk('hunter', 'iceBarrage', 'Ледяной шквал', 'Ice Barrage', 'enemyRandom', 4, [
        { t: 'dmg', mult: 0.6, perRank: 0.1, hits: 4, element: 'water' },
      ], 'ice'),
    ],
    mods: [
      { name: { ru: 'Иней', en: 'Hoarfrost' }, addEffects: [{ t: 'debuff', stat: 'spd', value: -15, turns: 2 }] },
      { name: { ru: 'Град', en: 'Hail' }, extraHits: 1 },
    ],
    key: { fx: { id: 'frozenVuln', v: 0.5 }, name: { ru: 'Северный холод', en: 'Northern Cold' } },
  },
]);

export const TREE_NODE_MAP: Record<string, TreeNode> = Object.fromEntries(TREE_NODES.map((n) => [n.id, n]));
