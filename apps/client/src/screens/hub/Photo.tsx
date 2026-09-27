import {
  BOND_HEROES,
  HEROINE_MAP,
  HERO_RARITY_COLORS,
  PHOTO_BOND_PER_STAR,
  PHOTO_CRYSTALS,
  PHOTO_DAILY,
  PHOTO_FACES,
  PHOTO_LINES,
  PHOTO_LOCS,
  PHOTO_POSES,
  SKIN_MAP,
  photoOutfitFits,
  photoPersonality,
  photoState,
  type PhotoEntry,
  type PhotoFace,
  type PhotoLoc,
  type PhotoMatch,
  type PhotoPose,
  type PhotoTiming,
} from '@idle/shared';
import { useEffect, useRef, useState } from 'react';
import type { Eyes } from '../../art/figure';
import { sceneUrl, type SceneBg } from '../../art/scenes';
import { HeroImg } from '../../components/HeroImg';
import { Button, Icon, Panel, Tabs, confirmDialog, css, cx, openSheet } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame, useGameState } from '../../store/game';
import { haptic } from '../../tg/telegram';
import { BackHeader, RewardList } from '../common';
import st from './Photo.module.css';

const RARITY_RANK: Record<string, number> = { UR: 0, SSR: 1, SR: 2, R: 3 };
const LOC_BG: Record<PhotoLoc, SceneBg> = { beach: 'beach', sunset: 'sunset', onsen: 'spa', sakura: 'sakura', stars: 'night', camp: 'camp' };
const FACE_EYES: Record<PhotoFace, Eyes> = { smile: 'open', wink: 'wink', sultry: 'half', dreamy: 'closed' };
type Framing = 'full' | 'half' | 'close';
const ZOOM: Record<Framing, { scale: number; origin: string }> = {
  full: { scale: 1, origin: '50% 50%' },
  half: { scale: 1.6, origin: '50% 30%' },
  close: { scale: 2.4, origin: '50% 24%' },
};

interface Shot {
  hero: string;
  skin?: string;
  loc: PhotoLoc;
  pose: PhotoPose;
  face: PhotoFace;
}

