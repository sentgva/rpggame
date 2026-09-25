import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import { env } from '../env';

const TEXT = {
  ru: {
    welcome: 'Командор, Кристалл Эфира пробудился! Собери Легион Валькирий и освободи владычиц Аэриса.',
    play: 'Играть',
  },
  en: {
    welcome: 'Commander, the Aether Crystal has awakened! Gather the Valkyrie Legion and free the sovereigns of Aeris.',
    play: 'Play',
  },
};

const ALLOWED_UPDATES = ['message', 'callback_query'] as const;

export function langOf(code?: string): 'ru' | 'en' {
  return code && /^(ru|uk|be|kk)/.test(code) ? 'ru' : 'en';
}

/** Telegram-бот: вход в Mini App, уведомления, реферальные ссылки. */
@Injectable()
export class BotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('Bot');
  readonly bot: Bot | null = env.botToken ? new Bot(env.botToken) : null;
  private started = false;

  constructor() {
    if (!this.bot) return;
    this.bot.command('start', (ctx) => this.onStart(ctx));
    this.bot.command('play', (ctx) => this.onStart(ctx));
    this.bot.catch((err) => this.log.error(`bot error: ${String(err.error)}`));
  }

  playKeyboard(lang: 'ru' | 'en', startParam?: string): InlineKeyboard | undefined {
    if (env.webAppUrl) {
      const url = startParam ? `${env.webAppUrl}${env.webAppUrl.includes('?') ? '&' : '?'}tgWebAppStartParam=${encodeURIComponent(startParam)}` : env.webAppUrl;
      return new InlineKeyboard().webApp(TEXT[lang].play, url);
    }
    if (env.botUsername && env.appName) {
      return new InlineKeyboard().url(TEXT[lang].play, `https://t.me/${env.botUsername}/${env.appName}${startParam ? `?startapp=${startParam}` : ''}`);
    }
    return undefined;
  }

  private async onStart(ctx: Context) {
    const lang = langOf(ctx.from?.language_code);
    const payload = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    await ctx.reply(TEXT[lang].welcome, { reply_markup: this.playKeyboard(lang, payload || undefined) });
  }

  async onApplicationBootstrap() {
    if (!this.bot) {
      this.log.warn('BOT_TOKEN не задан — бот, платежи и уведомления отключены');
      return;
    }
    if (env.botMode === 'off') {
      this.log.warn('BOT_MODE=off — бот только отправляет сообщения и счета, обновления не принимаются');
      return;
    }
    if (env.botMode === 'webhook' && !env.botAutoSetup) return; // serverless: вебхук ставится через POST /api/admin/bot/setup
    try {
      await this.bot.init();
      if (env.botMode === 'webhook' && env.webhookUrl) {
        await this.setup();
      } else {
        await this.bot.api.deleteWebhook();
        void this.bot.start({ allowed_updates: ALLOWED_UPDATES });
        this.started = true;
        this.log.log(`long polling as @${this.bot.botInfo.username}`);
        await this.setCommands();
      }
    } catch (e) {
      this.log.error(`bot init failed: ${String(e)}`);
    }
  }

  /** Регистрирует вебхук, команды и кнопку меню «Играть» (WEBAPP_URL). */
  async setup(): Promise<{ webhook: string; menuButton: boolean }> {
    if (!this.bot) throw new Error('BOT_TOKEN не задан');
    if (!env.webhookUrl) throw new Error('WEBHOOK_URL не задан');
    const webhook = `${env.webhookUrl.replace(/\/$/, '')}/api/bot/webhook`;
    await this.bot.api.setWebhook(webhook, { secret_token: env.webhookSecret || undefined, allowed_updates: ALLOWED_UPDATES });
    this.log.log('webhook set');
    await this.setCommands();
    let menuButton = false;
    if (env.webAppUrl) {
      await this.bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: TEXT.ru.play, web_app: { url: env.webAppUrl } } });
      menuButton = true;
    }
    return { webhook, menuButton };
  }

  private async setCommands() {
    await this.bot!.api.setMyCommands([
      { command: 'start', description: 'Idle RPG' },
    ]);
  }

  async onModuleDestroy() {
    if (this.started) await this.bot?.stop();
  }

  async send(chatId: string, text: string, lang: 'ru' | 'en' = 'ru'): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.api.sendMessage(chatId, text, { reply_markup: this.playKeyboard(lang) });
      return true;
    } catch (e) {
      this.log.warn(`send to ${chatId} failed: ${String(e)}`);
      return false;
    }
  }
}
