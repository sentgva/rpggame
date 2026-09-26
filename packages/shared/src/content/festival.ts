import type { Currency, Element, L10n } from '../types';
import { ENEMY_MAP, type EnemyDef } from './acts';
import type { SkillDef } from './effects';
import { HEROINE_MAP, SKINS, SKIN_MAP, type SkinDef } from './heroines';
import { TOWER_MODS, type TowerMod } from './modes';

/**
 * Праздники Легиона — большой ивент, который идёт всегда, но каждые две недели сменяется:
 * Кровавая Луна → Праздник Приливов → Цветение Сакуры → снова Луна…
 * У каждого праздника — своя героиня (только за награды праздника), свой босс-колосс,
 * путь из 18 этапов, ежедневные задания, цели, шкала наград и лавка.
 */
export type FestivalId = 'bloodmoon' | 'tides' | 'sakura';

export interface FestivalDef {
  id: FestivalId;
  name: L10n;
  tagline: L10n;
  lore: L10n;
  element: Element;
  /** героиня праздника (осколки — только здесь) */
  hero: string;
  /** босс праздника — колосс с огромным запасом HP, набирает уровни */
  boss: string;
  /** финальный враг пути — героиня праздника в облике испытания */
  trialBoss: string;
  /** акты, откуда приходят враги трёх глав пути */
  acts: [number, number, number];
  chapters: [L10n, L10n, L10n];
  /** цвета оформления: фон, акцент, свечение */
  colors: { bg: [string, string]; accent: string; glow: string };
  /** частицы на баннере */
  particle: 'moon' | 'bubble' | 'petal';
  /** облик героини праздника — финальная награда шкалы */
  finalSkin: string;
  /** облики других героинь — в лавке праздника */
  shopSkins: string[];
}

const L = (ru: string, en: string): L10n => ({ ru, en });

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'bloodmoon',
    name: L('Кровавая Луна', 'Blood Moon'),
    tagline: L('Ночь, когда луна алеет и просыпаются древние охотницы', 'The night the moon turns red and ancient huntresses wake'),
    lore: L(
      'Раз в шесть недель луна над Легионом наливается алым. Из склепов выходит Эржебет, Алая Луна, — и следом за ней по городу идёт охотница Селена. Кто переживёт эту ночь, того она признает достойным.',
      'Every six weeks the moon above the Legion turns crimson. Erzsébet, the Scarlet Moon, rises from the crypts — and the huntress Selene stalks the streets after her. Whoever survives the night earns her respect.',
    ),
    element: 'dark',
    hero: 'selene',
    boss: 'fest_erzsebet',
    trialBoss: 'fest_selene',
    acts: [5, 9, 10],
    chapters: [L('Проклятый город', 'Cursed City'), L('Лунный некрополь', 'Lunar Necropolis'), L('Алый трон', 'Scarlet Throne')],
    colors: { bg: ['#1a0610', '#6a0e24'], accent: '#ff5a6a', glow: '#ff3a4a' },
    particle: 'moon',
    finalSkin: 'selene_moon',
    shopSkins: ['lilith_moon', 'velvet_moon'],
  },
  {
    id: 'tides',
    name: L('Праздник Приливов', 'Tide Festival'),
    tagline: L('Море выходит на берег — и приводит с собой свою царицу', 'The sea comes ashore — and brings its queen along'),
    lore: L(
      'В дни большого прилива на берег выходит Амфитрита, Владычица Приливов, — выбрать себе чемпиона. Но вместе с ней из глубин поднимается Сцилла, и праздник превращается в битву.',
      'In the days of the great tide Amphitrite, Sovereign of the Tides, walks ashore to choose a champion. But Scylla rises from the depths with her, and the festival turns into a battle.',
    ),
    element: 'water',
    hero: 'amphitrite',
    boss: 'fest_scylla',
    trialBoss: 'fest_amphitrite',
    acts: [4, 3, 4],
    chapters: [L('Коралловый берег', 'Coral Shore'), L('Ледяные течения', 'Frozen Currents'), L('Дворец пучины', 'Palace of the Deep')],
    colors: { bg: ['#061a2a', '#0e5a7a'], accent: '#6ff0e0', glow: '#3ad0f0' },
    particle: 'bubble',
    finalSkin: 'amphitrite_pearl',
    shopSkins: ['aurora_tide', 'skadi_tide'],
  },
  {
    id: 'sakura',
    name: L('Цветение Сакуры', 'Sakura Bloom'),
    tagline: L('Лепестки падают, клинки поют', 'Petals fall, blades sing'),
    lore: L(
      'Весной у подножия гор зацветает сакура, и в Легион приходит странствующая мечница Цубаки. Но лепестки будят и Акане, Они-химэ, — а её праздник всегда заканчивается дракой.',
      'In spring the sakura blooms at the foot of the mountains, and the wandering swordswoman Tsubaki comes to the Legion. But the petals also wake Akane, the Oni Princess — and her festivals always end in a brawl.',
    ),
    element: 'nature',
    hero: 'tsubaki',
    boss: 'fest_akane',
    trialBoss: 'fest_tsubaki',
    acts: [1, 7, 1],
    chapters: [L('Цветущая опушка', 'Blooming Glade'), L('Небесный сад', 'Sky Garden'), L('Роща Они', 'Oni Grove')],
    colors: { bg: ['#1e0e1a', '#8a3a5a'], accent: '#ffb4d4', glow: '#ff8ac0' },
    particle: 'petal',
    finalSkin: 'tsubaki_storm',
    shopSkins: ['sylvana_sakura', 'isolde_sakura'],
  },
];
export const FESTIVAL_MAP: Record<FestivalId, FestivalDef> = Object.fromEntries(FESTIVALS.map((f) => [f.id, f])) as Record<FestivalId, FestivalDef>;

