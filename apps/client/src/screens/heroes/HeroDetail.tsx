import {
  CLASSES,
  GEAR_SLOTS,
  HEROINE_MAP,
  ROSTER,
  SETS,
  SKINS,
  SLOT_NAMES,
  fashionFits,
  fashionOfDay,
  heroLevel,
  heroStats,
  maxRank,
  passiveTier,
  rankCap,
  rankCost,
  setCounts,
  skillCost,
  skillPower,
  stageRef,
  type FinalStats,
  type GearSlot,
  type SkillDef,
} from '@idle/shared';
import { useState } from 'react';
import { sfx } from '../../audio/sfx';
import { FashionDay } from '../../components/Fashion';
import { HeroImg } from '../../components/HeroImg';
import { Button, CLASS_COLOR, Cost, ElementIcon, Icon, ItemSlot, Panel, Rank, Tabs, confirmDialog, css, cx, elementName, formatNum, itemName, rarityColor } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { navigate, useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { BackHeader, UnequipAllButton, skinSourceText } from '../common';
import { mainShort, pct } from '../gear/itemText';
import { openSlotPicker } from '../gear/SlotPicker';
import { CombosPanel } from '../HeroesTab';
import st from './Legion.module.css';

type TabId = 'rank' | 'gear' | 'skills' | 'skins' | 'bio';

/** Соседний герой (стрелки по краям карточки). */
function switchHero(id: string, dir: 1 | -1) {
  const s = useGame.getState().state!;
  const own = ROSTER.filter((x) => s.heroines[x]);
  const i = own.indexOf(id);
  const next = own[(i + dir + own.length) % own.length];
  if (!next || next === id) return;
  haptic.select();
  useUi.setState((u) => ({ stacks: { ...u.stacks, heroes: [...u.stacks.heroes.slice(0, -1), { id: 'hero', params: { id: next } }] } }));
}

export function HeroDetail({ id }: { id: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const [tab, setTab] = useState<TabId>('rank');

  if (!h) return <NotOwned id={id} />;
  const build = heroStats(cfg, s, id);
  const cls = CLASSES[def.cls];
  const color = CLASS_COLOR[def.cls];
  const lvl = heroLevel(cfg, s, h);
  const cap = rankCap(cfg, h.rank);
  const owned = ROSTER.filter((x) => s.heroines[x]).length;

  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} right={<Rank n={h.rank} size={12} />} />
      <div className={st.hero} style={{ ['--c' as string]: color }}>
        {owned > 1 && (
          <>
            <button className={st.switch} style={{ left: 4 }} onClick={() => switchHero(id, -1)} aria-label="prev">
              ‹
            </button>
            <button className={st.switch} style={{ right: 4 }} onClick={() => switchHero(id, 1)} aria-label="next">
              ›
            </button>
          </>
        )}
        <div className={st.heroArt}>
          <HeroImg className="pixel" id={id} skin={h.skin} />
        </div>
        <div className={st.heroInfo} style={{ paddingRight: owned > 1 ? 26 : 0 }}>
          <div className={st.heroName}>{tl(def.name)}</div>
          <div className={st.heroTitle}>{tl(def.title)}</div>
          <div className={st.chips}>
            <span className={st.chipC} style={{ color, borderColor: color }}>
              <Icon name={def.cls} size={13} />
              {tl(cls.name)}
            </span>
            <span className={st.chipC}>
              <ElementIcon el={def.element} size={13} />
              {elementName(def.element)}
            </span>
          </div>
          <div className={css.tiny}>{tl(cls.role)}</div>
          <div className={st.bigStat}>
            <div>
              <span>{t('common.level')}</span>
              <b className={cx(s.legion.lvl > lvl && st.capped)}>
                {lvl}
                <small style={{ fontSize: 12, color: 'var(--text-2)' }}>/{cap}</small>
              </b>
            </div>
            <div>
              <span>{t('common.power')}</span>
              <b>{formatNum(build.power)}</b>
            </div>
          </div>
        </div>
      </div>

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'rank', label: t('heroes.tabRank') },
          { id: 'gear', label: t('heroes.tabGear') },
          { id: 'skills', label: t('heroes.tabSkills') },
          { id: 'skins', label: t('heroes.tabSkins') },
          { id: 'bio', label: t('heroes.tabBio') },
        ]}
      />
      {tab === 'rank' && <RankPanel id={id} stats={build.stats} />}
      {tab === 'gear' && <GearPanel id={id} />}
      {tab === 'skills' && <SkillsPanel id={id} />}
      {tab === 'skins' && <SkinsPanel id={id} />}
      {tab === 'bio' && <BioPanel id={id} />}
    </div>
  );
}

