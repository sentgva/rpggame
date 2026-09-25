import type { ClassId, Element, HeroRarity, L10n } from '../types';

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
  | 'bow';

/** Сменный наряд облика: купальники (swim*) и бельё (lace*) вместо классового костюма. */
export type Wear = 'swim' | 'swim2' | 'swim3' | 'swim4' | 'lace' | 'lace2' | 'lace3' | 'lace4' | 'dancer' | 'regalia';

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
  /** Крылья/хвосты для владычиц и монстродевушек. */
  extra?: 'wings' | 'darkWings' | 'tail' | 'snake' | 'fishTail' | 'scorpion' | 'vines' | 'gears' | 'none';
  /** Сменный наряд (только у обликов). */
  wear?: Wear;
}

export interface HeroineDef {
  id: string;
  name: L10n;
  cls: ClassId;
  element: Element;
  rarity: HeroRarity;
  title: L10n;
  bio: L10n;
  quote: L10n;
  look: Look;
  /** Владычица-босс: не выпадает в призыве, получается осколками с Кошмара. */
  boss?: boolean;
  /**
   * Вестница Эфира: крупнее остальных, со своей анимацией (парит, аура, взмахи крыльев/хвоста).
   * Не выпадает в призыве — осколки дают Разлом Колосса, Стихийные шпили и Нашествие.
   */
  herald?: boolean;
}

const SK = { fair: '#F4D3B8', light: '#EBC09C', tan: '#C98E62', dark: '#8A5A3C', pale: '#E8DCE8', blue: '#9FC4E0', green: '#A9D19A', ash: '#B8B0C8' };

function h(
  id: string,
  ru: string,
  en: string,
  cls: ClassId,
  element: Element,
  rarity: HeroRarity,
  title: L10n,
  bio: L10n,
  quote: L10n,
  look: Look,
  boss = false,
): HeroineDef {
  return { id, name: { ru, en }, cls, element, rarity, title, bio, quote, look, boss: boss || undefined };
}

