import { useEffect, useState } from 'react';
import { Panel, Tabs, css, formatNum } from '../../components/ui';
import { t } from '../../i18n';
import { useGame } from '../../store/game';

interface Row {
  rank: number;
  name: string;
  score: number;
  me?: boolean;
}

/** Рейтинги (социальный модуль): этап, Башня, арена. */
export function Leaderboard() {
  const [board, setBoard] = useState<'stage' | 'tower' | 'arena'>('stage');
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void useGame
      .getState()
      .backend()
      .dev('leaderboard', { board })
      .catch(() => [])
      .then((r) => setRows((r as Row[]) ?? []));
  }, [board]);
  return (
    <Panel title={t('guild.leaderboard')}>
      <Tabs
        value={board}
        onChange={setBoard}
        items={[
          { id: 'stage', label: t('map.title') },
          { id: 'tower', label: t('mode.tower') },
          { id: 'arena', label: t('mode.arena') },
        ]}
      />
      <div className={css.list} style={{ marginTop: 8 }}>
        {rows.map((r) => (
          <div key={r.rank} className={css.listItem} style={r.me ? { borderColor: 'var(--accent)' } : undefined}>
            <b style={{ width: 28 }}>{r.rank}</b>
            <span className={css.grow}>{r.name}</span>
            <b className={css.num}>{formatNum(r.score)}</b>
          </div>
        ))}
        {rows.length === 0 && <div className={css.muted}>—</div>}
      </div>
    </Panel>
  );
}
