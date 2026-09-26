import { ITEM_RARITY_NAMES, VECTOR_ART, artStyleOf } from '@idle/shared';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button, Panel, Slider, Toggle, css, openSheet } from '../../components/ui';
import { collectDiag } from '../../net/diag';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { addToHomeScreen, share, tg, toggleFullscreen } from '../../tg/telegram';
import { BackHeader } from '../common';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={css.statRow} style={{ padding: '8px 2px' }}>
      <span>{label}</span>
      {children}
    </div>
  );
}

export function Settings() {
  const s = useGameState();
  const g = useGame();
  const st = s.settings;
  const set = (patch: Record<string, unknown>) => void g.act('settings', { patch }, { silent: true });
  const refLink = g.botUsername ? `https://t.me/${g.botUsername}${g.appName ? `/${g.appName}` : ''}?startapp=ref_${s.id}` : '';
  return (
    <div className={css.col}>
      <BackHeader title={t('settings.title')} />
      <Panel>
        <Row label={t('settings.lang')}>
          <div className={css.row} style={{ gap: 4 }}>
            <Button size="small" kind={st.lang === 'ru' ? 'primary' : 'secondary'} onClick={() => set({ lang: 'ru' })}>
              RU
            </Button>
            <Button size="small" kind={st.lang === 'en' ? 'primary' : 'secondary'} onClick={() => set({ lang: 'en' })}>
              EN
            </Button>
          </div>
        </Row>
        {VECTOR_ART && (
          <Row label={t('settings.artStyle')}>
            <div className={css.row} style={{ gap: 4 }}>
              <Button size="small" kind={artStyleOf(st.artStyle) === 'vector' ? 'primary' : 'secondary'} onClick={() => set({ artStyle: 'vector' })}>
                {t('settings.artVector')}
              </Button>
              <Button size="small" kind={artStyleOf(st.artStyle) === 'pixel' ? 'primary' : 'secondary'} onClick={() => set({ artStyle: 'pixel' })}>
                {t('settings.artPixel')}
              </Button>
            </div>
          </Row>
        )}
        <Row label={t('settings.music')}>
          <Slider value={st.music} onChange={(v) => set({ music: v })} />
        </Row>
        <Row label={t('settings.sfx')}>
          <Slider value={st.sfx} onChange={(v) => set({ sfx: v })} />
        </Row>
        <Row label={t('settings.manualUlt')}>
          <Toggle value={st.manualUlt !== false} onChange={(v) => set({ manualUlt: v })} />
        </Row>
        <Row label={t('settings.haptics')}>
          <Toggle value={st.haptics} onChange={(v) => set({ haptics: v })} />
        </Row>
        <Row label={t('settings.notify')}>
          <Toggle value={st.notify} onChange={(v) => set({ notify: v })} />
        </Row>
        <Row label={t('settings.autoLevel')}>
          <Toggle value={st.autoLevel} onChange={(v) => set({ autoLevel: v })} />
        </Row>
        <Row label={t('settings.autoRetry')}>
          <Toggle value={st.autoRetry} onChange={(v) => set({ autoRetry: v })} />
        </Row>
        {(s.ascension.up.autoBoss ?? 0) > 0 && (
          <Row label={t('settings.autoBoss')}>
            <Toggle value={st.autoBoss} onChange={(v) => set({ autoBoss: v })} />
          </Row>
        )}
        <Row label={t('settings.autoSmelt')}>
          <select className={css.input} value={st.autoSmelt} onChange={(e) => set({ autoSmelt: Number(e.target.value) })}>
            <option value={-1}>{t('settings.autoSmeltOff')}</option>
            {[1, 2, 3, 4].map((r) => (
              <option key={r} value={r}>
                {t('settings.autoSmeltBelow', { r: tl(ITEM_RARITY_NAMES[r]) })}
              </option>
            ))}
          </select>
        </Row>
      </Panel>
      {tg && (
        <Panel>
          <div className={css.col}>
            <Button kind="secondary" block onClick={() => addToHomeScreen()}>
              {t('settings.homeScreen')}
            </Button>
            <Button kind="secondary" block onClick={() => toggleFullscreen()}>
              {t('settings.fullscreen')}
            </Button>
          </div>
        </Panel>
      )}
      {g.flags.social && refLink && (
        <Panel title={t('settings.invite')}>
          <div className={css.tiny}>{t('settings.inviteDesc')}</div>
          <Button block style={{ marginTop: 6 }} onClick={() => share(t('share.invite'), refLink)}>
            {t('settings.invite')}
          </Button>
        </Panel>
      )}
      <Panel title={t('bug.title')}>
        <div className={css.tiny}>{t('bug.desc')}</div>
        <Button kind="secondary" block style={{ marginTop: 6 }} onClick={() => openBugReport()}>
          🐞 {t('bug.button')}
        </Button>
      </Panel>
      <Panel title={t('settings.account')}>
        <div className={css.tiny}>{t('settings.id', { id: s.id })}</div>
        <div className={css.tiny}>{t('settings.version', { v: `0.1.0 · ${g.mode}` })}</div>
        {g.isDev && (
          <Button kind="secondary" size="small" style={{ marginTop: 8 }} onClick={() => useUi.getState().push({ id: 'dev' })}>
            {t('settings.dev')}
          </Button>
        )}
      </Panel>
      <Panel title={t('reset.title')}>
        <div className={css.tiny}>{t('reset.desc')}</div>
        <Button kind="danger" block style={{ marginTop: 6 }} onClick={() => openSheet(t('reset.title'), (close) => <ResetConfirm onDone={close} />)}>
          {t('reset.button')}
        </Button>
      </Panel>
    </div>
  );
}