export const HEROINES: HeroineDef[] = [
  // ——— примеры из ТЗ ———
  h('lira', 'Лира', 'Lira', 'sorceress', 'fire', 'SR',
    { ru: 'Пламя Легиона', en: 'Flame of the Legion' },
    { ru: 'Рыжая чародейка в тёмной шляпе. Первая душа, которую Кристалл Эфира вернул Командору; с тех пор она не отходит от него ни на шаг.', en: 'A red-haired sorceress in a dark hat. The first soul the Aether Crystal returned to the Commander; she has not left his side since.' },
    { ru: 'Сожжём всё, что встанет на пути!', en: "We'll burn anything in our way!" },
    { hair: '#E0532A', style: 'long', skin: SK.fair, eyes: '#6BC04A', outfit: '#3A2436', trim: '#E0A13A', acc: 'witchHat', accColor: '#2A1E2E' }),
  h('astrid', 'Астрид', 'Astrid', 'guardian', 'light', 'SSR',
    { ru: 'Северная рыцарша', en: 'Knight of the North' },
    { ru: 'Северная рыцарша в белой броне и плаще с гербом. Поклялась защищать последних людей Аэриса и держит слово.', en: 'A northern knight in white armor with a crested cloak. She swore to protect the last people of Aeris and keeps her word.' },
    { ru: 'За моей спиной вы в безопасности.', en: 'Behind me, you are safe.' },
    { hair: '#F2E3A0', style: 'braid', skin: SK.fair, eyes: '#5AA0E0', outfit: '#E8ECF2', trim: '#D4A640', acc: 'none' }),
  h('seyra', 'Сейра', 'Seyra', 'archer', 'nature', 'R',
    { ru: 'Следопыт опушки', en: 'Pathfinder of the Glade' },
    { ru: 'Эльфийка-следопыт в зелёном капюшоне. Знает каждую тропу Изумрудной опушки.', en: 'An elven pathfinder in a green hood. She knows every trail of the Emerald Glade.' },
    { ru: 'Ветер на моей стороне.', en: 'The wind is on my side.' },
    { hair: '#C9B26A', style: 'ponytail', skin: SK.light, eyes: '#4E9A3C', outfit: '#3F6B34', trim: '#8C6A3A', acc: 'hood', accColor: '#2F5A2A' }),
  h('mirabel', 'Мирабель', 'Mirabel', 'priestess', 'water', 'SSR',
    { ru: 'Жрица морского храма', en: 'Priestess of the Sea Temple' },
    { ru: 'Жрица морского храма с жезлом, увенчанным жемчугом. Её молитвы звучат как прибой.', en: 'A priestess of the sea temple with a pearl-crowned wand. Her prayers sound like the surf.' },
    { ru: 'Пусть волны смоют твою боль.', en: 'Let the waves wash away your pain.' },
    { hair: '#6FD0E0', style: 'long', skin: SK.fair, eyes: '#2E6FC0', outfit: '#E6F2F6', trim: '#3D7BE0', acc: 'tiara', accColor: '#F2F0E6' }),
  h('keira', 'Кейра', 'Keira', 'berserker', 'fire', 'SR',
    { ru: 'Рунная воительница', en: 'Rune Warrior' },
    { ru: 'Воительница с рунными татуировками и тяжёлым топором. Руны светятся тем ярче, чем злее она становится.', en: 'A warrior with rune tattoos and a heavy axe. The runes glow brighter the angrier she gets.' },
    { ru: 'Ещё! Дайте мне ещё врагов!', en: 'More! Give me more enemies!' },
    { hair: '#B8322C', style: 'wild', skin: SK.tan, eyes: '#F0A030', outfit: '#5A3A2E', trim: '#F08A24', acc: 'bandana', accColor: '#B8322C' }),
  h('nox', 'Нокс', 'Nox', 'assassin', 'dark', 'SSR',
    { ru: 'Беловолосая тень', en: 'White-Haired Shadow' },
    { ru: 'Беловолосая убийца в маске. Никто не видел её лица — и никто из видевших не выжил.', en: 'A white-haired killer in a mask. No one has seen her face — no one who did survived.' },
    { ru: 'Тише. Уже всё закончилось.', en: "Hush. It's already over." },
    { hair: '#EDEAF2', style: 'bob', skin: SK.pale, eyes: '#C03A6A', outfit: '#221A2A', trim: '#9B4DE0', acc: 'mask', accColor: '#2A2233' }),
  h('velvet', 'Вельвет', 'Velvet', 'necromancer', 'dark', 'UR',
    { ru: 'Готическая аристократка', en: 'Gothic Aristocrat' },
    { ru: 'Готическая аристократка с косой и стаей призрачных воронов. Смерть для неё — лишь светский этикет.', en: 'A gothic aristocrat with a scythe and a flock of ghostly ravens. To her, death is mere etiquette.' },
    { ru: 'Какая прелестная душа. Оставлю её себе.', en: 'What a lovely soul. I shall keep it.' },
    { hair: '#2A2036', style: 'twintails', skin: SK.pale, eyes: '#E03A3A', outfit: '#1E1420', trim: '#B8322C', acc: 'veil', accColor: '#3A2436' }),
  h('hanna', 'Ханна', 'Hanna', 'bard', 'light', 'R',
    { ru: 'Весёлая менестрель', en: 'Cheerful Minstrel' },
    { ru: 'Весёлая менестрель с лютней. Её песни поднимают дух даже у самых уставших бойцов.', en: 'A cheerful minstrel with a lute. Her songs lift the spirits of even the weariest fighters.' },
    { ru: 'А теперь — припев, все вместе!', en: 'And now the chorus, everyone!' },
    { hair: '#F0B040', style: 'bun', skin: SK.fair, eyes: '#6A4A2A', outfit: '#C0503A', trim: '#F2E6D8', acc: 'flower', accColor: '#F2A0B0' }),
  h('isolde', 'Изольда', 'Isolde', 'sorceress', 'water', 'UR',
    { ru: 'Ледяная королева', en: 'Ice Queen' },
    { ru: 'Ледяная королева-маг с парящим кристальным посохом. Её королевство замёрзло в тот день, когда пал Трон.', en: 'An ice queen mage with a floating crystal staff. Her kingdom froze the day the Throne fell.' },
    { ru: 'Замри. Навсегда.', en: 'Freeze. Forever.' },
    { hair: '#CFEFFF', style: 'long', skin: SK.pale, eyes: '#6FD0FF', outfit: '#2E5A90', trim: '#CFEFFF', acc: 'crown', accColor: '#A8E0FF' }),
  h('rin', 'Рин', 'Rin', 'assassin', 'nature', 'SR',
    { ru: 'Куноити цветов', en: 'Flower Kunoichi' },
    { ru: 'Куноити с ядовитыми цветами на клинках. Лепестки её сакуры смертельнее стали.', en: 'A kunoichi with poisonous flowers on her blades. Her cherry petals are deadlier than steel.' },
    { ru: 'Красиво, правда? И смертельно.', en: "Pretty, isn't it? And lethal." },
    { hair: '#E890B0', style: 'ponytail', skin: SK.fair, eyes: '#3A8A4A', outfit: '#2E3A2A', trim: '#E890B0', acc: 'flower', accColor: '#F4B8CC' }),

  // ——— Стражи ———
  h('brianna', 'Брианна', 'Brianna', 'guardian', 'fire', 'R',
    { ru: 'Огненная щитоносица', en: 'Flame Shieldbearer' },
    { ru: 'Кузнечная дочь, выковавшая себе щит из раскалённой бронзы.', en: "A smith's daughter who forged her own shield of glowing bronze." },
    { ru: 'Горячо? Так и задумано!', en: "Hot? That's the idea!" },
    { hair: '#8A3A1E', style: 'short', skin: SK.tan, eyes: '#E0A13A', outfit: '#8A4A2A', trim: '#F08A24', acc: 'none' }),
  h('gwendolyn', 'Гвендолин', 'Gwendolyn', 'guardian', 'nature', 'SR',
    { ru: 'Лесная рыцарша', en: 'Forest Knight' },
    { ru: 'Рыцарша ордена Дуба в доспехах, увитых плющом.', en: 'A knight of the Oak Order in ivy-wrapped armor.' },
    { ru: 'Корни держат крепче стали.', en: 'Roots hold stronger than steel.' },
    { hair: '#6A4A2A', style: 'braid', skin: SK.light, eyes: '#4FBF5A', outfit: '#4A6A3A', trim: '#C0A060', acc: 'flower', accColor: '#F2E6D8' }),
  h('coral', 'Корал', 'Coral', 'guardian', 'water', 'R',
    { ru: 'Стражница прибоя', en: 'Surf Warden' },
    { ru: 'Стражница портовых стен с щитом из раковины исполинской черепахи.', en: 'A harbor-wall warden with a shield made from a giant turtle shell.' },
    { ru: 'Шторм? Я и есть волнорез.', en: 'A storm? I am the breakwater.' },
    { hair: '#E07A6A', style: 'bob', skin: SK.tan, eyes: '#3D7BE0', outfit: '#3A6A8A', trim: '#F2E6D8', acc: 'bandana', accColor: '#3D9BE0' }),
  h('ravenna', 'Равенна', 'Ravenna', 'guardian', 'dark', 'SSR',
    { ru: 'Чёрная рыцарша', en: 'Black Knight' },
    { ru: 'Изгнанная рыцарша в воронёной броне, давшая клятву тьме ради защиты света.', en: 'An exiled knight in blackened armor who swore to darkness to protect the light.' },
    { ru: 'Тьма — тоже щит.', en: 'Darkness is a shield too.' },
    { hair: '#3A3050', style: 'long', skin: SK.pale, eyes: '#9B4DE0', outfit: '#2A2433', trim: '#9B4DE0', acc: 'helmet', accColor: '#3A3446' }),

  // ——— Берсерки ———
  h('ulfa', 'Ульфа', 'Ulfa', 'berserker', 'nature', 'R',
    { ru: 'Волчица лесов', en: 'Wolf of the Woods' },
    { ru: 'Дикарка, выросшая среди волков. Сражается зубами, когти не нужны.', en: 'A wild girl raised by wolves. Fights with teeth; claws are optional.' },
    { ru: 'Р-р-р! Моя добыча!', en: 'Grr! My prey!' },
    { hair: '#8A8070', style: 'wild', skin: SK.tan, eyes: '#E0C040', outfit: '#6A5A3A', trim: '#4FBF5A', acc: 'catEars', accColor: '#8A8070' }),
  h('sigrid', 'Сигрид', 'Sigrid', 'berserker', 'water', 'SSR',
    { ru: 'Дочь фьордов', en: 'Daughter of the Fjords' },
    { ru: 'Северная воительница, рубящая лёд и врагов с одинаковым удовольствием.', en: 'A northern warrior who cleaves ice and enemies with equal pleasure.' },
    { ru: 'Холод бодрит!', en: 'The cold is invigorating!' },
    { hair: '#E0E6F0', style: 'braid', skin: SK.fair, eyes: '#3D9BE0', outfit: '#4A5A6A', trim: '#CFEFFF', acc: 'horns', accColor: '#E6DCC0' }),
  h('valeska', 'Валеска', 'Valeska', 'berserker', 'light', 'SR',
    { ru: 'Солнечная секира', en: 'Sun Axe' },
    { ru: 'Паломница солнечного культа, чья секира сияет как рассвет.', en: 'A pilgrim of the sun cult whose axe shines like dawn.' },
    { ru: 'Рассвет не спрашивает разрешения!', en: 'The dawn asks no permission!' },
    { hair: '#F2C040', style: 'ponytail', skin: SK.tan, eyes: '#F08A24', outfit: '#C0A060', trim: '#F2E6D8', acc: 'tiara', accColor: '#F2D46B' }),
  h('lilith', 'Лилит', 'Lilith', 'berserker', 'dark', 'UR',
    { ru: 'Демоническая воительница', en: 'Demon Warrior' },
    { ru: 'Полудемоница, отказавшаяся служить Хаосу. Её клинок пьёт тьму врагов.', en: 'A half-demon who refused to serve Chaos. Her blade drinks the darkness of her foes.' },
    { ru: 'Я выбрала свою сторону. А ты?', en: 'I chose my side. Have you?' },
    { hair: '#6A1E3A', style: 'long', skin: SK.pale, eyes: '#F0A030', outfit: '#2A1420', trim: '#E03A3A', acc: 'horns', accColor: '#2A1E22', extra: 'darkWings' }),

  // ——— Лучницы ———
  h('fiona', 'Фиона', 'Fiona', 'archer', 'fire', 'SR',
    { ru: 'Огненная стрела', en: 'Fire Arrow' },
    { ru: 'Лучница вулканических застав, поджигающая наконечники о лаву.', en: 'An archer of the volcanic outposts who lights her arrowheads in lava.' },
    { ru: 'Одна стрела — один пожар.', en: 'One arrow, one wildfire.' },
    { hair: '#F08A24', style: 'ponytail', skin: SK.light, eyes: '#8A3A1E', outfit: '#6A2A1E', trim: '#F0A030', acc: 'bandana', accColor: '#B8322C' }),
  h('nerissa', 'Нерисса', 'Nerissa', 'archer', 'water', 'R',
    { ru: 'Гарпунщица', en: 'Harpooner' },
    { ru: 'Охотница на морских чудищ с арбалетом-гарпуном.', en: 'A sea-monster hunter with a harpoon crossbow.' },
    { ru: 'Клюёт!', en: "Got a bite!" },
    { hair: '#3A6A8A', style: 'short', skin: SK.tan, eyes: '#6FD0E0', outfit: '#2E4A5A', trim: '#6FD0E0', acc: 'none' }),
  h('aurora', 'Аврора', 'Aurora', 'archer', 'light', 'UR',
    { ru: 'Лучница рассвета', en: 'Dawn Archer' },
    { ru: 'Последняя из небесных стрелков Трона. Её лук сплетён из первого луча солнца.', en: 'The last of the Throne\'s sky archers. Her bow is woven from the first ray of the sun.' },
    { ru: 'Свет всегда находит цель.', en: 'Light always finds its mark.' },
    { hair: '#FFE8A0', style: 'long', skin: SK.fair, eyes: '#F2D46B', outfit: '#F2F0E6', trim: '#E0A13A', acc: 'halo', accColor: '#FFE8A0', extra: 'wings' }),
  h('veyla', 'Вейла', 'Veyla', 'archer', 'dark', 'SSR',
    { ru: 'Ночная охотница', en: 'Night Huntress' },
    { ru: 'Тёмная эльфийка, стреляющая только в безлунные ночи. Промахов не бывает.', en: 'A dark elf who shoots only on moonless nights. She never misses.' },
    { ru: 'Ночь — мой колчан.', en: 'The night is my quiver.' },
    { hair: '#C8C0E0', style: 'ponytail', skin: SK.ash, eyes: '#E03A3A', outfit: '#2A2238', trim: '#9B4DE0', acc: 'elfEars' }),

  // ——— Волшебницы ———
  h('flora', 'Флора', 'Flora', 'sorceress', 'nature', 'R',
    { ru: 'Травница', en: 'Herbalist' },
    { ru: 'Юная травница, чьи заклинания пахнут мятой и грозой.', en: 'A young herbalist whose spells smell of mint and thunder.' },
    { ru: 'Сейчас распустится!', en: "It's about to bloom!" },
    { hair: '#7AC05A', style: 'bob', skin: SK.fair, eyes: '#4E9A3C', outfit: '#5A7A3A', trim: '#F2E6D8', acc: 'flower', accColor: '#F2D46B' }),
  h('celestine', 'Селестина', 'Celestine', 'sorceress', 'light', 'SSR',
    { ru: 'Звездочёт', en: 'Stargazer' },
    { ru: 'Астромантка, читающая судьбы по звёздам и роняющая их на головы врагов.', en: 'An astromancer who reads fate in the stars and drops them on enemy heads.' },
    { ru: 'Звёзды сегодня на нашей стороне.', en: 'The stars favor us tonight.' },
    { hair: '#E6D8FF', style: 'long', skin: SK.fair, eyes: '#F2D46B', outfit: '#2E2A5A', trim: '#F2D46B', acc: 'tiara', accColor: '#F2D46B' }),
  h('melisandre', 'Мелисандра', 'Melisandre', 'sorceress', 'dark', 'SR',
    { ru: 'Теневая ведьма', en: 'Shadow Witch' },
    { ru: 'Ведьма, заключившая сделку с собственной тенью. Иногда тень колдует за неё.', en: 'A witch who made a pact with her own shadow. Sometimes the shadow casts for her.' },
    { ru: 'Моя тень голодна.', en: 'My shadow is hungry.' },
    { hair: '#5A2A6A', style: 'long', skin: SK.pale, eyes: '#C04AE0', outfit: '#2A1E36', trim: '#9B4DE0', acc: 'witchHat', accColor: '#1E1428' }),

  // ——— Жрицы ———
  h('amber', 'Эмбер', 'Amber', 'priestess', 'fire', 'R',
    { ru: 'Хранительница очага', en: 'Hearthkeeper' },
    { ru: 'Жрица очага, согревающая раненых тёплым светом свечей.', en: 'A priestess of the hearth who warms the wounded with candlelight.' },
    { ru: 'Погрейся, всё будет хорошо.', en: "Warm yourself, it'll be alright." },
    { hair: '#C06A2A', style: 'bun', skin: SK.light, eyes: '#E0A13A', outfit: '#F2E6D8', trim: '#E0532A', acc: 'veil', accColor: '#F2E6D8' }),
  h('liana', 'Лиана', 'Liana', 'priestess', 'nature', 'SR',
    { ru: 'Дриада-целительница', en: 'Dryad Healer' },
    { ru: 'Молодая дриада, сбежавшая от одержимой матриархи. Лечит соком древнего дерева.', en: 'A young dryad who fled her possessed matriarch. She heals with ancient tree sap.' },
    { ru: 'Лес помнит добро.', en: 'The forest remembers kindness.' },
    { hair: '#4FBF5A', style: 'long', skin: SK.green, eyes: '#F2D46B', outfit: '#3F6B34', trim: '#A9D19A', acc: 'flower', accColor: '#F4B8CC', extra: 'vines' }),
  h('seraphina', 'Серафина', 'Seraphina', 'priestess', 'light', 'UR',
    { ru: 'Серафим', en: 'Seraph' },
    { ru: 'Серафим Небесного Трона, единственная, кто не пал вместе с ним.', en: 'A seraph of the Celestial Throne, the only one who did not fall with it.' },
    { ru: 'Небеса ещё не оставили вас.', en: 'Heaven has not forsaken you yet.' },
    { hair: '#FFF2C0', style: 'long', skin: SK.fair, eyes: '#5AA0E0', outfit: '#FFFFFF', trim: '#E0A13A', acc: 'halo', accColor: '#FFE8A0', extra: 'wings' }),
  h('ophelia', 'Офелия', 'Ophelia', 'priestess', 'dark', 'SR',
    { ru: 'Сестра скорби', en: 'Sister of Sorrow' },
    { ru: 'Монахиня ордена Скорби, лечащая через боль. Её раны заживают чужие.', en: 'A nun of the Order of Sorrow who heals through pain. Her wounds mend others.' },
    { ru: 'Отдай мне свою боль.', en: 'Give me your pain.' },
    { hair: '#3A3050', style: 'long', skin: SK.pale, eyes: '#8A6AC0', outfit: '#1E1A26', trim: '#E6E0F0', acc: 'veil', accColor: '#1E1A26' }),

  // ——— Некромантки ———
  h('ash', 'Эш', 'Ash', 'necromancer', 'fire', 'R',
    { ru: 'Пепельная дева', en: 'Ash Maiden' },
    { ru: 'Некромантка из сгоревшей деревни, поднимающая духов пепла.', en: 'A necromancer from a burned village who raises spirits of ash.' },
    { ru: 'Из пепла — к бою.', en: 'From ashes to battle.' },
    { hair: '#8A8A8A', style: 'short', skin: SK.pale, eyes: '#F08A24', outfit: '#3A2A2A', trim: '#F08A24', acc: 'hood', accColor: '#3A2A2A' }),
  h('belladonna', 'Белладонна', 'Belladonna', 'necromancer', 'nature', 'SSR',
    { ru: 'Ядовитый сад', en: 'Poison Garden' },
    { ru: 'Хозяйка ядовитого сада, где каждый цветок когда-то был чьим-то врагом.', en: 'Mistress of a poison garden where every flower was once someone\'s enemy.' },
    { ru: 'Удобрение для моих роз.', en: 'Fertilizer for my roses.' },
    { hair: '#6A2A5A', style: 'twintails', skin: SK.pale, eyes: '#7AC05A', outfit: '#2A3A2A', trim: '#9B4DE0', acc: 'flower', accColor: '#9B4DE0' }),
  h('undine', 'Ундина', 'Undine', 'necromancer', 'water', 'SR',
    { ru: 'Утопленница', en: 'Drowned Maiden' },
    { ru: 'Утонувшая в Затонувшем храме жрица, вернувшаяся повелевать утопленниками.', en: 'A priestess drowned in the Sunken Temple, returned to command the drowned.' },
    { ru: 'Глубина зовёт.', en: 'The deep is calling.' },
    { hair: '#3A8A9A', style: 'long', skin: SK.blue, eyes: '#CFEFFF', outfit: '#1E3A4A', trim: '#6FD0E0', acc: 'veil', accColor: '#3A6A8A' }),
  h('elegy', 'Элегия', 'Elegy', 'necromancer', 'light', 'R',
    { ru: 'Проводница душ', en: 'Soul Guide' },
    { ru: 'Некромантка света, провожающая заблудшие души к покою.', en: 'A light necromancer who guides lost souls to rest.' },
    { ru: 'Ступай с миром… после боя.', en: 'Go in peace… after the battle.' },
    { hair: '#F2F0E6', style: 'bob', skin: SK.fair, eyes: '#F2D46B', outfit: '#E6E0D0', trim: '#C0A060', acc: 'halo', accColor: '#F2E6D8' }),

  // ——— Ассасины ———
  h('scarlet', 'Скарлет', 'Scarlet', 'assassin', 'fire', 'SR',
    { ru: 'Алая лиса', en: 'Scarlet Fox' },
    { ru: 'Воровка из Пепельного вулкана с лисьими ушками и огненными кинжалами.', en: 'A thief from the Ashen Volcano with fox ears and fiery daggers.' },
    { ru: 'Это уже моё!', en: "That's mine now!" },
    { hair: '#E0532A', style: 'twintails', skin: SK.fair, eyes: '#F0A030', outfit: '#3A1E1E', trim: '#E0532A', acc: 'catEars', accColor: '#E0532A' }),
  h('kana', 'Кана', 'Kana', 'assassin', 'water', 'R',
    { ru: 'Капля в тумане', en: 'Drop in the Mist' },
    { ru: 'Юная ниндзя-ученица, скрывающаяся в морском тумане.', en: 'A young ninja apprentice hiding in the sea mist.' },
    { ru: 'Меня здесь нет!', en: "I'm not here!" },
    { hair: '#2A3A6A', style: 'ponytail', skin: SK.fair, eyes: '#6FD0E0', outfit: '#1E2A3A', trim: '#3D9BE0', acc: 'bandana', accColor: '#3D9BE0' }),
  h('liora', 'Лиора', 'Liora', 'assassin', 'light', 'UR',
    { ru: 'Клинок рассвета', en: 'Blade of Dawn' },
    { ru: 'Карающий клинок Трона, охотящийся на осквернённых. Бьёт быстрее вспышки.', en: 'The Throne\'s avenging blade, hunting the corrupted. Strikes faster than a flash.' },
    { ru: 'Свет режет глубже.', en: 'Light cuts deeper.' },
    { hair: '#F2E3A0', style: 'ponytail', skin: SK.fair, eyes: '#E0A13A', outfit: '#E6E0D0', trim: '#E0A13A', acc: 'mask', accColor: '#F2F0E6' }),

  // ——— Барды ———
  h('carmen', 'Кармен', 'Carmen', 'bard', 'fire', 'SSR',
    { ru: 'Огненная танцовщица', en: 'Fire Dancer' },
    { ru: 'Танцовщица с кастаньетами, чья музыка разжигает пламя в сердцах.', en: 'A castanet dancer whose music kindles fire in hearts.' },
    { ru: 'Танцуем до последнего врага!', en: 'We dance until the last foe!' },
    { hair: '#2A1E1E', style: 'long', skin: SK.tan, eyes: '#E0532A', outfit: '#B8322C', trim: '#E0A13A', acc: 'flower', accColor: '#E03A3A' }),
  h('melody', 'Мелоди', 'Melody', 'bard', 'nature', 'R',
    { ru: 'Лесная флейтистка', en: 'Forest Flutist' },
    { ru: 'Пастушка, чья флейта заставляет деревья пританцовывать.', en: 'A shepherdess whose flute makes the trees dance.' },
    { ru: 'Слышите? Лес поёт с нами!', en: 'Hear that? The forest sings with us!' },
    { hair: '#A0C060', style: 'twintails', skin: SK.fair, eyes: '#4E9A3C', outfit: '#6A8A4A', trim: '#F2E6D8', acc: 'flower', accColor: '#F2F0E6' }),
  h('lorelei', 'Лорелея', 'Lorelei', 'bard', 'water', 'SSR',
    { ru: 'Сирена скал', en: 'Siren of the Cliffs' },
    { ru: 'Сирена, отказавшаяся топить корабли. Теперь её песнь топит только врагов.', en: 'A siren who refused to sink ships. Now her song drowns only enemies.' },
    { ru: 'Послушай мою песню…', en: 'Listen to my song…' },
    { hair: '#6FB0E0', style: 'long', skin: SK.fair, eyes: '#3D7BE0', outfit: '#2E5A7A', trim: '#CFEFFF', acc: 'tiara', accColor: '#F2F0E6' }),
  h('echo', 'Эхо', 'Echo', 'bard', 'dark', 'SR',
    { ru: 'Голос пустоты', en: 'Voice of the Void' },
    { ru: 'Бард, укравшая голос у демона. Поёт двумя голосами сразу.', en: 'A bard who stole her voice from a demon. She sings in two voices at once.' },
    { ru: 'Я… я… повторю ещё раз.', en: "I'll… I'll… say it again." },
    { hair: '#4A3A6A', style: 'bob', skin: SK.pale, eyes: '#C04AE0', outfit: '#2A2238', trim: '#E6E0F0', acc: 'none' }),

  // ——— Владычицы (боссы актов, играбельны с Кошмара) ———
  h('sylvana', 'Сильвана', 'Sylvana', 'priestess', 'nature', 'UR',
    { ru: 'Дриада-матриарх', en: 'Dryad Matriarch' },
    { ru: 'Владычица Изумрудной опушки. Освобождённая от осколка Печати, вновь лечит лес, а не губит его.', en: 'Sovereign of the Emerald Glade. Freed from the Seal shard, she heals the forest again instead of blighting it.' },
    { ru: 'Лес снова дышит. Благодарю, Командор.', en: 'The forest breathes again. Thank you, Commander.' },
    { hair: '#3F8A34', style: 'wild', skin: SK.green, eyes: '#F2D46B', outfit: '#2F5A2A', trim: '#C0A060', acc: 'crown', accColor: '#8C6A3A', extra: 'vines' }, true),
  h('nefertari', 'Нефертари', 'Nefertari', 'sorceress', 'fire', 'UR',
    { ru: 'Песчаная королева', en: 'Sand Queen' },
    { ru: 'Владычица Пустыни миражей, повелевающая песчаными бурями.', en: 'Sovereign of the Desert of Mirages who commands sandstorms.' },
    { ru: 'Пески помнят каждого.', en: 'The sands remember everyone.' },
    { hair: '#1E1A1A', style: 'bob', skin: SK.tan, eyes: '#E0A13A', outfit: '#E6D0A0', trim: '#3D7BE0', acc: 'crown', accColor: '#E0A13A', extra: 'snake' }, true),
  h('skadi', 'Скади', 'Skadi', 'archer', 'water', 'UR',
    { ru: 'Зимняя императрица', en: 'Winter Empress' },
    { ru: 'Владычица Ледяного пика, охотница, чьи стрелы замораживают кровь.', en: 'Sovereign of the Frozen Peak, a huntress whose arrows freeze blood.' },
    { ru: 'Зима пришла за вами.', en: 'Winter has come for you.' },
    { hair: '#E6F2FF', style: 'long', skin: SK.pale, eyes: '#6FD0FF', outfit: '#E6F2FF', trim: '#3D7BE0', acc: 'crown', accColor: '#CFEFFF' }, true),
  h('thalassia', 'Талассия', 'Thalassia', 'necromancer', 'water', 'UR',
    { ru: 'Морская ведьма', en: 'Sea Witch' },
    { ru: 'Владычица Затонувшего храма, повелительница утопленников и кракенов.', en: 'Sovereign of the Sunken Temple, mistress of the drowned and the krakens.' },
    { ru: 'Море заберёт своё.', en: 'The sea claims its own.' },
    { hair: '#2E7A8A', style: 'wild', skin: SK.blue, eyes: '#F2D46B', outfit: '#1E3A4A', trim: '#6FD0E0', acc: 'tiara', accColor: '#6FD0E0', extra: 'fishTail' }, true),
  h('carmilla', 'Кармилла', 'Carmilla', 'berserker', 'dark', 'UR',
    { ru: 'Графиня', en: 'The Countess' },
    { ru: 'Владычица Проклятого города, вампиресса с безупречными манерами и бездонной жаждой.', en: 'Sovereign of the Cursed City, a vampiress of flawless manners and bottomless thirst.' },
    { ru: 'Какой изысканный вкус у вашей крови.', en: 'Your blood has such refined taste.' },
    { hair: '#1E1420', style: 'long', skin: SK.pale, eyes: '#E03A3A', outfit: '#3A0E1A', trim: '#E03A3A', acc: 'tiara', accColor: '#B8322C', extra: 'darkWings' }, true),
  h('ifrita', 'Ифрита', 'Ifrita', 'berserker', 'fire', 'UR',
    { ru: 'Королева пламени', en: 'Flame Queen' },
    { ru: 'Владычица Пепельного вулкана, чьё дыхание плавит камень.', en: 'Sovereign of the Ashen Volcano whose breath melts stone.' },
    { ru: 'Гори ярче!', en: 'Burn brighter!' },
    { hair: '#FF7A2A', style: 'wild', skin: SK.tan, eyes: '#FFE040', outfit: '#3A1E1E', trim: '#FF7A2A', acc: 'horns', accColor: '#2A1E1E', extra: 'tail' }, true),
  h('brunhilde', 'Брунгильда', 'Brunhilde', 'guardian', 'light', 'UR',
    { ru: 'Падшая валькирия', en: 'Fallen Valkyrie' },
    { ru: 'Владычица Небесного архипелага, первая из валькирий, снова поднявшая крылья.', en: 'Sovereign of the Sky Archipelago, first of the valkyries to raise her wings again.' },
    { ru: 'Легион снова в строю.', en: 'The Legion stands once more.' },
    { hair: '#F2E3A0', style: 'braid', skin: SK.fair, eyes: '#5AA0E0', outfit: '#C0C8D8', trim: '#E0A13A', acc: 'helmet', accColor: '#E0E6F0', extra: 'wings' }, true),
  h('aegis', 'Эгида', 'Aegis', 'archer', 'light', 'UR',
    { ru: 'Механическая императрица', en: 'Mechanical Empress' },
    { ru: 'Владычица Механической цитадели, чьё сердце — часовой механизм древних гномов.', en: 'Sovereign of the Mechanical Citadel whose heart is an ancient gnomish clockwork.' },
    { ru: 'Расчёт траектории завершён.', en: 'Trajectory calculated.' },
    { hair: '#C0C8D0', style: 'bob', skin: SK.fair, eyes: '#40E0FF', outfit: '#6A6A7A', trim: '#E0A13A', acc: 'tiara', accColor: '#E0A13A', extra: 'gears' }, true),
  h('morrigan', 'Морриган', 'Morrigan', 'necromancer', 'dark', 'UR',
    { ru: 'Лич-королева', en: 'Lich Queen' },
    { ru: 'Владычица Лунного некрополя, королева, пережившая собственную смерть.', en: 'Sovereign of the Lunar Necropolis, a queen who outlived her own death.' },
    { ru: 'Смерть — лишь начало моего правления.', en: 'Death is merely the start of my reign.' },
    { hair: '#C8C0E0', style: 'long', skin: SK.ash, eyes: '#6FFFD0', outfit: '#1E1A2A', trim: '#6FFFD0', acc: 'crown', accColor: '#6A6A7A' }, true),
  h('nyx', 'Никта', 'Nyx', 'sorceress', 'dark', 'UR',
    { ru: 'Богиня Хаоса', en: 'Goddess of Chaos' },
    { ru: 'Первая валькирия, преданная Небесным Троном. Её гнев расколол мир — но её история ещё не закончена.', en: 'The first valkyrie, betrayed by the Celestial Throne. Her wrath shattered the world — but her story is not over.' },
    { ru: 'Вы все — лишь отражения моей боли.', en: 'You are all mere reflections of my pain.' },
    { hair: '#1A1024', style: 'long', skin: SK.ash, eyes: '#E040FF', outfit: '#120A1A', trim: '#E040FF', acc: 'halo', accColor: '#6A1E8A', extra: 'darkWings' }, true),
];

