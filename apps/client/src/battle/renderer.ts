/**
 * Сцена «Живого боя» (PixiJS): проигрывает события симулятора в реальном времени.
 * Поле 0…100 растянуто по ширине сцены, три ряда по глубине; бойцы бегут, бьют, стреляют.
 * Ульты — с врезкой портрета, цепь Легиона и залп — крупными надписями, замах босса — красным
 * кругом и полосой, парирование — золотой вспышкой щита. Между волнами Легион идёт маршем.
 */
import { CLASSES, COMBO_MAP, ENEMY_MAP, ENEMY_SKILLS, HEROINE_MAP, type ClassId, type CombatEvent, type UnitSnap } from '@idle/shared';
import { Application, BitmapFont, BitmapText, Container, Graphics, Sprite, Texture, TextureSource, TilingSprite } from 'pixi.js';
import { ACTS } from '@idle/shared';
import { portraitCanvas, unitCanvas } from '../art/runtime';
import { frameKey, lifeFrame, newLife, type LifeAnim, type LifeFrame } from '../art/anim';
import { sfx } from '../audio/sfx';
import { t, tl } from '../i18n';
import { useGame } from '../store/game';
import { PIXEL_FONT, loadPixelFont } from '../styles/pixelFont';
import { BG_H, BG_W, drawLayer, drawSky, weatherParams, type Particle } from './backdrop';
import { useLive } from './live';
import type { LiveBattle } from './live';

TextureSource.defaultOptions.scaleMode = 'nearest';

export type PlaybackKind = 'wave' | 'boss' | 'farm' | 'mode';

export interface Playback {
  events: CombatEvent[];
  kind: PlaybackKind;
  act: number;
  win: boolean;
  speed: number;
  label: string;
  /** живой бой с ручным управлением: события меняются по ходу (пересчёт после команд игрока) */
  live?: LiveBattle;
}

const VFX_COLOR: Record<string, number> = {
  fire: 0xff7a2a,
  ice: 0x9fe0ff,
  holy: 0xffe8a0,
  dark: 0xc06aff,
  poison: 0x7acf5a,
  bolt: 0xffe040,
  arrow: 0xf2e6d8,
  slash: 0xffffff,
  song: 0xf4b8cc,
  nova: 0xe040ff,
  heal: 0x7ae07a,
  shield: 0x6fd0ff,
  beast: 0xd8f0ff,
};
const DOT_COLOR: Record<string, number> = { burn: 0xff9a4a, poison: 0x9ae07a, bleed: 0xff5a5a };
/** Цвета классов (как в интерфейсе). */
const CLASS_HEX: Record<ClassId, number> = { knight: 0x6f9ad8, assassin: 0xb06ae0, priestess: 0xf2d46b, ranger: 0x6ac06a, warlock: 0xe0603a, hunter: 0x6fd0e0 };
/** Метки над целью: цвет класса, который её ставит. */
const MARK_COLOR: Record<string, number> = {
  'mark:daze': CLASS_HEX.knight,
  'mark:curse': CLASS_HEX.warlock,
  'mark:root': CLASS_HEX.ranger,
  'mark:prey': CLASS_HEX.hunter,
};
/** Снаряд обычной атаки по виду атаки класса или роли врага. */
const SHOT: Record<string, { color: number; kind: 'arrow' | 'bolt' | 'orb'; arc: number }> = {
  arrow: { color: 0xf2e6d8, kind: 'arrow', arc: 18 },
  crossbow: { color: 0xd8f0ff, kind: 'arrow', arc: 4 },
  bolt: { color: 0xffe8a0, kind: 'bolt', arc: 6 },
  orb: { color: 0xff8a40, kind: 'orb', arc: 10 },
  ranged: { color: 0xf2e6d8, kind: 'arrow', arc: 14 },
  caster: { color: 0xc06aff, kind: 'orb', arc: 10 },
  healer: { color: 0x9af06a, kind: 'bolt', arc: 6 },
};
/** Ряды по глубине (доля высоты сцены) и масштаб «перспективы». */
const LANE_Y = [0.7, 0.81, 0.93];
const LANE_K = [0.92, 1, 1.08];

interface Tween {
  update(dt: number): boolean;
}

class UnitView {
  root = new Container();
  body = new Container();
  sprite: Sprite;
  flash: Sprite;
  shadow = new Graphics();
  ring = new Graphics();
  bars = new Graphics();
  statusG = new Graphics();
  castG = new Graphics();
  hp: number;
  maxHp: number;
  shield = 0;
  energy = 0;
  alive = true;
  statuses = new Set<string>();
  /** позиция на поле: x в момент t0 и скорость (ед./с) */
  fx: number;
  t0 = 0;
  v = 0;
  /** куда смотрит (1 — вправо) */
  face: 1 | -1;
  sx = 0;
  sy = 0;
  bobPhase = Math.random() * Math.PI * 2;
  scale: number;
  barW: number;
  pix = 1;
  spriteH = 32;
  life: LifeAnim;
  frame = 'idle:open';
  attackUntil = 0;
  hurtUntil = 0;
  big: number;
  special: boolean;
  castStart = 0;
  castEnd = 0;
  guardUntil = 0;
  private statusKey = '';
  private stunStars: Sprite[] = [];

  constructor(
    public snap: UnitSnap,
    scale: number,
    now: number,
    public skin?: string,
  ) {
    this.hp = snap.hp;
    this.maxHp = snap.maxHp;
    this.energy = snap.energy;
    this.shield = snap.shield;
    this.fx = snap.x;
    this.face = snap.side === 0 ? 1 : -1;
    const colossus = !!ENEMY_MAP[snap.ref]?.colossus;
    this.special = colossus;
    this.life = newLife(now, snap.side === 0 && !snap.mirror, colossus);
    this.big = colossus ? 2.3 : snap.kind === 'boss' ? 1.8 : snap.kind === 'mini' ? 1.35 : snap.kind === 'elite' ? 1.15 : snap.kind === 'summon' ? 0.85 : 1;
    this.scale = scale * this.big;
    const canvas = unitCanvas(snap.ref, { mirror: snap.mirror, skin });
    this.sprite = new Sprite(Texture.from(canvas));
    this.sprite.anchor.set(0.5, 1);
    this.flash = new Sprite(Texture.from(silhouette(canvas)));
    this.flash.anchor.set(0.5, 1);
    this.flash.alpha = 0;
    this.fitCanvas(canvas);
    this.preload();
    this.shadow.ellipse(0, 0, 11 * this.scale, 3 * this.scale).fill({ color: 0x000000, alpha: 0.35 });
    // элита, мини-боссы и владычицы — с кольцом под ногами
    if (snap.side === 1 && (snap.kind === 'elite' || snap.kind === 'mini' || snap.kind === 'boss')) {
      const col = snap.kind === 'boss' ? 0xff4a6a : snap.kind === 'mini' ? 0xff8a3a : 0xffc14d;
      this.ring.ellipse(0, 0, 14 * this.scale, 4 * this.scale).stroke({ color: col, width: 2, alpha: 0.8 });
    }
    this.body.addChild(this.sprite, this.flash);
    this.root.addChild(this.ring, this.shadow, this.body, this.statusG, this.bars, this.castG);
    this.barW = Math.max(26, 18 * scale * (this.big > 1.2 ? 1.5 : 1));
    this.drawBars();
  }

