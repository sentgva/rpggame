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
  /** героиня (и облик) на карточке */
  art?: { hero: string; skin?: string };
  /** только главное: 2–3 пункта, без мелких правок и исправлений */
  items: L10n[];
}

/** Новые — первыми. id записи — это «версия», которую игрок уже видел. Мелкие правки и исправления сюда не пишем. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-01-summer',
    date: '01.10.2026',
    icon: '🏖️',
    title: { ru: 'Летний курорт и вечера у костра', en: 'Summer resort and campfire evenings' },
    lead: {
      ru: 'Летний праздник с бикини-коллекцией, разговоры героинь у огня и мастерство связок',
      en: 'A summer festival with a bikini collection, heroine talks by the fire and combo mastery',
    },
    color: '#ff9a3a',
    art: { hero: 'mirabel', skin: 'mirabel_summer' },
    items: [
      {
        ru: '👙 «Солнечный курорт»: бикини для всей шестёрки — в лавке и в финале шкалы; в купальнике волейбол идёт лучше',
        en: '👙 “Sun Resort”: bikinis for all six — in the shop and at the track finale; swimsuits improve volleyball',
      },
      {
        ru: '🔥 Вечер у костра: каждый день две героини спорят и шутят — поддержите одну или помирите обеих',
        en: '🔥 Campfire evening: every day two heroines argue and joke — back one or reconcile both',
      },
      {
        ru: '🔗 Мастерство связок: чем чаще героини играют в связке, тем она сильнее (до +80%)',
        en: '🔗 Combo mastery: the more heroines use a combo, the stronger it gets (up to +80%)',
      },
    ],
  },
  {
    id: '2026-10-01',
    date: '01.10.2026',
    icon: '⚔️',
    title: { ru: 'Перезапуск: Легион из шести', en: 'Relaunch: the Legion of Six' },
    lead: {
      ru: 'Без гачи: шесть героинь шести классов, связки в бою и ручное управление',
      en: 'No gacha: six heroines of six classes, combos in battle and manual control',
    },
    color: '#e0a13a',
    art: { hero: 'astrid' },
    items: [
      {
        ru: '🛡️ Рыцарь, Ассасин, Жрица, Следопыт, Колдунья и Охотница с волком — у каждой своё оружие и анимации',
        en: '🛡️ Knight, Assassin, Priestess, Ranger, Warlock and Hunter with her wolf — each with her own weapon and animations',
      },
      {
        ru: '🔗 Связки классов: метка одной героини усиливает удар другой; фирменные умения — по кнопке',
        en: '🔗 Class combos: one heroine’s mark empowers another’s strike; signature skills on a button',
      },
      {
        ru: '🎖️ Ранги за Эмблемы вместо призыва, героини присоединяются по ходу кампании',
        en: '🎖️ Ranks for Emblems instead of summoning; heroines join along the campaign',
      },
    ],
  },
];

export const CHANGELOG_LATEST = CHANGELOG[0].id;
