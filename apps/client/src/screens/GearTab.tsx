import { GEAR_SLOTS, ITEM_RARITY_NAMES, equippedIndex, inventoryCap, itemPower, mergeGroups, salvageGain, type GearSlot, type Item } from '@idle/shared';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Button, Icon, ItemSlot, Panel, Sheet, css, cx, formatNum, rarityColor } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { openItem, showReward } from './common';
import st from './gear/Bag.module.css';

type Filter = 'all' | GearSlot;
type Sort = 'power' | 'rarity' | 'new';

/** «Сумка»: все вещи Легиона, слияние 3→1, разбор на сталь, надеть лучшее. */
export default function GearTab() {
  const s = useGameState();
  const cfg = useCfg();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('power');
  const idx = equippedIndex(s);
  const all = Object.values(s.items);
  const cap = inventoryCap(cfg, s);
  const groups = mergeGroups(s);
  const merges = groups.reduce((n, g) => n + Math.floor(g.length / 3), 0);
  const newCount = all.filter((i) => i.isNew).length;

  // «новое» снимается, когда игрок уходит из Сумки
  useEffect(
    () => () => {
      const st = useGame.getState().state;
      if (st && Object.values(st.items).some((i) => i.isNew)) void useGame.getState().act('item.seen', {}, { silent: true });
    },
    [],
  );

  const list = useMemo(() => {
    const out = all.filter((it) => filter === 'all' || it.slot === filter);
    const pw = new Map(out.map((it) => [it.uid, itemPower(cfg, it)]));
    out.sort((a, b) => {
      if (sort === 'new' && !!a.isNew !== !!b.isNew) return a.isNew ? -1 : 1;
      if (sort === 'rarity' && a.rarity !== b.rarity) return b.rarity - a.rarity;
      return pw.get(b.uid)! - pw.get(a.uid)!;
    });
    return out;
  }, [s.items, filter, sort, cfg]);

  return (
    <div className={css.col}>
      <Panel>
        <div className={st.top}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{t('bag.title')}</b>
          <div className={cx(st.capBar, all.length >= cap && st.capFull)}>
            <div style={{ width: `${Math.min(100, (all.length / cap) * 100)}%` }} />
          </div>
          <span className={css.num} style={{ fontSize: 12 }}>
            {all.length}/{cap}
          </span>
        </div>
        <div className={st.tools} style={{ marginTop: 10 }}>
          <button
            className={st.tool}
            onClick={async () => {
              haptic.tap();
              const r = await useGame.getState().act('party.autoEquip', {});
              if (r.ok) useUi.getState().toast(t('gear.autoDone', { n: r.result.changes }), 'good');
            }}
          >
            <Icon name="armor" size={26} />
            {t('gear.auto')}
          </button>
          <button
            className={cx(st.tool, merges > 0 && st.toolHot)}
            disabled={merges === 0}
            onClick={async () => {
              haptic.tap();
              const r = await useGame.getState().act('item.mergeAll', {});
              if (r.ok) {
                sfx('rare');
                haptic.success();
                showReward(t('bag.merged', { n: r.result.made.length }), { items: r.result.made });
              }
            }}
          >
            {merges > 0 && <span className={st.toolBadge}>{merges}</span>}
            <Icon name="forge" size={26} />
            {t('bag.mergeAll')}
          </button>
          <button className={st.tool} onClick={() => openSalvage()}>
            <Icon name="steel" size={26} />
            {t('bag.salvage')}
          </button>
        </div>
        <div className={css.tiny} style={{ marginTop: 8 }}>
          {t('bag.hint')}
        </div>
      </Panel>

      <div className={st.filters}>
        {(['all', ...GEAR_SLOTS] as Filter[]).map((f) => (
          <button key={f} className={cx(st.chip, filter === f && st.chipOn)} onClick={() => setFilter(f)}>
            {f !== 'all' && <Icon name={f} size={14} />}
            {f === 'all' ? t('gear.filterAll') : t(`slot.${f}`)}
          </button>
        ))}
      </div>
      <div className={st.filters}>
        <span className={css.tiny} style={{ alignSelf: 'center' }}>
          {t('bag.sortBy')}
        </span>
        {(['power', 'rarity', 'new'] as Sort[]).map((x) => (
          <button key={x} className={cx(st.chip, sort === x && st.chipOn)} onClick={() => setSort(x)}>
            {t(`bag.sort.${x}`)}
            {x === 'new' && newCount > 0 && ` ${newCount}`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className={st.empty}>{t('bag.empty')}</div>
      ) : (
        <div className={st.grid}>
          {list.map((it) => (
            <ItemSlot key={it.uid} item={it} equipped={!!idx[it.uid]} onClick={() => openItem(it.uid)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Разбор: всё ниже выбранной редкости (кроме надетого, закреплённого и заточенного) + авторазбор. */
function openSalvage() {
  useUi.getState().open((close) => <SalvageSheet onClose={close} />);
}

function SalvageSheet({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const idx = equippedIndex(s);
  const free = (below: number) => Object.values(s.items).filter((it: Item) => it.rarity < below && !idx[it.uid] && !it.lock && it.enh === 0);
  const auto = s.settings.autoSalvage;
  return (
    <Sheet title={t('bag.salvageTitle')} onClose={onClose}>
      <div className={css.tiny} style={{ marginBottom: 8 }}>
        {t('bag.salvageHint')}
      </div>
      <div className={css.col} style={{ gap: 6 }}>
        {[1, 2, 3, 4].map((below) => {
          const items = free(below);
          const steel = items.reduce((n, it) => n + salvageGain(cfg, s, it).steel, 0);
          return (
            <Button
              key={below}
              block
              kind="secondary"
              disabled={items.length === 0}
              onClick={async () => {
                const r = await useGame.getState().act('item.salvage', { below });
                if (r.ok) {
                  haptic.medium();
                  useUi.getState().toast(t('bag.salvaged', { n: r.result.n, steel: formatNum(r.result.steel) }), 'good');
                }
              }}
            >
              <span style={{ color: rarityColor(below - 1) }}>{t('bag.below', { r: tl(ITEM_RARITY_NAMES[below]) })}</span>
              <span className={css.tiny}>×{items.length}</span>
              <span className={css.row} style={{ gap: 2 }}>
                <Icon name="steel" size={14} />
                {formatNum(steel)}
              </span>
            </Button>
          );
        })}
      </div>
      <div className={css.divider} />
      <div className={css.tiny} style={{ marginBottom: 6 }}>
        {t('bag.autoSalvage')}
      </div>
      <div className={st.rarityPick}>
        {[-1, 1, 2, 3].map((v) => (
          <button
            key={v}
            className={cx(st.chip, auto === v && st.chipOn)}
            onClick={() => {
              haptic.select();
              void useGame.getState().act('settings', { patch: { autoSalvage: v } }, { silent: true });
            }}
          >
            {v < 0 ? t('bag.autoOff') : t('bag.below', { r: tl(ITEM_RARITY_NAMES[v]) })}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
