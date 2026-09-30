import type { L10n } from '../types';
import { bondTraits, type Personality } from './bond';
import { HEROINE_MAP, SKIN_MAP, type SkinSet } from './heroines';

/**
 * «Фотосессия» (по мотивам гравюр DOAX Venus Vacation и «воспоминаний» Azur Lane): выбираешь героиню, наряд,
 * место, позу и выражение, ловишь момент затвора. У каждой героини свои любимые место, поза и выражение —
 * их надо угадать; наряд, подходящий месту, — ещё звезда. Лучшие кадры остаются в альбоме.
 */
const L = (ru: string, en: string): L10n => ({ ru, en });

export type PhotoLoc = 'beach' | 'sunset' | 'onsen' | 'sakura' | 'stars' | 'camp';
export type PhotoPose = 'relaxed' | 'hips' | 'behindHead' | 'victory' | 'wave' | 'crossed' | 'shy' | 'kiss';
export type PhotoFace = 'smile' | 'wink' | 'sultry' | 'dreamy';
export type PhotoTiming = 'perfect' | 'good' | 'miss';

export const PHOTO_LOCS: { id: PhotoLoc; icon: string; name: L10n; sets: (SkinSet | 'base')[] }[] = [
  { id: 'beach', icon: '🏖️', name: L('Пляж', 'Beach'), sets: ['summer'] },
  { id: 'sunset', icon: '🌅', name: L('Закат у моря', 'Seaside sunset'), sets: ['summer', 'masquerade'] },
  { id: 'onsen', icon: '♨️', name: L('Горячие источники', 'Hot springs'), sets: ['summer', 'bond'] },
  { id: 'sakura', icon: '🌸', name: L('Сакура', 'Sakura'), sets: ['bond', 'masquerade'] },
  { id: 'stars', icon: '🌌', name: L('Звёздная ночь', 'Starry night'), sets: ['lingerie', 'masquerade'] },
  { id: 'camp', icon: '🔥', name: L('Лагерь', 'Camp'), sets: ['base'] },
];

export const PHOTO_POSES: { id: PhotoPose; name: L10n }[] = [
  { id: 'relaxed', name: L('Естественно', 'Natural') },
  { id: 'hips', name: L('Руки на бёдрах', 'Hands on hips') },
  { id: 'behindHead', name: L('Руки за головой', 'Hands behind head') },
  { id: 'victory', name: L('Победа', 'Victory') },
  { id: 'wave', name: L('Привет!', 'Hi there!') },
  { id: 'crossed', name: L('Руки скрещены', 'Arms crossed') },
  { id: 'shy', name: L('Смущение', 'Bashful') },
  { id: 'kiss', name: L('Воздушный поцелуй', 'Blown kiss') },
];

export const PHOTO_FACES: { id: PhotoFace; icon: string; name: L10n }[] = [
  { id: 'smile', icon: '😊', name: L('Улыбка', 'Smile') },
  { id: 'wink', icon: '😉', name: L('Подмигнуть', 'Wink') },
  { id: 'sultry', icon: '😏', name: L('Томный взгляд', 'Sultry look') },
  { id: 'dreamy', icon: '😌', name: L('Мечтательно', 'Dreamy') },
];

/** Кадров с наградой в день, размер альбома. */
export const PHOTO_DAILY = 3;
export const PHOTO_ALBUM_MAX = 24;
/** Награда за кадр по звёздам (кристаллы) и близость (для UR-героинь — за звезду). */
export const PHOTO_CRYSTALS = [0, 5, 10, 15, 25, 40];
export const PHOTO_BOND_PER_STAR = 6;

