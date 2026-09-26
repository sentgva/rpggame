/**
 * Иконки предметов 32×32: своя форма для каждого типа оружия и веса брони,
 * металл/ткань/самоцвет окрашиваются по редкости, тир добавляет украшения.
 * Та же техника, что у фигур: материалы + тона, автосветотень, тонкий контур.
 */
import { Canvas, type Tone } from './figure';
import { darken, hex, lighten, type RGBA } from './color';
import type { Bitmap } from './sprite';

const ITEM_ICON = 32;

interface Look {
  metal: string;
  trim: string;
  cloth: string;
  gem: string;
  glow?: string;
}

/** Цвета по редкости: 0 обычный … 6 божественный. */
const RARITY: Look[] = [
  { metal: '#B8BEC8', trim: '#8A7058', cloth: '#8A7A6A', gem: '#C8D0DE' },
  { metal: '#C8D2DC', trim: '#6A9A5A', cloth: '#4F9A58', gem: '#5AD06A' },
  { metal: '#B8CCE8', trim: '#4A78C0', cloth: '#3D6BC0', gem: '#5AA8F0' },
  { metal: '#BCB4D8', trim: '#8A4DC8', cloth: '#7A3DB0', gem: '#C070FF', glow: '#9B4DE0' },
  { metal: '#F2C860', trim: '#E07A24', cloth: '#C8561C', gem: '#FF9A30', glow: '#F08A24' },
  { metal: '#C8B8BC', trim: '#C02A2A', cloth: '#8A1A24', gem: '#FF4A4A', glow: '#E03A3A' },
  { metal: '#FFF0C0', trim: '#F2D46B', cloth: '#E8E0FF', gem: '#FFFFFF', glow: '#F2D46B' },
];

const WOOD = '#8A5A34';
const LEATHER = '#7A4A2A';

function pal(r: number): Record<string, Record<Tone, RGBA>> {
  const L = RARITY[Math.max(0, Math.min(6, r))];
  const t = (c: string, d = 0.42): Record<Tone, RGBA> => {
    const b = hex(c);
    return { '0': b, '+': lighten(b, 0.32), '-': darken(b, 0.26), '=': darken(b, d) };
  };
  const gem = hex(L.gem);
  return {
    M: t(L.metal),
    N: t(L.trim),
    W: t(WOOD),
    L: t(LEATHER),
    C: t(L.cloth),
    J: { '0': gem, '+': lighten(gem, 0.7), '-': darken(gem, 0.3), '=': darken(gem, 0.5) },
    P: t('#F2E6D0'),
    S: t('#3A2A2E'),
    R: t(r === 6 ? '#FF6A9A' : '#E8E0D8'),
    X: t('#150C10'),
    G: t(L.glow ?? L.gem),
  };
}

type Draw = (c: Canvas, tier: number) => void;

// ——— оружие (наискось: рукоять слева снизу, остриё справа сверху) ———

const sword: Draw = (c, tier) => {
  c.line(9, 22, 26, 5, 'M', '0', 4);
  c.line(10, 21, 27, 4, 'M', '+');
  c.line(12, 23, 28, 7, 'M', '-');
  c.rect(27, 3, 28, 4, 'M', '+');
  c.line(5, 17, 14, 26, 'N', '0', 3);
  c.line(3, 26, 8, 21, 'L', '0', 3);
  c.rect(1, 27, 3, 29, 'N');
  if (tier >= 3) c.set(9, 21, 'J', '+');
  if (tier >= 2) c.line(14, 17, 20, 11, 'J', '-');
};

const axe: Draw = (c, tier) => {
  c.line(6, 27, 20, 7, 'W', '0', 2);
  c.poly(
    [
      [14, 4],
      [28, 1],
      [31, 14],
      [22, 19],
      [17, 12],
    ],
    'M',
  );
  c.line(27, 2, 29, 12, 'M', '+');
  c.poly(
    [
      [18, 11],
      [14, 13],
      [15, 8],
    ],
    'M',
    '-',
  );
  c.rect(18, 8, 19, 10, 'N');
  if (tier >= 3) c.set(23, 7, 'J', '+');
};

