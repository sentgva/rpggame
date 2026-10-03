import {
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  achievementClaimable,
  activeParty,
  heroCanUpgrade,
  legionMaxLevel,
  levelCost,
  mergeGroups,
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

/** Хватает ли на следующий уровень Легиона. */
export function canLevelLegion(s: PlayerState, cfg: Config): boolean {
  if (s.legion.lvl >= legionMaxLevel(cfg)) return false;
  const c = levelCost(cfg, s.legion.lvl);
  return s.cur.gold >= c.gold && s.cur.xp >= c.xp;
}

export function useBadges(): Record<Tab, boolean> {
  const s = useGame((g) => g.state)!;
  const cfg = useGame((g) => g.cfg)!;
  return useMemo(() => {
    const newItems = Object.values(s.items).some((i) => i.isNew);
    const mail = s.mail.some((m) => !m.claimed && m.rewards);
    const login = s.quests.login.claimedKey !== s.day.key;
    return {
      battle: canLevelLegion(s, cfg),
      heroes: activeParty(s).some((id) => heroCanUpgrade(cfg, s, id)),
      gear: newItems || mergeGroups(s, 2).length > 0,
      map: false,
      hub: questClaimable(s) > 0 || mail || login || achievementClaimable(s) > 0,
    };
  }, [s, cfg]);
}
