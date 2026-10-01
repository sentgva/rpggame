import type { ClassId, Element, L10n } from '../types';

export type HairStyle = 'long' | 'short' | 'bob' | 'ponytail' | 'twintails' | 'braid' | 'bun' | 'wild' | 'swept';
export type Accessory =
  | 'none'
  | 'witchHat'
  | 'crown'
  | 'hood'
  | 'mask'
  | 'horns'
  | 'halo'
  | 'flower'
  | 'tiara'
  | 'helmet'
  | 'elfEars'
  | 'veil'
  | 'bandana'
  | 'catEars'
  | 'sunHat'
  | 'bow'
  | 'bunnyEars'
  | 'maidBand';

/**
 * Сменный наряд облика вместо классового костюма.
 * Героини: купальники (swim*, micro — микро-бикини на завязках, string — ещё меньше, sling — слингшот,
 * shell — ракушки на жемчужных нитях), бельё (lace*, corset, ribbon — ленты с бантом), маскарадные (bunny, maid) и др.
 * Герои (мужские наряды): trunks — пляжные шорты, briefs — плавки, aloha — распахнутая гавайская рубашка
 * и шорты, mrobe — распахнутый халат,
 * myukata — мужская юката, mformal — вечерний костюм с расстёгнутым воротом.
 */
export type Wear =
  | 'swim'
  | 'swim2'
  | 'swim3'
  | 'swim4'
  | 'micro'
  | 'string'
  | 'sling'
  | 'shell'
  | 'lace'
  | 'lace2'
  | 'lace3'
  | 'lace4'
  | 'corset'
  | 'ribbon'
  | 'dancer'
  | 'regalia'
  | 'bunny'
  | 'maid'
  | 'yukata'
  | 'gown'
  | 'silk'
  | 'trunks'
  | 'briefs'
  | 'aloha'
  | 'mrobe'
  | 'myukata'
  | 'mformal';

const SWIM = new Set<Wear>(['swim', 'swim2', 'swim3', 'swim4', 'micro', 'string', 'sling', 'shell', 'trunks', 'briefs', 'aloha']);
/** Мужские наряды (у героев); женские на мужской фигуре заменяются ближайшим мужским. */
export const MALE_WEAR = new Set<Wear>(['trunks', 'briefs', 'aloha', 'mrobe', 'myukata', 'mformal']);

/** Купальник ли это (для пляжа, источников и рыбалки). */
export function isSwimwear(wear?: Wear): boolean {
  return !!wear && SWIM.has(wear);
}

export interface Look {
  hair: string;
  style: HairStyle;
  skin: string;
  eyes: string;
  outfit: string;
  trim: string;
  acc: Accessory;
  /** Цвет аксессуара. */
  accColor?: string;
  /** Крылья/хвосты (у врагов и обликов). */
  extra?: 'wings' | 'darkWings' | 'tail' | 'snake' | 'fishTail' | 'scorpion' | 'vines' | 'gears' | 'none';
  /** Сменный наряд вместо классового костюма (у обликов). */
  wear?: Wear;
  /** Объём груди: −1 стройнее, 0 обычный, 1–2 пышнее, 3 — самый пышный. */
  bust?: number;
  /** Бёдра: 0 обычные, 1–2 шире (с полными бёдрами ног), 3 — самые широкие. */
  hips?: number;
  /** Мужская фигура: плечи шире, грудь плоская, узкие бёдра, другое лицо (bust/hips не действуют). */
  male?: boolean;
}

export interface HeroineDef {
  id: string;
  name: L10n;
  cls: ClassId;
  element: Element;
  title: L10n;
  bio: L10n;
  quote: L10n;
  look: Look;
  /** Сколько этапов кампании пройти, чтобы героиня присоединилась к Легиону (0 — с начала). */
  join: number;
  /** Первые слова при встрече (показываются, когда героиня присоединяется). */
  hello: L10n;
}

const SK = { fair: '#F4D3B8', light: '#EBC09C', tan: '#C98E62', dark: '#8A5A3C', pale: '#E8DCE8', blue: '#9FC4E0', green: '#A9D19A', ash: '#B8B0C8' };
const L = (ru: string, en: string): L10n => ({ ru, en });

