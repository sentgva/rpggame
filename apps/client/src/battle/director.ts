/**
 * Режиссёр похода: Легион идёт маршем, бьёт волны этапа (награды считает сервер), затем страж этапа —
 * сам (автобой) или по кнопке игрока (ручное управление: ульты и щит). Если страж не вызван или ещё не по силам,
 * Легион фармит пройденный этап — это только показ, доход идёт в сундук.
 */
import { activeParty, guardianUnits, heroUnits, simulateCombat, stageLabel, stageRef, targetStage, waveUnits, type CombatEvent, type StageRef } from '@idle/shared';
import { create } from 'zustand';
import { openJoin } from '../components/Join';
import { sfx } from '../audio/sfx';
import { useGame } from '../store/game';
import { manualEnabled, runLive } from './live';
import { mvpOf } from './mvp';
import type { Playback, PlaybackKind } from './renderer';

export type { PlaybackKind };

type Player = {
  play: (p: Playback, signal: AbortSignal) => Promise<void>;
  march: (heroes: string[], act: number, ms: number, signal?: AbortSignal) => Promise<void>;
};

interface BattleUi {
  phase: PlaybackKind | 'march' | 'idle';
  label: string;
  stage: StageRef | null;
  /** волна, которую сейчас бьют (0…2), 3 — страж */
  wave: number;
  result: null | { kind: PlaybackKind; win: boolean; rewards?: any; stage?: StageRef; at: number; mvp?: string | null };
  /** подсказка «страж ждёт» после победы над волнами */
  guardianReady: boolean;
}

export const useBattle = create<BattleUi>(() => ({ phase: 'idle', label: '', stage: null, wave: 0, result: null, guardianReady: false }));

let player: Player | null = null;
let running = false;
let current: AbortController | null = null;
let bossRequested = false;
let waveCooldownUntil = 0;
let modeLock: Promise<void> | null = null;

export function registerPlayer(p: Player | null) {
  if (player === p) return;
  player = p;
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
  let speed: number = s.boosts.x2Until > now ? 2 : s.settings.speed;
  if (g.isDev && s.dev.speed) speed = Math.max(speed, s.dev.speed);
  return speed;
}

async function play(p: Playback): Promise<void> {
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  const end = p.events[p.events.length - 1];
  const duration = end ? end.t : 1000;
  if (player) await player.play(p, ctrl.signal);
  else await sleep(Math.min(duration / p.speed, 20000), ctrl.signal);
  if (current === ctrl) current = null;
}

async function march(ms: number, act: number) {
  const s = useGame.getState().state!;
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  useBattle.setState({ phase: 'march' });
  if (player) await player.march(activeParty(s), act, ms / battleSpeed(), ctrl.signal);
  else await sleep(ms, ctrl.signal);
  if (current === ctrl) current = null;
}

/** Вызвать стража этапа (кнопка): прерываем фарм, чтобы бой начался сразу. */
export function requestBoss() {
  bossRequested = true;
  const ph = useBattle.getState().phase;
  if (ph === 'farm' || ph === 'march') current?.abort();
}

/** Бой режима занимает сцену: фоновые бои ждут. */
export function lockForMode(p: Promise<void>) {
  current?.abort();
  modeLock = p.finally(() => {
    modeLock = null;
  });
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
  useBattle.setState({ guardianReady: !!target && s.progress.wave >= 3 });

  if (target && s.progress.wave >= 3) {
    const auto = s.settings.autoBoss && s.progress.retryAt <= now;
    const retry = s.settings.autoRetry && s.progress.retryAt > 0 && now >= s.progress.retryAt;
    if (bossRequested || auto || retry) {
      const manual = bossRequested && manualEnabled();
      bossRequested = false;
      await fightGuardian(target, manual);
      return;
    }
  } else bossRequested = false;

  if (target && s.progress.wave < 3 && Date.now() >= waveCooldownUntil) {
    await march(s.progress.wave === 0 ? 1500 : 1100, target.act);
    const r = await g.act('battle.wave', {}, { silent: true });
    if (!r.ok || !r.result?.battle?.events) {
      await sleep(2000);
      return;
    }
    const label = stageLabel(target);
    useBattle.setState({ phase: 'wave', label, stage: target, wave: r.result.wave - (r.result.battle.win ? 1 : 0) });
    await play({ events: r.result.battle.events, kind: 'wave', act: target.act, win: r.result.battle.win, speed: battleSpeed(), label });
    useBattle.setState({ wave: r.result.wave });
    if (!r.result.battle.win) waveCooldownUntil = Date.now() + 12000;
    else sfx('wave');
    return;
  }
  await farm();
}

async function fightGuardian(target: StageRef, manual: boolean) {
  const label = stageLabel(target);
  await march(900, target.act);
  useBattle.setState({ phase: 'boss', label, stage: target, wave: 3, result: null });
  sfx('bossStart');
  let events: CombatEvent[] = [];
  const r = await runLive(
    'battle.boss',
    {},
    (live) => {
      events = live.events;
      return play({ events: live.events, live, kind: 'boss', act: target.act, win: live.win, speed: battleSpeed(), label });
    },
    manual,
  );
  if (!r) return;
  useBattle.setState({ result: { kind: 'boss', win: r.result.win, rewards: r.result.rewards, stage: target, at: Date.now(), mvp: mvpOf(events) } });
  sfx(r.result.win ? 'victory' : 'defeat');
  if (r.result.joined?.length) void openJoin(r.result.joined);
}

/** Показной бой на пройденном этапе: без наград (доход идёт в сундук). */
async function farm() {
  const g = useGame.getState();
  const s = g.state!;
  const cfg = g.cfg!;
  const ref = stageRef(Math.max(1, s.progress.stage || 1));
  const party = activeParty(s);
  if (!party.length) {
    await sleep(1500);
    return;
  }
  await march(1300, ref.act);
  const wave = Math.floor(Math.random() * 3);
  const res = simulateCombat(cfg, {
    seed: (Math.random() * 0xffffffff) >>> 0,
    units: [...heroUnits(cfg, s, party), ...(Math.random() < 0.25 ? guardianUnits(cfg, ref) : waveUnits(cfg, ref, wave))],
    timeLimit: 40,
    immortal: true,
  });
  const label = stageLabel(ref);
  useBattle.setState({ phase: 'farm', label, stage: targetStage({ s }) });
  await play({ events: res.events, kind: 'farm', act: ref.act, win: res.win, speed: battleSpeed(), label });
}
