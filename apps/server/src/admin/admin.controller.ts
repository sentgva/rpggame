import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { BalanceService } from '../balance/balance.service';
import { BotService } from '../bot/bot.service';
import { DbService } from '../db/db.service';
import { env } from '../env';
import { PlayerService } from '../game/player.service';

/**
 * Админ-API (заголовок X-Admin-Token): поиск игрока, компенсации, рассылки,
 * возвраты, флаги, перезагрузка конфигов, базовая статистика.
 */
@Controller('api/admin')
export class AdminController {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(PlayerService) private readonly players: PlayerService,
    @Inject(BotService) private readonly bots: BotService,
    @Inject(BalanceService) private readonly balance: BalanceService,
  ) {}

  private check(token?: string) {
    if (!env.adminToken || token !== env.adminToken) throw new ForbiddenException();
  }

  @Get('players')
  async search(@Headers('x-admin-token') token: string, @Query('q') q = '') {
    this.check(token);
    return this.db.query(
      `SELECT id, username, first_name, max_stage, tower, power, dev_used, created_at, last_seen_at FROM players
       WHERE id = $1 OR username ILIKE $2 OR first_name ILIKE $2 ORDER BY last_seen_at DESC LIMIT 50`,
      [q, `%${q}%`],
    );
  }

  @Get('player/:id')
  async player(@Headers('x-admin-token') token: string, @Param('id') id: string) {
    this.check(token);
    const state = await this.players.getState(id);
    const ledger = await this.db.query('SELECT * FROM ledger WHERE player_id = $1 ORDER BY at DESC LIMIT 100', [id]);
    return { state, ledger };
  }

  /** Компенсация письмом одному игроку или всем. */
  @Post('mail')
  @HttpCode(200)
  async mail(@Headers('x-admin-token') token: string, @Body() body: { to: string; id: string; title: { ru: string; en: string }; body: { ru: string; en: string }; rewards?: unknown }) {
    this.check(token);
    const ids = body.to === 'all' ? (await this.db.query<{ id: string }>('SELECT id FROM players')).map((r) => r.id) : [body.to];
    let n = 0;
    for (const id of ids) {
      const r = await this.players.applyTrusted(id, { type: 'mail.add', mail: { id: body.id, title: body.title, body: body.body, at: Date.now(), rewards: body.rewards } }, 'admin:mail');
      if (r.ok) n++;
    }
    return { ok: true, sent: n };
  }

  @Post('broadcast')
  @HttpCode(200)
  async broadcast(@Headers('x-admin-token') token: string, @Body() body: { text: string }) {
    this.check(token);
    const rows = await this.db.query<{ id: string; lang: string }>(
      "SELECT id, COALESCE((SELECT lang FROM bot_users b WHERE b.tg_id = players.id), state->'settings'->>'lang', lang) AS lang FROM players WHERE (state->'settings'->>'notify')::boolean IS TRUE",
    );
    let sent = 0;
    for (const r of rows) {
      if (await this.bots.send(r.id, body.text, r.lang === 'en' ? 'en' : 'ru')) sent++;
      await new Promise((res) => setTimeout(res, 40));
    }
    return { ok: true, sent };
  }

  @Post('config/reload')
  @HttpCode(200)
  reload(@Headers('x-admin-token') token: string) {
    this.check(token);
    return this.balance.reload();
  }

  /** Зарегистрировать вебхук, команды и кнопку меню бота (нужно один раз после деплоя на Vercel). */
  @Post('bot/setup')
  @HttpCode(200)
  async botSetup(@Headers('x-admin-token') token: string) {
    this.check(token);
    return this.bots.setup();
  }

  @Get('stats')
  async stats(@Headers('x-admin-token') token: string) {
    this.check(token);
    const [players] = await this.db.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE last_seen_at > now() - interval '1 day')::int AS dau FROM players");
    const events = await this.db.query("SELECT name, count(*)::int AS n FROM analytics_events WHERE at > now() - interval '1 day' GROUP BY name ORDER BY n DESC LIMIT 30");
    return { players, events };
  }
}
