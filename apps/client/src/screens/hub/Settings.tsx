import { ITEM_RARITY_NAMES } from '@idle/shared';
import type { ReactNode } from 'react';
import { Button, Panel, Toggle, css } from '../../components/ui';
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
        <Row label={t('settings.music')}>
          <input type="range" min={0} max={1} step={0.1} value={st.music} onChange={(e) => set({ music: Number(e.target.value) })} />
        </Row>
        <Row label={t('settings.sfx')}>
          <input type="range" min={0} max={1} step={0.1} value={st.sfx} onChange={(e) => set({ sfx: Number(e.target.value) })} />
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
      <Panel title={t('settings.account')}>
        <div className={css.tiny}>{t('settings.id', { id: s.id })}</div>
        <div className={css.tiny}>{t('settings.version', { v: `0.1.0 · ${g.mode}` })}</div>
        {g.isDev && (
          <Button kind="secondary" size="small" style={{ marginTop: 8 }} onClick={() => useUi.getState().push({ id: 'dev' })}>
            {t('settings.dev')}
          </Button>
        )}
      </Panel>
    </div>
  );
}
