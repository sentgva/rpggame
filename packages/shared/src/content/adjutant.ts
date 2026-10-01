import type { L10n } from '../types';
import type { Personality } from './bond';

/**
 * Адъютант (по мотивам секретаря Azur Lane и лобби NIKKE): герой Легиона стоит на главном экране лагеря
 * в выбранном наряде, здоровается по времени суток, сам что-то говорит и реагирует на касания.
 * Первые касания за день дают близость.
 */
const L = (ru: string, en: string): L10n => ({ ru, en });

/** Сколько касаний за день дают близость и сколько за каждое. */
export const ADJ_PATS = 5;
export const ADJ_PAT_BOND = 4;
/** С какой близости адъютант говорит откровеннее. */
export const ADJ_CLOSE_LVL = 5;

export type DayPart = 'morning' | 'day' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  return hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : hour < 23 ? 'evening' : 'night';
}

export interface AdjLines {
  greet: Record<DayPart, L10n>;
  /** сам говорит, когда на него долго смотрят */
  idle: L10n[];
  /** на высокой близости */
  close: L10n[];
}

export const ADJ_LINES: Record<Personality, AdjLines> = {
  playful: {
    greet: {
      morning: L('Подъём, Командор! Я уже придумала нам приключение!', 'Rise and shine, Commander! I already planned us an adventure!'),
      day: L('Скукота… Может, сбежим на пляж? Купальник я уже надела~', "So boring… Shall we sneak off to the beach? I'm already wearing my swimsuit~"),
      evening: L('Вечер! Самое время для фейерверков. Ну, или для меня.', 'Evening! Perfect time for fireworks. Or for me.'),
      night: L('Не спится? Мне тоже. Посидишь со мной?', "Can't sleep? Me neither. Sit with me?"),
    },
    idle: [L('Эй, ты на меня смотришь или в отчёты?', 'Hey, are you looking at me or at the reports?'), L('Я покрасила ногти в цвет пламени. Заметил?', 'I painted my nails flame red. Did you notice?')],
    close: [L('Мне нравится, когда ты рядом. Только не зазнавайся!', "I like it when you're around. Don't get cocky!"), L('Хочешь, покажу новый купальник? Тебе — первому.', 'Want to see my new swimsuit? You get to see it first.')],
  },
  gentle: {
    greet: {
      morning: L('Доброе утро. Я заварила чай — твой любимый.', 'Good morning. I brewed tea — your favourite.'),
      day: L('Не забывай отдыхать, Командор. Я рядом.', "Don't forget to rest, Commander. I'm right here."),
      evening: L('Закат сегодня такой тёплый… как ты.', 'The sunset is so warm today… like you.'),
      night: L('Уже поздно. Хочешь, я спою тебе колыбельную?', "It's late. Shall I sing you a lullaby?"),
    },
    idle: [L('Ой, у тебя растрепались волосы. Можно поправлю?', 'Oh, your hair is a mess. May I fix it?'), L('Свет сегодня особенно ласковый.', 'The light is especially gentle today.')],
    close: [L('Я молюсь за всех… но за тебя — чуть дольше.', 'I pray for everyone… but a little longer for you.'), L('Можно я просто посижу у тебя на плече?', 'May I just rest my head on your shoulder?')],
  },
  mysterious: {
    greet: {
      morning: L('Ты проснулся. Я следила, чтобы тебе ничего не снилось.', "You're awake. I kept watch so you wouldn't dream."),
      day: L('Солнце мешает теням. Но ради тебя — потерплю.', "The sun gets in the shadows' way. For you I'll bear it."),
      evening: L('Сумерки — моё время. И, кажется, твоё тоже.', 'Twilight is my time. And, it seems, yours too.'),
      night: L('Ночью я опаснее. И ближе.', "At night I'm more dangerous. And closer."),
    },
    idle: [L('Ты слишком долго на меня смотришь. Мне нравится.', "You're staring too long. I like it."), L('Хочешь узнать, что под маской? Не сегодня.', "Want to know what's under the mask? Not today.")],
    close: [L('Я стою у тебя за спиной не для того, чтобы ударить.', 'I stand behind you, but not to strike.'), L('Только тебе я позволяю подойти так близко.', 'Only you may come this close.')],
  },
  fierce: {
    greet: {
      morning: L('Утро! Разминка, пробежка, завтрак — в таком порядке!', 'Morning! Warm-up, a run, breakfast — in that order!'),
      day: L('Снег опять стащил твой обед. Я не помогала. Почти.', "Snow stole your lunch again. I didn't help. Mostly."),
      evening: L('Вечером у костра теплее. Подвинься.', "It's warmer by the fire in the evening. Scoot over."),
      night: L('Ночью волки поют. Слышишь? Это для тебя.', "At night the wolves sing. Hear that? It's for you."),
    },
    idle: [L('Мех на плечах — от первого медведя. Хочешь потрогать?', 'The fur on my shoulders is from my first bear. Wanna touch?'), L('Заскучал? Пошли на охоту!', 'Bored? Let\'s go hunting!')],
    close: [L('С тобой даже северный ветер не холодный.', "With you even the north wind isn't cold."), L('Снег признал тебя. И я… тоже.', 'Snow accepted you. And I… did too.')],
  },
  proud: {
    greet: {
      morning: L('Ты проспал. Командор не должен опаздывать.', 'You overslept. A Commander must not be late.'),
      day: L('Я тренировалась три часа. Можешь восхищаться.', 'I trained for three hours. You may admire me.'),
      evening: L('Вечер. Так и быть, составь мне компанию.', 'Evening. Very well, keep me company.'),
      night: L('Ночь… Не уходи пока.', "Night… Don't leave yet."),
    },
    idle: [L('Я не жду комплиментов. Но они не помешают.', "I don't expect compliments. But they wouldn't hurt."), L('Корона сегодня сияет ярче. Догадайся почему.', 'My crown shines brighter today. Guess why.')],
    close: [L('Тебе я разрешаю видеть меня без доспехов.', 'You alone may see me without armour.'), L('Ты единственный, кому я подчиняюсь. Иногда.', "You're the only one I obey. Sometimes.")],
  },
  shy: {
    greet: {
      morning: L('Д-доброе утро… я приготовила завтрак.', 'G-good morning… I made breakfast.'),
      day: L('Я… просто хотела побыть рядом.', 'I… just wanted to be near you.'),
      evening: L('Красивый вечер… н-не то чтобы я намекала.', "A lovely evening… n-not that I'm hinting."),
      night: L('Уже ночь… ты не боишься темноты? Я — немного.', "It's night… aren't you afraid of the dark? I am, a little."),
    },
    idle: [L('Н-не смотри так… я краснею.', "D-don't look at me like that… I'm blushing."), L('Я сшила тебе платок. Он кривой, прости.', "I sewed you a handkerchief. It's crooked, sorry.")],
    close: [L('Можно… я возьму тебя за руку?', 'May I… hold your hand?'), L('С тобой мне не страшно.', "With you I'm not afraid.")],
  },
  gallant: {
    greet: {
      morning: L('Доброе утро, Командор! Латы начищены, улыбка — тоже.', 'Good morning, Commander! Armour polished, smile too.'),
      day: L('Устал — обопрись на меня. Для этого и нужен рыцарь.', "Tired? Lean on me. That's what a knight is for."),
      evening: L('Вечером без лат гораздо легче. И без формальностей.', 'Evenings are lighter without armour. And without formalities.'),
      night: L('Спи спокойно. Я постою у двери.', "Sleep well. I'll stand by the door."),
    },
    idle: [L('Как я выгляжу? Мирабель сказала, что плащ мне идёт.', 'How do I look? Mirabel said the cloak suits me.'), L('Я снова отбил стрелу щитом. Ты видел? Скажи, что видел!', 'I deflected an arrow with my shield again. Did you see? Say you saw!')],
    close: [L('Я поклялся защищать Аэрис. Но тебя — в первую очередь.', 'I swore to protect Aeris. But you first of all.'), L('Не смейся, но рядом с тобой я краснею, как оруженосец.', "Don't laugh, but around you I blush like a squire.")],
  },
  aloof: {
    greet: {
      morning: L('Ты встал позже птиц. Опять.', 'You got up later than the birds. Again.'),
      day: L('Полдень. Тени короткие — врагам не спрятаться. Отдыхай.', 'Noon. Short shadows — no foe can hide. Rest.'),
      evening: L('Вечерний лес звучит красивее. Послушай.', 'The evening forest sounds lovelier. Listen.'),
      night: L('Звёзды ясные. Посиди, я покажу созвездие Лука.', "Clear stars. Sit, I'll show you the Bow constellation."),
    },
    idle: [L('…Что? У меня что-то на лице?', '…What? Is there something on my face?'), L('Уши не трогать. Это не просьба.', 'Hands off the ears. Not a request.')],
    close: [L('Я не привыкаю к людям. Но к тебе… привык.', "I don't get used to humans. But to you… I did."), L('Если потеряешься — я найду тебя по следам. Всегда.', "If you get lost, I'll track you down. Always.")],
  },
};

/** Реплика лучшего героя боя (MVP) после победы над боссом. */
export const MVP_LINES: Record<Personality, L10n> = {
  playful: L('Видел, как я его? Хи-хи, с тебя мороженое!', 'Did you see me get him? Hehe, you owe me ice cream!'),
  gentle: L('Все целы? Слава Свету… и тебе, Командор.', 'Is everyone safe? Thank the Light… and you, Commander.'),
  mysterious: L('Он даже не понял, откуда пришла смерть.', "He never even knew where death came from."),
  fierce: L('Ха! Ещё одна шкура в коллекцию!', 'Ha! Another hide for my collection!'),
  proud: L('Разумеется, победа. Иначе и быть не могло.', 'Victory, naturally. It could not be otherwise.'),
  shy: L('Я… я правда это сделала? Ура…', 'I… I really did it? Yay…'),
  gallant: L('Щит цел, Командор цел — значит, день удался.', "Shield intact, Commander intact — a good day's work."),
  aloof: L('Одна стрела. Больше не понадобилось.', 'One arrow. That was all it took.'),
};
