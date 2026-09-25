import { LINE, dark, lerp, light, limb, smooth, type P, type Svg } from './core';
import { LEG_L, LEG_R, clipBelow, forearmPath, upperArmPath, type Pal } from './body';
import type { ArmRig, Rig } from './rig';

export type OutfitKind = 'knight' | 'barbarian' | 'ranger' | 'witch' | 'cleric' | 'reaper' | 'rogue' | 'minstrel';
export type Wear = 'swim' | 'swim2' | 'swim3' | 'swim4' | 'lace' | 'lace2' | 'lace3' | 'lace4' | 'dancer' | 'regalia';

export interface Layers {
  /** за телом: полы мантии, шлейфы */
  back?: () => void;
  /** поверх ног: чулки, сапоги, обувь */
  legs?: () => void;
  /** поверх торса: верх, корсеты, низ, пояса, украшения */
  torso?: () => void;
  /** поверх рук: перчатки, рукава, наплечники */
  arms?: () => void;
  /** цвет кистей, если на них перчатки */
  hand?: string;
}

interface C {
  sv: Svg;
  p: Pal;
  rig: Rig;
}

// ——— детали одежды ———

type Cup = 'micro' | 'balconette' | 'bandeau' | 'plunge';

function cups(c: C, style: Cup, color: string, trim?: string) {
  const { sv } = c;
  const fill = sv.mat(color, 0.25, 0.35);
  const shade = dark(color, 0.55);
  if (style === 'micro') {
    for (const s of [-1, 1]) {
      const X = (x: number) => 200 + (x - 200) * s;
      sv.shape(`M${X(170)} 250 C${X(160)} 260 ${X(155)} 276 ${X(159)} 288 C${X(172)} 293 ${X(188)} 292 ${X(197)} 285 C${X(195)} 270 ${X(185)} 257 ${X(170)} 250 Z`, fill, { shade: s > 0 ? 'M200 250 L250 250 L250 300 L214 300 Z' : 'M150 280 L200 290 L200 300 L150 300 Z', shadeColor: shade, shadeOpacity: 0.55 });
      sv.line(`M${X(170)} 250 L${X(190)} 212 M${X(159)} 282 L${X(145)} 276`, color, 2.2);
      if (trim) sv.line(`M${X(170)} 251 C${X(160)} 261 ${X(155)} 276 ${X(159)} 288`, trim, 1.8);
    }
    sv.line('M196 282 L204 282', color, 2);
    return;
  }
  if (style === 'balconette') {
    for (const s of [-1, 1]) {
      const X = (x: number) => 200 + (x - 200) * s;
      sv.shape(`M${X(152)} 264 C${X(160)} 274 ${X(172)} 278 ${X(182)} 276 C${X(192)} 274 ${X(198)} 268 ${X(200)} 264 L${X(200)} 294 C${X(188)} 300 ${X(164)} 300 ${X(150)} 290 C${X(148)} 280 ${X(149)} 272 ${X(152)} 264 Z`, fill, { shade: s > 0 ? 'M226 262 L256 262 L256 300 L220 300 Z' : 'M150 282 L200 294 L200 300 L150 300 Z', shadeColor: shade, shadeOpacity: 0.55 });
      sv.line(`M${X(166)} 266 C${X(164)} 250 ${X(162)} 238 ${X(160)} 228`, color, 2.4);
    }
    // кружевная кромка
    let lace = '';
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const y = 264 + Math.sin(t * Math.PI) * 11;
      lace += `M${(152 + t * 48).toFixed(1)} ${y.toFixed(1)} q3 -6 6 0 M${(248 - t * 48).toFixed(1)} ${y.toFixed(1)} q-3 -6 -6 0 `;
    }
    sv.line(lace, trim ?? light(color, 0.45), 1.7);
    return;
  }
  if (style === 'bandeau') {
    sv.shape('M148 258 C172 250 228 250 252 258 L253 284 C228 294 172 294 147 284 Z', fill, { shade: 'M222 250 L256 250 L256 294 L222 294 Z', shadeColor: shade, shadeOpacity: 0.55 });
    sv.line('M150 262 C174 255 226 255 250 262', light(color, 0.4), 1.5, 'opacity="0.7"');
    sv.line('M200 256 C198 266 198 280 200 290', dark(color, 0.5), 2);
    if (trim) sv.line('M147 284 C172 294 228 294 253 284', trim, 1.8);
    return;
  }
  // plunge: две полосы ткани по груди, сходящиеся к пупку
  for (const s of [-1, 1]) {
    const X = (x: number) => 200 + (x - 200) * s;
    sv.shape(`M${X(190)} 212 C${X(172)} 236 ${X(154)} 252 ${X(152)} 272 C${X(152)} 286 ${X(162)} 294 ${X(176)} 296 C${X(184)} 306 ${X(192)} 322 ${X(197)} 342 L${X(200)} 342 L${X(200)} 330 C${X(194)} 312 ${X(188)} 298 ${X(186)} 288 C${X(184)} 270 ${X(190)} 240 ${X(200)} 216 Z`, fill, { shade: s > 0 ? 'M226 240 L256 240 L256 300 L220 300 Z' : 'M150 284 L186 296 L186 300 L150 300 Z', shadeColor: shade, shadeOpacity: 0.55 });
    if (trim) sv.line(`M${X(200)} 216 C${X(190)} 240 ${X(184)} 270 ${X(186)} 288 C${X(188)} 298 ${X(194)} 312 ${X(200)} 330`, trim, 1.8);
  }
}

