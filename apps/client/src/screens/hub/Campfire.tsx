import { CAMP_BOND, CAMP_MASTERY, COMBO_MAP, HEROINE_MAP, campCombos, campfireScene, campfireState, type CampChoice } from '@idle/shared';
import { useState } from 'react';
import { sceneUrl } from '../../art/scenes';
import { HeroImg } from '../../components/HeroImg';
import { Button, CLASS_COLOR, Icon, Panel, css } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { sfx } from '../../audio/sfx';
import { BackHeader } from '../common';
import st from './Campfire.module.css';

/** Вечер у костра: две героини разговаривают, Командор отвечает — близость и сыгранность их связки. */
export function Campfire() {
  const s = useGameState();
  const now = useGame.getState().now();
  const scene = campfireScene({ s, now });
  const done = campfireState({ s, now }).done;
  const [shown, setShown] = useState(1);
  const [result, setResult] = useState<{ choice: CampChoice; reply: [string, { ru: string; en: string }] } | null>(null);

  if (!scene)
    return (
      <div className={css.col}>
        <BackHeader title={t('camp.title')} />
        <Panel>
          <div className={css.muted}>{t('camp.none')}</div>
        </Panel>
      </div>
    );

  const hero = (w: 'a' | 'b') => (w === 'a' ? scene.a : scene.b);
  const lines = scene.lines.slice(0, done && !result ? scene.lines.length : shown);
  const allShown = shown >= scene.lines.length;
  const combos = campCombos(scene.a, scene.b);
  const talk = async (choice: CampChoice) => {
    const r = await useGame.getState().act('camp.talk', { choice });
    if (r.ok) {
      haptic.success();
      sfx('rare');
      setResult({ choice, reply: r.result.reply });
    }
  };

  return (
    <div className={css.col}>
      <BackHeader title={t('camp.title')} />
      <div className={st.scene} style={{ backgroundImage: `url(${sceneUrl('camp')})` }}>
        <div className={st.fire}>
          <span className={st.flame} />
          <span className={st.flame2} />
        </div>
        <HeroImg id={scene.a} skin={s.heroines[scene.a]?.skin} unarmed flirt className={`pixel ${st.left}`} />
        <HeroImg id={scene.b} skin={s.heroines[scene.b]?.skin} unarmed flirt className={`pixel ${st.right}`} />
      </div>

      <Panel>
        <div className={css.col} style={{ gap: 6 }}>
          {lines.map(([who, text], i) => (
            <Bubble key={i} id={hero(who)} side={who} text={tl(text)} />
          ))}
          {result && <Bubble id={hero(result.reply[0] as 'a' | 'b')} side={result.reply[0] as 'a' | 'b'} text={tl(result.reply[1])} />}
        </div>
        {!done && !allShown && (
          <Button block style={{ marginTop: 8 }} onClick={() => setShown((n) => n + 1)}>
            {t('camp.next')}
          </Button>
        )}
        {!done && allShown && (
          <div className={css.col} style={{ gap: 6, marginTop: 8 }}>
            {(['a', 'b', 'both'] as CampChoice[]).map((c) => (
              <button key={c} className={st.choice} onClick={() => void talk(c)}>
                {c !== 'both' && <Icon name={HEROINE_MAP[hero(c)].cls} size={16} />}
                {c === 'both' && <Icon name="hearts" size={16} />}
                <span>{tl(scene.choices[c])}</span>
              </button>
            ))}
          </div>
        )}
        {result && (
          <div className={st.rewards}>
            {[scene.a, scene.b].map((id) => {
              const xp = result.choice === 'both' ? CAMP_BOND.both : (result.choice === 'a') === (id === scene.a) ? CAMP_BOND.favored : CAMP_BOND.other;
              return (
                <span key={id} className={css.chip}>
                  ♥ {tl(HEROINE_MAP[id].name)} +{xp}
                </span>
              );
            })}
            {combos.map((c) => (
              <span key={c} className={css.chip}>
                <Icon name="combo" size={12} /> {tl(COMBO_MAP[c].name)} +{CAMP_MASTERY}
              </span>
            ))}
          </div>
        )}
        {done && !result && <div className={css.tiny} style={{ marginTop: 8, textAlign: 'center' }}>{t('camp.tomorrow')}</div>}
      </Panel>
      <div className={css.tiny} style={{ textAlign: 'center', lineHeight: 1.4 }}>
        {t('camp.hint', { n: CAMP_MASTERY })}
      </div>
    </div>
  );
}

function Bubble({ id, side, text }: { id: string; side: 'a' | 'b'; text: string }) {
  const def = HEROINE_MAP[id];
  return (
    <div className={side === 'a' ? st.bubbleL : st.bubbleR} style={{ borderColor: CLASS_COLOR[def.cls] }}>
      <b style={{ color: CLASS_COLOR[def.cls] }}>{tl(def.name)}</b>
      <div>{text}</div>
    </div>
  );
}
