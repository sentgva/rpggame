import {
  FISH,
  FISH_BUY,
  FISH_COLLECTION,
  FISH_DAILY,
  FISH_MAP,
  FISH_PERFECT,
  FISH_RARITY,
  FISH_SPOTS,
  HEROINE_MAP,
  HERO_RARITY_COLORS,
  SKIN_MAP,
  fishBaitCost,
  fishingState,
  type FishDef,
  type FishRarity,
  type FishSpot,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import type { Arms } from '../../art/figure';
import { sceneUrl, type SceneBg } from '../../art/scenes';
import { HeroImg } from '../../components/HeroImg';
import { Button, Cost, Panel, Tabs, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { BackHeader, RewardList } from '../common';
import st from './Fishing.module.css';

/** Сцена места: фон, где стоит героиня (низ, % высоты) и где поплавок (x, y в %). */
const SPOT_VIEW: Record<FishSpot, { bg: SceneBg; feet: number; bob: [number, number] }> = {
  lake: { bg: 'pond', feet: 29, bob: [72, 76] },
  sea: { bg: 'beach', feet: 5, bob: [76, 55] },
  moon: { bg: 'lake', feet: 29, bob: [70, 78] },
};
const HERO_H = 58;
const RARITY_RANK: Record<string, number> = { UR: 0, SSR: 1, SR: 2, R: 3 };

// ——— пиксельные рыбы (шаблоны 16×10: b — тело, d — спина/плавники, l — брюхо, e — глаз) ———
const SHAPES: Record<string, string[]> = {
  fish: [
    '................',
    '.....dddd.......',
    '...ddbbbbdd...dd',
    '..dbbbbbbbbd.dbd',
    '.dbebbbbbbbbdbbd',
    '.dbbbbbbbbbbbbbd',
    '.dllllllllbbdbbd',
    '..dllllllbd..dbd',
    '...ddlllld....dd',
    '.....dddd.......',
  ],
  eel: [
    '................',
    '................',
    '..........ddd...',
    '.ddd.....dbbbd..',
    'dbebd...dbbbbbd.',
    'dbbbbdddbbbllbbd',
    '.dllbbbbbllddlbd',
    '..ddllllldd..dd.',
    '....ddddd.......',
    '................',
  ],
  ray: [
    '.......dd.......',
    '......dbbd......',
    '.....dbbbbd.....',
    '...ddbebbebdd...',
    '.ddbbbbbbbbbbdd.',
    'dbbbbbbbbbbbbbbd',
    '.ddbbllllllbbdd.',
    '...ddbbbbbbdd...',
    '.....ddbbdd.....',
    '.......dd.......',
  ],
  squid: [
    '.....dddddd.....',
    '....dbbbbbbd....',
    '...dbbbbbbbbd...',
    '...dbebbbbebd...',
    '...dbbbbbbbbd...',
    '....dllllllbd...',
    '...dbdbdbdbdbd..',
    '..db.db.db.db.d.',
    '..d..d..d..d..d.',
    '................',
  ],
  pearl: [
    '................',
    '.....dddddd.....',
    '...ddbbbbllbdd..',
    '..dbbbbbbbllbbd.',
    '..dbbbbbbbbbbbd.',
    '..dbbbbbbbbbbbd.',
    '..dbbbbbbbbbbbd.',
    '...ddbbbbbbbdd..',
    '.....dddddd.....',
    '................',
  ],
};
const SHAPE_OF: Record<string, keyof typeof SHAPES> = { ghosteel: 'eel', manta: 'ray', starray: 'ray', kraken: 'squid', pearl: 'pearl' };

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))));
  return `rgb(${c.join(',')})`;
}

/** Пиксельная рыба; unknown — силуэт для непойманной. */
export function FishPic({ fish, size = 48, unknown }: { fish: FishDef; size?: number; unknown?: boolean }) {
  const rows = SHAPES[SHAPE_OF[fish.id] ?? 'fish'];
  const pal: Record<string, string> = unknown
    ? { b: '#2a2430', d: '#1a1620', l: '#2a2430', e: '#1a1620' }
    : { b: fish.color, d: shade(fish.color, 0.55), l: shade(fish.color, 1.45), e: '#1a1016' };
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x]];
      if (c) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} />);
    }
  });
  return (
    <svg className={st.fishPic} viewBox="0 0 16 10" width={size} height={(size * 10) / 16} shapeRendering="crispEdges" aria-hidden>
      {rects}
    </svg>
  );
}

