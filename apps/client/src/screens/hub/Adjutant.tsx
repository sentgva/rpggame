import {
  ADJ_CLOSE_LVL,
  ADJ_LINES,
  ADJ_PATS,
  ADJ_PAT_BOND,
  BOND_HEROES,
  HEROINE_MAP,
  SKIN_MAP,
  TOUCH_LINES,
  adjutantSkins,
  adjutantState,
  bondTraits,
  dayPart,
  isSwimwear,
  type L10n,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import type { Arms, Eyes } from '../../art/figure';
import { sceneUrl, type SceneBg } from '../../art/scenes';
import { HeroImg } from '../../components/HeroImg';
import { CLASS_COLOR, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { TOUCH_BODY, TOUCH_HEAD } from './Care';
import st from './Adjutant.module.css';

/** Фон по наряду: купальник — пляж, бельё и пижама — спальня, вечерние — закат, остальное — лагерь. */
function adjScene(skin?: string): SceneBg {
  const sk = skin ? SKIN_MAP[skin] : undefined;
  if (!sk) return 'camp';
  if (isSwimwear(sk.look.wear)) return 'beach';
  if (sk.set === 'lingerie' || sk.id.endsWith('_sleep')) return 'bedroom';
  if (sk.set === 'masquerade' || sk.set === 'bond') return 'sunset';
  return 'camp';
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Адъютант лагеря (по мотивам секретаря Azur Lane и лобби NIKKE): выбранный герой в выбранном наряде
 * на фоне места, здоровается по времени суток, сам заговаривает и отзывается на касания; первые
 * касания за день дают близость.
 */
export function Adjutant() {
  const s = useGameState();
  const now = useGame.getState().now();
  const adj = adjutantState({ s, now });
  const hero = adj?.hero;
  const p = hero ? bondTraits(hero).p : 'gentle';
  const lvl = hero ? (s.bond?.[hero]?.lvl ?? 0) : 0;
  const [line, setLine] = useState<L10n | null>(null);
  const [touch, setTouch] = useState<{ arms: Arms; eyes: Eyes; hearts: { id: number; x: number; y: number; d: number }[] } | null>(null);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const timer = useRef(0);
  const idle = useRef(0);

  // приветствие по времени суток, потом — сам заговаривает, если долго не трогать
  useEffect(() => {
    if (!hero) return;
    setLine(ADJ_LINES[p].greet[dayPart(new Date().getHours())]);
    const talk = () => {
      const lines = ADJ_LINES[p];
      setLine(lvl >= ADJ_CLOSE_LVL && Math.random() < 0.5 ? pick(lines.close) : pick(lines.idle));
      idle.current = window.setTimeout(talk, 14000 + Math.random() * 8000);
    };
    idle.current = window.setTimeout(talk, 12000);
    return () => clearTimeout(idle.current);
  }, [hero, p, lvl]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!adj || !hero) return null;
  const def = HEROINE_MAP[hero];

  async function touchHero(zone: 'head' | 'body', x: number, y: number) {
    haptic.tap();
    const close = lvl >= ADJ_CLOSE_LVL && Math.random() < 0.35;
    setLine(close ? pick(ADJ_LINES[p].close) : pick(TOUCH_LINES[p][zone]));
    const react = zone === 'head' ? TOUCH_HEAD : TOUCH_BODY[p];
    const id = Date.now();
    setTouch({ ...react, hearts: Array.from({ length: zone === 'head' ? 3 : 2 }, (_, i) => ({ id: id + i, x: x - 6 + (i - 1) * 14, y: y - 10, d: i * 120 })) });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTouch(null), 1900);
    if (adj!.pats < ADJ_PATS && BOND_HEROES.includes(hero!)) {
      const r = await useGame.getState().act('adj.pat', { zone });
      if (r.ok) setGain({ n: ADJ_PAT_BOND, key: id });
    }
  }

  function change() {
    openSheet(t('adj.pick'), (close) => <AdjPicker onDone={close} />);
  }

  return (
    <div className={cx(css.panel, st.wrap)} style={{ backgroundImage: `url(${sceneUrl(adjScene(adj.skin))})` }}>
      <div className={st.shade} />
      <div className={st.top}>
        <div className={st.kicker}>{t('hub.kicker')}</div>
        <div className={st.name} style={{ color: CLASS_COLOR[def.cls] }}>
          {tl(def.name)}
        </div>
        <div className={st.role}>{t('adj.title')}</div>
      </div>
      {line && (
        <div key={tl(line)} className={st.bubble}>
          {tl(line)}
        </div>
      )}
      <HeroImg
        id={hero}
        skin={adj.skin}
        className={cx('pixel', st.hero)}
        unarmed
        flirt
        arms={touch?.arms}
        eyes={touch?.eyes}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const wrap = e.currentTarget.parentElement!.getBoundingClientRect();
          void touchHero((e.clientY - box.top) / box.height < 0.3 ? 'head' : 'body', e.clientX - wrap.left, e.clientY - wrap.top);
        }}
      />
      {touch?.hearts.map((h) => (
        <span key={h.id} className={st.heart} style={{ left: h.x, top: h.y, animationDelay: `${h.d}ms` }}>
          ♥
        </span>
      ))}
      {gain && (
        <span key={gain.key} className={st.gain}>
          +{gain.n} ♥
        </span>
      )}
      <div className={st.bar}>
        <span className={st.pats}>
          ♥ {adj.pats}/{ADJ_PATS}
        </span>
        <button className={st.change} onClick={change}>
          👗 {t('adj.change')}
        </button>
      </div>
    </div>
  );
}

/** Выбор адъютанта и наряда. */
function AdjPicker({ onDone }: { onDone: () => void }) {
  const s = useGameState();
  const now = useGame.getState().now();
  const cur = adjutantState({ s, now });
  const [hero, setHero] = useState(cur?.hero ?? Object.keys(s.heroines)[0]);
  const skins = adjutantSkins(s, hero);
  const set = async (skin?: string) => {
    const r = await useGame.getState().act('adj.set', { hero, skin: skin ?? null });
    if (r.ok) {
      haptic.success();
      onDone();
    }
  };
  return (
    <div className={css.col}>
      <div className={st.pickRow}>
        {Object.keys(s.heroines).map((id) => (
          <button key={id} className={cx(st.pickHero, id === hero && st.pickOn)} onClick={() => setHero(id)}>
            <HeroImg id={id} skin={s.heroines[id]?.skin} still unarmed className="pixel" width={56} height={56} />
            <span>{tl(HEROINE_MAP[id].name)}</span>
          </button>
        ))}
      </div>
      <div className={css.tiny}>{t('adj.outfit')}</div>
      <div className={st.pickGrid}>
        {[undefined, ...skins].map((sk) => (
          <button key={sk ?? 'base'} className={cx(st.pickSkin, cur?.hero === hero && cur?.skin === sk && st.pickOn)} onClick={() => void set(sk)}>
            <HeroImg id={hero} skin={sk} still unarmed className="pixel" width={72} height={72} />
            <span>{sk ? tl(SKIN_MAP[sk].name) : t('adj.base')}</span>
          </button>
        ))}
      </div>
      <div className={css.tiny} style={{ lineHeight: 1.4 }}>
        {t('adj.hint', { n: ADJ_PATS, b: ADJ_PAT_BOND })}
      </div>
    </div>
  );
}
