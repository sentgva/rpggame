import type { L10n } from '../types';

/** Встречи: случайные события на экране боя, каждое — выбор с риском или ценой. */
export type EncounterKind = 'chest' | 'merchant' | 'shrine' | 'traveler' | 'gambler' | 'ambush';

export interface EncounterChoice {
  id: string;
  label: L10n;
  /** возможен бой (сундук-мимик, засада) */
  fight?: boolean;
}

export interface EncounterDef {
  id: EncounterKind;
  name: L10n;
  desc: L10n;
  choices: EncounterChoice[];
}

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'chest',
    name: { ru: 'Сундук у дороги', en: 'Chest by the Road' },
    desc: { ru: 'Окованный сундук, брошенный посреди тропы. Слишком удобно… Внутри может быть добыча — или мимик.', en: 'An iron-bound chest left in the middle of the trail. A bit too convenient… It may hold loot — or a mimic.' },
    choices: [
      { id: 'open', label: { ru: 'Открыть (риск: мимик)', en: 'Open (risk: mimic)' }, fight: true },
      { id: 'leave', label: { ru: 'Пройти мимо', en: 'Walk past' } },
    ],
  },
  {
    id: 'merchant',
    name: { ru: 'Бродячая торговка', en: 'Wandering Merchant' },
    desc: { ru: 'Торговка с тележкой, полной диковин. Цены — ниже, чем в лагере, но предложение только сейчас.', en: 'A merchant with a cart full of curios. Cheaper than at camp — but only right now.' },
    choices: [
      { id: 'scroll', label: { ru: 'Свиток призыва', en: 'Summon scroll' } },
      { id: 'epic', label: { ru: 'Эпический предмет', en: 'Epic item' } },
      { id: 'leave', label: { ru: 'Не сейчас', en: 'Not now' } },
    ],
  },
  {
    id: 'shrine',
    name: { ru: 'Алтарь стихий', en: 'Elemental Shrine' },
    desc: { ru: 'Древний алтарь откликается на Кристалл Эфира. Он исполнит одно желание.', en: 'An ancient shrine answers the Aether Crystal. It grants one wish.' },
    choices: [
      { id: 'gold', label: { ru: 'Богатство', en: 'Wealth' } },
      { id: 'xp', label: { ru: 'Мудрость', en: 'Wisdom' } },
      { id: 'dust', label: { ru: 'Мастерство', en: 'Mastery' } },
    ],
  },
  {
    id: 'traveler',
    name: { ru: 'Раненая путница', en: 'Wounded Traveler' },
    desc: { ru: 'Валькирия-одиночка, израненная после боя. Помощь стоит золота, но она не останется в долгу.', en: 'A lone valkyrie, wounded after a fight. Helping costs gold, but she will repay the debt.' },
    choices: [
      { id: 'help', label: { ru: 'Вылечить', en: 'Heal her' } },
      { id: 'leave', label: { ru: 'Указать дорогу в лагерь', en: 'Point her to camp' } },
    ],
  },
  {
    id: 'gambler',
    name: { ru: 'Игрок в кости', en: 'Dice Gambler' },
    desc: { ru: '«Удвоим ставку, Командор?» Шансы — ровно пополам.', en: '"Double or nothing, Commander?" The odds are dead even.' },
    choices: [
      { id: 'bet', label: { ru: 'Сделать ставку', en: 'Place a bet' } },
      { id: 'leave', label: { ru: 'Отказаться', en: 'Decline' } },
    ],
  },
  {
    id: 'ambush',
    name: { ru: 'Засада разбойниц', en: 'Bandit Ambush' },
    desc: { ru: 'Отряд разбойниц перекрыл дорогу. Они сильнее обычных врагов, но и добыча у них богаче.', en: 'A band of outlaws blocks the road. Tougher than usual foes — and richer too.' },
    choices: [
      { id: 'fight', label: { ru: 'Принять бой', en: 'Fight' }, fight: true },
      { id: 'pay', label: { ru: 'Откупиться', en: 'Pay them off' } },
    ],
  },
];
export const ENCOUNTER_MAP: Record<string, EncounterDef> = Object.fromEntries(ENCOUNTERS.map((e) => [e.id, e]));

/** Встречи с этапа… */
export const ENCOUNTER_UNLOCK = 5;
/** Пауза между встречами и сколько встреча ждёт игрока (мин). */
export const ENCOUNTER_GAP: [number, number] = [15, 35];
export const ENCOUNTER_TTL = 20;
/** Шанс мимика в сундуке. */
export const MIMIC_CHANCE = 0.35;
