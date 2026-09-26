import { portraitUrl } from '../art/runtime';
import { currentLive, useLive } from '../battle/live';
import { t } from '../i18n';
import { useGame } from '../store/game';
import { haptic } from '../tg/telegram';

/**
 * Панель ручных ульт поверх сцены боя: портреты героинь с кольцом энергии.
 * Полное кольцо — ульта готова; нажатие выпускает её на ближайшем ходу героини.
 * Когда босс готовит «Сокрушительный удар», панель подсказывает сбить его ультой.
 */
/** Подсказка «жми на портрет» — первые несколько боёв. */
let tipShown = -1;
function showTip(): boolean {
  if (tipShown < 0) {
    try {
      tipShown = Number(localStorage.getItem('ultTip') ?? 0);
      localStorage.setItem('ultTip', String(tipShown + 1));
    } catch {
      tipShown = 0;
    }
  }
  return tipShown < 3;
}

export function UltBar() {
  const { active, manual, heroes, cast } = useLive();
  const skins = useGame((g) => g.state?.heroines);
  if (!active || !heroes.length) return null;
  const warn = !!cast && manual;
  return (
    <div
      style={{ position: 'absolute', left: 6, right: 6, bottom: 6, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      {!warn && manual && showTip() && (
        <div style={{ background: 'rgba(20,12,16,.85)', color: '#f2e6d8', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{t('ult.tip')}</div>
      )}
      {warn && (
        <div style={{ background: 'rgba(120,20,10,.88)', color: '#ffe8a0', border: '1px solid #ff8a4a', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 800, animation: 'pulse .6s ease-in-out infinite alternate' }}>
          ⚡ {t('ult.interruptHint')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', pointerEvents: 'auto' }}>
        {heroes.map((h) => {
          const ready = manual && h.alive && !h.pending && h.energy >= 100;
          const pct = Math.max(0, Math.min(100, h.energy));
          const ring = h.alive ? (h.energy >= 100 ? '#ffe08a' : '#e0a13a') : '#555';
          return (
            <button
              key={h.uid}
              disabled={!ready}
              aria-label={t('ult.cast')}
              onClick={() => {
                haptic.medium();
                currentLive?.cast(h.uid);
              }}
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                padding: 3,
                border: 0,
                borderRadius: 10,
                cursor: ready ? 'pointer' : 'default',
                background: `conic-gradient(${ring} ${pct * 3.6}deg, rgba(20,12,16,.85) 0)`,
                boxShadow: ready ? (warn ? '0 0 12px 3px #ff6a2a' : '0 0 10px 2px #ffd060') : '0 1px 3px rgba(0,0,0,.6)',
                animation: ready ? 'pulse .7s ease-in-out infinite alternate' : undefined,
                opacity: h.alive ? 1 : 0.35,
                filter: h.alive ? undefined : 'grayscale(1)',
              }}
            >
              <img
                className="pixel"
                src={portraitUrl(h.ref, skins?.[h.ref]?.skin)}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', borderRadius: 7, display: 'block', background: '#1c1216', opacity: ready || h.pending ? 1 : 0.7 }}
              />
              {(ready || h.pending) && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -2,
                    fontSize: 10,
                    fontWeight: 900,
                    color: h.pending ? '#cfe8ff' : '#2a1400',
                    background: h.pending ? 'rgba(20,30,60,.85)' : '#ffd060',
                    borderRadius: 4,
                    lineHeight: '13px',
                  }}
                >
                  {h.pending ? '…' : 'ULT'}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => currentLive?.auto()}
          disabled={!manual}
          style={{
            height: 30,
            alignSelf: 'center',
            padding: '0 8px',
            borderRadius: 6,
            border: '1px solid var(--frame)',
            background: manual ? 'rgba(20,12,16,.85)' : 'rgba(60,120,60,.85)',
            color: '#f2e6d8',
            fontSize: 11,
            fontWeight: 800,
            cursor: manual ? 'pointer' : 'default',
          }}
        >
          {manual ? t('ult.auto') : t('ult.autoOn')}
        </button>
      </div>
    </div>
  );
}
