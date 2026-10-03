import {
  BANNER,
  BOND_COSTUME_HEARTS,
  BOND_HEROES,
  BOND_MAX,
  PHOTO_DAILY,
  achievementClaimable,
  bannerCost,
  bondState,
  campfireScene,
  campfireState,
  isUnlocked,
  photoState,
  stageLabel,
  stageRef,
} from '@idle/shared';
import { openNews } from '../components/News';
import { Icon, css, cx } from '../components/ui';
import { t } from '../i18n';
import { questClaimable } from '../store/badges';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { Achievements } from './hub/Achievements';
import { Adjutant } from './hub/Adjutant';
import { Banner } from './hub/Banner';
import { Campfire } from './hub/Campfire';
import { Care } from './hub/Care';
import { DevPanel } from './hub/DevPanel';
import { Guild } from './hub/Guild';
import { Mail } from './hub/Mail';
import { Pass } from './hub/Pass';
import { Photo } from './hub/Photo';
import { Quests } from './hub/Quests';
import { Settings } from './hub/Settings';
import { Shop } from './hub/Shop';
import { Story } from './hub/Story';
import { Festival, FestivalBanner } from './modes/Festival';
import st from './HubTab.module.css';

export default function HubTab() {
  const stack = useUi((u) => u.stacks.hub);
  const top = stack[stack.length - 1];
  switch (top?.id) {
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
    case 'banner':
      return <Banner />;
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
    case 'campfire':
      return <Campfire />;
    case 'festival':
      return <Festival />;
    case 'photo':
      return <Photo />;
    default:
      return <HubRoot />;
  }
}

interface Tile {
  id: string;
  icon: string;
  label: string;
  sub?: string;
  color?: string;
  badge?: boolean;
  feature?: string;
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
  const shots = photoState({ s, now }).shots;
  const bannerBuy = BANNER.some((b) => {
    const c = bannerCost(cfg, s, b.id);
    return c !== null && s.cur.gold >= c;
  });
  const main: Tile[] = [
    { id: 'care', icon: 'care', label: t('hub.care'), sub: t('hub.careSub'), color: '#ff7eb6', badge: careBadge, feature: 'care' },
    { id: 'campfire', icon: 'fire', label: t('hub.campfire'), sub: t('hub.campfireSub'), color: '#ff9a4a', badge: !!campfireScene({ s, now }) && !campfireState({ s, now }).done, feature: 'campfire' },
    { id: 'photo', icon: 'camera', label: t('hub.photo'), sub: t('hub.photoSub', { n: Math.max(0, PHOTO_DAILY - shots), max: PHOTO_DAILY }), color: '#a58bff', badge: shots < PHOTO_DAILY, feature: 'photo' },
    { id: 'banner', icon: 'banner', label: t('hub.banner'), sub: t('hub.bannerSub'), color: '#ffc14d', badge: bannerBuy, feature: 'banner' },
  ];
  const more: Tile[] = [
    { id: 'quests', icon: 'quest', label: t('hub.quests'), badge: questClaimable(s) > 0 || s.quests.login.claimedKey !== s.day.key },
    { id: 'pass', icon: 'pass', label: t('hub.pass') },
    { id: 'shop', icon: 'shop', label: t('hub.shop') },
    { id: 'mail', icon: 'mail', label: t('hub.mail'), badge: s.mail.some((m) => !m.claimed && m.rewards) },
    { id: 'achievements', icon: 'trophy', label: t('hub.achievements'), badge: achievementClaimable(s) > 0 },
    { id: 'story', icon: 'xp', label: t('hub.story') },
    ...(social ? [{ id: 'guild', icon: 'guildCoins', label: t('hub.guild') }] : []),
    { id: 'news', icon: 'news', label: t('hub.news') },
    { id: 'settings', icon: 'settings', label: t('hub.settings') },
    ...(isDev ? [{ id: 'dev', icon: 'dev', label: t('hub.dev') }] : []),
  ];
  const open = (it: Tile) => {
    if (it.feature && !isUnlocked({ s, cfg }, it.feature)) {
      haptic.error();
      useUi.getState().toast(t('common.unlocksAt', { stage: stageLabel(stageRef((cfg.unlocks.stage as Record<string, number>)[it.feature])) }), 'info');
      return;
    }
    haptic.tap();
    if (it.id === 'news') openNews(true);
    else useUi.getState().push({ id: it.id });
  };

  return (
    <div className={css.col}>
      <Adjutant />
      <FestivalBanner onOpen={() => useUi.getState().push({ id: 'festival' })} />
      <div className={st.main}>
        {main.map((it) => {
          const locked = !!it.feature && !isUnlocked({ s, cfg }, it.feature);
          return (
            <button key={it.id} className={cx(st.mainTile, locked && st.locked)} style={{ ['--c' as string]: it.color }} onClick={() => open(it)}>
              <Icon name={locked ? 'lock' : it.icon} size={40} className={st.mainIcon} />
              {!locked && it.badge && <span className={st.dot} style={{ left: 8, right: 'auto' }} />}
              <span className={st.mainLabel}>{it.label}</span>
              <span className={st.mainSub}>{locked ? t('common.unlocksAt', { stage: stageLabel(stageRef((cfg.unlocks.stage as Record<string, number>)[it.feature!])) }) : it.sub}</span>
            </button>
          );
        })}
      </div>
      <div className={st.grid}>
        {more.map((it) => (
          <button key={it.id} className={st.tile} onClick={() => open(it)}>
            <Icon name={it.icon} size={34} />
            <span className={st.tileLabel}>{it.label}</span>
            {it.badge && <span className={st.dot} />}
          </button>
        ))}
      </div>
    </div>
  );
}