/**
 * Легион — шестеро, по одному на класс: четыре героини и два героя (рыцарь и следопыт).
 * Гачи нет: герои присоединяются по ходу кампании,
 * а сила растёт прокачкой — уровни, ранги за Эмблемы, древо умений, специализация, снаряжение и близость.
 */
export const HEROINES: HeroineDef[] = [
  {
    id: 'cassian',
    name: L('Кассиан', 'Cassian'),
    cls: 'knight',
    element: 'light',
    title: L('Северный рыцарь', 'Knight of the North'),
    bio: L(
      'Рыцарь в белых латах и синем плаще с гербом Легиона. «Слишком красив для войны», — говорят все, пока не увидят его в строю. Поклялся защищать последних людей Аэриса и держит слово: первым встречает удар и последним уходит с поля боя.',
      'A knight in white plate and a blue cloak bearing the Legion crest. "Too pretty for war," everyone says, until they see him hold the line. He swore to protect the last people of Aeris and keeps his word: first to meet the blow, last to leave the field.',
    ),
    quote: L('За моей спиной вы в безопасности.', 'Behind me, you are safe.'),
    hello: L('Командор? Копьё я сломал, но щит цел. Я встану впереди — остальное за вами.', 'Commander? I broke my spear, but my shield holds. I will stand in front — the rest is yours.'),
    look: { hair: '#F2E3A0', style: 'swept', skin: SK.fair, eyes: '#5AA0E0', outfit: '#3A5AA8', trim: '#D4A640', acc: 'none', male: true },
    join: 0,
  },
  {
    id: 'lira',
    name: L('Лира', 'Lira'),
    cls: 'warlock',
    element: 'fire',
    title: L('Пламя Легиона', 'Flame of the Legion'),
    bio: L(
      'Рыжая колдунья в тёмной шляпе и мантии с угольной вышивкой. Первая душа, которую Кристалл Эфира вернул Командору. Её проклятия прожигают любую броню, а язык — любое терпение.',
      'A red-haired warlock in a dark hat and a robe with ember embroidery. The first soul the Aether Crystal returned to the Commander. Her hexes burn through any armor — and her tongue through any patience.',
    ),
    quote: L('Сожжём всё, что встанет на пути!', "We'll burn anything in our way!"),
    hello: L('Наконец-то проснулся! Я Лира. Держись рядом — и не наступай на мой подол.', 'Finally awake! I am Lira. Stay close — and mind my hem.'),
    look: { hair: '#E0532A', style: 'long', skin: SK.fair, eyes: '#6BC04A', outfit: '#2E1E36', trim: '#E0822A', acc: 'witchHat', accColor: '#2A1E2E', bust: 1, hips: 1 },
    join: 0,
  },
  {
    id: 'mirabel',
    name: L('Мирабель', 'Mirabel'),
    cls: 'priestess',
    element: 'light',
    title: L('Жрица рассвета', 'Priestess of the Dawn'),
    bio: L(
      'Жрица храма Рассвета в белом одеянии с золотой каймой. Лечит раны и страхи одинаково бережно, но в гневе её свет обжигает не хуже огня.',
      'A priestess of the Dawn temple in white vestments with golden trim. She heals wounds and fears with equal care, yet in anger her light burns no less than fire.',
    ),
    quote: L('Пока я рядом, никто не падёт.', 'While I am here, no one falls.'),
    hello: L('Свет привёл меня к вам. Позвольте перевязать раны — а потом пойдём дальше вместе.', 'The light led me to you. Let me dress your wounds — then we go on together.'),
    look: { hair: '#F2EEF8', style: 'long', skin: SK.fair, eyes: '#6FB0F0', outfit: '#F2F0E6', trim: '#E0B040', acc: 'halo', accColor: '#FFE8A0', bust: 1, hips: 1 },
    join: 3,
  },
  {
    id: 'elian',
    name: L('Элиан', 'Elian'),
    cls: 'ranger',
    element: 'nature',
    title: L('Следопыт опушки', 'Pathfinder of the Glade'),
    bio: L(
      'Эльф-следопыт в зелёном плаще, с длинным серебристым хвостом волос и насмешливым взглядом. Знает каждую тропу Изумрудной опушки, ставит силки быстрее, чем враг успевает моргнуть, и никогда не промахивается дважды.',
      'An elven ranger in a green cloak, with a long silver ponytail and a mocking gaze. He knows every trail of the Emerald Glade, sets snares faster than a foe can blink, and never misses twice.',
    ),
    quote: L('Ветер на моей стороне.', 'The wind is on my side.'),
    hello: L('Я шёл по вашим следам три дня. Неплохо для людей. Возьмёте в отряд?', 'I followed your tracks for three days. Not bad, for humans. Will you take me in?'),
    look: { hair: '#E4E0D0', style: 'ponytail', skin: SK.light, eyes: '#4E9A3C', outfit: '#3F6B34', trim: '#8C6A3A', acc: 'elfEars', accColor: '#EBC09C', male: true },
    join: 6,
  },
  {
    id: 'keira',
    name: L('Кейра', 'Keira'),
    cls: 'assassin',
    element: 'dark',
    title: L('Тень Легиона', 'Shadow of the Legion'),
    bio: L(
      'Бывшая наёмная убийца в тёмной коже и маске-шарфе. Ушла из гильдии, когда ей приказали убить ребёнка, и с тех пор бьёт только тех, кто этого заслуживает. Молчалива, но в бою говорят её кинжалы.',
      'A former hired blade in dark leather and a scarf mask. She left the guild when ordered to kill a child and now strikes only those who deserve it. Quiet — in battle her daggers speak for her.',
    ),
    quote: L('Ты меня не увидишь. Они — тоже.', "You won't see me. Neither will they."),
    hello: L('Не вздрагивай. Я здесь уже полчаса. Мне нужна цель — у вас их, похоже, много.', "Don't flinch. I've been here half an hour. I need targets — you seem to have plenty."),
    look: { hair: '#3A2E4E', style: 'ponytail', skin: SK.light, eyes: '#E03A5A', outfit: '#3A3050', trim: '#9B4DE0', acc: 'bandana', accColor: '#9B4DE0', bust: 1, hips: 1 },
    join: 10,
  },
  {
    id: 'ulfa',
    name: L('Ульфа', 'Ulfa'),
    cls: 'hunter',
    element: 'water',
    title: L('Охотница северных льдов', 'Huntress of the Northern Ice'),
    bio: L(
      'Охотница с ледяного севера в меховой парке, с тяжёлым арбалетом и белым волком Снегом. Вдвоём они выслеживают любую добычу — и ни разу не вернулись с пустыми руками.',
      'A huntress from the icy north in a fur parka, with a heavy crossbow and her white wolf Snow. Together they track down any prey — and have never come back empty-handed.',
    ),
    quote: L('Снег, взять!', 'Snow, get them!'),
    hello: L('Снег учуял вас за версту. Раз он не рычит — вы свои. Пойдём охотиться вместе.', "Snow smelled you a mile off. If he isn't growling, you're friends. Let's hunt together."),
    look: { hair: '#D8CCBA', style: 'wild', skin: SK.fair, eyes: '#6FD0E0', outfit: '#5A4632', trim: '#E6E6F0', acc: 'none', bust: 1, hips: 1 },
    join: 15,
  },
];

