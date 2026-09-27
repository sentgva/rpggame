import {
  BOND_HEROES,
  PHOTO_ALBUM_MAX,
  PHOTO_BOND_PER_STAR,
  PHOTO_CRYSTALS,
  PHOTO_DAILY,
  PHOTO_FACES,
  PHOTO_LOCS,
  PHOTO_POSES,
  SKIN_MAP,
  photoScore,
  type PhotoFace,
  type PhotoLoc,
  type PhotoPose,
  type PhotoTiming,
} from '../../content';
import type { PhotoState } from '../../types';
import type { Action } from '../apply';
import { assert, give, track, vInt, vOneOf, vStr, type Ctx } from '../core';
import { dayKey } from '../state';
import { bondGain, bondState } from './bond';

/** Фотосессия с дневным сбросом счётчика кадров. */
export function photoState(ctx: Pick<Ctx, 's' | 'now'>): PhotoState {
  const today = dayKey(ctx.now);
  const p = ctx.s.photo ?? { day: today, shots: 0, album: [], known: {}, best: 0 };
  return p.day === today ? p : { ...p, day: today, shots: 0 };
}

function copy(p: PhotoState): PhotoState {
  return { ...p, album: [...p.album], known: Object.fromEntries(Object.entries(p.known).map(([k, v]) => [k, { ...v }])) };
}

const LOC_IDS = PHOTO_LOCS.map((l) => l.id);
const POSE_IDS = PHOTO_POSES.map((x) => x.id);
const FACE_IDS = PHOTO_FACES.map((x) => x.id);

export const photoActions = {
  /**
   * Снимок: героиня (своя), облик (свой, её), место, поза, выражение и попадание затвора.
   * Первые кадры дня дают кристаллы и близость (UR-героини); каждый кадр ложится в альбом.
   */
  'photo.shoot': (ctx: Ctx, a: Action) => {
    const hero = vStr(a.hero, 'hero');
    assert(ctx.s.heroines[hero], 'notOwned');
    let skin: string | undefined;
    if (a.skin !== undefined && a.skin !== null && a.skin !== '') {
      skin = vStr(a.skin, 'skin');
      assert(SKIN_MAP[skin]?.hero === hero, 'badParam', { name: 'skin' });
      assert(ctx.s.skins.includes(skin), 'notOwned');
    }
    const loc = vOneOf<PhotoLoc>(a.loc, LOC_IDS, 'loc');
    const pose = vOneOf<PhotoPose>(a.pose, POSE_IDS, 'pose');
    const face = vOneOf<PhotoFace>(a.face, FACE_IDS, 'face');
    const timing = vOneOf<PhotoTiming>(a.timing, ['perfect', 'good', 'miss'], 'timing');
    const { stars, match } = photoScore(hero, { loc, pose, face, skin, timing });

    const p = copy(photoState(ctx));
    const rewarded = p.shots < PHOTO_DAILY;
    const reward: { cur: Record<string, number>; bond: ReturnType<typeof bondGain> | null } = { cur: {}, bond: null };
    if (rewarded) {
      p.shots++;
      const crystals = PHOTO_CRYSTALS[stars];
      if (crystals) {
        give(ctx, { crystals });
        reward.cur.crystals = crystals;
      }
      if (BOND_HEROES.includes(hero)) reward.bond = bondGain(ctx, hero, { ...bondState(ctx, hero) }, stars * PHOTO_BOND_PER_STAR);
    }
    // угаданное запоминаем — в выборе появится ♥
    const k = { ...(p.known[hero] ?? {}) };
    if (match.loc) k.loc = loc;
    if (match.pose) k.pose = pose;
    if (match.face) k.face = face;
    p.known[hero] = k;
    const entry = { hero, ...(skin ? { skin } : {}), loc, pose, face, stars, at: ctx.now };
    p.album = [entry, ...p.album].slice(0, PHOTO_ALBUM_MAX);
    p.best = Math.max(p.best, stars);
    ctx.s.photo = p;
    track(ctx, 'photoShot', 1);
    return { stars, match, rewarded, reward, entry, shotsLeft: Math.max(0, PHOTO_DAILY - p.shots) };
  },

  /** Убрать кадр из альбома. */
  'photo.delete': (ctx: Ctx, a: Action) => {
    const p = copy(photoState(ctx));
    const i = vInt(a.index, 0, p.album.length - 1, 'index');
    p.album.splice(i, 1);
    ctx.s.photo = p;
    return { album: p.album.length };
  },
};
