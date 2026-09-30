import type { L10n } from '../types';
import { HEROINES, HEROINE_MAP, SKINS, SKIN_MAP, isSwimwear, type Look, type SkinDef, type Wear } from './heroines';

/**
 * «Уход» за UR-героинями: близость 0–10. Разговоры, угощения, горячие источники и свидания.
 * Каждая ступень близости усиливает героиню; на пиках — награды, на 10-й — особый наряд (за Сердца Эфира).
 */
/** Характеры героинь; gallant и aloof — у героев (рыцарь и следопыт), их реплики — в мужском роде. */
export type Personality = 'proud' | 'playful' | 'gentle' | 'mysterious' | 'fierce' | 'shy' | 'gallant' | 'aloof';
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
  gallant: L('Галантный', 'Gallant'),
  aloof: L('Невозмутимый', 'Cool-headed'),
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
  gallant: { treat: 'roast', dislike: 'sweets', place: 'tower' },
  aloof: { treat: 'fruit', dislike: 'wine', place: 'lake' },
};

/** Характер и вкусы героев Легиона (у каждого — свои). */
const TRAITS: Record<string, { p: Personality; treat?: Treat; place?: Place }> = {
  cassian: { p: 'gallant', treat: 'roast', place: 'tower' },
  lira: { p: 'playful', treat: 'sweets', place: 'fair' },
  mirabel: { p: 'gentle', treat: 'cake', place: 'garden' },
  elian: { p: 'aloof', treat: 'fruit', place: 'lake' },
  keira: { p: 'mysterious', treat: 'wine', place: 'tower' },
  ulfa: { p: 'fierce', treat: 'roast', place: 'tavern' },
};

export function bondTraits(hero: string): { p: Personality } & Taste {
  const t = TRAITS[hero] ?? { p: 'gentle' as Personality };
  const base = TASTE[t.p];
  return { p: t.p, treat: t.treat ?? base.treat, dislike: base.dislike === (t.treat ?? base.treat) ? 'roast' : base.dislike, place: t.place ?? base.place };
}

