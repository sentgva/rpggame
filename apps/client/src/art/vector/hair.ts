import { dark, light, smooth, type P, type Svg } from './core';
import type { Pal } from './body';

export type HairStyle = 'long' | 'bob' | 'short' | 'ponytail' | 'twintails' | 'braid' | 'bun' | 'wild';

function backFill(sv: Svg, p: Pal) {
  return sv.lin([[0, dark(p.hair, 0.12)], [1, dark(p.hair, 0.5)]], 0, 0, 0.2, 1);
}

function strands(sv: Svg, p: Pal, list: string[], hi: string[] = []) {
  for (const d of list) sv.line(d, dark(p.hair, 0.6), 1.3, 'opacity="0.5"');
  for (const d of hi) sv.line(d, light(p.hair, 0.4), 2.2, 'opacity="0.35" filter="url(#soft2)"');
}

/** Волосы за спиной (рисуются до тела). */
export function hairBack(sv: Svg, p: Pal, style: HairStyle) {
  const fill = backFill(sv, p);
  const shadeC = dark(p.hair, 0.55);
  switch (style) {
    case 'long':
      sv.shape(
        'M150 100 C112 150 104 240 110 320 C114 370 100 410 112 440 C118 452 128 456 136 450 C132 462 142 470 152 462 C160 440 164 410 166 380 L234 380 C236 410 240 440 248 462 C258 470 268 462 264 450 C272 456 282 452 288 440 C300 410 286 370 290 320 C296 240 288 150 250 100 Z',
        fill,
        { shade: 'M232 96 C286 160 300 300 288 440 L310 460 L310 96 Z', shadeColor: shadeC },
      );
      strands(sv, p, ['M136 170 C124 250 122 340 116 432', 'M150 200 C142 280 146 350 136 446', 'M264 170 C276 250 278 340 284 432', 'M250 200 C258 280 254 350 264 446'], ['M128 200 C120 270 120 330 118 380', 'M272 200 C280 270 280 330 282 380']);
      break;
    case 'wild': {
      const pts: P[] = [[150, 96], [118, 130], [96, 190], [108, 230], [90, 280], [106, 320], [92, 380], [118, 410], [108, 456], [142, 440], [160, 470], [172, 400], [228, 400], [240, 470], [258, 440], [292, 456], [282, 410], [308, 380], [294, 320], [310, 280], [292, 230], [304, 190], [282, 130], [250, 96]];
      sv.shape(smooth(pts, true, 0.7), fill, { shade: 'M236 96 C300 170 320 320 300 460 L330 460 L330 96 Z', shadeColor: shadeC });
      strands(sv, p, ['M130 160 C110 240 116 330 104 420', 'M150 200 C136 290 146 360 134 440', 'M270 160 C290 240 284 330 296 420', 'M250 200 C264 290 254 360 266 440'], ['M120 210 C110 270 112 330 106 380']);
      break;
    }
    case 'bob':
      sv.shape('M150 100 C120 140 120 204 140 228 C158 240 176 232 184 218 L216 218 C224 232 242 240 260 228 C280 204 280 140 250 100 Z', fill, { shade: 'M236 100 C270 150 272 210 256 232 L290 232 L290 100 Z', shadeColor: shadeC });
      strands(sv, p, ['M140 150 C132 180 134 206 144 224', 'M260 150 C268 180 266 206 256 224']);
      break;
    case 'short':
      sv.shape('M152 102 C138 140 144 184 160 200 L240 200 C256 184 262 140 248 102 Z', fill, { shade: 'M236 100 C262 140 258 190 240 200 L270 200 L270 100 Z', shadeColor: shadeC });
      break;
    case 'ponytail':
      sv.shape('M152 102 C138 140 144 190 162 208 L238 208 C256 190 262 140 248 102 Z', fill, { shade: 'M236 100 C262 140 258 190 240 208 L270 208 L270 100 Z', shadeColor: shadeC });
      // высокий хвост, падающий за правое плечо
      sv.shape('M236 86 C292 92 312 170 300 250 C294 296 304 330 290 358 C280 340 272 316 270 290 C266 240 266 170 244 110 Z', sv.matV(p.hair, 0.1, 0.45), { shade: 'M280 100 C320 180 320 300 290 358 L330 358 L330 100 Z', shadeColor: shadeC });
      strands(sv, p, ['M252 110 C280 170 286 250 282 330', 'M262 100 C296 170 300 240 292 300'], ['M270 120 C290 180 292 240 288 280']);
      break;
    case 'twintails':
      sv.shape('M152 102 C138 140 144 190 162 212 L238 212 C256 190 262 140 248 102 Z', fill, { shade: 'M236 100 C262 140 258 190 240 212 L270 212 L270 100 Z', shadeColor: shadeC });
      for (const s of [-1, 1]) {
        const X = (x: number) => 200 + (x - 200) * s;
        const d = `M${X(156)} 102 C${X(104)} 124 ${X(90)} 220 ${X(102)} 320 C${X(108)} 384 ${X(94)} 426 ${X(112)} 452 C${X(126)} 432 ${X(134)} 396 ${X(132)} 352 C${X(130)} 282 ${X(140)} 184 ${X(164)} 118 Z`;
        sv.shape(d, sv.matV(p.hair, 0.1, 0.45), { shade: s < 0 ? `M130 120 C150 200 140 340 132 452 L160 452 L160 120 Z` : `M270 120 C290 200 300 340 296 452 L320 452 L320 120 Z`, shadeColor: shadeC });
        strands(sv, p, [`M${X(140)} 140 C${X(114)} 220 ${X(112)} 320 ${X(112)} 420`], [`M${X(124)} 170 C${X(110)} 230 ${X(108)} 290 ${X(110)} 330`]);
      }
      break;
    case 'braid':
      sv.shape('M150 100 C122 140 122 204 140 236 L260 236 C278 204 278 140 250 100 Z', fill, { shade: 'M236 100 C270 150 272 210 256 236 L290 236 L290 100 Z', shadeColor: shadeC });
      break;
    case 'bun':
      sv.shape('M152 102 C138 140 144 190 160 206 L240 206 C256 190 262 140 248 102 Z', fill, { shade: 'M236 100 C262 140 258 190 240 206 L270 206 L270 100 Z', shadeColor: shadeC });
      break;
  }
}

