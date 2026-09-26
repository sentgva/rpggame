import type { L10n } from '../types';
import { HEROINES, HEROINE_MAP, SKINS, SKIN_MAP, type Look, type SkinDef, type Wear } from './heroines';

/**
 * «Уход» за UR-героинями: близость 0–10. Разговоры, угощения, горячие источники и свидания.
 * Каждая ступень близости усиливает героиню; на пиках — награды, на 10-й — особый наряд (за Сердца Эфира).
 */
export type Personality = 'proud' | 'playful' | 'gentle' | 'mysterious' | 'fierce' | 'shy';
export type Treat = 'cake' | 'fruit' | 'wine' | 'roast' | 'sweets';
export type Place = 'fair' | 'tower' | 'lake' | 'tavern' | 'garden';

const L = (ru: string, en: string): L10n => ({ ru, en });

export const PERSONALITY_NAMES: Record<Personality, L10n> = {
  proud: L('Гордая', 'Proud'),
  playful: L('Игривая', 'Playful'),
  gentle: L('Нежная', 'Gentle'),
  mysterious: L('Загадочная', 'Mysterious'),
  fierce: L('Пылкая', 'Fiery'),
  shy: L('Застенчивая', 'Shy'),
};

export const TREATS: { id: Treat; icon: string; name: L10n }[] = [
  { id: 'cake', icon: '🍰', name: L('Пирожное', 'Cake') },
  { id: 'fruit', icon: '🍓', name: L('Ягоды в сливках', 'Berries & cream') },
  { id: 'wine', icon: '🍷', name: L('Эльфийское вино', 'Elven wine') },
  { id: 'roast', icon: '🍖', name: L('Жаркое', 'Roast') },
  { id: 'sweets', icon: '🍬', name: L('Конфеты', 'Sweets') },
];

export const PLACES: { id: Place; icon: string; name: L10n; bg: [string, string] }[] = [
  { id: 'fair', icon: '🎪', name: L('Ярмарка', 'The fair'), bg: ['#3a1e44', '#e0806a'] },
  { id: 'tower', icon: '🌌', name: L('Звёздная башня', 'Star tower'), bg: ['#0e1030', '#5a4ab0'] },
  { id: 'lake', icon: '🌊', name: L('Берег озера', 'Lakeshore'), bg: ['#10283a', '#4aa0c0'] },
  { id: 'tavern', icon: '🍺', name: L('Таверна', 'The tavern'), bg: ['#2a140c', '#c0702a'] },
  { id: 'garden', icon: '🌸', name: L('Сад', 'The garden'), bg: ['#1e3a2a', '#e890b0'] },
];

interface Taste {
  treat: Treat;
  dislike: Treat;
  place: Place;
}
const TASTE: Record<Personality, Taste> = {
  proud: { treat: 'wine', dislike: 'sweets', place: 'tower' },
  playful: { treat: 'sweets', dislike: 'roast', place: 'fair' },
  gentle: { treat: 'cake', dislike: 'wine', place: 'garden' },
  mysterious: { treat: 'wine', dislike: 'fruit', place: 'lake' },
  fierce: { treat: 'roast', dislike: 'cake', place: 'tavern' },
  shy: { treat: 'fruit', dislike: 'wine', place: 'lake' },
};

/** Характер и вкусы UR-героинь (у каждой — свои). */
const TRAITS: Record<string, { p: Personality; treat?: Treat; place?: Place }> = {
  velvet: { p: 'mysterious' },
  isolde: { p: 'proud', treat: 'fruit' },
  lilith: { p: 'playful', treat: 'wine' },
  aurora: { p: 'gentle', place: 'lake' },
  seraphina: { p: 'gentle' },
  liora: { p: 'fierce', place: 'tower' },
  melusine: { p: 'playful', place: 'lake' },
  sylvana: { p: 'gentle', treat: 'fruit' },
  nefertari: { p: 'proud' },
  skadi: { p: 'proud', treat: 'roast' },
  thalassia: { p: 'mysterious' },
  carmilla: { p: 'playful', treat: 'wine', place: 'tower' },
  ifrita: { p: 'fierce' },
  brunhilde: { p: 'fierce', treat: 'wine' },
  aegis: { p: 'shy', place: 'garden' },
  morrigan: { p: 'mysterious', place: 'tower' },
  nyx: { p: 'shy', treat: 'sweets' },
  flamma: { p: 'fierce', place: 'fair' },
  maristella: { p: 'playful' },
  sylphide: { p: 'shy' },
  aurelia: { p: 'proud', place: 'garden' },
  nocturna: { p: 'mysterious', treat: 'sweets' },
};

