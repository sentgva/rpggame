/**
 * Режиссёр боя: крутит бесконечный автобой. На новом этапе отправляет серверу
 * волны и босса (награды считает сервер), в остальное время показывает
 * косметический фарм последнего пройденного этапа.
 */
import {
  heroUnits,
  simulateBattle,
  activeArtifacts,
  stageFromGlobal,
  stageLabel,
  targetStage,
  waveUnits,
  type BattleEvent,
  type StageRef,
} from '@idle/shared';
import { create } from 'zustand';
import { manualEnabled, runLive, type LiveBattle } from './live';
import { useGame } from '../store/game';
import { sfx } from '../audio/sfx';

export type PlaybackKind = 'wave' | 'boss' | 'farm' | 'mode';

export interface Playback {
  events: BattleEvent[];
  kind: PlaybackKind;
  act: number;
  win: boolean;
  speed: number;
  label: string;
  /** живой бой с ручными ультами: события меняются по ходу (пересчёт после команд игрока) */
  live?: LiveBattle;
}

type Player = (p: Playback, signal: AbortSignal) => Promise<void>;

interface BattleUi {
  phase: PlaybackKind | 'idle';
  label: string;
  stage: StageRef | null;
  result: null | { kind: PlaybackKind; win: boolean; rewards?: any; stage?: StageRef; at: number };
  mode: boolean;
}

export const useBattle = create<BattleUi>(() => ({ phase: 'idle', label: '', stage: null, result: null, mode: false }));

let player: Player | null = null;
let running = false;
let current: AbortController | null = null;
let bossRequested = false;
let waveCooldownUntil = 0;
let modeLock: Promise<void> | null = null;
let modeActive = false;

export function registerPlayer(p: Player | null) {
  if (player === p) return;
  player = p;
  // Смена проигрывателя (вкладку боя открыли/закрыли): текущий бой прерываем, иначе режиссёр
  // ждал бы проигрывание, которое уже никто не показывает, и сцена оставалась пустой.
  current?.abort();
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

export function battleSpeed(): number {
  const g = useGame.getState();
  const s = g.state!;
  const now = g.now();
  let speed = s.boosts.x2Until > now || s.shop.passUntil > now ? 2 : 1;
  if (g.isDev && s.dev.speed) speed = Math.max(speed, s.dev.speed);
  return speed;
}

/** Проиграть бой: через рендерер, если он смонтирован, иначе просто выждать его длительность. */
export async function play(p: Playback): Promise<void> {
  // бой режима важнее фоновых боёв: не прерываем его
  if (modeActive && p.kind !== 'mode') return;
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  const end = p.events[p.events.length - 1];
  const duration = end ? end.t : 1000;
  if (player) await player(p, ctrl.signal);
  else await sleep(Math.min(duration / p.speed, 20000), ctrl.signal);
  if (current === ctrl) current = null;
}

export function requestBoss() {
  bossRequested = true;
  // прерываем косметический фарм, чтобы босс начался сразу
  if (useBattle.getState().phase === 'farm') current?.abort();
}

/** Бой из режима (подземелье, башня, арена…) — показывается на экране боя. */
export async function playModeBattle(events: BattleEvent[], win: boolean, label: string, act = 1): Promise<void> {
  let release!: () => void;
  const prev = modeLock;
  modeLock = new Promise((r) => (release = r));
  await prev;
  modeActive = true;
  useBattle.setState({ phase: 'mode', label, mode: true });
  try {
    await play({ events, kind: 'mode', act, win, speed: battleSpeed(), label });
  } finally {
    modeActive = false;
    useBattle.setState({ mode: false });
    release();
    modeLock = null;
  }
}

export function startDirector(): () => void {
  if (running) return () => undefined;
  running = true;
  void loop();
  return () => {
    running = false;
    current?.abort();
  };
}

async function loop() {
  while (running) {
    try {
      await step();
    } catch (e) {
      console.error('director', e);
      await sleep(2000);
    }
  }
}

async function step() {
  if (document.hidden) {
    await sleep(1000);
    return;
  }
  if (modeLock) {
    await modeLock;
    return;
  }
  const g = useGame.getState();
  const s = g.state!;
  const now = g.now();
  const target = targetStage({ s });

  if (target && s.progress.wave >= 3) {
    const autoBoss = s.settings.autoBoss && (s.ascension.up.autoBoss ?? 0) > 0 && s.progress.retryAt <= now;
    const retry = s.settings.autoRetry && s.progress.retryAt > 0 && now >= s.progress.retryAt;
    if (bossRequested || autoBoss || retry) {
      // ручные ульты — только когда босса вызвал сам игрок (автоповтор и автобосс идут на авто)
      const manual = bossRequested && manualEnabled();
      bossRequested = false;
      await fightBoss(target, manual);
      return;
    }
  } else bossRequested = false;

  if (target && s.progress.wave < 3 && Date.now() >= waveCooldownUntil) {
    const r = await g.act('battle.wave', {}, { silent: true });
    if (!r.ok || !r.result?.battle?.events) {
      await sleep(2000);
      return;
    }
    const label = stageLabel(target);
    useBattle.setState({ phase: 'wave', label, stage: target });
    await play({ events: r.result.battle.events, kind: 'wave', act: target.act, win: r.result.battle.win, speed: battleSpeed(), label });
    if (!r.result.battle.win) waveCooldownUntil = Date.now() + 15000;
    else sfx('wave');
    return;
  }
  await farm();
}

async function fightBoss(target: StageRef, manual = false) {
  const g = useGame.getState();
  const label = stageLabel(target);
  if (manual) {
    useBattle.setState({ phase: 'boss', label, stage: target, result: null });
    sfx('bossStart');
    const r = await runLive('battle.boss', {}, (live) => play({ events: live.events, live, kind: 'boss', act: target.act, win: live.win, speed: battleSpeed(), label }));
    if (!r) return;
    useBattle.setState({ result: { kind: 'boss', win: r.result.win, rewards: r.result.rewards, stage: target, at: Date.now() } });
    sfx(r.result.win ? 'victory' : 'defeat');
    return;
  }
  const r = await g.act('battle.boss');
  if (!r.ok || !r.result?.battle?.events) return;
  useBattle.setState({ phase: 'boss', label, stage: target, result: null });
  sfx('bossStart');
  await play({ events: r.result.battle.events, kind: 'boss', act: target.act, win: r.result.win, speed: battleSpeed(), label });
  useBattle.setState({ result: { kind: 'boss', win: r.result.win, rewards: r.result.rewards, stage: target, at: Date.now() } });
  sfx(r.result.win ? 'victory' : 'defeat');
}

/** Косметический фарм последнего пройденного этапа: только визуализация, доход идёт в сундук. */
async function farm() {
  const g = useGame.getState();
  const s = g.state!;
  const cfg = g.cfg!;
  const ref = stageFromGlobal(Math.max(1, s.progress.maxGlobal || 1));
  const wave = Math.floor(Math.random() * 3);
  const heroes = heroUnits(cfg, s, s.party.presets[s.party.active]);
  if (!heroes.length) {
    await sleep(1500);
    return;
  }
  const res = simulateBattle(cfg, {
    seed: (Math.random() * 0xffffffff) >>> 0,
    units: [...heroes, ...waveUnits(cfg, ref, wave)],
    timeLimit: 45,
    immortal: true,
    artifacts: activeArtifacts(s),
  });
  const label = stageLabel(ref);
  useBattle.setState({ phase: 'farm', label, stage: targetStage({ s }) });
  await play({ events: res.events, kind: 'farm', act: ref.act, win: res.win, speed: battleSpeed(), label });
  await sleep(400);
}