const DAY = 86400000;
/** Длительность праздника, дней. */
export const FESTIVAL_DAYS = 14;
/** Начало первого праздника (Кровавая Луна) — 26 сентября 2026, UTC. */
export const FESTIVAL_EPOCH = Date.UTC(2026, 8, 26);

/** Номер праздника (цикла) на момент now. */
export function festivalCycle(now: number): number {
  return Math.floor((now - FESTIVAL_EPOCH) / (FESTIVAL_DAYS * DAY));
}

/** Текущий праздник: описание, номер цикла, начало и конец. */
export function festivalAt(now: number): { def: FestivalDef; cycle: number; start: number; end: number } {
  const cycle = festivalCycle(now);
  const n = FESTIVALS.length;
  const def = FESTIVALS[((cycle % n) + n) % n];
  const start = FESTIVAL_EPOCH + cycle * FESTIVAL_DAYS * DAY;
  return { def, cycle, start, end: start + FESTIVAL_DAYS * DAY };
}

// ——— Путь праздника ———

/** 18 этапов в трёх главах; 6, 12 — стражи глав, 18 — испытание героини праздника. */
export const FEST_STAGES = 18;
export const FEST_CHAPTER = 6;

/** Уровень силы врагов этапа: от «чуть ниже фарма» до далеко за ним — последним этапам нужен рост за праздник. */
export function festStageLevel(base: number, stage: number): number {
  // испытание героини праздника — босс актового уровня силы, поэтому сам этап чуть ниже соседних
  if (stage === FEST_STAGES) return Math.max(1, base + 2);
  return Math.max(1, base - 5 + Math.round(stage * 0.85));
}

/**
 * Условия этапов (модификаторы Башни); у стражей глав — без условий.
 * На этапах с элитой (3, 9, 15) — только «мягкие» условия, чтобы не было стены из элиты со «стеклянными пушками».
 */
const FEST_MOD_SEQ = ['storm', 'giants', 'blessing', 'ironclad', 'frenzy', '', 'glass', 'giants', 'storm', 'ironclad', 'frenzy', '', 'blessing', 'glass', 'storm', 'giants', 'frenzy', ''];
export function festStageMod(festIdx: number, stage: number): TowerMod | null {
  if (stage % FEST_CHAPTER === 0) return null;
  void festIdx;
  return TOWER_MODS.find((m) => m.id === FEST_MOD_SEQ[stage - 1]) ?? null;
}

/** Звёзды за победу: все живы — 3, пала одна — 2, иначе — 1. */
export function festStars(fallen: number): number {
  return fallen === 0 ? 3 : fallen === 1 ? 2 : 1;
}

