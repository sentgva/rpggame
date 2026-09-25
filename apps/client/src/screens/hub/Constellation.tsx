import { CONSTELLATIONS, constellationCost, constellationStats, isUnlocked, statText, type StatKey } from '@idle/shared';
import { Button, Cost, Icon, Panel, css } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { BackHeader, Locked } from '../common';
import { stageText } from '../MapTab';

export function Constellation() {
  const s = useGameState();
  const cfg = useCfg();
  if (!isUnlocked({ s, cfg }, 'constellation'))
    return (
      <div className={css.col}>
        <BackHeader title={t('cons.title')} />
        <Locked text={t('common.unlocksAt', { stage: stageText(cfg.unlocks.stage.constellation) })} />
      </div>
    );
  const cost = constellationCost({ cfg }, s.constellation);
  const cur = Math.min(11, Math.floor(s.constellation / 20));
  const bonus = constellationStats(s.constellation);
  return (
    <div className={css.col}>
      <BackHeader title={t('cons.title')} right={<Cost cur="starDust" amount={s.cur.starDust} />} />
      <Panel>
        <div className={css.tiny}>{t('cons.desc')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
          {CONSTELLATIONS.map((c, i) => {
            const n = Math.max(0, Math.min(20, s.constellation - i * 20));
            return (
              <div key={c.id} style={{ textAlign: 'center', padding: 6, borderRadius: 6, border: `1.5px solid ${i === cur ? 'var(--accent)' : 'var(--frame-dark)'}`, background: 'radial-gradient(circle,#1e1a3a,#0e0a18)' }}>
                <svg viewBox="0 0 40 40" width="100%" height={46}>
                  {Array.from({ length: 20 }, (_, k) => {
                    const a = (k / 20) * Math.PI * 2 + i;
                    const r = 8 + ((k * 7 + i * 3) % 11);
                    const x = 20 + Math.cos(a) * r;
                    const y = 20 + Math.sin(a) * r;
                    return <rect key={k} x={x - 1} y={y - 1} width={2} height={2} fill={k < n ? '#ffe8a0' : '#3a3a5a'} />;
                  })}
                </svg>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{tl(c.name)}</div>
                <div className={css.tiny}>{n}/20</div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title={t('cons.stars', { n: s.constellation })}>
        {s.constellation < 240 && (
          <>
            <div className={css.tiny}>{t('cons.next', { name: tl(CONSTELLATIONS[cur].name) })} — {tl(CONSTELLATIONS[cur].desc)}</div>
            <div className={css.row} style={{ marginTop: 8 }}>
              <Button block onClick={() => void useGame.getState().act('constellation.buy', { count: 1 })}>
                <Icon name="star" size={18} />
                {t('cons.buy')} <Cost cur="starDust" amount={cost} />
              </Button>
              <Button kind="secondary" onClick={() => void useGame.getState().act('constellation.buy', { count: 10 })}>
                {t('cons.buy10')}
              </Button>
            </div>
          </>
        )}
        <div className={css.divider} />
        <div className={css.tiny}>{t('cons.bonuses')}</div>
        {Object.entries(bonus.stats).map(([k, v]) => (
          <div key={k} className={css.statRow}>
            {statText(k as StatKey, v as number, getLang())}
          </div>
        ))}
        {bonus.offline > 0 && <div className={css.statRow}>+{Math.round(bonus.offline * 100)}% offline</div>}
        {bonus.loot > 0 && <div className={css.statRow}>+{Math.round(bonus.loot * 100)}% loot</div>}
        {bonus.inv > 0 && <div className={css.statRow}>+{bonus.inv} inventory</div>}
        {bonus.capHours > 0 && <div className={css.statRow}>+{bonus.capHours.toFixed(1)}h cap</div>}
        <div className={css.statRow}>+{Math.floor(s.constellation / 10)} {t('tree.points', { n: '' }).replace(':', '').trim()}</div>
      </Panel>
    </div>
  );
}
