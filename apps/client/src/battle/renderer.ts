import { ARTIFACT_MAP, ARTIFACT_RARITY_COLORS, CLASSES, COMBO_MAP, ENEMY_MAP, HEROINE_MAP, SKILL_MAP, type BattleEvent, type ClassId, type UnitSnap } from '@idle/shared';
import {
  Application,
  BitmapFont,
  BitmapText,
  Container,
  Graphics,
  Sprite,
  Texture,
  TextureSource,
  TilingSprite,
} from 'pixi.js';
import { unitCanvas } from '../art/runtime';
import { useGame } from '../store/game';
import { frameKey, lifeFrame, newLife, type LifeAnim, type LifeFrame } from '../art/anim';
import { t, tl } from '../i18n';
import { sfx } from '../audio/sfx';
import { ACTS } from '@idle/shared';
import { BG_H, BG_W, drawLayer, drawSky, weatherParams, type Particle } from './backdrop';
import type { Playback } from './director';
import { useLive } from './live';
import { PIXEL_FONT, loadPixelFont } from '../styles/pixelFont';

TextureSource.defaultOptions.scaleMode = 'nearest';

const VFX_COLOR: Record<string, number> = {
  fire: 0xff7a2a,
  ice: 0x9fe0ff,
  holy: 0xffe8a0,
  dark: 0xb04de0,
  poison: 0x7acf5a,
  bolt: 0xffe040,
  arrow: 0xf2e6d8,
  slash: 0xffffff,
  song: 0xf4b8cc,
  nova: 0xe040ff,
  heal: 0x7ae07a,
  shield: 0x6fd0ff,
};
const AURA_COLOR: Record<string, number> = { fire: 0xffa040, water: 0x7fe0ff, nature: 0x9af06a, light: 0xfff0a0, dark: 0xe060ff };
const DOT_COLOR: Record<string, number> = { burn: 0xff9a4a, poison: 0x9ae07a, bleed: 0xff5a5a, thorns: 0xd0c0a0 };
const MELEE_VFX = new Set(['slash']);
/** Цвета классов (как в интерфейсе): вспышки связок и метки. */
const CLASS_HEX: Record<ClassId, number> = { knight: 0x6f9ad8, assassin: 0xb06ae0, priestess: 0xf2d46b, ranger: 0x6ac06a, warlock: 0xe0603a, hunter: 0x6fd0e0 };
/** Метки связок над целью: цвет метки = цвет класса, который её ставит. */
const MARK_COLOR: Record<string, number> = {
  'mark:daze': CLASS_HEX.knight,
  'mark:curse': CLASS_HEX.warlock,
  'mark:root': CLASS_HEX.ranger,
  'mark:prey': CLASS_HEX.hunter,
  'mark:bless': CLASS_HEX.priestess,
};

interface Tween {
  update(dt: number): boolean;
}

class UnitView {
  root = new Container();
  body = new Container();
  sprite: Sprite;
  flash: Sprite;
  shadow = new Graphics();
  bars = new Graphics();
  statusG = new Graphics();
  hp: number;
  maxHp: number;
  shield = 0;
  energy = 0;
  alive = true;
  statuses = new Set<string>();
  baseX = 0;
  baseY = 0;
  bobPhase = Math.random() * Math.PI * 2;
  scale: number;
  barW: number;
  pix = 1;
  spriteH = 32;
  /** моргание и дыхание рук */
  life: LifeAnim;
  frame = 'idle:open';
  /** до какого момента держать позу удара / зажмуриться от попадания */
  attackUntil = 0;
  hurtUntil = 0;
  /** Вестница или Колосс: крупнее, парит, окружена аурой своей стихии */
  special: boolean;
  aura = new Container();
  auraParts: { x: number; y: number; vy: number; life: number; size: number; sp: Sprite }[] = [];
  private auraFree: Sprite[] = [];
  /** ключ нарисованных значков статусов — перерисовываем только при изменении */
  private statusKey = '';
  private stunStars: Sprite[] = [];
  auraAcc = 0;
  /** «Сокрушительный удар»: полоса каста над здоровьем (часы боя) */
  castG = new Graphics();
  castStart = 0;
  castEnd = 0;

  constructor(
    public snap: UnitSnap,
    scale: number,
    now: number,
    /** облик героини из отряда игрока */
    public skin?: string,
  ) {
    this.hp = snap.hp;
    this.maxHp = snap.maxHp;
    this.energy = snap.energy;
    const herald = false;
    const colossus = !!ENEMY_MAP[snap.ref]?.colossus;
    this.special = herald || colossus;
    this.life = newLife(now, snap.side === 0 && !snap.mirror, this.special);
    this.bobPhase = this.life.phase;
    const big = colossus ? 2.5 : herald ? 1.2 : snap.kind === 'boss' ? 2 : snap.kind === 'mini' ? 1.35 : snap.kind === 'summon' ? 0.8 : 1;
    this.scale = scale * big;
    const canvas = unitCanvas(snap.ref, { mirror: snap.mirror, skin });
    this.sprite = new Sprite(liveTexture(canvas));
    this.sprite.anchor.set(0.5, 1);
    this.flash = new Sprite(liveTexture(silhouette(canvas)));
    this.fitCanvas(canvas);
    this.preload();
    this.flash.anchor.set(0.5, 1);
    this.flash.alpha = 0;
    this.shadow.ellipse(0, 0, 11 * this.scale, 3 * this.scale).fill({ color: 0x000000, alpha: 0.35 });
    this.body.addChild(this.sprite, this.flash);
    this.root.addChild(this.shadow, this.aura, this.body, this.statusG, this.bars, this.castG);
    this.barW = Math.max(30, 20 * scale * (big > 1 ? 1.4 : 1));
    this.drawBars();
  }

