import type { ClassId, L10n } from '../types';

/**
 * «Вылазка» — активный режим в духе Vampire Survivors: игрок сам водит героя по полю, оружие класса
 * бьёт само, орда растёт каждую минуту. На каждом уровне — выбор из трёх карточек: новое оружие,
 * союзник из Легиона (бежит следом и сражается своим оружием), умение или связка классов.
 * Через 5 минут приходит босс акта. Сам бой идёт на клиенте; сервер проверяет правдоподобие итога
 * (время, убийства) и выдаёт награду — три награждаемых вылазки в день.
 */
const L = (ru: string, en: string): L10n => ({ ru, en });

/** Секунд до босса. */
export const SORTIE_BOSS_AT = 300;
/** Награждаемых вылазок в день (остальные — тренировка без награды). */
export const SORTIE_DAILY = 3;
/** Больше трёх союзников в вылазку не взять. */
export const SORTIE_ALLIES = 3;
export const SORTIE_MAX_LEVEL = 5;

export type SortieTierId = 'normal' | 'hard' | 'nightmare';
export interface SortieTier {
  id: SortieTierId;
  name: L10n;
  /** множитель здоровья и урона врагов */
  enemy: number;
  /** множитель награды */
  reward: number;
  /** открывается победой над боссом на этой сложности */
  after?: SortieTierId;
}
export const SORTIE_TIERS: SortieTier[] = [
  { id: 'normal', name: L('Обычная', 'Normal'), enemy: 1, reward: 1 },
  { id: 'hard', name: L('Тяжёлая', 'Hard'), enemy: 2.2, reward: 1.8, after: 'normal' },
  { id: 'nightmare', name: L('Кошмар', 'Nightmare'), enemy: 4.5, reward: 3, after: 'hard' },
];
export const SORTIE_TIER_MAP = Object.fromEntries(SORTIE_TIERS.map((x) => [x.id, x])) as Record<SortieTierId, SortieTier>;

export type SortieWeaponId = 'blade' | 'daggers' | 'aura' | 'arrows' | 'fireball' | 'bolts';
export interface SortieWeaponDef {
  id: SortieWeaponId;
  cls: ClassId;
  name: L10n;
  desc: L10n;
}
/** Оружие класса: у героя — с первой секунды, у союзника — когда он присоединяется. */
export const SORTIE_WEAPONS: SortieWeaponDef[] = [
  { id: 'blade', cls: 'knight', name: L('Взмах меча', 'Sword Sweep'), desc: L('Широкий удар вокруг, отбрасывает врагов', 'A wide sweep around you that knocks foes back') },
  { id: 'daggers', cls: 'assassin', name: L('Метательные ножи', 'Throwing Knives'), desc: L('Веер ножей в ближайших врагов', 'A fan of knives at the nearest foes') },
  { id: 'aura', cls: 'priestess', name: L('Круг света', 'Circle of Light'), desc: L('Жжёт врагов рядом и лечит', 'Burns foes nearby and heals you') },
  { id: 'arrows', cls: 'ranger', name: L('Меткие стрелы', 'True Arrows'), desc: L('Быстрые стрелы насквозь', 'Fast piercing arrows') },
  { id: 'fireball', cls: 'warlock', name: L('Огненный шар', 'Fireball'), desc: L('Взрывается по площади', 'Explodes in an area') },
  { id: 'bolts', cls: 'hunter', name: L('Арбалет и Снег', 'Crossbow & Snow'), desc: L('Тяжёлые болты; волк бросается на врагов', 'Heavy bolts; the wolf pounces on foes') },
];
export const SORTIE_WEAPON_OF: Record<ClassId, SortieWeaponDef> = Object.fromEntries(SORTIE_WEAPONS.map((w) => [w.cls, w])) as Record<ClassId, SortieWeaponDef>;

export type SortiePassiveId = 'swift' | 'vigor' | 'magnet' | 'fury' | 'haste' | 'guard' | 'luck' | 'regen';
export const SORTIE_PASSIVES: { id: SortiePassiveId; icon: string; name: L10n; desc: L10n }[] = [
  { id: 'swift', icon: '👟', name: L('Лёгкий шаг', 'Light Step'), desc: L('+12% к скорости бега', '+12% move speed') },
  { id: 'vigor', icon: '❤️', name: L('Закалка', 'Vigor'), desc: L('+20% к здоровью и лечение', '+20% max HP and a heal') },
  { id: 'magnet', icon: '🧲', name: L('Притяжение', 'Magnet'), desc: L('+40% к радиусу сбора кристаллов', '+40% pickup radius') },
  { id: 'fury', icon: '🔥', name: L('Ярость', 'Fury'), desc: L('+12% урона', '+12% damage') },
  { id: 'haste', icon: '⏱️', name: L('Спешка', 'Haste'), desc: L('−8% к перезарядке оружия', '−8% weapon cooldown') },
  { id: 'guard', icon: '🛡️', name: L('Броня', 'Armour'), desc: L('−10% входящего урона', '−10% damage taken') },
  { id: 'luck', icon: '🍀', name: L('Удача', 'Luck'), desc: L('+8% шанс крита (×2 урона)', '+8% crit chance (×2 damage)') },
  { id: 'regen', icon: '✨', name: L('Восстановление', 'Recovery'), desc: L('+0,6% здоровья в секунду', '+0.6% HP per second') },
];

/** Связки в вылазке: карточка появляется, когда в отряде есть оба класса. */
export const SORTIE_COMBO_TEXT: Record<string, L10n> = {
  backstab: L('Ножи по ошеломлённым мечом врагам — ×2 урона', 'Knives deal ×2 to foes dazed by the sword'),
  decay: L('Ножи отравляют, огненный шар взрывает яд разом', 'Knives poison; a fireball bursts the poison at once'),
  detonate: L('Стрелы и болты по горящим врагам взрываются', 'Arrows and bolts explode on burning foes'),
  crush: L('Стрелы сковывают, меч по скованным — ×1,6 урона', 'Arrows root; the sword deals ×1.6 to rooted foes'),
  hunt: L('Второй волк и +20% урона по всем', 'A second wolf and +20% damage to all'),
  grace: L('Круг света лечит вдвое и даёт +15% урона', 'The circle of light heals twice as much and gives +15% damage'),
};

/** Сколько опыта до следующего уровня в вылазке. */
export function sortieXpNeed(level: number): number {
  return 4 + level * 3 + Math.floor(level * level * 0.2);
}