export function bondTraits(hero: string): { p: Personality } & Taste {
  const t = TRAITS[hero] ?? { p: 'gentle' as Personality };
  const base = TASTE[t.p];
  return { p: t.p, treat: t.treat ?? base.treat, dislike: base.dislike === (t.treat ?? base.treat) ? 'roast' : base.dislike, place: t.place ?? base.place };
}

/** Кому доступен уход: UR-героини (включая владычиц и Вестниц). */
export const BOND_HEROES = HEROINES.filter((h) => h.rarity === 'UR').map((h) => h.id);

/** Опыт до следующего уровня близости (0→1 … 9→10). */
export const BOND_XP = [40, 60, 90, 130, 180, 240, 310, 390, 480, 600];
export const BOND_MAX = 10;
/** Бонус к здоровью, атаке и защите за каждый уровень близости. */
export const BOND_STAT = 0.02;
export const BOND_LIMITS = { talk: 3, treat: 3, spa: 1, date: 1 } as const;
export const BOND_GAIN = { talk: [14, 8, 3], treatFav: 24, treat: 12, treatBad: 4, spa: 25, dateFav: 55, date: 35 } as const;
export const BOND_DATE_LVL = 3;
export const BOND_SPA_COST = { crystals: 30 } as const;
/** Наряд близости: уровень 10 и Сердца Эфира. */
export const BOND_COSTUME_HEARTS = 10;

/** Награды пиков близости. */
export const BOND_MILESTONES: Record<number, { crystals: number; scrolls?: number; shards?: number }> = {
  3: { crystals: 50 },
  5: { crystals: 150, shards: 10 },
  7: { crystals: 300, scrolls: 2 },
  10: { crystals: 500, scrolls: 3, shards: 30 },
};

// ——— разговоры: у каждого характера свои темы; ответы — лучший, нормальный, неудачный ———

export interface Topic {
  line: L10n;
  answers: [L10n, L10n, L10n];
}

