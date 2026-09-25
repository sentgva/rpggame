import type React from 'react';
import { PASS_LEVELS, PASS_XP_PER_LEVEL, passLevel, passReward, seasonEnd, SKIN_MAP } from '@idle/shared';
import { Bar, Button, CUR_ICON, Icon, Panel, css, fmtTime, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { BackHeader, showReward } from '../common';
import { buyStars } from './Shop';

export function Pass() {
  const s = useGameState();
  const now = useGame.getState().now();
  const lvl = passLevel(s);
  const premium = s.shop.passUntil > now;
  const claim = async (level: number, prem: boolean) => {
    const r = await useGame.getState().act('pass.claim', { level, premium: prem });
    if (r.ok) showReward(t('pass.title'), { cur: r.result.cur, items: r.result.item ? [r.result.item] : undefined, skin: r.result.skin });
  };
  const RewardCell = ({ level, prem }: { level: number; prem: boolean }) => {
    const r = passReward(level, prem);
    const claimed = (prem ? s.shop.passPremiumClaimed : s.shop.passClaimed).includes(level);
    const can = lvl >= level && !claimed && (!prem || premium);
    const cur = Object.entries(r.cur ?? {})[0];
    return (
      <button
        className={css.chip}
        style={{ flexDirection: 'column', width: '100%', padding: 4, opacity: claimed ? 0.4 : 1, borderColor: can ? 'var(--accent)' : undefined, animation: can ? 'pulse 1.4s infinite' : undefined }}
        onClick={() => can && void claim(level, prem)}
      >
        <Icon name={r.skin ? 'heroes' : r.item ? 'weapon' : cur ? CUR_ICON[cur[0]] : 'gift'} size={22} />
        <span style={{ fontSize: 10 }}>{r.skin ? tl(SKIN_MAP[r.skin]?.name) : r.item ? r.item : cur ? (cur[0] === 'gold' ? `${cur[1]}m` : formatNum(cur[1] ?? 0)) : ''}</span>
      </button>
    );
  };
  return (
    <div className={css.col}>
      <BackHeader title={t('pass.title')} />
      <Panel title={t('pass.level', { n: lvl })} right={<span className={css.tiny}>{t('pass.ends', { time: fmtTime(seasonEnd(now) - now) })}</span>}>
        <Bar value={s.shop.passXp % PASS_XP_PER_LEVEL} max={PASS_XP_PER_LEVEL} height={10} text={`${s.shop.passXp % PASS_XP_PER_LEVEL}/${PASS_XP_PER_LEVEL}`} />
        <div className={css.tiny} style={{ marginTop: 4 }}>{t('pass.xpHint')}</div>
        {!premium && (
          <Button block style={{ marginTop: 8 }} onClick={() => void buyStars('pass')}>
            {t('pass.buy')} · 450 ★
          </Button>
        )}
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 4, alignItems: 'center' }}>
        <span />
        <b className={css.tiny} style={{ textAlign: 'center' }}>{t('pass.free')}</b>
        <b className={css.tiny} style={{ textAlign: 'center', color: 'var(--accent-2)' }}>{t('pass.premium')}</b>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((level) => (
          <PassRow key={level} level={level} reached={lvl >= level} Cell={RewardCell} />
        ))}
      </div>
    </div>
  );
}

function PassRow({ level, reached, Cell }: { level: number; reached: boolean; Cell: (p: { level: number; prem: boolean }) => React.ReactElement }) {
  return (
    <>
      <span style={{ textAlign: 'center', fontWeight: 800, color: reached ? 'var(--accent-2)' : 'var(--text-3)' }}>{level}</span>
      <Cell level={level} prem={false} />
      <Cell level={level} prem={true} />
    </>
  );
}