/** Чёлка и пряди у лица (рисуются поверх лица). */
export function hairFront(sv: Svg, p: Pal, style: HairStyle) {
  const fill = sv.matV(p.hair, 0.16, 0.35);
  const shadeC = dark(p.hair, 0.5);
  const side = (kind: 'long' | 'mid' | 'short') => {
    const y = kind === 'long' ? 256 : kind === 'mid' ? 212 : 176;
    sv.shape(`M157 116 C146 160 146 ${y - 42} 156 ${y} C162 ${y - 22} 166 ${y - 52} 168 ${Math.min(176, y - 60)} C170 152 166 132 157 116 Z`, fill, { shade: `M162 170 C166 200 162 ${y - 16} 156 ${y} L170 ${y} L170 170 Z`, shadeColor: shadeC });
    sv.shape(`M243 116 C254 160 254 ${y - 42} 244 ${y} C238 ${y - 22} 234 ${y - 52} 232 ${Math.min(176, y - 60)} C230 152 234 132 243 116 Z`, fill, { shade: `M236 150 C236 190 240 ${y - 26} 244 ${y} L258 ${y} L258 150 Z`, shadeColor: shadeC });
  };
  const ring = () => sv.line('M166 90 C182 78 218 78 234 90', light(p.hair, 0.6), 4, 'opacity="0.5" filter="url(#soft2)"');

  if (style === 'long' || style === 'wild') side('long');
  else if (style === 'bob' || style === 'bun' || style === 'ponytail') side('mid');
  else if (style === 'twintails') side('short');
  else if (style === 'braid') side('short');
  else side('short');

  if (style === 'bob') {
    sv.shape('M152 122 C144 84 172 60 200 60 C228 60 256 84 248 122 L240 118 L232 124 L222 118 L212 124 L200 118 L188 124 L178 118 L168 124 L160 118 Z', fill, { shade: 'M228 66 C254 86 256 114 248 122 L262 122 L262 60 Z', shadeColor: shadeC });
  } else if (style === 'short') {
    sv.shape('M152 124 C142 82 174 58 204 60 C236 62 256 88 248 124 C240 108 226 96 206 94 C214 104 218 116 216 126 C204 110 186 102 168 104 C162 110 156 118 152 124 Z', fill, { shade: 'M232 66 C256 88 256 114 248 124 L262 124 L262 60 Z', shadeColor: shadeC });
  } else if (style === 'wild') {
    const pts: P[] = [[150, 128], [144, 96], [160, 70], [186, 58], [214, 58], [240, 70], [256, 96], [250, 128], [240, 112], [236, 130], [224, 108], [212, 132], [200, 110], [188, 132], [176, 108], [166, 130], [160, 112]];
    sv.shape(smooth(pts, true, 0.35), fill, { shade: 'M228 66 C254 88 258 116 250 128 L264 128 L264 60 Z', shadeColor: shadeC });
  } else {
    sv.shape(
      'M152 124 C144 86 172 60 200 60 C228 60 256 86 248 124 C244 114 240 108 236 104 C238 112 236 118 232 123 C228 114 222 106 214 102 C214 112 210 122 204 129 C202 116 198 108 192 104 C190 112 184 118 178 123 C178 114 174 106 168 102 C164 110 158 118 152 124 Z',
      fill,
      { shade: 'M228 66 C254 86 256 114 248 124 L262 124 L262 60 Z M170 104 C176 112 178 118 178 123 L184 116 C182 110 178 106 170 104 Z M208 106 C212 116 206 124 204 129 L212 120 C214 114 214 108 208 106 Z', shadeColor: shadeC },
    );
    strands(sv, p, ['M176 74 C172 90 170 104 172 116', 'M200 68 C198 88 198 104 200 120', 'M222 74 C228 90 230 102 230 114']);
  }
  ring();
  // резинки/банты хвостов
  if (style === 'ponytail') sv.add(`<ellipse cx="242" cy="92" rx="7" ry="9" fill="${sv.mat(p.T)}" stroke="#2a1418" stroke-width="1.2"/>`);
  if (style === 'twintails') for (const x of [152, 248]) sv.add(`<ellipse cx="${x}" cy="104" rx="8" ry="7" fill="${sv.mat(p.T)}" stroke="#2a1418" stroke-width="1.2"/>`);
  if (style === 'bun') {
    sv.shape('M186 70 C182 44 204 34 222 44 C238 54 236 78 220 86 C206 92 190 86 186 70 Z', sv.matV(p.hair, 0.2, 0.35), {});
    sv.line('M196 60 C204 50 220 52 224 64 C222 74 208 78 200 70', dark(p.hair, 0.5), 1.4, 'opacity="0.6"');
  }
}

/** Коса лежит на груди поверх торса, но под руками и оружием. */
export function hairMid(sv: Svg, p: Pal, style: HairStyle) {
  if (style !== 'braid') return;
  const fill = sv.matV(p.hair, 0.16, 0.35);
  const links: P[] = [];
  for (let i = 0; i < 9; i++) links.push([164 - i * 1.2, 206 + i * 20]);
  for (const [i, [x, y]] of links.entries()) sv.add(`<ellipse cx="${x}" cy="${y}" rx="${11 - i * 0.4}" ry="13" fill="${fill}" stroke="#2a1418" stroke-width="1.3" transform="rotate(${i % 2 ? 18 : -18} ${x} ${y})"/>`);
  const [ex, ey] = links[8];
  sv.add(`<rect x="${ex - 8}" y="${ey + 8}" width="16" height="6" rx="2" fill="${sv.mat(p.T)}" stroke="#2a1418" stroke-width="1"/>`);
  sv.shape(`M${ex - 7} ${ey + 14} C${ex - 10} ${ey + 30} ${ex - 4} ${ey + 40} ${ex} ${ey + 44} C${ex + 4} ${ey + 40} ${ex + 10} ${ey + 30} ${ex + 7} ${ey + 14} Z`, fill, {});
}
