import {
  CLASSES,
  COMBOS,
  COMBO_MASTERY,
  COMBO_MASTERY_STEP,
  HEROINES,
  HEROINE_MAP,
  ROSTER,
  activeParty,
  comboMastery,
  heroCanUpgrade,
  heroLevel,
  heroStats,
  partyPower,
  rankCap,
  recommendedPower,
  stageRef,
  type ClassId,
  type ComboDef,
} from '@idle/shared';
import { portraitUrl } from '../art/runtime';
import { HeroImg } from '../components/HeroImg';
import { Button, CLASS_COLOR, Icon, Panel, Rank, css, cx, formatNum } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { navigate, useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { HeroDetail } from './heroes/HeroDetail';
import st from './heroes/Legion.module.css';

export default function HeroesTab() {
  const stack = useUi((u) => u.stacks.heroes);
  const top = stack[stack.length - 1];
  if (top?.id === 'hero') return <HeroDetail id={top.params!.id} />;
  return <LegionRoot />;
}

const openHero = (id: string) => {
  haptic.select();
  useUi.getState().push({ id: 'hero', params: { id } });
};

/** Легион: общий уровень, строй, шесть героев и связки между ними. */
function LegionRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const party = activeParty(s);
  const power = partyPower(cfg, s);
  const rec = recommendedPower(cfg, Math.min(s.progress.stage + 1, 600));
  const order = [...party].sort((a, b) => CLASSES[HEROINE_MAP[a].cls].x - CLASSES[HEROINE_MAP[b].cls].x);

  return (
    <div className={css.col}>
      <Panel>
        <div className={st.head}>
          <div className={st.lvl}>
            <span>{t('legion.lvlShort')}</span>
            <b>{s.legion.lvl}</b>
          </div>
          <div className={css.grow}>
            <div className={css.tiny}>{t('legion.powerTitle')}</div>
            <div className={st.power}>
              <Icon name="sword" size={18} />
              <b style={{ color: power >= rec ? 'var(--good)' : 'var(--text)' }}>{formatNum(power)}</b>
              <span className={css.tiny}>{t('legion.rec', { n: formatNum(rec) })}</span>
            </div>
          </div>
          <Button
            size="small"
            kind="secondary"
            onClick={async () => {
              const r = await useGame.getState().act('party.autoEquip', {});
              if (r.ok) useUi.getState().toast(t('gear.autoDone', { n: r.result.changes }), 'good');
            }}
          >
            {t('legion.autoEquipAll')}
          </Button>
        </div>

        <div className={st.field}>
          {order.map((id, i) => {
            const h = s.heroines[id];
            return (
              <div key={id} className={st.fieldUnit} style={{ left: `${8 + (i * 78) / Math.max(1, order.length - 1)}%` }} onClick={() => openHero(id)}>
                <HeroImg className="pixel" id={id} skin={h.skin} still />
                <span style={{ color: CLASS_COLOR[HEROINE_MAP[id].cls] }}>{tl(CLASSES[HEROINE_MAP[id].cls].name)}</span>
              </div>
            );
          })}
        </div>
        <div className={st.fieldTags}>
          <span>{t('heroes.back')}</span>
          <span>{t('legion.enemySide')}</span>
        </div>
      </Panel>

      <div className={st.grid}>
        {ROSTER.map((id) => (s.heroines[id] ? <LegionCard key={id} id={id} /> : <LockedCard key={id} id={id} />))}
      </div>

      <CombosPanel />
    </div>
  );
}

