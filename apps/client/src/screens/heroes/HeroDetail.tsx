import {
  CLASSES,
  EQUIP_SLOTS,
  HEROINE_MAP,
  SKINS,
  SLOT_NAMES,
  buildHeroine,
  equipSlotToItemSlot,
  fxText,
  goldToNext,
  isUnlocked,
  itemPower,
  levelCap,
  statText,
  xpToNext,
  type FinalStats,
  type StatKey,
} from '@idle/shared';
import { useState } from 'react';
import { heroUrl } from '../../art/runtime';
import { HeroImg } from '../../components/HeroImg';
import { Button, Cost, ElementIcon, Icon, ItemSlot, Panel, Stars, Tabs, css, cx, elementName, formatNum, confirmDialog } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader, openItem } from '../common';
import { SkillTree } from './SkillTree';

type TabId = 'stats' | 'tree' | 'gear' | 'skins' | 'bio';

export function HeroDetail({ id }: { id: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const h = s.heroines[id];
  const [tab, setTab] = useState<TabId>('stats');
  const party = s.party.presets[s.party.active].filter(Boolean) as string[];

  if (!h) return <NotOwned id={id} />;
  const build = buildHeroine(cfg, s, h, { party: party.includes(id) ? party : undefined });
  const cap = levelCap(cfg, h);
  const xp = xpToNext(cfg, h.lvl);
  const gold = goldToNext(cfg, h.lvl);
  const maxStars = cfg.hero.maxStars[def.rarity];
  const shards = s.shards[id] ?? 0;
  const starNeed = cfg.hero.starShards[h.stars - 1];
  const cls = CLASSES[def.cls];

  const level = async (times: number) => {
    const r = await useGame.getState().act('hero.level', { id, times });
    if (r.ok) {
      sfx('levelup');
      haptic.success();
    }
  };

  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} right={<Stars n={h.stars} max={maxStars} size={14} />} />
      <Panel>
        <div className={css.row} style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ position: 'relative', flex: 'none' }}>
            <HeroImg className="pixel" id={id} skin={h.skin} width={128} height={128} style={{ animation: 'bob 1.4s ease-in-out infinite', filter: h.awakened ? 'drop-shadow(0 0 6px #ffe8a0)' : undefined }} />
          </div>
          <div className={css.grow}>
            <div className={css.title}>{tl(def.name)}</div>
            <div className={css.tiny}>{tl(def.title)}</div>
            <div className={css.row} style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={css.chip} style={{ color: { R: '#3d7be0', SR: '#9b4de0', SSR: '#f08a24', UR: '#e03a3a' }[def.rarity] }}>
                {def.rarity}
              </span>
              <span className={css.chip}>
                <Icon name={def.cls} size={14} />
                {tl(cls.name)}
                {h.spec && ` · ${tl(cls.specs[h.spec === 'A' ? 0 : 1].name)}`}
              </span>
              <span className={css.chip}>
                <ElementIcon el={def.element} size={14} />
                {elementName(def.element)}
              </span>
            </div>
            <div className={css.row} style={{ marginTop: 6 }}>
              <Icon name="battle" size={18} />
              <b className={css.num}>{formatNum(build.power)}</b>
              <span className={css.tiny}>{t('common.power')}</span>
            </div>
            <div className={css.tiny} style={{ marginTop: 2 }}>
              {t('common.lvl', { lvl: h.lvl })} · {t('heroes.cap', { cap })}
            </div>
          </div>
        </div>
        <div className={css.divider} />
        <div className={css.row} style={{ flexWrap: 'wrap', gap: 6 }}>
          <Button size="small" disabled={h.lvl >= cap} onClick={() => void level(1)}>
            {t('heroes.levelUp')}
            <Cost cur="xp" amount={xp} size={14} />
            <Cost cur="gold" amount={gold} size={14} />
          </Button>
          <Button size="small" kind="secondary" disabled={h.lvl >= cap} onClick={() => void level(10)}>
            {t('heroes.levelUp10')}
          </Button>
          <Button size="small" kind="secondary" disabled={h.lvl >= cap} onClick={() => void level(500)}>
            {t('heroes.levelMax')}
          </Button>
        </div>
        <div className={css.row} style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {h.stars < maxStars && (
            <Button
              size="small"
              kind={shards >= starNeed ? 'good' : 'secondary'}
              disabled={shards < starNeed || !isUnlocked({ s, cfg }, 'stars')}
              onClick={async () => {
                const r = await useGame.getState().act('hero.star', { id });
                if (r.ok) sfx('rare');
              }}
            >
              <Icon name="star" size={16} />
              {t('heroes.starUp')} · {shards}/{starNeed}
            </Button>
          )}
          {def.rarity === 'UR' && h.stars >= 6 && !h.awakened && (
            <Button size="small" onClick={() => void useGame.getState().act('hero.awaken', { id })}>
              {t('heroes.awaken')}
              <Cost cur="crystals" amount={cfg.hero.awakenCrystals} size={14} />· {shards}/{cfg.hero.awakenShards}
            </Button>
          )}
          {h.lvl >= cfg.hero.specLevel ? (
            <Button size="small" kind="secondary" onClick={() => chooseSpec(id)}>
              {t('heroes.spec')}
            </Button>
          ) : (
            <span className={css.tiny}>{t('heroes.specAt', { lvl: cfg.hero.specLevel })}</span>
          )}
        </div>
      </Panel>

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'stats', label: t('heroes.tabStats') },
          { id: 'tree', label: t('heroes.tabTree') },
          { id: 'gear', label: t('heroes.tabGear') },
          { id: 'skins', label: t('heroes.tabSkins') },
          { id: 'bio', label: t('heroes.tabBio') },
        ]}
      />
      {tab === 'stats' && <StatsPanel stats={build.stats} fx={build.fx.map((f) => fxText(f, getLang()))} />}
      {tab === 'tree' && <SkillTree heroId={id} />}
      {tab === 'gear' && <HeroGear heroId={id} />}
      {tab === 'skins' && <HeroSkins heroId={id} />}
      {tab === 'bio' && (
        <Panel title={tl(def.title)}>
          <p style={{ lineHeight: 1.5, margin: '0 0 8px' }}>{tl(def.bio)}</p>
          <p className={css.gold} style={{ fontStyle: 'italic', margin: '0 0 8px' }}>
            «{tl(def.quote)}»
          </p>
          <div className={css.tiny}>{tl(cls.role)}</div>
          <div className={css.divider} />
          {cls.specs.map((sp) => (
            <div key={sp.id} style={{ marginBottom: 6 }}>
              <b>{tl(sp.name)}</b> <span className={css.muted}>— {tl(sp.desc)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

const MAIN_STATS: (keyof FinalStats)[] = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg', 'acc', 'eva', 'pen', 'lifesteal', 'healPower', 'resist', 'energyRegen'];
const PCT = new Set(['crit', 'critDmg', 'acc', 'eva', 'pen', 'lifesteal', 'healPower', 'resist', 'energyRegen']);

function StatsPanel({ stats, fx }: { stats: FinalStats; fx: string[] }) {
  const bonus = Object.entries(stats.bonus).filter(([, v]) => v);
  return (
    <Panel title="STATUS">
      {MAIN_STATS.map((k) => {
        const v = stats[k] as number;
        return (
          <div key={k} className={css.statRow}>
            <span className={css.muted}>{t(`stat.${k}`)}</span>
            <b className={css.num}>{PCT.has(k) ? `${Math.round(v * 1000) / 10}%` : formatNum(v)}</b>
          </div>
        );
      })}
      {bonus.map(([k, v]) => (
        <div key={k} className={css.statRow}>
          <span>{statText(k as StatKey, v as number, getLang())}</span>
        </div>
      ))}
      {fx.length > 0 && (
        <>
          <div className={css.divider} />
          {fx.map((f, i) => (
            <div key={i} className={css.tiny} style={{ color: '#f2c86a', padding: '2px 0' }}>
              <Icon name="star" size={10} /> {f}
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

function HeroGear({ heroId }: { heroId: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const h = s.heroines[heroId];
  return (
    <Panel
      title={t('gear.title')}
      right={
        <Button size="small" kind="secondary" onClick={() => void useGame.getState().act('item.autoEquip', { hero: heroId })}>
          {t('gear.auto')}
        </Button>
      }
    >
      <div className={css.list}>
        {EQUIP_SLOTS.map((slot) => {
          const it = h.gear[slot] ? s.items[h.gear[slot]!] : null;
          return (
            <div
              key={slot}
              className={css.listItem}
              style={{ cursor: 'pointer', padding: 4 }}
              onClick={() => {
                if (it) openItem(it.uid, heroId);
                else {
                  useUi.getState().setGearHero(heroId);
                  useUi.getState().setTab('gear');
                }
              }}
            >
              <ItemSlot item={it} placeholder={equipSlotToItemSlot(slot)} size={40} />
              <div className={css.grow}>
                <div className={css.tiny}>{tl(SLOT_NAMES[slot])}</div>
                {it ? <b style={{ fontSize: 13 }}>{formatNum(itemPower(cfg, it))}</b> : <span className={css.tiny}>{t('gear.empty')}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function HeroSkins({ heroId }: { heroId: string }) {
  const s = useGameState();
  const h = s.heroines[heroId];
  const skins = SKINS.filter((x) => x.hero === heroId);
  return (
    <Panel title={t('heroes.tabSkins')}>
      <div className={css.grid3}>
        <div className={cx(css.hero)} style={!h.skin ? { outline: '2px solid var(--accent-2)' } : undefined} onClick={() => void useGame.getState().act('hero.skin', { id: heroId, skin: null })}>
          <img className={css.heroSprite} src={heroUrl(heroId)} alt="" />
          <div className={css.heroName}>{t('heroes.skinNone')}</div>
        </div>
        {skins.map((sk) => {
          const owned = s.skins.includes(sk.id);
          return (
            <div
              key={sk.id}
              className={css.hero}
              style={h.skin === sk.id ? { outline: '2px solid var(--accent-2)' } : undefined}
              onClick={() => {
                if (owned) void useGame.getState().act('hero.skin', { id: heroId, skin: sk.id });
                else if (sk.crystals)
                  confirmDialog(t('shop.buySkin', { name: tl(sk.name), n: sk.crystals }), () => void useGame.getState().act('shop.buy', { offer: `sk_${sk.id}` }));
                else useUi.getState().toast(t('heroes.skinLocked'), 'info');
              }}
            >
              <img className={cx(css.heroSprite, !owned && css.dim)} src={heroUrl(heroId, sk.id)} alt="" />
              <div className={css.heroName}>{tl(sk.name)}</div>
              <div className={css.tiny}>{owned ? t('heroes.skinBonus') : sk.crystals ? <Cost cur="crystals" amount={sk.crystals} size={12} /> : t('heroes.skinLocked')}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function chooseSpec(id: string) {
  const def = HEROINE_MAP[id];
  const cls = CLASSES[def.cls];
  const h = useGame.getState().state!.heroines[id];
  useUi.getState().open((close) => (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, animation: 'slide-up .22s var(--ease)' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>{t('heroes.spec')}</div>
      <div className={css.col}>
        {cls.specs.map((sp) => (
          <div key={sp.id} className={css.listItem} style={{ alignItems: 'flex-start', flexDirection: 'column', borderColor: h.spec === sp.id ? 'var(--accent)' : undefined }}>
            <b className={css.gold}>{tl(sp.name)}</b>
            <span className={css.muted}>{tl(sp.desc)}</span>
            {sp.fx && (
              <span className={css.tiny}>
                <Icon name="star" size={10} /> {fxText(sp.fx, getLang())}
              </span>
            )}
            <span className={css.tiny}>
              {Object.entries(sp.passive)
                .map(([k, v]) => statText(k as StatKey, v as number, getLang()))
                .join(', ')}
            </span>
            {h.spec !== sp.id && (
              <Button
                size="small"
                onClick={async () => {
                  const r = await useGame.getState().act('hero.spec', { id, spec: sp.id });
                  if (r.ok) close();
                }}
              >
                {t('heroes.specChoose')}
                {h.spec && <Cost cur="crystals" amount={500} size={14} />}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  ));
}

function NotOwned({ id }: { id: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const def = HEROINE_MAP[id];
  const need = cfg.hero.recruitShards[def.rarity];
  const have = s.shards[id] ?? 0;
  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} />
      <Panel>
        <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
          <img className={cx('pixel', css.dim)} src={heroUrl(id)} width={128} height={128} alt="" />
          <div className={css.title}>{tl(def.name)}</div>
          <div className={css.muted}>{tl(def.title)}</div>
          <p style={{ lineHeight: 1.45 }}>{tl(def.bio)}</p>
          <div>{t('heroes.shards', { have, need })}</div>
          <Button disabled={have < need} onClick={() => void useGame.getState().act('hero.recruit', { id })}>
            {t('heroes.recruit', { n: need })}
          </Button>
          <div className={css.tiny}>{t('summon.freeNote')}</div>
        </div>
      </Panel>
    </div>
  );
}
