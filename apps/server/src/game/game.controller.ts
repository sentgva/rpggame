import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { validateInitData } from '../auth/telegram';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { signSession } from '../auth/session';
import { BalanceService } from '../balance/balance.service';
import { RateLimiter } from '../common/rate-limit';
import { DevService } from '../dev/dev.service';
import { env, isDevUser } from '../env';
import { PlayerService } from './player.service';

@Controller('api')
export class GameController {
  constructor(
    @Inject(PlayerService) private readonly players: PlayerService,
    @Inject(BalanceService) private readonly balance: BalanceService,
    @Inject(DevService) private readonly dev: DevService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  @Get('health')
  health() {
    return { ok: true, time: Date.now(), config: this.balance.version };
  }

  @Get('config')
  config() {
    return { cfg: this.balance.get(), version: this.balance.version };
  }

  /** Вход: проверка подписи initData на каждой сессии, аккаунт привязан к Telegram ID. */
  @Post('auth')
  @HttpCode(200)
  async auth(@Body() body: { initData?: string; startParam?: string; lang?: string; devUser?: string }, @Req() req: Request) {
    if (!(await this.limiter.hit(`ip:${req.ip}`, 60))) return { ok: false, error: { code: 'rateLimit' } };
    const data = validateInitData(String(body?.initData ?? ''), env.botToken, env.authMaxAgeSec);
    let uid: string;
    let profile: { username?: string; firstName?: string; lang: 'ru' | 'en' };
    let startParam = data?.startParam ?? body?.startParam;
    if (data) {
      uid = String(data.user.id);
      const code = data.user.language_code ?? body?.lang ?? 'ru';
      profile = { username: data.user.username, firstName: data.user.first_name, lang: /^(ru|uk|be|kk)/.test(code) ? 'ru' : 'en' };
    } else if (env.allowInsecureAuth) {
      // только для локальной разработки без Telegram
      uid = String(body?.devUser ?? 'dev-local').slice(0, 32);
      profile = { firstName: 'Dev', lang: body?.lang === 'en' ? 'en' : 'ru' };
    } else {
      return { ok: false, error: { code: 'auth' } };
    }
    if (startParam && !/^[\w-]{1,64}$/.test(startParam)) startParam = undefined;
    const { state } = await this.players.getOrCreate(uid, profile, startParam);
    this.players.trackServer(uid, [{ name: 'session_start', props: { start: startParam ?? null } }]);
    return {
      ok: true,
      token: signSession(uid),
      state,
      cfg: this.balance.get(),
      now: Date.now(),
      isDev: isDevUser(uid),
      flags: { social: env.socialEnabled },
      botUsername: env.botUsername || undefined,
      appName: env.appName || undefined,
    };
  }

  /** Действие игрока: сервер применяет его общим движком и отвечает хэшем состояния. */
  @Post('action')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async action(@Req() req: AuthedRequest, @Body() body: { id?: string; action?: { type?: string } }) {
    const id = typeof body?.id === 'string' ? body.id.slice(0, 64) : `${Date.now()}`;
    if (!body?.action || typeof body.action.type !== 'string') return { ok: false, error: { code: 'badParam' } };
    return this.players.applyClient(req.uid, id, body.action as never);
  }

  @Get('state')
  @UseGuards(AuthGuard)
  async state(@Req() req: AuthedRequest) {
    return { state: await this.players.getState(req.uid), now: Date.now() };
  }


  @Post('dev')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async devOp(@Req() req: AuthedRequest, @Body() body: { op?: string; body?: unknown }) {
    return this.dev.handle(req.uid, String(body?.op ?? ''), body?.body);
  }
}
