import type { Currency, Element, L10n } from '../types';
import { ENEMY_MAP, type EnemyDef } from './acts';
import type { SkillDef } from './classes';
import { SKINS, SKIN_MAP, type SkinDef } from './heroines';
import { TOWER_MODS, type TowerMod } from './modes';

/**
 * Праздники Легиона — большой ивент, который идёт всегда, но каждые две недели сменяется:
 * Кровавая Луна → Самоцветные копи → Праздник Приливов → Солнечный курорт → Цветение Сакуры → снова Луна…
 * У каждого праздника — героиня-покровительница из Легиона (она на баннере), свой босс-колосс или
 * своя механика, ежедневные задания, цели, шкала наград и лавка. Эмблемы праздника идут на ранги героинь.
 */
export type FestivalId = 'bloodmoon' | 'mine' | 'tides' | 'resort' | 'sakura';
/**
 * Вид праздника — у каждого своя главная механика:
 * trail — путь из 18 этапов и босс-колосс; mine — исследование копей в тумане за кирки;
 * volley — пляжный волейбол парами на тайминг.
 */
export type FestivalKind = 'trail' | 'mine' | 'volley';

export interface FestivalDef {
  id: FestivalId;
  kind: FestivalKind;
  name: L10n;
  tagline: L10n;
  lore: L10n;
  element: Element;
  /** героиня Легиона — покровительница праздника (на баннере и в анонсе) */
  hero: string;
  /** путь и босс (вид trail) */
  trail?: {
    /** босс праздника — колосс с огромным запасом HP, набирает уровни */
    boss: string;
    /** финальный враг пути — противница-испытание */
    trialBoss: string;
    /** акты, откуда приходят враги трёх глав пути */
    acts: [number, number, number];
    chapters: [L10n, L10n, L10n];
  };
  /** копи (вид mine): акты, откуда приходят чудовища этажей */
  mine?: { acts: number[] };
  /** цвета оформления: фон, акцент, свечение */
  colors: { bg: [string, string]; accent: string; glow: string };
  /** частицы на баннере */
  particle: 'moon' | 'bubble' | 'petal' | 'spark' | 'dust' | 'sun';
  /** облик — финальная награда шкалы (появится вместе с обликами героинь) */
  finalSkin?: string;
  /** облики в лавке праздника */
  shopSkins: string[];
}

