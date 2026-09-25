import { Inject, Injectable } from '@nestjs/common';
import { ART_STYLES, type ArtStyle } from '@idle/shared';
import { PlayerService } from '../game/player.service';
import { BotService } from './bot.service';

/** Стиль графики персонажей из чата с ботом (/style): пишет настройку игрока на сервере. */
@Injectable()
export class StyleService {
  constructor(
    @Inject(BotService) bot: BotService,
    @Inject(PlayerService) private readonly players: PlayerService,
  ) {
    bot.onStyle = (uid, style) => this.handle(uid, style);
  }

  /** Без style — текущий стиль; null — игрок ещё не открывал игру. */
  async handle(uid: string, style?: string): Promise<ArtStyle | null> {
    const state = await this.players.getState(uid).catch(() => null);
    if (!state) return null;
    if (!style || !ART_STYLES.includes(style as ArtStyle)) return state.settings.artStyle ?? 'vector';
    const r = await this.players.applyTrusted(uid, { type: 'settings', patch: { artStyle: style } }, 'bot');
    return r.ok ? (style as ArtStyle) : (state.settings.artStyle ?? 'vector');
  }
}
