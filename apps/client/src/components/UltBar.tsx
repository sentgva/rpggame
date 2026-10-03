import { HEROINE_MAP, activeParty, heroCanUpgrade, heroLevel } from '@idle/shared';
import { iconUrl, portraitUrl } from '../art/runtime';
import { currentLive, useLive } from '../battle/live';
import { t } from '../i18n';
import { useCfg, useGame } from '../store/game';
import { navigate } from '../store/ui';
import { haptic } from '../tg/telegram';
import { CLASS_COLOR, cx } from './ui';
import st from './UltBar.module.css';

/**
 * Панель Легиона под сценой. В бою с ручным управлением — портреты с кольцами энергии (тап — ульта),
 * щит Кассиана (парирование) и «Авто». Вне такого боя — строй героев: уровень и отметка «есть улучшение».
 */
export function UltBar() {
  const live = useLive();
  if (live.active && live.heroes.length) return <LiveBar />;
  return <PartyStrip />;
}

function LiveBar() {
  const { manual, heroes, cast, guard, clock } = useLive();
  const skins = useGame((g) => g.state?.heroines);
  const window = cast ? cast.end - clock : Infinity;
  const parryNow = !!cast && window <= 1200 && window > 0;
  const guardReady = guard.has && clock >= guard.ready;
  const guardCd = guard.has && !guardReady ? Math.min(1, (guard.ready - clock) / 5000) : 0;
  return (
    <div className={st.bar}>
      <button
        className={cx(st.auto, !manual && st.autoOn)}
        onClick={() => {
          haptic.select();
          currentLive?.auto();
        }}
      >
        {t('ult.auto')}
      </button>
      <div className={st.heroes}>
        {heroes.map((h) => {
          const ready = manual && h.alive && !h.pending && h.energy >= 100;
          const pct = Math.max(0, Math.min(100, h.energy));
          const col = CLASS_COLOR[HEROINE_MAP[h.ref]?.cls ?? 'knight'];
          return (
            <button
              key={h.uid}
              className={cx(st.hero, ready && st.ready, !h.alive && st.dead, h.pending && st.pending)}
              disabled={!ready}
              style={{ ['--p' as string]: `${pct * 3.6}deg`, ['--c' as string]: h.energy >= 100 ? '#ffe08a' : col }}
              onClick={() => {
                haptic.medium();
                currentLive?.cast(h.uid);
              }}
              aria-label={t('ult.cast')}
            >
              <img className="pixel" src={portraitUrl(h.ref, skins?.[h.ref]?.skin)} alt="" draggable={false} />
            </button>
          );
        })}
      </div>
      <button
        className={cx(st.guard, parryNow && guardReady && st.guardNow, !guard.has && st.dead)}
        disabled={!guard.has || !guardReady}
        style={{ ['--cd' as string]: `${guardCd * 360}deg` }}
        onClick={() => {
          haptic.heavy();
          currentLive?.guard();
        }}
        aria-label={t('ult.guard')}
      >
        <img className="pixel" src={iconUrl('shield')} alt="" draggable={false} />
        {parryNow && guardReady && <span className={st.now}>{t('ult.now')}</span>}
      </button>
      {cast && !parryNow && guard.has && manual && <div className={st.hint}>{t('ult.parryHint')}</div>}
    </div>
  );
}

function PartyStrip() {
  const s = useGame((g) => g.state)!;
  const cfg = useCfg();
  const party = activeParty(s);
  return (
    <div className={st.bar}>
      <div className={st.heroes} style={{ justifyContent: 'space-between', flex: 1 }}>
        {party.map((id) => {
          const h = s.heroines[id];
          const col = CLASS_COLOR[HEROINE_MAP[id].cls];
          const lvl = heroLevel(cfg, s, h);
          const capped = lvl < s.legion.lvl;
          return (
            <button
              key={id}
              className={cx(st.hero, st.idle)}
              style={{ ['--p' as string]: '360deg', ['--c' as string]: col }}
              onClick={() => {
                haptic.select();
                navigate('heroes', { id: 'hero', params: { id } });
              }}
            >
              <img className="pixel" src={portraitUrl(id, h.skin)} alt="" draggable={false} />
              <span className={cx(st.lvl, capped && st.capped)}>{lvl}</span>
              {(heroCanUpgrade(cfg, s, id) || capped) && <span className={st.dot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
