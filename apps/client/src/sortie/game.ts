/**
 * «Вылазка» — экшен в духе Vampire Survivors поверх PixiJS. Игрок ведёт героя пальцем (виртуальный
 * джойстик) или WASD/стрелками; оружие класса бьёт само. Враги акта идут волнами, элитные стреляют,
 * через 5 минут приходит босс акта. Кристаллы опыта дают уровни, на уровне — выбор из трёх карточек
 * (оружие, союзник, умение, связка). Сервер получает только итог: время, убийства, победа над боссом.
 */
import {
  ACTS,
  COMBOS,
  ENEMY_MAP,
  HEROINE_MAP,
  SORTIE_ALLIES,
  SORTIE_BOSS_AT,
  SORTIE_MAX_LEVEL,
  SORTIE_PASSIVES,
  SORTIE_WEAPON_OF,
  sortieXpNeed,
  type ClassId,
  type SortiePassiveId,
  type SortieTier,
  type SortieWeaponId,
} from '@idle/shared';
import { Application, BitmapFont, BitmapText, Container, Graphics, Sprite, Texture, TextureSource, TilingSprite } from 'pixi.js';
import { unitCanvas } from '../art/runtime';
import { PIXEL_FONT, loadPixelFont } from '../styles/pixelFont';

TextureSource.defaultOptions.scaleMode = 'nearest';

export interface SortieSetup {
  hero: string;
  /** облики героев Легиона (для героя и союзников) */
  skins: Record<string, string | undefined>;
  /** кто может присоединиться союзником */
  roster: string[];
  tier: SortieTier;
  act: number;
  /** множитель урона и здоровья от прокачки героя */
  power: number;
}

export type SortieCard =
  | { kind: 'weapon'; hero: string; weapon: SortieWeaponId; level: number }
  | { kind: 'ally'; hero: string }
  | { kind: 'passive'; passive: SortiePassiveId; level: number }
  | { kind: 'combo'; combo: string }
  | { kind: 'heal' };

export interface SortieHud {
  time: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNeed: number;
  kills: number;
  boss: { hp: number; max: number; name: string } | null;
  party: string[];
}

export interface SortieResult {
  time: number;
  kills: number;
  level: number;
  boss: boolean;
  win: boolean;
}

interface Callbacks {
  hud: (h: SortieHud) => void;
  levelUp: (cards: SortieCard[]) => void;
  end: (r: SortieResult) => void;
}

interface Enemy {
  id: number;
  ref: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  r: number;
  kind: 'normal' | 'elite' | 'boss';
  sp: Sprite;
  frame: number;
  flash: number;
  kx: number;
  ky: number;
  slowUntil: number;
  rootUntil: number;
  dazedUntil: number;
  burnUntil: number;
  poison: number;
  poisonUntil: number;
  shootAt: number;
  xp: number;
  dead?: boolean;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  life: number;
  kind: 'dagger' | 'arrow' | 'fireball' | 'bolt' | 'wave';
  hits: Set<number>;
  sp: Sprite;
  radius: number;
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  sp: Sprite;
}

interface Pickup {
  x: number;
  y: number;
  kind: 'gem' | 'chest' | 'heart';
  xp: number;
  sp: Sprite;
  pull: boolean;
  done?: boolean;
}

interface Weapon {
  hero: string;
  id: SortieWeaponId;
  lvl: number;
  timer: number;
}

interface Ally {
  hero: string;
  sp: Sprite;
  x: number;
  y: number;
}

interface Wolf {
  x: number;
  y: number;
  sp: Sprite;
  target: Enemy | null;
  bite: number;
}

interface Fx {
  g: Graphics | Sprite | BitmapText;
  life: number;
  max: number;
  vy?: number;
}

const NUM_FONT = 'sortie-num';
let fontReady = false;

/** Параметры оружия на уровне 1–5. */
function wstats(id: SortieWeaponId, lvl: number) {
  const k = lvl - 1;
  switch (id) {
    case 'blade':
      return { dmg: 22 * (1 + 0.28 * k), cd: 1.15 - 0.08 * k, radius: 38 + 5 * k, count: 1, full: true, speed: 0, pierce: 0 };
    case 'daggers':
      return { dmg: 10 * (1 + 0.22 * k), cd: 0.75 - 0.05 * k, radius: 0, count: 2 + k, full: false, speed: 300, pierce: lvl >= 3 ? 2 : 1 };
    case 'aura':
      return { dmg: 6 * (1 + 0.3 * k), cd: 0.5, radius: 32 + 6 * k, count: 1, full: true, speed: 0, pierce: 0 };
    case 'arrows':
      return { dmg: 17 * (1 + 0.24 * k), cd: 0.85 - 0.06 * k, radius: 0, count: 1 + Math.floor(k / 2), full: false, speed: 430, pierce: 2 + Math.floor(lvl / 2) };
    case 'fireball':
      return { dmg: 26 * (1 + 0.27 * k), cd: 1.4 - 0.08 * k, radius: 30 + 4 * k, count: 1 + Math.floor(k / 2), full: false, speed: 210, pierce: 1 };
    case 'bolts':
      return { dmg: 30 * (1 + 0.26 * k), cd: 1.1 - 0.07 * k, radius: 0, count: 1, full: false, speed: 380, pierce: 1 + Math.floor(lvl / 3) };
  }
}

export class SortieGame {
  private app = new Application();
  private world = new Container();
  private ground!: TilingSprite;
  private layerFx = new Container();
  private layerUnits = new Container();
  private layerTop = new Container();
  private ui = new Container();
  private joyG = new Graphics();
  private auraG = new Graphics();
  private destroyed = false;
  private ready = false;
  private zoom = 1.6;
  private texCache = new Map<HTMLCanvasElement, Texture>();
  private gfx: Record<string, Texture> = {};