const L = (ru: string, en: string): L10n => ({ ru, en });

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'bloodmoon',
    kind: 'trail',
    name: L('Кровавая Луна', 'Blood Moon'),
    tagline: L('Ночь, когда луна алеет и просыпаются древние охотницы', 'The night the moon turns red and ancient huntresses wake'),
    lore: L(
      'Раз в шесть недель луна над Легионом наливается алым. Из склепов выходит Эржебет, Алая Луна, а следом по городу идёт её охотница Селена. Кейра знает их повадки лучше всех — она и поведёт Легион сквозь эту ночь.',
      'Every six weeks the moon above the Legion turns crimson. Erzsébet, the Scarlet Moon, rises from the crypts, and her huntress Selene stalks the streets after her. Keira knows their ways better than anyone — she will lead the Legion through the night.',
    ),
    element: 'dark',
    hero: 'keira',
    trail: {
      boss: 'fest_erzsebet',
      trialBoss: 'fest_selene',
      acts: [5, 9, 10],
      chapters: [L('Проклятый город', 'Cursed City'), L('Лунный некрополь', 'Lunar Necropolis'), L('Алый трон', 'Scarlet Throne')],
    },
    colors: { bg: ['#1a0610', '#6a0e24'], accent: '#ff5a6a', glow: '#ff3a4a' },
    particle: 'moon',
    shopSkins: [],
  },
  {
    id: 'resort',
    kind: 'volley',
    name: L('Солнечный курорт', 'Sun Resort'),
    tagline: L('Жаркое солнце, лагуна и пляжный волейбол', 'Hot sun, a lagoon and beach volleyball'),
    lore: L(
      'Легион пригласили на тропический остров. Здесь устраивают турнир по пляжному волейболу: восемь пар соперниц, песок и солнце. Мирабель надеялась отдохнуть, но уже записала всех в команду.',
      'The Legion is invited to a tropical island with a beach volleyball tournament: eight rival pairs, sand and sun. Mirabel hoped to rest, but has already signed everyone up.',
    ),
    element: 'light',
    hero: 'mirabel',
    colors: { bg: ['#2a1206', '#c0501e'], accent: '#ffd24a', glow: '#ff9a3a' },
    particle: 'sun',
    // летний праздник: бикини-коллекция — финал шкалы и лавка
    finalSkin: 'mirabel_summer',
    shopSkins: ['cassian_summer', 'lira_summer', 'elian_summer', 'keira_summer', 'ulfa_summer'],
  },
  {
    id: 'tides',
    kind: 'trail',
    name: L('Праздник Приливов', 'Tide Festival'),
    tagline: L('Море выходит на берег — и приводит с собой свою царицу', 'The sea comes ashore — and brings its queen along'),
    lore: L(
      'В дни большого прилива на берег выходит Амфитрита, Владычица Приливов, — испытать силу Легиона. Вместе с ней из глубин поднимается Сцилла. Ульфа привыкла к ледяной воде и встречает их первой.',
      'In the days of the great tide Amphitrite, Sovereign of the Tides, walks ashore to test the Legion. Scylla rises from the depths with her. Ulfa is used to icy water and meets them first.',
    ),
    element: 'water',
    hero: 'ulfa',
    trail: {
      boss: 'fest_scylla',
      trialBoss: 'fest_amphitrite',
      acts: [4, 3, 4],
      chapters: [L('Коралловый берег', 'Coral Shore'), L('Ледяные течения', 'Frozen Currents'), L('Дворец пучины', 'Palace of the Deep')],
    },
    colors: { bg: ['#061a2a', '#0e5a7a'], accent: '#6ff0e0', glow: '#3ad0f0' },
    particle: 'bubble',
    shopSkins: [],
  },
  {
    id: 'mine',
    kind: 'mine',
    name: L('Самоцветные копи', 'Gem Mines'),
    tagline: L('Каждый удар кирки — шаг в неизвестность', 'Every swing of the pick is a step into the unknown'),
    lore: L(
      'Под Легионом нашли древние копи: чем глубже, тем ярче камни и злее их стражи. Лира уверяет, что слышит, как в скале поёт огонь, — и первой берётся за кирку.',
      'Ancient mines were found beneath the Legion: the deeper you go, the brighter the stones and the fiercer their guardians. Lira swears she can hear fire singing in the rock — and is the first to pick up a pick.',
    ),
    element: 'fire',
    hero: 'lira',
    mine: { acts: [8, 6, 10] },
    colors: { bg: ['#0e0a14', '#3a1e4a'], accent: '#ff6a8a', glow: '#c05aff' },
    particle: 'dust',
    shopSkins: [],
  },
  {
    id: 'sakura',
    kind: 'trail',
    name: L('Цветение Сакуры', 'Sakura Bloom'),
    tagline: L('Лепестки падают, клинки поют', 'Petals fall, blades sing'),
    lore: L(
      'Весной у подножия гор зацветает сакура, и в Легион приходит странствующая мечница Цубаки — бросить вызов. Но лепестки будят и Акане, Они-химэ. Элиан знает эти рощи и ведёт отряд тропами, где их не ждут.',
      'In spring the sakura blooms at the foot of the mountains, and the wandering swordswoman Tsubaki comes to challenge the Legion. The petals also wake Akane, the Oni Princess. Elian knows these groves and leads the party by paths no one expects.',
    ),
    element: 'nature',
    hero: 'elian',
    trail: {
      boss: 'fest_akane',
      trialBoss: 'fest_tsubaki',
      acts: [1, 7, 1],
      chapters: [L('Цветущая опушка', 'Blooming Glade'), L('Небесный сад', 'Sky Garden'), L('Роща Они', 'Oni Grove')],
    },
    colors: { bg: ['#1e0e1a', '#8a3a5a'], accent: '#ffb4d4', glow: '#ff8ac0' },
    particle: 'petal',
    shopSkins: [],
  },
];
export const FESTIVAL_MAP: Record<FestivalId, FestivalDef> = Object.fromEntries(FESTIVALS.map((f) => [f.id, f])) as Record<FestivalId, FestivalDef>;

const DAY = 86400000;
/** Длительность праздника, дней. */
export const FESTIVAL_DAYS = 14;
/** Начало первого праздника (Кровавая Луна) — 26 сентября 2026, UTC. */
/** Начало ротации: 12.09.2026 — «Кровавая Луна», с 26.09 — летний «Солнечный курорт». */
export const FESTIVAL_EPOCH = Date.UTC(2026, 8, 12);

/** Номер праздника (цикла) автоматической ротации на момент now. */
export function festivalCycle(now: number): number {
  return Math.floor((now - FESTIVAL_EPOCH) / (FESTIVAL_DAYS * DAY));
}

/**
 * Расписание праздников (правится из бота, приходит в конфиге `cfg.festival`).
 * auto — вечная ротация по 14 дней; manual — только записи расписания, между ними праздника нет.
 */
