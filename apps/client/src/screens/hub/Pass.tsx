import { HEROINE_MAP, PASS_BONUS_XP, PASS_LEVELS, PASS_SKIN_DUPE_CRYSTALS, PASS_SKIN_LEVELS, PASS_XP_PER_LEVEL, SKIN_MAP, passBonus, passLevel, passReward, passSkins, seasonEnd } from '@idle/shared';
import { HeroImg } from '../../components/HeroImg';
import { Bar, Button, CUR_ICON, Icon, Panel, css, fmtTime, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { sfx } from '../../audio/sfx';
import { BackHeader, showReward } from '../common';

export function Pass() {
  const s = useGameState();
  const now = useGame.getState().now();
  const lvl = passLevel(s);
  const season = s.shop.passSeason;
  const skins = passSkins(season);
  const bonus = passBonus(s);
  const ready = Array.from({ length: lvl }, (_, i) => i + 1).filter((l) => !s.shop.passClaimed.includes(l)).length + Math.max(0, bonus.earned - bonus.claimed);
  const overMax = Math.max(0, s.shop.passXp - PASS_LEVELS * PASS_XP_PER_LEVEL);

  const claim = async (level: number) => {
    const r = await useGame.getState().act('pass.claim', { level });
    if (r.ok) {
      sfx('coin');
      showReward(t('pass.title'), { cur: r.result.cur, items: r.result.items, skins: r.result.skins });
    }
  };
  const claimAll = async () => {
    const r = await useGame.getState().act('pass.claimAll');
    if (r.ok) {
      sfx('coin');
      showReward(t('pass.title'), { cur: r.result.cur, items: r.result.items, skins: r.result.skins });
    }
  };

  return (
    <div className={css.col}>
      <BackHeader title={t('pass.title')} />
      <Panel title={t('pass.level', { n: lvl })} right={<span className={css.tiny}>{t('pass.ends', { time: fmtTime(seasonEnd(now) - now) })}</span>}>
        {lvl < PASS_LEVELS ? (
          <Bar value={s.shop.passXp % PASS_XP_PER_LEVEL} max={PASS_XP_PER_LEVEL} height={10} text={`${s.shop.passXp % PASS_XP_PER_LEVEL}/${PASS_XP_PER_LEVEL}`} />
        ) : (
          <Bar value={overMax % PASS_BONUS_XP} max={PASS_BONUS_XP} height={10} color="#f2c86a" text={`${t('pass.bonus')} ${overMax % PASS_BONUS_XP}/${PASS_BONUS_XP}`} />
        )}
        <div className={css.tiny} style={{ marginTop: 4 }}>
          {t('pass.xpHint')}
        </div>
        {ready > 0 && (
          <Button block style={{ marginTop: 8 }} onClick={() => void claimAll()}>
            {t('pass.claimAll', { n: ready })}
          </Button>
        )}
      </Panel>

      <Panel title={t('pass.skins')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {skins.map((id, i) => {
            const sk = SKIN_MAP[id];
            const level = PASS_SKIN_LEVELS[i];
            const owned = s.skins.includes(id);
            const got = s.shop.passClaimed.includes(level);
            return (
              <div
                key={id}
                style={{
                  minWidth: 0,
                  textAlign: 'center',
                  borderRadius: 6,
                  padding: '4px 2px',
                  background: 'radial-gradient(circle at 50% 40%, #4a2a4a, #1a0e18 75%)',
                  border: `2px solid ${lvl >= level ? 'var(--accent)' : 'var(--line)'}`,
                }}
              >
                <HeroImg className="pixel" id={sk.hero} skin={id} style={{ display: 'block', width: '100%', maxWidth: 76, aspectRatio: '1', margin: '0 auto' }} />
                <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tl(sk.name)}</div>
                <div className={css.tiny} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tl(HEROINE_MAP[sk.hero].name)}
                </div>
                <div style={{ fontSize: 10, color: got || owned ? 'var(--good)' : 'var(--accent-2)' }}>{got ? '✓' : owned ? t('pass.owned') : t('pass.skinLevel', { n: level })}</div>
              </div>
            );
          })}
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('pass.dupeNote', { n: PASS_SKIN_DUPE_CRYSTALS })}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((level) => {
          const r = passReward(level, season);
          const claimed = s.shop.passClaimed.includes(level);
          const can = lvl >= level && !claimed;
          const cur = Object.entries(r.cur ?? {})[0];
          const milestone = !!r.skin || level % 10 === 0;
          const next = level === lvl + 1;
          return (
            <button
              key={level}
              className={css.chip}
              style={{
                position: 'relative',
                flexDirection: 'column',
                width: '100%',
                padding: 4,
                gap: 2,
                opacity: claimed ? 0.45 : 1,
                borderColor: can ? 'var(--accent)' : milestone ? '#9b4de0' : next ? 'var(--accent-2)' : undefined,
                background: r.skin ? 'radial-gradient(circle at 50% 40%, #4a2a4a, #1a0e18 80%)' : undefined,
                animation: can ? 'pulse 1.4s infinite' : undefined,
              }}
              onClick={() => can && void claim(level)}
            >
              <span style={{ fontSize: 10, color: lvl >= level ? 'var(--accent-2)' : 'var(--text-3)' }}>{level}</span>
              {r.skin && SKIN_MAP[r.skin] ? (
                <HeroImg className="pixel" id={SKIN_MAP[r.skin].hero} skin={r.skin} still width={34} height={34} />
              ) : (
                <Icon name={r.item ? 'weapon' : cur ? CUR_ICON[cur[0]] : 'gift'} size={22} />
              )}
              <span style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                {r.skin ? t('reward.skin') : r.item ? t(`pass.item.${r.item}`) : cur ? (cur[0] === 'gold' ? `${cur[1]}m` : formatNum(cur[1] ?? 0)) : ''}
              </span>
              {claimed && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 11, color: 'var(--good)' }}>✓</span>}
            </button>
          );
        })}
      </div>

      <Panel title={t('pass.bonus')}>
        <div className={css.row}>
          <Icon name="chest" size={34} />
          <div className={css.grow}>
            <div className={css.tiny}>{t('pass.bonusHint', { n: PASS_BONUS_XP })}</div>
            <div className={css.tiny}>{t('pass.bonusReady', { n: Math.max(0, bonus.earned - bonus.claimed) })}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
