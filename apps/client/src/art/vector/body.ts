import { LINE, dark, light, limb, lerp, mix, smooth, type P, type Svg } from './core';
import type { ArmRig, Eyes } from './rig';

export interface Pal {
  skin: string;
  skinShade: string;
  skinDeep: string;
  hair: string;
  eyes: string;
  /** одежда, отделка, аксессуар, стихия */
  O: string;
  T: string;
  A: string;
  G: string;
  /** бельё/купальник — контрастный к коже */
  B: string;
  /** сталь, кожа/дерево, белая ткань, тёмная ткань, тёмно-фиолетовый, перья, листва */
  K: string;
  W: string;
  R: string;
  F: string;
  D: string;
  Q: string;
  V: string;
}

// ——— ноги (общие для всех; наряды обрезают по ним чулки и сапоги) ———
export const LEG_L =
  'M149 392 C141 424 140 462 146 500 C150 526 156 546 160 562 C156 584 154 612 158 640 C161 668 166 700 170 726 L188 726 C188 700 190 672 191 644 C193 614 191 586 189 566 C193 540 197 512 198 480 C199 458 200 436 199 418 L176 418 Z';
export const LEG_R =
  'M251 392 C259 424 260 462 254 500 C250 526 244 546 240 562 C244 584 246 612 242 640 C239 668 234 700 230 726 L212 726 C212 700 210 672 209 644 C207 614 209 586 211 566 C207 540 203 512 202 480 C201 458 200 436 201 418 L224 418 Z';
export const TORSO =
  'M188 184 L188 212 C175 220 158 221 146 229 C138 238 140 252 146 262 C150 290 160 312 170 330 C166 350 153 372 149 392 C151 405 162 414 176 418 L224 418 C238 414 249 405 251 392 C247 372 234 350 230 330 C240 312 250 290 254 262 C260 252 262 238 254 229 C242 221 225 220 212 212 L212 184 Z';
export const FACE = 'M158 118 C156 150 162 172 178 185 C188 193 196 196 200 196 C204 196 212 193 222 185 C238 172 244 150 242 118 C240 94 222 80 200 80 C178 80 160 94 158 118 Z';

/** Контур «ниже линии y»: для обрезки чулок/сапог по форме ноги. */
export function clipBelow(sv: Svg, y: number, curve = 8): string {
  const id = sv.id('k');
  sv.defs.push(`<clipPath id="${id}"><path d="M60 ${y} C130 ${y + curve} 170 ${y + curve + 2} 200 ${y + 2} C230 ${y + curve + 2} 270 ${y + curve} 340 ${y} L340 800 L60 800 Z"/></clipPath>`);
  return `url(#${id})`;
}

export function drawLegs(sv: Svg, p: Pal) {
  const skin = sv.mat(p.skin, 0.12, 0.12);
  sv.shape(LEG_L, skin, { shade: 'M176 418 L199 418 C200 452 197 512 189 566 C191 600 191 660 188 726 L180 726 C184 660 186 560 190 470 Z', shadeColor: p.skinShade });
  sv.shape(LEG_R, skin, { shade: 'M236 400 C262 440 258 520 240 562 C246 610 240 680 230 726 L262 726 L262 400 Z', shadeColor: p.skinShade });
  sv.line('M162 556 C170 562 182 562 188 556 M212 556 C218 562 230 562 238 556', p.skinDeep, 1.3, 'opacity="0.45"');
  // ступни (босиком — сандалии/туфли рисует наряд поверх)
  sv.shape('M168 722 C166 740 160 756 156 766 C170 772 186 770 190 760 C190 748 190 736 188 722 Z', skin, { shade: 'M180 722 L192 722 L192 772 L178 772 Z', shadeColor: p.skinShade });
  sv.shape('M232 722 C234 740 240 756 244 766 C230 772 214 770 210 760 C210 748 210 736 212 722 Z', skin, { shade: 'M212 722 L224 722 L226 772 L208 772 Z', shadeColor: p.skinShade });
}

