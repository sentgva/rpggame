import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { DEFAULT_CONFIG, mergeConfig, type Config, type FestivalSchedule } from '@idle/shared';
import { existsSync, readFileSync, watch, type FSWatcher } from 'node:fs';
import { DbService } from '../db/db.service';
import { env } from '../env';

const FESTIVAL_KEY = 'festival_schedule';
/** Как часто экземпляр сервера перечитывает расписание праздников из БД (правки из бота). */
const FESTIVAL_TTL_MS = 15_000;

/**
 * Конфиг баланса. База — balance.json из общего модуля; поверх него накладывается
 * файл BALANCE_CONFIG_PATH (выгрузка из Google Sheets). Файл отслеживается —
 * правки применяются без релиза клиента («горячая перезагрузка»).
 */
@Injectable()
export class BalanceService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Balance');
  private cfg: Config = DEFAULT_CONFIG;
  private watcher: FSWatcher | null = null;
  version = 1;
  /** Расписание праздников из server_settings (null — автоматическая ротация). */
  private festival: FestivalSchedule | null = null;
  private festivalLoaded = 0;
  private merged: Config | null = null;

  constructor(@Optional() @Inject(DbService) private readonly db?: DbService) {}

  onModuleInit() {
    this.reload();
    if (env.balanceConfigPath && existsSync(env.balanceConfigPath)) {
      let timer: NodeJS.Timeout | null = null;
      this.watcher = watch(env.balanceConfigPath, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => this.reload(), 300);
      });
    }
  }

  onModuleDestroy() {
    this.watcher?.close();
  }

  /** Конфиг баланса вместе с расписанием праздников. */
  get(): Config {
    if (!this.merged) this.merged = this.festival ? { ...this.cfg, festival: this.festival } : this.cfg;
    return this.merged;
  }

  /** Версия расписания праздников: клиент сравнивает её со своей и при расхождении перезапрашивает конфиг. */
  festivalVersion(): number {
    return this.festival?.updated ?? 0;
  }

  /** Перечитать расписание праздников из БД (не чаще раза в 15 с, force — сразу). */
  async refresh(force = false): Promise<void> {
    if (!this.db || (!force && Date.now() - this.festivalLoaded < FESTIVAL_TTL_MS)) return;
    try {
      const row = await this.db.one<{ value: FestivalSchedule }>('SELECT value FROM server_settings WHERE key = $1', [FESTIVAL_KEY]);
      this.setFestival(row?.value ?? null);
    } catch (e) {
      // БД недоступна — работаем с последним известным расписанием
      this.log.warn(`festival schedule load failed: ${String(e)}`);
      this.festivalLoaded = Date.now();
    }
  }

  festivalSchedule(): FestivalSchedule | null {
    return this.festival;
  }

  /** Сохранить расписание праздников (из бота). */
  async saveFestival(sched: FestivalSchedule): Promise<void> {
    if (!this.db) throw new Error('no database');
    await this.db.query(
      'INSERT INTO server_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [FESTIVAL_KEY, JSON.stringify(sched)],
    );
    this.setFestival(sched);
  }

  private setFestival(sched: FestivalSchedule | null) {
    this.festival = sched;
    this.festivalLoaded = Date.now();
    this.merged = null;
  }

  reload(): { ok: boolean; version: number; error?: string } {
    try {
      let cfg = DEFAULT_CONFIG;
      if (env.balanceConfigPath && existsSync(env.balanceConfigPath)) {
        const patch = JSON.parse(readFileSync(env.balanceConfigPath, 'utf8'));
        cfg = mergeConfig(DEFAULT_CONFIG, patch);
      }
      this.cfg = cfg;
      this.merged = null;
      this.version++;
      this.log.log(`balance config loaded (v${this.version})`);
      return { ok: true, version: this.version };
    } catch (e) {
      this.log.error(`balance reload failed: ${String(e)}`);
      return { ok: false, version: this.version, error: String(e) };
    }
  }
}
