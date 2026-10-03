import {
  ACTS,
  DUNGEONS,
  DUNGEON_LEVELS,
  ENEMY_MAP,
  ELEMENT_COLORS,
  RAID_TIERS,
  TOWER_SKIN_EVERY,
  dungeonEnemies,
  dungeonKeysLeft,
  dungeonOfDay,
  dungeonPrize,
  formatNum,
  raidBoss,
  raidElement,
  raidLevel,
  raidState,
  recommendedPower,
  partyPower,
  towerEnemies,
  towerLevel,
  towerMod,
  towerReward,
  towerSkin,
  type Currency,
  type DungeonDef,
} from '@idle/shared';
import { useState } from 'react';
import { enemyUrl } from '../../art/runtime';
import { playMode } from '../../components/BattleModal';
import { Button, Cost, Icon, Panel, css, cx, elementName } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { BackHeader, RewardList, showReward } from '../common';
import { Festival } from './Festival';
import { Fishing } from './Fishing';
import { Sortie } from './Sortie';
import st from './Adventures.module.css';

export function ModeScreen({ id }: { id: string }) {
  switch (id) {
    case 'tower':
      return <Tower />;
    case 'dungeons':
      return <Dungeons />;
    case 'raid':
      return <Raid />;
    case 'fishing':
      return <Fishing />;
    case 'festival':
      return <Festival />;
    case 'sortie':
      return <Sortie />;
    default:
      return <BackHeader title={id} />;
  }
}

/** Сила отряда против рекомендуемой для уровня врагов. */
function PowerCheck({ lvl }: { lvl: number }) {
  const s = useGameState();
  const cfg = useCfg();
  const pw = partyPower(cfg, s);
  const rec = recommendedPower(cfg, lvl);
  const ok = pw >= rec;
  return (
    <div className={css.row} style={{ gap: 6 }}>
      <Icon name="sword" size={16} />
      <b className={css.num} style={{ color: ok ? 'var(--good)' : pw >= rec * 0.8 ? 'var(--accent)' : 'var(--bad)' }}>{formatNum(pw)}</b>
      <span className={css.tiny}>{t('legion.rec', { n: formatNum(rec) })}</span>
    </div>
  );
}

function CurRow({ cur }: { cur: Partial<Record<Currency | string, number>> }) {
  return (
    <div className={css.row} style={{ gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(cur)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => (
          <Cost key={k} cur={k} amount={v ?? 0} size={16} />
        ))}
    </div>
  );
}

// ——— Башня испытаний ———