  // состояние забега
  private t = 0;
  private hudAt = 0;
  private paused = false;
  private choosing = false;
  private over = false;
  private px = 0;
  private py = 0;
  private faceX = 1;
  private faceY = 0;
  private hp = 100;
  private maxHp = 100;
  private iframes = 0;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private pending = 0;
  private bossSpawned = false;
  private bossDead = false;
  private boss: Enemy | null = null;
  private nextId = 1;
  private spawnBudget = 0;
  private heroSp!: Sprite;
  private heroFrame = 0;
  private attackUntil = 0;
  private trail: [number, number][] = [];

  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private orbs: Orb[] = [];
  private pickups: Pickup[] = [];
  private fx: Fx[] = [];
  private weapons: Weapon[] = [];
  private allies: Ally[] = [];
  private wolves: Wolf[] = [];
  private passives: Partial<Record<SortiePassiveId, number>> = {};
  private combos = new Set<string>();
  private eliteAt = [60, 120, 180, 240];
  private swarmAt = [90, 210];

  // ввод
  private joy: { ox: number; oy: number; x: number; y: number; id: number } | null = null;
  private keys = new Set<string>();

  constructor(
    private host: HTMLElement,
    private setup: SortieSetup,
    private cb: Callbacks,
  ) {}

  async init() {
    await loadPixelFont();
    const w = this.host.clientWidth || 360;
    const h = this.host.clientHeight || 600;
    await this.app.init({ width: w, height: h, background: '#0e0a0c', antialias: false, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true, preference: 'webgl' });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    const cv = this.app.canvas;
    cv.style.width = '100%';
    cv.style.height = '100%';
    cv.style.display = 'block';
    cv.style.touchAction = 'none';
    cv.style.imageRendering = 'pixelated';
    this.host.appendChild(cv);
    this.zoom = Math.max(1.5, Math.min(2.6, w / 195));
    this.installFont();
    this.makeTextures();

    this.ground = new TilingSprite({ texture: this.gfx.ground, width: w, height: h });
    this.app.stage.addChild(this.ground);
    this.world.scale.set(this.zoom);
    this.world.addChild(this.auraG, this.layerFx, this.layerUnits, this.layerTop);
    this.layerUnits.sortableChildren = true;
    this.app.stage.addChild(this.world, this.ui);
    this.ui.addChild(this.joyG);

    // герой и его оружие
    this.heroSp = new Sprite(this.heroTex(this.setup.hero, 'idle'));
    this.heroSp.anchor.set(0.5, 0.9);
    this.heroSp.scale.set(0.62);
    this.layerUnits.addChild(this.heroSp);
    const h0 = HEROINE_MAP[this.setup.hero];
    this.weapons.push({ hero: this.setup.hero, id: SORTIE_WEAPON_OF[h0.cls].id, lvl: 1, timer: 0.3 });
    this.maxHp = Math.round(140 * this.setup.power);
    this.hp = this.maxHp;
    if (SORTIE_WEAPON_OF[h0.cls].id === 'bolts') this.addWolf();

    cv.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.app.ticker.add((tk) => this.tick(Math.min(0.05, tk.deltaMS / 1000)));
    this.ready = true;
    this.emitHud();
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    if (this.ready) {
      this.app.canvas.removeEventListener('pointerdown', this.onDown);
      this.app.destroy(true, { children: true });
    }
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  /** Итог забега прямо сейчас (выход до конца). */
  result(): SortieResult {
    return { time: Math.floor(this.t), kills: this.kills, level: this.level, boss: this.bossDead, win: this.bossDead };
  }

  /** Выбор карточки уровня. */
  choose(card: SortieCard) {
    if (!this.choosing) return;
    switch (card.kind) {
      case 'weapon': {
        const w = this.weapons.find((x) => x.hero === card.hero);
        if (w) w.lvl = Math.min(SORTIE_MAX_LEVEL, w.lvl + 1);
        break;
      }
      case 'ally':
        this.addAlly(card.hero);
        break;
      case 'passive': {
        this.passives[card.passive] = (this.passives[card.passive] ?? 0) + 1;
        if (card.passive === 'vigor') {
          const old = this.maxHp;
          this.maxHp = Math.round(140 * this.setup.power * (1 + 0.2 * (this.passives.vigor ?? 0)));
          this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - old) + this.maxHp * 0.2);
        }
        break;
      }
      case 'combo':
        this.combos.add(card.combo);
        if (card.combo === 'hunt') this.addWolf();
        break;
      case 'heal':
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.35);
        break;
    }
    this.pending--;
    this.choosing = false;
    this.emitHud();
  }

  // ——— ввод ———

  private onDown = (e: PointerEvent) => {
    if (this.joy) return;
    const r = this.app.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    this.joy = { ox: x, oy: y, x, y, id: e.pointerId };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.joy || e.pointerId !== this.joy.id) return;
    const r = this.app.canvas.getBoundingClientRect();
    this.joy.x = e.clientX - r.left;
    this.joy.y = e.clientY - r.top;
  };
  private onUp = (e: PointerEvent) => {
    if (this.joy && e.pointerId === this.joy.id) this.joy = null;
  };
  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'ц', 'ф', 'ы', 'в'].includes(k)) return;
    if (e.type === 'keydown') this.keys.add(k);
    else this.keys.delete(k);
  };

  private inputDir(): [number, number] {
    let dx = 0;
    let dy = 0;
    const k = this.keys;
    if (k.has('a') || k.has('ф') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('в') || k.has('arrowright')) dx += 1;
    if (k.has('w') || k.has('ц') || k.has('arrowup')) dy -= 1;
    if (k.has('s') || k.has('ы') || k.has('arrowdown')) dy += 1;
    if (this.joy) {
      const jx = this.joy.x - this.joy.ox;
      const jy = this.joy.y - this.joy.oy;
      const len = Math.hypot(jx, jy);
      if (len > 6) {
        const m = Math.min(1, len / 40);
        dx = (jx / len) * m;
        dy = (jy / len) * m;
      }
    }
    const len = Math.hypot(dx, dy);
    return len > 1 ? [dx / len, dy / len] : [dx, dy];
  }

  // ——— текстуры ———

  private installFont() {
    if (fontReady) return;
    BitmapFont.install({
      name: NUM_FONT,
      style: { fontFamily: `${PIXEL_FONT}, Manrope, sans-serif`, fontSize: 16, fontWeight: '600', fill: '#ffffff', stroke: { color: '#1a1016', width: 4 } },
      chars: [['0', '9'], '+!КK.'],
      resolution: Math.min(2, window.devicePixelRatio || 1),
      padding: 3,
    });
    fontReady = true;
  }

  private canvasTex(c: HTMLCanvasElement): Texture {
    let t = this.texCache.get(c);
    if (!t) {
      t = Texture.from(c);
      this.texCache.set(c, t);
    }
    return t;
  }

  private heroTex(hero: string, arms: 'idle' | 'idle2' | 'attack'): Texture {
    return this.canvasTex(unitCanvas(hero, { skin: this.setup.skins[hero] }, { arms }));
  }

  private enemyTex(ref: string, frame: number): Texture {
    return this.canvasTex(unitCanvas(ref, {}, { arms: frame ? 'idle2' : 'idle' }));
  }

  private makeTextures() {
    const r = this.app.renderer;
    const make = (draw: (g: Graphics) => void) => {
      const g = new Graphics();
      draw(g);
      const t = r.generateTexture(g);
      g.destroy();
      return t;
    };
    this.gfx.gem = make((g) => g.poly([3, 0, 6, 4, 3, 8, 0, 4]).fill(0x6fd0ff).poly([3, 0, 6, 4, 3, 4]).fill(0xd8f6ff));
    this.gfx.gemBig = make((g) => g.poly([5, 0, 10, 6, 5, 12, 0, 6]).fill(0xe040ff).poly([5, 0, 10, 6, 5, 6]).fill(0xffb8ff));
    this.gfx.chest = make((g) => g.rect(0, 2, 12, 9).fill(0x8a5a2a).rect(0, 0, 12, 4).fill(0xe8b840).rect(5, 3, 2, 3).fill(0xfff2a0));
    this.gfx.heart = make((g) => g.circle(3, 3, 3).fill(0xff4a6a).circle(8, 3, 3).fill(0xff4a6a).poly([0, 4, 11, 4, 5.5, 10]).fill(0xff4a6a));
    this.gfx.dagger = make((g) => g.rect(0, 1, 7, 2).fill(0xe6eef8).rect(7, 0, 2, 4).fill(0xb06ae0));
    this.gfx.arrow = make((g) => g.rect(0, 1, 10, 1).fill(0xc8a070).poly([10, 0, 13, 1.5, 10, 3]).fill(0xe6eef8).rect(0, 0, 2, 3).fill(0x7acf5a));
    this.gfx.bolt = make((g) => g.rect(0, 1, 9, 2).fill(0x8a6a4a).poly([9, 0, 13, 2, 9, 4]).fill(0xcfefff));
    this.gfx.fireball = make((g) => g.circle(5, 5, 5).fill(0xff7a2a).circle(5, 5, 3).fill(0xffe080));
    this.gfx.wave = make((g) => g.poly([0, 0, 6, 4, 0, 8, 2, 4]).fill(0xfff2c0));
    this.gfx.orb = make((g) => g.circle(4, 4, 4).fill(0xe040ff).circle(4, 4, 2).fill(0xffc8ff));
    this.gfx.shadow = make((g) => g.ellipse(10, 4, 10, 4).fill({ color: 0x000000, alpha: 0.35 }));
    // земля акта: пятна травы/песка/снега, камешки и цветы
    const act = ACTS[Math.max(0, Math.min(ACTS.length - 1, this.setup.act - 1))];
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = act.bg.mid;
    ctx.fillRect(0, 0, 96, 96);
    let seed = this.setup.act * 977 + 13;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 3 ? act.bg.far : act.bg.near;
      ctx.globalAlpha = 0.35 + rnd() * 0.3;
      ctx.fillRect(Math.floor(rnd() * 96), Math.floor(rnd() * 96), 1 + Math.floor(rnd() * 2), 1);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = ['#f2e6a0', '#f4b8cc', '#cfefff', '#e6e6f0'][i % 4];
      ctx.fillRect(Math.floor(rnd() * 94), Math.floor(rnd() * 94), 1, 1);
    }
    this.gfx.ground = Texture.from(c);
  }

  // ——— союзники и волки ———

  private addAlly(hero: string) {
    if (this.allies.length >= SORTIE_ALLIES || this.allies.some((a) => a.hero === hero) || hero === this.setup.hero) return;
    const sp = new Sprite(this.heroTex(hero, 'idle'));
    sp.anchor.set(0.5, 0.9);
    sp.scale.set(0.5);
    this.layerUnits.addChild(sp);
    this.allies.push({ hero, sp, x: this.px, y: this.py });
    const cls = HEROINE_MAP[hero].cls;
    const wid = SORTIE_WEAPON_OF[cls].id;
    this.weapons.push({ hero, id: wid, lvl: 1, timer: 0.5 });
    if (wid === 'bolts') this.addWolf();
  }

  private addWolf() {
    const sp = new Sprite(this.enemyTex('wolf', 0));
    sp.anchor.set(0.5, 0.9);
    sp.scale.set(0.45);
    this.layerUnits.addChild(sp);
    this.wolves.push({ x: this.px - 20, y: this.py + 10, sp, target: null, bite: 0 });
  }

  private partyClasses(): ClassId[] {
    return [this.setup.hero, ...this.allies.map((a) => a.hero)].map((h) => HEROINE_MAP[h].cls);
  }

  // ——— карточки уровня ———

  private makeCards(): SortieCard[] {
    const pool: { card: SortieCard; w: number }[] = [];
    for (const w of this.weapons) if (w.lvl < SORTIE_MAX_LEVEL) pool.push({ card: { kind: 'weapon', hero: w.hero, weapon: w.id, level: w.lvl + 1 }, w: 3 });
    if (this.allies.length < SORTIE_ALLIES) {
      const free = this.setup.roster.filter((h) => h !== this.setup.hero && !this.allies.some((a) => a.hero === h));
      for (const h of free) pool.push({ card: { kind: 'ally', hero: h }, w: 2.2 });
    }
    for (const p of SORTIE_PASSIVES) {
      const lv = this.passives[p.id] ?? 0;
      if (lv < SORTIE_MAX_LEVEL) pool.push({ card: { kind: 'passive', passive: p.id, level: lv + 1 }, w: 1.4 });
    }
    const cls = this.partyClasses();
    for (const c of COMBOS) {
      if (this.combos.has(c.id)) continue;
      if (cls.includes(c.from) && c.to.some((x) => cls.includes(x) && (x !== c.from || cls.filter((y) => y === x).length > 1 || c.id === 'hunt')))
        pool.push({ card: { kind: 'combo', combo: c.id }, w: 4 });
    }
    const out: SortieCard[] = [];
    while (out.length < 3 && pool.length) {
      const total = pool.reduce((a, b) => a + b.w, 0);
      let r = Math.random() * total;
      let i = 0;
      for (; i < pool.length - 1; i++) {
        r -= pool[i].w;
        if (r <= 0) break;
      }
      out.push(pool[i].card);
      pool.splice(i, 1);
    }
    while (out.length < 3) out.push({ kind: 'heal' });
    return out;
  }

  // ——— модификаторы ———

  private dmgMult() {
    return this.setup.power * (1 + 0.12 * (this.passives.fury ?? 0)) * (this.combos.has('hunt') ? 1.2 : 1) * (this.combos.has('grace') ? 1.15 : 1);
  }
  private cdMult() {
    return 1 - 0.08 * (this.passives.haste ?? 0);
  }
  private crit() {
    return 0.05 + 0.08 * (this.passives.luck ?? 0);
  }

  // ——— цикл ———

  private tick(dt: number) {
    if (this.destroyed || this.over) return;
    if (!this.paused && !this.choosing) {
      if (this.pending > 0) {
        this.choosing = true;
        this.emitHud();
        this.cb.levelUp(this.makeCards());
      } else this.step(dt);
    }
    this.draw();
  }

  private step(dt: number) {
    this.t += dt;
    const t = this.t;
    // движение героя
    const [dx, dy] = this.inputDir();
    const speed = 72 * (1 + 0.12 * (this.passives.swift ?? 0));
    this.px += dx * speed * dt;
    this.py += dy * speed * dt;
    if (Math.abs(dx) + Math.abs(dy) > 0.1) {
      const l = Math.hypot(dx, dy);
      this.faceX = dx / l;
      this.faceY = dy / l;
      this.trail.unshift([this.px, this.py]);
      if (this.trail.length > 80) this.trail.length = 80;
    }
    this.heroFrame += dt * (Math.abs(dx) + Math.abs(dy) > 0.1 ? 6 : 2);
    // восстановление
    if (this.passives.regen) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.006 * this.passives.regen * dt);
    this.iframes = Math.max(0, this.iframes - dt);

    this.spawn(dt);
    this.updateAllies(dt);
    this.fireWeapons(dt);
    this.updateWolves(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    // убитые оружием и взрывами в этом кадре — из списка, их спрайты уже уничтожены
    this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.hp <= 0) return this.finish(false);
    if (this.bossDead) return this.finish(true);
    if (t >= SORTIE_BOSS_AT + 240) return this.finish(false);
    if (t - this.hudAt > 0.1) this.emitHud();
  }

  private finish(win: boolean) {
    this.over = true;
    this.emitHud();
    this.cb.end({ time: Math.floor(this.t), kills: this.kills, level: this.level, boss: this.bossDead, win });
  }

  private emitHud() {
    this.hudAt = this.t;
    this.cb.hud({
      time: this.t,
      hp: Math.max(0, this.hp),
      maxHp: this.maxHp,
      level: this.level,
      xp: this.xp,
      xpNeed: sortieXpNeed(this.level),
      kills: this.kills,
      boss: this.boss && !this.boss.dead ? { hp: this.boss.hp, max: this.boss.maxHp, name: ENEMY_MAP[this.boss.ref]?.name.ru ?? '' } : null,
      party: [this.setup.hero, ...this.allies.map((a) => a.hero)],
    });
  }

  // ——— враги ———

  private viewR() {
    const w = this.app.screen.width / this.zoom;
    const h = this.app.screen.height / this.zoom;
    return Math.hypot(w, h) / 2 + 16;
  }

  private spawn(dt: number) {
    const t = this.t;
    const act = ACTS[Math.max(0, Math.min(ACTS.length - 1, this.setup.act - 1))];
    const rate = this.bossSpawned ? 1.2 : 0.9 + (t / SORTIE_BOSS_AT) * 5.2;
    this.spawnBudget += rate * dt;
    while (this.spawnBudget >= 1 && this.enemies.length < 220) {
      this.spawnBudget -= 1;
      this.addEnemy(act.enemies[Math.floor(Math.random() * act.enemies.length)], 'normal');
    }
    if (this.eliteAt.length && t >= this.eliteAt[0]) {
      this.eliteAt.shift();
      this.addEnemy(act.minis[Math.floor(Math.random() * act.minis.length)], 'elite');
    }
    if (this.swarmAt.length && t >= this.swarmAt[0]) {
      this.swarmAt.shift();
      for (let i = 0; i < 24; i++) this.addEnemy(act.enemies[i % act.enemies.length], 'normal', (i / 24) * Math.PI * 2);
    }
    if (!this.bossSpawned && t >= SORTIE_BOSS_AT) {
      this.bossSpawned = true;
      this.boss = this.addEnemy(act.boss, 'boss');
    }
  }

  private addEnemy(ref: string, kind: Enemy['kind'], angle = Math.random() * Math.PI * 2): Enemy {
    const t = this.t;
    const tier = this.setup.tier.enemy;
    const role = ENEMY_MAP[ref]?.role ?? 'brute';
    const roleHp = { tank: 2, brute: 1.5, rogue: 0.7, ranged: 0.9, caster: 0.9, healer: 1 }[role] ?? 1;
    const roleSp = { tank: 0.7, brute: 0.85, rogue: 1.35, ranged: 1, caster: 0.95, healer: 1 }[role] ?? 1;
    const baseHp = 14 * (1 + t / 40) * tier;
    const mult = kind === 'boss' ? 110 : kind === 'elite' ? 18 : 1;
    const R = this.viewR();
    const e: Enemy = {
      id: this.nextId++,
      ref,
      x: this.px + Math.cos(angle) * R,
      y: this.py + Math.sin(angle) * R,
      hp: baseHp * roleHp * mult,
      maxHp: baseHp * roleHp * mult,
      speed: (kind === 'boss' ? 24 : kind === 'elite' ? 30 : 30 + t / 14 + Math.random() * 6) * roleSp,
      dmg: 4.5 * (1 + t / 120) * tier * (kind === 'boss' ? 2.2 : kind === 'elite' ? 1.6 : 1),
      r: kind === 'boss' ? 20 : kind === 'elite' ? 13 : 8,
      kind,
      sp: new Sprite(this.enemyTex(ref, 0)),
      frame: Math.random() * 10,
      flash: 0,
      kx: 0,
      ky: 0,
      slowUntil: 0,
      rootUntil: 0,
      dazedUntil: 0,
      burnUntil: 0,
      poison: 0,
      poisonUntil: 0,
      shootAt: t + 2 + Math.random() * 2,
      xp: kind === 'elite' ? 12 : 1 + Math.floor(t / 100),
    };
    e.sp.anchor.set(0.5, 0.9);
    e.sp.scale.set(kind === 'boss' ? 1.05 : kind === 'elite' ? 0.78 : 0.5);
    this.layerUnits.addChild(e.sp);
    this.enemies.push(e);
    return e;
  }

  private updateEnemies(dt: number) {
    const t = this.t;
    // сетка для расталкивания
    const grid = new Map<number, Enemy[]>();
    const key = (x: number, y: number) => (Math.floor(x / 24) & 0xffff) * 65536 + (Math.floor(y / 24) & 0xffff);
    for (const e of this.enemies) {
      const k = key(e.x, e.y);
      const cell = grid.get(k);
      if (cell) cell.push(e);
      else grid.set(k, [e]);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = this.px - e.x;
      const dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      // слишком далеко — переносим ближе к герою
      if (d > this.viewR() * 1.8 && e.kind === 'normal') {
        const a = Math.random() * Math.PI * 2;
        e.x = this.px + Math.cos(a) * this.viewR();
        e.y = this.py + Math.sin(a) * this.viewR();
        continue;
      }
      let sp = e.speed * (t < e.slowUntil ? 0.5 : 1);
      if (t < e.rootUntil) sp = 0;
      let mx = (dx / d) * sp;
      let my = (dy / d) * sp;
      // расталкивание соседей
      const cx = Math.floor(e.x / 24);
      const cy = Math.floor(e.y / 24);
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(((cx + ox) & 0xffff) * 65536 + ((cy + oy) & 0xffff));
          if (!cell) continue;
          for (const o of cell) {
            if (o === e) continue;
            const ex = e.x - o.x;
            const ey = e.y - o.y;
            const dd = ex * ex + ey * ey;
            const min = e.r + o.r;
            if (dd > 0 && dd < min * min) {
              const l = Math.sqrt(dd);
              mx += (ex / l) * (min - l) * 6;
              my += (ey / l) * (min - l) * 6;
            }
          }
        }
      e.x += (mx + e.kx) * dt;
      e.y += (my + e.ky) * dt;
      e.kx *= Math.pow(0.02, dt);
      e.ky *= Math.pow(0.02, dt);
      e.frame += dt * 4;
      e.flash = Math.max(0, e.flash - dt);
      // яд и горение
      if (t < e.poisonUntil) this.damage(e, e.poison * dt, false, true);
      if (t < e.burnUntil) this.damage(e, 3 * this.dmgMult() * dt, false, true);
      // касание героя
      if (d < e.r + 7 && this.iframes <= 0) this.hurt(e.dmg);
      // стрелки: элита и босс
      if (e.kind !== 'normal' && t >= e.shootAt) {
        if (e.kind === 'boss') {
          e.shootAt = t + 2.6;
          const n = 12;
          const off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) this.addOrb(e.x, e.y - 10, off + (i / n) * Math.PI * 2, 70, e.dmg * 0.6);
          if (Math.random() < 0.6) for (const s of [-0.2, 0, 0.2]) this.addOrb(e.x, e.y - 10, Math.atan2(dy, dx) + s, 110, e.dmg * 0.6);
        } else {
          e.shootAt = t + 2.4;
          this.addOrb(e.x, e.y - 8, Math.atan2(dy, dx), 100, e.dmg * 0.8);
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  private addOrb(x: number, y: number, a: number, speed: number, dmg: number) {
    const sp = new Sprite(this.gfx.orb);
    sp.anchor.set(0.5);
    this.layerTop.addChild(sp);
    this.orbs.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, life: 5, sp });
  }

  private updateOrbs(dt: number) {
    for (const o of this.orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (Math.hypot(o.x - this.px, o.y - (this.py - 8)) < 7 && this.iframes <= 0) {
        this.hurt(o.dmg);
        o.life = 0;
      }
      if (o.life <= 0) o.sp.destroy();
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);
  }

  private hurt(dmg: number) {
    const armour = 1 - 0.1 * (this.passives.guard ?? 0);
    this.hp -= dmg * armour;
    this.iframes = 0.6;
    this.heroSp.tint = 0xff6060;
  }

  /** Урон по врагу: крит, вспышка, цифры; смерть — кристалл опыта. */
  private damage(e: Enemy, dmg: number, crit = false, dot = false) {
    if (e.dead) return;
    e.hp -= dmg;
    if (!dot) {
      e.flash = 0.08;
      if (crit || dmg > e.maxHp * 0.25 || Math.random() < 0.35) this.number(e.x, e.y - e.r * 2.2, dmg, crit);
    }
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy) {
    e.dead = true;
    e.sp.destroy();
    this.kills++;
    this.puff(e.x, e.y - 6, e.kind === 'normal' ? 0xf2e6d8 : 0xe040ff, e.kind === 'normal' ? 5 : 14);
    if (e.kind === 'boss') {
      this.bossDead = true;
      return;
    }
    this.drop(e.x, e.y, 'gem', e.xp);
    if (e.kind === 'elite') this.drop(e.x + 10, e.y, 'chest', 0);
    else if (Math.random() < 0.007) this.drop(e.x, e.y, 'heart', 0);
  }

  private hit(e: Enemy, base: number) {
    const crit = Math.random() < this.crit();
    this.damage(e, base * this.dmgMult() * (crit ? 2 : 1), crit);
  }

  // ——— оружие ———

  private ownerPos(hero: string): [number, number] {
    if (hero === this.setup.hero) return [this.px, this.py];
    const a = this.allies.find((x) => x.hero === hero);
    return a ? [a.x, a.y] : [this.px, this.py];
  }

  private nearest(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range * range;
    for (const e of this.enemies) {
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private fireWeapons(dt: number) {
    const cdm = this.cdMult();
    for (const w of this.weapons) {
      const s = wstats(w.id, w.lvl);
      const [ox, oy] = this.ownerPos(w.hero);
      if (w.id === 'aura') {
        w.timer -= dt;
        if (w.timer <= 0) {
          w.timer = s.cd;
          for (const e of this.enemies) if (Math.hypot(e.x - ox, e.y - oy) < s.radius + e.r) this.hit(e, s.dmg);
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.003 * (this.combos.has('grace') ? 2 : 1) * w.lvl);
        }
        continue;
      }
      w.timer -= dt;
      if (w.timer > 0) continue;
      w.timer = s.cd * cdm;
      if (w.hero === this.setup.hero) this.attackUntil = this.t + 0.2;
      switch (w.id) {
        case 'blade': {
          const fa = Math.atan2(this.faceY, this.faceX);
          for (const e of this.enemies) {
            const ex = e.x - ox;
            const ey = e.y - 6 - oy;
            const d = Math.hypot(ex, ey);
            if (d > s.radius + e.r) continue;
            let da = Math.abs(Math.atan2(ey, ex) - fa);
            if (da > Math.PI) da = Math.PI * 2 - da;
            if (!s.full && da > 1.75) continue;
            const crush = this.combos.has('crush') && this.t < e.rootUntil ? 1.6 : 1;
            this.hit(e, s.dmg * crush);
            e.dazedUntil = this.t + 1.5;
            e.kx += (ex / (d || 1)) * 80;
            e.ky += (ey / (d || 1)) * 80;
          }
          this.slash(ox, oy - 6, fa, s.radius, s.full);
          if (w.lvl >= 5) this.shoot('wave', ox, oy - 6, fa, 260, s.dmg * 0.8, 99, 0);
          break;
        }
        case 'daggers': {
          const tg = this.nearest(ox, oy, 230);
          const a = tg ? Math.atan2(tg.y - 6 - (oy - 6), tg.x - ox) : Math.atan2(this.faceY, this.faceX);
          for (let i = 0; i < s.count; i++) this.shoot('dagger', ox, oy - 8, a + (i - (s.count - 1) / 2) * 0.16, s.speed, s.dmg, s.pierce, 0);
          break;
        }
        case 'arrows': {
          const tg = this.nearest(ox, oy, 300);
          const a = tg ? Math.atan2(tg.y - 6 - (oy - 8), tg.x - ox) : Math.atan2(this.faceY, this.faceX);
          for (let i = 0; i < s.count; i++) this.shoot('arrow', ox, oy - 8, a + (i - (s.count - 1) / 2) * 0.1, s.speed, s.dmg, s.pierce, 0);
          break;
        }
        case 'fireball': {
          for (let i = 0; i < s.count; i++) {
            const pool = this.enemies.filter((e) => Math.hypot(e.x - ox, e.y - oy) < 220);
            const tg = pool[Math.floor(Math.random() * pool.length)];
            const a = tg ? Math.atan2(tg.y - 6 - (oy - 8), tg.x - ox) : Math.random() * Math.PI * 2;
            this.shoot('fireball', ox, oy - 8, a, s.speed, s.dmg, 1, s.radius);
          }
          break;
        }
        case 'bolts': {
          const tg = this.nearest(ox, oy, 300);
          const a = tg ? Math.atan2(tg.y - 6 - (oy - 8), tg.x - ox) : Math.atan2(this.faceY, this.faceX);
          this.shoot('bolt', ox, oy - 8, a, s.speed, s.dmg, s.pierce, 0);
          break;
        }
      }
    }
  }

  private shoot(kind: Shot['kind'], x: number, y: number, a: number, speed: number, dmg: number, pierce: number, radius: number) {
    const sp = new Sprite(this.gfx[kind]);
    sp.anchor.set(0.5);
    sp.rotation = a;
    this.layerTop.addChild(sp);
    this.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, pierce, life: kind === 'wave' ? 0.6 : 1.6, kind, hits: new Set(), sp, radius });
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      for (const e of this.enemies) {
        if (e.dead || s.hits.has(e.id)) continue;
        if (Math.abs(e.x - s.x) > e.r + 6 || Math.abs(e.y - e.r - s.y) > e.r + 8) continue;
        s.hits.add(e.id);
        this.shotHit(s, e);
        if (s.hits.size >= s.pierce) {
          s.life = 0;
          break;
        }
      }
      if (s.life <= 0) s.sp.destroy();
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private shotHit(s: Shot, e: Enemy) {
    const t = this.t;
    switch (s.kind) {
      case 'dagger': {
        const back = this.combos.has('backstab') && t < e.dazedUntil ? 2 : 1;
        this.hit(e, s.dmg * back);
        if (this.combos.has('decay')) {
          e.poison = Math.max(e.poison, s.dmg * 0.4 * this.dmgMult());
          e.poisonUntil = t + 3;
        }
        break;
      }
      case 'arrow':
      case 'bolt': {
        this.hit(e, s.dmg);
        if (this.combos.has('crush') && s.kind === 'arrow') e.rootUntil = t + 1.2;
        if (s.kind === 'bolt') e.slowUntil = t + 1;
        if (this.combos.has('detonate') && t < e.burnUntil) this.explode(e.x, e.y - 6, 26, s.dmg * 0.6, 0xff9a3a);
        break;
      }
      case 'fireball': {
        this.explode(s.x, s.y, s.radius, s.dmg, 0xff7a2a, true);
        break;
      }
      case 'wave':
        this.hit(e, s.dmg);
        break;
    }
  }

  private explode(x: number, y: number, r: number, dmg: number, color: number, burn = false) {
    const t = this.t;
    for (const e of this.enemies) {
      if (Math.hypot(e.x - x, e.y - 6 - y) > r + e.r) continue;
      let extra = 0;
      if (burn && this.combos.has('decay') && t < e.poisonUntil) {
        extra = e.poison * (e.poisonUntil - t) * 1.5;
        e.poisonUntil = 0;
      }
      this.hit(e, dmg + extra / this.dmgMult());
      if (burn) e.burnUntil = t + 2.5;
    }
    const g = new Graphics().circle(0, 0, r).fill({ color, alpha: 0.45 }).circle(0, 0, r * 0.55).fill({ color: 0xffe8a0, alpha: 0.5 });
    g.position.set(x, y);
    this.layerFx.addChild(g);
    this.fx.push({ g, life: 0.3, max: 0.3 });
  }

  private slash(x: number, y: number, a: number, r: number, full: boolean) {
    const g = new Graphics();
    if (full) g.circle(0, 0, r).stroke({ width: 4, color: 0xfff2c0, alpha: 0.8 });
    else g.arc(0, 0, r, a - 1.75, a + 1.75).stroke({ width: 5, color: 0xfff2c0, alpha: 0.85 });
    g.position.set(x, y);
    this.layerFx.addChild(g);
    this.fx.push({ g, life: 0.18, max: 0.18 });
  }

  private puff(x: number, y: number, color: number, r: number) {
    const g = new Graphics().circle(0, 0, r).fill({ color, alpha: 0.6 });
    g.position.set(x, y);
    this.layerFx.addChild(g);
    this.fx.push({ g, life: 0.25, max: 0.25 });
  }

  private number(x: number, y: number, v: number, crit: boolean) {
    if (this.fx.length > 70) return;
    const n = Math.round(v);
    const txt = n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.max(1, n));
    const tx = new BitmapText({ text: crit ? `${txt}!` : txt, style: { fontFamily: NUM_FONT, fontSize: crit ? 9 : 7 } });
    tx.tint = crit ? 0xffd24a : 0xffffff;
    tx.anchor.set(0.5, 1);
    tx.position.set(x + (Math.random() - 0.5) * 6, y);
    this.layerTop.addChild(tx);
    this.fx.push({ g: tx, life: 0.6, max: 0.6, vy: -24 });
  }

  private updateFx(dt: number) {
    for (const f of this.fx) {
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      f.g.alpha = k;
      if (f.vy) f.g.y += f.vy * dt;
      else if (f.g instanceof Graphics) f.g.scale.set(1 + (1 - k) * 0.3);
      if (f.life <= 0) f.g.destroy();
    }
    this.fx = this.fx.filter((f) => f.life > 0);
  }

  // ——— союзники и волки ———

  private updateAllies(dt: number) {
    this.allies.forEach((a, i) => {
      const p = this.trail[Math.min(this.trail.length - 1, (i + 1) * 14)] ?? [this.px - 14 * (i + 1), this.py + 6];
      a.x += (p[0] - a.x) * Math.min(1, dt * 6);
      a.y += (p[1] - a.y) * Math.min(1, dt * 6);
    });
  }

  private updateWolves(dt: number) {
    const s = wstats('bolts', this.weapons.find((w) => w.id === 'bolts')?.lvl ?? 1);
    for (const w of this.wolves) {
      if (!w.target || w.target.dead || Math.hypot(w.target.x - this.px, w.target.y - this.py) > 200) w.target = this.nearest(w.x, w.y, 150);
      const tx = w.target ? w.target.x : this.px - 18;
      const ty = w.target ? w.target.y : this.py + 8;
      const d = Math.hypot(tx - w.x, ty - w.y);
      const sp = w.target ? 120 : 90;
      if (d > 6) {
        w.x += ((tx - w.x) / d) * Math.min(d, sp * dt);
        w.y += ((ty - w.y) / d) * Math.min(d, sp * dt);
        w.sp.scale.x = (tx < w.x ? -1 : 1) * Math.abs(w.sp.scale.x);
      }
      w.bite -= dt;
      if (w.target && d < w.target.r + 8 && w.bite <= 0) {
        w.bite = 0.6;
        this.hit(w.target, s.dmg * 0.4);
        w.sp.texture = this.enemyTex('wolf', 1);
      } else if (w.bite < 0.45) w.sp.texture = this.enemyTex('wolf', 0);
    }
  }

  // ——— добыча ———

  private drop(x: number, y: number, kind: Pickup['kind'], xp: number) {
    const tex = kind === 'gem' ? (xp > 1 ? this.gfx.gemBig : this.gfx.gem) : kind === 'chest' ? this.gfx.chest : this.gfx.heart;
    const sp = new Sprite(tex);
    sp.anchor.set(0.5);
    this.layerFx.addChild(sp);
    this.pickups.push({ x, y, kind, xp, sp, pull: false });
    if (this.pickups.length > 400) {
      const old = this.pickups.shift()!;
      old.sp.destroy();
    }
  }

  private updatePickups(dt: number) {
    const magnet = 52 * (1 + 0.4 * (this.passives.magnet ?? 0));
    for (const p of this.pickups) {
      const dx = this.px - p.x;
      const dy = this.py - 6 - p.y;
      const d = Math.hypot(dx, dy);
      if (d < magnet) p.pull = true;
      if (p.pull) {
        const v = Math.min(d, 260 * dt);
        p.x += (dx / (d || 1)) * v;
        p.y += (dy / (d || 1)) * v;
      }
      if (d < 9) {
        p.done = true;
        p.sp.destroy();
        if (p.kind === 'gem') this.gainXp(p.xp);
        else if (p.kind === 'chest') {
          this.pending++;
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.2);
        } else this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25);
      }
    }
    this.pickups = this.pickups.filter((p) => !p.done);
  }

  private gainXp(n: number) {
    this.xp += n;
    while (this.xp >= sortieXpNeed(this.level)) {
      this.xp -= sortieXpNeed(this.level);
      this.level++;
      this.pending++;
    }
  }

  // ——— отрисовка ———

  private draw() {
    if (!this.ready) return;
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const camX = this.px * this.zoom - W / 2;
    const camY = (this.py - 10) * this.zoom - H / 2;
    this.world.position.set(-camX, -camY);
    this.ground.tilePosition.set(-camX, -camY);
    this.ground.tileScale.set(this.zoom);
    this.ground.width = W;
    this.ground.height = H;

    // герой
    const arms = this.t < this.attackUntil ? 'attack' : Math.floor(this.heroFrame) % 2 ? 'idle2' : 'idle';
    this.heroSp.texture = this.heroTex(this.setup.hero, arms);
    this.heroSp.position.set(this.px, this.py);
    this.heroSp.scale.x = (this.faceX < -0.1 ? -1 : this.faceX > 0.1 ? 1 : Math.sign(this.heroSp.scale.x) || 1) * 0.62;
    this.heroSp.zIndex = this.py;
    this.heroSp.alpha = this.iframes > 0 && Math.floor(this.iframes * 20) % 2 ? 0.55 : 1;
    if (this.iframes <= 0.3) this.heroSp.tint = 0xffffff;
    for (const a of this.allies) {
      a.sp.position.set(a.x, a.y);
      a.sp.zIndex = a.y;
      a.sp.texture = this.heroTex(a.hero, Math.floor(this.heroFrame + 1) % 2 ? 'idle2' : 'idle');
      a.sp.scale.x = (this.faceX < -0.1 ? -1 : 1) * 0.5;
    }
    for (const w of this.wolves) {
      w.sp.position.set(w.x, w.y);
      w.sp.zIndex = w.y;
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.sp.position.set(e.x, e.y);
      e.sp.zIndex = e.y;
      e.sp.texture = this.enemyTex(e.ref, Math.floor(e.frame) % 2);
      const s = Math.abs(e.sp.scale.y);
      e.sp.scale.x = (this.px < e.x ? -1 : 1) * s;
      e.sp.tint = e.flash > 0 ? 0xff8080 : this.t < e.rootUntil ? 0x9af06a : this.t < e.burnUntil ? 0xffc080 : 0xffffff;
    }
    for (const s of this.shots) {
      s.sp.position.set(s.x, s.y);
      if (s.kind === 'fireball') s.sp.rotation += 0.2;
    }
    for (const o of this.orbs) o.sp.position.set(o.x, o.y);
    for (const p of this.pickups) p.sp.position.set(p.x, p.y + Math.sin(this.t * 4 + p.x) * 1.2);

    // круг света жрицы (у героя и союзницы)
    this.auraG.clear();
    for (const w of this.weapons) {
      if (w.id !== 'aura') continue;
      const [ox, oy] = this.ownerPos(w.hero);
      const r = wstats('aura', w.lvl).radius;
      this.auraG.circle(ox, oy - 4, r).fill({ color: 0xfff0a0, alpha: 0.1 + Math.sin(this.t * 5) * 0.03 }).circle(ox, oy - 4, r).stroke({ width: 1.5, color: 0xffe8a0, alpha: 0.5 });
    }
    // полоска здоровья героя
    this.auraG.rect(this.px - 12, this.py + 4, 24, 3).fill(0x1a1016);
    this.auraG.rect(this.px - 12, this.py + 4, 24 * Math.max(0, this.hp / this.maxHp), 3).fill(this.hp / this.maxHp > 0.35 ? 0x5ad05a : 0xff5050);

    // джойстик
    this.joyG.clear();
    if (this.joy) {
      const jx = this.joy.x - this.joy.ox;
      const jy = this.joy.y - this.joy.oy;
      const l = Math.hypot(jx, jy);
      const k = l > 40 ? 40 / l : 1;
      this.joyG.circle(this.joy.ox, this.joy.oy, 42).fill({ color: 0xffffff, alpha: 0.08 }).circle(this.joy.ox, this.joy.oy, 42).stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
      this.joyG.circle(this.joy.ox + jx * k, this.joy.oy + jy * k, 16).fill({ color: 0xffffff, alpha: 0.35 });
    }
  }
}