  get headY() {
    return -(this.spriteH - 2) * this.pix * this.scale;
  }

  fitCanvas(canvas: HTMLCanvasElement) {
    this.pix = canvas.height > 32 ? (32 / canvas.height) * 1.2 : 1;
    this.spriteH = canvas.height;
    this.applyFace();
  }

  applyFace() {
    // фигуры нарисованы лицом вправо: враги по умолчанию смотрят влево
    this.sprite.scale.set(this.scale * this.pix * this.face, this.scale * this.pix);
    this.flash.scale.copyFrom(this.sprite.scale);
  }

  setFace(dir: number) {
    const f = dir >= 0 ? 1 : -1;
    if (f === this.face) return;
    this.face = f;
    this.applyFace();
  }

  private canvasFor(f: LifeFrame) {
    return unitCanvas(this.snap.ref, { mirror: this.snap.mirror, skin: this.skin }, f);
  }

  preload() {
    const frames: LifeFrame[] = [
      { arms: 'idle2', eyes: 'open' },
      { arms: 'idle', eyes: 'half' },
      { arms: 'idle', eyes: 'closed' },
      { arms: 'attack', eyes: 'open' },
    ];
    for (const f of frames) this.canvasFor(f);
  }

  setFrame(f: LifeFrame) {
    const key = frameKey(f);
    if (key === this.frame) return;
    const canvas = this.canvasFor(f);
    this.frame = key;
    this.sprite.texture = Texture.from(canvas);
    this.flash.texture = Texture.from(silhouette(canvas));
    if (canvas.height !== this.spriteH) this.fitCanvas(canvas);
  }

  animate(time: number) {
    if (!this.alive) {
      this.setFrame({ arms: 'idle', eyes: 'closed' });
      return;
    }
    if (this.statuses.has('freeze')) return;
    const f = lifeFrame(this.life, time);
    if (time < this.attackUntil) f.arms = 'attack';
    if (time < this.hurtUntil) f.eyes = 'closed';
    else if (this.statuses.has('stun') && f.eyes === 'open') f.eyes = 'half';
    this.setFrame(f);
  }

  drawBars() {
    const g = this.bars;
    g.clear();
    if (!this.alive) return;
    const w = this.barW;
    const x = -w / 2;
    const y = this.headY - 7;
    g.roundRect(x - 1, y - 1, w + 2, 6, 2).fill({ color: 0x0a0818, alpha: 0.8 });
    const frac = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const col = this.snap.side === 0 ? (frac > 0.5 ? 0x4fe0a6 : frac > 0.25 ? 0xffc14d : 0xff5a6a) : 0xff5a7a;
    if (frac > 0) g.roundRect(x, y, Math.max(2, w * frac), 4, 2).fill(col);
    if (this.shield > 0) g.rect(x, y, w * Math.min(1, this.shield / this.maxHp), 1.5).fill({ color: 0xbfeaff, alpha: 0.95 });
    if (this.snap.side === 0 && this.snap.kind === 'hero') g.rect(x, y + 5, w * Math.min(1, this.energy / 100), 1.5).fill(this.energy >= 100 ? 0xfff0a0 : 0xffb340);
  }

  /** Замах «Сокрушительного удара»: полоса над головой и красный круг на земле. */
  drawCast(clock: number, time: number) {
    const g = this.castG;
    g.clear();
    if (!this.alive || this.castEnd <= clock) return;
    const k = Math.max(0, Math.min(1, (clock - this.castStart) / Math.max(1, this.castEnd - this.castStart)));
    const late = this.castEnd - clock < 1200;
    const blink = late && Math.floor(time / 110) % 2 === 0;
    const r = (16 + 10 * k) * this.scale;
    g.ellipse(0, 0, r, r * 0.3).fill({ color: 0xff2a3a, alpha: 0.12 + 0.18 * k }).stroke({ color: blink ? 0xffffff : 0xff4a5a, width: 2, alpha: 0.9 });
    const w = this.barW * 1.2;
    const y = this.headY - 18;
    g.roundRect(-w / 2 - 1, y - 1, w + 2, 6, 2).fill({ color: 0x0a0818, alpha: 0.85 });
    g.roundRect(-w / 2, y, w * k, 4, 2).fill(blink ? 0xffffff : late ? 0xffd04a : 0xff6a2a);
  }

  drawStatuses(time: number) {
    const stun = this.alive && (this.statuses.has('stun') || this.statuses.has('stagger'));
    this.updateStunStars(stun, time);
    const tint = this.statuses.has('freeze') ? 0x9fd8ff : this.statuses.has('blind') ? 0xbfae8a : 0xffffff;
    if (this.sprite.tint !== tint) this.sprite.tint = tint;
    const key = this.alive ? `${[...this.statuses].join(',')}|${this.headY}|${this.barW}` : '-';
    if (key === this.statusKey) return;
    this.statusKey = key;
    const g = this.statusG;
    g.clear();
    if (!this.alive) return;
    const y = this.headY - 13;
    let i = 0;
    for (const st of this.statuses) {
      let col = 0;
      if (st === 'stun' || st === 'stagger') col = 0xffe040;
      else if (st === 'freeze') col = 0x9fe0ff;
      else if (st === 'taunt') col = 0xff4a5a;
      else if (st === 'blind') col = 0xc8a060;
      else if (st.startsWith('dot:')) col = DOT_COLOR[st.slice(4)] ?? 0xffffff;
      else if (MARK_COLOR[st]) {
        g.roundRect(-this.barW / 2 + i * 6 - 1, y - 1, 7, 7, 2).fill(0x0a0818);
        col = MARK_COLOR[st];
      } else if (st.startsWith('buff:')) col = st === 'buff:vuln' ? 0xb06ae0 : 0x7ae07a;
      else continue;
      g.roundRect(-this.barW / 2 + i * 6, y, 5, 5, 1.5).fill(col);
      i++;
      if (i > 6) break;
    }
  }

  private updateStunStars(on: boolean, time: number) {
    if (!on && !this.stunStars.length) return;
    if (on && !this.stunStars.length)
      for (let k = 0; k < 3; k++) {
        const sp = this.root.addChild(new Sprite(Texture.WHITE));
        sp.tint = 0xffe040;
        sp.width = 3;
        sp.height = 3;
        this.stunStars.push(sp);
      }
    for (let k = 0; k < this.stunStars.length; k++) {
      const sp = this.stunStars[k];
      sp.visible = on;
      if (!on) continue;
      const a = time / 300 + (k * Math.PI * 2) / 3;
      sp.position.set(Math.cos(a) * 10 - 1, this.headY + 4 + Math.sin(a) * 3);
    }
  }
}

const silhouettes = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = silhouettes.get(src);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    silhouettes.set(src, c);
  }
  return c;
}

/**
 * Числа и подписи — растровым шрифтом: глифы рисуются один раз в атлас, дальше текст «собирается»
 * из готовых кусочков (обычный Text на каждое число давал просадки FPS). Цвет — тонировкой.
 */
