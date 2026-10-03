import {
  HEROINE_MAP,
  ITEM_RARITY_NAMES,
  MAX_RARITY,
  SET_MAP,
  SLOT_NAMES,
  activeParty,
  enhanceCost,
  equippedIndex,
  itemPower,
  salvageGain,
  type Item,
} from '@idle/shared';
import { portraitUrl } from '../art/runtime';
import { sfx } from '../audio/sfx';
import { Button, Cost, Icon, ItemSlot, Sheet, confirmDialog, css, cx, formatNum, itemName, rarityColor } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { mainLines, subLine } from './gear/itemText';
import st from './gear/Bag.module.css';

/** Карточка вещи: характеристики, сравнение, надеть, заточить, слить, разобрать. */
export function ItemDetails({ uid, hero, onClose }: { uid: string; hero?: string; onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const item = s.items[uid];
  if (!item) return null;
  const idx = equippedIndex(s);
  const owner = idx[uid]?.hero;
  const party = activeParty(s);
  const target = hero ?? owner ?? party[0];
  const pw = itemPower(cfg, item);
  const color = rarityColor(item.rarity);
  const enh = enhanceCost(cfg, s, item);
  const set = item.set ? SET_MAP[item.set] : null;
  // для слияния: ещё две свободные вещи того же слота и редкости, самые слабые
  const mates =
    item.rarity < MAX_RARITY && !item.lock
      ? Object.values(s.items)
          .filter((x) => x.uid !== uid && x.slot === item.slot && x.rarity === item.rarity && !idx[x.uid] && !x.lock)
          .sort((a, b) => itemPower(cfg, a) - itemPower(cfg, b))
          .slice(0, 2)
      : [];
  const gain = salvageGain(cfg, s, item);

  const act = (type: string, params: Record<string, unknown>) => useGame.getState().act(type, params);

  return (
    <Sheet onClose={onClose}>
      <div className={st.detailHead} style={{ ['--rc' as string]: color }}>
        <ItemSlot item={item} size={76} />
        <div className={css.grow} style={{ minWidth: 0 }}>
          <div className={st.detailName} style={{ color }}>
            {itemName(item)}
            {item.enh > 0 && <span className={st.enhTag}>+{item.enh}</span>}
          </div>
          <div className={css.tiny}>
            {tl(ITEM_RARITY_NAMES[item.rarity])} · {tl(SLOT_NAMES[item.slot])} · {t('gear.itemLevel', { lvl: item.lvl })}
          </div>
          <div className={css.row} style={{ gap: 6, marginTop: 4 }}>
            <Icon name="sword" size={14} />
            <b className={css.num}>{formatNum(pw)}</b>
            {owner && (
              <span className={st.owner}>
                <img className="pixel" src={portraitUrl(owner, s.heroines[owner]?.skin)} alt="" />
                {tl(HEROINE_MAP[owner].name)}
              </span>
            )}
          </div>
        </div>
        <button
          className={cx(st.lockBtn, item.lock && st.lockOn)}
          onClick={() => {
            haptic.select();
            void act('item.lock', { uid });
          }}
          aria-label={t('gear.lock')}
        >
          <Icon name="lock" size={18} />
        </button>
      </div>

      <div className={st.lines}>
        {mainLines(cfg, item).map((l) => (
          <div key={l.label} className={st.mainLine}>
            <span>{l.label}</span>
            <b>{l.value}</b>
          </div>
        ))}
        {item.subs.map((sub, i) => {
          const l = subLine(sub);
          return (
            <div key={i} className={st.subLine}>
              <span>◆ {l.label}</span>
              <b>{l.value}</b>
            </div>
          );
        })}
      </div>

      {set && (
        <div className={st.setBox} style={{ borderColor: set.color }}>
          <b style={{ color: set.color }}>{t('gear.setName', { name: tl(set.name) })}</b>
          <div className={css.tiny}>2: {tl(set.two.text)}</div>
          <div className={css.tiny}>4: {tl(set.four)}</div>
        </div>
      )}

      <div className={st.section}>{t('gear.equipOn')}</div>
      <div className={st.heroRow}>
        {party.map((id) => {
          const cur = s.heroines[id].gear[item.slot];
          const curIt = cur ? s.items[cur] : null;
          const diff = pw - (curIt ? itemPower(cfg, curIt) : 0);
          const on = owner === id;
          return (
            <button
              key={id}
              className={cx(st.heroPick, on && st.heroPickOn, id === target && !on && st.heroPickTarget)}
              disabled={on}
              onClick={async () => {
                const r = await act('item.equip', { uid, hero: id });
                if (r.ok) {
                  haptic.success();
                  onClose();
                }
              }}
            >
              <img className="pixel" src={portraitUrl(id, s.heroines[id].skin)} alt="" />
              <span style={{ color: on ? 'var(--accent)' : diff > 0 ? 'var(--good)' : diff < 0 ? 'var(--bad)' : 'var(--text-2)' }}>{on ? '✓' : `${diff > 0 ? '+' : ''}${formatNum(diff)}`}</span>
            </button>
          );
        })}
      </div>

      <div className={st.actions}>
        {enh ? (
          <Button
            block
            kind="good"
            onClick={async () => {
              const r = await act('item.enhance', { uid });
              if (r.ok) {
                sfx('levelup');
                haptic.success();
              }
            }}
          >
            {t('gear.enhance')} +{item.enh + 1}
            <Cost cur="steel" amount={enh.steel} size={14} />
            <Cost cur="gold" amount={enh.gold} size={14} />
          </Button>
        ) : (
          <div className={css.tiny} style={{ textAlign: 'center', color: 'var(--accent)' }}>
            {t('gear.enhanceMax')}
          </div>
        )}
        {mates.length === 2 && (
          <Button
            block
            kind="secondary"
            onClick={async () => {
              const r = await act('item.merge', { uids: [uid, ...mates.map((m) => m.uid)] });
              if (r.ok) {
                sfx('rare');
                haptic.success();
                onClose();
                useUi.getState().open((close) => <ItemDetails uid={r.result.item} hero={hero} onClose={close} />);
              }
            }}
          >
            <Icon name="forge" size={16} />
            {t('gear.mergeThis', { r: tl(ITEM_RARITY_NAMES[item.rarity + 1]) })}
          </Button>
        )}
        {!owner && !item.lock && (
          <Button
            block
            kind="danger"
            onClick={() =>
              confirmDialog(t('gear.salvageAsk', { steel: formatNum(gain.steel) }), async () => {
                const r = await act('item.salvage', { uids: [uid] });
                if (r.ok) {
                  haptic.medium();
                  onClose();
                }
              })
            }
          >
            {t('gear.salvage')}
            <Cost cur="steel" amount={gain.steel} size={14} />
          </Button>
        )}
      </div>
    </Sheet>
  );
}

export function itemTitle(it: Item): string {
  return `${itemName(it)}${it.enh ? ` +${it.enh}` : ''}`;
}
