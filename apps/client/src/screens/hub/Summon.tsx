import { HEROINE_MAP, HERO_RARITY_COLORS, type SummonPull } from '@idle/shared';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { HeroImg } from '../../components/HeroImg';
import { Button, Cost, Icon, Panel, css, cx } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic, share } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader } from '../common';
import st from './Summon.module.css';

export function Summon() {
  const s = useGameState();
  const cfg = useCfg();
  const S = cfg.summon;
  const pull = async (count: 1 | 10, pay: 'crystals' | 'scrolls') => {
    const r = await useGame.getState().act('summon', { count, pay });
    if (r.ok) showPulls(r.result.pulls);
  };
  return (
    <div className={css.col}>
      <BackHeader title={t('summon.title')} />
      <Panel>
        <div style={{ position: 'relative', height: 170, borderRadius: 6, overflow: 'hidden', background: 'radial-gradient(circle at 50% 60%, #5a2a8a, #1a0e24 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="summon" size={110} style={{ animation: 'bob 2s ease-in-out infinite', filter: 'drop-shadow(0 0 12px #e040ff)' }} />
          <HeroImg className="pixel" id="lira" width={72} height={72} style={{ position: 'absolute', left: 14, bottom: 6 }} />
          <HeroImg className="pixel" id="velvet" width={72} height={72} style={{ position: 'absolute', right: 14, bottom: 6, transform: 'scaleX(-1)' }} />
        </div>
        <div className={css.row} style={{ justifyContent: 'space-between', margin: '8px 0' }}>
          <span className={css.tiny}>{t('summon.pitySSR', { n: S.pitySSR - s.summon.pitySSR })}</span>
          <span className={css.tiny}>{t('summon.pityUR', { n: S.pityUR - s.summon.pityUR })}</span>
        </div>
        <div className={css.col} style={{ gap: 6 }}>
          <div className={css.row}>
            <Button block onClick={() => void pull(1, 'crystals')}>
              {t('summon.one')} <Cost cur="crystals" amount={S.cost1} />
            </Button>
            <Button block onClick={() => void pull(10, 'crystals')}>
              {t('summon.ten')} <Cost cur="crystals" amount={S.cost10} />
            </Button>
          </div>
          <div className={css.row}>
            <Button kind="secondary" block disabled={s.cur.scrolls < 1} onClick={() => void pull(1, 'scrolls')}>
              {t('summon.one')} <Cost cur="scrolls" amount={1} />
            </Button>
            <Button kind="secondary" block disabled={s.cur.scrolls < 10} onClick={() => void pull(10, 'scrolls')}>
              {t('summon.ten')} <Cost cur="scrolls" amount={10} />
            </Button>
          </div>
          <Button
            kind="good"
            block
            disabled={s.day.freeSummon}
            onClick={async () => {
              const r = await useGame.getState().act('summon.free');
              if (r.ok) showPulls(r.result.pulls);
            }}
          >
            {t('summon.free')} · {s.day.freeSummon ? t('summon.freeUsed') : t('common.free')}
          </Button>
        </div>
      </Panel>
      <Panel title={t('summon.rates')}>
        {(['UR', 'SSR', 'SR', 'R'] as const).map((r) => (
          <div key={r} className={css.statRow}>
            <b style={{ color: HERO_RARITY_COLORS[r] }}>{r}</b>
            <span className={css.num}>{S.rates[r]}%</span>
          </div>
        ))}
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('summon.guarantee')}
        </div>
        <div className={css.tiny}>{t('summon.total', { n: s.summon.total })}</div>
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('summon.freeNote')}
        </div>
      </Panel>
    </div>
  );
}

export function showPulls(pulls: SummonPull[]) {
  useUi.getState().open((close) => <PullReveal pulls={pulls} onClose={close} />, { sticky: true });
}

const ORDER = ['R', 'SR', 'SSR', 'UR'] as const;
const rank = (r: string) => ORDER.indexOf(r as (typeof ORDER)[number]);
const rarColor = (r: string) => HERO_RARITY_COLORS[r] ?? '#3D7BE0';
/** CSS-переменные цвета редкости: основной, полупрозрачный и фоновый. */
const rarVars = (r: string) => ({ '--c': rarColor(r), '--c2': rarColor(r) + '88', '--c3': rarColor(r) + '30' }) as CSSProperties;

function PullReveal({ pulls, onClose }: { pulls: SummonPull[]; onClose: () => void }) {
  const botUsername = useGame((g) => g.botUsername);
  const best = useMemo(() => pulls.reduce((a, p) => (rank(p.rarity) > rank(a.rarity) ? p : a), pulls[0]), [pulls]);
  const bestRank = rank(best.rarity);
  const chargeDur = 1100 + bestRank * 320;
  const [phase, setPhase] = useState<'charge' | 'cards'>('charge');
  // цвет портала «поднимается» по редкостям до лучшей в призыве
  const [tier, setTier] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>(() => pulls.map(() => false));
  const [charging, setCharging] = useState(-1);
  const next = flipped.indexOf(false);
  const done = next < 0;

  useEffect(() => {
    if (phase !== 'charge') return;
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
        }, (chargeDur * 0.8 * k) / (bestRank + 1)),
      );
    timers.push(window.setTimeout(() => setPhase('cards'), chargeDur));
    return () => timers.forEach(clearTimeout);
  }, [phase, bestRank, chargeDur]);

  const flip = (i: number, quiet = false) => {
    setCharging(-1);
    setFlipped((f) => {
      if (f[i]) return f;
      const n = f.slice();
      n[i] = true;
      return n;
    });
    if (quiet) return;
    if (rank(pulls[i].rarity) >= 2) {
      sfx('rare');
      haptic.heavy();
    } else {
      sfx('summon');
      haptic.tap();
    }
  };

  // карты открываются по очереди; редкие сначала «дрожат» и дольше светятся рубашкой
  useEffect(() => {
    if (phase !== 'cards' || done) return;
    const rare = rank(pulls[next].rarity) >= 2;
    const t1 = window.setTimeout(() => rare && setCharging(next), 240);
    const t2 = window.setTimeout(() => flip(next), rare ? 950 : 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, next]);

  const skip = () => {
    if (phase === 'charge') setPhase('cards');
    setCharging(-1);
    setFlipped(pulls.map(() => true));
    if (bestRank >= 2) sfx('rare');
  };

  const big = pulls.length === 1;
  return (
    <div className={cx(css.panel, st.wrap)} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>{t('summon.title')}</div>
      {phase === 'charge' ? (
        <div
          className={cx(st.stage, tier >= 3 && st.shake)}
          style={{ ...rarVars(ORDER[tier]), ['--dur' as string]: `${chargeDur}ms` }}
          onClick={() => setPhase('cards')}
        >
          <div className={st.rays} style={{ opacity: 0.18 + tier * 0.08 }} />
          <div className={st.ring} />
          <div className={st.ring} style={{ animationDelay: '.36s' }} />
          <div className={st.ring} style={{ animationDelay: '.72s' }} />
          <div className={st.orb} />
          <div className={st.flash} />
          <div className={st.stageHint}>{t('summon.tap')}</div>
        </div>
      ) : (
        <div className={st.grid} style={{ gridTemplateColumns: big ? '160px' : 'repeat(5, minmax(0, 1fr))', justifyContent: 'center' }}>
          {pulls.map((p, i) => (
            <PullCard key={i} p={p} i={i} big={big} flipped={flipped[i]} charging={charging === i} onFlip={() => flip(i)} />
          ))}
        </div>
      )}
      <div className={st.chips}>
        <span className={css.tiny}>{t('summon.found')}:</span>
        {[...ORDER].reverse().map((r) => {
          const n = pulls.filter((p) => p.rarity === r).length;
          const on = n > 0 && (phase === 'cards' || rank(r) <= tier);
          return (
            <span key={r} className={cx(st.rchip, on && st.rchipOn)} style={rarVars(r)}>
              {r}
              {on ? ` ×${n}` : ''}
            </span>
          );
        })}
      </div>
      <div className={css.row}>
        {!done && (
          <Button kind="secondary" block onClick={skip}>
            {t('summon.skip')}
          </Button>
        )}
        {done && bestRank >= 2 && (
          <Button
            kind="secondary"
            block
            onClick={() => {
              const link = botUsername ? `https://t.me/${botUsername}?startapp=hero_${best.hero}` : location.href;
              share(t('share.hero', { name: tl(HEROINE_MAP[best.hero].name) }), link);
            }}
          >
            {t('summon.share')}
          </Button>
        )}
        <Button block disabled={!done} onClick={onClose}>
          {t('common.ok')}
        </Button>
      </div>
    </div>
  );
}

