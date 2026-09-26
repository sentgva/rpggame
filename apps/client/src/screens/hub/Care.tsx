import {
  BATH_GAIN,
  BATH_LINES,
  BOND_COSTUME_HEARTS,
  BOND_DATE_LVL,
  BOND_HEROES,
  BOND_LIMITS,
  BOND_MAX,
  BOND_MILESTONES,
  BOND_SLEEP_LVL,
  BOND_SLEEP_SKIN,
  BOND_SPA_SKIN,
  BOND_STAT,
  BOND_XP,
  DATE_LINES,
  GREETINGS,
  HEROINE_MAP,
  PERSONALITY_NAMES,
  PLACES,
  REACTIONS,
  ROOMS,
  ROOM_BONUS,
  ROOM_MAP,
  ROOM_MAX,
  SKIN_MAP,
  SLEEP_GAIN,
  SLEEP_GIFT_MIN,
  SLEEP_LINES,
  SPA_LINES,
  TREATS,
  TREAT_LINES,
  bondCosts,
  bondState,
  bondTopic,
  bondTraits,
  goldPerMin,
  homeState,
  roomCost,
  sleptToday,
  type Place,
  type RoomId,
  type Treat,
} from '@idle/shared';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { heroUrl } from '../../art/runtime';
import { sceneUrl, type SceneBg } from '../../art/scenes';
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

export function Care({ hero, home }: { hero?: string; home?: boolean }) {
  if (home) return <CareHome />;
  return hero && HEROINE_MAP[hero] ? <CareHero hero={hero} /> : <CareList />;
}

/** Что даёт комната на уровне lvl. */
function roomEffect(room: RoomId, lvl: number): string {
  const text = tl(ROOM_MAP[room].effect);
  const v = {
    pct: Math.round(ROOM_BONUS * 100 * lvl),
    n: room === 'bath' ? BATH_GAIN.base + BATH_GAIN.perLvl * lvl : SLEEP_GAIN.base + SLEEP_GAIN.perLvl * lvl,
    lvl: BOND_SLEEP_LVL,
  };
  return text.replace('{pct}', String(v.pct)).replace('{n}', String(v.n)).replace('{lvl}', String(v.lvl));
}

