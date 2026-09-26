import type { L10n } from '../types';

/** Что нового: показывается один раз при входе после обновления, читается в лагере и в боте (/news). */
export interface ChangelogEntry {
  id: string;
  date: string;
  title: L10n;
  items: L10n[];
}

/** Новые — первыми. id записи — это «версия», которую игрок уже видел. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-09-26c',
    date: '26.09.2026',
    title: { ru: 'Сокровищница Эфира', en: 'The Aether Vault' },
    items: [
      { ru: '🔮 Артефакты — отдельная вкладка в Призыве: 12 механик для всего отряда (молнии, метки, остановка времени, возрождение, рог Валькирии…)', en: '🔮 Artifacts — a separate tab in Summon: 12 party-wide mechanics (lightning, marks, stopped time, revival, the Valkyrie Horn…)' },
      { ru: '⭐ Дубликаты повышают уровень артефакта до 5; 2 слота в отряде, третий — с 40 уровня аккаунта; бесплатный призыв раз в день', en: '⭐ Duplicates level artifacts up to 5; 2 party slots, a third from account level 40; one free pull a day' },
      { ru: '⚖️ Числа скромные: артефакты разнообразят бой, но не заменяют прокачку', en: '⚖️ Modest numbers: artifacts add variety but don\'t replace progression' },
      { ru: '✨ Новая анимация призыва: магический круг, звездопад цвета находок, вспышка и прожектор для SSR/UR', en: '✨ New summon animation: magic circle, starfall in the colours of your finds, a flash and a spotlight for SSR/UR' },
      { ru: '🏠 В «Уходе» — нарисованные фоны: лагерь, источники, комнаты резиденции и места свиданий', en: '🏠 Care now has drawn backgrounds: camp, hot springs, residence rooms and date places' },
    ],
  },
  {
    id: '2026-09-26b',
    date: '26.09.2026',
    title: { ru: 'Резиденция героинь', en: 'The heroines\' residence' },
    items: [
      { ru: '🏠 В «Уходе» — Резиденция: гостиная, кухня, ванная и спальня. Обустраивай и улучшай комнаты до 5 уровня', en: '🏠 Residence in Care: living room, kitchen, bathroom and bedroom. Build and upgrade rooms up to level 5' },
      { ru: '🛋️ Гостиная и 🍳 кухня усиливают разговоры и угощения (+15% близости за уровень)', en: '🛋️ The living room and 🍳 kitchen boost talks and treats (+15% bond per level)' },
      { ru: '🛁 Ванна — раз в день для каждой героини, пена до подбородка', en: '🛁 Bath — once a day per heroine, foam up to the chin' },
      { ru: '🌙 Ночёвка в спальне — с близости 5, одна героиня за ночь: пижама, одеяло и утренний подарок (золото и опыт)', en: '🌙 Sleepover in the bedroom — from bond 5, one heroine per night: pajamas, a blanket and a morning gift (gold and XP)' },
    ],
  },
  {
    id: '2026-09-26',
    date: '26.09.2026',
    title: { ru: 'Близость и уход за героинями', en: 'Bonds and heroine care' },
    items: [
      { ru: '💞 Новый режим «Уход» в лагере: UR-героини — разговоры, угощения, горячие источники и свидания', en: '💞 New "Care" mode in the camp: talk, treats, hot springs and dates with UR heroines' },
      { ru: '❤ Близость до 10 уровня: каждая ступень усиливает героиню, на пиках — кристаллы и осколки', en: '❤ Bond up to level 10: every step strengthens the heroine, milestones give crystals and shards' },
      { ru: '👘 Особые наряды близости: юката, вечернее платье и шёлковая пижама — только за Близость 10 и Сердца Эфира', en: '👘 Bond outfits: yukata, evening gown and silk sleepwear — only for Bond 10 and Aether Hearts' },
      { ru: '💗 Сердца Эфира: Разлом (ярус 8+), Нашествие (каждые 25 волн), испытания Башни, Шпили (каждые 25 этажей)', en: '💗 Aether Hearts: Rift (tier 8+), Horde (every 25 waves), Tower challenges, Spires (every 25 floors)' },
      { ru: '📰 Этот список изменений — при входе, в лагере и в боте (/news)', en: '📰 This changelog — on login, in the camp and in the bot (/news)' },
      { ru: '📱 Исправлено: в полноэкранном Telegram кнопки «✕» и «•••» закрывали верхнюю панель', en: '📱 Fixed: in fullscreen Telegram the "✕" and "•••" buttons covered the top bar' },
    ],
  },
  {
    id: '2026-09-25b',
    date: '25.09.2026',
    title: { ru: 'Живые бои', en: 'Live battles' },
    items: [
      { ru: '⚡ Ручные ульты в боях с боссами и в режимах: жми на портрет с полной шкалой', en: '⚡ Manual ultimates in boss fights and modes: tap a portrait with a full ring' },
      { ru: '💥 Сокрушительный удар боссов — собьёшь ультой или оглушением, иначе больно', en: '💥 Bosses charge a Crushing Blow — interrupt it with an ultimate or a stun' },
      { ru: '❗ Встречи: сундук или мимик, торговка, алтарь, путница, игрок в кости, засада', en: '❗ Encounters: chest or mimic, merchant, shrine, traveler, dice gambler, ambush' },
      { ru: '🐞 Исправлено: Нашествие давало слишком много золота', en: '🐞 Fixed: the Horde paid far too much gold' },
    ],
  },
  {
    id: '2026-09-25a',
    date: '25.09.2026',
    title: { ru: 'Маскарад и новенькие', en: 'Masquerade and newcomers' },
    items: [
      { ru: '✨ 5 новых героинь: Зарина, Юки, Мелюзина, Роксана и Тамамо', en: '✨ 5 new heroines: Zarina, Yuki, Melusine, Roxana and Tamamo' },
      { ru: '🐰 Коллекция «Маскарад»: 15 обликов — кролики, горничные и не только', en: '🐰 Masquerade collection: 15 skins — bunnies, maids and more' },
      { ru: '🗡 Благословения Нашествия, модификаторы и «Испытание» Башни, тактики Разлома, подземелье дня', en: '🗡 Horde blessings, Tower modifiers and Challenge, Rift tactics, dungeon of the day' },
      { ru: '🛡 Сеты режимов и 9 новых легендарок', en: '🛡 Mode-only sets and 9 new legendaries' },
      { ru: '♻ Полный сброс прогресса, «Забрать всё», сортировка героинь', en: '♻ Full progress reset, "Claim all", hero sorting' },
    ],
  },
  {
    id: '2026-09-24',
    date: '24.09.2026',
    title: { ru: 'Вестницы и новые режимы', en: 'Heralds and new modes' },
    items: [
      { ru: '👼 5 Вестниц Эфира и 5 Колоссов — крупные, со своими анимациями', en: '👼 5 Aether Heralds and 5 Colossi — big, with their own animations' },
      { ru: '🌋 Разлом Колосса, Стихийные шпили и Нашествие', en: '🌋 Colossus Rift, Elemental Spires and the Horde' },
      { ru: '👙 Летние облики и коллекция «Будуар», обновлённый боевой пропуск', en: '👙 Summer skins and the Boudoir collection, updated battle pass' },
    ],
  },
];

export const CHANGELOG_LATEST = CHANGELOG[0].id;
