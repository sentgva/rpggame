/**
 * Шрифт заголовков и чисел — Rubik (подключён через @fontsource в main.tsx).
 * PixiJS рисует текст сам, поэтому перед первым текстом на холсте ждём загрузку нужных начертаний.
 */
export const PIXEL_FONT = 'Rubik';
export const DISPLAY_FONT = PIXEL_FONT;

let loading: Promise<void> | null = null;

export function loadPixelFont(): Promise<void> {
  if (loading) return loading;
  const weights = ['500', '700', '800'];
  loading = Promise.all(weights.map((w) => document.fonts.load(`${w} 16px ${PIXEL_FONT}`, 'Аа1').catch(() => undefined))).then(() => undefined);
  return loading;
}
