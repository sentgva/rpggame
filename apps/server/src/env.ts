/** Переменные окружения сервера. Все секреты — только здесь, на клиент не попадают. */
function bool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function list(v: string | undefined): string[] {
  return (v ?? '')
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/idle_rpg',
  redisUrl: process.env.REDIS_URL ?? '',
  botToken: process.env.BOT_TOKEN ?? '',
  botUsername: process.env.BOT_USERNAME ?? '',
  /** Короткое имя Mini App в BotFather (для ссылок t.me/bot/app). */
  appName: process.env.APP_NAME ?? '',
  webAppUrl: process.env.WEBAPP_URL ?? '',
  /** Публичный URL для вебхука бота; пусто — long polling. */
  webhookUrl: process.env.WEBHOOK_URL ?? '',
  webhookSecret: process.env.WEBHOOK_SECRET ?? '',
  /** Режим получения обновлений бота: webhook | polling | off (по умолчанию webhook при WEBHOOK_URL, иначе polling). */
  botMode: (process.env.BOT_MODE ?? (process.env.WEBHOOK_URL ? 'webhook' : 'polling')) as 'webhook' | 'polling' | 'off',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-session-secret-change-me',
  /** Белый список Telegram ID для режима разработчика. */
  devUserIds: list(process.env.DEV_USER_IDS),
  /** Полностью отключает dev-эндпоинты и dev-действия. */
  devModeEnabled: bool(process.env.DEV_MODE_ENABLED, false),
  /** Разрешить вход без Telegram (только для локальной разработки). */
  allowInsecureAuth: bool(process.env.ALLOW_INSECURE_AUTH, false),
  authMaxAgeSec: Number(process.env.AUTH_MAX_AGE_SEC ?? 86400),
  socialEnabled: bool(process.env.SOCIAL_ENABLED, false),
  adsEnabled: bool(process.env.ADS_ENABLED, false),
  paymentsEnabled: bool(process.env.PAYMENTS_ENABLED, true),
  notificationsEnabled: bool(process.env.NOTIFICATIONS_ENABLED, true),
  balanceConfigPath: process.env.BALANCE_CONFIG_PATH ?? '',
  adminToken: process.env.ADMIN_TOKEN ?? '',
  staticDir: process.env.STATIC_DIR ?? '',
  posthogKey: process.env.POSTHOG_KEY ?? '',
  posthogHost: process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  flushIntervalMs: Number(process.env.FLUSH_INTERVAL_MS ?? 3000),
  rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 240),
};

export function isDevUser(telegramId: string): boolean {
  return env.devModeEnabled && env.devUserIds.includes(telegramId);
}
