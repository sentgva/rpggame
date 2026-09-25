import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { attachDatabasePool } from '@vercel/functions';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { env } from '../env';
import { MIGRATIONS } from './migrations';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Db');
  // в serverless инстансов много: держим мало соединений и быстро их отпускаем (Neon — через pooler)
  readonly pool = env.serverless
    ? new Pool({ connectionString: env.databaseUrl, max: 4, idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000 })
    : new Pool({ connectionString: env.databaseUrl, max: 20 });

  async onModuleInit() {
    // Vercel Fluid: закрывать простаивающие соединения до заморозки инстанса
    if (env.serverless) attachDatabasePool(this.pool);
    await this.migrate();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await this.pool.query<T>(sql, params);
    return r.rows;
  }

  async one<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }

  private async migrate() {
    await this.pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const done = new Set((await this.query<{ id: number }>('SELECT id FROM schema_migrations')).map((r) => r.id));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await this.tx(async (c) => {
        await c.query(m.sql);
        await c.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
      });
      this.log.log(`migration ${m.id} applied`);
    }
  }
}
