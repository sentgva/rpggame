import { BASE_ITEM_MAP, ENEMY_MAP, HEROINE_MAP, SKIN_MAP, type Item, type Look } from '@idle/shared';
import { renderIcon } from './icons';
import { renderItemIcon } from './itemArt';
import { renderWolf } from './beast';
import { CLASS_OUTFIT, renderFigure, renderFigureHD, type OutfitKind, type Pose } from './figure';
import { CLASS_BODY, CLASS_WEAPON, ROLE_CLASS, type Bitmap, type SpriteSpec } from './sprite';

type FigureSpec = SpriteSpec & { outfit?: OutfitKind };

const canvasCache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();

/**
 * Стиль фигур: 'classic' — основной 48×48, 'hd' — мягкий HD 96×96 (запасной).
 * Задаётся из конфига сервера при входе (переключатель — в разделе разработчика).
 */
export type ArtStyle = 'hd' | 'classic';
let style: ArtStyle = 'classic';

export function setArtStyle(next: ArtStyle | undefined) {
  const v: ArtStyle = next === 'hd' ? 'hd' : 'classic';
  if (v === style) return;
  style = v;
  canvasCache.clear();
  urlCache.clear();
}

export function artStyle(): ArtStyle {
  return style;
}

/**
 * Атрибуты <img> для кадра фигуры: HD-кадр объявляем с плотностью 2x — его «естественный» размер
 * остаётся прежним (48 px), и картинки без явного размера не раздуваются.
 */
export function spriteSrc(url: string): { src?: string; srcSet?: string } {
  return style === 'hd' ? { srcSet: `${url} 2x` } : { src: url };
}

function drawFigure(spec: FigureSpec, pose: Pose): Bitmap {
  return style === 'hd' ? renderFigureHD(spec, pose) : renderFigure(spec, pose);
}

function bitmapToCanvas(b: Bitmap): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(b.w, b.h);
  img.data.set(b.data);
  ctx.putImageData(img, 0, 0);
  return c;
}

function heroSpec(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}): FigureSpec {
  const def = HEROINE_MAP[heroId];
  const look: Look = skin && SKIN_MAP[skin] ? { ...def.look, ...SKIN_MAP[skin].look } : def.look;
  return {
    look,
    weapon: CLASS_WEAPON[def.cls],
    body: CLASS_BODY[def.cls],
    outfit: CLASS_OUTFIT[def.cls],
    element: def.element,
    ...opts,
  };
}

function enemySpec(enemyId: string, opts: Partial<SpriteSpec> = {}): FigureSpec {
  const def = ENEMY_MAP[enemyId];
  if (def?.hero) return heroSpec(def.hero, undefined, opts);
  const cls = def?.cls ?? ROLE_CLASS[def?.role ?? 'brute'];
  return {
    look: def.look,
    weapon: CLASS_WEAPON[cls],
    body: CLASS_BODY[cls],
    outfit: CLASS_OUTFIT[cls],
    element: def.element,
    ...opts,
  };
}

function specKey(kind: string, id: string, spec: Partial<SpriteSpec> & { skin?: string }, pose: Pose = {}): string {
  return `${kind}:${id}:${spec.skin ?? ''}:${spec.shadow ? 1 : 0}:${spec.tint ?? ''}:${spec.weapon ?? ''}:${pose.arms ?? 'idle'}:${pose.eyes ?? 'open'}:${pose.flap ? 1 : 0}`;
}

/** Кадр героини: поза рук и состояние глаз (кадры рисуются лениво и кэшируются). */
function heroCanvas(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}, pose: Pose = {}): HTMLCanvasElement {
  const key = specKey('h', heroId, { ...opts, skin }, pose);
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(drawFigure(heroSpec(heroId, skin, opts), pose));
    canvasCache.set(key, c);
  }
  return c;
}

function enemyCanvas(enemyId: string, opts: Partial<SpriteSpec> = {}, pose: Pose = {}): HTMLCanvasElement {
  const key = specKey('e', enemyId, opts, pose);
  let c = canvasCache.get(key);
  if (!c) {
    const def = ENEMY_MAP[enemyId];
    // волк Охотницы — зверь, а не гуманоид
    c = bitmapToCanvas(enemyId === 'wolf' ? renderWolf(def.look.hair, def.look.eyes, pose, style === 'hd') : drawFigure(enemySpec(enemyId, opts), pose));
    canvasCache.set(key, c);
  }
  return c;
}