const LOC_IDS = PHOTO_LOCS.map((l) => l.id);
/** Любимое место по месту свиданий: у каждой героини с характером — своё. */
const LOC_BY_PLACE: Record<string, PhotoLoc> = { lake: 'beach', garden: 'sakura', tower: 'stars', tavern: 'camp', fair: 'sunset' };
/** Позы и выражения по характеру: из двух — по героине. */
const POSE_BY_P: Record<Personality, [PhotoPose, PhotoPose]> = {
  proud: ['hips', 'crossed'],
  playful: ['kiss', 'wave'],
  gentle: ['relaxed', 'wave'],
  mysterious: ['behindHead', 'crossed'],
  fierce: ['victory', 'hips'],
  shy: ['shy', 'relaxed'],
  gallant: ['hips', 'victory'],
  aloof: ['crossed', 'relaxed'],
};
const FACE_BY_P: Record<Personality, [PhotoFace, PhotoFace]> = {
  proud: ['sultry', 'smile'],
  playful: ['wink', 'smile'],
  gentle: ['smile', 'dreamy'],
  mysterious: ['sultry', 'dreamy'],
  fierce: ['smile', 'wink'],
  shy: ['dreamy', 'smile'],
  gallant: ['smile', 'wink'],
  aloof: ['dreamy', 'sultry'],
};
const PERSONALITIES: Personality[] = ['proud', 'playful', 'gentle', 'mysterious', 'fierce', 'shy'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Характер героини для фотосессии — тот же, что в «Уходе». */
export function photoPersonality(hero: string): Personality {
  if (HEROINE_MAP[hero]) return bondTraits(hero).p;
  return PERSONALITIES[hash(hero) % PERSONALITIES.length];
}

/** Что героиня любит в кадре: место, позу, выражение. */
export function photoTaste(hero: string): { loc: PhotoLoc; pose: PhotoPose; face: PhotoFace } {
  const p = photoPersonality(hero);
  const h = hash(hero + ':photo');
  const place = HEROINE_MAP[hero] ? bondTraits(hero).place : undefined;
  const loc = (place && LOC_BY_PLACE[place]) || LOC_IDS[h % LOC_IDS.length];
  return { loc, pose: POSE_BY_P[p][(h >> 3) & 1], face: FACE_BY_P[p][(h >> 5) & 1] };
}

/** Подходит ли наряд месту (облик из нужной коллекции, для лагеря — обычный наряд). */
export function photoOutfitFits(loc: PhotoLoc, skin?: string): boolean {
  const sets = PHOTO_LOCS.find((l) => l.id === loc)?.sets ?? [];
  if (!skin) return sets.includes('base');
  const set = SKIN_MAP[skin]?.set;
  return !!set && sets.includes(set);
}

export interface PhotoMatch {
  loc: boolean;
  pose: boolean;
  face: boolean;
  outfit: boolean;
}

/** Оценка кадра: 1 звезда за снимок, по звезде за любимые место, позу, выражение и подходящий наряд; смазанный кадр — минус звезда. */
export function photoScore(hero: string, shot: { loc: PhotoLoc; pose: PhotoPose; face: PhotoFace; skin?: string; timing: PhotoTiming }): { stars: number; match: PhotoMatch } {
  const t = photoTaste(hero);
  const match: PhotoMatch = { loc: shot.loc === t.loc, pose: shot.pose === t.pose, face: shot.face === t.face, outfit: photoOutfitFits(shot.loc, shot.skin) };
  let stars = 1 + Number(match.loc) + Number(match.pose) + Number(match.face) + Number(match.outfit);
  if (shot.timing === 'miss') stars -= 1;
  return { stars: Math.max(1, Math.min(5, stars)), match };
}

/** Реплика героини после кадра: по характеру и оценке (0 — хорошо, 1 — средне, 2 — плохо). */
export const PHOTO_LINES: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('Разумеется, я неотразима. Распечатай в полный рост.', 'Of course I\'m stunning. Print it life-size.'), L('Сойдёт. Но мой лучший ракурс ты ещё не нашёл.', 'It\'ll do. You haven\'t found my best angle yet.'), L('И это всё, на что способен твой фотоаппарат?', 'Is that all your camera can do?')],
  playful: [L('Ух ты! Я тут такая милашка — хочу копию!', 'Wow! I look so cute — I want a copy!'), L('Хи-хи, давай ещё разок, я придумала позу!', 'Hehe, one more, I thought of a pose!'), L('Бу-у, я моргнула! Переснимай!', 'Boo, I blinked! Retake!')],
  gentle: [L('Ой… это правда я? Как красиво…', 'Oh… is that really me? So pretty…'), L('Мне нравится. Спасибо, что так стараешься.', 'I like it. Thank you for trying so hard.'), L('Ничего, в следующий раз получится.', 'It\'s fine, next time will be better.')],
  mysterious: [L('Ты поймал то, что я обычно прячу. Интересно…', 'You caught what I usually hide. Interesting…'), L('Неплохо. Но тайну ты ещё не разгадал.', 'Not bad. But you haven\'t solved the mystery.'), L('На этом кадре меня нет. Только тень.', 'I\'m not in this shot. Only a shadow.')],
  fierce: [L('Ха! Вот это кадр! Повешу в оружейной!', 'Ha! What a shot! I\'m hanging it in the armory!'), L('Нормально. Но я могу круче!', 'Fine. But I can do cooler!'), L('Эй! Я же двигалась, как ты снимал?!', 'Hey! I was moving, how did you shoot?!')],
  shy: [L('Я… правда так выгляжу? Н-не показывай никому…', 'I… really look like that? D-don\'t show anyone…'), L('Можно… можно ещё один? Я постараюсь.', 'Can… can we do one more? I\'ll try.'), L('Я опять зажмурилась… прости…', 'I closed my eyes again… sorry…')],
  gallant: [L('Разумеется, я фотогеничен. Повесь в казарме — для боевого духа.', "Of course I'm photogenic. Hang it in the barracks — for morale."), L('Неплохо. Но свет падал не на ту сторону лица.', 'Not bad. But the light hit the wrong side of my face.'), L('Командор, ты снял мой щит, а не меня.', 'Commander, you photographed my shield, not me.')],
  aloof: [L('…Хороший кадр. Не показывай другим эльфам.', "…A good shot. Don't show it to other elves."), L('Сойдёт. Ветер растрепал волосы.', "It'll do. The wind messed up my hair."), L('Я отвернулся. Специально.', 'I turned away. On purpose.')],
};

