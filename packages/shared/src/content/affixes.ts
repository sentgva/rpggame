import type { L10n, SpecialEffect } from '../types';
import type { StageRef } from './acts';
import { Rng, mixSeed } from '../rng';

/**
 * Свойства элиты: у боссов этапов кампании (элита и мини-боссы, на Hard/Nightmare — и владычицы)
 * появляются особые свойства. Каждый бой с боссом — своя задачка, а за каждое свойство — прибавка к награде.
 */
export interface EliteAffix {
  id: string;
  name: L10n;
  desc: L10n;
  /** множители характеристик */
  hp?: number;
  atk?: number;
  def?: number;
  /** прибавки */
  spd?: number;
  lifesteal?: number;
  crit?: number;
  critDmg?: number;
  fx?: SpecialEffect;
}

const L = (ru: string, en: string): L10n => ({ ru, en });

export const ELITE_AFFIXES: EliteAffix[] = [
  { id: 'armored', name: L('Бронированная', 'Armored'), desc: L('+60% защиты', '+60% defense'), def: 1.6 },
  { id: 'swift', name: L('Стремительная', 'Swift'), desc: L('+20 скорости', '+20 speed'), spd: 20 },
  { id: 'vampiric', name: L('Кровопийца', 'Vampiric'), desc: L('+25% вампиризма', '+25% lifesteal'), lifesteal: 0.25 },
  { id: 'thorny', name: L('Шипастая', 'Thorny'), desc: L('Возвращает 15% полученного урона', 'Reflects 15% of damage taken'), fx: { id: 'thorns', v: 0.15 } },
  { id: 'enraged', name: L('Неистовая', 'Enraged'), desc: L('+50% урона при здоровье ниже 30%', '+50% damage below 30% health'), fx: { id: 'lastStand', v: 0.5 } },
  { id: 'giant', name: L('Исполинская', 'Colossal'), desc: L('+40% здоровья', '+40% health'), hp: 1.4 },
  { id: 'deadly', name: L('Смертоносная', 'Deadly'), desc: L('+15% шанса и +40% урона крита', '+15% crit chance, +40% crit damage'), crit: 0.15, critDmg: 0.4 },
  { id: 'shielded', name: L('Под щитом', 'Shielded'), desc: L('Начинает бой со щитом в 25% здоровья', 'Starts the fight with a shield of 25% health'), fx: { id: 'startShield', v: 0.25 } },
];
export const ELITE_AFFIX_MAP: Record<string, EliteAffix> = Object.fromEntries(ELITE_AFFIXES.map((a) => [a.id, a]));

/** С какого сквозного этапа у боссов появляются свойства (обучение и первые акты — без них). */
export const AFFIX_FROM = 11;
/** Прибавка к золоту и опыту за победу — за каждое свойство. */
export const AFFIX_REWARD = 0.2;

/** Свойства босса этапа: Normal — одно, Hard и Nightmare — два; владычицы получают одно только на Hard/Nightmare. */
export function stageAffixes(ref: Pick<StageRef, 'diff' | 'idx' | 'n' | 'kind'>): string[] {
  if (ref.n < AFFIX_FROM) return [];
  const count = ref.kind === 'boss' ? (ref.diff > 0 ? 1 : 0) : ref.diff > 0 ? 2 : 1;
  if (!count) return [];
  const rng = new Rng(mixSeed(ref.diff, ref.idx, 0xaff1));
  const ids = ELITE_AFFIXES.map((a) => a.id);
  rng.shuffle(ids);
  return ids.slice(0, count);
}
