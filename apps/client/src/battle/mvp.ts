import { HEROINE_MAP, type BattleEvent } from '@idle/shared';

/** Лучший герой боя: больше всех урона (лечение и связки тоже в счёт). */
export function mvpOf(events: BattleEvent[]): string | null {
  const start = events.find((e) => e.k === 'start');
  if (!start || start.k !== 'start') return null;
  const refs = new Map<number, string>();
  for (const u of start.units) if (u.side === 0 && HEROINE_MAP[u.ref] && !u.mirror) refs.set(u.uid, u.ref);
  const score = new Map<string, number>();
  const add = (uid: number, v: number) => {
    const ref = refs.get(uid);
    if (ref) score.set(ref, (score.get(ref) ?? 0) + v);
  };
  for (const e of events) {
    if (e.k === 'dmg') add(e.u, e.v);
    else if (e.k === 'heal') add(e.u, e.v * 0.8);
  }
  let best: string | null = null;
  let max = -1;
  for (const [ref, v] of score)
    if (v > max) {
      max = v;
      best = ref;
    }
  return best;
}
