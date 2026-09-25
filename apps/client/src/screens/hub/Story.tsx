import { LORE } from '@idle/shared';
import { Panel, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGameState } from '../../store/game';
import { BackHeader } from '../common';

export function Story() {
  const s = useGameState();
  return (
    <div className={css.col}>
      <BackHeader title={t('story.title')} />
      {LORE.filter((l) => s.story.includes(l.id)).map((l) => (
        <Panel key={l.id} title={tl(l.title)}>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{tl(l.text)}</p>
        </Panel>
      ))}
      <div className={css.tiny} style={{ textAlign: 'center' }}>
        {s.story.length}/{LORE.length}
      </div>
    </div>
  );
}
