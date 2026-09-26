import { applyAction, type BattleEvent, type BattleInput } from '@idle/shared';
import { create } from 'zustand';
import { useGame } from '../store/game';

export interface LiveHero {
  uid: number;
  ref: string;
  energy: number;
  alive: boolean;
  /** команда отдана, ульта ещё не вышла */
  pending: boolean;
}

interface LiveUi {
  active: boolean;
  /** ручной режим (после «Авто» — выключен до конца боя) */
  manual: boolean;
  heroes: LiveHero[];
  /** «Сокрушительный удар» босса: часы боя начала и конца */
  cast: { uid: number; start: number; end: number } | null;
  clock: number;
}

/** Состояние живого боя для панели ульт (обновляет рендерер). */
export const useLive = create<LiveUi>(() => ({ active: false, manual: false, heroes: [], cast: null, clock: 0 }));

type Sim = (inputs: BattleInput[]) => { events: BattleEvent[]; win: boolean };

/**
 * Живой бой: симулятор общий с сервером и детерминирован, поэтому каждая команда игрока
 * («ульта сейчас») пересчитывает бой целиком — прошлое не меняется, меняется только будущее.
 * Итог отправляется на сервер с теми же командами, и сервер получает тот же бой.
 */
export class LiveBattle {
  events: BattleEvent[];
  win: boolean;
  inputs: BattleInput[] = [];
  /** часы проигрывания (мс боя), выставляет рендерер */
  clock = 0;

  constructor(private sim: Sim) {
    const r = sim([]);
    this.events = r.events;
    this.win = r.win;
  }

  private resim() {
    const r = this.sim(this.inputs);
    this.events = r.events;
    this.win = r.win;
  }

  /** Время команды — строго после текущего кадра: уже показанное прошлое не меняется. */
  private at() {
    return Math.floor(this.clock) + 1;
  }

  cast(uid: number) {
    const ui = useLive.getState();
    const h = ui.heroes.find((x) => x.uid === uid);
    if (!ui.manual || !h || !h.alive || h.pending || h.energy < 100) return;
    this.inputs.push({ t: this.at(), u: uid });
    this.resim();
    useLive.setState({ heroes: ui.heroes.map((x) => (x.uid === uid ? { ...x, pending: true } : x)) });
  }

  /** До конца боя ульты — автоматически. */
  auto() {
    if (!useLive.getState().manual) return;
    this.inputs.push({ t: this.at(), u: -1 });
    this.resim();
    useLive.setState({ manual: false });
  }

  get endT(): number {
    return this.events.length ? this.events[this.events.length - 1].t : 0;
  }
}

export let currentLive: LiveBattle | null = null;

export function manualEnabled(): boolean {
  return useGame.getState().state?.settings.manualUlt !== false;
}

/**
 * Бой с ручными ультами: превью локально → игрок управляет → итог на сервер с командами.
 * null — бой начать нельзя (ошибка уже показана тостом).
 */
export async function runLive(
  type: string,
  params: Record<string, unknown>,
  play: (live: LiveBattle) => Promise<void>,
): Promise<{ ok: true; result: any } | null> {
  const g = useGame.getState();
  const base = g.state!;
  const cfg = g.cfg!;
  const now = g.now();
  const dev = g.isDev;
  const sim: Sim = (inputs) => {
    const r = applyAction(base, { type, ...params, manual: true, inputs }, { cfg, now, dev });
    const b = (r.result as { battle: { events: BattleEvent[]; win: boolean } }).battle;
    return { events: b.events, win: b.win };
  };
  let live: LiveBattle;
  try {
    live = new LiveBattle(sim);
  } catch {
    // действие невозможно (нет ключей, попыток…) — обычный путь покажет понятную ошибку
    const r = await g.act(type, params);
    return r.ok ? (r as { ok: true; result: any }) : null;
  }
  const start = live.events[0];
  const heroes: LiveHero[] =
    start?.k === 'start' ? start.units.filter((u) => u.side === 0 && u.kind === 'hero').map((u) => ({ uid: u.uid, ref: u.ref, energy: u.energy, alive: true, pending: false })) : [];
  currentLive = live;
  useLive.setState({ active: true, manual: true, heroes, cast: null, clock: 0 });
  try {
    await play(live);
  } finally {
    // пропустили бой — остаток ульт автоматически
    if (useLive.getState().manual && live.clock < live.endT) live.inputs.push({ t: Math.floor(live.clock) + 1, u: -1 });
    currentLive = null;
    useLive.setState({ active: false, cast: null });
  }
  const r = await g.act(type, { ...params, manual: true, inputs: live.inputs });
  return r.ok ? (r as { ok: true; result: any }) : null;
}
