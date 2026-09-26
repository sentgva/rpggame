import type { L10n } from '../types';

/**
 * Артефакты: механики на весь отряд, которые падают с отдельного баннера призыва.
 * Не статы, а правила боя: цепочки энергии, метки, молнии, заморозка времени…
 * Числа скромные — артефакты разнообразят бой, а не ломают баланс.
 * Дубликат повышает уровень (до 5), после максимума — возврат кристаллами.
 */
export type ArtifactRarity = 'R' | 'SR' | 'SSR' | 'UR';

export interface ArtifactDef {
  id: string;
  icon: string;
  rarity: ArtifactRarity;
  name: L10n;
  /** {v} — сила на текущем уровне */
  desc: L10n;
  base: number;
  step: number;
  /** как показывать {v}: проценты, секунды или число */
  fmt: 'pct' | 'sec' | 'num';
}

const L = (ru: string, en: string): L10n => ({ ru, en });

export const ARTIFACTS: ArtifactDef[] = [
  // ——— R ———
  { id: 'ember_charm', icon: '🔥', rarity: 'R', name: L('Тлеющий амулет', 'Ember Charm'), desc: L('Каждый 6-й удар отряда поджигает цель: горение {v} атаки за ход, 2 хода', 'Every 6th party hit sets the target ablaze: burn for {v} ATK per turn, 2 turns'), base: 0.2, step: 0.05, fmt: 'pct' },
  { id: 'dew_flask', icon: '💧', rarity: 'R', name: L('Фляга росы', 'Dew Flask'), desc: L('Каждые 10 с лечит самую раненую героиню на {v} её здоровья', 'Every 10 s heals the most wounded heroine for {v} of her HP'), base: 0.05, step: 0.01, fmt: 'pct' },
  { id: 'war_drum', icon: '🥁', rarity: 'R', name: L('Боевой барабан', 'War Drum'), desc: L('Отряд начинает бой с {v} энергии', 'The party starts the battle with {v} energy'), base: 8, step: 3, fmt: 'num' },
  { id: 'alarm_bell', icon: '🔔', rarity: 'R', name: L('Колокол тревоги', 'Alarm Bell'), desc: L('Когда героиня впервые опускается ниже 50% здоровья, она получает щит {v} здоровья', 'When a heroine first drops below 50% HP, she gains a shield of {v} HP'), base: 0.05, step: 0.0125, fmt: 'pct' },
  // ——— SR ———
  { id: 'storm_heart', icon: '🌀', rarity: 'SR', name: L('Сердце бури', 'Storm Heart'), desc: L('Ульта героини даёт остальным {v} энергии', 'A heroine\'s ultimate gives the others {v} energy'), base: 5, step: 1.5, fmt: 'num' },
  { id: 'hunter_mark', icon: '🎯', rarity: 'SR', name: L('Метка охотницы', 'Hunter\'s Mark'), desc: L('Каждые 12 с метит самого живучего врага: он получает на {v} больше урона', 'Every 12 s marks the toughest enemy: it takes {v} more damage'), base: 0.12, step: 0.03, fmt: 'pct' },
  { id: 'thunder_bell', icon: '⚡', rarity: 'SR', name: L('Громовой колокольчик', 'Thunder Chime'), desc: L('Каждый 8-й удар отряда бьёт молнией случайного врага: {v} атаки ударившей', 'Every 8th party hit calls lightning on a random enemy: {v} of the striker\'s ATK'), base: 0.4, step: 0.1, fmt: 'pct' },
  { id: 'omen_ward', icon: '🧿', rarity: 'SR', name: L('Оберег предчувствия', 'Omen Ward'), desc: L('Когда босс заряжает Сокрушительный удар, отряд получает щит {v} здоровья', 'When a boss charges a Crushing Blow, the party gains a shield of {v} HP'), base: 0.04, step: 0.01, fmt: 'pct' },
  // ——— SSR ———
  { id: 'phoenix_ash', icon: '🪶', rarity: 'SSR', name: L('Пепел феникса', 'Phoenix Ash'), desc: L('Первая павшая героиня возрождается с {v} здоровья (раз за бой)', 'The first fallen heroine revives with {v} HP (once per battle)'), base: 0.2, step: 0.05, fmt: 'pct' },
  { id: 'time_chain', icon: '⏳', rarity: 'SSR', name: L('Цепь времени', 'Chain of Time'), desc: L('Каждые 15 с останавливает время: враги ходят на {v} позже', 'Every 15 s stops time: enemies act {v} later'), base: 0.6, step: 0.15, fmt: 'sec' },
  // ——— UR ———
  { id: 'valkyrie_horn', icon: '📯', rarity: 'UR', name: L('Рог Валькирии', 'Valkyrie Horn'), desc: L('Когда здоровье отряда впервые падает ниже половины — лечение {v} и +{v} к атаке на 3 хода', 'When the party first drops below half HP — heal {v} and +{v} ATK for 3 turns'), base: 0.08, step: 0.015, fmt: 'pct' },
  { id: 'aether_prism', icon: '🔮', rarity: 'UR', name: L('Призма Эфира', 'Aether Prism'), desc: L('+{v} к урону отряда за каждую разную стихию в отряде', '+{v} party damage for each different element in the party'), base: 0.02, step: 0.005, fmt: 'pct' },
];

export const ARTIFACT_MAP: Record<string, ArtifactDef> = Object.fromEntries(ARTIFACTS.map((r) => [r.id, r]));
export const ARTIFACT_MAX = 5;
export const ARTIFACT_RARITIES: ArtifactRarity[] = ['R', 'SR', 'SSR', 'UR'];
export const ARTIFACT_RARITY_COLORS: Record<ArtifactRarity, string> = { R: '#8ab0d0', SR: '#6ac06a', SSR: '#c070f0', UR: '#f0c040' };

/** Шансы баннера (%), гарантии и цены. */
export const ARTIFACT_BANNER = {
  rates: { R: 60, SR: 30, SSR: 8.5, UR: 1.5 } as Record<ArtifactRarity, number>,
  pitySSR: 30,
  pityUR: 90,
  cost1: 200,
  cost10: 1800,
};
/** Возврат кристаллами за дубликат артефакта максимального уровня. */
export const ARTIFACT_REFUND: Record<ArtifactRarity, number> = { R: 10, SR: 30, SSR: 80, UR: 200 };

/** Сила артефакта на уровне lvl (1–5). */
export function artifactValue(id: string, lvl: number): number {
  const d = ARTIFACT_MAP[id];
  if (!d) return 0;
  return d.base + d.step * (Math.max(1, Math.min(ARTIFACT_MAX, lvl)) - 1);
}

/** Слоты артефактов отряда: 2, с 40-го уровня аккаунта — 3. */
export const ARTIFACT_SLOT3_LVL = 40;
export function artifactSlots(accountLvl: number): number {
  return accountLvl >= ARTIFACT_SLOT3_LVL ? 3 : 2;
}

/** {v} в описании: проценты, секунды или число. */
export function artifactText(id: string, lvl: number, lang: 'ru' | 'en'): string {
  const d = ARTIFACT_MAP[id];
  if (!d) return '';
  const v = artifactValue(id, lvl);
  const s = d.fmt === 'pct' ? `${+(v * 100).toFixed(1)}%` : d.fmt === 'sec' ? `${+v.toFixed(1)} ${lang === 'ru' ? 'с' : 's'}` : String(v);
  return d.desc[lang].split('{v}').join(s);
}
