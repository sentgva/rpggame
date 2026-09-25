/**
 * Реклама с наградой — только по желанию игрока. Провайдер: Adsgram (если задан
 * VITE_ADSGRAM_BLOCK_ID). С месячной картой реклама заменяется бесплатной наградой.
 */
import { useGame } from '../store/game';

declare global {
  interface Window {
    Adsgram?: { init(o: { blockId: string }): { show(): Promise<{ done: boolean }> } };
  }
}

const BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID as string | undefined;
let loading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.Adsgram) return Promise.resolve();
  if (!loading)
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://sad.adsgram.ai/js/sad.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('adsgram'));
      document.head.appendChild(s);
    });
  return loading;
}

export function adsAvailable(): boolean {
  const g = useGame.getState();
  const s = g.state!;
  if (s.shop.monthlyUntil > g.now()) return true;
  return !!BLOCK_ID || g.isDev || g.flags.ads;
}

/** Нужно ли реально показывать рекламу (без месячной карты). */
export function adRequired(): boolean {
  const g = useGame.getState();
  return !(g.state!.shop.monthlyUntil > g.now());
}

/** Показать рекламу; true — награда положена. */
export async function showRewardedAd(): Promise<boolean> {
  if (!adRequired()) return true;
  if (BLOCK_ID) {
    try {
      await loadSdk();
      const res = await window.Adsgram!.init({ blockId: BLOCK_ID }).show();
      return !!res?.done;
    } catch {
      return false;
    }
  }
  // dev-сборка без рекламной сети: имитируем просмотр
  if (useGame.getState().isDev) {
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }
  return false;
}
