import {
  ARTIFACTS,
  ARTIFACT_MAP,
  ARTIFACT_MAX,
  ARTIFACT_RARITY_COLORS,
  ARTIFACT_SLOT3_LVL,
  ARTIFACT_TIER_NAMES,
  ARTIFACT_TIER_STAGE,
  artifactCost,
  artifactOpen,
  artifactSlots,
  artifactState,
  artifactText,
  isUnlocked,
  stageFromGlobal,
  type Currency,
} from '@idle/shared';
import { ArtifactIcon } from '../../components/ArtifactIcon';
import { Button, Cost, Icon, Panel, css, cx, openSheet } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader, Locked } from '../common';
import st from './Workshop.module.css';

/** Мастерская артефактов: Легион сам мастерит правила боя — без случайности, за материалы. */
export function Workshop() {
  const s = useGameState();
  const cfg = useCfg();
  const open = isUnlocked({ s, cfg }, 'artifacts');
  const a = artifactState(s);
  return (
    <div className={css.col}>
      <BackHeader title={t('art.workshop')} />
      {!open ? (
        <Locked text={t('art.locked', { stage: cfg.unlocks.stage.artifacts })} />
      ) : (
        <>
          <Panel>
            <div className={css.tiny} style={{ lineHeight: 1.45 }}>
              {t('art.workshopDesc', { max: ARTIFACT_MAX })}
            </div>
            <div className={css.row} style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <Cost cur="forgeMats" amount={s.cur.forgeMats} size={16} />
              <Cost cur="starDust" amount={s.cur.starDust} size={16} />
              <Cost cur="crystals" amount={s.cur.crystals} size={16} />
            </div>
          </Panel>
          <ArtifactSlots />
          {(['R', 'SR', 'SSR', 'UR'] as const).map((tier) => {
            const list = ARTIFACTS.filter((d) => d.rarity === tier);
            const unlocked = s.progress.maxGlobalEver >= ARTIFACT_TIER_STAGE[tier];
            const ref = stageFromGlobal(Math.max(1, ARTIFACT_TIER_STAGE[tier]));
            return (
              <Panel
                key={tier}
                title={<span style={{ color: ARTIFACT_RARITY_COLORS[tier] }}>{tl(ARTIFACT_TIER_NAMES[tier])}</span>}
                right={!unlocked ? <span className={css.tiny}>{t('art.tierAt', { act: ref.act, stage: ref.stage })}</span> : undefined}
              >
                <div className={css.grid4}>
                  {list.map((d) => {
                    const lvl = a.owned[d.id] ?? 0;
                    return (
                      <button key={d.id} className={cx(st.artCell, (!lvl || !unlocked) && st.artCellLocked)} onClick={() => openArtifact(d.id)}>
                        <ArtifactIcon id={d.id} size={50} dim={!lvl} />
                        <span className={st.artName}>{tl(d.name)}</span>
                        <span className={st.artLvl}>{lvl ? '★'.repeat(lvl) : t('art.notMade')}</span>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </>
      )}
    </div>
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

/** Карточка артефакта: сила сейчас и на следующем уровне, изготовление и улучшение. */
function openArtifact(id: string) {
  const lang = getLang();
  openSheet(tl(ARTIFACT_MAP[id].name), () => <ArtifactCard id={id} lang={lang} />);
}

function ArtifactCard({ id, lang }: { id: string; lang: 'ru' | 'en' }) {
  const s = useGameState();
  const d = ARTIFACT_MAP[id];
  const lvl = artifactState(s).owned[id] ?? 0;
  const cost = artifactCost(id, lvl);
  const opened = artifactOpen(s, id);
  const ref = stageFromGlobal(Math.max(1, ARTIFACT_TIER_STAGE[d.rarity]));
  const enough = !!cost && Object.entries(cost).every(([c, v]) => (s.cur[c as Currency] ?? 0) >= (v ?? 0));
  return (
    <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
      <ArtifactIcon id={id} size={96} dim={!lvl} />
      <b style={{ color: ARTIFACT_RARITY_COLORS[d.rarity], fontSize: 18 }}>
        {tl(ARTIFACT_TIER_NAMES[d.rarity])} · {lvl ? `${'★'.repeat(lvl)}${'☆'.repeat(ARTIFACT_MAX - lvl)}` : t('art.notMade')}
      </b>
      <div style={{ lineHeight: 1.45 }}>{artifactText(id, Math.max(1, lvl), lang)}</div>
      {lvl > 0 && lvl < ARTIFACT_MAX && (
        <div className={css.tiny} style={{ color: '#ffd9a0' }}>
          {t('art.nextLvl', { text: artifactText(id, lvl + 1, lang) })}
        </div>
      )}
      {!opened ? (
        <div className={css.chip}>
          <Icon name="lock" size={12} /> {t('art.tierAt', { act: ref.act, stage: ref.stage })}
        </div>
      ) : cost ? (
        <Button
          kind={enough ? 'good' : 'secondary'}
          onClick={async () => {
            const r = await useGame.getState().act('artifact.craft', { id });
            if (r.ok) {
              sfx(lvl === 0 ? 'rare' : 'levelup');
              haptic.success();
            }
          }}
        >
          {lvl === 0 ? t('art.craft') : t('art.upgrade')}
          {Object.entries(cost).map(([c, v]) => (
            <Cost key={c} cur={c as Currency} amount={v ?? 0} size={14} />
          ))}
        </Button>
      ) : (
        <div className={css.tiny}>{t('art.maxed')}</div>
      )}
    </div>
  );
}
