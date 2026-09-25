import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '256kb' });
  app.enableShutdownHooks();

  // вебхук бота (если задан WEBHOOK_URL)
  const bots = app.get(BotService);
  if (bots.bot && env.botMode === 'webhook' && env.webhookUrl) {
    await bots.bot.init();
    const handler = webhookCallback(bots.bot, 'express', { secretToken: env.webhookSecret || undefined });
    app.getHttpAdapter().post('/api/bot/webhook', handler as never);
  }

  // статика клиента (один контейнер: API + Mini App)
  const staticDir = env.staticDir || resolve(__dirname, '../../client/dist');
  if (existsSync(staticDir)) {
    app.useStaticAssets(staticDir, { index: false, maxAge: '1h' });
    const indexHtml = join(staticDir, 'index.html');
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
    Logger.log(`serving client from ${staticDir}`, 'Static');
  }

  await app.listen(env.port, '0.0.0.0');
  Logger.log(`Idle RPG server on :${env.port} (${env.nodeEnv})`, 'Main');
}

void bootstrap();