/** Вестницы Эфира — по одной на стихию. */
HEROINES.push(
  {
    ...h('flamma', 'Фламма', 'Flamma', 'berserker', 'fire', 'UR',
      { ru: 'Вестница Пламени', en: 'Herald of Flame' },
      { ru: 'Танцовщица пепельных храмов. Её пляска разжигает Кристалл Эфира — и сердца тех, кто на неё смотрит.', en: 'A dancer of the ashen temples. Her dance kindles the Aether Crystal — and the hearts of all who watch.' },
      { ru: 'Смотри внимательно, Командор. Второй раз я так не станцую.', en: 'Watch closely, Commander. I won\'t dance like this twice.' },
      { hair: '#FF6A2A', style: 'wild', skin: SK.tan, eyes: '#FFD24A', outfit: '#C0301E', trim: '#F2C84A', acc: 'horns', accColor: '#2A1616', extra: 'tail', wear: 'dancer' }),
    herald: true,
  },
  {
    ...h('maristella', 'Маристелла', 'Maristella', 'bard', 'water', 'UR',
      { ru: 'Вестница Прилива', en: 'Herald of the Tide' },
      { ru: 'Сирена, что поёт волнам колыбельную. Прилив приходит, когда она зовёт, и уходит, когда она смеётся.', en: 'A siren who sings lullabies to the waves. The tide comes when she calls and leaves when she laughs.' },
      { ru: 'Слышишь? Это море поёт со мной.', en: 'Hear that? The sea is singing with me.' },
      { hair: '#4AD0F0', style: 'long', skin: SK.fair, eyes: '#2A8AE0', outfit: '#1E6AB0', trim: '#E6F6FF', acc: 'tiara', accColor: '#9FE0FF', extra: 'none', wear: 'dancer' }),
    herald: true,
  },
  {
    ...h('sylphide', 'Сильфида', 'Sylphide', 'archer', 'nature', 'UR',
      { ru: 'Вестница Ветров', en: 'Herald of the Winds' },
      { ru: 'Фея-лучница с крыльями из утреннего света. Её стрелы летят быстрее ветра, а наряда на ней меньше, чем листьев на ветке.', en: 'A fairy archer with wings of morning light. Her arrows outpace the wind, and she wears less than a branch has leaves.' },
      { ru: 'Лови ветер — если сможешь!', en: 'Catch the wind — if you can!' },
      { hair: '#9AE05A', style: 'twintails', skin: SK.fair, eyes: '#3FBF5A', outfit: '#2F8A34', trim: '#F2E6A0', acc: 'flower', accColor: '#F4B8CC', extra: 'wings', wear: 'swim' }),
    herald: true,
  },
  {
    ...h('aurelia', 'Аурелия', 'Aurelia', 'guardian', 'light', 'UR',
      { ru: 'Вестница Рассвета', en: 'Herald of Dawn' },
      { ru: 'Золотая валькирия небесного трона. Её латы — скорее украшение, чем защита: свет хранит её лучше стали.', en: 'The golden valkyrie of the celestial throne. Her armor is more jewelry than protection: light guards her better than steel.' },
      { ru: 'Рассвет приходит ко всем. Даже к тебе.', en: 'Dawn comes for everyone. Even for you.' },
      { hair: '#FFE08A', style: 'long', skin: SK.fair, eyes: '#F2A020', outfit: '#E6B23A', trim: '#FFFFFF', acc: 'halo', accColor: '#FFE8A0', extra: 'wings', wear: 'regalia' }),
    herald: true,
  },
  {
    ...h('nocturna', 'Ноктюрна', 'Nocturna', 'assassin', 'dark', 'UR',
      { ru: 'Вестница Сумрака', en: 'Herald of Dusk' },
      { ru: 'Суккуба-убийца, связанная ремнями и клятвами. Приходит в полночь и уходит, забрав самое ценное — обычно чью-то голову.', en: 'A succubus assassin bound by straps and oaths. She comes at midnight and leaves with what is most precious — usually a head.' },
      { ru: 'Не бойся темноты, милый. Бойся меня в ней.', en: 'Don\'t fear the dark, darling. Fear me in it.' },
      { hair: '#2A1438', style: 'long', skin: SK.pale, eyes: '#FF3A8A', outfit: '#1A0E1E', trim: '#E03A8A', acc: 'horns', accColor: '#3A1E3A', extra: 'darkWings', wear: 'regalia' }),
    herald: true,
  },
);

