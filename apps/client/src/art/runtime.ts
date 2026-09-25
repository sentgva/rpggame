import { CLASSES, ENEMY_MAP, HEROINE_MAP, SKIN_MAP, type Look } from '@idle/shared';
import { renderIcon } from './icons';
import { CLASS_BODY, CLASS_WEAPON, ROLE_CLASS, renderSprite, type Bitmap, type SpriteSpec } from './sprite';

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

export function heroSpec(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}): SpriteSpec {
  const def = HEROINE_MAP[heroId];
  const look: Look = skin && SKIN_MAP[skin] ? { ...def.look, ...SKIN_MAP[skin].look } : def.look;
  return {
    look,
    weapon: CLASS_WEAPON[def.cls],
    body: CLASS_BODY[def.cls],
    element: def.element,
    ...opts,
  };
}

export function enemySpec(enemyId: string, opts: Partial<SpriteSpec> = {}): SpriteSpec {
  const def = ENEMY_MAP[enemyId];
  if (def?.hero) return heroSpec(def.hero, undefined, opts);
  const cls = ROLE_CLASS[def?.role ?? 'brute'];
  return {
    look: def.look,
    weapon: CLASS_WEAPON[cls],
    body: CLASS_BODY[cls],
    element: def.element,
    ...opts,
  };
}

function specKey(kind: string, id: string, spec: Partial<SpriteSpec> & { skin?: string }): string {
  return `${kind}:${id}:${spec.skin ?? ''}:${spec.shadow ? 1 : 0}:${spec.tint ?? ''}`;
}

export function heroCanvas(heroId: string, skin?: string, opts: Partial<SpriteSpec> = {}): HTMLCanvasElement {
  const key = specKey('h', heroId, { ...opts, skin });
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(renderSprite(heroSpec(heroId, skin, opts)));
    canvasCache.set(key, c);
  }
  return c;
}

export function enemyCanvas(enemyId: string, opts: Partial<SpriteSpec> = {}): HTMLCanvasElement {
  const key = specKey('e', enemyId, opts);
  let c = canvasCache.get(key);
  if (!c) {
    c = bitmapToCanvas(renderSprite(enemySpec(enemyId, opts)));
    canvasCache.set(key, c);
  }
  return c;
}

/** Юнит боя: героиня, враг, призыв или тёмный двойник. */
export function unitCanvas(ref: string, side: 0 | 1, opts: { mirror?: boolean; skin?: string } = {}): HTMLCanvasElement {
  if (HEROINE_MAP[ref] && (side === 0 || opts.mirror)) return heroCanvas(ref, opts.skin, { shadow: opts.mirror });
  if (ENEMY_MAP[ref]) return enemyCanvas(ref);
  return heroCanvas('lira');
}

export function heroUrl(heroId: string, skin?: string): string {
  const key = `url:${heroId}:${skin ?? ''}`;
  let u = urlCache.get(key);
  if (!u) {
    u = heroCanvas(heroId, skin).toDataURL();
    urlCache.set(key, u);
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
    const c = document.createElement('canvas');
    c.width = 20;
    c.height = 18;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 6, 0, 20, 18, 0, 0, 20, 18);
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