// ——— мини-игра: держи зону на рыбе, пока шкала улова не заполнится ———

interface ReelResult {
  ok: boolean;
  perfect: boolean;
}

/**
 * Вертикальная шкала как в Stardew Valley: пока держишь палец — зона всплывает, отпустишь — тонет.
 * Рыба мечется тем чаще и дальше, чем она сильнее. В зоне — шкала улова растёт, вне — падает.
 */
function Reel({ power, fish, onDone }: { power: number; fish: FishDef; onDone: (r: ReelResult) => void }) {
  const zoneEl = useRef<HTMLDivElement>(null);
  const fishEl = useRef<HTMLDivElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const hold = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;
  const size = 0.36 - power * 0.1;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const start = last;
    let z = 0.12;
    let vz = 0;
    let f = 0.25;
    let target = 0.5;
    let nextMove = 0;
    let progress = 0.3;
    let perfect = true;
    let shake = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // зона: подъём/падение с инерцией, отскок от дна
      vz += (hold.current ? 2.8 : -2.4) * dt;
      vz = Math.max(-1.3, Math.min(1.3, vz));
      z += vz * dt;
      if (z < 0) {
        z = 0;
        vz = -vz * 0.35;
      }
      if (z > 1 - size) {
        z = 1 - size;
        vz = 0;
      }
      // рыба: новые цели тем чаще и дальше, чем сильнее рыба; легендарные иногда делают рывок
      if (now >= nextMove) {
        const jump = 0.15 + power * 0.5;
        target = Math.max(0.03, Math.min(0.97, f + (Math.random() * 2 - 1) * jump));
        nextMove = now + (450 + Math.random() * 900) * (1.2 - power * 0.5);
        if (power > 0.8 && Math.random() < 0.2) shake = 0.4;
      }
      f += (target - f) * Math.min(1, dt * (1.2 + power * 2.6 + (shake > 0 ? 5 : 0)));
      shake = Math.max(0, shake - dt);
      const inside = f >= z && f <= z + size;
      const grace = now - start < 1200;
      if (inside) progress += (0.34 - power * 0.1) * dt;
      else {
        progress -= (0.12 + power * 0.1) * dt;
        if (!grace) perfect = false;
      }
      progress = Math.max(0, Math.min(1, progress));
      if (zoneEl.current) {
        zoneEl.current.style.bottom = `${z * 100}%`;
        zoneEl.current.classList.toggle(st.zoneOn, inside);
      }
      if (fishEl.current) fishEl.current.style.bottom = `calc(${f * 100}% - 9px)`;
      if (barEl.current) {
        barEl.current.style.height = `${progress * 100}%`;
        barEl.current.style.background = progress > 0.66 ? '#6fd26a' : progress > 0.33 ? '#f2c040' : '#e05a4a';
      }
      if (progress >= 1 || progress <= 0) {
        done.current({ ok: progress >= 1, perfect: progress >= 1 && perfect });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const up = () => (hold.current = false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [power, size]);
  return (
    <div
      className={st.reel}
      onPointerDown={(e) => {
        e.preventDefault();
        hold.current = true;
        haptic.tap();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={st.track}>
        <div ref={zoneEl} className={st.zone} style={{ height: `${size * 100}%` }} />
        <div ref={fishEl} className={st.reelFish}>
          <FishPic fish={fish} size={26} unknown />
        </div>
      </div>
      <div className={st.progress}>
        <div ref={barEl} className={st.progressFill} />
      </div>
      <div className={st.reelHint}>{t('fish.hold')}</div>
    </div>
  );
}

type Phase = 'idle' | 'wait' | 'bite' | 'reel';
interface Cast {
  fish: string;
  rarity: FishRarity;
  weight: number;
  power: number;
}

export function Fishing() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const f = fishingState({ s, now });
  const lvl = s.account.lvl;
  const owned = Object.keys(s.heroines)
    .map((id) => HEROINE_MAP[id])
    .filter(Boolean)
    .sort((a, b) => Number(b.element === 'water') - Number(a.element === 'water') || RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity] || a.id.localeCompare(b.id));
  const [tab, setTab] = useState<'fish' | 'book'>('fish');
  const [spot, setSpot] = useState<FishSpot>(() => (f.hook?.spot as FishSpot) ?? 'lake');
  const [buddy, setBuddy] = useState<string | undefined>(() => (f.buddy && s.heroines[f.buddy] ? f.buddy : owned[0]?.id));
  // незаконченный улов (перезагрузка посреди мини-игры) — рыба всё ещё на крючке
  const [phase, setPhase] = useState<Phase>(() => (f.hook ? 'bite' : 'idle'));
  const [cast, setCast] = useState<Cast | null>(() => {
    const h = f.hook;
    if (!h) return null;
    const r = FISH_MAP[h.fish].rarity;
    return { fish: h.fish, rarity: r, weight: h.weight, power: FISH_RARITY[r].power };
  });
  const [mood, setMood] = useState<Arms | undefined>();
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => clearTimeout(x)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const buddySkin = (() => {
    if (!buddy) return undefined;
    // на воде — купальник, если он у неё есть
    const summer = s.skins.find((k) => SKIN_MAP[k]?.hero === buddy && SKIN_MAP[k]?.set === 'summer');
    return spot !== 'moon' && summer ? summer : s.heroines[buddy]?.skin;
  })();

  const phaseRef = useRef(phase);
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const doCast = async () => {
    haptic.medium();
    const r = await useGame.getState().act('fish.cast', { spot, ...(buddy ? { hero: buddy } : {}) });
    if (!r.ok) return;
    const c = r.result as Cast;
    setCast(c);
    setMood(undefined);
    go('wait');
    // поклёвка через 1,2–3,5 с; на подсечку — окно, у сильной рыбы короче
    later(() => {
      if (phaseRef.current !== 'wait') return;
      haptic.heavy();
      go('bite');
      later(() => {
        if (phaseRef.current === 'bite') void finish({ ok: false, perfect: false }, true);
      }, 1500 - c.power * 500);
    }, 1200 + Math.random() * 2300);
  };

  const hook = () => {
    if (phaseRef.current === 'wait') {
      // поторопилась — рыба ушла
      void finish({ ok: false, perfect: false }, true);
      return;
    }
    haptic.success();
    go('reel');
  };

  const finish = async (res: ReelResult, early = false) => {
    timers.current.forEach((x) => clearTimeout(x));
    timers.current = [];
    go('idle');
    const r = await useGame.getState().act('fish.reel', { ok: res.ok, perfect: res.perfect });
    if (!r.ok) return;
    const out = r.result as {
      ok: boolean;
      fish: string;
      rarity?: FishRarity;
      weight?: number;
      perfect?: boolean;
      cur?: Record<string, number>;
      shards?: Record<string, number>;
      first?: boolean;
      record?: boolean;
      collection?: { species: number; crystals: number; scrolls?: number; hearts?: number }[];
      species?: number;
    };
    setMood(out.ok ? 'victory' : 'shy');
    later(() => setMood(undefined), 2600);
    if (!out.ok) {
      haptic.error();
      openSheet(t('fish.lost'), (close) => (
        <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
          <FishPic fish={FISH_MAP[out.fish]} size={72} unknown />
          <div className={css.muted}>{early ? t('fish.lostEarly') : t('fish.lostText')}</div>
          <Button block onClick={close}>
            {t('common.ok')}
          </Button>
        </div>
      ));
      return;
    }
    haptic.success();
    const def = FISH_MAP[out.fish];
    const rar = FISH_RARITY[def.rarity];
    openSheet(t('fish.caught'), (close) => (
      <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className={cx(st.catch, st[`r_${def.rarity}`])}>
          <FishPic fish={def} size={120} />
        </div>
        <b style={{ fontSize: 18 }}>{tl(def.name)}</b>
        <div className={css.row} style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className={st.rarity} style={{ color: rar.color }}>
            {tl(rar.name)}
          </span>
          <span>{t('fish.kg', { n: out.weight ?? 0 })}</span>
          {out.first && <span className={st.badge}>{t('fish.new')}</span>}
          {!out.first && out.record && <span className={st.badge}>{t('fish.record')}</span>}
          {out.perfect && <span className={cx(st.badge, st.badgeGold)}>{t('fish.perfect', { n: Math.round(FISH_PERFECT * 100) })}</span>}
        </div>
        <RewardList r={{ cur: out.cur, shards: out.shards }} />
        {(out.collection ?? []).map((m) => (
          <div key={m.species} className={st.milestone}>
            📖 {t('fish.bookReward', { n: m.species })}
            <RewardList r={{ cur: { crystals: m.crystals, ...(m.scrolls ? { scrolls: m.scrolls } : {}) }, hearts: m.hearts || undefined }} />
          </div>
        ))}
        <Button block onClick={close}>
          {t('common.ok')}
        </Button>
      </div>
    ));
  };

  const cost = fishBaitCost({ cfg, s });
  const spotDef = FISH_SPOTS.find((x) => x.id === spot)!;
  const view = SPOT_VIEW[spot];
  // рука с удочкой — примерно на 40% роста от низа
  const hand = 100 - view.feet - HERO_H * 0.42;
  const caught = Object.keys(f.log).length;
  const busy = phase !== 'idle';

  return (
    <div className={css.col}>
      <BackHeader title={t('fish.title')} right={<span className={css.tiny}>🪱 {f.bait}</span>} />
      <Tabs<'fish' | 'book'> value={tab} onChange={setTab} items={[{ id: 'fish', label: t('fish.tabFish') }, { id: 'book', label: `${t('fish.tabBook')} ${caught}/${FISH.length}` }]} />
      {tab === 'fish' ? (
        <>
          <div className={cx(st.scene, spot === 'moon' && st.night)} style={{ backgroundImage: `url(${sceneUrl(view.bg)})` }}>
            <div className={st.water} style={{ top: `${view.bob[1] - 16}%`, bottom: `${Math.max(0, 100 - view.bob[1] - 12)}%`, height: 'auto' }} />
            {buddy && <HeroImg id={buddy} skin={buddySkin} unarmed flirt={!busy && !mood} arms={mood} className={cx('pixel', st.buddy)} style={{ bottom: `${view.feet}%`, height: `${HERO_H}%` }} />}
            <svg className={st.rod} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <line x1="29" y1={hand} x2="50" y2={hand - 34} className={st.rodStick} />
              {phase !== 'idle' && <path d={`M50 ${hand - 34} Q ${(50 + view.bob[0]) / 2 + 4} ${phase === 'reel' ? hand - 20 : view.bob[1] - 6} ${view.bob[0]} ${view.bob[1] + (phase === 'bite' || phase === 'reel' ? 2 : 0)}`} className={st.line} />}
            </svg>
            {phase !== 'idle' && (
              <div className={cx(st.bobber, phase === 'bite' && st.bobberBite, phase === 'reel' && st.bobberReel)} style={{ left: `${view.bob[0]}%`, top: `${view.bob[1]}%` }}>
                <span />
              </div>
            )}
            {phase === 'bite' && (
              <div className={st.alert} style={{ left: `${view.bob[0]}%`, top: `${view.bob[1] - 30}%` }}>
                !
              </div>
            )}
            {phase === 'wait' && <div className={st.ripple} style={{ left: `${view.bob[0]}%`, top: `${view.bob[1] + 1}%` }} />}
            {phase === 'reel' && cast && <Reel power={cast.power} fish={FISH_MAP[cast.fish]} onDone={(r) => void finish(r)} />}
          </div>

          {phase === 'idle' && (
            <Button block size="big" disabled={f.bait <= 0} onClick={() => void doCast()}>
              🎣 {t('fish.cast')}
            </Button>
          )}
          {(phase === 'wait' || phase === 'bite') && (
            <Button block size="big" pulse={phase === 'bite'} kind={phase === 'bite' ? 'primary' : 'secondary'} onClick={hook}>
              {phase === 'bite' ? t('fish.hook') : t('fish.waiting')}
            </Button>
          )}
          <div className={css.tiny}>{t('fish.hint', { n: FISH_DAILY })}</div>

          <Panel title={t('fish.spot')}>
            <div className={st.spots}>
              {FISH_SPOTS.map((x) => {
                const locked = lvl < x.level;
                return (
                  <button key={x.id} className={cx(st.spot, spot === x.id && st.spotOn)} disabled={locked || busy} onClick={() => setSpot(x.id)}>
                    <span className={st.spotIcon}>{locked ? '🔒' : x.icon}</span>
                    <b>{tl(x.name)}</b>
                    <span className={css.tiny}>{locked ? t('fish.needLvl', { n: x.level }) : tl(x.desc)}</span>
                  </button>
                );
              })}
            </div>
            <div className={st.pool}>
              {FISH.filter((x) => x.spot === spot).map((x) => (
                <span key={x.id} title={tl(x.name)} className={st.poolFish}>
                  <FishPic fish={x} size={30} unknown={!f.log[x.id]} />
                  <i style={{ background: FISH_RARITY[x.rarity].color }} />
                </span>
              ))}
            </div>
            <div className={css.tiny}>{tl(spotDef.desc)}</div>
          </Panel>

          <Panel title={t('fish.buddy')}>
            <div className={st.heroes}>
              {owned.map((h) => (
                <button key={h.id} className={cx(st.heroBtn, h.id === buddy && st.heroOn)} style={{ borderColor: HERO_RARITY_COLORS[h.rarity] }} disabled={busy} onClick={() => setBuddy(h.id)}>
                  <HeroImg id={h.id} skin={s.heroines[h.id]?.skin} still unarmed className="pixel" width={44} height={44} />
                  {h.element === 'water' && <span className={st.water2}>💧</span>}
                </button>
              ))}
            </div>
            <div className={css.tiny}>{t('fish.buddyHint')}</div>
          </Panel>

          <Panel title={t('fish.bait')} right={<span className={css.tiny}>{t('fish.bought', { n: f.bought, max: FISH_BUY.perDay })}</span>}>
            <div className={css.row} style={{ justifyContent: 'space-between' }}>
              <span>🪱 × {FISH_BUY.bait}</span>
              <Button size="small" disabled={f.bought >= FISH_BUY.perDay || busy} onClick={() => void useGame.getState().act('fish.bait')}>
                {t('fish.buy')} <Cost cur="gold" amount={cost.gold} size={14} />
              </Button>
            </div>
          </Panel>
        </>
      ) : (
        <Book log={f.log} milestones={f.milestones} />
      )}
    </div>
  );
}

/** Книга рыбака: все виды по местам, рекорды веса, награды коллекции. */
function Book({ log, milestones }: { log: Record<string, { n: number; best: number }>; milestones: number[] }) {
  const species = Object.keys(log).length;
  return (
    <>
      <Panel title={t('fish.collection')}>
        <div className={st.milestones}>
          {FISH_COLLECTION.map((m) => {
            const got = milestones.includes(m.species);
            return (
              <div key={m.species} className={cx(st.ms, got && st.msGot, !got && species >= m.species && st.msReady)}>
                <b>
                  {Math.min(species, m.species)}/{m.species}
                </b>
                <RewardList r={{ cur: { crystals: m.crystals, ...(m.scrolls ? { scrolls: m.scrolls } : {}) }, hearts: m.hearts }} />
                {got && <span className={st.check}>✓</span>}
              </div>
            );
          })}
        </div>
      </Panel>
      {FISH_SPOTS.map((sp) => (
        <Panel key={sp.id} title={`${sp.icon} ${tl(sp.name)}`}>
          <div className={st.book}>
            {FISH.filter((x) => x.spot === sp.id).map((x) => {
              const e = log[x.id];
              return (
                <div key={x.id} className={cx(st.page, !e && st.pageUnknown)}>
                  <FishPic fish={x} size={52} unknown={!e} />
                  <b style={{ color: e ? FISH_RARITY[x.rarity].color : undefined }}>{e ? tl(x.name) : '???'}</b>
                  <span className={css.tiny}>{e ? `${t('fish.best', { n: e.best })} · ×${e.n}` : tl(FISH_RARITY[x.rarity].name)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </>
  );
}