/** Резиденция: обустройство и улучшение комнат. */
function CareHome() {
  const s = useGameState();
  const cfg = useCfg();
  const rooms = homeState({ s }).rooms;
  const gpm = goldPerMin(cfg, s);
  return (
    <div className={css.col}>
      <BackHeader title={t('home.title')} right={<Hearts />} />
      <div className={css.inset} style={{ fontSize: 13, lineHeight: 1.45 }}>
        {t('home.intro')}
      </div>
      {ROOMS.map((r) => {
        const lvl = rooms[r.id] ?? 0;
        const cost = lvl < ROOM_MAX ? roomCost(lvl + 1, gpm) : null;
        return (
          <Panel key={r.id} className={st.roomPanel} style={{ background: `linear-gradient(135deg, ${r.bg[0]}, ${r.bg[1]})` }}>
            <div className={css.row} style={{ alignItems: 'center' }}>
              <span className={st.roomIcon} style={lvl ? undefined : { filter: 'grayscale(1)', opacity: 0.6 }}>
                {r.icon}
              </span>
              <div className={css.grow}>
                <b>{tl(r.name)}</b> <span className={css.tiny}>{lvl ? t('home.lvl', { lvl, max: ROOM_MAX }) : t('home.notBuilt')}</span>
                <div className={css.tiny} style={{ marginTop: 3 }}>
                  {lvl > 0 && <div>{t('home.now', { text: roomEffect(r.id, lvl) })}</div>}
                  {cost && <div style={{ color: '#ffd9a0' }}>{t('home.next', { text: roomEffect(r.id, lvl + 1) })}</div>}
                </div>
              </div>
            </div>
            <div className={css.row} style={{ marginTop: 8, justifyContent: 'flex-end' }}>
              {cost ? (
                <Button
                  size="small"
                  onClick={async () => {
                    const res = await useGame.getState().act<{ lvl: number }>('home.build', { room: r.id });
                    if (res.ok) {
                      haptic.success();
                      useUi.getState().toast(t(lvl ? 'home.upgraded' : 'home.built', { name: tl(r.name), lvl: lvl + 1 }), 'good');
                    }
                  }}
                >
                  {lvl ? t('home.upgrade') : t('home.build')}
                  <Cost cur="gold" amount={cost.gold} size={14} />
                  {cost.crystals && <Cost cur="crystals" amount={cost.crystals} size={14} />}
                </Button>
              ) : (
                <span className={st.lvl}>{t('home.max')}</span>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
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
  const home = homeState({ s });
  const rooms = home.rooms;
  const sleptWith = sleptToday({ s, now }) ? home.sleptWith : undefined;
  return (
    <div className={css.col}>
      <BackHeader title={t('care.title')} right={<Hearts />} />
      <div className={css.inset} style={{ fontSize: 13, lineHeight: 1.45 }}>
        {t('care.intro', { pct: Math.round(BOND_STAT * 100) })}
      </div>
      <button className={st.homeBar} onClick={() => useUi.getState().push({ id: 'care', params: { home: true } })}>
        <span className={st.actionName}>🏠 {t('home.title')}</span>
        <span className={css.grow} />
        {ROOMS.map((r) => (
          <span key={r.id} className={st.homeRoom} style={(rooms[r.id] ?? 0) ? undefined : { filter: 'grayscale(1)', opacity: 0.45 }}>
            {r.icon}
            <small>{rooms[r.id] ?? 0}</small>
          </span>
        ))}
      </button>
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
              {has ? <span className={st.lvl}>♥ {b.lvl}{sleptWith === id ? ' 🌙' : ''}</span> : <Icon name="lock" size={14} />}
              {costumeReady && <span className={css.dot} style={{ top: 4, right: 4 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Scene =
  | { kind: 'camp' }
  | { kind: 'spa' }
  | { kind: 'date'; place: Place }
  | { kind: 'room'; room: RoomId }
  | { kind: 'bath' }
  | { kind: 'sleep' }
  | { kind: 'morning' };

/** Пиксельный фон сцены. */
function sceneBg(sc: Scene): SceneBg {
  switch (sc.kind) {
    case 'camp':
    case 'spa':
    case 'bath':
      return sc.kind;
    case 'date':
      return sc.place;
    case 'room':
      return sc.room;
    case 'sleep':
      return 'night';
    case 'morning':
      return 'bedroom';
  }
}

/** В какой комнате проходит сцена. */
function sceneRoom(sc: Scene): RoomId | null {
  if (sc.kind === 'room') return sc.room;
  if (sc.kind === 'bath') return 'bath';
  if (sc.kind === 'sleep' || sc.kind === 'morning') return 'bedroom';
  return null;
}

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
  const home = homeState({ s });
  const rooms = home.rooms;
  const slept = sleptToday({ s, now });
  const [gift, setGift] = useState<Record<string, number> | null>(null);

  // ночь проходит — наступает утро с подарком
  useEffect(() => {
    if (scene.kind !== 'sleep') return;
    const id = setTimeout(() => {
      setScene({ kind: 'morning' });
      setLine(tl(SLEEP_LINES[tr.p][1]));
      if (gift) showReward(t('care.morning'), { cur: gift });
    }, 3600);
    return () => clearTimeout(id);
  }, [scene.kind, gift, tr.p]);

  const roomOr = (room: RoomId): Scene => (rooms[room] ? { kind: 'room', room } : { kind: 'camp' });

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
              if (r.ok && r.result) done(tl(REACTIONS[tr.p][i]), r.result, roomOr('living'));
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
                if (r.ok && r.result) done(`${x.icon} ${tl(TREAT_LINES[tr.p][r.result.like])}`, r.result, roomOr('kitchen'));
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

  async function bath() {
    const r = await useGame.getState().act<Gain>('bond.bath', { hero });
    if (r.ok && r.result) done(tl(BATH_LINES[tr.p]), r.result, { kind: 'bath' });
  }

  function sleep() {
    const lvl = rooms.bedroom ?? 0;
    openSheet(t('care.sleep'), (close) => (
      <div className={css.col}>
        <div className={css.row} style={{ alignItems: 'center' }}>
          <HeroImg id={hero} skin={BOND_SLEEP_SKIN[hero]} width={72} height={72} className="pixel" unarmed />
          <div className={css.grow} style={{ lineHeight: 1.45 }}>
            {t('care.sleepAsk', { name: tl(def.name) })}
            <div className={css.tiny} style={{ marginTop: 4 }}>
              {t('care.sleepGives', { n: SLEEP_GAIN.base + SLEEP_GAIN.perLvl * lvl, min: SLEEP_GIFT_MIN.base + SLEEP_GIFT_MIN.perLvl * lvl })}
            </div>
          </div>
        </div>
        <Button
          block
          onClick={async () => {
            close();
            const r = await useGame.getState().act<Gain & { gift: Record<string, number> }>('bond.sleep', { hero });
            if (r.ok && r.result) {
              setGift(r.result.gift);
              done(tl(SLEEP_LINES[tr.p][0]), r.result, { kind: 'sleep' });
            }
          }}
        >
          🌙 {t('care.sleepYes')}
        </Button>
      </div>
    ));
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

  const room = sceneRoom(scene);
  const sceneStyle: CSSProperties = { backgroundImage: `url(${sceneUrl(sceneBg(scene))})` };
  const skin = scene.kind === 'spa' || scene.kind === 'bath' ? BOND_SPA_SKIN[hero] : scene.kind === 'sleep' || scene.kind === 'morning' ? BOND_SLEEP_SKIN[hero] : s.heroines[hero]?.skin;
  const sleptWith = slept ? home.sleptWith : undefined;
  const locations: { id: 'camp' | RoomId; icon: string; name: string; built: boolean }[] = [
    { id: 'camp', icon: '🔥', name: t('care.camp'), built: true },
    ...ROOMS.map((r) => ({ id: r.id, icon: r.icon, name: tl(r.name), built: (rooms[r.id] ?? 0) > 0 })),
  ];
  const here = room ?? (scene.kind === 'camp' ? 'camp' : null);
  const need = b.lvl < BOND_MAX ? BOND_XP[b.lvl] : 0;

  return (
    <div className={css.col}>
      <BackHeader title={tl(def.name)} right={<Hearts />} />

      <div className={st.rooms}>
        {locations.map((l) => (
          <button
            key={l.id}
            className={cx(st.roomChip, here === l.id && st.roomChipOn)}
            style={l.built ? undefined : { opacity: 0.45 }}
            onClick={() => {
              haptic.select();
              if (!l.built) {
                useUi.getState().toast(t('care.roomLocked', { name: l.name }));
                return;
              }
              setScene(l.id === 'camp' ? { kind: 'camp' } : { kind: 'room', room: l.id });
            }}
          >
            <span style={{ fontSize: 18 }}>{l.icon}</span>
            {l.name}
          </button>
        ))}
      </div>

      <div className={st.scene} style={sceneStyle}>
        <div className={st.bubble}>
          <b>{tl(def.name)}:</b> {line}
        </div>
        {scene.kind === 'camp' && <span className={st.fireGlow} />}
        {scene.kind === 'sleep' ? (
          <>
            <div className={st.bed} />
            <div className={st.pillow} />
            <img className={st.sleeper} src={heroUrl(hero, skin, { eyes: 'closed' }, true)} alt="" draggable={false} />
            <div className={st.blanket} />
            <span className={st.zzz}>z</span>
            <span className={st.zzz} style={{ animationDelay: '0.9s' }}>z</span>
            <span className={st.zzz} style={{ animationDelay: '1.8s' }}>Z</span>
          </>
        ) : (
          <HeroImg id={hero} skin={skin} className={st.hero} unarmed />
        )}
        {scene.kind === 'bath' && (
          <>
            <div className={st.tub} />
            {[14, 24, 34, 44, 54, 64, 74, 82].map((x, i) => (
              <span key={x} className={st.foam} style={{ left: `${x}%`, width: 30 + (i % 3) * 8, height: 30 + (i % 3) * 8 }} />
            ))}
            <span className={st.duck}>🦆</span>
            {[30, 150, 260].map((x, i) => (
              <span key={x} className={st.steam} style={{ left: `${(x / 330) * 100}%`, animationDelay: `${i * 1.1}s` }} />
            ))}
          </>
        )}
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
        <Action
          icon="🛁"
          name={t('care.bath')}
          sub={!rooms.bath ? t('care.needRoom', { name: tl(ROOM_MAP.bath.name) }) : b.bath ? t('care.doneToday') : `+${BATH_GAIN.base + BATH_GAIN.perLvl * rooms.bath} ♥`}
          disabled={!rooms.bath || !!b.bath}
          onClick={() => void bath()}
        />
        <Action
          icon="🌙"
          name={t('care.sleep')}
          sub={
            !rooms.bedroom
              ? t('care.needRoom', { name: tl(ROOM_MAP.bedroom.name) })
              : b.lvl < BOND_SLEEP_LVL
                ? t('care.fromLvl', { lvl: BOND_SLEEP_LVL })
                : sleptWith
                  ? sleptWith === hero
                    ? t('care.sleptHere')
                    : t('care.sleptOther', { name: tl(HEROINE_MAP[sleptWith]?.name) })
                  : t('care.oneNight')
          }
          disabled={!rooms.bedroom || b.lvl < BOND_SLEEP_LVL || slept}
          onClick={sleep}
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