/** Награда за первое прохождение этапа. */
export function festFirstReward(stage: number): { tokens: number; points: number; shards: number } {
  const chapter = Math.ceil(stage / FEST_CHAPTER);
  return {
    tokens: 60 + stage * 8,
    points: 30 + chapter * 15,
    shards: stage === FEST_STAGES ? 20 : stage % FEST_CHAPTER === 0 ? 5 : 0,
  };
}
/** Очки за каждую новую звезду этапа. */
export const FEST_STAR_POINTS = 15;
/** Повторный бой (рейд) пройденного этапа: билет → жетоны и немного очков. */
export function festRaidReward(stage: number): { tokens: number; points: number } {
  return { tokens: 30 + stage * 4, points: 12 };
}
/** Билеты рейдов на день (не копятся). */
export const FEST_TICKETS = 5;

// ——— Босс праздника ———

/** Попыток в день. */
export const FEST_BOSS_ATTEMPTS = 3;
/** Запас HP босса относительно обычного босса того же уровня; растёт с каждым уровнем. */
export const FEST_BOSS_HP = 2;
export const FEST_BOSS_HP_GROWTH = 0.3;
export function festBossLevel(base: number, lvl: number): number {
  return base + (lvl - 1) * 2;
}
/** Очки и жетоны за бой с боссом: база + доля снятого HP; за победу над уровнем — сундук. */
export function festBossReward(share: number, killed: boolean): { tokens: number; points: number; shards: number; crystals: number } {
  const k = Math.max(0, Math.min(1, share));
  return {
    tokens: 25 + Math.round(90 * k) + (killed ? 250 : 0),
    points: 25 + Math.round(160 * k) + (killed ? 120 : 0),
    shards: killed ? 10 : 0,
    crystals: killed ? 60 : 0,
  };
}

// ——— Задания и цели ———

export interface FestTaskDef {
  id: string;
  name: L10n;
  /** счётчик дня (s.quests.daily) */
  counter: string;
  target: number;
}

/** Пул ежедневных заданий: каждый день — одно задание праздника и три общих. */
export const FEST_TASKS_FEST: FestTaskDef[] = [
  { id: 'ft_raid', name: L('Провести 3 рейда на пути', 'Run 3 trail raids'), counter: 'festRaid', target: 3 },
  { id: 'ft_boss', name: L('Сразиться с боссом праздника 2 раза', 'Fight the festival boss 2 times'), counter: 'festBoss', target: 2 },
  { id: 'ft_fight', name: L('Победить в 3 боях пути', 'Win 3 trail battles'), counter: 'festWin', target: 3 },
];
export const FEST_TASKS_COMMON: FestTaskDef[] = [
  { id: 'fc_boss', name: L('Победить 3 боссов кампании', 'Defeat 3 campaign bosses'), counter: 'bossWin', target: 3 },
  { id: 'fc_kills', name: L('Одолеть 150 врагов', 'Defeat 150 enemies'), counter: 'kills', target: 150 },
  { id: 'fc_dungeon', name: L('Пройти подземелье 2 раза', 'Clear dungeons 2 times'), counter: 'dungeon', target: 2 },
  { id: 'fc_enhance', name: L('Заточить предметы 5 раз', 'Enhance items 5 times'), counter: 'enhance', target: 5 },
  { id: 'fc_level', name: L('Повысить уровень героинь 5 раз', 'Level up heroines 5 times'), counter: 'heroLevel', target: 5 },
  { id: 'fc_chest', name: L('Собрать сундук 3 раза', 'Collect the chest 3 times'), counter: 'chestCollect', target: 3 },
  { id: 'fc_smelt', name: L('Переплавить 10 предметов', 'Smelt 10 items'), counter: 'smelt', target: 10 },
  { id: 'fc_care', name: L('Позаботиться о героинях 3 раза', 'Care for heroines 3 times'), counter: 'bondCare', target: 3 },
  { id: 'fc_summon', name: L('Призвать 2 героини', 'Summon 2 heroines'), counter: 'summon', target: 2 },
  { id: 'fc_exped', name: L('Завершить 2 экспедиции', 'Complete 2 expeditions'), counter: 'expedition', target: 2 },
];
export const FEST_TASK_MAP: Record<string, FestTaskDef> = Object.fromEntries([...FEST_TASKS_FEST, ...FEST_TASKS_COMMON].map((t) => [t.id, t]));
/** Награда за задание дня. */
export const FEST_TASK_REWARD = { tokens: 60, points: 45 };