  get headY() {
    return -(this.spriteH - 2) * this.pix * this.scale;
  }

  /** Размер на экране не зависит от разрешения кадра (фигуры 48 px, прочие — 32 px). */
  fitCanvas(canvas: HTMLCanvasElement) {
    const flip = this.snap.side === 1 ? -1 : 1;
    this.pix = canvas.height > 32 ? (32 / canvas.height) * 1.2 : 1;
    this.spriteH = canvas.height;
    this.sprite.scale.set(this.scale * this.pix * flip, this.scale * this.pix);
    this.flash.scale.copyFrom(this.sprite.scale);
  }

  private canvasFor(f: LifeFrame) {
    return unitCanvas(this.snap.ref, { mirror: this.snap.mirror, skin: this.skin }, f);
  }

  /** Заранее рисуем частые кадры, чтобы моргание и удар не ждали. */
  preload() {
    const frames: LifeFrame[] = [
      { arms: 'idle2', eyes: 'open' },
      { arms: 'idle', eyes: 'half' },
      { arms: 'idle', eyes: 'closed' },
      { arms: 'attack', eyes: 'open' },
    ];
    if (this.special) frames.push({ arms: 'idle', eyes: 'open', flap: true }, { arms: 'idle2', eyes: 'open', flap: true });
    for (const f of frames) this.canvasFor(f);
  }

  /** Сменить кадр (поза рук + глаза); текстуры кадров кэшируются по канвасу. */
  setFrame(f: LifeFrame) {
    const key = frameKey(f);
    if (key === this.frame) return;
    const canvas = this.canvasFor(f);
    this.frame = key;
    this.sprite.texture = liveTexture(canvas);
    this.flash.texture = liveTexture(silhouette(canvas));
    if (canvas.height !== this.spriteH) this.fitCanvas(canvas);
  }

  /** Искры ауры поднимаются вокруг Вестниц и Колоссов. */
  updateAura(dt: number) {
    if (!this.special) return;
    if (!this.alive) {
      for (const p of this.auraParts) this.freeAura(p.sp);
      this.auraParts.length = 0;
      return;
    }
    const h = (this.spriteH - 4) * this.pix * this.scale;
    const w = 11 * this.scale;
    const color = AURA_COLOR[this.snap.el] ?? 0xffffff;
    this.auraAcc += dt;
    while (this.auraAcc > 70) {
      this.auraAcc -= 70;
      if (this.auraParts.length < 22) {
        // искры ауры — спрайты из запаса, а не перерисовка графики каждый кадр
        const size = Math.random() < 0.3 ? 3 : 2;
        const sp = this.auraFree.pop() ?? this.aura.addChild(new Sprite(Texture.WHITE));
        sp.tint = color;
        sp.width = size;
        sp.height = size;
        sp.visible = true;
        this.auraParts.push({ x: (Math.random() * 2 - 1) * w, y: -Math.random() * h * 0.9, vy: -(18 + Math.random() * 26) * Math.max(1, this.scale * 0.5), life: 1, size, sp });
      }
    }
    for (const p of this.auraParts) {
      p.y += (p.vy * dt) / 1000;
      p.life -= dt / 900;
      p.sp.position.set(Math.round(p.x), Math.round(p.y + this.sprite.y));
      p.sp.alpha = Math.max(0, Math.min(1, p.life * 1.4) * 0.85);
      if (p.life <= 0) this.freeAura(p.sp);
    }
    this.auraParts = this.auraParts.filter((p) => p.life > 0);
  }

  private freeAura(sp: Sprite) {
    sp.visible = false;
    this.auraFree.push(sp);
  }

  /** Живая анимация: дыхание рук, моргание, поза удара, зажмуривание от боли. */
  animate(time: number) {
    if (!this.alive) {
      this.setFrame({ arms: 'idle', eyes: 'closed' });
      return;
    }
    if (this.statuses.has('freeze')) return; // заморожена — застывает в текущем кадре
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
    const y = this.headY - 8;
    g.rect(x - 1, y - 1, w + 2, 7).fill({ color: 0x000000, alpha: 0.75 });
    const frac = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const col = this.snap.side === 0 ? (frac > 0.5 ? 0x4fbf5a : frac > 0.25 ? 0xe0a13a : 0xe03a3a) : 0xe03a3a;
    g.rect(x, y, w * frac, 4).fill(col);
    if (this.shield > 0) {
      const sf = Math.min(1, this.shield / this.maxHp);
      g.rect(x, y, w * sf, 2).fill({ color: 0x9fe0ff, alpha: 0.95 });
    }
    // энергия (ультимейт на 100)
    g.rect(x, y + 4, w * Math.min(1, this.energy / 100), 1.5).fill(this.energy >= 100 ? 0xffe8a0 : 0xe0a13a);
  }

