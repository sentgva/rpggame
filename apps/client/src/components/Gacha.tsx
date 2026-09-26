import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '../audio/sfx';
import { t } from '../i18n';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import st from './Gacha.module.css';
import { Button, cx } from './ui';

/**
 * Анимация призыва (героини и артефакты):
 * магический круг заряжается цветом лучшей редкости → звёзды падают в круг (у каждой — цвет своей находки)
 * → вспышка → «прожектор» для SSR/UR → карты вылетают из круга и переворачиваются по очереди.
 */
export type GachaRarity = 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaItem {
  rarity: GachaRarity;
  name: string;
  sub: string;
  subGood?: boolean;
  isNew?: boolean;
  /** картинка: big — крупно (прожектор, одиночный призыв), live — можно анимировать */
  art: (o: { big: boolean; live: boolean }) => ReactNode;
}

export interface GachaOptions {
  title: string;
  items: GachaItem[];
  colors: Record<GachaRarity, string>;
  share?: { label: string; run: () => void };
}

export function openGacha(o: GachaOptions) {
  useUi.getState().open((close) => <GachaReveal {...o} onClose={close} />, { sticky: true });
}

const ORDER: GachaRarity[] = ['R', 'SR', 'SSR', 'UR'];
const rank = (r: GachaRarity) => ORDER.indexOf(r);
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

type Phase = 'portal' | 'fall' | 'spot' | 'cards';