export interface FestivalEntry {
  fest: FestivalId;
  start: number;
  end: number;
  /** номер праздника: по нему сбрасывается прогресс и лимиты лавки */
  cycle: number;
}
export interface FestivalSchedule {
  mode: 'auto' | 'manual';
  entries: FestivalEntry[];
  /** время последней правки: клиент по нему понимает, что расписание сменилось */
  updated: number;
  /** счётчик номеров праздников, созданных вручную (номера не пересекаются с ротацией) */
  seq?: number;
}

/** Номера праздников из бота начинаются отсюда — чтобы не совпасть с номерами ротации. */
const MANUAL_CYCLE = 1_000_000;
const KEEP_PAST = 60 * DAY;

export const AUTO_SCHEDULE: FestivalSchedule = { mode: 'auto', entries: [], updated: 0 };

/** Ручной режим; идущий сейчас праздник ротации (если есть) переносится в расписание, чтобы не прерваться. */
function toManual(sched: FestivalSchedule | null | undefined, now: number): FestivalSchedule {
  if (sched?.mode === 'manual') return { ...sched, entries: sched.entries.filter((e) => e.end > now - KEEP_PAST).map((e) => ({ ...e })) };
  const cur = autoAt(festivalCycle(now));
  return { mode: 'manual', entries: [{ fest: cur.def.id, start: cur.start, end: cur.end, cycle: cur.cycle }], updated: now, seq: sched?.seq };
}

function nextCycle(s: FestivalSchedule): number {
  s.seq = Math.max(s.seq ?? MANUAL_CYCLE, ...s.entries.map((e) => e.cycle)) + 1;
  return s.seq;
}

function running(s: FestivalSchedule, now: number): FestivalEntry | undefined {
  return s.entries.find((e) => e.start <= now && now < e.end);
}

export type ScheduleResult = { ok: true; sched: FestivalSchedule; note?: string } | { ok: false; error: 'badDates' | 'past' | 'overlap' | 'none' | 'notFound'; entry?: FestivalEntry };

/** Запустить праздник сейчас на days дней. Тот же праздник уже идёт — просто меняется дата конца (прогресс сохраняется). */
export function scheduleStart(sched: FestivalSchedule | null | undefined, fest: FestivalId, now: number, days: number): ScheduleResult {
  if (!(days > 0) || days > 120) return { ok: false, error: 'badDates' };
  const s = toManual(sched, now);
  const end = now + Math.round(days * DAY);
  const cur = running(s, now);
  let removed = 0;
  // будущие записи, которые наложились бы на новый праздник, снимаются
  s.entries = s.entries.filter((e) => {
    const drop = e !== cur && e.start >= now && e.start < end;
    if (drop) removed++;
    return !drop;
  });
  if (cur && cur.fest === fest) cur.end = end;
  else {
    if (cur) cur.end = now;
    s.entries.push({ fest, start: now, end, cycle: nextCycle(s) });
  }
  s.updated = now;
  return { ok: true, sched: s, note: removed ? `removed:${removed}` : undefined };
}

/** Остановить идущий праздник сейчас (ручной режим: дальше — только по расписанию). */
export function scheduleStop(sched: FestivalSchedule | null | undefined, now: number): ScheduleResult {
  const s = toManual(sched, now);
  const cur = running(s, now);
  if (!cur) return { ok: false, error: 'none' };
  cur.end = now;
  s.updated = now;
  return { ok: true, sched: s };
}

/** Запланировать праздник на даты (без наложений на другие записи). */
export function schedulePlan(sched: FestivalSchedule | null | undefined, fest: FestivalId, start: number, end: number, now: number): ScheduleResult {
  if (!(end > start) || end - start > 120 * DAY) return { ok: false, error: 'badDates' };
  if (end <= now) return { ok: false, error: 'past' };
  const s = toManual(sched, now);
  const clash = s.entries.find((e) => e.end > now && start < e.end && e.start < end);
  if (clash) return { ok: false, error: 'overlap', entry: clash };
  s.entries.push({ fest, start: Math.max(start, now), end, cycle: nextCycle(s) });
  s.entries.sort((a, b) => a.start - b.start);
  s.updated = now;
  return { ok: true, sched: s };
}

/** Новая дата конца идущего праздника. */
export function scheduleSetEnd(sched: FestivalSchedule | null | undefined, end: number, now: number): ScheduleResult {
  const s = toManual(sched, now);
  const cur = running(s, now);
  if (!cur) return { ok: false, error: 'none' };
  if (end <= now) return { ok: false, error: 'past' };
  const clash = s.entries.find((e) => e !== cur && e.start < end && e.start >= cur.start);
  if (clash) return { ok: false, error: 'overlap', entry: clash };
  cur.end = end;
  s.updated = now;
  return { ok: true, sched: s };
}