export function drawTorso(sv: Svg, p: Pal) {
  sv.shape(TORSO, sv.mat(p.skin, 0.12, 0.12), {
    shade: 'M240 226 C262 240 262 300 238 340 C250 370 256 400 240 420 L270 420 L270 220 Z M170 300 C180 330 196 336 200 334 C204 336 220 330 230 300 C224 324 212 340 200 342 C188 340 176 324 170 300 Z',
    shadeColor: p.skinShade,
    rim: 'M146 232 C136 260 150 300 162 320 L150 320 L140 232 Z',
  });
  sv.line('M168 226 C178 230 186 230 194 226 M206 226 C214 230 222 230 232 226', p.skinDeep, 1.3, 'opacity="0.5"');
  sv.add(`<ellipse cx="200" cy="352" rx="2.2" ry="4" fill="${p.skinDeep}" opacity="0.65"/>`);
  // тень под подбородком
  sv.add(`<path d="M188 188 C194 200 206 200 212 188 L212 206 C206 212 194 212 188 206 Z" fill="${p.skinShade}" filter="url(#soft2)" opacity="0.8"/>`);
}

export function drawBust(sv: Svg, p: Pal) {
  const g = sv.rad([[0, light(p.skin, 0.25)], [0.55, p.skin], [1, p.skinShade]], 0.38, 0.35, 0.65);
  for (const cx of [179, 221]) sv.add(`<ellipse cx="${cx}" cy="268" rx="27" ry="25" fill="${g}" stroke="${LINE}" stroke-width="1.4"/>`);
  sv.add(`<path d="M200 252 C198 266 198 280 200 290" stroke="${p.skinDeep}" stroke-width="2" opacity="0.45" fill="none" filter="url(#soft2)"/>`);
}

// ——— руки ———

function armPoints(a: ArmRig): P[] {
  const m1 = lerp(a.s, a.e, 0.5);
  const m2 = lerp(a.e, a.w, 0.5);
  return [a.s, m1, a.e, m2, a.w];
}

export function armPath(a: ArmRig): string {
  return limb(armPoints(a), [13, 11.5, 9.2, 8, 6.8]);
}

/** Предплечье (перчатка, наруч): от доли t0 предплечья до кисти. */
export function forearmPath(a: ArmRig, t0 = 0, pad = 0.8): string {
  const start = lerp(a.e, a.w, t0);
  return limb([start, lerp(start, a.w, 0.5), a.w], [9.2 - t0 * 2 + pad, 8 + pad, 6.8 + pad]);
}

export function upperArmPath(a: ArmRig, pad = 1.5): string {
  return limb([a.s, lerp(a.s, a.e, 0.5), a.e], [13 + pad, 11.5 + pad, 9.2 + pad]);
}

export function drawArm(sv: Svg, p: Pal, a: ArmRig) {
  const d = armPath(a);
  const inner = a.s[0] < 200;
  // тень на внутренней стороне руки
  const sh: P[] = armPoints(a).map((q) => [q[0] + (inner ? 7 : 7), q[1] + 2] as P);
  sv.shape(d, sv.mat(p.skin, 0.12, 0.12), { shade: limb(sh, [8, 7, 6, 5, 4]), shadeColor: p.skinShade, shadeOpacity: 0.7 });
  sv.line(smooth([lerp(a.e, a.s, 0.12), a.e, lerp(a.e, a.w, 0.12)]), p.skinDeep, 1, 'opacity="0.35"');
}