export const HEROINE_MAP: Record<string, HeroineDef> = Object.fromEntries(HEROINES.map((x) => [x.id, x]));
/** Порядок Легиона в интерфейсе и в строю. */
export const ROSTER: string[] = HEROINES.map((x) => x.id);
/** Героиня класса (у каждого класса — одна). */
export const HERO_OF_CLASS = Object.fromEntries(HEROINES.map((x) => [x.cls, x.id])) as Record<ClassId, string>;
/** С кем начинается игра. */
export const STARTER_HEROINES = HEROINES.filter((x) => x.join === 0).map((x) => x.id);

export type SkinSet = 'summer' | 'lingerie' | 'masquerade' | 'bond';
export const SKIN_SETS: SkinSet[] = ['summer', 'lingerie', 'masquerade'];

/** Облики (скины): +3% к статам, альтернативная палитра или наряд. Пока — только наряды близости. */
export interface SkinDef {
  id: string;
  hero: string;
  name: L10n;
  look: Partial<Look>;
  source: 'shop' | 'tower' | 'labyrinth' | 'pass' | 'event' | 'arena' | 'spire' | 'horde' | 'bond';
  /** Цена в магазине обликов (кристаллы). */
  crystals?: number;
  set?: SkinSet;
}

/**
 * Летняя коллекция «Солнечного курорта» — самые открытые купальники игры: слингшоты и «нитки»
 * у героинь, плавки у героев. Облики — только на празднике: финал шкалы наград и лавка курорта.
 */
