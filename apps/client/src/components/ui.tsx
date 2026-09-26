import {
  ELEMENT_COLORS,
  BASE_ITEM_MAP,
  ELEMENT_NAMES,
  HERO_RARITY_COLORS,
  HEROINE_MAP,
  ITEM_RARITY_COLORS,
  LEGENDARY_MAP,
  MYTHIC_MAP,
  formatNum,
  type Currency,
  type Element,
  type Item,
} from '@idle/shared';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { iconUrl, itemIconUrl } from '../art/runtime';
import { t, tl } from '../i18n';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { haptic, pushBack } from '../tg/telegram';
import s from './ui.module.css';
import { HeroImg } from './HeroImg';

export { s as css };

export function cx(...a: (string | false | null | undefined)[]): string {
  return a.filter(Boolean).join(' ');
}

export function Icon({ name, size = 24, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return <img className={cx(s.icon, className)} src={iconUrl(name)} width={size} height={size} alt="" draggable={false} style={style} />;
}

export function Panel({ title, right, children, className, style }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx(s.panel, className)} style={style}>
      {(title || right) && (
        <div className={s.panelTitle}>
          <span className={s.grow}>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'good' | 'ghost';

export function Button({
  children,
  onClick,
  kind = 'primary',
  size,
  disabled,
  block,
  pulse,
  className,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  size?: 'small' | 'big';
  disabled?: boolean;
  block?: boolean;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      className={cx(
        s.btn,
        kind !== 'primary' && s[kind],
        size && s[size],
        block && s.block,
        pulse && !disabled && s.pulse,
        className,
      )}
      style={style}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        haptic.tap();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export const CUR_ICON: Record<string, string> = {
  gold: 'gold',
  xp: 'xp',
  crystals: 'crystals',
  scrolls: 'scrolls',
  dust: 'dust',
  starDust: 'starDust',
  ether: 'ether',
  arenaTokens: 'arenaTokens',
  guildCoins: 'guildCoins',
  forgeMats: 'forgeMats',
  divineMats: 'divineMats',
  labCoins: 'labCoins',
  eventTokens: 'eventTokens',
  hearts: 'hearts',
};

/** Стоимость: иконка + число, красным — если не хватает. */
export function Cost({ cur, amount, size = 16 }: { cur: Currency | string; amount: number; size?: number }) {
  const have = useGame((g) => g.state?.cur[cur as Currency] ?? 0);
  return (
    <span className={cx(s.cost, have < amount && s.costBad)}>
      <Icon name={CUR_ICON[cur] ?? 'gold'} size={size} />
      {formatNum(amount)}
    </span>
  );
}

export function Amount({ cur, amount, size = 18 }: { cur: string; amount: number; size?: number }) {
  return (
    <span className={s.cost}>
      <Icon name={CUR_ICON[cur] ?? cur} size={size} />
      {formatNum(amount)}
    </span>
  );
}

export function Bar({ value, max, text, color, height }: { value: number; max: number; text?: string; color?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={s.bar} style={height ? { height } : undefined}>
      <div className={s.barFill} style={{ width: `${pct}%`, ...(color ? { background: color } : null) }} />
      {text && <div className={s.barText}>{text}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; badge?: boolean }[] }) {
  return (
    <div className={s.tabs}>
      {items.map((it) => (
        <button
          key={it.id}
          className={cx(s.tab, value === it.id && s.tabActive)}
          onClick={() => {
            haptic.select();
            onChange(it.id);
          }}
        >
          {it.label}
          {it.badge && <span className={s.dot} />}
        </button>
      ))}
    </div>
  );
}

export function Stars({ n, max, size = 12 }: { n: number; max?: number; size?: number }) {
  const list = [];
  for (let i = 0; i < (max ?? n); i++)
    list.push(<img key={i} src={iconUrl('star')} className={cx(s.icon, i >= n && s.dim)} width={size} height={size} alt="" />);
  return <span className={s.stars}>{list}</span>;
}

export function ElementIcon({ el, size = 18 }: { el: Element; size?: number }) {
  return <Icon name={el} size={size} />;
}

export function elementName(el: Element): string {
  return tl(ELEMENT_NAMES[el]);
}

export function HeroCard({
  id,
  owned = true,
  onClick,
  selected,
  sub,
  badge,
}: {
  id: string;
  owned?: boolean;
  onClick?: () => void;
  selected?: boolean;
  sub?: ReactNode;
  badge?: boolean;
}) {
  const def = HEROINE_MAP[id];
  const h = useGame((g) => g.state?.heroines[id]);
  return (
    <div
      className={cx(s.hero, s[`hero${def.rarity}`], def.herald && s.heroHerald)}
      style={{
        ...(def.herald ? { ['--aura' as string]: ELEMENT_COLORS[def.element] } : null),
        ...(selected ? { outline: '2px solid var(--accent-2)', outlineOffset: 1 } : null),
      }}
      onClick={() => {
        haptic.select();
        onClick?.();
      }}
    >
      <span className={s.rarityTag} style={{ color: HERO_RARITY_COLORS[def.rarity] }}>
        {def.rarity}
      </span>
      {def.herald && <span className={s.heraldTag}>{t('hero.herald')}</span>}
      <img className={s.elemTag} src={iconUrl(def.element)} alt="" />
      <HeroImg className={cx(s.heroSprite, !owned && s.dim)} id={id} skin={h?.skin} still={!owned} />
      <div className={s.heroName}>{tl(def.name)}</div>
      {owned && h ? (
        <div className={s.heroMeta}>
          <span>
            {t('common.level')} {h.lvl}
          </span>
          <Stars n={h.stars} size={10} />
        </div>
      ) : (
        sub
      )}
      {owned && sub}
      {badge && <span className={s.dot} />}
    </div>
  );
}

const WEAPON_ICON: Record<string, string> = {
  sword: 'weapon',
  axe: 'berserker',
  bow: 'archer',
  staff: 'sorceress',
  wand: 'priestess',
  scythe: 'skull',
  daggers: 'assassin',
  lute: 'bard',
  shield: 'offhand',
  horn: 'arenaTokens',
  quiver: 'archer',
  orb: 'summon',
  tome: 'quest',
  grimoire: 'xp',
  dagger: 'assassin',
  songbook: 'bard',
};

export function itemIconName(item: Pick<Item, 'base' | 'slot'>): string {
  const base = BASE_ITEM_MAP[item.base];
  if (base && (base.slot === 'weapon' || base.slot === 'offhand')) return WEAPON_ICON[base.type] ?? base.slot;
  return item.slot;
}

export function itemName(item: Item): string {
  if (item.fx && LEGENDARY_MAP[item.fx]) return tl(LEGENDARY_MAP[item.fx].name);
  if (item.fx && MYTHIC_MAP[item.fx]) return `${tl(BASE_ITEM_MAP[item.base]?.name)} · ${tl(MYTHIC_MAP[item.fx].name)}`;
  return tl(BASE_ITEM_MAP[item.base]?.name);
}

export function rarityColor(r: number): string {
  const c = ITEM_RARITY_COLORS[r];
  return c === 'rainbow' ? '#f2d46b' : c;
}

export function ItemSlot({
  item,
  placeholder,
  onClick,
  compare,
  equipped,
  size = 52,
  selected,
}: {
  item?: Item | null;
  placeholder?: string;
  onClick?: () => void;
  compare?: 'up' | 'down' | null;
  equipped?: boolean;
  size?: number;
  selected?: boolean;
}) {
  return (
    <div
      className={cx(s.slot, item && s[`r${item.rarity}`], item && item.rarity >= 4 && s.shine)}
      style={{ width: size, height: size, ...(selected ? { outline: '2px solid var(--accent-2)', outlineOffset: 1 } : null) }}
      onClick={() => {
        haptic.select();
        onClick?.();
      }}
    >
      {item ? (
        <>
          <img className="pixel" src={itemIconUrl(item)} style={{ width: size * 0.8, height: size * 0.8 }} alt="" />
          {item.enh > 0 && <span className={s.enh}>+{item.enh}</span>}
          <span className={s.lvlTag}>{item.lvl}</span>
          {compare && <img className={cx(s.cmp, 'pixel')} src={iconUrl(compare)} alt="" />}
          {item.lock && <img className={cx(s.lockMark, 'pixel')} src={iconUrl('lock')} alt="" />}
          {equipped && <span className={s.eqMark}>E</span>}
          {item.isNew && !equipped && <span className={s.newMark} />}
        </>
      ) : (
        placeholder && <img className="pixel" src={iconUrl(placeholder)} style={{ width: size * 0.6, height: size * 0.6, opacity: 0.25 }} alt="" />
      )}
    </div>
  );
}

// ——— модалки и тосты ———

export function ModalHost() {
  const modals = useUi((u) => u.modals);
  return (
    <>
      {modals.map((m) => (
        <ModalFrame key={m.id} id={m.id} sticky={m.sticky}>
          {m.render(() => useUi.getState().close(m.id))}
        </ModalFrame>
      ))}
    </>
  );
}

function ModalFrame({ id, sticky, children }: { id: number; sticky?: boolean; children: ReactNode }) {
  useEffect(() => pushBack(() => !sticky && useUi.getState().close(id)), [id, sticky]);
  return (
    <div
      className={s.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sticky) useUi.getState().close(id);
      }}
    >
      {children}
    </div>
  );
}

/** Нижний лист модалки с заголовком. */
export function Sheet({ title, children, onClose, center }: { title?: ReactNode; children: ReactNode; onClose?: () => void; center?: boolean }) {
  const body = (
    <div className={cx(s.panel, s.sheet)} onClick={(e) => e.stopPropagation()}>
      {(title || onClose) && (
        <div className={s.panelTitle}>
          <span className={s.grow}>{title}</span>
          {onClose && (
            <button className={s.closeBtn} onClick={onClose} aria-label={t('common.close')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
  if (center) return <div style={{ display: 'contents' }}>{body}</div>;
  return body;
}

export function Toasts() {
  const toasts = useUi((u) => u.toasts);
  return (
    <div className={s.toasts}>
      {toasts.map((x) => (
        <div key={x.id} className={cx(s.toast, s[`toast${x.kind}`])}>
          {x.text}
        </div>
      ))}
    </div>
  );
}

export function openSheet(title: ReactNode, body: (close: () => void) => ReactNode) {
  return useUi.getState().open((close) => (
    <Sheet title={title} onClose={close}>
      {body(close)}
    </Sheet>
  ));
}

export function confirmDialog(text: string, onYes: () => void, yesLabel?: string) {
  useUi.getState().open((close) => (
    <Sheet title={t('common.confirm')} onClose={close}>
      <p style={{ margin: '4px 0 14px', lineHeight: 1.45 }}>{text}</p>
      <div className={s.row}>
        <Button kind="secondary" block onClick={close}>
          {t('common.cancel')}
        </Button>
        <Button
          kind="danger"
          block
          onClick={() => {
            close();
            onYes();
          }}
        >
          {yesLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Sheet>
  ));
}

/** Ползунок 0…1 в стиле игры (громкость и т. п.). */
export function Slider({ value, onChange, step = 0.1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className={s.sliderWrap}>
      <input
        type="range"
        className={s.slider}
        min={0}
        max={1}
        step={step}
        value={value}
        style={{ ['--p' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => haptic.select()}
      />
      <span className={s.sliderVal}>{pct}%</span>
    </span>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className={s.toggle}
      checked={value}
      onChange={(e) => {
        haptic.select();
        onChange(e.target.checked);
      }}
    />
  );
}

export function fmtTime(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  if (d > 0) return `${t('time.d', { n: d })} ${t('time.h', { n: h })}`;
  if (h > 0) return `${t('time.h', { n: h })} ${t('time.m', { n: m })}`;
  if (m > 0) return `${t('time.m', { n: m })} ${t('time.s', { n: ss })}`;
  return t('time.s', { n: ss });
}

export { formatNum };
