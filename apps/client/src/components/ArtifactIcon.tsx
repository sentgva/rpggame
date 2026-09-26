import { ARTIFACT_MAP, ARTIFACT_RARITY_COLORS } from '@idle/shared';
import st from './ArtifactIcon.module.css';

/** Артефакт: гранёная рамка цвета редкости и символ внутри; dim — ещё не найден. */
export function ArtifactIcon({ id, size = 48, dim }: { id: string; size?: number; dim?: boolean }) {
  const d = ARTIFACT_MAP[id];
  if (!d) return null;
  const c = ARTIFACT_RARITY_COLORS[d.rarity];
  return (
    <span className={st.wrap} style={{ width: size, height: size, ['--c' as string]: c, filter: dim ? 'grayscale(1) brightness(0.45)' : undefined }}>
      <span className={st.frame} />
      <span className={st.gem} />
      <span className={st.icon} style={{ fontSize: size * 0.48 }}>
        {dim ? '?' : d.icon}
      </span>
      {(d.rarity === 'SSR' || d.rarity === 'UR') && !dim && <span className={st.glint} />}
    </span>
  );
}
