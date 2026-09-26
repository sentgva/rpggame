import {
  CLASSES,
  CLASS_IDS,
  ELEMENTS,
  HEROINES,
  HEROINE_MAP,
  HERO_RARITIES,
  buildHeroine,
  partySlots,
  type ClassId,
  type Element,
  type HeroRarity,
} from '@idle/shared';
import { useMemo, useState } from 'react';
import { HeroImg } from '../components/HeroImg';
import { Button, HeroCard, Icon, Panel, Tabs, css, cx } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { HeroDetail } from './heroes/HeroDetail';

type SortBy = 'level' | 'power' | 'rarity';
const SORTS: SortBy[] = ['level', 'power', 'rarity'];
function savedSort(): SortBy {
  try {
    const v = localStorage.getItem('heroSort') as SortBy | null;
    return v && SORTS.includes(v) ? v : 'level';
  } catch {
    return 'level';
  }
}

export default function HeroesTab() {
  const stack = useUi((u) => u.stacks.heroes);
  const top = stack[stack.length - 1];
  if (top?.id === 'hero') return <HeroDetail id={top.params!.id} />;
  return <HeroesRoot />;
}

function HeroesRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const [slot, setSlot] = useState<number | null>(null);
  const [fCls, setCls] = useState<ClassId | null>(null);
  const [fEl, setEl] = useState<Element | null>(null);
  const [fR, setR] = useState<HeroRarity | null>(null);
  const [sort, setSort] = useState<SortBy>(savedSort);
  const nextSort = () => {
    const v = SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];
    setSort(v);
    try {
      localStorage.setItem('heroSort', v);
    } catch {
      /* без хранилища — просто не запоминаем */
    }
  };
  const preset = s.party.active;
  const slots = s.party.presets[preset];
  const maxSlots = partySlots(cfg, s);

  const list = useMemo(() => {
    const all = HEROINES.filter((h) => (!h.boss || s.heroines[h.id] || (s.shards[h.id] ?? 0) > 0) && (!fCls || h.cls === fCls) && (!fEl || h.element === fEl) && (!fR || h.rarity === fR));
    const owned = all.filter((h) => s.heroines[h.id]);
    const rest = all.filter((h) => !s.heroines[h.id]);
    const rOrder: Record<string, number> = { UR: 0, SSR: 1, SR: 2, R: 3 };
    if (sort === 'power') {
      const pw = Object.fromEntries(owned.map((h) => [h.id, buildHeroine(cfg, s, s.heroines[h.id]).power]));
      owned.sort((a, b) => pw[b.id] - pw[a.id]);
    } else if (sort === 'rarity') owned.sort((a, b) => rOrder[a.rarity] - rOrder[b.rarity] || s.heroines[b.id].lvl - s.heroines[a.id].lvl);
    else owned.sort((a, b) => s.heroines[b.id].lvl - s.heroines[a.id].lvl || rOrder[a.rarity] - rOrder[b.rarity]);
    rest.sort((a, b) => (s.shards[b.id] ?? 0) - (s.shards[a.id] ?? 0) || rOrder[a.rarity] - rOrder[b.rarity]);
    return { owned, rest };
  }, [s, cfg, fCls, fEl, fR, sort]);

  const assign = (heroId: string | null) => {
    if (slot === null) return;
    const next = [...slots];
    if (heroId) {
      const prev = next.indexOf(heroId);
      if (prev >= 0) next[prev] = next[slot];
    }
    next[slot] = heroId;
    void useGame.getState().act('party.set', { preset, slots: next });
    setSlot(null);
  };

  const count = slots.filter(Boolean).length;
  const elems: Record<string, number> = {};
  const classes: Record<string, number> = {};
  for (const id of slots) if (id) {
    const d = HEROINE_MAP[id];
    elems[d.element] = (elems[d.element] ?? 0) + 1;
    classes[d.cls] = (classes[d.cls] ?? 0) + 1;
  }
  const syn = [
    ...Object.entries(elems).filter(([, n]) => n >= 3).map(([el]) => ({ icon: el, text: t('heroes.synergyElem') })),
    ...Object.entries(classes).filter(([, n]) => n >= 2).map(([c]) => ({ icon: c, text: tl(CLASSES[c as ClassId].synergyText) })),
  ];

  return (
    <div className={css.col}>
      <Panel
        title={t('heroes.party')}
        right={
          <span className={css.tiny}>
            {count}/{maxSlots}
          </span>
        }
      >
        <Tabs
          value={String(preset)}
          onChange={(v) => void useGame.getState().act('party.use', { preset: Number(v) })}
          items={s.party.presets.map((_, i) => ({ id: String(i), label: t('heroes.preset', { n: i + 1 }) }))}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8, marginTop: 8 }}>
          <div className={css.col} style={{ gap: 4 }}>
            <div className={css.tiny}>{t('heroes.back')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[2, 3, 4].map((i) => (
                <PartySlot key={i} id={slots[i]} active={slot === i} onClick={() => setSlot(slot === i ? null : i)} />
              ))}
            </div>
          </div>
          <div className={css.col} style={{ gap: 4 }}>
            <div className={css.tiny}>{t('heroes.front')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1].map((i) => (
                <PartySlot key={i} id={slots[i]} active={slot === i} onClick={() => setSlot(slot === i ? null : i)} />
              ))}
            </div>
          </div>
        </div>
        {slot !== null && (
          <div className={css.row} style={{ marginTop: 6 }}>
            <span className={css.tiny} style={{ flex: 1 }}>
              {t('heroes.setPartyHint')}
            </span>
            {slots[slot] && (
              <Button size="small" kind="danger" onClick={() => assign(null)}>
                {t('heroes.removeFromParty')}
              </Button>
            )}
          </div>
        )}
        {syn.length > 0 && (
          <div className={css.row} style={{ flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
            {syn.map((x, i) => (
              <span key={i} className={css.chip}>
                <Icon name={x.icon} size={14} />
                {x.text}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <div className={css.hscroll}>
        <button className={cx(css.chip, !fCls && !fEl && !fR && css.chipOn)} onClick={() => (setCls(null), setEl(null), setR(null))}>
          {t('heroes.filterAll')}
        </button>
        {HERO_RARITIES.map((r) => (
          <button key={r} className={cx(css.chip, fR === r && css.chipOn)} onClick={() => setR(fR === r ? null : r)}>
            {r}
          </button>
        ))}
        {ELEMENTS.map((el) => (
          <button key={el} className={cx(css.chip, fEl === el && css.chipOn)} onClick={() => setEl(fEl === el ? null : el)}>
            <Icon name={el} size={14} />
          </button>
        ))}
        {CLASS_IDS.map((c) => (
          <button key={c} className={cx(css.chip, fCls === c && css.chipOn)} onClick={() => setCls(fCls === c ? null : c)}>
            <Icon name={c} size={14} />
          </button>
        ))}
      </div>

      <div className={css.row} style={{ justifyContent: 'space-between' }}>
        <div className={css.muted}>{t('heroes.collection', { n: Object.keys(s.heroines).length, total: HEROINES.length })}</div>
        <button className={css.chip} onClick={nextSort}>
          ⇅ {t(`heroes.sort.${sort}`)}
        </button>
      </div>
      <div className={css.grid3}>
        {list.owned.map((h) => {
          const inParty = slots.includes(h.id);
          const away = s.modes.expeditions.some((e) => e.heroes.includes(h.id));
          return (
            <HeroCard
              key={h.id}
              id={h.id}
              selected={inParty}
              onClick={() => {
                if (slot !== null) {
                  if (away) return useUi.getState().toast(t('err.onExpedition'), 'bad');
                  assign(h.id);
                } else useUi.getState().push({ id: 'hero', params: { id: h.id } });
              }}
              sub={away ? <span className={css.tiny}>{t('heroes.expedition')}</span> : undefined}
            />
          );
        })}
      </div>
      {list.rest.length > 0 && (
        <>
          <div className={css.muted}>{t('heroes.notOwned')}</div>
          <div className={css.grid3}>
            {list.rest.map((h) => {
              const need = cfg.hero.recruitShards[h.rarity];
              const have = s.shards[h.id] ?? 0;
              return (
                <HeroCard
                  key={h.id}
                  id={h.id}
                  owned={false}
                  badge={have >= need}
                  onClick={() => useUi.getState().push({ id: 'hero', params: { id: h.id } })}
                  sub={<span className={css.tiny}>{t('heroes.shards', { have, need })}</span>}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PartySlot({ id, active, onClick }: { id: string | null; active: boolean; onClick: () => void }) {
  const h = useGame((g) => (id ? g.state?.heroines[id] : undefined));
  return (
    <div
      onClick={() => {
        haptic.select();
        onClick();
      }}
      style={{
        flex: 1,
        aspectRatio: '1',
        maxWidth: 64,
        border: `1.5px ${active ? 'solid var(--gold)' : 'dashed var(--line-2)'}`,
        background: 'radial-gradient(circle at 50% 35%, #2a2f3c, #14161d 75%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: active ? '0 0 10px rgba(201,164,92,.45)' : undefined,
      }}
    >
      {h ? <HeroImg className="pixel" id={h.id} skin={h.skin} style={{ width: '100%', height: '100%' }} /> : <span style={{ fontSize: 26, fontWeight: 300, lineHeight: 1, color: 'var(--text-3)' }}>+</span>}
      {h && <span style={{ position: 'absolute', bottom: 0, right: 3, fontSize: 10, fontWeight: 800, textShadow: '0 0 2px #000' }}>{h.lvl}</span>}
    </div>
  );
}
