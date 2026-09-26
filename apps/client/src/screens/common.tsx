import { HEROINE_MAP, SKIN_MAP, formatNum, type Item } from '@idle/shared';
import type { ReactNode } from 'react';
import { heroUrl } from '../art/runtime';
import { HeroImg } from '../components/HeroImg';
import { Button, CUR_ICON, Icon, ItemSlot, Sheet, css, itemName, rarityColor } from '../components/ui';
import { t, tl } from '../i18n';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { ItemDetails } from './ItemDetails';

export interface RewardLike {
  cur?: Record<string, number | undefined>;
  items?: string[];
  shards?: Record<string, number>;
  gems?: Record<string, number>;
  heroes?: string[];
  skin?: string;
  skins?: string[];
  levels?: Record<string, number>;
  /** Сердца Эфира (уход за героинями) */
  hearts?: number;
}

/** Список наград: валюты, предметы, осколки. */
export function RewardList({ r }: { r: RewardLike }) {
  const items = useGame((g) => g.state?.items);
  const cur = Object.entries(r.cur ?? {}).filter(([, v]) => (v ?? 0) > 0);
  const its = (r.items ?? []).map((u) => items?.[u]).filter(Boolean) as Item[];
  return (
    <div className={css.col}>
      {cur.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cur.map(([k, v]) => (
            <div key={k} className={css.listItem} style={{ padding: '4px 8px', gap: 4 }}>
              <Icon name={CUR_ICON[k] ?? k} size={22} />
              <span className={css.num}>{formatNum(v ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
      {(r.hearts ?? 0) > 0 && (
        <div className={css.row}>
          <Icon name="hearts" size={24} />
          <span>{t('care.heartReward', { n: r.hearts! })}</span>
        </div>
      )}
      {r.shards &&
        Object.entries(r.shards).map(([id, n]) => (
          <div key={id} className={css.row}>
            <img className="pixel" src={heroUrl(id)} width={32} height={32} alt="" />
            <span>
              {tl(HEROINE_MAP[id]?.name)}: +{n} {t('cur.shards').toLowerCase()}
            </span>
          </div>
        ))}
      {r.heroes &&
        r.heroes.map((id) => (
          <div key={id} className={css.row}>
            <img className="pixel" src={heroUrl(id)} width={48} height={48} alt="" />
            <b>{tl(HEROINE_MAP[id]?.name)}</b>
          </div>
        ))}
      {[...(r.skin ? [r.skin] : []), ...(r.skins ?? [])]
        .filter((id) => SKIN_MAP[id])
        .map((id) => (
          <div key={id} className={css.row}>
            <HeroImg className="pixel" id={SKIN_MAP[id].hero} skin={id} width={56} height={56} />
            <div>
              <div className={css.tiny}>{t('reward.skin')}</div>
              <b>{tl(SKIN_MAP[id].name)}</b>
              <div className={css.tiny}>{tl(HEROINE_MAP[SKIN_MAP[id].hero]?.name)}</div>
            </div>
          </div>
        ))}
      {r.gems && (
        <div className={css.row} style={{ flexWrap: 'wrap' }}>
          {Object.entries(r.gems).map(([g, n]) => (
            <span key={g} className={css.chip}>
              <Icon name="gem" size={16} /> {g} ×{n}
            </span>
          ))}
        </div>
      )}
      {its.length > 0 && (
        <>
          <div className={css.muted}>{t('reward.items')}</div>
          <div className={css.grid6}>
            {its.slice(0, 36).map((it) => (
              <ItemSlot key={it.uid} item={it} size={48} onClick={() => openItem(it.uid)} />
            ))}
          </div>
          {its.length > 36 && <div className={css.tiny}>+{its.length - 36}</div>}
        </>
      )}
    </div>
  );
}

export function openItem(uid: string, hero?: string) {
  useUi.getState().open((close) => <ItemDetails uid={uid} hero={hero} onClose={close} />);
}

export function showReward(title: string, r: RewardLike, extra?: ReactNode) {
  useUi.getState().open((close) => (
    <Sheet title={title} onClose={close}>
      {extra}
      <RewardList r={r} />
      <div style={{ height: 12 }} />
      <Button block onClick={close}>
        {t('common.ok')}
      </Button>
    </Sheet>
  ));
}

export function ItemLine({ item }: { item: Item }) {
  return (
    <span style={{ color: rarityColor(item.rarity), fontWeight: 700 }}>
      {itemName(item)} {item.enh > 0 && `+${item.enh}`}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={css.row} style={{ margin: '10px 2px 6px' }}>
      <span className={css.title} style={{ fontSize: 15 }}>
        {children}
      </span>
      <span className={css.grow} />
      {right}
    </div>
  );
}

/** Заголовок вложенного экрана: «назад» слева, гербовая плашка по центру (дублирует системную кнопку Telegram). */
export function BackHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className={css.screenHead}>
      <button
        onClick={() => useUi.getState().pop()}
        style={{
          width: 38,
          height: 36,
          border: '1px solid rgba(0,0,0,.7)',
          borderRadius: 4,
          background: 'linear-gradient(180deg, #3a4254, #2c3241)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1), 0 2px 0 rgba(0,0,0,.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={t('common.back')}
      >
        <Icon name="back" size={24} />
      </button>
      <div className={css.plaque}>
        <span>{title}</span>
      </div>
      <div className={css.headSide}>{right}</div>
    </div>
  );
}

export function Locked({ text }: { text: string }) {
  return (
    <div className={css.inset} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.85 }}>
      <Icon name="lock" size={24} />
      <span className={css.muted}>{text}</span>
    </div>
  );
}
