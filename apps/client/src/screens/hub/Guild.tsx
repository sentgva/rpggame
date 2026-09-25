import { Icon, Panel, css } from '../../components/ui';
import { t } from '../../i18n';
import { useGame } from '../../store/game';
import { BackHeader } from '../common';
import { Leaderboard } from './Leaderboard';

export function Guild() {
  const social = useGame((g) => g.flags.social);
  return (
    <div className={css.col}>
      <BackHeader title={t('guild.title')} />
      {!social ? (
        <Panel>
          <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
            <Icon name="guildCoins" size={64} />
            <p style={{ lineHeight: 1.5 }}>{t('guild.disabled')}</p>
          </div>
        </Panel>
      ) : (
        <Leaderboard />
      )}
    </div>
  );
}
