import { useEffect, useRef, useState } from 'react';
import { registerPlayer } from './director';
import { BattleRenderer } from './renderer';

/**
 * Один рендерер на всё приложение: при переключении вкладок холст переносится, а не создаётся
 * заново (новые WebGL-контексты дороги, и браузер ограничивает их число). Если контекст потерян
 * (Telegram свернули, GPU сбросился), рендерер пересоздаётся.
 */
let shared: BattleRenderer | null = null;
let sharedInit: Promise<void> | null = null;

export function getRenderer(): BattleRenderer | null {
  return shared?.isReady ? shared : null;
}

function ensureRenderer(): { r: BattleRenderer; ready: Promise<void> } {
  if (!shared || shared.lost) {
    shared?.destroy();
    shared = new BattleRenderer();
    sharedInit = shared.init();
  }
  return { r: shared, ready: sharedInit! };
}

/** Холст PixiJS со сценой боя. Регистрируется как «проигрыватель» у режиссёра. */
export function BattleView() {
  const host = useRef<HTMLDivElement>(null);
  const [gen, setGen] = useState(0);

  useEffect(() => {
    const el = host.current!;
    const { r, ready } = ensureRenderer();
    let alive = true;
    r.onContextLost = () => {
      if (alive) setGen((g) => g + 1);
    };
    void ready.then(() => {
      if (!alive || r !== shared || !r.isReady) return;
      r.attach(el);
      registerPlayer((p, signal) => r.play(p, signal));
    });
    const ro = new ResizeObserver(() => {
      if (el.clientWidth && el.clientHeight && r.isReady) r.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
      registerPlayer(null);
      r.onContextLost = null;
      r.detach();
    };
  }, [gen]);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />;
}