/** Реакции на касание в «Уходе»: по голове — довольна, остальное — смущается. */
export const TOUCH_LINES: Record<Personality, { head: L10n[]; body: L10n[] }> = {
  proud: { head: [L('Хм… можешь продолжать. Разрешаю.', 'Hm… you may continue. I allow it.'), L('Только никому не говори, что мне это нравится.', 'Just don\'t tell anyone I like this.')], body: [L('Командор! Что за вольности?!', 'Commander! What liberties are these?!'), L('Ещё раз — и будешь стоять в карауле неделю.', 'Once more and you\'re on guard duty for a week.')] },
  playful: { head: [L('Хи-хи, ещё! Ещё!', 'Hehe, more! More!'), L('Гладишь как котёнка. Мур!', 'You pet me like a kitten. Purr!')], body: [L('Ай! Щекотно же! Сейчас отомщу!', 'Eek! That tickles! I\'ll get you back!'), L('Попался! Теперь ты мне должен свидание~', 'Gotcha! Now you owe me a date~')] },
  gentle: { head: [L('Так тепло… спасибо.', 'So warm… thank you.'), L('Ты всегда знаешь, как меня успокоить.', 'You always know how to calm me down.')], body: [L('Ой! Командор, ты меня смутил…', 'Oh! Commander, you\'ve made me blush…'), L('Н-не здесь же… все смотрят.', 'N-not here… everyone\'s watching.')] },
  mysterious: { head: [L('Любопытный жест. Я запомню.', 'A curious gesture. I\'ll remember it.'), L('Твои руки теплее, чем я думала.', 'Your hands are warmer than I thought.')], body: [L('Осторожнее. Я кусаюсь.', 'Careful. I bite.'), L('Ты играешь с огнём, Командор.', 'You\'re playing with fire, Commander.')] },
  fierce: { head: [L('Эй! Я не ребёнок! …Ладно, ещё чуть-чуть.', 'Hey! I\'m not a kid! …Fine, a little more.'), L('Хорошо. Но это между нами!', 'Good. But this stays between us!')], body: [L('Ха! Хочешь спарринг? Держись!', 'Ha! Want to spar? Brace yourself!'), L('Руки! Ну держись у меня!', 'Hands off! Just you wait!')] },
  shy: { head: [L('У-ум… мне приятно…', 'U-um… that\'s nice…'), L('Можно… можно ещё?', 'Could… could you do it again?')], body: [L('Кья! К-Командор!..', 'Kya! C-Commander!..'), L('Я… я сейчас сгорю от стыда…', 'I… I\'m going to melt from embarrassment…')] },
  gallant: { head: [L('Ты растрепал мне волосы… Ладно. Тебе можно.', "You messed up my hair… Fine. You're allowed."), L('Рыцаря по голове не гладят. …Но продолжай.', 'One does not pat a knight on the head. …But go on.')], body: [L('Эй, это что, проверка на щекотку?', 'Hey, is this a tickle test?'), L('Командор, без лат я беззащитен — пользуешься?', "Commander, I'm defenceless without my armour — taking advantage?")] },
  aloof: { head: [L('…Уши не трогай. Остальное — можно.', "…Don't touch the ears. The rest — fine."), L('Эльфы так не делают. Но ты не эльф.', "Elves don't do that. But you're not an elf.")], body: [L('Ещё раз — и проснёшься привязанным к дереву.', "Once more and you'll wake up tied to a tree."), L('Щекотно. Прекрати, человек.', 'That tickles. Stop it, human.')] },
};