  /** Полоса каста босса: заполняется к удару, мигает в последнюю секунду. */
  drawCast(clock: number, time: number) {
    const g = this.castG;
    g.clear();
    if (!this.alive || this.castEnd <= clock) return;
    const w = this.barW * 1.1;
    const x = -w / 2;
    const y = this.headY - 18;
    const k = Math.max(0, Math.min(1, (clock - this.castStart) / Math.max(1, this.castEnd - this.castStart)));
    const late = this.castEnd - clock < 1000 && Math.floor(time / 120) % 2 === 0;
    g.rect(x - 1, y - 1, w + 2, 6).fill({ color: 0x000000, alpha: 0.8 });
    g.rect(x, y, w * k, 4).fill(late ? 0xffffff : 0xff6a2a);
  }

  drawStatuses(time: number) {
    const stun = this.alive && this.statuses.has('stun');
    this.updateStunStars(stun, time);
    const tint = this.statuses.has('freeze') ? 0x9fd8ff : 0xffffff;
    if (this.sprite.tint !== tint) this.sprite.tint = tint;
    const key = this.alive ? `${[...this.statuses].join(',')}|${this.headY}|${this.barW}` : '-';
    if (key === this.statusKey) return;
    this.statusKey = key;
    const g = this.statusG;
    g.clear();
    if (!this.alive) return;
    const y = this.headY - 14;
    let i = 0;
    for (const st of this.statuses) {
      let col = 0;
      if (st === 'stun') col = 0xffe040;
      else if (st === 'freeze') col = 0x9fe0ff;
      else if (st === 'silence') col = 0xb0b0b0;
      else if (st === 'taunt') col = 0xe03a3a;
      else if (DOT_COLOR[st]) col = DOT_COLOR[st];
      else if (MARK_COLOR[st]) {
        // метка связки — ромбик покрупнее
        g.rect(-this.barW / 2 + i * 5 - 1, y - 1, 6, 6).fill(0x140e12);
        col = MARK_COLOR[st];
      }
      else if (st.startsWith('buff')) col = 0x7ae07a;
      else if (st.startsWith('debuff')) col = 0xb04de0;
      else continue;
      g.rect(-this.barW / 2 + i * 5, y, 4, 4).fill(col);
      i++;
      if (i > 6) break;
    }
  }

  /** Звёздочки оглушения кружат над головой — три спрайта, которые просто двигаются. */
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

function liveTexture(canvas: HTMLCanvasElement): Texture {
  return Texture.from(canvas);
}

/**
 * Числа урона и подписи — растровым шрифтом: глифы рисуются один раз в атлас, дальше текст «собирается»
 * из готовых кусочков. Обычный Text на каждое число создавал холст и текстуру — это и давало просадки FPS.
 * Шрифт белый с тёмной обводкой, цвет — тонировкой, размер — масштабом.
 */
const NUM_FONT = 'battle-num';
let numFontReady = false;
function ensureNumFont() {
  if (numFontReady) return;
  BitmapFont.install({
    name: NUM_FONT,
    style: { fontFamily: `${PIXEL_FONT}, Manrope, sans-serif`, fontSize: 40, fontWeight: '600', fill: '#ffffff', stroke: { color: '#1a1016', width: 9 } },
    chars: [['a', 'z'], ['A', 'Z'], ['0', '9'], ['а', 'я'], ['А', 'Я'], 'ёЁ .,:;!?%+-−×·—–«»()/\'"…★♥'],
    padding: 6,
  });
  numFontReady = true;
}

function battleText(text: string, color: number | string, size: number): BitmapText {
  ensureNumFont();
  const tx = new BitmapText({ text, style: { fontFamily: NUM_FONT, fontSize: Math.round(size * 1.25), align: 'center' } });
  tx.tint = typeof color === 'number' ? color : parseInt(color.replace('#', ''), 16);
  return tx;
}

/** Сколько всплывающих надписей держим одновременно: на ускорении лишние только сливаются в кашу. */
const MAX_FLOATERS = 36;

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
  private sky: Sprite | null = null;
  private layers: TilingSprite[] = [];
  private particles: Particle[] = [];
  private weather = new Container();
  private weatherSprites: Sprite[] = [];
  private fxG = new Graphics();
  private tweens: Tween[] = [];
  /** часы текущего проигрывания (мс боя) — для полос каста */
  private playClock = 0;
  private liveKey = '';
  private units = new Map<number, UnitView>();
  private act = 0;
  private W = 360;
  private H = 260;
  private shake = 0;
  private time = 0;
  private ready = false;
  private destroyed = false;
  /** Завершители идущих проигрываний: при отсоединении/уничтожении их нужно отпустить. */
  private pending = new Set<() => void>();
  /** WebGL-контекст потерян (свернули Telegram, сброс GPU) — сцену нужно пересоздать. */
  lost = false;
  onContextLost: (() => void) | null = null;
  /** Облик героини игрока (сторона 0) — из текущего состояния игры. */
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
    // при пониженном разрешении холст растягивается браузером — пиксели должны оставаться чёткими
    this.app.canvas.style.imageRendering = 'pixelated';
    this.app.canvas.addEventListener('webglcontextlost', () => {
      this.lost = true;
      this.onContextLost?.();
    });
    this.app.stage.addChild(this.stage);
    this.stage.addChild(this.bg, this.world, this.fx, this.ui);
    // отладочный доступ к сцене в dev-сборке (скриншотные проверки)
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__battle = this;
    this.world.sortableChildren = true;
    this.fx.addChild(this.fxG);
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