const bow: Draw = (c, tier) => {
  c.path(
    [
      [7, 3],
      [15, 4],
      [22, 8],
      [27, 15],
      [28, 22],
      [27, 29],
    ],
    'W',
    '0',
    3,
  );
  c.line(8, 5, 25, 28, 'P', '-');
  c.rect(20, 12, 22, 14, 'L');
  c.line(4, 26, 20, 10, 'W', '-');
  c.poly(
    [
      [20, 8],
      [23, 7],
      [22, 10],
    ],
    'M',
  );
  if (tier >= 2) {
    c.set(8, 4, 'N', '+');
    c.set(26, 28, 'N', '+');
  }
  if (tier >= 3) c.set(21, 13, 'J', '+');
};

const staff: Draw = (c, tier) => {
  c.line(6, 29, 21, 9, 'W', '0', 2);
  c.ellipse(24, 7, 4, 4, 'J');
  c.set(22, 5, 'J', '+');
  c.set(23, 5, 'J', '+');
  c.path(
    [
      [19, 11],
      [18, 6],
      [21, 3],
    ],
    'N',
  );
  c.path(
    [
      [21, 12],
      [27, 12],
      [29, 9],
    ],
    'N',
  );
  if (tier >= 3)
    for (const [x, y] of [
      [29, 3],
      [18, 2],
      [30, 13],
    ] as [number, number][])
      c.set(x, y, 'G', '+');
};

const wand: Draw = (c, tier) => {
  c.line(7, 26, 19, 13, 'P', '0', 2);
  c.line(7, 26, 10, 23, 'N', '0', 2);
  c.poly(
    [
      [22, 5],
      [24, 10],
      [29, 11],
      [25, 14],
      [26, 19],
      [22, 16],
      [18, 19],
      [19, 14],
      [15, 11],
      [20, 10],
    ],
    'N',
  );
  c.ellipse(22, 12.5, 1.6, 1.6, 'J');
  if (tier >= 3) c.set(28, 5, 'G', '+');
};

const scythe: Draw = (c, tier) => {
  c.line(5, 29, 19, 5, 'W', '-', 2);
  c.poly(
    [
      [16, 3],
      [29, 4],
      [31, 14],
      [26, 9],
      [18, 8],
    ],
    'M',
  );
  c.line(19, 4, 28, 5, 'M', '+');
  c.rect(17, 6, 19, 8, 'N');
  if (tier >= 3) c.set(18, 7, 'J', '+');
};

const dagger: Draw = (c, tier) => {
  c.line(11, 20, 24, 7, 'M', '0', 3);
  c.line(12, 19, 25, 6, 'M', '+');
  c.set(25, 7, 'M', '+');
  c.line(9, 17, 14, 22, 'N', '0', 2);
  c.line(7, 24, 10, 21, 'L', '0', 2);
  if (tier >= 3) c.set(11, 19, 'J', '+');
};

const daggers: Draw = (c, tier) => {
  dagger(c, tier);
  c.line(20, 19, 9, 8, 'M', '0', 2);
  c.line(19, 19, 8, 8, 'M', '-');
  c.line(23, 17, 18, 22, 'N', '0', 2);
  c.line(25, 24, 22, 21, 'L', '0', 2);
};

const lute: Draw = (c, tier) => {
  c.ellipse(11, 20, 7, 7.5, 'W');
  c.ellipse(11, 20, 2.2, 2.2, 'W', '=');
  c.line(15, 15, 26, 4, 'W', '-', 3);
  c.rect(25, 2, 28, 5, 'N');
  c.line(8, 23, 26, 5, 'P', '+');
  c.line(10, 25, 27, 6, 'P', '0');
  c.hl(7, 12, 26, 'N');
  if (tier >= 3) c.set(5, 17, 'J', '+');
};

const shield: Draw = (c, tier) => {
  c.poly(
    [
      [5, 4],
      [27, 4],
      [27, 17],
      [16, 29],
      [5, 17],
    ],
    'C',
  );
  c.path(
    [
      [5, 4],
      [27, 4],
      [27, 17],
      [16, 29],
      [5, 17],
      [5, 4],
    ],
    'M',
    '0',
    2,
  );
  c.vl(16, 6, 26, 'N');
  c.hl(7, 25, 13, 'N');
  if (tier >= 2) c.ellipse(16, 13, 2.2, 2.2, 'J');
  if (tier >= 4) c.hl(8, 24, 6, 'M', '+');
};

