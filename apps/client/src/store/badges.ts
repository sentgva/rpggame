import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  achievementClaimable,
  goldToNext,
  levelCap,
  xpToNext,
  type Config,
  type PlayerState,
} from '@idle/shared';
import { useMemo } from 'react';
import { useGame } from './game';
import type { Tab } from './ui';

export function questClaimable(s: PlayerState): number {
  let n = 0;
  for (const q of DAILY_QUESTS) if (!s.quests.dailyClaimed.includes(q.id) && (s.quests.daily[q.counter] ?? 0) >= q.target) n++;
  for (const q of WEEKLY_QUESTS) if (!s.quests.weeklyClaimed.includes(q.id) && (s.quests.weekly[q.counter] ?? 0) >= q.target) n++;
  return n;
}

export function canLevelAny(s: PlayerState, cfg: Config): boolean {
  const party = s.party.presets[s.party.active].filter(Boolean) as string[];
  return party.some((id) => {
    const h = s.heroines[id];
    return h && h.lvl < levelCap(cfg, h) && s.cur.xp >= xpToNext(cfg, h.lvl) && s.cur.gold >= goldToNext(cfg, h.lvl);
  });
}

export function useBadges(): Record<Tab, boolean> {
  const s = useGame((g) => g.state)!;
  const cfg = useGame((g) => g.cfg)!;
  const now = useGame.getState().now();
  return useMemo(() => {
    const newItems = Object.values(s.items).some((i) => i.isNew);
    const mail = s.mail.some((m) => !m.claimed && m.rewards);
    const login = s.quests.login.claimedKey !== s.day.key;
    const expReady = s.modes.expeditions.some((e) => e.end <= now);
    return {
      battle: s.progress.wave >= 3,
      heroes: canLevelAny(s, cfg),
      gear: newItems,
      map: expReady,
      hub: questClaimable(s) > 0 || mail || login || achievementClaimable(s) > 0 || !s.day.freeSummon,
    };
  }, [s, cfg, now]);
}