/** Уход доступен всем героиням Легиона. */
export const BOND_HEROES = HEROINES.map((h) => h.id);

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
export const BOND_MILESTONES: Record<number, { crystals: number; emblems?: number }> = {
  3: { crystals: 50, emblems: 3 },
  5: { crystals: 150, emblems: 8 },
  7: { crystals: 300, emblems: 12 },
  10: { crystals: 500, emblems: 30 },
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
  gallant: [
    { line: L('Командор, ты видел, как я принял удар на щит? Даже причёска не сбилась.', 'Commander, did you see me take that blow on my shield? Not a hair out of place.'), answers: [L('Самый красивый щит Легиона.', 'The handsomest shield in the Legion.'), L('Неплохо сработано.', 'Nicely done.'), L('Причёска меня волнует меньше всего.', 'Your hair is the last thing I care about.')] },
    { line: L('Я поклялся защищать тебя. Но кто защитит меня от твоих приказов?', 'I swore to protect you. But who will protect me from your orders?'), answers: [L('Я. Больше никаких безумных приказов.', 'I will. No more reckless orders.'), L('Приказы есть приказы.', 'Orders are orders.'), L('Никто. Терпи.', 'No one. Deal with it.')] },
    { line: L('Сними перчатку, Командор. Рыцарь пожимает руку тому, за кого сражается.', 'Take off your glove, Commander. A knight shakes the hand of the one he fights for.'), answers: [L('С честью.', 'With honour.'), L('Ну держи.', 'Here you go.'), L('Обойдёмся без церемоний.', "Let's skip the ceremony.")] },
    { line: L('Говорят, я слишком красив для войны. Это комплимент?', 'They say I am too pretty for war. Is that a compliment?'), answers: [L('Для войны — нет. Для Легиона — да.', 'For war — no. For the Legion — yes.'), L('Смотря кто говорит.', 'Depends who says it.'), L('Это диагноз.', "It's a diagnosis.")] },
  ],
  aloof: [
    { line: L('Ты шумишь, как стадо кабанов. Но идёшь в правильную сторону.', 'You make as much noise as a herd of boars. But you walk the right way.'), answers: [L('Научишь ходить тихо?', 'Will you teach me to walk quietly?'), L('Стараюсь.', 'I try.'), L('Тогда иди первым.', 'Then you lead.')] },
    { line: L('Сегодня видел следы дракона. Старые. Не бойся.', "Saw dragon tracks today. Old ones. Don't be afraid."), answers: [L('С тобой не боюсь.', "Not with you around."), L('Хорошо, что старые.', "Good thing they're old."), L('Я и не боялся.', "I wasn't.")] },
    { line: L('Эльфы живут долго. Поэтому я не спешу привязываться к людям.', "Elves live long. That's why I'm in no hurry to get attached to humans."), answers: [L('Тогда я постараюсь быть того достоин.', "Then I'll try to be worth it."), L('Понимаю.', 'I understand.'), L('Ну и не надо.', "Don't, then.")] },
    { line: L('Хочешь, научу читать ветер? …Не смотри так, я просто скучаю.', "Want me to teach you to read the wind? …Don't look at me like that, I'm just bored."), answers: [L('Научи. Мне интересно всё, что знаешь ты.', 'Teach me. I want to know everything you know.'), L('Давай.', 'Sure.'), L('Ветер как ветер.', 'Wind is wind.')] },
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
  gallant: [L('Слова настоящего Командора. Благодарю.', 'Spoken like a true Commander. Thank you.'), L('Принято.', 'Understood.'), L('Хм. Рыцари тоже обижаются.', 'Hm. Knights take offence too.')],
  aloof: [L('…Неплохой ответ. Для человека.', '…Not a bad answer. For a human.'), L('Хм.', 'Hm.'), L('Как предсказуемо.', 'How predictable.')],
};

/** Приветствие по близости: незнакомка (0–3), подруга (4–7), близкая (8–10). */
export const GREETINGS: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('Командор. Надеюсь, дело важное.', 'Commander. I hope this is important.'), L('А, это ты. Проходи.', 'Ah, it\'s you. Come in.'), L('Я ждала тебя. Не говори никому.', 'I was waiting for you. Tell no one.')],
  playful: [L('О, новенький? Поиграем?', 'Oh, a new face? Wanna play?'), L('Наконец-то! Мне было скучно!', 'Finally! I was bored!'), L('Мой любимый Командор пришёл!', 'My favourite Commander is here!')],
  gentle: [L('Здравствуйте, Командор.', 'Hello, Commander.'), L('Рада тебя видеть.', 'Glad to see you.'), L('Ты пришёл… я так скучала.', 'You came… I missed you so.')],
  mysterious: [L('Ты пришёл не случайно.', 'You didn\'t come by chance.'), L('Тени сказали, что ты придёшь.', 'The shadows said you\'d come.'), L('Без тебя даже тьма скучна.', 'Without you even darkness is dull.')],
  fierce: [L('Чего надо? Хочешь драки?', 'What? Looking for a fight?'), L('О, Командор! Размяться не хочешь?', 'Oh, Commander! Up for a workout?'), L('Иди сюда, обниму — больно не будет!', 'Come here, a hug — won\'t hurt!')],
  shy: [L('Ой… з-здравствуйте…', 'Oh… h-hello…'), L('Я рада, что ты здесь.', 'I\'m glad you\'re here.'), L('Можно… я возьму тебя за руку?', 'May I… hold your hand?')],
  gallant: [L('Командор. Рыцарь Легиона к вашим услугам.', 'Commander. Knight of the Legion, at your service.'), L('А, это ты. Я как раз начистил латы.', "Ah, it's you. I just polished my armour."), L('Ты пришёл. Мой щит — твой, и не только в бою.', 'You came. My shield is yours, and not only in battle.')],
  aloof: [L('Ты. Зачем пришёл?', 'You. What do you want?'), L('Садись. Только не распугай птиц.', "Sit. Just don't scare the birds."), L('Я слышал твои шаги ещё за рощей. И ждал.', 'I heard your steps beyond the grove. And I waited.')],
};

