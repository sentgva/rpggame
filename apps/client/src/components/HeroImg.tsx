import { ELEMENT_COLORS, ENEMY_MAP, HEROINE_MAP } from '@idle/shared';
import { useEffect, useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { frameKey, lifeFrame, newLife, type LifeFrame } from '../art/anim';
import { enemyUrl, heroUrl } from '../art/runtime';

// один общий таймер на все «живые» портреты
const subs = new Set<(now: number) => void>();
let timer = 0;
const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function subscribe(fn: (now: number) => void) {
  subs.add(fn);
  if (!timer)
    timer = window.setInterval(() => {
      if (document.hidden) return;
      const now = performance.now();
      for (const f of subs) f(now);
    }, 60);
  return () => {
    subs.delete(fn);
    if (!subs.size) {
      clearInterval(timer);
      timer = 0;
    }
  };
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  id: string;
  skin?: string;
  /** без анимации (например, неоткрытая героиня) */
  still?: boolean;
};

/** Героиня, которая дышит, моргает и иногда подмигивает. */
export function HeroImg({ id, skin, still, alt = '', style, ...rest }: Props) {
  const [frame, setFrame] = useState<LifeFrame | null>(null);
  const herald = !!HEROINE_MAP[id]?.herald;
  useEffect(() => {
    setFrame(null);
    if (still || reducedMotion) return;
    const life = newLife(performance.now(), true, herald);
    let key = 'idle:open';
    return subscribe((now) => {
      const f = lifeFrame(life, now);
      const k = frameKey(f);
      if (k === key) return;
      key = k;
      setFrame(k === 'idle:open' ? null : f);
    });
  }, [id, skin, still, herald]);
  // Вестницы светятся цветом своей стихии
  const st: CSSProperties | undefined = herald && !still
    ? {
        ...style,
        ['--aura' as string]: ELEMENT_COLORS[HEROINE_MAP[id].element],
        animation: [style?.animation, 'herald-aura 1.4s ease-in-out infinite alternate'].filter(Boolean).join(', '),
      }
    : style;
  return <img {...rest} style={st} alt={alt} src={heroUrl(id, skin, frame ?? {})} draggable={false} />;
}

/** Враг с «живой» анимацией; Колоссы машут крыльями/хвостом и светятся своей стихией. */
export function EnemyImg({ id, alt = '', style, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { id: string }) {
  const [frame, setFrame] = useState<LifeFrame | null>(null);
  const def = ENEMY_MAP[id];
  const special = !!def?.colossus;
  useEffect(() => {
    setFrame(null);
    if (reducedMotion) return;
    const life = newLife(performance.now(), false, special);
    let key = 'idle:open';
    return subscribe((now) => {
      const f = lifeFrame(life, now);
      const k = frameKey(f);
      if (k === key) return;
      key = k;
      setFrame(k === 'idle:open' ? null : f);
    });
  }, [id, special]);
  const st: CSSProperties | undefined = special
    ? { ...style, ['--aura' as string]: ELEMENT_COLORS[def.element], animation: [style?.animation, 'herald-aura 1.4s ease-in-out infinite alternate'].filter(Boolean).join(', ') }
    : style;
  return <img {...rest} style={st} alt={alt} src={enemyUrl(id, frame ?? {})} draggable={false} />;
}