const horn: Draw = (c, tier) => {
  c.poly(
    [
      [4, 8],
      [9, 6],
      [18, 14],
      [27, 20],
      [28, 25],
      [22, 26],
      [13, 19],
    ],
    'P',
  );
  c.path(
    [
      [10, 8],
      [14, 17],
    ],
    'N',
    '0',
    2,
  );
  c.path(
    [
      [20, 16],
      [22, 24],
    ],
    'N',
    '0',
    2,
  );
  c.ellipse(26, 23, 2.6, 3, 'N', '-');
  if (tier >= 3) c.set(16, 17, 'J', '+');
};

const quiver: Draw = (c, tier) => {
  c.poly(
    [
      [9, 10],
      [17, 6],
      [26, 24],
      [18, 28],
    ],
    'L',
  );
  c.line(11, 13, 19, 9, 'N', '0');
  c.line(19, 25, 25, 22, 'N', '0');
  for (const [x, y] of [
    [10, 3],
    [13, 2],
    [16, 1],
  ] as [number, number][]) {
    c.line(x + 2, y + 8, x, y + 2, 'W');
    c.poly(
      [
        [x - 1, y + 3],
        [x, y],
        [x + 2, y + 3],
      ],
      'C',
    );
  }
  if (tier >= 3) c.set(15, 17, 'J', '+');
};

const orb: Draw = (c, tier) => {
  c.poly(
    [
      [9, 27],
      [23, 27],
      [21, 22],
      [11, 22],
    ],
    'N',
  );
  c.ellipse(16, 14, 8, 8, 'J');
  c.ellipse(16, 14, 5, 5, 'G', '-');
  c.rect(12, 9, 14, 11, 'J', '+');
  c.set(19, 18, 'J', '+');
  if (tier >= 3)
    for (const [x, y] of [
      [5, 6],
      [27, 8],
      [26, 22],
    ] as [number, number][])
      c.set(x, y, 'G', '+');
};

function book(c: Canvas, tier: number, cover: string, sym: 'rune' | 'eye' | 'note') {
  c.poly(
    [
      [6, 7],
      [24, 4],
      [27, 24],
      [9, 28],
    ],
    cover,
  );
  c.line(7, 8, 10, 28, cover, '=', 2);
  c.poly(
    [
      [24, 4],
      [26, 5],
      [29, 25],
      [27, 24],
    ],
    'P',
  );
  c.line(10, 8, 25, 5, 'N');
  c.line(12, 27, 27, 24, 'N');
  if (sym === 'rune') {
    c.ellipse(17, 16, 3.4, 3.4, 'N');
    c.ellipse(17, 16, 1.4, 1.4, cover);
    c.set(17, 16, 'J', '+');
  } else if (sym === 'eye') {
    c.ellipse(17, 16, 4, 2.4, 'J');
    c.rect(16, 15, 17, 17, 'S');
  } else {
    c.line(15, 13, 15, 19, 'N');
    c.line(15, 13, 20, 12, 'N');
    c.line(20, 12, 20, 18, 'N');
    c.ellipse(14, 19, 1.4, 1, 'N');
    c.ellipse(19, 18, 1.4, 1, 'N');
  }
  if (tier >= 3) c.set(24, 7, 'J', '+');
}

const tome: Draw = (c, tier) => book(c, tier, 'C', 'rune');
const grimoire: Draw = (c, tier) => book(c, tier, 'S', 'eye');
const songbook: Draw = (c, tier) => book(c, tier, 'L', 'note');

// ——— броня ———

