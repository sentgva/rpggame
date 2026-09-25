import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  CURRENCIES,
  GameError,
  applyAction,
  createPlayer,
  migrate,
  partyPower,
  sanitizeResult,
  stateHash,
  type Action,
  type Currency,
  type GameEvent,
  type PlayerState,
} from '@idle/shared';
import type { PoolClient } from 'pg';
import { BalanceService } from '../balance/balance.service';
import { background } from '../common/background';
import { DbService } from '../db/db.service';
import { env, isDevUser } from '../env';
import { AnalyticsService } from './analytics.service';

interface Entry {
  id: string;
  state: PlayerState;
  dirty: boolean;
  lastAccess: number;
  lock: Promise<unknown>;
  recent: Map<string, ActionResponse>;
  meta: { referrer: string | null; refQualified: boolean };
  /** Строки ledger, накопленные текущей операцией. */
  ledger: unknown[][];
}

export type ActionResponse =
  | { ok: true; now: number; hash: string; result: unknown }
  | { ok: false; error: { code: string; params?: Record<string, string | number> } };

export interface PlayerHooks {
  afterAction?(id: string, state: PlayerState, action: Action, meta: Entry['meta']): void;
}

interface PlayerRow {
  state: PlayerState;
  referrer_id: string | null;
  ref_qualified: boolean;
}

/**
 * Состояние игроков: сервер — источник истины. Применяем действия через общий движок
 * и пишем ledger/аналитику.
 *
 * Обычный сервер держит горячие состояния в памяти (write-behind с периодическим сбросом
 * в PostgreSQL) и сериализует действия игрока очередью в памяти. В serverless-режиме
 * (Vercel) инстансов много и они живут недолго, поэтому каждое действие выполняется
 * в транзакции: строка игрока блокируется SELECT … FOR UPDATE, состояние сохраняется
 * до ответа, повторы по action id отсекаются таблицей action_results.
 */
