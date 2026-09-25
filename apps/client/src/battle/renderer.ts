import { SKILL_MAP, type BattleEvent, type UnitSnap } from '@idle/shared';
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  TextureSource,
  TilingSprite,
} from 'pixi.js';
import { unitCanvas } from '../art/runtime';
import { t } from '../i18n';
import { sfx } from '../audio/sfx';
import { ACTS } from '@idle/shared';
import { BG_H, BG_W, drawLayer, drawSky, weatherParams, type Particle } from './backdrop';
import type { Playback } from './director';

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
const DOT_COLOR: Record<string, number> = { burn: 0xff9a4a, poison: 0x9ae07a, bleed: 0xff5a5a, thorns: 0xd0c0a0 };
const MELEE_VFX = new Set(['slash']);

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

  constructor(
    public snap: UnitSnap,
    scale: number,
  ) {
    this.hp = snap.hp;
    this.maxHp = snap.maxHp;
    this.energy = snap.energy;
    const big = snap.kind === 'boss' ? 2 : snap.kind === 'mini' ? 1.35 : snap.kind === 'summon' ? 0.8 : 1;
    this.scale = scale * big;
    const canvas = unitCanvas(snap.ref, snap.side, { mirror: snap.mirror });
    this.sprite = new Sprite(Texture.from(canvas));
    this.sprite.anchor.set(0.5, 1);
    const flip = snap.side === 1 ? -1 : 1;
    this.sprite.scale.set(this.scale * flip, this.scale);
    this.flash = new Sprite(Texture.from(whiteSilhouette(canvas)));
    this.flash.anchor.set(0.5, 1);
    this.flash.scale.copyFrom(this.sprite.scale);
    this.flash.alpha = 0;
    this.shadow.ellipse(0, 0, 11 * this.scale, 3 * this.scale).fill({ color: 0x000000, alpha: 0.35 });
    this.body.addChild(this.sprite, this.flash);
    this.root.addChild(this.shadow, this.body, this.statusG, this.bars);
    this.barW = Math.max(30, 20 * scale * (big > 1 ? 1.4 : 1));
    this.drawBars();
  }

  get headY() {
    return -30 * this.scale;
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

  drawStatuses(time: number) {
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
      else if (st.startsWith('buff')) col = 0x7ae07a;
      else if (st.startsWith('debuff')) col = 0xb04de0;
      else continue;
      g.rect(-this.barW / 2 + i * 5, y, 4, 4).fill(col);
      i++;
      if (i > 6) break;
    }
    if (this.statuses.has('stun')) {
      for (let k = 0; k < 3; k++) {
        const a = time / 300 + (k * Math.PI * 2) / 3;
        g.rect(Math.cos(a) * 10 - 1, this.headY + 4 + Math.sin(a) * 3, 3, 3).fill(0xffe040);
      }
    }
    this.sprite.tint = this.statuses.has('freeze') ? 0x9fd8ff : 0xffffff;
  }
}

function whiteSilhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