const helmet: Record<string, Draw> = {
  heavy: (c, tier) => {
    c.ellipse(16, 15, 10, 11, 'M');
    c.rect(6, 15, 26, 27, 'M');
    c.hl(8, 24, 16, 'S');
    c.hl(8, 24, 17, 'S', '-');
    c.vl(16, 16, 26, 'M', '-');
    for (let y = 20; y <= 25; y += 2) {
      c.set(12, y, 'S');
      c.set(20, y, 'S');
    }
    c.path(
      [
        [16, 4],
        [14, 1],
        [19, 0],
      ],
      'C',
      '0',
      2,
    );
    if (tier >= 2) c.hl(7, 25, 27, 'N');
    if (tier >= 3) c.set(16, 7, 'J', '+');
  },
  medium: (c, tier) => {
    c.poly(
      [
        [16, 3],
        [27, 12],
        [27, 26],
        [22, 20],
        [10, 20],
        [5, 26],
        [5, 12],
      ],
      'L',
    );
    c.poly(
      [
        [10, 14],
        [22, 14],
        [22, 20],
        [10, 20],
      ],
      'S',
      '=',
    );
    c.line(16, 4, 16, 13, 'N');
    if (tier >= 3) c.set(16, 8, 'J', '+');
  },
  light: (c, tier) => {
    c.path(
      [
        [4, 20],
        [9, 13],
        [16, 11],
        [23, 13],
        [28, 20],
      ],
      'N',
      '0',
      2,
    );
    c.poly(
      [
        [13, 12],
        [16, 5],
        [19, 12],
      ],
      'N',
    );
    c.ellipse(16, 11, 2.2, 2.4, 'J');
    c.set(15, 10, 'J', '+');
    if (tier >= 3) {
      c.set(9, 13, 'J');
      c.set(23, 13, 'J');
    }
  },
};

const armor: Record<string, Draw> = {
  heavy: (c, tier) => {
    c.poly(
      [
        [9, 5],
        [23, 5],
        [28, 9],
        [26, 16],
        [24, 28],
        [8, 28],
        [6, 16],
        [4, 9],
      ],
      'M',
    );
    c.poly(
      [
        [12, 5],
        [20, 5],
        [16, 10],
      ],
      '',
    );
    c.ellipse(6, 9, 3.6, 3, 'M', '+');
    c.ellipse(26, 9, 3.6, 3, 'M', '+');
    c.vl(16, 11, 27, 'M', '-');
    c.hl(8, 24, 20, 'N');
    c.hl(8, 24, 27, 'N');
    if (tier >= 2) c.ellipse(16, 15, 1.6, 1.6, 'J');
  },
  medium: (c, tier) => {
    c.poly(
      [
        [10, 4],
        [22, 4],
        [26, 12],
        [24, 28],
        [8, 28],
        [6, 12],
      ],
      'L',
    );
    c.poly(
      [
        [13, 4],
        [19, 4],
        [16, 11],
      ],
      '',
    );
    for (let y = 13; y <= 25; y += 3) {
      c.line(13, y, 19, y + 2, 'N');
      c.line(19, y, 13, y + 2, 'N');
    }
    c.hl(8, 24, 20, 'C');
    if (tier >= 3) c.set(16, 20, 'J', '+');
  },
  light: (c, tier) => {
    c.poly(
      [
        [11, 3],
        [21, 3],
        [23, 12],
        [28, 29],
        [4, 29],
        [9, 12],
      ],
      'C',
    );
    c.poly(
      [
        [13, 3],
        [19, 3],
        [16, 9],
      ],
      '',
    );
    c.hl(9, 23, 13, 'N');
    c.line(16, 14, 16, 28, 'C', '-');
    c.hl(5, 27, 28, 'N');
    if (tier >= 3) c.ellipse(16, 13, 1.4, 1.4, 'J');
  },
};

