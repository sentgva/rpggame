import { CHANGELOG, CHANGELOG_LATEST, type ChangelogEntry } from '@idle/shared';
import { t, tl } from '../i18n';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { Button, Sheet, css } from './ui';

function Entry({ e, fresh }: { e: ChangelogEntry; fresh?: boolean }) {
  return (
    <div className={css.panel} style={fresh ? { borderColor: '#f2c86a' } : undefined}>
      <div className={css.row} style={{ marginBottom: 6 }}>
        <b className={css.grow}>{tl(e.title)}</b>
        <span className={css.tiny}>{e.date}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 4, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, lineHeight: 1.4, fontSize: 14 }}>
        {e.items.map((it, i) => (
          <li key={i}>{tl(it)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Записи, которых игрок ещё не видел (или последняя — если видел все). */
function unseen(seen?: string): ChangelogEntry[] {
  const i = seen ? CHANGELOG.findIndex((e) => e.id === seen) : -1;
  return i > 0 ? CHANGELOG.slice(0, i) : CHANGELOG.slice(0, 1);
}

export function newsPending(seen?: string): boolean {
  return seen !== CHANGELOG_LATEST;
}

/** «Что нового»: при входе — только новые записи, в лагере — весь список. */
export function openNews(all = false) {
  const seen = useGame.getState().state?.settings.news;
  const list = all ? CHANGELOG : unseen(seen);
  // показали — значит, увидено: при следующем входе не откроется
  if (newsPending(seen)) void useGame.getState().act('news.seen', { id: CHANGELOG_LATEST }, { silent: true });
  useUi.getState().open((close) => (
    <Sheet title={t('news.title')} onClose={close}>
      <div className={css.col}>
        {list.map((e, i) => (
          <Entry key={e.id} e={e} fresh={!all && i === 0} />
        ))}
      </div>
      <div style={{ height: 12 }} />
      <Button block onClick={close}>
        {t('news.ok')}
      </Button>
    </Sheet>
  ));
}
