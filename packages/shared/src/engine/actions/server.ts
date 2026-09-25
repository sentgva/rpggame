import type { Action } from '../apply';
import { assert, type Ctx } from '../core';

/** Действия, которые может выполнить только сервер (почта от админа, реферальные награды). */
export const serverActions = {
  'mail.add': (ctx: Ctx, a: Action) => {
    const m = a.mail as Ctx['s']['mail'][number];
    assert(m && typeof m.id === 'string', 'badParam', { name: 'mail' });
    if (!ctx.s.mail.some((x) => x.id === m.id)) ctx.s.mail.push({ ...m, at: ctx.now });
    return {};
  },
};
