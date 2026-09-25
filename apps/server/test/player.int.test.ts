import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { stateHash, applyAction, DEFAULT_CONFIG } from '@idle/shared';

const url = process.env.TEST_DATABASE_URL;

/** Интеграционный тест с настоящим PostgreSQL (задайте TEST_DATABASE_URL). */
describe.skipIf(!url)('PlayerService + PostgreSQL', () => {
  let players: any;
  let db: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.DEV_MODE_ENABLED = '1';
    process.env.DEV_USER_IDS = 'dev1';
    const { DbService } = await import('../src/db/db.service');
    const { BalanceService } = await import('../src/balance/balance.service');
    const { AnalyticsService } = await import('../src/game/analytics.service');
    const { PlayerService } = await import('../src/game/player.service');
    db = new DbService();
    await db.onModuleInit();
    await db.query("DELETE FROM players WHERE id IN ('u1','dev1')");
    const balance = new BalanceService();
    balance.onModuleInit();
    players = new PlayerService(db, balance, new AnalyticsService(db));
  });

  afterAll(async () => {
    await players?.flush(true);
    await db?.onModuleDestroy();
  });

  it('создаёт игрока и применяет действия, хэш совпадает с клиентским движком', async () => {
    const { state } = await players.getOrCreate('u1', { firstName: 'Test', lang: 'ru' });
    const client = structuredClone(state);
    const res = await players.applyClient('u1', 'a1', { type: 'battle.wave' });
    expect(res.ok).toBe(true);
    const local = applyAction(client, { type: 'battle.wave' }, { cfg: DEFAULT_CONFIG, now: res.now });
    expect(stateHash(local.state)).toBe(res.hash);
  });

  it('повтор с тем же id не применяется дважды', async () => {
    const a = await players.applyClient('u1', 'same', { type: 'battle.wave' });
    const b = await players.applyClient('u1', 'same', { type: 'battle.wave' });
    expect(b).toEqual(a);
  });

  it('dev-действия только для белого списка, серверные — только от сервера', async () => {
    const r1 = await players.applyClient('u1', 'd1', { type: 'dev.cur', cur: 'gold', op: 'max' });
    expect(r1.ok).toBe(false);
    await players.getOrCreate('dev1', { firstName: 'Dev', lang: 'ru' });
    const r2 = await players.applyClient('dev1', 'd2', { type: 'dev.cur', cur: 'gold', op: 'add', amount: 10 });
    expect(r2.ok).toBe(true);
    const mail = { id: 'gift1', title: { ru: 'Подарок', en: 'Gift' }, body: { ru: '', en: '' }, at: Date.now(), rewards: { cur: { crystals: 10 } } };
    const r3 = await players.applyClient('u1', 'p1', { type: 'mail.add', mail });
    expect(r3.ok).toBe(false);
    const r4 = await players.applyTrusted('u1', { type: 'mail.add', mail });
    expect(r4.ok).toBe(true);
  });

  it('/style в боте: стиль графики пишется в настройки, новичку — «нет игрока»', async () => {
    const { StyleService } = await import('../src/bot/style.service');
    const { artStyleOf, VECTOR_ART } = await import('@idle/shared');
    const bot = { onStyle: null as null | ((uid: string, style?: string) => Promise<string | null>) };
    const style = new StyleService(bot as never, players);
    expect(bot.onStyle).toBeTypeOf('function');
    expect(await style.handle('nobody')).toBeNull();
    expect(await style.handle('u1')).toBe(VECTOR_ART ? 'vector' : 'pixel');
    expect(await style.handle('u1', 'pixel')).toBe('pixel');
    expect((await players.getState('u1')).settings.artStyle).toBe('pixel');
    expect(await style.handle('u1', 'watercolor')).toBe('pixel');
    // сохранённый выбор не теряется, даже когда вектор выключен (VECTOR_ART = false → рисуем пикселями)
    expect(await bot.onStyle!('u1', 'vector')).toBe(artStyleOf('vector'));
    expect((await players.getState('u1')).settings.artStyle).toBe('vector');
  });

  it('состояние и ledger сохраняются в БД', async () => {
    await players.flush(true);
    const row = await db.one("SELECT state, max_stage FROM players WHERE id = 'u1'");
    expect(row.state.mail.some((m: { id: string }) => m.id === 'gift1')).toBe(true);
    const ledger = await db.query("SELECT * FROM ledger WHERE player_id = 'u1'");
    expect(ledger.length).toBeGreaterThan(0);
  });
});
