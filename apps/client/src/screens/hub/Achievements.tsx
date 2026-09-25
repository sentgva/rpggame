import { ACHIEVEMENTS, ACHIEVEMENT_TOTAL, metric } from '@idle/shared';
import { Bar, Button, Icon, Panel, css, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { BackHeader } from '../common';

export function Achievements() {
  const s = useGameState();
  const claimedTotal = Object.values(s.achievements).reduce((a, b) => a + b, 0);
  const claim = async (id: string) => {
    const r = await useGame.getState().act('ach.claim', { id });
    if (r.ok) useUi.getState().toast(`+${r.result.crystals} ${t('cur.crystals')}`, 'good');
  };
  return (
    <div className={css.col}>
      <BackHeader
        title={t('ach.title')}
        right={
          <Button size="small" kind="secondary" onClick={() => void claim('all')}>
            {t('common.claimAll')}
          </Button>
        }
      />
      <div className={css.tiny}>
        {claimedTotal}/{ACHIEVEMENT_TOTAL}
      </div>
      {ACHIEVEMENTS.map((a) => {
        const tier = s.achievements[a.id] ?? 0;
        const v = metric(s, a.metric);
        const done = tier >= a.tiers.length;
        const target = a.tiers[Math.min(tier, a.tiers.length - 1)];
        const ready = !done && v >= target;
        return (
          <Panel key={a.id}>
            <div className={css.row}>
              <Icon name="trophy" size={32} style={{ opacity: tier > 0 ? 1 : 0.4 }} />
              <div className={css.grow}>
                <b>{tl(a.name)}</b>
                <div className={css.tiny}>{t('ach.tier', { n: tier, max: a.tiers.length })}{a.title && s.titles.includes(a.id) ? ` · «${tl(a.title)}»` : ''}</div>
                {!done ? <Bar value={Math.min(v, target)} max={target} text={t('ach.progress', { v: formatNum(v), target: formatNum(target) })} height={12} /> : <div className={css.goodText}>{t('ach.done')}</div>}
              </div>
              <Button size="small" disabled={!ready} onClick={() => void claim(a.id)}>
                {t('common.claim')}
              </Button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