/** Задания дня: детерминированно от дня и праздника. */
export function festDailyTasks(day: string, cycle: number): string[] {
  let h = cycle * 7919;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [FEST_TASKS_FEST[h % FEST_TASKS_FEST.length].id];
  const pool = FEST_TASKS_COMMON.map((t) => t.id);
  while (out.length < 4) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = pool.splice((h >>> 8) % pool.length, 1)[0];
    out.push(id);
  }
  return out;
}

export type FestGoalMetric = 'stars' | 'kills' | 'tasks' | 'bossWin' | 'hordeWave' | 'summon' | 'towerWin' | 'dungeon';
export interface FestGoalDef {
  id: string;
  name: L10n;
  metric: FestGoalMetric;
  target: number;
  points: number;
  cur: Partial<Record<Currency, number>>;
}

/** Цели на весь праздник. Общие счётчики считаются с начала праздника. */
export const FEST_GOALS: FestGoalDef[] = [
  { id: 'fg_stars1', name: L('Собрать 18 звёзд пути', 'Earn 18 trail stars'), metric: 'stars', target: 18, points: 100, cur: { crystals: 50 } },
  { id: 'fg_stars2', name: L('Собрать 36 звёзд пути', 'Earn 36 trail stars'), metric: 'stars', target: 36, points: 150, cur: { crystals: 80 } },
  { id: 'fg_stars3', name: L('Собрать все 54 звезды', 'Earn all 54 stars'), metric: 'stars', target: 54, points: 250, cur: { crystals: 150, scrolls: 2 } },
  { id: 'fg_kill1', name: L('Одолеть босса праздника', 'Defeat the festival boss'), metric: 'kills', target: 1, points: 100, cur: { crystals: 60 } },
  { id: 'fg_kill3', name: L('Одолеть босса праздника 3 раза', 'Defeat the festival boss 3 times'), metric: 'kills', target: 3, points: 200, cur: { crystals: 120 } },
  { id: 'fg_kill6', name: L('Одолеть босса праздника 6 раз', 'Defeat the festival boss 6 times'), metric: 'kills', target: 6, points: 300, cur: { crystals: 200, scrolls: 2 } },
  { id: 'fg_task10', name: L('Выполнить 10 заданий праздника', 'Complete 10 festival tasks'), metric: 'tasks', target: 10, points: 120, cur: { starDust: 60 } },
  { id: 'fg_task30', name: L('Выполнить 30 заданий праздника', 'Complete 30 festival tasks'), metric: 'tasks', target: 30, points: 200, cur: { scrolls: 2 } },
  { id: 'fg_task50', name: L('Выполнить 50 заданий праздника', 'Complete 50 festival tasks'), metric: 'tasks', target: 50, points: 300, cur: { crystals: 200 } },
  { id: 'fg_boss', name: L('Победить 40 боссов кампании', 'Defeat 40 campaign bosses'), metric: 'bossWin', target: 40, points: 150, cur: { dust: 400 } },
  { id: 'fg_horde', name: L('Пройти 40 волн Нашествия', 'Clear 40 Horde waves'), metric: 'hordeWave', target: 40, points: 150, cur: { crystals: 80 } },
  { id: 'fg_summon', name: L('Призвать 20 героинь', 'Summon 20 heroines'), metric: 'summon', target: 20, points: 150, cur: { starDust: 80 } },
  { id: 'fg_tower', name: L('Покорить 10 этажей Башни', 'Conquer 10 Tower floors'), metric: 'towerWin', target: 10, points: 120, cur: { crystals: 60 } },
  { id: 'fg_dungeon', name: L('Пройти 20 подземелий', 'Clear 20 dungeons'), metric: 'dungeon', target: 20, points: 120, cur: { forgeMats: 20 } },
];
export const FEST_GOAL_MAP: Record<string, FestGoalDef> = Object.fromEntries(FEST_GOALS.map((g) => [g.id, g]));

