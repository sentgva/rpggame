export type RGBA = [number, number, number, number];

export function hex(c: string, a = 255): RGBA {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

export function darken(c: RGBA, t: number): RGBA {
  // затемнение с лёгким сдвигом в фиолетовый — пиксельный «hue shift»
  return mix(c, [34, 18, 44, 255], t);
}

export function lighten(c: RGBA, t: number): RGBA {
  return mix(c, [255, 246, 220, 255], t);
}

export function toCss(c: RGBA): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(3)})`;
}
