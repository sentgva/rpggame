import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';
import { env } from './env';

/** Nest-приложение с общими настройками: используется и обычным сервером, и функцией Vercel. */
export async function createApp(): Promise<NestExpressApplication> {
  // адаптер передаём явно: так бандлер Vercel видит статический require платформы
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), { bodyParser: true });
  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '256kb' });

  // вебхук бота
  const bots = app.get(BotService);
  const bot = bots.bot;
  if (bot && env.botMode === 'webhook') {
    const handler = webhookCallback(bot, 'express', { secretToken: env.webhookSecret || undefined });
    const onUpdate = async (req: Request, res: Response) => {
      if (!bot.isInited()) await bot.init();
      return handler(req, res);
    };
    app.getHttpAdapter().post('/api/bot/webhook', onUpdate as never);
  }
  return app;
}
