import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Bot, InlineKeyboard, type Context } from 'grammy';
import { VECTOR_ART } from '@idle/shared';
import { env } from '../env';

const TEXT = {
  ru: {
    welcome: [
      '⚔️ <b>IDLE RPG · Легион Валькирий</b>',
      '',
      'Командор, Кристалл Эфира пробудился! Собери отряд валькирий и освободи владычиц Аэриса.',
      '',
      '✨ <b>Что ждёт в игре</b>',
      '• 50 героинь: 8 классов и 5 стихий',
      '• Бой идёт сам — награды копятся, даже когда ты не в игре',
      '• Снаряжение, заточка, самоцветы и созвездия',
      '• Башня, подземелья, лабиринт, арена и экспедиции',
      '• Облики: летняя коллекция и «Будуар», боевой пропуск',
      '',
      '🎁 Лира уже ждёт в отряде — жми <b>«Играть»</b>!',
    ].join('\n'),
    help: [
      '📖 <b>Как играть</b>',
      '',
      '1️⃣ Отряд сражается сам — забирай добычу из <b>сундука</b> на вкладке «Бой».',
      '2️⃣ Когда волны идут легко — жми <b>«Вызвать босса»</b> и открывай новые этапы.',
      '3️⃣ Надевай лучшее снаряжение одной кнопкой, качай уровни и звёзды героинь.',
      '4️⃣ Выполняй задания — они дают опыт <b>боевого пропуска</b> с обликами сезона.',
      '5️⃣ Застрял — загляни в Башню, подземелья и экспедиции за ресурсами.',
      '',
      ...(VECTOR_ART ? ['🎨 Графика: <code>/style</code> — вектор или пиксели (или в настройках игры).'] : []),
      '🐞 Нашёл ошибку? Напиши <code>/bug что случилось</code> или нажми кнопку в настройках игры.',
    ].join('\n'),
    bugAsk: '🐞 Опиши проблему одной командой:\n<code>/bug что случилось и как повторить</code>\n\nОтчёт придёт разработчику лично.',
    bugThanks: '✅ Спасибо! Отчёт отправлен разработчику.',
    bugLimit: '⏳ Сегодня отчётов уже много — попробуй завтра.',
    play: '▶️ Играть',
    howTo: '📖 Как играть',
    bug: '🐞 Сообщить о баге',
    style: '🎨 Графика',
    styleAsk: (cur: string) =>
      [
        '🎨 <b>Графика персонажей</b>',
        '',
        '✨ <b>Вектор</b> — гладкая рисованная графика: мягкие тени, живые глаза и позы',
        '👾 <b>Пиксели</b> — классический пиксель-арт, как раньше',
        '',
        `Сейчас: <b>${cur === 'pixel' ? 'Пиксели' : 'Вектор'}</b>`,
      ].join('\n'),
    styleSet: (cur: string) => `✅ Готово! Графика: <b>${cur === 'pixel' ? 'Пиксели' : 'Вектор'}</b>.\nЕсли игра открыта — сверни и разверни её, стиль обновится.`,
    styleNoPlayer: '🎮 Сначала открой игру — потом здесь можно будет сменить графику.',
    styleVector: '✨ Вектор',
    stylePixel: '👾 Пиксели',
  },
  en: {
    welcome: [
      '⚔️ <b>IDLE RPG · Valkyrie Legion</b>',
      '',
      'Commander, the Aether Crystal has awakened! Gather the valkyries and free the sovereigns of Aeris.',
      '',
      '✨ <b>What awaits you</b>',
      '• 50 heroines: 8 classes and 5 elements',
      '• Battles run on their own — loot piles up even while you are away',
      '• Gear, enhancing, gems and constellations',
      '• Tower, dungeons, labyrinth, arena and expeditions',
      '• Skins: Summer and Boudoir collections, battle pass',
      '',
      '🎁 Lira is already in your squad — tap <b>“Play”</b>!',
    ].join('\n'),
    help: [
      '📖 <b>How to play</b>',
      '',
      '1️⃣ Your squad fights by itself — collect loot from the <b>chest</b> on the Battle tab.',
      '2️⃣ When waves are easy, tap <b>“Challenge boss”</b> to unlock new stages.',
      '3️⃣ Equip the best gear in one tap, level up and star up your heroines.',
      '4️⃣ Quests give <b>battle pass</b> XP with seasonal skins.',
      '5️⃣ Stuck? Farm the Tower, dungeons and expeditions.',
      '',
      ...(VECTOR_ART ? ['🎨 Art style: <code>/style</code> — vector or pixel (also in game settings).'] : []),
      '🐞 Found a bug? Send <code>/bug what happened</code> or use the button in game settings.',
    ].join('\n'),
    bugAsk: '🐞 Describe the problem in one command:\n<code>/bug what happened and how to repeat it</code>\n\nThe report goes straight to the developer.',
    bugThanks: '✅ Thanks! The report was sent to the developer.',
    bugLimit: '⏳ Too many reports today — try again tomorrow.',
    play: '▶️ Play',
    howTo: '📖 How to play',
    bug: '🐞 Report a bug',
    style: '🎨 Art style',
    styleAsk: (cur: string) =>
      [
        '🎨 <b>Character art style</b>',
        '',
        '✨ <b>Vector</b> — smooth hand-drawn look: soft shading, lively eyes and poses',
        '👾 <b>Pixel</b> — the classic pixel art',
        '',
        `Current: <b>${cur === 'pixel' ? 'Pixel' : 'Vector'}</b>`,
      ].join('\n'),
    styleSet: (cur: string) => `✅ Done! Art style: <b>${cur === 'pixel' ? 'Pixel' : 'Vector'}</b>.\nIf the game is open, minimize and reopen it to refresh.`,
    styleNoPlayer: '🎮 Open the game first — then you can switch the art style here.',
    styleVector: '✨ Vector',
    stylePixel: '👾 Pixel',
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

  /** Кэш file_id приветственных картинок по стилю графики (Telegram не перекачивает их каждый раз). */
  private welcomePhoto: Record<string, string> = {};
  /** Обработчик /bug — подключает BugService. */
  /** Обработчик /style — подключает StyleService: без style возвращает текущий; null — игрока нет. */
  onStyle: ((uid: string, style?: string) => Promise<string | null>) | null = null;
  onBugCommand: ((from: { id: number; username?: string; first_name?: string }, text: string) => Promise<{ ok: boolean; error?: { code: string } }>) | null = null;

  constructor() {
    if (!this.bot) return;
    this.bot.command('start', (ctx) => this.onStart(ctx));
    this.bot.command('play', (ctx) => this.onStart(ctx));
    this.bot.command('help', (ctx) => this.onHelp(ctx));
    this.bot.command('bug', (ctx) => this.onBug(ctx));
    // переключатель графики — только пока векторный стиль включён (VECTOR_ART)
    if (VECTOR_ART) {
      this.bot.command('style', (ctx) => this.onStyleCommand(ctx));
      this.bot.callbackQuery('style', async (ctx) => {
        await ctx.answerCallbackQuery();
        await this.onStyleCommand(ctx);
      });
      this.bot.callbackQuery(/^style:(vector|pixel)$/, (ctx) => this.onStylePick(ctx, ctx.match[1]));
    }
    this.bot.callbackQuery('help', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.onHelp(ctx);
    });
    this.bot.callbackQuery('bug', async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.reply(TEXT[langOf(ctx.from?.language_code)].bugAsk, { parse_mode: 'HTML' });
    });
    this.bot.catch((err) => this.log.error(`bot error: ${String(err.error)}`));
  }

  playKeyboard(lang: 'ru' | 'en', startParam?: string, extras = false): InlineKeyboard | undefined {
    let kb: InlineKeyboard | undefined;
    if (env.webAppUrl) {
      const url = startParam ? `${env.webAppUrl}${env.webAppUrl.includes('?') ? '&' : '?'}tgWebAppStartParam=${encodeURIComponent(startParam)}` : env.webAppUrl;
      kb = new InlineKeyboard().webApp(TEXT[lang].play, url);
    } else if (env.botUsername && env.appName) {
      kb = new InlineKeyboard().url(TEXT[lang].play, `https://t.me/${env.botUsername}/${env.appName}${startParam ? `?startapp=${startParam}` : ''}`);
    }
    if (extras) {
      kb ??= new InlineKeyboard();
      if (VECTOR_ART) kb.row().text(TEXT[lang].howTo, 'help').text(TEXT[lang].style, 'style').row().text(TEXT[lang].bug, 'bug');
      else kb.row().text(TEXT[lang].howTo, 'help').text(TEXT[lang].bug, 'bug');
    }
    return kb;
  }

  /** Публичный адрес картинки приветствия (лежит рядом с клиентом): вектор или пиксели. */
  private welcomeImageUrl(style: string): string | null {
    try {
      return env.webAppUrl ? new URL(style === 'pixel' ? '/welcome-pixel.png' : '/welcome.png', env.webAppUrl).toString() : null;
    } catch {
      return null;
    }
  }

  private async onStart(ctx: Context) {
    const lang = langOf(ctx.from?.language_code);
    const payload = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    const reply_markup = this.playKeyboard(lang, payload || undefined, true);
    // картинка в выбранном игроком стиле (новичкам — вектор)
    const style = VECTOR_ART ? ((ctx.from && this.onStyle ? await this.onStyle(String(ctx.from.id)).catch(() => null) : null) ?? 'vector') : 'pixel';
    const photo = this.welcomePhoto[style] ?? this.welcomeImageUrl(style);
    if (photo) {
      try {
        const m = await ctx.replyWithPhoto(photo, { caption: TEXT[lang].welcome, parse_mode: 'HTML', reply_markup });
        const id = m.photo?.[m.photo.length - 1]?.file_id;
        if (id) this.welcomePhoto[style] = id;
        return;
      } catch (e) {
        this.log.warn(`welcome photo failed: ${String(e)}`);
        delete this.welcomePhoto[style];
      }
    }
    await ctx.reply(TEXT[lang].welcome, { parse_mode: 'HTML', reply_markup });
  }

  private async onHelp(ctx: Context) {
    const lang = langOf(ctx.from?.language_code);
    await ctx.reply(TEXT[lang].help, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang) });
  }

  private async onBug(ctx: Context) {
    const lang = langOf(ctx.from?.language_code);
    const text = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (!text || !ctx.from || !this.onBugCommand) {
      await ctx.reply(TEXT[lang].bugAsk, { parse_mode: 'HTML' });
      return;
    }
    const r = await this.onBugCommand(ctx.from, text);
    await ctx.reply(r.ok ? TEXT[lang].bugThanks : r.error?.code === 'rateLimit' ? TEXT[lang].bugLimit : TEXT[lang].bugAsk, { parse_mode: 'HTML' });
  }

  private styleKeyboard(lang: 'ru' | 'en', cur: string): InlineKeyboard {
    const mark = (s: string, label: string) => (cur === s ? `• ${label} •` : label);
    return new InlineKeyboard().text(mark('vector', TEXT[lang].styleVector), 'style:vector').text(mark('pixel', TEXT[lang].stylePixel), 'style:pixel');
  }

  private async onStyleCommand(ctx: Context) {
    const lang = langOf(ctx.from?.language_code);
    const arg = typeof ctx.match === 'string' ? ctx.match.trim().toLowerCase() : '';
    if (!ctx.from || !this.onStyle) return;
    // /style vector | /style pixel (и русские варианты) — сразу применить
    const direct = /^(v|vec|vector|вектор)/.test(arg) ? 'vector' : /^(p|pix|pixel|пикс)/.test(arg) ? 'pixel' : undefined;
    if (direct) {
      const cur = await this.onStyle(String(ctx.from.id), direct);
      await ctx.reply(cur ? TEXT[lang].styleSet(cur) : TEXT[lang].styleNoPlayer, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang) });
      return;
    }
    const cur = await this.onStyle(String(ctx.from.id));
    if (!cur) {
      await ctx.reply(TEXT[lang].styleNoPlayer, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang) });
      return;
    }
    await ctx.reply(TEXT[lang].styleAsk(cur), { parse_mode: 'HTML', reply_markup: this.styleKeyboard(lang, cur) });
  }

  private async onStylePick(ctx: Context, style: string) {
    const lang = langOf(ctx.from?.language_code);
    if (!ctx.from || !this.onStyle) {
      await ctx.answerCallbackQuery();
      return;
    }
    const cur = await this.onStyle(String(ctx.from.id), style);
    if (!cur) {
      await ctx.answerCallbackQuery({ text: TEXT[lang].styleNoPlayer.replace(/<[^>]+>/g, ''), show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery({ text: TEXT[lang].styleSet(cur).replace(/<[^>]+>/g, '').split('\n')[0] });
    try {
      await ctx.editMessageText(TEXT[lang].styleAsk(cur) + '\n\n' + TEXT[lang].styleSet(cur).split('\n')[1], { parse_mode: 'HTML', reply_markup: this.styleKeyboard(lang, cur) });
    } catch {
      /* то же содержимое — Telegram отвечает «message is not modified» */
    }
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
      await this.bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Играть', web_app: { url: env.webAppUrl } } });
      menuButton = true;
    }
    return { webhook, menuButton };
  }

  private async setCommands() {
    const api = this.bot!.api;
    await api.setMyCommands([
      { command: 'start', description: 'Play Idle RPG' },
      { command: 'help', description: 'How to play' },
      ...(VECTOR_ART ? [{ command: 'style', description: 'Art style: vector or pixel' }] : []),
      { command: 'bug', description: 'Report a bug: /bug text' },
    ]);
    await api.setMyCommands(
      [
        { command: 'start', description: 'Играть в Idle RPG' },
        { command: 'help', description: 'Как играть' },
        ...(VECTOR_ART ? [{ command: 'style', description: 'Графика: вектор или пиксели' }] : []),
        { command: 'bug', description: 'Сообщить о баге: /bug текст' },
      ],
      { language_code: 'ru' },
    );
  }

  async onModuleDestroy() {
    if (this.started) await this.bot?.stop();
  }

  /** Сообщение с HTML-разметкой без кнопок (баг-репорты разработчику). */
  async sendHtml(chatId: string, html: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.api.sendMessage(chatId, html, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
      return true;
    } catch (e) {
      this.log.warn(`sendHtml to ${chatId} failed: ${String(e)}`);
      return false;
    }
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
