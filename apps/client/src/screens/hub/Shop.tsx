import {
  HEROINES,
  SHOP_OFFERS,
  SKINS,
  SKIN_MAP,
  STARS_PRODUCTS,
  canBuyProduct,
  weekKey,
  type Currency,
  type ShopOffer,
} from '@idle/shared';
import { useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { Button, Cost, Icon, Panel, Tabs, css, fmtTime, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic, openInvoice } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader } from '../common';

type ShopTab = 'stars' | 'shards' | 'daily' | 'arena' | 'labyrinth' | 'event' | 'guild';

export function Shop({ initial }: { initial?: ShopTab }) {
  const [tab, setTab] = useState<ShopTab>(initial ?? 'stars');
  const social = useGame((g) => g.flags.social);
  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'stars', label: t('shop.stars') },
    { id: 'shards', label: t('shop.shards') },
    { id: 'daily', label: t('shop.daily') },
    { id: 'arena', label: t('shop.arena') },
    { id: 'labyrinth', label: t('shop.labyrinth') },
    { id: 'event', label: t('shop.event') },
  ];
  if (social) tabs.push({ id: 'guild', label: t('shop.guild') });
  return (
    <div className={css.col}>
      <BackHeader title={t('shop.title')} />
      <Tabs<ShopTab> value={tab} onChange={setTab} items={tabs} />
      {tab === 'stars' ? <StarsShop /> : <CurrencyShop shop={tab} />}
    </div>
  );
}