// ——— Шкала наград ———

export interface FestMilestone {
  at: number;
  cur?: Partial<Record<Currency, number>>;
  /** осколки героини праздника */
  shards?: number;
  item?: 'legendary' | 'mythic';
  heart?: boolean;
  /** облик героини праздника (финал шкалы) */
  skin?: boolean;
}

/** 25 ступеней: до финального облика нужно пройти праздник почти целиком. */
export const FEST_MILESTONES: FestMilestone[] = [
  { at: 100, cur: { eventTokens: 100, gold: 60 } },
  { at: 250, cur: { crystals: 50 } },
  { at: 400, shards: 10 },
  { at: 600, cur: { scrolls: 1, dust: 200 } },
  { at: 800, cur: { eventTokens: 200 } },
  { at: 1000, item: 'legendary' },
  { at: 1250, shards: 10 },
  { at: 1500, cur: { crystals: 100, starDust: 50 } },
  { at: 1800, heart: true },
  { at: 2100, cur: { scrolls: 2 } },
  { at: 2400, shards: 10 },
  { at: 2700, cur: { eventTokens: 300 } },
  { at: 3000, item: 'legendary', cur: { forgeMats: 20 } },
  { at: 3350, cur: { crystals: 150 } },
  { at: 3700, shards: 15 },
  { at: 4050, cur: { scrolls: 2, starDust: 80 } },
  { at: 4400, heart: true },
  { at: 4750, cur: { eventTokens: 400 } },
  { at: 5100, shards: 15 },
  { at: 5450, item: 'mythic' },
  { at: 5800, cur: { crystals: 250 } },
  { at: 6150, cur: { scrolls: 3 } },
  { at: 6500, shards: 20 },
  { at: 6850, cur: { crystals: 300, eventTokens: 500 } },
  { at: 7200, skin: true, cur: { crystals: 200 } },
];

// ——— Облики праздников ———

type FestSkin = [id: string, hero: string, ru: string, en: string, look: SkinDef['look']];
const FEST_SKINS: FestSkin[] = [
  ['selene_moon', 'selene', 'Алая королева бала', 'Scarlet Ball Queen', { wear: 'regalia', outfit: '#8A0E1E', trim: '#F2D46B', acc: 'crown', accColor: '#F2D46B' }],
  ['lilith_moon', 'lilith', 'Бал Кровавой Луны', 'Blood Moon Ball', { wear: 'gown', outfit: '#6A0E1E', trim: '#F2D46B', acc: 'veil', accColor: '#2A0A10' }],
  ['velvet_moon', 'velvet', 'Лунная вдова', 'Moon Widow', { wear: 'lace3', outfit: '#1E0A14', trim: '#E03A4A', acc: 'mask', accColor: '#1E0A14' }],
  ['amphitrite_pearl', 'amphitrite', 'Жемчужная царица', 'Pearl Queen', { wear: 'swim3', outfit: '#F2F0E6', trim: '#6FD0E0', acc: 'tiara', accColor: '#F2F0E6', extra: 'fishTail' }],
  ['aurora_tide', 'aurora', 'Бриз на закате', 'Sunset Breeze', { wear: 'dancer', outfit: '#F08A5A', trim: '#FFE8A0', acc: 'flower', accColor: '#F08A5A' }],
  ['skadi_tide', 'skadi', 'Северное море', 'Northern Sea', { wear: 'swim3', outfit: '#1E3A5A', trim: '#E6F6FF', acc: 'tiara', accColor: '#E6F6FF' }],
  ['tsubaki_storm', 'tsubaki', 'Цветущая буря', 'Blooming Storm', { wear: 'silk', outfit: '#C0306A', trim: '#F4B8CC', acc: 'bow', accColor: '#F4B8CC', hair: '#FFE0F0' }],
  ['sylvana_sakura', 'sylvana', 'Весенний дух', 'Spring Spirit', { wear: 'dancer', outfit: '#F4B8CC', trim: '#2F8A34', acc: 'flower', accColor: '#F4B8CC' }],
  ['isolde_sakura', 'isolde', 'Снег сакуры', 'Sakura Snow', { wear: 'yukata', outfit: '#F2E6F0', trim: '#C0306A', acc: 'bow', accColor: '#C0306A' }],
];
for (const [id, hero, ru, en, look] of FEST_SKINS) {
  const skin: SkinDef = { id, hero, name: { ru, en }, look, source: 'event' };
  SKINS.push(skin);
  SKIN_MAP[id] = skin;
}