export function drawHand(sv: Svg, p: Pal, a: ArmRig, color?: string) {
  const dx = a.w[0] - a.e[0];
  const dy = a.w[1] - a.e[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
  const fill = color ? sv.mat(color, 0.2, 0.3) : sv.mat(p.skin, 0.15, 0.1);
  if (a.hand === 'hip') {
    const cx = a.w[0] + 4;
    const cy = a.w[1] + 5;
    sv.add(`<g transform="translate(${cx} ${cy}) rotate(-28)"><ellipse rx="12" ry="8" fill="${fill}" stroke="${LINE}" stroke-width="1.3"/><path d="M-4 -6 L-5 6 M1 -7 L0 7 M6 -6 L5 6" stroke="${color ? dark(color, 0.4) : p.skinDeep}" stroke-width="0.9" opacity="0.6"/></g>`);
    return;
  }
  const cx = a.w[0] + ux * (a.hand === 'open' ? 8 : 5);
  const cy = a.w[1] + uy * (a.hand === 'open' ? 8 : 5);
  if (a.hand === 'fist') {
    sv.add(
      `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${ang.toFixed(1)})"><ellipse rx="9" ry="9.5" fill="${fill}" stroke="${LINE}" stroke-width="1.3"/><path d="M-6 3 C-2 6 2 6 6 3" stroke="${color ? dark(color, 0.4) : p.skinDeep}" stroke-width="1" fill="none" opacity="0.7"/><ellipse cx="-7" cy="-2" rx="3.2" ry="4.5" fill="${fill}" stroke="${LINE}" stroke-width="1"/></g>`,
    );
  } else {
    sv.add(
      `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${ang.toFixed(1)})"><path d="M-6 -8 C-8 0 -6 9 -2 13 C1 15 5 13 6 8 C7 0 6 -7 4 -9 Z" fill="${fill}" stroke="${LINE}" stroke-width="1.2"/><ellipse cx="-7" cy="-3" rx="2.6" ry="5" transform="rotate(-20 -7 -3)" fill="${fill}" stroke="${LINE}" stroke-width="1"/><path d="M-2 2 L-2 11 M2 2 L2 11" stroke="${color ? dark(color, 0.4) : p.skinDeep}" stroke-width="0.8" opacity="0.6"/></g>`,
    );
  }
}

// ——— лицо ———

function eye(sv: Svg, p: Pal, cx: number, flip: boolean, state: Exclude<Eyes, 'wink'>, glow?: string) {
  const s = flip ? -1 : 1;
  const X = (dx: number) => (cx + dx * s).toFixed(1);
  const lashC = '#221016';
  if (state === 'closed') {
    // закрытый глаз: изогнутая линия ресниц вниз
    sv.add(`<path d="M${X(-15)} 144 C${X(-8)} 152 ${X(8)} 152 ${X(16)} 142" stroke="${lashC}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
    sv.add(`<path d="M${X(14)} 144 l${4 * s} 2 M${X(10)} 148 l${3 * s} 3" stroke="${lashC}" stroke-width="1.6" stroke-linecap="round"/>`);
    sv.add(`<path d="M${X(-14)} 121 C${X(-6)} 116 ${X(7)} 115 ${X(15)} 120" stroke="${dark(p.hair, 0.45)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    return;
  }
  const white = `M${X(-15)} 147 C${X(-11)} 133 ${X(9)} 129 ${X(16)} 139 C${X(14)} 151 ${X(-4)} 157 ${X(-15)} 147 Z`;
  sv.add(`<path d="${white}" fill="#fffaf6"/>`);
  const cid = sv.id('e');
  sv.defs.push(`<clipPath id="${cid}"><path d="${white}"/></clipPath>`);
  const iris = glow ?? p.eyes;
  const irisG = sv.lin([[0, dark(iris, 0.6)], [0.55, iris], [1, light(iris, 0.5)]], 0, 0, 0, 1);
  let e = `<g clip-path="url(#${cid})">`;
  e += `<path d="M${X(-15)} 147 C${X(-11)} 139 ${X(9)} 136 ${X(16)} 141 L${X(16)} 131 L${X(-15)} 131 Z" fill="#e6c8c8" opacity="0.7"/>`;
  e += `<ellipse cx="${X(1)}" cy="144" rx="10.5" ry="12.5" fill="${irisG}"/>`;
  e += `<ellipse cx="${X(1)}" cy="149" rx="7" ry="5" fill="${light(iris, 0.55)}" opacity="0.55" filter="url(#soft2)"/>`;
  e += `<ellipse cx="${X(1)}" cy="144" rx="10.5" ry="12.5" fill="none" stroke="${dark(iris, 0.65)}" stroke-width="1.4"/>`;
  e += `<ellipse cx="${X(1)}" cy="143" rx="4.2" ry="6" fill="${dark(iris, 0.8)}"/>`;
  e += `<circle cx="${X(-3)}" cy="138" r="3.4" fill="#fff"/><circle cx="${X(5)}" cy="150" r="1.6" fill="#fff" opacity="0.9"/><circle cx="${X(-6)}" cy="146" r="0.9" fill="#fff" opacity="0.8"/>`;
  if (state === 'half') e += `<path d="M${X(-17)} 125 L${X(18)} 125 L${X(18)} 144 C${X(8)} 139 ${X(-8)} 140 ${X(-17)} 146 Z" fill="${p.skin}"/>`;
  e += '</g>';
  sv.add(e);
  const lidY = state === 'half' ? 8 : 0;
  sv.add(
    `<path d="M${X(-17)} ${146 + lidY * 0.2} C${X(-12)} ${130 + lidY} ${X(9)} ${126 + lidY} ${X(17)} ${138 + lidY * 0.4} L${X(21)} ${134 + lidY * 0.4} C${X(13)} ${124 + lidY} ${X(-11)} ${124 + lidY} ${X(-18)} ${142 + lidY * 0.2} Z" fill="${lashC}"/>`,
  );
  sv.add(`<path d="M${X(16)} ${137 + lidY * 0.4} l${4 * s} -5 M${X(12)} ${131 + lidY * 0.7} l${3 * s} -5 M${X(7)} ${128.5 + lidY} l${2 * s} -5" stroke="${lashC}" stroke-width="1.8" stroke-linecap="round"/>`);
  sv.add(`<path d="M${X(-12)} ${128 - (state === 'half' ? 0 : 0)} C${X(-4)} 122 ${X(8)} 122 ${X(15)} 128" stroke="${p.skinDeep}" stroke-width="1.1" fill="none" opacity="0.65"/>`);
  sv.add(`<path d="M${X(-6)} 154 C${X(2)} 156 ${X(10)} 153 ${X(15)} 146" stroke="#6a2a34" stroke-width="1.1" fill="none" opacity="0.8"/>`);
  sv.add(`<path d="M${X(-14)} 121 C${X(-6)} 115 ${X(7)} 114 ${X(15)} 119" stroke="${dark(p.hair, 0.45)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
}

export function drawFace(sv: Svg, p: Pal, eyes: Eyes, glowEyes?: string) {
  sv.shape(FACE, sv.mat(p.skin, 0.12, 0.1), { shade: 'M228 100 C248 130 240 180 206 196 L250 196 L250 100 Z', shadeColor: p.skinShade, shadeOpacity: 0.5 });
  const blush = sv.rad([[0, '#ff7a8a', 0.5], [1, '#ff7a8a', 0]]);
  sv.add(`<ellipse cx="173" cy="163" rx="12" ry="6" fill="${blush}"/><ellipse cx="227" cy="163" rx="12" ry="6" fill="${blush}"/>`);
  // левый (от зрителя) глаз зеркален: внешний уголок и ресницы — к виску
  eye(sv, p, 180, true, eyes === 'wink' ? 'open' : eyes, glowEyes);
  eye(sv, p, 220, false, eyes === 'wink' ? 'closed' : eyes, glowEyes);
  sv.add(`<path d="M201 158 C202 162 202 165 199 166" stroke="${p.skinDeep}" stroke-width="1.3" fill="none" opacity="0.75"/>`);
  const lip = mix(p.skin, '#c0304a', 0.65);
  if (eyes === 'wink') {
    // игривая улыбка набок
    sv.add(`<path d="M190 174 C196 180 205 180 211 171 C207 182 196 183 190 174 Z" fill="${lip}"/>`);
    sv.add(`<path d="M190 174 C196 178 205 178 211 171" stroke="#8a2a3a" stroke-width="1.2" fill="none"/>`);
  } else {
    sv.add(`<path d="M191 175 C196 179 204 179 209 175 C205 182 195 182 191 175 Z" fill="${lip}"/>`);
    sv.add(`<path d="M191 175 C196 177 204 177 209 175" stroke="#8a2a3a" stroke-width="1.2" fill="none"/>`);
  }
  sv.add(`<path d="M194 178 C198 180 202 180 206 178" stroke="#ff9ab0" stroke-width="1.3" fill="none" opacity="0.8"/>`);
  sv.add(`<path d="M196 186 C199 188 201 188 204 186" stroke="${p.skinShade}" stroke-width="1.3" fill="none" opacity="0.55"/>`);
}
