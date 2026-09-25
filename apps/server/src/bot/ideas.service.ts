import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { env } from '../env';

export interface Idea {
  id: number;
  tg_id: string;
  text: string;
  created_at: string;
}

const MAX_TEXT = 4000;
/** Сколько ждём описание идеи после /idea. */
const WAIT_MINUTES = 30;

/** Блокнот идей разработчика: /idea в боте, список и удаление, выгрузка через админ-API. */
@Injectable()
export class IdeasService {
  constructor(@Inject(DbService) private readonly db: DbService) {}

  /** Идеи пишет только разработчик (DEV_USER_IDS). */
  isOwner(tgId: string | number | undefined): boolean {
    return tgId !== undefined && env.devUserIds.includes(String(tgId));
  }

  async add(tgId: string, text: string): Promise<Idea | null> {
    const t = text.trim().slice(0, MAX_TEXT);
    if (!t) return null;
    const row = await this.db.one<Idea>('INSERT INTO ideas (tg_id, text) VALUES ($1, $2) RETURNING id, tg_id, text, created_at', [tgId, t]);
    // BIGSERIAL приходит из pg строкой
    return row ? { ...row, id: Number(row.id) } : null;
  }

  /** Без tgId — все идеи (админ-API). Новые — первыми. */
  async list(tgId?: string): Promise<Idea[]> {
    const rows = tgId
      ? await this.db.query<Idea>('SELECT id, tg_id, text, created_at FROM ideas WHERE tg_id = $1 ORDER BY id DESC', [tgId])
      : await this.db.query<Idea>('SELECT id, tg_id, text, created_at FROM ideas ORDER BY id DESC');
    return rows.map((r) => ({ ...r, id: Number(r.id) }));
  }

  async remove(id: number, tgId?: string): Promise<boolean> {
    const rows = tgId
      ? await this.db.query('DELETE FROM ideas WHERE id = $1 AND tg_id = $2 RETURNING id', [id, tgId])
      : await this.db.query('DELETE FROM ideas WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }

  async clear(tgId: string): Promise<number> {
    return (await this.db.query('DELETE FROM ideas WHERE tg_id = $1 RETURNING id', [tgId])).length;
  }

  // ——— ожидание описания после /idea (serverless: состояние в БД, а не в памяти) ———

  async await(tgId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO bot_pending (tg_id, kind, until) VALUES ($1, 'idea', now() + interval '${WAIT_MINUTES} minutes')
       ON CONFLICT (tg_id) DO UPDATE SET kind = 'idea', until = EXCLUDED.until`,
      [tgId],
    );
  }

  /** Снять ожидание; true — если бот действительно ждал идею. */
  async take(tgId: string): Promise<boolean> {
    return (await this.db.query("DELETE FROM bot_pending WHERE tg_id = $1 AND kind = 'idea' AND until > now() RETURNING tg_id", [tgId])).length > 0;
  }

  async cancel(tgId: string): Promise<boolean> {
    return (await this.db.query('DELETE FROM bot_pending WHERE tg_id = $1 RETURNING tg_id', [tgId])).length > 0;
  }

  /** Все идеи одним Markdown-документом (для выгрузки и чтения в диалоге). */
  static markdown(ideas: Idea[]): string {
    const lines = [`# Идеи (${ideas.length})`, ''];
    for (const i of [...ideas].reverse()) {
      lines.push(`## #${i.id} · ${new Date(i.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC`, '', i.text, '');
    }
    return lines.join('\n');
  }
}
