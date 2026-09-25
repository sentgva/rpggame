import { LINE, dark, light, smooth, type P, type Svg } from './core';
import type { Pal } from './body';

export type Extra = 'wings' | 'darkWings' | 'tail' | 'snake' | 'fishTail' | 'scorpion' | 'vines' | 'gears' | 'none' | undefined;

/** Крылья, хвосты, шестерни — за телом. flap — второй кадр взмаха/покачивания. */
export function extraBack(sv: Svg, p: Pal, extra: Extra, flap: boolean) {
  switch (extra) {
    case 'wings':
      for (const s of [-1, 1] as const) {
        const root: P = [200 + s * 24, 236];
        sv.group(`rotate(${flap ? -s * 16 : 0} ${root[0]} ${root[1]})`, () => {
          // маховые перья веером (от нижних к верхним), поверх — кроющие
          for (let i = 0; i < 8; i++) {
            const a = ((165 - i * 16) * Math.PI) / 180;
            const len = 190 - i * 8;
            const tip: P = [root[0] - s * Math.cos(a) * len * -1 * -1, root[1] - Math.sin(a) * len];
            const tx = root[0] + s * Math.abs(Math.cos(a)) * len;
            const ty = root[1] - Math.sin(a) * len * 0.9 + (i < 3 ? 30 - i * 10 : 0);
            tip[0] = tx;
            tip[1] = ty;
            const cx = (root[0] + tip[0]) / 2;
            const cy = (root[1] + tip[1]) / 2;
            const ang = (Math.atan2(tip[1] - root[1], tip[0] - root[0]) * 180) / Math.PI;
            sv.add(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(len / 2).toFixed(1)}" ry="${(16 - i * 0.5).toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${sv.mat(p.Q, 0.2, 0.28)}" stroke="${LINE}" stroke-width="1.3"/>`);
            sv.line(`M${root[0]} ${root[1]} L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`, dark(p.Q, 0.3), 1, 'opacity="0.45"');
          }
          const cov = `M${root[0]} ${root[1] - 6} C${root[0] + s * 50} ${root[1] - 110} ${root[0] + s * 118} ${root[1] - 128} ${root[0] + s * 140} ${root[1] - 100} C${root[0] + s * 104} ${root[1] - 58} ${root[0] + s * 60} ${root[1] - 14} ${root[0]} ${root[1] + 18} Z`;
          sv.shape(cov, sv.mat(light(p.Q, 0.1), 0.25, 0.2), {});
          sv.line(`M${root[0] + s * 30} ${root[1] - 40} C${root[0] + s * 60} ${root[1] - 70} ${root[0] + s * 90} ${root[1] - 90} ${root[0] + s * 120} ${root[1] - 98}`, dark(p.Q, 0.25), 1.2, 'opacity="0.5"');
        });
      }
      break;
    case 'darkWings':
      for (const s of [-1, 1] as const) {
        const root: P = [200 + s * 26, 238];
        sv.group(`rotate(${flap ? -s * 18 : 0} ${root[0]} ${root[1]}) translate(${root[0]} ${root[1]}) scale(1.4) translate(${-root[0]} ${-root[1]})`, () => {
          const X = (dx: number) => root[0] + s * dx;
          const bones: P[] = [[X(40), root[1] - 110], [X(120), root[1] - 118], [X(150), root[1] - 60], [X(140), root[1] + 10]];
          const mem = `M${root[0]} ${root[1]} L${X(40)} ${root[1] - 110} C${X(70)} ${root[1] - 104} ${X(96)} ${root[1] - 122} ${X(120)} ${root[1] - 118} C${X(122)} ${root[1] - 90} ${X(136)} ${root[1] - 76} ${X(150)} ${root[1] - 60} C${X(136)} ${root[1] - 40} ${X(136)} ${root[1] - 20} ${X(140)} ${root[1] + 10} C${X(110)} ${root[1] + 4} ${X(80)} ${root[1] + 30} ${X(60)} ${root[1] + 44} C${X(46)} ${root[1] + 20} ${X(24)} ${root[1] + 20} ${root[0]} ${root[1] + 24} Z`;
          sv.shape(mem, sv.lin([[0, light(p.D, 0.2)], [1, dark(p.D, 0.35)]], s < 0 ? 1 : 0, 0, s < 0 ? 0 : 1, 1), { shade: `M${root[0]} ${root[1]} L${X(40)} ${root[1] - 110} L${X(60)} ${root[1] + 44} Z`, shadeColor: dark(p.D, 0.6), shadeOpacity: 0.5 });
          for (const b of bones) sv.line(`M${root[0]} ${root[1]} L${b[0]} ${b[1]}`, dark(p.D, 0.5), 3.2);
          sv.line(`M${root[0]} ${root[1]} L${X(40)} ${root[1] - 110}`, light(p.D, 0.35), 1.2, 'opacity="0.7"');
        });
      }
      break;
    case 'tail': {
      const pts: P[] = flap ? [[222, 380], [262, 398], [296, 384], [318, 350], [336, 330]] : [[222, 380], [258, 392], [288, 370], [302, 330], [312, 298]];
      sv.line(smooth(pts), LINE, 10);
      sv.line(smooth(pts), p.A, 7);
      sv.line(smooth(pts), light(p.A, 0.35), 2, 'opacity="0.6"');
      const t = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const ang = (Math.atan2(t[1] - prev[1], t[0] - prev[0]) * 180) / Math.PI + 90;
      sv.add(`<g transform="translate(${t[0]} ${t[1]}) rotate(${ang.toFixed(1)})"><path d="M0 4 C-14 -4 -12 -18 0 -26 C12 -18 14 -4 0 4 Z" fill="${sv.mat(p.A, 0.2, 0.35)}" stroke="${LINE}" stroke-width="1.3"/></g>`);
      break;
    }
    case 'scorpion': {
      const pts: P[] = [[226, 388], [272, 380], [300, 330], [304, 260], [288, 200], [262, 176]];
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        sv.add(`<ellipse cx="${x}" cy="${y}" rx="${16 - i * 1.2}" ry="${13 - i}" fill="${sv.mat(p.A, 0.25, 0.4)}" stroke="${LINE}" stroke-width="1.3"/>`);
      }
      sv.shape(flap ? 'M262 176 C246 160 240 150 246 136 C254 150 262 158 272 164 Z' : 'M262 176 C244 166 236 154 240 138 C250 152 260 160 272 166 Z', sv.mat(dark(p.A, 0.2), 0.2, 0.4), {});
      break;
    }
    case 'gears':
      for (const [cx, cy, r] of [[112, 150, 34], [292, 232, 26], [290, 118, 18]] as [number, number, number][]) {
        let d = '';
        const teeth = Math.round(r / 3);
        for (let k = 0; k < teeth * 2; k++) {
          const a = (k / (teeth * 2)) * Math.PI * 2 + (flap ? Math.PI / teeth / 2 : 0);
          const rr = k % 2 ? r : r + 7;
          d += `${k ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        sv.shape(d + 'Z', sv.mat(p.K, 0.3, 0.35), {});
        sv.add(`<circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(1)}" fill="${dark(p.K, 0.45)}" stroke="${LINE}" stroke-width="1.2"/>`);
      }
      break;
  }
}