/** Кадр: фон места и героиня в позе; framing — общий план, по пояс или крупно. */
function PhotoFrame({ shot, framing = 'full', live = false, className }: { shot: Shot; framing?: Framing; live?: boolean; className?: string }) {
  const z = ZOOM[framing];
  return (
    <div className={cx(st.frame, className)}>
      <div className={st.zoom} style={{ backgroundImage: `url(${sceneUrl(LOC_BG[shot.loc])})`, transform: `scale(${z.scale})`, transformOrigin: z.origin }}>
        <HeroImg id={shot.hero} skin={shot.skin} unarmed still={!live} arms={shot.pose} eyes={FACE_EYES[shot.face]} className={cx('pixel', st.model)} />
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className={st.stars}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? st.starOn : st.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Затвор: стрелка бегает по шкале — жми, когда она в центре. */
function Shutter({ onShot }: { onShot: (timing: PhotoTiming) => void }) {
  const needle = useRef<HTMLDivElement>(null);
  const pos = useRef(0.5);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      // полный проход ~1,1 с, чуть неровно — чтобы не ловилось по счёту
      const k = (now - t0) / 350;
      pos.current = (Math.sin(k) * 0.92 + Math.sin(k * 2.3) * 0.08 + 1) / 2;
      if (needle.current) needle.current.style.left = `${pos.current * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const shoot = () => {
    const d = Math.abs(pos.current - 0.5);
    onShot(d <= 0.07 ? 'perfect' : d <= 0.2 ? 'good' : 'miss');
  };
  return (
    <div className={st.shutter}>
      <div className={st.bar}>
        <div className={st.good} />
        <div className={st.perfect} />
        <div ref={needle} className={st.needle} />
      </div>
      <Button block size="big" onClick={shoot}>
        📸 {t('photo.snap')}
      </Button>
    </div>
  );
}

function Chip({ on, loved, onClick, children }: { on: boolean; loved?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={cx(css.chip, on && css.chipOn)} onClick={onClick}>
      {children}
      {loved && <span className={st.love}>♥</span>}
    </button>
  );
}

/** Карточка-полароид с подписью и звёздами. */
function Polaroid({ e, big }: { e: PhotoEntry; big?: boolean }) {
  const loc = PHOTO_LOCS.find((l) => l.id === e.loc);
  return (
    <div className={cx(st.polaroid, big && st.polaroidBig)}>
      <PhotoFrame shot={{ hero: e.hero, skin: e.skin, loc: e.loc as PhotoLoc, pose: e.pose as PhotoPose, face: e.face as PhotoFace }} live={big} />
      <div className={st.caption}>
        <span>
          {tl(HEROINE_MAP[e.hero].name)}
          {big && loc ? ` · ${loc.icon} ${tl(loc.name)}` : ''}
        </span>
        <Stars n={e.stars} />
      </div>
    </div>
  );
}

function Feedback({ match }: { match: PhotoMatch }) {
  const rows: [keyof PhotoMatch, string][] = [
    ['loc', 'photo.fbLoc'],
    ['pose', 'photo.fbPose'],
    ['face', 'photo.fbFace'],
    ['outfit', 'photo.fbOutfit'],
  ];
  return (
    <div className={st.feedback}>
      {rows.map(([k, key]) => (
        <div key={k} className={cx(st.fbRow, match[k] ? st.fbYes : st.fbNo)}>
          <span>{match[k] ? '♥' : '·'}</span>
          {t(`${key}${match[k] ? 'Yes' : 'No'}`)}
        </div>
      ))}
    </div>
  );
}

export function Photo() {
  const s = useGameState();
  const now = useGame.getState().now();
  const p = photoState({ s, now });
  const owned = Object.keys(s.heroines)
    .map((id) => HEROINE_MAP[id])
    .filter(Boolean)
    .sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity] || a.id.localeCompare(b.id));
  const [tab, setTab] = useState<'shoot' | 'album'>('shoot');
  const [hero, setHero] = useState(() => owned.find((h) => BOND_HEROES.includes(h.id))?.id ?? owned[0]?.id ?? 'lira');
  const [skin, setSkin] = useState<string | undefined>(() => s.heroines[hero]?.skin);
  const [loc, setLoc] = useState<PhotoLoc>('beach');
  const [pose, setPose] = useState<PhotoPose>('hips');
  const [face, setFace] = useState<PhotoFace>('smile');
  const [framing, setFraming] = useState<Framing>('full');
  const [shooting, setShooting] = useState(false);
  const [flash, setFlash] = useState(0);

  const skins = s.skins.filter((k) => SKIN_MAP[k]?.hero === hero);
  const known = p.known[hero] ?? {};
  const shot: Shot = { hero, skin, loc, pose, face };
  const left = Math.max(0, PHOTO_DAILY - p.shots);

  const pickHero = (id: string) => {
    haptic.select();
    setHero(id);
    setSkin(s.heroines[id]?.skin);
  };

  const onShot = async (timing: PhotoTiming) => {
    setShooting(false);
    setFlash(Date.now());
    haptic.success();
    const r = await useGame.getState().act('photo.shoot', { ...shot, timing });
    if (!r.ok) return;
    const res = r.result as {
      stars: number;
      match: PhotoMatch;
      rewarded: boolean;
      reward: { cur: Record<string, number>; bond: { xp: number } | null };
      entry: PhotoEntry;
      shotsLeft: number;
    };
    const line = PHOTO_LINES[photoPersonality(hero)][res.stars >= 4 ? 0 : res.stars >= 2 ? 1 : 2];
    openSheet(t('photo.result'), () => (
      <div className={css.col}>
        <Polaroid e={res.entry} big />
        {timing === 'miss' && <div className={css.tiny} style={{ color: 'var(--bad)' }}>{t('photo.blurred')}</div>}
        {timing === 'perfect' && <div className={css.tiny} style={{ color: 'var(--good)' }}>{t('photo.perfect')}</div>}
        <div className={st.line}>
          <b>{tl(HEROINE_MAP[hero].name)}:</b> {tl(line)}
        </div>
        <Feedback match={res.match} />
        {res.rewarded ? (
          <div className={css.col} style={{ alignItems: 'center' }}>
            {Object.keys(res.reward.cur).length > 0 && <RewardList r={{ cur: res.reward.cur }} />}
            {res.reward.bond && <div className={st.bond}>♥ +{res.reward.bond.xp} {t('photo.bondXp')}</div>}
          </div>
        ) : (
          <div className={css.tiny}>{t('photo.noReward')}</div>
        )}
      </div>
    ));
  };

  if (!owned.length) return null;
  return (
    <div className={css.col}>
      <BackHeader title={t('photo.title')} right={<span className={css.tiny}>{t('photo.left', { n: left, max: PHOTO_DAILY })}</span>} />
      <Tabs<'shoot' | 'album'> value={tab} onChange={setTab} items={[{ id: 'shoot', label: t('photo.tabShoot') }, { id: 'album', label: `${t('photo.tabAlbum')} ${p.album.length}` }]} />
      {tab === 'shoot' ? (
        <>
          <div className={st.stageWrap}>
            <PhotoFrame shot={shot} framing={framing} live className={st.stage} />
            <div className={st.viewfinder} />
            {flash > 0 && <div key={flash} className={st.flash} />}
            {shooting && <Shutter onShot={(timing) => void onShot(timing)} />}
          </div>
          {!shooting && (
            <Button block size="big" onClick={() => setShooting(true)}>
              <Icon name="camera" size={22} /> {t('photo.shoot')}
            </Button>
          )}
          <div className={css.tiny}>{t('photo.hint', { n: PHOTO_DAILY, c: PHOTO_CRYSTALS[5], b: PHOTO_BOND_PER_STAR * 5 })}</div>

          <Panel title={t('photo.model')}>
            <div className={st.heroes}>
              {owned.map((h) => (
                <button key={h.id} className={cx(st.heroBtn, h.id === hero && st.heroOn)} style={{ borderColor: HERO_RARITY_COLORS[h.rarity] }} onClick={() => pickHero(h.id)}>
                  <HeroImg id={h.id} skin={s.heroines[h.id]?.skin} still unarmed className="pixel" width={44} height={44} />
                </button>
              ))}
            </div>
            <div className={st.label}>{t('photo.outfit')}</div>
            <div className={st.chips}>
              <Chip on={!skin} loved={false} onClick={() => setSkin(undefined)}>
                {t('photo.baseOutfit')}
                {photoOutfitFits(loc, undefined) && <span className={st.fit}>✦</span>}
              </Chip>
              {skins.map((k) => (
                <Chip key={k} on={skin === k} onClick={() => setSkin(k)}>
                  {tl(SKIN_MAP[k].name)}
                  {photoOutfitFits(loc, k) && <span className={st.fit}>✦</span>}
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel title={t('photo.scene')}>
            <div className={st.label}>{t('photo.place')}</div>
            <div className={st.chips}>
              {PHOTO_LOCS.map((l) => (
                <Chip key={l.id} on={loc === l.id} loved={known.loc === l.id} onClick={() => setLoc(l.id)}>
                  {l.icon} {tl(l.name)}
                </Chip>
              ))}
            </div>
            <div className={st.label}>{t('photo.pose')}</div>
            <div className={st.chips}>
              {PHOTO_POSES.map((x) => (
                <Chip key={x.id} on={pose === x.id} loved={known.pose === x.id} onClick={() => setPose(x.id)}>
                  {tl(x.name)}
                </Chip>
              ))}
            </div>
            <div className={st.label}>{t('photo.face')}</div>
            <div className={st.chips}>
              {PHOTO_FACES.map((x) => (
                <Chip key={x.id} on={face === x.id} loved={known.face === x.id} onClick={() => setFace(x.id)}>
                  {x.icon} {tl(x.name)}
                </Chip>
              ))}
            </div>
            <div className={st.label}>{t('photo.framing')}</div>
            <div className={st.chips}>
              {(['full', 'half', 'close'] as Framing[]).map((f) => (
                <Chip key={f} on={framing === f} onClick={() => setFraming(f)}>
                  {t(`photo.frame.${f}`)}
                </Chip>
              ))}
            </div>
            <div className={css.tiny} style={{ marginTop: 8 }}>
              {t('photo.legend')}
            </div>
          </Panel>
        </>
      ) : p.album.length === 0 ? (
        <Panel>
          <div className={css.tiny}>{t('photo.empty')}</div>
        </Panel>
      ) : (
        <div className={st.album}>
          {p.album.map((e, i) => (
            <button
              key={`${e.at}-${i}`}
              className={st.albumItem}
              onClick={() =>
                openSheet(t('photo.tabAlbum'), (close) => (
                  <div className={css.col}>
                    <Polaroid e={e} big />
                    <Button
                      kind="danger"
                      onClick={() =>
                        confirmDialog(t('photo.deleteAsk'), async () => {
                          const r = await useGame.getState().act('photo.delete', { index: i });
                          if (r.ok) close();
                        })
                      }
                    >
                      {t('photo.delete')}
                    </Button>
                  </div>
                ))
              }
            >
              <Polaroid e={e} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