function bottom(c: C, color: string, ties?: string, plate = false) {
  const { sv } = c;
  const d = plate ? 'M170 394 C186 400 214 400 230 394 C224 408 212 418 200 424 C188 418 176 408 170 394 Z' : 'M176 396 C186 400 214 400 224 396 C218 406 208 414 200 420 C192 414 182 406 176 396 Z';
  sv.shape(d, sv.mat(color, 0.25, 0.35), {});
  sv.line('M149 386 C160 392 170 395 177 396 M251 386 C240 392 230 395 223 396', ties ?? color, 2.2);
}

function corset(c: C, y0: number, y1: number, color: string, trim: string, lacing = true) {
  const { sv } = c;
  const d = `M160 ${y0} C168 ${y0 + 18} 172 ${Math.min(326, y1 - 20)} 170 ${Math.min(336, y1 - 10)} C166 ${y1 - 14} 161 ${y1 - 7} 159 ${y1} L241 ${y1} C239 ${y1 - 7} 234 ${y1 - 14} 230 ${Math.min(336, y1 - 10)} C228 ${Math.min(326, y1 - 20)} 232 ${y0 + 18} 240 ${y0} C226 ${y0 + 6} 212 ${y0 + 8} 200 ${y0 + 8} C188 ${y0 + 8} 174 ${y0 + 6} 160 ${y0} Z`;
  sv.shape(d, sv.mat(color, 0.22, 0.4), { shade: `M226 ${y0} L246 ${y0} L244 ${y1} L222 ${y1} Z`, shadeColor: dark(color, 0.55) });
  sv.add(`<path d="${d}" fill="none" stroke="${trim}" stroke-width="2.4"/>`);
  if (lacing) {
    let l = '';
    for (let y = y0 + 12; y < y1 - 4; y += 9) l += `M194 ${y} L206 ${y + 7} M206 ${y} L194 ${y + 7} `;
    sv.line(l, trim, 1.5);
  }
}

function band(c: C, y: number, color: string, w = 3.2, x0 = 160, x1 = 240) {
  const mid = (x0 + x1) / 2;
  c.sv.line(`M${x0} ${y} C${mid - 20} ${y + 3} ${mid + 20} ${y + 3} ${x1} ${y}`, color, w);
}

function garters(c: C, y0: number, y1: number, color: string) {
  c.sv.line(`M163 ${y0} C161 ${y0 + 40} 159 ${y1 - 30} 158 ${y1} M237 ${y0} C239 ${y0 + 40} 241 ${y1 - 30} 242 ${y1}`, color, 2.4);
  for (const x of [154.5, 238.5]) c.sv.add(`<rect x="${x}" y="${y1 - 4}" width="7" height="6" rx="1" fill="${c.sv.mat(c.p.T, 0.35, 0.3)}" stroke="${LINE}" stroke-width="0.8"/>`);
}

