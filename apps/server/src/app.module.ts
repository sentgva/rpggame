import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AuthGuard } from './auth/auth.guard';
import { BalanceService } from './balance/balance.service';
import { BotService } from './bot/bot.service';
import { CacheService } from './common/cache.service';
import { RateLimiter } from './common/rate-limit';
import { DbService } from './db/db.service';
import { DevService } from './dev/dev.service';
import { AnalyticsService } from './game/analytics.service';
import { CronController } from './game/cron.controller';
import { GameController } from './game/game.controller';
import { PlayerService } from './game/player.service';
import { NotifyService } from './notify/notify.service';
import { PaymentsService } from './payments/payments.service';
import { SocialService } from './social/social.service';

@Module({
  controllers: [GameController, AdminController, CronController],
  providers: [
    DbService,
    BalanceService,
    CacheService,
    RateLimiter,
    AuthGuard,
    AnalyticsService,
    PlayerService,
    BotService,
    PaymentsService,
    NotifyService,
    SocialService,
    DevService,
  ],
})
export class AppModule {}