/** Убрать запись расписания по номеру из списка ближайших (1 — первая). Идущий праздник при этом останавливается. */
export function scheduleRemove(sched: FestivalSchedule | null | undefined, index: number, now: number): ScheduleResult {
  const s = toManual(sched, now);
  const list = s.entries.filter((e) => e.end > now).sort((a, b) => a.start - b.start);
  const e = list[index - 1];
  if (!e) return { ok: false, error: 'notFound' };
  if (e.start <= now) e.end = now;
  else s.entries = s.entries.filter((x) => x !== e);
  s.updated = now;
  return { ok: true, sched: s };
}

/** Вернуть автоматическую ротацию. */
export function scheduleAuto(sched: FestivalSchedule | null | undefined, now: number): FestivalSchedule {
  return { mode: 'auto', entries: [], updated: now, seq: sched?.seq };
}

export interface FestivalNow {
  def: FestivalDef;
  cycle: number;
  start: number;
  end: number;
}

function autoAt(cycle: number): FestivalNow {
  const n = FESTIVALS.length;
  const start = FESTIVAL_EPOCH + cycle * FESTIVAL_DAYS * DAY;
  return { def: FESTIVALS[((cycle % n) + n) % n], cycle, start, end: start + FESTIVAL_DAYS * DAY };
}

/** Текущий праздник или null, если по расписанию праздника сейчас нет. */
export function festivalAt(now: number, sched?: FestivalSchedule | null): FestivalNow | null {
  if (sched?.mode === 'manual') {
    const e = sched.entries.find((x) => x.start <= now && now < x.end && FESTIVAL_MAP[x.fest]);
    return e ? { def: FESTIVAL_MAP[e.fest], cycle: e.cycle, start: e.start, end: e.end } : null;
  }
  return autoAt(festivalCycle(now));
}