export const HERALDS = HEROINES.filter((x) => x.herald);
export const HERALD_BY_ELEMENT: Record<Element, string> = Object.fromEntries(HERALDS.map((x) => [x.element, x.id])) as Record<Element, string>;

export const HEROINE_MAP: Record<string, HeroineDef> = Object.fromEntries(HEROINES.map((x) => [x.id, x]));

/** Пул призыва — только обычные героини (владычицы — через Кошмар). */
export const SUMMON_POOL: Record<HeroRarity, string[]> = { R: [], SR: [], SSR: [], UR: [] };
for (const x of HEROINES) if (!x.boss && !x.herald) SUMMON_POOL[x.rarity].push(x.id);

/** Стартовые героини: Лира выдаётся в обучении. */
export const STARTER_HEROINES = ['lira', 'coral', 'seyra', 'hanna'];

/** Облики (скины): +3% к статам, альтернативная палитра. */
export interface SkinDef {
  id: string;
  hero: string;
  name: L10n;
  look: Partial<Look>;
  source: 'shop' | 'tower' | 'labyrinth' | 'pass' | 'event' | 'arena';
  /** Цена в магазине обликов (кристаллы). */
  crystals?: number;
  /** Коллекция: летние купальники или бельё. */
  set?: 'summer' | 'lingerie';
}

