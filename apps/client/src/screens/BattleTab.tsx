import {
  ACTS,
  ENEMY_MAP,
  MECHANIC_TEXT,
  activeParty,
  capMinutes,
  farmStage,
  goldPerMin,
  goldToNext,
  levelCap,
  offlineBonus,
  partyPower,
  stageLabel,
  targetStage,
  xpPerMin,
  xpToNext,
  type StageRef,
  boostsLeft,
} from '@idle/shared';
import { useEffect, useState } from 'react';
import { heroUrl } from '../art/runtime';
import { HeroImg } from '../components/HeroImg';
import { BattleView, getRenderer } from '../battle/BattleView';
import { requestBoss, useBattle } from '../battle/director';
import { Bar, Button, Cost, Icon, Panel, Sheet, css, cx, fmtTime, formatNum } from '../components/ui';
import { t, tl } from '../i18n';
import { previewChest, useCfg, useGame, useGameState } from '../store/game';
import { navigate, useUi } from '../store/ui';
import { haptic } from '../tg/telegram';
import { sfx } from '../audio/sfx';
import st from './BattleTab.module.css';
import { RewardList, showReward } from './common';

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => useGame.getState().now());
  useEffect(() => {
    const id = setInterval(() => setNow(useGame.getState().now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function BattleTab() {
  return (
    <div className={st.wrap}>
      <div className={st.viewport}>
        <BattleView />
        <Hud />
      </div>
      <div className={st.controls}>
        <ChestPanel />
        <PartyPanel />
        <BossHint />
      </div>
      <ResultWatcher />
    </div>
  );
}

function Hud() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow();
  const phase = useBattle((b) => b.phase);
  const label = useBattle((b) => b.label);
  const target = targetStage({ s });
  const chest = previewChest(s, cfg, now);
  const cap = capMinutes(cfg, s, now);
  const fill = Math.min(1, chest.minutes / cap);
  const stage = Math.min(4, Math.floor(fill * 4));
  const x2Left = Math.max(s.boosts.x2Until, s.shop.passUntil) - now;
  const canBoss = !!target && s.progress.wave >= 3;
  const retryLeft = s.progress.retryAt - now;

  return (
    <>
      <div className={st.hud}>
        <div className={st.stageTag}>
          <span className={cx(st.diff, st[`diff${s.progress.diff}`])}>{t(`diff.${['normal', 'hard', 'nightmare'][s.progress.diff]}`)}</span>
          {phase === 'farm' || phase === 'idle' ? t('battle.farming', { stage: label || '1-1' }) : phase === 'mode' ? label : t('battle.stage', { stage: label })}
        </div>
        {target ? (
          <div className={st.waves}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cx(st.waveDot, i < s.progress.wave && st.waveDone)} />
            ))}
            <Icon name="skull" size={16} className={st.bossDot} style={{ opacity: s.progress.wave >= 3 ? 1 : 0.35 }} />
            <span style={{ fontSize: 11, fontWeight: 800, textShadow: '0 1px 0 #000' }}>{stageLabel(target)}</span>
          </div>
        ) : (
          <div className={st.stageTag} style={{ fontSize: 11 }}>
            {t('battle.allCleared')}
          </div>
        )}
      </div>
      <div
        className={cx(st.chestBtn, fill >= 1 && st.chestFull)}
        onClick={() => {
          haptic.tap();
          void collectChest();
        }}
      >
        <Icon name={stage >= 3 ? 'chestOpen' : 'chest'} size={36} />
        <div className={st.chestStage}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < Math.max(stage, fill > 0.02 ? 1 : 0) ? st.on : undefined} />
          ))}
        </div>
      </div>
      {x2Left > 0 && <div className={st.x2}>×2 {fmtTime(x2Left)}</div>}
      <div className={st.bossBar}>
        {canBoss && retryLeft > 0 && s.settings.autoRetry && <span className={st.retry}>{t('battle.retryIn', { time: fmtTime(retryLeft) })}</span>}
        {canBoss && (
          <Button
            pulse
            onClick={() => {
              sfx('click');
              requestBoss();
            }}
          >
            <Icon name="skull" size={20} />
            {t('battle.callBoss')}
          </Button>
        )}
      </div>
    </>
  );
}

