import { CHANGELOG, CHANGELOG_LATEST, type ChangelogEntry, type L10n } from '@idle/shared';
import { useState, type CSSProperties } from 'react';
import { t, tl } from '../i18n';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { HeroImg } from './HeroImg';
import st from './News.module.css';
import { Button, Sheet, cx } from './ui';

/** Пункт «🌕 текст» → значок отдельно, текст отдельно. */
function splitIcon(item: L10n): { icon: string; text: string } {
  const s = tl(item);
  const m = /^(\S+)\s+(.*)$/su.exec(s);
  if (m && !/[\p{L}\p{N}]/u.test(m[1])) return { icon: m[1], text: m[2] };
  return { icon: '•', text: s };
}

/** Большая карточка обновления: цветной фон, героиня, суть и главные пункты. */
function Hero({ e, fresh }: { e: ChangelogEntry; fresh?: boolean }) {
  return (
    <div className={st.card} style={{ ['--nc' as string]: e.color } as CSSProperties}>
      <div className={st.top}>
        <div className={st.topText}>
          <div className={st.meta}>
            {fresh && <span className={st.newTag}>{t('news.new')}</span>}
            <span className={st.date}>{e.date}</span>
          </div>
          <div className={st.title}>
            <span className={st.icon}>{e.icon}</span> {tl(e.title)}
          </div>
          <div className={st.lead}>{tl(e.lead)}</div>
        </div>
        {e.art && <HeroImg id={e.art.hero} skin={e.art.skin} className={cx('pixel', st.art)} />}
      </div>
      <div className={st.items}>
        {e.items.map((it, i) => {
          const { icon, text } = splitIcon(it);
          return (
            <div key={i} className={st.item} style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <span className={st.itemIcon}>{icon}</span>
              <span>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Прошлое обновление: компактная строка, по нажатию раскрывается. */
function Past({ e }: { e: ChangelogEntry }) {
  const [open, setOpen] = useState(false);
  if (open) return <Hero e={e} />;
  return (
    <button className={st.row} style={{ ['--nc' as string]: e.color } as CSSProperties} onClick={() => setOpen(true)}>
      <span className={st.rowIcon}>{e.icon}</span>
      <span className={st.rowText}>
        <b>{tl(e.title)}</b>
        <span className={st.rowLead}>{tl(e.lead)}</span>
      </span>
      <span className={st.date}>{e.date.slice(0, 5)}</span>
    </button>
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

/** «Что нового»: при входе — только новые обновления, в лагере — последнее крупно и прошлые списком. */
export function openNews(all = false) {
  const seen = useGame.getState().state?.settings.news;
  const fresh = all ? CHANGELOG.slice(0, 1) : unseen(seen);
  const past = all ? CHANGELOG.slice(1) : [];
  // показали — значит, увидено: при следующем входе не откроется
  if (newsPending(seen)) void useGame.getState().act('news.seen', { id: CHANGELOG_LATEST }, { silent: true });
  useUi.getState().open((close) => (
    <Sheet title={t('news.title')} onClose={close}>
      <div className={st.list}>
        {fresh.map((e) => (
          <Hero key={e.id} e={e} fresh={!all} />
        ))}
        {past.length > 0 && <div className={st.pastTitle}>{t('news.past')}</div>}
        {past.map((e) => (
          <Past key={e.id} e={e} />
        ))}
      </div>
      <div style={{ height: 12 }} />
      <Button block onClick={close}>
        {t('news.ok')}
      </Button>
    </Sheet>
  ));
}
