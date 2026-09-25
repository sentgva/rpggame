import type { L10n, Lang } from '@idle/shared';
import { en } from './en';
import { ru } from './ru';

export type Dict = typeof ru;
const DICTS: Record<Lang, Dict> = { ru, en };

let current: Lang = 'ru';

export function setLang(l: Lang) {
  current = l;
  document.documentElement.lang = l;
}
export function getLang(): Lang {
  return current;
}

/** Строка интерфейса по ключу с подстановкой {параметров}. */
export function t(key: keyof Dict | string, params?: Record<string, string | number>): string {
  const d = DICTS[current] as Record<string, string>;
  let s = d[key] ?? (DICTS.ru as Record<string, string>)[key] ?? String(key);
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Локализованное поле контента. */
export function tl(x: L10n | undefined | null): string {
  if (!x) return '';
  return x[current] ?? x.ru;
}

export function detectLang(code?: string): Lang {
  if (!code) return 'ru';
  return code.startsWith('ru') || code.startsWith('uk') || code.startsWith('be') || code.startsWith('kk') ? 'ru' : 'en';
}

/** Текст ошибки движка по коду. */
export function errorText(code: string, params?: Record<string, string | number>): string {
  const key = `err.${code}`;
  const d = DICTS[current] as Record<string, string>;
  if (d[key]) {
    const p = { ...params };
    if (p.cur) p.cur = t(`cur.${p.cur}`);
    if (p.feature) p.feature = t(`feature.${p.feature}`);
    return t(key, p);
  }
  return t('err.generic', { code });
}
