import { ENEMY_MAP, type SkillDef, type SkillEffect, type SkillMod, type TargetRule } from '@idle/shared';
import { getLang, tl } from '../i18n';

const TARGET: Record<TargetRule, [string, string]> = {
  enemy: ['по цели', 'to a target'],
  enemyBack: ['по заднему ряду', 'to the back row'],
  enemyFront: ['по переднему ряду', 'to the front row'],
  enemyAll: ['по всем врагам', 'to all enemies'],
  enemyRandom: ['случайным врагам', 'to random enemies'],
  enemyLowest: ['по самой раненой цели', 'to the weakest enemy'],
  self: ['себе', 'to self'],
  allyLowest: ['самой раненой союзнице', 'to the weakest ally'],
  allyAll: ['всему отряду', 'to the party'],
  allyFront: ['переднему ряду', 'to the front row'],
  allyDead: ['павшей союзнице', 'to a fallen ally'],
  allyStrongest: ['сильнейшей союзнице', 'to the strongest ally'],
};
const DOT: Record<string, [string, string]> = { burn: ['Поджог', 'Burn'], poison: ['Яд', 'Poison'], bleed: ['Кровотечение', 'Bleed'] };
const CC: Record<string, [string, string]> = { stun: ['Оглушение', 'Stun'], freeze: ['Заморозка', 'Freeze'], silence: ['Немота', 'Silence'] };
const STAT: Record<string, [string, string]> = {
  atk: ['атака', 'attack'],
  def: ['защита', 'defense'],
  spd: ['скорость', 'speed'],
  crit: ['шанс крита', 'crit chance'],
  critDmg: ['крит. урон', 'crit damage'],
  acc: ['точность', 'accuracy'],
  eva: ['уклонение', 'evasion'],
  dmgTaken: ['получаемый урон', 'damage taken'],
  dmg: ['наносимый урон', 'damage dealt'],
  healRecv: ['получаемое лечение', 'healing received'],
};
const EL: Record<string, [string, string]> = { fire: ['огнём', 'fire'], water: ['водой', 'water'], nature: ['природой', 'nature'], light: ['светом', 'light'], dark: ['тьмой', 'dark'] };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const L = (x: [string, string]) => (getLang() === 'en' ? x[1] : x[0]);

function scale(e: SkillEffect): string {
  return e.scale === 'hp' ? 'HP' : e.scale === 'def' ? 'DEF' : 'ATK';
}

function multAt(e: SkillEffect, rank: number): number {
  const per = e.perRank ?? (e.mult ?? 0) * 0.2;
  return (e.mult ?? 0) + per * (rank - 1);
}

function describeEffect(e: SkillEffect, rank: number, skillTarget: TargetRule): string {
  const en = getLang() === 'en';
  const tgt = L(TARGET[e.target ?? skillTarget]);
  const turns = (n?: number) => (en ? `${n ?? 1} turn${(n ?? 1) > 1 ? 's' : ''}` : `${n ?? 1} х.`);
  switch (e.t) {
    case 'dmg': {
      let s = en ? `Deals ${pct(multAt(e, rank))} ${scale(e)} damage ${tgt}` : `Урон ${pct(multAt(e, rank))} ${scale(e)} ${tgt}`;
      if (e.element) s += en ? ` (${L(EL[e.element])})` : ` (${L(EL[e.element])})`;
      if ((e.hits ?? 1) > 1) s += ` ×${e.hits}`;
      if (e.lifesteal) s += en ? `, lifesteal ${pct(e.lifesteal)}` : `, вампиризм ${pct(e.lifesteal)}`;
      if (e.execute) s += en ? `, +${pct(e.execute)} vs targets below 30% HP` : `, +${pct(e.execute)} по целям ниже 30% HP`;
      return s;
    }
    case 'heal':
      return en ? `Heals ${pct(multAt(e, rank))} ${scale(e)} ${tgt}` : `Лечение ${pct(multAt(e, rank))} ${scale(e)} ${tgt}`;
    case 'shield':
      return en ? `Shield ${pct(multAt(e, rank))} ${scale(e)} ${tgt}` : `Щит ${pct(multAt(e, rank))} ${scale(e)} ${tgt}`;
    case 'dot':
      return `${L(DOT[e.dot ?? 'poison'])}: ${pct(multAt(e, rank))} ATK ${en ? 'per turn' : 'за ход'}, ${turns(e.turns)}`;
    case 'hot':
      return en ? `Regeneration ${pct(multAt(e, rank))} ATK per turn, ${turns(e.turns)}` : `Регенерация ${pct(multAt(e, rank))} ATK за ход, ${turns(e.turns)}`;
    case 'cc':
      return `${L(CC[e.cc ?? 'stun'])} ${pct(e.chance ?? 1)}, ${turns(e.turns)}`;
    case 'buff':
    case 'debuff': {
      const v = (e.value ?? 0) + (e.valuePerRank ?? 0) * (rank - 1);
      const flat = e.stat === 'spd';
      const sign = v >= 0 ? '+' : '−';
      const val = flat ? `${sign}${Math.abs(Math.round(v))}` : `${sign}${pct(Math.abs(v))}`;
      return `${L(STAT[e.stat ?? 'atk'])} ${val} ${tgt}, ${turns(e.turns)}`;
    }
    case 'taunt':
      return en ? `Taunt, ${turns(e.turns)}` : `Провокация, ${turns(e.turns)}`;
    case 'energy':
      return en ? `+${e.amount} energy ${tgt}` : `+${e.amount} энергии ${tgt}`;
    case 'summon':
      return en ? `Summons ${tl(ENEMY_MAP[e.unit ?? 'skeleton']?.name)} ×${e.count ?? 1}` : `Призыв: ${tl(ENEMY_MAP[e.unit ?? 'skeleton']?.name)} ×${e.count ?? 1}`;
    case 'revive':
      return en ? `Revives a fallen ally with ${pct(e.pct ?? 0.3)} HP` : `Воскрешает павшую союзницу с ${pct(e.pct ?? 0.3)} HP`;
    case 'cleanse':
      return en ? 'Removes negative effects' : 'Снимает негативные эффекты';
  }
}

export function describeSkill(skill: SkillDef, rank: number): string[] {
  return skill.effects.map((e) => describeEffect(e, rank, skill.target));
}

export function describeMod(mod: SkillMod, rank: number, skill: SkillDef | undefined): string[] {
  const en = getLang() === 'en';
  const out: string[] = [];
  if (mod.extraHits) out.push(en ? `+${mod.extraHits} hit(s)` : `+${mod.extraHits} удар(а)`);
  if (mod.cdReduce) out.push(en ? `Cooldown −${mod.cdReduce}` : `Перезарядка −${mod.cdReduce}`);
  if (mod.multBonus) out.push(en ? `+${pct(mod.multBonus * rank)} to multiplier` : `+${pct(mod.multBonus * rank)} к множителю`);
  for (const e of mod.addEffects ?? []) {
    const scaled: SkillEffect = { ...e, mult: e.mult !== undefined ? e.mult * rank : undefined, chance: e.chance !== undefined ? Math.min(1, e.chance * rank) : undefined, value: e.value !== undefined ? e.value * rank : undefined };
    out.push(describeEffect(scaled, 1, skill?.target ?? 'enemy'));
  }
  return out;
}
