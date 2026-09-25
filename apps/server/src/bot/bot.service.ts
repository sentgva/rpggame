import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Bot, InlineKeyboard, InputFile, type Context } from 'grammy';
import { VECTOR_ART } from '@idle/shared';
import { DbService } from '../db/db.service';
import { IdeasService, type Idea } from './ideas.service';
import { env } from '../env';

const TEXT = {
  ru: {
    welcome: [
      '⚔️ <b>IDLE RPG · Легион Валькирий</b>',
      '',
      'Командор, Кристалл Эфира пробудился! Собери отряд валькирий и освободи владычиц Аэриса.',
      '',
      '✨ <b>Что ждёт в игре</b>',
      '• 60 героинь: 8 классов, 5 стихий и 5 Вестниц',
      '• Бой идёт сам — награды копятся, даже когда ты не в игре',
      '• Снаряжение, заточка, самоцветы и созвездия',
      '• Башня с испытаниями, Разлом, Нашествие, шпили, лабиринт и арена',
      '• Облики: «Лето», «Будуар» и «Маскарад», боевой пропуск',
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
      '🌐 Язык бота: <code>/lang</code> · 🧹 очистить чат: <code>/clear</code>.',
      '🐞 Нашёл ошибку? Напиши <code>/bug что случилось</code> или нажми кнопку в настройках игры.',
    ].join('\n'),
    bugAsk: '🐞 Опиши проблему одной командой:\n<code>/bug что случилось и как повторить</code>\n\nОтчёт придёт разработчику лично.',
    bugThanks: '✅ Спасибо! Отчёт отправлен разработчику.',
    bugLimit: '⏳ Сегодня отчётов уже много — попробуй завтра.',
    play: '▶️ Играть',
    howTo: '📖 Как играть',
    bug: '🐞 Сообщить о баге',
    langAsk: '🌐 <b>Язык бота</b>\n\nВыбери, на каком языке мне писать.',
    langSet: '✅ Готово! Теперь я пишу на русском.\n\nЯзык самой игры меняется в «Настройках» игры.',
    ideaAsk: '💡 <b>Новая идея</b>\n\nОпиши её одним сообщением — я сохраню. Передумал — /cancel.',
    ideaSaved: (id: number) => `✅ Идея <b>#${id}</b> сохранена.\nВсе идеи: /ideas`,
    ideaEmpty: '💡 Идей пока нет. Добавь первую: /idea',
    ideasTitle: (n: number) => `💡 <b>Идеи</b> (${n})`,
    ideasMore: (shown: number, n: number) => `Показаны последние ${shown} из ${n} — полный список в «Выгрузить все».`,
    ideasHint: 'Удалить — кнопкой с номером идеи.',
    ideaDeleted: (id: number) => `Идея #${id} удалена`,
    ideaExport: '📄 Выгрузить все',
    ideaClear: '🧹 Удалить все',
    ideaClearAsk: (n: number) => `Удалить все идеи (${n})? Вернуть их будет нельзя.`,
    ideaClearYes: 'Да, удалить все',
    ideaCleared: (n: number) => `🧹 Удалено идей: ${n}.`,
    ideaBack: '← К списку',
    ideaOwnerOnly: '💡 Блокнот идей доступен только разработчику игры.',
    cancelled: 'Хорошо, отменил.',
    nothingToCancel: 'Отменять нечего.',
    ideaHelp: '💡 Идеи: <code>/idea</code> — записать, <code>/ideas</code> — список, удаление и выгрузка.',
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
      '• 60 heroines: 8 classes, 5 elements and 5 Heralds',
      '• Battles run on their own — loot piles up even while you are away',
      '• Gear, enhancing, gems and constellations',
      '• Tower challenges, Rift, Horde, Spires, labyrinth and arena',
      '• Skins: Summer, Boudoir and Masquerade collections, battle pass',
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
      '🌐 Bot language: <code>/lang</code> · 🧹 clear the chat: <code>/clear</code>.',
      '🐞 Found a bug? Send <code>/bug what happened</code> or use the button in game settings.',
    ].join('\n'),
    bugAsk: '🐞 Describe the problem in one command:\n<code>/bug what happened and how to repeat it</code>\n\nThe report goes straight to the developer.',
    bugThanks: '✅ Thanks! The report was sent to the developer.',
    bugLimit: '⏳ Too many reports today — try again tomorrow.',
    play: '▶️ Play',
    howTo: '📖 How to play',
    bug: '🐞 Report a bug',
    langAsk: '🌐 <b>Bot language</b>\n\nChoose the language I should write in.',
    langSet: '✅ Done! I will write in English now.\n\nThe game language itself is changed in the game Settings.',
    ideaAsk: '💡 <b>New idea</b>\n\nDescribe it in one message and I will save it. Changed your mind — /cancel.',
    ideaSaved: (id: number) => `✅ Idea <b>#${id}</b> saved.\nAll ideas: /ideas`,
    ideaEmpty: '💡 No ideas yet. Add the first one: /idea',
    ideasTitle: (n: number) => `💡 <b>Ideas</b> (${n})`,
    ideasMore: (shown: number, n: number) => `Showing the latest ${shown} of ${n} — use “Export all” for the full list.`,
    ideasHint: 'Delete with the button showing the idea number.',
    ideaDeleted: (id: number) => `Idea #${id} deleted`,
    ideaExport: '📄 Export all',
    ideaClear: '🧹 Delete all',
    ideaClearAsk: (n: number) => `Delete all ideas (${n})? This cannot be undone.`,
    ideaClearYes: 'Yes, delete all',
    ideaCleared: (n: number) => `🧹 Ideas deleted: ${n}.`,
    ideaBack: '← Back to list',
    ideaOwnerOnly: '💡 The idea notebook is available to the game developer only.',
    cancelled: 'Okay, cancelled.',
    nothingToCancel: 'Nothing to cancel.',
    ideaHelp: '💡 Ideas: <code>/idea</code> — write one down, <code>/ideas</code> — list, delete and export.',
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export type Lang = 'ru' | 'en';

export function langOf(code?: string): Lang {
  return code && /^(ru|uk|be|kk)/.test(code) ? 'ru' : 'en';
}

/** Сколько последних сообщений чата пытается удалить /clear. */
const CLEAR_DEPTH = 300;

/** Кнопка выбора языка подписана на обоих языках — её найдёт любой. */
const LANG_BUTTON = '🌐 Язык · Language';
const LANG_NAMES: Record<Lang, string> = { ru: '🇷🇺 Русский', en: '🇬🇧 English' };

function commandsFor(lang: Lang, owner = false) {
  const ideas =
    lang === 'ru'
      ? [
          { command: 'idea', description: 'Записать идею' },
          { command: 'ideas', description: 'Мои идеи: список, удаление, выгрузка' },
        ]
      : [
          { command: 'idea', description: 'Write down an idea' },
          { command: 'ideas', description: 'My ideas: list, delete, export' },
        ];
  return [...(owner ? ideas : []), ...baseCommands(lang)];
}

function baseCommands(lang: Lang) {
  return lang === 'ru'
    ? [
        { command: 'start', description: 'Играть в Idle RPG' },
        { command: 'help', description: 'Как играть' },
        { command: 'lang', description: 'Язык бота · Language' },
        { command: 'clear', description: 'Очистить чат с ботом' },
        ...(VECTOR_ART ? [{ command: 'style', description: 'Графика: вектор или пиксели' }] : []),
        { command: 'bug', description: 'Сообщить о баге: /bug текст' },
      ]
    : [
        { command: 'start', description: 'Play Idle RPG' },
        { command: 'help', description: 'How to play' },
        { command: 'lang', description: 'Bot language · Язык' },
        { command: 'clear', description: 'Clear the chat with the bot' },
        ...(VECTOR_ART ? [{ command: 'style', description: 'Art style: vector or pixel' }] : []),
        { command: 'bug', description: 'Report a bug: /bug text' },
      ];
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

  constructor(
    @Inject(DbService) private readonly db: DbService,
    @Inject(IdeasService) private readonly ideas: IdeasService,
  ) {
    if (!this.bot) return;
    this.bot.command('start', (ctx) => this.onStart(ctx));
    this.bot.command('play', (ctx) => this.onStart(ctx));
    this.bot.command('help', (ctx) => this.onHelp(ctx));
    this.bot.command('bug', (ctx) => this.onBug(ctx));
    this.bot.command('lang', (ctx) => this.onLangCommand(ctx));
    this.bot.command('clear', (ctx) => this.onClear(ctx));
    this.bot.command('idea', (ctx) => this.onIdea(ctx));
    this.bot.command('ideas', (ctx) => this.onIdeas(ctx));
    this.bot.command('cancel', (ctx) => this.onCancel(ctx));
    this.bot.callbackQuery(/^idea:del:(\d+)$/, (ctx) => this.onIdeaDelete(ctx, Number(ctx.match[1])));
    this.bot.callbackQuery('idea:export', (ctx) => this.onIdeaExport(ctx));
    this.bot.callbackQuery('idea:list', (ctx) => this.onIdeas(ctx, true));
    this.bot.callbackQuery('idea:clear', (ctx) => this.onIdeaClear(ctx, false));
    this.bot.callbackQuery('idea:clear:yes', (ctx) => this.onIdeaClear(ctx, true));
    this.bot.callbackQuery('lang', async (ctx) => {
      await ctx.answerCallbackQuery();
      await this.onLangCommand(ctx);
    });
    this.bot.callbackQuery(/^lang:(ru|en)$/, (ctx) => this.onLangPick(ctx, ctx.match[1] as Lang));
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
      await ctx.reply(TEXT[await this.langFor(ctx.from)].bugAsk, { parse_mode: 'HTML' });
    });
    // обычный текст: описание идеи после /idea (или ответ на просьбу бота)
    this.bot.on('message:text', (ctx) => this.onText(ctx));
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
      kb.row().text(TEXT[lang].howTo, 'help').text(LANG_BUTTON, 'lang');
      if (VECTOR_ART) kb.row().text(TEXT[lang].style, 'style').text(TEXT[lang].bug, 'bug');
      else kb.row().text(TEXT[lang].bug, 'bug');
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

  private async onStart(ctx: Context, withPayload = true) {
    const lang = await this.langFor(ctx.from);
    const payload = withPayload && typeof ctx.match === 'string' ? ctx.match.trim() : '';
    const reply_markup = this.playKeyboard(lang, payload || undefined, true);
    // картинка в стиле графики игрока (пока VECTOR_ART выключен — всегда пиксели)
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
    const lang = await this.langFor(ctx.from);
    const extra = this.ideas.isOwner(ctx.from?.id) ? '\n' + TEXT[lang].ideaHelp : '';
    await ctx.reply(TEXT[lang].help + extra, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang) });
  }

  private async onBug(ctx: Context) {
    const lang = await this.langFor(ctx.from);
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
    const lang = await this.langFor(ctx.from);
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
    const lang = await this.langFor(ctx.from);
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
    await api.setMyCommands(commandsFor('en'));
    await api.setMyCommands(commandsFor('ru'), { language_code: 'ru' });
    // разработчику — ещё и блокнот идей (меню его личного чата)
    for (const id of env.devUserIds.filter((x) => /^\d+$/.test(x))) {
      const row = await this.db.one<{ lang: string }>('SELECT lang FROM bot_users WHERE tg_id = $1', [id]).catch(() => null);
      const lang: Lang = row?.lang === 'en' ? 'en' : 'ru';
      await api.setMyCommands(commandsFor(lang, true), { scope: { type: 'chat', chat_id: Number(id) } }).catch((e) => this.log.warn(`dev commands for ${id}: ${String(e)}`));
    }
  }

  // ——— блокнот идей (только разработчик) ———

  private async onIdea(ctx: Context) {
    const lang = await this.langFor(ctx.from);
    if (!ctx.from || !this.ideas.isOwner(ctx.from.id)) {
      await ctx.reply(TEXT[lang].ideaOwnerOnly);
      return;
    }
    const text = typeof ctx.match === 'string' ? ctx.match.trim() : '';
    if (text) {
      await this.saveIdea(ctx, lang, text);
      return;
    }
    await this.ideas.await(String(ctx.from.id));
    await ctx.reply(TEXT[lang].ideaAsk, { parse_mode: 'HTML', reply_markup: { force_reply: true, input_field_placeholder: lang === 'ru' ? 'Моя идея…' : 'My idea…' } });
  }

  private async saveIdea(ctx: Context, lang: Lang, text: string) {
    const idea = await this.ideas.add(String(ctx.from!.id), text);
    if (idea) await ctx.reply(TEXT[lang].ideaSaved(idea.id), { parse_mode: 'HTML' });
  }

  private async onText(ctx: Context) {
    const msg = ctx.message;
    if (!msg?.text || !ctx.from || msg.text.startsWith('/') || !this.ideas.isOwner(ctx.from.id)) return;
    // ответ на просьбу «опиши идею» засчитывается, даже если ожидание истекло
    const reply = msg.reply_to_message;
    const answered = !!reply && reply.from?.id === ctx.me.id && (reply.text ?? '').startsWith('💡');
    const waited = await this.ideas.take(String(ctx.from.id));
    if (!waited && !answered) return;
    await this.saveIdea(ctx, await this.langFor(ctx.from), msg.text);
  }

  private async onCancel(ctx: Context) {
    const lang = await this.langFor(ctx.from);
    const had = ctx.from ? await this.ideas.cancel(String(ctx.from.id)) : false;
    await ctx.reply(had ? TEXT[lang].cancelled : TEXT[lang].nothingToCancel, { reply_markup: { remove_keyboard: true } });
  }

  /** Список идей: последние (до ~3500 символов) и кнопки удаления по номерам. */
  private ideasView(lang: Lang, list: Idea[]): { text: string; kb: InlineKeyboard } {
    const T = TEXT[lang];
    if (!list.length) return { text: T.ideaEmpty, kb: new InlineKeyboard() };
    const parts: string[] = [];
    let size = 0;
    const shown: Idea[] = [];
    for (const i of list) {
      const body = escapeHtml(i.text.length > 220 ? i.text.slice(0, 220) + '…' : i.text);
      const line = `<b>#${i.id}</b> · ${new Date(i.created_at).toISOString().slice(5, 10).split('-').reverse().join('.')}\n${body}`;
      if (size + line.length > 3300 || shown.length >= 25) break;
      parts.push(line);
      size += line.length + 2;
      shown.push(i);
    }
    const head = [T.ideasTitle(list.length), T.ideasHint];
    if (shown.length < list.length) head.push(T.ideasMore(shown.length, list.length));
    const kb = new InlineKeyboard();
    shown.forEach((i, n) => {
      kb.text(`🗑 #${i.id}`, `idea:del:${i.id}`);
      if (n % 4 === 3) kb.row();
    });
    kb.row().text(T.ideaExport, 'idea:export').text(T.ideaClear, 'idea:clear');
    return { text: head.join('\n') + '\n\n' + parts.join('\n\n'), kb };
  }

  private async onIdeas(ctx: Context, edit = false) {
    const lang = await this.langFor(ctx.from);
    if (!ctx.from || !this.ideas.isOwner(ctx.from.id)) {
      if (edit) await ctx.answerCallbackQuery();
      await ctx.reply(TEXT[lang].ideaOwnerOnly);
      return;
    }
    const view = this.ideasView(lang, await this.ideas.list(String(ctx.from.id)));
    if (edit) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(view.text, { parse_mode: 'HTML', reply_markup: view.kb }).catch(() => undefined);
    } else await ctx.reply(view.text, { parse_mode: 'HTML', reply_markup: view.kb });
  }

  private async onIdeaDelete(ctx: Context, id: number) {
    const lang = await this.langFor(ctx.from);
    if (!ctx.from || !this.ideas.isOwner(ctx.from.id)) return void (await ctx.answerCallbackQuery());
    const ok = await this.ideas.remove(id, String(ctx.from.id));
    await ctx.answerCallbackQuery({ text: ok ? TEXT[lang].ideaDeleted(id) : '—' });
    const view = this.ideasView(lang, await this.ideas.list(String(ctx.from.id)));
    await ctx.editMessageText(view.text, { parse_mode: 'HTML', reply_markup: view.kb }).catch(() => undefined);
  }

  private async onIdeaExport(ctx: Context) {
    const lang = await this.langFor(ctx.from);
    if (!ctx.from || !this.ideas.isOwner(ctx.from.id)) return void (await ctx.answerCallbackQuery());
    await ctx.answerCallbackQuery();
    const list = await this.ideas.list(String(ctx.from.id));
    if (!list.length) {
      await ctx.reply(TEXT[lang].ideaEmpty);
      return;
    }
    const file = new InputFile(Buffer.from(IdeasService.markdown(list), 'utf8'), `ideas-${new Date().toISOString().slice(0, 10)}.md`);
    await ctx.replyWithDocument(file, { caption: TEXT[lang].ideasTitle(list.length), parse_mode: 'HTML' });
  }

  private async onIdeaClear(ctx: Context, confirmed: boolean) {
    const lang = await this.langFor(ctx.from);
    if (!ctx.from || !this.ideas.isOwner(ctx.from.id)) return void (await ctx.answerCallbackQuery());
    await ctx.answerCallbackQuery();
    const T = TEXT[lang];
    if (!confirmed) {
      const n = (await this.ideas.list(String(ctx.from.id))).length;
      const kb = new InlineKeyboard().text(T.ideaClearYes, 'idea:clear:yes').text(T.ideaBack, 'idea:list');
      await ctx.editMessageText(T.ideaClearAsk(n), { reply_markup: kb }).catch(() => undefined);
      return;
    }
    const n = await this.ideas.clear(String(ctx.from.id));
    await ctx.editMessageText(T.ideaCleared(n)).catch(() => undefined);
  }

  // ——— очистка чата ———

  /**
   * /clear: удаляет недавнюю переписку (сообщения бота и игрока — Telegram разрешает боту это в личке
   * для сообщений младше 48 ч) и заново присылает приветствие. Прогресс игры не трогает.
   */
  private async onClear(ctx: Context) {
    const chat = ctx.chat;
    const last = ctx.message?.message_id;
    if (!chat || chat.type !== 'private' || !last) return;
    const ids: number[] = [];
    for (let id = last; id > 0 && ids.length < CLEAR_DEPTH; id--) ids.push(id);
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      // пачкой; если Telegram отказал (например, есть сообщения старше 48 ч) — по одному из свежей сотни
      const ok = await this.bot!.api.deleteMessages(chat.id, part).catch(() => false);
      if (!ok && i === 0) await Promise.all(part.slice(0, 40).map((id) => this.bot!.api.deleteMessage(chat.id, id).catch(() => false)));
    }
    await this.onStart(ctx, false);
  }

  // ——— язык бота ———

  /** Язык ответа: выбранный командой /lang, иначе язык Telegram. */
  async langFor(from?: { id: number; language_code?: string }): Promise<Lang> {
    if (!from) return 'en';
    const row = await this.db.one<{ lang: string }>('SELECT lang FROM bot_users WHERE tg_id = $1', [String(from.id)]).catch(() => null);
    return row?.lang === 'ru' || row?.lang === 'en' ? row.lang : langOf(from.language_code);
  }

  private langKeyboard(cur: Lang): InlineKeyboard {
    const mark = (l: Lang) => (l === cur ? `• ${LANG_NAMES[l]} •` : LANG_NAMES[l]);
    return new InlineKeyboard().text(mark('ru'), 'lang:ru').text(mark('en'), 'lang:en');
  }

  private async onLangCommand(ctx: Context) {
    const lang = await this.langFor(ctx.from);
    await ctx.reply(TEXT[lang].langAsk, { parse_mode: 'HTML', reply_markup: this.langKeyboard(lang) });
  }

  private async onLangPick(ctx: Context, lang: Lang) {
    if (!ctx.from) {
      await ctx.answerCallbackQuery();
      return;
    }
    await this.db
      .query('INSERT INTO bot_users (tg_id, lang) VALUES ($1, $2) ON CONFLICT (tg_id) DO UPDATE SET lang = EXCLUDED.lang, updated_at = now()', [String(ctx.from.id), lang])
      .catch((e) => this.log.warn(`bot lang not saved: ${String(e)}`));
    await ctx.answerCallbackQuery({ text: LANG_NAMES[lang] });
    // меню команд этого чата — на выбранном языке
    if (ctx.chat) await this.bot!.api.setMyCommands(commandsFor(lang, this.ideas.isOwner(ctx.from.id)), { scope: { type: 'chat', chat_id: ctx.chat.id } }).catch(() => undefined);
    try {
      await ctx.editMessageText(TEXT[lang].langSet, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang, undefined, true) });
    } catch {
      await ctx.reply(TEXT[lang].langSet, { parse_mode: 'HTML', reply_markup: this.playKeyboard(lang, undefined, true) });
    }
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
