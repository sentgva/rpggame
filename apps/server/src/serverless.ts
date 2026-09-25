/**
 * Точка входа для Vercel Functions: всё API (NestJS) в одной функции.
 * Приложение создаётся один раз на инстанс; после ответа через waitUntil дописываются
 * аналитика и фоновые задачи, чтобы инстанс не заморозили раньше времени.
 */
import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { waitUntil } from '@vercel/functions';
import { createApp } from './app.factory';
import { drainBackground } from './common/background';
import { AnalyticsService } from './game/analytics.service';
import { PlayerService } from './game/player.service';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let ready: Promise<{ handle: Handler; after: () => Promise<void> }> | null = null;

async function init() {
  const app = await createApp();
  await app.init();
  const analytics = app.get(AnalyticsService);
  const players = app.get(PlayerService);
  const handle = app.getHttpAdapter().getInstance() as Handler;
  const after = async () => {
    await drainBackground();
    await players.flushLedger().catch(() => undefined);
    await analytics.flush();
  };
  return { handle, after };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) ready = init().catch((e) => {
    ready = null;
    throw e;
  });
  let app;
  try {
    app = await ready;
  } catch (e) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'server' }, message: String((e as Error).message ?? e) }));
    return;
  }
  res.on('finish', () => waitUntil(app.after()));
  app.handle(req, res);
}
