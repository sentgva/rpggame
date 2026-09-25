import { Inject, Injectable, Logger } from '@nestjs/common';
import { DIFFICULTY_KEYS, stageLabel, stageRef, type PlayerState } from '@idle/shared';
import { BotService } from '../bot/bot.service';
import { CacheService } from '../common/cache.service';
import { DbService } from '../db/db.service';
import { env } from '../env';
import { PlayerService } from '../game/player.service';

const MAX_TEXT = 1500;
const DAILY_LIMIT = 15;
/** Ключи диагностики, которые принимаем от клиента (остальное отбрасывается). */
const DIAG_KEYS = ['platform', 'tgVersion', 'app', 'screen', 'view', 'lang', 'ua', 'online', 'errors', 'source'] as const;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type BugDiag = Partial<Record<(typeof DIAG_KEYS)[number], string | boolean | string[]>>;

function sanitizeDiag(raw: unknown): BugDiag {
  const out: BugDiag = {};
  if (!raw || typeof raw !== 'object') return out;
  const src = raw as Record<string, unknown>;
  for (const k of DIAG_KEYS) {
    const v = src[k];
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string').slice(-5).map((x) => x.slice(0, 240));
  }
  return out;
}

export interface BugResult {
  ok: boolean;
  delivered?: boolean;
  error?: { code: string };
}

/** Баг-репорты: сохраняем в БД и присылаем разработчику в личку через бота. */
@Injectable()
export class BugService {
  private readonly log = new Logger('Bug');

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(BotService) private readonly bot: BotService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {
    // команда /bug в чате с ботом идёт тем же путём
    bot.onBugCommand = (from, text) => this.report(String(from.id), text, { source: 'bot' }, { username: from.username, firstName: from.first_name });
  }

  /** Кому слать: BUG_REPORT_CHAT_ID, иначе разработчикам из DEV_USER_IDS (только числовые Telegram ID). */
  recipients(): string[] {
    const ids = env.bugReportChatIds.length ? env.bugReportChatIds : env.devUserIds;
    return ids.filter((x) => /^-?\d+$/.test(x));
  }

  async report(uid: string, rawText: unknown, rawDiag: unknown, who?: { username?: string; firstName?: string }): Promise<BugResult> {
    const text = String(rawText ?? '').trim().slice(0, MAX_TEXT);
    if (text.length < 3) return { ok: false, error: { code: 'badParam' } };
    const day = new Date().toISOString().slice(0, 10);
    if ((await this.cache.incr(`bug:${uid}:${day}`, 90_000)) > DAILY_LIMIT) return { ok: false, error: { code: 'rateLimit' } };
    const diag = sanitizeDiag(rawDiag);
    const row = await this.db
      .one<{ username: string | null; first_name: string | null; power: number }>('SELECT username, first_name, power FROM players WHERE id = $1', [uid])
      .catch(() => null);
    const state = await this.players.getState(uid).catch(() => null);
    const html = this.format(uid, text, diag, state, {
      username: who?.username ?? row?.username ?? undefined,
      firstName: who?.firstName ?? row?.first_name ?? undefined,
      power: row?.power,
    });
    let delivered = false;
    for (const chat of this.recipients()) delivered = (await this.bot.sendHtml(chat, html)) || delivered;
    await this.db
      .query('INSERT INTO bug_reports (player_id, text, diag, delivered) VALUES ($1, $2, $3, $4)', [uid, text, JSON.stringify(diag), delivered])
      .catch((e) => this.log.warn(`bug report not saved: ${String(e)}`));
    if (!delivered) this.log.warn(`bug report from ${uid} not delivered (bot or recipients missing)`);
    return { ok: true, delivered };
  }

  private format(uid: string, text: string, d: BugDiag, s: PlayerState | null, who: { username?: string; firstName?: string; power?: number }): string {
    const lines: string[] = ['🐞 <b>Баг-репорт</b>', ''];
    const name = escapeHtml(who.firstName ?? 'Игрок');
    lines.push(`👤 <b>${name}</b>${who.username ? ` @${escapeHtml(who.username)}` : ''} · <code>${escapeHtml(uid)}</code>`);
    if (s) {
      const diff = s.progress.diff;
      const cur = stageLabel(stageRef(diff, Math.max(1, s.progress.cleared[diff] + 1)));
      const heroes = Object.keys(s.heroines).length;
      lines.push(`📍 Этап ${cur} · ${DIFFICULTY_KEYS[diff]} · героинь ${heroes}${who.power ? ` · сила ${Math.round(who.power).toLocaleString('ru-RU')}` : ''}`);
    }
    const device = [d.platform, d.tgVersion && `TG ${d.tgVersion}`, d.screen, d.lang].filter(Boolean).join(' · ');
    if (device) lines.push(`📱 ${escapeHtml(device)}`);
    if (d.view) lines.push(`🧭 Экран: ${escapeHtml(String(d.view))}`);
    if (d.app) lines.push(`🏷 Сборка: ${escapeHtml(String(d.app))}`);
    if (d.source === 'bot') lines.push('💬 Отправлено командой /bug');
    lines.push(`🕒 ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`);
    lines.push('', '<b>Описание</b>', `<blockquote>${escapeHtml(text)}</blockquote>`);
    const errors = Array.isArray(d.errors) ? d.errors : [];
    if (errors.length) lines.push('', '⚠️ <b>Последние ошибки</b>', `<pre>${escapeHtml(errors.join('\n'))}</pre>`);
    return lines.join('\n');
  }
}
