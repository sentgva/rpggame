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
    id: '2026-09-26h',
    date: '26.09.2026',
    icon: '🏆',
    title: { ru: 'Турнир и Самоцветные копи', en: 'Tourney and Gem Mines' },
    lead: { ru: 'Два новых праздника в ротации — и оба играются совсем иначе', en: 'Two new festivals in the rotation — and both play completely differently' },
    color: '#ffd24a',
    art: { hero: 'freya' },
    items: [
      { ru: '🏆 Турнир Валькирий: драфт из чужих героинь одного уровня, 7 побед до титула, 3 поражения — и забег окончен', en: '🏆 Valkyrie Tourney: draft heroines you don’t own at one level, 7 wins for the title, 3 losses end the run' },
      { ru: '💎 Самоцветные копи: копай поле в тумане, выбирай путь к лестнице, спускайся глубже за богатством', en: '💎 Gem Mines: dig a fogged board, pick your path to the stairs, go deeper for richer loot' },
      { ru: '💃 UR-героини Фрейя и Рубина — чемпионки новых праздников', en: '💃 UR heroines Freya and Rubina — champions of the new festivals' },
    ],
  },
  {
    id: '2026-09-26g',
    date: '26.09.2026',
    icon: '🎉',
    title: { ru: 'Праздники Легиона', en: 'Legion Festivals' },
    lead: { ru: 'Большой ивент каждые две недели — со своей героиней, боссом и наградами', en: 'A big event every two weeks — with its own heroine, boss and rewards' },
    color: '#ff5a6a',
    art: { hero: 'selene' },
    items: [
      { ru: '🌙 Кровавая Луна, Праздник Приливов и Цветение Сакуры: путь из 18 этапов, босс-колосс, задания и лавка', en: '🌙 Blood Moon, Tide Festival and Sakura Bloom: an 18-stage trail, a colossus boss, tasks and a shop' },
      { ru: '💃 Новые UR-героини Селена, Амфитрита и Цубаки — только на своих праздниках', en: '💃 New UR heroines Selene, Amphitrite and Tsubaki — only at their own festivals' },
      { ru: '💀 Кампания сложнее: у боссов этапов появились свойства элиты, а награда за них выше', en: '💀 A tougher campaign: stage bosses have elite traits, and pay more for them' },
    ],
  },
  {
    id: '2026-09-26c',
    date: '26.09.2026',
    icon: '🔮',
    title: { ru: 'Сокровищница Эфира', en: 'The Aether Vault' },
    lead: { ru: 'Артефакты — новый баннер с механиками для всего отряда', en: 'Artifacts — a new banner with party-wide mechanics' },
    color: '#b07aff',
    art: { hero: 'aurelia' },
    items: [
      { ru: '🔮 12 артефактов: молнии, метки, остановка времени, возрождение, рог Валькирии', en: '🔮 12 artifacts: lightning, marks, stopped time, revival, the Valkyrie Horn' },
      { ru: '⭐ Дубликаты повышают уровень до 5, в отряде 2–3 слота, бесплатный призыв раз в день', en: '⭐ Duplicates level them up to 5, 2–3 party slots, a free pull every day' },
      { ru: '✨ Новая анимация призыва со звездопадом и прожектором для SSR/UR', en: '✨ A new summon animation with a starfall and a spotlight for SSR/UR' },
    ],
  },
  {
    id: '2026-09-26b',
    date: '26.09.2026',
    icon: '🏠',
    title: { ru: 'Резиденция героинь', en: "The heroines' residence" },
    lead: { ru: 'Свой дом для героинь: комнаты, ванна и ночёвки', en: 'A home for your heroines: rooms, baths and sleepovers' },
    color: '#f2a8c8',
    art: { hero: 'isolde' },
    items: [
      { ru: '🛋️ Гостиная, кухня, ванная и спальня — улучшаются до 5 уровня и ускоряют близость', en: '🛋️ Living room, kitchen, bathroom and bedroom — upgrade to level 5 to speed up bonds' },
      { ru: '🌙 Ночёвка с близости 5: одна героиня за ночь и подарок утром', en: '🌙 Sleepovers from bond 5: one heroine a night and a gift in the morning' },
    ],
  },
  {
    id: '2026-09-26',
    date: '26.09.2026',
    icon: '💞',
    title: { ru: 'Близость и уход', en: 'Bonds and care' },
    lead: { ru: 'Проводите время с UR-героинями — и они становятся сильнее', en: 'Spend time with UR heroines — and they grow stronger' },
    color: '#ff8ac0',
    art: { hero: 'aurora' },
    items: [
      { ru: '💬 Разговоры, угощения, горячие источники и свидания', en: '💬 Talks, treats, hot springs and dates' },
      { ru: '❤ Близость до 10: бонус к силе, награды на пиках и особые наряды', en: '❤ Bond up to 10: a power bonus, milestone rewards and special outfits' },
    ],
  },
  {
    id: '2026-09-25b',
    date: '25.09.2026',
    icon: '⚡',
    title: { ru: 'Живые бои', en: 'Live battles' },
    lead: { ru: 'Бои с боссами теперь можно вести самому', en: 'You can now take control in boss fights' },
    color: '#ffd24a',
    art: { hero: 'lira' },
    items: [
      { ru: '⚡ Ручные ульты: жми на портрет с полной шкалой', en: '⚡ Manual ultimates: tap a portrait with a full ring' },
      { ru: '💥 Сокрушительный удар боссов — сбей его ультой или оглушением', en: '💥 Bosses charge a Crushing Blow — interrupt it with an ultimate or a stun' },
      { ru: '❗ Встречи в пути: сундуки и мимики, торговка, алтарь, засады', en: '❗ Encounters on the road: chests and mimics, a merchant, a shrine, ambushes' },
    ],
  },
  {
    id: '2026-09-25a',
    date: '25.09.2026',
    icon: '🐰',
    title: { ru: 'Маскарад и новенькие', en: 'Masquerade and newcomers' },
    lead: { ru: 'Пять новых героинь и коллекция костюмов', en: 'Five new heroines and a costume collection' },
    color: '#e0a13a',
    art: { hero: 'tamamo', skin: 'tamamo_masq' },
    items: [
      { ru: '✨ Зарина, Юки, Мелюзина, Роксана и Тамамо', en: '✨ Zarina, Yuki, Melusine, Roxana and Tamamo' },
      { ru: '🐰 «Маскарад»: 15 обликов — кролики, горничные и не только', en: '🐰 Masquerade: 15 skins — bunnies, maids and more' },
    ],
  },
  {
    id: '2026-09-24',
    date: '24.09.2026',
    icon: '👼',
    title: { ru: 'Вестницы и новые режимы', en: 'Heralds and new modes' },
    lead: { ru: 'Вестницы Эфира, Колоссы и три новых режима', en: 'Aether Heralds, Colossi and three new modes' },
    color: '#6ff0e0',
    art: { hero: 'maristella' },
    items: [
      { ru: '👼 5 Вестниц и 5 Колоссов — крупные, со своими анимациями', en: '👼 5 Heralds and 5 Colossi — big, with their own animations' },
      { ru: '🌋 Разлом Колосса, Стихийные шпили и Нашествие', en: '🌋 Colossus Rift, Elemental Spires and the Horde' },
    ],
  },
];

export const CHANGELOG_LATEST = CHANGELOG[0].id;