const gloves: Record<string, Draw> = {
  heavy: (c, tier) => {
    c.poly(
      [
        [8, 16],
        [22, 16],
        [24, 28],
        [6, 28],
      ],
      'M',
    );
    c.rect(9, 6, 21, 16, 'M');
    for (const x of [9, 12, 15, 18]) {
      c.rect(x, 3, x + 2, 9, 'M', x % 2 ? '+' : '0');
      c.set(x + 1, 6, 'M', '-');
    }
    c.poly(
      [
        [21, 11],
        [27, 9],
        [27, 13],
        [22, 16],
      ],
      'M',
    );
    c.hl(6, 24, 22, 'N');
    if (tier >= 3) c.set(15, 12, 'J', '+');
  },
  medium: (c, tier) => {
    c.rect(9, 7, 21, 20, 'L');
    for (const x of [9, 12, 15, 18]) c.rect(x, 3, x + 2, 8, 'L');
    c.poly(
      [
        [21, 12],
        [26, 10],
        [26, 14],
        [21, 17],
      ],
      'L',
    );
    c.rect(8, 20, 22, 27, 'C');
    c.hl(8, 22, 21, 'N');
    if (tier >= 3) c.set(15, 24, 'J', '+');
  },
  light: (c, tier) => {
    c.poly(
      [
        [10, 4],
        [21, 4],
        [23, 27],
        [8, 27],
      ],
      'C',
    );
    c.hl(10, 21, 4, 'N');
    c.hl(8, 23, 27, 'N');
    for (let y = 9; y <= 23; y += 5) c.hl(10, 21, y, 'C', '-');
    if (tier >= 2) c.ellipse(15.5, 16, 1.6, 1.6, 'J');
  },
};

const boots: Record<string, Draw> = {
  heavy: (c, tier) => {
    c.rect(9, 3, 19, 20, 'M');
    c.poly(
      [
        [9, 20],
        [19, 20],
        [28, 24],
        [28, 28],
        [7, 28],
      ],
      'M',
    );
    c.hl(9, 19, 9, 'M', '-');
    c.hl(9, 19, 14, 'M', '-');
    c.hl(7, 28, 28, 'S');
    c.ellipse(14, 17, 2.2, 1.6, 'N');
    if (tier >= 3) c.set(14, 17, 'J', '+');
  },
  medium: (c, tier) => {
    c.rect(10, 3, 19, 21, 'L');
    c.poly(
      [
        [10, 21],
        [19, 21],
        [27, 25],
        [27, 28],
        [8, 28],
      ],
      'L',
    );
    c.hl(9, 20, 3, 'C');
    c.hl(9, 20, 4, 'C', '-');
    c.hl(8, 27, 28, 'S');
    for (let y = 8; y <= 17; y += 3) c.set(15, y, 'N');
    if (tier >= 3) c.set(12, 5, 'J', '+');
  },
  light: (c, tier) => {
    c.poly(
      [
        [11, 10],
        [18, 10],
        [26, 23],
        [26, 27],
        [8, 27],
        [9, 18],
      ],
      'C',
    );
    c.path(
      [
        [11, 10],
        [9, 4],
        [13, 2],
      ],
      'N',
    );
    c.path(
      [
        [18, 10],
        [21, 5],
        [18, 2],
      ],
      'N',
    );
    c.hl(8, 26, 27, 'N');
    if (tier >= 2) c.ellipse(16, 15, 1.4, 1.4, 'J');
  },
};

const belt: Draw = (c, tier) => {
  c.poly(
    [
      [2, 12],
      [30, 10],
      [30, 18],
      [2, 20],
    ],
    'L',
  );
  c.line(2, 13, 30, 11, 'L', '+');
  c.rect(12, 9, 20, 20, 'N');
  c.rect(14, 11, 18, 18, 'L', '=');
  c.rect(15, 12, 17, 17, '');
  c.rect(24, 18, 28, 26, 'L', '-');
  c.hl(24, 28, 19, 'N');
  if (tier >= 3) c.ellipse(16, 14.5, 1.4, 1.8, 'J');
};

const cloak: Draw = (c, tier) => {
  c.poly(
    [
      [11, 3],
      [21, 3],
      [26, 16],
      [29, 29],
      [3, 29],
      [6, 16],
    ],
    'C',
  );
  c.poly(
    [
      [12, 3],
      [20, 3],
      [16, 12],
    ],
    'C',
    '=',
  );
  for (const x of [10, 16, 22]) c.line(x, 14, x + (x - 16) / 3, 28, 'C', '-');
  c.hl(10, 22, 4, 'N');
  c.ellipse(16, 5, 2, 1.6, 'N', '+');
  if (tier >= 3) c.set(16, 5, 'J', '+');
};

