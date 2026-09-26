import {
  CLASSES,
  HEROINE_MAP,
  HERO_RARITY_COLORS,
  TOUR_CHAMP_REWARD,
  TOUR_ENTRIES,
  TOUR_LEVEL,
  TOUR_LOSSES,
  TOUR_PICKS,
  TOUR_WINS,
  tourEntriesLeft,
  tourNext,
  tourOf,
  tourWinReward,
  type FestivalDef,
  type FestivalState,
} from '@idle/shared';
import { useState } from 'react';
import { HeroImg } from '../../components/HeroImg';
import { Button, ElementIcon, Icon, Panel, css, cx } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame } from '../../store/game';
import { RewardList, showReward } from '../common';
import { playMode } from './Endgame';
import fs from './Festival.module.css';
import st from './FestModes.module.css';

/** Бои турнира — на песке «Пустыни миражей»: ближе всего к арене. */
const ARENA_ACT = 2;

/** Карточка героини драфта: портрет, редкость, класс и стихия (уровень у всех один — турнирный). */
function DraftCard({ id, onClick, selected }: { id: string; onClick?: () => void; selected?: boolean }) {
  const def = HEROINE_MAP[id];
  return (
    <button className={cx(st.draftCard, selected && st.draftOn)} style={{ ['--rc' as string]: HERO_RARITY_COLORS[def.rarity] }} onClick={onClick}>
      <span className={st.rarity}>{def.rarity}</span>
      <span className={st.elem}>
        <ElementIcon el={def.element} size={16} />
      </span>
      <HeroImg id={id} className={cx('pixel', st.draftImg)} />
      <b className={st.draftName}>{tl(def.name)}</b>
      <span className={css.tiny}>{tl(CLASSES[def.cls].name)}</span>
    </button>
  );
}

