import type { CombatEvent } from '@idle/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../audio/sfx';
import { battleSpeed } from '../battle/director';
import { manualEnabled, runLive } from '../battle/live';
import { mvpOf } from '../battle/mvp';
import { BattleRenderer } from '../battle/renderer';
import { t } from '../i18n';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { MvpCard } from './Mvp';
import { UltBar } from './UltBar';
import { Button, css } from './ui';

type View = { outcome?: ReactNode; result?: ReactNode };

/** Бой с ручным управлением: действие отправляется после боя вместе с командами игрока. */
export interface LiveSpec {
  type: string;
  params: Record<string, unknown>;
  render: (res: any) => View;
  /** итог действия (после отправки на сервер) — для экранов, которым он нужен */
  onResult?: (res: any) => void;
}

interface Props {
  events?: CombatEvent[];
  win?: boolean;
  live?: LiveSpec;
  act: number;
  title: string;
  result?: ReactNode;
  /** Свой заголовок итога вместо «Победа/Поражение» (например, урон по Колоссу). */
  outcome?: ReactNode;
  onClose: () => void;
}

/** Бой режима (Башня, подземелье, Колосс, праздник…) в отдельной сцене. */
function BattleModal({ events, win, live, act, title, result, outcome, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<({ win: boolean; mvp?: string | null } & View) | null>(null);
  const ctrl = useRef(new AbortController());

  useEffect(() => {
    const r = new BattleRenderer();
    let alive = true;
    let played: CombatEvent[] = events ?? [];
    const finish = (v: { win: boolean } & View) => {
      if (!alive) return;
      setDone({ ...v, mvp: v.win ? mvpOf(played) : null });
      sfx(v.win ? 'victory' : 'defeat');
      if (v.win) haptic.success();
      else haptic.error();
    };
    void r.init(host.current!).then(async () => {
      if (!alive) return;
      if (live) {
        const res = await runLive(
          live.type,
          live.params,
          (lb) => {
            played = lb.events;
            return r.play({ events: lb.events, live: lb, win: lb.win, act, kind: 'mode', speed: battleSpeed(), label: title }, ctrl.current.signal);
          },
          manualEnabled(),
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
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden', paddingBottom: 'var(--safe-bottom)' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle} style={{ padding: '10px 12px 6px', margin: 0 }}>
        {title}
      </div>
      <div ref={host} style={{ position: 'relative', height: 'min(46vh, 360px)', minHeight: 240, overflow: 'hidden', background: '#0c0a1c' }} />
      {!done && <UltBar />}
      <div style={{ padding: 12 }}>
        {done ? (
          <div className={css.col}>
            <div className={css.title} style={{ textAlign: 'center', fontSize: 22, color: done.win ? 'var(--accent)' : 'var(--bad)' }}>
              {done.outcome ?? (done.win ? t('common.victory') : t('common.defeat'))}
            </div>
            {done.mvp && <MvpCard hero={done.mvp} />}
            {done.win || done.outcome ? done.result : <div className={css.tiny} style={{ textAlign: 'center' }}>{t('battle.loseHint')}</div>}
            <Button block onClick={onClose}>
              {t('common.ok')}
            </Button>
          </div>
        ) : (
          <Button kind="secondary" block onClick={() => ctrl.current.abort()}>
            {t('tut.skip')}
          </Button>
        )}
      </div>
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

/**
 * Бой в режиме: живая сцена (ульты и парирование вручную, если включено), итог — свой заголовок и награды.
 * Возвращает результат действия (null — бой не состоялся или закрыт).
 */
export function playMode(type: string, params: Record<string, unknown>, title: string, act: number, render: (res: any) => View): Promise<any> {
  return new Promise((resolve) => {
    let got: any = null;
    showBattle({
      live: {
        type,
        params,
        render,
        onResult: (res) => {
          got = res;
        },
      },
      act,
      title,
      onClose: () => resolve(got),
    });
  });
}
