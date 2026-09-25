import { achievementClaimable, isUnlocked } from '@idle/shared';
import { Icon, css } from '../components/ui';
import { t } from '../i18n';
import { questClaimable } from '../store/badges';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { Achievements } from './hub/Achievements';
import { Ascension } from './hub/Ascension';
import { Constellation } from './hub/Constellation';
import { DevPanel } from './hub/DevPanel';
import { Guild } from './hub/Guild';
import { Mail } from './hub/Mail';
import { Pass } from './hub/Pass';
import { Quests } from './hub/Quests';
import { Settings } from './hub/Settings';
import { Shop } from './hub/Shop';
import { Story } from './hub/Story';
import { Summon } from './hub/Summon';

export default function HubTab() {
  const stack = useUi((u) => u.stacks.hub);
  const top = stack[stack.length - 1];
  switch (top?.id) {
    case 'summon':
      return <Summon />;
    case 'shop':
      return <Shop initial={top.params?.tab} />;
    case 'quests':
      return <Quests />;
    case 'pass':
      return <Pass />;
    case 'mail':
      return <Mail />;
    case 'achievements':
      return <Achievements />;
    case 'constellation':
      return <Constellation />;
    case 'ascension':
      return <Ascension />;
    case 'guild':
      return <Guild />;
    case 'settings':
      return <Settings />;
    case 'dev':
      return <DevPanel />;
    case 'story':
      return <Story />;
    default:
      return <HubRoot />;
  }
}

function HubRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const isDev = useGame((g) => g.isDev);
  const items: { id: string; icon: string; label: string; badge?: boolean; locked?: boolean }[] = [
    { id: 'summon', icon: 'summon', label: t('hub.summon'), badge: !s.day.freeSummon || s.cur.scrolls > 0 },
    { id: 'shop', icon: 'shop', label: t('hub.shop') },
    { id: 'quests', icon: 'quest', label: t('hub.quests'), badge: questClaimable(s) > 0 || s.quests.login.claimedKey !== s.day.key },
    { id: 'pass', icon: 'pass', label: t('hub.pass') },
    { id: 'mail', icon: 'mail', label: t('hub.mail'), badge: s.mail.some((m) => !m.claimed && m.rewards) },
    { id: 'achievements', icon: 'trophy', label: t('hub.achievements'), badge: achievementClaimable(s) > 0 },
    { id: 'constellation', icon: 'constellation', label: t('hub.constellation'), locked: !isUnlocked({ s, cfg }, 'constellation') },
    { id: 'ascension', icon: 'ascension', label: t('hub.ascension'), locked: !isUnlocked({ s, cfg }, 'ascension') },
    { id: 'guild', icon: 'guildCoins', label: t('hub.guild') },
    { id: 'story', icon: 'xp', label: t('hub.story') },
    { id: 'settings', icon: 'settings', label: t('hub.settings') },
  ];
  if (isDev) items.push({ id: 'dev', icon: 'dev', label: t('hub.dev') });

  return (
    <div className={css.col}>
      <div className={css.title} style={{ margin: '2px 4px' }}>
        {t('hub.title')}
      </div>
      <div className={css.grid3}>
        {items.map((it) => (
          <button
            key={it.id}
            className={css.panel}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '14px 6px', opacity: it.locked ? 0.5 : 1, color: 'inherit' }}
            onClick={() => {
              haptic.tap();
              useUi.getState().push({ id: it.id });
            }}
          >
            <Icon name={it.icon} size={44} />
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 16 }}>{it.label}</span>
            {it.badge && <span className={css.dot} style={{ top: 6, right: 6 }} />}
            {it.locked && <Icon name="lock" size={16} style={{ position: 'absolute', top: 6, left: 6 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
