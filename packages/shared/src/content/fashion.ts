import type { L10n } from '../types';
import { SKIN_MAP, type SkinSet } from './heroines';

/**
 * «Модный день» (по мотивам тематических недель DOAX Venus Vacation): у каждого дня недели — своя
 * коллекция обликов. Кто вышел в бой в облике из коллекции дня, получает +10% к здоровью, атаке и
 * защите. В воскресенье — «свободный стиль»: подходит любой облик.
 */
export type FashionTheme = SkinSet | 'any';

/** По дню недели UTC: 0 — воскресенье. */
export const FASHION_WEEK: FashionTheme[] = ['any', 'summer', 'lingerie', 'masquerade', 'summer', 'lingerie', 'summer'];
export const FASHION_BONUS = 0.1;

export const FASHION_NAMES: Record<FashionTheme, { name: L10n; icon: string; hint: L10n }> = {
  summer: { icon: '👙', name: { ru: 'Пляжный день', en: 'Beach Day' }, hint: { ru: 'в купальниках «Лета»', en: 'in Summer swimwear' } },
  lingerie: { icon: '🎀', name: { ru: 'Вечер «Будуара»', en: 'Boudoir Night' }, hint: { ru: 'в белье «Будуара»', en: 'in Boudoir lingerie' } },
  masquerade: { icon: '🎭', name: { ru: 'Маскарад', en: 'Masquerade' }, hint: { ru: 'в костюмах «Маскарада»', en: 'in Masquerade costumes' } },
  bond: { icon: '💗', name: { ru: 'День близости', en: 'Bond Day' }, hint: { ru: 'в нарядах близости', en: 'in bond outfits' } },
  any: { icon: '✨', name: { ru: 'Свободный стиль', en: 'Free Style' }, hint: { ru: 'в любом облике', en: 'in any skin' } },
};

/** Тема дня по ключу дня (YYYY-MM-DD). */
export function fashionOfDay(dayKey: string): FashionTheme {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const wd = Number.isFinite(d.getTime()) ? d.getUTCDay() : 0;
  return FASHION_WEEK[wd];
}

/** Подходит ли облик теме дня. */
export function fashionFits(skin: string | undefined, theme: FashionTheme): boolean {
  const sk = skin ? SKIN_MAP[skin] : undefined;
  if (!sk?.set) return false;
  return theme === 'any' || sk.set === theme;
}
