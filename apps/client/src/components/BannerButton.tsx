import type { CSSProperties, ReactNode } from 'react';
import { haptic } from '../tg/telegram';
import st from './BannerButton.module.css';
import { css } from './ui';

/** Большая кнопка-баннер: косая плашка, иконка выступает за край, надпись с наклоном. */
export function BannerButton({ icon, label, sub, tint = '#c9a45c', badge, locked, compact, onClick }: { icon: ReactNode; label: string; sub?: string; tint?: string; badge?: boolean; locked?: boolean; compact?: boolean; onClick: () => void }) {
  return (
    <button
      className={compact ? `${st.banner} ${st.compact}` : st.banner}
      style={{ ['--tint' as string]: tint, ...(locked ? { filter: 'grayscale(0.8) brightness(0.7)' } : null) } as CSSProperties}
      onClick={() => {
        haptic.tap();
        onClick();
      }}
    >
      <span className={st.plate} />
      <span className={st.icon}>{icon}</span>
      <span className={st.text}>
        <span className={st.label}>{label}</span>
        {sub && <span className={st.sub}>{sub}</span>}
      </span>
      {badge && <span className={css.dot} style={{ top: 8, right: 12 }} />}
    </button>
  );
}