const numStyle = (size: number, fill: string) =>
  new TextStyle({
    fontFamily: 'Pixelify Sans, Manrope, sans-serif',
    fontSize: size,
    fontWeight: '700',
    fill,
    stroke: { color: '#1a1016', width: 4 },
    align: 'center',
  });

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
  private particleG = new Graphics();
  private fxG = new Graphics();
  private tweens: Tween[] = [];
  private units = new Map<number, UnitView>();
  private act = 0;
  private W = 360;
  private H = 260;
  private shake = 0;
  private time = 0;
  private ready = false;
  private destroyed = false;

  async init(host: HTMLElement) {
    const w = host.clientWidth || 360;
    const h = host.clientHeight || 260;
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
    host.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.stage.addChild(this.stage);
    this.stage.addChild(this.bg, this.world, this.fx, this.ui);
    this.world.sortableChildren = true;
    this.fx.addChild(this.fxG);
    this.bg.addChild(this.particleG);
    this.resize(w, h);
    this.app.ticker.add((tk) => this.update(tk.deltaMS));
    this.ready = true;
  }

  resize(w: number, h: number) {
    if (!this.app.renderer) return;
    this.W = w;
    this.H = h;
    this.app.renderer.resize(w, h);
    if (this.act) this.buildBackground(this.act, true);
    for (const u of this.units.values()) this.placeUnit(u);
  }

  destroy() {
    this.destroyed = true;
    if (this.ready) this.app.destroy(true, { children: true });
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
    u.root.position.set(u.baseX, u.baseY);
    u.root.zIndex = Math.round(u.baseY);
  }

  clearUnits() {
    for (const u of this.units.values()) u.root.destroy({ children: true });
    this.units.clear();
    for (const c of [...this.ui.children]) c.destroy();
  }

  private addUnit(snap: UnitSnap, appear = false) {
    const u = new UnitView(snap, this.unitScale);
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
      if (!this.ready) {
        resolve();
        return;
      }
      this.buildBackground(p.act);
      this.clearUnits();
      const events = p.events;
      let i = 0;
      let clock = 0;
      const endT = events.length ? events[events.length - 1].t : 0;
      let holdUntil = -1;
      const onAbort = () => finish();
      const finish = () => {
        this.app.ticker.remove(tick);
        signal.removeEventListener('abort', onAbort);
        resolve();
      };
      signal.addEventListener('abort', onAbort);
      const tick = (tk: { deltaMS: number }) => {
        clock += tk.deltaMS * p.speed;
        while (i < events.length && events[i].t <= clock) {
          this.apply(events[i], p);
          i++;
        }
        if (i >= events.length && holdUntil < 0) holdUntil = clock + 900 * p.speed;
        if (holdUntil > 0 && clock >= holdUntil && clock >= endT) finish();
      };
      this.app.ticker.add(tick);
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
        if (MELEE_VFX.has(vfx) && enemyTargets.length === 1) this.lunge(u, enemyTargets[0]);
        else if (enemyTargets.length) {
          this.castPose(u);
          for (const tg of enemyTargets.slice(0, 6)) this.projectile(u, tg, VFX_COLOR[vfx] ?? 0xffffff, vfx);
        } else {
          this.castPose(u);
          for (const tg of targets) this.burst(tg.baseX, tg.baseY - 30, VFX_COLOR[vfx] ?? 0x7ae07a, 6);
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
        const text = t(`mech.${e.m}`);
        this.banner(text);
        if (target) this.burst(target.baseX, target.baseY - 30, 0xe040ff, 10);
        if (e.m === 'sandstorm') this.shake = 4;
        sfx('mech');
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
    this.tween(140, (k) => (u.flash.alpha = alpha * (1 - k)));
  }

  private slash(tg: UnitView) {
    const g = new Graphics();
    const s = tg.scale;
    for (let i = 0; i < 6; i++) g.rect(-8 * s + i * 3 * s, -24 * s + i * 3 * s, 2 * s, 2 * s).fill(0xffffff);
    g.position.set(tg.baseX, tg.baseY);
    this.fx.addChild(g);
    this.tween(160, (k) => (g.alpha = 1 - k), () => g.destroy());
  }

  private projectile(from: UnitView, to: UnitView, color: number, vfx: string) {
    const g = new Graphics();
    const sz = Math.max(3, from.scale * 1.5);
    if (vfx === 'arrow') g.rect(-sz * 2, -1, sz * 4, 2).fill(color);
    else g.rect(-sz / 2, -sz / 2, sz, sz).fill(color);
    const sx = from.baseX + (from.snap.side === 0 ? 10 : -10);
    const sy = from.baseY - 18 * from.scale;
    const ex = to.baseX;
    const ey = to.baseY - 16 * to.scale;
    g.position.set(sx, sy);
    this.fx.addChild(g);
    this.tween(
      170,
      (k) => {
        g.x = sx + (ex - sx) * k;
        g.y = sy + (ey - sy) * k - Math.sin(k * Math.PI) * 12;
        if (vfx !== 'arrow' && Math.random() < 0.6) {
          const p = new Graphics().rect(-1, -1, 2, 2).fill(color);
          p.position.set(g.x, g.y);
          this.fx.addChild(p);
          this.tween(200, (kk) => (p.alpha = 1 - kk), () => p.destroy());
        }
      },
      () => {
        g.destroy();
        this.burst(ex, ey, color, 7);
      },
    );
  }

  private burst(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const s = 2 + Math.floor(Math.random() * 3);
      g.rect(-s / 2, -s / 2, s, s).fill(color);
      g.position.set(x, y);
      this.fx.addChild(g);
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
        () => g.destroy(),
      );
    }
  }

  private floater(u: UnitView, text: string, color: string, size: number) {
    const tx = new Text({ text, style: numStyle(size, color) });
    tx.anchor.set(0.5, 1);
    const x0 = u.baseX + (Math.random() - 0.5) * 18;
    const y0 = u.baseY + u.headY - 6;
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
    const tx = new Text({ text, style: numStyle(size, '#' + color.toString(16).padStart(6, '0')) });
    tx.anchor.set(0.5, 1);
    tx.position.set(Math.max(50, Math.min(this.W - 50, u.baseX)), u.baseY + u.headY - 22);
    this.ui.addChild(tx);
    this.tween(900, (k) => (tx.alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1), () => tx.destroy());
  }

  private banner(text: string) {
    const tx = new Text({ text, style: numStyle(16, '#e040ff') });
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
    const tx = new Text({ text, style: numStyle(size, color) });
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

  private update(dt: number) {
    this.time += dt;
    // параллакс
    const speeds = [2, 5, 9];
    this.layers.forEach((l, i) => (l.tilePosition.x -= (speeds[i] * dt) / 1000));
    // частицы погоды
    const g = this.particleG;
    g.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000 + Math.sin((this.time + i * 300) / 700) * 0.1;
      if (p.x < -8 || p.x > this.W + 8 || p.y < -8 || p.y > this.H + 8) this.particles[i] = this.spawnParticle();
      g.rect(Math.round(p.x), Math.round(p.y), p.size, p.size).fill({ color: p.color, alpha: 0.8 });
    }
    // дыхание юнитов
    for (const u of this.units.values()) {
      if (u.alive) u.sprite.y = Math.sin(this.time / 380 + u.bobPhase) * 1.2;
      u.flash.y = u.sprite.y;
      u.drawStatuses(this.time);
    }
    // твины
    this.tweens = this.tweens.filter((tw) => tw.update(dt));
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