// ——— Лавка праздника ———

export interface FestOfferDef {
  id: string;
  name: L10n;
  cost: number;
  limit: number;
  give: { cur?: Partial<Record<Currency, number>>; shards?: number; skin?: string; item?: 'legendary' | 'mythic'; heart?: boolean };
}

/** Лавка текущего праздника (жетоны ивента). Лимиты — на праздник. */
export function festShop(def: FestivalDef): FestOfferDef[] {
  const hero = HEROINE_MAP[def.hero].name;
  return [
    { id: 'fs_shards', name: L(`10 осколков: ${hero.ru}`, `10 shards: ${hero.en}`), cost: 700, limit: 5, give: { shards: 10 } },
    ...def.shopSkins.map((sk) => ({ id: `fs_${sk}`, name: L(`Облик «${SKIN_MAP[sk].name.ru}»`, `Skin "${SKIN_MAP[sk].name.en}"`), cost: 2600, limit: 1, give: { skin: sk } })),
    { id: 'fs_heart', name: L('Сердце Эфира', 'Aether Heart'), cost: 900, limit: 2, give: { heart: true } },
    { id: 'fs_mythic', name: L('Мифический предмет', 'Mythic item'), cost: 2200, limit: 1, give: { item: 'mythic' } },
    { id: 'fs_legend', name: L('Легендарный предмет', 'Legendary item'), cost: 600, limit: 3, give: { item: 'legendary' } },
    { id: 'fs_scroll', name: L('Свиток призыва', 'Summon scroll'), cost: 220, limit: 10, give: { cur: { scrolls: 1 } } },
    { id: 'fs_crystals', name: L('Кристаллы ×100', 'Crystals ×100'), cost: 300, limit: 5, give: { cur: { crystals: 100 } } },
    { id: 'fs_stardust', name: L('Звёздная пыль ×80', 'Star dust ×80'), cost: 150, limit: 5, give: { cur: { starDust: 80 } } },
    { id: 'fs_forge', name: L('Материалы кузницы ×15', 'Forge materials ×15'), cost: 150, limit: 5, give: { cur: { forgeMats: 15 } } },
  ];
}

// ——— Враги праздников ———

/** Умения боссов праздников. */
export const FESTIVAL_SKILLS: SkillDef[] = [
  { id: 'fest.moonKiss', cls: 'enemy', kind: 'active', name: L('Поцелуй луны', 'Moon Kiss'), target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 1.6, lifesteal: 0.5 }, { t: 'debuff', stat: 'healRecv', value: -0.4, turns: 2 }], vfx: 'dark' },
  { id: 'fest.whirlpool', cls: 'enemy', kind: 'active', name: L('Водоворот', 'Whirlpool'), target: 'enemyAll', cd: 4, effects: [{ t: 'dmg', mult: 0.9 }, { t: 'debuff', stat: 'spd', value: -20, turns: 2 }, { t: 'cc', cc: 'stun', chance: 0.15, turns: 1 }], vfx: 'ice' },
  { id: 'fest.petalStorm', cls: 'enemy', kind: 'active', name: L('Буря лепестков', 'Petal Storm'), target: 'enemyRandom', cd: 3, effects: [{ t: 'dmg', mult: 0.55, hits: 5 }, { t: 'dot', dot: 'bleed', mult: 0.25, turns: 2 }], vfx: 'poison' },
  { id: 'fest.silverVolley', cls: 'enemy', kind: 'active', name: L('Серебряный залп', 'Silver Volley'), target: 'enemyRandom', cd: 3, effects: [{ t: 'dmg', mult: 0.7, hits: 4 }], vfx: 'arrow' },
  { id: 'fest.trident', cls: 'enemy', kind: 'active', name: L('Удар трезубца', 'Trident Strike'), target: 'enemyFront', cd: 3, effects: [{ t: 'dmg', mult: 1.4 }, { t: 'cc', cc: 'freeze', chance: 0.3, turns: 1 }], vfx: 'ice' },
  { id: 'fest.iai', cls: 'enemy', kind: 'active', name: L('Иайдо', 'Iaido'), target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 2.1 }, { t: 'dot', dot: 'bleed', mult: 0.4, turns: 2 }], vfx: 'slash' },
];

