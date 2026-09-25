import { ASCENSION_UPGRADES, ascensionCost, etherForStage, isUnlocked, legionMult } from '@idle/shared';
import { Button, Cost, Icon, Panel, confirmDialog, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { sfx } from '../../audio/sfx';
import { BackHeader, Locked } from '../common';
import { stageText } from '../MapTab';

export function Ascension() {
  const s = useGameState();
  const cfg = useCfg();
  if (!isUnlocked({ s, cfg }, 'ascension'))
    return (
      <div className={css.col}>
        <BackHeader title={t('asc.title')} />
        <Locked text={t('common.unlocksAt', { stage: stageText(cfg.unlocks.stage.ascension) })} />
      </div>
    );
  const ether = etherForStage({ cfg, s }, s.progress.maxGlobal);
  const can = s.progress.maxGlobal >= cfg.ascension.unlockGlobal;
  return (
    <div className={css.col}>
      <BackHeader title={t('asc.title')} right={<Cost cur="ether" amount={s.cur.ether} />} />
      <Panel title={t('asc.count', { n: s.ascension.count })}>
        <p style={{ margin: '0 0 8px', lineHeight: 1.45, fontSize: 13 }}>{t('asc.desc')}</p>
        <div className={css.tiny} style={{ marginBottom: 6 }}>
          {t('asc.legion', {
            now: `×${legionMult(cfg, s).toFixed(2)}`,
            next: `×${legionMult(cfg, { ascension: { ...s.ascension, count: s.ascension.count + 1 } }).toFixed(2)}`,
          })}
        </div>
        {can ? <div className={css.gold}>{t('asc.ether', { n: ether })}</div> : <div className={css.muted}>{t('asc.need', { stage: stageText(cfg.ascension.unlockGlobal) })}</div>}
        <Button
          block
          kind="danger"
          size="big"
          style={{ marginTop: 8 }}
          disabled={!can}
          onClick={() =>
            confirmDialog(t('asc.confirm'), async () => {
              const r = await useGame.getState().act('ascend');
              if (r.ok) {
                sfx('rare');
                useUi.getState().toast(t('asc.done', { n: r.result.ether }), 'good');
              }
            }, t('asc.do'))
          }
        >
          <Icon name="ascension" size={22} />
          {t('asc.do')}
        </Button>
      </Panel>
      <Panel title={t('asc.tree')}>
        <div className={css.list}>
          {ASCENSION_UPGRADES.map((u) => {
            const rank = s.ascension.up[u.id] ?? 0;
            const max = rank >= u.max;
            const reqOk = !u.req || (s.ascension.up[u.req.id] ?? 0) >= u.req.rank;
            return (
              <div key={u.id} className={css.listItem} style={{ opacity: reqOk ? 1 : 0.5 }}>
                <Icon name="ascension" size={28} />
                <div className={css.grow}>
                  <b>{tl(u.name)}</b>
                  <div className={css.tiny}>{tl(u.desc)}</div>
                  <div className={css.tiny}>{t('asc.rank', { r: rank, max: u.max })}</div>
                </div>
                <Button size="small" disabled={max || !reqOk} onClick={() => void useGame.getState().act('ascension.buy', { id: u.id })}>
                  {max ? t('common.max') : <Cost cur="ether" amount={ascensionCost(u, rank)} />}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
