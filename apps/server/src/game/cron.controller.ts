import { Controller, ForbiddenException, Get, Headers, Inject } from '@nestjs/common';
import { env } from '../env';
import { NotifyService } from '../notify/notify.service';

/** Задачи по расписанию для serverless (Vercel Cron присылает Authorization: Bearer CRON_SECRET). */
@Controller('api/cron')
export class CronController {
  constructor(@Inject(NotifyService) private readonly notify: NotifyService) {}

  @Get('notify')
  async runNotify(@Headers('authorization') auth?: string) {
    if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) throw new ForbiddenException();
    return this.notify.tick();
  }
}
