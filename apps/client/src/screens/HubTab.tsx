import { BOND_COSTUME_HEARTS, BOND_HEROES, BOND_MAX, HEROINE_MAP, achievementClaimable, artifactFreeReady, bondState, isUnlocked } from '@idle/shared';
import { HeroImg } from '../components/HeroImg';
import { openNews } from '../components/News';
import { Icon, css } from '../components/ui';
import { t, tl } from '../i18n';
import { questClaimable } from '../store/badges';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { Achievements } from './hub/Achievements';
import { Ascension } from './hub/Ascension';
import { Care } from './hub/Care';
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
import st from './HubTab.module.css';

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
    case 'care':
      return <Care hero={top.params?.hero} home={top.params?.home} />;
    default:
      return <HubRoot />;
  }
}

function HubRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const isDev = useGame((g) => g.isDev);
  const social = useGame((g) => g.flags.social);
  const now = useGame.getState().now();
  // уход: сегодня ещё никого не навещали — или можно открыть наряд близости
  const care = BOND_HEROES.filter((id) => s.heroines[id]).map((id) => bondState({ s, now }, id));
  const careBadge =
    (care.length > 0 && care.every((b) => b.talk === 0 && b.treat === 0 && !b.spa && !b.date)) ||
    ((s.bondHearts ?? 0) >= BOND_COSTUME_HEARTS && BOND_HEROES.some((id) => s.heroines[id] && (s.bond?.[id]?.lvl ?? 0) >= BOND_MAX && !s.skins.includes(`${id}_bond`)));
  const main: Item[] = [
    { id: 'summon', icon: 'summon', label: t('hub.summon'), tint: '#9b8ac4', badge: !s.day.freeSummon || s.cur.scrolls > 0 || (isUnlocked({ s, cfg }, 'artifacts') && artifactFreeReady({ s, now })) },
    { id: 'care', icon: 'care', label: t('hub.care'), tint: '#c98b94', badge: careBadge },
    { id: 'quests', icon: 'quest', label: t('hub.quests'), tint: '#6fa3a0', badge: questClaimable(s) > 0 || s.quests.login.claimedKey !== s.day.key },
    { id: 'shop', icon: 'shop', label: t('hub.shop'), tint: '#c9a45c' },
  ];
  const more: Item[] = [
    { id: 'pass', icon: 'pass', label: t('hub.pass') },
    { id: 'mail', icon: 'mail', label: t('hub.mail'), badge: s.mail.some((m) => !m.claimed && m.rewards) },
    { id: 'achievements', icon: 'trophy', label: t('hub.achievements'), badge: achievementClaimable(s) > 0 },
    { id: 'constellation', icon: 'constellation', label: t('hub.constellation'), locked: !isUnlocked({ s, cfg }, 'constellation') },
    { id: 'ascension', icon: 'ascension', label: t('hub.ascension'), locked: !isUnlocked({ s, cfg }, 'ascension') },
    ...(social ? [{ id: 'guild', icon: 'guildCoins', label: t('hub.guild') }] : []),
    { id: 'story', icon: 'xp', label: t('hub.story') },
    { id: 'news', icon: 'news', label: t('hub.news') },
    { id: 'settings', icon: 'settings', label: t('hub.settings') },
  ];
  if (isDev) more.push({ id: 'dev', icon: 'dev', label: t('hub.dev') });
  const leader = s.party.presets[s.party.active].find(Boolean) ?? 'lira';
  const open = (id: string) => {
    haptic.tap();
    if (id === 'news') openNews(true);
    else useUi.getState().push({ id });
  };

  return (
    <div className={css.col} style={{ gap: 12 }}>
      <div className={st.hero}>
        <div className={st.heroText}>
          <div className={st.heroKicker}>{t('hub.kicker')}</div>
          <div className={st.heroTitle}>{t('hub.title')}</div>
          <div className={st.heroSub}>{t('hub.sub', { name: tl(HEROINE_MAP[leader]?.name) })}</div>
        </div>
        <HeroImg id={leader} skin={s.heroines[leader]?.skin} className={st.heroImg} />
      </div>

      <div className={st.main}>
        {main.map((it) => (
          <button key={it.id} className={st.mainTile} style={{ ['--tint' as string]: it.tint }} onClick={() => open(it.id)}>
            <span className={st.mainIcon}>
              <Icon name={it.icon} size={52} />
            </span>
            <span className={st.mainLabel}>{it.label}</span>
            {it.badge && <span className={css.dot} style={{ top: 9, right: 9 }} />}
          </button>
        ))}
      </div>

      <div className={st.more}>
        {more.map((it) => (
          <button key={it.id} className={st.moreTile} style={it.locked ? { opacity: 0.4 } : undefined} onClick={() => open(it.id)}>
            <span className={st.moreIcon}>
              <Icon name={it.icon} size={44} />
              {it.badge && <span className={css.dot} style={{ top: 4, right: 4 }} />}
              {it.locked && <Icon name="lock" size={18} style={{ position: 'absolute', bottom: 2, right: 2 }} />}
            </span>
            <span className={st.moreLabel}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Item {
  id: string;
  icon: string;
  label: string;
  tint?: string;
  badge?: boolean;
  locked?: boolean;
}