/** Чулки/сапоги/поножи: форма ноги, обрезанная ниже topY. */
function legwear(c: C, topY: number, color: string, opts: { cuff?: string; lace?: boolean; fishnet?: boolean; sheen?: boolean; curve?: number } = {}) {
  const { sv } = c;
  const clip = clipBelow(sv, topY, opts.curve ?? 8);
  let fill = sv.lin([[0, dark(color, 0.1)], [0.35, light(color, 0.18)], [0.5, light(color, 0.28)], [0.65, color], [1, dark(color, 0.35)]], 0, 0, 1, 0);
  if (opts.fishnet) {
    const id = sv.id('n');
    sv.defs.push(`<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${c.p.skin}"/><path d="M0 0 L7 0 M0 0 L0 7" stroke="${color}" stroke-width="1.6"/></pattern>`);
    fill = `url(#${id})`;
  }
  sv.add(`<g clip-path="${clip}">`);
  for (const d of [LEG_L, LEG_R]) sv.shape(d, fill, { stroke: dark(color, 0.6) });
  if (opts.sheen !== false && !opts.fishnet) sv.line('M168 520 C166 600 170 660 174 710 M232 520 C234 600 230 660 226 710', '#fff', 3, 'opacity="0.16" filter="url(#soft2)"');
  sv.add('</g>');
  const edge = (x0: number, x1: number) => {
    const y0 = topY + ((x0 < 200 ? 200 - x0 : x0 - 200) > 40 ? 0 : 4);
    return `M${x0} ${topY + 1} Q${(x0 + x1) / 2} ${y0 + (opts.curve ?? 8) + 2} ${x1} ${topY + 3}`;
  };
  if (opts.cuff) {
    sv.line(`${edge(144, 199)} ${edge(256, 201)}`, opts.cuff, 5);
  }
  if (opts.lace) {
    let d = '';
    for (let x = 146; x < 196; x += 6) d += `M${x} ${topY + 2 + (x - 146) / 10} q3 -6 6 0 `;
    for (let x = 254; x > 204; x -= 6) d += `M${x} ${topY + 2 + (254 - x) / 10} q-3 -6 -6 0 `;
    sv.line(d, opts.cuff ?? c.p.T, 1.5);
  }
}

