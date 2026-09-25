import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { GameEvent } from '@idle/shared';
import { DbService } from '../db/db.service';
import { env } from '../env';

/**
 * Аналитические события: прохождение этапов, поражения от боссов, призывы, покупки,
 * реклама, сбор офлайн-наград, шаги обучения. Пишутся в PostgreSQL и (опционально) в PostHog.
 */
@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Analytics');
  private queue: { player: string | null; name: string; props: unknown; at: number }[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(DbService) private readonly db: DbService) {}

  onModuleInit() {
    // в serverless очередь сбрасывается в конце каждого запроса (см. serverless.ts)
    if (!env.serverless) this.timer = setInterval(() => void this.flush(), 5000);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  track(player: string | null, events: GameEvent[]) {
    const at = Date.now();
    for (const e of events) this.queue.push({ player, name: e.name, props: e.props ?? null, at });
    if (this.queue.length > 5000) void this.flush();
  }

  async flush() {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      for (let i = 0; i < batch.length; i += 500) {
        const chunk = batch.slice(i, i + 500);
        const params: unknown[] = [];
        const values = chunk.map((e, j) => {
          params.push(e.player, e.name, JSON.stringify(e.props), new Date(e.at));
          const b = j * 4;
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
        });
        await this.db.query(`INSERT INTO analytics_events (player_id, name, props, at) VALUES ${values.join(',')}`, params);
      }
    } catch (e) {
      this.log.warn(`analytics flush failed: ${String(e)}`);
    }
    if (env.posthogKey) {
      try {
        await fetch(`${env.posthogHost}/batch/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: env.posthogKey,
            batch: batch.map((e) => ({ event: e.name, distinct_id: e.player ?? 'server', properties: e.props ?? {}, timestamp: new Date(e.at).toISOString() })),
          }),
        });
      } catch (e) {
        this.log.warn(`posthog: ${String(e)}`);
      }
    }
  }
}