function Tower() {
  const s = useGameState();
  const cfg = useCfg();
  const floor = s.modes.tower + 1;
  const mod = towerMod(floor);
  const lvl = towerLevel(floor);
  const enemies = towerEnemies(cfg, floor);
  const reward = towerReward(floor);
  const act = (Math.floor((floor - 1) / 10) % ACTS.length) + 1;
  const nextSkin = Math.ceil(floor / TOWER_SKIN_EVERY) * TOWER_SKIN_EVERY;
  const skinId = towerSkin(nextSkin);

  const fight = () =>
    void playMode('tower.fight', {}, t('adv.floor', { n: floor }), act, (res) => ({
      outcome: res.win ? t('adv.floorDone', { n: res.floor }) : undefined,
      result: res.win ? <RewardList r={res.rewards} /> : undefined,
    }));

  return (
    <div className={css.col}>
      <BackHeader title={t('mode.tower')} />
      <div className={st.modeHead} style={{ ['--c' as string]: '#a58bff' }}>
        <Icon name="tower" size={56} />
        <div className={css.grow}>
          <div className={css.tiny}>{t('adv.towerFloor')}</div>
          <div className={st.bigNum}>{floor}</div>
          <div className={css.tiny}>{t('adv.towerBest', { n: s.modes.tower })}</div>
        </div>
      </div>
      <Panel title={mod ? tl(mod.name) : t('adv.towerBoss')} right={<span className={css.tiny}>{t('common.lvl', { lvl })}</span>}>
        <div className={css.tiny} style={{ marginBottom: 8, color: mod?.hero ? 'var(--good)' : mod ? 'var(--rose)' : undefined }}>
          {mod ? tl(mod.desc) : t('adv.towerBossHint')}
        </div>
        <div className={st.enemies}>
          {enemies.map((u, i) => (
            <img key={i} className="pixel" src={enemyUrl(u.ref)} alt="" title={tl(ENEMY_MAP[u.ref]?.name)} />
          ))}
        </div>
        <div className={css.divider} />
        <div className={css.tiny} style={{ marginBottom: 4 }}>
          {t('adv.firstClear')}
        </div>
        <CurRow cur={reward.cur} />
        {reward.item && <div className={css.tiny} style={{ marginTop: 4 }}>{t('adv.towerItem', { r: t(`rarity.${reward.item}`) })}</div>}
        <div className={css.divider} />
        <PowerCheck lvl={lvl} />
        <Button block size="big" style={{ marginTop: 10 }} onClick={fight}>
          {t('adv.fight')}
        </Button>
      </Panel>
      {skinId && (
        <Panel>
          <div className={css.row}>
            <Icon name="star" size={22} />
            <div className={css.tiny}>{t('adv.towerSkin', { n: nextSkin })}</div>
          </div>
        </Panel>
      )}
      <Panel title={t('adv.nextFloors')}>
        <div className={css.col} style={{ gap: 6 }}>
          {[1, 2, 3, 4, 5].map((d) => {
            const f = floor + d;
            const m = towerMod(f);
            return (
              <div key={f} className={st.floorRow}>
                <span className={st.floorNum}>{f}</span>
                <span className={css.grow}>{m ? tl(m.name) : <b style={{ color: 'var(--rose)' }}>{t('adv.towerBoss')}</b>}</span>
                <CurRow cur={towerReward(f).cur} />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ——— Подземелья ———

const DUNGEON_COLOR: Record<DungeonDef['id'], string> = { gold: '#ffc14d', library: '#6ab8ff', forge: '#ff8a5a' };

function Dungeons() {
  const now = useGame.getState().now();
  const today = dungeonOfDay(now);
  return (
    <div className={css.col}>
      <BackHeader title={t('mode.dungeons')} />
      <div className={css.tiny}>{t('adv.dungeonsHint')}</div>
      {DUNGEONS.map((d) => (
        <DungeonCard key={d.id} d={d} today={today === d.id} />
      ))}
    </div>
  );
}

function DungeonCard({ d, today }: { d: DungeonDef; today: boolean }) {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const best = s.modes.dungeons[d.id] ?? 0;
  const maxTier = Math.min(cfg.modes.dungeonTiers, best + 1);
  const [tier, setTier] = useState(maxTier);
  const tr = Math.min(tier, maxTier);
  const keys = dungeonKeysLeft({ cfg, s }, d.id);
  const prize = dungeonPrize(cfg, s, d.id, tr, now);
  const { items, ...cur } = prize;
  const lvl = DUNGEON_LEVELS[tr - 1];

  const fight = () =>
    void playMode('dungeon.fight', { id: d.id, tier: tr }, `${tl(d.name)} · ${tr}`, d.act, (res) => ({
      result: res.win ? <RewardList r={res.rewards} /> : undefined,
    }));

  return (
    <div className={st.dungeon} style={{ ['--c' as string]: DUNGEON_COLOR[d.id] }}>
      <div className={css.row}>
        <Icon name={d.icon} size={40} />
        <div className={css.grow}>
          <div className={css.row} style={{ gap: 6 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>{tl(d.name)}</b>
            {today && <span className={st.dayTag}>×1,5</span>}
          </div>
          <div className={css.tiny}>{tl(d.desc)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={css.tiny}>{t('adv.keysLeft')}</div>
          <b className={css.num} style={{ color: keys > 0 ? 'var(--text)' : 'var(--bad)' }}>
            {keys}/{cfg.modes.dungeonKeys}
          </b>
        </div>
      </div>
      <div className={css.row} style={{ justifyContent: 'space-between' }}>
        <div className={st.stepper}>
          <button className={st.stepBtn} disabled={tr <= 1} onClick={() => setTier(tr - 1)}>
            −
          </button>
          <div style={{ textAlign: 'center', minWidth: 64 }}>
            <div className={css.tiny}>{t('adv.tier')}</div>
            <b className={css.num}>
              {tr}/{cfg.modes.dungeonTiers}
            </b>
          </div>
          <button className={st.stepBtn} disabled={tr >= maxTier} onClick={() => setTier(tr + 1)}>
            +
          </button>
        </div>
        <span className={css.tiny}>{t('common.lvl', { lvl })}</span>
      </div>
      <div className={css.row} style={{ gap: 8, flexWrap: 'wrap' }}>
        <CurRow cur={cur} />
        {items > 0 && <span className={css.tiny}>+{t('adv.items', { n: items })}</span>}
      </div>
      <PowerCheck lvl={lvl} />
      <div className={css.row} style={{ gap: 8 }}>
        <Button block disabled={keys <= 0} onClick={fight}>
          {t('adv.fight')}
        </Button>
        {best > 0 && (
          <Button
            block
            kind="secondary"
            disabled={keys <= 0}
            onClick={async () => {
              const r = await useGame.getState().act('dungeon.sweep', { id: d.id, tier: Math.min(tr, best) });
              if (r.ok) showReward(t('adv.swept', { n: Math.min(tr, best) }), r.result.rewards);
            }}
          >
            {t('adv.sweep', { n: Math.min(tr, best) })}
          </Button>
        )}
      </div>
    </div>
  );
}

// ——— Колосс ———

function Raid() {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const r = raidState({ s, now });
  const boss = raidBoss(cfg, s, now);
  const def = ENEMY_MAP[boss.id];
  const el = raidElement(now);
  const left = cfg.modes.raidAttempts - r.used;
  const share = r.bestDay / boss.hp;
  const nextTier = RAID_TIERS.findIndex((x, i) => !r.tiers.includes(i));
  const act = ACTS.findIndex((a) => a.element === el) + 1 || 1;

  const fight = () =>
    void playMode('raid.fight', {}, tl(def.name), act, (res) => ({
      outcome: (
        <span style={{ color: ELEMENT_COLORS[el] }}>
          {formatNum(res.dmg)} ({((100 * res.dmg) / res.hp).toFixed(1)}%)
        </span>
      ),
      result: Object.keys(res.rewards.cur).length ? <RewardList r={res.rewards} /> : <div className={css.tiny}>{t('adv.raidNoTier')}</div>,
    }));

  return (
    <div className={css.col}>
      <BackHeader title={t('mode.raid')} />
      <div className={st.modeHead} style={{ ['--c' as string]: ELEMENT_COLORS[el] }}>
        <img className={cx('pixel', st.colossus)} src={enemyUrl(boss.id)} alt="" />
        <div className={css.grow}>
          <div className={css.tiny}>{t('adv.raidToday', { el: elementName(el) })}</div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 19 }}>{tl(def.name)}</b>
          <div className={css.tiny}>
            {t('common.lvl', { lvl: raidLevel(s) })} · {t('adv.raidHp', { hp: formatNum(boss.hp) })}
          </div>
          <div className={css.tiny} style={{ marginTop: 4 }}>
            {t('adv.attempts', { n: left, max: cfg.modes.raidAttempts })}
          </div>
        </div>
      </div>
      <Panel title={t('adv.raidTiers')}>
        <div className={st.tiersBar}>
          <div className={st.tiersFill} style={{ width: `${Math.min(100, share * 100)}%` }} />
          {RAID_TIERS.map((x, i) => (
            <span key={i} className={cx(st.tierMark, r.tiers.includes(i) && st.tierMarkOn)} style={{ left: `${x.at * 100}%` }} />
          ))}
        </div>
        <div className={css.tiny}>{t('adv.raidBest', { pct: (share * 100).toFixed(1), dmg: formatNum(r.bestDay) })}</div>
        {nextTier >= 0 && (
          <div className={css.row} style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className={css.tiny}>{t('adv.raidNext', { pct: Math.round(RAID_TIERS[nextTier].at * 100) })}</span>
            <CurRow cur={RAID_TIERS[nextTier].cur} />
          </div>
        )}
        <div className={css.tiny} style={{ marginTop: 8 }}>
          {t('adv.raidHint')}
        </div>
        <Button block size="big" style={{ marginTop: 10 }} disabled={left <= 0} onClick={fight}>
          {left > 0 ? t('adv.fight') : t('adv.raidTomorrow')}
        </Button>
      </Panel>
    </div>
  );
}
