/** SQL-миграции (выполняются по порядку при старте, учёт в таблице schema_migrations). */
export const MIGRATIONS: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: `
CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  username      TEXT,
  first_name    TEXT,
  lang          TEXT,
  state         JSONB NOT NULL,
  version       INTEGER NOT NULL DEFAULT 0,
  max_stage     INTEGER NOT NULL DEFAULT 0,
  tower         INTEGER NOT NULL DEFAULT 0,
  arena_rating  INTEGER NOT NULL DEFAULT 1000,
  power         DOUBLE PRECISION NOT NULL DEFAULT 0,
  dev_used      BOOLEAN NOT NULL DEFAULT FALSE,
  referrer_id   TEXT,
  ref_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  notify_at     TIMESTAMPTZ,
  notify_day    TEXT,
  notify_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS players_max_stage ON players (max_stage DESC) WHERE NOT dev_used;
CREATE INDEX IF NOT EXISTS players_tower ON players (tower DESC) WHERE NOT dev_used;
CREATE INDEX IF NOT EXISTS players_arena ON players (arena_rating DESC) WHERE NOT dev_used;
CREATE INDEX IF NOT EXISTS players_referrer ON players (referrer_id);

-- журнал изменений валют (ledger) для аудита и отката
CREATE TABLE IF NOT EXISTS ledger (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency   TEXT NOT NULL,
  delta      DOUBLE PRECISION NOT NULL,
  balance    DOUBLE PRECISION NOT NULL,
  source     TEXT NOT NULL,
  action_id  TEXT
);
CREATE INDEX IF NOT EXISTS ledger_player ON ledger (player_id, at DESC);

-- платежи Telegram Stars
CREATE TABLE IF NOT EXISTS payments (
  id           BIGSERIAL PRIMARY KEY,
  player_id    TEXT NOT NULL,
  product      TEXT NOT NULL,
  stars        INTEGER NOT NULL,
  payload      TEXT NOT NULL UNIQUE,
  charge_id    TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'created',
  granted      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at      TIMESTAMPTZ,
  refunded_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS payments_player ON payments (player_id);

-- журнал режима разработчика
CREATE TABLE IF NOT EXISTS dev_log (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  section    TEXT NOT NULL,
  payload    JSONB
);
CREATE INDEX IF NOT EXISTS dev_log_player ON dev_log (player_id, at DESC);

-- снимки состояния для dev-режима (3 слота)
CREATE TABLE IF NOT EXISTS snapshots (
  player_id  TEXT NOT NULL,
  slot       INTEGER NOT NULL,
  state      JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, slot)
);

-- аналитические события
CREATE TABLE IF NOT EXISTS analytics_events (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  name       TEXT NOT NULL,
  props      JSONB
);
CREATE INDEX IF NOT EXISTS analytics_name_at ON analytics_events (name, at DESC);

-- флаги функций и прочие настройки сервера
CREATE TABLE IF NOT EXISTS server_settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);
`,
  },
  {
    id: 2,
    sql: `
-- идемпотентность действий в serverless-режиме (ответ на повтор того же action id)
CREATE TABLE IF NOT EXISTS action_results (
  player_id  TEXT NOT NULL,
  action_id  TEXT NOT NULL,
  response   JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, action_id)
);
CREATE INDEX IF NOT EXISTS action_results_age ON action_results (player_id, created_at);
`,
  },
  {
    id: 3,
    sql: `
-- баг-репорты игроков (кнопка в настройках и команда /bug)
CREATE TABLE IF NOT EXISTS bug_reports (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT,
  text       TEXT NOT NULL,
  diag       JSONB,
  delivered  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bug_reports_at ON bug_reports (created_at DESC);
`,
  },
  {
    id: 4,
    sql: `
-- язык бота, выбранный командой /lang (важнее языка Telegram)
CREATE TABLE IF NOT EXISTS bot_users (
  tg_id      TEXT PRIMARY KEY,
  lang       TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
  },
];