function shoes(c: C, color: string, heel = true) {
  const { sv } = c;
  const fill = sv.mat(color, 0.3, 0.4);
  sv.shape('M168 722 C166 738 160 752 150 762 C146 766 150 770 158 769 C172 768 184 764 188 756 C190 746 190 734 188 722 Z', fill, { shade: 'M180 722 L190 722 L190 768 L176 768 Z', shadeColor: '#000', shadeOpacity: 0.5 });
  sv.shape('M232 722 C234 738 240 752 250 762 C254 766 250 770 242 769 C228 768 216 764 212 756 C210 746 210 734 212 722 Z', fill, { shade: 'M212 722 L222 722 L224 768 L210 768 Z', shadeColor: '#000', shadeOpacity: 0.5 });
  if (heel) sv.add(`<path d="M184 760 L186 776 L190 776 L189 756 M216 760 L214 776 L210 776 L211 756" fill="${dark(color, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
  sv.add(`<ellipse cx="164" cy="758" rx="5" ry="2" fill="#fff" opacity="0.25"/><ellipse cx="236" cy="758" rx="5" ry="2" fill="#fff" opacity="0.2"/>`);
}

function sandals(c: C, color: string) {
  c.sv.line('M158 760 C168 752 180 752 190 758 M242 760 C232 752 220 752 210 758 M170 744 L186 742 M230 744 L214 742', color, 2.6);
  c.sv.line('M156 770 C170 774 184 772 192 766 M244 770 C230 774 216 772 208 766', dark(color, 0.3), 3);
}

function gloves(c: C, color: string, t0 = 0.05, cuff?: string, which: 'both' | 'L' | 'R' = 'both') {
  for (const side of ['L', 'R'] as const) {
    if (which !== 'both' && which !== side) continue;
    const a = c.rig[side];
    c.sv.shape(forearmPath(a, t0), c.sv.mat(color, 0.25, 0.4), {});
    if (cuff) {
      const q = lerp(a.e, a.w, t0 + 0.02);
      const dx = a.w[0] - a.e[0];
      const dy = a.w[1] - a.e[1];
      const L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * 10;
      const ny = (dx / L) * 10;
      c.sv.line(`M${(q[0] - nx).toFixed(1)} ${(q[1] - ny).toFixed(1)} L${(q[0] + nx).toFixed(1)} ${(q[1] + ny).toFixed(1)}`, cuff, 3);
    }
  }
}

function armRing(c: C, a: ArmRig, t: number, color: string, upper: boolean, w = 3.4) {
  const q = upper ? lerp(a.s, a.e, t) : lerp(a.e, a.w, t);
  const [from, to] = upper ? [a.s, a.e] : [a.e, a.w];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const L = Math.hypot(dx, dy) || 1;
  const r = upper ? 12.5 : 9.5;
  const nx = (-dy / L) * r;
  const ny = (dx / L) * r;
  c.sv.line(`M${(q[0] - nx).toFixed(1)} ${(q[1] - ny).toFixed(1)} Q${(q[0] + (dx / L) * 3).toFixed(1)} ${(q[1] + (dy / L) * 3).toFixed(1)} ${(q[0] + nx).toFixed(1)} ${(q[1] + ny).toFixed(1)}`, color, w);
}

function pauldrons(c: C, color: string, trim: string, big = 1) {
  const { sv } = c;
  for (const [x, s] of [[146, -1], [254, 1]] as const) {
    sv.shape(`M${x - 22 * big} 238 C${x - 22 * big} 214 ${x + 22 * big} 214 ${x + 22 * big} 238 C${x + 10} 246 ${x - 10} 246 ${x - 22 * big} 238 Z`, sv.mat(color, 0.35, 0.4), { shade: s > 0 ? `M${x} 214 L${x + 30} 214 L${x + 30} 250 L${x} 250 Z` : undefined, shadeColor: dark(color, 0.5), shadeOpacity: 0.5 });
    sv.line(`M${x - 22 * big} 238 C${x - 10} 246 ${x + 10} 246 ${x + 22 * big} 238`, trim, 2.4);
  }
}

function choker(c: C, color: string, gem?: string) {
  c.sv.add(`<path d="M188 203 C194 207 206 207 212 203 L212 210 C206 214 194 214 188 210 Z" fill="${color}" stroke="${LINE}" stroke-width="0.8"/>`);
  if (gem) c.sv.add(`<circle cx="200" cy="214" r="3.2" fill="${gem}" stroke="${LINE}" stroke-width="0.8"/>`);
}

function strip(c: C, x0: number, x1: number, y0: number, y1: number, color: string, trim?: string) {
  const { sv } = c;
  const d = `M${x0} ${y0} L${x1} ${y0} L${x1 + 2} ${y1} C${(x0 + x1) / 2 + 4} ${y1 + 6} ${(x0 + x1) / 2 - 4} ${y1 + 6} ${x0 - 2} ${y1} Z`;
  sv.shape(d, sv.matV(color, 0.2, 0.4), { shade: `M${(x0 + x1) / 2} ${y0} L${x1 + 4} ${y0} L${x1 + 4} ${y1 + 6} L${(x0 + x1) / 2} ${y1 + 6} Z`, shadeColor: dark(color, 0.5), shadeOpacity: 0.45 });
  if (trim) sv.add(`<path d="${d}" fill="none" stroke="${trim}" stroke-width="2.2"/>`);
}

function robePanels(c: C, color: string, trim: string, spread = 1) {
  const { sv } = c;
  const L = `M168 352 C150 430 ${140 - 12 * spread} 580 ${118 - 14 * spread} 764 L${158 - 8 * spread} 764 C158 610 164 480 176 372 Z`;
  const R = `M232 352 C250 430 ${260 + 12 * spread} 580 ${282 + 14 * spread} 764 L${242 + 8 * spread} 764 C242 610 236 480 224 372 Z`;
  sv.shape(L, sv.matV(color, 0.2, 0.45), { shade: `M158 380 L176 372 C164 480 158 610 ${158 - 8 * spread} 764 L140 764 Z`, shadeColor: dark(color, 0.55) });
  sv.shape(R, sv.matV(color, 0.15, 0.5), { shade: 'M250 360 L310 764 L262 764 C256 610 246 480 232 372 Z', shadeColor: dark(color, 0.6) });
  sv.line(`M${118 - 14 * spread} 764 C${140 - 12 * spread} 580 150 430 168 352 M${282 + 14 * spread} 764 C${260 + 12 * spread} 580 250 430 232 352`, trim, 3);
}

function skirt(c: C, y0: number, y1: number, color: string, hem: string, frill = true) {
  const { sv } = c;
  const d = `M162 ${y0} C182 ${y0 - 4} 218 ${y0 - 4} 238 ${y0} C248 ${y1 - 20} 258 ${y1 - 6} 264 ${y1} C230 ${y1 + 12} 170 ${y1 + 12} 136 ${y1} C142 ${y1 - 6} 152 ${y1 - 20} 162 ${y0} Z`;
  sv.shape(d, sv.matV(color, 0.2, 0.45), { shade: `M214 ${y0} L270 ${y0} L270 ${y1 + 14} L222 ${y1 + 14} Z`, shadeColor: dark(color, 0.55) });
  for (const x of [178, 200, 222]) sv.line(`M${x} ${y0 + 6} L${x + (x - 200) * 0.25} ${y1 + 4}`, dark(color, 0.45), 1.3, 'opacity="0.6"');
  if (frill) {
    let f = '';
    for (let x = 136; x < 264; x += 8) f += `M${x} ${y1 + Math.sin(((x - 136) / 128) * Math.PI) * 11} q4 7 8 0 `;
    sv.line(f, hem, 3);
  } else sv.line(`M136 ${y1} C170 ${y1 + 12} 230 ${y1 + 12} 264 ${y1}`, hem, 2.6);
}

function coins(c: C, pts: P[], color: string, r = 3) {
  for (const [x, y] of pts) c.sv.add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c.sv.mat(color, 0.45, 0.3)}" stroke="${LINE}" stroke-width="0.7"/>`);
}

function fur(c: C, d: string, color: string) {
  c.sv.line(d, dark(color, 0.3), 7);
  c.sv.line(d, color, 5);
}