  /** Показать сцену в контейнере (один рендерер переживает переключение вкладок). */
  attach(host: HTMLElement) {
    if (!this.isReady) return;
    if (this.app.canvas.parentElement !== host) host.appendChild(this.app.canvas);
    if (host.clientWidth && host.clientHeight) this.resize(host.clientWidth, host.clientHeight);
    this.app.ticker.start();
  }

  /** Убрать сцену с экрана: прерываем идущее проигрывание и останавливаем отрисовку. */
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
    for (const u of this.units.values()) this.placeUnit(u);
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
    return Math.max(1.6, Math.min(2.6, this.H / 125, this.W / 160));
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
    // погодные частицы
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

  private placeUnit(u: UnitView) {
    const side = u.snap.side;
    const all = [...this.units.values()].filter((x) => x.snap.side === side);
    let x: number;
    let y: number;
    if (u.snap.kind === 'boss') {
      x = 0.72;
      y = 0.93;
    } else if (u.snap.slot >= 5 && side === 0) {
      const sums = all.filter((x) => x.snap.slot >= 5);
      const i = sums.indexOf(u);
      x = 0.47;
      y = 0.76 + (i % 4) * 0.06;
    } else {
      const rowUnits = all.filter((x) => x.snap.kind !== 'boss' && x.snap.row === u.snap.row && !(side === 0 && x.snap.slot >= 5));
      const i = rowUnits.indexOf(u);
      const n = Math.max(1, rowUnits.length);
      const front = u.snap.row === 'front';
      // зигзаг по глубине, чтобы юниты одного ряда меньше перекрывались
      const zig = (i % 2) * (front ? 0.05 : 0.08);
      x = side === 0 ? (front ? 0.33 + zig : 0.09 + zig) : front ? 0.67 - zig : 0.91 - zig;
      if (side === 1 && all.some((q) => q.snap.kind === 'boss')) x = front ? 0.52 - zig : 0.93 - zig * 0.5;
      const top = 0.7;
      const bottom = 0.97;
      y = n === 1 ? 0.86 : top + ((bottom - top) * i) / (n - 1);
      if (front && n === 2) y = i === 0 ? 0.76 : 0.94;
    }
    u.baseX = x * this.W;
    u.baseY = y * this.H;
    // крупные юниты (Вестницы, Колоссы с крыльями) не должны уходить за край сцены
    const half = u.sprite.width * 0.42;
    u.baseX = Math.max(half, Math.min(this.W - half, u.baseX));
    u.root.position.set(u.baseX, u.baseY);
    u.root.zIndex = Math.round(u.baseY);
  }

  clearUnits() {
    // анимации прошлого боя ссылаются на удаляемые объекты — сбрасываем их вместе с эффектами
    this.tweens = [];
    this.pxPool = [];
    for (const c of [...this.fx.children]) if (c !== this.fxG) c.destroy({ children: true });
    this.fxG.clear();
    for (const u of this.units.values()) u.root.destroy({ children: true });
    this.units.clear();
    for (const c of [...this.ui.children]) c.destroy();
  }

  private addUnit(snap: UnitSnap, appear = false) {
    const u = new UnitView(snap, this.unitScale, this.time, snap.side === 0 || snap.mirror ? this.skinOf(snap.ref) : undefined);
    this.units.set(snap.uid, u);
    this.world.addChild(u.root);
    this.placeUnit(u);
    if (appear) {
      u.root.alpha = 0;
      this.tween(200, (k) => (u.root.alpha = k));
      this.burst(u.baseX, u.baseY - 20, 0xb04de0, 10);
    }
    return u;
  }

