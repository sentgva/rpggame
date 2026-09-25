import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PlayerState } from '@idle/shared';
import { DbService } from '../db/db.service';
import { env } from '../env';
import { PlayerService } from '../game/player.service';

const LADDER: Record<number, { crystals?: number; scrolls?: number }> = {
  1: { crystals: 300 },
  5: { scrolls: 5 },
  20: { crystals: 2000 },
  50: { crystals: 3000, scrolls: 10 },
};

/**
 * Социальный модуль (включается флагом SOCIAL_ENABLED): рейтинги и рефералы.
 * Засчитываются только активные друзья — дошедшие до Акта 2 (антифрод).
 */
@Injectable()
export class SocialService {
  private readonly log = new Logger('Social');

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {
    players.hooks.afterAction = (id, state) => {
      if (env.socialEnabled) void this.checkReferral(id, state);
    };
  }

  async leaderboard(board: string, me: string) {
    const col = board === 'tower' ? 'tower' : board === 'arena' ? 'arena_rating' : 'max_stage';
    const rows = await this.db.query<{ id: string; first_name: string | null; username: string | null; score: number }>(
      `SELECT id, first_name, username, ${col} AS score FROM players WHERE NOT dev_used ORDER BY ${col} DESC LIMIT 100`,
    );
    return rows.map((r, i) => ({ rank: i + 1, name: r.first_name || r.username || `#${r.id.slice(-4)}`, score: Number(r.score), me: r.id === me }));
  }

  private async checkReferral(id: string, state: PlayerState) {
    const meta = this.players.referralMeta(id);
    if (!meta?.referrer || meta.refQualified || state.progress.maxGlobalEver < 21) return;
    this.players.markQualified(id);
    try {
      await this.db.query('UPDATE players SET ref_qualified = TRUE WHERE id = $1', [id]);
      const row = await this.db.one<{ n: string }>('SELECT count(*) AS n FROM players WHERE referrer_id = $1 AND ref_qualified', [meta.referrer]);
      const n = Number(row?.n ?? 0);
      const reward = LADDER[n];
      if (!reward) return;
      await this.players.applyTrusted(meta.referrer, {
        type: 'mail.add',
        mail: {
          id: `ref_ladder_${n}`,
          title: { ru: `Друзья в Легионе: ${n}`, en: `Friends in the Legion: ${n}` },
          body: { ru: 'Спасибо, что приглашаете друзей! Награда за активных соратниц.', en: 'Thanks for inviting friends! A reward for active allies.' },
          at: Date.now(),
          rewards: { cur: reward },
        },
      });
    } catch (e) {
      this.log.warn(`referral: ${String(e)}`);
    }
  }
}