export const SPA_LINES: Record<Personality, L10n> = {
  proud: L('Горячие источники? Так уж и быть. Только не пялься… слишком долго.', 'Hot springs? Very well. Just don\'t stare… too long.'),
  playful: L('Бомбочкой! Ой, я тебя обрызгала? Ни капельки не жаль!', 'Cannonball! Oops, did I splash you? Not sorry at all!'),
  gentle: L('Вода такая тёплая… как хорошо, что ты рядом.', 'The water is so warm… I\'m glad you\'re here.'),
  mysterious: L('Пар скрывает многое. Но не всё.', 'The steam hides much. But not everything.'),
  fierce: L('Кто дольше просидит в самой горячей купели? Я!', 'Who can last longest in the hottest pool? Me!'),
  shy: L('Я в купальнике… ты только не смотри, ладно?', 'I\'m in a swimsuit… just don\'t look, okay?'),
  gallant: L('Источники? Латы снимаю только ради тебя, Командор. И не завидуй.', "Hot springs? I take off my armour only for you, Commander. And don't be jealous."),
  aloof: L('В лесу такие источники зовут «слезами земли». Не брызгайся.', 'In the forest we call springs like this "tears of the earth". No splashing.'),
};

export const DATE_LINES: Record<Personality, [L10n, L10n]> = {
  proud: [L('Лучшее место в Аэрисе. Ты угадал.', 'The finest place in Aeris. You guessed right.'), L('Неплохо. Хотя я бы выбрала другое.', 'Not bad. Though I\'d have picked another.')],
  playful: [L('Ура! Именно сюда я и хотела!', 'Yay! Exactly where I wanted to go!'), L('Весело! Но в следующий раз — туда, куда я скажу.', 'Fun! But next time — where I say.')],
  gentle: [L('Ты помнишь, что я люблю… это так мило.', 'You remember what I love… how sweet.'), L('С тобой хорошо где угодно.', 'Anywhere is nice with you.')],
  mysterious: [L('Ты знал, куда меня вести. Опасный человек.', 'You knew where to take me. Dangerous.'), L('Интересный выбор.', 'An interesting choice.')],
  fierce: [L('Вот это я понимаю — свидание!', 'Now THAT\'s a date!'), L('Сойдёт, но где же драка?', 'It\'ll do, but where\'s the brawl?')],
  shy: [L('Т-ты запомнил… спасибо.', 'Y-you remembered… thank you.'), L('Мне… мне понравилось.', 'I… I liked it.')],
  gallant: [L('Отличный выбор. Отсюда виден весь Аэрис — всё, что мы защищаем.', 'Great choice. From here you can see all of Aeris — everything we protect.'), L('Неплохо. Хотя я бы выбрал место для тренировки.', "Not bad. Though I'd have picked a place to train.")],
  aloof: [L('Тихо, вода, никого. Ты угадал моё место.', 'Quiet, water, no one around. You guessed my place.'), L('Сойдёт. Хотя в лесу лучше.', "It'll do. Though the forest is better.")],
};

export const TREAT_LINES: Record<Personality, [L10n, L10n, L10n]> = {
  proud: [L('Достойный выбор. Ты меня понимаешь.', 'A worthy choice. You understand me.'), L('Спасибо.', 'Thank you.'), L('Это… не для меня.', 'That… is not for me.')],
  playful: [L('Ммм! Обожаю! Ещё!', 'Mmm! I love it! More!'), L('Вкусненько.', 'Yummy.'), L('Фе.', 'Yuck.')],
  gentle: [L('Моё любимое! Как ты узнал?', 'My favourite! How did you know?'), L('Очень вкусно, спасибо.', 'Very tasty, thank you.'), L('Я… попробую чуть-чуть.', 'I… will try a little.')],
  mysterious: [L('Ты угадал мой вкус. Опять.', 'You guessed my taste. Again.'), L('Неплохо.', 'Not bad.'), L('Нет.', 'No.')],
  fierce: [L('Вот это еда! Ещё тарелку!', 'Now that\'s food! Another plate!'), L('Сойдёт.', 'It\'ll do.'), L('Это для детей.', 'That\'s for kids.')],
  shy: [L('Моё любимое… с-спасибо…', 'My favourite… th-thank you…'), L('Вкусно.', 'Tasty.'), L('Я не очень…', 'I\'m not really…')],
  gallant: [L('Достойное угощение. Ты знаешь, как порадовать рыцаря.', 'A worthy treat. You know how to please a knight.'), L('Благодарю.', 'Thank you.'), L('Это… не рыцарская еда.', 'That… is not knightly food.')],
  aloof: [L('…Как ты узнал? Не отвечай.', "…How did you know? Don't answer."), L('Вкусно. Спасибо, человек.', 'Tasty. Thanks, human.'), L('Эльфы такое не едят.', "Elves don't eat that.")],
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
  gallant: { wear: 'mformal', name: L('Вечерний камзол', 'Evening doublet') },
  aloof: { wear: 'myukata', name: L('Лесная юката', 'Forest yukata') },
};

