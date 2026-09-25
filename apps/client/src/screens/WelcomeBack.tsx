import { HEROINE_MAP, capMinutes, type Config, type PlayerState } from '@idle/shared';
import { useState } from 'react';
import { heroUrl } from '../art/runtime';
import { Button, Icon, Sheet, css, fmtTime, formatNum } from '../components/ui';
import { t, tl } from '../i18n';
import { previewChest, useCfg, useGame, useGameState } from '../store/game';
import { collectChest } from './BattleTab';
import { RewardList } from './common';

export function shouldWelcome(s: PlayerState, cfg: Config, lastSeen: number, now: number): boolean {
  const chest = previewChest(s, cfg, now);
  return now - lastSeen > 5 * 60000 && chest.minutes >= 5;
}

export function WelcomeBack({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const [now] = useState(() => useGame.getState().now());
  const away = now - useGame.getState().sessionLastSeen;
  const chest = previewChest(s, cfg, now);
  const cap = capMinutes(cfg, s, now);
  const items = Math.floor(chest.itemMin / cfg.income.itemEveryMin);
  const [result, setResult] = useState<any>(null);

  if (result) {
    const levels = Object.entries(result.levels as Record<string, number>);
    const total = levels.reduce((a, [, n]) => a + n, 0);
    return (
      <Sheet title={t('welcome.collected')} onClose={onClose}>
        <RewardList r={{ cur: { gold: result.gold, xp: result.xp, dust: result.dust }, items: result.items }} />
        {total > 0 && (
          <>
            <div className={css.divider} />
            <div className={css.muted}>{t('welcome.levels', { n: total })}</div>
            <div className={css.row} style={{ flexWrap: 'wrap', marginTop: 6 }}>
              {levels.map(([id, n]) => (
                <span key={id} className={css.chip}>
                  <img className="pixel" src={heroUrl(id)} width={20} height={20} alt="" />
                  {tl(HEROINE_MAP[id].name)} +{n}
                </span>
              ))}
            </div>
          </>
        )}
        <div style={{ height: 12 }} />
        <Button block onClick={onClose}>
          {t('common.ok')}
        </Button>
      </Sheet>
    );
  }

  return (
    <Sheet title={t('welcome.title')}>
      <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
        <Icon name="chestOpen" size={72} />
        <div className={css.muted}>{t('welcome.away', { time: fmtTime(away) })}</div>
        {chest.minutes >= cap && <div className={css.gold}>{t('welcome.full', { h: cap / 60 })}</div>}
        <div className={css.row} style={{ gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className={css.cost} style={{ fontSize: 18 }}>
            <Icon name="gold" size={28} />
            {formatNum(chest.gold)}
          </span>
          <span className={css.cost} style={{ fontSize: 18 }}>
            <Icon name="xp" size={28} />
            {formatNum(chest.xp)}
          </span>
          <span className={css.cost} style={{ fontSize: 18 }}>
            <Icon name="gear" size={28} />
            {items}
          </span>
        </div>
        <Button
          size="big"
          block
          pulse
          onClick={async () => {
            const r = await collectChest(true);
            if (r) setResult(r);
            else onClose();
          }}
        >
          {t('welcome.collect')}
        </Button>
      </div>
    </Sheet>
  );
}
