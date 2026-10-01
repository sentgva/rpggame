import type { L10n } from '../types';

/** Что нового: показывается один раз при входе после обновления, читается в лагере и в боте (/news). */
export interface ChangelogEntry {
  id: string;
  date: string;
  /** эмодзи обновления */
  icon: string;
  title: L10n;
  /** суть обновления одной фразой */
  lead: L10n;
  /** цвет карточки */
  color: string;
  /** герой (и облик) на карточке */
  art?: { hero: string; skin?: string };
  /** только главное: 2–3 пункта, без мелких правок и исправлений */
  items: L10n[];
}

/** Новые — первыми. id записи — это «версия», которую игрок уже видел. Мелкие правки и исправления сюда не пишем. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-03-fanservice',
    date: '03.10.2026',
    icon: '💗',
    title: { ru: 'Адъютант и модные дни', en: 'Adjutant and fashion days' },
    lead: {
      ru: 'Герой на главном экране лагеря, бонус за облик дня и новые купальники',
      en: 'A hero on the camp screen, a bonus for the outfit of the day and new swimsuits',
    },
    color: '#ff6a9a',
    art: { hero: 'lira', skin: 'lira_spark' },
    items: [
      {
        ru: '💗 Адъютант: выбери героя и наряд — он здоровается, болтает и смущается от касаний; касания дают близость',
        en: '💗 Adjutant: pick a hero and an outfit — they greet you, chat and blush when touched; touches give bond',
      },
      {
        ru: '👙 Модный день: в облике коллекции дня (пляж, будуар, маскарад) герои сильнее на 10%',
        en: '👙 Fashion day: heroes wearing the collection of the day (beach, boudoir, masquerade) are 10% stronger',
      },
      {
        ru: '✨ Купальники меньше и тоньше, новые позы, MVP после боя; Кассиан и Элиан стали милее и получили пляжные облики',
        en: '✨ Smaller, finer swimsuits, new poses, an MVP after battle; Cassian and Elian got cuter and got beach skins',
      },
    ],
  },
  {
    id: '2026-10-02-looks',
    date: '02.10.2026',
    icon: '💋',
    title: { ru: 'Новый облик Легиона', en: 'A new look for the Legion' },
    lead: {
      ru: 'Новые наряды героинь, два героя-красавчика и большая коллекция бикини и белья',
      en: 'New heroine outfits, two pretty-boy heroes and a big bikini and lingerie collection',
    },
    color: '#e0406a',
    art: { hero: 'keira', skin: 'keira_summer' },
    items: [
      {
        ru: '✨ Героини в новых нарядах: топы с вырезом, открытый живот, разрезы и чулки',
        en: '✨ Heroines in new outfits: plunging tops, bare midriffs, slits and stockings',
      },
      {
        ru: '🗡️ Рыцарь и следопыт теперь герои: Кассиан и Элиан — стройные красавчики',
        en: '🗡️ The Knight and the Ranger are now heroes: Cassian and Elian, slim pretty boys',
      },
      {
        ru: '👙 30+ новых обликов: бикини, «нитки», слингшоты, бельё и маскарад; на курорте — самые открытые',
        en: '👙 30+ new skins: bikinis, string sets, slingshots, lingerie and masquerade; the most daring ones at the resort',
      },
    ],
  },
  {
    id: '2026-10-01-summer',
    date: '01.10.2026',
    icon: '🏖️',
    title: { ru: 'Летний курорт и вечера у костра', en: 'Summer resort and campfire evenings' },
    lead: {
      ru: 'Летний праздник с бикини-коллекцией, разговоры у огня и мастерство связок',
      en: 'A summer festival with a bikini collection, talks by the fire and combo mastery',
    },
    color: '#ff9a3a',
    art: { hero: 'mirabel', skin: 'mirabel_summer' },
    items: [
      {
        ru: '👙 «Солнечный курорт»: купальники для всей шестёрки — в лавке и в финале шкалы; в купальнике волейбол идёт лучше',
        en: '👙 “Sun Resort”: swimwear for all six — in the shop and at the track finale; swimsuits improve volleyball',
      },
      {
        ru: '🔥 Вечер у костра: каждый день двое из Легиона спорят и шутят — поддержите одного или помирите обоих',
        en: '🔥 Campfire evening: every day two Legion members argue and joke — back one or reconcile both',
      },
      {
        ru: '🔗 Мастерство связок: чем чаще связка срабатывает, тем она сильнее (до +80%)',
        en: '🔗 Combo mastery: the more a combo is used, the stronger it gets (up to +80%)',
      },
    ],
  },
  {
    id: '2026-10-01',
    date: '01.10.2026',
    icon: '⚔️',
    title: { ru: 'Перезапуск: Легион из шести', en: 'Relaunch: the Legion of Six' },
    lead: {
      ru: 'Без гачи: шестеро героев шести классов, связки в бою и ручное управление',
      en: 'No gacha: six heroes of six classes, combos in battle and manual control',
    },
    color: '#e0a13a',
    art: { hero: 'cassian' },
    items: [
      {
        ru: '🛡️ Рыцарь, Ассасин, Жрица, Следопыт, Колдунья и Охотница с волком — у каждого своё оружие и анимации',
        en: '🛡️ Knight, Assassin, Priestess, Ranger, Warlock and Hunter with her wolf — each with their own weapon and animations',
      },
      {
        ru: '🔗 Связки классов: метка одного героя усиливает удар другого; фирменные умения — по кнопке',
        en: '🔗 Class combos: one hero’s mark empowers another’s strike; signature skills on a button',
      },
      {
        ru: '🎖️ Ранги за Эмблемы вместо призыва, герои присоединяются по ходу кампании',
        en: '🎖️ Ranks for Emblems instead of summoning; heroes join along the campaign',
      },
    ],
  },
];

export const CHANGELOG_LATEST = CHANGELOG[0].id;