export const TOPICS: Record<Personality, Topic[]> = {
  proud: [
    { line: L('Ты заметил, как я сегодня разбила строй врага? Разумеется, заметил.', 'Did you see how I broke their line today? Of course you did.'), answers: [L('Это было великолепно. Никто бы так не смог.', 'Magnificent. No one else could have done it.'), L('Неплохо сработано.', 'Nicely done.'), L('Вроде обычный бой.', 'Seemed like a normal fight.')] },
    { line: L('Командор, корона не жмёт, пока её носит достойная.', 'Commander, a crown never pinches when worn by the worthy.'), answers: [L('Тебе она к лицу, как никому.', 'It suits you like no one else.'), L('Главное — не уронить.', 'Just don\'t drop it.'), L('Какая ещё корона?', 'What crown?')] },
    { line: L('Я не привыкла просить. Но… посиди со мной немного.', 'I am not used to asking. But… sit with me a while.'), answers: [L('Сколько захочешь.', 'As long as you like.'), L('Минутку найду.', 'I can spare a minute.'), L('Некогда, дела.', 'No time, busy.')] },
    { line: L('Говорят, я холодная. А ты как думаешь?', 'They say I am cold. What do you think?'), answers: [L('Просто ты не открываешься кому попало.', 'You just don\'t open up to anyone.'), L('Бывает и теплее.', 'You can be warmer.'), L('Ледышка, правда.', 'An icicle, honestly.')] },
  ],
  playful: [
    { line: L('Спорим, ты не угадаешь, что у меня в руке?', 'Bet you can\'t guess what\'s in my hand?'), answers: [L('Моё сердце, конечно.', 'My heart, of course.'), L('Конфета?', 'A sweet?'), L('Не до игр сейчас.', 'Not now.')] },
    { line: L('Командор, а ты умеешь танцевать? Покажи!', 'Commander, can you dance? Show me!'), answers: [L('Только если ты ведёшь.', 'Only if you lead.'), L('Чуть-чуть умею.', 'A little.'), L('Ни за что.', 'No way.')] },
    { line: L('Я спрятала твои перчатки. Найдёшь — поцелую… в щёку!', 'I hid your gloves. Find them and I\'ll kiss you… on the cheek!'), answers: [L('Тогда ищу немедленно!', 'Then I\'m searching right now!'), L('Верни, пожалуйста.', 'Give them back, please.'), L('Куплю новые.', 'I\'ll buy new ones.')] },
    { line: L('Скучно-о-о. Придумай что-нибудь весёлое!', 'Bo-o-ored. Think of something fun!'), answers: [L('Ночная вылазка за звёздами?', 'A night trip to watch the stars?'), L('Можно сыграть в кости.', 'We could play dice.'), L('Иди тренируйся.', 'Go train.')] },
  ],
  gentle: [
    { line: L('Ты сегодня устал? Давай я заварю тебе травяной чай.', 'Are you tired today? Let me brew you some herbal tea.'), answers: [L('С тобой усталость проходит сама.', 'With you, tiredness just fades.'), L('Спасибо, не откажусь.', 'Thanks, I\'d love some.'), L('Не надо.', 'No need.')] },
    { line: L('Смотри, я вырастила этот цветок сама.', 'Look, I grew this flower myself.'), answers: [L('Он прекрасен — как и та, что его вырастила.', 'It\'s beautiful — like the one who grew it.'), L('Красивый.', 'Pretty.'), L('Цветок как цветок.', 'Just a flower.')] },
    { line: L('Мне иногда страшно, что бой разлучит нас.', 'Sometimes I fear a battle will tear us apart.'), answers: [L('Я не позволю этому случиться.', 'I won\'t let that happen.'), L('Будем осторожны.', 'We\'ll be careful.'), L('Такова война.', 'That\'s war.')] },
    { line: L('Можно я просто посижу рядом и помолчу?', 'May I just sit beside you in silence?'), answers: [L('С тобой даже тишина тёплая.', 'Even silence is warm with you.'), L('Конечно.', 'Of course.'), L('Мне надо работать.', 'I need to work.')] },
  ],
  mysterious: [
    { line: L('Луна сегодня шепчет о тебе. Хочешь знать, что?', 'The moon whispers about you tonight. Want to know what?'), answers: [L('Только если ты расскажешь сама.', 'Only if you tell me yourself.'), L('Ну давай.', 'Go on.'), L('Я не верю в приметы.', 'I don\'t believe in omens.')] },
    { line: L('У каждого есть тайна. Какая у тебя?', 'Everyone has a secret. What\'s yours?'), answers: [L('Что я жду каждой встречи с тобой.', 'That I wait for every meeting with you.'), L('Боюсь высоты.', 'I\'m afraid of heights.'), L('Нет у меня тайн.', 'I have no secrets.')] },
    { line: L('Я видела во сне наш конец. Или начало.', 'I dreamt of our end. Or our beginning.'), answers: [L('Тогда пусть это будет начало.', 'Then let it be a beginning.'), L('Сны часто лгут.', 'Dreams often lie.'), L('Жуть какая.', 'Creepy.')] },
    { line: L('Не смотри так долго — утонешь.', 'Don\'t stare so long — you\'ll drown.'), answers: [L('Я бы и не против.', 'I wouldn\'t mind.'), L('Прости, задумался.', 'Sorry, lost in thought.'), L('И не смотрел.', 'Wasn\'t staring.')] },
  ],
  fierce: [
    { line: L('Спарринг? Проигравший угощает ужином!', 'Sparring? Loser buys dinner!'), answers: [L('Ужин за мной при любом исходе.', 'Dinner\'s on me either way.'), L('Давай, но полегче.', 'Sure, go easy.'), L('Мне лень.', 'Too lazy.')] },
    { line: L('Ещё бой! Я только разогрелась!', 'Another fight! I\'m just warming up!'), answers: [L('Твой огонь зажигает весь отряд.', 'Your fire ignites the whole squad.'), L('Передохни немного.', 'Take a short rest.'), L('Хватит на сегодня.', 'Enough for today.')] },
    { line: L('Не люблю ждать. Особенно тебя.', 'I hate waiting. Especially for you.'), answers: [L('Больше не заставлю.', 'I won\'t make you wait again.'), L('Прости, дела.', 'Sorry, things came up.'), L('Подождёшь.', 'You\'ll wait.')] },
    { line: L('Шрам? Ерунда. Хочешь потрогать?', 'This scar? Nothing. Want to touch it?'), answers: [L('Ты красива даже со шрамами.', 'You\'re beautiful, scars and all.'), L('Больно было?', 'Did it hurt?'), L('Фу.', 'Ew.')] },
  ],
  shy: [
    { line: L('Я… написала тебе письмо. Только не читай при мне!', 'I… wrote you a letter. Just don\'t read it in front of me!'), answers: [L('Сохраню его как сокровище.', 'I\'ll keep it like a treasure.'), L('Хорошо, прочту потом.', 'Okay, I\'ll read it later.'), L('Прочту вслух!', 'I\'ll read it out loud!')] },
    { line: L('Ты… не против, если я пойду рядом?', 'Would you… mind if I walked beside you?'), answers: [L('Я был бы счастлив.', 'I\'d be happy to.'), L('Пойдём.', 'Let\'s go.'), L('Как хочешь.', 'Whatever.')] },
    { line: L('Мне сказали, что я красиво пою. Это правда?', 'They say I sing beautifully. Is it true?'), answers: [L('Правда. Спой мне как-нибудь.', 'True. Sing for me sometime.'), L('Наверное.', 'Maybe.'), L('Не слышал.', 'Never heard.')] },
    { line: L('П-прости, я опять покраснела…', 'S-sorry, I\'m blushing again…'), answers: [L('Тебе очень идёт.', 'It suits you so much.'), L('Ничего страшного.', 'No big deal.'), L('Смешно выглядит.', 'Looks funny.')] },
  ],
};