function PullCard({ p, i, big, flipped, charging, onFlip }: { p: SummonPull; i: number; big: boolean; flipped: boolean; charging: boolean; onFlip: () => void }) {
  const rare = rank(p.rarity) >= 2;
  const fs = big ? 13 : 10;
  return (
    <div
      className={cx(st.card, flipped && st.flipped, charging && st.charging)}
      style={{ ...rarVars(p.rarity), animationDelay: `${i * 45}ms` }}
      onClick={() => !flipped && onFlip()}
    >
      <div className={st.inner}>
        <div className={cx(st.face, st.back, rare && st.backRare)}>
          <Icon name="summon" size={big ? 60 : 26} />
          <div className={st.backMark} style={{ fontSize: big ? 18 : 11 }}>
            {p.rarity}
          </div>
        </div>
        <div className={cx(st.face, st.front, rare && st.shine)} style={{ fontSize: fs }}>
          {rare && <div className={st.frontRays} />}
          {p.isNew && (
            <span className={st.newTag} style={{ fontSize: big ? 11 : 8 }}>
              NEW
            </span>
          )}
          <HeroImg className={st.hero} id={p.hero} still={!flipped} />
          <div className={st.rar} style={{ fontSize: big ? 18 : 11 }}>
            {p.rarity}
          </div>
          <div className={st.name}>{tl(HEROINE_MAP[p.hero].name)}</div>
          <div className={st.sub} style={p.isNew ? { color: '#7ae07a' } : undefined}>
            {p.isNew ? t('summon.new') : t(big ? 'summon.dupe' : 'summon.dupeShort', { n: p.shards })}
          </div>
        </div>
      </div>
      {flipped && rare && <div className={st.burst} />}
    </div>
  );
}
