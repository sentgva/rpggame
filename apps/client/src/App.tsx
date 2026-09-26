import { accountXpToNext, formatNum } from '@idle/shared';
import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import styles from './App.module.css';
import { portraitUrl } from './art/runtime';
import { HeroImg } from './components/HeroImg';
import { newsPending, openNews } from './components/News';
import { Bar, Button, Icon, ModalHost, Toasts, cx } from './components/ui';
import { t } from './i18n';
import { BattleTab } from './screens/BattleTab';
import { WelcomeBack, shouldWelcome } from './screens/WelcomeBack';
import { Tutorial } from './screens/Tutorial';
import { useBadges } from './store/badges';
import { startDirector } from './battle/director';
import { useCfg, useGame, useGameState } from './store/game';
import { navigate, useUi, type Tab } from './store/ui';
import { initAudio } from './audio/sfx';
import { haptic, pushBack, tgUser } from './tg/telegram';

const HeroesTab = lazy(() => import('./screens/HeroesTab'));
const GearTab = lazy(() => import('./screens/GearTab'));
const MapTab = lazy(() => import('./screens/MapTab'));
const HubTab = lazy(() => import('./screens/HubTab'));

const TABS: { id: Tab; icon: string }[] = [
  { id: 'battle', icon: 'battle' },
  { id: 'heroes', icon: 'heroes' },
  { id: 'gear', icon: 'gear' },
  { id: 'map', icon: 'map' },
  { id: 'hub', icon: 'hub' },
];

export function App() {
  const ready = useGame((g) => g.ready);
  const fatal = useGame((g) => g.fatal);

  useEffect(() => {
    void useGame.getState().init();
  }, []);

  if (!ready) return <Loading error={fatal} />;
  return <Game />;
}

function Loading({ error }: { error: string | null }) {
  return (
    <div className={styles.app}>
      <div className={styles.loading}>
        <div className={styles.logo}>IDLE RPG</div>
        <HeroImg className={styles.loadingSprite} id="lira" />
        <div style={{ color: error ? 'var(--bad)' : 'var(--text-2)' }}>{error ?? t('app.loading')}</div>
        {error && (
          <Button onClick={() => void useGame.getState().init()}>{t('app.retry')}</Button>
        )}
      </div>
    </div>
  );
}

function Game() {
  const tab = useUi((u) => u.tab);
  const stackLen = useUi((u) => u.stacks[u.tab].length);
  const mode = useGame((g) => g.mode);

  useEffect(() => {
    const stop = startDirector();
    initAudio();
    const g = useGame.getState();
    // «Что нового» — один раз после обновления (под окном «Пока вас не было»)
    if (newsPending(g.state!.settings.news)) openNews();
    if (shouldWelcome(g.state!, g.cfg!, g.sessionLastSeen, g.now())) {
      useUi.getState().open((close) => <WelcomeBack onClose={close} />, { sticky: true });
    }
    return stop;
  }, []);

  // «Назад» Telegram закрывает вложенный экран вкладки
  useEffect(() => {
    if (stackLen === 0) return;
    return pushBack(() => useUi.getState().pop());
  }, [stackLen, tab]);

  let content: ReactNode;
  switch (tab) {
    case 'battle':
      content = <BattleTab />;
      break;
    case 'heroes':
      content = <HeroesTab />;
      break;
    case 'gear':
      content = <GearTab />;
      break;
    case 'map':
      content = <MapTab />;
      break;
    case 'hub':
      content = <HubTab />;
      break;
  }

  return (
    <div className={styles.app}>
      <TopBar />
      {mode === 'local' && useGame.getState().isDev && tab === 'hub' && <div className={styles.modeBanner}>{t('app.localMode')}</div>}
      <div className={cx(styles.content, tab === 'battle' && styles.contentFlush)} key={tab}>
        <Suspense fallback={<div style={{ padding: 20, color: 'var(--text-2)' }}>…</div>}>{content}</Suspense>
      </div>
      <BottomNav />
      <Tutorial />
      <ModalHost />
      <Toasts />
    </div>
  );
}

function TopBar() {
  const s = useGameState();
  const cfg = useCfg();
  const leader = s.party.presets[s.party.active].find(Boolean) ?? 'lira';
  const user = tgUser();
  const need = accountXpToNext(cfg, s.account.lvl);
  return (
    <div className={styles.top}>
      <div className={styles.avatar} onClick={() => navigate('hub', { id: 'settings' })}>
        {user?.photo_url ? <img src={user.photo_url} alt="" style={{ imageRendering: 'auto' }} /> : <img src={portraitUrl(leader, s.heroines[leader]?.skin)} alt="" />}
        <span className={styles.lvl}>{s.account.lvl}</span>
      </div>
      <div className={styles.acc}>
        <div className={styles.accName}>{s.title ? `« ${s.name} »` : s.name}</div>
        <Bar value={s.account.xp} max={need} height={5} color="linear-gradient(90deg,#7ee0ff,#a98bff)" />
      </div>
      <div className={styles.res}>
        <Icon name="gold" size={22} />
        {formatNum(s.cur.gold)}
      </div>
      <div className={styles.res}>
        <Icon name="crystals" size={22} />
        {formatNum(s.cur.crystals)}
      </div>
    </div>
  );
}

function BottomNav() {
  const tab = useUi((u) => u.tab);
  const badges = useBadges();
  return (
    <nav className={styles.nav}>
      {TABS.map((x) => (
        <button
          key={x.id}
          className={cx(styles.navBtn, tab === x.id && styles.navActive)}
          onClick={() => {
            haptic.select();
            useUi.getState().setTab(x.id);
          }}
        >
          <span className={styles.navIcon}>
            <Icon name={x.icon} size={30} />
            {badges[x.id] && <span className="nav-dot" style={dotStyle} />}
          </span>
          {t(`nav.${x.id}`)}
        </button>
      ))}
    </nav>
  );
}

const dotStyle: React.CSSProperties = {
  position: 'absolute',
  top: -2,
  right: -5,
  width: 9,
  height: 9,
  borderRadius: '50%',
  background: 'var(--edge)',
  boxShadow: '0 0 0 2px #1c1a3c, 0 0 8px rgba(255,92,138,.8)',
};
