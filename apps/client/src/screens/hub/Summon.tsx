import { HEROINE_MAP, HERO_RARITY_COLORS, type SummonPull } from '@idle/shared';
import { useEffect, useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { Button, Cost, Icon, Panel, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic, share } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader } from '../common';

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
          <img className="pixel" src={heroUrl('lira')} width={72} height={72} alt="" style={{ position: 'absolute', left: 14, bottom: 6 }} />
          <img className="pixel" src={heroUrl('velvet')} width={72} height={72} alt="" style={{ position: 'absolute', right: 14, bottom: 6, transform: 'scaleX(-1)' }} />
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

function PullReveal({ pulls, onClose }: { pulls: SummonPull[]; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  const botUsername = useGame((g) => g.botUsername);
  useEffect(() => {
    if (shown >= pulls.length) return;
    const p = pulls[shown];
    const rare = p.rarity === 'SSR' || p.rarity === 'UR';
    if (rare) {
      sfx('rare');
      haptic.heavy();
    } else sfx('summon');
    const id = setTimeout(() => setShown((n) => n + 1), rare ? 700 : 220);
    return () => clearTimeout(id);
  }, [shown, pulls]);
  const best = [...pulls].sort((a, b) => ['R', 'SR', 'SSR', 'UR'].indexOf(b.rarity) - ['R', 'SR', 'SSR', 'UR'].indexOf(a.rarity))[0];
  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, paddingBottom: 'calc(14px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>{t('summon.title')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: pulls.length === 1 ? '1fr' : 'repeat(5, 1fr)', gap: 6, justifyItems: 'center' }}>
        {pulls.map((p, i) => {
          const visible = i < shown;
          const glow = p.rarity === 'UR' ? '#e03a3a' : p.rarity === 'SSR' ? '#f08a24' : p.rarity === 'SR' ? '#9b4de0' : '#3d7be0';
          return (
            <div
              key={i}
              style={{
                width: pulls.length === 1 ? 140 : 62,
                textAlign: 'center',
                opacity: visible ? 1 : 0.15,
                transform: visible ? 'scale(1)' : 'scale(0.8)',
                transition: 'all .2s var(--ease)',
              }}
            >
              <div style={{ borderRadius: 6, border: `2px solid ${glow}`, boxShadow: visible && (p.rarity === 'SSR' || p.rarity === 'UR') ? `0 0 14px ${glow}` : undefined, background: 'radial-gradient(circle,#3a2a30,#140e12)' }}>
                <img className="pixel" src={heroUrl(p.hero)} alt="" style={{ width: '100%' }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: glow }}>{p.rarity}</div>
              <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tl(HEROINE_MAP[p.hero].name)}</div>
              <div style={{ fontSize: 9, color: p.isNew ? '#7ae07a' : 'var(--text-2)' }}>{p.isNew ? t('summon.new') : t('summon.dupe', { n: p.shards })}</div>
            </div>
          );
        })}
      </div>
      <div className={css.row} style={{ marginTop: 12 }}>
        {(best.rarity === 'UR' || best.rarity === 'SSR') && shown >= pulls.length && (
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
        <Button block disabled={shown < pulls.length} onClick={onClose}>
          {t('common.ok')}
        </Button>
      </div>
    </div>
  );
}
