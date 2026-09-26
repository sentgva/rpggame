import {
  BOND_COSTUME_HEARTS,
  BOND_DATE_LVL,
  BOND_HEROES,
  BOND_LIMITS,
  BOND_MAX,
  BOND_MILESTONES,
  BOND_SPA_SKIN,
  BOND_STAT,
  BOND_XP,
  DATE_LINES,
  GREETINGS,
  HEROINE_MAP,
  PERSONALITY_NAMES,
  PLACES,
  REACTIONS,
  SKIN_MAP,
  SPA_LINES,
  TREATS,
  TREAT_LINES,
  bondCosts,
  bondState,
  bondTopic,
  bondTraits,
  type Place,
  type Treat,
} from '@idle/shared';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { HeroImg } from '../../components/HeroImg';
import { Bar, Button, Cost, Icon, Panel, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { BackHeader, showReward } from '../common';
import st from './Care.module.css';

interface Gain {
  xp: number;
  levelUps: number[];
  rewards: Record<string, number>;
  shards: number;
  lvl: number;
}

/** Вкусы открываются по мере сближения. */
const KNOW_TREAT = 2;
const KNOW_PLACE = 4;

export function Care({ hero }: { hero?: string }) {
  return hero && HEROINE_MAP[hero] ? <CareHero hero={hero} /> : <CareList />;
}

function Hearts() {
  const n = useGameState().bondHearts ?? 0;
  return (
    <span className={st.hearts} title={t('cur.hearts')}>
      <Icon name="hearts" size={22} />
      {n}
    </span>
  );
}

function CareList() {
  const s = useGameState();
  const now = useGame.getState().now();
  const list = [...BOND_HEROES].sort((a, b) => Number(!!s.heroines[b]) - Number(!!s.heroines[a]) || (s.bond?.[b]?.lvl ?? 0) - (s.bond?.[a]?.lvl ?? 0));
  const owned = list.filter((id) => s.heroines[id]).length;
  const hearts = s.bondHearts ?? 0;
  return (
    <div className={css.col}>
      <BackHeader title={t('care.title')} right={<Hearts />} />
      <div className={css.inset} style={{ fontSize: 13, lineHeight: 1.45 }}>
        {t('care.intro', { pct: Math.round(BOND_STAT * 100) })}
      </div>
      {owned === 0 && <div className={css.muted} style={{ textAlign: 'center', padding: 12 }}>{t('care.none')}</div>}
      <div className={css.grid4}>
        {list.map((id) => {
          const has = !!s.heroines[id];
          const b = bondState({ s, now }, id);
          const costumeReady = has && b.lvl >= BOND_MAX && hearts >= BOND_COSTUME_HEARTS && !s.skins.includes(`${id}_bond`);
          return (
            <button
              key={id}
              className={cx(st.card, !has && st.cardLocked)}
              onClick={() => {
                haptic.tap();
                if (!has) {
                  useUi.getState().toast(t('care.notOwned', { name: tl(HEROINE_MAP[id].name) }));
                  return;
                }
                useUi.getState().push({ id: 'care', params: { hero: id } });
              }}
            >
              <HeroImg id={id} skin={s.heroines[id]?.skin} still={!has} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{tl(HEROINE_MAP[id].name)}</span>
              {has ? <span className={st.lvl}>♥ {b.lvl}</span> : <Icon name="lock" size={14} />}
              {costumeReady && <span className={css.dot} style={{ top: 4, right: 4 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Scene = { kind: 'camp' } | { kind: 'spa' } | { kind: 'date'; place: Place };

function greetingTier(lvl: number) {
  return lvl >= 8 ? 2 : lvl >= 4 ? 1 : 0;
}

function CareHero({ hero }: { hero: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const now = useGame.getState().now();
  const def = HEROINE_MAP[hero];
  const tr = bondTraits(hero);
  const b = bondState({ s, now }, hero);
  const costs = bondCosts({ cfg, s });
  const [scene, setScene] = useState<Scene>({ kind: 'camp' });
  const [line, setLine] = useState(() => tl(GREETINGS[tr.p][greetingTier(b.lvl)]));
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const costume = `${hero}_bond`;
  const hasCostume = s.skins.includes(costume);
  const hearts = s.bondHearts ?? 0;

  function done(text: string, r: Gain, next: Scene) {
    setScene(next);
    setLine(text);
    setGain({ n: r.xp, key: Date.now() });
    if (r.levelUps.length) {
      haptic.success();
      const top = r.levelUps[r.levelUps.length - 1];
      const hasReward = Object.keys(r.rewards).length > 0 || r.shards > 0;
      const extra = (
        <div className={css.col} style={{ alignItems: 'center', marginBottom: 8 }}>
          <HeroImg id={hero} skin={s.heroines[hero]?.skin} width={120} height={120} className="pixel" unarmed />
          <div style={{ textAlign: 'center' }}>{t('care.levelUpText', { name: tl(def.name), pct: Math.round(BOND_STAT * 100 * top) })}</div>
          {top >= BOND_DATE_LVL && r.levelUps.includes(BOND_DATE_LVL) && <div className={css.goodText}>{t('care.dateOpen')}</div>}
          {top >= BOND_MAX && <div className={css.goodText}>{t('care.maxText', { n: BOND_COSTUME_HEARTS })}</div>}
        </div>
      );
      if (hasReward) showReward(t('care.levelUp', { lvl: top }), { cur: r.rewards, shards: r.shards ? { [hero]: r.shards } : undefined }, extra);
      else useUi.getState().toast(t('care.levelUp', { lvl: top }), 'good');
    } else haptic.tap();
  }

  function talk() {
    const { topic, order } = bondTopic(hero, b.day, b.talk);
    openSheet(t('care.talk'), (close) => (
      <div>
        <div className={css.row} style={{ alignItems: 'flex-start' }}>
          <HeroImg id={hero} skin={s.heroines[hero]?.skin} width={64} height={64} className="pixel" unarmed />
          <div className={css.inset} style={{ flex: 1, lineHeight: 1.45 }}>
            {tl(topic.line)}
          </div>
        </div>
        {order.map((i) => (
          <button
            key={i}
            className={st.answer}
            onClick={async () => {
              close();
              const r = await useGame.getState().act<Gain>('bond.talk', { hero, answer: i });
              if (r.ok && r.result) done(tl(REACTIONS[tr.p][i]), r.result, { kind: 'camp' });
            }}
          >
            {tl(topic.answers[i])}
          </button>
        ))}
      </div>
    ));
  }

  function treat() {
    openSheet(t('care.treat'), (close) => (
      <div className={css.col}>
        <div className={css.tiny}>{b.lvl >= KNOW_TREAT ? t('care.treatKnown') : t('care.treatHint', { lvl: KNOW_TREAT })}</div>
        {TREATS.map((x) => (
          <div key={x.id} className={css.listItem}>
            <span style={{ fontSize: 26 }}>{x.icon}</span>
            <span className={css.grow}>
              {tl(x.name)}
              {b.lvl >= KNOW_TREAT && x.id === tr.treat && <span className={st.lvl}> ♥ {t('care.fav')}</span>}
              {b.lvl >= KNOW_TREAT && x.id === tr.dislike && <span className={css.badText}> ✗ {t('care.dislike')}</span>}
            </span>
            <Button
              size="small"
              onClick={async () => {
                close();
                const r = await useGame.getState().act<Gain & { like: number; treat: Treat }>('bond.treat', { hero, treat: x.id });
                if (r.ok && r.result) done(`${x.icon} ${tl(TREAT_LINES[tr.p][r.result.like])}`, r.result, { kind: 'camp' });
              }}
            >
              <Cost cur="gold" amount={costs.treat.gold} size={14} />
            </Button>
          </div>
        ))}
      </div>
    ));
  }

  async function spa() {
    const r = await useGame.getState().act<Gain>('bond.spa', { hero });
    if (r.ok && r.result) done(tl(SPA_LINES[tr.p]), r.result, { kind: 'spa' });
  }

  function date() {
    openSheet(t('care.date'), (close) => (
      <div className={css.col}>
        <div className={css.tiny}>{b.lvl >= KNOW_PLACE ? t('care.placeKnown') : t('care.placeHint', { lvl: KNOW_PLACE })}</div>
        {PLACES.map((p) => (
          <div key={p.id} className={css.listItem} style={{ background: `linear-gradient(90deg, ${p.bg[0]}, transparent)` }}>
            <span style={{ fontSize: 26 }}>{p.icon}</span>
            <span className={css.grow}>
              {tl(p.name)}
              {b.lvl >= KNOW_PLACE && p.id === tr.place && <span className={st.lvl}> ♥ {t('care.fav')}</span>}
            </span>
            <Button
              size="small"
              onClick={async () => {
                close();
                const r = await useGame.getState().act<Gain & { fav: boolean }>('bond.date', { hero, place: p.id });
                if (r.ok && r.result) done(tl(DATE_LINES[tr.p][r.result.fav ? 0 : 1]), r.result, { kind: 'date', place: p.id });
              }}
            >
              <Cost cur="gold" amount={costs.date.gold} size={14} />
            </Button>
          </div>
        ))}
      </div>
    ));
  }

  async function unlockCostume() {
    const r = await useGame.getState().act<{ skin: string }>('bond.costume', { hero });
    if (r.ok && r.result) {
      haptic.success();
      showReward(t('care.costumeGot'), { skin: r.result.skin });
    }
  }

  const place = scene.kind === 'date' ? PLACES.find((p) => p.id === scene.place)! : null;
  const sceneStyle: CSSProperties | undefined = place ? { background: `linear-gradient(180deg, ${place.bg[0]} 0%, ${place.bg[1]} 100%)` } : undefined;
  const skin = scene.kind === 'spa' ? BOND_SPA_SKIN[hero] : s.heroines[hero]?.skin;
  const need = b.lvl < BOND_MAX ? BOND_XP[b.lvl] : 0;

  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} right={<Hearts />} />

      <div className={cx(st.scene, scene.kind === 'spa' && st.spa)} style={sceneStyle}>
        <div className={st.bubble}>
          <b>{tl(def.name)}:</b> {line}
        </div>
        {scene.kind === 'camp' && <span className={st.fire}>🔥</span>}
        {place && <span className={st.deco}>{place.icon}</span>}
        <HeroImg id={hero} skin={skin} className={st.hero} unarmed />
        {scene.kind === 'spa' && (
          <>
            <div className={st.water} />
            {[20, 110, 200, 290].map((x, i) => (
              <span key={x} className={st.steam} style={{ left: `${(x / 330) * 100}%`, animationDelay: `${i * 0.8}s` }} />
            ))}
          </>
        )}
        {gain && (
          <span key={gain.key} className={st.gain}>
            +{gain.n} ♥
          </span>
        )}
      </div>

      <Panel
        title={
          <span>
            {t('care.bond')} <span className={st.lvl}>♥ {b.lvl}/{BOND_MAX}</span>
          </span>
        }
        right={<span className={css.chip}>{tl(PERSONALITY_NAMES[tr.p])}</span>}
      >
        {b.lvl < BOND_MAX ? (
          <Bar value={b.xp} max={need} text={`${b.xp}/${need}`} color="linear-gradient(180deg,#ffb4d4,#d04a8a)" />
        ) : (
          <div className={st.lvl}>{t('care.max')}</div>
        )}
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('care.bonus', { pct: Math.round(BOND_STAT * 100 * b.lvl) })}
        </div>
      </Panel>

      <div className={st.actions}>
        <Action icon="💬" name={t('care.talk')} sub={t('care.left', { n: BOND_LIMITS.talk - b.talk, max: BOND_LIMITS.talk })} disabled={b.talk >= BOND_LIMITS.talk} onClick={talk} />
        <Action icon="🍰" name={t('care.treat')} sub={t('care.left', { n: BOND_LIMITS.treat - b.treat, max: BOND_LIMITS.treat })} disabled={b.treat >= BOND_LIMITS.treat} onClick={treat} />
        <Action
          icon="♨️"
          name={t('care.spa')}
          sub={b.spa ? t('care.doneToday') : <Cost cur="crystals" amount={costs.spa.crystals} size={14} />}
          disabled={b.spa}
          onClick={() => void spa()}
        />
        <Action
          icon="💐"
          name={t('care.date')}
          sub={b.lvl < BOND_DATE_LVL ? t('care.fromLvl', { lvl: BOND_DATE_LVL }) : b.date ? t('care.doneToday') : t('care.left', { n: 1, max: 1 })}
          disabled={b.lvl < BOND_DATE_LVL || b.date}
          onClick={date}
        />
      </div>

      <Panel title={t('care.milestones')}>
        <div className={st.milestones}>
          {Object.entries(BOND_MILESTONES).map(([lvl, m]) => (
            <div key={lvl} className={cx(st.milestone, b.lvl >= Number(lvl) && st.milestoneDone)}>
              <div className={st.lvl}>♥ {lvl}</div>
              <div>💎{m.crystals}</div>
              {m.scrolls && <div>📜{m.scrolls}</div>}
              {m.shards && <div>✦{m.shards}</div>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={t('care.costume')}>
        <div className={css.row} style={{ alignItems: 'center' }}>
          <HeroImg id={hero} skin={costume} width={96} height={96} className="pixel" still={!hasCostume} style={hasCostume ? undefined : { filter: 'brightness(0.35) saturate(0.4)' }} />
          <div className={css.grow}>
            <b>{tl(SKIN_MAP[costume]?.name)}</b>
            <div className={css.tiny} style={{ margin: '4px 0 8px' }}>
              {hasCostume ? t('care.costumeOwned') : t('care.costumeNeed', { lvl: BOND_MAX, n: BOND_COSTUME_HEARTS })}
            </div>
            {!hasCostume && (
              <Button size="small" disabled={b.lvl < BOND_MAX || hearts < BOND_COSTUME_HEARTS} onClick={() => void unlockCostume()}>
                <Icon name="hearts" size={14} /> {hearts}/{BOND_COSTUME_HEARTS}
              </Button>
            )}
          </div>
        </div>
        <div className={css.tiny} style={{ marginTop: 8, lineHeight: 1.4 }}>
          {t('care.heartsWhere')}
        </div>
      </Panel>
    </div>
  );
}

function Action({ icon, name, sub, disabled, onClick }: { icon: string; name: string; sub: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      className={st.action}
      disabled={disabled}
      onClick={() => {
        haptic.tap();
        onClick();
      }}
    >
      <span className={st.actionIcon}>{icon}</span>
      <span className={st.actionName}>{name}</span>
      <span className={css.tiny}>{sub}</span>
    </button>
  );
}