// ——— ранг и характеристики ———

const STAT_ROWS: { k: keyof FinalStats; pct?: boolean }[] = [
  { k: 'hp' },
  { k: 'atk' },
  { k: 'def' },
  { k: 'haste', pct: true },
  { k: 'crit', pct: true },
  { k: 'critDmg', pct: true },
  { k: 'skillDmg', pct: true },
  { k: 'lifesteal', pct: true },
  { k: 'heal', pct: true },
  { k: 'dmgRed', pct: true },
  { k: 'energy', pct: true },
];

function RankPanel({ id, stats }: { id: string; stats: FinalStats }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const cost = rankCost(cfg, h.rank);
  const cap = rankCap(cfg, h.rank);
  const nextCap = h.rank < maxRank(cfg) ? rankCap(cfg, h.rank + 1) : null;
  const needLvl = s.legion.lvl < cap;
  const afford = !!cost && s.cur.emblems >= cost.emblems && s.cur.gold >= cost.gold;
  const tierNext = h.rank + 1 === 3 || h.rank + 1 === 5;

  return (
    <>
      <Panel title={t('heroes.rankTitle')}>
        <div className={st.rankBox}>
          <div className={st.rankBig}>
            <div>
              <b>★{h.rank}</b>
              <span>{t('heroes.rankOf', { max: maxRank(cfg) })}</span>
            </div>
          </div>
          <div className={css.grow}>
            {nextCap ? (
              <>
                <div>
                  {t('heroes.capLine')}: <b>{cap}</b> <span className={st.arrow}>→</span> <b className={css.gold}>{nextCap}</b>
                </div>
                <div className={css.tiny}>{t('heroes.rankGain', { pct: Math.round((cfg.hero.rankMult - 1) * 100) })}</div>
                {tierNext && <div className={css.tiny} style={{ color: 'var(--rose)' }}>{t('heroes.rankPassive', { n: h.rank + 1 })}</div>}
              </>
            ) : (
              <div className={css.gold}>{t('heroes.rankMax')}</div>
            )}
          </div>
        </div>
        {cost && (
          <>
            <div className={css.divider} />
            {needLvl && <div className={css.tiny} style={{ marginBottom: 6, color: '#ffb0b8' }}>{t('heroes.rankNeedLvl', { lvl: cap })}</div>}
            <Button
              block
              kind={afford && !needLvl ? 'good' : 'secondary'}
              disabled={needLvl}
              onClick={async () => {
                const r = await useGame.getState().act('hero.rank', { id });
                if (r.ok) {
                  sfx('rare');
                  haptic.success();
                  useUi.getState().toast(t('heroes.rankUp', { name: tl(def.name), n: h.rank + 1, cap: nextCap ?? cap }), 'good');
                }
              }}
            >
              <Icon name="rank" size={16} />
              {t('heroes.rankBtn')}
              <Cost cur="emblems" amount={cost.emblems} size={14} />
              <Cost cur="gold" amount={cost.gold} size={14} />
            </Button>
          </>
        )}
      </Panel>
      <Panel title={t('heroes.tabStats')}>
        <div className={st.stats}>
          {STAT_ROWS.map(({ k, pct: p }) => (
            <div key={k} className={st.stat}>
              <span>{t(`stat.${k}`)}</span>
              <b>{p ? pct(stats[k]) : formatNum(stats[k])}</b>
            </div>
          ))}
        </div>
        <div className={css.tiny} style={{ marginTop: 8 }}>
          {t('heroes.statsHint')}
        </div>
      </Panel>
    </>
  );
}

// ——— снаряжение ———