/** Ближайшие праздники (идущий сейчас — первым). */
export function festivalUpcoming(now: number, sched?: FestivalSchedule | null, count = 3): FestivalNow[] {
  if (sched?.mode === 'manual') {
    return sched.entries
      .filter((x) => x.end > now && FESTIVAL_MAP[x.fest])
      .sort((a, b) => a.start - b.start)
      .slice(0, count)
      .map((e) => ({ def: FESTIVAL_MAP[e.fest], cycle: e.cycle, start: e.start, end: e.end }));
  }
  const c = festivalCycle(now);
  return Array.from({ length: count }, (_, k) => autoAt(c + k));
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
export function festFirstReward(stage: number): { tokens: number; points: number; emblems: number } {
  const chapter = Math.ceil(stage / FEST_CHAPTER);
  return {
    tokens: 60 + stage * 8,
    points: 30 + chapter * 15,
    emblems: stage === FEST_STAGES ? 20 : stage % FEST_CHAPTER === 0 ? 5 : 0,
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
export const FEST_BOSS_HP = 30;
export const FEST_BOSS_HP_GROWTH = 0.3;
export function festBossLevel(base: number, lvl: number): number {
  return base + (lvl - 1) * 2;
}
/** Очки и жетоны за бой с боссом: база + доля снятого HP; за победу над уровнем — сундук. */
export function festBossReward(share: number, killed: boolean): { tokens: number; points: number; emblems: number; crystals: number } {
  const k = Math.max(0, Math.min(1, share));
  return {
    tokens: 25 + Math.round(90 * k) + (killed ? 250 : 0),
    points: 25 + Math.round(160 * k) + (killed ? 120 : 0),
    emblems: killed ? 8 : 0,
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

/** Пул ежедневных заданий: каждый день — одно задание своего вида праздника и три общих. */
export const FEST_TASKS_KIND: Record<FestivalKind, FestTaskDef[]> = {
  trail: [
    { id: 'ft_raid', name: L('Провести 3 рейда на пути', 'Run 3 trail raids'), counter: 'festRaid', target: 3 },
    { id: 'ft_boss', name: L('Сразиться с боссом праздника 2 раза', 'Fight the festival boss 2 times'), counter: 'festBoss', target: 2 },
    { id: 'ft_fight', name: L('Победить в 3 боях пути', 'Win 3 trail battles'), counter: 'festWin', target: 3 },
  ],
  mine: [
    { id: 'ft_mdig', name: L('Сделать 15 шагов в копях', 'Take 15 steps in the mines'), counter: 'mineStep', target: 15 },
    { id: 'ft_mchest', name: L('Открыть сундук в копях', 'Open a chest in the mines'), counter: 'mineChest', target: 1 },
    { id: 'ft_mfight', name: L('Победить 2 чудовищ в копях', 'Defeat 2 mine monsters'), counter: 'mineWin', target: 2 },
  ],
  volley: [
    { id: 'ft_vplay', name: L('Сыграть 3 матча на пляже', 'Play 3 beach matches'), counter: 'volMatch', target: 3 },
    { id: 'ft_vwin', name: L('Выиграть 2 матча', 'Win 2 matches'), counter: 'volWin', target: 2 },
    { id: 'ft_vspike', name: L('Забить 8 очков ударом', 'Score 8 points with spikes'), counter: 'volSpike', target: 8 },
  ],
};
/** Задания пути — для совместимости со старыми ссылками. */
export const FEST_TASKS_FEST: FestTaskDef[] = FEST_TASKS_KIND.trail;
export const FEST_TASKS_COMMON: FestTaskDef[] = [
  { id: 'fc_boss', name: L('Победить 3 стражей похода', 'Defeat 3 march guardians'), counter: 'bossWin', target: 3 },
  { id: 'fc_kills', name: L('Одолеть 150 врагов', 'Defeat 150 enemies'), counter: 'kills', target: 150 },
  { id: 'fc_dungeon', name: L('Пройти подземелье 2 раза', 'Clear dungeons 2 times'), counter: 'dungeon', target: 2 },
  { id: 'fc_enhance', name: L('Слить или заточить снаряжение 5 раз', 'Merge or enhance gear 5 times'), counter: 'forge', target: 5 },
  { id: 'fc_level', name: L('Повысить уровень Легиона 5 раз', 'Raise the Legion level 5 times'), counter: 'legionLevel', target: 5 },
  { id: 'fc_chest', name: L('Собрать сундук 3 раза', 'Collect the chest 3 times'), counter: 'chestCollect', target: 3 },
  { id: 'fc_ult', name: L('Выпустить 40 ульт', 'Unleash 40 ultimates'), counter: 'ult', target: 40 },
  { id: 'fc_care', name: L('Позаботиться о героях 3 раза', 'Care for heroes 3 times'), counter: 'bondCare', target: 3 },
  { id: 'fc_chain', name: L('Собрать 6 цепей Легиона', 'Build 6 Legion chains'), counter: 'chain', target: 6 },
  { id: 'fc_raid', name: L('Сразиться с Колоссом', 'Fight the Colossus'), counter: 'raid', target: 1 },
];
export const FEST_TASK_MAP: Record<string, FestTaskDef> = Object.fromEntries([...Object.values(FEST_TASKS_KIND).flat(), ...FEST_TASKS_COMMON].map((t) => [t.id, t]));
/** Награда за задание дня. */
export const FEST_TASK_REWARD = { tokens: 60, points: 45 };

/** Задания дня: детерминированно от дня и праздника. */
export function festDailyTasks(day: string, cycle: number, kind: FestivalKind = 'trail'): string[] {
  let h = cycle * 7919;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const own = FEST_TASKS_KIND[kind];
  const out = [own[h % own.length].id];
  const pool = FEST_TASKS_COMMON.map((t) => t.id);
  while (out.length < 4) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = pool.splice((h >>> 8) % pool.length, 1)[0];
    out.push(id);
  }
  return out;
}

export type FestGoalMetric =
  | 'stars'
  | 'kills'
  | 'tasks'
  | 'bossWin'
  | 'raid'
  | 'combo'
  | 'towerWin'
  | 'dungeon'
  | 'mineFloor'
  | 'mineChests'
  | 'mineSteps'
  | 'volBest'
  | 'volWins'
  | 'volBig';
export interface FestGoalDef {
  id: string;
  name: L10n;
  /** только для этого вида праздника (без поля — для всех) */
  kind?: FestivalKind;
  metric: FestGoalMetric;
  target: number;
  points: number;
  cur: Partial<Record<Currency, number>>;
}

/** Цели на весь праздник. Общие счётчики считаются с начала праздника. */
export const FEST_GOALS: FestGoalDef[] = [
  { id: 'fg_stars1', kind: 'trail', name: L('Собрать 18 звёзд пути', 'Earn 18 trail stars'), metric: 'stars', target: 18, points: 100, cur: { crystals: 50 } },
  { id: 'fg_stars2', kind: 'trail', name: L('Собрать 36 звёзд пути', 'Earn 36 trail stars'), metric: 'stars', target: 36, points: 150, cur: { crystals: 80 } },
  { id: 'fg_stars3', kind: 'trail', name: L('Собрать все 54 звезды', 'Earn all 54 stars'), metric: 'stars', target: 54, points: 250, cur: { crystals: 150, emblems: 2 } },
  { id: 'fg_kill1', kind: 'trail', name: L('Одолеть босса праздника', 'Defeat the festival boss'), metric: 'kills', target: 1, points: 100, cur: { crystals: 60 } },
  { id: 'fg_kill3', kind: 'trail', name: L('Одолеть босса праздника 3 раза', 'Defeat the festival boss 3 times'), metric: 'kills', target: 3, points: 200, cur: { crystals: 120 } },
  { id: 'fg_kill6', kind: 'trail', name: L('Одолеть босса праздника 6 раз', 'Defeat the festival boss 6 times'), metric: 'kills', target: 6, points: 300, cur: { crystals: 200, emblems: 2 } },
  { id: 'fg_mfloor5', kind: 'mine', name: L('Спуститься на 5-й этаж копей', 'Reach mine floor 5'), metric: 'mineFloor', target: 5, points: 150, cur: { crystals: 80 } },
  { id: 'fg_mfloor10', kind: 'mine', name: L('Спуститься на 10-й этаж', 'Reach floor 10'), metric: 'mineFloor', target: 10, points: 250, cur: { crystals: 150 } },
  { id: 'fg_mfloor15', kind: 'mine', name: L('Спуститься на 15-й этаж', 'Reach floor 15'), metric: 'mineFloor', target: 15, points: 300, cur: { crystals: 200, emblems: 2 } },
  { id: 'fg_mchest', kind: 'mine', name: L('Открыть 15 сундуков', 'Open 15 chests'), metric: 'mineChests', target: 15, points: 150, cur: { books: 8 } },
  { id: 'fg_msteps', kind: 'mine', name: L('Сделать 250 шагов', 'Take 250 steps'), metric: 'mineSteps', target: 250, points: 200, cur: { crystals: 120 } },
  { id: 'fg_vr4', kind: 'volley', name: L('Обыграть 4 пары лестницы', 'Beat 4 pairs of the ladder'), metric: 'volBest', target: 4, points: 150, cur: { crystals: 80 } },
  { id: 'fg_vr8', kind: 'volley', name: L('Обыграть королеву пляжа', 'Beat the queen of the beach'), metric: 'volBest', target: 8, points: 300, cur: { crystals: 200, emblems: 2 } },
  { id: 'fg_vw15', kind: 'volley', name: L('Выиграть 15 матчей', 'Win 15 matches'), metric: 'volWins', target: 15, points: 150, cur: { crystals: 80 } },
  { id: 'fg_vw40', kind: 'volley', name: L('Выиграть 40 матчей', 'Win 40 matches'), metric: 'volWins', target: 40, points: 250, cur: { crystals: 150 } },
  { id: 'fg_vbig', kind: 'volley', name: L('Разгромить соперниц 8 раз (5:0 или 5:1)', 'Crush rivals 8 times (5:0 or 5:1)'), metric: 'volBig', target: 8, points: 200, cur: { crystals: 120, emblems: 1 } },
  { id: 'fg_task10', name: L('Выполнить 10 заданий праздника', 'Complete 10 festival tasks'), metric: 'tasks', target: 10, points: 120, cur: { books: 6 } },
  { id: 'fg_task30', name: L('Выполнить 30 заданий праздника', 'Complete 30 festival tasks'), metric: 'tasks', target: 30, points: 200, cur: { emblems: 2 } },
  { id: 'fg_task50', name: L('Выполнить 50 заданий праздника', 'Complete 50 festival tasks'), metric: 'tasks', target: 50, points: 300, cur: { crystals: 200 } },
  { id: 'fg_boss', name: L('Победить 40 стражей похода', 'Defeat 40 march guardians'), metric: 'bossWin', target: 40, points: 150, cur: { steel: 200 } },
  { id: 'fg_raid', name: L('Сразиться с Колоссом 8 раз', 'Fight the Colossus 8 times'), metric: 'raid', target: 8, points: 150, cur: { crystals: 80 } },
  { id: 'fg_combo', name: L('Сыграть 30 связок в цепях', 'Land 30 chain combos'), metric: 'combo', target: 30, points: 150, cur: { books: 8 } },
  { id: 'fg_tower', name: L('Покорить 10 этажей Башни', 'Conquer 10 Tower floors'), metric: 'towerWin', target: 10, points: 120, cur: { crystals: 60 } },
  { id: 'fg_dungeon', name: L('Пройти 20 подземелий', 'Clear 20 dungeons'), metric: 'dungeon', target: 20, points: 120, cur: { steel: 150 } },
];
export const FEST_GOAL_MAP: Record<string, FestGoalDef> = Object.fromEntries(FEST_GOALS.map((g) => [g.id, g]));
/** Цели этого вида праздника: свои и общие. */
export function festGoalsFor(kind: FestivalKind): FestGoalDef[] {
  return FEST_GOALS.filter((g) => !g.kind || g.kind === kind);
}

// ——— Шкала наград ———

export interface FestMilestone {
  at: number;
  cur?: Partial<Record<Currency, number>>;
  item?: 'legendary' | 'mythic';
  heart?: boolean;
  /** облик праздника (финал шкалы), если он есть */
  skin?: boolean;
}

/** 25 ступеней: к финалу шкалы нужно пройти праздник почти целиком. Эмблемы идут на ранги героинь. */
export const FEST_MILESTONES: FestMilestone[] = [
  { at: 100, cur: { eventTokens: 100, gold: 60 } },
  { at: 250, cur: { crystals: 50 } },
  { at: 400, cur: { emblems: 10 } },
  { at: 600, cur: { emblems: 5, steel: 100 } },
  { at: 800, cur: { eventTokens: 200 } },
  { at: 1000, item: 'legendary' },
  { at: 1250, cur: { emblems: 10 } },
  { at: 1500, cur: { crystals: 100, books: 6 } },
  { at: 1800, heart: true },
  { at: 2100, cur: { emblems: 10 } },
  { at: 2400, cur: { emblems: 10 } },
  { at: 2700, cur: { eventTokens: 300 } },
  { at: 3000, item: 'legendary', cur: { steel: 150 } },
  { at: 3350, cur: { crystals: 150 } },
  { at: 3700, cur: { emblems: 15 } },
  { at: 4050, cur: { emblems: 10, books: 10 } },
  { at: 4400, heart: true },
  { at: 4750, cur: { eventTokens: 400 } },
  { at: 5100, cur: { emblems: 15 } },
  { at: 5450, item: 'mythic' },
  { at: 5800, cur: { crystals: 250 } },
  { at: 6150, cur: { emblems: 15 } },
  { at: 6500, cur: { emblems: 20 } },
  { at: 6850, cur: { crystals: 300, eventTokens: 500 } },
  { at: 7200, skin: true, cur: { crystals: 400, emblems: 30 } },
];

// ——— Облики праздников (появятся вместе с обликами героинь Легиона) ———

type FestSkin = [id: string, hero: string, ru: string, en: string, look: SkinDef['look']];
const FEST_SKINS: FestSkin[] = [];
for (const [id, hero, ru, en, look] of FEST_SKINS) {
  const skin: SkinDef = { id, hero, name: { ru, en }, look, source: 'event' };
  SKINS.push(skin);
  SKIN_MAP[id] = skin;
}

/** Праздник, где добывается облик: финал шкалы наград или лавка. */
export function skinFestival(skin: string): { def: FestivalDef; final: boolean } | null {
  for (const def of FESTIVALS) {
    if (def.finalSkin === skin) return { def, final: true };
    if (def.shopSkins.includes(skin)) return { def, final: false };
  }
  return null;
}

/** Ближайший (или идущий сейчас) праздник с этим id; null — в расписании его нет. */
export function festivalNext(id: FestivalId, now: number, sched?: FestivalSchedule | null): { start: number; end: number; active: boolean } | null {
  const f = festivalUpcoming(now, sched, sched?.mode === 'manual' ? 50 : FESTIVALS.length).find((x) => x.def.id === id);
  return f ? { start: f.start, end: f.end, active: f.start <= now } : null;
}

// ——— Лавка праздника ———

export interface FestOfferDef {
  id: string;
  name: L10n;
  cost: number;
  limit: number;
  give: { cur?: Partial<Record<Currency, number>>; skin?: string; item?: 'legendary' | 'mythic'; heart?: boolean; picks?: number; matches?: number };
}

/** Лавка текущего праздника (жетоны ивента). Лимиты — на праздник. */
export function festShop(def: FestivalDef): FestOfferDef[] {
  return [
    { id: 'fs_emblems', name: L('Эмблемы ×10', 'Emblems ×10'), cost: 450, limit: 6, give: { cur: { emblems: 10 } } },
    ...(def.kind === 'mine' ? [{ id: 'fs_picks', name: L('Кирки ×10', 'Picks ×10'), cost: 200, limit: 10, give: { picks: 10 } }] : []),
    ...(def.kind === 'volley' ? [{ id: 'fs_match', name: L('Матч на пляже', 'Beach match'), cost: 200, limit: 10, give: { matches: 1 } }] : []),
    ...def.shopSkins.map((sk) => ({ id: `fs_${sk}`, name: L(`Облик «${SKIN_MAP[sk].name.ru}»`, `Skin "${SKIN_MAP[sk].name.en}"`), cost: 2600, limit: 1, give: { skin: sk } })),
    { id: 'fs_heart', name: L('Сердце Эфира', 'Aether Heart'), cost: 900, limit: 2, give: { heart: true } },
    { id: 'fs_mythic', name: L('Мифический предмет', 'Mythic item'), cost: 2200, limit: 1, give: { item: 'mythic' } },
    { id: 'fs_legend', name: L('Легендарный предмет', 'Legendary item'), cost: 600, limit: 3, give: { item: 'legendary' } },
    { id: 'fs_emblem', name: L('Эмблемы ×3', 'Emblems ×3'), cost: 150, limit: 10, give: { cur: { emblems: 3 } } },
    { id: 'fs_crystals', name: L('Кристаллы ×100', 'Crystals ×100'), cost: 300, limit: 5, give: { cur: { crystals: 100 } } },
    { id: 'fs_books', name: L('Тома знаний ×6', 'Tomes ×6'), cost: 150, limit: 5, give: { cur: { books: 6 } } },
    { id: 'fs_steel', name: L('Сталь ×80', 'Steel ×80'), cost: 150, limit: 5, give: { cur: { steel: 80 } } },
  ];
}

// ——— Враги праздников ———

/** Умения боссов праздников. */
const FS = (id: string, ru: string, en: string, target: SkillDef['target'], cd: number, fx: SkillDef['fx'], vfx: string): SkillDef => ({ id, kind: 'skill', name: L(ru, en), desc: L('', ''), cd, first: 3000, target, fx, vfx });

/** Умения боссов праздников. */
export const FESTIVAL_SKILLS: SkillDef[] = [
  FS('fest.moonKiss', 'Поцелуй луны', 'Moon Kiss', 'back', 8000, [{ fx: { t: 'dmg', mult: 1.6, ls: 0.5 } }], 'dark'),
  FS('fest.whirlpool', 'Водоворот', 'Whirlpool', 'all', 10000, [{ fx: { t: 'dmg', mult: 0.9 } }, { fx: { t: 'buff', stat: 'haste', v: -0.2, ms: 4000 } }], 'ice'),
  FS('fest.petalStorm', 'Буря лепестков', 'Petal Storm', 'random', 9000, [{ fx: { t: 'dmg', mult: 0.55, hits: 5 } }, { fx: { t: 'dot', mult: 0.4, ms: 3000, kind: 'bleed' } }], 'poison'),
  FS('fest.silverVolley', 'Серебряный залп', 'Silver Volley', 'random', 8000, [{ fx: { t: 'dmg', mult: 0.7, hits: 4 } }], 'arrow'),
  FS('fest.trident', 'Удар трезубца', 'Trident Strike', 'target', 8000, [{ fx: { t: 'dmg', mult: 1.4 } }, { fx: { t: 'stun', ms: 1000 } }], 'ice'),
  FS('fest.iai', 'Иайдо', 'Iaido', 'back', 8000, [{ fx: { t: 'dmg', mult: 2.1 } }, { fx: { t: 'dot', mult: 0.6, ms: 3000, kind: 'bleed' } }], 'slash'),
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
  { id: 'fest_selene', cls: 'archer', act: 9, name: L('Селена', 'Selene'), title: L('Охотница Кровавой Луны', 'Huntress of the Blood Moon'), role: 'ranged', element: 'dark', kind: 'boss', mechanic: 'skyborne', skills: ['fest.silverVolley', 'boss.soulRend', 'boss.ultDark'], look: { ...FL('#E8E0F4', 'long', '#E8DCE8', '#E03A4A', '#5A0E1E', '#D8D0E8', 'tiara', '#E03A4A', 'darkWings', 'gown'), bust: 2 } },
  { id: 'fest_amphitrite', cls: 'guardian', act: 4, name: L('Амфитрита', 'Amphitrite'), title: L('Владычица Приливов', 'Sovereign of the Tides'), role: 'tank', element: 'water', kind: 'boss', mechanic: 'freeze', skills: ['fest.trident', 'boss.tidalWave', 'boss.ultWater'], look: { ...FL('#2AB0C0', 'long', '#F4D3B8', '#6FF0E0', '#0E5A7A', '#F2D46B', 'crown', '#F2D46B', 'none', 'regalia'), bust: 2 } },
  { id: 'fest_tsubaki', cls: 'rogue', act: 1, name: L('Цубаки', 'Tsubaki'), title: L('Клинок Сакуры', 'Blade of the Sakura'), role: 'rogue', element: 'nature', kind: 'boss', mechanic: 'phases', skills: ['fest.iai', 'fest.petalStorm', 'boss.ultNature'], look: { ...FL('#F4A8C8', 'ponytail', '#F4D3B8', '#C0306A', '#F2E6F0', '#C0306A', 'flower', '#F4B8CC', 'none', 'yukata'), bust: 2 } },
];
for (const e of FESTIVAL_ENEMIES) {
  ENEMY_MAP[e.id] = e;
}