function GachaReveal({ title, items, colors, share, onClose }: GachaOptions & { onClose: () => void }) {
  const vars = (r: GachaRarity) => ({ '--c': colors[r], '--c2': colors[r] + '88', '--c3': colors[r] + '33' }) as CSSProperties;
  const bestIdx = useMemo(() => items.reduce((b, it, i) => (rank(it.rarity) > rank(items[b].rarity) ? i : b), 0), [items]);
  const best = items[bestIdx];
  const bestRank = rank(best.rarity);
  const single = items.length === 1;
  const chargeDur = 1300 + bestRank * 350;
  const fallDur = 650 + items.length * 70;
  const [phase, setPhase] = useState<Phase>('portal');
  const [tier, setTier] = useState(0);
  const [flash, setFlash] = useState(false);
  const [flipped, setFlipped] = useState<boolean[]>(() => items.map(() => false));
  const [charging, setCharging] = useState(-1);
  const next = flipped.indexOf(false);
  const done = phase === 'cards' && next < 0;

  // частицы, стекающиеся в круг, и траектории звёзд — случайные, но стабильные для этого призыва
  const motes = useMemo(
    () =>
      Array.from({ length: 30 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = 130 + Math.random() * 110;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, delay: Math.random() * 1.6, size: 2 + Math.random() * 3 };
      }),
    [],
  );
  const stars = useMemo(() => items.map((_, i) => ({ angle: -150 + Math.random() * 120, delay: i * 70, dist: 260 + Math.random() * 60 })), [items]);

  // заряд круга: цвет поднимается по редкостям до лучшей
  useEffect(() => {
    if (phase !== 'portal') return;
    sfx('summon');
    haptic.medium();
    const timers: number[] = [];
    for (let k = 1; k <= bestRank; k++)
      timers.push(
        window.setTimeout(() => {
          setTier(k);
          if (k >= 2) {
            sfx('rare');
            haptic.heavy();
          } else haptic.tap();
        }, (chargeDur * 0.85 * k) / (bestRank + 1)),
      );
    timers.push(window.setTimeout(() => setPhase('fall'), chargeDur));
    return () => timers.forEach(clearTimeout);
  }, [phase, bestRank, chargeDur]);

  // звёзды падают, затем вспышка
  useEffect(() => {
    if (phase !== 'fall') return;
    const t1 = window.setTimeout(() => {
      setFlash(true);
      haptic.heavy();
      if (bestRank >= 2) sfx('rare');
    }, fallDur);
    const t2 = window.setTimeout(() => setPhase(bestRank >= 2 ? 'spot' : 'cards'), fallDur + 380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, fallDur, bestRank]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(id);
  }, [flash]);

  // прожектор сам уступает картам
  useEffect(() => {
    if (phase !== 'spot') return;
    const id = window.setTimeout(() => toCards(), single ? 3200 : 2600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const toCards = () => {
    setPhase('cards');
    // лучшая уже показана в прожекторе — её карта сразу открыта
    if (bestRank >= 2) setFlipped((f) => f.map((x, i) => x || i === bestIdx));
  };

  const flip = (i: number) => {
    setCharging(-1);
    setFlipped((f) => {
      if (f[i]) return f;
      const n = f.slice();
      n[i] = true;
      return n;
    });
    if (rank(items[i].rarity) >= 2) {
      sfx('rare');
      haptic.heavy();
    } else {
      sfx('summon');
      haptic.tap();
    }
  };

  // карты открываются по очереди; редкие сначала дрожат
  useEffect(() => {
    if (phase !== 'cards' || next < 0) return;
    const rare = rank(items[next].rarity) >= 2;
    const base = next === 0 || flipped.filter(Boolean).length <= (bestRank >= 2 ? 1 : 0) ? 520 : 0;
    const t1 = window.setTimeout(() => rare && setCharging(next), base + 200);
    const t2 = window.setTimeout(() => flip(next), base + (rare ? 900 : 260));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, next]);

  const skip = () => {
    setCharging(-1);
    setFlash(false);
    setPhase('cards');
    setFlipped(items.map(() => true));
    if (bestRank >= 2) sfx('rare');
  };

  const advance = () => {
    if (phase === 'portal') setPhase('fall');
    else if (phase === 'spot') toCards();
  };

  const tierColor = ORDER[phase === 'portal' ? tier : bestRank];
  const cols = single ? 1 : 5;
  return (
    <div className={cx(st.screen, phase === 'fall' && bestRank >= 3 && st.shake)} style={vars(tierColor)} onClick={(e) => e.stopPropagation()}>
      <div className={st.sky} />
      <div className={st.title}>{title}</div>

      <div className={st.stage} onClick={advance}>
        {(phase === 'portal' || phase === 'fall') && (
          <div className={cx(st.circleWrap, phase === 'fall' && st.circleHot)} style={{ ['--charge' as string]: `${chargeDur}ms` }}>
            <svg className={st.circle} viewBox="-130 -130 260 260">
              <defs>
                <path id="runePath" d="M 0,-104 A 104,104 0 1,1 -0.1,-104" />
              </defs>
              <g className={st.spinA}>
                <circle r="122" className={st.lineDash} />
                <circle r="114" className={st.line} />
              </g>
              <g className={st.spinB}>
                <text className={st.runes}>
                  <textPath href="#runePath">{RUNES + RUNES.slice(0, 8)}</textPath>
                </text>
              </g>
              <g className={st.spinA}>
                <circle r="90" className={st.line} />
                <polygon points="0,-88 76,44 -76,44" className={st.line} />
                <polygon points="0,88 76,-44 -76,-44" className={st.line} />
              </g>
              <circle r="46" className={st.lineThin} />
            </svg>
            <div className={st.orb} />
            {phase === 'portal' &&
              motes.map((m, i) => (
                <span
                  key={i}
                  className={st.mote}
                  style={{ ['--x' as string]: `${m.x}px`, ['--y' as string]: `${m.y}px`, animationDelay: `${m.delay}s`, width: m.size, height: m.size }}
                />
              ))}
            {phase === 'fall' &&
              stars.map((s, i) => (
                <span key={i} className={st.starWrap} style={{ rotate: `${s.angle}deg`, ...vars(items[i].rarity) }}>
                  <span className={st.star} style={{ ['--d' as string]: `${s.dist}px`, animationDelay: `${s.delay}ms` }} />
                </span>
              ))}
          </div>
        )}
        {flash && <div className={cx(st.flash, bestRank >= 3 && st.flashUr)} />}
        {flash && bestRank >= 2 && <div className={cx(st.wave, bestRank >= 3 && st.waveUr)} />}

        {phase === 'spot' && (
          <div className={st.spot} style={vars(best.rarity)}>
            <div className={st.pillar} />
            <div className={st.spotRays} />
            <div className={st.spotArt}>{best.art({ big: true, live: true })}</div>
            <div className={st.spotRar}>
              {best.rarity}
              <span className={st.spotStars}>{'★'.repeat(bestRank + 2)}</span>
            </div>
            <div className={st.spotName}>{best.name}</div>
            <div className={st.spotSub} style={best.subGood ? { color: '#7ae07a' } : undefined}>
              {best.sub}
            </div>
          </div>
        )}

        {phase === 'cards' && (
          <div className={st.grid} style={{ gridTemplateColumns: single ? '170px' : `repeat(${cols}, minmax(0, 1fr))` }}>
            {items.map((it, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const rows = Math.ceil(items.length / cols);
              return (
                <Card
                  key={i}
                  it={it}
                  big={single}
                  flipped={flipped[i]}
                  charging={charging === i}
                  onFlip={() => flip(i)}
                  style={{
                    ...vars(it.rarity),
                    ['--fx' as string]: `${((cols - 1) / 2 - col) * 105}%`,
                    ['--fy' as string]: `${((rows - 1) / 2 - row) * 105}%`,
                    animationDelay: `${i * 55}ms`,
                  }}
                />
              );
            })}
          </div>
        )}
        {phase !== 'cards' && <div className={st.hint}>{t('summon.tap')}</div>}
      </div>

      <div className={st.footer}>
        <div className={st.chips}>
          {[...ORDER].reverse().map((r) => {
            const n = items.filter((p) => p.rarity === r).length;
            const on = n > 0 && (phase !== 'portal' || rank(r) <= tier);
            return (
              <span key={r} className={cx(st.rchip, on && st.rchipOn)} style={vars(r)}>
                {r}
                {on ? ` ×${n}` : ''}
              </span>
            );
          })}
        </div>
        <div className={st.buttons}>
          {!done && (
            <Button kind="secondary" block onClick={skip}>
              {t('summon.skip')}
            </Button>
          )}
          {done && share && bestRank >= 2 && (
            <Button kind="secondary" block onClick={share.run}>
              {share.label}
            </Button>
          )}
          <Button block disabled={!done} onClick={onClose}>
            {t('common.ok')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ it, big, flipped, charging, onFlip, style }: { it: GachaItem; big: boolean; flipped: boolean; charging: boolean; onFlip: () => void; style: CSSProperties }) {
  const rare = rank(it.rarity) >= 2;
  return (
    <div className={cx(st.card, flipped && st.flipped, charging && st.charging)} style={style} onClick={() => !flipped && onFlip()}>
      <div className={st.inner}>
        <div className={cx(st.face, st.back, rare && st.backRare)}>
          <span className={st.backRune}>ᛟ</span>
          <span className={st.backMark} style={{ fontSize: big ? 18 : 11 }}>
            {it.rarity}
          </span>
        </div>
        <div className={cx(st.face, st.front, rare && st.shine)} style={{ fontSize: big ? 13 : 10 }}>
          {rare && <div className={st.frontRays} />}
          {it.isNew && (
            <span className={st.newTag} style={{ fontSize: big ? 11 : 8 }}>
              NEW
            </span>
          )}
          <div className={st.art}>{it.art({ big, live: flipped })}</div>
          <div className={st.rar} style={{ fontSize: big ? 18 : 11 }}>
            {it.rarity}
          </div>
          <div className={st.name}>{it.name}</div>
          <div className={st.sub} style={it.subGood ? { color: '#7ae07a' } : undefined}>
            {it.sub}
          </div>
        </div>
      </div>
      {flipped && rare && <div className={st.burst} />}
    </div>
  );
}
