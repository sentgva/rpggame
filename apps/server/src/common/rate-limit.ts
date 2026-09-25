import { Inject, Injectable } from '@nestjs/common';
import { env } from '../env';
import { CacheService } from './cache.service';

/** Ограничение частоты запросов: окно в 1 минуту. */
@Injectable()
export class RateLimiter {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {}

  async hit(key: string, perMin = env.rateLimitPerMin): Promise<boolean> {
    const bucket = Math.floor(Date.now() / 60000);
    const n = await this.cache.incr(`rl:${key}:${bucket}`, 70);
    return n <= perMin;
  }
}
