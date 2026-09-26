/** Обёртка над Telegram WebApp API с безопасными заглушками вне Telegram. */

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface WebApp {
  initData: string;
  initDataUnsafe: { user?: TgUser; start_param?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(c: string): void;
  setBackgroundColor(c: string): void;
  setBottomBarColor?(c: string): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;
  requestFullscreen?(): void;
  exitFullscreen?(): void;
  isFullscreen?: boolean;
  addToHomeScreen?(): void;
  shareToStory?(url: string, params?: { text?: string; widget_link?: { url: string; name?: string } }): void;
  openTelegramLink(url: string): void;
  openLink(url: string): void;
  switchInlineQuery?(query: string, types?: string[]): void;
  onEvent(e: string, cb: (...a: unknown[]) => void): void;
  offEvent(e: string, cb: (...a: unknown[]) => void): void;
  HapticFeedback: {
    impactOccurred(s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(t: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void; isVisible: boolean };
  CloudStorage: {
    setItem(k: string, v: string, cb?: (err: unknown, ok?: boolean) => void): void;
    getItem(k: string, cb: (err: unknown, v?: string) => void): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export const tg: WebApp | null = typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null;

export function inTelegram(): boolean {
  return !!tg && !!tg.initData;
}

export function tgUser(): TgUser | undefined {
  return tg?.initDataUnsafe?.user;
}

export function startParam(): string | undefined {
  const fromTg = tg?.initDataUnsafe?.start_param;
  if (fromTg) return fromTg;
  const q = new URLSearchParams(location.search);
  return q.get('tgWebAppStartParam') ?? q.get('startapp') ?? undefined;
}

let hapticsOn = true;
export function setHaptics(on: boolean) {
  hapticsOn = on;
}

export const haptic = {
  tap() {
    if (hapticsOn) tg?.HapticFeedback?.impactOccurred('light');
  },
  medium() {
    if (hapticsOn) tg?.HapticFeedback?.impactOccurred('medium');
  },
  heavy() {
    if (hapticsOn) tg?.HapticFeedback?.impactOccurred('heavy');
  },
  success() {
    if (hapticsOn) tg?.HapticFeedback?.notificationOccurred('success');
  },
  error() {
    if (hapticsOn) tg?.HapticFeedback?.notificationOccurred('error');
  },
  warn() {
    if (hapticsOn) tg?.HapticFeedback?.notificationOccurred('warning');
  },
  select() {
    if (hapticsOn) tg?.HapticFeedback?.selectionChanged();
  },
};

/** Инициализация: разворачиваем, красим шапку, отключаем свайп-закрытие, прокидываем тему. */
export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast('6.1')) {
      tg.setHeaderColor('#1B1418');
      tg.setBackgroundColor('#120C10');
    }
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.('#120C10');
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
    const accent = tg.themeParams?.button_color;
    if (accent) document.documentElement.style.setProperty('--tg-accent', accent);
    // на мобильных — полноэкранный режим (Bot API 8.0)
    if (tg.isVersionAtLeast('8.0') && /android|ios/.test(tg.platform)) tg.requestFullscreen?.();
  } catch {
    // старые клиенты Telegram — работаем без необязательных функций
  }
}

const backHandlers: (() => void)[] = [];
function onBack() {
  const h = backHandlers[backHandlers.length - 1];
  h?.();
}

/** Кнопка «Назад» Telegram: стек обработчиков для вложенных экранов и модалок. */
export function pushBack(handler: () => void): () => void {
  backHandlers.push(handler);
  if (tg && backHandlers.length === 1) {
    tg.BackButton.onClick(onBack);
    tg.BackButton.show();
  }
  return () => {
    const i = backHandlers.lastIndexOf(handler);
    if (i >= 0) backHandlers.splice(i, 1);
    if (tg && backHandlers.length === 0) {
      tg.BackButton.offClick(onBack);
      tg.BackButton.hide();
    }
  };
}

export function addToHomeScreen() {
  if (tg?.isVersionAtLeast('8.0')) tg.addToHomeScreen?.();
}

export function toggleFullscreen() {
  if (!tg?.isVersionAtLeast('8.0')) return;
  if (tg.isFullscreen) tg.exitFullscreen?.();
  else tg.requestFullscreen?.();
}

/** Поделиться: в историю (Stories) или ссылкой в чат. */
export function share(text: string, link: string, storyImage?: string) {
  if (storyImage && tg?.isVersionAtLeast('7.8') && tg.shareToStory) {
    tg.shareToStory(storyImage, { text, widget_link: { url: link, name: 'Idle RPG' } });
    return;
  }
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  if (tg) tg.openTelegramLink(url);
  else window.open(url, '_blank');
}