// ——— наряды ———

export function outfitLayers(kind: OutfitKind | Wear, sv: Svg, p: Pal, rig: Rig): Layers {
  const c: C = { sv, p, rig };
  switch (kind) {
    case 'knight':
      return {
        legs: () => {
          legwear(c, 540, p.K, { cuff: p.T, curve: 4 });
          for (const x of [174, 226]) sv.add(`<ellipse cx="${x}" cy="562" rx="15" ry="11" fill="${sv.mat(p.K, 0.4, 0.35)}" stroke="${LINE}" stroke-width="1.2"/>`);
          shoes(c, p.K, false);
        },
        torso: () => {
          cups(c, 'micro', p.K, p.T);
          sv.add(`<circle cx="200" cy="284" r="4" fill="${p.G}" stroke="${LINE}" stroke-width="0.9"/>`);
          bottom(c, p.K, p.T, true);
          strip(c, 190, 210, 398, 520, p.O, p.T);
        },
        arms: () => {
          pauldrons(c, p.K, p.T, 1.1);
          gloves(c, p.K, 0.05, p.T);
        },
        hand: p.K,
      };
    case 'barbarian':
      return {
        legs: () => {
          legwear(c, 650, p.W, { curve: 3 });
          fur(c, 'M156 652 C166 658 180 658 190 652 M210 652 C220 658 234 658 244 652', p.R);
          shoes(c, p.W, false);
        },
        torso: () => {
          cups(c, 'micro', p.B);
          fur(c, 'M162 258 C168 252 176 250 184 254 M216 254 C224 250 232 252 238 258', p.R);
          coins(c, [[190, 212], [196, 216], [204, 216], [210, 212]], p.R, 3.2);
          bottom(c, p.B, p.R);
          fur(c, 'M178 398 C190 402 210 402 222 398', p.R);
          strip(c, 192, 208, 404, 520, dark(p.O, 0.1), p.R);
        },
        arms: () => {
          armRing(c, rig.L, 0.95, p.R, true, 5);
          armRing(c, rig.R, 0.95, p.R, true, 5);
          gloves(c, p.W, 0.55);
        },
      };
    case 'ranger':
      return {
        legs: () => {
          legwear(c, 578, p.W, { cuff: light(p.W, 0.25), curve: 4 });
          shoes(c, dark(p.W, 0.2), false);
          sv.line('M148 470 C164 476 184 478 198 474', p.W, 4);
          sv.add(`<rect x="146" y="474" width="20" height="16" rx="4" fill="${sv.mat(p.W, 0.3, 0.35)}" stroke="${LINE}" stroke-width="1"/>`);
        },
        torso: () => {
          cups(c, 'micro', p.B);
          bottom(c, p.B, p.W);
          sv.line('M150 384 C176 392 214 398 252 392', p.W, 5);
          sv.line('M156 226 C180 270 214 330 246 392', dark(p.W, 0.2), 7);
          sv.line('M156 226 C180 270 214 330 246 392', p.W, 5);
          sv.add(`<circle cx="206" cy="306" r="4" fill="${sv.mat(p.T, 0.35, 0.3)}" stroke="${LINE}" stroke-width="0.8"/>`);
        },
        arms: () => gloves(c, p.W, 0.45, light(p.W, 0.3)),
      };
    case 'witch':
      return {
        back: () => robePanels(c, p.O, p.T),
        legs: () => {
          legwear(c, 478, p.F, { lace: true, cuff: p.T });
          shoes(c, p.D);
        },
        torso: () => {
          cups(c, 'balconette', p.B, p.T);
          sv.add(`<circle cx="200" cy="276" r="3.2" fill="${p.G}" stroke="${LINE}" stroke-width="1"/>`);
          corset(c, 296, 360, p.O, p.T);
          band(c, 362, p.T);
          garters(c, 364, 484, dark(p.F, 0.3));
          bottom(c, p.B, p.O);
        },
        arms: () => gloves(c, p.O, 0.12, p.T),
        hand: p.O,
      };
    case 'cleric':
      return {
        legs: () => {
          legwear(c, 492, p.R, { cuff: p.T, lace: true });
          shoes(c, p.T);
        },
        torso: () => {
          cups(c, 'plunge', p.R, p.T);
          sv.add(`<circle cx="200" cy="338" r="4" fill="${p.G}" stroke="${LINE}" stroke-width="0.9"/>`);
          bottom(c, p.R, p.T);
          strip(c, 188, 212, 400, 640, p.R, p.T);
          sv.add(`<path d="M200 430 L206 446 L200 462 L194 446 Z" fill="${p.T}" stroke="${LINE}" stroke-width="0.8"/>`);
          garters(c, 366, 496, p.T);
        },
        arms: () => gloves(c, p.T, 0.5),
        hand: p.T,
      };
    case 'reaper':
      return {
        back: () => robePanels(c, p.O, p.T, 1.4),
        legs: () => {
          legwear(c, 478, p.D, { fishnet: true, cuff: p.D });
          shoes(c, p.D);
        },
        torso: () => {
          choker(c, p.D, p.G);
          cups(c, 'micro', p.D, p.T);
          sv.line('M190 213 C182 228 174 240 170 252 M210 213 C218 228 226 240 230 252', p.D, 2.6);
          band(c, 300, p.D, 4, 158, 242);
          sv.line('M200 300 L200 356', p.D, 3);
          band(c, 360, p.D, 4);
          garters(c, 362, 484, p.D);
          bottom(c, p.D, p.D);
        },
        arms: () => gloves(c, p.D, 0.02, p.T),
        hand: p.D,
      };
    case 'rogue':
      return {
        legs: () => {
          legwear(c, 520, p.F, { cuff: p.W, curve: 6 });
          shoes(c, p.W, false);
          sv.line('M148 468 C164 474 184 476 198 472', p.W, 4);
          sv.add(`<g transform="translate(150 470) rotate(12)"><rect x="-5" y="0" width="10" height="52" rx="3" fill="${sv.mat(p.D, 0.3, 0.4)}" stroke="${LINE}" stroke-width="1"/><rect x="-7" y="-6" width="14" height="6" rx="2" fill="${p.T}"/></g>`);
        },
        torso: () => {
          cups(c, 'bandeau', p.B);
          sv.line('M166 256 C170 238 180 222 190 212 M234 256 C230 238 220 222 210 212', p.B, 2.4);
          sv.line('M168 306 L232 372 M232 306 L168 372', dark(p.W, 0.2), 5);
          sv.line('M168 306 L232 372 M232 306 L168 372', p.W, 3.2);
          sv.add(`<circle cx="200" cy="339" r="4" fill="${sv.mat(p.T, 0.35, 0.3)}" stroke="${LINE}" stroke-width="0.8"/>`);
          bottom(c, p.B, p.W);
          // шарф-маска на шее
          sv.shape('M184 196 C194 202 206 202 216 196 L218 214 C206 222 194 222 182 214 Z', sv.mat(p.A, 0.2, 0.4), {});
        },
        arms: () => gloves(c, p.O, 0.2, p.W),
      };
    case 'minstrel':
      return {
        legs: () => {
          legwear(c, 520, p.F, { lace: true, cuff: p.T });
          shoes(c, p.W);
        },
        torso: () => {
          cups(c, 'balconette', p.R, light(p.R, 0.5));
          corset(c, 296, 326, p.O, p.T, false);
          sv.add(`<circle cx="200" cy="310" r="3.2" fill="${p.T}" stroke="${LINE}" stroke-width="0.8"/>`);
          skirt(c, 376, 440, p.O, p.R);
          garters(c, 444, 524, p.T);
        },
        arms: () => {
          for (const side of ['L', 'R'] as const) {
            const a = rig[side];
            const q = lerp(a.s, a.e, 0.35);
            sv.add(`<ellipse cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="17" ry="14" fill="${sv.mat(p.R, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1.3"/>`);
            sv.line(`M${(q[0] - 14).toFixed(1)} ${(q[1] + 8).toFixed(1)} q7 5 14 0 q7 5 14 0`, p.T, 1.6);
          }
        },
      };

    // ——— облики: купальники ———
    case 'swim':
      return {
        legs: () => sandals(c, p.W),
        torso: () => {
          cups(c, 'micro', p.B);
          bottom(c, p.B);
          // парео, завязанное на левом бедре
          sv.shape('M154 384 C176 396 196 402 206 404 C200 470 196 520 192 566 C170 574 150 570 136 558 C140 490 146 430 154 384 Z', sv.matV(p.T, 0.2, 0.4), { shade: 'M180 400 L206 404 L192 566 L176 566 Z', shadeColor: dark(p.T, 0.5), shadeOpacity: 0.5 });
          sv.add(`<ellipse cx="156" cy="390" rx="9" ry="7" fill="${sv.mat(p.T, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1.2"/>`);
          sv.line('M154 396 C150 410 148 424 150 436', p.T, 3);
        },
      };
    case 'swim2':
      return {
        legs: () => {
          sandals(c, p.T);
          sv.line('M164 716 C172 720 182 720 190 716 M236 716 C228 720 218 720 210 716', p.T, 2.4);
        },
        torso: () => {
          cups(c, 'balconette', p.B, light(p.B, 0.5));
          let f = '';
          for (let x = 152; x < 248; x += 7) f += `M${x} ${296 + (Math.abs(x - 200) < 20 ? 4 : 0)} q3.5 6 7 0 `;
          sv.line(f, p.T, 2.4);
          bottom(c, p.B);
          let g = '';
          for (let x = 176; x < 224; x += 6) g += `M${x} 398 q3 5 6 0 `;
          sv.line(g, p.T, 2.2);
          sv.add(`<path d="M196 286 L200 282 L204 286 L200 290 Z" fill="${p.T}" stroke="${LINE}" stroke-width="0.8"/>`);
        },
      };
    case 'swim3':
      return {
        legs: () => sandals(c, p.W),
        torso: () => {
          cups(c, 'plunge', p.B, light(p.B, 0.45));
          sv.shape('M190 340 L210 340 C214 364 220 380 226 396 C218 406 208 414 200 420 C192 414 182 406 174 396 C180 380 186 364 190 340 Z', sv.mat(p.B, 0.25, 0.35), {});
          sv.line('M149 386 C160 392 170 395 176 396 M251 386 C240 392 230 395 224 396', p.B, 2.2);
          sv.add(`<circle cx="200" cy="340" r="6" fill="none" stroke="${p.T}" stroke-width="2.4"/>`);
        },
      };
    case 'swim4':
      return {
        legs: () => sandals(c, p.W),
        torso: () => {
          cups(c, 'bandeau', p.B);
          bottom(c, p.B);
          // распахнутая пляжная рубашка
          for (const s of [-1, 1]) {
            const X = (x: number) => 200 + (x - 200) * s;
            sv.shape(`M${X(186)} 214 C${X(170)} 220 ${X(152)} 224 ${X(142)} 236 C${X(136)} 290 ${X(138)} 350 ${X(146)} 404 L${X(166)} 404 C${X(162)} 350 ${X(160)} 300 ${X(166)} 262 C${X(172)} 244 ${X(180)} 228 ${X(186)} 214 Z`, sv.matV(p.T, 0.2, 0.4), { shade: s > 0 ? 'M240 220 L262 220 L262 404 L240 404 Z' : undefined, shadeColor: dark(p.T, 0.5), shadeOpacity: 0.5 });
            sv.line(`M${X(186)} 214 C${X(180)} 228 ${X(172)} 244 ${X(166)} 262`, light(p.T, 0.4), 1.6);
          }
        },
        arms: () => {
          for (const side of ['L', 'R'] as const) sv.shape(upperArmPath(rig[side], 3), sv.matV(p.T, 0.2, 0.4), {});
        },
      };

    // ——— облики: бельё ———
    case 'lace':
      return {
        legs: () => {
          legwear(c, 478, p.F, { lace: true, cuff: p.B });
          shoes(c, p.B);
        },
        torso: () => {
          choker(c, p.B, p.T);
          cups(c, 'balconette', p.B, light(p.B, 0.5));
          sv.shape('M162 352 C180 358 220 358 238 352 L240 368 C220 374 180 374 160 368 Z', sv.mat(p.B, 0.25, 0.35), {});
          let l = '';
          for (let x = 162; x < 238; x += 7) l += `M${x} 369 q3.5 5 7 0 `;
          sv.line(l, light(p.B, 0.5), 1.6);
          garters(c, 370, 484, p.B);
          bottom(c, p.B);
        },
      };
    case 'lace2':
      return {
        legs: () => shoes(c, p.B),
        torso: () => {
          cups(c, 'balconette', p.B, light(p.B, 0.5));
          // полы бэби-долла расходятся от банта под грудью
          for (const s of [-1, 1]) {
            const X = (x: number) => 200 + (x - 200) * s;
            sv.shape(`M${X(156)} 292 C${X(172)} 298 ${X(186)} 302 ${X(197)} 302 C${X(180)} 340 ${X(160)} 380 ${X(140)} 412 C${X(128)} 410 ${X(118)} 404 ${X(112)} 396 C${X(130)} 360 ${X(146)} 324 ${X(156)} 292 Z`, sv.matV(p.B, 0.2, 0.4), { opacity: 0.95 });
            sv.line(`M${X(112)} 396 C${X(118)} 404 ${X(128)} 410 ${X(140)} 412`, light(p.B, 0.5), 2.4);
          }
          sv.add(`<path d="M200 300 C190 292 184 300 190 306 C194 310 198 304 200 302 C202 304 206 310 210 306 C216 300 210 292 200 300 Z" fill="${p.T}" stroke="${LINE}" stroke-width="0.9"/>`);
          bottom(c, p.B);
        },
      };
    case 'lace3':
      return {
        legs: () => {
          legwear(c, 486, p.B, { cuff: p.T, lace: true });
          shoes(c, p.B);
        },
        torso: () => {
          cups(c, 'plunge', p.B, light(p.B, 0.45));
          sv.shape('M190 340 L210 340 C214 364 220 380 226 396 C218 406 208 414 200 420 C192 414 182 406 174 396 C180 380 186 364 190 340 Z', sv.mat(p.B, 0.25, 0.35), {});
          garters(c, 392, 492, p.B);
        },
        arms: () => gloves(c, p.B, 0.0, p.T),
        hand: p.B,
      };
    case 'lace4':
      return {
        legs: () => {
          for (const [x, y] of [[168, 520], [232, 520]]) sv.line(`M${x - 22} ${y} C${x - 8} ${y + 5} ${x + 8} ${y + 5} ${x + 22} ${y - 1}`, p.B, 4);
          shoes(c, p.B);
        },
        torso: () => {
          choker(c, p.B, p.T);
          cups(c, 'micro', p.B, p.T);
          sv.line('M190 213 C182 228 174 240 170 252 M210 213 C218 228 226 240 230 252', p.B, 2.6);
          band(c, 300, p.B, 4, 158, 242);
          sv.line('M168 302 C170 320 172 340 176 360 M232 302 C230 320 228 340 224 360', p.B, 2.6);
          band(c, 358, p.B, 3.4);
          sv.add(`<circle cx="200" cy="360" r="4" fill="none" stroke="${p.T}" stroke-width="2"/>`);
          bottom(c, p.B);
        },
      };
    case 'dancer':
      return {
        legs: () => {
          sv.line('M164 716 C172 720 182 720 190 716 M236 716 C228 720 218 720 210 716', p.T, 3);
          coins(c, [[168, 721], [178, 723], [188, 721], [212, 721], [222, 723], [232, 721]], p.T, 2.4);
        },
        torso: () => {
          sv.line('M188 206 C194 212 206 212 212 206', p.T, 3);
          coins(c, [[192, 214], [200, 218], [208, 214]], p.T, 3);
          cups(c, 'micro', p.B, p.T);
          const fr: P[] = [];
          for (let x = 158; x <= 242; x += 7) if (Math.abs(x - 200) > 4) fr.push([x, 292 + Math.sin(((x - 158) / 84) * Math.PI) * -3]);
          coins(c, fr, p.T, 2.6);
          sv.line(smooth([[170, 334], [200, 346], [230, 334]]), p.T, 1.8);
          bottom(c, p.B);
          sv.line('M150 380 C176 390 224 390 250 380', p.T, 4);
          const hip: P[] = [];
          for (let x = 152; x <= 248; x += 8) hip.push([x, 388 + Math.sin(((x - 152) / 96) * Math.PI) * 6]);
          coins(c, hip, p.T, 2.8);
          strip(c, 190, 210, 402, 680, p.B, p.T);
        },
        arms: () => {
          for (const side of ['L', 'R'] as const) {
            armRing(c, rig[side], 0.5, p.T, true, 3.2);
            armRing(c, rig[side], 0.75, p.T, false, 3);
            armRing(c, rig[side], 0.85, p.T, false, 3);
          }
        },
      };
    case 'regalia':
      return {
        legs: () => {
          legwear(c, 520, p.K, { cuff: p.T, curve: 5 });
          for (const x of [174, 226]) sv.add(`<ellipse cx="${x}" cy="562" rx="15" ry="11" fill="${sv.mat(p.T, 0.45, 0.3)}" stroke="${LINE}" stroke-width="1.2"/>`);
          shoes(c, p.K);
        },
        torso: () => {
          sv.shape('M178 206 C190 214 210 214 222 206 L230 220 C214 230 186 230 170 220 Z', sv.mat(p.T, 0.45, 0.3), {});
          cups(c, 'micro', p.B, p.T);
          sv.add(`<circle cx="200" cy="282" r="3.6" fill="${p.G}" stroke="${LINE}" stroke-width="0.8"/>`);
          bottom(c, p.B, p.T, true);
          sv.add(`<path d="M190 398 L210 398 L200 414 Z" fill="${p.T}" stroke="${LINE}" stroke-width="0.8"/>`);
        },
        arms: () => {
          pauldrons(c, p.B, p.T, 1.25);
          for (const [x, s] of [[146, -1], [254, 1]] as const) sv.shape(`M${x} 226 C${x + s * 20} 206 ${x + s * 40} 204 ${x + s * 52} 214 C${x + s * 36} 216 ${x + s * 24} 224 ${x + s * 12} 236 Z`, sv.mat(p.T, 0.45, 0.3), {});
          gloves(c, p.K, 0.1, p.T);
        },
        hand: p.K,
      };
  }
}

export { limb };