/** Реакции на ответ: лучший, нормальный, неудачный. */
export const REACTIONS: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('…Знаешь, что сказать. Мне это нравится.', '…You know what to say. I like that.'), L('Хм. Сойдёт.', 'Hm. It\'ll do.'), L('Как невежливо.', 'How rude.')],
  playful: [L('Хи-хи! Ты лучший!', 'Hehe! You\'re the best!'), L('Ну ладно, засчитано.', 'Okay, that counts.'), L('Бу-у, зануда.', 'Boo, spoilsport.')],
  gentle: [L('Спасибо… мне так тепло.', 'Thank you… I feel so warm.'), L('Ты добрый.', 'You\'re kind.'), L('Ох… понимаю.', 'Oh… I see.')],
  mysterious: [L('Интересно… продолжай.', 'Interesting… go on.'), L('Может быть.', 'Perhaps.'), L('Как скучно.', 'How dull.')],
  fierce: [L('Ха! Вот это разговор!', 'Ha! Now that\'s talking!'), L('Ладно, принято.', 'Fine, accepted.'), L('Тьфу ты.', 'Ugh.')],
  shy: [L('Я… я так рада…', 'I… I\'m so glad…'), L('Угу…', 'Mhm…'), L('…', '…')],
};

/** Приветствие по близости: незнакомка (0–3), подруга (4–7), близкая (8–10). */
export const GREETINGS: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('Командор. Надеюсь, дело важное.', 'Commander. I hope this is important.'), L('А, это ты. Проходи.', 'Ah, it\'s you. Come in.'), L('Я ждала тебя. Не говори никому.', 'I was waiting for you. Tell no one.')],
  playful: [L('О, новенький? Поиграем?', 'Oh, a new face? Wanna play?'), L('Наконец-то! Мне было скучно!', 'Finally! I was bored!'), L('Мой любимый Командор пришёл!', 'My favourite Commander is here!')],
  gentle: [L('Здравствуйте, Командор.', 'Hello, Commander.'), L('Рада тебя видеть.', 'Glad to see you.'), L('Ты пришёл… я так скучала.', 'You came… I missed you so.')],
  mysterious: [L('Ты пришёл не случайно.', 'You didn\'t come by chance.'), L('Тени сказали, что ты придёшь.', 'The shadows said you\'d come.'), L('Без тебя даже тьма скучна.', 'Without you even darkness is dull.')],
  fierce: [L('Чего надо? Хочешь драки?', 'What? Looking for a fight?'), L('О, Командор! Размяться не хочешь?', 'Oh, Commander! Up for a workout?'), L('Иди сюда, обниму — больно не будет!', 'Come here, a hug — won\'t hurt!')],
  shy: [L('Ой… з-здравствуйте…', 'Oh… h-hello…'), L('Я рада, что ты здесь.', 'I\'m glad you\'re here.'), L('Можно… я возьму тебя за руку?', 'May I… hold your hand?')],
};

