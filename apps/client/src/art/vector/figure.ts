import type { Element, Look } from '@idle/shared';
import { ELEMENT_COLORS } from '@idle/shared';
import { accessoryBack, accessoryFront, accessoryMid, type Accessory } from './accessories';
import { drawArm, drawBust, drawFace, drawHand, drawLegs, drawTorso, type Pal } from './body';
import { Svg, contrastColor, dark, mix, rgb } from './core';
import { extraBack, extraFront, lowerExtra, type Extra } from './extras';
import { hairBack, hairFront, hairMid, type HairStyle } from './hair';
import { outfitLayers, type OutfitKind } from './outfits';
import { rigFor, type Arms, type Eyes, type WeaponKind } from './rig';
import { weaponLeft, weaponRight } from './weapons';

export interface VSpec {
  look: Look;
  weapon: WeaponKind;
  element: Element;
  outfit?: OutfitKind;
  /** тёмный двойник */
  shadow?: boolean;
  /** тонировка (заморозка и т. п.) */
  tint?: string;
}

export interface VPose {
  eyes?: Eyes;
  arms?: Arms;
  flap?: boolean;
}

/** Квадратный кадр — как прежний пиксельный холст: персонаж того же размера в игре. */
export const VIEW = '-200 0 800 800';
/** Голова и плечи для аватарки. */
export const PORTRAIT_VIEW = '128 40 144 144';

export function palette(look: Look, element: Element): Pal {
  const skin = look.skin;
  const O = look.outfit;
  const T = look.trim;
  const G = ELEMENT_COLORS[element] ?? '#FFE8A0';
  return {
    skin,
    skinShade: mix(dark(skin, 0.28), '#c0506a', 0.25),
    skinDeep: mix(dark(skin, 0.45), '#8a3050', 0.3),
    hair: look.hair,
    eyes: look.eyes,
    O,
    T,
    A: look.accColor ?? T,
    G,
    B: contrastColor(skin, [O, T, G, dark(O, 0.55), '#2A1622']),
    K: '#C8D0DE',
    W: '#8A5A34',
    R: '#F2ECE4',
    F: mix(dark(O, 0.55), '#2A1A2A', 0.5),
    D: '#3A1E44',
    Q: '#F6F2FF',
    V: '#3F8A34',
  };
}

function colorMatrix(id: string, color: string, k: number): string {
  const [r, g, b] = rgb(color).map((v) => v / 255);
  const a = 1 - k;
  return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${a} 0 0 0 ${(k * r).toFixed(3)} 0 ${a} 0 0 ${(k * g).toFixed(3)} 0 0 ${a} 0 ${(k * b).toFixed(3)} 0 0 0 1 0"/></filter>`;
}

/** Собрать персонажа в SVG. */
export function renderVectorSvg(spec: VSpec, pose: VPose = {}, viewBox = VIEW): string {
  const L = spec.look;
  const p = palette(L, spec.element);
  const sv = new Svg();
  const rig = rigFor(spec.weapon, pose.arms ?? 'idle');
  const wear = L.wear;
  const layers = outfitLayers(wear ?? spec.outfit ?? 'witch', sv, p, rig);
  const extra = L.extra as Extra;
  const acc = (L.acc ?? 'none') as Accessory;
  const flap = !!pose.flap;

  // тень на полу
  sv.add(`<ellipse cx="205" cy="772" rx="118" ry="15" fill="${sv.rad([[0, '#000', 0.4], [1, '#000', 0]])}"/>`);
  extraBack(sv, p, extra, flap);
  accessoryBack(sv, p, acc);
  hairBack(sv, p, L.style as HairStyle);
  layers.back?.();
  const replaced = lowerExtra(sv, p, extra, flap);
  if (!replaced) {
    drawLegs(sv, p);
    layers.legs?.();
  }
  drawTorso(sv, p);
  drawBust(sv, p);
  layers.torso?.();
  hairMid(sv, p, L.style as HairStyle);
  drawArm(sv, p, rig.L);
  drawArm(sv, p, rig.R);
  layers.arms?.();
  // щит закрывает левую кисть, лютню держат обе руки поверх
  if (spec.weapon === 'sword') {
    drawHand(sv, p, rig.L, layers.hand);
    weaponLeft(sv, p, spec.weapon, rig.gripL);
  } else {
    weaponLeft(sv, p, spec.weapon, rig.gripL);
    drawHand(sv, p, rig.L, layers.hand);
  }
  weaponRight(sv, p, spec.weapon, rig.gripR, pose.arms === 'attack');
  drawHand(sv, p, rig.R, layers.hand);
  drawFace(sv, p, pose.eyes ?? 'open');
  accessoryMid(sv, p, acc);
  hairFront(sv, p, L.style as HairStyle);
  accessoryFront(sv, p, acc);
  extraFront(sv, p, extra);

  let wrap: { filter?: string } | undefined;
  const modeId = sv.pre + 'mode';
  if (spec.shadow) {
    sv.defs.push(colorMatrix(modeId, '#2A0E3A', 0.62));
    wrap = { filter: modeId };
  } else if (spec.tint) {
    sv.defs.push(colorMatrix(modeId, spec.tint, 0.45));
    wrap = { filter: modeId };
  }
  let svg = sv.toString(viewBox, wrap);
  if (spec.shadow && pose.eyes !== 'closed') {
    // глаза тёмного двойника светятся поверх тонировки
    const glow = `<g><ellipse cx="181" cy="144" rx="6" ry="7" fill="#E040FF" filter="url(#soft2)"/><ellipse cx="221" cy="144" rx="6" ry="7" fill="#E040FF" filter="url(#soft2)"/><ellipse cx="181" cy="144" rx="3" ry="4" fill="#ffb0ff"/><ellipse cx="221" cy="144" rx="3" ry="4" fill="#ffb0ff"/></g>`;
    svg = svg.replace(/<\/svg>$/, glow + '</svg>');
  }
  return svg;
}