/** Покупка за Telegram Stars: счёт создаёт сервер, выдача — только после successful_payment. */
export async function buyStars(product: string) {
  const g = useGame.getState();
  const backend = g.backend();
  const before = JSON.stringify(g.state!.shop.bought) + g.state!.skins.length;
  try {
    const url = await backend.invoice(product);
    if (!url) {
      useUi.getState().toast(t('shop.unavailable'), 'bad');
      return;
    }
    const status = url === 'local:paid' ? 'paid' : await openInvoice(url);
    if (status === 'paid') {
      // ждём, пока сервер обработает successful_payment
      for (let i = 0; i < 8; i++) {
        await g.resync();
        const now = useGame.getState().state!;
        if (JSON.stringify(now.shop.bought) + now.skins.length !== before) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
      sfx('rare');
      haptic.success();
      useUi.getState().toast(t('shop.paid'), 'good');
    } else if (status === 'cancelled') useUi.getState().toast(t('shop.cancelled'), 'info');
  } catch {
    useUi.getState().toast(t('err.network'), 'bad');
  }
}

function StarsShop() {
  const s = useGameState();
  const g = useGame();
  const now = g.now();
  const shopSkins = SKINS.filter((x) => x.source === 'shop' && x.stars);
  return (
    <>
      <div className={css.tiny} style={{ textAlign: 'center' }}>
        {t('shop.starsOnly')}
      </div>
      {STARS_PRODUCTS.map((p) => {
        const can = canBuyProduct({ s, now }, p.id);
        const bought = s.shop.bought[p.id] ?? 0;
        let note = '';
        if (p.firstDouble && bought === 0) note = t('shop.first2');
        if (p.kind === 'starter' && can) note = t('shop.starterEnds', { time: fmtTime(s.shop.starterUntil - now) });
        if (p.kind === 'monthly' && s.shop.monthlyUntil > now) note = t('shop.monthlyActive', { date: new Date(s.shop.monthlyUntil).toLocaleDateString() });
        if (p.kind === 'pass' && s.shop.passUntil > now) note = t('shop.passActive');
        if (p.kind === 'starter' && !can && bought === 0) return null;
        return (
          <Panel key={p.id}>
            <div className={css.row}>
              <Icon name={p.kind === 'crystals' ? 'crystals' : p.kind === 'monthly' ? 'mail' : p.kind === 'pass' ? 'pass' : p.kind === 'starter' ? 'gift' : p.kind === 'event' ? 'eventTokens' : 'shop'} size={40} />
              <div className={css.grow}>
                <b>{tl(p.name)}</b>
                <div className={css.tiny}>{tl(p.desc)}</div>
                {note && <div className={css.gold} style={{ fontSize: 12, fontWeight: 700 }}>{note}</div>}
              </div>
              <Button size="small" disabled={!can} onClick={() => void buyStars(p.id)}>
                {can ? `${p.stars} ★` : t('shop.bought')}
              </Button>
            </div>
          </Panel>
        );
      })}
      <div className={css.title} style={{ fontSize: 15 }}>
        {t('shop.skins')}
      </div>
      <div className={css.grid3}>
        {shopSkins.map((sk) => {
          const owned = s.skins.includes(sk.id);
          return (
            <div key={sk.id} className={css.hero} onClick={() => !owned && void buyStars(`skin:${sk.id}`)}>
              <img className={css.heroSprite} src={heroUrl(sk.hero, sk.id)} alt="" />
              <div className={css.heroName}>{tl(SKIN_MAP[sk.id].name)}</div>
              <div className={css.tiny}>{owned ? t('shop.bought') : `${sk.stars} ★`}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CurrencyShop({ shop }: { shop: Exclude<ShopTab, 'stars'> }) {
  const s = useGameState();
  const now = useGame.getState().now();
  const offers = SHOP_OFFERS.filter((o) => o.shop === shop);
  const walletCur: Record<string, Currency> = { shards: 'crystals', daily: 'crystals', arena: 'arenaTokens', labyrinth: 'labCoins', event: 'eventTokens', guild: 'guildCoins' };
  return (
    <>
      <Panel>
        <div className={css.row} style={{ justifyContent: 'center' }}>
          <Cost cur={walletCur[shop]} amount={s.cur[walletCur[shop]]} size={22} />
        </div>
      </Panel>
      {offers.map((o) => {
        const period = o.shop === 'daily' ? s.day.key : o.weekly ? weekKey(now) : 'all';
        const key = period === 'all' ? o.id : `${o.id}@${period}`;
        const bought = s.shop.bought[key] ?? 0;
        const soldOut = (o.limit !== undefined && bought >= o.limit) || (o.give.skin && s.skins.includes(o.give.skin));
        return (
          <Panel key={o.id}>
            <div className={css.row}>
              {o.give.skin ? (
                <img className="pixel" src={heroUrl(SKIN_MAP[o.give.skin].hero, o.give.skin)} width={44} height={44} alt="" />
              ) : (
                <Icon name={o.give.shardsRarity ? 'star' : o.give.item ? 'weapon' : Object.keys(o.give.cur ?? {})[0] ?? 'gift'} size={36} />
              )}
              <div className={css.grow}>
                <b>{tl(o.name)}</b>
                {o.limit !== undefined && <div className={css.tiny}>{t('shop.limit', { n: bought, max: o.limit })}</div>}
              </div>
              <Button size="small" disabled={!!soldOut} onClick={() => void buyOffer(o)}>
                {Object.entries(o.cost).map(([c, v]) => (
                  <Cost key={c} cur={c} amount={v ?? 0} size={14} />
                ))}
              </Button>
            </div>
          </Panel>
        );
      })}
    </>
  );
}

async function buyOffer(o: ShopOffer) {
  if (o.give.shardsRarity) {
    const list = HEROINES.filter((h) => !h.boss && h.rarity === o.give.shardsRarity);
    openSheet(t('shop.pickHero'), (close) => (
      <div className={css.grid4}>
        {list.map((h) => (
          <div
            key={h.id}
            className={css.hero}
            onClick={async () => {
              const r = await useGame.getState().act('shop.buy', { offer: o.id, hero: h.id });
              if (r.ok) {
                useUi.getState().toast(`${tl(h.name)} +${o.give.shards}`, 'good');
                close();
              }
            }}
          >
            <img className={css.heroSprite} style={{ width: 52, height: 52 }} src={heroUrl(h.id)} alt="" />
            <div className={css.heroName}>{tl(h.name)}</div>
            <div className={css.tiny}>{useGame.getState().state!.shards[h.id] ?? 0}</div>
          </div>
        ))}
      </div>
    ));
    return;
  }
  const r = await useGame.getState().act('shop.buy', { offer: o.id });
  if (r.ok) {
    sfx('coin');
    useUi.getState().toast(tl(o.name), 'good');
  }
}
