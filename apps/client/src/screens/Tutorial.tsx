import { isUnlocked } from '@idle/shared';
import { heroUrl } from '../art/runtime';
import { Button, css } from '../components/ui';
import { t } from '../i18n';
import { canLevelAny } from '../store/badges';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';

interface Step {
  text: string;
  when: () => boolean;
  tab?: string;
}

/** Воронка обучения по шагам (каждый шаг — аналитическое событие на сервере). */
export function Tutorial() {
  const s = useGameState();
  const cfg = useCfg();
  const tab = useUi((u) => u.tab);
  const modals = useUi((u) => u.modals.length);
  const steps: Step[] = [
    { text: t('tut.welcome'), when: () => true, tab: 'battle' },
    { text: t('tut.chest'), when: () => s.chest.minutes >= 1 || s.progress.cleared[0] >= 1, tab: 'battle' },
    { text: t('tut.boss'), when: () => s.progress.wave >= 3, tab: 'battle' },
    { text: t('tut.heroes'), when: () => canLevelAny(s, cfg) },
    { text: t('tut.gear'), when: () => Object.keys(s.items).length > 0 },
    { text: t('tut.tree'), when: () => isUnlocked({ s, cfg }, 'tree') },
    { text: t('tut.summon'), when: () => s.cur.crystals >= cfg.summon.cost1 || s.cur.scrolls > 0 },
  ];
  const step = steps[s.tutorial];
  if (!step || modals > 0) return null;
  if (!step.when()) return null;
  if (step.tab && step.tab !== tab) return null;

  const next = () => void useGame.getState().act('tutorial', { step: s.tutorial + 1 }, { silent: true });
  const skip = () => void useGame.getState().act('tutorial', { step: 99 }, { silent: true });

  return (
    <div
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 8px)',
        zIndex: 50,
        animation: 'slide-up .25s var(--ease)',
      }}
    >
      <div className={css.panel} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8 }}>
        <img className="pixel" src={heroUrl('lira')} width={56} height={56} alt="" style={{ flex: 'none' }} />
        <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>{step.text}</div>
        <div className={css.col} style={{ gap: 4 }}>
          <Button size="small" onClick={next}>
            {t('tut.next')}
          </Button>
          <Button size="small" kind="ghost" onClick={skip}>
            {t('tut.skip')}
          </Button>
        </div>
      </div>
    </div>
  );
}
