import {
  DAILY_CHESTS,
  DAILY_QUESTS,
  HEROINES,
  LOGIN_REWARDS,
  WEEKLY_CHESTS,
  WEEKLY_QUESTS,
  scaleReward,
  type QuestDef,
} from '@idle/shared';
import { useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { Bar, Button, CUR_ICON, Icon, Panel, Tabs, css, cx, formatNum, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { BackHeader, showReward } from '../common';

type QTab = 'daily' | 'weekly' | 'login';

export function Quests() {
  const [tab, setTab] = useState<QTab>('daily');
  const s = useGameState();
  return (
    <div className={css.col}>
      <BackHeader title={t('hub.quests')} />
      <Tabs<QTab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'daily', label: t('quests.daily') },
          { id: 'weekly', label: t('quests.weekly') },
          { id: 'login', label: t('quests.login'), badge: s.quests.login.claimedKey !== s.day.key },
        ]}
      />
      {tab === 'login' ? <Login /> : <QuestList kind={tab} />}
    </div>
  );
}

function QuestList({ kind }: { kind: 'daily' | 'weekly' }) {
  const s = useGameState();
  const cfg = useCfg();
  const list: QuestDef[] = kind === 'daily' ? DAILY_QUESTS : WEEKLY_QUESTS;
  const progress = kind === 'daily' ? s.quests.daily : s.quests.weekly;
  const claimed = kind === 'daily' ? s.quests.dailyClaimed : s.quests.weeklyClaimed;
  const chests = kind === 'daily' ? DAILY_CHESTS : WEEKLY_CHESTS;
  const opened = kind === 'daily' ? s.quests.dailyChests : s.quests.weeklyChests;
  const activity = list.filter((q) => claimed.includes(q.id)).reduce((a, q) => a + q.activity, 0);
  const maxAct = chests[chests.length - 1].at;

  return (
    <>
      <Panel title={t('quests.activity', { n: activity })}>
        <Bar value={activity} max={maxAct} height={10} />
        <div className={css.row} style={{ justifyContent: 'space-around', marginTop: 8 }}>
          {chests.map((c, i) => {
            const ready = activity >= c.at && !opened.includes(i);
            return (
              <button
                key={i}
                className={cx(css.chip, ready && css.chipOn)}
                style={{ flexDirection: 'column', padding: 4, opacity: opened.includes(i) ? 0.45 : 1, animation: ready ? 'pulse 1.2s infinite' : undefined }}
                onClick={async () => {
                  if (!ready) {
                    useUi.getState().toast(Object.entries(scaleReward(cfg, s, c.reward)).map(([k, v]) => `${formatNum(v ?? 0)} ${t(`cur.${k}`)}`).join(', '), 'info');
                    return;
                  }
                  const r = await useGame.getState().act('quest.chest', { kind, index: i });
                  if (r.ok) showReward(t('common.rewards'), { cur: r.result.reward });
                }}
              >
                <Icon name={opened.includes(i) ? 'chestOpen' : 'chest'} size={28} />
                <span style={{ fontSize: 10 }}>{c.at}</span>
              </button>
            );
          })}
        </div>
      </Panel>
      {list.map((q) => {
        const p = Math.min(q.target, progress[q.counter] ?? 0);
        const done = p >= q.target;
        const isClaimed = claimed.includes(q.id);
        const reward = scaleReward(cfg, s, q.reward);
        return (
          <div key={q.id} className={css.listItem} style={{ opacity: isClaimed ? 0.5 : 1 }}>
            <Icon name="quest" size={28} />
            <div className={css.grow}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{tl(q.name)}</div>
              <Bar value={p} max={q.target} text={`${p}/${q.target}`} height={12} />
              <div className={css.row} style={{ gap: 8, marginTop: 3 }}>
                {Object.entries(reward).map(([k, v]) => (
                  <span key={k} className={css.cost} style={{ fontSize: 11 }}>
                    <Icon name={CUR_ICON[k]} size={14} />
                    {formatNum(v ?? 0)}
                  </span>
                ))}
                <span className={css.tiny}>+{q.activity}</span>
              </div>
            </div>
            <Button size="small" disabled={!done || isClaimed} kind={done && !isClaimed ? 'primary' : 'secondary'} onClick={() => void useGame.getState().act('quest.claim', { id: q.id })}>
              {isClaimed ? t('common.claimed') : t('common.claim')}
            </Button>
          </div>
        );
      })}
    </>
  );
}

function Login() {
  const s = useGameState();
  const cfg = useCfg();
  const login = s.quests.login;
  const today = ((login.streak - 1) % 28) + 1;
  const canClaim = login.claimedKey !== s.day.key;
  const claim = async (hero?: string) => {
    const r = await useGame.getState().act('login.claim', hero ? { hero } : {});
    if (r.ok) showReward(t('quests.loginDay', { n: r.result.day }), { cur: r.result.reward, heroes: r.result.hero ? [r.result.hero] : undefined });
  };
  return (
    <Panel title={t('quests.loginStreak', { n: login.streak })}>
      <div className={css.grid4} style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
        {LOGIN_REWARDS.map((r) => {
          const past = r.day < today || (r.day === today && !canClaim);
          const current = r.day === today && canClaim;
          const main = Object.entries(scaleReward(cfg, s, r.reward))[0];
          return (
            <div
              key={r.day}
              style={{
                border: `1.5px solid ${current ? 'var(--accent-2)' : r.day % 7 === 0 ? 'var(--edge)' : 'var(--frame)'}`,
                borderRadius: 4,
                padding: '3px 1px',
                textAlign: 'center',
                background: current ? 'rgba(224,161,58,.18)' : 'rgba(0,0,0,.25)',
                opacity: past ? 0.45 : 1,
                animation: current ? 'pulse 1.2s infinite' : undefined,
              }}
            >
              <div style={{ fontSize: 9 }}>{r.day}</div>
              <Icon name={r.ssrChoice ? 'heroes' : main ? CUR_ICON[main[0]] : 'gift'} size={20} />
              <div style={{ fontSize: 9, fontWeight: 800 }}>{r.ssrChoice ? 'SSR' : main ? formatNum(main[1] ?? 0) : ''}</div>
            </div>
          );
        })}
      </div>
      <Button
        block
        style={{ marginTop: 10 }}
        disabled={!canClaim}
        onClick={() => {
          if (LOGIN_REWARDS[today - 1]?.ssrChoice) pickSsr(claim);
          else void claim();
        }}
      >
        {canClaim ? `${t('common.claim')} · ${t('quests.loginDay', { n: today })}` : t('common.claimed')}
      </Button>
    </Panel>
  );
}

function pickSsr(claim: (hero: string) => Promise<void>) {
  const list = HEROINES.filter((h) => !h.boss && !h.herald && h.rarity === 'SSR');
  openSheet(t('quests.ssrChoice'), (close) => (
    <div className={css.grid4}>
      {list.map((h) => (
        <div
          key={h.id}
          className={css.hero}
          onClick={() => {
            close();
            void claim(h.id);
          }}
        >
          <img className={css.heroSprite} style={{ width: 56, height: 56 }} src={heroUrl(h.id)} alt="" />
          <div className={css.heroName}>{tl(h.name)}</div>
        </div>
      ))}
    </div>
  ));
}
