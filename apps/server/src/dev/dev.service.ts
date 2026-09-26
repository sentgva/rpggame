import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { createPlayer, type PlayerState } from '@idle/shared';
import { BalanceService } from '../balance/balance.service';
import { BotService } from '../bot/bot.service';
import { DbService } from '../db/db.service';
import { env, isDevUser } from '../env';
import { PlayerService } from '../game/player.service';
import { SocialService } from '../social/social.service';

/**
 * Режим разработчика: только для Telegram ID из DEV_USER_IDS и при DEV_MODE_ENABLED=true.
 * Каждый запрос повторно проверяет ID — подмена флага на клиенте ничего не открывает.
 */
@Injectable()
export class DevService {
  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(PlayerService) private readonly players: PlayerService,
    @Inject(BalanceService) private readonly balance: BalanceService,
    @Inject(SocialService) private readonly social: SocialService,
    @Inject(BotService) private readonly bot: BotService,
  ) {}

  async handle(uid: string, op: string, body: any): Promise<unknown> {
    // рейтинги — часть социального модуля, доступны всем при включённом флаге
    if (op === 'leaderboard') {
      if (!env.socialEnabled) return [];
      return this.social.leaderboard(String(body?.board ?? 'stage'), uid);
    }
    if (!isDevUser(uid)) throw new ForbiddenException();
    // картинку конструктора в журнал не пишем — только длину описания
    await this.log(uid, op, op === 'creator.send' ? { chars: String(body?.text ?? '').length } : body);
    switch (op) {
      case 'creator.send':
        return this.sendCreation(uid, body);
      case 'snapshot.save': {
        const slot = this.slot(body);
        await this.players.flushOne(uid);
        const state = await this.players.getState(uid);
        await this.db.query(
          `INSERT INTO snapshots (player_id, slot, state) VALUES ($1, $2, $3)
           ON CONFLICT (player_id, slot) DO UPDATE SET state = EXCLUDED.state, created_at = now()`,
          [uid, slot, state],
        );
        return { ok: true };
      }
      case 'snapshot.load': {
        const slot = this.slot(body);
        const row = await this.db.one<{ state: PlayerState }>('SELECT state FROM snapshots WHERE player_id = $1 AND slot = $2', [uid, slot]);
        if (!row) return { ok: false };
        await this.players.replaceState(uid, row.state);
        return { ok: true };
      }
      case 'snapshot.list': {
        const rows = await this.db.query<{ slot: number; created_at: Date }>('SELECT slot, created_at FROM snapshots WHERE player_id = $1', [uid]);
        return [1, 2, 3].map((slot) => {
          const r = rows.find((x) => x.slot === slot);
          return { slot, at: r ? r.created_at.getTime() : null };
        });
      }
      case 'reset': {
        const s = await this.players.getState(uid);
        const fresh = createPlayer(this.balance.get(), uid, s?.name ?? 'Commander', Date.now(), s?.settings.lang ?? 'ru');
        await this.players.replaceState(uid, fresh);
        return { ok: true };
      }
      case 'config':
        return { cfg: this.balance.get(), version: this.balance.version };
      case 'config.reload':
        return this.balance.reload();
      case 'log':
        return (await this.db.query<{ at: Date; section: string; payload: unknown }>('SELECT at, section, payload FROM dev_log WHERE player_id = $1 ORDER BY at DESC LIMIT 100', [uid])).map((r) => ({
          at: r.at.getTime(),
          section: r.section,
          payload: r.payload,
        }));
      default:
        return null;
    }
  }

  /** Конструктор героинь: прислать разработчику в личку картинку и готовое описание облика. */
  private async sendCreation(uid: string, body: any): Promise<{ ok: boolean; error?: { code: string } }> {
    const text = String(body?.text ?? '').slice(0, 3500);
    const title = String(body?.title ?? '').slice(0, 80);
    const b64 = String(body?.png ?? '').replace(/^data:image\/png;base64,/, '');
    if (!/^\d+$/.test(uid)) return { ok: false, error: { code: 'noChat' } };
    if (!text || b64.length > 300_000) return { ok: false, error: { code: 'badParam' } };
    const png = Buffer.from(b64, 'base64');
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return { ok: false, error: { code: 'badParam' } };
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sent = await this.bot.sendPhoto(uid, png, `🎨 <b>${esc(title || 'Героиня')}</b> — из конструктора`);
    const code = await this.bot.sendHtml(uid, `<pre>${esc(text)}</pre>`);
    return sent && code ? { ok: true } : { ok: false, error: { code: 'notDelivered' } };
  }

  private slot(body: any): number {
    const n = Number(body?.slot);
    if (![1, 2, 3].includes(n)) throw new ForbiddenException('slot');
    return n;
  }

  private async log(uid: string, section: string, payload: unknown) {
    await this.db.query('INSERT INTO dev_log (player_id, section, payload) VALUES ($1, $2, $3)', [uid, `api:${section}`, JSON.stringify(payload ?? null)]);
    await this.db.query('UPDATE players SET dev_used = TRUE WHERE id = $1', [uid]);
  }
}