for (const id of BOND_HEROES) {
  const h = HEROINE_MAP[id];
  const w = BOND_WEAR[bondTraits(id).p];
  const look: Partial<Look> = { wear: w.wear, outfit: h.look.outfit, trim: h.look.trim };
  const skin: SkinDef = { id: `${id}_bond`, hero: id, name: w.name, look, source: 'bond', set: 'bond' };
  SKINS.push(skin);
  SKIN_MAP[skin.id] = skin;
}

/** Купальник для горячих источников — скрытый облик (его нельзя надеть в бою). */
const SPA_WEAR: Record<Personality, Wear> = { proud: 'swim3', playful: 'swim2', gentle: 'swim', mysterious: 'swim4', fierce: 'swim2', shy: 'swim', gallant: 'trunks', aloof: 'trunks' };
export const BOND_SPA_SKIN: Record<string, string> = {};
for (const id of BOND_HEROES) {
  const h = HEROINE_MAP[id];
  // родной наряд — уже купальник (Солара): в нём и в источник
  const wear = isSwimwear(h.look.wear) ? h.look.wear! : SPA_WEAR[bondTraits(id).p];
  const skin: SkinDef = { id: `${id}_spa`, hero: id, name: L('Купальник', 'Swimsuit'), look: { wear, outfit: h.look.outfit, trim: h.look.trim }, source: 'bond' };
  SKIN_MAP[skin.id] = skin;
  BOND_SPA_SKIN[id] = skin.id;
}

// ——— Резиденция: общие комнаты героинь ———

export type RoomId = 'living' | 'kitchen' | 'bath' | 'bedroom';
export const ROOM_MAX = 5;

export const ROOMS: { id: RoomId; icon: string; name: L10n; effect: L10n; bg: [string, string] }[] = [
  { id: 'living', icon: '🛋️', name: L('Гостиная', 'Living room'), effect: L('Разговоры: +{pct}% близости', 'Talks: +{pct}% bond'), bg: ['#3a2420', '#7a4a34'] },
  { id: 'kitchen', icon: '🍳', name: L('Кухня', 'Kitchen'), effect: L('Угощения: +{pct}% близости', 'Treats: +{pct}% bond'), bg: ['#3a3020', '#8a6a3a'] },
  { id: 'bath', icon: '🛁', name: L('Ванная', 'Bathroom'), effect: L('Ванна раз в день: +{n} близости', 'Daily bath: +{n} bond'), bg: ['#1e3440', '#5a8a9a'] },
  { id: 'bedroom', icon: '🛏️', name: L('Спальня', 'Bedroom'), effect: L('Ночёвка (с близости {lvl}): +{n} близости и утренний подарок', 'Sleepover (from bond {lvl}): +{n} bond and a morning gift'), bg: ['#141430', '#3a3a70'] },
];
export const ROOM_MAP = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, (typeof ROOMS)[number]>;

/** Бонус гостиной и кухни к близости за уровень комнаты. */
export const ROOM_BONUS = 0.15;
/** Ванна: база + за уровень ванной. */
export const BATH_GAIN = { base: 20, perLvl: 6 } as const;
/** Ночёвка: с близости 5, одна героиня за ночь. */
export const BOND_SLEEP_LVL = 5;
export const SLEEP_GAIN = { base: 40, perLvl: 10 } as const;
/** Утренний подарок — минуты дохода золота и опыта. */
export const SLEEP_GIFT_MIN = { base: 30, perLvl: 15 } as const;

/** Цена обустройства комнаты до уровня lvl (золото — от дохода, с 3-го уровня ещё кристаллы). */
export function roomCost(lvl: number, gpm: number): { gold: number; crystals?: number } {
  const gold = Math.max(1000, Math.floor(gpm * 60 * lvl));
  return lvl >= 3 ? { gold, crystals: 100 * (lvl - 2) } : { gold };
}

