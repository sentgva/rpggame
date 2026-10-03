import { BANNER, bannerCost, bannerValue, isUnlocked, stageLabel, stageRef } from '@idle/shared';
import { sfx } from '../../audio/sfx';
import { Button, Cost, Icon, Panel, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { BackHeader, Locked } from '../common';
import st from '../HubTab.module.css';

/** Знамя Легиона: вечные улучшения аккаунта за золото. */
export function Banner() {
  const s = useGameState();
  const cfg = useCfg();
  if (!isUnlocked({ s, cfg }, 'banner'))
    return (
      <div className={css.col}>
        <BackHeader title={t('hub.banner')} />
        <Locked text={t('common.unlocksAt', { stage: stageLabel(stageRef(cfg.unlocks.stage.banner)) })} />
      </div>
    );
  return (
    <div className={css.col}>
      <BackHeader title={t('hub.banner')} />
      <div className={css.tiny}>{t('banner.hint')}</div>
      {BANNER.map((b) => {
        const lvl = s.banner[b.id] ?? 0;
        const cost = bannerCost(cfg, s, b.id);
        const v = bannerValue(s, b.id);
        return (
          <Panel key={b.id}>
            <div className={st.bannerRow}>
              <div className={st.bannerIcon}>
                <Icon name={b.icon} size={30} />
              </div>
              <div className={css.grow}>
                <div className={css.row} style={{ gap: 6 }}>
                  <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{tl(b.name)}</b>
                  <span className={css.tiny}>
                    {lvl}/{b.max}
                  </span>
                </div>
                <div className={css.tiny}>{tl(b.desc)}</div>
                <div className={st.bannerBar}>
                  <div style={{ width: `${(lvl / b.max) * 100}%` }} />
                </div>
                <div className={css.tiny} style={{ color: 'var(--good)' }}>
                  {b.id === 'chest' ? t('banner.nowMin', { n: v }) : t('banner.now', { pct: Math.round(v * 100) })}
                </div>
              </div>
              {cost !== null ? (
                <Button
                  size="small"
                  kind={s.cur.gold >= cost ? 'good' : 'secondary'}
                  onClick={async () => {
                    const r = await useGame.getState().act('banner.buy', { id: b.id });
                    if (r.ok) {
                      sfx('levelup');
                      haptic.success();
                    }
                  }}
                >
                  <Cost cur="gold" amount={cost} size={14} />
                </Button>
              ) : (
                <span className={css.gold} style={{ fontWeight: 800, fontSize: 12 }}>
                  MAX
                </span>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
