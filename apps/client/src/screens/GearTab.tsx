import {
  BASE_ITEM_MAP,
  ENDGAME_SETS,
  ACTS,
  GEM_STATS,
  GEM_TYPES,
  HEROINE_MAP,
  ITEM_RARITY_NAMES,
  RECIPES,
  SET_MAP,
  SET_SLOTS,
  SLOT_NAMES,
  canWear,
  equipSlotToItemSlot,
  equippedIndex,
  forgeGoldCost,
  gemKey,
  inventoryCap,
  itemPower,
  statText,
  type EquipSlot,
  type Item,
  type ItemSlot as ItemSlotType,
} from '@idle/shared';
import { useMemo, useState } from 'react';
import { heroUrl } from '../art/runtime';
import { Button, Cost, Icon, ItemSlot, Panel, Tabs, confirmDialog, css, cx, formatNum, openSheet, rarityColor } from '../components/ui';
import { getLang, t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { openItem } from './common';

const LEFT: EquipSlot[] = ['weapon', 'helmet', 'armor', 'gloves', 'boots'];
const RIGHT: EquipSlot[] = ['offhand', 'amulet', 'cloak', 'belt', 'ring1', 'ring2'];
type Sort = 'rarity' | 'level' | 'slot';

export default function GearTab() {
  const s = useGameState();
  const cfg = useCfg();
  const gearHero = useUi((u) => u.gearHero);
  const party = s.party.presets[s.party.active].filter(Boolean) as string[];
  const heroId = gearHero && s.heroines[gearHero] ? gearHero : (party[0] ?? Object.keys(s.heroines)[0]);
  const [sort, setSort] = useState<Sort>('rarity');
  const [filter, setFilter] = useState<ItemSlotType | null>(null);
  const idx = equippedIndex(s);
  const h = s.heroines[heroId];
  const cls = HEROINE_MAP[heroId].cls;

  const items = useMemo(() => {
    let list = Object.values(s.items).filter((it) => !idx[it.uid]);
    if (filter) list = list.filter((it) => it.slot === filter);
    const slotOrder = ['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'cloak', 'amulet', 'ring'];
    list.sort((a, b) => {
      if (sort === 'rarity') return b.rarity - a.rarity || b.lvl - a.lvl;
      if (sort === 'level') return b.lvl - a.lvl || b.rarity - a.rarity;
      return slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot) || b.rarity - a.rarity;
    });
    return list;
  }, [s.items, sort, filter, idx]);

  const powerOf = (slot: EquipSlot) => {
    const u = h.gear[slot];
    return u && s.items[u] ? itemPower(cfg, s.items[u]) : 0;
  };
  const compare = (it: Item): 'up' | 'down' | null => {
    if (!canWear(cls, BASE_ITEM_MAP[it.base])) return null;
    const slots: EquipSlot[] = it.slot === 'ring' ? ['ring1', 'ring2'] : [it.slot as EquipSlot];
    const worst = Math.min(...slots.map(powerOf));
    const p = itemPower(cfg, it);
    return p > worst ? 'up' : p < worst ? 'down' : null;
  };

  const newCount = Object.values(s.items).filter((i) => i.isNew).length;

  return (
    <div className={css.col}>
      <div className={css.hscroll}>
        {[...party, ...Object.keys(s.heroines).filter((x) => !party.includes(x))].map((id) => (
          <div
            key={id}
            onClick={() => useUi.getState().setGearHero(id)}
            style={{
              flex: 'none',
              width: 52,
              height: 52,
              borderRadius: 6,
              border: `2px solid ${id === heroId ? 'var(--accent-2)' : party.includes(id) ? 'var(--frame)' : '#2a1e22'}`,
              background: 'radial-gradient(circle at 50% 35%, #3a2a30, #140e12 75%)',
              cursor: 'pointer',
            }}
          >
            <img className="pixel" src={heroUrl(id, s.heroines[id].skin)} width={48} height={48} alt="" />
          </div>
        ))}
      </div>

      <Panel
        title={tl(HEROINE_MAP[heroId].name)}
        right={
          <Button
            size="small"
            onClick={async () => {
              const r = await useGame.getState().act('item.autoEquip', { hero: heroId });
              if (r.ok) useUi.getState().toast(t('gear.autoDone', { n: r.result.changes }), 'good');
            }}
          >
            {t('gear.auto')}
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center' }}>
          <div className={css.col} style={{ gap: 5 }}>
            {LEFT.map((sl) => (
              <DollSlot key={sl} heroId={heroId} slot={sl} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <img className="pixel" src={heroUrl(heroId, h.skin)} alt="" style={{ width: '100%', maxWidth: 150, animation: 'bob 1.6s ease-in-out infinite' }} />
            <div className={css.tiny}>
              {t('common.lvl', { lvl: h.lvl })} · {tl({ ru: 'Сила', en: 'Power' })} {formatNum(Object.values(h.gear).reduce((sum, u) => sum + (u && s.items[u] ? itemPower(cfg, s.items[u]) : 0), 0))}
            </div>
          </div>
          <div className={css.col} style={{ gap: 5 }}>
            {RIGHT.map((sl) => (
              <DollSlot key={sl} heroId={heroId} slot={sl} />
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title={t('gear.inventory', { n: Object.keys(s.items).length, cap: inventoryCap(cfg, s) })}
        right={newCount > 0 ? <button className={css.chip} onClick={() => void useGame.getState().act('item.seen', {}, { silent: true })}>{t('gear.newItems', { n: newCount })}</button> : undefined}
      >
        <div className={css.row} style={{ marginBottom: 6, gap: 6 }}>
          <Button size="small" kind="secondary" onClick={() => smeltDialog()}>
            <Icon name="dust" size={16} />
            {t('gear.smelt')}
          </Button>
          <Button size="small" kind="secondary" onClick={() => openForge()}>
            <Icon name="forge" size={16} />
            {t('gear.forge')}
          </Button>
          <Button size="small" kind="secondary" onClick={() => openGems()}>
            <Icon name="gem" size={16} />
            {t('gear.gems')}
          </Button>
        </div>
        <div className={css.row} style={{ marginBottom: 6 }}>
          <Tabs<Sort>
            value={sort}
            onChange={setSort}
            items={[
              { id: 'rarity', label: t('gear.sortRarity') },
              { id: 'level', label: t('gear.sortLevel') },
              { id: 'slot', label: t('gear.sortSlot') },
            ]}
          />
        </div>
        <div className={css.hscroll} style={{ marginBottom: 6 }}>
          <button className={cx(css.chip, !filter && css.chipOn)} onClick={() => setFilter(null)}>
            {t('gear.filterAll')}
          </button>
          {(['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'cloak', 'amulet', 'ring'] as ItemSlotType[]).map((sl) => (
            <button key={sl} className={cx(css.chip, filter === sl && css.chipOn)} onClick={() => setFilter(filter === sl ? null : sl)}>
              <Icon name={sl} size={14} />
            </button>
          ))}
        </div>
        <div className={css.grid6}>
          {items.map((it) => (
            <ItemSlot key={it.uid} item={it} size={50} compare={compare(it)} onClick={() => openItem(it.uid, heroId)} />
          ))}
        </div>
        {items.length === 0 && <div className={css.muted}>{t('gear.empty')}</div>}
        <div className={css.tiny} style={{ marginTop: 6 }}>
          <Icon name="dust" size={14} /> {formatNum(s.cur.dust)} · <Icon name="forgeMats" size={14} /> {formatNum(s.cur.forgeMats)} · <Icon name="divineMats" size={14} /> {formatNum(s.cur.divineMats)}
        </div>
      </Panel>
    </div>
  );
}

function DollSlot({ heroId, slot }: { heroId: string; slot: EquipSlot }) {
  const uid = useGame((g) => g.state!.heroines[heroId].gear[slot]);
  const item = useGame((g) => (uid ? g.state!.items[uid] : null));
  return (
    <ItemSlot
      item={item}
      placeholder={equipSlotToItemSlot(slot)}
      size={48}
      onClick={() => {
        if (item) openItem(item.uid, heroId);
        else pickFor(heroId, slot);
      }}
    />
  );
}

function pickFor(heroId: string, slot: EquipSlot) {
  const s = useGame.getState().state!;
  const cfg = useGame.getState().cfg!;
  const idx = equippedIndex(s);
  const cls = HEROINE_MAP[heroId].cls;
  const itemSlot = equipSlotToItemSlot(slot);
  const list = Object.values(s.items)
    .filter((it) => it.slot === itemSlot && !idx[it.uid] && canWear(cls, BASE_ITEM_MAP[it.base]))
    .sort((a, b) => itemPower(cfg, b) - itemPower(cfg, a));
  openSheet(tl(SLOT_NAMES[slot]), (close) => (
    <div className={css.grid6}>
      {list.length === 0 && (
        <div className={css.muted} style={{ gridColumn: '1/-1' }}>
          {t('gear.empty')}
        </div>
      )}
      {list.map((it) => (
        <ItemSlot
          key={it.uid}
          item={it}
          size={48}
          onClick={async () => {
            const r = await useGame.getState().act('item.equip', { hero: heroId, uid: it.uid, slot });
            if (r.ok) close();
          }}
        />
      ))}
    </div>
  ));
}

function smeltDialog() {
  openSheet(t('gear.smelt'), () => <SmeltDialog />);
}

/** Массовая переплавка: сетка редкостей с числом предметов, которые уйдут в пыль. */
function SmeltDialog() {
  const s = useGameState();
  const idx = equippedIndex(s);
  const free = Object.values(s.items).filter((it) => !it.lock && !idx[it.uid]);
  return (
    <div className={css.col}>
      <div className={css.muted} style={{ fontSize: 13 }}>
        {t('gear.smeltHint')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[1, 2, 3, 4].map((r) => {
          const n = free.filter((it) => it.rarity < r).length;
          const name = tl(ITEM_RARITY_NAMES[r]);
          return (
            <Button
              key={r}
              kind="secondary"
              disabled={n === 0}
              onClick={() =>
                confirmDialog(t('gear.smeltBelow', { r: name, n }), async () => {
                  const res = await useGame.getState().act('item.smeltFilter', { below: r });
                  if (res.ok) useUi.getState().toast(t('gear.smeltDone', { n: res.result.count, dust: formatNum(res.result.dust) }), 'good');
                })
              }
            >
              <span style={{ width: 8, height: 8, background: rarityColor(r), boxShadow: '0 0 0 1px #000', flex: 'none' }} />
              <span style={{ color: rarityColor(r) }}>{name}</span>
              <span className={css.tiny}>· {n}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function openForge() {
  useUi.getState().open((close) => <Forge onClose={close} />);
}

function Forge({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const [slot, setSlot] = useState<ItemSlotType>('helmet');
  const unlockedSets = [
    ...ACTS.filter((a) => s.progress.maxGlobalEver >= a.id * 20 || s.dev.unlockAll).flatMap((a) => a.sets),
    ...(s.progress.maxGlobalEver >= 600 || s.dev.unlockAll ? ENDGAME_SETS : []),
  ];
  const [set, setSet] = useState<string>(unlockedSets[0] ?? 'verdant');
  const [picked, setPicked] = useState<string[]>([]);
  const mythics = Object.values(s.items).filter((i) => i.rarity === 5 && !i.lock);

  const craft = async (recipe: string, extra: Record<string, unknown> = {}) => {
    const r = await useGame.getState().act('forge.craft', { recipe, slot, set, ...extra });
    if (r.ok) {
      useUi.getState().toast(t('common.done'), 'good');
      openItem(r.result.uid);
    }
  };

  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, maxHeight: '90%', overflowY: 'auto', paddingBottom: 'calc(14px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>
        <Icon name="forge" size={24} />
        <span className={css.grow}>{t('gear.forgeTitle')}</span>
        <button className={css.closeBtn} onClick={onClose} style={{ background: 'transparent', border: 0 }}>
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className={css.tiny}>{t('gear.forgeSlot')}</div>
      <div className={css.hscroll} style={{ margin: '4px 0 8px' }}>
        {(['weapon', 'offhand', 'helmet', 'armor', 'gloves', 'boots', 'belt', 'cloak', 'amulet', 'ring'] as ItemSlotType[]).map((sl) => (
          <button key={sl} className={cx(css.chip, slot === sl && css.chipOn)} onClick={() => setSlot(sl)}>
            <Icon name={sl} size={14} />
          </button>
        ))}
      </div>
      <div className={css.list}>
        {RECIPES.map((r) => {
          const locked = s.progress.maxGlobalEver < r.unlockGlobal && !s.dev.unlockAll;
          const gold = forgeGoldCost({ cfg, s }, r.kind);
          return (
            <div key={r.id} className={css.listItem} style={{ flexDirection: 'column', alignItems: 'stretch', opacity: locked ? 0.5 : 1 }}>
              <div className={css.row}>
                <b className={css.grow}>{tl(r.name)}</b>
                {r.cost.forgeMats && <Cost cur="forgeMats" amount={r.cost.forgeMats} />}
                {r.cost.divineMats && <Cost cur="divineMats" amount={r.cost.divineMats} />}
                <Cost cur="gold" amount={gold} />
              </div>
              {r.kind === 'setLegendary' && (
                <div className={css.hscroll}>
                  {unlockedSets.map((id) => (
                    <button key={id} className={cx(css.chip, set === id && css.chipOn)} onClick={() => setSet(id)}>
                      {tl(SET_MAP[id].name)}
                    </button>
                  ))}
                </div>
              )}
              {r.kind === 'divine' && (
                <>
                  <div className={css.tiny}>{t('gear.forgeDivineHint')}</div>
                  <div className={css.grid6}>
                    {mythics.map((m) => (
                      <ItemSlot key={m.uid} item={m} size={44} selected={picked.includes(m.uid)} onClick={() => setPicked((p) => (p.includes(m.uid) ? p.filter((x) => x !== m.uid) : p.length < 3 ? [...p, m.uid] : p))} />
                    ))}
                  </div>
                </>
              )}
              <Button
                size="small"
                disabled={locked || (r.kind === 'divine' && picked.length !== 3)}
                onClick={() => void craft(r.id, r.kind === 'divine' ? { uids: picked, slot: SET_SLOTS.includes(slot) ? slot : 'helmet' } : r.kind === 'setLegendary' ? { slot: SET_SLOTS.includes(slot) ? slot : 'helmet' } : {})}
              >
                {locked ? t('common.locked') : t('gear.forgeCraft')}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function openGems() {
  useUi.getState().open((close) => <Gems onClose={close} />);
}

function Gems({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, maxHeight: '85%', overflowY: 'auto', paddingBottom: 'calc(14px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>
        <Icon name="gem" size={24} />
        <span className={css.grow}>{t('gear.gemsTitle')}</span>
        <button className={css.closeBtn} onClick={onClose} style={{ background: 'transparent', border: 0 }}>
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className={css.list}>
        {GEM_TYPES.map((type) => {
          const gs = GEM_STATS[type];
          return (
            <div key={type} className={css.listItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className={css.row}>
                <Icon name="gem" size={22} style={{ filter: `drop-shadow(0 0 3px ${gs.color})` }} />
                <b style={{ color: gs.color }}>{tl(gs.name)}</b>
                <span className={css.tiny}>{statText(gs.stat, gs.values[0], getLang())} … {statText(gs.stat, gs.values[7], getLang())}</span>
              </div>
              <div className={css.row} style={{ flexWrap: 'wrap', gap: 4 }}>
                {Array.from({ length: cfg.gems.maxLevel }, (_, i) => i + 1).map((lvl) => {
                  const key = gemKey(type, lvl);
                  const n = s.gems[key] ?? 0;
                  return (
                    <button
                      key={lvl}
                      className={cx(css.chip, n >= cfg.gems.combine && lvl < cfg.gems.maxLevel && css.chipOn)}
                      onClick={() => {
                        if (n >= cfg.gems.combine && lvl < cfg.gems.maxLevel) void useGame.getState().act('gem.combine', { gem: key, all: true });
                      }}
                    >
                      {lvl}: ×{n}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className={css.tiny} style={{ marginTop: 6 }}>
        {t('gear.gemCombine')}
      </div>
    </div>
  );
}