export const BATH_LINES: Record<Personality, L10n> = {
  proud: L('Пена до самого подбородка — как и подобает. Подай полотенце и отвернись.', 'Foam up to my chin, as it should be. Hand me the towel and turn around.'),
  playful: L('Смотри, какая борода из пены! Ха-ха, тебе тоже сделать?', 'Look, a foam beard! Haha, want one too?'),
  gentle: L('Тёплая вода и лавандовое масло… Спасибо, что обустроил ванную.', 'Warm water and lavender oil… Thank you for the bathroom.'),
  mysterious: L('В тишине ванной слышно, как шепчут свечи.', 'In the quiet of the bath you can hear the candles whisper.'),
  fierce: L('Горячее! Ещё горячее! Вот теперь мышцы отдыхают.', 'Hot! Hotter! Now my muscles can rest.'),
  shy: L('Я… я под пеной, ничего не видно. Но ты всё равно постучи в следующий раз!', 'I… I\'m under the foam, you can\'t see anything. But knock next time anyway!'),
  gallant: L('Горячая вода и тишина. Подай полотенце — и, будь добр, не смейся над моими мокрыми волосами.', "Hot water and silence. Hand me the towel — and kindly don't laugh at my wet hair."),
  aloof: L('Ванна вместо реки? Непривычно. Но пена пахнет лесом — это ты выбирал?', 'A bath instead of a river? Strange. But the foam smells like the forest — did you pick it?'),
};

/** Ночёвка: [перед сном, утро]. Только сон — уютно и мило. */
export const SLEEP_LINES: Record<Personality, [L10n, L10n]> = {
  proud: [L('Можешь остаться. Но только спать, командор. И не храпи.', 'You may stay. Only to sleep, Commander. And no snoring.'), L('Доброе утро. Ты… спал спокойно. Мне понравилось.', 'Good morning. You… slept peacefully. I liked that.')],
  playful: [L('Битва подушками! …Ладно-ладно, спим. Спокойной ночи!', 'Pillow fight! …Okay, okay, sleeping. Good night!'), L('Подъём, соня! Я уже испекла блинчики!', 'Wake up, sleepyhead! I already made pancakes!')],
  gentle: [L('Посиди со мной, пока я не усну… Спокойной ночи.', 'Stay with me until I fall asleep… Good night.'), L('Доброе утро. Чай уже заварен.', 'Good morning. The tea is ready.')],
  mysterious: [L('Мне снятся звёзды. Может, этой ночью приснишься и ты.', 'I dream of stars. Perhaps tonight I\'ll dream of you.'), L('Ты был в моём сне. Не спрашивай, что там было.', 'You were in my dream. Don\'t ask what happened.')],
  fierce: [L('Храплю? Я?! Никогда. Всё, спи давай.', 'Me? Snore?! Never. Now go to sleep.'), L('Утро! Разминка — и в бой!', 'Morning! Warm-up — then battle!')],
  shy: [L('Т-только спать, да? …Хорошо. Спокойной ночи.', 'O-only sleep, right? …Okay. Good night.'), L('Д-доброе утро… Ты укрыл меня одеялом? Спасибо…', 'G-good morning… You tucked me in? Thank you…')],
  gallant: [L('Первую смену беру я. Спи, Командор — разбужу, если что.', "I'll take first watch. Sleep, Commander — I'll wake you if anything happens."), L('Утро. Никто не прошёл мимо моего щита. Кофе будешь?', 'Morning. No one got past my shield. Coffee?')],
  aloof: [L('Звёзды сегодня ясные. Ты смотришь на север, я — на юг.', 'The stars are clear tonight. You watch the north, I take the south.'), L('Рассвет. Ты уснул на своей смене. Я никому не скажу.', "Dawn. You fell asleep on your watch. I won't tell anyone.")],
};

/** Пижама для ночёвки (у героев — халат для ночного дозора) — скрытый облик (в бою не надеть). */
export const BOND_SLEEP_SKIN: Record<string, string> = {};
for (const id of BOND_HEROES) {
  const h = HEROINE_MAP[id];
  const skin: SkinDef = { id: `${id}_sleep`, hero: id, name: L('Пижама', 'Pajamas'), look: { wear: h.look.male ? 'mrobe' : 'silk', outfit: h.look.trim, trim: h.look.outfit }, source: 'bond' };
  SKIN_MAP[skin.id] = skin;
  BOND_SLEEP_SKIN[id] = skin.id;
}