export const SUMMER_SKINS: SkinDef[] = [
  { id: 'mirabel_summer', hero: 'mirabel', name: L('Жемчужина лагуны', 'Lagoon Pearl'), look: { wear: 'sling', outfit: '#FFFFFF', trim: '#E0B040', acc: 'flower', accColor: '#F2E6D8' }, source: 'event', set: 'summer' },
  { id: 'cassian_summer', hero: 'cassian', name: L('Морской страж', 'Sea Guardian'), look: { wear: 'briefs', outfit: '#2E4E9A', trim: '#F2F0E6', acc: 'sunHat', accColor: '#E8C87A' }, source: 'event', set: 'summer' },
  { id: 'lira_summer', hero: 'lira', name: L('Закатное пламя', 'Sunset Flame'), look: { wear: 'string', outfit: '#E0532A', trim: '#F2C040', acc: 'flower', accColor: '#F2C040' }, source: 'event', set: 'summer' },
  { id: 'elian_summer', hero: 'elian', name: L('Лесная лагуна', 'Forest Lagoon'), look: { wear: 'briefs', outfit: '#2F8A3A', trim: '#F2E6D8' }, source: 'event', set: 'summer' },
  { id: 'keira_summer', hero: 'keira', name: L('Полночный бриз', 'Midnight Breeze'), look: { wear: 'sling', outfit: '#1E1A2A', trim: '#B06AE0', acc: 'bandana', accColor: '#B06AE0' }, source: 'event', set: 'summer' },
  { id: 'ulfa_summer', hero: 'ulfa', name: L('Северное сияние', 'Northern Lights'), look: { wear: 'string', outfit: '#3AA0D0', trim: '#E6E6F0', acc: 'none' }, source: 'event', set: 'summer' },
];

type SetSkin = [id: string, hero: string, set: SkinSet, source: SkinDef['source'], look: Partial<Look>, ru: string, en: string, crystals?: number];

/**
 * Коллекции Легиона: «Лето» (бикини у героинь, шорты и плавки у героев), «Будуар» (бельё; у героев —
 * шёлковый халат) и «Маскарад». Добываются в магазине обликов за кристаллы, в магазинах арены, лабиринта
 * и ивента, в боевом пропуске.
 */