export const SKINS: SkinDef[] = [
  { id: 'lira_summer', hero: 'lira', name: { ru: 'Летний фестиваль', en: 'Summer Festival' }, look: { outfit: '#F2E6D8', trim: '#E0532A', acc: 'flower', accColor: '#F08A24' }, source: 'shop', crystals: 1500 },
  { id: 'lira_crimson', hero: 'lira', name: { ru: 'Багровая ведьма', en: 'Crimson Witch' }, look: { hair: '#B8322C', outfit: '#1E1420', trim: '#E03A3A' }, source: 'pass' },
  { id: 'astrid_night', hero: 'astrid', name: { ru: 'Ночная стража', en: 'Night Watch' }, look: { outfit: '#2A2E3A', trim: '#6FD0E0', hair: '#E0E6F0' }, source: 'shop', crystals: 2500 },
  { id: 'nox_bunny', hero: 'nox', name: { ru: 'Лунный кролик', en: 'Moon Rabbit' }, look: { acc: 'catEars', accColor: '#EDEAF2', outfit: '#3A2E4A' }, source: 'shop', crystals: 3000 },
  { id: 'velvet_bride', hero: 'velvet', name: { ru: 'Призрачная невеста', en: 'Ghost Bride' }, look: { outfit: '#E6E0F0', trim: '#9B4DE0', accColor: '#F2F0E6' }, source: 'shop', crystals: 4000 },
  { id: 'isolde_spring', hero: 'isolde', name: { ru: 'Весенняя оттепель', en: 'Spring Thaw' }, look: { outfit: '#6FB07A', trim: '#F4B8CC', hair: '#F4E0F0' }, source: 'shop', crystals: 4000 },
  { id: 'mirabel_pearl', hero: 'mirabel', name: { ru: 'Жемчужная', en: 'Pearl' }, look: { outfit: '#F2E0F0', trim: '#F2F0E6' }, source: 'tower' },
  { id: 'keira_winter', hero: 'keira', name: { ru: 'Зимняя руна', en: 'Winter Rune' }, look: { hair: '#E0E6F0', outfit: '#3A4A6A', trim: '#6FD0E0' }, source: 'tower' },
  { id: 'seyra_autumn', hero: 'seyra', name: { ru: 'Осенний лист', en: 'Autumn Leaf' }, look: { outfit: '#8A4A1E', trim: '#F08A24', accColor: '#8A4A1E' }, source: 'tower' },
  { id: 'hanna_star', hero: 'hanna', name: { ru: 'Звезда сцены', en: 'Stage Star' }, look: { outfit: '#9B4DE0', trim: '#F2D46B' }, source: 'labyrinth' },
  { id: 'rin_night', hero: 'rin', name: { ru: 'Ночная сакура', en: 'Night Sakura' }, look: { outfit: '#1E1A2A', trim: '#E890B0', hair: '#F2F0E6' }, source: 'labyrinth' },
  { id: 'aurora_eclipse', hero: 'aurora', name: { ru: 'Затмение', en: 'Eclipse' }, look: { outfit: '#1E1A2A', trim: '#F2D46B', hair: '#2A2036' }, source: 'shop', crystals: 4000 },
  { id: 'seraphina_dark', hero: 'seraphina', name: { ru: 'Падший серафим', en: 'Fallen Seraph' }, look: { outfit: '#1E1420', trim: '#E03A3A', hair: '#EDEAF2', extra: 'darkWings' }, source: 'event' },
  { id: 'lilith_maid', hero: 'lilith', name: { ru: 'Горничная ада', en: 'Infernal Maid' }, look: { outfit: '#1E1A1A', trim: '#F2F0E6' }, source: 'shop', crystals: 3000 },
  { id: 'liora_sun', hero: 'liora', name: { ru: 'Полдень', en: 'High Noon' }, look: { outfit: '#F2D46B', trim: '#FFFFFF' }, source: 'arena' },
  { id: 'carmen_noir', hero: 'carmen', name: { ru: 'Нуар', en: 'Noir' }, look: { outfit: '#1E1A1A', trim: '#E03A3A' }, source: 'labyrinth' },
  { id: 'celestine_nova', hero: 'celestine', name: { ru: 'Сверхновая', en: 'Supernova' }, look: { outfit: '#F2F0E6', trim: '#9B4DE0' }, source: 'tower' },
  { id: 'lorelei_coral', hero: 'lorelei', name: { ru: 'Коралловый риф', en: 'Coral Reef' }, look: { outfit: '#E07A6A', trim: '#F2E6D8' }, source: 'arena' },
  { id: 'belladonna_rose', hero: 'belladonna', name: { ru: 'Чёрная роза', en: 'Black Rose' }, look: { outfit: '#1E1420', trim: '#E03A3A' }, source: 'event' },
  { id: 'sigrid_valk', hero: 'sigrid', name: { ru: 'Валькирия', en: 'Valkyrie' }, look: { outfit: '#C0C8D8', trim: '#E0A13A', acc: 'helmet', accColor: '#E0E6F0', extra: 'wings' }, source: 'pass' },
];

