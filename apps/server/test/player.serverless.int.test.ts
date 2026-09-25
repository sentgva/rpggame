import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const url = process.env.TEST_DATABASE_URL;

/**
 * Serverless-режим (Vercel): без кэша в памяти, строка игрока блокируется в транзакции.
 * Два «инстанса» PlayerService с общей БД имитируют параллельные функции.
 */
describe.skipIf(!url)('PlayerService в serverless-режиме', () => {
  let a: any;
  let b: any;
  let db: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.SERVERLESS = '1';
    const { DbService } = await import('../src/db/db.service');
    const { BalanceService } = await import('../src/balance/balance.service');
    const { AnalyticsService } = await import('../src/game/analytics.service');
    const { PlayerService } = await import('../src/game/player.service');
    db = new DbService();
    await db.onModuleInit();
    await db.query("DELETE FROM players WHERE id = 'sls1'");
    await db.query("DELETE FROM action_results WHERE player_id = 'sls1'");
    const balance = new BalanceService();
    balance.onModuleInit();
    a = new PlayerService(db, balance, new AnalyticsService(db));
    b = new PlayerService(db, balance, new AnalyticsService(db));
  });

  afterAll(async () => {
    await db?.onModuleDestroy();
  });

  it('действия сразу сохраняются в БД и видны другому инстансу', async () => {
    await a.getOrCreate('sls1', { firstName: 'Sls', lang: 'ru' });
    const r = await a.applyClient('sls1', 'w1', { type: 'battle.wave' });
    expect(r.ok).toBe(true);
    const s = await b.getState('sls1');
    expect(s.progress.wave).toBe(1);
  });

  it('параллельные действия с разных инстансов не теряются', async () => {
    const res = await Promise.all([a.applyClient('sls1', 'w2', { type: 'battle.wave' }), b.applyClient('sls1', 'w3', { type: 'battle.wave' })]);
    expect(res.every((x: any) => x.ok)).toBe(true);
    const s = await a.getState('sls1');
    expect(s.progress.wave).toBe(3);
  });

  it('повтор action id на другом инстансе возвращает тот же ответ', async () => {
    const first = await b.getState('sls1');
    const again = await b.applyClient('sls1', 'w1', { type: 'battle.wave' });
    expect(again.ok).toBe(true);
    const s = await a.getState('sls1');
    expect(s.progress.wave).toBe(first.progress.wave);
  });

  it('ledger пишется в той же транзакции', async () => {
    const rows = await db.query("SELECT count(*)::int AS n FROM ledger WHERE player_id = 'sls1'");
    expect(rows[0].n).toBeGreaterThan(0);
  });
});
