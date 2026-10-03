import {
  COMBO_MAP,
  HEROINE_MAP,
  SORTIE_BOSS_AT,
  SORTIE_COMBO_TEXT,
  SORTIE_DAILY,
  SORTIE_PASSIVES,
  SORTIE_TIERS,
  SORTIE_TIER_MAP,
  SORTIE_WEAPON_OF,
  sortieState,
  sortieTierOpen,
  stageRef,
  type SortieTierId,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import { HeroImg } from '../../components/HeroImg';
import { Bar, Button, CLASS_COLOR, Panel, css, cx, fmtTime } from '../../components/ui';
import { t, tl } from '../../i18n';
import { SortieGame, type SortieCard, type SortieHud, type SortieResult } from '../../sortie/game';
import { useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader, RewardList } from '../common';
import st from './Sortie.module.css';

/** Лобби «Вылазки»: сложность, герой, награды дня и рекорды. */
export function Sortie() {
  const s = useGameState();
  const now = useGame.getState().now();
  const ss = sortieState({ s, now });
  const heroes = Object.keys(s.heroines);
  const [hero, setHero] = useState(heroes[0]);
  const [tier, setTier] = useState<SortieTierId>('normal');
  const [run, setRun] = useState<{ id: number; tier: SortieTierId; hero: string; rewarded: boolean } | null>(null);
  const left = Math.max(0, SORTIE_DAILY - ss.runs);

  const start = async () => {
    const r = await useGame.getState().act('sortie.start', { tier, hero });
    if (!r.ok) return;
    haptic.success();
    setRun({ id: r.result.id, tier, hero, rewarded: r.result.rewarded });
  };

  return (
    <div className={css.col}>
      <BackHeader title={t('mode.sortie')} />
      <Panel>
        <div className={css.tiny} style={{ lineHeight: 1.5 }}>
          {t('sortie.intro', { m: Math.round(SORTIE_BOSS_AT / 60) })}
        </div>
        <div className={css.row} style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
          <span className={css.chip}>{t('sortie.left', { n: left, max: SORTIE_DAILY })}</span>
        </div>
      </Panel>
      <Panel title={t('sortie.tier')}>
        <div className={st.tiers}>
          {SORTIE_TIERS.map((x) => {
            const open = sortieTierOpen(s, x.id);
            const best = ss.best[x.id];
            return (
              <button key={x.id} className={cx(st.tier, tier === x.id && st.on)} disabled={!open} onClick={() => setTier(x.id)}>
                <b>{tl(x.name)}</b>
                <span className={css.tiny}>{open ? t('sortie.mult', { e: x.enemy, r: x.reward }) : t('sortie.locked', { name: tl(SORTIE_TIER_MAP[x.after!].name) })}</span>
                {best && <span className={css.tiny}>{best.boss ? `👑 ${t('sortie.bossDown')}` : `⏱ ${fmtTime(best.time * 1000)}`} · ☠ {best.kills}</span>}
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title={t('sortie.hero')}>
        <div className={st.heroes}>
          {heroes.map((id) => (
            <button key={id} className={cx(st.hero, hero === id && st.on)} onClick={() => setHero(id)}>
              <HeroImg id={id} skin={s.heroines[id]?.skin} still className="pixel" width={56} height={56} />
              <span style={{ color: CLASS_COLOR[HEROINE_MAP[id].cls] }}>{tl(HEROINE_MAP[id].name)}</span>
              <span className={css.tiny}>{tl(SORTIE_WEAPON_OF[HEROINE_MAP[id].cls].name)}</span>
            </button>
          ))}
        </div>
        <Button block style={{ marginTop: 10 }} onClick={() => void start()}>
          ⚔ {left > 0 ? t('sortie.go') : t('sortie.practice')}
        </Button>
      </Panel>
      {run && <SortieRun run={run} onClose={() => setRun(null)} />}
    </div>
  );
}

/** Сам забег: холст игры, интерфейс поверх, карточки уровня, пауза и итог. */
function SortieRun({ run, onClose }: { run: { id: number; tier: SortieTierId; hero: string; rewarded: boolean }; onClose: () => void }) {
  const s = useGameState();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<SortieGame | null>(null);
  const [hud, setHud] = useState<SortieHud | null>(null);
  const [cards, setCards] = useState<SortieCard[] | null>(null);
  const [paused, setPaused] = useState(false);
  const [end, setEnd] = useState<SortieResult | null>(null);
  const [reward, setReward] = useState<Record<string, number> | null>(null);
  const [hint, setHint] = useState(true);
  const sent = useRef(false);

  const finish = async (r: SortieResult) => {
    if (sent.current) return;
    sent.current = true;
    setEnd(r);
    sfx(r.boss ? 'victory' : 'defeat');
    const res = await useGame.getState().act('sortie.finish', { id: run.id, time: r.time, kills: r.kills, boss: r.boss });
    if (res.ok) setReward(res.result.reward ?? {});
  };

  useEffect(() => {
    const h = s.heroines[run.hero];
    const power = 1 + 0.06 * (h.rank - 1) + Math.min(s.legion.lvl, 600) * 0.002 + (s.bond?.[run.hero]?.lvl ?? 0) * 0.01;
    const skins: Record<string, string | undefined> = {};
    for (const id of Object.keys(s.heroines)) skins[id] = s.heroines[id]?.skin;
    const g = new SortieGame(
      host.current!,
      {
        hero: run.hero,
        skins,
        roster: Object.keys(s.heroines),
        tier: SORTIE_TIER_MAP[run.tier],
        act: stageRef(Math.max(1, s.progress.stage)).act,
        power,
      },
      {
        hud: setHud,
        levelUp: (c) => {
          sfx('levelup');
          haptic.success();
          setCards(c);
        },
        end: (r) => void finish(r),
      },
    );
    game.current = g;
    // для автотестов в разработке
    if (import.meta.env.DEV) (window as unknown as { __sortie?: SortieGame }).__sortie = g;
    void g.init();
    const id = window.setTimeout(() => setHint(false), 4500);
    return () => {
      clearTimeout(id);
      g.destroy();
      game.current = null;
    };
  }, []);

  const pick = (c: SortieCard) => {
    haptic.tap();
    setCards(null);
    game.current?.choose(c);
  };
  const pause = (p: boolean) => {
    setPaused(p);
    game.current?.setPaused(p);
  };
  const retreat = () => {
    setPaused(false);
    const r = game.current?.result();
    game.current?.setPaused(true);
    if (r) void finish({ ...r, boss: false, win: false });
  };

  const toBoss = hud ? Math.max(0, SORTIE_BOSS_AT - hud.time) : SORTIE_BOSS_AT;
  return (
    <div className={st.run}>
      <div ref={host} className={st.host} />
      {hud && (
        <div className={st.hud}>
          <div className={st.xp}>
            <div className={st.xpFill} style={{ width: `${(hud.xp / hud.xpNeed) * 100}%` }} />
            <span className={st.lvl}>{t('sortie.lvl', { n: hud.level })}</span>
          </div>
          <div className={st.top}>
            <span className={st.chip}>☠ {hud.kills}</span>
            <span className={cx(st.chip, st.timer)}>{hud.boss ? `👑 ${hud.boss.name}` : toBoss > 0 ? `${t('sortie.toBoss')} ${fmtTime(toBoss * 1000)}` : '👑'}</span>
            <button className={st.chip} onClick={() => pause(true)}>
              ⏸
            </button>
          </div>
          {hud.boss && (
            <div className={st.bossBar}>
              <Bar value={hud.boss.hp} max={hud.boss.max} height={8} color="#e040ff" />
            </div>
          )}
          <div className={st.party}>
            {hud.party.map((id) => (
              <HeroImg key={id} id={id} skin={s.heroines[id]?.skin} still className="pixel" width={30} height={30} />
            ))}
          </div>
          <div className={st.hp}>
            <Bar value={hud.hp} max={hud.maxHp} height={8} color={hud.hp / hud.maxHp > 0.35 ? '#5ad05a' : '#ff5050'} />
          </div>
        </div>
      )}
      {hint && !end && <div className={st.hint}>{t('sortie.hint')}</div>}

      {cards && !end && (
        <div className={st.overlay}>
          <div className={st.cardTitle}>{t('sortie.levelUp', { n: hud?.level ?? 1 })}</div>
          {cards.map((c, i) => (
            <button key={i} className={st.card} onClick={() => pick(c)}>
              <CardBody c={c} />
            </button>
          ))}
        </div>
      )}

      {paused && !end && (
        <div className={st.overlay}>
          <div className={st.cardTitle}>{t('sortie.paused')}</div>
          <Button block onClick={() => pause(false)}>
            ▶ {t('sortie.resume')}
          </Button>
          <Button kind="secondary" block onClick={retreat}>
            {t('sortie.retreat')}
          </Button>
        </div>
      )}

      {end && (
        <div className={st.overlay}>
          <div className={st.cardTitle} style={{ color: end.boss ? '#ffd24a' : '#ff8070' }}>
            {end.boss ? t('sortie.win') : t('sortie.lose')}
          </div>
          <div className={css.row} style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className={css.chip}>⏱ {fmtTime(end.time * 1000)}</span>
            <span className={css.chip}>☠ {end.kills}</span>
            <span className={css.chip}>{t('sortie.lvl', { n: end.level })}</span>
          </div>
          {run.rewarded ? reward ? <RewardList r={{ cur: reward }} /> : <div className={css.tiny}>…</div> : <div className={css.tiny}>{t('sortie.noReward')}</div>}
          <Button block onClick={onClose}>
            {t('common.ok')}
          </Button>
        </div>
      )}
    </div>
  );
}

function CardBody({ c }: { c: SortieCard }) {
  switch (c.kind) {
    case 'weapon': {
      const w = SORTIE_WEAPON_OF[HEROINE_MAP[c.hero].cls];
      return (
        <>
          <HeroImg id={c.hero} still className="pixel" width={44} height={44} />
          <span className={st.cardText}>
            <b>
              {tl(w.name)} · {t('sortie.lvl', { n: c.level })}
            </b>
            <span>{tl(w.desc)}</span>
          </span>
        </>
      );
    }
    case 'ally': {
      const h = HEROINE_MAP[c.hero];
      return (
        <>
          <HeroImg id={c.hero} still className="pixel" width={44} height={44} />
          <span className={st.cardText}>
            <b style={{ color: CLASS_COLOR[h.cls] }}>{t('sortie.ally', { name: tl(h.name) })}</b>
            <span>{t('sortie.allyDesc', { w: tl(SORTIE_WEAPON_OF[h.cls].name) })}</span>
          </span>
        </>
      );
    }
    case 'passive': {
      const p = SORTIE_PASSIVES.find((x) => x.id === c.passive)!;
      return (
        <>
          <span className={st.cardIcon}>{p.icon}</span>
          <span className={st.cardText}>
            <b>
              {tl(p.name)} · {t('sortie.lvl', { n: c.level })}
            </b>
            <span>{tl(p.desc)}</span>
          </span>
        </>
      );
    }
    case 'combo':
      return (
        <>
          <span className={st.cardIcon}>🔗</span>
          <span className={st.cardText}>
            <b style={{ color: '#ff9ac8' }}>{t('sortie.combo', { name: tl(COMBO_MAP[c.combo].name) })}</b>
            <span>{tl(SORTIE_COMBO_TEXT[c.combo])}</span>
          </span>
        </>
      );
    case 'heal':
      return (
        <>
          <span className={st.cardIcon}>🍖</span>
          <span className={st.cardText}>
            <b>{t('sortie.heal')}</b>
            <span>{t('sortie.healDesc')}</span>
          </span>
        </>
      );
  }
}
