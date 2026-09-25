import { Button, Icon, Panel, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { BackHeader, RewardList } from '../common';

export function Mail() {
  const s = useGameState();
  const mails = [...s.mail].reverse();
  return (
    <div className={css.col}>
      <BackHeader
        title={t('mail.title')}
        right={
          <Button size="small" kind="secondary" onClick={() => void useGame.getState().act('mail.claim', { id: 'all' })} disabled={!mails.some((m) => !m.claimed && m.rewards)}>
            {t('common.claimAll')}
          </Button>
        }
      />
      {mails.length === 0 && <div className={css.muted}>{t('mail.empty')}</div>}
      {mails.map((m) => (
        <Panel key={m.id} title={<span className={css.row}><Icon name="mail" size={20} />{tl(m.title)}</span>} right={<span className={css.tiny}>{new Date(m.at).toLocaleDateString()}</span>}>
          <p style={{ margin: '0 0 8px', lineHeight: 1.45, fontSize: 13 }}>{tl(m.body)}</p>
          {m.rewards && <RewardList r={{ cur: m.rewards.cur, shards: m.rewards.shards, heroes: m.rewards.heroes }} />}
          {m.rewards && (
            <Button size="small" style={{ marginTop: 8 }} disabled={m.claimed} onClick={() => void useGame.getState().act('mail.claim', { id: m.id })}>
              {m.claimed ? t('common.claimed') : t('common.claim')}
            </Button>
          )}
        </Panel>
      ))}
      {mails.some((m) => m.claimed) && (
        <Button kind="ghost" size="small" onClick={() => void useGame.getState().act('mail.delete')}>
          {t('mail.deleteRead')}
        </Button>
      )}
    </div>
  );
}
