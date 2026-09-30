import type { ClassId, Element, L10n } from '../types';

export type HairStyle = 'long' | 'short' | 'bob' | 'ponytail' | 'twintails' | 'braid' | 'bun' | 'wild';
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
 * Сменный наряд облика: купальники (swim*, micro — микро-бикини на тонких завязках), бельё (lace*),
 * маскарадные (bunny, maid) вместо классового костюма.
 */
export type Wear = 'swim' | 'swim2' | 'swim3' | 'swim4' | 'micro' | 'lace' | 'lace2' | 'lace3' | 'lace4' | 'dancer' | 'regalia' | 'bunny' | 'maid' | 'yukata' | 'gown' | 'silk';

/** Купальник ли это (для пляжа, источников и рыбалки). */
export function isSwimwear(wear?: Wear): boolean {
  return !!wear && (wear.startsWith('swim') || wear === 'micro');
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
 * Легион — шесть героинь, по одной на класс. Гачи нет: героини присоединяются по ходу кампании,
 * а сила растёт прокачкой — уровни, ранги за Эмблемы, древо умений, специализация, снаряжение и близость.
 */
export const HEROINES: HeroineDef[] = [
  {
    id: 'astrid',
    name: L('Астрид', 'Astrid'),
    cls: 'knight',
    element: 'light',
    title: L('Северная рыцарша', 'Knight of the North'),
    bio: L(
      'Рыцарша в белых латах с гербом Легиона на табарде. Поклялась защищать последних людей Аэриса и держит слово: первой встречает удар и последней уходит с поля боя.',
      'A knight in white plate with the Legion crest on her tabard. She swore to protect the last people of Aeris and keeps her word: first to meet the blow, last to leave the field.',
    ),
    quote: L('За моей спиной вы в безопасности.', 'Behind me, you are safe.'),
    hello: L('Командор? Моё копьё сломано, но щит цел. Я встану впереди — остальное за вами.', 'Commander? My spear is broken, but my shield holds. I will stand in front — the rest is yours.'),
    look: { hair: '#F2E3A0', style: 'braid', skin: SK.fair, eyes: '#5AA0E0', outfit: '#3A5AA8', trim: '#D4A640', acc: 'none', bust: 1, hips: 1 },
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
    id: 'seyra',
    name: L('Сейра', 'Seyra'),
    cls: 'ranger',
    element: 'nature',
    title: L('Следопыт опушки', 'Pathfinder of the Glade'),
    bio: L(
      'Эльфийка-следопыт в зелёном плаще с капюшоном. Знает каждую тропу Изумрудной опушки, ставит силки быстрее, чем враг успевает моргнуть, и никогда не промахивается дважды.',
      'An elven ranger in a green hooded cloak. She knows every trail of the Emerald Glade, sets snares faster than a foe can blink, and never misses twice.',
    ),
    quote: L('Ветер на моей стороне.', 'The wind is on my side.'),
    hello: L('Я шла по вашим следам три дня. Неплохо для людей. Возьмёте в отряд?', 'I followed your tracks for three days. Not bad, for humans. Will you take me in?'),
    look: { hair: '#C9B26A', style: 'ponytail', skin: SK.light, eyes: '#4E9A3C', outfit: '#3F6B34', trim: '#8C6A3A', acc: 'elfEars', accColor: '#EBC09C', bust: 1, hips: 1 },
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
    look: { hair: '#2A2436', style: 'ponytail', skin: SK.light, eyes: '#E03A5A', outfit: '#2A2438', trim: '#9B4DE0', acc: 'hood', accColor: '#1E1A2A', bust: 1, hips: 1 },
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

/** Облики героинь (добавляются сюда; наряды близости создаются в bond.ts). */
export const SKINS: SkinDef[] = [];
export const SKIN_MAP: Record<string, SkinDef> = {};
