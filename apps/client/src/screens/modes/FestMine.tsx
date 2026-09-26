import {
  MINE_CAP,
  MINE_DAILY,
  MINE_H,
  MINE_W,
  mineBoard,
  mineCanDig,
  mineGuarded,
  mineNeedsFight,
  mineOf,
  mineReward,
  mineVisible,
  type FestivalDef,
  type FestivalState,
  type MineTile,
} from '@idle/shared';
import { Icon, Panel, css, cx, formatNum } from '../../components/ui';
import { t } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { RewardList, showReward } from '../common';
import { playMode } from './Endgame';
import fs from './Festival.module.css';
import st from './FestModes.module.css';

/** Значок клетки (пиксельные иконки игры). */
const TILE_ICON: Record<MineTile, string> = {
  empty: '',
  ore: 'forgeMats',
  gem: 'gem',
  chest: 'chest',
  trap: 'fire',
  spring: 'water',
  monster: 'skull',
  stairs: 'down',
};

export function MineTab({ def, f }: { def: FestivalDef; f: FestivalState }) {
  const s = useGameState();
  const m = mineOf(s, f);
  const board = mineBoard(m.seed, m.floor);
  const seen = mineVisible(m.dug);
  const guarded = mineGuarded(m.floor);

  const dig = async (cell: number) => {
    const tile = board[cell];
    if (m.picks <= 0) return useUi.getState().toast(t('mine.noPicks'), 'info');
    if (mineNeedsFight(tile, m.floor)) {
      const act = def.mine?.acts[(m.floor - 1) % def.mine.acts.length] ?? 8;
      void playMode('mine.dig', { cell }, tile === 'stairs' ? t('mine.guard') : t('mine.monster'), act, (res) => ({
        outcome: res.win ? undefined : <span style={{ color: 'var(--bad)' }}>{t('mine.lost')}</span>,
        result: res.win ? (
          <div className={css.col}>
            <RewardList r={{ cur: res.reward.cur, shards: res.reward.shards, hearts: res.reward.hearts }} />
            {res.reward.floor && <b>{t('mine.floorDown', { n: res.reward.floor })}</b>}
            <div className={fs.pointsGain}>{t('fest.pointsGain', { n: res.reward.points })}</div>
          </div>
        ) : undefined,
      }));
      return;
    }
    const r = await useGame.getState().act('mine.dig', { cell });
    if (!r.ok) return;
    const rw = r.result.reward;
    // крупное — окном, мелочь — всплывающей строкой
    if (tile === 'chest' || tile === 'stairs')
      showReward(tile === 'stairs' ? t('mine.floorDown', { n: rw.floor }) : t('mine.chest'), { cur: rw.cur, shards: rw.shards, hearts: rw.hearts }, <div className={fs.pointsGain}>{t('fest.pointsGain', { n: rw.points })}</div>);
    else {
      const parts = [
        rw.cur?.eventTokens ? `+${formatNum(rw.cur.eventTokens)} ${t('cur.eventTokens').toLowerCase()}` : '',
        rw.picks > 0 ? t('mine.picksGain', { n: rw.picks }) : rw.picks < 0 ? t('mine.trap', { n: -rw.picks }) : '',
        rw.points ? t('fest.pointsGain', { n: rw.points }) : '',
      ].filter(Boolean);
      useUi.getState().toast(parts.join(' · ') || t('mine.empty'), rw.picks < 0 ? 'bad' : 'good');
    }
  };

  return (
    <div className={css.col}>
      <Panel>
        <div className={st.mineHead}>
          <div>
            <div className={st.floor}>{t('mine.floor', { n: m.floor })}</div>
            <div className={css.tiny}>{t('mine.best', { n: m.best })}</div>
          </div>
          <div className={st.picks}>
            <Icon name="forge" size={22} />
            <b>{m.picks}</b>
            <span className={css.tiny}>/{MINE_CAP}</span>
          </div>
        </div>
        <div className={st.board} style={{ gridTemplateColumns: `repeat(${MINE_W}, minmax(0, 1fr))` }}>
          {board.map((tile, i) => {
            const dug = m.dug.includes(i);
            const visible = seen.has(i);
            const can = mineCanDig(m.dug, i);
            const icon = visible && !dug ? TILE_ICON[tile] : '';
            return (
              <button
                key={i}
                className={cx(st.cell, dug ? st.cellDug : visible ? st.cellSeen : st.cellFog, can && st.cellCan, tile === 'stairs' && visible && !dug && st.cellStairs)}
                disabled={!can}
                onClick={() => void dig(i)}
                aria-label={visible ? t(`mine.tile.${tile}`) : '?'}
              >
                {icon && <Icon name={icon} size={20} />}
                {tile === 'stairs' && visible && !dug && guarded && <span className={st.guardMark}>!</span>}
              </button>
            );
          })}
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('mine.rules', { daily: MINE_DAILY, cap: MINE_CAP })}
        </div>
      </Panel>
      <Panel title={t('mine.legend')}>
        <div className={st.legend}>
          {(['ore', 'gem', 'chest', 'spring', 'trap', 'monster', 'stairs'] as MineTile[]).map((k) => {
            const r = mineReward(k, m.floor);
            return (
              <div key={k} className={st.legendRow}>
                <Icon name={TILE_ICON[k]} size={20} />
                <b>{t(`mine.tile.${k}`)}</b>
                <span className={css.tiny}>
                  {k === 'trap'
                    ? t('mine.picksLoss', { n: -r.picks })
                    : k === 'spring'
                      ? t('mine.picksGain', { n: r.picks })
                      : k === 'chest'
                        ? t('mine.chestHint')
                        : k === 'stairs'
                          ? guarded
                            ? t('mine.stairsGuard')
                            : t('mine.stairsHint')
                          : k === 'monster'
                            ? t('mine.monsterHint', { tokens: r.tokens })
                            : `+${r.tokens}`}
                </span>
              </div>
            );
          })}
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('mine.depth', { h: MINE_H })}
        </div>
      </Panel>
    </div>
  );
}
