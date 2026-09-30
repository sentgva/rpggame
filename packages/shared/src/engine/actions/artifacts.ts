import { ARTIFACT_MAP, ARTIFACT_TIER_STAGE, artifactCost, artifactSlots } from '../../content';
import type { PlayerState, ArtifactState } from '../../types';
import type { Action } from '../apply';
import { assert, requireUnlocked, spend, track, vInt, vStr, type Ctx } from '../core';

export function artifactState(s: PlayerState): ArtifactState {
  return s.artifacts ?? { owned: {}, slots: [] };
}

/** Артефакты в слотах отряда — для боя. */
export function activeArtifacts(s: PlayerState): { id: string; lvl: number }[] {
  const r = s.artifacts;
  if (!r) return [];
  const n = artifactSlots(s.account.lvl);
  const out: { id: string; lvl: number }[] = [];
  for (const id of r.slots.slice(0, n)) if (id && r.owned[id] && ARTIFACT_MAP[id]) out.push({ id, lvl: r.owned[id] });
  return out;
}

/** Чертёж открыт: ступень артефакта доступна на текущем прогрессе кампании. */
export function artifactOpen(s: PlayerState, id: string): boolean {
  const d = ARTIFACT_MAP[id];
  return !!d && s.progress.maxGlobalEver >= ARTIFACT_TIER_STAGE[d.rarity];
}

export const artifactActions = {
  /** Мастерская: изготовить артефакт или повысить его уровень (до 5) за материалы. */
  'artifact.craft': (ctx: Ctx, a: Action) => {
    requireUnlocked(ctx, 'artifacts');
    const id = vStr(a.id, 'id');
    assert(ARTIFACT_MAP[id], 'badParam', { name: 'id' });
    assert(artifactOpen(ctx.s, id), 'requirements');
    const r: ArtifactState = structuredClone(artifactState(ctx.s));
    const lvl = r.owned[id] ?? 0;
    const cost = artifactCost(id, lvl);
    assert(cost, 'maxRank');
    spend(ctx, cost);
    r.owned[id] = lvl + 1;
    if (lvl === 0) {
      // новый артефакт сразу встаёт в свободный слот
      const n = artifactSlots(ctx.s.account.lvl);
      while (r.slots.length < n) r.slots.push(null);
      const free = r.slots.findIndex((x, i) => i < n && !x);
      if (free >= 0) r.slots[free] = id;
    }
    ctx.s.artifacts = r;
    track(ctx, 'artifactCraft', 1);
    ctx.events.push({ name: 'artifact_craft', props: { id, lvl: lvl + 1 } });
    return { id, lvl: lvl + 1, isNew: lvl === 0 };
  },

  /** Поставить артефакт в слот отряда (или снять: id = null). */
  'artifact.equip': (ctx: Ctx, a: Action) => {
    requireUnlocked(ctx, 'artifacts');
    const n = artifactSlots(ctx.s.account.lvl);
    const slot = vInt(a.slot, 0, n - 1, 'slot');
    const r: ArtifactState = structuredClone(artifactState(ctx.s));
    const id = a.id === null ? null : String(a.id ?? '');
    if (id !== null) {
      assert(ARTIFACT_MAP[id] && r.owned[id], 'badParam', { name: 'id' });
      // артефакт один — переносим из другого слота
      r.slots = r.slots.map((x) => (x === id ? null : x));
    }
    while (r.slots.length < n) r.slots.push(null);
    r.slots[slot] = id;
    ctx.s.artifacts = r;
    return { slots: r.slots };
  },
};