/** Подтверждение полного сброса: кнопка оживает через несколько секунд, чтобы не нажать случайно. */
function ResetConfirm({ onDone }: { onDone: () => void }) {
  const [wait, setWait] = useState(5);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);
  const run = async () => {
    setBusy(true);
    const r = await useGame.getState().act('account.reset', { confirm: 'RESET' });
    setBusy(false);
    if (!r.ok) return;
    onDone();
    // всё с чистого листа: закрываем окна и возвращаемся в бой, где снова начнётся обучение
    useUi.setState({ modals: [], tab: 'battle', stacks: { battle: [], heroes: [], gear: [], map: [], hub: [] }, gearHero: null });
    useUi.getState().toast(t('reset.done'), 'good');
  };
  return (
    <div className={css.col}>
      <div style={{ fontSize: 14, lineHeight: 1.4 }}>{t('reset.warn')}</div>
      <div className={css.tiny}>{t('reset.keep')}</div>
      <Button kind="danger" block disabled={wait > 0 || busy} onClick={() => void run()}>
        {wait > 0 ? t('reset.wait', { n: wait }) : t('reset.confirm')}
      </Button>
      <Button kind="secondary" block onClick={onDone}>
        {t('common.cancel')}
      </Button>
    </div>
  );
}

export function openBugReport() {
  openSheet(t('bug.title'), (close) => <BugReportForm onDone={close} />);
}

function BugReportForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [withDiag, setWithDiag] = useState(true);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const g = useGame.getState();
    const ui = useUi.getState();
    if (g.mode === 'local') {
      ui.toast(t('bug.local'), 'info');
      return;
    }
    setBusy(true);
    try {
      const r = await g.backend().bugReport(text.trim(), withDiag ? collectDiag() : { source: 'app' });
      if (r.ok) {
        ui.toast(r.delivered ? t('bug.sent') : t('bug.saved'), 'good');
        onDone();
      } else ui.toast(r.error?.code === 'rateLimit' ? t('bug.limit') : t('bug.short'), 'bad');
    } catch {
      ui.toast(t('err.network'), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={css.col}>
      <div className={css.tiny}>{t('bug.hint')}</div>
      <textarea
        className={css.input}
        value={text}
        maxLength={1500}
        rows={6}
        placeholder={t('bug.placeholder')}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', resize: 'vertical', minHeight: 110, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.35 }}
      />
      <div className={css.row} style={{ justifyContent: 'space-between' }}>
        <span className={css.tiny}>{t('bug.attach')}</span>
        <Toggle value={withDiag} onChange={setWithDiag} />
      </div>
      <Button block disabled={busy || text.trim().length < 3} onClick={() => void send()}>
        {t('bug.send')}
      </Button>
    </div>
  );
}
