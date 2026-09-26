import {
  ENEMY_MAP,
  FESTIVALS,
  FEST_BOSS_ATTEMPTS,
  FEST_CHAPTER,
  FEST_GOALS,
  FEST_MILESTONES,
  FEST_STAGES,
  FEST_TASK_MAP,
  FEST_TASK_REWARD,
  FEST_TICKETS,
  HEROINE_MAP,
  MECHANIC_TEXT,
  RIFT_TACTICS,
  SKIN_MAP,
  dayKey,
  festBoss,
  festBossReward,
  festBought,
  festClaimable,
  festDailyTasks,
  festFirstReward,
  festGoalValue,
  festRaidReward,
  festShopNow,
  festStageEnemies,
  festStageLevel,
  festStageMod,
  festTaskValue,
  festivalAt,
  festivalState,
  isUnlocked,
  scaleReward,
  stageForLevel,
  type FestMilestone,
  type FestivalDef,
  type FestivalState,
} from '@idle/shared';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { sceneUrl } from '../../art/scenes';
import { EnemyImg, HeroImg } from '../../components/HeroImg';
import { Amount, Bar, Button, Cost, Icon, Panel, Sheet, Tabs, css, cx, fmtTime, formatNum, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { useNow } from '../BattleTab';
import { BackHeader, Locked, RewardList, showReward } from '../common';
import { stageText } from '../MapTab';
import { playMode } from './Endgame';
import st from './Festival.module.css';

type Tab = 'path' | 'boss' | 'tasks' | 'rewards' | 'shop';

/** Последняя вкладка праздника — удобство игрока, хранится в браузере. */
function savedTab(): Tab {
  try {
    const v = localStorage.getItem('festTab');
    return (['path', 'boss', 'tasks', 'rewards', 'shop'] as Tab[]).includes(v as Tab) ? (v as Tab) : 'path';
  } catch {
    return 'path';
  }
}

function themeVars(def: FestivalDef): CSSProperties {
  return { ['--fa' as string]: def.colors.accent, ['--fg' as string]: def.colors.glow, ['--fb0' as string]: def.colors.bg[0], ['--fb1' as string]: def.colors.bg[1] };
}

export function Festival() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow(1000);
  const [tab, setTabRaw] = useState<Tab>(savedTab);
  const setTab = (v: Tab) => {
    setTabRaw(v);
    try {
      localStorage.setItem('festTab', v);
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  };
  const { def } = festivalAt(now);
  const unlocked = isUnlocked({ s, cfg }, 'events');
  const f = festivalState({ s, cfg, now });
  const today = dayKey(now);
  const tasks = festDailyTasks(today, f.cycle);
  const taskReady = tasks.some((id) => !f.tasks.includes(id) && festTaskValue(s, id) >= FEST_TASK_MAP[id].target) || FEST_GOALS.some((g) => !f.goals.includes(g.id) && festGoalValue(s, f, g.metric) >= g.target);
  const rewardReady = FEST_MILESTONES.some((m, i) => f.points >= m.at && !f.claimed.includes(i));

  return (
    <div className={css.col} style={themeVars(def)}>
      <BackHeader title={t('mode.festival')} right={<Amount cur="eventTokens" amount={s.cur.eventTokens} />} />
      <FestHeader def={def} f={f} now={now} />
      {!unlocked ? (
        <Locked text={t('fest.locked', { lvl: (cfg.unlocks.level as Record<string, number>).events })} />
      ) : (
        <>
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { id: 'path', label: t('fest.tabPath') },
              { id: 'boss', label: t('fest.tabBoss'), badge: f.boss.used < FEST_BOSS_ATTEMPTS },
              { id: 'tasks', label: t('fest.tabTasks'), badge: taskReady },
              { id: 'rewards', label: t('fest.tabRewards'), badge: rewardReady },
              { id: 'shop', label: t('fest.tabShop') },
            ]}
          />
          {tab === 'path' && <PathTab def={def} f={f} />}
          {tab === 'boss' && <BossTab def={def} f={f} now={now} />}
          {tab === 'tasks' && <TasksTab f={f} tasks={tasks} />}
          {tab === 'rewards' && <RewardsTab def={def} f={f} />}
          {tab === 'shop' && <ShopTab now={now} />}
        </>
      )}
    </div>
  );
}