function LegionCard({ id }: { id: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const color = CLASS_COLOR[def.cls];
  const lvl = heroLevel(cfg, s, h);
  const capped = s.legion.lvl > lvl;
  const pw = heroStats(cfg, s, id).power;
  return (
    <div className={st.card} style={{ ['--c' as string]: color }} onClick={() => openHero(id)}>
      {heroCanUpgrade(cfg, s, id) && <span className={st.dot} />}
      <HeroImg className={cx('pixel', st.cardSprite)} id={id} skin={h.skin} />
      <div className={st.cardTop}>
        <div className={st.cardName}>{tl(def.name)}</div>
        <div className={st.cardCls}>
          <Icon name={def.cls} size={13} />
          {tl(CLASSES[def.cls].name)}
        </div>
      </div>
      <div className={st.cardBottom}>
        <div className={st.lvlRow}>
          <b className={cx(capped && st.capped)}>{lvl}</b>
          <span className={cx(capped && st.capped)}>/ {rankCap(cfg, h.rank)}</span>
        </div>
        <Rank n={h.rank} size={10} />
        <div className={st.pw}>
          <Icon name="sword" size={13} />
          {formatNum(pw)}
        </div>
      </div>
    </div>
  );
}

function LockedCard({ id }: { id: string }) {
  const def = HEROINE_MAP[id];
  const ref = stageRef(Math.max(1, def.join));
  return (
    <div className={cx(st.card, st.cardLocked)} style={{ ['--c' as string]: CLASS_COLOR[def.cls] }} onClick={() => openHero(id)}>
      <HeroImg className={cx('pixel', st.cardSprite)} id={id} still style={{ filter: 'brightness(0.15)' }} />
      <div className={st.cardTop}>
        <div className={st.cardName}>{tl(def.name)}</div>
        <div className={st.cardCls}>
          <Icon name={def.cls} size={13} />
          {tl(CLASSES[def.cls].name)}
        </div>
      </div>
      <div className={st.cardBottom}>
        <div className={st.joins}>
          <Icon name="lock" size={12} />
          {t('legion.joinsAt', { act: ref.act, stage: ref.stage })}
        </div>
      </div>
    </div>
  );
}

const heroOfClass = (cls: ClassId) => HEROINES.find((h) => h.cls === cls)!.id;

/** Связки: пара героев в Цепи Легиона даёт особый эффект; чем чаще — тем выше мастерство. */
export function CombosPanel({ only }: { only?: ClassId }) {
  const s = useGameState();
  const has = (cls: ClassId) => !!s.heroines[heroOfClass(cls)];
  const ready = (c: ComboDef) => has(c.from) && c.to.some((x) => has(x));
  const list = only ? COMBOS.filter((c) => c.from === only || c.to.includes(only)) : COMBOS;
  const skins = s.heroines;
  return (
    <Panel title={t('legion.combos')} right={<Icon name="combo" size={18} />}>
      <div className={css.tiny} style={{ marginBottom: 8 }}>
        {t('legion.combosHint')}
      </div>
      <div className={css.col} style={{ gap: 8 }}>
        {list.map((c) => {
          const on = ready(c);
          const count = s.counters[`combo:${c.id}`] ?? 0;
          const m = comboMastery(count);
          const a = heroOfClass(c.from);
          const partners = c.to.map(heroOfClass);
          return (
            <div key={c.id} className={cx(st.combo, !on && st.comboOff)}>
              <div className={st.pair}>
                <img className="pixel" src={portraitUrl(a, skins[a]?.skin)} alt="" />
                <span className={css.muted}>+</span>
                {partners.length > 2 ? <Icon name="heroes" size={28} /> : partners.map((p) => <img key={p} className="pixel" src={portraitUrl(p, skins[p]?.skin)} alt="" />)}
              </div>
              <div className={css.grow}>
                <div className={css.row} style={{ gap: 6 }}>
                  <b style={{ color: on ? CLASS_COLOR[c.from] : undefined }}>{tl(c.name)}</b>
                  {m.lvl > 0 && <span className={st.tag}>{t('legion.mastery', { lvl: m.lvl, pct: Math.round(m.lvl * COMBO_MASTERY_STEP * 100) })}</span>}
                </div>
                <div className={css.tiny}>{tl(c.desc)}</div>
                {on && m.next !== null && (
                  <div className={css.row} style={{ gap: 6, marginTop: 4 }}>
                    <div className={st.mini}>
                      <div style={{ width: `${Math.min(100, ((count - m.from) / (m.next - m.from)) * 100)}%`, background: CLASS_COLOR[c.from] }} />
                    </div>
                    <span className={css.tiny}>
                      {formatNum(count)}/{formatNum(m.next)}
                    </span>
                  </div>
                )}
                {on && m.lvl >= COMBO_MASTERY.length && <div className={css.tiny}>{t('legion.masteryMax')}</div>}
                {!on && <div className={css.tiny}>{t('legion.comboMissing')}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Переход к герою из любого места. */
export function goHero(id: string) {
  navigate('heroes', { id: 'hero', params: { id } });
}
