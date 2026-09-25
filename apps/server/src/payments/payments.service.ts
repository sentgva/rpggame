import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SKIN_MAP, STARS_PRODUCT_MAP, canBuyProduct, productStars, type Granted } from '@idle/shared';
import { randomBytes } from 'node:crypto';
import { BotService, langOf } from '../bot/bot.service';
import { DbService } from '../db/db.service';
import { env, isDevUser } from '../env';
import { PlayerService } from '../game/player.service';

/**
 * Покупки только за Telegram Stars (валюта XTR). Выдача — строго после события
 * successful_payment от Bot API; повтор события не выдаёт товар дважды.
 */
@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly log = new Logger('Payments');

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(BotService) private readonly bots: BotService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {}

  onModuleInit() {
    const bot = this.bots.bot;
    if (!bot) return;
    bot.on('pre_checkout_query', async (ctx) => {
      const q = ctx.preCheckoutQuery;
      const ok = await this.validateCheckout(String(q.from.id), q.invoice_payload, q.total_amount);
      await ctx.answerPreCheckoutQuery(ok.ok, ok.ok ? undefined : { error_message: ok.error ?? 'Unavailable' });
    });
    bot.on('message:successful_payment', async (ctx) => {
      const p = ctx.message.successful_payment;
      const uid = String(ctx.from.id);
      const res = await this.complete(uid, p.invoice_payload, p.telegram_payment_charge_id, p.total_amount, !!p.is_recurring);
      const lang = langOf(ctx.from.language_code);
      if (res) await ctx.reply(lang === 'ru' ? 'Покупка получена! Загляните в игру.' : 'Purchase received! Check the game.', { reply_markup: this.bots.playKeyboard(lang) });
    });
    bot.command('refund', async (ctx) => {
      if (!isDevUser(String(ctx.from?.id))) return;
      const charge = String(ctx.match ?? '').trim();
      const r = await this.refund(charge);
      await ctx.reply(r.ok ? 'refunded' : `refund failed: ${r.error}`);
    });
  }

  private title(product: string, lang: 'ru' | 'en') {
    if (product.startsWith('skin:')) {
      const sk = SKIN_MAP[product.slice(5)];
      return { title: lang === 'ru' ? `Облик: ${sk.name.ru}` : `Skin: ${sk.name.en}`, desc: lang === 'ru' ? 'Альтернативный наряд, +3% к характеристикам героини' : 'Alternative outfit, +3% heroine stats' };
    }
    const p = STARS_PRODUCT_MAP[product];
    return { title: p.name[lang], desc: p.desc[lang] };
  }

  async createInvoice(uid: string, product: string): Promise<{ ok: boolean; url?: string; error?: string }> {
    if (!env.paymentsEnabled || !this.bots.bot) return { ok: false, error: 'payments disabled' };
    const stars = productStars(product);
    if (!stars) return { ok: false, error: 'unknown product' };
    const state = await this.players.getState(uid);
    if (!state || !canBuyProduct({ s: state, now: Date.now() }, product)) return { ok: false, error: 'unavailable' };
    const payload = `p_${randomBytes(12).toString('hex')}`;
    await this.db.query('INSERT INTO payments (player_id, product, stars, payload) VALUES ($1, $2, $3, $4)', [uid, product, stars, payload]);
    const { title, desc } = this.title(product, state.settings.lang);
    const sub = STARS_PRODUCT_MAP[product]?.subscription;
    const url = await this.bots.bot.api.createInvoiceLink(title.slice(0, 32), desc.slice(0, 255), payload, '', 'XTR', [{ label: title.slice(0, 32), amount: stars }], sub ? { subscription_period: sub } : {});
    return { ok: true, url };
  }

  async validateCheckout(uid: string, payload: string, amount: number): Promise<{ ok: boolean; error?: string }> {
    const row = await this.db.one<{ player_id: string; product: string; stars: number; status: string }>('SELECT player_id, product, stars, status FROM payments WHERE payload = $1', [payload]);
    if (!row) return { ok: false, error: 'Unknown purchase' };
    if (row.player_id !== uid) return { ok: false, error: 'Wrong account' };
    if (row.stars !== amount) return { ok: false, error: 'Price changed' };
    if (row.status === 'paid' && !STARS_PRODUCT_MAP[row.product]?.subscription) return { ok: false, error: 'Already paid' };
    const state = await this.players.getState(uid);
    if (!state) return { ok: false, error: 'No account' };
    if (row.status === 'created' && !canBuyProduct({ s: state, now: Date.now() }, row.product)) return { ok: false, error: 'Unavailable' };
    return { ok: true };
  }

  /** Обработка successful_payment. Идемпотентно по telegram_payment_charge_id. */
  async complete(uid: string, payload: string, chargeId: string, amount: number, recurring: boolean): Promise<boolean> {
    const dup = await this.db.one('SELECT id FROM payments WHERE charge_id = $1', [chargeId]);
    if (dup) return false;
    let row = await this.db.one<{ id: number; player_id: string; product: string; status: string }>('SELECT id, player_id, product, status FROM payments WHERE payload = $1', [payload]);
    if (!row) {
      this.log.error(`payment with unknown payload ${payload} from ${uid}`);
      return false;
    }
    if (row.status === 'paid') {
      if (!recurring) return false;
      // продление подписки (месячная карта): новая запись на тот же товар
      const newPayload = `${payload}_r${Date.now()}`;
      const ins = await this.db.one<{ id: number }>('INSERT INTO payments (player_id, product, stars, payload) VALUES ($1, $2, $3, $4) RETURNING id', [uid, row.product, amount, newPayload]);
      row = { ...row, id: ins!.id, status: 'created' };
    }
    const upd = await this.db.query('UPDATE payments SET status = $2, charge_id = $3, paid_at = now() WHERE id = $1 AND status = $4 RETURNING id', [row.id, 'paid', chargeId, 'created']);
    if (!upd.length) return false;
    const res = await this.players.applyTrusted(uid, { type: 'purchase.grant', product: row.product, charge: chargeId }, `purchase:${row.product}`);
    const granted = res.ok ? (res.result as { granted: Granted }).granted : null;
    await this.db.query('UPDATE payments SET granted = $2 WHERE id = $1', [row.id, JSON.stringify(granted)]);
    this.players.trackServer(uid, [{ name: 'purchase_paid', props: { product: row.product, stars: amount, recurring } }]);
    return res.ok;
  }

  /** Возврат Stars через refundStarPayment с отзывом выданного. */
  async refund(chargeId: string): Promise<{ ok: boolean; error?: string }> {
    const row = await this.db.one<{ id: number; player_id: string; product: string; status: string; granted: Granted | null }>(
      'SELECT id, player_id, product, status, granted FROM payments WHERE charge_id = $1',
      [chargeId],
    );
    if (!row) return { ok: false, error: 'not found' };
    if (row.status !== 'paid') return { ok: false, error: `status ${row.status}` };
    try {
      if (this.bots.bot) await this.bots.bot.api.refundStarPayment(Number(row.player_id), chargeId);
    } catch (e) {
      return { ok: false, error: String(e) };
    }
    await this.players.applyTrusted(row.player_id, { type: 'purchase.revoke', product: row.product, granted: row.granted ?? {} }, `refund:${row.product}`);
    await this.db.query("UPDATE payments SET status = 'refunded', refunded_at = now() WHERE id = $1", [row.id]);
    this.players.trackServer(row.player_id, [{ name: 'purchase_refund', props: { product: row.product } }]);
    return { ok: true };
  }
}
