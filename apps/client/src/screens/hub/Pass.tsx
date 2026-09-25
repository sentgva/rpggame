import { PASS_LEVELS, PASS_XP_PER_LEVEL, passLevel, passReward, seasonEnd, SKIN_MAP } from '@idle/shared';
import { Bar, CUR_ICON, Icon, Panel, css, fmtTime, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { BackHeader, showReward } from '../common';

export function Pass() {
  const s = useGameState();
  const now = useGame.getState().now();
  const lvl = passLevel(s);
  const claim = async (level: number) => {
    const r = await useGame.getState().act('pass.claim', { level });
    if (r.ok) showReward(t('pass.title'), { cur: r.result.cur, items: r.result.item ? [r.result.item] : undefined, skin: r.result.skin });
  };
  return (
    <div className={css.col}>
      <BackHeader title={t('pass.title')} />
      <Panel title={t('pass.level', { n: lvl })} right={<span className={css.tiny}>{t('pass.ends', { time: fmtTime(seasonEnd(now) - now) })}</span>}>
        <Bar value={s.shop.passXp % PASS_XP_PER_LEVEL} max={PASS_XP_PER_LEVEL} height={10} text={`${s.shop.passXp % PASS_XP_PER_LEVEL}/${PASS_XP_PER_LEVEL}`} />
        <div className={css.tiny} style={{ marginTop: 4 }}>{t('pass.xpHint')}</div>
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((level) => {
          const r = passReward(level);
          const claimed = s.shop.passClaimed.includes(level);
          const can = lvl >= level && !claimed;
          const cur = Object.entries(r.cur ?? {})[0];
          return (
            <button
              key={level}
              className={css.chip}
              style={{ flexDirection: 'column', width: '100%', padding: 4, gap: 2, opacity: claimed ? 0.4 : 1, borderColor: can ? 'var(--accent)' : undefined, animation: can ? 'pulse 1.4s infinite' : undefined }}
              onClick={() => can && void claim(level)}
            >
              <span style={{ fontSize: 10, color: lvl >= level ? 'var(--accent-2)' : 'var(--text-3)' }}>{level}</span>
              <Icon name={r.skin ? 'heroes' : r.item ? 'weapon' : cur ? CUR_ICON[cur[0]] : 'gift'} size={22} />
              <span style={{ fontSize: 10 }}>{r.skin ? tl(SKIN_MAP[r.skin]?.name) : r.item ? r.item : cur ? (cur[0] === 'gold' ? `${cur[1]}m` : formatNum(cur[1] ?? 0)) : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