const NUM_FONT = 'battle-num';
const SMALL_FONT = 'battle-sm';
let numFontReady = false;
function ensureNumFont() {
  if (numFontReady) return;
  const chars = [['a', 'z'], ['A', 'Z'], ['0', '9'], ['а', 'я'], ['А', 'Я'], 'ёЁ .,:;!?%+-−×·—–«»()/\'"…★♥⚠⚡'] as (string | string[])[];
  const resolution = Math.min(2, window.devicePixelRatio || 1);
  BitmapFont.install({
    name: NUM_FONT,
    style: { fontFamily: `${PIXEL_FONT}, Manrope, sans-serif`, fontSize: 40, fontWeight: '800', fill: '#ffffff', stroke: { color: '#120c24', width: 8 } },
    chars,
    padding: 6,
  });
  BitmapFont.install({
    name: SMALL_FONT,
    style: { fontFamily: `${PIXEL_FONT}, Manrope, sans-serif`, fontSize: 17, fontWeight: '700', fill: '#ffffff', stroke: { color: '#120c24', width: 4 } },
    chars,
    resolution,
    padding: 3,
  });
  numFontReady = true;
}

function battleText(text: string, color: number | string, size: number): BitmapText {
  ensureNumFont();
  const px = Math.round(size * 1.2);
  const tx = new BitmapText({ text, style: { fontFamily: px <= 21 ? SMALL_FONT : NUM_FONT, fontSize: px, align: 'center' } });
  tx.tint = typeof color === 'number' ? color : parseInt(color.replace('#', ''), 16);
  return tx;
}

const MAX_FLOATERS = 40;

function fmt(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let v = n;
  let i = -1;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, '') + units[i];
}

export class BattleRenderer {
  app = new Application();
  private stage = new Container();
  private bg = new Container();
  private world = new Container();
  private fx = new Container();
  private ui = new Container();
  private overlay = new Graphics();
  private sky: Sprite | null = null;
  private layers: TilingSprite[] = [];
  private particles: Particle[] = [];
  private weather = new Container();
  private weatherSprites: Sprite[] = [];
  private tweens: Tween[] = [];
  private units = new Map<number, UnitView>();
  /** герои, шагающие маршем между боями (по id героя) */
  private marchers = new Map<string, UnitView>();
  private marching = false;
  private playClock = 0;
  private playing = false;
  private liveKey = '';
  private chainText: BitmapText | null = null;
  private chainUntil = 0;
  private chainN = 0;
  private volleyUntil = 0;
  private dangerUntil = 0;
  private act = 0;
  private W = 360;
  private H = 260;
  private shake = 0;
  private time = 0;
  private ready = false;
  private destroyed = false;
  private pending = new Set<() => void>();
  lost = false;
  onContextLost: (() => void) | null = null;
  skinOf: (heroId: string) => string | undefined = (id) => useGame.getState().state?.heroines[id]?.skin;

