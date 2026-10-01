import { FASHION_BONUS, FASHION_NAMES, activeParty, fashionFits, fashionOfDay } from '@idle/shared';
import { t, tl } from '../i18n';
import { useGameState } from '../store/game';
import { css } from './ui';

/** «Модный день»: тема дня, бонус и сколько героев отряда ему соответствует. */
export function FashionDay({ party = true }: { party?: boolean }) {
  const s = useGameState();
  const theme = fashionOfDay(s.day.key);
  const f = FASHION_NAMES[theme];
  const ids = activeParty(s);
  const n = ids.filter((id) => fashionFits(s.heroines[id]?.skin, theme)).length;
  return (
    <div className={css.tiny} style={{ lineHeight: 1.4, color: '#ff9ac8' }}>
      {f.icon} <b>{tl(f.name)}</b>: {t('fashion.bonus', { hint: tl(f.hint), pct: Math.round(FASHION_BONUS * 100) })}
      {party && <span style={{ color: 'var(--muted)' }}> · {t('fashion.count', { n, max: ids.length })}</span>}
    </div>
  );
}
