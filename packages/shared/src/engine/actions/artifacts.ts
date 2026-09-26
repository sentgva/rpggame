import { ARTIFACTS, ARTIFACT_BANNER, ARTIFACT_MAP, ARTIFACT_MAX, ARTIFACT_RARITIES, ARTIFACT_REFUND, artifactSlots, type ArtifactRarity } from '../../content';
import type { PlayerState, ArtifactState } from '../../types';
import type { Action } from '../apply';
import { assert, give, requireUnlocked, spend, track, vInt, type Ctx } from '../core';
import { dayKey } from '../state';

export interface ArtifactPull {
  id: string;
  rarity: ArtifactRarity;
  isNew: boolean;
  lvl: number;
  /** кристаллы за дубликат максимального уровня */
  refund: number;
}

export function artifactState(s: PlayerState): ArtifactState {
  return s.artifacts ?? { owned: {}, slots: [], pitySSR: 0, pityUR: 0, total: 0 };
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

export function artifactFreeReady(ctx: Pick<Ctx, 's' | 'now'>): boolean {
  return artifactState(ctx.s).freeDay !== dayKey(ctx.now);
}

function pull(ctx: Ctx, r: ArtifactState): ArtifactPull {
  const { rng } = ctx;
  r.pitySSR++;
  r.pityUR++;
  r.total++;
  const rates = ARTIFACT_BANNER.rates;
  let rarity: ArtifactRarity;
  if (r.pityUR >= ARTIFACT_BANNER.pityUR) rarity = 'UR';
  else {
    rarity = ARTIFACT_RARITIES[rng.weighted(ARTIFACT_RARITIES.map((x) => rates[x]))];
    if (r.pitySSR >= ARTIFACT_BANNER.pitySSR && (rarity === 'R' || rarity === 'SR')) rarity = rng.chance(rates.UR / (rates.SSR + rates.UR)) ? 'UR' : 'SSR';
  }
  if (rarity === 'UR') {
    r.pityUR = 0;
    r.pitySSR = 0;
  } else if (rarity === 'SSR') r.pitySSR = 0;
  const id = rng.pick(ARTIFACTS.filter((x) => x.rarity === rarity)).id;
  const lvl = r.owned[id] ?? 0;
  if (lvl === 0) {
    r.owned[id] = 1;
    // первый артефакт сразу встаёт в свободный слот
    const n = artifactSlots(ctx.s.account.lvl);
    while (r.slots.length < n) r.slots.push(null);
    const free = r.slots.findIndex((x, i) => i < n && !x);
    if (free >= 0) r.slots[free] = id;
    return { id, rarity, isNew: true, lvl: 1, refund: 0 };
  }
  if (lvl < ARTIFACT_MAX) {
    r.owned[id] = lvl + 1;
    return { id, rarity, isNew: false, lvl: lvl + 1, refund: 0 };
  }
  give(ctx, { crystals: ARTIFACT_REFUND[rarity] });
  return { id, rarity, isNew: false, lvl, refund: ARTIFACT_REFUND[rarity] };
}

export const artifactActions = {
  /** Призыв артефактов: 1 или 10 за кристаллы, раз в день — бесплатно. */
  'artifact.summon': (ctx: Ctx, a: Action) => {
    requireUnlocked(ctx, 'artifacts');
    const free = a.free === true;
    const count = free ? 1 : vInt(a.count, 1, 10, 'count');
    assert(count === 1 || count === 10, 'badParam', { name: 'count' });
    const r: ArtifactState = structuredClone(artifactState(ctx.s));
    if (free) {
      assert(artifactFreeReady(ctx), 'usedToday');
      r.freeDay = dayKey(ctx.now);
    } else spend(ctx, { crystals: count === 10 ? ARTIFACT_BANNER.cost10 : ARTIFACT_BANNER.cost1 });
    const pulls: ArtifactPull[] = [];
    for (let i = 0; i < count; i++) pulls.push(pull(ctx, r));
    ctx.s.artifacts = r;
    track(ctx, 'artifactSummon', count);
    ctx.events.push({ name: 'artifact_summon', props: { count, free } });
    return { pulls };
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
