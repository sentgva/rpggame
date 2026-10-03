import { HEROINES, HEROINE_MAP, SHOP_OFFERS, SKIN_MAP, weekKey, type Currency, type ShopOffer } from '@idle/shared';
import { useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { HeroImg } from '../../components/HeroImg';
import { Button, Cost, Icon, Panel, Tabs, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { sfx } from '../../audio/sfx';
import { BackHeader, skinSourceText } from '../common';

type ShopTab = 'emblems' | 'daily' | 'skins' | 'event';

export function Shop({ initial }: { initial?: ShopTab }) {
  const [tab, setTab] = useState<ShopTab>(initial ?? 'emblems');
  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'emblems', label: t('shop.emblems') },
    { id: 'daily', label: t('shop.daily') },
    { id: 'skins', label: t('shop.skins') },
    { id: 'event', label: t('shop.event') },
  ];
  return (
    <div className={css.col}>
      <BackHeader title={t('shop.title')} />
      <Tabs<ShopTab> value={tab} onChange={setTab} items={tabs} />
      <CurrencyShop shop={tab} />
    </div>
  );
}

type SkinFilter = 'all' | 'summer' | 'lingerie' | 'masquerade' | 'other';

function CurrencyShop({ shop }: { shop: ShopTab }) {
  const s = useGameState();
  const now = useGame.getState().now();
  const [filter, setFilter] = useState<SkinFilter>('all');
  const offers = SHOP_OFFERS.filter((o) => {
    if (o.shop !== shop) return false;
    if (shop !== 'skins' || filter === 'all') return true;
    const set = SKIN_MAP[o.give.skin!]?.set;
    return filter === 'other' ? !set : set === filter;
  });
  const walletCur: Record<string, Currency> = { daily: 'crystals', emblems: 'crystals', skins: 'crystals', event: 'eventTokens' };
  return (
    <>
      <Panel>
        <div className={css.row} style={{ justifyContent: 'center' }}>
          <Cost cur={walletCur[shop]} amount={s.cur[walletCur[shop]]} size={22} />
        </div>
        {shop === 'skins' && (
          <div className={css.row} style={{ gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {(['all', 'summer', 'lingerie', 'masquerade', 'other'] as const).map((f) => (
              <button key={f} className={cx(css.chip, filter === f && css.chipOn)} onClick={() => setFilter(f)}>
                {t(`shop.set.${f}`)}
              </button>
            ))}
          </div>
        )}
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
                <HeroImg className="pixel" id={SKIN_MAP[o.give.skin].hero} skin={o.give.skin} unarmed={!!SKIN_MAP[o.give.skin].look.wear} flirt={!!SKIN_MAP[o.give.skin].look.wear} width={56} height={56} />
              ) : (
                <Icon name={o.give.item ? 'weapon' : Object.keys(o.give.cur ?? {})[0] ?? 'gift'} size={36} />
              )}
              <div className={css.grow}>
                <b>{tl(o.name)}</b>
                {o.give.skin && <SkinNote id={o.give.skin} inSkinShop={shop === 'skins'} />}
                {o.limit !== undefined && !o.give.skin && <div className={css.tiny}>{t('shop.limit', { n: bought, max: o.limit })}</div>}
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

/** Под обликом: чья героиня и где ещё его можно получить. */
function SkinNote({ id, inSkinShop }: { id: string; inSkinShop: boolean }) {
  const sk = SKIN_MAP[id];
  const owned = useGameState().skins.includes(id);
  return (
    <div className={css.tiny}>
      {tl(HEROINE_MAP[sk.hero].name)}
      {owned ? (
        <span style={{ color: 'var(--good)' }}> · {t('pass.owned')}</span>
      ) : inSkinShop && sk.source === 'shop' ? (
        <span style={{ color: '#f2c86a' }}> · {t('shop.exclusive')}</span>
      ) : inSkinShop && sk.source !== 'shop' ? (
        <span> · {t('shop.alsoIn', { src: skinSourceText(id) })}</span>
      ) : null}
    </div>
  );
}

async function buyOffer(o: ShopOffer) {
  const r = await useGame.getState().act('shop.buy', { offer: o.id });
  if (r.ok) {
    sfx('coin');
    useUi.getState().toast(tl(o.name), 'good');
  }
}