const SET_PRICE: Record<HeroRarity, number> = { R: 1200, SR: 1800, SSR: 2500, UR: 3500 };

type SetSkin = [hero: string, wear: Wear, acc: Accessory | null, outfit: string, trim: string, ru: string, en: string, accColor?: string];

/** Летняя коллекция: 20 купальников. */
const SUMMER: SetSkin[] = [
  ['lira', 'swim', 'sunHat', '#E0532A', '#F2E6D8', 'Пляжная ведьма', 'Beach Witch', '#E8C87A'],
  ['astrid', 'swim4', 'none', '#E03A3A', '#F2F0E6', 'Спасательница', 'Lifeguard'],
  ['seyra', 'swim2', 'flower', '#7ACF5A', '#F2F0E6', 'Лесная лагуна', 'Forest Lagoon', '#F4B8CC'],
  ['hanna', 'swim2', null, '#E03A6A', '#FFFFFF', 'Клубничный лёд', 'Strawberry Ice'],
  ['keira', 'swim3', null, '#E03A3A', '#F2D46B', 'Жаркий песок', 'Hot Sand'],
  ['coral', 'swim4', null, '#3D7BE0', '#F2E6D8', 'Морской бриз', 'Sea Breeze'],
  ['brianna', 'swim', 'sunHat', '#6FD0E0', '#F2E6D8', 'Бирюзовая волна', 'Turquoise Wave', '#E8C87A'],
  ['gwendolyn', 'swim2', null, '#E8641E', '#FFFFFF', 'Солнечный зайчик', 'Sunbeam'],
  ['ulfa', 'swim3', null, '#1E1A2A', '#F2D46B', 'Кошка на пляже', 'Beach Cat'],
  ['fiona', 'swim4', null, '#E0406A', '#6FD0E0', 'Серфингистка', 'Surfer'],
  ['nerissa', 'swim', 'flower', '#9B4DE0', '#F2E6D8', 'Лиловый закат', 'Lilac Sunset', '#F2D46B'],
  ['aurora', 'swim3', null, '#C8901A', '#F2F0E6', 'Золотой пляж', 'Golden Beach'],
  ['flora', 'swim2', null, '#7ACF5A', '#F4B8CC', 'Тропический цветок', 'Tropical Bloom'],
  ['amber', 'swim', 'sunHat', '#F08A24', '#FFFFFF', 'Янтарный берег', 'Amber Shore', '#E8C87A'],
  ['liana', 'swim3', null, '#E0532A', '#F2D46B', 'Джунгли', 'Jungle'],
  ['kana', 'swim4', null, '#1E1A2A', '#E03A3A', 'Ночной пляж', 'Night Beach'],
  ['melody', 'swim2', null, '#6FB0F0', '#FFFFFF', 'Морская пена', 'Sea Foam'],
  ['echo', 'swim', 'sunHat', '#E03A6A', '#F2E6D8', 'Пина-колада', 'Piña Colada', '#E8C87A'],
  ['carmen', 'swim3', null, '#E03A3A', '#1E1A1A', 'Фламенко у моря', 'Seaside Flamenco'],
  ['lorelei', 'swim2', null, '#6FD0E0', '#F2F0E6', 'Жемчужина лагуны', 'Lagoon Pearl'],
];

