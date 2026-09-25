import {
  DEFAULT_CONFIG,
  GameError,
  applyAction,
  createPlayer,
  migrate,
  mergeConfig,
  sanitizeResult,
  stateHash,
  type Action,
  type Config,
  type PlayerState,
} from '@idle/shared';
import { detectLang } from '../i18n';
import { inTelegram, startParam, tg, tgUser } from '../tg/telegram';

export interface Flags {
  social: boolean;
}

export interface InitResult {
  state: PlayerState;
  cfg: Config;
  now: number;
  isDev: boolean;
  flags: Flags;
  mode: 'local' | 'remote';
  botUsername?: string;
  appName?: string;
}

export type ActionResponse =
  | { ok: true; now: number; hash: string; result: unknown }
  | { ok: false; error: { code: string; params?: Record<string, string | number> }; state?: PlayerState; now?: number };

export interface Backend {
  mode: 'local' | 'remote';
  init(): Promise<InitResult>;
  action(id: string, action: Action): Promise<ActionResponse>;
  fetchState(): Promise<{ state: PlayerState; now: number }>;
  dev(op: string, body?: unknown): Promise<unknown>;
}

// ——— локальный режим (без сервера): прогресс в localStorage ———

const SAVE_KEY = 'idle-rpg:save:v1';
const SNAP_KEY = 'idle-rpg:snap:';

export class LocalBackend implements Backend {
  mode = 'local' as const;
  private state!: PlayerState;
  private cfg: Config = DEFAULT_CONFIG;
  private saveTimer: number | null = null;
  private log: { at: number; op: string; body: unknown }[] = [];

  constructor(private isDev: boolean) {}

  async init(): Promise<InitResult> {
    const now = Date.now();
    const raw = localStorage.getItem(SAVE_KEY);
    const user = tgUser();
    if (raw) {
      try {
        this.state = migrate(this.cfg, JSON.parse(raw) as PlayerState, now);
      } catch {
        this.state = createPlayer(this.cfg, String(user?.id ?? 'local'), user?.first_name ?? 'Commander', now, detectLang(user?.language_code ?? navigator.language));
      }
    } else {
      this.state = createPlayer(this.cfg, String(user?.id ?? 'local'), user?.first_name ?? 'Commander', now, detectLang(user?.language_code ?? navigator.language));
    }
    this.persist();
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    return {
      state: structuredClone(this.state),
      cfg: this.cfg,
      now,
      isDev: this.isDev,
      flags: { social: false },
      mode: 'local',
    };
  }

  async action(_id: string, action: Action): Promise<ActionResponse> {
    const now = Date.now();
    try {
      const r = applyAction(this.state, action, { cfg: this.cfg, now, dev: this.isDev });
      this.state = r.state;
      this.persist();
      return { ok: true, now, hash: stateHash(this.state), result: sanitizeResult(r.result) };
    } catch (e) {
      if (e instanceof GameError) return { ok: false, error: { code: e.code, params: e.params } };
      throw e;
    }
  }

  async fetchState() {
    return { state: structuredClone(this.state), now: Date.now() };
  }

  async dev(op: string, body?: any): Promise<unknown> {
    this.log.push({ at: Date.now(), op, body });
    if (op === 'snapshot.save') {
      localStorage.setItem(SNAP_KEY + body.slot, JSON.stringify({ at: Date.now(), state: this.state }));
      return { ok: true };
    }
    if (op === 'snapshot.load') {
      const raw = localStorage.getItem(SNAP_KEY + body.slot);
      if (!raw) return { ok: false };
      this.state = migrate(this.cfg, JSON.parse(raw).state, Date.now());
      this.persist();
      return { ok: true };
    }
    if (op === 'snapshot.list') {
      return [1, 2, 3].map((slot) => {
        const raw = localStorage.getItem(SNAP_KEY + slot);
        return raw ? { slot, at: JSON.parse(raw).at } : { slot, at: null };
      });
    }
    if (op === 'config') return { cfg: this.cfg, version: this.cfg.version };
    if (op === 'config.patch') {
      this.cfg = mergeConfig(this.cfg, body);
      return { cfg: this.cfg };
    }
    if (op === 'log') return this.log.slice(-100).reverse();
    return null;
  }

  private persist() {
    if (this.saveTimer) return;
    this.saveTimer = window.setTimeout(() => this.flush(), 800);
  }

  private flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      /* квота */
    }
  }
}

// ——— серверный режим ———

export class RemoteBackend implements Backend {
  mode = 'remote' as const;
  private token = '';

  constructor(private base = '/api') {}

  private async req<T>(path: string, body?: unknown, method = 'POST', attempt = 0): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(this.base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 401 && attempt === 0 && path !== '/auth') {
        await this.auth();
        return this.req<T>(path, body, method, 1);
      }
      if (res.status === 429) throw new GameError('rateLimit');
      if (!res.ok && res.status >= 500) throw new GameError('network');
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof GameError) throw e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        return this.req<T>(path, body, method, attempt + 1);
      }
      throw new GameError('network');
    } finally {
      clearTimeout(timer);
    }
  }

  private lastInit: InitResult | null = null;

  private async auth(): Promise<InitResult> {
    const res = await this.req<any>('/auth', {
      initData: tg?.initData ?? '',
      startParam: startParam(),
      lang: detectLang(tgUser()?.language_code ?? navigator.language),
    });
    if (!res.ok) throw new GameError(res.error?.code ?? 'auth');
    this.token = res.token;
    this.lastInit = {
      state: res.state,
      cfg: res.cfg,
      now: res.now,
      isDev: !!res.isDev,
      flags: res.flags ?? { social: false },
      mode: 'remote',
      botUsername: res.botUsername,
      appName: res.appName,
    };
    return this.lastInit;
  }

  async init(): Promise<InitResult> {
    return this.auth();
  }

  async action(id: string, action: Action): Promise<ActionResponse> {
    return this.req<ActionResponse>('/action', { id, action });
  }

  async fetchState() {
    return this.req<{ state: PlayerState; now: number }>('/state', undefined, 'GET');
  }

  async dev(op: string, body?: unknown): Promise<unknown> {
    return this.req('/dev', { op, body });
  }
}

/** Выбор бэкенда: внутри Telegram — сервер; локальный режим — по флагу или вне Telegram в dev-сборке. */
export function createBackend(): Backend {
  const forceLocal = import.meta.env.VITE_LOCAL === '1' || new URLSearchParams(location.search).has('local');
  if (!forceLocal && (inTelegram() || import.meta.env.VITE_REMOTE === '1')) return new RemoteBackend(import.meta.env.VITE_API_URL ?? '/api');
  return new LocalBackend(import.meta.env.DEV || import.meta.env.VITE_LOCAL_DEV === '1');
}
