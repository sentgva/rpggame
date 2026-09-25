import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { capMinutes, x2Active, type PlayerState } from '@idle/shared';
import { BalanceService } from '../balance/balance.service';
import { BotService } from '../bot/bot.service';
import { DbService } from '../db/db.service';
import { env } from '../env';

const TEXT = {
  ru: 'Сундук полон! Отряд ждёт вас с добычей.',
  en: 'Your chest is full! The party is waiting with loot.',
};

/** Push через бота, когда сундук заполнен на 100% (не чаще 1 раза в 12 ч, не более 2 в день, отключаемо). */
@Injectable()
export class NotifyService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Notify');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(BotService) private readonly bots: BotService,
    @Inject(BalanceService) private readonly balance: BalanceService,
  ) {}

  onModuleInit() {
    if (!env.notificationsEnabled) return;
    this.timer = setInterval(() => void this.tick(), 10 * 60000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  chestFull(s: PlayerState, now: number): boolean {
    const cfg = this.balance.get();
    const elapsed = Math.max(0, now - s.chest.since) / 60000;
    const rate = x2Active(s, now) ? 2 : 1;
    return s.chest.minutes + elapsed * rate >= capMinutes(cfg, s, now);
  }

  async tick() {
    if (!this.bots.bot) return;
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.db.query<{ id: string; state: PlayerState; notify_day: string | null; notify_count: number }>(
      `SELECT id, state, notify_day, notify_count FROM players
       WHERE (state->'settings'->>'notify')::boolean IS TRUE
         AND last_seen_at < now() - interval '1 hour'
         AND (notify_at IS NULL OR notify_at < now() - interval '12 hours')
       ORDER BY last_seen_at ASC LIMIT 300`,
    );
    const now = Date.now();
    for (const r of rows) {
      const count = r.notify_day === today ? r.notify_count : 0;
      if (count >= 2) continue;
      if (!this.chestFull(r.state, now)) continue;
      const lang = r.state.settings.lang;
      const ok = await this.bots.send(r.id, TEXT[lang], lang);
      await this.db.query('UPDATE players SET notify_at = now(), notify_day = $2, notify_count = $3 WHERE id = $1', [r.id, today, ok ? count + 1 : count]);
      await new Promise((res) => setTimeout(res, 50));
    }
    if (rows.length) this.log.log(`checked ${rows.length} players`);
  }
}