/** Коллекция «Будуар»: 20 комплектов белья. */
const LINGERIE: SetSkin[] = [
  ['mirabel', 'lace2', null, '#9B4DE0', '#F2F0E6', 'Лавандовое кружево', 'Lavender Lace'],
  ['nox', 'lace4', 'bow', '#1E1A2A', '#9B4DE0', 'Полночь', 'Midnight', '#9B4DE0'],
  ['velvet', 'lace3', null, '#1E1420', '#9B4DE0', 'Чёрный шёлк', 'Black Silk'],
  ['isolde', 'lace2', null, '#3D7BE0', '#FFFFFF', 'Ледяной шёлк', 'Ice Silk'],
  ['rin', 'lace', null, '#E03A6A', '#1E1A2A', 'Сакура в будуаре', 'Boudoir Sakura'],
  ['ravenna', 'lace4', 'none', '#8A1E2A', '#F2D46B', 'Алый бархат', 'Crimson Velvet'],
  ['sigrid', 'lace', null, '#3A4A6A', '#F2F0E6', 'Северное сияние', 'Northern Lights'],
  ['valeska', 'lace3', null, '#E03A3A', '#1E1A1A', 'Роковая', 'Femme Fatale'],
  ['lilith', 'lace4', null, '#1E1A1A', '#E03A3A', 'Адское искушение', 'Infernal Temptation'],
  ['veyla', 'lace2', null, '#7ACF5A', '#F2E6D8', 'Лесная нимфа', 'Forest Nymph'],
  ['celestine', 'lace', null, '#9B4DE0', '#F2D46B', 'Звёздная ночь', 'Starry Night'],
  ['melisandre', 'lace3', null, '#2A1A2A', '#E890B0', 'Ночная ведьма', 'Night Witch'],
  ['seraphina', 'lace2', null, '#3D7BE0', '#F2D46B', 'Небесная лазурь', 'Heavenly Azure'],
  ['ophelia', 'lace', null, '#6A5AC8', '#E6E0F0', 'Лунное кружево', 'Moon Lace'],
  ['ash', 'lace4', 'none', '#3A3A4A', '#E03A3A', 'Пепел и шёлк', 'Ash & Silk'],
  ['belladonna', 'lace3', null, '#4A0E2A', '#E03A3A', 'Ядовитая роза', 'Poison Rose'],
  ['undine', 'lace2', null, '#3D7BE0', '#F2F0E6', 'Глубина', 'Deep Blue'],
  ['elegy', 'lace', null, '#1E1A2A', '#F2F0E6', 'Реквием', 'Requiem'],
  ['scarlet', 'lace4', null, '#E03A3A', '#1E1A1A', 'Алая кошка', 'Scarlet Cat'],
  ['liora', 'lace3', 'none', '#D49A1E', '#1E1A1A', 'Золотой час', 'Golden Hour'],
];

