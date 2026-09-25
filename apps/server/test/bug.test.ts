import { describe, expect, it } from 'vitest';

/** Баг-репорты: экранирование HTML, фильтр получателей, лимит, сохранение. */
describe('BugService', () => {
  async function make(devIds: string) {
    process.env.DEV_USER_IDS = devIds;
    process.env.BUG_REPORT_CHAT_ID = '';
    const { vi } = await import('vitest');
    vi.resetModules();
    const { BugService } = await import('../src/bug/bug.service');
    const sent: { chat: string; html: string }[] = [];
    const saved: unknown[][] = [];
    const counters = new Map<string, number>();
    const bot = {
      onBugCommand: null as unknown,
      async sendHtml(chat: string, html: string) {
        sent.push({ chat, html });
        return true;
      },
    };
    const db = {
      async one() {
        return { username: 'tester', first_name: 'Ann <3', power: 12345 };
      },
      async query(_sql: string, params: unknown[]) {
        saved.push(params);
        return [];
      },
    };
    const cache = {
      async incr(key: string) {
        const n = (counters.get(key) ?? 0) + 1;
        counters.set(key, n);
        return n;
      },
    };
    const players = { async getState() {
      return null;
    } };
    const svc = new BugService(db as never, bot as never, cache as never, players as never);
    return { svc, sent, saved, bot };
  }

  it('шлёт разработчикам с числовым ID и экранирует HTML', async () => {
    const { svc, sent, saved, bot } = await make('123456,dev-local');
    const r = await svc.report('42', 'Кнопка <b>пропала</b> & всё', { platform: 'ios', errors: ['<x>'], evil: { a: 1 } });
    expect(r).toEqual({ ok: true, delivered: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].chat).toBe('123456');
    expect(sent[0].html).toContain('Кнопка &lt;b&gt;пропала&lt;/b&gt; &amp; всё');
    expect(sent[0].html).toContain('Ann &lt;3');
    expect(sent[0].html).toContain('&lt;x&gt;');
    expect(sent[0].html).not.toContain('evil');
    expect(saved[0][0]).toBe('42');
    expect(typeof bot.onBugCommand).toBe('function');
  });

  it('короткий текст отклоняется, дневной лимит работает', async () => {
    const { svc } = await make('1');
    expect((await svc.report('7', 'no', {})).ok).toBe(false);
    let last = { ok: true } as { ok: boolean; error?: { code: string } };
    for (let i = 0; i < 16; i++) last = await svc.report('7', 'long enough text', {});
    expect(last.ok).toBe(false);
    expect(last.error?.code).toBe('rateLimit');
  });
});