export async function collectChest(fromWelcome = false) {
  const g = useGame.getState();
  const r = await g.act('chest.collect');
  if (!r.ok) return;
  const res = r.result;
  sfx('loot');
  haptic.success();
  getRenderer()?.lootBurst(10 + res.items.length);
  const levels = Object.values(res.levels as Record<string, number>).reduce((a, b) => a + b, 0);
  if (!fromWelcome && (res.items.length > 0 || levels > 0 || res.gold > 0)) {
    useUi.getState().toast(`+${formatNum(res.gold)} ${t('cur.gold')} · +${formatNum(res.xp)} ${t('cur.xp')}${res.items.length ? ` · ${t('welcome.items', { n: res.items.length })}` : ''}${levels ? ` · +${levels} ${t('common.level')}` : ''}`, 'good');
  }
  return res;
}

function ChestPanel() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow();
  const chest = previewChest(s, cfg, now);
  const cap = capMinutes(cfg, s, now);
  const items = Math.floor(chest.itemMin / cfg.income.itemEveryMin);
  const quickCost = s.day.quick < cfg.income.quickCrystals.length ? cfg.income.quickCrystals[s.day.quick] : null;
  const freeLeft = (s.day.quickFree ? 0 : 1) + (s.day.quickAd ? 0 : 1);
  const boosts = boostsLeft({ cfg, s });

  const quick = async (method: 'free' | 'crystals') => {
    const r = await useGame.getState().act('chest.quick', { method });
    if (r.ok) {
      sfx('loot');
      getRenderer()?.lootBurst(20);
      showReward(t('battle.quick'), { cur: { gold: r.result.gold, xp: r.result.xp, dust: r.result.dust }, items: r.result.items });
    }
  };

  return (
    <Panel
      title={
        <span className={css.row}>
          <Icon name="chest" size={20} />
          {t('battle.chest')}
        </span>
      }
      right={<span className={css.tiny}>{fmtTime(chest.minutes * 60000)} / {t('time.h', { n: cap / 60 })}</span>}
    >
      <div className={st.chestRow}>
        <div className={css.col} style={{ gap: 6 }}>
          <Bar value={chest.minutes} max={cap} text={t('battle.chestFill', { pct: Math.floor((chest.minutes / cap) * 100) })} height={14} />
          <div className={css.row} style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className={css.cost}>
              <Icon name="gold" size={18} />
              {formatNum(chest.gold)}
            </span>
            <span className={css.cost}>
              <Icon name="xp" size={18} />
              {formatNum(chest.xp)}
            </span>
            <span className={css.cost}>
              <Icon name="gear" size={18} />
              {items}
            </span>
          </div>
        </div>
        <Button size="big" onClick={() => void collectChest()} pulse={chest.minutes >= cap}>
          {t('battle.collect')}
        </Button>
      </div>
      <div className={css.divider} />
      <div className={st.quickRow}>
        {freeLeft > 0 ? (
          <Button kind="good" size="small" onClick={() => void quick('free')}>
            <Icon name="speed" size={16} />
            {t('battle.quick')} · {freeLeft}/2
          </Button>
        ) : quickCost !== null ? (
          <Button kind="secondary" size="small" onClick={() => void quick('crystals')}>
            <Icon name="speed" size={16} />
            {t('battle.quick')} · <Cost cur="crystals" amount={quickCost} size={14} />
          </Button>
        ) : (
          <Button kind="secondary" size="small" disabled>
            {t('battle.quick')}
          </Button>
        )}
        <Button
          kind="secondary"
          size="small"
          disabled={boosts <= 0}
          onClick={async () => {
            const r = await useGame.getState().act('boost.x2');
            if (r.ok) useUi.getState().toast(t('battle.x2Desc'), 'good');
          }}
        >
          <Icon name="speed" size={16} />
          {t('battle.x2')} · {boosts}/{cfg.income.x2PerDay}
        </Button>
      </div>
      <div className={css.tiny} style={{ marginTop: 6 }}>
        {t('battle.tip')}
        {offlineBonus(s) > 0 && ` · +${Math.round(offlineBonus(s) * 100)}%`}
      </div>
    </Panel>
  );
}