const COLLECTION: SetSkin[] = [
  // ——— Мирабель ———
  ['mirabel_lily', 'mirabel', 'summer', 'shop', { wear: 'swim2', outfit: '#FFFFFF', trim: '#E0B040' }, 'Белая лилия', 'White Lily', 2500],
  ['mirabel_tide', 'mirabel', 'summer', 'arena', { wear: 'shell', outfit: '#F2E6D8', trim: '#6FD0E0', acc: 'flower', accColor: '#6FD0E0' }, 'Дочь прилива', 'Daughter of the Tide'],
  ['mirabel_sun', 'mirabel', 'summer', 'pass', { wear: 'micro', outfit: '#E0B040', trim: '#FFFFFF', acc: 'sunHat', accColor: '#F2E6D8' }, 'Солнечный зайчик', 'Sunbeam'],
  ['mirabel_lavender', 'mirabel', 'lingerie', 'shop', { wear: 'lace2', outfit: '#9B7AE0', trim: '#F2F0E6' }, 'Лавандовое кружево', 'Lavender Lace', 3000],
  ['mirabel_bride', 'mirabel', 'lingerie', 'labyrinth', { wear: 'corset', outfit: '#FFFFFF', trim: '#E0B040', acc: 'veil', accColor: '#F2F0E6' }, 'Невеста рассвета', 'Bride of the Dawn'],
  ['mirabel_gift', 'mirabel', 'lingerie', 'event', { wear: 'ribbon', outfit: '#E890B0', trim: '#E0B040', acc: 'bow', accColor: '#E890B0' }, 'Подарок небес', "Heaven's Gift"],
  ['mirabel_bunny', 'mirabel', 'masquerade', 'pass', { wear: 'bunny', outfit: '#FFFFFF', trim: '#E0B040', acc: 'bunnyEars', accColor: '#FFFFFF' }, 'Белый кролик', 'White Bunny'],
  // ——— Лира ———
  ['lira_beach', 'lira', 'summer', 'shop', { wear: 'swim', outfit: '#1EA0A0', trim: '#F2E6D8', acc: 'sunHat', accColor: '#E8C87A' }, 'Пляжная ведьма', 'Beach Witch', 2500],
  ['lira_rings', 'lira', 'summer', 'arena', { wear: 'swim3', outfit: '#1E1A1A', trim: '#F2C040' }, 'Огненные кольца', 'Rings of Fire'],
  ['lira_spark', 'lira', 'summer', 'pass', { wear: 'string', outfit: '#FF4A9A', trim: '#F2E6D8', acc: 'flower', accColor: '#FF4A9A' }, 'Искра', 'Spark'],
  ['lira_hell', 'lira', 'lingerie', 'shop', { wear: 'lace4', outfit: '#C0203A', trim: '#1E1A1A', acc: 'horns', accColor: '#2A1616' }, 'Адское искушение', 'Infernal Temptation', 3000],
  ['lira_embers', 'lira', 'lingerie', 'labyrinth', { wear: 'lace', outfit: '#1E1A1A', trim: '#E0822A' }, 'Угольки', 'Embers'],
  ['lira_gift', 'lira', 'lingerie', 'event', { wear: 'ribbon', outfit: '#C0203A', trim: '#F2C040', acc: 'bow', accColor: '#C0203A' }, 'Праздничная ведьма', 'Festive Witch'],
  ['lira_maid', 'lira', 'masquerade', 'pass', { wear: 'maid', outfit: '#1E1A1A', trim: '#F2F0E6', acc: 'maidBand', accColor: '#F2F0E6' }, 'Горничная-ведьма', 'Witch Maid'],
  // ——— Кейра ———
  ['keira_night', 'keira', 'summer', 'shop', { wear: 'swim4', outfit: '#1E1A2A', trim: '#E03A3A' }, 'Ночной пляж', 'Night Beach', 2500],
  ['keira_violet', 'keira', 'summer', 'arena', { wear: 'micro', outfit: '#9B4DE0', trim: '#1E1A2A' }, 'Фиалка', 'Violet'],
  ['keira_surf', 'keira', 'summer', 'pass', { wear: 'sling', outfit: '#E03A6A', trim: '#1E1A2A' }, 'Тень прибоя', 'Surf Shadow'],
  ['keira_silk', 'keira', 'lingerie', 'shop', { wear: 'lace3', outfit: '#1E1420', trim: '#9B4DE0' }, 'Чёрный шёлк', 'Black Silk', 3000],
  ['keira_midnight', 'keira', 'lingerie', 'labyrinth', { wear: 'lace4', outfit: '#6A2AA0', trim: '#1E1A2A', acc: 'mask', accColor: '#1E1A2A' }, 'Полночь', 'Midnight'],
  ['keira_fatale', 'keira', 'lingerie', 'event', { wear: 'corset', outfit: '#1E1A1A', trim: '#E03A3A' }, 'Роковая', 'Femme Fatale'],
  ['keira_bunny', 'keira', 'masquerade', 'pass', { wear: 'bunny', outfit: '#1E1A2A', trim: '#9B4DE0', acc: 'bunnyEars', accColor: '#2A2036' }, 'Лунный кролик', 'Moon Bunny'],
  // ——— Ульфа ———
  ['ulfa_cat', 'ulfa', 'summer', 'shop', { wear: 'swim3', outfit: '#1E1A2A', trim: '#F2D46B' }, 'Кошка на пляже', 'Beach Cat', 2500],
  ['ulfa_foam', 'ulfa', 'summer', 'arena', { wear: 'swim2', outfit: '#6FD0E0', trim: '#FFFFFF' }, 'Морская пена', 'Sea Foam'],
  ['ulfa_ice', 'ulfa', 'summer', 'pass', { wear: 'shell', outfit: '#9FE0FF', trim: '#FFFFFF' }, 'Ледяная жемчужина', 'Ice Pearl'],
  ['ulfa_aurora', 'ulfa', 'lingerie', 'shop', { wear: 'lace', outfit: '#1E2A4A', trim: '#6FD0E0' }, 'Полярная ночь', 'Polar Night', 3000],
  ['ulfa_snow', 'ulfa', 'lingerie', 'labyrinth', { wear: 'lace2', outfit: '#E6F2FF', trim: '#3AA0D0' }, 'Снежинка', 'Snowflake'],
  ['ulfa_wolf', 'ulfa', 'lingerie', 'event', { wear: 'corset', outfit: '#4A4A5A', trim: '#E6E6F0', acc: 'catEars', accColor: '#D8CCBA' }, 'Волчица', 'She-Wolf'],
  ['ulfa_maid', 'ulfa', 'masquerade', 'pass', { wear: 'maid', outfit: '#1E2A4A', trim: '#F2F0E6', acc: 'catEars', accColor: '#D8CCBA' }, 'Горничная-волчица', 'Wolf Maid'],
  // ——— Кассиан ———
  ['cassian_lifeguard', 'cassian', 'summer', 'arena', { wear: 'trunks', outfit: '#E03A3A', trim: '#F2F0E6' }, 'Спасатель', 'Lifeguard'],
  ['cassian_gold', 'cassian', 'summer', 'shop', { wear: 'briefs', outfit: '#F2F0E6', trim: '#D4A640' }, 'Золотой пляж', 'Golden Beach', 2000],
  ['cassian_robe', 'cassian', 'lingerie', 'labyrinth', { wear: 'mrobe', outfit: '#2E3A6A', trim: '#D4A640' }, 'Ночной дозор', 'Night Watch'],
  // ——— Элиан ———
  ['elian_surf', 'elian', 'summer', 'arena', { wear: 'trunks', outfit: '#3F8A5A', trim: '#E8C87A' }, 'Лесной прибой', 'Forest Surf'],
  ['elian_tropic', 'elian', 'summer', 'shop', { wear: 'briefs', outfit: '#1E8A8A', trim: '#F2E6D8' }, 'Тропик', 'Tropic', 2000],
  ['elian_robe', 'elian', 'lingerie', 'labyrinth', { wear: 'mrobe', outfit: '#2F5A3A', trim: '#E4E0D0' }, 'Лунная роща', 'Moon Grove'],
  // летние облики героев: гавайские рубашки и плавки
  ['cassian_aloha', 'cassian', 'summer', 'shop', { wear: 'aloha', outfit: '#3AA0E0', trim: '#F2F0E6', acc: 'sunHat', accColor: '#E8C87A' }, 'Голубая лагуна', 'Blue Lagoon', 2000],
  ['cassian_coral', 'cassian', 'summer', 'event', { wear: 'briefs', outfit: '#FF6A6A', trim: '#FFFFFF', acc: 'flower', accColor: '#FF6A6A' }, 'Коралловый мальчик', 'Coral Boy'],
  ['elian_aloha', 'elian', 'summer', 'shop', { wear: 'aloha', outfit: '#E0703A', trim: '#F2E6A0', acc: 'flower', accColor: '#F2E6A0' }, 'Закат в тропиках', 'Tropical Sunset', 2000],
  ['elian_wave', 'elian', 'summer', 'event', { wear: 'trunks', outfit: '#6A5AE0', trim: '#E4E0D0' }, 'Лунная волна', 'Moon Wave'],
];

/** Облики Легиона (коллекции; наряды близости добавляются в bond.ts, облики праздников — в festival.ts). */
export const SKINS: SkinDef[] = [
  ...SUMMER_SKINS,
  ...COLLECTION.map(([id, hero, set, source, look, ru, en, crystals]): SkinDef => ({ id, hero, set, source, look, name: L(ru, en), crystals })),
];
/** Облики, которые есть только на праздниках (в обычные магазины не попадают). */
export const FESTIVAL_ONLY_SKINS = new Set(SUMMER_SKINS.map((x) => x.id));
export const SKIN_MAP: Record<string, SkinDef> = Object.fromEntries(SKINS.map((x) => [x.id, x]));
