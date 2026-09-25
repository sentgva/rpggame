import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { createPlayer, type PlayerState } from '@idle/shared';
import { BalanceService } from '../balance/balance.service';
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
  ) {}

  async handle(uid: string, op: string, body: any): Promise<unknown> {
    // рейтинги — часть социального модуля, доступны всем при включённом флаге
    if (op === 'leaderboard') {
      if (!env.socialEnabled) return [];
      return this.social.leaderboard(String(body?.board ?? 'stage'), uid);
    }
    if (!isDevUser(uid)) throw new ForbiddenException();
    await this.log(uid, op, body);
    switch (op) {
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
