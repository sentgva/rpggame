import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../env';

/** Кэш/счётчики: Redis, если задан REDIS_URL, иначе память процесса. */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly log = new Logger('Cache');
  private redis: Redis | null = null;
  private mem = new Map<string, { v: number; exp: number }>();

  constructor() {
    if (env.redisUrl) {
      this.redis = new Redis(env.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 2 });
      this.redis.on('error', (e) => this.log.warn(`redis: ${e.message}`));
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  /** Атомарный инкремент с TTL (для rate-limit). */
  async incr(key: string, ttlSec: number): Promise<number> {
    if (this.redis) {
      try {
        const n = await this.redis.incr(key);
        if (n === 1) await this.redis.expire(key, ttlSec);
        return n;
      } catch {
        /* падение Redis — не блокируем игру, считаем в памяти */
      }
    }
    const now = Date.now();
    const cur = this.mem.get(key);
    if (!cur || cur.exp < now) {
      this.mem.set(key, { v: 1, exp: now + ttlSec * 1000 });
      if (this.mem.size > 50000) for (const [k, x] of this.mem) if (x.exp < now) this.mem.delete(k);
      return 1;
    }
    cur.v++;
    return cur.v;
  }
}