function GearPanel({ id }: { id: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const h = s.heroines[id];
  const counts = setCounts(s, h);
  const sets = SETS.filter((x) => (counts[x.id] ?? 0) > 0);
  return (
    <>
      <Panel
        title={t('gear.title')}
        right={
          <div className={css.row} style={{ gap: 4 }}>
            <UnequipAllButton hero={id} />
            <Button
              size="small"
              onClick={async () => {
                const r = await useGame.getState().act('party.autoEquip', { hero: id });
                if (r.ok) useUi.getState().toast(t('gear.autoDone', { n: r.result.changes }), 'good');
              }}
            >
              {t('gear.auto')}
            </Button>
          </div>
        }
      >
        <div className={st.slots}>
          {GEAR_SLOTS.map((slot: GearSlot) => {
            const it = h.gear[slot] ? s.items[h.gear[slot]!] : null;
            return (
              <div key={slot} className={st.slot} onClick={() => openSlotPicker(id, slot)}>
                <ItemSlot item={it} placeholder={slot} size={48} onClick={() => openSlotPicker(id, slot)} />
                <div className={st.slotText}>
                  <span className={css.tiny}>{tl(SLOT_NAMES[slot])}</span>
                  {it ? (
                    <>
                      <b style={{ color: rarityColor(it.rarity) }}>{itemName(it)}</b>
                      <span className={css.tiny}>{mainShort(cfg, it)}</span>
                    </>
                  ) : (
                    <span className={css.tiny} style={{ color: 'var(--accent)' }}>
                      {t('gear.tapToEquip')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title={t('gear.sets')}>
        {sets.length === 0 && <div className={css.tiny}>{t('gear.setsHint')}</div>}
        <div className={css.col} style={{ gap: 6 }}>
          {sets.map((set) => {
            const n = counts[set.id] ?? 0;
            return (
              <div key={set.id} className={st.setRow}>
                <span className={st.setDot} style={{ background: set.color }} />
                <div className={css.grow}>
                  <b style={{ color: set.color }}>
                    {tl(set.name)} · {n}/4
                  </b>
                  <div style={{ opacity: n >= 2 ? 1 : 0.45 }}>2: {tl(set.two.text)}</div>
                  <div style={{ opacity: n >= 4 ? 1 : 0.45 }}>4: {tl(set.four)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

// ——— навыки ———

function SkillsPanel({ id }: { id: string }) {
  const s = useGameState();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const cls = CLASSES[def.cls];
  const tier = passiveTier(h.rank);
  return (
    <>
      <SkillCard id={id} which="skill" skill={cls.skill} />
      <SkillCard id={id} which="ult" skill={cls.ult} />
      <Panel title={`${t('heroes.passive')}: ${tl(cls.passive.name)}`}>
        {cls.passive.desc.map((d, i) => (
          <div key={i} className={cx(st.tier, i > tier && st.tierOff)}>
            <span className={st.tierStar}>★{[1, 3, 5][i]}</span>
            <span>{tl(d)}</span>
          </div>
        ))}
      </Panel>
      <CombosPanel only={def.cls} />
    </>
  );
}

function SkillCard({ id, which, skill }: { id: string; which: 'skill' | 'ult'; skill: SkillDef }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const lvl = h[which];
  const cost = skillCost(cfg, s, lvl);
  const afford = !!cost && s.cur.books >= cost.books && s.cur.gold >= cost.gold;
  const color = CLASS_COLOR[def.cls];
  return (
    <div className={st.skill} style={{ ['--c' as string]: color }}>
      <div className={st.skillHead}>
        <div className={cx(st.skillIcon, which === 'ult' && st.ultIcon)}>
          <Icon name={which === 'ult' ? 'star' : def.cls} size={26} />
        </div>
        <div className={css.grow}>
          <div className={css.tiny} style={{ color, fontWeight: 800, textTransform: 'uppercase' }}>
            {which === 'ult' ? t('heroes.ultLabel') : t('heroes.skillLabel')}
          </div>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>{tl(skill.name)}</b>
        </div>
        <span className={st.skillLvl}>
          {lvl}/{cfg.hero.maxSkill}
        </span>
      </div>
      <div className={st.skillDesc}>{tl(skill.desc)}</div>
      <div className={css.row} style={{ gap: 6, flexWrap: 'wrap' }}>
        {which === 'skill' ? <span className={st.tag}>⏱ {t('heroes.cd', { s: ((skill.cd ?? 0) / 1000).toFixed(1).replace('.0', '') })}</span> : <span className={st.tag}>⚡ {t('heroes.energyCost')}</span>}
        <span className={st.tag}>{t('heroes.skillPower', { pct: Math.round(skillPower(cfg, lvl) * 100) })}</span>
      </div>
      {cost ? (
        <Button
          size="small"
          kind={afford ? 'good' : 'secondary'}
          onClick={async () => {
            const r = await useGame.getState().act('hero.skill', { id, which });
            if (r.ok) {
              sfx('levelup');
              haptic.success();
            }
          }}
        >
          {t('heroes.skillUp')}
          <Cost cur="books" amount={cost.books} size={14} />
          <Cost cur="gold" amount={cost.gold} size={14} />
        </Button>
      ) : (
        <div className={css.tiny} style={{ color: 'var(--accent)' }}>
          {t('heroes.skillMax')}
        </div>
      )}
    </div>
  );
}

// ——— облики ———

function SkinsPanel({ id }: { id: string }) {
  const s = useGameState();
  const h = s.heroines[id];
  const skins = SKINS.filter((x) => x.hero === id);
  const theme = fashionOfDay(s.day.key);
  const owned = skins.filter((x) => s.skins.includes(x.id)).length;
  return (
    <Panel title={t('heroes.tabSkins')} right={<span className={css.tiny}>{t('heroes.collection', { n: owned, total: skins.length })}</span>}>
      <div style={{ marginBottom: 8 }}>
        <FashionDay party={false} />
      </div>
      <div className={st.skins}>
        <div className={cx(st.skin, !h.skin && st.skinOn)} onClick={() => void useGame.getState().act('hero.skin', { id, skin: null })}>
          <HeroImg className="pixel" id={id} still />
          <div className={st.skinName}>{t('heroes.skinNone')}</div>
        </div>
        {skins.map((sk) => {
          const has = s.skins.includes(sk.id);
          return (
            <div
              key={sk.id}
              className={cx(st.skin, h.skin === sk.id && st.skinOn)}
              onClick={() => {
                if (has) void useGame.getState().act('hero.skin', { id, skin: sk.id });
                else if (sk.crystals) confirmDialog(t('shop.buySkin', { name: tl(sk.name), n: sk.crystals }), () => void useGame.getState().act('shop.buy', { offer: `sk_${sk.id}` }));
                else useUi.getState().toast(skinSourceText(sk.id, true), 'info');
              }}
            >
              <HeroImg className={cx('pixel', !has && css.dim)} id={id} skin={sk.id} still={!has} unarmed={!!sk.look.wear} flirt={has && !!sk.look.wear} />
              <div className={st.skinName}>{tl(sk.name)}</div>
              {fashionFits(sk.id, theme) && <div className={css.tiny} style={{ color: '#ff9ac8' }}>{t('fashion.today')}</div>}
              <div className={css.tiny}>{has ? t('heroes.skinBonus') : sk.crystals ? <Cost cur="crystals" amount={sk.crystals} size={12} /> : skinSourceText(sk.id)}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ——— о герое ———

function BioPanel({ id }: { id: string }) {
  const s = useGameState();
  const def = HEROINE_MAP[id];
  const bond = s.bond?.[id]?.lvl ?? 0;
  return (
    <Panel title={tl(def.title)}>
      <p style={{ lineHeight: 1.5, margin: '0 0 8px' }}>{tl(def.bio)}</p>
      <p className={css.gold} style={{ fontStyle: 'italic', margin: '0 0 10px' }}>
        «{tl(def.quote)}»
      </p>
      <div className={css.row}>
        <Icon name="care" size={22} />
        <div className={css.grow}>
          <b>{t('heroes.bond', { n: bond })}</b>
          <div className={css.tiny}>{t('heroes.bondHint')}</div>
        </div>
        <Button size="small" kind="secondary" onClick={() => navigate('hub', { id: 'care', params: { hero: id } })}>
          {t('heroes.bondGo')}
        </Button>
      </div>
    </Panel>
  );
}

function NotOwned({ id }: { id: string }) {
  const def = HEROINE_MAP[id];
  const cls = CLASSES[def.cls];
  const ref = stageRef(Math.max(1, def.join));
  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} />
      <div className={st.hero} style={{ ['--c' as string]: CLASS_COLOR[def.cls] }}>
        <div className={st.heroArt}>
          <HeroImg className="pixel" id={id} still style={{ filter: 'brightness(0.2)' }} />
        </div>
        <div className={st.heroInfo}>
          <div className={st.heroName}>{tl(def.name)}</div>
          <div className={st.heroTitle}>{tl(def.title)}</div>
          <div className={st.chips}>
            <span className={st.chipC}>
              <Icon name={def.cls} size={13} />
              {tl(cls.name)}
            </span>
          </div>
          <div className={css.tiny}>{tl(cls.role)}</div>
          <div className={st.chipC} style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
            <Icon name="lock" size={12} /> {t('legion.joinsAt', { act: ref.act, stage: ref.stage })}
          </div>
        </div>
      </div>
      <Panel>
        <p style={{ lineHeight: 1.45, margin: 0 }}>{tl(def.bio)}</p>
      </Panel>
    </div>
  );
}