const FL = (hair: string, style: EnemyDef['look']['style'], skin: string, eyes: string, outfit: string, trim: string, acc: EnemyDef['look']['acc'], accColor: string, extra: EnemyDef['look']['extra'], wear?: EnemyDef['look']['wear']): EnemyDef['look'] => ({
  hair,
  style,
  skin,
  eyes,
  outfit,
  trim,
  acc,
  accColor,
  extra,
  wear,
});

/** Боссы-колоссы праздников и испытания героинь (внешность — как у играбельной версии). */
export const FESTIVAL_ENEMIES: EnemyDef[] = [
  {
    id: 'fest_erzsebet',
    act: 5,
    name: L('Эржебет, Алая Луна', 'Erzsébet, the Scarlet Moon'),
    title: L('Королева Кровавой Луны', 'Queen of the Blood Moon'),
    role: 'brute',
    element: 'dark',
    kind: 'boss',
    colossus: true,
    mechanic: 'bloodThirst',
    skills: ['enemy.brute', 'fest.moonKiss', 'boss.ultDark'],
    look: FL('#1E0A14', 'long', '#E8DCE8', '#FF3A4A', '#3A0A14', '#E03A4A', 'crown', '#E03A4A', 'darkWings', 'gown'),
  },
  {
    id: 'fest_scylla',
    act: 4,
    name: L('Сцилла, Пучина', 'Scylla of the Deep'),
    title: L('Царица водоворотов', 'Queen of Whirlpools'),
    role: 'caster',
    element: 'water',
    kind: 'boss',
    colossus: true,
    mechanic: 'tideShield',
    skills: ['enemy.caster', 'fest.whirlpool', 'boss.ultWater'],
    look: FL('#3A2A6A', 'wild', '#9FC4E0', '#7AF0FF', '#1E2A5A', '#6FD0E0', 'horns', '#1E2A5A', 'fishTail', 'swim4'),
  },
  {
    id: 'fest_akane',
    act: 1,
    name: L('Акане, Они-химэ', 'Akane, the Oni Princess'),
    title: L('Принцесса демонов', 'Princess of Demons'),
    role: 'brute',
    element: 'nature',
    kind: 'boss',
    colossus: true,
    mechanic: 'vines',
    skills: ['enemy.brute', 'fest.petalStorm', 'boss.ultNature'],
    look: FL('#E03A5A', 'wild', '#F4D3B8', '#FFD24A', '#8A1E3A', '#F4B8CC', 'horns', '#F2E6D8', 'none', 'yukata'),
  },
  { id: 'fest_selene', act: 9, hero: 'selene', name: L('Селена', 'Selene'), title: L('Охотница Кровавой Луны', 'Huntress of the Blood Moon'), role: 'ranged', element: 'dark', kind: 'boss', mechanic: 'skyborne', skills: ['fest.silverVolley', 'boss.soulRend', 'boss.ultDark'], look: null as unknown as EnemyDef['look'] },
  { id: 'fest_amphitrite', act: 4, hero: 'amphitrite', name: L('Амфитрита', 'Amphitrite'), title: L('Владычица Приливов', 'Sovereign of the Tides'), role: 'tank', element: 'water', kind: 'boss', mechanic: 'freeze', skills: ['fest.trident', 'boss.tidalWave', 'boss.ultWater'], look: null as unknown as EnemyDef['look'] },
  { id: 'fest_tsubaki', act: 1, hero: 'tsubaki', name: L('Цубаки', 'Tsubaki'), title: L('Клинок Сакуры', 'Blade of the Sakura'), role: 'rogue', element: 'nature', kind: 'boss', mechanic: 'phases', skills: ['fest.iai', 'fest.petalStorm', 'boss.ultNature'], look: null as unknown as EnemyDef['look'] },
];
for (const e of FESTIVAL_ENEMIES) {
  if (e.hero) e.look = HEROINE_MAP[e.hero].look;
  ENEMY_MAP[e.id] = e;
}
