import {
  ACTS,
  CIRCLE_NAMES,
  DAILY_QUESTS,
  ENEMY_MAP,
  MECHANIC_TEXT,
  boostsLeft,
  capMinutes,
  goldPerMin,
  isBreakthrough,
  legionMaxLevel,
  levelCost,
  partyPower,
  recommendedPower,
  stageLabel,
  targetStage,
  xpPerMin,
  type StageRef,
} from '@idle/shared';
import { useEffect, useState } from 'react';
import { enemyUrl } from '../art/runtime';
import { BattleView, getRenderer } from '../battle/BattleView';
import { requestBoss, useBattle } from '../battle/director';
import { useLive } from '../battle/live';
import { FashionDay } from '../components/Fashion';
import { MvpCard } from '../components/Mvp';
import { UltBar } from '../components/UltBar';
import { Bar, Button, Cost, Icon, Sheet, css, cx, fmtTime, formatNum } from '../components/ui';
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
        <StageHud />
        <SceneButtons />
        <GuardianCall />
      </div>
      <UltBar />
      <div className={st.controls}>
        <LegionPanel />
        <ChestPanel />
        <QuestTracker />
        <GuardianHint />
      </div>
      <ResultWatcher />
    </div>
  );
}

/** Верх сцены: акт и этап, волны → страж. */
function StageHud() {
  const s = useGameState();
  const phase = useBattle((b) => b.phase);
  const target = targetStage({ s });
  const ref = target ?? null;
  const act = ref ? ACTS[ref.act - 1] : null;
  return (
    <div className={st.hud}>
      <button className={st.stageChip} onClick={() => navigate('map', { id: 'campaign' })}>
        <span className={st.actName}>{act ? `${tl(CIRCLE_NAMES[ref!.circle])} · ${tl(act.name)}` : t('battle.allCleared')}</span>
        <span className={st.stageNum}>{ref ? stageLabel(ref) : '—'}</span>
      </button>
      {ref && (
        <div className={st.track}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cx(st.pip, i < s.progress.wave && st.pipDone, i === s.progress.wave && phase === 'wave' && st.pipNow)} />
          ))}
          <span className={cx(st.crown, s.progress.wave >= 3 && st.crownOn)}>
            <Icon name="skull" size={14} />
          </span>
        </div>
      )}
      {phase === 'farm' && <div className={st.farm}>{t('battle.farming')}</div>}
    </div>
  );
}

/** Кнопки поверх сцены: сундук и ускорение. */
function SceneButtons() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow();
  const chest = previewChest(s, cfg, now);
  const cap = capMinutes(cfg, s, now);
  const fill = Math.min(1, chest.minutes / cap);
  const x2Left = s.boosts.x2Until - now;
  return (
    <div className={st.sideBtns}>
      <button
        className={cx(st.round, fill >= 1 && st.roundFull)}
        style={{ ['--p' as string]: `${fill * 360}deg` }}
        onClick={() => {
          haptic.tap();
          void collectChest();
        }}
      >
        <Icon name={fill >= 0.5 ? 'chestOpen' : 'chest'} size={30} />
        <span className={st.roundTag}>{Math.floor(fill * 100)}%</span>
      </button>
      {x2Left > 0 && <span className={st.x2}>×2 · {fmtTime(x2Left)}</span>}
    </div>
  );
}

