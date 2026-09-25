import { tg } from '../tg/telegram';
import { useUi } from '../store/ui';

/** Последние ошибки клиента — прикладываются к баг-репорту. */
const recent: string[] = [];

function remember(msg: string) {
  const line = `${new Date().toISOString().slice(11, 19)} ${msg}`.slice(0, 240);
  if (recent[recent.length - 1] === line) return;
  recent.push(line);
  if (recent.length > 8) recent.shift();
}

export function installErrorTrap() {
  window.addEventListener('error', (e) => remember(`${e.message} @${String(e.filename ?? '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => remember(`unhandled: ${String((e.reason as Error)?.message ?? e.reason)}`));
  const orig = console.error.bind(console);
  const str = (a: unknown) => {
    if (a instanceof Error) return a.message;
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a) ?? String(a);
    } catch {
      return String(a); // циклические объекты и т. п.
    }
  };
  console.error = (...args: unknown[]) => {
    try {
      remember(args.map(str).join(' '));
    } catch {
      /* диагностика не должна ломать логирование */
    }
    orig(...args);
  };
}

/** Снимок окружения для баг-репорта (без личных данных, кроме того, что сервер и так знает). */
export function collectDiag(extra: Record<string, unknown> = {}) {
  const ui = useUi.getState();
  const stack = ui.stacks[ui.tab];
  const top = stack[stack.length - 1];
  return {
    platform: tg?.platform ?? 'web',
    tgVersion: tg?.version ?? '',
    app: `${__APP_BUILD__}`,
    screen: `${window.innerWidth}×${window.innerHeight}@${window.devicePixelRatio}`,
    view: top ? `${ui.tab}/${top.id}` : ui.tab,
    lang: navigator.language,
    ua: navigator.userAgent,
    online: navigator.onLine,
    errors: recent.slice(-5),
    ...extra,
  };
}
