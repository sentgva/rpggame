import { ENCOUNTER_MAP, applyAction, encounterOffer, type EncounterKind } from '@idle/shared';
import { useEffect, useState } from 'react';
import { manualEnabled } from '../battle/live';
import { t, tl } from '../i18n';
import { RewardList, showReward } from '../screens/common';
import { useGame, useGameState } from '../store/game';
import { useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { showBattle } from './BattleModal';
import { Button, Cost, css, openSheet } from './ui';

type Cur = Record<string, number>;

function fmtLeft(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const s = Math.max(0, Math.floor((ms % 60000) / 1000));
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Значок встречи на экране боя; заодно будит сервер, когда подошло время новой встречи. */
export function EncounterBadge() {
  const s = useGameState();
  const [now, setNow] = useState(() => useGame.getState().now());
  useEffect(() => {
    const id = setInterval(() => setNow(useGame.getState().now()), 1000);
    return () => clearInterval(id);
  }, []);
  // встреча появляется в общем шаге любого действия — если игрок просто смотрит бой, спросим сами
  const due = !s.encounter && s.encounterNext !== undefined && now >= s.encounterNext && s.progress.maxGlobalEver >= 5;
  useEffect(() => {
    if (due) void useGame.getState().act('sync', {}, { silent: true });
  }, [due]);
  const e = s.encounter;
  if (!e || now > e.until || !ENCOUNTER_MAP[e.kind]) return null;
  return (
    <button
      onClick={() => {
        haptic.tap();
        openEncounter();
      }}
      style={{
        position: 'absolute',
        left: 8,
        top: 66,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 6px',
        borderRadius: 8,
        border: '2px solid #f2c86a',
        background: 'rgba(40,20,10,.88)',
        color: '#ffe8a0',
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
        animation: 'pulse .8s ease-in-out infinite alternate',
      }}
    >
      <span style={{ fontSize: 18 }}>❗</span>
      <span>{tl(ENCOUNTER_MAP[e.kind].name)}</span>
      <span style={{ fontSize: 11, opacity: 0.8 }}>{fmtLeft(e.until - now)}</span>
    </button>
  );
}

function CurLine({ c, minus }: { c?: Cur; minus?: boolean }) {
  if (!c) return null;
  return (
    <span className={css.row} style={{ gap: 6, flexWrap: 'wrap' }}>
      {minus && <span className={css.tiny}>{t('enc.cost')}</span>}
      {Object.entries(c).map(([k, v]) => (
        <Cost key={k} cur={k} amount={v} />
      ))}
    </span>
  );
}

/** Что даёт и сколько стоит вариант — из тех же формул, что и на сервере. */
function ChoiceInfo({ kind, choice, o }: { kind: EncounterKind; choice: string; o: Record<string, any> }) {
  switch (`${kind}.${choice}`) {
    case 'chest.open':
      return (
        <>
          <span className={css.tiny}>{t('enc.hint.chestOpen')}</span>
          <CurLine c={o.loot} />
        </>
      );
    case 'merchant.scroll':
      return <CurLine c={o.scroll} minus />;
    case 'merchant.epic':
      return <CurLine c={o.epic} minus />;
    case 'shrine.gold':
    case 'shrine.xp':
    case 'shrine.dust':
      return <CurLine c={o[choice]} />;
    case 'traveler.help':
      return (
        <>
          <CurLine c={o.help} minus />
          <span className={css.tiny}>{t('enc.hint.shards', { n: o.shards })}</span>
        </>
      );
    case 'traveler.leave':
      return <CurLine c={o.thanks} />;
    case 'gambler.bet':
      return (
        <>
          <CurLine c={o.bet} minus />
          <span className={css.tiny}>{t('enc.hint.bet')}</span>
        </>
      );
    case 'ambush.fight':
      return (
        <>
          <span className={css.tiny}>{t('enc.hint.fight')}</span>
          <CurLine c={o.win} />
        </>
      );
    case 'ambush.pay':
      return <CurLine c={o.pay} minus />;
  }
  return null;
}

export function openEncounter() {
  const g = useGame.getState();
  const s = g.state!;
  const e = s.encounter;
  if (!e) return;
  const def = ENCOUNTER_MAP[e.kind];
  const o = encounterOffer({ cfg: g.cfg!, s }, e.kind) as Record<string, any>;
  openSheet(`❗ ${tl(def.name)}`, (close) => (
    <div className={css.col}>
      <div style={{ fontSize: 14, lineHeight: 1.4 }}>{tl(def.desc)}</div>
      {def.choices.map((c) => (
        <button
          key={c.id}
          className={css.listItem}
          style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
          onClick={() => {
            close();
            void resolve(c.id, tl(def.name));
          }}
        >
          <b>{tl(c.label)}</b>
          <ChoiceInfo kind={e.kind as EncounterKind} choice={c.id} o={o} />
        </button>
      ))}
    </div>
  ));
}

function outcomeText(r: { outcome: string }) {
  return t(`enc.out.${r.outcome}`);
}

async function resolve(choice: string, title: string) {
  const g = useGame.getState();
  const params = { choice };
  // будет ли бой — смотрим заранее тем же движком (мимик решается случайно, но детерминированно)
  let fight = false;
  try {
    const pre = applyAction(g.state!, { type: 'encounter.resolve', ...params }, { cfg: g.cfg!, now: g.now(), dev: g.isDev });
    fight = !!(pre.result as { battle?: unknown }).battle;
  } catch {
    fight = false;
  }
  const render = (res: any) => ({ outcome: outcomeText(res), result: res.win ? <RewardList r={{ cur: res.cur, items: res.items }} /> : undefined });
  if (fight && manualEnabled()) {
    showBattle({ live: { type: 'encounter.resolve', params, render }, act: 1, title });
    return;
  }
  const r = await g.act('encounter.resolve', params);
  if (!r.ok) return;
  const res = r.result as any;
  if (res.battle) {
    const v = render(res);
    showBattle({ events: res.battle.events, win: res.battle.win, act: 1, title, outcome: v.outcome, result: v.result });
    return;
  }
  haptic.success();
  if (res.cur || res.items || res.shards) showReward(title, { cur: res.cur, items: res.items, shards: res.shards }, <div className={css.title} style={{ textAlign: 'center', marginBottom: 8 }}>{outcomeText(res)}</div>);
  else useUi.getState().toast(outcomeText(res), res.outcome === 'unlucky' ? 'bad' : 'info');
}
