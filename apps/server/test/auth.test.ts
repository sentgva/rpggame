import { describe, expect, it } from 'vitest';
import { signInitData, validateInitData } from '../src/auth/telegram';
import { signSession, verifySession } from '../src/auth/session';

const TOKEN = '123456:TEST-TOKEN';
const now = Date.UTC(2026, 8, 25, 12);
const user = JSON.stringify({ id: 777, first_name: 'Лира', language_code: 'ru' });

describe('initData', () => {
  it('принимает корректную подпись', () => {
    const raw = signInitData({ auth_date: String(Math.floor(now / 1000) - 60), user, query_id: 'AAA', start_param: 'ref_42' }, TOKEN);
    const d = validateInitData(raw, TOKEN, 86400, now);
    expect(d?.user.id).toBe(777);
    expect(d?.startParam).toBe('ref_42');
  });

  it('отклоняет подделку', () => {
    const raw = signInitData({ auth_date: String(Math.floor(now / 1000)), user }, TOKEN);
    const tampered = raw.replace('777', '778');
    expect(validateInitData(tampered, TOKEN, 86400, now)).toBeNull();
    expect(validateInitData(raw, 'other:token', 86400, now)).toBeNull();
  });

  it('отклоняет устаревшие данные', () => {
    const raw = signInitData({ auth_date: String(Math.floor(now / 1000) - 90000), user }, TOKEN);
    expect(validateInitData(raw, TOKEN, 86400, now)).toBeNull();
  });
});

describe('сессии', () => {
  it('подпись и проверка', () => {
    const t = signSession('777', 60);
    expect(verifySession(t)?.uid).toBe('777');
    expect(verifySession(t + 'x')).toBeNull();
    expect(verifySession('garbage')).toBeNull();
  });
});
