import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createApp } from './app.factory';
import { env } from './env';

async function bootstrap() {
  const app = await createApp();
  app.enableShutdownHooks();

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