@Injectable()
export class PlayerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Players');
  private cache = new Map<string, Entry>();
  private timer: NodeJS.Timeout | null = null;
  private readonly serverless = env.serverless;
  hooks: PlayerHooks = {};

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(BalanceService) private readonly balance: BalanceService,
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  onModuleInit() {
    if (!this.serverless) this.timer = setInterval(() => void this.flush(false), env.flushIntervalMs);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush(true);
  }

  // ——— загрузка / создание ———

  async getOrCreate(
    id: string,
    profile: { username?: string; firstName?: string; lang: 'ru' | 'en' },
    startParam?: string,
  ): Promise<{ state: PlayerState; created: boolean }> {
    const existing = await this.load(id);
    if (existing) return { state: existing.state, created: false };
    const now = Date.now();
    const cfg = this.balance.get();
    const state = createPlayer(cfg, id, profile.firstName || profile.username || 'Commander', now, profile.lang);
    let referrer: string | null = null;
    if (env.socialEnabled && startParam?.startsWith('ref_')) {
      const ref = startParam.slice(4);
      if (ref && ref !== id && (await this.db.one('SELECT 1 FROM players WHERE id = $1', [ref]))) referrer = ref;
    }
    await this.db.query(
      `INSERT INTO players (id, username, first_name, lang, state, referrer_id) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [id, profile.username ?? null, profile.firstName ?? null, profile.lang, state, referrer],
    );
    const entry = await this.load(id);
    this.analytics.track(id, [{ name: 'register', props: { referrer, start: startParam ?? null } }]);
    if (referrer && entry) {
      // приглашённому — 300 кристаллов
      await this.applyTrusted(id, {
        type: 'mail.add',
        mail: {
          id: 'referral_welcome',
          title: { ru: 'Подарок от друга', en: 'A gift from a friend' },
          body: { ru: 'Вас пригласили в Легион! Держите 300 кристаллов.', en: 'You were invited to the Legion! Here are 300 crystals.' },
          at: now,
          rewards: { cur: { crystals: 300 } },
        },
      });
    }
    return { state: entry!.state, created: true };
  }

  private entryFromRow(id: string, row: PlayerRow): Entry {
    return {
      id,
      state: migrate(this.balance.get(), row.state, Date.now()),
      dirty: false,
      lastAccess: Date.now(),
      lock: Promise.resolve(),
      recent: new Map(),
      meta: { referrer: row.referrer_id, refQualified: row.ref_qualified },
      ledger: [],
    };
  }

  private async load(id: string): Promise<Entry | null> {
    const cached = this.serverless ? undefined : this.cache.get(id);
    if (cached) {
      cached.lastAccess = Date.now();
      return cached;
    }
    const row = await this.db.one<PlayerRow>('SELECT state, referrer_id, ref_qualified FROM players WHERE id = $1', [id]);
    if (!row) return null;
    if (this.serverless) return this.entryFromRow(id, row);
    // повторная проверка после await: кто-то мог загрузить параллельно
    const again = this.cache.get(id);
    if (again) return again;
    const entry = this.entryFromRow(id, row);
    this.cache.set(id, entry);
    return entry;
  }

  async getState(id: string): Promise<PlayerState | null> {
    return (await this.load(id))?.state ?? null;
  }

  /**
   * Последовательное выполнение операций над одним игроком. В serverless-режиме fn получает
   * клиент транзакции, в которой строка игрока заблокирована; изменения сохраняются до COMMIT.
   */
  private async withLock<T>(id: string, fn: (e: Entry, tx?: PoolClient) => Promise<T> | T): Promise<T> {
    if (this.serverless) {
      const out = await this.db.tx(async (c) => {
        const r = await c.query<PlayerRow>('SELECT state, referrer_id, ref_qualified FROM players WHERE id = $1 FOR UPDATE', [id]);
        if (!r.rows[0]) throw new GameError('noPlayer');
        const entry = this.entryFromRow(id, r.rows[0]);
        const res = await fn(entry, c);
        if (entry.dirty) await this.writeEntry(entry, c);
        await this.insertLedger(entry.ledger.splice(0), c);
        return res;
      });
      return out;
    }
    const entry = await this.load(id);
    if (!entry) throw new GameError('noPlayer');
    const run = entry.lock.then(async () => {
      try {
        return await fn(entry);
      } finally {
        this.ledgerQueue.push(...entry.ledger.splice(0));
      }
    });
    entry.lock = run.catch(() => undefined);
    return run;
  }

  // ——— действия ———

  async applyClient(id: string, actionId: string, action: Action): Promise<ActionResponse> {
    return this.withLock(id, async (e, tx) => {
      if (tx) {
        const prev = await tx.query<{ response: ActionResponse }>('SELECT response FROM action_results WHERE player_id = $1 AND action_id = $2', [id, actionId]);
        if (prev.rows[0]) return prev.rows[0].response;
      } else {
        const prev = e.recent.get(actionId);
        if (prev) return prev;
      }
      const res = this.apply(e, action, { dev: isDevUser(id), trusted: false, source: action?.type ?? '?', actionId });
      if (tx) {
        await tx.query('INSERT INTO action_results (player_id, action_id, response) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, actionId, JSON.stringify(res)]);
        // старые ответы нужны только для повторов в пределах минут
        if (Math.random() < 0.05) await tx.query("DELETE FROM action_results WHERE player_id = $1 AND created_at < now() - interval '1 hour'", [id]);
      } else {
        e.recent.set(actionId, res);
        if (e.recent.size > 64) e.recent.delete(e.recent.keys().next().value!);
      }
      return res;
    });
  }

  /** Действие от имени сервера (платежи, почта, компенсации) — сразу сохраняется в БД. */
  async applyTrusted(id: string, action: Action, source = 'server'): Promise<ActionResponse> {
    const res = await this.withLock(id, (e) => this.apply(e, action, { dev: false, trusted: true, source }));
    if (!this.serverless) await this.flushOne(id);
    return res;
  }

  private apply(e: Entry, action: Action, o: { dev: boolean; trusted: boolean; source: string; actionId?: string }): ActionResponse {
    if (!action || typeof action.type !== 'string') return { ok: false, error: { code: 'badParam' } };
    const cfg = this.balance.get();
    const now = Date.now();
    const before = { ...e.state.cur };
    try {
      const r = applyAction(e.state, action, { cfg, now, dev: o.dev, server: true, trusted: o.trusted });
      e.state = r.state;
      e.dirty = true;
      this.recordLedger(e, before, e.state.cur, o.source, o.actionId);
      if (r.events.length) this.analytics.track(e.id, r.events);
      if (action.type.startsWith('dev.')) background(this.devLog(e.id, action.type, action));
      this.hooks.afterAction?.(e.id, e.state, action, e.meta);
      return { ok: true, now, hash: stateHash(e.state), result: sanitizeResult(r.result) };
    } catch (err) {
      if (err instanceof GameError) return { ok: false, error: { code: err.code, params: err.params } };
      this.log.error(`action ${action.type} failed for ${e.id}: ${(err as Error).stack}`);
      return { ok: false, error: { code: 'server' } };
    }
  }

  /** Заменить состояние целиком (dev: загрузка снимка, полный сброс). */
  async replaceState(id: string, state: PlayerState) {
    await this.withLock(id, (e) => {
      e.state = migrate(this.balance.get(), state, Date.now());
      e.state.dev.used = true;
      e.dirty = true;
    });
    if (!this.serverless) await this.flushOne(id);
  }

  markQualified(id: string, meta: Entry['meta']) {
    meta.refQualified = true;
    const e = this.cache.get(id);
    if (e) e.meta.refQualified = true;
  }

  // ——— ledger и dev-журнал ———

  private ledgerQueue: unknown[][] = [];

  private recordLedger(e: Entry, before: Record<Currency, number>, after: Record<Currency, number>, source: string, actionId?: string) {
    for (const c of CURRENCIES) {
      const d = (after[c] ?? 0) - (before[c] ?? 0);
      if (d !== 0 && isFinite(d)) e.ledger.push([e.id, c, d, after[c], source, actionId ?? null]);
    }
  }

  private async devLog(id: string, section: string, payload: unknown) {
    try {
      await this.db.query('INSERT INTO dev_log (player_id, section, payload) VALUES ($1, $2, $3)', [id, section, JSON.stringify(payload)]);
    } catch (e) {
      this.log.warn(`dev_log: ${String(e)}`);
    }
  }

  // ——— сохранение ———

  private flushing = false;

  async flush(all: boolean) {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const now = Date.now();
      for (const e of this.cache.values()) {
        if (e.dirty) await this.writeEntry(e);
        if (!e.dirty && (all || now - e.lastAccess > 30 * 60000)) this.cache.delete(e.id);
      }
      await this.flushLedger();
    } catch (err) {
      this.log.error(`flush failed: ${String(err)}`);
    } finally {
      this.flushing = false;
    }
  }

  /** Записать накопленный ledger. */
  async flushLedger() {
    if (!this.ledgerQueue.length) return;
    const rows = this.ledgerQueue.splice(0, this.ledgerQueue.length);
    try {
      await this.insertLedger(rows);
    } catch (err) {
      // не теряем записи: вернём в очередь до следующей попытки
      this.ledgerQueue.unshift(...rows);
      throw err;
    }
  }

  private async insertLedger(rows: unknown[][], tx?: PoolClient) {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const params: unknown[] = [];
      const values = chunk.map((r, j) => {
        params.push(...r);
        const b = j * 6;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
      });
      await (tx ?? this.db.pool).query(`INSERT INTO ledger (player_id, currency, delta, balance, source, action_id) VALUES ${values.join(',')}`, params);
    }
  }

  async flushOne(id: string) {
    const e = this.cache.get(id);
    if (e?.dirty) await this.writeEntry(e);
  }

  private async writeEntry(e: Entry, tx?: PoolClient) {
    e.dirty = false;
    const s = e.state;
    let power = 0;
    try {
      power = partyPower(this.balance.get(), s);
    } catch {
      /* не критично */
    }
    try {
      await (tx ?? this.db.pool).query(
        `UPDATE players SET state = $2, version = version + 1, max_stage = $3, tower = $4, arena_rating = $5, power = $6,
           dev_used = dev_used OR $7, lang = $8, updated_at = now(), last_seen_at = to_timestamp($9 / 1000.0)
         WHERE id = $1`,
        [e.id, s, s.progress.maxGlobalEver, s.modes.tower, s.modes.arena.rating, power, s.dev.used, s.settings.lang, s.lastSeen],
      );
    } catch (err) {
      e.dirty = true;
      throw err;
    }
  }

  trackServer(id: string, events: GameEvent[]) {
    this.analytics.track(id, events);
  }
}
