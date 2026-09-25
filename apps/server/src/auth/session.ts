import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env';

/** Сессионный токен: base64url(payload).hmac — выдаётся после проверки initData. */
export interface Session {
  uid: string;
  exp: number;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function signSession(uid: string, ttlSec = 86400): string {
  const payload = b64(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  const sig = createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const calc = createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');
  const a = Buffer.from(calc);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (!s.uid || s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}
