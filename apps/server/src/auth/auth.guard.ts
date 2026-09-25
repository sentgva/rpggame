import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimiter } from '../common/rate-limit';
import { verifySession } from './session';

export interface AuthedRequest extends Request {
  uid: string;
}

/** Проверка сессии + rate-limit на все игровые эндпоинты. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(RateLimiter) private readonly limiter: RateLimiter) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    const s = verifySession(token);
    if (!s) throw new UnauthorizedException();
    if (!(await this.limiter.hit(`u:${s.uid}`))) throw new HttpException('rate limit', HttpStatus.TOO_MANY_REQUESTS);
    req.uid = s.uid;
    return true;
  }
}