export const SPA_LINES: Record<Personality, L10n> = {
  proud: L('Горячие источники? Так уж и быть. Только не пялься… слишком долго.', 'Hot springs? Very well. Just don\'t stare… too long.'),
  playful: L('Бомбочкой! Ой, я тебя обрызгала? Ни капельки не жаль!', 'Cannonball! Oops, did I splash you? Not sorry at all!'),
  gentle: L('Вода такая тёплая… как хорошо, что ты рядом.', 'The water is so warm… I\'m glad you\'re here.'),
  mysterious: L('Пар скрывает многое. Но не всё.', 'The steam hides much. But not everything.'),
  fierce: L('Кто дольше просидит в самой горячей купели? Я!', 'Who can last longest in the hottest pool? Me!'),
  shy: L('Я в купальнике… ты только не смотри, ладно?', 'I\'m in a swimsuit… just don\'t look, okay?'),
};

export const DATE_LINES: Record<Personality, [L10n, L10n]> = {
  proud: [L('Лучшее место в Аэрисе. Ты угадал.', 'The finest place in Aeris. You guessed right.'), L('Неплохо. Хотя я бы выбрала другое.', 'Not bad. Though I\'d have picked another.')],
  playful: [L('Ура! Именно сюда я и хотела!', 'Yay! Exactly where I wanted to go!'), L('Весело! Но в следующий раз — туда, куда я скажу.', 'Fun! But next time — where I say.')],
  gentle: [L('Ты помнишь, что я люблю… это так мило.', 'You remember what I love… how sweet.'), L('С тобой хорошо где угодно.', 'Anywhere is nice with you.')],
  mysterious: [L('Ты знал, куда меня вести. Опасный человек.', 'You knew where to take me. Dangerous.'), L('Интересный выбор.', 'An interesting choice.')],
  fierce: [L('Вот это я понимаю — свидание!', 'Now THAT\'s a date!'), L('Сойдёт, но где же драка?', 'It\'ll do, but where\'s the brawl?')],
  shy: [L('Т-ты запомнил… спасибо.', 'Y-you remembered… thank you.'), L('Мне… мне понравилось.', 'I… I liked it.')],
};

