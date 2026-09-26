import {
  ACTS,
  DUNGEONS,
  EXPEDITION_MAP,
  HEROINE_MAP,
  LAB_BUFFS,
  LAB_FLOORS,
  LAB_STEPS,
  RELIC_MAP,
  abyssStage,
  activeParty,
  arenaLeague,
  dungeonOfDay,
  dungeonReward,
  dungeonStage,
  expeditionSlots,
  fxText,
  onExpedition,
  statText,
  towerMod,
  towerReward,
  towerStage,
  stageForLevel,
  weekKey,
  type StatKey,
} from '@idle/shared';
import { useEffect, useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { showBattle } from '../../components/BattleModal';
import { manualEnabled } from '../../battle/live';
import { Bar, Button, Cost, Icon, Panel, css, cx, fmtTime, formatNum } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { useNow } from '../BattleTab';
import { BackHeader, RewardList, showReward } from '../common';
import { stageText } from '../MapTab';
import { Shop } from '../hub/Shop';
import { Horde, Rift, Spires } from './Endgame';

export const MODES = [
  { id: 'expeditions', icon: 'expedition', title: 'mode.expeditions', desc: 'mode.expeditionsDesc', feature: 'expeditions' },
  { id: 'dungeons', icon: 'dungeon', title: 'mode.dungeons', desc: 'mode.dungeonsDesc', feature: 'dungeons' },
  { id: 'tower', icon: 'tower', title: 'mode.tower', desc: 'mode.towerDesc', feature: 'tower' },
  { id: 'labyrinth', icon: 'labyrinth', title: 'mode.labyrinth', desc: 'mode.labyrinthDesc', feature: 'labyrinth' },
  { id: 'arena', icon: 'arena', title: 'mode.arena', desc: 'mode.arenaDesc', feature: 'arena' },
  { id: 'horde', icon: 'horde', title: 'mode.horde', desc: 'mode.hordeDesc', feature: 'horde' },
  { id: 'rift', icon: 'rift', title: 'mode.rift', desc: 'mode.riftDesc', feature: 'rift' },
  { id: 'spires', icon: 'spire', title: 'mode.spires', desc: 'mode.spiresDesc', feature: 'spires' },
  { id: 'abyss', icon: 'abyss', title: 'mode.abyss', desc: 'mode.abyssDesc', feature: 'abyss' },
];

export function ModeScreen({ id }: { id: string }) {
  switch (id) {
    case 'tower':
      return <Tower />;
    case 'dungeons':
      return <Dungeons />;
    case 'abyss':
      return <Abyss />;
    case 'arena':
      return <Arena />;
    case 'expeditions':
      return <Expeditions />;
    case 'labyrinth':
      return <Labyrinth />;
    case 'rift':
      return <Rift />;
    case 'spires':
      return <Spires />;
    case 'horde':
      return <Horde />;
    case 'shopArena':
      return <Shop initial="arena" />;
    case 'shopLab':
      return <Shop initial="labyrinth" />;
    default:
      return <BackHeader title={id} />;
  }
}

async function fightAction(type: string, params: Record<string, unknown>, title: string, act: number, rewards?: (res: any) => React.ReactNode) {
  // ручные ульты: бой вживую, итог — после отправки действия
  if (manualEnabled())
    return new Promise<any>((resolve) =>
      showBattle({
        live: { type, params, render: (res) => ({ result: res.battle?.win && rewards ? rewards(res) : undefined }), onResult: resolve },
        act,
        title,
        onClose: () => resolve(null),
      }),
    );
  const r = await useGame.getState().act(type, params);
  if (!r.ok) return null;
  const b = r.result.battle;
  showBattle({ events: b.events, win: b.win, act, title, result: b.win && rewards ? rewards(r.result) : undefined });
  return r.result;
}

// ——— Башня ———
function Tower() {
  const s = useGameState();
  const cfg = useCfg();
  const floor = s.modes.tower + 1;
  const rw = towerReward(floor);
  const act = ((floor - 1) % 10) + 1;
  const mod = towerMod(floor);
  const done = floor > cfg.modes.towerFloors;
  const fight = (hard: boolean) =>
    void fightAction('tower.fight', { hard }, `${t('mode.towerFloor', { n: floor })}${hard ? ' · ' + t('mode.towerHard') : ''}`, act, (res) => (
      <RewardList r={{ cur: { crystals: res.reward.crystals, starDust: res.reward.starDust }, skin: res.reward.skin, items: res.reward.items, hearts: res.reward.hearts }} />
    ));
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.tower')} />
      <Panel title={t('mode.towerFloor', { n: floor })} right={<span className={css.tiny}>{s.modes.tower}/{cfg.modes.towerFloors}</span>}>
        <Bar value={s.modes.tower} max={cfg.modes.towerFloors} height={10} />
        <div className={css.row} style={{ margin: '10px 0', gap: 12, flexWrap: 'wrap' }}>
          <Icon name="tower" size={48} />
          <div className={css.grow}>
            <div className={css.tiny}>≈ {stageText(stageForLevel(cfg, towerStage(floor)))} · {tl(ACTS[act - 1].name)}</div>
            <div className={css.row} style={{ gap: 10 }}>
              <span className={css.cost}>
                <Icon name="crystals" size={18} />
                {rw.crystals}
              </span>
              <span className={css.cost}>
                <Icon name="starDust" size={18} />
                {rw.starDust}
              </span>
              {floor % 10 === 0 && <Icon name="skull" size={18} />}
            </div>
          </div>
        </div>
        <div className={css.listItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, marginBottom: 8 }}>
          <span className={css.tiny}>{t('mode.towerMod')}</span>
          {mod ? (
            <>
              <b style={{ color: mod.hero ? 'var(--good)' : mod.enemy ? '#f08a5a' : undefined }}>{tl(mod.name)}</b>
              <span className={css.tiny}>{tl(mod.desc)}</span>
            </>
          ) : (
            <b>{t('mode.towerGuardFloor')}</b>
          )}
        </div>
        <div className={css.row}>
          <Button block size="big" disabled={done} onClick={() => fight(false)}>
            {t('common.fight')}
          </Button>
          <Button kind="danger" block disabled={done} onClick={() => fight(true)}>
            {t('mode.towerHardBtn')}
          </Button>
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('mode.towerHardDesc')}
        </div>
      </Panel>
    </div>
  );
}