/** Вызов стража: когда волны этапа пройдены и автобой стража выключен (или ждёт реванша). */
function GuardianCall() {
  const s = useGameState();
  const now = useNow();
  const phase = useBattle((b) => b.phase);
  const liveActive = useLive((l) => l.active);
  const target = targetStage({ s });
  if (!target || s.progress.wave < 3 || phase === 'boss' || liveActive) return null;
  const retryLeft = s.progress.retryAt - now;
  const kind = target.kind === 'boss' ? 'boss' : target.kind === 'mini' ? 'mini' : 'elite';
  return (
    <div className={st.call}>
      {retryLeft > 0 && s.settings.autoRetry && <span className={st.retry}>{t('battle.retryIn', { time: fmtTime(retryLeft) })}</span>}
      <Button
        pulse
        onClick={() => {
          sfx('click');
          requestBoss();
        }}
      >
        <Icon name="skull" size={18} />
        {t(`battle.call.${kind}`)}
      </Button>
    </div>
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
  if (!fromWelcome && (res.items.length > 0 || res.levels > 0 || res.gold > 0)) {
    useUi
      .getState()
      .toast(
        `+${formatNum(res.gold)} ${t('cur.gold')} · +${formatNum(res.xp)} ${t('cur.xp')}${res.items.length ? ` · ${t('welcome.items', { n: res.items.length })}` : ''}${res.levels ? ` · +${res.levels} ${t('legion.lvlShort')}` : ''}`,
        'good',
      );
  }
  return res;
}

/** Рост Легиона: уровень (общий для всех), цена, сила против рекомендуемой. */
function LegionPanel() {
  const s = useGameState();
  const cfg = useCfg();
  const lvl = s.legion.lvl;
  const max = legionMaxLevel(cfg);
  const cost = levelCost(cfg, lvl);
  const can = lvl < max && s.cur.gold >= cost.gold && s.cur.xp >= cost.xp;
  const power = partyPower(cfg, s);
  const target = targetStage({ s });
  const rec = target ? recommendedPower(cfg, target.n) : 0;
  const ratio = rec ? power / rec : 1;
  const brk = isBreakthrough(cfg, lvl);
  const up = async (n: number) => {
    const r = await useGame.getState().act('legion.level', { n });
    if (r.ok) {
      sfx('levelup');
      haptic.success();
    }
  };
  return (
    <div className={st.legion}>
      <div className={st.legionTop}>
        <div className={st.legionLvl}>
          <span className={css.tiny}>{t('legion.level')}</span>
          <b>{lvl}</b>
        </div>
        <div className={css.grow}>
          <div className={css.row} style={{ justifyContent: 'space-between' }}>
            <span className={css.cost}>
              <Icon name="battle" size={18} />
              {formatNum(power)}
            </span>
            {target && (
              <span className={cx(css.tiny, ratio >= 1 ? css.goodText : ratio >= 0.75 ? css.gold : css.badText)}>
                {t('legion.rec', { n: formatNum(rec) })}
              </span>
            )}
          </div>
          <div className={css.row} style={{ gap: 10, marginTop: 4 }}>
            <Cost cur="gold" amount={cost.gold} size={16} />
            <Cost cur="xp" amount={cost.xp} size={16} />
            {brk && <span className={st.brk}>{t('legion.breakthrough')}</span>}
          </div>
        </div>
      </div>
      <div className={css.row}>
        <Button block disabled={!can} onClick={() => void up(1)}>
          <Icon name="up" size={16} />
          {t('legion.up')}
        </Button>
        <Button kind="secondary" disabled={!can} style={{ flex: 'none', whiteSpace: 'nowrap', padding: '0 16px' }} onClick={() => void up(0)}>
          {t('legion.max')}
        </Button>
      </div>
      <FashionDay />
    </div>
  );
}

function ChestPanel() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useNow();
  const chest = previewChest(s, cfg, now);
  const cap = capMinutes(cfg, s, now);
  const items = Math.floor(chest.itemMin / cfg.income.itemEveryMin);
  const quickCost = s.day.quick < cfg.income.quickCrystals.length ? cfg.income.quickCrystals[s.day.quick] : null;
  const freeLeft = cfg.income.quickFree - s.day.quickFree;
  const boosts = boostsLeft({ cfg, s });

  const quick = async (method: 'free' | 'crystals') => {
    const r = await useGame.getState().act('chest.quick', { method });
    if (r.ok) {
      sfx('loot');
      getRenderer()?.lootBurst(20);
      showReward(t('battle.quick'), { cur: { gold: r.result.gold, xp: r.result.xp, steel: r.result.steel }, items: r.result.items });
    }
  };

  return (
    <div className={st.card}>
      <div className={st.cardHead}>
        <Icon name="chest" size={22} />
        <b className={css.grow}>{t('battle.chest')}</b>
        <span className={css.tiny}>
          {fmtTime(chest.minutes * 60000)} / {t('time.h', { n: Math.round(cap / 60) })}
        </span>
      </div>
      <Bar value={chest.minutes} max={cap} height={8} />
      <div className={css.row} style={{ gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <span className={css.cost}>
          <Icon name="gold" size={18} />
          {formatNum(chest.gold)}
        </span>
        <span className={css.cost}>
          <Icon name="xp" size={18} />
          {formatNum(chest.xp)}
        </span>
        <span className={css.cost}>
          <Icon name="steel" size={18} />
          {formatNum(chest.steel)}
        </span>
        <span className={css.cost}>
          <Icon name="gear" size={18} />
          {items}
        </span>
        <span className={css.grow} />
        <Button size="small" onClick={() => void collectChest()} pulse={chest.minutes >= cap}>
          {t('battle.collect')}
        </Button>
      </div>
      <div className={css.row} style={{ marginTop: 8 }}>
        {freeLeft > 0 ? (
          <Button kind="good" size="small" block onClick={() => void quick('free')}>
            <Icon name="speed" size={16} />
            {t('battle.quick')} · {freeLeft}/{cfg.income.quickFree}
          </Button>
        ) : quickCost !== null ? (
          <Button kind="secondary" size="small" block onClick={() => void quick('crystals')}>
            <Icon name="speed" size={16} />
            {t('battle.quick')} · <Cost cur="crystals" amount={quickCost} size={14} />
          </Button>
        ) : (
          <Button kind="secondary" size="small" block disabled>
            {t('battle.quick')}
          </Button>
        )}
        <Button
          kind="secondary"
          size="small"
          block
          disabled={boosts <= 0}
          onClick={async () => {
            const r = await useGame.getState().act('boost.x2');
            if (r.ok) useUi.getState().toast(t('battle.x2Desc'), 'good');
          }}
        >
          ×2 · {boosts}/{cfg.income.x2PerDay}
        </Button>
      </div>
      <div className={css.tiny} style={{ marginTop: 6 }}>
        {t('battle.income', { gold: formatNum(goldPerMin(cfg, s)), xp: formatNum(xpPerMin(cfg, s)) })}
      </div>
    </div>
  );
}

/** Трекер: ближайшее ежедневное задание (или «забрать награды»). */
function QuestTracker() {
  const s = useGameState();
  const ready = DAILY_QUESTS.filter((q) => !s.quests.dailyClaimed.includes(q.id) && (s.quests.daily[q.counter] ?? 0) >= q.target).length;
  const next = DAILY_QUESTS.find((q) => !s.quests.dailyClaimed.includes(q.id) && (s.quests.daily[q.counter] ?? 0) < q.target);
  if (!ready && !next) return null;
  return (
    <button className={cx(st.card, st.quest)} onClick={() => navigate('hub', { id: 'quests' })}>
      <Icon name="quest" size={24} />
      <div className={css.grow} style={{ textAlign: 'left' }}>
        {ready ? (
          <b className={css.gold}>{t('battle.questsReady', { n: ready })}</b>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{tl(next!.name)}</div>
            <Bar value={s.quests.daily[next!.counter] ?? 0} max={next!.target} height={6} />
          </>
        )}
      </div>
      <Icon name="back" size={16} style={{ transform: 'scaleX(-1)', opacity: 0.6 }} />
    </button>
  );
}

/** Кто ждёт в конце этапа: владычица с механикой или мини-босс. */
function GuardianHint() {
  const s = useGameState();
  const target = targetStage({ s });
  if (!target || target.kind === 'normal') return null;
  const act = ACTS[target.act - 1];
  const id = target.kind === 'boss' ? act.boss : act.minis[target.stage / 5 - 1];
  const def = ENEMY_MAP[id];
  return (
    <div className={cx(st.card, st.guardian)}>
      <img className="pixel" src={enemyUrl(id)} width={48} height={48} alt="" />
      <div className={css.grow}>
        <div className={css.tiny}>{t(target.kind === 'boss' ? 'battle.sovereign' : 'battle.mini')}</div>
        <b>{tl(def.name)}</b>
        {def.mechanic && <div className={css.tiny}>{tl(MECHANIC_TEXT[def.mechanic])}</div>}
        <div className={css.tiny} style={{ color: 'var(--accent-2)' }}>
          {t('battle.parryTip')}
        </div>
      </div>
    </div>
  );
}

/** Итог боя со стражем. */
function ResultWatcher() {
  const result = useBattle((b) => b.result);
  useEffect(() => {
    if (!result || Date.now() - result.at > 3000) return;
    const stage = result.stage as StageRef;
    if (result.win) {
      const r = result.rewards ?? {};
      useUi.getState().open((close) => (
        <Sheet title={t('battle.bossWin', { stage: stage ? stageLabel(stage) : '' })} onClose={close}>
          {result.mvp && <MvpCard hero={result.mvp} />}
          <RewardList r={{ cur: r.cur, items: r.items }} />
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
