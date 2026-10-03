import { HEROINE_MAP, SLOT_NAMES, equippedIndex, itemPower, type GearSlot, type Item } from '@idle/shared';
import { Button, ItemSlot, Sheet, css, formatNum, itemName, rarityColor } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { openItem } from '../common';
import { mainShort } from './itemText';

/** Выбор вещи в слот героя: лучшие сверху, стрелка — лучше или хуже надетой. */
export function openSlotPicker(hero: string, slot: GearSlot) {
  useUi.getState().open((close) => <SlotPicker hero={hero} slot={slot} onClose={close} />);
}

function SlotPicker({ hero, slot, onClose }: { hero: string; slot: GearSlot; onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const h = s.heroines[hero];
  const idx = equippedIndex(s);
  const cur = h.gear[slot] ? s.items[h.gear[slot]!] : null;
  const curPw = cur ? itemPower(cfg, cur) : 0;
  const list = Object.values(s.items)
    .filter((it) => it.slot === slot && it.uid !== cur?.uid)
    .sort((a, b) => itemPower(cfg, b) - itemPower(cfg, a))
    .slice(0, 60);

  const equip = async (it: Item) => {
    const r = await useGame.getState().act('item.equip', { uid: it.uid, hero });
    if (r.ok) {
      haptic.success();
      onClose();
    }
  };

  return (
    <Sheet title={`${tl(HEROINE_MAP[hero].name)} · ${tl(SLOT_NAMES[slot])}`} onClose={onClose}>
      {cur && (
        <div className={css.listItem} style={{ marginBottom: 8, borderColor: rarityColor(cur.rarity) }}>
          <ItemSlot item={cur} size={48} equipped onClick={() => openItem(cur.uid, hero)} />
          <div className={css.grow}>
            <b style={{ color: rarityColor(cur.rarity) }}>{itemName(cur)}</b>
            <div className={css.tiny}>{mainShort(cfg, cur)}</div>
          </div>
          <Button
            size="small"
            kind="secondary"
            onClick={async () => {
              const r = await useGame.getState().act('item.unequip', { hero, slot });
              if (r.ok) onClose();
            }}
          >
            {t('gear.unequip')}
          </Button>
        </div>
      )}
      {list.length === 0 && <div className={css.muted}>{t('gear.noneForSlot')}</div>}
      <div className={css.list}>
        {list.map((it) => {
          const pw = itemPower(cfg, it);
          const owner = idx[it.uid]?.hero;
          const diff = pw - curPw;
          return (
            <div key={it.uid} className={css.listItem} style={{ cursor: 'pointer' }} onClick={() => void equip(it)}>
              <ItemSlot item={it} size={44} compare={!cur ? 'up' : diff > 0 ? 'up' : diff < 0 ? 'down' : null} equipped={!!owner} onClick={() => void equip(it)} />
              <div className={css.grow} style={{ minWidth: 0 }}>
                <b style={{ color: rarityColor(it.rarity), fontSize: 13 }}>{itemName(it)}</b>
                <div className={css.tiny}>{mainShort(cfg, it)}</div>
                {owner && <div className={css.tiny}>{t('gear.equippedBy', { hero: tl(HEROINE_MAP[owner].name) })}</div>}
              </div>
              <span className={css.num} style={{ color: diff > 0 ? 'var(--good)' : diff < 0 ? 'var(--bad)' : undefined, fontSize: 12 }}>
                {diff > 0 ? '+' : ''}
                {formatNum(diff)}
              </span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