export const TREAT_LINES: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('Достойный выбор. Ты меня понимаешь.', 'A worthy choice. You understand me.'), L('Спасибо.', 'Thank you.'), L('Это… не для меня.', 'That… is not for me.')],
  playful: [L('Ммм! Обожаю! Ещё!', 'Mmm! I love it! More!'), L('Вкусненько.', 'Yummy.'), L('Фе.', 'Yuck.')],
  gentle: [L('Моё любимое! Как ты узнал?', 'My favourite! How did you know?'), L('Очень вкусно, спасибо.', 'Very tasty, thank you.'), L('Я… попробую чуть-чуть.', 'I… will try a little.')],
  mysterious: [L('Ты угадал мой вкус. Опять.', 'You guessed my taste. Again.'), L('Неплохо.', 'Not bad.'), L('Нет.', 'No.')],
  fierce: [L('Вот это еда! Ещё тарелку!', 'Now that\'s food! Another plate!'), L('Сойдёт.', 'It\'ll do.'), L('Это для детей.', 'That\'s for kids.')],
  shy: [L('Моё любимое… с-спасибо…', 'My favourite… th-thank you…'), L('Вкусно.', 'Tasty.'), L('Я не очень…', 'I\'m not really…')],
};

/** Тема разговора: детерминирована днём, героиней и номером разговора — клиент и сервер видят одно и то же. */
export function bondTopic(hero: string, day: string, n: number): { topic: Topic; index: number; order: number[] } {
  const p = bondTraits(hero).p;
  let h = 2166136261;
  for (const ch of `${hero}|${day}|${n}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const list = TOPICS[p];
  const index = h % list.length;
  // порядок ответов на экране
  const orders = [
    [0, 1, 2],
    [1, 0, 2],
    [2, 0, 1],
    [1, 2, 0],
    [0, 2, 1],
    [2, 1, 0],
  ];
  return { topic: list[index], index, order: orders[(h >>> 8) % orders.length] };
}

// ——— наряды близости ———

const BOND_WEAR: Record<Personality, { wear: Wear; name: L10n }> = {
  gentle: { wear: 'yukata', name: L('Летняя юката', 'Summer yukata') },
  shy: { wear: 'yukata', name: L('Летняя юката', 'Summer yukata') },
  proud: { wear: 'gown', name: L('Вечернее платье', 'Evening gown') },
  mysterious: { wear: 'gown', name: L('Вечернее платье', 'Evening gown') },
  playful: { wear: 'silk', name: L('Шёлковая пижама', 'Silk sleepwear') },
  fierce: { wear: 'silk', name: L('Шёлковая пижама', 'Silk sleepwear') },
};

for (const id of BOND_HEROES) {
  const h = HEROINE_MAP[id];
  const w = BOND_WEAR[bondTraits(id).p];
  const look: Partial<Look> = { wear: w.wear, outfit: h.look.outfit, trim: h.look.trim };
  const skin: SkinDef = { id: `${id}_bond`, hero: id, name: w.name, look, source: 'bond', set: 'bond' };
  SKINS.push(skin);
  SKIN_MAP[skin.id] = skin;
}

/** Купальник для горячих источников: летний облик, если он есть, иначе — скрытый (его нельзя надеть в бою). */
const SPA_WEAR: Record<Personality, Wear> = { proud: 'swim3', playful: 'swim2', gentle: 'swim', mysterious: 'swim4', fierce: 'swim2', shy: 'swim' };
export const BOND_SPA_SKIN: Record<string, string> = {};
for (const id of BOND_HEROES) {
  if (SKIN_MAP[`${id}_beach`]) {
    BOND_SPA_SKIN[id] = `${id}_beach`;
    continue;
  }
  const h = HEROINE_MAP[id];
  const skin: SkinDef = { id: `${id}_spa`, hero: id, name: L('Купальник', 'Swimsuit'), look: { wear: SPA_WEAR[bondTraits(id).p], outfit: h.look.outfit, trim: h.look.trim }, source: 'bond' };
  SKIN_MAP[skin.id] = skin;
  BOND_SPA_SKIN[id] = skin.id;
}
