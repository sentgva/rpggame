import {
  BASE_ITEM_MAP,
  GEM_STATS,
  HEROINE_MAP,
  ITEM_RARITY_NAMES,
  LEGENDARY_MAP,
  MYTHIC_MAP,
  SET_MAP,
  SLOT_NAMES,
  canWear,
  enhanceChance,
  enhanceCost,
  equippedIndex,
  fxText,
  itemMainValue,
  itemPower,
  itemStats,
  parseGem,
  reforgeCost,
  statText,
  type EquipSlot,
  type Item,
  type StatKey,
  type Stats,
} from '@idle/shared';
import { useState } from 'react';
import { Button, Cost, Icon, ItemSlot, Sheet, confirmDialog, css, itemName, openSheet, rarityColor } from '../components/ui';
import { getLang, t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { sfx } from '../audio/sfx';

function statLine(stat: StatKey, v: number) {
  return statText(stat, v, getLang());
}

export function ItemDetails({ uid, hero, onClose }: { uid: string; hero?: string; onClose: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const item = s.items[uid];
  const gearHero = useUi((u) => u.gearHero);
  const [msg, setMsg] = useState<string | null>(null);
  if (!item) return null;
  const idx = equippedIndex(s);
  const owner = idx[uid];
  const base = BASE_ITEM_MAP[item.base];
  const targetHero = hero ?? gearHero ?? s.party.presets[s.party.active].find(Boolean) ?? null;
  const targetDef = targetHero ? HEROINE_MAP[targetHero] : null;
  const wearable = targetDef ? canWear(targetDef.cls, base) : false;

  // сравнение с надетым у выбранной героини
  let compare: Item | null = null;
  if (targetHero && s.heroines[targetHero] && !(owner && owner.hero === targetHero)) {
    const h = s.heroines[targetHero];
    const slots: EquipSlot[] = item.slot === 'ring' ? ['ring1', 'ring2'] : [item.slot as EquipSlot];
    for (const sl of slots) {
      const e = h.gear[sl] ? s.items[h.gear[sl]!] : null;
      if (!e) {
        compare = null;
        break;
      }
      if (!compare || itemPower(cfg, e) < itemPower(cfg, compare)) compare = e;
    }
  }

  const act = async (type: string, extra: Record<string, unknown> = {}) => {
    const r = await useGame.getState().act(type, { uid, ...extra });
    return r;
  };

  const enhance = async () => {
    const r = await act('item.enhance');
    if (!r.ok) return;
    if (r.result.ok) {
      sfx('enhanceOk');
      haptic.success();
      setMsg(t('gear.enhanceOk', { n: r.result.enh }));
    } else {
      sfx('enhanceFail');
      haptic.warn();
      setMsg(t('gear.enhanceFail'));
    }
  };

  const cost = enhanceCost({ cfg }, item);
  const chance = enhanceChance({ cfg }, item);
  const set = item.set ? SET_MAP[item.set] : null;
  const setCount = set && owner ? Object.values(s.heroines[owner.hero].gear).filter((u) => u && s.items[u]?.set === item.set).length : 0;
  const leg = item.fx ? LEGENDARY_MAP[item.fx] : null;
  const myth = item.fx ? MYTHIC_MAP[item.fx] : null;

  return (
    <Sheet
      title={
        <span style={{ color: rarityColor(item.rarity) }}>
          {itemName(item)} {item.enh > 0 && `+${item.enh}`}
        </span>
      }
      onClose={onClose}
    >
      <div className={css.row} style={{ alignItems: 'flex-start' }}>
        <ItemSlot item={item} size={64} />
        <div className={css.grow}>
          <div style={{ color: rarityColor(item.rarity), fontWeight: 800 }}>
            {tl(ITEM_RARITY_NAMES[item.rarity])} · {tl(SLOT_NAMES[item.slot])}
          </div>
          <div className={css.tiny}>{t('gear.itemLevel', { lvl: item.lvl })}</div>
          {base && (base.type === 'heavy' || base.type === 'medium' || base.type === 'light') && <div className={css.tiny}>{t(`armor.${base.type}`)}</div>}
          {owner && <div className={css.tiny}>{t('gear.equippedBy', { hero: tl(HEROINE_MAP[owner.hero].name) })}</div>}
        </div>
        <button
          className={css.closeBtn}
          onClick={() => void act('item.lock')}
          style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
          aria-label={item.lock ? t('gear.unlock') : t('gear.lock')}
        >
          <Icon name="lock" size={26} style={{ opacity: item.lock ? 1 : 0.3 }} />
        </button>
      </div>

      <div className={css.inset} style={{ marginTop: 8 }}>
        <div className={css.statRow}>
          <b>{statLine(item.main.stat, itemMainValue(cfg, item))}</b>
          {item.enh > 0 && <span className={css.gold}>+{item.enh}</span>}
        </div>
        {item.affixes.map((a, i) => (
          <div key={i} className={css.statRow}>
            <span>{statLine(a.id as StatKey, a.v)}</span>
            <span className={css.chip} style={{ padding: '0 6px', fontSize: 10, color: ['#9a9a9a', '#4fbf5a', '#3d7be0', '#9b4de0', '#f08a24'][a.tier - 1] }}>
              {t('gear.tierT', { n: a.tier })}
            </span>
          </div>
        ))}
        {item.gems.map((g, i) =>
          g ? (
            <div key={`g${i}`} className={css.statRow}>
              <span style={{ color: GEM_STATS[parseGem(g).type].color }}>
                {statLine(GEM_STATS[parseGem(g).type].stat, GEM_STATS[parseGem(g).type].values[parseGem(g).lvl - 1])}
              </span>
              <span className={css.tiny}>
                {tl(GEM_STATS[parseGem(g).type].name)} {parseGem(g).lvl}
              </span>
            </div>
          ) : null,
        )}
      </div>

      {(leg || myth) && (
        <div className={css.inset} style={{ marginTop: 6, borderColor: rarityColor(item.rarity) }}>
          <div className={css.tiny} style={{ color: rarityColor(item.rarity) }}>
            {myth ? t('gear.mythic') : t('gear.unique')}
          </div>
          <div style={{ fontSize: 13 }}>{myth ? tl(myth.desc) : fxText(leg!.fx, getLang())}</div>
        </div>
      )}

      {set && (
        <div className={css.inset} style={{ marginTop: 6 }}>
          <div className={css.tiny} style={{ color: '#7ae07a' }}>
            {t('gear.setBonus', { name: tl(set.name), n: setCount })}
          </div>
          <SetBonusLine n={2} active={setCount >= 2} stats={set.bonus2} />
          <SetBonusLine n={4} active={setCount >= 4} stats={set.bonus4} fx={set.fx4 ? fxText(set.fx4, getLang()) : undefined} />
          <SetBonusLine n={6} active={setCount >= 6} stats={set.bonus6} fx={fxText(set.fx6, getLang())} />
        </div>
      )}

      {item.sockets > 0 && (
        <div className={css.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <span className={css.tiny}>{t('gear.sockets')}:</span>
          {item.gems.map((g, i) => (
            <button
              key={i}
              className={css.chip}
              style={{ borderColor: g ? GEM_STATS[parseGem(g).type].color : undefined }}
              onClick={() => {
                if (g) void act('item.unsocket', { index: i });
                else pickGem((gem) => void act('item.socket', { index: i, gem }));
              }}
            >
              <Icon name="gem" size={16} style={g ? undefined : { opacity: 0.3 }} />
              {g ? `${tl(GEM_STATS[parseGem(g).type].name)} ${parseGem(g).lvl} · ${t('gear.unsocket')}` : t('gear.emptySocket')}
            </button>
          ))}
        </div>
      )}

      {compare && <CompareBlock item={item} other={compare} />}

      {msg && (
        <div className={css.gold} style={{ textAlign: 'center', margin: '8px 0 0', fontWeight: 800 }}>
          {msg}
        </div>
      )}

      <div className={css.divider} />
      <div className={css.col} style={{ gap: 6 }}>
        {item.enh < cfg.gear.enhanceMax && (
          <Button block onClick={() => void enhance()}>
            <Icon name="forge" size={18} />
            {t('gear.enhance')} +{item.enh + 1}
            <Cost cur="gold" amount={cost.gold} />
            <Cost cur="dust" amount={cost.dust} />
            {chance < 1 && <span className={css.tiny}>{t('gear.enhanceChance', { pct: Math.round(chance * 100) })}</span>}
          </Button>
        )}
        <div className={css.row}>
          {owner ? (
            <Button kind="secondary" block onClick={() => void useGame.getState().act('item.unequip', { hero: owner.hero, slot: owner.slot }).then(onClose)}>
              {t('common.unequip')}
            </Button>
          ) : targetHero ? (
            <Button
              block
              kind="good"
              disabled={!wearable}
              onClick={() => void useGame.getState().act('item.equip', { hero: targetHero, uid }).then((r) => r.ok && onClose())}
            >
              {wearable ? `${t('common.equip')} · ${tl(HEROINE_MAP[targetHero].name)}` : t('gear.cannotWear')}
            </Button>
          ) : null}
          {item.affixes.length > 0 && (
            <Button kind="secondary" block onClick={() => reforge(item)}>
              {t('gear.reforge')}
            </Button>
          )}
        </div>
        <div className={css.row}>
          <Button kind="secondary" block size="small" onClick={() => transfer(item)}>
            {t('gear.transfer')}
          </Button>
          <Button
            kind="danger"
            block
            size="small"
            disabled={!!owner || item.lock}
            onClick={() =>
              confirmDialog(`${t('gear.smeltOne')}: ${itemName(item)}?`, async () => {
                const r = await useGame.getState().act('item.smelt', { uids: [uid] });
                if (r.ok) {
                  useUi.getState().toast(t('gear.smeltDone', { n: 1, dust: r.result.dust }), 'good');
                  onClose();
                }
              })
            }
          >
            {t('gear.smeltOne')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function SetBonusLine({ n, active, stats, fx }: { n: number; active: boolean; stats?: Stats; fx?: string }) {
  const parts = Object.entries(stats ?? {}).map(([k, v]) => statLine(k as StatKey, v as number));
  if (fx) parts.push(fx);
  return (
    <div style={{ fontSize: 12, color: active ? '#b6f0a6' : 'var(--text-3)', padding: '2px 0' }}>
      ({n}) {parts.join(', ')}
    </div>
  );
}

function CompareBlock({ item, other }: { item: Item; other: Item }) {
  const cfg = useCfg();
  const a = itemStats(cfg, item);
  const b = itemStats(cfg, other);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])] as StatKey[];
  const pa = itemPower(cfg, item);
  const pb = itemPower(cfg, other);
  return (
    <div className={css.inset} style={{ marginTop: 6 }}>
      <div className={css.row}>
        <span className={css.tiny}>{t('gear.compare')}</span>
        <span className={css.grow} />
        <Icon name={pa >= pb ? 'up' : 'down'} size={16} />
        <span className={pa >= pb ? css.goodText : css.badText} style={{ fontWeight: 800, fontSize: 12 }}>
          {pa >= pb ? '+' : ''}
          {Math.round(((pa - pb) / Math.max(1, pb)) * 100)}%
        </span>
      </div>
      {keys.map((k) => {
        const d = (a[k] ?? 0) - (b[k] ?? 0);
        if (Math.abs(d) < 1e-6) return null;
        return (
          <div key={k} style={{ fontSize: 12 }} className={d > 0 ? css.goodText : css.badText}>
            {d > 0 ? statLine(k, d) : statLine(k, -d).replace('+', '−')}
          </div>
        );
      })}
    </div>
  );
}

function pickGem(onPick: (gem: string) => void) {
  const gems = useGame.getState().state!.gems;
  const list = Object.entries(gems).filter(([, n]) => n > 0);
  openSheet(t('gear.socket'), (close) => (
    <div className={css.list}>
      {list.length === 0 && <div className={css.muted}>{t('err.noGem')}</div>}
      {list.map(([g, n]) => {
        const { type, lvl } = parseGem(g);
        const gs = GEM_STATS[type];
        return (
          <div
            key={g}
            className={css.listItem}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              close();
              onPick(g);
            }}
          >
            <Icon name="gem" size={24} style={{ filter: `drop-shadow(0 0 3px ${gs.color})` }} />
            <span style={{ color: gs.color, fontWeight: 800 }}>
              {tl(gs.name)} {lvl}
            </span>
            <span className={css.grow}>{statLine(gs.stat, gs.values[lvl - 1])}</span>
            <span className={css.num}>×{n}</span>
          </div>
        );
      })}
    </div>
  ));
}

function reforge(item: Item) {
  const cfg = useGame.getState().cfg!;
  const cost = reforgeCost({ cfg }, item);
  openSheet(t('gear.reforgePick'), (close) => (
    <div className={css.list}>
      {item.affixes.map((a, i) => (
        <div
          key={i}
          className={css.listItem}
          style={{ cursor: 'pointer' }}
          onClick={async () => {
            const r = await useGame.getState().act('item.reforge', { uid: item.uid, index: i });
            if (r.ok) {
              sfx('enhanceOk');
              useUi.getState().toast(`${statLine(r.result.old.id, r.result.old.v)} → ${statLine(r.result.affix.id, r.result.affix.v)}`, 'good');
              close();
            }
          }}
        >
          <span className={css.grow}>{statLine(a.id as StatKey, a.v)}</span>
          <Cost cur="gold" amount={cost.gold} />
          <Cost cur="dust" amount={cost.dust} />
        </div>
      ))}
    </div>
  ));
}

function transfer(to: Item) {
  const s = useGame.getState().state!;
  const donors = Object.values(s.items).filter((x) => x.uid !== to.uid && x.slot === to.slot && x.enh > to.enh);
  openSheet(t('gear.transferPick'), (close) => (
    <div className={css.grid6}>
      {donors.length === 0 && <div className={css.muted} style={{ gridColumn: '1/-1' }}>{t('err.nothingToTransfer')}</div>}
      {donors.map((d) => (
        <ItemSlot
          key={d.uid}
          item={d}
          size={48}
          onClick={async () => {
            const r = await useGame.getState().act('item.transfer', { from: d.uid, to: to.uid });
            if (r.ok) close();
          }}
        />
      ))}
    </div>
  ));
}
