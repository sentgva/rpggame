/**
* Пиксельный шрифт интерфейса: Handjet (тонкий, узкий, с полной кириллицей).
* Подключаем через FontFace с size-adjust: у Handjet мелкие глифы, так одна правка масштаба
* подходит ко всем размерам, заданным в CSS, и к тексту PixiJS.
*/
import h400cyrillicext from '@fontsource/handjet/files/handjet-cyrillic-ext-400-normal.woff2?url';
import h600cyrillicext from '@fontsource/handjet/files/handjet-cyrillic-ext-600-normal.woff2?url';
import h400cyrillic from '@fontsource/handjet/files/handjet-cyrillic-400-normal.woff2?url';
import h600cyrillic from '@fontsource/handjet/files/handjet-cyrillic-600-normal.woff2?url';
import h400latinext from '@fontsource/handjet/files/handjet-latin-ext-400-normal.woff2?url';
import h600latinext from '@fontsource/handjet/files/handjet-latin-ext-600-normal.woff2?url';
import h400latin from '@fontsource/handjet/files/handjet-latin-400-normal.woff2?url';
import h600latin from '@fontsource/handjet/files/handjet-latin-600-normal.woff2?url';

export const PIXEL_FONT = 'PixelUI';

const RANGES: Record<string, string> = {
  'cyrillic-ext': 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  'cyrillic': 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

const FILES: [string, string, string][] = [
  ['cyrillic-ext', '400', h400cyrillicext],
  ['cyrillic-ext', '600', h600cyrillicext],
  ['cyrillic', '400', h400cyrillic],
  ['cyrillic', '600', h600cyrillic],
  ['latin-ext', '400', h400latinext],
  ['latin-ext', '600', h600latinext],
  ['latin', '400', h400latin],
  ['latin', '600', h600latin],
];

let loading: Promise<void> | null = null;

/** Регистрирует шрифт и ждёт загрузки кириллицы и латиницы (нужно до первого текста в PixiJS). */
export function loadPixelFont(): Promise<void> {
  if (loading) return loading;
  const faces = FILES.map(([sub, weight, url]) => ({
    sub,
    face: new FontFace(PIXEL_FONT, `url(${url}) format('woff2')`, {
      weight,
      style: 'normal',
      display: 'swap',
      unicodeRange: RANGES[sub],
      // size-adjust поддерживают современные движки; в lib.dom TypeScript его пока нет
      ...({ sizeAdjust: '112%' } as FontFaceDescriptors),
    }),
  }));
  for (const { face } of faces) document.fonts.add(face);
  // основная кириллица и латиница нужны сразу, расширенные наборы подгрузятся по требованию
  loading = Promise.all(faces.filter((x) => x.sub === 'cyrillic' || x.sub === 'latin').map((x) => x.face.load().catch(() => undefined))).then(() => undefined);
  return loading;
}
