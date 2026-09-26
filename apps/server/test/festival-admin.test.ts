import { FESTIVAL_EPOCH, festivalAt, festivalUpcoming, type FestivalSchedule } from '@idle/shared';
import { describe, expect, it } from 'vitest';
import { MSK, festStatusText, parseWhen, runFestCommand } from '../src/bot/festival-admin';

const DAY = 86400000;
const now = FESTIVAL_EPOCH + 2 * DAY + 5 * 3600000;

describe('/fest — праздники из бота', () => {
  it('даты по Москве: ДД.ММ, год, время, конец дня', () => {
    const a = parseWhen(['25.10'], 0, now)!;
    expect(new Date(a.ms + MSK).toISOString().slice(0, 16)).toBe('2026-10-25T00:00');
    const b = parseWhen(['25.10', '18:30'], 0, now)!;
    expect(b.next).toBe(2);
    expect(new Date(b.ms + MSK).toISOString().slice(11, 16)).toBe('18:30');
    const e = parseWhen(['01.11'], 0, now, true)!;
    expect(new Date(e.ms + MSK).toISOString().slice(0, 16)).toBe('2026-11-02T00:00');
    // дата уже прошла в этом году — значит, следующий
    expect(new Date(parseWhen(['01.02'], 0, now)!.ms + MSK).getUTCFullYear()).toBe(2027);
    expect(parseWhen(['31.02'], 0, now)).toBeNull();
    expect(parseWhen(['завтра'], 0, now)).toBeNull();
  });

  it('start / stop / plan / end / del / auto', () => {
    let sched: FestivalSchedule | null = null;
    const run = (args: string, at = now) => {
      const r = runFestCommand('ru', args, sched, at);
      if (r.changed) sched = r.changed;
      return r;
    };
    expect(run('').changed).toBeNull();
    expect(run('start сакура 5').msg).toContain('Цветение Сакуры');
    expect(festivalAt(now + DAY, sched)!.def.id).toBe('sakura');
    expect(festivalAt(now + 6 * DAY, sched)).toBeNull();
    expect(run('start луна 0').msg).toContain('⚠️');
    expect(run('start дракон').msg).toContain('⚠️');
    expect(run('plan приливы 20.10 25.10').msg).toContain('Запланирован');
    expect(run('plan луна 22.10 30.10').msg).toContain('Пересекается');
    expect(festivalUpcoming(now, sched).map((x) => x.def.id)).toEqual(['sakura', 'tides']);
    expect(run('end 01.10').msg).toContain('01.10');
    expect(run('del 2').msg).toContain('№2');
    expect(festivalUpcoming(now, sched).map((x) => x.def.id)).toEqual(['sakura']);
    expect(run('stop').msg).toContain('остановлен');
    expect(festivalAt(now + 1000, sched)).toBeNull();
    expect(run('stop', now + 2000).msg).toContain('⚠️');
    expect(festStatusText('ru', sched, now + 2000)).toContain('Сейчас праздника нет');
    run('auto');
    expect(sched!.mode).toBe('auto');
    expect(festStatusText('en', sched, now)).toContain('auto rotation');
    expect(run('fly').msg).toContain('⚠️');
  });
});
