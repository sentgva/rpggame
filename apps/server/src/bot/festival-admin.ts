import {
  FESTIVALS,
  FESTIVAL_DAYS,
  festivalAt,
  festivalUpcoming,
  scheduleAuto,
  schedulePlan,
  scheduleRemove,
  scheduleSetEnd,
  scheduleStart,
  scheduleStop,
  type FestivalId,
  type FestivalSchedule,
  type ScheduleResult,
} from '@idle/shared';
import { InlineKeyboard } from 'grammy';

/**
 * Управление праздниками из бота (только разработчик, DEV_USER_IDS):
 * запуск и остановка, даты, возврат к автоматической ротации. Время — московское.
 */
type Lang = 'ru' | 'en';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** Даты в командах — по Москве (UTC+3). */
export const MSK = 3 * HOUR;

const FEST_ICON: Record<FestivalId, string> = { bloodmoon: '🌕', tides: '🌊', sakura: '🌸' };

const ALIASES: Record<string, FestivalId> = {
  bloodmoon: 'bloodmoon',
  moon: 'bloodmoon',
  luna: 'bloodmoon',
  луна: 'bloodmoon',
  'кровавая': 'bloodmoon',
  tides: 'tides',
  tide: 'tides',
  sea: 'tides',
  приливы: 'tides',
  прилив: 'tides',
  sakura: 'sakura',
  сакура: 'sakura',
};

function parseFest(s: string | undefined): FestivalId | null {
  return (s && ALIASES[s.toLowerCase()]) || null;
}

/**
 * Дата «ДД.ММ[.ГГГГ]» и, по желанию, следующим словом время «ЧЧ:ММ» — по Москве.
 * Без времени: начало дня, а для даты конца (endOfDay) — конец этого дня.
 * Без года: ближайшая такая дата (не раньше `after`, если он задан, иначе не в прошлом).
 */
export function parseWhen(tokens: string[], i: number, now: number, endOfDay = false, after?: number): { ms: number; next: number } | null {
  const m = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/.exec(tokens[i] ?? '');
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (day < 1 || day > 31 || month < 0 || month > 11) return null;
  let hh = 0;
  let mm = 0;
  let next = i + 1;
  const t = /^(\d{1,2}):(\d{2})$/.exec(tokens[i + 1] ?? '');
  if (t) {
    hh = Number(t[1]);
    mm = Number(t[2]);
    if (hh > 23 || mm > 59) return null;
    next = i + 2;
  }
  const at = (year: number) => {
    const ms = Date.UTC(year, month, day, hh, mm) - MSK;
    return !t && endOfDay ? ms + DAY : ms;
  };
  const nowYear = new Date(now + MSK).getUTCFullYear();
  let ms: number;
  if (m[3]) ms = at(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]));
  else {
    ms = at(nowYear);
    const floor = after ?? now - DAY;
    if (ms <= floor) ms = at(nowYear + 1);
  }
  // 31.02 и подобные даты Date.UTC «переносит» — такие отвергаем
  if (new Date(ms + MSK - (!t && endOfDay ? DAY : 0)).getUTCDate() !== day) return null;
  return { ms, next };
}

