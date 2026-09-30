import {
  HEROINE_MAP,
  ROSTER,
  SKIN_MAP,
  VOLLEY_MIN_MS,
  VOLLEY_POINTS,
  VOLLEY_RUNGS,
  isSwimwear,
  volleyFirstReward,
  volleyLeft,
  volleyOf,
  volleyPairName,
  volleyReward,
  volleyRival,
  volleySkills,
  beachSkinOf,
  volleyBeachForm,
  volleyTeam,
  type FestivalDef,
  type FestivalState,
  type PlayerState,
  type VolleyRival,
  type VolleySkills,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import type { Arms } from '../../art/figure';
import { sceneUrl } from '../../art/scenes';
import { EnemyImg, HeroImg } from '../../components/HeroImg';
import { Button, CLASS_COLOR, Panel, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { haptic } from '../../tg/telegram';
import { RewardList } from '../common';
import fs from './Festival.module.css';
import st from './FestVolley.module.css';

const PAIR_KEY = 'volley.pair';

/** На пляже — в купальнике, если он у героини есть. */
function beachSkin(s: PlayerState, id: string): string | undefined {
  return beachSkinOf(s, id);
}

function loadPair(s: PlayerState): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PAIR_KEY) ?? '[]');
    if (Array.isArray(v) && v.length === 2 && v.every((id) => s.heroines[id]) && v[0] !== v[1]) return v;
  } catch {
    /* нет хранилища — подберём пару сами */
  }
  // по умолчанию — лучшая по навыкам пара из первых героинь
  const ids = Object.keys(s.heroines).sort((a, b) => ROSTER.indexOf(a) - ROSTER.indexOf(b));
  return ids.slice(0, 2);
}

function savePair(pair: string[]) {
  try {
    localStorage.setItem(PAIR_KEY, JSON.stringify(pair));
  } catch {
    /* приватный режим — не запоминаем */
  }
}

const SKILL_ICON: Record<keyof VolleySkills, string> = { rec: '🛡️', set: '🤲', spk: '💥' };

function Skills({ k, big }: { k: VolleySkills; big?: boolean }) {
  return (
    <span className={cx(st.skills, big && st.skillsBig)}>
      {(['rec', 'set', 'spk'] as const).map((key) => (
        <span key={key} title={t(`volley.${key}`)}>
          {SKILL_ICON[key]}
          <b>{k[key]}</b>
        </span>
      ))}
    </span>
  );
}