/** Отряд из пяти: маленькие портреты по порядку (передний ряд — слева). */
function TeamRow({ ids, onPick, selected }: { ids: string[]; onPick?: (i: number) => void; selected?: number }) {
  return (
    <div className={st.team}>
      {Array.from({ length: TOUR_PICKS }, (_, i) => {
        const id = ids[i];
        return (
          <button key={i} className={cx(st.teamSlot, selected === i && st.draftOn)} onClick={() => onPick?.(i)} disabled={!onPick || !id}>
            {id ? <HeroImg id={id} className="pixel" width={48} height={48} /> : <Icon name="plus" size={20} />}
            {id && <span className={st.teamRar} style={{ color: HERO_RARITY_COLORS[HEROINE_MAP[id].rarity] }}>{HEROINE_MAP[id].rarity}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Счёт забега: семь побед и три «жизни». */
function Score({ wins, losses }: { wins: number; losses: number }) {
  return (
    <div className={st.score}>
      <span className={st.pips}>
        {Array.from({ length: TOUR_WINS }, (_, i) => (
          <span key={i} className={cx(st.pip, i < wins && st.pipWin)} />
        ))}
      </span>
      <span className={st.lives}>
        {Array.from({ length: TOUR_LOSSES }, (_, i) => (
          <Icon key={i} name="hearts" size={16} style={{ opacity: i < TOUR_LOSSES - losses ? 1 : 0.2 }} />
        ))}
      </span>
    </div>
  );
}

export function TourneyTab({ def, f }: { def: FestivalDef; f: FestivalState }) {
  const tour = tourOf(f);
  const run = tour.run;
  const left = tourEntriesLeft(f);
  const [swapPick, setSwapPick] = useState<number | null>(null);
  const act = (type: string, params: Record<string, unknown> = {}) => useGame.getState().act(type, params);

  // нет забега или он завершён — правила, рекорды и вход
  if (!run || run.phase === 'done') {
    return (
      <div className={css.col}>
        {run && (
          <Panel title={t('tour.lastRun')}>
            <Score wins={run.wins} losses={run.losses} />
            <div className={css.tiny} style={{ marginTop: 6 }}>
              {run.wins >= TOUR_WINS ? t('tour.champion') : t('tour.runOver', { n: run.wins })}
            </div>
            <TeamRow ids={run.picks} />
          </Panel>
        )}
        <Panel>
          <div className={st.rules}>
            <Icon name="arena" size={40} />
            <div className={css.tiny} style={{ lineHeight: 1.45 }}>
              {t('tour.rules', { picks: TOUR_PICKS, lvl: TOUR_LEVEL, wins: TOUR_WINS, losses: TOUR_LOSSES })}
            </div>
          </div>
          <div className={st.stats}>
            <span>{t('tour.best', { n: tour.best })}</span>
            <span>{t('tour.wins', { n: tour.wins })}</span>
            <span>{t('tour.champs', { n: tour.champs })}</span>
          </div>
          <Button block size="big" disabled={left <= 0} onClick={() => void act('tour.start')} style={{ marginTop: 8 }}>
            {t('tour.start')} · {t('tour.entries', { n: left, max: TOUR_ENTRIES })}
          </Button>
          <div className={css.tiny} style={{ marginTop: 6 }}>
            {t('tour.champReward', { shards: TOUR_CHAMP_REWARD.shards, name: tl(HEROINE_MAP[def.hero].name) })}
          </div>
        </Panel>
      </div>
    );
  }

  if (run.phase === 'draft') {
    return (
      <div className={css.col}>
        <Panel title={t('tour.draft', { n: run.picks.length + 1, max: TOUR_PICKS })}>
          <div className={css.tiny} style={{ marginBottom: 6 }}>
            {t('tour.draftHint')}
          </div>
          <div className={st.offer}>
            {run.offer.map((id, i) => (
              <DraftCard key={id} id={id} onClick={() => void act('tour.pick', { index: i })} />
            ))}
          </div>
        </Panel>
        <Panel title={t('tour.team')}>
          <TeamRow ids={run.picks} />
        </Panel>
      </div>
    );
  }

  if (run.phase === 'swap') {
    return (
      <div className={css.col}>
        <Panel title={t('tour.swap')}>
          <Score wins={run.wins} losses={run.losses} />
          <div className={css.tiny} style={{ margin: '6px 0' }}>
            {t('tour.swapHint')}
          </div>
          <div className={st.offer}>
            {run.offer.map((id, i) => (
              <DraftCard key={id} id={id} selected={swapPick === i} onClick={() => setSwapPick(swapPick === i ? null : i)} />
            ))}
          </div>
          <div className={css.tiny} style={{ margin: '8px 0 4px' }}>
            {swapPick === null ? t('tour.team') : t('tour.swapWho')}
          </div>
          <TeamRow
            ids={run.picks}
            onPick={
              swapPick === null
                ? undefined
                : (slot) => {
                    setSwapPick(null);
                    void act('tour.swap', { index: swapPick, slot });
                  }
            }
          />
          <Button block kind="secondary" style={{ marginTop: 8 }} onClick={() => void act('tour.swap')}>
            {t('tour.keep')}
          </Button>
        </Panel>
      </div>
    );
  }

  // бой: наш отряд против соперниц раунда
  const opp = tourNext(run, def);
  const next = tourWinReward(run.wins + 1);
  const fight = () =>
    void playMode('tour.fight', {}, tl(opp.name), ARENA_ACT, (res) => ({
      outcome: <span style={{ color: res.win ? 'var(--good)' : 'var(--bad)' }}>{res.reward.champion ? t('tour.champion') : res.win ? t('tour.won', { n: res.run.wins }) : t('tour.lost', { n: TOUR_LOSSES - res.run.losses })}</span>,
      result: (
        <div className={css.col}>
          <RewardList r={{ cur: { ...res.reward.cur, ...(res.reward.end ?? {}) }, shards: res.reward.shards }} />
          {res.reward.points > 0 && <div className={fs.pointsGain}>{t('fest.pointsGain', { n: res.reward.points })}</div>}
        </div>
      ),
    }));
  return (
    <div className={css.col}>
      <Panel>
        <Score wins={run.wins} losses={run.losses} />
        <div className={st.vs}>
          <div>
            <div className={css.tiny}>{t('tour.team')}</div>
            <TeamRow ids={run.picks} />
          </div>
          <div className={st.vsMark}>VS</div>
          <div>
            <div className={css.tiny}>
              {tl(opp.name)} · {t('common.level')} {opp.lvl}
            </div>
            <TeamRow ids={opp.team} />
          </div>
        </div>
        <Button block size="big" onClick={fight} style={{ marginTop: 8 }}>
          {opp.final ? t('tour.final') : t('tour.round', { n: run.wins + 1 })}
        </Button>
        <div className={css.row} style={{ marginTop: 6, justifyContent: 'space-between' }}>
          <span className={css.tiny}>{t('tour.nextReward', { tokens: next.tokens, points: next.points })}</span>
          <button
            className={st.link}
            onClick={async () => {
              const r = await act('tour.retire');
              if (r.ok) showReward(t('tour.lastRun'), { cur: r.result.cur });
            }}
          >
            {t('tour.retire')}
          </button>
        </div>
      </Panel>
    </div>
  );
}
