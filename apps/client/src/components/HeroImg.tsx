import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { frameKey, lifeFrame, newLife, type LifeFrame } from '../art/anim';
import { heroUrl } from '../art/runtime';

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
export function HeroImg({ id, skin, still, alt = '', ...rest }: Props) {
  const [frame, setFrame] = useState<LifeFrame | null>(null);
  useEffect(() => {
    setFrame(null);
    if (still || reducedMotion) return;
    const life = newLife(performance.now(), true);
    let key = 'idle:open';
    return subscribe((now) => {
      const f = lifeFrame(life, now);
      const k = frameKey(f);
      if (k === key) return;
      key = k;
      setFrame(k === 'idle:open' ? null : f);
    });
  }, [id, skin, still]);
  return <img {...rest} alt={alt} src={heroUrl(id, skin, frame ?? {})} draggable={false} />;
}
