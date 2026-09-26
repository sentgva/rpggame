import {
  ARTIFACTS,
  ARTIFACT_BANNER,
  ARTIFACT_MAP,
  ARTIFACT_MAX,
  ARTIFACT_RARITY_COLORS,
  ARTIFACT_SLOT3_LVL,
  HEROINE_MAP,
  HERO_RARITY_COLORS,
  artifactFreeReady,
  artifactSlots,
  artifactState,
  artifactText,
  isUnlocked,
  type ArtifactPull,
  type SummonPull,
} from '@idle/shared';
import { useState } from 'react';
import { ArtifactIcon } from '../../components/ArtifactIcon';
import { openGacha, type GachaRarity } from '../../components/Gacha';
import { HeroImg } from '../../components/HeroImg';
import { Button, Cost, Icon, Panel, Tabs, css, cx, openSheet } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic, share } from '../../tg/telegram';
import { BackHeader, Locked } from '../common';
import st from './Summon.module.css';

type Banner = 'heroes' | 'artifacts';

export function Summon() {
  const s = useGameState();
  const cfg = useCfg();
  const [tab, setTab] = useState<Banner>('heroes');
  const now = useGame.getState().now();
  const artOpen = isUnlocked({ s, cfg }, 'artifacts');
  return (
    <div className={css.col}>
      <BackHeader title={t('summon.title')} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'heroes', label: t('summon.tabHeroes'), badge: !s.day.freeSummon },
          { id: 'artifacts', label: t('summon.tabArtifacts'), badge: artOpen && artifactFreeReady({ s, now }) },
        ]}
      />
      {tab === 'heroes' ? <HeroBanner /> : artOpen ? <ArtifactBanner /> : <Locked text={t('art.locked', { stage: cfg.unlocks.stage.artifacts })} />}
    </div>
  );
}

// ——— героини ———

function HeroBanner() {
  const s = useGameState();
  const cfg = useCfg();
  const S = cfg.summon;
  const pull = async (count: 1 | 10, pay: 'crystals' | 'scrolls') => {
    const r = await useGame.getState().act('summon', { count, pay });
    if (r.ok) showPulls(r.result.pulls);
  };
  return (
    <>
      <Panel>
        <div className={st.banner} style={{ background: 'radial-gradient(circle at 50% 60%, #5a2a8a, #1a0e24 70%)' }}>
          <div className={st.bannerRing} />
          <Icon name="summon" size={110} style={{ animation: 'bob 2s ease-in-out infinite', filter: 'drop-shadow(0 0 12px #e040ff)' }} />
          <HeroImg className="pixel" id="lira" width={72} height={72} style={{ position: 'absolute', left: 14, bottom: 6 }} />
          <HeroImg className="pixel" id="velvet" width={72} height={72} style={{ position: 'absolute', right: 14, bottom: 6, transform: 'scaleX(-1)' }} />
        </div>
        <div className={css.row} style={{ justifyContent: 'space-between', margin: '8px 0' }}>
          <span className={css.tiny}>{t('summon.pitySSR', { n: S.pitySSR - s.summon.pitySSR })}</span>
          <span className={css.tiny}>{t('summon.pityUR', { n: S.pityUR - s.summon.pityUR })}</span>
        </div>
        <div className={css.col} style={{ gap: 6 }}>
          <div className={css.row}>
            <Button block onClick={() => void pull(1, 'crystals')}>
              {t('summon.one')} <Cost cur="crystals" amount={S.cost1} />
            </Button>
            <Button block onClick={() => void pull(10, 'crystals')}>
              {t('summon.ten')} <Cost cur="crystals" amount={S.cost10} />
            </Button>
          </div>
          <div className={css.row}>
            <Button kind="secondary" block disabled={s.cur.scrolls < 1} onClick={() => void pull(1, 'scrolls')}>
              {t('summon.one')} <Cost cur="scrolls" amount={1} />
            </Button>
            <Button kind="secondary" block disabled={s.cur.scrolls < 10} onClick={() => void pull(10, 'scrolls')}>
              {t('summon.ten')} <Cost cur="scrolls" amount={10} />
            </Button>
          </div>
          <Button
            kind="good"
            block
            disabled={s.day.freeSummon}
            onClick={async () => {
              const r = await useGame.getState().act('summon.free');
              if (r.ok) showPulls(r.result.pulls);
            }}
          >
            {t('summon.free')} · {s.day.freeSummon ? t('summon.freeUsed') : t('common.free')}
          </Button>
        </div>
      </Panel>
      <Panel title={t('summon.rates')}>
        {(['UR', 'SSR', 'SR', 'R'] as const).map((r) => (
          <div key={r} className={css.statRow}>
            <b style={{ color: HERO_RARITY_COLORS[r] }}>{r}</b>
            <span className={css.num}>{S.rates[r]}%</span>
          </div>
        ))}
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('summon.guarantee')}
        </div>
        <div className={css.tiny}>{t('summon.total', { n: s.summon.total })}</div>
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('summon.freeNote')}
        </div>
      </Panel>
    </>
  );
}

