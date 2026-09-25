import { BASE_ITEM_MAP, CLASSES, ENEMY_MAP, HEROINE_MAP, SKIN_MAP, type Item, type Look } from '@idle/shared';
import { renderIcon } from './icons';
import { renderItemIcon } from './itemArt';
import { CLASS_OUTFIT, renderFigure, type OutfitKind, type Pose } from './figure';
import { CLASS_BODY, CLASS_WEAPON, ROLE_CLASS, type Bitmap, type SpriteSpec } from './sprite';

type FigureSpec = SpriteSpec & { outfit?: OutfitKind };

const canvasCache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();

export function bitmapToCanvas(b: Bitmap): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = b.w;
  c.height = b.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(b.w, b.h);
  img.data.set(b.data);
  ctx.putImageData(img, 0, 0);
  return c;
}

export function heroSpec(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}): FigureSpec {
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

export function enemySpec(enemyId: string, opts: Partial<SpriteSpec> = {}): FigureSpec {
  const def = ENEMY_MAP[enemyId];
  if (def?.hero) return heroSpec(def.hero, undefined, opts);
  const cls = ROLE_CLASS[def?.role ?? 'brute'];
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
  return `${kind}:${id}:${spec.skin ?? ''}:${spec.shadow ? 1 : 0}:${spec.tint ?? ''}:${pose.arms ?? 'idle'}:${pose.eyes ?? 'open'}`;
}

/** Кадр героини: поза рук и состояние глаз (кадры рисуются лениво и кэшируются). */
export function heroCanvas(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}, pose: Pose = {}): HTMLCanvasElement {
  const key = specKey('h', heroId, { ...opts, skin }, pose);
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(renderFigure(heroSpec(heroId, skin, opts), pose));
    canvasCache.set(key, c);
  }
  return c;
}

export function enemyCanvas(enemyId: string, opts: Partial<SpriteSpec> = {}, pose: Pose = {}): HTMLCanvasElement {
  const key = specKey('e', enemyId, opts, pose);
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(renderFigure(enemySpec(enemyId, opts), pose));
    canvasCache.set(key, c);
  }
  return c;
}

/** Юнит боя: героиня, враг, призыв или тёмный двойник. */
export function unitCanvas(ref: string, side: 0 | 1, opts: { mirror?: boolean; skin?: string } = {}, pose: Pose = {}): HTMLCanvasElement {
  if (HEROINE_MAP[ref] && (side === 0 || opts.mirror)) return heroCanvas(ref, opts.skin, { shadow: opts.mirror }, pose);
  if (ENEMY_MAP[ref]) return enemyCanvas(ref, {}, pose);
  return heroCanvas('lira', undefined, {}, pose);
}

export function heroUrl(heroId: string, skin?: string, pose: Pose = {}): string {
  const key = `url:${heroId}:${skin ?? ''}:${pose.arms ?? 'idle'}:${pose.eyes ?? 'open'}`;
  let u = urlCache.get(key);
  if (!u) {
    u = heroCanvas(heroId, skin, {}, pose).toDataURL();
    urlCache.set(key, u);
    // заранее декодируем, чтобы смена кадра в <img> не мигала
    if (pose.arms || pose.eyes) {
      const img = new Image();
      img.src = u;
      img.decode?.().catch(() => {});
    }
  }
  return u;
}

export function enemyUrl(enemyId: string): string {
  const key = `url:e:${enemyId}`;
  let u = urlCache.get(key);
  if (!u) {
    u = enemyCanvas(enemyId).toDataURL();
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
    // голова и плечи фигуры 48×48 (голова x18–29, y5–15)
    const c = document.createElement('canvas');
    c.width = 22;
    c.height = 22;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 13, 1, 22, 22, 0, 0, 22, 22);
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

export function iconCanvas(name: string): HTMLCanvasElement {
  const key = `iconc:${name}`;
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(renderIcon(name));
    canvasCache.set(key, c);
  }
  return c;
}

export function classIcon(cls: string): string {
  return iconUrl(CLASSES[cls as keyof typeof CLASSES] ? cls : 'hero');
}
