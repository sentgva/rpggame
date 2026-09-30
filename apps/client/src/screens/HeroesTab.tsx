import { CLASSES, COMBOS, COMBO_MASTERY, COMBO_MASTERY_STEP, HEROINES, HEROINE_MAP, ROSTER, activeParty, comboMastery, partyPower, stageFromGlobal, type ComboDef } from '@idle/shared';
import { HeroImg } from '../components/HeroImg';
import { Button, CLASS_COLOR, HeroCard, Icon, Panel, css, formatNum } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { HeroDetail } from './heroes/HeroDetail';

export default function HeroesTab() {
  const stack = useUi((u) => u.stacks.heroes);
  const top = stack[stack.length - 1];
  if (top?.id === 'hero') return <HeroDetail id={top.params!.id} />;
  return <LegionRoot />;
}

/** Легион: шесть героинь шести классов, построение в бою и связки между ними. */
function LegionRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const party = activeParty(s);
  const front = party.filter((id) => CLASSES[HEROINE_MAP[id].cls].row === 'front');
  const back = party.filter((id) => !front.includes(id));
  const open = (id: string) => useUi.getState().push({ id: 'hero', params: { id } });

  return (
    <div className={css.col}>
      <Panel
        title={t('legion.title')}
        right={
          <span className={css.row} style={{ gap: 4 }}>
            <Icon name="battle" size={16} />
            <b className={css.num}>{formatNum(partyPower(cfg, s))}</b>
          </span>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div className={css.col} style={{ gap: 4 }}>
            <div className={css.tiny}>{t('heroes.back')}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {back.map((id) => (
                <FormationSlot key={id} id={id} onClick={() => open(id)} />
              ))}
            </div>
          </div>
          <div className={css.col} style={{ gap: 4 }}>
            <div className={css.tiny}>{t('heroes.front')}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {front.map((id) => (
                <FormationSlot key={id} id={id} onClick={() => open(id)} />
              ))}
            </div>
          </div>
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('legion.formationHint')}
        </div>
        <div className={css.row} style={{ marginTop: 6, justifyContent: 'flex-end' }}>
          <Button size="small" kind="secondary" onClick={() => void useGame.getState().act('item.autoEquip', {})}>
            {t('legion.autoEquipAll')}
          </Button>
        </div>
      </Panel>

      <div className={css.grid3}>
        {ROSTER.map((id) => {
          const def = HEROINE_MAP[id];
          if (s.heroines[id]) {
            const away = s.modes.expeditions.some((e) => e.heroes.includes(id));
            return <HeroCard key={id} id={id} onClick={() => open(id)} sub={away ? <span className={css.tiny}>{t('heroes.expedition')}</span> : undefined} />;
          }
          const ref = stageFromGlobal(Math.max(1, def.join));
          return (
            <HeroCard
              key={id}
              id={id}
              owned={false}
              onClick={() => open(id)}
              sub={
                <span className={css.tiny} style={{ textAlign: 'center' }}>
                  <Icon name="lock" size={10} /> {t('legion.joinsAt', { act: ref.act, stage: ref.stage })}
                </span>
              }
            />
          );
        })}
      </div>

      <CombosPanel />
    </div>
  );
}

function FormationSlot({ id, onClick }: { id: string; onClick: () => void }) {
  const h = useGame((g) => g.state?.heroines[id]);
  const def = HEROINE_MAP[id];
  return (
    <div
      onClick={onClick}
      style={{
        width: 54,
        aspectRatio: '1',
        borderRadius: 6,
        border: `2px solid ${CLASS_COLOR[def.cls]}`,
        background: 'radial-gradient(circle at 50% 35%, #3a2a30, #140e12 75%)',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <HeroImg className="pixel" id={id} skin={h?.skin} style={{ width: '100%', height: '100%' }} />
      <span style={{ position: 'absolute', bottom: 0, right: 3, fontSize: 10, fontWeight: 800, textShadow: '0 0 2px #000' }}>{h?.lvl}</span>
      <span style={{ position: 'absolute', top: 1, left: 1 }}>
        <Icon name={def.cls} size={14} />
      </span>
    </div>
  );
}

/** Связки классов: какие уже работают в отряде, а каких героинь не хватает. */
export function CombosPanel({ highlight }: { highlight?: string }) {
  const s = useGameState();
  const has = (cls: string) => HEROINES.some((h) => h.cls === cls && s.heroines[h.id]);
  const ready = (c: ComboDef) => has(c.from) && c.to.some((x) => has(x));
  return (
    <Panel title={t('legion.combos')} right={<Icon name="combo" size={18} />}>
      <div className={css.tiny} style={{ marginBottom: 6 }}>
        {t('legion.combosHint')}
      </div>
      <div className={css.list}>
        {COMBOS.map((c) => {
          const on = ready(c);
          const count = s.counters[`combo:${c.id}`] ?? 0;
          const m = comboMastery(count);
          return (
            <div
              key={c.id}
              className={css.listItem}
              style={{
                alignItems: 'flex-start',
                opacity: on ? 1 : 0.55,
                borderColor: highlight && (c.from === highlight || c.to.includes(highlight as never)) ? CLASS_COLOR[highlight as keyof typeof CLASS_COLOR] : undefined,
              }}
            >
              <div className={css.row} style={{ gap: 2, flex: 'none', paddingTop: 2 }}>
                <Icon name={c.from} size={20} />
                <span className={css.muted}>→</span>
                {c.to.length > 2 ? <Icon name="heroes" size={20} /> : c.to.map((x) => <Icon key={x} name={x} size={20} />)}
              </div>
              <div className={css.grow}>
                <div className={css.row} style={{ gap: 6 }}>
                  <b style={{ color: on ? CLASS_COLOR[c.from] : undefined }}>{tl(c.name)}</b>
                  {m.lvl > 0 && (
                    <span className={css.chip} style={{ padding: '0 5px', fontSize: 10 }}>
                      {t('legion.mastery', { lvl: m.lvl, pct: Math.round(m.lvl * COMBO_MASTERY_STEP * 100) })}
                    </span>
                  )}
                </div>
                <div className={css.tiny}>{tl(c.desc)}</div>
                {on && m.next !== null && (
                  <div className={css.row} style={{ gap: 6, marginTop: 3 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#2a2026', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, ((count - m.from) / (m.next - m.from)) * 100)}%`, height: '100%', background: CLASS_COLOR[c.from] }} />
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
