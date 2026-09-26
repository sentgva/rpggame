import balance from './balance.json';
import type { FestivalSchedule } from '../content/festival';

/**
 * Конфиг баланса. Все коэффициенты из ТЗ хранятся в JSON и правятся без релиза:
 * сервер перечитывает файл (горячая перезагрузка) и отдаёт клиенту актуальную версию.
 */
export type Config = typeof balance & {
  /** Расписание праздников Легиона (сервер берёт его из настроек, правится из бота); нет — автоматическая ротация. */
  festival?: FestivalSchedule;
};

export const DEFAULT_CONFIG: Config = balance;

/** Глубокое слияние частичного конфига поверх базового (для горячих правок и A/B). */
export function mergeConfig(base: Config, patch: unknown): Config {
  return deepMerge(structuredClone(base), patch) as Config;
}

function deepMerge(target: any, patch: any): any {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? target;
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && target[k] && typeof target[k] === 'object') {
      target[k] = deepMerge(target[k], pv);
    } else {
      target[k] = pv;
    }
  }
  return target;
}