function showPulls(pulls: SummonPull[]) {
  const botUsername = useGame.getState().botUsername;
  const best = pulls.reduce((a, p) => (['R', 'SR', 'SSR', 'UR'].indexOf(p.rarity) > ['R', 'SR', 'SSR', 'UR'].indexOf(a.rarity) ? p : a), pulls[0]);
  openGacha({
    title: t('summon.titleHeroes'),
    colors: HERO_RARITY_COLORS as Record<GachaRarity, string>,
    items: pulls.map((p) => ({
      rarity: p.rarity as GachaRarity,
      name: tl(HEROINE_MAP[p.hero].name),
      sub: p.isNew ? t('summon.new') : t(pulls.length === 1 ? 'summon.dupe' : 'summon.dupeShort', { n: p.shards }),
      subGood: p.isNew,
      isNew: p.isNew,
      art: ({ live }) => <HeroImg id={p.hero} still={!live} />,
    })),
    share: {
      label: t('summon.share'),
      run: () => {
        const link = botUsername ? `https://t.me/${botUsername}?startapp=hero_${best.hero}` : location.href;
        share(t('share.hero', { name: tl(HEROINE_MAP[best.hero].name) }), link);
      },
    },
  });
}

// ——— артефакты ———

function ArtifactBanner() {
  const s = useGameState();
  const now = useGame.getState().now();
  const a = artifactState(s);
  const B = ARTIFACT_BANNER;
  const freeReady = artifactFreeReady({ s, now });
  const pull = async (params: Record<string, unknown>) => {
    const r = await useGame.getState().act<{ pulls: ArtifactPull[] }>('artifact.summon', params);
    if (r.ok && r.result) showArtifactPulls(r.result.pulls);
  };
  const ownedCount = Object.keys(a.owned).length;
  return (
    <>
      <Panel>
        <div className={st.banner} style={{ background: 'radial-gradient(circle at 50% 60%, #6a4a1a, #140c08 72%)' }}>
          <div className={st.bannerRing} style={{ borderColor: '#f0c040' }} />
          {['time_chain', 'aether_prism', 'valkyrie_horn', 'phoenix_ash', 'thunder_bell'].map((id, i) => (
            <div key={id} className={st.floatArt} style={{ left: `${10 + i * 19}%`, animationDelay: `${i * 0.35}s`, top: i % 2 ? '38%' : '14%' }}>
              <ArtifactIcon id={id} size={i === 2 ? 64 : 46} />
            </div>
          ))}
          <div className={st.bannerLabel}>{t('art.bannerName')}</div>
        </div>
        <div className={css.tiny} style={{ margin: '8px 2px', lineHeight: 1.4 }}>
          {t('art.bannerDesc')}
        </div>
        <div className={css.row} style={{ justifyContent: 'space-between', margin: '4px 0 8px' }}>
          <span className={css.tiny}>{t('summon.pitySSR', { n: B.pitySSR - a.pitySSR })}</span>
          <span className={css.tiny}>{t('summon.pityUR', { n: B.pityUR - a.pityUR })}</span>
        </div>
        <div className={css.col} style={{ gap: 6 }}>
          <div className={css.row}>
            <Button block onClick={() => void pull({ count: 1 })}>
              {t('summon.one')} <Cost cur="crystals" amount={B.cost1} />
            </Button>
            <Button block onClick={() => void pull({ count: 10 })}>
              {t('summon.ten')} <Cost cur="crystals" amount={B.cost10} />
            </Button>
          </div>
          <Button kind="good" block disabled={!freeReady} onClick={() => void pull({ free: true })}>
            {t('summon.free')} · {freeReady ? t('common.free') : t('summon.freeUsed')}
          </Button>
        </div>
      </Panel>

      <ArtifactSlots />

      <Panel title={t('art.collection', { n: ownedCount, max: ARTIFACTS.length })}>
        <div className={css.grid4}>
          {ARTIFACTS.map((d) => {
            const lvl = a.owned[d.id] ?? 0;
            return (
              <button key={d.id} className={cx(st.artCell, !lvl && st.artCellLocked)} onClick={() => openArtifact(d.id)}>
                <ArtifactIcon id={d.id} size={50} dim={!lvl} />
                <span className={st.artName}>{lvl ? tl(d.name) : '???'}</span>
                {lvl > 0 && <span className={st.artLvl}>{'★'.repeat(lvl)}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={t('summon.rates')}>
        {(['UR', 'SSR', 'SR', 'R'] as const).map((r) => (
          <div key={r} className={css.statRow}>
            <b style={{ color: ARTIFACT_RARITY_COLORS[r] }}>{r}</b>
            <span className={css.num}>{B.rates[r]}%</span>
          </div>
        ))}
        <div className={css.tiny} style={{ marginTop: 6, lineHeight: 1.4 }}>
          {t('art.guarantee', { ssr: B.pitySSR, ur: B.pityUR, max: ARTIFACT_MAX })}
        </div>
      </Panel>
    </>
  );
}

function ArtifactSlots() {
  const s = useGameState();
  const a = artifactState(s);
  const n = artifactSlots(s.account.lvl);
  return (
    <Panel title={t('art.slots')}>
      <div className={st.slots}>
        {Array.from({ length: 3 }, (_, i) => {
          const locked = i >= n;
          const id = !locked ? a.slots[i] : null;
          const lvl = id ? a.owned[id] : 0;
          return (
            <button
              key={i}
              className={cx(st.slot, locked && st.slotLocked)}
              onClick={() => {
                haptic.tap();
                if (locked) useUi.getState().toast(t('art.slotLocked', { lvl: ARTIFACT_SLOT3_LVL }));
                else pickArtifact(i);
              }}
            >
              {locked ? (
                <Icon name="lock" size={26} />
              ) : id ? (
                <>
                  <ArtifactIcon id={id} size={52} />
                  <span className={st.artName}>{tl(ARTIFACT_MAP[id].name)}</span>
                  <span className={st.artLvl}>{'★'.repeat(lvl)}</span>
                </>
              ) : (
                <span className={st.slotEmpty}>+</span>
              )}
            </button>
          );
        })}
      </div>
      <div className={css.tiny} style={{ marginTop: 6, lineHeight: 1.4 }}>
        {t('art.slotsHint', { lvl: ARTIFACT_SLOT3_LVL })}
      </div>
    </Panel>
  );
}

/** Выбор артефакта в слот. */
function pickArtifact(slot: number) {
  const s = useGame.getState().state!;
  const a = artifactState(s);
  const owned = ARTIFACTS.filter((d) => a.owned[d.id]);
  const lang = getLang();
  openSheet(t('art.pick'), (close) => (
    <div className={css.col}>
      {owned.length === 0 && <div className={css.muted}>{t('art.none')}</div>}
      {a.slots[slot] && (
        <Button
          kind="secondary"
          block
          onClick={async () => {
            close();
            await useGame.getState().act('artifact.equip', { slot, id: null });
          }}
        >
          {t('art.unequip')}
        </Button>
      )}
      {owned.map((d) => (
        <button
          key={d.id}
          className={css.listItem}
          style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer', border: a.slots[slot] === d.id ? `2px solid ${ARTIFACT_RARITY_COLORS[d.rarity]}` : undefined }}
          onClick={async () => {
            close();
            haptic.select();
            await useGame.getState().act('artifact.equip', { slot, id: d.id });
          }}
        >
          <ArtifactIcon id={d.id} size={42} />
          <span className={css.grow}>
            <b style={{ color: ARTIFACT_RARITY_COLORS[d.rarity] }}>{tl(d.name)}</b> <span className={css.tiny}>{'★'.repeat(a.owned[d.id])}</span>
            <div className={css.tiny} style={{ lineHeight: 1.35 }}>
              {artifactText(d.id, a.owned[d.id], lang)}
            </div>
            {a.slots.includes(d.id) && a.slots[slot] !== d.id && <div className={css.tiny} style={{ color: '#f2c86a' }}>{t('art.inOtherSlot')}</div>}
          </span>
        </button>
      ))}
    </div>
  ));
}

/** Карточка артефакта: сила на текущем и следующем уровне. */
function openArtifact(id: string) {
  const d = ARTIFACT_MAP[id];
  const s = useGame.getState().state!;
  const lvl = artifactState(s).owned[id] ?? 0;
  const lang = getLang();
  openSheet(tl(d.name), () => (
    <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
      <ArtifactIcon id={id} size={96} dim={!lvl} />
      <b style={{ color: ARTIFACT_RARITY_COLORS[d.rarity], fontSize: 18 }}>
        {d.rarity} · {lvl ? `${'★'.repeat(lvl)}${'☆'.repeat(ARTIFACT_MAX - lvl)}` : t('art.notOwned')}
      </b>
      <div style={{ lineHeight: 1.45 }}>{artifactText(id, Math.max(1, lvl), lang)}</div>
      {lvl > 0 && lvl < ARTIFACT_MAX && (
        <div className={css.tiny} style={{ color: '#ffd9a0' }}>
          {t('art.nextLvl', { text: artifactText(id, lvl + 1, lang) })}
        </div>
      )}
      <div className={css.tiny}>{t('art.dupeHint', { max: ARTIFACT_MAX })}</div>
    </div>
  ));
}

function showArtifactPulls(pulls: ArtifactPull[]) {
  openGacha({
    title: t('art.bannerName'),
    colors: ARTIFACT_RARITY_COLORS as Record<GachaRarity, string>,
    items: pulls.map((p) => ({
      rarity: p.rarity as GachaRarity,
      name: tl(ARTIFACT_MAP[p.id].name),
      sub: p.isNew ? t('art.new') : p.refund ? t('art.refund', { n: p.refund }) : t('art.lvlUp', { lvl: p.lvl }),
      subGood: p.isNew || !p.refund,
      isNew: p.isNew,
      art: ({ big }) => <ArtifactIcon id={p.id} size={big ? 150 : 44} />,
    })),
  });
}
