import type { BattleEvent } from '@idle/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { battleSpeed } from '../battle/director';
import { runLive } from '../battle/live';
import { BattleRenderer } from '../battle/renderer';
import { t } from '../i18n';
import { useUi } from '../store/ui';
import { sfx } from '../audio/sfx';
import { haptic } from '../tg/telegram';
import { UltBar } from './UltBar';
import { Button, css } from './ui';

type View = { outcome?: ReactNode; result?: ReactNode };

/** Бой с ручными ультами: действие отправляется после боя с командами игрока. */
export interface LiveSpec {
  type: string;
  params: Record<string, unknown>;
  render: (res: any) => View;
  /** итог действия (после отправки на сервер) — для экранов, которым он нужен */
  onResult?: (res: any) => void;
}

interface Props {
  events?: BattleEvent[];
  win?: boolean;
  live?: LiveSpec;
  act: number;
  title: string;
  result?: ReactNode;
  /** Свой заголовок итога вместо «Победа/Поражение» (например, урон по Колоссу). */
  outcome?: ReactNode;
  onClose: () => void;
}

/** Бой режима (подземелье, Башня, арена, лабиринт…) в отдельной сцене. */
function BattleModal({ events, win, live, act, title, result, outcome, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<({ win: boolean } & View) | null>(null);
  const ctrl = useRef(new AbortController());

  useEffect(() => {
    const r = new BattleRenderer();
    let alive = true;
    const finish = (v: { win: boolean } & View) => {
      if (!alive) return;
      setDone(v);
      sfx(v.win ? 'victory' : 'defeat');
      if (v.win) haptic.success();
      else haptic.error();
    };
    void r.init(host.current!).then(async () => {
      if (!alive) return;
      if (live) {
        const res = await runLive(live.type, live.params, (lb) =>
          r.play({ events: lb.events, live: lb, win: lb.win, act, kind: 'mode', speed: battleSpeed(), label: title }, ctrl.current.signal),
        );
        if (!res) {
          if (alive) onClose();
          return;
        }
        live.onResult?.(res.result);
        const b = res.result.battle as { win: boolean };
        finish({ win: b.win, ...live.render(res.result) });
        return;
      }
      await r.play({ events: events ?? [], win: !!win, act, kind: 'mode', speed: battleSpeed(), label: title }, ctrl.current.signal);
      finish({ win: !!win, outcome, result });
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
      <div style={{ position: 'relative' }}>
        <div ref={host} style={{ position: 'relative', height: 280, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', background: '#0e0d22' }} />
        {!done && <UltBar />}
      </div>
      {done ? (
        <div className={css.col} style={{ marginTop: 8 }}>
          <div className={css.title} style={{ textAlign: 'center', color: done.win ? 'var(--accent-2)' : 'var(--bad)' }}>
            {done.outcome ?? (done.win ? t('common.victory') : t('common.defeat'))}
          </div>
          {done.win || done.outcome ? done.result : null}
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