  async init(host?: HTMLElement) {
    const w = host?.clientWidth || 360;
    const h = host?.clientHeight || 260;
    await loadPixelFont();
    await this.app.init({
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: false,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.display = 'block';
    this.app.canvas.style.imageRendering = 'pixelated';
    this.app.canvas.addEventListener('webglcontextlost', () => {
      this.lost = true;
      this.onContextLost?.();
    });
    this.app.stage.addChild(this.stage);
    this.stage.addChild(this.bg, this.world, this.fx, this.overlay, this.ui);
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__battle = this;
    this.world.sortableChildren = true;
    this.bg.addChild(this.weather);
    this.resize(w, h);
    this.app.ticker.add((tk) => {
      try {
        this.update(tk.deltaMS);
      } catch (e) {
        console.error('battle render', e);
      }
    });
    this.ready = true;
    if (host) this.attach(host);
  }

  get isReady() {
    return this.ready && !this.destroyed;
  }

  attach(host: HTMLElement) {
    if (!this.isReady) return;
    if (this.app.canvas.parentElement !== host) host.appendChild(this.app.canvas);
    if (host.clientWidth && host.clientHeight) this.resize(host.clientWidth, host.clientHeight);
    this.app.ticker.start();
  }

  detach() {
    this.releasePending();
    if (!this.isReady) return;
    this.app.ticker.stop();
    this.app.canvas.remove();
  }

  private releasePending() {
    for (const f of [...this.pending]) f();
    this.pending.clear();
  }

  resize(w: number, h: number) {
    if (!this.app.renderer) return;
    this.W = w;
    this.H = h;
    this.app.renderer.resize(w, h, this.lowRes ? 1 : undefined);
    if (this.act) this.buildBackground(this.act, true);
  }

  destroy() {
    this.releasePending();
    this.tweens = [];
    this.destroyed = true;
    if (this.ready) {
      this.app.ticker.stop();
      this.app.destroy(true, { children: true });
    }
  }

  private get unitScale() {
    return Math.max(1.5, Math.min(2.5, this.H / 150, this.W / 170));
  }

  /** Поле боя → экран. */
  private sxOf(x: number) {
    const pad = 26;
    return pad + (x / 100) * (this.W - 2 * pad);
  }
  private syOf(lane: number) {
    return LANE_Y[Math.max(0, Math.min(2, lane))] * this.H;
  }

  buildBackground(act: number, force = false) {
    if (this.act === act && !force) return;
    this.act = act;
    for (const l of this.layers) l.destroy();
    this.sky?.destroy();
    this.layers = [];
    const scale = Math.max(this.W / BG_W, this.H / BG_H);
    this.sky = new Sprite(Texture.from(drawSky(act)));
    this.sky.scale.set(scale);
    this.bg.addChildAt(this.sky, 0);
    (['far', 'mid', 'near'] as const).forEach((layer, i) => {
      const tex = Texture.from(drawLayer(act, layer));
      const ts = new TilingSprite({ texture: tex, width: this.W, height: this.H });
      ts.tileScale.set(scale);
      ts.tilePosition.y = this.H - BG_H * scale;
      this.bg.addChildAt(ts, 1 + i);
      this.layers.push(ts);
    });
    const wp = weatherParams(ACTS[act - 1]?.bg.weather ?? 'leaves');
    this.particles = [];
    for (let i = 0; i < wp.count; i++) this.particles.push(this.spawnParticle(true));
    for (const sp of this.weatherSprites) sp.destroy();
    this.weatherSprites = this.particles.map((p) => {
      const sp = this.weather.addChild(new Sprite(Texture.WHITE));
      this.styleParticle(sp, p);
      return sp;
    });
  }

  private styleParticle(sp: Sprite, p: Particle) {
    sp.tint = p.color;
    sp.width = p.size;
    sp.height = p.size;
    sp.alpha = 0.8;
  }

  private spawnParticle(anywhere = false): Particle {
    const wp = weatherParams(ACTS[this.act - 1]?.bg.weather ?? 'leaves');
    const r = (a: [number, number]) => a[0] + Math.random() * (a[1] - a[0]);
    const vx = r(wp.vx);
    const vy = r(wp.vy);
    let x = Math.random() * this.W;
    let y = Math.random() * this.H;
    if (!anywhere) {
      if (vy > 5) y = -4;
      else if (vy < -5) y = this.H + 4;
      else x = vx < 0 ? this.W + 4 : -4;
    }
    return { x, y, vx, vy, size: Math.round(r(wp.size)), color: wp.color[Math.floor(Math.random() * wp.color.length)], life: 1 };
  }

  /** Координаты бойца на поле в момент clock. */
  private fieldX(u: UnitView, clock: number) {
    if (!u.v) return u.fx;
    return u.fx + (u.v * Math.max(0, clock - u.t0)) / 1000;
  }

  private place(u: UnitView, clock: number) {
    const k = LANE_K[Math.max(0, Math.min(2, u.snap.lane))];
    u.sx = this.sxOf(this.fieldX(u, clock));
    u.sy = this.syOf(u.snap.lane);
    u.root.position.set(Math.round(u.sx), Math.round(u.sy));
    u.root.scale.set(k);
    u.root.zIndex = Math.round(u.sy * 10 + u.snap.uid);
  }

  clearUnits(keepMarch = false) {
    this.tweens = [];
    this.pxPool = [];
    for (const c of [...this.fx.children]) c.destroy({ children: true });
    for (const u of this.units.values()) if (!keepMarch || ![...this.marchers.values()].includes(u)) u.root.destroy({ children: true });
    this.units.clear();
    for (const c of [...this.ui.children]) c.destroy();
    this.chainText = null;
    this.overlay.clear();
    if (!keepMarch) {
      for (const u of this.marchers.values()) if (!u.root.destroyed) u.root.destroy({ children: true });
      this.marchers.clear();
    }
  }

  private addUnit(snap: UnitSnap, appear = false) {
    // герой из марша — тот же спрайт продолжает бой без мигания
    const reuse = snap.side === 0 && snap.kind === 'hero' ? this.marchers.get(snap.ref) : undefined;
    let u: UnitView;
    if (reuse && !reuse.root.destroyed) {
      u = reuse;
      this.marchers.delete(snap.ref);
      u.snap = snap;
      u.hp = snap.hp;
      u.maxHp = snap.maxHp;
      u.energy = snap.energy;
      u.shield = snap.shield;
      u.alive = true;
      u.fx = snap.x;
      u.v = 0;
      u.t0 = 0;
      u.statuses.clear();
      u.body.alpha = 1;
      u.body.rotation = 0;
      u.body.position.set(0, 0);
      u.setFace(1);
      u.drawBars();
    } else {
      u = new UnitView(snap, this.unitScale, this.time, snap.side === 0 || snap.mirror ? this.skinOf(snap.ref) : undefined);
      this.world.addChild(u.root);
    }
    this.units.set(snap.uid, u);
    this.place(u, 0);
    if (appear) {
      u.root.alpha = 0;
      this.tween(220, (k) => (u.root.alpha = k));
      this.burst(u.sx, u.sy - 20, snap.side === 0 ? 0x9fe0ff : 0xc06aff, 10);
    }
    return u;
  }

  /**
   * Марш: Легион идёт по дороге, фон бежит быстрее. Используется между волнами и пока нет боя.
   * Возвращает промис на время марша.
   */
  march(heroes: string[], act: number, ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady || this.lost) return resolve();
      this.buildBackground(act);
      // бойцов прошлого боя убираем, героев ставим в походный строй
      for (const [uid, u] of this.units) {
        if (u.snap.side === 0 && u.snap.kind === 'hero' && u.alive) this.marchers.set(u.snap.ref, u);
        else if (!u.root.destroyed) {
          const view = u;
          this.tween(250, (k) => (view.root.alpha = 1 - k), () => view.root.destroy({ children: true }));
        }
        this.units.delete(uid);
      }
      for (const c of [...this.ui.children]) c.destroy();
      this.chainText = null;
      for (const [ref, u] of this.marchers) if (!heroes.includes(ref)) {
        u.root.destroy({ children: true });
        this.marchers.delete(ref);
      }
      heroes.forEach((ref, i) => {
        let u = this.marchers.get(ref);
        const def = HEROINE_MAP[ref];
        if (!def) return;
        const x = CLASSES[def.cls].x;
        const snap: UnitSnap = { uid: -1 - i, side: 0, ref, kind: 'hero', cls: def.cls, x, lane: [1, 0, 2, 1, 2, 0][i % 6], maxHp: 1, hp: 1, shield: 0, energy: 0, range: 0 };
        if (!u || u.root.destroyed) {
          u = new UnitView(snap, this.unitScale, this.time, this.skinOf(ref));
          this.world.addChild(u.root);
          u.root.alpha = 0;
          const view = u;
          this.tween(300, (k) => (view.root.alpha = k));
          // новый в строю — входит слева
          u.fx = -15;
        }
        u.alive = true;
        u.statuses.clear();
        u.body.alpha = 1;
        u.body.rotation = 0;
        u.body.position.set(0, 0);
        u.setFace(1);
        u.snap = { ...u.snap, lane: snap.lane };
        u.bars.clear();
        u.castG.clear();
        // плавно встаём на свои места в строю
        const from = u.fx;
        const view = u;
        this.tween(Math.min(ms, 900), (k) => (view.fx = from + (x - from) * k));
        u.v = 0;
        this.marchers.set(ref, u);
      });
      this.marching = true;
      const done = () => {
        this.marching = false;
        this.pending.delete(done);
        resolve();
      };
      this.pending.add(done);
      const id = setTimeout(done, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(id);
        done();
      });
    });
  }

  /** Проиграть бой по событиям симулятора. */
  play(p: Playback, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady || this.lost) {
        resolve();
        return;
      }
      this.buildBackground(p.act);
      this.clearUnits(true);
      this.marching = false;
      const evs = () => p.live?.events ?? p.events;
      let i = 0;
      let clock = 0;
      this.playClock = 0;
      this.playing = true;
      this.liveKey = '';
      this.chainN = 0;
      this.chainUntil = 0;
      this.volleyUntil = 0;
      this.dangerUntil = 0;
      let holdUntil = -1;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.playing = false;
        this.pending.delete(finish);
        if (!this.destroyed) this.app.ticker.remove(tick);
        signal.removeEventListener('abort', finish);
        // живые герои переходят в марш, остальное уберёт следующий бой
        for (const u of this.units.values()) if (u.snap.side === 0 && u.snap.kind === 'hero' && u.alive) this.marchers.set(u.snap.ref, u);
        resolve();
      };
      this.pending.add(finish);
      signal.addEventListener('abort', finish);
      const tick = (tk: { deltaMS: number }) => {
        clock += tk.deltaMS * p.speed;
        this.playClock = clock;
        const events = evs();
        const endT = events.length ? events[events.length - 1].t : 0;
        while (i < events.length && events[i].t <= clock) {
          try {
            this.apply(events[i], p);
            if (p.live) this.liveEvent(events[i]);
          } catch (e) {
            console.error('battle event', events[i], e);
          }
          i++;
        }
        if (p.live) {
          p.live.clock = clock;
          this.publishLive(clock);
        }
        if (i >= events.length && holdUntil < 0) holdUntil = clock + 700 * p.speed;
        if (holdUntil > 0 && clock >= holdUntil && clock >= endT) finish();
      };
      this.app.ticker.add(tick);
      if (signal.aborted) finish();
    });
  }

  private apply(e: CombatEvent, p: Playback) {
    switch (e.k) {
      case 'start':
        for (const u of e.units) this.addUnit(u);
        break;
      case 'spawn':
        this.addUnit(e.unit, true);
        break;
      case 'mv': {
        const u = this.units.get(e.u);
        if (!u) break;
        u.fx = e.x;
        u.t0 = e.t;
        u.v = e.v;
        if (e.v) u.setFace(e.v);
        break;
      }
      case 'leap': {
        const u = this.units.get(e.u);
        if (!u) break;
        const fromX = u.sx;
        u.fx = e.x;
        u.t0 = e.t;
        u.v = 0;
        this.place(u, e.t);
        this.burst(fromX, u.sy - 20 * u.scale, u.snap.cls ? CLASS_HEX[u.snap.cls] : 0xc06aff, 8);
        this.burst(u.sx, u.sy - 20 * u.scale, u.snap.cls ? CLASS_HEX[u.snap.cls] : 0xc06aff, 8);
        u.root.alpha = 0;
        const view = u;
        this.tween(160, (k) => (view.root.alpha = k));
        break;
      }
      case 'atk':
        this.attack(e);
        break;
      case 'dmg': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.hp = e.hp;
        u.shield = e.sh;
        u.drawBars();
        const color = e.dot ? DOT_COLOR[e.dot] ?? 0xffffff : e.crit ? 0xffe14d : u.snap.side === 0 ? 0xff8a9a : 0xffffff;
        this.floater(u, fmt(e.v) + (e.crit ? '!' : ''), color, e.crit ? 19 : e.dot ? 10 : 13);
        if (!e.dot) {
          u.hurtUntil = this.time + 200;
          this.flashUnit(u, 0.85);
          this.knock(u);
          if (e.crit) this.shake = Math.max(this.shake, 2.5);
        }
        break;
      }
      case 'heal': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.hp = e.hp;
        u.drawBars();
        if (e.v > 0) this.floater(u, '+' + fmt(e.v), 0x7af0b0, 12);
        this.sparkle(u, 0x9af0b0, 4);
        break;
      }
      case 'shield': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.shield = e.sh;
        u.drawBars();
        if (e.v > 0) this.sparkle(u, 0x9fe0ff, 4);
        break;
      }
      case 'st': {
        const u = this.units.get(e.tg);
        if (!u) break;
        if (e.on) u.statuses.add(e.st);
        else u.statuses.delete(e.st);
        if (e.on && e.st === 'freeze') this.burst(u.sx, u.sy - 20 * u.scale, 0x9fe0ff, 10);
        break;
      }
      case 'en': {
        const u = this.units.get(e.tg);
        if (!u) break;
        const was = u.energy;
        u.energy = e.e;
        u.drawBars();
        if (was < 100 && e.e >= 100) this.sparkle(u, 0xffe08a, 6);
        break;
      }
      case 'death': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.alive = false;
        u.statuses.clear();
        u.castEnd = 0;
        u.drawBars();
        u.drawStatuses(this.time);
        u.drawCast(this.playClock, this.time);
        this.burst(u.sx, u.sy - 20 * u.scale, u.snap.side === 0 ? 0xff5a6a : 0xffe08a, 12);
        const view = u;
        this.tween(420, (k) => {
          view.body.alpha = 1 - k * 0.85;
          view.body.rotation = view.face * -k * 0.5;
          view.body.y = k * 6;
        });
        if (u.snap.side === 1 && u.snap.kind !== 'summon') {
          sfx('coin');
          this.coins(u);
        }
        break;
      }
      case 'gone': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.alive = false;
        u.drawBars();
        const view = u;
        this.burst(u.sx, u.sy - 16 * u.scale, 0xbfeaff, 8);
        this.tween(300, (k) => (view.root.alpha = 1 - k));
        break;
      }
      case 'revive': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.alive = true;
        u.hp = e.hp;
        u.body.alpha = 1;
        u.body.rotation = 0;
        u.body.y = 0;
        u.drawBars();
        this.burst(u.sx, u.sy - 30, 0xffe8a0, 14);
        this.floater(u, '+' + fmt(e.hp), 0xffe8a0, 13);
        break;
      }
      case 'chain': {
        this.chainN = e.n;
        this.chainUntil = e.until;
        if (e.n >= 2) {
          this.showChain(e.n);
          sfx('skill');
        }
        break;
      }
      case 'volley': {
        this.volleyUntil = e.until;
        this.bigText(t('battle.volley'), 0xffd24a, 26);
        this.screenFlash(0xffd24a, 0.35);
        this.shake = Math.max(this.shake, 5);
        sfx('ult');
        break;
      }
      case 'combo': {
        const def = COMBO_MAP[e.c];
        if (!def) break;
        const col = CLASS_HEX[def.from] ?? 0xffe8a0;
        this.banner(`${tl(def.name)}!`, col);
        for (const u of this.units.values()) if (u.snap.side === 1 && u.alive) this.burst(u.sx, u.sy - 24 * u.scale, col, 6);
        this.screenFlash(col, 0.2);
        this.shake = Math.max(this.shake, 4);
        sfx('ult');
        break;
      }
      case 'cast': {
        const u = this.units.get(e.u);
        if (!u) break;
        if (e.end > 0) {
          u.castStart = e.t;
          u.castEnd = e.end;
          this.dangerUntil = e.end;
          const sk = ENEMY_SKILLS[e.s];
          this.label(u, `⚠ ${sk ? tl(sk.name) : t('battle.heavy')}`, 0xff6a6a, 13);
          sfx('mech');
        } else {
          u.castEnd = 0;
          this.dangerUntil = 0;
          this.floater(u, t('battle.interrupt'), 0xffe08a, 15);
          this.burst(u.sx, u.sy - 30 * u.scale, 0xffe08a, 14);
        }
        break;
      }
      case 'heavy': {
        const u = this.units.get(e.u);
        if (u) u.castEnd = 0;
        this.dangerUntil = 0;
        const knight = [...this.units.values()].find((x) => x.snap.side === 0 && x.snap.cls === 'knight' && x.alive);
        if (e.parry === 2) {
          this.bigText(t('battle.parry'), 0xffe14d, 24);
          this.screenFlash(0xffffff, 0.45);
          if (knight) this.shieldBurst(knight, 0xffe14d);
          if (u) this.burst(u.sx, u.sy - 30 * u.scale, 0xffe14d, 18);
          this.shake = Math.max(this.shake, 6);
          sfx('ult');
        } else {
          if (e.parry === 1 && knight) {
            this.shieldBurst(knight, 0x9fe0ff);
            this.banner(t('battle.block'), 0x9fe0ff);
          }
          this.screenFlash(0xff2a3a, e.parry === 1 ? 0.25 : 0.4);
          this.shake = Math.max(this.shake, e.parry === 1 ? 6 : 10);
          sfx('mech');
        }
        break;
      }
      case 'guard': {
        const knight = [...this.units.values()].find((x) => x.snap.side === 0 && x.snap.cls === 'knight' && x.alive);
        if (knight) {
          knight.guardUntil = e.until;
          knight.attackUntil = this.time + 300;
          this.shieldBurst(knight, 0x9fe0ff);
        }
        break;
      }
      case 'mech': {
        const u = this.units.get(e.u);
        const key = `mech.${e.m}`;
        const text = t(key);
        if (text !== key) this.banner(text, 0xe060ff);
        if (u) this.burst(u.sx, u.sy - 30 * u.scale, 0xe040ff, 10);
        if (e.m === 'sandstorm' || e.m === 'phase') this.shake = Math.max(this.shake, 4);
        sfx('mech');
        break;
      }
      case 'end':
        if (p.kind === 'boss' || p.kind === 'mode') this.bigText(e.win ? t('common.victory') : t('common.defeat'), e.win ? 0xffe08a : 0xff8070, 30);
        break;
    }
  }

  /** Атака: поза, рывок или снаряд — по виду атаки класса и роли врага. */
  private attack(e: Extract<CombatEvent, { k: 'atk' }>) {
    const u = this.units.get(e.u);
    const tg = this.units.get(e.tg);
    if (!u) return;
    u.attackUntil = this.time + (e.kind === 'ult' ? 520 : 280);
    if (tg && tg !== u) u.setFace(tg.sx - u.sx);
    const cls = u.snap.cls;
    const skill = e.s ? (cls ? (CLASSES[cls].skill.id === e.s ? CLASSES[cls].skill : CLASSES[cls].ult.id === e.s ? CLASSES[cls].ult : undefined) : undefined) ?? ENEMY_SKILLS[e.s] : undefined;
    const vfx = skill?.vfx ?? 'slash';
    if (e.kind === 'ult' && u.snap.side === 0) {
      this.cutIn(u, skill ? tl(skill.name) : '');
      this.flashUnit(u, 0.9);
      this.shake = Math.max(this.shake, 3);
      sfx('ult');
    } else if (e.kind === 'skill' && skill) {
      this.label(u, tl(skill.name), u.snap.side === 0 ? 0xffe8c0 : 0xffb0b0, 11);
      sfx('skill');
    }
    const hitMs = Math.max(80, e.hit);
    if (!tg) {
      this.castPose(u);
      return;
    }
    const ally = tg.snap.side === u.snap.side;
    if (ally) {
      // лечение и благословения: столб света над союзником
      this.castPose(u);
      setTimeout(() => this.beam(tg, VFX_COLOR[vfx] ?? 0x9af0b0), hitMs * 0.6);
      return;
    }
    const ranged = u.snap.range > 15;
    if (e.kind !== 'basic') {
      if (ranged) {
        this.castPose(u);
        this.projectile(u, tg, VFX_COLOR[vfx] ?? 0xffffff, vfx === 'arrow' ? 'arrow' : 'orb', 12, hitMs);
      } else this.lunge(u, tg, hitMs);
      if (e.kind === 'ult' && skill && (skill.target === 'all' || skill.target === 'random')) {
        // массовая ульта: вспышки по всем врагам к моменту удара
        setTimeout(() => {
          for (const x of this.units.values()) if (x.snap.side !== u.snap.side && x.alive) this.burst(x.sx, x.sy - 22 * x.scale, VFX_COLOR[vfx] ?? 0xffffff, 6);
        }, hitMs);
      }
      return;
    }
    if (u.snap.ref === 'wolf' || u.snap.ref === 'spiritWolf') return this.pounce(u, tg, hitMs);
    if (!ranged) {
      this.lunge(u, tg, hitMs);
      sfx('hit');
      return;
    }
    const shotKey = cls ? CLASSES[cls].attack : u.snap.role ?? 'ranged';
    const shot = SHOT[shotKey] ?? SHOT.ranged;
    this.castPose(u);
    this.projectile(u, tg, shot.color, shot.kind, shot.arc, hitMs);
    sfx(shot.kind === 'arrow' ? 'arrow' : 'magic');
  }

  // ——— живое управление ———

  private liveEvent(e: CombatEvent) {
    const ui = useLive.getState();
    if (e.k === 'atk' && e.kind === 'ult') {
      if (ui.heroes.some((h) => h.uid === e.u && h.pending)) useLive.setState({ heroes: ui.heroes.map((h) => (h.uid === e.u ? { ...h, pending: false } : h)) });
    } else if (e.k === 'cast') {
      useLive.setState({ cast: e.end > 0 ? { uid: e.u, start: e.t, end: e.end, s: e.s } : null });
    } else if (e.k === 'heavy') {
      useLive.setState({ cast: null });
    } else if (e.k === 'guard') {
      useLive.setState({ guard: { ...ui.guard, ready: e.ready, until: e.until } });
    } else if (e.k === 'chain') {
      useLive.setState({ chain: { n: e.n, until: e.until } });
    } else if (e.k === 'death') {
      const u = this.units.get(e.tg);
      if (u?.snap.cls === 'knight' && u.snap.kind === 'hero') useLive.setState({ guard: { ...ui.guard, has: false } });
    } else if (e.k === 'revive') {
      const u = this.units.get(e.tg);
      if (u?.snap.cls === 'knight' && u.snap.kind === 'hero') useLive.setState({ guard: { ...ui.guard, has: true } });
    }
  }

  private publishLive(clock: number) {
    const ui = useLive.getState();
    const heroes = ui.heroes.map((h) => {
      const u = this.units.get(h.uid);
      return u ? { ...h, energy: Math.min(100, Math.round(u.energy)), alive: u.alive } : h;
    });
    const key =
      heroes.map((h) => `${h.energy >= 100 ? 'F' : Math.floor(h.energy / 5)}${h.alive ? 1 : 0}${h.pending ? 1 : 0}`).join(',') +
      `|${ui.cast ? Math.floor((ui.cast.end - clock) / 200) : '-'}|${Math.floor(Math.max(0, ui.guard.ready - clock) / 250)}|${ui.chain.until > clock ? ui.chain.n : 0}`;
    if (key === this.liveKey) return;
    this.liveKey = key;
    useLive.setState({ heroes, clock, cast: ui.cast && ui.cast.end < clock ? null : ui.cast });
  }

  // ——— анимации ———

  private tween(dur: number, fn: (k: number) => void, done?: () => void) {
    let t = 0;
    this.tweens.push({
      update: (dt) => {
        t += dt;
        const k = Math.min(1, t / dur);
        fn(k);
        if (k >= 1) {
          done?.();
          return false;
        }
        return true;
      },
    });
  }

  private lunge(u: UnitView, tg: UnitView, hitMs: number) {
    const dx = (tg.sx - u.sx) * 0.3;
    const view = u;
    this.tween(Math.max(180, hitMs + 80), (k) => {
      const a = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
      view.body.x = dx * a;
    });
    setTimeout(() => this.slash(tg, u.snap.cls === 'assassin'), hitMs * 0.8);
  }

  private pounce(u: UnitView, tg: UnitView, hitMs: number) {
    const dx = (tg.sx - u.sx) * 0.5;
    const view = u;
    this.tween(Math.max(220, hitMs + 100), (k) => {
      const a = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
      view.body.x = dx * a;
      view.body.y = -Math.sin(Math.min(1, k / 0.45) * Math.PI) * 10;
    });
    setTimeout(() => this.slash(tg), hitMs);
  }

  private beam(tg: UnitView, color: number) {
    if (tg.root.destroyed) return;
    const s = tg.scale;
    const b = this.px(color, 6 * s, 70 * s);
    b.position.set(tg.sx, tg.sy - 36 * s);
    b.alpha = 0.7;
    this.tween(
      320,
      (k) => {
        b.alpha = 0.7 * (1 - k);
        b.width = 6 * s * (1 - k * 0.6);
      },
      () => this.freePx(b),
    );
    this.sparkle(tg, color, 5);
  }

  private castPose(u: UnitView) {
    const view = u;
    this.tween(200, (k) => (view.body.y = -Math.sin(k * Math.PI) * 4));
  }

  private knock(u: UnitView) {
    const dir = -u.face;
    const view = u;
    this.tween(150, (k) => (view.body.x = dir * Math.sin(k * Math.PI) * 3));
  }

  private flashUnit(u: UnitView, alpha: number) {
    const a = u.special || u.big > 1.3 ? alpha * 0.45 : alpha;
    const view = u;
    this.tween(140, (k) => (view.flash.alpha = a * (1 - k)));
  }

  private pxPool: Sprite[] = [];
  private px(color: number, w: number, h = w): Sprite {
    let sp = this.pxPool.pop();
    while (sp && sp.destroyed) sp = this.pxPool.pop();
    if (!sp) sp = new Sprite(Texture.WHITE);
    sp.anchor.set(0.5);
    sp.tint = color;
    sp.width = w;
    sp.height = h;
    sp.alpha = 1;
    sp.rotation = 0;
    sp.visible = true;
    if (sp.parent !== this.fx) this.fx.addChild(sp);
    return sp;
  }
  private freePx(sp: Sprite) {
    if (sp.destroyed) return;
    sp.visible = false;
    if (this.pxPool.length < 400) this.pxPool.push(sp);
    else sp.destroy();
  }

  private slash(tg: UnitView, cross = false) {
    if (tg.root.destroyed) return;
    const s = tg.scale;
    const parts: Sprite[] = [];
    const lines = cross ? [1, -1] : [1];
    for (const d of lines)
      for (let i = 0; i < 6; i++) {
        const p = this.px(0xffffff, 2 * s);
        p.position.set(tg.sx - 8 * s * d + i * 3 * s * d, tg.sy - 26 * s + i * 3 * s);
        parts.push(p);
      }
    this.tween(
      150,
      (k) => {
        for (const p of parts) p.alpha = 1 - k;
      },
      () => parts.forEach((p) => this.freePx(p)),
    );
  }

  private projectile(from: UnitView, to: UnitView, color: number, kind: 'arrow' | 'bolt' | 'orb', arc: number, dur: number) {
    const sz = Math.max(3, from.scale * 1.6);
    const g = kind === 'arrow' ? this.px(color, sz * 4, 2) : this.px(color, kind === 'orb' ? sz * 1.4 : sz);
    const sx = from.sx + from.face * 10;
    const sy = from.sy - 20 * from.scale;
    const ex = to.sx;
    const ey = to.sy - 18 * to.scale;
    g.position.set(sx, sy);
    let trailAt = 0;
    this.tween(
      Math.max(80, dur),
      (k) => {
        const nx = sx + (ex - sx) * k;
        const ny = sy + (ey - sy) * k - Math.sin(k * Math.PI) * arc;
        if (kind === 'arrow') g.rotation = Math.atan2(ny - g.y, nx - g.x);
        g.x = nx;
        g.y = ny;
        if (kind !== 'arrow' && k - trailAt > 0.12) {
          trailAt = k;
          const p = this.px(color, 2);
          p.position.set(g.x, g.y);
          this.tween(200, (kk) => (p.alpha = 1 - kk), () => this.freePx(p));
        }
      },
      () => {
        this.freePx(g);
        this.burst(ex, ey, color, kind === 'orb' ? 9 : 5);
      },
    );
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const s = 2 + Math.floor(Math.random() * 3);
      const g = this.px(color, s);
      g.position.set(x, y);
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 38;
      const vx = Math.cos(a) * v;
      const vy = Math.sin(a) * v - 12;
      this.tween(
        300 + Math.random() * 200,
        (k) => {
          g.x = x + vx * k;
          g.y = y + vy * k + 30 * k * k;
          g.alpha = 1 - k;
        },
        () => this.freePx(g),
      );
    }
  }

  /** Искры, поднимающиеся вокруг бойца (лечение, щит, готовая ульта). */
  private sparkle(u: UnitView, color: number, n: number) {
    if (u.root.destroyed) return;
    for (let i = 0; i < n; i++) {
      const g = this.px(color, 2 + Math.random() * 2);
      const x = u.sx + (Math.random() - 0.5) * 22 * u.scale * 0.6;
      const y = u.sy - Math.random() * 30 * u.scale;
      g.position.set(x, y);
      this.tween(
        500 + Math.random() * 300,
        (k) => {
          g.y = y - 24 * k;
          g.alpha = 1 - k;
        },
        () => this.freePx(g),
      );
    }
  }

  /** Монетки из павшего врага летят вверх — к добыче. */
  private coins(u: UnitView) {
    for (let i = 0; i < 3; i++) {
      const g = this.px(i === 1 ? 0x6ab8ff : 0xffc14d, 4, 4);
      const x = u.sx;
      const y = u.sy - 16 * u.scale;
      const vx = (Math.random() - 0.5) * 40;
      g.position.set(x, y);
      this.tween(
        600,
        (k) => {
          g.x = x + vx * k;
          g.y = y - 40 * k + 50 * k * k;
          g.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        },
        () => this.freePx(g),
      );
    }
  }

  private shieldBurst(u: UnitView, color: number) {
    if (u.root.destroyed) return;
    const g = new Graphics();
    const r = 18 * u.scale;
    g.circle(0, 0, r).stroke({ color, width: 3, alpha: 0.9 });
    g.position.set(u.sx + u.face * 6, u.sy - 18 * u.scale);
    this.fx.addChild(g);
    this.tween(
      420,
      (k) => {
        g.scale.set(0.6 + k * 0.7);
        g.alpha = 1 - k;
      },
      () => g.destroy(),
    );
    this.burst(u.sx + u.face * 10, u.sy - 18 * u.scale, color, 8);
  }

  /** Врезка ульты: портрет героя въезжает полосой с названием приёма. */
  private cutIn(u: UnitView, name: string) {
    const cls = u.snap.cls;
    const col = cls ? CLASS_HEX[cls] : 0xffe08a;
    const c = new Container();
    const h = Math.max(46, this.H * 0.17);
    const y = this.H * 0.12;
    const strip = new Graphics();
    strip.rect(0, 0, this.W, h).fill({ color: 0x0a0818, alpha: 0.72 });
    strip.rect(0, 0, this.W, 2).fill({ color: col, alpha: 0.9 });
    strip.rect(0, h - 2, this.W, 2).fill({ color: col, alpha: 0.9 });
    c.addChild(strip);
    const portrait = new Sprite(Texture.from(portraitCanvas(u.snap.ref, this.skinOf(u.snap.ref))));
    portrait.anchor.set(0, 0.5);
    portrait.height = h * 1.25;
    portrait.width = h * 1.25;
    portrait.position.set(10, h / 2);
    c.addChild(portrait);
    const tx = battleText(name, col, 17);
    tx.anchor.set(0, 0.5);
    tx.position.set(h * 1.25 + 22, h / 2);
    c.addChild(tx);
    c.position.set(-this.W, y);
    this.ui.addChild(c);
    this.tween(
      900,
      (k) => {
        const x = k < 0.18 ? -this.W * (1 - k / 0.18) : k > 0.82 ? this.W * ((k - 0.82) / 0.18) : 0;
        c.x = x;
        c.alpha = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1;
      },
      () => c.destroy({ children: true }),
    );
  }

  private showChain(n: number) {
    this.chainText?.destroy();
    const tx = battleText(`${t('battle.chain')} ×${n}`, n >= 3 ? 0xffd24a : 0xffe8c0, n >= 3 ? 20 : 16);
    tx.anchor.set(0, 0.5);
    tx.position.set(10, this.H * 0.42);
    this.ui.addChild(tx);
    this.chainText = tx;
    tx.scale.set(1.4);
    this.tween(220, (k) => tx.scale.set(1.4 - 0.4 * k));
  }

  private floater(u: UnitView, text: string, color: number, size: number) {
    if (this.ui.children.length > MAX_FLOATERS) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 1);
    const x0 = Math.max(tx.width / 2 + 2, Math.min(this.W - tx.width / 2 - 2, u.sx + (Math.random() - 0.5) * 18));
    const y0 = Math.max(30, u.sy + u.headY * LANE_K[u.snap.lane] - 8);
    tx.position.set(x0, y0);
    this.ui.addChild(tx);
    tx.scale.set(0.6);
    this.tween(
      780,
      (k) => {
        tx.y = y0 - 24 * k;
        tx.scale.set(k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5));
        tx.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      },
      () => tx.destroy(),
    );
  }

  private labelSlots: { x: number; y: number; w: number; text: string; until: number }[] = [];

  private label(u: UnitView, text: string, color: number, size: number) {
    if (!text) return;
    const now = this.time;
    this.labelSlots = this.labelSlots.filter((l) => l.until > now);
    if (this.labelSlots.some((l) => l.text === text && l.until - now > 650 && Math.abs(l.x - u.sx) < 70)) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 1);
    const w = tx.width;
    const x = Math.max(w / 2 + 4, Math.min(this.W - w / 2 - 4, u.sx));
    let y = u.sy + u.headY - 24;
    for (let i = 0; i < 4 && this.labelSlots.some((l) => Math.abs(l.x - x) < (l.w + w) / 2 + 2 && Math.abs(l.y - y) < 15); i++) y -= 15;
    y = Math.max(18, y);
    this.labelSlots.push({ x, y, w, text, until: now + 900 });
    tx.position.set(Math.round(x), Math.round(y));
    this.ui.addChild(tx);
    this.tween(900, (k) => (tx.alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1), () => tx.destroy());
  }

  private banner(text: string, color = 0xe060ff) {
    const tx = battleText(text, color, 17);
    tx.anchor.set(0.5, 0.5);
    tx.position.set(this.W / 2, this.H * 0.33);
    this.ui.addChild(tx);
    this.tween(
      1300,
      (k) => {
        tx.alpha = k < 0.15 ? k / 0.15 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        tx.scale.set(1 + Math.sin(k * Math.PI) * 0.08);
      },
      () => tx.destroy(),
    );
  }

  private bigText(text: string, color: number, size = 30) {
    if (!text) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 0.5);
    tx.position.set(this.W / 2, this.H * 0.42);
    this.ui.addChild(tx);
    this.tween(
      1000,
      (k) => {
        tx.scale.set(k < 0.2 ? 0.4 + (k / 0.2) * 0.8 : 1.2 - (k - 0.2) * 0.2);
        tx.alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      },
      () => tx.destroy(),
    );
  }

  private flashAlpha = 0;
  private flashColor = 0xffffff;
  private screenFlash(color: number, alpha: number) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  /** Эффект добычи поверх сцены (сбор сундука). */
  lootBurst(count: number) {
    if (!this.ready) return;
    for (let i = 0; i < Math.min(30, count); i++) {
      setTimeout(() => this.burst(this.W * (0.3 + Math.random() * 0.4), this.H * 0.4, i % 3 === 0 ? 0x6ab8ff : 0xffc14d, 4), i * 30);
    }
  }

  private slowFrames = 0;
  private lowRes = false;
  private watchFps(dt: number) {
    if (this.lowRes || this.app.renderer.resolution <= 1) return;
    if (dt > 28 && dt < 250) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 120) {
      this.lowRes = true;
      this.app.renderer.resize(this.W, this.H, 1);
    }
  }

  private update(dt: number) {
    this.time += dt;
    this.watchFps(dt);
    // параллакс: на марше фон бежит быстро
    const speeds = this.marching ? [10, 26, 48] : [1.5, 3, 5];
    this.layers.forEach((l, i) => (l.tilePosition.x -= (speeds[i] * dt) / 1000));
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      p.x += ((p.vx - (this.marching ? 30 : 0)) * dt) / 1000;
      p.y += (p.vy * dt) / 1000 + Math.sin((this.time + i * 300) / 700) * 0.1;
      const sp = this.weatherSprites[i];
      if (p.x < -8 || p.x > this.W + 8 || p.y < -8 || p.y > this.H + 8) {
        p = this.particles[i] = this.spawnParticle();
        if (sp) this.styleParticle(sp, p);
      }
      sp?.position.set(Math.round(p.x), Math.round(p.y));
    }
    const clock = this.playClock;
    const views = this.playing ? [...this.units.values()] : [...this.marchers.values()];
    for (const u of views) {
      if (u.root.destroyed) continue;
      this.place(u, this.playing ? clock : 0);
      const walking = this.marching || (this.playing && u.v !== 0 && u.alive);
      if (u.alive) {
        if (walking) {
          // шаг: подпрыгивание и лёгкий наклон
          const ph = this.time / 95 + u.bobPhase;
          u.sprite.y = -Math.abs(Math.sin(ph)) * 3;
          u.body.rotation = Math.sin(ph) * 0.04;
        } else if (u.special) u.sprite.y = -6 + Math.sin(this.time / 520 + u.bobPhase) * 2.4;
        else {
          u.sprite.y = Math.sin(this.time / 380 + u.bobPhase) * 1.2;
          if (!this.marching) u.body.rotation = 0;
        }
      }
      u.flash.y = u.sprite.y;
      if (u.snap.side === 0 || u.snap.mirror) {
        const sk = this.skinOf(u.snap.ref);
        if (sk !== u.skin) {
          u.skin = sk;
          u.frame = '';
        }
      }
      u.animate(this.time);
      u.drawStatuses(this.time);
      u.drawCast(clock, this.time);
      // поднятый щит Кассиана
      if (u.guardUntil > clock && u.alive && this.playing) {
        if (Math.floor(this.time / 60) % 3 === 0) this.sparkle(u, 0x9fe0ff, 1);
      }
    }
    // цепь гаснет вместе с окном
    if (this.chainText && (!this.playing || this.chainUntil < clock)) {
      const tx = this.chainText;
      this.chainText = null;
      this.tween(200, (k) => (tx.alpha = 1 - k), () => tx.destroy());
    }
    // оверлей: красная угроза при замахе, золото залпа, вспышки
    const g = this.overlay;
    g.clear();
    if (this.playing && this.dangerUntil > clock) {
      const left = this.dangerUntil - clock;
      const pulse = 0.12 + 0.1 * Math.abs(Math.sin(this.time / (left < 1200 ? 90 : 220)));
      g.rect(0, this.H - 10, this.W, 10).fill({ color: 0xff2a3a, alpha: pulse * 1.5 });
      g.rect(0, 0, this.W, 6).fill({ color: 0xff2a3a, alpha: pulse });
    }
    if (this.playing && this.volleyUntil > clock) g.rect(0, 0, this.W, 3).fill({ color: 0xffd24a, alpha: 0.8 });
    if (this.flashAlpha > 0.01) {
      g.rect(0, 0, this.W, this.H).fill({ color: this.flashColor, alpha: this.flashAlpha });
      this.flashAlpha = Math.max(0, this.flashAlpha - dt / 400);
    }
    const running = this.tweens;
    this.tweens = [];
    const alive = running.filter((tw) => {
      try {
        return tw.update(dt);
      } catch {
        return false;
      }
    });
    this.tweens = alive.concat(this.tweens);
    if (this.shake > 0) {
      this.stage.x = (Math.random() - 0.5) * this.shake;
      this.stage.y = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt / 40);
    } else {
      this.stage.x = 0;
      this.stage.y = 0;
    }
  }
}