// ——— Подземелья ———
function Dungeons() {
  const s = useGameState();
  const cfg = useCfg();
  const [sel, setSel] = useState<Record<string, number>>({});
  const now = useGame.getState().now();
  const today = dungeonOfDay(now);
  // подземелье дня — первым в списке
  const list = [...DUNGEONS].sort((a, b) => (b.id === today ? 1 : 0) - (a.id === today ? 1 : 0));
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.dungeons')} />
      {DUNGEONS.some((d) => (s.modes.dungeons[d.id] ?? 0) > 0 && (s.day.keys[d.id] ?? 0) < cfg.modes.dungeonKeys) && (
        <Button
          block
          kind="secondary"
          onClick={async () => {
            const r = await useGame.getState().act('dungeon.sweepAll');
            if (r.ok) showReward(t('mode.dungeons'), { cur: r.result.cur, gems: r.result.gems });
          }}
        >
          {t('mode.sweepAll')}
        </Button>
      )}
      {list.map((d) => {
        const cleared = s.modes.dungeons[d.id] ?? 0;
        const level = sel[d.id] ?? Math.min(cfg.modes.dungeonLevels, cleared + 1);
        const used = s.day.keys[d.id] ?? 0;
        const left = cfg.modes.dungeonKeys - used;
        const r = dungeonReward({ cfg, s, now }, d.id, level);
        const icon = d.reward === 'gems' ? 'gem' : d.reward;
        const hot = d.id === today;
        return (
          <Panel key={d.id} title={tl(d.name)} right={<span className={css.tiny}>{t('mode.keys', { n: left, max: cfg.modes.dungeonKeys })}</span>}>
            {hot && (
              <div className={css.tiny} style={{ color: '#f2c86a', marginBottom: 6 }}>
                {t('mode.dungeonDay')}
              </div>
            )}
            <div className={css.row}>
              <Icon name={icon} size={40} />
              <div className={css.grow}>
                <div className={css.row} style={{ gap: 6 }}>
                  <button className={css.chip} onClick={() => setSel({ ...sel, [d.id]: Math.max(1, level - 1) })}>
                    −
                  </button>
                  <b>{t('mode.dungeonLevel', { n: level })}</b>
                  <button className={css.chip} onClick={() => setSel({ ...sel, [d.id]: Math.min(cleared + 1, cfg.modes.dungeonLevels, level + 1) })}>
                    +
                  </button>
                </div>
                <div className={css.tiny}>
                  ≈ {stageText(stageForLevel(cfg, dungeonStage(level)))} ·{' '}
                  {'cur' in r && r.cur
                    ? Object.entries(r.cur).map(([k, v]) => `${formatNum(v as number)} ${t(`cur.${k}`)}`)
                    : `${(r as { gems: { count: number; lvl: number } }).gems.count}× ${t('gear.gems')} ${(r as { gems: { count: number; lvl: number } }).gems.lvl}`}
                </div>
              </div>
            </div>
            <div className={css.row} style={{ marginTop: 8 }}>
              <Button
                block
                disabled={left <= 0}
                onClick={() =>
                  void fightAction('dungeon.fight', { id: d.id, level }, `${tl(d.name)} · ${level}`, level > 10 ? 9 : 6, (res) => <RewardList r={{ cur: res.reward?.cur, gems: res.reward?.gems }} />)
                }
              >
                {t('common.fight')}
              </Button>
              <Button
                kind="secondary"
                block
                disabled={left <= 0 || level > cleared}
                onClick={async () => {
                  const res = await useGame.getState().act('dungeon.sweep', { id: d.id, level, times: left });
                  if (res.ok) {
                    const cur: Record<string, number> = {};
                    const gems: Record<string, number> = {};
                    for (const x of res.result.rewards) {
                      for (const [k, v] of Object.entries(x.cur ?? {})) cur[k] = (cur[k] ?? 0) + (v as number);
                      for (const [k, v] of Object.entries(x.gems ?? {})) gems[k] = (gems[k] ?? 0) + (v as number);
                    }
                    showReward(t('mode.sweep'), { cur, gems: Object.keys(gems).length ? gems : undefined });
                  }
                }}
              >
                {t('mode.sweep')} ×{Math.max(0, left)}
              </Button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ——— Бездна ———
function Abyss() {
  const s = useGameState();
  const level = s.modes.abyss + 1;
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.abyss')} />
      <Panel title={t('mode.abyssLevel', { n: level })}>
        <div className={css.row} style={{ gap: 12 }}>
          <Icon name="abyss" size={56} />
          <div className={css.grow}>
            <div className={css.tiny}>{t('mode.powerLevel', { n: abyssStage(level) })}</div>
            <div className={css.row} style={{ gap: 10 }}>
              <Cost cur="divineMats" amount={1 + Math.floor(level / 5)} />
              <Cost cur="crystals" amount={level % 10 === 0 ? 100 : 10} />
            </div>
          </div>
        </div>
        <Button block size="big" style={{ marginTop: 10 }} onClick={() => void fightAction('abyss.fight', {}, t('mode.abyssLevel', { n: level }), 10, (res) => <RewardList r={{ cur: res.reward }} />)}>
          {t('common.fight')}
        </Button>
      </Panel>
    </div>
  );
}

// ——— Арена ———
function Arena() {
  const s = useGameState();
  const cfg = useCfg();
  const ar = s.modes.arena;
  const league = arenaLeague(ar.rating);
  const limit = cfg.modes.arenaFights + s.day.arenaBought;
  const opps = ar.refreshDay === s.day.key ? ar.opponents : [];
  useEffect(() => {
    if (!opps.length) void useGame.getState().act('arena.opponents', {}, { silent: true });
  }, [opps.length]);
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.arena')} right={<Button size="small" kind="secondary" onClick={() => useUi.getState().push({ id: 'shopArena' })}>{t('hub.shop')}</Button>} />
      <Panel title={t('mode.arenaLeague', { name: tl(league.name) })} right={<b className={css.gold}>{t('mode.arenaRating', { n: ar.rating })}</b>}>
        <div className={css.row} style={{ justifyContent: 'space-between' }}>
          <span className={css.tiny}>
            W {ar.wins} / L {ar.losses}
          </span>
          <span className={css.tiny}>{t('mode.arenaFights', { n: limit - s.day.arena, max: limit })}</span>
          <Cost cur="arenaTokens" amount={s.cur.arenaTokens} />
        </div>
        <div className={css.row} style={{ marginTop: 8 }}>
          <Button kind="secondary" size="small" onClick={() => void useGame.getState().act(opps.length ? 'arena.refresh' : 'arena.opponents')}>
            {t('mode.arenaRefresh')} {opps.length > 0 && <Cost cur="crystals" amount={10} size={14} />}
          </Button>
          <Button kind="secondary" size="small" disabled={s.day.arena < limit} onClick={() => void useGame.getState().act('arena.buy')}>
            {t('mode.arenaBuy')} <Cost cur="crystals" amount={cfg.modes.arenaBuyCost} size={14} />
          </Button>
        </div>
      </Panel>
      {opps.map((o, i) => (
        <Panel key={o.id}>
          <div className={css.row}>
            <div className={css.grow}>
              <b>{o.name}</b>
              <div className={css.tiny}>
                {t('mode.arenaRating', { n: o.rating })} · {t('common.power')} {formatNum(o.power)}
              </div>
              <div className={css.row} style={{ gap: 2, marginTop: 4 }}>
                {o.team.map((m) => (
                  <img key={m.id} className="pixel" src={heroUrl(m.id)} width={34} height={34} alt="" style={{ transform: 'scaleX(-1)' }} />
                ))}
              </div>
            </div>
            <Button
              disabled={s.day.arena >= limit}
              onClick={() =>
                void fightAction('arena.fight', { index: i }, o.name, 7, (res) => (
                  <div className={css.muted} style={{ textAlign: 'center' }}>
                    {res.delta > 0 ? '+' : ''}
                    {res.delta} → {res.rating}
                  </div>
                ))
              }
            >
              {t('common.fight')}
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}

// ——— Экспедиции ———
function Expeditions() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow();
  const board = s.modes.expeditionBoard.day === s.day.key ? s.modes.expeditionBoard.quests : null;
  const slots = expeditionSlots({ cfg, s });
  // доска заданий на новый день запрашивается один раз — не во время рендера
  const needBoard = !board;
  useEffect(() => {
    if (needBoard) void useGame.getState().act('expedition.board', {}, { silent: true });
  }, [needBoard, s.day.key]);

  return (
    <div className={css.col}>
      <BackHeader title={t('mode.expeditions')} right={<span className={css.tiny}>{t('mode.expSlots', { n: s.modes.expeditions.length, max: slots })}</span>} />
      {s.modes.expeditions.filter((e) => now >= e.end).length > 1 && (
        <Button
          block
          pulse
          onClick={async () => {
            const r = await useGame.getState().act('expedition.claimAll');
            if (r.ok) showReward(t('mode.expeditions'), { cur: r.result.cur, shards: r.result.shards });
          }}
        >
          {t('common.claimAll')} ({s.modes.expeditions.filter((e) => now >= e.end).length})
        </Button>
      )}
      {s.modes.expeditions.map((e) => {
        const q = EXPEDITION_MAP[e.quest];
        const left = e.end - now;
        return (
          <Panel key={e.id} title={tl(q.name)}>
            <div className={css.row}>
              {e.heroes.map((h) => (
                <img key={h} className="pixel" src={heroUrl(h)} width={36} height={36} alt="" />
              ))}
              <div className={css.grow}>
                <Bar value={now - e.start} max={e.end - e.start} text={left > 0 ? fmtTime(left) : t('mode.expReady')} height={14} />
              </div>
              <Button
                size="small"
                disabled={left > 0}
                onClick={async () => {
                  const r = await useGame.getState().act('expedition.claim', { id: e.id });
                  if (r.ok) showReward(tl(q.name), { cur: r.result.cur, shards: r.result.shards });
                }}
              >
                {t('common.claim')}
              </Button>
            </div>
          </Panel>
        );
      })}
      <div className={css.title} style={{ fontSize: 15 }}>
        {t('mode.expBoard')}
      </div>
      {(board ?? []).map((qid) => {
        const q = EXPEDITION_MAP[qid];
        return (
          <Panel key={qid} title={tl(q.name)} right={<span className={css.tiny}>{t('time.h', { n: q.hours })}</span>}>
            <div className={css.tiny}>
              {t('mode.expReq')}: {q.heroes}× · {t('mode.expMinStars', { n: q.minStars })}
              {q.cls && ` · ${t('nav.heroes')}: `}
              {q.cls && <Icon name={q.cls} size={14} />}
              {q.element && <Icon name={q.element} size={14} />}
            </div>
            <div className={css.row} style={{ gap: 8, flexWrap: 'wrap', margin: '6px 0' }}>
              {Object.entries(q.reward).map(([k, v]) => (
                <span key={k} className={css.cost}>
                  <Icon name={k === 'shards' ? 'star' : k} size={16} />
                  {k === 'gold' ? `${v}m` : v}
                </span>
              ))}
            </div>
            <Button size="small" disabled={s.modes.expeditions.length >= slots} onClick={() => pickExpeditionHeroes(qid)}>
              {t('mode.expSend')}
            </Button>
          </Panel>
        );
      })}
    </div>
  );
}

function pickExpeditionHeroes(qid: string) {
  const q = EXPEDITION_MAP[qid];
  useUi.getState().open((close) => <ExpeditionPicker qid={qid} need={q.heroes} onClose={close} />);
}

function ExpeditionPicker({ qid, need, onClose }: { qid: string; need: number; onClose: () => void }) {
  const s = useGameState();
  const [picked, setPicked] = useState<string[]>([]);
  const party = activeParty(s);
  const q = EXPEDITION_MAP[qid];
  const avail = Object.values(s.heroines).filter((h) => !party.includes(h.id) && !onExpedition({ s } as never, h.id) && h.stars >= q.minStars);
  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, maxHeight: '85%', overflowY: 'auto', paddingBottom: 'calc(14px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>{t('mode.expPick', { n: need })}</div>
      <div className={css.grid4}>
        {avail.map((h) => (
          <div
            key={h.id}
            onClick={() => setPicked((p) => (p.includes(h.id) ? p.filter((x) => x !== h.id) : p.length < need ? [...p, h.id] : p))}
            className={cx(css.hero)}
            style={picked.includes(h.id) ? { outline: '2px solid var(--accent-2)' } : undefined}
          >
            <img className={css.heroSprite} style={{ width: 56, height: 56 }} src={heroUrl(h.id, h.skin)} alt="" />
            <div className={css.heroName}>{tl(HEROINE_MAP[h.id].name)}</div>
            <div className={css.tiny}>{h.stars}★</div>
          </div>
        ))}
      </div>
      {avail.length === 0 && <div className={css.muted}>{t('err.requirements')}</div>}
      <div className={css.row} style={{ marginTop: 10 }}>
        <Button kind="secondary" block onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          block
          disabled={picked.length !== need}
          onClick={async () => {
            const r = await useGame.getState().act('expedition.start', { quest: qid, heroes: picked });
            if (r.ok) onClose();
          }}
        >
          {t('mode.expSend')}
        </Button>
      </div>
    </div>
  );
}

// ——— Лабиринт ———
function Labyrinth() {
  const s = useGameState();
  const now = useNow(5000);
  const run = s.modes.lab;
  const thisWeek = run && run.week === weekKey(now);
  const NODE_ICON: Record<string, string> = { fight: 'battle', elite: 'skull', shrine: 'light', relic: 'trophy', spring: 'water', treasure: 'chest', boss: 'skull' };

  if (!run || !thisWeek) {
    return (
      <div className={css.col}>
        <BackHeader title={t('mode.labyrinth')} right={<Button size="small" kind="secondary" onClick={() => useUi.getState().push({ id: 'shopLab' })}>{t('hub.shop')}</Button>} />
        <Panel>
          <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
            <Icon name="labyrinth" size={72} />
            <div className={css.muted}>{t('mode.labyrinthDesc')}</div>
            <Button size="big" onClick={() => void useGame.getState().act('lab.start')}>
              {t('mode.labStart')}
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const act = Math.min(10, Math.max(1, Math.ceil((s.progress.maxGlobal || 1) / 20)));
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.labyrinth')} />
      <Panel title={run.done ? (run.won ? t('mode.labWon') : t('mode.labLost')) : t('mode.labFloor', { f: run.floor + 1, max: LAB_FLOORS, s: run.node + 1, steps: LAB_STEPS })} right={<Cost cur="labCoins" amount={run.coins} />}>
        <div className={css.row} style={{ flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(run.hp).map(([id, hp]) => (
            <div key={id} style={{ width: 56, textAlign: 'center', opacity: hp > 0 ? 1 : 0.35 }}>
              <img className="pixel" src={heroUrl(id)} width={40} height={40} alt="" />
              <Bar value={hp} max={1} height={5} color="linear-gradient(180deg,#8ae07a,#2e7a34)" />
            </div>
          ))}
        </div>
        {run.done ? (
          <div className={css.muted} style={{ marginTop: 8 }}>
            {t('mode.labNext')}
          </div>
        ) : run.pending ? (
          <div className={css.list} style={{ marginTop: 8 }}>
            {run.pending.options.map((id, i) => {
              const relic = RELIC_MAP[id];
              const buff = LAB_BUFFS.find((b) => b.id === id);
              const desc = relic
                ? [...Object.entries(relic.stats ?? {}).map(([k, v]) => statText(k as StatKey, v as number, getLang())), ...(relic.fx ? [fxText(relic.fx, getLang())] : [])].join(', ')
                : Object.entries(buff?.stats ?? {})
                    .map(([k, v]) => statText(k as StatKey, v as number, getLang()))
                    .join(', ');
              return (
                <div key={id} className={css.listItem} style={{ cursor: 'pointer' }} onClick={() => void useGame.getState().act('lab.pick', { index: i })}>
                  <Icon name={relic ? 'trophy' : 'light'} size={28} />
                  <div className={css.grow}>
                    <b>{tl(relic?.name ?? buff?.name)}</b>
                    <div className={css.tiny}>{desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className={css.muted} style={{ margin: '8px 0 4px' }}>
              {t('mode.labChoose')}
            </div>
            <div className={css.grid3}>
              {run.choices.map((c, i) => (
                <button
                  key={i}
                  className={css.listItem}
                  style={{ flexDirection: 'column', cursor: 'pointer', color: 'inherit' }}
                  onClick={async () => {
                    if (c === 'fight' || c === 'elite' || c === 'boss') await fightAction('lab.choose', { index: i }, t(`mode.labNode.${c}`), act);
                    else await useGame.getState().act('lab.choose', { index: i });
                  }}
                >
                  <Icon name={NODE_ICON[c] ?? 'battle'} size={32} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{t(`mode.labNode.${c}`)}</span>
                </button>
              ))}
            </div>
            <Button kind="ghost" size="small" style={{ marginTop: 8 }} onClick={() => void useGame.getState().act('lab.abandon')}>
              {t('mode.labAbandon')}
            </Button>
          </>
        )}
      </Panel>
      {run.relics.length > 0 && (
        <Panel title={t('mode.labRelics')}>
          <div className={css.row} style={{ flexWrap: 'wrap', gap: 4 }}>
            {run.relics.map((r) => (
              <span key={r} className={css.chip}>
                <Icon name="trophy" size={14} />
                {tl(RELIC_MAP[r]?.name)}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
