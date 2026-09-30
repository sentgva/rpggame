import {
  ELEMENT_COLORS,
  ENEMY_MAP,
  HEROINE_MAP,
  HORDE_BLESSING_MAP,
  HORDE_BLESS_EVERY,
  RIFT_TACTICS,
  SKIN_MAP,
  hordeBonus,
  MECHANIC_TEXT,
  RIFT_ROTATION,
  RIFT_TIERS,
  hordeStage,
  hordeState,
  hordeWaveReward,
  farmLevel,
  riftBoss,
  riftReward,
  riftState,
  spireOpen,
  spireParty,
  spireReward,
  spireStage,
  stageForLevel,
  dayKey,
  type Element,
} from '@idle/shared';
import { useState } from 'react';
import { showBattle } from '../../components/BattleModal';
import { manualEnabled } from '../../battle/live';
import { EnemyImg, HeroImg } from '../../components/HeroImg';
import { Bar, Button, ElementIcon, Icon, Panel, css, cx, elementName, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { BackHeader, RewardList, showReward } from '../common';
import { stageText } from '../MapTab';

const DAY_NAMES_RU = ['пн', 'вт', 'ср', 'чт', 'пт'];
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const dayName = (el: Element) => (document.documentElement.lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_RU)[RIFT_ROTATION.indexOf(el)];

/** Бой в режиме: реплей в модальном окне, итог — свой заголовок и награды. */
export async function playMode(type: string, params: Record<string, unknown>, title: string, act: number, render: (res: any) => { outcome?: React.ReactNode; result?: React.ReactNode }) {
  // ручные ульты: бой идёт вживую, действие уходит на сервер после боя
  if (manualEnabled()) {
    showBattle({ live: { type, params, render }, act, title });
    return null;
  }
  const r = await useGame.getState().act(type, params);
  if (!r.ok) return null;
  const b = r.result.battle;
  const view = render(r.result);
  showBattle({ events: b.events, win: b.win, act, title, outcome: view.outcome, result: view.result });
  return r.result;
}

// ——— Разлом Колосса ———

/** Последняя выбранная тактика — удобство игрока, хранится в браузере. */
function savedTactic(): string {
  try {
    return localStorage.getItem('riftTactic') ?? 'none';
  } catch {
    return 'none';
  }
}

export function Rift() {
  const [tactic, setTactic] = useState(savedTactic);
  const pickTactic = (id: string) => {
    setTactic(id);
    try {
      localStorage.setItem('riftTactic', id);
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  };
  const tac = RIFT_TACTICS.find((x) => x.id === tactic) ?? RIFT_TACTICS[0];
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const r = riftState({ s, now });
  const boss = riftBoss({ cfg, s, now });
  const def = ENEMY_MAP[boss.id];
  const left = cfg.modes.riftAttempts - r.used;
  const act = def.act;
  const color = ELEMENT_COLORS[boss.element];
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.rift')} right={<span className={css.tiny}>{t('mode.riftAttempts', { n: left, max: cfg.modes.riftAttempts })}</span>} />
      <Panel>
        <div
          style={{
            position: 'relative',
            height: 228,
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: `radial-gradient(circle at 50% 45%, ${color}66, #140a18 72%)`,
          }}
        >
          <EnemyImg id={boss.id} className="pixel" style={{ width: 200, height: 200, marginBottom: 2 }} />
          <div style={{ position: 'absolute', left: 6, top: 6, display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(12,8,12,.72)', padding: '2px 8px 2px 4px', borderRadius: 4, zIndex: 1 }}>
            <ElementIcon el={boss.element} size={22} />
            <b style={{ color }}>{tl(def.name)}</b>
          </div>
          <div className={css.tiny} style={{ position: 'absolute', right: 8, top: 8 }}>
            ≈ {stageText(stageForLevel(cfg, boss.level))}
          </div>
        </div>
        {def.mechanic && (
          <div className={css.tiny} style={{ marginTop: 6 }}>
            <Icon name="skull" size={12} /> {tl(MECHANIC_TEXT[def.mechanic])}
          </div>
        )}
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('mode.riftRules', { hp: formatNum(boss.hp) })}
        </div>
        <div className={css.tiny} style={{ marginTop: 8 }}>
          {t('mode.riftTactic')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, marginTop: 4 }}>
          {RIFT_TACTICS.map((x) => (
            <button key={x.id} className={cx(css.chip, tactic === x.id && css.chipOn)} style={{ width: '100%', justifyContent: 'center', padding: '4px 2px', fontSize: 12 }} onClick={() => pickTactic(x.id)}>
              {tl(x.name)}
            </button>
          ))}
        </div>
        <div className={css.tiny} style={{ marginTop: 4, minHeight: 16 }}>
          {tl(tac.desc)}
        </div>
        <div className={css.row} style={{ marginTop: 8 }}>
          <Button
            block
            size="big"
            disabled={left <= 0}
            onClick={() =>
              void playMode('rift.fight', { tactic: tac.id }, tl(def.name), act, (res) => ({
                outcome: (
                  <span style={{ color }}>
                    {t('mode.riftTier', { n: res.tier })} · {formatNum(res.dmg)} ({((100 * res.dmg) / res.hp).toFixed(1)}%)
                  </span>
                ),
                result: <RewardList r={{ cur: res.reward.cur, items: res.reward.items, hearts: res.reward.hearts }} />,
              }))
            }
          >
            {t('mode.riftFight')}
          </Button>
          {r.used > 0 && r.bestTierToday > 0 && left > 0 && (
            <Button
              kind="secondary"
              block
              onClick={async () => {
                const res = await useGame.getState().act('rift.sweep');
                if (res.ok) showReward(t('mode.rift'), { cur: res.result.cur });
              }}
            >
              {t('mode.riftSweep', { n: left, t: r.bestTierToday })}
            </Button>
          )}
        </div>
      </Panel>

      <Panel title={t('mode.riftTiers')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
          {RIFT_TIERS.map((th, i) => {
            const tier = i + 1;
            const got = r.bestTierToday >= tier;
            const rw = riftReward({ cfg, s }, tier, boss.level);
            return (
              <div
                key={tier}
                className={cx(css.chip, got && css.chipOn)}
                style={{ flexDirection: 'column', padding: '3px 2px', gap: 0, width: '100%', borderColor: got ? color : undefined }}
              >
                <b style={{ fontSize: 12 }}>{tier}</b>
                <span style={{ fontSize: 10 }}>{(th * 100).toFixed(th < 0.05 ? 1 : 0)}%</span>
                <span style={{ fontSize: 10, color: '#f2c86a' }}>🎖️{rw.cur.emblems ?? 0}</span>
              </div>
            );
          })}
        </div>
        <div className={css.row} style={{ marginTop: 8, gap: 8, alignItems: 'center' }}>
          <Icon name="emblems" size={40} />
          <div className={css.grow}>
            <div className={css.tiny}>{t('mode.riftBest', { today: formatNum(r.bestDmgToday), week: formatNum(r.bestDmgWeek), ever: formatNum(r.bestDmgEver) })}</div>
            <div className={css.tiny}>{t('mode.riftSchedule')}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ——— Стихийные шпили ———

export function Spires() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const [sel, setSel] = useState<Element>(() => RIFT_ROTATION.find((el) => spireOpen(el, now)) ?? 'fire');
  const floor = (s.modes.spires?.[sel] ?? 0) + 1;
  const open = spireOpen(sel, now);
  const party = spireParty({ cfg, s, now }, sel);
  const rw = spireReward(floor, sel);
  const color = ELEMENT_COLORS[sel];
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.spires')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
        {RIFT_ROTATION.map((el) => {
          const isOpen = spireOpen(el, now);
          return (
            <button
              key={el}
              className={cx(css.chip, sel === el && css.chipOn)}
              style={{ flexDirection: 'column', width: '100%', padding: '6px 2px', gap: 2, opacity: isOpen ? 1 : 0.5, borderColor: sel === el ? ELEMENT_COLORS[el] : undefined }}
              onClick={() => setSel(el)}
            >
              <ElementIcon el={el} size={24} />
              <span style={{ fontSize: 11 }}>{s.modes.spires?.[el] ?? 0}</span>
              <span style={{ fontSize: 9, color: isOpen ? 'var(--good)' : 'var(--text-3)' }}>{isOpen ? t('mode.spireOpen') : dayName(el)}</span>
            </button>
          );
        })}
      </div>
      <Panel
        title={`${elementName(sel)} · ${t('mode.spireFloor', { n: Math.min(floor, cfg.modes.spireFloors) })}`}
        right={<span className={css.tiny}>{(s.modes.spires?.[sel] ?? 0)}/{cfg.modes.spireFloors}</span>}
      >
        <Bar value={s.modes.spires?.[sel] ?? 0} max={cfg.modes.spireFloors} height={8} color={color} />
        <div className={css.tiny} style={{ margin: '6px 0' }}>
          ≈ {stageText(stageForLevel(cfg, spireStage(floor)))} · {floor % 30 === 0 ? t('mode.spireColossus') : floor % 10 === 0 ? t('mode.spireGuard') : t('mode.spireElite')}
        </div>
        <div className={css.tiny}>{t('mode.spireTeam')}</div>
        <div className={css.row} style={{ gap: 4, margin: '4px 0 8px', minHeight: 52 }}>
          {party.length ? (
            party.map((id) => <HeroImg key={id} id={id} skin={s.heroines[id]?.skin} className="pixel" width={52} height={52} />)
          ) : (
            <span className={css.tiny}>{t('mode.spireEmpty')}</span>
          )}
        </div>
        <div className={css.row} style={{ gap: 10, flexWrap: 'wrap' }}>
          <RewardList r={{ cur: rw.emblems ? { ...rw.cur, emblems: rw.emblems } : rw.cur }} />
        </div>
        <Button
          block
          size="big"
          style={{ marginTop: 8 }}
          disabled={!open || !party.length || floor > cfg.modes.spireFloors}
          onClick={() =>
            void playMode('spire.fight', { element: sel }, `${elementName(sel)} · ${t('mode.spireFloor', { n: floor })}`, 1, (res) => ({
              result: res.win && res.reward ? <RewardList r={{ cur: res.reward.cur, items: res.reward.items, hearts: res.reward.hearts }} /> : undefined,
            }))
          }
        >
          {open ? t('common.fight') : t('mode.spireClosed', { day: dayName(sel) })}
        </Button>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('mode.spireRules')}
        </div>
      </Panel>
    </div>
  );
}

// ——— Нашествие ———

export function Horde() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const h = hordeState({ s, now });
  const usedToday = h.day === dayKey(now);
  const next = h.wave + 1;
  const bonus = hordeBonus(h);
  const rw = hordeWaveReward({ cfg, s }, next, bonus.rewardPct);
  const offer = h.active ? h.offer : undefined;
  const blessingCounts = (h.blessings ?? []).reduce<Record<string, number>>((m, id) => ((m[id] = (m[id] ?? 0) + 1), m), {});
  const act = ((next - 1) % 10) + 1;
  const fight = () =>
    void playMode('horde.fight', {}, t('mode.hordeWave', { n: next }), act, (res) => ({
      outcome: res.win ? t('mode.hordeCleared', { n: res.wave }) : t('mode.hordeFallen', { n: res.wave - 1 }),
      result: res.win && res.reward ? <RewardList r={{ cur: res.reward.cur, items: res.reward.items, hearts: res.reward.hearts }} /> : undefined,
    }));
  const bless = (i: number) => void useGame.getState().act('horde.bless', { index: i });
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.horde')} right={<span className={css.tiny}>{t('mode.hordeBest', { n: h.best, w: h.bestWeek })}</span>} />
      <Panel>
        <div className={css.row} style={{ gap: 10 }}>
          <Icon name="horde" size={48} />
          <div className={css.grow}>
            <b>{h.active ? t('mode.hordeWave', { n: next }) : usedToday ? t('mode.hordeDone', { n: h.wave }) : t('mode.hordeReady')}</b>
            <div className={css.tiny}>≈ {stageText(stageForLevel(cfg, hordeStage(farmLevel(cfg, s), next)))}</div>
          </div>
        </div>
        {h.active && (
          <div className={css.col} style={{ gap: 4, marginTop: 8 }}>
            {Object.entries(h.hp).map(([id, hp]) => (
              <div key={id} className={css.row} style={{ gap: 6 }}>
                <HeroImg id={id} skin={s.heroines[id]?.skin} still={hp <= 0} className="pixel" width={30} height={30} style={{ opacity: hp > 0 ? 1 : 0.35 }} />
                <div className={css.grow}>
                  <Bar value={hp * 100} max={100} height={8} color={hp > 0.5 ? '#4fbf5a' : hp > 0.2 ? '#e0a13a' : '#e03a3a'} />
                </div>
                <span className={css.tiny} style={{ width: 34, textAlign: 'right' }}>
                  {Math.round(hp * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
        {h.active && Object.keys(blessingCounts).length > 0 && (
          <div className={css.row} style={{ gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {Object.entries(blessingCounts).map(([id, n]) => (
              <span key={id} className={css.chip} title={tl(HORDE_BLESSING_MAP[id]?.desc)}>
                ✦ {tl(HORDE_BLESSING_MAP[id]?.name)}
                {n > 1 ? ` ×${n}` : ''}
              </span>
            ))}
          </div>
        )}
        <div className={css.tiny} style={{ margin: '8px 0 4px' }}>
          {t('mode.hordeNextReward')}
        </div>
        <div className={css.row} style={{ gap: 8, flexWrap: 'wrap' }}>
          <RewardList r={{ cur: rw.cur }} />
        </div>
        <div className={css.row} style={{ marginTop: 10 }}>
          {h.active ? (
            <>
              <Button block size="big" disabled={!!offer} onClick={fight}>
                {t('mode.hordeNext')}
              </Button>
              <Button kind="secondary" style={{ flex: 'none', whiteSpace: 'nowrap' }} onClick={() => void useGame.getState().act('horde.retreat')}>
                {t('mode.hordeRetreat')}
              </Button>
            </>
          ) : (
            <Button block size="big" disabled={usedToday} onClick={() => void useGame.getState().act('horde.start')}>
              {usedToday ? t('mode.hordeTomorrow') : t('mode.hordeStart')}
            </Button>
          )}
        </div>
      </Panel>
      {offer && (
        <Panel title={t('mode.hordeBlessTitle')}>
          <div className={css.tiny} style={{ marginBottom: 6 }}>
            {t('mode.hordeBlessDesc')}
          </div>
          <div className={css.col} style={{ gap: 6 }}>
            {offer.map((id, i) => {
              const b = HORDE_BLESSING_MAP[id];
              return (
                <button key={id + i} className={css.listItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => bless(i)}>
                  <b style={{ color: '#f2c86a' }}>✦ {tl(b.name)}</b>
                  <span className={css.tiny}>{tl(b.desc)}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
      <Panel>
        <div className={css.tiny}>{t('mode.hordeRules', { n: cfg.modes.hordeHealEvery })}</div>
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('mode.hordeBlessRule', { n: HORDE_BLESS_EVERY })}
        </div>
      </Panel>
    </div>
  );
}

/** Облик-награда за рубеж режима: получен или ещё впереди. */
function SkinGoal({ id, text }: { id: string; text: string }) {
  const owned = useGameState().skins.includes(id);
  const sk = SKIN_MAP[id];
  if (!sk) return null;
  return (
    <div className={css.row} style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
      <HeroImg id={sk.hero} skin={id} still={!owned} className="pixel" width={40} height={40} style={{ opacity: owned ? 1 : 0.75 }} />
      <div className={css.grow}>
        <b style={{ fontSize: 13 }}>{tl(sk.name)}</b>
        <div className={css.tiny}>{owned ? t('mode.skinOwned') : text}</div>
      </div>
    </div>
  );
}