/** Частицы баннера: лунная пыль, пузырьки или лепестки. */
function Particles({ kind, n = 14 }: { kind: FestivalDef['particle']; n?: number }) {
  return (
    <div className={st.particles} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={cx(st.particle, st[kind])}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${7 + ((i * 13) % 6)}s` }}
        />
      ))}
    </div>
  );
}

function FestHeader({ def, f, now }: { def: FestivalDef; f: FestivalState; now: number }) {
  const { end, cycle } = festivalAt(now);
  const next = FESTIVALS[(((cycle + 1) % FESTIVALS.length) + FESTIVALS.length) % FESTIVALS.length];
  const nextM = FEST_MILESTONES.find((m) => m.at > f.points);
  const prevAt = [...FEST_MILESTONES].reverse().find((m) => m.at <= f.points)?.at ?? 0;
  const hero = HEROINE_MAP[def.hero];
  const lore = () =>
    openSheet(tl(def.name), () => (
      <div className={css.col} style={themeVars(def)}>
        <div className={st.loreHero}>
          <HeroImg id={def.hero} className="pixel" width={140} height={140} />
          <div>
            <div className={css.tiny}>{t('fest.youGet')}</div>
            <div className={st.loreName}>{tl(hero.name)}</div>
            <div className={css.tiny}>{tl(hero.title)} · UR</div>
            <div className={css.tiny} style={{ marginTop: 6, fontStyle: 'italic' }}>
              «{tl(hero.quote)}»
            </div>
          </div>
        </div>
        <div className={css.tiny} style={{ lineHeight: 1.45 }}>
          {tl(def.lore)}
        </div>
        <div className={css.tiny}>{t('fest.heroOnly', { name: tl(def.name) })}</div>
      </div>
    ));
  return (
    <div className={st.header} style={{ backgroundImage: `url(${sceneUrl(def.id)})` }} onClick={lore}>
      <div className={st.headerShade} />
      <Particles kind={def.particle} />
      <HeroImg id={def.hero} className={cx('pixel', st.headerHero)} />
      <div className={st.headerText}>
        <div className={st.kicker}>{t('mode.festival')}</div>
        <div className={st.festName}>{tl(def.name)}</div>
        <div className={st.tagline}>{tl(def.tagline)}</div>
        <div className={st.timer}>
          <Icon name="speed" size={14} /> {t('fest.ends', { t: fmtTime(end - now) })}
        </div>
        <div className={st.nextFest}>{t('fest.next', { name: tl(next.name) })}</div>
      </div>
      <div className={st.pointsBox}>
        <div className={st.pointsLine}>
          <span>{t('fest.points')}</span>
          <b>{formatNum(f.points)}</b>
        </div>
        <Bar value={f.points - prevAt} max={(nextM?.at ?? prevAt) - prevAt || 1} height={8} color="var(--fa)" />
      </div>
    </div>
  );
}

// ——— путь ———

function stageKind(stage: number): 'trial' | 'guardian' | 'elite' | 'normal' {
  if (stage === FEST_STAGES) return 'trial';
  if (stage % FEST_CHAPTER === 0) return 'guardian';
  if (stage % 3 === 0) return 'elite';
  return 'normal';
}

function StarsRow({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className={st.stars} style={{ fontSize: size }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? st.starOn : st.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}

function PathTab({ def, f }: { def: FestivalDef; f: FestivalState }) {
  const total = f.stars.reduce((a, b) => a + b, 0);
  const info = () =>
    openSheet(t('fest.tabPath'), () => (
      <div className={css.col}>
        <div className={css.tiny}>{t('fest.ticketsHint')}</div>
        <div className={css.tiny}>{t('fest.starsRule')}</div>
      </div>
    ));
  return (
    <div className={css.col}>
      <div className={st.pathBar}>
        <span className={st.ticket}>
          <Icon name="pass" size={18} /> {t('fest.tickets', { n: f.tickets, max: FEST_TICKETS })}
        </span>
        <span className={st.starTotal}>
          <span className={st.starOn}>★</span> {total}/{FEST_STAGES * 3}
        </span>
        <button className={st.infoBtn} onClick={info} aria-label="info">
          <Icon name="info" size={18} />
        </button>
      </div>
      {def.chapters.map((name, c) => (
        <Panel key={c} title={t('fest.chapter', { n: c + 1, name: tl(name) })} className={st.chapter}>
          <div className={st.nodes}>
            {Array.from({ length: FEST_CHAPTER }, (_, i) => {
              const stage = c * FEST_CHAPTER + i + 1;
              const open = stage === 1 || f.stars[stage - 2] > 0;
              const stars = f.stars[stage - 1];
              const kind = stageKind(stage);
              const next = open && stars === 0;
              return (
                <button
                  key={stage}
                  className={cx(st.node, st[kind], !open && st.nodeLocked, stars > 0 && st.nodeDone, next && st.nodeNext)}
                  onClick={() => openStage(def, f, stage)}
                >
                  {kind === 'trial' ? (
                    <HeroImg id={def.hero} still={!open} className={cx('pixel', st.nodeHero)} />
                  ) : kind === 'guardian' ? (
                    <Icon name="skull" size={22} />
                  ) : (
                    <span className={st.nodeNum}>{stage}</span>
                  )}
                  {open ? <StarsRow n={stars} size={10} /> : <Icon name="lock" size={12} />}
                </button>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function openStage(def: FestivalDef, f: FestivalState, stage: number) {
  const cfg = useGame.getState().cfg!;
  const open = stage === 1 || f.stars[stage - 2] > 0;
  if (!open) return useUi.getState().toast(t('fest.lockedStage'), 'info');
  const stars = f.stars[stage - 1];
  const cleared = stars > 0;
  const kind = stageKind(stage);
  const mod = festStageMod(FESTIVALS.indexOf(def), stage);
  const units = festStageEnemies(cfg, def, f.lvl, stage);
  const lvl = festStageLevel(f.lvl, stage);
  const first = festFirstReward(stage);
  const raid = festRaidReward(stage);
  const chapter = Math.ceil(stage / FEST_CHAPTER) - 1;
  const act = def.acts[chapter];
  const boss = units.find((u) => u.kind === 'boss');
  const title =
    kind === 'trial' ? `${t('fest.trial')}: ${tl(HEROINE_MAP[def.hero].name)}` : kind === 'guardian' ? `${t('fest.stage', { n: stage })} · ${t('fest.guardian')}` : t('fest.stage', { n: stage });
  const fight = (close: () => void) => {
    close();
    void playMode('fest.stage', { stage }, title, act, (res) => ({
      outcome: res.win ? (
        <span className={st.outcomeStars}>
          <StarsRow n={res.stars} size={26} />
        </span>
      ) : undefined,
      result: res.reward ? (
        <div className={css.col}>
          <RewardList r={{ cur: res.reward.cur, shards: res.reward.shards }} />
          <div className={st.pointsGain}>{t('fest.pointsGain', { n: res.reward.points })}</div>
        </div>
      ) : undefined,
    }));
  };
  openSheet(title, (close) => (
    <div className={css.col} style={themeVars(def)}>
      {boss && ENEMY_MAP[boss.ref]?.mechanic && (
        <div className={css.tiny}>
          <Icon name="skull" size={12} /> {tl(MECHANIC_TEXT[ENEMY_MAP[boss.ref].mechanic!])}
        </div>
      )}
      <div className={st.enemyRow}>
        {units.map((u, i) => (
          <div key={i} className={cx(st.enemy, u.kind !== 'enemy' && st.enemyBig)}>
            <EnemyImg id={u.ref} className="pixel" />
          </div>
        ))}
      </div>
      <div className={css.tiny}>{t('fest.power', { stage: stageText(stageForLevel(cfg, lvl)) })}</div>
      <div className={cx(css.inset, st.modBox)}>
        <b>{mod ? tl(mod.name) : kind === 'trial' ? t('fest.trial') : kind === 'guardian' ? t('fest.guardian') : t('fest.noMod')}</b>
        {mod && <div className={css.tiny}>{tl(mod.desc)}</div>}
      </div>
      <div className={css.row} style={{ justifyContent: 'space-between' }}>
        <StarsRow n={stars} size={18} />
        <span className={css.tiny}>{t('fest.starsRule')}</span>
      </div>
      <div className={css.inset}>
        <div className={css.tiny}>{cleared ? t('fest.raidReward') : t('fest.first')}</div>
        <div className={css.row} style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <Cost cur="eventTokens" amount={cleared ? raid.tokens : first.tokens} />
          <span className={st.pointsChip}>+{cleared ? raid.points : first.points}</span>
          {!cleared && first.shards > 0 && (
            <span className={css.row} style={{ gap: 4 }}>
              <HeroImg id={def.hero} className="pixel" width={22} height={22} />+{first.shards}
            </span>
          )}
        </div>
      </div>
      <div className={css.row}>
        <Button block size="big" disabled={cleared && f.tickets <= 0} onClick={() => fight(close)}>
          {cleared ? t('fest.raid') : t('fest.fight')}
        </Button>
        {stars >= 3 && f.tickets > 0 && (
          <Button
            kind="secondary"
            style={{ flex: 'none', whiteSpace: 'nowrap' }}
            onClick={async () => {
              close();
              const r = await useGame.getState().act('fest.sweep', { stage, times: f.tickets });
              if (r.ok) showReward(t('fest.sweep', { n: r.result.times }), { cur: r.result.cur }, <div className={st.pointsGain}>{t('fest.pointsGain', { n: r.result.points })}</div>);
            }}
          >
            {t('fest.sweep', { n: f.tickets })}
          </Button>
        )}
      </div>
    </div>
  ));
}

// ——— босс ———

function savedTactic(): string {
  try {
    return localStorage.getItem('riftTactic') ?? 'none';
  } catch {
    return 'none';
  }
}

function BossTab({ def, f, now }: { def: FestivalDef; f: FestivalState; now: number }) {
  const s = useGameState();
  const cfg = useCfg();
  const [tactic, setTactic] = useState(savedTactic);
  const tac = RIFT_TACTICS.find((x) => x.id === tactic) ?? RIFT_TACTICS[0];
  const boss = festBoss({ s, cfg, now }, f);
  const edef = ENEMY_MAP[boss.id];
  const left = FEST_BOSS_ATTEMPTS - f.boss.used;
  const chest = festBossReward(1, true);
  return (
    <div className={css.col}>
      <Panel>
        <div className={st.bossStage} style={{ backgroundImage: `url(${sceneUrl(def.id)})` }}>
          <div className={st.bossShade} />
          <EnemyImg id={boss.id} className={cx('pixel', st.bossImg)} />
          <div className={st.bossName}>
            <b>{tl(edef.name)}</b>
            <span className={css.tiny}>{tl(edef.title ?? edef.name)}</span>
          </div>
          <div className={st.bossLvl}>{t('fest.bossLvl', { n: f.boss.lvl })}</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <Bar value={boss.left} max={boss.hp} height={14} color="var(--fg)" text={t('fest.bossHp', { left: formatNum(boss.left), hp: formatNum(boss.hp) })} />
        </div>
        {edef.mechanic && (
          <div className={css.tiny} style={{ marginTop: 6 }}>
            <Icon name="skull" size={12} /> {tl(MECHANIC_TEXT[edef.mechanic])}
          </div>
        )}
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('fest.bossRules')}
        </div>
        <div className={css.tiny} style={{ marginTop: 8 }}>
          {t('mode.riftTactic')}
        </div>
        <div className={st.tactics}>
          {RIFT_TACTICS.map((x) => (
            <button
              key={x.id}
              className={cx(css.chip, tactic === x.id && css.chipOn)}
              onClick={() => {
                setTactic(x.id);
                try {
                  localStorage.setItem('riftTactic', x.id);
                } catch {
                  /* не запоминаем */
                }
              }}
            >
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
              void playMode('fest.boss', { tactic: tac.id }, tl(edef.name), edef.act, (res) => ({
                outcome: (
                  <span style={{ color: def.colors.accent }}>
                    {res.killed ? t('fest.bossKilled', { n: res.lvl + 1 }) : t('fest.bossResult', { dmg: formatNum(res.dmg), pct: ((100 * res.dmg) / res.hp).toFixed(1) })}
                  </span>
                ),
                result: (
                  <div className={css.col}>
                    <RewardList r={{ cur: res.reward.cur, shards: res.reward.shards, items: res.reward.items, hearts: res.reward.hearts }} />
                    <div className={st.pointsGain}>{t('fest.pointsGain', { n: res.reward.points })}</div>
                  </div>
                ),
              }))
            }
          >
            {t('fest.bossFight')} · {t('fest.bossAttempts', { n: left, max: FEST_BOSS_ATTEMPTS })}
          </Button>
        </div>
      </Panel>
      <Panel>
        <div className={css.row} style={{ gap: 8, alignItems: 'center' }}>
          <Icon name="chest" size={40} />
          <div className={css.grow}>
            <div className={css.tiny}>{t('fest.bossChest', { shards: chest.shards, crystals: chest.crystals, tokens: chest.tokens })}</div>
            <div className={css.tiny} style={{ marginTop: 4 }}>
              {t('fest.bossKills', { n: f.boss.kills, best: formatNum(f.boss.best) })}
            </div>
          </div>
          <HeroImg id={def.hero} className="pixel" width={48} height={48} />
        </div>
      </Panel>
    </div>
  );
}

// ——— задания и цели ———

function TasksTab({ f, tasks }: { f: FestivalState; tasks: string[] }) {
  const s = useGameState();
  const claim = async (type: string, id: string) => {
    const r = await useGame.getState().act(type, { id });
    if (r.ok) showReward(t('fest.claim'), { cur: r.result.cur }, <div className={st.pointsGain}>{t('fest.pointsGain', { n: r.result.points })}</div>);
  };
  const goals = [...FEST_GOALS].sort((a, b) => {
    const rank = (g: (typeof FEST_GOALS)[number]) => (f.goals.includes(g.id) ? 2 : festGoalValue(s, f, g.metric) >= g.target ? 0 : 1);
    return rank(a) - rank(b);
  });
  return (
    <div className={css.col}>
      <Panel title={t('fest.daily')} right={<span className={css.tiny}>{t('fest.dailyHint', { tokens: FEST_TASK_REWARD.tokens, points: FEST_TASK_REWARD.points })}</span>}>
        <div className={css.list}>
          {tasks.map((id, i) => {
            const def = FEST_TASK_MAP[id];
            const v = Math.min(def.target, festTaskValue(s, id));
            const done = f.tasks.includes(id);
            return (
              <div key={id} className={cx(css.listItem, i === 0 && st.festTask)}>
                <div className={css.grow}>
                  <div className={st.taskName}>{tl(def.name)}</div>
                  <Bar value={v} max={def.target} height={10} text={`${v}/${def.target}`} color={i === 0 ? 'var(--fa)' : undefined} />
                </div>
                {done ? <Icon name="check" size={24} /> : <Button size="small" disabled={v < def.target} onClick={() => void claim('fest.task', id)}>{t('fest.claim')}</Button>}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title={t('fest.goals')}>
        <div className={css.list}>
          {goals.map((g) => {
            const v = Math.min(g.target, festGoalValue(s, f, g.metric));
            const done = f.goals.includes(g.id);
            return (
              <div key={g.id} className={css.listItem} style={{ opacity: done ? 0.55 : 1 }}>
                <div className={css.grow}>
                  <div className={st.taskName}>{tl(g.name)}</div>
                  <Bar value={v} max={g.target} height={10} text={`${v}/${g.target}`} />
                  <div className={css.row} style={{ gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <span className={st.pointsChip}>+{g.points}</span>
                    {Object.entries(g.cur).map(([k, n]) => (
                      <Cost key={k} cur={k} amount={n ?? 0} size={14} />
                    ))}
                  </div>
                </div>
                {done ? <Icon name="check" size={24} /> : <Button size="small" disabled={v < g.target} onClick={() => void claim('fest.goal', g.id)}>{t('fest.claim')}</Button>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ——— шкала наград ———

function MilestoneReward({ m, def }: { m: FestMilestone; def: FestivalDef }) {
  const parts: ReactNode[] = [];
  if (m.skin) parts.push(<b key="skin">{t('fest.skinFinal', { name: tl(SKIN_MAP[def.finalSkin].name) })}</b>);
  if (m.shards)
    parts.push(
      <span key="sh" className={css.row} style={{ gap: 4 }}>
        <HeroImg id={def.hero} className="pixel" width={22} height={22} />
        {t('fest.shardsN', { n: m.shards })}
      </span>,
    );
  if (m.item)
    parts.push(
      <span key="it" className={css.row} style={{ gap: 4 }}>
        <Icon name="chest" size={18} />
        {t(`fest.item.${m.item}`)}
      </span>,
    );
  if (m.heart)
    parts.push(
      <span key="h" className={css.row} style={{ gap: 4 }}>
        <Icon name="hearts" size={18} />
        {t('fest.heart')}
      </span>,
    );
  if (m.cur) {
    // золото в наградах — «минуты дохода»: показываем уже пересчитанным
    const g = useGame.getState();
    const cur = g.state && g.cfg ? scaleReward(g.cfg, g.state, m.cur) : m.cur;
    for (const [k, n] of Object.entries(cur)) parts.push(<Cost key={k} cur={k} amount={n ?? 0} size={16} />);
  }
  return <div className={st.msReward}>{parts}</div>;
}

function RewardsTab({ def, f }: { def: FestivalDef; f: FestivalState }) {
  const ready = FEST_MILESTONES.map((m, i) => (f.points >= m.at && !f.claimed.includes(i) ? i : -1)).filter((i) => i >= 0);
  const claim = async (index: number | 'all') => {
    const r = await useGame.getState().act('fest.claim', { index });
    if (r.ok) showReward(t('fest.tabRewards'), { cur: r.result.cur, shards: r.result.shards, items: r.result.items, skins: r.result.skins, hearts: r.result.hearts });
  };
  const last = FEST_MILESTONES[FEST_MILESTONES.length - 1];
  return (
    <div className={css.col}>
      <Panel className={st.finalPanel}>
        <div className={css.row} style={{ gap: 10, alignItems: 'center' }}>
          <HeroImg id={def.hero} skin={def.finalSkin} className={cx('pixel', st.finalHero)} />
          <div className={css.grow}>
            <div className={css.tiny}>{t('fest.final')}</div>
            <div className={st.finalName}>{tl(SKIN_MAP[def.finalSkin].name)}</div>
            <div className={css.tiny}>
              {formatNum(f.points)} / {formatNum(last.at)}
            </div>
            <Bar value={f.points} max={last.at} height={8} color="var(--fa)" />
          </div>
        </div>
        {ready.length > 0 && (
          <Button block pulse style={{ marginTop: 8 }} onClick={() => void claim('all')}>
            {t('fest.claimAll', { n: ready.length })}
          </Button>
        )}
      </Panel>
      <div className={st.track}>
        {FEST_MILESTONES.map((m, i) => {
          const got = f.claimed.includes(i);
          const can = f.points >= m.at && !got;
          return (
            <div key={i} className={cx(st.ms, got && st.msGot, can && st.msCan, m.skin && st.msFinal)}>
              <div className={st.msAt}>{formatNum(m.at)}</div>
              <MilestoneReward m={m} def={def} />
              {got ? <Icon name="check" size={20} /> : can ? <Button size="small" onClick={() => void claim(i)}>{t('fest.claim')}</Button> : <Icon name="lock" size={16} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ——— лавка ———

function ShopTab({ now }: { now: number }) {
  const s = useGameState();
  const cfg = useCfg();
  const { def, cycle, offers } = festShopNow(now);
  const hero = HEROINE_MAP[def.hero];
  const owned = !!s.heroines[def.hero];
  const shards = s.shards[def.hero] ?? 0;
  const need = cfg.hero.recruitShards[hero.rarity];
  const buy = async (id: string) => {
    const r = await useGame.getState().act('fest.buy', { offer: id });
    if (r.ok) showReward(t('fest.tabShop'), { cur: r.result.cur, shards: r.result.shards, skin: r.result.skin, items: r.result.item ? [r.result.item] : undefined, hearts: r.result.hearts });
  };
  return (
    <div className={css.col}>
      <Panel>
        <div className={css.row} style={{ gap: 10, alignItems: 'center' }}>
          <HeroImg id={def.hero} still={!owned} className="pixel" width={72} height={72} />
          <div className={css.grow}>
            <b>{tl(hero.name)}</b>
            <div className={css.tiny}>{tl(hero.title)} · UR</div>
            {owned ? (
              <div className={css.tiny}>{t('fest.inParty')}</div>
            ) : (
              <>
                <Bar value={shards} max={need} height={10} text={t('fest.shards', { name: tl(hero.name), n: shards, need })} color="var(--fa)" />
              </>
            )}
          </div>
          {!owned && (
            <Button
              size="small"
              disabled={shards < need}
              pulse={shards >= need}
              onClick={async () => {
                const r = await useGame.getState().act('hero.recruit', { id: def.hero });
                if (r.ok) showReward(tl(hero.name), { heroes: [def.hero] });
              }}
            >
              {t('fest.recruit')}
            </Button>
          )}
        </div>
      </Panel>
      <div className={css.list}>
        {offers.map((o) => {
          const bought = festBought(s, o.id, o.give.skin, cycle);
          const left = o.limit - bought;
          const ownedSkin = !!o.give.skin && s.skins.includes(o.give.skin);
          const off = left <= 0 || ownedSkin;
          return (
            <div key={o.id} className={css.listItem} style={{ opacity: off ? 0.5 : 1 }}>
              {o.give.skin ? (
                <HeroImg id={SKIN_MAP[o.give.skin].hero} skin={o.give.skin} className="pixel" width={44} height={44} />
              ) : o.give.shards ? (
                <HeroImg id={def.hero} className="pixel" width={44} height={44} />
              ) : (
                <Icon name={o.give.heart ? 'hearts' : o.give.item ? 'chest' : Object.keys(o.give.cur ?? {})[0] ?? 'gift'} size={36} />
              )}
              <div className={css.grow}>
                <div className={st.taskName}>{tl(o.name)}</div>
                <div className={css.tiny}>{t('fest.left', { n: Math.max(0, left) })}</div>
              </div>
              <Button size="small" disabled={off || s.cur.eventTokens < o.cost} onClick={() => void buy(o.id)}>
                <Cost cur="eventTokens" amount={o.cost} size={14} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Баннер праздника в лагере: сцена, героиня, таймер и значок наград. */
export function FestivalBanner({ onOpen }: { onOpen: () => void }) {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow(30000);
  const { def, end } = festivalAt(now);
  const unlocked = isUnlocked({ s, cfg }, 'events');
  const n = unlocked ? festClaimable({ s, cfg, now }) : 0;
  return (
    <button className={st.banner} style={{ ...themeVars(def), backgroundImage: `url(${sceneUrl(def.id)})` }} onClick={onOpen}>
      <div className={st.bannerShade} />
      <Particles kind={def.particle} n={10} />
      <div className={st.bannerText}>
        <div className={st.kicker}>{t('mode.festival')}</div>
        <div className={st.bannerName}>{tl(def.name)}</div>
        <div className={st.timer}>
          {unlocked ? (
            <>
              <Icon name="speed" size={12} /> {t('fest.ends', { t: fmtTime(end - now) })}
            </>
          ) : (
            <>
              <Icon name="lock" size={12} /> {t('common.unlocksLvl', { lvl: (cfg.unlocks.level as Record<string, number>).events })}
            </>
          )}
        </div>
      </div>
      <HeroImg id={def.hero} className={cx('pixel', st.bannerHero)} />
      {n > 0 && <span className={st.bannerBadge}>{n}</span>}
    </button>
  );
}

/** Анонс праздника при входе — один раз на праздник (запоминается в браузере). */
export function announceFestival() {
  const g = useGame.getState();
  const s = g.state;
  const cfg = g.cfg;
  if (!s || !cfg || !isUnlocked({ s, cfg }, 'events')) return;
  const now = g.now();
  const { def, cycle, end } = festivalAt(now);
  try {
    if (localStorage.getItem('festSeen') === String(cycle)) return;
    localStorage.setItem('festSeen', String(cycle));
  } catch {
    return;
  }
  const hero = HEROINE_MAP[def.hero];
  useUi.getState().open((close) => (
    <Sheet title={t('fest.announce')} onClose={close}>
      <div className={css.col} style={themeVars(def)}>
        <div className={st.announce} style={{ backgroundImage: `url(${sceneUrl(def.id)})` }}>
          <div className={st.bossShade} />
          <Particles kind={def.particle} />
          <HeroImg id={def.hero} className={cx('pixel', st.announceHero)} />
          <div className={st.announceName}>{tl(def.name)}</div>
        </div>
        <div className={css.tiny} style={{ lineHeight: 1.45 }}>
          {tl(def.lore)}
        </div>
        <div className={css.row} style={{ gap: 8, alignItems: 'center' }}>
          <span className={st.urTag}>UR</span>
          <b>{tl(hero.name)}</b>
          <span className={css.tiny}>— {tl(hero.title)}</span>
        </div>
        <div className={css.tiny}>{t('fest.announceText', { t: fmtTime(end - now) })}</div>
        <Button
          block
          size="big"
          onClick={() => {
            close();
            const ui = useUi.getState();
            ui.setTab('hub');
            ui.push({ id: 'festival' });
          }}
        >
          {t('fest.announceGo')}
        </Button>
      </div>
    </Sheet>
  ));
}
