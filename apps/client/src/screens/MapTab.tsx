import {
  ACTS,
  CIRCLE_NAMES,
  DUNGEONS,
  ENEMY_MAP,
  MECHANIC_TEXT,
  STAGES_PER_ACT,
  STAGES_PER_CIRCLE,
  STAGE_COUNT,
  dungeonKeysLeft,
  dungeonOfDay,
  festivalNow,
  guardianUnits,
  isUnlocked,
  raidState,
  stageLabel,
  stageRef,
  towerMod,
  waveUnits,
  type StageRef,
} from '@idle/shared';
import { useState } from 'react';
import { enemyUrl } from '../art/runtime';
import { drawLayer, drawSky } from '../battle/backdrop';
import { Icon, Panel, Sheet, css, cx } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { BackHeader } from './common';
import st from './modes/Adventures.module.css';
import { ModeScreen } from './modes/Modes';

export default function MapTab() {
  const stack = useUi((u) => u.stacks.map);
  const top = stack[stack.length - 1];
  if (top?.id === 'campaign') return <CampaignMap />;
  if (top) return <ModeScreen id={top.id} />;
  return <MapRoot />;
}

const bgCache = new Map<number, string>();
export function actBackground(act: number): string {
  let u = bgCache.get(act);
  if (u) return u;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 90;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(drawSky(act), 0, 0);
  ctx.drawImage(drawLayer(act, 'far'), 0, 0);
  ctx.drawImage(drawLayer(act, 'mid'), 0, 0);
  ctx.drawImage(drawLayer(act, 'near'), 0, 0);
  u = c.toDataURL();
  bgCache.set(act, u);
  return u;
}

interface ModeTile {
  id: string;
  icon: string;
  color: string;
  feature: string;
  sub: string;
  dot?: boolean;
  hidden?: boolean;
}

function MapRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const next = stageRef(Math.min(STAGE_COUNT, s.progress.stage + 1));
  const act = ACTS[next.act - 1];
  const boss = ENEMY_MAP[act.boss];
  const open = (id: string) => {
    haptic.tap();
    useUi.getState().push({ id });
  };
  const keys = DUNGEONS.reduce((n, d) => n + dungeonKeysLeft({ cfg, s }, d.id), 0);
  const raid = raidState({ s, now });
  const fest = festivalNow({ cfg, now });
  const floor = s.modes.tower + 1;
  const mod = towerMod(floor);
  const tiles: ModeTile[] = [
    { id: 'tower', icon: 'tower', color: '#a58bff', feature: 'tower', sub: `${t('adv.floor', { n: floor })}${mod ? ` · ${tl(mod.name)}` : ` · ${t('adv.towerBoss')}`}` },
    { id: 'dungeons', icon: 'dungeon', color: '#ffc14d', feature: 'dungeons', sub: `${t('adv.keys', { n: keys, max: cfg.modes.dungeonKeys * DUNGEONS.length })} · ${tl(DUNGEONS.find((d) => d.id === dungeonOfDay(now))!.name)} ×1,5`, dot: keys > 0 },
    { id: 'raid', icon: 'rift', color: '#ff5a7a', feature: 'raid', sub: t('adv.attempts', { n: cfg.modes.raidAttempts - raid.used, max: cfg.modes.raidAttempts }), dot: raid.used < cfg.modes.raidAttempts },
    { id: 'sortie', icon: 'battle', color: '#6ab8ff', feature: 'sortie', sub: t('mode.sortieDesc') },
    { id: 'fishing', icon: 'fish', color: '#4fe0a6', feature: 'fishing', sub: t('mode.fishingDesc') },
    { id: 'festival', icon: 'festival', color: '#ff7eb6', feature: 'festival', sub: fest ? tl(fest.def.name) : t('adv.festOff'), hidden: !fest },
  ];

  return (
    <div className={css.col}>
      <div className={st.campaign} style={{ backgroundImage: `url(${actBackground(next.act)})` }} onClick={() => open('campaign')}>
        <img className={cx('pixel', st.bossPeek)} src={enemyUrl(boss.id)} alt="" />
        <div className={st.campaignBody}>
          <span className={st.kicker}>
            {tl(CIRCLE_NAMES[next.circle])} · {t('map.act', { n: next.act })}
          </span>
          <div className={st.campaignName}>{tl(act.name)}</div>
          <div className={st.progress}>
            <div style={{ width: `${(s.progress.stage / STAGE_COUNT) * 100}%` }} />
          </div>
          <div className={css.row} style={{ justifyContent: 'space-between' }}>
            <span className={css.tiny}>{t('adv.stages', { n: s.progress.stage, max: STAGE_COUNT })}</span>
            <span className={css.tiny} style={{ color: 'var(--accent)', fontWeight: 800 }}>
              {t('adv.openMap')} →
            </span>
          </div>
        </div>
      </div>

      <div className={st.sectionTitle}>{t('adv.trials')}</div>
      <div className={st.tiles}>
        {tiles
          .filter((x) => !x.hidden)
          .map((m) => {
            const unlocked = isUnlocked({ s, cfg }, m.feature);
            const need = (cfg.unlocks.stage as Record<string, number>)[m.feature];
            return (
              <button
                key={m.id}
                className={cx(st.tile, !unlocked && st.tileLocked)}
                style={{ ['--c' as string]: m.color }}
                onClick={() => {
                  if (!unlocked) {
                    haptic.error();
                    useUi.getState().toast(t('common.unlocksAt', { stage: stageLabel(stageRef(need)) }), 'info');
                    return;
                  }
                  open(m.id);
                }}
              >
                {unlocked && m.dot && <span className={st.tileDot} />}
                <Icon name={unlocked ? m.icon : 'lock'} size={40} className={st.tileIcon} />
                <span className={st.tileTitle}>{t(`mode.${m.id}`)}</span>
                <span className={st.tileSub}>{unlocked ? m.sub : t('common.unlocksAt', { stage: stageLabel(stageRef(need)) })}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

// ——— карта похода ———

function CampaignMap() {
  const s = useGameState();
  const cleared = s.progress.stage;
  const cur = stageRef(Math.min(STAGE_COUNT, cleared + 1));
  const [circle, setCircle] = useState(cur.circle);
  const [act, setAct] = useState(cur.act);
  const def = ACTS[act - 1];
  const boss = ENEMY_MAP[def.boss];
  const base = circle * STAGES_PER_CIRCLE + (act - 1) * STAGES_PER_ACT;

  return (
    <div className={css.col}>
      <BackHeader title={t('adv.campaign')} />
      <div className={css.row} style={{ gap: 6 }}>
        {CIRCLE_NAMES.map((n, i) => {
          const openC = cleared >= i * STAGES_PER_CIRCLE;
          return (
            <button
              key={i}
              className={cx(css.chip, circle === i && css.chipOn)}
              style={{ opacity: openC ? 1 : 0.45 }}
              onClick={() => {
                if (!openC) return useUi.getState().toast(t('adv.circleLocked'), 'info');
                setCircle(i);
              }}
            >
              {!openC && <Icon name="lock" size={12} />}
              {tl(n)}
            </button>
          );
        })}
      </div>
      <div className={css.hscroll}>
        {ACTS.map((a) => {
          const openA = cleared >= circle * STAGES_PER_CIRCLE + (a.id - 1) * STAGES_PER_ACT;
          return (
            <button key={a.id} className={cx(css.chip, act === a.id && css.chipOn)} style={{ opacity: openA ? 1 : 0.45 }} onClick={() => setAct(a.id)}>
              {!openA && <Icon name="lock" size={12} />}
              {t('map.act', { n: a.id })}
            </button>
          );
        })}
      </div>
      <Panel title={`${t('map.act', { n: act })}. ${tl(def.name)}`} right={<Icon name={def.element} size={18} />}>
        <div className={st.map} style={{ backgroundImage: `url(${actBackground(act)})` }}>
          <StagePath base={base} cleared={cleared} />
        </div>
        <div className={css.row} style={{ marginTop: 10, alignItems: 'flex-start' }}>
          <img className="pixel" src={enemyUrl(boss.id)} width={56} height={56} alt="" style={{ transform: 'scaleX(-1)' }} />
          <div className={css.grow}>
            <b>
              {t('map.boss')}: {tl(boss.name)}
            </b>
            <div className={css.tiny}>{tl(boss.title)}</div>
            {boss.mechanic && <div className={css.tiny} style={{ color: 'var(--rose)' }}>{tl(MECHANIC_TEXT[boss.mechanic])}</div>}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** 20 узлов этапов змейкой: 4 ряда по 5. */
function StagePath({ base, cleared }: { base: number; cleared: number }) {
  const nodes = [];
  for (let i = 0; i < STAGES_PER_ACT; i++) {
    const row = Math.floor(i / 5);
    const col = row % 2 === 0 ? i % 5 : 4 - (i % 5);
    const ref = stageRef(base + i + 1);
    const state = ref.n <= cleared ? 'done' : ref.n === cleared + 1 ? 'now' : 'locked';
    nodes.push({ i, x: 12 + col * 19, y: 86 - row * 23, ref, state });
  }
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <polyline points={nodes.map((n) => `${n.x},${n.y}`).join(' ')} fill="none" stroke="#ffc14d" strokeOpacity="0.45" strokeWidth="1.1" strokeDasharray="2 1.6" />
      </svg>
      {nodes.map((n) => {
        const big = n.ref.kind !== 'normal';
        const size = n.ref.kind === 'boss' ? 42 : n.ref.kind === 'mini' ? 34 : 28;
        return (
          <div
            key={n.i}
            className={cx(st.node, n.state === 'done' && st.nodeDone, n.state === 'now' && st.nodeNow, big && st.nodeBoss)}
            style={{ left: `${n.x}%`, top: `${n.y}%`, width: size, height: size }}
            onClick={() => openStage(n.ref)}
          >
            {big ? <Icon name="skull" size={size - 14} style={{ opacity: n.state === 'locked' ? 0.4 : 1 }} /> : n.ref.stage}
          </div>
        );
      })}
    </>
  );
}

function openStage(ref: StageRef) {
  const cfg = useGame.getState().cfg!;
  const waves = [0, 1, 2].map((w) => waveUnits(cfg, ref, w));
  const guard = guardianUnits(cfg, ref);
  const lead = ENEMY_MAP[guard[0].ref];
  useUi.getState().open((close) => (
    <Sheet title={t('map.stage', { s: stageLabel(ref) })} onClose={close}>
      <div className={css.col} style={{ gap: 6 }}>
        {waves.map((w, i) => (
          <div key={i} className={css.row}>
            <span className={css.tiny} style={{ width: 64 }}>
              {t('battle.wave', { wave: i + 1 })}
            </span>
            <div className={st.enemies}>
              {w.map((u, k) => (
                <img key={k} className="pixel" src={enemyUrl(u.ref)} alt="" title={tl(ENEMY_MAP[u.ref]?.name)} />
              ))}
            </div>
          </div>
        ))}
        <div className={css.divider} />
        <div className={css.row} style={{ alignItems: 'flex-start' }}>
          <img className="pixel" src={enemyUrl(lead.id)} width={72} height={72} alt="" style={{ transform: 'scaleX(-1)' }} />
          <div className={css.grow}>
            <div className={css.tiny}>{t(`adv.guard.${ref.kind}`)}</div>
            <b>{tl(lead.name)}</b>
            {lead.mechanic && <div className={css.tiny} style={{ color: 'var(--rose)' }}>{tl(MECHANIC_TEXT[lead.mechanic])}</div>}
          </div>
        </div>
      </div>
    </Sheet>
  ));
}