/** «ДД.ММ ЧЧ:ММ» по Москве. */
function fmtDate(ms: number): string {
  const d = new Date(ms + MSK);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** Конец праздника: полночь показываем как «24:00» предыдущего дня — «по 01.10 включительно». */
function fmtEnd(ms: number): string {
  const d = new Date(ms + MSK);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return fmtDate(ms - 60000).replace(/ \d\d:\d\d$/, ' 24:00');
  return fmtDate(ms);
}

function fmtLeft(ms: number, lang: Lang): string {
  const h = Math.max(0, Math.floor(ms / HOUR));
  const d = Math.floor(h / 24);
  return lang === 'ru' ? (d ? `${d} д ${h % 24} ч` : `${h} ч`) : d ? `${d}d ${h % 24}h` : `${h}h`;
}

const T = {
  ru: {
    title: '🎉 <b>Праздники Легиона</b>',
    modeAuto: `Режим: <b>авто-ротация</b> — праздники идут по кругу по ${FESTIVAL_DAYS} дней`,
    modeManual: 'Режим: <b>вручную</b> — праздники идут только по расписанию ниже',
    now: 'Сейчас',
    none: 'Сейчас праздника нет',
    left: 'осталось',
    next: 'Далее',
    empty: 'В расписании больше ничего нет',
    tz: 'Время — московское (МСК).',
    help: [
      '<b>Команды</b>',
      '<code>/fest start луна 7</code> — запустить сейчас на 7 дней (без числа — на 14)',
      '<code>/fest stop</code> — остановить текущий праздник',
      '<code>/fest plan сакура 25.10 01.11</code> — запланировать на даты (можно с временем: <code>25.10 18:00</code>)',
      '<code>/fest end 12.10</code> — новая дата конца текущего праздника',
      '<code>/fest del 2</code> — убрать запись №2 из списка',
      '<code>/fest auto</code> — вернуть авто-ротацию',
      'Праздники: <code>луна</code> (Кровавая Луна), <code>приливы</code>, <code>сакура</code>.',
      'Прогресс игроков сохраняется, если продлить или укоротить идущий праздник; новый праздник начинается с нуля.',
    ].join('\n'),
    started: (n: string, end: string) => `✅ Запущен ${n} — до ${end} МСК`,
    stopped: '⏹ Праздник остановлен. Дальше — только по расписанию (или <code>/fest auto</code>).',
    planned: (n: string, a: string, b: string) => `📅 Запланирован ${n}: ${a} → ${b} МСК`,
    ended: (b: string) => `✅ Текущий праздник закончится ${b} МСК`,
    removed: (k: number) => `🗑 Запись №${k} убрана`,
    auto: '🔁 Включена авто-ротация праздников',
    removedOverlap: (k: number) => `(снято пересекающихся записей: ${k})`,
    errFest: 'Не понял праздник. Варианты: луна, приливы, сакура.',
    errDate: 'Не понял дату. Формат: ДД.ММ или ДД.ММ.ГГГГ, время можно добавить: ДД.ММ ЧЧ:ММ.',
    errDays: 'Число дней — от 1 до 120.',
    errNum: 'Укажите номер записи из списка: /fest del 2',
    errUnknown: 'Не знаю такой команды.',
    errs: {
      badDates: 'Даты не подходят: конец должен быть позже начала, праздник — не длиннее 120 дней.',
      past: 'Эта дата уже прошла.',
      overlap: 'Пересекается с другим праздником в расписании',
      none: 'Сейчас праздника нет.',
      notFound: 'Нет записи с таким номером.',
    },
    btnStop: '⏹ Остановить',
    btnAuto: '🔁 Авто',
    btnRefresh: '🔄 Обновить',
    ownerOnly: 'Управлять праздниками может только разработчик.',
  },
  en: {
    title: '🎉 <b>Legion Festivals</b>',
    modeAuto: `Mode: <b>auto rotation</b> — festivals cycle every ${FESTIVAL_DAYS} days`,
    modeManual: 'Mode: <b>manual</b> — festivals run only by the schedule below',
    now: 'Now',
    none: 'No festival is running',
    left: 'left',
    next: 'Next',
    empty: 'Nothing else is scheduled',
    tz: 'Times are Moscow time (UTC+3).',
    help: [
      '<b>Commands</b>',
      '<code>/fest start moon 7</code> — start now for 7 days (no number — 14)',
      '<code>/fest stop</code> — stop the current festival',
      '<code>/fest plan sakura 25.10 01.11</code> — schedule by dates (time is optional: <code>25.10 18:00</code>)',
      '<code>/fest end 12.10</code> — new end date for the current festival',
      '<code>/fest del 2</code> — remove entry #2 from the list',
      '<code>/fest auto</code> — back to auto rotation',
      'Festivals: <code>moon</code> (Blood Moon), <code>tides</code>, <code>sakura</code>.',
      "Players keep their progress when the running festival is extended or shortened; a new festival starts from zero.",
    ].join('\n'),
    started: (n: string, end: string) => `✅ Started ${n} — until ${end} MSK`,
    stopped: '⏹ Festival stopped. From now on only the schedule runs (or <code>/fest auto</code>).',
    planned: (n: string, a: string, b: string) => `📅 Scheduled ${n}: ${a} → ${b} MSK`,
    ended: (b: string) => `✅ The current festival now ends ${b} MSK`,
    removed: (k: number) => `🗑 Entry #${k} removed`,
    auto: '🔁 Auto rotation is on',
    removedOverlap: (k: number) => `(overlapping entries removed: ${k})`,
    errFest: "Unknown festival. Options: moon, tides, sakura.",
    errDate: 'Unknown date. Format: DD.MM or DD.MM.YYYY, optionally followed by HH:MM.',
    errDays: 'Days must be from 1 to 120.',
    errNum: 'Give the entry number from the list: /fest del 2',
    errUnknown: 'Unknown command.',
    errs: {
      badDates: 'Bad dates: the end must be after the start and a festival can last up to 120 days.',
      past: 'That date has already passed.',
      overlap: 'Overlaps another scheduled festival',
      none: 'No festival is running.',
      notFound: 'No entry with that number.',
    },
    btnStop: '⏹ Stop',
    btnAuto: '🔁 Auto',
    btnRefresh: '🔄 Refresh',
    ownerOnly: 'Only the developer can manage festivals.',
  },
};

export function festOwnerOnly(lang: Lang): string {
  return T[lang].ownerOnly;
}

function festName(id: FestivalId, lang: Lang): string {
  const def = FESTIVALS.find((f) => f.id === id)!;
  return `${FEST_ICON[id]} «${def.name[lang]}»`;
}

/** Состояние расписания: что идёт, что дальше, какой режим. */
export function festStatusText(lang: Lang, sched: FestivalSchedule | null, now: number, withHelp = true): string {
  const L = T[lang];
  const lines = [L.title, '', sched?.mode === 'manual' ? L.modeManual : L.modeAuto, ''];
  const cur = festivalAt(now, sched);
  if (cur) lines.push(`<b>${L.now}:</b> ${festName(cur.def.id, lang)} — ${fmtDate(cur.start)} → ${fmtEnd(cur.end)} (${L.left} ${fmtLeft(cur.end - now, lang)})`);
  else lines.push(`<b>${L.none}</b>`);
  const list = festivalUpcoming(now, sched, 6);
  lines.push('', `<b>${L.next}:</b>`);
  if (!list.length) lines.push(L.empty);
  list.forEach((f, k) => lines.push(`${k + 1}. ${festName(f.def.id, lang)} — ${fmtDate(f.start)} → ${fmtEnd(f.end)}${f.start <= now ? ' ◀' : ''}`));
  lines.push('', `<i>${L.tz}</i>`);
  if (withHelp) lines.push('', L.help);
  return lines.join('\n');
}

/** Кнопки под статусом: запуск праздника на 14 дней, стоп, авто-ротация. */
export function festKeyboard(lang: Lang): InlineKeyboard {
  const L = T[lang];
  const kb = new InlineKeyboard();
  for (const f of FESTIVALS) kb.text(`▶ ${FEST_ICON[f.id]} ${f.name[lang]}`, `fest:start:${f.id}`).row();
  return kb.text(L.btnStop, 'fest:stop').text(L.btnAuto, 'fest:auto').row().text(L.btnRefresh, 'fest:status');
}

export type FestCommandResult = { changed: FestivalSchedule | null; msg: string };

function fromResult(lang: Lang, r: ScheduleResult, ok: (s: FestivalSchedule) => string): FestCommandResult {
  const L = T[lang];
  if (r.ok) return { changed: r.sched, msg: ok(r.sched) };
  let msg = L.errs[r.error];
  if (r.entry) msg += `: ${festName(r.entry.fest, lang)} ${fmtDate(r.entry.start)} → ${fmtEnd(r.entry.end)}`;
  return { changed: null, msg: `⚠️ ${msg}` };
}

/**
 * Разбор и выполнение команды /fest (без побочных эффектов: новое расписание возвращается,
 * сохраняет его вызывающий). Пустая команда или status/help — только текст.
 */
export function runFestCommand(lang: Lang, args: string, sched: FestivalSchedule | null, now: number): FestCommandResult {
  const L = T[lang];
  const tok = args.trim().split(/\s+/).filter(Boolean);
  const cmd = (tok[0] ?? '').toLowerCase();
  if (!cmd || ['status', 'статус', 'help', 'помощь'].includes(cmd)) return { changed: null, msg: '' };

  if (['start', 'старт', 'запуск', 'run'].includes(cmd)) {
    const fest = parseFest(tok[1]);
    if (!fest) return { changed: null, msg: `⚠️ ${L.errFest}` };
    const days = tok[2] === undefined ? FESTIVAL_DAYS : Number(tok[2].replace(',', '.'));
    if (!(days > 0 && days <= 120)) return { changed: null, msg: `⚠️ ${L.errDays}` };
    const r = scheduleStart(sched, fest, now, days);
    return fromResult(lang, r, (s) => {
      const cur = festivalAt(now, s)!;
      const removed = r.ok && r.note?.startsWith('removed:') ? ' ' + L.removedOverlap(Number(r.note.slice(8))) : '';
      return L.started(festName(fest, lang), fmtEnd(cur.end)) + removed;
    });
  }
  if (['stop', 'стоп', 'остановить'].includes(cmd)) return fromResult(lang, scheduleStop(sched, now), () => L.stopped);
  if (['plan', 'план', 'set'].includes(cmd)) {
    const fest = parseFest(tok[1]);
    if (!fest) return { changed: null, msg: `⚠️ ${L.errFest}` };
    const a = parseWhen(tok, 2, now);
    if (!a) return { changed: null, msg: `⚠️ ${L.errDate}` };
    const b = parseWhen(tok, a.next, now, true, a.ms);
    if (!b) return { changed: null, msg: `⚠️ ${L.errDate}` };
    return fromResult(lang, schedulePlan(sched, fest, a.ms, b.ms, now), () => L.planned(festName(fest, lang), fmtDate(Math.max(a.ms, now)), fmtEnd(b.ms)));
  }
  if (['end', 'конец', 'until', 'до'].includes(cmd)) {
    const b = parseWhen(tok, 1, now, true);
    if (!b) return { changed: null, msg: `⚠️ ${L.errDate}` };
    return fromResult(lang, scheduleSetEnd(sched, b.ms, now), () => L.ended(fmtEnd(b.ms)));
  }
  if (['del', 'delete', 'rm', 'удалить', 'убрать'].includes(cmd)) {
    const k = Number(tok[1]);
    if (!Number.isInteger(k) || k < 1) return { changed: null, msg: `⚠️ ${L.errNum}` };
    return fromResult(lang, scheduleRemove(sched, k, now), () => L.removed(k));
  }
  if (['auto', 'авто', 'rotation'].includes(cmd)) return { changed: scheduleAuto(sched, now), msg: L.auto };
  return { changed: null, msg: `⚠️ ${L.errUnknown}` };
}