  /** Проиграть бой по событиям симулятора. */
  play(p: Playback, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady || this.lost) {
        resolve();
        return;
      }
      this.buildBackground(p.act);
      this.clearUnits();
      // живой бой: события пересчитываются по командам игрока — берём актуальный список каждый кадр
      const evs = () => p.live?.events ?? p.events;
      let i = 0;
      let clock = 0;
      this.playClock = 0;
      this.liveKey = '';
      let holdUntil = -1;
      const onAbort = () => finish();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.pending.delete(finish);
        if (!this.destroyed) this.app.ticker.remove(tick);
        signal.removeEventListener('abort', onAbort);
        resolve();
      };
      this.pending.add(finish);
      signal.addEventListener('abort', onAbort);
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
            // одно «кривое» событие не должно останавливать бой
            console.error('battle event', events[i], e);
          }
          i++;
        }
        if (p.live) {
          p.live.clock = clock;
          this.publishLive(clock);
        }
        if (i >= events.length && holdUntil < 0) holdUntil = clock + 900 * p.speed;
        if (holdUntil > 0 && clock >= holdUntil && clock >= endT) finish();
      };
      this.app.ticker.add(tick);
      if (signal.aborted) finish();
    });
  }

  private apply(e: BattleEvent, p: Playback) {
    switch (e.k) {
      case 'start':
        for (const u of e.units) this.addUnit(u);
        break;
      case 'summon':
        this.addUnit(e.unit, true);
        sfx('summon');
        break;
      case 'act': {
        const u = this.units.get(e.u);
        if (!u) break;
        u.attackUntil = this.time + (e.kind === 'ult' ? 520 : 300);
        u.energy = e.e;
        u.drawBars();
        const skill = SKILL_MAP[e.s];
        const vfx = skill?.vfx ?? 'slash';
        const targets = e.tg.map((id) => this.units.get(id)).filter((x): x is UnitView => !!x);
        if (e.kind === 'ult') {
          this.label(u, skill ? skill.name[document.documentElement.lang === 'en' ? 'en' : 'ru'] : '', 0xffe8a0, 15);
          this.shake = Math.max(this.shake, 5);
          this.flashUnit(u, 0.8);
          sfx('ult');
        } else if (e.kind === 'active' && skill) {
          this.label(u, skill.name[document.documentElement.lang === 'en' ? 'en' : 'ru'], 0xf2e6d8, 11);
          sfx('skill');
        }
        const enemyTargets = targets.filter((x) => x.snap.side !== u.snap.side);
        const cls = HEROINE_MAP[u.snap.ref]?.cls;
        if (u.snap.ref === 'wolf' && enemyTargets.length) this.pounce(u, enemyTargets[0]);
        else if (cls === 'assassin' && enemyTargets.length === 1) this.blink(u, enemyTargets[0]);
        else if (cls === 'knight' && enemyTargets.length === 1) {
          this.lunge(u, enemyTargets[0]);
          // блик щита
          this.burst(u.baseX + (u.snap.side === 0 ? 8 : -8), u.baseY - 20 * u.scale, 0xd8dee8, 4);
        } else if (cls === 'hunter' && enemyTargets.length) {
          this.castPose(u);
          for (const tg of enemyTargets.slice(0, 6)) this.projectile(u, tg, 0xd8dee8, 'arrow', 2, 120);
        } else if (cls === 'priestess' && vfx === 'holy') {
          this.castPose(u);
          for (const tg of (enemyTargets.length ? enemyTargets : targets).slice(0, 6)) this.beam(tg, VFX_COLOR.holy ?? 0xfff0a0);
        } else if (MELEE_VFX.has(vfx) && enemyTargets.length === 1) this.lunge(u, enemyTargets[0]);
        else if (enemyTargets.length) {
          this.castPose(u);
          const arc = cls === 'ranger' ? 22 : 12;
          for (const tg of enemyTargets.slice(0, 6)) this.projectile(u, tg, VFX_COLOR[vfx] ?? 0xffffff, vfx, arc);
          // колдунья: руна под ногами
          if (cls === 'warlock') this.burst(u.baseX, u.baseY - 4, CLASS_HEX.warlock, 6);
        } else {
          this.castPose(u);
          if (cls === 'priestess') for (const tg of targets.slice(0, 6)) this.beam(tg, 0x9af06a);
          else for (const tg of targets) this.burst(tg.baseX, tg.baseY - 30, VFX_COLOR[vfx] ?? 0x7ae07a, 6);
        }
        if (e.kind === 'basic') sfx(vfx === 'arrow' ? 'arrow' : vfx === 'slash' ? 'hit' : 'magic');
        break;
      }
      case 'dmg': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.hp = e.hp;
        u.shield = e.sh;
        u.energy = e.te;
        u.drawBars();
        if (e.miss) {
          this.floater(u, 'MISS', '#a89484', 12);
          break;
        }
        if (e.blk) {
          this.floater(u, e.v ? fmt(e.v) : 'BLOCK', '#9fe0ff', 13);
          this.burst(u.baseX, u.baseY - 30, 0x6fd0e0, 6);
          break;
        }
        const color = e.dot ? '#' + (DOT_COLOR[e.dot] ?? 0xffffff).toString(16).padStart(6, '0') : e.crit ? '#ffe040' : u.snap.side === 0 ? '#ff8a7a' : '#ffffff';
        this.floater(u, fmt(e.v) + (e.crit ? '!' : ''), color, e.crit ? 20 : e.dot ? 11 : 14);
        if (!e.dot) {
          u.hurtUntil = this.time + 220;
          this.flashUnit(u, 0.9);
          this.knock(u);
          if (e.crit) this.shake = Math.max(this.shake, 3);
        }
        if (e.br && p.kind !== 'farm') {
          const b = e.br;
          // dev: раскладка по формуле урона
          console.debug(`[dmg] ATK ${b.atk}×K${b.k.toFixed(2)}×DEF ${b.defF.toFixed(3)}×EL ${b.elem.toFixed(2)}×CR ${b.crit.toFixed(2)}×U ${b.vr.toFixed(3)}×B ${b.bonus.toFixed(2)}×T ${b.taken.toFixed(2)} = ${e.v}`);
        }
        break;
      }
      case 'heal': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.hp = e.hp;
        u.drawBars();
        if (e.v > 0) this.floater(u, '+' + fmt(e.v), '#7ae07a', 12);
        this.burst(u.baseX, u.baseY - 25, 0x7ae07a, 4);
        break;
      }
      case 'shield': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.shield = e.sh;
        u.drawBars();
        this.burst(u.baseX, u.baseY - 25, 0x9fe0ff, 4);
        break;
      }
      case 'status': {
        const u = this.units.get(e.tg);
        if (!u) break;
        if (e.on) u.statuses.add(e.st);
        else u.statuses.delete(e.st);
        break;
      }
      case 'energy': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.energy = e.e;
        u.drawBars();
        break;
      }
      case 'death': {
        const u = this.units.get(e.tg);
        if (!u) break;
        u.alive = false;
        u.statuses.clear();
        u.drawBars();
        u.drawStatuses(this.time);
      u.drawCast(this.playClock, this.time);
        this.burst(u.baseX, u.baseY - 20, u.snap.side === 0 ? 0xe03a3a : 0xffe8a0, 12);
        this.tween(420, (k) => {
          u.body.alpha = 1 - k * 0.85;
          u.body.rotation = (u.snap.side === 0 ? -1 : 1) * k * 0.5;
          u.body.y = k * 6;
        });
        if (u.snap.side === 1) sfx('coin');
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
        this.burst(u.baseX, u.baseY - 30, 0xffe8a0, 14);
        this.floater(u, '+' + fmt(e.hp), '#ffe8a0', 13);
        break;
      }
      case 'mech': {
        const target = e.tg !== undefined ? this.units.get(e.tg) : undefined;
        if (e.m === 'castStart') {
          if (target) {
            target.castStart = e.t;
            target.castEnd = e.t + (e.v ?? 3000);
          }
          this.banner(t('mech.castStart'));
          sfx('mech');
          break;
        }
        if (e.m === 'interrupt') {
          if (target) {
            target.castEnd = 0;
            this.floater(target, t('mech.interruptShort'), '#ffe8a0', 15);
            this.burst(target.baseX, target.baseY - 40, 0xffe8a0, 18);
          }
          this.banner(t('mech.interrupt'));
          sfx('ult');
          break;
        }
        if (e.m === 'castHit') {
          if (target) target.castEnd = 0;
          this.shake = 8;
          for (const u of this.units.values()) if (u.snap.side === 0 && u.alive) this.flashUnit(u, 0.9);
          this.banner(t('mech.castHit'));
          sfx('mech');
          break;
        }
        // артефакты отряда: иконка и название над целью (или баннер, если действует на весь отряд)
        if (e.m.startsWith('artifact:')) {
          const def = ARTIFACT_MAP[e.m.slice(9)];
          if (!def) break;
          const col = ARTIFACT_RARITY_COLORS[def.rarity];
          const label = `${def.icon} ${tl(def.name)}`;
          if (target) {
            this.floater(target, label, col, 12);
            this.burst(target.baseX, target.baseY - 30, parseInt(col.slice(1), 16), def.id === 'thunder_bell' ? 16 : 8);
            if (def.id === 'thunder_bell') this.flashUnit(target, 1);
          } else this.banner(label);
          if (def.id === 'valkyrie_horn' || def.id === 'phoenix_ash') sfx('ult');
          break;
        }
        const text = t(`mech.${e.m}`);
        this.banner(text);
        if (target) this.burst(target.baseX, target.baseY - 30, 0xe040ff, 10);
        if (e.m === 'sandstorm') this.shake = 4;
        sfx('mech');
        break;
      }
      case 'combo': {
        const u = this.units.get(e.u);
        const tg = this.units.get(e.tg);
        const def = COMBO_MAP[e.c];
        if (!def || !tg) break;
        const col = CLASS_HEX[(u && HEROINE_MAP[u.snap.ref]?.cls) || def.to[0]] ?? 0xffe8a0;
        this.floater(tg, `${tl(def.name)}!`, '#' + col.toString(16).padStart(6, '0'), 14);
        this.burst(tg.baseX, tg.baseY - 30 * tg.scale, col, 12);
        this.flashUnit(tg, 1);
        if (e.c === 'backstab' || e.c === 'crush' || e.c === 'decay') this.shake = Math.max(this.shake, 4);
        sfx('skill');
        break;
      }
      case 'end': {
        if (p.kind === 'boss' || p.kind === 'mode') {
          this.bigText(e.win ? t('common.victory') : t('common.defeat'), e.win ? '#ffe8a0' : '#ff8070');
        }
        break;
      }
    }
  }

  // ——— живой бой: панель ульт ———

  private liveEvent(e: BattleEvent) {
    if (e.k === 'sig') {
      const ui = useLive.getState();
      if (ui.heroes.some((h) => h.uid === e.u)) useLive.setState({ heroes: ui.heroes.map((h) => (h.uid === e.u ? { ...h, sig: e.r === 1, sigPending: e.r === 1 ? h.sigPending : false } : h)) });
    } else if (e.k === 'act' && e.kind === 'ult') {
      const ui = useLive.getState();
      if (ui.heroes.some((h) => h.uid === e.u && h.pending)) useLive.setState({ heroes: ui.heroes.map((h) => (h.uid === e.u ? { ...h, pending: false } : h)) });
    } else if (e.k === 'mech' && e.m === 'castStart' && e.tg !== undefined) {
      useLive.setState({ cast: { uid: e.tg, start: e.t, end: e.t + (e.v ?? 3000) } });
    } else if (e.k === 'mech' && (e.m === 'interrupt' || e.m === 'castHit')) {
      useLive.setState({ cast: null });
    }
  }

  /** Энергия и живость героинь — в панель ульт (только при изменениях). */
  private publishLive(clock: number) {
    const ui = useLive.getState();
    const heroes = ui.heroes.map((h) => {
      const u = this.units.get(h.uid);
      return u ? { ...h, energy: Math.min(100, Math.round(u.energy)), alive: u.alive } : h;
    });
    const key = heroes.map((h) => `${h.energy >= 100 ? 'F' : Math.floor(h.energy / 5)}${h.alive ? 1 : 0}${h.pending ? 1 : 0}`).join(',') + (ui.cast && ui.cast.end < clock ? 'x' : '');
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

  private lunge(u: UnitView, tg: UnitView) {
    const dx = (tg.baseX - u.baseX) * 0.35;
    const dy = (tg.baseY - u.baseY) * 0.35;
    this.tween(220, (k) => {
      const a = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
      u.body.x = dx * a;
      u.body.y = dy * a;
    });
    setTimeout(() => this.slash(tg), 80);
  }

  /** Ассасин: исчезает, появляется за спиной цели, два удара — и назад. */
  private blink(u: UnitView, tg: UnitView) {
    const dx = tg.baseX - u.baseX + (u.snap.side === 0 ? 20 : -20) * tg.scale;
    const dy = tg.baseY - u.baseY;
    this.burst(u.baseX, u.baseY - 20 * u.scale, CLASS_HEX.assassin, 6);
    this.tween(
      300,
      (k) => {
        if (k < 0.2) u.body.alpha = 1 - k / 0.2;
        else if (k < 0.3) {
          u.body.x = dx;
          u.body.y = dy;
          u.body.alpha = (k - 0.2) / 0.1;
        } else if (k < 0.75) {
          u.body.x = dx;
          u.body.y = dy;
          u.body.alpha = 1;
        } else {
          const a = (k - 0.75) / 0.25;
          u.body.x = dx * (1 - a);
          u.body.y = dy * (1 - a);
        }
      },
      () => {
        u.body.x = 0;
        u.body.y = 0;
        if (u.alive) u.body.alpha = 1;
      },
    );
    setTimeout(() => this.slash(tg), 110);
    setTimeout(() => this.slash(tg), 170);
  }

  /** Волк: прыжок на цель дугой. */
  private pounce(u: UnitView, tg: UnitView) {
    const dx = (tg.baseX - u.baseX) * 0.55;
    const dy = (tg.baseY - u.baseY) * 0.55;
    this.tween(260, (k) => {
      const a = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
      u.body.x = dx * a;
      u.body.y = dy * a - Math.sin(Math.min(1, k / 0.45) * Math.PI) * 10;
    });
    setTimeout(() => this.slash(tg), 110);
  }

  /** Жрица: столб света над целью. */
  private beam(tg: UnitView, color: number) {
    const s = tg.scale;
    const b = this.px(color, 6 * s, 70 * s);
    b.position.set(tg.baseX, tg.baseY - 36 * s);
    b.alpha = 0.75;
    this.tween(
      320,
      (k) => {
        b.alpha = 0.75 * (1 - k);
        b.width = 6 * s * (1 - k * 0.6);
      },
      () => this.freePx(b),
    );
    this.burst(tg.baseX, tg.baseY - 26 * s, color, 5);
  }

  private castPose(u: UnitView) {
    this.tween(200, (k) => {
      u.body.y = -Math.sin(k * Math.PI) * 4;
    });
  }

  private knock(u: UnitView) {
    const dir = u.snap.side === 0 ? -1 : 1;
    this.tween(160, (k) => {
      u.body.x = dir * Math.sin(k * Math.PI) * 4;
    });
  }

  private flashUnit(u: UnitView, alpha: number) {
    // по Вестницам и Колоссам бьют без остановки — мягкая вспышка, иначе они постоянно «белеют»
    const a = u.special ? alpha * 0.4 : alpha;
    this.tween(140, (k) => (u.flash.alpha = a * (1 - k)));
  }

  /**
   * Запас однотонных квадратиков для искр, следов и росчерков. Раньше каждая искра была новым Graphics
   * (построение геометрии + сборка мусора) — на ускорении их сотни в секунду.
   */
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

  private slash(tg: UnitView) {
    const s = tg.scale;
    const parts: Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const p = this.px(0xffffff, 2 * s);
      p.position.set(tg.baseX - 8 * s + i * 3 * s + s, tg.baseY - 24 * s + i * 3 * s + s);
      parts.push(p);
    }
    this.tween(
      160,
      (k) => {
        for (const p of parts) p.alpha = 1 - k;
      },
      () => parts.forEach((p) => this.freePx(p)),
    );
  }

  private projectile(from: UnitView, to: UnitView, color: number, vfx: string, arc = 12, dur = 170) {
    const sz = Math.max(3, from.scale * 1.5);
    const g = vfx === 'arrow' ? this.px(color, sz * 4, 2) : this.px(color, sz);
    const sx = from.baseX + (from.snap.side === 0 ? 10 : -10);
    const sy = from.baseY - 18 * from.scale;
    const ex = to.baseX;
    const ey = to.baseY - 16 * to.scale;
    g.position.set(sx, sy);
    let trailAt = 0;
    if (vfx === 'arrow') g.rotation = Math.atan2(ey - sy, ex - sx);
    this.tween(
      dur,
      (k) => {
        g.x = sx + (ex - sx) * k;
        g.y = sy + (ey - sy) * k - Math.sin(k * Math.PI) * arc;
        // след — не чаще раза в ~25 мс полёта, а не на каждом кадре
        if (vfx !== 'arrow' && k - trailAt > 0.15) {
          trailAt = k;
          const p = this.px(color, 2);
          p.position.set(g.x, g.y);
          this.tween(200, (kk) => (p.alpha = 1 - kk), () => this.freePx(p));
        }
      },
      () => {
        this.freePx(g);
        this.burst(ex, ey, color, 7);
      },
    );
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const s = 2 + Math.floor(Math.random() * 3);
      const g = this.px(color, s);
      g.position.set(x, y);
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 35;
      const vx = Math.cos(a) * v;
      const vy = Math.sin(a) * v - 10;
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

  private floater(u: UnitView, text: string, color: string, size: number) {
    if (this.ui.children.length > MAX_FLOATERS) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 1);
    const x0 = u.baseX + (Math.random() - 0.5) * 18;
    // не выше верхнего края сцены (над Колоссом цифры иначе обрезаются)
    const y0 = Math.max(44, u.baseY + u.headY - 6);
    tx.position.set(x0, y0);
    this.ui.addChild(tx);
    tx.scale.set(0.6);
    this.tween(
      800,
      (k) => {
        tx.y = y0 - 26 * k;
        tx.scale.set(k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5));
        tx.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      },
      () => tx.destroy(),
    );
  }

  private label(u: UnitView, text: string, color: number, size: number) {
    if (!text) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 1);
    tx.position.set(Math.max(50, Math.min(this.W - 50, u.baseX)), u.baseY + u.headY - 22);
    this.ui.addChild(tx);
    this.tween(900, (k) => (tx.alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1), () => tx.destroy());
  }

  private banner(text: string) {
    const tx = battleText(text, '#e040ff', 16);
    tx.anchor.set(0.5, 0.5);
    tx.position.set(this.W / 2, this.H * 0.18);
    this.ui.addChild(tx);
    this.tween(1300, (k) => {
      tx.alpha = k < 0.15 ? k / 0.15 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      tx.scale.set(1 + Math.sin(k * Math.PI) * 0.08);
    }, () => tx.destroy());
  }

  private bigText(text: string, color: string, size = 30) {
    if (!text) return;
    const tx = battleText(text, color, size);
    tx.anchor.set(0.5, 0.5);
    tx.position.set(this.W / 2, this.H * 0.4);
    this.ui.addChild(tx);
    this.tween(1000, (k) => {
      tx.scale.set(k < 0.2 ? 0.4 + (k / 0.2) * 0.8 : 1.2 - (k - 0.2) * 0.2);
      tx.alpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    }, () => tx.destroy());
  }

  /** Эффект лута поверх сцены (сбор сундука). */
  lootBurst(count: number) {
    if (!this.ready) return;
    for (let i = 0; i < Math.min(30, count); i++) {
      setTimeout(() => this.burst(this.W * (0.3 + Math.random() * 0.4), this.H * 0.4, i % 3 === 0 ? 0x5ab8f0 : 0xf2c040, 4), i * 30);
    }
  }

  /** Слабое устройство: бой долго идёт медленнее ~35 FPS — рисуем в разрешении 1× (пиксель-арту почти не вредит). */
  private slowFrames = 0;
  private lowRes = false;
  private watchFps(dt: number) {
    if (this.lowRes || this.app.renderer.resolution <= 1) return;
    // очень длинные кадры — пауза вкладки или сворачивание, а не нагрузка
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
    // параллакс
    const speeds = [2, 5, 9];
    this.layers.forEach((l, i) => (l.tilePosition.x -= (speeds[i] * dt) / 1000));
    // частицы погоды
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000 + Math.sin((this.time + i * 300) / 700) * 0.1;
      const sp = this.weatherSprites[i];
      if (p.x < -8 || p.x > this.W + 8 || p.y < -8 || p.y > this.H + 8) {
        p = this.particles[i] = this.spawnParticle();
        if (sp) this.styleParticle(sp, p);
      }
      sp?.position.set(Math.round(p.x), Math.round(p.y));
    }
    // дыхание юнитов
    for (const u of this.units.values()) {
      if (u.alive) {
        if (u.special) {
          // Вестницы и Колоссы парят над землёй, тень «дышит» вместе с ними
          const lift = Math.sin(this.time / 520 + u.bobPhase);
          // высота парения — в «пикселях» 48-пиксельной фигуры, чтобы не зависеть от разрешения кадра
          u.sprite.y = -5 * ((u.pix * u.spriteH) / 48) * Math.min(2, u.scale) + lift * 2.4;
          u.shadow.scale.set(0.8 - lift * 0.08, 0.8 - lift * 0.08);
        } else u.sprite.y = Math.sin(this.time / 380 + u.bobPhase) * 1.2;
      }
      u.flash.y = u.sprite.y;
      u.updateAura(dt);
      // облик сменили во время боя — перерисовываем кадры сразу, не дожидаясь новой волны
      if (u.snap.side === 0 || u.snap.mirror) {
        const sk = this.skinOf(u.snap.ref);
        if (sk !== u.skin) {
          u.skin = sk;
          u.frame = '';
        }
      }
      u.animate(this.time);
      u.drawStatuses(this.time);
    }
    // твины
    // твины, созданные во время обновления (искры после попадания снаряда), не должны потеряться
    const running = this.tweens;
    this.tweens = [];
    const alive = running.filter((tw) => {
      try {
        return tw.update(dt);
      } catch {
        return false; // объект анимации уже удалён — просто выбрасываем твин
      }
    });
    this.tweens = alive.concat(this.tweens);
    // тряска
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
