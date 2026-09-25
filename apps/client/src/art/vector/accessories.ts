import { LINE, dark, light, type Svg } from './core';
import type { Pal } from './body';

export type Accessory =
  | 'none'
  | 'witchHat'
  | 'crown'
  | 'hood'
  | 'mask'
  | 'horns'
  | 'halo'
  | 'flower'
  | 'tiara'
  | 'helmet'
  | 'elfEars'
  | 'veil'
  | 'bandana'
  | 'catEars'
  | 'sunHat'
  | 'bow';

/** Слой за волосами (капюшон, вуаль). */
export function accessoryBack(sv: Svg, p: Pal, acc: Accessory) {
  if (acc === 'hood') {
    sv.shape('M200 40 C140 40 116 90 120 150 C122 200 110 240 130 262 L270 262 C290 240 278 200 280 150 C284 90 260 40 200 40 Z', sv.matV(p.A, 0.1, 0.45), { shade: 'M236 44 C290 90 290 200 270 262 L300 262 L300 40 Z', shadeColor: dark(p.A, 0.6) });
  }
  if (acc === 'veil') {
    sv.shape('M150 86 C120 150 110 300 100 470 L300 470 C290 300 280 150 250 86 Z', sv.matV(light(p.A, 0.2), 0.2, 0.25), { opacity: 0.88, shade: 'M240 90 C280 200 290 360 300 470 L320 470 L320 90 Z', shadeColor: dark(p.A, 0.35) });
    for (const x of [130, 160, 240, 270]) sv.line(`M${200 + (x - 200) * 0.3} 110 C${x} 250 ${x - (x < 200 ? 10 : -10)} 380 ${x - (x < 200 ? 16 : -16)} 468`, dark(p.A, 0.25), 1.2, 'opacity="0.5"');
  }
}

/** Слой между лицом и чёлкой (уши, маска). */
export function accessoryMid(sv: Svg, p: Pal, acc: Accessory) {
  if (acc === 'elfEars') {
    const skin = sv.mat(p.skin, 0.12, 0.12);
    sv.shape('M160 132 C148 124 128 108 112 98 C122 118 138 142 160 154 Z', skin, { shade: 'M150 126 L112 98 L128 130 Z', shadeColor: p.skinShade });
    sv.shape('M240 132 C252 124 272 108 288 98 C278 118 262 142 240 154 Z', skin, { shade: 'M250 126 L288 98 L272 130 Z', shadeColor: p.skinShade });
  }
  if (acc === 'mask') {
    sv.shape('M158 150 C164 176 182 196 200 198 C218 196 236 176 242 150 C230 158 214 160 200 158 C186 160 170 158 158 150 Z', sv.mat(p.A, 0.15, 0.4), { shade: 'M214 156 C232 160 240 150 242 150 C236 176 218 196 200 198 L200 158 Z', shadeColor: dark(p.A, 0.55) });
    sv.line('M170 172 C184 178 216 178 230 172', dark(p.A, 0.5), 1.2, 'opacity="0.6"');
  }
}

