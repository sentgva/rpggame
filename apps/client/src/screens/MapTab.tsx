import {
  ACTS,
  ENEMY_MAP,
  MECHANIC_TEXT,
  STAGES_PER_ACT,
  difficultyUnlocked,
  isUnlocked,
  stageRef,
  waveComposition,
  type Difficulty,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import { enemyUrl, heroUrl } from '../art/runtime';
import { drawLayer, drawSky } from '../battle/backdrop';
import { Icon, Panel, Sheet, Tabs, css, cx } from '../components/ui';
import { t, tl } from '../i18n';
import { useCfg, useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { ModeScreen, MODES } from './modes/Modes';

export default function MapTab() {
  const stack = useUi((u) => u.stacks.map);
  const top = stack[stack.length - 1];
  if (top) return <ModeScreen id={top.id} />;
  return <MapRoot />;
}

function actBackground(act: number): string {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 90;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(drawSky(act), 0, 0);
  ctx.drawImage(drawLayer(act, 'far'), 0, 0);
  ctx.drawImage(drawLayer(act, 'mid'), 0, 0);
  ctx.drawImage(drawLayer(act, 'near'), 0, 0);
  return c.toDataURL();
}
const bgCache = new Map<number, string>();

function MapRoot() {
  const s = useGameState();
  const cfg = useCfg();
  const diff = s.progress.diff;
  const cleared = s.progress.cleared[diff];
  const currentAct = Math.min(10, Math.floor(cleared / STAGES_PER_ACT) + 1);
  const [act, setAct] = useState(currentAct);
  const actsRef = useRef<HTMLDivElement>(null);
  useEffect(() => setAct(currentAct), [diff, currentAct]);
  if (!bgCache.has(act)) bgCache.set(act, actBackground(act));
  const def = ACTS[act - 1];
  const boss = ENEMY_MAP[def.boss];

  return (
    <div className={css.col}>
      <Tabs<string>
        value={String(diff)}
        onChange={(v) => {
          const d = Number(v) as Difficulty;
          if (!difficultyUnlocked(s, d)) {
            useUi.getState().toast(d === 1 ? t('map.difficultyLocked') : t('map.nightmareLocked'), 'info');
            return;
          }
          void useGame.getState().act('stage.diff', { diff: d });
        }}
        items={(['normal', 'hard', 'nightmare'] as const).map((k, i) => ({
          id: String(i),
          label: (
            <span style={{ opacity: difficultyUnlocked(s, i) ? 1 : 0.45 }}>
              {!difficultyUnlocked(s, i) && <Icon name="lock" size={12} />} {t(`diff.${k}`)}
            </span>
          ),
        }))}
      />
      <div className={css.hscroll} ref={actsRef}>
        {ACTS.map((a) => {
          const open = a.id <= currentAct;
          return (
            <button key={a.id} className={cx(css.chip, act === a.id && css.chipOn)} style={{ opacity: open ? 1 : 0.45 }} onClick={() => setAct(a.id)}>
              {!open && <Icon name="lock" size={12} />}
              {t('map.act', { n: a.id })}
            </button>
          );
        })}
      </div>
      <Panel title={`${t('map.act', { n: act })}. ${tl(def.name)}`} right={<Icon name={def.element} size={18} />}>
        <div
          style={{
            position: 'relative',
            height: 300,
            overflow: 'hidden',
            border: '1px solid var(--line-2)',
            backgroundImage: `url(${bgCache.get(act)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            imageRendering: 'pixelated',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,8,.35)' }} />
          <StagePath act={act} diff={diff} cleared={cleared} />
        </div>
        <div className={css.row} style={{ marginTop: 8, alignItems: 'flex-start' }}>
          <img className="pixel" src={heroUrl(boss.hero!)} width={48} height={48} alt="" />
          <div className={css.grow}>
            <b>
              {t('map.boss')}: {tl(boss.name)}
            </b>
            <div className={css.tiny}>{tl(boss.title)}</div>
            <div className={css.tiny}>{boss.mechanic && tl(MECHANIC_TEXT[boss.mechanic])}</div>
          </div>
        </div>
      </Panel>

      <Panel title={t('map.modes')}>
        <div className={css.list}>
          {MODES.map((m) => {
            const unlocked = m.feature ? isUnlocked({ s, cfg }, m.feature) : true;
            const need = m.feature
              ? (cfg.unlocks.stage as Record<string, number>)[m.feature] !== undefined
                ? t('common.unlocksAt', { stage: stageText((cfg.unlocks.stage as Record<string, number>)[m.feature]) })
                : t('common.unlocksLvl', { lvl: (cfg.unlocks.level as Record<string, number>)[m.feature] })
              : '';
            return (
              <div
                key={m.id}
                className={css.listItem}
                style={{ cursor: 'pointer', opacity: unlocked ? 1 : 0.55 }}
                onClick={() => {
                  haptic.tap();
                  if (!unlocked) return useUi.getState().toast(need, 'info');
                  useUi.getState().push({ id: m.id });
                }}
              >
                <Icon name={m.icon} size={36} />
                <div className={css.grow}>
                  <b>{t(m.title)}</b>
                  <div className={css.tiny}>{unlocked ? t(m.desc) : need}</div>
                </div>
                {!unlocked && <Icon name="lock" size={20} />}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function stageText(global: number): string {
  const ref = stageRef(Math.min(2, Math.floor((global - 1) / 200)) as Difficulty, ((global - 1) % 200) + 1);
  return `${ref.act}-${ref.stage}${ref.diff ? ` (${['Normal', 'Hard', 'Nightmare'][ref.diff]})` : ''}`;
}

/** 20 узлов этапов змейкой: 4 ряда по 5. */
function StagePath({ act, diff, cleared }: { act: number; diff: Difficulty; cleared: number }) {
  const nodes = [];
  for (let i = 0; i < STAGES_PER_ACT; i++) {
    const row = Math.floor(i / 5);
    const col = row % 2 === 0 ? i % 5 : 4 - (i % 5);
    const x = 10 + col * 20;
    const y = 86 - row * 22;
    const idx = (act - 1) * STAGES_PER_ACT + i + 1;
    const ref = stageRef(diff, idx);
    const state = idx <= cleared ? 'done' : idx === cleared + 1 ? 'current' : 'locked';
    nodes.push({ i, x, y, ref, state });
  }
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <polyline points={nodes.map((n) => `${n.x},${n.y}`).join(' ')} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="2 1.5" />
      </svg>
      {nodes.map((n) => {
        const boss = n.ref.kind !== 'normal';
        const size = n.ref.kind === 'boss' ? 38 : n.ref.kind === 'mini' ? 32 : 26;
        return (
          <div
            key={n.i}
            onClick={() => openStage(n.ref.diff, n.ref.idx)}
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              width: size,
              height: size,
              transform: 'translate(-50%, -50%)',
              borderRadius: boss ? 2 : '50%',
              border: `2px solid ${n.state === 'done' ? '#e2c283' : n.state === 'current' ? '#fff' : '#3a4252'}`,
              background: n.state === 'done' ? 'radial-gradient(circle,#8a6d34,#3a2c14)' : n.state === 'current' ? 'radial-gradient(circle,#c98b94,#6a3a42)' : 'rgba(16,18,24,.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: n.state === 'current' ? '0 0 10px rgba(201,139,148,.9)' : undefined,
              animation: n.state === 'current' ? 'pulse 1.2s ease-in-out infinite' : undefined,
              color: n.state === 'locked' ? 'var(--text-3)' : '#fff',
            }}
          >
            {boss ? <Icon name="skull" size={size - 12} style={{ opacity: n.state === 'locked' ? 0.4 : 1 }} /> : n.ref.stage}
            {n.state === 'current' && <Icon name="expedition" size={18} style={{ position: 'absolute', top: -16, left: 8 }} />}
          </div>
        );
      })}
    </>
  );
}

function openStage(diff: Difficulty, idx: number) {
  const ref = stageRef(diff, idx);
  const cfg = useGame.getState().cfg!;
  const act = ACTS[ref.act - 1];
  const waves = [0, 1, 2].map((w) => waveComposition(cfg, ref, w));
  const bossId = ref.kind === 'boss' ? act.boss : ref.kind === 'mini' ? act.minis[ref.stage / 5 - 1] : null;
  useUi.getState().open((close) => (
    <Sheet title={`${t('map.stage', { s: `${ref.act}-${ref.stage}` })} · ${t(`diff.${['normal', 'hard', 'nightmare'][diff]}`)}`} onClose={close}>
      <div className={css.muted}>{t('map.enemies')}</div>
      {waves.map((w, i) => (
        <div key={i} className={css.row} style={{ margin: '4px 0' }}>
          <span className={css.tiny} style={{ width: 60 }}>
            {t('battle.wave', { wave: i + 1 })}
          </span>
          {w.map((id, k) => (
            <img key={k} className="pixel" src={enemyUrl(id)} width={40} height={40} alt="" title={tl(ENEMY_MAP[id].name)} style={{ transform: 'scaleX(-1)' }} />
          ))}
        </div>
      ))}
      {bossId && (
        <div className={css.row} style={{ marginTop: 6 }}>
          <img className="pixel" src={enemyUrl(bossId)} width={64} height={64} alt="" style={{ transform: 'scaleX(-1)' }} />
          <div>
            <b>{tl(ENEMY_MAP[bossId].name)}</b>
            <div className={css.tiny}>{ref.kind === 'boss' ? t('map.boss') : t('map.miniBoss')}</div>
            {ENEMY_MAP[bossId].mechanic && <div className={css.tiny}>{tl(MECHANIC_TEXT[ENEMY_MAP[bossId].mechanic!])}</div>}
          </div>
        </div>
      )}
    </Sheet>
  ));
}