const amulet: Draw = (c, tier) => {
  c.path(
    [
      [6, 3],
      [9, 10],
      [16, 15],
      [23, 10],
      [26, 3],
    ],
    'N',
  );
  c.ellipse(16, 21, 6, 6.4, 'N');
  c.ellipse(16, 21, 4, 4.4, 'J');
  c.rect(14, 18, 15, 19, 'J', '+');
  if (tier >= 3) {
    c.set(16, 13, 'J', '+');
    c.set(16, 28, 'N', '+');
  }
};

const ring: Draw = (c, tier) => {
  c.ellipse(16, 19, 9, 8, 'N');
  c.ellipse(16, 19, 6, 5, '');
  c.poly(
    [
      [11, 10],
      [21, 10],
      [19, 5],
      [13, 5],
    ],
    'N',
  );
  c.poly(
    [
      [12, 8],
      [16, 2],
      [20, 8],
      [16, 12],
    ],
    'J',
  );
  c.set(14, 6, 'J', '+');
  c.set(15, 5, 'J', '+');
  if (tier >= 3) {
    c.set(8, 16, 'J', '+');
    c.set(24, 16, 'J', '+');
  }
};

const WEAPON_DRAW: Record<string, Draw> = { sword, axe, bow, staff, wand, scythe, daggers, dagger, lute, shield, horn, quiver, orb, tome, grimoire, songbook };

function drawItem(c: Canvas, slot: string, type: string, tier: number) {
  if (WEAPON_DRAW[type]) return WEAPON_DRAW[type](c, tier);
  const weight = type === 'heavy' || type === 'medium' || type === 'light' ? type : 'medium';
  switch (slot) {
    case 'helmet':
      return helmet[weight](c, tier);
    case 'armor':
      return armor[weight](c, tier);
    case 'gloves':
      return gloves[weight](c, tier);
    case 'boots':
      return boots[weight](c, tier);
    case 'belt':
      return belt(c, tier);
    case 'cloak':
      return cloak(c, tier);
    case 'amulet':
      return amulet(c, tier);
    default:
      return ring(c, tier);
  }
}

const AUTO = new Set(['M', 'N', 'W', 'L', 'C', 'P', 'S']);

export function renderItemIcon(slot: string, type: string, tier: number, rarity: number): Bitmap {
  const c = new Canvas(ITEM_ICON, ITEM_ICON);
  drawItem(c, slot, type, tier);
  // автосветотень: свет сверху-слева
  const src = c.g.slice();
  const at = (x: number, y: number) => (c.in(x, y) ? src[y * c.w + x].charAt(0) : '');
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const v = src[y * c.w + x];
      if (v.length !== 2 || v[1] !== '0' || !AUTO.has(v[0])) continue;
      const m = v[0];
      if (at(x + 1, y) !== m && at(x, y + 1) !== m) c.set(x, y, m, '=');
      else if (at(x + 1, y) !== m || at(x, y + 1) !== m) c.set(x, y, m, '-');
      else if (at(x - 1, y) !== m || at(x, y - 1) !== m) c.set(x, y, m, '+');
    }
  // свечение редких предметов — мягкий ореол из цвета редкости
  const P = pal(rarity);
  const glow = rarity >= 3 ? RARITY[rarity].glow : undefined;
  const data = new Uint8ClampedArray(c.w * c.h * 4);
  const solid = (x: number, y: number) => c.in(x, y) && !!c.get(x, y);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const i = (y * c.w + x) * 4;
      const v = c.get(x, y);
      if (v) {
        const col = P[v.charAt(0)]?.[(v.charAt(1) || '0') as Tone] ?? hex('#FF00FF');
        data.set(col, i);
        continue;
      }
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        data.set(P.X['0'], i);
        continue;
      }
      if (glow) {
        let near = false;
        for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) if (solid(x + dx, y + dy)) near = true;
        if (near) {
          const g = hex(glow);
          data.set([g[0], g[1], g[2], rarity >= 5 ? 110 : 80], i);
        }
      }
    }
  return { w: c.w, h: c.h, data };
}
