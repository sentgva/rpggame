import { HEROINE_MAP, MVP_LINES, bondTraits } from '@idle/shared';
import { t, tl } from '../i18n';
import { useGameState } from '../store/game';
import { HeroImg } from './HeroImg';
import { CLASS_COLOR, css } from './ui';

/** Лучший герой боя: победная поза, подмигивание и реплика. */
export function MvpCard({ hero }: { hero: string }) {
  const s = useGameState();
  const def = HEROINE_MAP[hero];
  if (!def) return null;
  return (
    <div className={css.row} style={{ alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, background: 'linear-gradient(90deg, rgba(255,138,184,0.18), transparent)' }}>
      <HeroImg id={hero} skin={s.heroines[hero]?.skin} arms="victory" eyes="wink" className="pixel" width={88} height={88} />
      <div className={css.grow} style={{ lineHeight: 1.4 }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 20, color: '#ffd24a' }}>
          MVP · <span style={{ color: CLASS_COLOR[def.cls] }}>{tl(def.name)}</span>
        </div>
        <div className={css.tiny} style={{ color: 'var(--text)' }}>
          «{tl(MVP_LINES[bondTraits(hero).p])}»
        </div>
        <div className={css.tiny}>{t('mvp.hint')}</div>
      </div>
    </div>
  );
}
