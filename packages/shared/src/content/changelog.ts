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
