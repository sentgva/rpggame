import { SKIN_MAP, STARS_PRODUCT_MAP } from '../../content';
import type { Currency } from '../../types';
import type { Action } from '../apply';
import { addHeroine, addItem, assert, farmLevel, give, rollLoot, vStr, type Ctx } from '../core';
import { dayKey, seasonEnd } from '../state';

const DAY = 86400000;

/** Цена товара в Stars (включая облики, продаваемые за Stars). */
export function productStars(id: string): number | null {
  if (id.startsWith('skin:')) {
    const skin = SKIN_MAP[id.slice(5)];
    return skin && skin.source === 'shop' && skin.stars ? skin.stars : null;
  }
  return STARS_PRODUCT_MAP[id]?.stars ?? null;
}

/** Можно ли сейчас купить товар (лимиты, сроки). */
export function canBuyProduct(ctx: Pick<Ctx, 's' | 'now'>, id: string): boolean {
  const { s, now } = ctx;
  if (id.startsWith('skin:')) return productStars(id) !== null && !s.skins.includes(id.slice(5));
  const p = STARS_PRODUCT_MAP[id];
  if (!p) return false;
  if (p.limit && (s.shop.bought[id] ?? 0) >= p.limit) return false;
  if (p.kind === 'starter' && now > s.shop.starterUntil) return false;
  if (p.kind === 'pass' && s.shop.passUntil > now) return false;
  return true;
}

export interface Granted {
  cur?: Partial<Record<Currency, number>>;
  hero?: string;
  items?: string[];
  skin?: string;
  monthlyDays?: number;
  pass?: boolean;
  invCap?: number;
  presets?: number;
}

/** Выдача товара — только после подтверждения платежа сервером (successful_payment). */
export function grantProduct(ctx: Ctx, id: string, chargeId: string): { granted: Granted } {
  const { s, now } = ctx;
  const granted: Granted = {};
  if (id.startsWith('skin:')) {
    const skinId = id.slice(5);
    assert(SKIN_MAP[skinId], 'badParam', { name: 'product' });
    if (!s.skins.includes(skinId)) s.skins.push(skinId);
    granted.skin = skinId;
  } else {
    const p = STARS_PRODUCT_MAP[id];
    assert(p, 'badParam', { name: 'product' });
    const count = s.shop.bought[id] ?? 0;
    switch (p.kind) {
      case 'crystals': {
        const amount = (p.crystals ?? 0) * (p.firstDouble && count === 0 ? 2 : 1);
        granted.cur = { crystals: amount };
        break;
      }
      case 'starter': {
        granted.cur = { crystals: p.crystals ?? 1000 };
        if (!addHeroine(ctx, 'astrid')) s.shards.astrid = (s.shards.astrid ?? 0) + 40;
        granted.hero = 'astrid';
        granted.items = [];
        for (const slot of ['helmet', 'armor', 'gloves', 'boots', 'belt', 'cloak'] as const) {
          const it = rollLoot(ctx, { lvl: Math.max(10, farmLevel(ctx.cfg, s)), forceRarity: 3, slot, set: 'verdant' });
          const uid = addItem(ctx, it, { noAutoSmelt: true });
          if (uid) granted.items.push(uid);
        }
        break;
      }
      case 'monthly': {
        granted.cur = { crystals: (p.crystals ?? 300) + 100 };
        s.shop.monthlyUntil = Math.max(now, s.shop.monthlyUntil) + 30 * DAY;
        s.shop.monthlyLastDay = dayKey(now);
        granted.monthlyDays = 30;
        break;
      }
      case 'pass': {
        s.shop.passUntil = seasonEnd(now);
        granted.pass = true;
        break;
      }
      case 'convenience': {
        if (id === 'inv100') {
          s.invCap += 100;
          granted.invCap = 100;
        } else if (id === 'presets') {
          while (s.party.presets.length < 5) s.party.presets.push([null, null, null, null, null]);
          granted.presets = 2;
        }
        break;
      }
      case 'event': {
        granted.cur = { scrolls: 10, eventTokens: 500 };
        break;
      }
      case 'skin': {
        if (p.skin && !s.skins.includes(p.skin)) s.skins.push(p.skin);
        granted.skin = p.skin;
        break;
      }
    }
    if (granted.cur) give(ctx, granted.cur);
    s.shop.bought[id] = count + 1;
  }
  ctx.events.push({ name: 'purchase', props: { product: id, charge: chargeId } });
  return { granted };
}

/** Отзыв выданного при возврате Stars (refundStarPayment). */
export function revokeProduct(ctx: Ctx, id: string, granted: Granted) {
  const { s } = ctx;
  if (granted.cur) for (const [c, v] of Object.entries(granted.cur)) s.cur[c as Currency] = Math.max(0, s.cur[c as Currency] - (v ?? 0));
  if (granted.skin) {
    s.skins = s.skins.filter((x) => x !== granted.skin);
    for (const h of Object.values(s.heroines)) if (h.skin === granted.skin) delete h.skin;
  }
  if (granted.items) for (const uid of granted.items) if (s.items[uid]) {
    for (const h of Object.values(s.heroines)) for (const k of Object.keys(h.gear)) if (h.gear[k as keyof typeof h.gear] === uid) delete h.gear[k as keyof typeof h.gear];
    delete s.items[uid];
  }
  if (granted.monthlyDays) s.shop.monthlyUntil = Math.max(ctx.now, s.shop.monthlyUntil - granted.monthlyDays * DAY);
  if (granted.pass) s.shop.passUntil = 0;
  if (granted.invCap) s.invCap = Math.max(ctx.cfg.inventory.start, s.invCap - granted.invCap);
  if (s.shop.bought[id]) s.shop.bought[id]--;
  ctx.events.push({ name: 'refund', props: { product: id } });
}

export const purchaseActions = {
  'purchase.grant': (ctx: Ctx, a: Action) => {
    const id = vStr(a.product, 'product');
    const charge = typeof a.charge === 'string' ? a.charge : 'unknown';
    return grantProduct(ctx, id, charge);
  },
  'purchase.revoke': (ctx: Ctx, a: Action) => {
    const id = vStr(a.product, 'product');
    revokeProduct(ctx, id, (a.granted ?? {}) as Granted);
    return {};
  },
  /** Сообщение в почту от сервера (компенсации, рефералы, рассылки). */
  'mail.add': (ctx: Ctx, a: Action) => {
    const m = a.mail as Ctx['s']['mail'][number];
    assert(m && typeof m.id === 'string', 'badParam', { name: 'mail' });
    if (!ctx.s.mail.some((x) => x.id === m.id)) ctx.s.mail.push({ ...m, at: ctx.now });
    return {};
  },
};