/** Юнит боя: героиня, враг, призыв или тёмный двойник. */
export function unitCanvas(ref: string, opts: { mirror?: boolean; skin?: string } = {}, pose: Pose = {}): HTMLCanvasElement {
  // героини (в т.ч. отряд соперника на арене и тёмные двойники) — по своему облику
  if (HEROINE_MAP[ref]) return heroCanvas(ref, opts.skin, { shadow: opts.mirror }, pose);
  if (ENEMY_MAP[ref]) return enemyCanvas(ref, {}, pose);
  return heroCanvas('lira', undefined, {}, pose);
}

/** unarmed — без оружия в руках (сцены «Ухода»). */
export function heroUrl(heroId: string, skin?: string, pose: Pose = {}, unarmed = false): string {
  const opts: Partial<SpriteSpec> = unarmed ? { weapon: 'none' } : {};
  // без оружия боевая стойка выглядит странно (пустой кулак) — руки свободно опущены
  if (unarmed && (!pose.arms || pose.arms === 'idle' || pose.arms === 'idle2')) pose = { ...pose, arms: 'relaxed' };
  const u0 = unarmed ? ':u' : '';
  const key = `url:${heroId}:${skin ?? ''}:${pose.arms ?? 'idle'}:${pose.eyes ?? 'open'}:${pose.flap ? 1 : 0}${u0}`;
  let u = urlCache.get(key);
  if (!u) {
    u = heroCanvas(heroId, skin, opts, pose).toDataURL();
    urlCache.set(key, u);
    // заранее декодируем, чтобы смена кадра в <img> не мигала
    if (pose.arms || pose.eyes || pose.flap) {
      const img = new Image();
      img.src = u;
      img.decode?.().catch(() => {});
    }
  }
  return u;
}

export function enemyUrl(enemyId: string, pose: Pose = {}, unarmed = false): string {
  if (unarmed && (!pose.arms || pose.arms === 'idle' || pose.arms === 'idle2')) pose = { ...pose, arms: 'relaxed' };
  const key = `url:e:${enemyId}:${pose.arms ?? 'idle'}:${pose.eyes ?? 'open'}:${pose.flap ? 1 : 0}${unarmed ? ':u' : ''}`;
  let u = urlCache.get(key);
  if (!u) {
    u = enemyCanvas(enemyId, unarmed ? { weapon: 'none' } : {}, pose).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

/** Портрет: голова и плечи крупным планом. */
export function portraitUrl(heroId: string, skin?: string): string {
  const key = `portrait:${heroId}:${skin ?? ''}`;
  let u = urlCache.get(key);
  if (!u) {
    const src = heroCanvas(heroId, skin);
    // голова и плечи (в координатах 48×48: x13–34, y1–22), для HD — вдвое крупнее
    const f = src.width / 48;
    const c = document.createElement('canvas');
    c.width = 22 * f;
    c.height = 22 * f;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 13 * f, 1 * f, 22 * f, 22 * f, 0, 0, 22 * f, 22 * f);
    u = c.toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

export function iconUrl(name: string): string {
  const key = `icon:${name}`;
  let u = urlCache.get(key);
  if (!u) {
    u = bitmapToCanvas(renderIcon(name)).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

/** Иконка предмета: форма по типу базы, цвета по редкости, украшения по тиру. */
export function itemIconUrl(item: Pick<Item, 'base' | 'slot' | 'rarity'>): string {
  const base = BASE_ITEM_MAP[item.base];
  const slot = base?.slot ?? item.slot;
  const type = base?.type ?? item.slot;
  const tier = base?.tier ?? 1;
  const key = `item:${slot}:${type}:${tier}:${item.rarity}`;
  let u = urlCache.get(key);
  if (!u) {
    u = bitmapToCanvas(renderItemIcon(slot, type, tier, item.rarity)).toDataURL();
    urlCache.set(key, u);
  }
  return u;
}
