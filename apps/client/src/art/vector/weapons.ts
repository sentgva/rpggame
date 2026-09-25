import { LINE, dark, light, type Svg } from './core';
import type { Pal } from './body';
import type { Grip, WeaponKind } from './rig';

/** Оружие рисуется в локальных координатах: рукоять в (0,0), «вверх» — отрицательный y. */
function at(sv: Svg, g: Grip, draw: () => void) {
  sv.group(`translate(${g.x} ${g.y}) rotate(${g.a})`, draw);
}

function wood(sv: Svg, p: Pal) {
  return sv.lin([[0, light(p.W, 0.3)], [0.5, p.W], [1, dark(p.W, 0.4)]], 0, 0, 1, 0);
}

function staff(sv: Svg, p: Pal, scythe: boolean) {
  sv.add(`<rect x="-4.5" y="-262" width="9" height="660" rx="4" fill="${wood(sv, p)}" stroke="${LINE}" stroke-width="1.4"/>`);
  sv.line('M-1.5 -250 L-1.5 390', light(p.W, 0.45), 1.2, 'opacity="0.6"');
  for (const y of [-60, 120]) sv.add(`<rect x="-6.5" y="${y}" width="13" height="8" rx="2" fill="${sv.mat(p.T, 0.35, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
  if (scythe) {
    // изогнутое лезвие косы
    sv.shape('M2 -258 C-40 -300 -130 -290 -176 -236 C-130 -262 -60 -262 -4 -236 Z', sv.lin([[0, light(p.K, 0.5)], [0.6, p.K], [1, dark(p.K, 0.4)]], 0, 0, 0, 1), {});
    sv.line('M-6 -250 C-60 -276 -120 -270 -170 -238', light(p.K, 0.7), 1.4, 'opacity="0.8"');
    sv.add(`<circle cx="0" cy="-262" r="7" fill="${p.G}" stroke="${LINE}" stroke-width="1"/>`);
    return;
  }
  // навершие: когти и светящийся шар стихии
  sv.add(`<circle cx="0" cy="-286" r="30" fill="${p.G}" opacity="0.4" filter="url(#glow)"/>`);
  sv.add(`<circle cx="0" cy="-286" r="21" fill="${sv.rad([[0, '#fffbe6'], [0.35, light(p.G, 0.5)], [0.75, p.G], [1, dark(p.G, 0.35)]], 0.4, 0.38, 0.6)}" stroke="${dark(p.G, 0.5)}" stroke-width="1.4"/>`);
  sv.line('M-18 -268 C-14 -252 -6 -250 -2 -258 M18 -268 C14 -252 6 -250 2 -258 M-12 -306 C-20 -296 -20 -278 -14 -268', p.T, 3.4);
  sv.add(`<circle cx="-7" cy="-294" r="4.5" fill="#fff" opacity="0.85"/>`);
}

function wand(sv: Svg, p: Pal) {
  sv.add(`<rect x="-3.2" y="-74" width="6.4" height="96" rx="3" fill="${sv.mat(p.T, 0.35, 0.35)}" stroke="${LINE}" stroke-width="1.2"/>`);
  sv.add(`<circle cx="0" cy="-86" r="18" fill="${p.G}" opacity="0.45" filter="url(#glow)"/>`);
  sv.add(`<path d="M0 -104 L5 -91 L18 -86 L5 -81 L0 -68 L-5 -81 L-18 -86 L-5 -91 Z" fill="${light(p.G, 0.35)}" stroke="${LINE}" stroke-width="1.2"/>`);
  for (const [x, y] of [[20, -110], [-18, -104], [14, -64]]) sv.add(`<circle cx="${x}" cy="${y}" r="2" fill="${light(p.G, 0.6)}" filter="url(#soft2)"/>`);
}

function sword(sv: Svg, p: Pal) {
  const blade = sv.lin([[0, light(p.K, 0.55)], [0.5, p.K], [1, dark(p.K, 0.35)]], 0, 0, 1, 0);
  sv.add(`<path d="M-7 -14 L-6 -176 L0 -196 L6 -176 L7 -14 Z" fill="${blade}" stroke="${LINE}" stroke-width="1.4"/>`);
  sv.line('M0 -20 L0 -186', light(p.K, 0.7), 1.3, 'opacity="0.8"');
  sv.add(`<path d="M-24 -16 C-12 -10 12 -10 24 -16 L22 -8 C12 -4 -12 -4 -22 -8 Z" fill="${sv.mat(p.T, 0.35, 0.3)}" stroke="${LINE}" stroke-width="1.2"/>`);
  sv.add(`<rect x="-4" y="-8" width="8" height="24" rx="2" fill="${sv.mat(p.W, 0.2, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
  sv.add(`<circle cx="0" cy="20" r="6" fill="${p.G}" stroke="${LINE}" stroke-width="1"/>`);
}

function shield(sv: Svg, p: Pal) {
  sv.shape('M-38 -52 C-14 -60 14 -60 38 -52 C40 -6 30 32 0 58 C-30 32 -40 -6 -38 -52 Z', sv.mat(p.O, 0.25, 0.4), { shade: 'M0 -60 L40 -52 C40 -6 30 32 0 58 Z', shadeColor: dark(p.O, 0.5), shadeOpacity: 0.5 });
  sv.add(`<path d="M-38 -52 C-14 -60 14 -60 38 -52 C40 -6 30 32 0 58 C-30 32 -40 -6 -38 -52 Z" fill="none" stroke="${p.T}" stroke-width="5"/>`);
  sv.add(`<path d="M0 -38 L12 -12 L0 26 L-12 -12 Z" fill="${sv.mat(p.G, 0.4, 0.3)}" stroke="${LINE}" stroke-width="1.2"/>`);
}

function axe(sv: Svg, p: Pal) {
  sv.add(`<rect x="-5" y="-190" width="10" height="260" rx="4" fill="${wood(sv, p)}" stroke="${LINE}" stroke-width="1.3"/>`);
  const steel = sv.lin([[0, light(p.K, 0.5)], [0.6, p.K], [1, dark(p.K, 0.4)]], 0, 0, 1, 1);
  sv.shape('M4 -186 C40 -210 74 -196 84 -160 C88 -130 70 -104 44 -96 C38 -120 26 -140 4 -146 Z', steel, {});
  sv.line('M44 -200 C76 -192 88 -150 70 -108', light(p.K, 0.75), 1.6, 'opacity="0.8"');
  sv.add(`<rect x="-8" y="-170" width="16" height="12" rx="3" fill="${sv.mat(p.T, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
}

function bow(sv: Svg, p: Pal, drawn: boolean) {
  const limb = 'M-6 -132 C18 -104 26 -52 8 -12 L8 12 C26 52 18 104 -6 132';
  sv.line(limb, LINE, 9);
  sv.line(limb, wood(sv, p), 6);
  sv.line(limb, light(p.W, 0.45), 1.4, 'opacity="0.6"');
  const nock = drawn ? -44 : -6;
  sv.line(`M-6 -132 L${nock} 0 L-6 132`, light(p.R, 0.1), 1.3);
  sv.add(`<rect x="3" y="-14" width="10" height="28" rx="3" fill="${sv.mat(p.T, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
  if (drawn) {
    sv.line(`M${nock} 0 L60 0`, p.W, 3);
    sv.add(`<path d="M60 -6 L76 0 L60 6 Z" fill="${p.K}" stroke="${LINE}" stroke-width="1"/>`);
  }
}

function dagger(sv: Svg, p: Pal) {
  const blade = sv.lin([[0, light(p.K, 0.55)], [1, dark(p.K, 0.3)]], 0, 0, 1, 0);
  sv.add(`<path d="M-5 -10 L-4 -70 L0 -84 L4 -70 L5 -10 Z" fill="${blade}" stroke="${LINE}" stroke-width="1.2"/>`);
  sv.add(`<rect x="-13" y="-12" width="26" height="6" rx="2" fill="${sv.mat(p.T, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
  sv.add(`<rect x="-3.5" y="-6" width="7" height="18" rx="2" fill="${sv.mat(p.D, 0.25, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
}

function lute(sv: Svg, p: Pal) {
  sv.add(`<rect x="-5" y="-150" width="10" height="120" rx="3" fill="${wood(sv, p)}" stroke="${LINE}" stroke-width="1.2"/>`);
  sv.add(`<path d="M-8 -150 L-12 -176 L12 -176 L8 -150 Z" fill="${sv.mat(dark(p.W, 0.2))}" stroke="${LINE}" stroke-width="1"/>`);
  sv.shape('M0 -44 C34 -44 44 0 38 30 C32 56 14 64 0 64 C-14 64 -32 56 -38 30 C-44 0 -34 -44 0 -44 Z', sv.rad([[0, light(p.W, 0.35)], [0.6, p.W], [1, dark(p.W, 0.45)]], 0.4, 0.35, 0.7), {});
  sv.add(`<circle cx="0" cy="8" r="11" fill="${dark(p.W, 0.7)}" stroke="${p.T}" stroke-width="2"/>`);
  sv.line('M-3 -150 L-3 44 M1 -150 L1 44 M5 -150 L5 44', light(p.R, 0.1), 0.8, 'opacity="0.85"');
  sv.add(`<rect x="-14" y="40" width="28" height="5" rx="2" fill="${dark(p.W, 0.5)}"/>`);
}

/** Оружие в руке «ближней к зрителю» (правой): рисуется до кисти, чтобы пальцы легли поверх. */
export function weaponRight(sv: Svg, p: Pal, w: WeaponKind, g: Grip | undefined, attack: boolean) {
  if (!g) return;
  at(sv, g, () => {
    switch (w) {
      case 'staff':
        staff(sv, p, false);
        break;
      case 'scythe':
        staff(sv, p, true);
        break;
      case 'wand':
        wand(sv, p);
        break;
      case 'sword':
        sword(sv, p);
        break;
      case 'axe':
        axe(sv, p);
        break;
      case 'bow':
        bow(sv, p, attack);
        break;
      case 'daggers':
        dagger(sv, p);
        break;
    }
  });
}

/** Щит, второй кинжал или лютня — в левой руке. */
export function weaponLeft(sv: Svg, p: Pal, w: WeaponKind, g: Grip | undefined) {
  if (!g) return;
  at(sv, g, () => {
    if (w === 'sword') shield(sv, p);
    else if (w === 'daggers') dagger(sv, p);
    else if (w === 'lute') lute(sv, p);
  });
}