export function VolleyTab({ def, f }: { def: FestivalDef; f: FestivalState }) {
  const s = useGameState();
  const v = volleyOf(f);
  const left = volleyLeft(f);
  const [pair, setPairRaw] = useState<string[]>(() => loadPair(s));
  const setPair = (p: string[]) => {
    setPairRaw(p);
    savePair(p);
  };
  const team = pair.length === 2 ? volleyTeam(pair, Object.fromEntries(pair.map((id) => [id, beachSkin(s, id)]))) : null;

  const play = async (rung: number) => {
    if (pair.length !== 2) return pickPair(s, pair, setPair);
    const r = await useGame.getState().act('volley.start', { heroes: pair, rung });
    if (!r.ok) return;
    haptic.medium();
    const rival = r.result.rival as VolleyRival;
    useUi.getState().open((close) => <VolleyMatch rival={rival} heroes={pair} def={def} onClose={close} />, { sticky: true });
  };

  return (
    <>
      <Panel title={t('volley.title')} right={<span className={css.tiny}>{t('volley.left', { n: left })}</span>}>
        <div className={css.tiny} style={{ marginBottom: 8 }}>
          {t('volley.rules', { n: VOLLEY_POINTS })}
        </div>
        <div className={css.tiny} style={{ marginBottom: 8, color: '#ffd24a' }}>
          ☀ {t('volley.beachHint')}
        </div>
        <div className={st.pairRow}>
          {pair.map((id) => (
            <div key={id} className={st.pairHero} style={{ borderColor: CLASS_COLOR[HEROINE_MAP[id].cls] }}>
              <HeroImg id={id} skin={beachSkin(s, id)} unarmed flirt className="pixel" width={64} height={64} />
              <b>{tl(HEROINE_MAP[id].name)}</b>
              <Skills k={volleySkills(id, beachSkin(s, id))} />
              {volleyBeachForm(beachSkin(s, id)) && <span className={st.synergy}>☀ {t('volley.beachForm')}</span>}
            </div>
          ))}
          <div className={st.pairInfo}>
            {team && <Skills k={team} big />}
            {team?.synergy && <span className={st.synergy}>✦ {t('volley.synergy')}</span>}
            <Button size="small" kind="secondary" onClick={() => pickPair(s, pair, setPair)}>
              {t('volley.changePair')}
            </Button>
          </div>
        </div>
        {v.match && <div className={css.tiny} style={{ color: 'var(--bad)', marginTop: 6 }}>{t('volley.unfinished')}</div>}
      </Panel>

      <Panel title={t('volley.ladder')} right={<span className={css.tiny}>{t('volley.best', { n: v.best, max: VOLLEY_RUNGS })}</span>}>
        <div className={st.ladder}>
          {Array.from({ length: VOLLEY_RUNGS }, (_, i) => VOLLEY_RUNGS - i).map((rung) => {
            const rival = volleyRival(rung);
            const beaten = rung <= v.best;
            const open = rung <= v.best + 1;
            const first = volleyFirstReward(rung);
            const win = volleyReward(rung, true, false);
            return (
              <div key={rung} className={cx(st.rung, beaten && st.rungDone, rung === v.best + 1 && st.rungNext, rival.final && st.rungFinal, !open && st.rungLocked)}>
                <span className={st.rungNum}>{rival.final ? '👑' : rung}</span>
                <span className={st.rivals}>
                  {rival.pair.map((id) => (
                    <EnemyImg key={id} id={id} unarmed className="pixel" width={44} height={44} style={{ transform: 'scaleX(-1)' }} />
                  ))}
                </span>
                <span className={css.grow}>
                  <b>{tl(volleyPairName(rival.pair))}</b>
                  <div className={css.tiny}>
                    {rival.final ? t('volley.finalTitle') : t('volley.skill', { n: Math.round(rival.skill * 100) })}
                  </div>
                  <div className={css.tiny}>
                    {beaten ? `✓ · ${t('volley.winReward', { t: win.tokens, p: win.points })}` : t('volley.firstReward', { c: first.crystals, s: first.emblems ? ` · 🎖️${first.emblems}` : '', p: win.points + first.points })}
                  </div>
                </span>
                <Button size="small" kind={rung === v.best + 1 ? 'primary' : 'secondary'} pulse={rung === v.best + 1 && left > 0} disabled={!open || left <= 0} onClick={() => void play(rung)}>
                  {open ? t('volley.play') : '🔒'}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
      <div className={css.tiny} style={{ textAlign: 'center' }}>
        {t('volley.heroHint', { name: tl(HEROINE_MAP[def.hero].name) })}
      </div>
    </>
  );
}

/** Выбор пары: две разные героини, у каждой — пляжные навыки по классу. */
function pickPair(s: PlayerState, cur: string[], onPick: (p: string[]) => void) {
  openSheet(t('volley.pickPair'), (close) => (
    <PairPicker
      s={s}
      cur={cur}
      onPick={(p) => {
        onPick(p);
        close();
      }}
    />
  ));
}

function PairPicker({ s, cur, onPick }: { s: PlayerState; cur: string[]; onPick: (p: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(cur.filter((id) => s.heroines[id]));
  const ids = Object.keys(s.heroines).sort((a, b) => {
    const ka = volleySkills(a, beachSkin(s, a));
    const kb = volleySkills(b, beachSkin(s, b));
    return kb.rec + kb.set + kb.spk - (ka.rec + ka.set + ka.spk) || ROSTER.indexOf(a) - ROSTER.indexOf(b);
  });
  const team = picked.length === 2 ? volleyTeam(picked, Object.fromEntries(picked.map((id) => [id, beachSkin(s, id)]))) : null;
  return (
    <div className={css.col}>
      <div className={css.tiny}>{t('volley.pickHint')}</div>
      <div className={st.pickGrid}>
        {ids.map((id) => {
          const on = picked.includes(id);
          return (
            <button
              key={id}
              className={cx(st.pick, on && st.pickOn)}
              style={{ borderColor: CLASS_COLOR[HEROINE_MAP[id].cls] }}
              onClick={() => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]))}
            >
              <HeroImg id={id} skin={beachSkin(s, id)} unarmed still className="pixel" width={48} height={48} />
              <span className={st.pickName}>{tl(HEROINE_MAP[id].name)}</span>
              <Skills k={volleySkills(id, beachSkin(s, id))} />
            </button>
          );
        })}
      </div>
      <div className={css.row} style={{ justifyContent: 'space-between' }}>
        <span>{team ? <Skills k={team} big /> : t('volley.pickTwo')}</span>
        {team?.synergy && <span className={st.synergy}>✦ {t('volley.synergy')}</span>}
      </div>
      <Button block disabled={picked.length !== 2} onClick={() => onPick(picked)}>
        {t('common.ok')}
      </Button>
    </div>
  );
}

// ——— матч ———

type Q = 'perfect' | 'good' | 'miss';
type Bar = { kind: 'rec' | 'set' | 'spk'; good: number; perfect: number; period: number };

/** Позиции на корте (в % ширины/высоты): свои слева, соперницы справа. */
const SPOT = {
  us: [
    [14, 56],
    [32, 50],
  ],
  them: [
    [68, 50],
    [86, 56],
  ],
  apexUs: [26, 18],
  netTop: [50, 42],
  floorUs: [22, 86],
  floorThem: [78, 86],
} as const;

interface Result {
  won: boolean;
  big: boolean;
  us: number;
  them: number;
  reward: { cur: Record<string, number>; points: number; shards?: Record<string, number>; first: boolean };
}

function VolleyMatch({ rival, heroes, def, onClose }: { rival: VolleyRival; heroes: string[]; def: FestivalDef; onClose: () => void }) {
  const s = useGameState();
  const team = volleyTeam(heroes);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [bar, setBar] = useState<Bar | null>(null);
  const [msg, setMsg] = useState<string>(t('volley.ready'));
  const [mood, setMood] = useState<'us' | 'them' | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);
  const ball = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  const hit = useRef<(() => void) | null>(null);
  const alive = useRef(true);
  const started = useRef(Date.now());
  const pos = useRef<[number, number]>([78, 40]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  /** Полёт мяча по дуге: from → to, h — высота дуги (% высоты корта). */
  const fly = (to: readonly [number, number], h: number, ms: number) =>
    new Promise<void>((resolve) => {
      const [x0, y0] = pos.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        const x = x0 + (to[0] - x0) * k;
        const y = y0 + (to[1] - y0) * k - h * 4 * k * (1 - k);
        pos.current = [x, y];
        if (ball.current) {
          ball.current.style.left = `${x}%`;
          ball.current.style.top = `${y}%`;
          ball.current.style.transform = `translate(-50%, -50%) rotate(${k * 540}deg)`;
        }
        if (k < 1 && alive.current) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });

  /** Шкала тайминга: стрелка бегает, тап — попадание. Не успела за два прохода — промах. */
  const timing = (kind: Bar['kind'], skill: number) =>
    new Promise<Q>((resolve) => {
      const good = 0.07 + 0.013 * skill;
      const b: Bar = { kind, good, perfect: good * 0.4, period: 330 - rival.skill * 120 };
      setBar(b);
      const t0 = performance.now();
      let raf = 0;
      let x = 0.5;
      const tick = (now: number) => {
        // стрелка стартует от края шкалы, а не из центра
        const k = (now - t0) / b.period - Math.PI / 2;
        x = (Math.sin(k) * 0.92 + Math.sin(k * 2.3) * 0.08 + 1) / 2;
        if (needle.current) needle.current.style.left = `${x * 100}%`;
        if (now - t0 > b.period * Math.PI * 4) return done('miss');
        raf = requestAnimationFrame(tick);
      };
      const done = (q: Q) => {
        cancelAnimationFrame(raf);
        hit.current = null;
        setBar(null);
        resolve(q);
      };
      hit.current = () => {
        const d = Math.abs(x - 0.5);
        done(d <= b.perfect ? 'perfect' : d <= b.good ? 'good' : 'miss');
      };
      raf = requestAnimationFrame(tick);
    });

  const tap = () => {
    if (!hit.current) return;
    haptic.tap();
    hit.current();
  };

  /** Один розыгрыш: подача соперниц, приём → пас → удар; отбитый удар — новая атака соперниц. */
  const rally = async (): Promise<{ us: boolean; spike: boolean }> => {
    pos.current = [SPOT.them[1][0], SPOT.them[1][1] - 12];
    setMsg(t('volley.serve'));
    await wait(350);
    // соперницы иногда ошибаются на подаче
    if (Math.random() < 0.1 - rival.skill * 0.06) {
      await fly(SPOT.netTop, 18, 600);
      setMsg(t('volley.rivalError'));
      await fly(SPOT.floorThem, 0, 300);
      return { us: true, spike: false };
    }
    for (;;) {
      if (!alive.current) return { us: false, spike: false };
      // атака соперниц летит к нам — приём
      const flight = fly(SPOT.us[0], 26, 900 - rival.skill * 250);
      setMsg(t('volley.receive'));
      const q1 = await timing('rec', team.rec);
      await flight;
      if (q1 === 'miss') {
        setMsg(t('volley.missRec'));
        await fly(SPOT.floorUs, 0, 250);
        return { us: false, spike: false };
      }
      // пас — мяч над своей площадкой
      const up = fly(SPOT.apexUs, q1 === 'perfect' ? 30 : 20, 650);
      setMsg(q1 === 'perfect' ? t('volley.perfectRec') : t('volley.set'));
      const q2 = await timing('set', team.set);
      await up;
      // удар — нападающая выпрыгивает
      const jump = fly(SPOT.us[1], 12, 450);
      setMsg(q2 === 'perfect' ? t('volley.perfectSet') : q2 === 'miss' ? t('volley.weakSet') : t('volley.spike'));
      const q3 = await timing('spk', team.spk);
      await jump;
      if (q3 === 'miss') {
        setMsg(t('volley.missSpike'));
        await fly(SPOT.netTop, 4, 300);
        await fly([50, 86], 0, 250);
        return { us: false, spike: false };
      }
      await fly(SPOT.floorThem, 4, 280 - (q3 === 'perfect' ? 80 : 0));
      if (q3 === 'perfect' && q2 !== 'miss') {
        setMsg(t('volley.perfectSpike'));
        return { us: true, spike: true };
      }
      // соперницы могут отбить
      const dig = Math.max(0.05, Math.min(0.85, 0.2 + rival.skill * 0.5 - team.spk * 0.02 + (q2 === 'perfect' ? -0.1 : q2 === 'miss' ? 0.25 : 0)));
      if (Math.random() >= dig) {
        setMsg(t('volley.pointSpike'));
        return { us: true, spike: true };
      }
      setMsg(t('volley.dug'));
      await fly(SPOT.them[0], 20, 450);
      await wait(150);
    }
  };

  const finish = async (us: number, them: number, spikes: number, forfeit = false) => {
    setSending(true);
    // матч не короче минимума (сервер не примет мгновенную победу)
    const rest = VOLLEY_MIN_MS + 300 - (Date.now() - started.current);
    if (rest > 0 && !forfeit) await wait(rest);
    const r = await useGame.getState().act('volley.end', forfeit ? { forfeit: true } : { us, them, spikes });
    setSending(false);
    if (!r.ok) return onClose();
    if (r.result.won) haptic.success();
    else haptic.error();
    setResult(r.result as Result);
  };

  // сам матч: розыгрыши до VOLLEY_POINTS очков
  useEffect(() => {
    let us = 0;
    let them = 0;
    let spikes = 0;
    void (async () => {
      await wait(900);
      while (alive.current && us < VOLLEY_POINTS && them < VOLLEY_POINTS) {
        const r = await rally();
        if (!alive.current) return;
        if (r.us) {
          us++;
          if (r.spike) spikes++;
          haptic.success();
        } else {
          them++;
          haptic.warn();
        }
        setScore([us, them]);
        setMood(r.us ? 'us' : 'them');
        await wait(1100);
        setMood(null);
      }
      if (alive.current) await finish(us, them, spikes);
    })();
    // матч запускается один раз при открытии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usArms: Arms | undefined = mood === 'us' ? 'victory' : mood === 'them' ? 'shy' : undefined;
  const themArms: Arms | undefined = mood === 'them' ? 'victory' : mood === 'us' ? 'shy' : undefined;

  return (
    <div className={cx(css.panel, st.match)} onClick={(e) => e.stopPropagation()}>
      <div className={st.scoreboard}>
        <span className={st.team}>{heroes.map((id) => tl(HEROINE_MAP[id].name)).join(' & ')}</span>
        <b className={st.score}>
          {score[0]} : {score[1]}
        </b>
        <span className={st.team}>{tl(volleyPairName(rival.pair))}</span>
      </div>
      <div className={st.court} style={{ backgroundImage: `url(${sceneUrl('beach')})` }} onPointerDown={tap}>
        <div className={st.net} />
        {heroes.map((id, i) => (
          <HeroImg
            key={id}
            id={id}
            skin={beachSkin(s, id)}
            unarmed
            arms={usArms}
            className={cx('pixel', st.player)}
            style={{ left: `${SPOT.us[i][0]}%`, bottom: `${i ? 12 : 8}%` }}
          />
        ))}
        {rival.pair.map((id, i) => (
          <EnemyImg
            key={id}
            id={id}
            unarmed
            arms={themArms}
            className={cx('pixel', st.player, st.rival)}
            style={{ left: `${SPOT.them[i][0]}%`, bottom: `${i ? 8 : 12}%` }}
          />
        ))}
        <div ref={ball} className={st.ball} style={{ left: '78%', top: '40%' }} />
        {mood && <div className={cx(st.pointFlash, mood === 'us' ? st.flashUs : st.flashThem)}>{mood === 'us' ? t('volley.pointUs') : t('volley.pointThem')}</div>}
        <div className={st.msg}>{msg}</div>
      </div>
      {bar ? (
        <div className={st.barWrap} onPointerDown={tap}>
          <div className={st.barLabel}>
            {SKILL_ICON[bar.kind]} {t(`volley.bar.${bar.kind}`)}
          </div>
          <div className={cx(st.bar, st[`bar_${bar.kind}`])}>
            <div className={st.good} style={{ width: `${bar.good * 200}%`, left: `${50 - bar.good * 100}%` }} />
            <div className={st.perfect} style={{ width: `${bar.perfect * 200}%`, left: `${50 - bar.perfect * 100}%` }} />
            <div ref={needle} className={st.needle} />
          </div>
          <Button block size="big" onClick={tap}>
            {t('volley.hit')}
          </Button>
        </div>
      ) : !result ? (
        <div className={st.barWrap}>
          <div className={st.barLabel}>{sending ? t('volley.sending') : ' '}</div>
          <Button block kind="secondary" disabled={sending} onClick={() => {
              alive.current = false;
              void finish(0, VOLLEY_POINTS, 0, true);
            }}>
            {t('volley.forfeit')}
          </Button>
        </div>
      ) : (
        <div className={css.col} style={{ alignItems: 'center', textAlign: 'center' }}>
          <b className={cx(st.resultTitle, result.won ? st.win : st.lose)}>
            {result.won ? (result.big ? t('volley.crushed') : t('volley.won')) : t('volley.lost')} {result.us}:{result.them}
          </b>
          {result.won && rival.final && result.reward.first && <div className={st.queen}>👑 {t('volley.queenBeaten', { name: tl(HEROINE_MAP[def.hero].name) })}</div>}
          <RewardList r={{ cur: result.reward.cur, shards: result.reward.shards }} />
          {result.reward.points > 0 && <div className={fs.pointsGain}>{t('fest.pointsGain', { n: result.reward.points })}</div>}
          <Button block onClick={onClose}>
            {t('common.ok')}
          </Button>
        </div>
      )}
    </div>
  );
}