/** Нижняя часть монстродевушки вместо ног (ламия, русалка). Возвращает true, если ноги заменены. */
export function lowerExtra(sv: Svg, p: Pal, extra: Extra, flap: boolean): boolean {
  if (extra === 'snake') {
    const tip = flap ? [330, 700] : [318, 734];
    const d = `M148 392 C140 470 150 560 176 630 C200 690 250 730 300 742 C${tip[0] + 20} 744 ${tip[0] + 30} ${tip[1] - 20} ${tip[0]} ${tip[1] - 30} C290 700 250 690 232 640 C216 590 250 500 252 392 Z`;
    sv.shape(d, sv.lin([[0, light(p.A, 0.2)], [0.5, p.A], [1, dark(p.A, 0.4)]], 0, 0, 1, 0.6), { shade: 'M220 400 C250 480 230 600 250 690 L330 760 L330 400 Z', shadeColor: dark(p.A, 0.6), shadeOpacity: 0.6 });
    // брюшко и чешуя
    sv.shape('M186 420 C180 500 190 580 210 630 C226 668 256 700 292 716 C262 690 240 660 226 620 C212 570 214 490 214 420 Z', light(p.A, 0.45), { opacity: 0.8 });
    for (let y = 440; y < 700; y += 22) sv.line(`M${190 + (y - 440) * 0.12} ${y} C${200 + (y - 440) * 0.18} ${y + 6} ${210 + (y - 440) * 0.25} ${y + 6} ${218 + (y - 440) * 0.3} ${y}`, dark(p.A, 0.35), 1.2, 'opacity="0.6"');
    return true;
  }
  if (extra === 'fishTail') {
    const d = 'M148 392 C142 470 150 560 170 640 C176 670 186 700 194 720 L206 720 C214 700 224 670 230 640 C250 560 258 470 252 392 Z';
    sv.shape(d, sv.lin([[0, light(p.A, 0.25)], [0.5, p.A], [1, dark(p.A, 0.4)]], 0, 0, 1, 0.3), { shade: 'M226 400 C256 480 240 620 206 720 L240 720 L270 400 Z', shadeColor: dark(p.A, 0.6), shadeOpacity: 0.6 });
    for (let y = 420; y < 700; y += 18)
      for (let x = 158 + (y - 420) * 0.12; x < 244 - (y - 420) * 0.12; x += 14) sv.line(`M${(x + ((y / 18) % 2) * 7).toFixed(1)} ${y} q7 8 14 0`, dark(p.A, 0.35), 1, 'opacity="0.45"');
    const fin = flap
      ? 'M194 716 C170 740 140 760 128 790 C160 780 184 766 200 748 C216 766 240 780 272 790 C260 760 230 740 206 716 Z'
      : 'M194 716 C176 744 150 764 142 796 C168 782 188 766 200 750 C212 766 232 782 258 796 C250 764 224 744 206 716 Z';
    sv.shape(fin, sv.mat(light(p.T, 0.1), 0.3, 0.3), {});
    return true;
  }
  return false;
}

/** Лозы поверх тела. */
export function extraFront(sv: Svg, p: Pal, extra: Extra) {
  if (extra !== 'vines') return;
  const vine = (pts: P[]) => {
    sv.line(smooth(pts), LINE, 6);
    sv.line(smooth(pts), p.V, 4);
    for (let i = 1; i < pts.length; i += 1) {
      const [x, y] = pts[i];
      sv.add(`<ellipse cx="${x + 6}" cy="${y - 4}" rx="7" ry="3.6" transform="rotate(-35 ${x + 6} ${y - 4})" fill="${sv.mat(light(p.V, 0.1), 0.3, 0.3)}" stroke="${LINE}" stroke-width="0.9"/>`);
    }
  };
  vine([[150, 420], [192, 470], [150, 520], [190, 580], [158, 640], [186, 700]]);
  vine([[250, 430], [206, 490], [248, 540], [210, 600], [240, 660], [214, 712]]);
  vine([[140, 250], [120, 290], [134, 330], [150, 366]]);
}