function PartyPanel() {
  const s = useGameState();
  const cfg = useCfg();
  const party = s.party.presets[s.party.active];
  const power = partyPower(cfg, s);
  const n = farmStage(s);
  const canLevel = activeParty(s).some((id) => {
    const h = s.heroines[id];
    return h.lvl < levelCap(cfg, h) && s.cur.xp >= xpToNext(cfg, h.lvl) && s.cur.gold >= goldToNext(cfg, h.lvl);
  });

  const levelAll = async () => {
    let total = 0;
    for (const id of activeParty(useGame.getState().state!)) {
      const r = await useGame.getState().act('hero.level', { id, times: 500 }, { silent: true });
      if (r.ok) total += r.result.done;
    }
    if (total) {
      sfx('levelup');
      haptic.success();
      useUi.getState().toast(`+${total} ${t('common.level')}`, 'good');
    }
  };

  return (
    <Panel title={t('battle.party')} right={<span className={css.cost}><Icon name="battle" size={18} />{formatNum(power)}</span>}>
      <div className={st.party}>
        {party.map((id, i) => {
          const h = id ? s.heroines[id] : null;
          return (
            <div key={i} className={cx(st.pm, !h && st.pmEmpty)} onClick={() => (id ? navigate('heroes', { id: 'hero', params: { id } }) : navigate('heroes'))}>
              {h ? <HeroImg id={h.id} skin={h.skin} /> : <Icon name="plus" size={32} style={{ margin: 8 }} />}
              <span className={st.pmLvl}>{h ? `${t('common.level')} ${h.lvl}` : ''}</span>
            </div>
          );
        })}
      </div>
      <div className={css.divider} />
      <div className={st.incomeGrid}>
        <div className={st.incomeCell}>
          <Icon name="gold" size={18} />
          {formatNum(goldPerMin(cfg, s, n))}
          <span className={css.tiny}>{t('common.perMin')}</span>
        </div>
        <div className={st.incomeCell}>
          <Icon name="xp" size={18} />
          {formatNum(xpPerMin(cfg, s, n))}
          <span className={css.tiny}>{t('common.perMin')}</span>
        </div>
        <div className={st.incomeCell}>
          <Icon name="gear" size={18} />1/{cfg.income.itemEveryMin}
          <span className={css.tiny}>{t('time.m', { n: '' }).trim()}</span>
        </div>
      </div>
      <div className={css.row} style={{ marginTop: 8 }}>
        <Button
          kind="secondary"
          block
          size="small"
          onClick={async () => {
            const r = await useGame.getState().act('party.autoEquip');
            if (r.ok) useUi.getState().toast(t('gear.autoDone', { n: r.result.changes }), 'good');
          }}
        >
          <Icon name="armor" size={16} />
          {t('battle.autoEquip')}
        </Button>
        <Button kind={canLevel ? 'good' : 'secondary'} block size="small" disabled={!canLevel} onClick={() => void levelAll()}>
          <Icon name="up" size={16} />
          {t('battle.levelUp')}
        </Button>
      </div>
    </Panel>
  );
}

function BossHint() {
  const s = useGameState();
  const target = targetStage({ s });
  if (!target) return null;
  const act = ACTS[target.act - 1];
  const boss = ENEMY_MAP[act.boss];
  if (target.stage < 15 || !boss.mechanic) return null;
  return (
    <Panel>
      <div className={st.mech}>
        <img className="pixel" src={heroUrl(boss.hero!)} width={40} height={40} alt="" />
        <div>
          <div style={{ color: 'var(--text)', fontWeight: 800 }}>
            {t('battle.mechanic')}: {tl(boss.name)}
          </div>
          {tl(MECHANIC_TEXT[boss.mechanic])}
        </div>
      </div>
    </Panel>
  );
}

/** Показ результата боя с боссом. */
function ResultWatcher() {
  const result = useBattle((b) => b.result);
  useEffect(() => {
    if (!result || Date.now() - result.at > 3000) return;
    const stage = result.stage as StageRef;
    if (result.win) {
      const r = result.rewards ?? {};
      useUi.getState().open((close) => (
        <Sheet title={t('battle.bossWin', { stage: stage ? stageLabel(stage) : '' })} onClose={close}>
          <RewardList r={{ cur: r.cur, items: r.items, shards: r.shards ? { [r.shards.hero]: r.shards.n } : undefined }} />
          <div style={{ height: 10 }} />
          <Button block onClick={close}>
            {t('common.ok')}
          </Button>
        </Sheet>
      ));
    } else {
      useUi.getState().toast(t('battle.bossLose'), 'bad');
    }
  }, [result]);
  return null;
}
