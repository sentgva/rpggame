import {
  GameError,
  applyAction,
  settleChest,
  stateHash,
  type Action,
  type Config,
  type Ctx,
  type PlayerState,
} from '@idle/shared';
import { create } from 'zustand';
import { errorText, setLang } from '../i18n';
import { createBackend, type Backend, type Flags } from '../net/backend';
import { haptic, setHaptics } from '../tg/telegram';
import { useUi } from './ui';

interface Pending {
  id: string;
  action: Action;
  now: number;
}

export interface DoResult<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
}

interface GameStore {
  ready: boolean;
  fatal: string | null;
  mode: 'local' | 'remote';
  isDev: boolean;
  flags: Flags;
  botUsername?: string;
  appName?: string;
  cfg: Config | null;
  state: PlayerState | null;
  confirmed: PlayerState | null;
  pending: Pending[];
  clockOffset: number;
  /** Время последнего захода (до начала сессии) — для экрана «Пока вас не было». */
  sessionLastSeen: number;
  busy: boolean;
  init(): Promise<void>;
  now(): number;
  act<T = any>(type: string, params?: Record<string, unknown>, opts?: { silent?: boolean }): Promise<DoResult<T>>;
  resync(): Promise<void>;
  backend(): Backend;
}

let backend: Backend;
let queue: Promise<void> = Promise.resolve();
let seq = 0;

function uid(): string {
  return `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useGame = create<GameStore>((set, get) => ({
  ready: false,
  fatal: null,
  mode: 'local',
  isDev: false,
  flags: { social: false, ads: false, payments: false },
  cfg: null,
  state: null,
  confirmed: null,
  pending: [],
  clockOffset: 0,
  sessionLastSeen: 0,
  busy: false,

  backend: () => backend,

  now: () => Date.now() + get().clockOffset,

  async init() {
    backend = createBackend();
    try {
      const r = await backend.init();
      setLang(r.state.settings.lang);
      setHaptics(r.state.settings.haptics);
      set({
        ready: true,
        fatal: null,
        mode: r.mode,
        isDev: r.isDev,
        flags: r.flags,
        botUsername: r.botUsername,
        appName: r.appName,
        cfg: r.cfg,
        state: r.state,
        confirmed: structuredClone(r.state),
        clockOffset: r.now - Date.now(),
        sessionLastSeen: r.state.lastSeen,
      });
    } catch (e) {
      const code = e instanceof GameError ? e.code : 'network';
      set({ fatal: errorText(code) });
    }
  },

  async act<T = any>(type: string, params: Record<string, unknown> = {}, opts: { silent?: boolean } = {}): Promise<DoResult<T>> {
    const action: Action = { ...params, type };
    const { state, cfg, isDev } = get();
    if (!state || !cfg) return { ok: false };
    const now = get().now();
    let local;
    try {
      local = applyAction(state, action, { cfg, now, dev: isDev });
    } catch (e) {
      if (e instanceof GameError) {
        const msg = errorText(e.code, e.params);
        if (!opts.silent) {
          useUi.getState().toast(msg, 'bad');
          haptic.error();
        }
        return { ok: false, error: msg };
      }
      console.error(e);
      return { ok: false, error: String(e) };
    }
    const id = uid();
    set((s) => ({ state: local.state, pending: [...s.pending, { id, action, now }] }));
    if (action.type === 'settings') {
      setLang(local.state.settings.lang);
      setHaptics(local.state.settings.haptics);
    }

    queue = queue.then(() => confirm(id, action));
    return { ok: true, result: local.result as T };
  },

  async resync() {
    const r = await backend.fetchState();
    set({ confirmed: r.state, clockOffset: r.now - Date.now() });
    rebuildView();
  },
}));

/** Отправка действия серверу и сверка результата. */
async function confirm(id: string, action: Action) {
  const store = useGame.getState();
  try {
    const res = await backend.action(id, action);
    const { cfg, isDev } = useGame.getState();
    if (res.ok) {
      let confirmed = useGame.getState().confirmed!;
      try {
        confirmed = applyAction(confirmed, action, { cfg: cfg!, now: res.now, dev: isDev }).state;
        if (res.hash && stateHash(confirmed) !== res.hash) {
          // рассинхрон (например, другое устройство) — берём состояние сервера
          const fresh = await backend.fetchState();
          confirmed = fresh.state;
        }
      } catch {
        const fresh = await backend.fetchState();
        confirmed = fresh.state;
      }
      useGame.setState({ confirmed, clockOffset: res.now - Date.now() });
    } else {
      useUi.getState().toast(errorText(res.error.code, res.error.params), 'bad');
      haptic.error();
      if (res.state) useGame.setState({ confirmed: res.state });
    }
  } catch (e) {
    const code = e instanceof GameError ? e.code : 'network';
    useUi.getState().toast(errorText(code), 'bad');
    try {
      const fresh = await backend.fetchState();
      useGame.setState({ confirmed: fresh.state });
    } catch {
      /* офлайн — оставляем как есть */
    }
  }
  useGame.setState((s) => ({ pending: s.pending.filter((p) => p.id !== id) }));
  rebuildView();
  void store;
}

/** Представление = подтверждённое состояние + ещё не подтверждённые действия. */
function rebuildView() {
  const { confirmed, pending, cfg, isDev } = useGame.getState();
  if (!confirmed || !cfg) return;
  let view = confirmed;
  for (const p of pending) {
    try {
      view = applyAction(view, p.action, { cfg, now: p.now, dev: isDev }).state;
    } catch {
      /* действие стало невалидным — пропускаем */
    }
  }
  useGame.setState({ state: view });
}

/** Сундук «как если бы собрали сейчас» — для живого отображения накоплений. */
export function previewChest(s: PlayerState, cfg: Config, now: number) {
  const copy = { ...s, chest: { ...s.chest } } as PlayerState;
  const ctx = { s: copy, cfg, now, rng: null, dev: false, server: false, events: [] } as unknown as Ctx;
  settleChest(ctx);
  return copy.chest;
}

export function useGameState(): PlayerState {
  return useGame((g) => g.state)!;
}

export function useCfg(): Config {
  return useGame((g) => g.cfg)!;
}
