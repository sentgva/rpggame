import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DEFAULT_CONFIG, mergeConfig, type Config } from '@idle/shared';
import { existsSync, readFileSync, watch, type FSWatcher } from 'node:fs';
import { env } from '../env';

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

  get(): Config {
    return this.cfg;
  }

  reload(): { ok: boolean; version: number; error?: string } {
    try {
      let cfg = DEFAULT_CONFIG;
      if (env.balanceConfigPath && existsSync(env.balanceConfigPath)) {
        const patch = JSON.parse(readFileSync(env.balanceConfigPath, 'utf8'));
        cfg = mergeConfig(DEFAULT_CONFIG, patch);
      }
      this.cfg = cfg;
      this.version++;
      this.log.log(`balance config loaded (v${this.version})`);
      return { ok: true, version: this.version };
    } catch (e) {
      this.log.error(`balance reload failed: ${String(e)}`);
      return { ok: false, version: this.version, error: String(e) };
    }
  }
}
