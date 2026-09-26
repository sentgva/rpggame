import { CHANGELOG } from '@idle/shared';
import { describe, expect, it } from 'vitest';
import { newsText } from '../src/bot/bot.service';

describe('/news', () => {
  it('последние записи на языке бота, без сырого HTML', () => {
    const ru = newsText('ru');
    expect(ru).toContain(CHANGELOG[0].title.ru);
    expect(ru).toContain(CHANGELOG[0].items[0].ru);
    expect(ru).not.toContain(CHANGELOG[3]?.title.ru ?? '\u0000');
    const en = newsText('en', 1);
    expect(en).toContain(CHANGELOG[0].title.en);
    expect(en).not.toContain(CHANGELOG[1].title.en);
    // теги — только наши (b, i); «<» в тексте экранирован
    expect(ru.replace(/<\/?(b|i)>/g, '')).not.toMatch(/[<>]/);
    expect(ru.length).toBeLessThan(4096);
  });
});
