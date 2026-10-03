import { SUB_DEFS, formatNum, itemMain, type Config, type Item } from '@idle/shared';
import { t, tl } from '../../i18n';

/** Основная характеристика вещи: «+1.2K атаки», у сапог — скорость и здоровье. */
export function mainLines(cfg: Config, it: Pick<Item, 'slot' | 'rarity' | 'lvl' | 'enh'>): { label: string; value: string }[] {
  const m = itemMain(cfg, it);
  const out: { label: string; value: string }[] = [];
  if (m.atk) out.push({ label: t('stat.atk'), value: `+${formatNum(m.atk)}` });
  if (m.def) out.push({ label: t('stat.def'), value: `+${formatNum(m.def)}` });
  if (m.haste) out.push({ label: t('stat.haste'), value: `+${pct(m.haste)}` });
  if (m.hp) out.push({ label: t('stat.hp'), value: `+${formatNum(m.hp)}` });
  return out;
}

export function mainShort(cfg: Config, it: Pick<Item, 'slot' | 'rarity' | 'lvl' | 'enh'>): string {
  return mainLines(cfg, it)
    .map((l) => `${l.value} ${l.label.toLowerCase()}`)
    .join(' · ');
}

export function subLine(sub: Item['subs'][number]): { label: string; value: string } {
  return { label: tl(SUB_DEFS[sub.s].name), value: `+${pct(sub.v)}` };
}

export function pct(v: number): string {
  const p = v * 100;
  return `${p >= 10 ? Math.round(p) : Math.round(p * 10) / 10}%`;
}