/**
 * Где добывается облик коллекции (кроме магазина за кристаллы, где продаются все).
 * 'shop' — эксклюзив магазина: только за кристаллы.
 */
const SET_SOURCE: Record<string, SkinDef['source']> = {
  lira_beach: 'shop', astrid_beach: 'shop', aurora_beach: 'shop', lorelei_beach: 'shop',
  velvet_lace: 'shop', isolde_lace: 'shop', lilith_lace: 'shop', seraphina_lace: 'shop',
  ulfa_beach: 'arena', kana_beach: 'arena', ravenna_lace: 'arena', valeska_lace: 'arena', scarlet_lace: 'arena',
  seyra_beach: 'labyrinth', flora_beach: 'labyrinth', liana_beach: 'labyrinth', melisandre_lace: 'labyrinth', ash_lace: 'labyrinth',
  nerissa_beach: 'event', echo_beach: 'event', belladonna_lace: 'event', undine_lace: 'event',
  coral_beach: 'tower', brianna_beach: 'tower', ophelia_lace: 'tower', elegy_lace: 'tower',
};

for (const [set, list] of [
  ['summer', SUMMER],
  ['lingerie', LINGERIE],
] as const)
  for (const [hero, wear, acc, outfit, trim, ru, en, accColor] of list) {
    const look: Partial<Look> = { wear, outfit, trim };
    if (acc) look.acc = acc;
    if (accColor) look.accColor = accColor;
    const id = `${hero}_${set === 'summer' ? 'beach' : 'lace'}`;
    const rarity = HEROINES.find((x) => x.id === hero)!.rarity;
    const source = SET_SOURCE[id] ?? 'pass';
    // эксклюзивы магазина чуть дороже
    const crystals = Math.round(SET_PRICE[rarity] * (source === 'shop' ? 1.4 : 1) / 100) * 100;
    SKINS.push({ id, hero, name: { ru, en }, look, source, crystals, set });
  }

export const SKIN_MAP: Record<string, SkinDef> = Object.fromEntries(SKINS.map((s) => [s.id, s]));
