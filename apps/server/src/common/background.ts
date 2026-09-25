/**
 * Фоновые задачи запроса (журналы, рефералы). В обычном сервере они просто выполняются,
 * в serverless-режиме обработчик дожидается их через waitUntil, иначе инстанс заморозят раньше.
 */
const pending = new Set<Promise<unknown>>();

export function background(p: Promise<unknown>): void {
  const tracked = p.catch(() => undefined).finally(() => pending.delete(tracked));
  pending.add(tracked);
}

export async function drainBackground(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}