/** Слой поверх волос. */
export function accessoryFront(sv: Svg, p: Pal, acc: Accessory) {
  const A = p.A;
  switch (acc) {
    case 'witchHat': {
      const hat = sv.mat(A, 0.2, 0.4);
      sv.shape('M106 96 C128 110 272 110 294 96 C296 86 272 80 200 80 C128 80 104 86 106 96 Z', hat, { shade: 'M200 80 C272 80 296 86 294 96 C272 110 200 110 200 110 Z', shadeColor: dark(A, 0.5) });
      sv.shape('M156 92 C170 60 186 30 214 10 C222 6 232 10 236 18 C226 24 222 40 230 60 C236 74 240 84 244 92 C220 98 180 98 156 92 Z', hat, { shade: 'M214 10 L240 18 L250 92 L218 92 C226 60 222 30 214 10 Z', shadeColor: dark(A, 0.55) });
      sv.shape('M158 88 C180 94 222 94 242 88 L244 94 C222 100 180 100 156 94 Z', sv.mat(p.T, 0.35, 0.3), { sw: 1 });
      sv.add(`<circle cx="226" cy="92" r="4" fill="${p.G}" stroke="${LINE}" stroke-width="1"/>`);
      break;
    }
    case 'sunHat': {
      const straw = sv.mat(A, 0.25, 0.3);
      sv.shape('M92 100 C110 118 290 118 308 100 C312 88 280 80 200 80 C120 80 88 88 92 100 Z', straw, { shade: 'M200 80 C280 80 312 88 308 100 C290 118 200 118 200 118 Z', shadeColor: dark(A, 0.4), shadeOpacity: 0.6 });
      sv.shape('M150 94 C148 56 176 42 200 42 C224 42 252 56 250 94 C224 100 176 100 150 94 Z', straw, { shade: 'M224 44 C252 58 254 90 250 94 L262 94 L262 44 Z', shadeColor: dark(A, 0.45) });
      for (let x = 104; x < 300; x += 14) sv.line(`M${x} ${97 + Math.abs(x - 200) / 22} l6 3`, dark(A, 0.3), 1, 'opacity="0.5"');
      sv.shape('M152 84 C176 90 224 90 248 84 L249 94 C224 100 176 100 151 94 Z', sv.mat(p.T, 0.3, 0.3), { sw: 1 });
      for (const [dx, dy] of [[0, -6], [6, 0], [0, 6], [-6, 0]]) sv.add(`<circle cx="${236 + dx}" cy="${88 + dy}" r="5" fill="${light(p.G, 0.35)}" stroke="${LINE}" stroke-width="0.8"/>`);
      sv.add(`<circle cx="236" cy="88" r="3.4" fill="#ffe08a" stroke="${LINE}" stroke-width="0.8"/>`);
      break;
    }
    case 'crown': {
      const gold = sv.lin([[0, light(A, 0.4)], [0.5, A], [1, dark(A, 0.35)]], 0, 0, 0, 1);
      sv.shape('M168 86 L166 58 L180 72 L190 46 L200 66 L210 46 L220 72 L234 58 L232 86 C214 90 186 90 168 86 Z', gold, { shade: 'M216 50 L236 58 L234 88 L216 88 Z', shadeColor: dark(A, 0.45) });
      for (const [x, y] of [[190, 50], [210, 50], [200, 78]]) sv.add(`<circle cx="${x}" cy="${y}" r="3.6" fill="${p.G}" stroke="${LINE}" stroke-width="0.9"/>`);
      break;
    }
    case 'tiara': {
      sv.line('M160 98 C180 84 220 84 240 98', A, 4.5);
      sv.shape('M192 86 L200 70 L208 86 C204 90 196 90 192 86 Z', sv.mat(A, 0.4, 0.3), { sw: 1 });
      sv.add(`<circle cx="200" cy="84" r="4" fill="${p.G}" stroke="${LINE}" stroke-width="0.9"/>`);
      break;
    }
    case 'halo':
      sv.add(`<ellipse cx="200" cy="40" rx="46" ry="11" fill="none" stroke="${light(A, 0.35)}" stroke-width="9" opacity="0.45" filter="url(#glow)"/>`);
      sv.add(`<ellipse cx="200" cy="40" rx="46" ry="11" fill="none" stroke="${light(A, 0.2)}" stroke-width="4.5"/>`);
      break;
    case 'horns': {
      const horn = sv.lin([[0, light(A, 0.3)], [1, dark(A, 0.4)]], 0, 1, 0, 0);
      sv.shape('M170 80 C160 58 140 40 132 18 C150 30 170 46 184 72 Z', horn, { shade: 'M150 40 L184 72 L176 80 Z', shadeColor: dark(A, 0.6) });
      sv.shape('M230 80 C240 58 260 40 268 18 C250 30 230 46 216 72 Z', horn, { shade: 'M252 34 L268 18 L230 80 L240 80 Z', shadeColor: dark(A, 0.6) });
      sv.line('M158 52 l8 -3 M150 40 l7 -4 M242 52 l-8 -3 M250 40 l-7 -4', light(A, 0.4), 1.2, 'opacity="0.6"');
      break;
    }
    case 'catEars':
      for (const s of [-1, 1]) {
        const X = (x: number) => 200 + (x - 200) * s;
        sv.shape(`M${X(160)} 86 L${X(150)} 36 L${X(190)} 68 Z`, sv.mat(A, 0.2, 0.35), {});
        sv.shape(`M${X(163)} 78 L${X(156)} 48 L${X(182)} 68 Z`, light('#f4a0b8', 0.2), { stroke: null });
      }
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        sv.add(`<ellipse cx="${(234 + Math.cos(a) * 7).toFixed(1)}" cy="${(98 + Math.sin(a) * 7).toFixed(1)}" rx="6" ry="4.2" transform="rotate(${((a * 180) / Math.PI).toFixed(0)} ${(234 + Math.cos(a) * 7).toFixed(1)} ${(98 + Math.sin(a) * 7).toFixed(1)})" fill="${light(A, 0.15)}" stroke="${LINE}" stroke-width="0.9"/>`);
      }
      sv.add(`<circle cx="234" cy="98" r="4" fill="#ffe08a" stroke="${LINE}" stroke-width="0.8"/>`);
      sv.add(`<ellipse cx="222" cy="108" rx="7" ry="3" transform="rotate(-30 222 108)" fill="${p.V}" stroke="${LINE}" stroke-width="0.8"/>`);
      break;
    case 'bow':
      sv.shape('M224 62 C210 48 196 54 200 66 C204 76 216 72 224 66 Z', sv.mat(A, 0.25, 0.35), {});
      sv.shape('M224 62 C238 48 252 54 248 66 C244 76 232 72 224 66 Z', sv.mat(A, 0.25, 0.35), {});
      sv.add(`<ellipse cx="224" cy="64" rx="5" ry="6" fill="${sv.mat(A, 0.3, 0.3)}" stroke="${LINE}" stroke-width="1"/>`);
      sv.line('M222 70 C218 80 214 88 212 96 M226 70 C232 80 236 88 238 96', A, 3);
      break;
    case 'bandana':
      sv.shape('M154 100 C180 90 220 90 246 100 L248 112 C222 104 178 104 152 112 Z', sv.mat(A, 0.2, 0.35), {});
      sv.shape('M244 104 C256 106 264 118 272 150 C262 140 254 126 246 116 Z', sv.mat(A, 0.15, 0.4), {});
      sv.shape('M246 106 C262 104 276 110 286 132 C272 124 260 118 248 116 Z', sv.mat(A, 0.15, 0.4), {});
      break;
    case 'veil':
      sv.line('M156 100 C180 88 220 88 244 100', p.T, 3.5);
      sv.add(`<circle cx="200" cy="92" r="3.5" fill="${p.G}" stroke="${LINE}" stroke-width="0.8"/>`);
      break;
    case 'hood':
      // обод капюшона вокруг лица
      sv.shape('M200 44 C144 44 128 96 132 150 C134 176 142 196 152 206 C148 170 150 120 160 98 C172 78 188 72 200 72 C212 72 228 78 240 98 C250 120 252 170 248 206 C258 196 266 176 268 150 C272 96 256 44 200 44 Z', sv.matV(p.A, 0.15, 0.4), { shade: 'M236 50 C272 90 272 170 250 206 L280 206 L280 50 Z', shadeColor: dark(p.A, 0.6) });
      break;
    case 'helmet': {
      const steel = sv.mat(p.K, 0.3, 0.35);
      sv.shape('M154 118 C150 74 176 52 200 52 C224 52 250 74 246 118 C236 104 218 98 200 98 C182 98 164 104 154 118 Z', steel, { shade: 'M222 56 C250 76 250 110 246 118 L260 118 L260 56 Z', shadeColor: dark(p.K, 0.5) });
      sv.line('M156 112 C176 98 224 98 244 112', p.T, 3);
      sv.line('M200 54 L200 98', light(p.K, 0.5), 2, 'opacity="0.7"');
      for (const s of [-1, 1]) {
        const X = (x: number) => 200 + (x - 200) * s;
        sv.shape(`M${X(154)} 92 C${X(136)} 80 ${X(122)} 60 ${X(118)} 40 C${X(132)} 52 ${X(146)} 66 ${X(160)} 78 Z`, sv.mat(p.Q, 0.2, 0.3), {});
        sv.line(`M${X(150)} 84 L${X(126)} 54 M${X(154)} 80 L${X(136)} 58`, dark(p.Q, 0.3), 1, 'opacity="0.6"');
      }
      break;
    }
  }
}
