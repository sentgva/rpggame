import type { BattleEvent } from '@idle/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { battleSpeed } from '../battle/director';
import { BattleRenderer } from '../battle/renderer';
import { t } from '../i18n';
import { useUi } from '../store/ui';
import { sfx } from '../audio/sfx';
import { haptic } from '../tg/telegram';
import { Button, css } from './ui';

interface Props {
  events: BattleEvent[];
  win: boolean;
  act: number;
  title: string;
  result?: ReactNode;
  /** Свой заголовок итога вместо «Победа/Поражение» (например, урон по Колоссу). */
  outcome?: ReactNode;
  onClose: () => void;
}

/** Бой режима (подземелье, Башня, арена, лабиринт…) в отдельной сцене. */
function BattleModal({ events, win, act, title, result, outcome, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const ctrl = useRef(new AbortController());

  useEffect(() => {
    const r = new BattleRenderer();
    let alive = true;
    void r.init(host.current!).then(async () => {
      if (!alive) return;
      await r.play({ events, win, act, kind: 'mode', speed: battleSpeed(), label: title }, ctrl.current.signal);
      if (!alive) return;
      setDone(true);
      sfx(win ? 'victory' : 'defeat');
      if (win) haptic.success();
      else haptic.error();
    });
    return () => {
      alive = false;
      ctrl.current.abort();
      r.destroy();
    };
  }, []);

  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, paddingBottom: 'calc(12px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>{title}</div>
      <div ref={host} style={{ position: 'relative', height: 280, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--frame)', background: '#0e0a0c' }} />
      {done ? (
        <div className={css.col} style={{ marginTop: 8 }}>
          <div className={css.title} style={{ textAlign: 'center', color: win ? 'var(--accent-2)' : '#ff8070' }}>
            {outcome ?? (win ? t('common.victory') : t('common.defeat'))}
          </div>
          {result}
          <Button block onClick={onClose}>
            {t('common.ok')}
          </Button>
        </div>
      ) : (
        <div className={css.row} style={{ marginTop: 8 }}>
          <Button
            kind="secondary"
            block
            onClick={() => {
              ctrl.current.abort();
            }}
          >
            {t('tut.skip')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function showBattle(p: Omit<Props, 'onClose'> & { onClose?: () => void }) {
  useUi.getState().open(
    (close) => (
      <BattleModal
        {...p}
        onClose={() => {
          close();
          p.onClose?.();
        }}
      />
    ),
    { sticky: true },
  );
}
