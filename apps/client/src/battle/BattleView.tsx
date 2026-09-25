import { useEffect, useRef } from 'react';
import { registerPlayer } from './director';
import { BattleRenderer } from './renderer';

let shared: BattleRenderer | null = null;

export function getRenderer(): BattleRenderer | null {
  return shared;
}

/** Холст PixiJS со сценой боя. Регистрируется как «проигрыватель» у режиссёра. */
export function BattleView() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const r = new BattleRenderer();
    let alive = true;
    void r.init(el).then(() => {
      if (!alive) return;
      shared = r;
      registerPlayer((p, signal) => r.play(p, signal));
    });
    const ro = new ResizeObserver(() => {
      if (el.clientWidth && el.clientHeight) r.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
      registerPlayer(null);
      if (shared === r) shared = null;
      r.destroy();
    };
  }, []);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />;
}
