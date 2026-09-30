import type { L10n } from '../types';
import { HEROINE_MAP } from './heroines';
import { COMBOS, type ComboDef } from './classes';

/**
 * «Вечер у костра»: раз в день двое из Легиона разговаривают у огня. Командор поддерживает одного
 * из них или мирит обоих — растёт близость, а связка их классов сыгрывается (+мастерство).
 * Сцена на каждую пару; новые показываются первыми.
 */
export type CampChoice = 'a' | 'b' | 'both';

export interface CampScene {
  id: string;
  a: string;
  b: string;
  /** реплики: кто говорит и что */
  lines: [who: 'a' | 'b', text: L10n][];
  /** варианты ответа Командора */
  choices: Record<CampChoice, L10n>;
  /** ответная реплика: чья и что */
  replies: Record<CampChoice, [who: 'a' | 'b', text: L10n]>;
}

const L = (ru: string, en: string): L10n => ({ ru, en });

/** Близость за вечер: поддержанному — больше, второму — меньше; «оба правы» — поровну. */
export const CAMP_BOND = { favored: 25, other: 10, both: 18 } as const;
/** Сыгранность: столько связок засчитывается их общей связке (мастерство). */
export const CAMP_MASTERY = 30;

export const CAMPFIRE: CampScene[] = [
  {
    id: 'cassian_lira',
    a: 'cassian',
    b: 'lira',
    lines: [
      ['b', L('Ой. Кассиан, твой плащ… немного горит.', 'Oops. Cassian, your cloak is… a little on fire.')],
      ['a', L('Немного?! Лира, это третий плащ за неделю.', 'A little?! Lira, that is the third cloak this week.')],
      ['b', L('Зато костёр разгорелся с первой искры! Признай, красиво.', 'But the fire caught on the first spark! Admit it, it is pretty.')],
    ],
    choices: {
      a: L('Лира, осторожнее с огнём рядом с отрядом.', 'Lira, be careful with fire near the squad.'),
      b: L('Плащ зашьём, а костёр и правда отличный.', 'We will mend the cloak — the fire really is great.'),
      both: L('Лира шьёт новый плащ, Кассиан садится подальше от посоха.', 'Lira sews a new cloak, Cassian sits away from the staff.'),
    },
    replies: {
      a: ['a', L('Спасибо, Командор. Хоть кто-то на моей стороне.', 'Thank you, Commander. Someone is on my side.')],
      b: ['b', L('Вот! Командор ценит искусство.', 'See? The Commander appreciates art.')],
      both: ['a', L('…Справедливо. Но нитки выбираю я.', '…Fair. But I pick the thread.')],
    },
  },
  {
    id: 'cassian_mirabel',
    a: 'cassian',
    b: 'mirabel',
    lines: [
      ['b', L('Покажи руку. Ты весь бой держал щит на ушибе.', 'Show me your arm. You held the shield on a bruise all battle.')],
      ['a', L('Пустяки. Рыцарь не жалуется.', 'It is nothing. A knight does not complain.')],
      ['b', L('Рыцарь, который не лечится, завтра не поднимет щит.', 'A knight who will not heal cannot lift a shield tomorrow.')],
    ],
    choices: {
      a: L('Кассиан знает свои силы — не будем давить.', 'Cassian knows his limits — let us not push.'),
      b: L('Мирабель права: щит нужен нам целым.', 'Mirabel is right: we need that shield arm whole.'),
      both: L('Пусть Мирабель посмотрит, а Кассиан расскажет, как держал строй.', 'Let Mirabel look while Cassian tells how he held the line.'),
    },
    replies: {
      a: ['a', L('Благодарю. Утром буду как новый — обещаю.', 'Thank you. I will be good as new by morning — I promise.')],
      b: ['b', L('Вот и хорошо. Сиди смирно, храбрец.', 'Good. Now sit still, brave one.')],
      both: ['a', L('…Ладно. Только быстро. Ай. Спасибо.', '…Fine. Quickly. Ow. Thank you.')],
    },
  },
  {
    id: 'cassian_elian',
    a: 'cassian',
    b: 'elian',
    lines: [
      ['b', L('В твоих латах тебя слышно за полверсты. Звери разбегаются.', 'I can hear your armour half a mile away. The game runs off.')],
      ['a', L('Пусть слышат. Враг, который меня слышит, не смотрит на вас.', 'Let them hear. A foe that hears me does not look at you.')],
      ['b', L('Хм. А если я скую его сетью — ты наконец ударишь как следует?', 'Hm. And if I root him in my net — will you finally hit properly?')],
    ],
    choices: {
      a: L('Грохот Кассиана — наш щит. Пусть звенит.', 'Cassian’s clatter is our shield. Let it ring.'),
      b: L('Элиан дело говорит: сеть и удар — вместе сильнее.', 'Elian has a point: net and strike are stronger together.'),
      both: L('Элиан ставит сеть, Кассиан сокрушает — договорились?', 'Elian nets, Cassian crushes — deal?'),
    },
    replies: {
      a: ['a', L('Слышал, эльф? Звон — это забота.', 'Hear that, elf? The ringing is care.')],
      b: ['b', L('Наконец разумный человек в этом лагере.', 'Finally a sensible human in this camp.')],
      both: ['b', L('Договорились. Только не наступай на мои силки.', 'Deal. Just do not step on my snares.')],
    },
  },
  {
    id: 'cassian_keira',
    a: 'cassian',
    b: 'keira',
    lines: [
      ['b', L('Ты снова не заметил меня за спиной.', 'You failed to notice me behind you again.')],
      ['a', L('Я смотрю на врага, а не на своих. Это разные вещи.', 'I watch the enemy, not my own. That is different.')],
      ['b', L('Тогда оглушай их почаще. Ошеломлённый враг не видит меня вовсе.', 'Then daze them more often. A dazed foe does not see me at all.')],
    ],
    choices: {
      a: L('Кассиан прав: пугать своих — не дело.', 'Cassian is right: scaring your own is bad form.'),
      b: L('Кейра подсказывает дело: удар щитом — её шанс.', 'Keira’s tip is good: the shield bash is her opening.'),
      both: L('Кассиан оглушает, Кейра бьёт в спину. Идеально.', 'Cassian dazes, Keira backstabs. Perfect.'),
    },
    replies: {
      a: ['a', L('Вот. Командор понимает строй.', 'There. The Commander understands formation.')],
      b: ['b', L('Мм. Ты начинаешь мне нравиться, Командор.', 'Mm. I am starting to like you, Commander.')],
      both: ['b', L('Идеально… Только скажи ему не вздрагивать.', 'Perfect… Just tell him not to flinch.')],
    },
  },
  {
    id: 'cassian_ulfa',
    a: 'cassian',
    b: 'ulfa',
    lines: [
      ['a', L('Ульфа… твой волк спит на моём щите.', 'Ulfa… your wolf is sleeping on my shield.')],
      ['b', L('Снег выбрал самое надёжное место в лагере. Это комплимент.', 'Snow picked the safest spot in camp. That is a compliment.')],
      ['a', L('Комплимент весит как три мешка муки.', 'The compliment weighs as much as three sacks of flour.')],
    ],
    choices: {
      a: L('Щит — не лежанка. Снег, подвинься.', 'A shield is not a bed. Move over, Snow.'),
      b: L('Раз волк доверяет щиту — это лучшая похвала.', 'If the wolf trusts the shield — that is the best praise.'),
      both: L('Постелем Снегу шкуру рядом со щитом.', 'Let us lay a fur for Snow next to the shield.'),
    },
    replies: {
      a: ['b', L('Снег обиделся. Завтра будет спать на твоих сапогах.', 'Snow is offended. Tomorrow he sleeps on your boots.')],
      b: ['b', L('Слышишь, рыцарь? Лучшая похвала.', 'Hear that, knight? The best praise.')],
      both: ['a', L('…Тёплый он. Ладно, пусть лежит рядом.', '…He is warm. Fine, let him lie beside it.')],
    },
  },
  {
    id: 'lira_mirabel',
    a: 'lira',
    b: 'mirabel',
    lines: [
      ['a', L('Мирабель, подержи зайца. Хочу проверить новое проклятие.', 'Mirabel, hold this rabbit. I want to test a new hex.')],
      ['b', L('Лира! Он же живой и тёплый!', 'Lira! He is alive and warm!')],
      ['a', L('Ну не на Кассиане же пробовать. Он и так злится из-за плаща.', 'Well, I cannot test it on Cassian. He is already mad about the cloak.')],
    ],
    choices: {
      a: L('Проклятия важны — но пусть это будет чучело.', 'Hexes matter — but use a dummy.'),
      b: L('Зайца отпустим. Мирабель права.', 'We let the rabbit go. Mirabel is right.'),
      both: L('Лира проклинает пугало, Мирабель лечит его, если выйдет перебор.', 'Lira hexes a scarecrow, Mirabel mends it if she overdoes it.'),
    },
    replies: {
      a: ['a', L('Чучело так чучело. Скучно, но честно.', 'A dummy it is. Boring, but fair.')],
      b: ['b', L('Беги, малыш. И никогда не возвращайся к колдуньям.', 'Run, little one. And never come back to witches.')],
      both: ['a', L('Пугало с благословением… звучит как вызов!', 'A blessed scarecrow… sounds like a challenge!')],
    },
  },
  {
    id: 'lira_elian',
    a: 'lira',
    b: 'elian',
    lines: [
      ['b', L('Твоё проклятие вспыхнуло от моей стрелы. Половина урона — моя.', 'Your hex burst from my arrow. Half the damage is mine.')],
      ['a', L('Половина? Без проклятия твоя стрела просто щекотка!', 'Half? Without the hex your arrow is a tickle!')],
      ['b', L('Щекотка, которая пробивает доспех с сотни шагов.', 'A tickle that pierces armour from a hundred paces.')],
    ],
    choices: {
      a: L('Проклятие — основа взрыва. Лира права.', 'The hex is the heart of the burst. Lira is right.'),
      b: L('Без меткого выстрела взрыва бы не было.', 'Without the precise shot there would be no burst.'),
      both: L('Взрыв проклятия — это вы оба. Делите славу.', 'The Hex Burst is both of you. Share the glory.'),
    },
    replies: {
      a: ['a', L('Слышишь, остроухий? Основа!', 'Hear that, pointy ears? The heart!')],
      b: ['b', L('Спасибо. Лира, можешь дальше колдовать на фоне.', 'Thank you. Lira, you may keep casting in the background.')],
      both: ['b', L('…Хорошо. Следующий взрыв — побольше, ладно?', '…Fine. Make the next burst bigger, will you?')],
    },
  },
  {
    id: 'lira_keira',
    a: 'lira',
    b: 'keira',
    lines: [
      ['b', L('Мой яд, твоё проклятие — и враг гниёт изнутри за мгновение.', 'My poison, your hex — and the foe rots from within in a heartbeat.')],
      ['a', L('Разложение! Давай назовём его «Лирино разложение»!', 'Decay! Let us call it “Lira’s Decay”!')],
      ['b', L('Давай назовём его тихо. Ты кричишь на весь лес.', 'Let us name it quietly. You are shouting across the forest.')],
    ],
    choices: {
      a: L('Лира заслужила громкое имя.', 'Lira deserves a loud name.'),
      b: L('Кейра права: хорошая связка любит тишину.', 'Keira is right: a good combo loves silence.'),
      both: L('Назовём просто: «Разложение». И скажем шёпотом.', 'Just call it “Decay”. And whisper it.'),
    },
    replies: {
      a: ['a', L('ЛИРИНО РАЗЛОЖЕНИЕ! …Ой. Прости, Кейра.', 'LIRA’S DECAY! …Oops. Sorry, Keira.')],
      b: ['b', L('Спасибо. Хоть кто-то здесь умеет не шуметь.', 'Thank you. Someone here knows how to be quiet.')],
      both: ['a', L('(шёпотом) Разложение… звучит зловеще. Мне нравится.', '(whispering) Decay… sounds sinister. I love it.')],
    },
  },
  {
    id: 'lira_ulfa',
    a: 'lira',
    b: 'ulfa',
    lines: [
      ['a', L('Можно погладить Снега? Совсем чуть-чуть?', 'May I pet Snow? Just a little?')],
      ['b', L('Он не любит огонь. А от тебя пахнет дымом и серой.', 'He dislikes fire. And you smell of smoke and brimstone.')],
      ['a', L('Это духи! «Вечер в преисподней»!', 'It is perfume! “Evening in the Abyss”!')],
    ],
    choices: {
      a: L('Снег, будь вежлив с Лирой.', 'Snow, be polite to Lira.'),
      b: L('Волку виднее — не будем его пугать.', 'The wolf knows best — let us not scare him.'),
      both: L('Лира, протяни руку без посоха. Ульфа, придержи Снега.', 'Lira, offer your hand without the staff. Ulfa, hold Snow.'),
    },
    replies: {
      a: ['a', L('Он… лизнул мне руку! Он меня любит!', 'He… licked my hand! He loves me!')],
      b: ['b', L('Мудро. Снег запомнит, что ты его понял.', 'Wise. Snow will remember you understood him.')],
      both: ['b', L('Смотри-ка, вильнул хвостом. Ты ему интересна, колдунья.', 'Look, he wagged his tail. He finds you curious, witch.')],
    },
  },
  {
    id: 'mirabel_elian',
    a: 'mirabel',
    b: 'elian',
    lines: [
      ['b', L('Я собрал травы у ручья. Эльфы заваривают их для сна.', 'I gathered herbs by the stream. Elves brew them for sleep.')],
      ['a', L('Это же лунный шалфей! Из него выходит лучшая мазь для ран.', 'That is moon sage! It makes the best salve for wounds.')],
      ['b', L('Мазь? Ты хочешь мазать мой чай на Кассиана?', 'Salve? You want to smear my tea on Cassian?')],
    ],
    choices: {
      a: L('Раны важнее чая — пусть будет мазь.', 'Wounds before tea — make the salve.'),
      b: L('Сегодня — чай. Отряду нужен сон.', 'Tonight — tea. The squad needs sleep.'),
      both: L('Половину — в чай, половину — в мазь.', 'Half for tea, half for the salve.'),
    },
    replies: {
      a: ['a', L('Спасибо! Элиан, я научу тебя её варить.', 'Thank you! Elian, I will teach you to brew it.')],
      b: ['b', L('Вот. Командор знает цену хорошему сну.', 'There. The Commander knows the value of good sleep.')],
      both: ['b', L('Справедливо. Завтра соберу ещё — на всех.', 'Fair. Tomorrow I will gather more — for everyone.')],
    },
  },
  {
    id: 'mirabel_keira',
    a: 'mirabel',
    b: 'keira',
    lines: [
      ['a', L('Кейра, ты сегодня хоть раз улыбнулась?', 'Keira, did you smile even once today?')],
      ['b', L('Я улыбаюсь внутри. Снаружи это вредно для работы.', 'I smile inside. On the outside it is bad for the job.')],
      ['a', L('Тогда позволь благословить тебя — вдруг улыбка сама выйдет наружу.', 'Then let me bless you — maybe the smile will find its way out.')],
    ],
    choices: {
      a: L('Одна улыбка ещё никого не выдала.', 'One smile never gave anyone away.'),
      b: L('У Кейры своя служба. Уважим её.', 'Keira has her own duty. Let us respect it.'),
      both: L('Благословение — да, улыбка — по желанию.', 'The blessing — yes, the smile — optional.'),
    },
    replies: {
      a: ['b', L('…Ладно. Одна. Только никому не говорите.', '…Fine. One. Tell no one.')],
      b: ['b', L('Спасибо. Благословение всё же приму.', 'Thank you. I will still accept the blessing.')],
      both: ['a', L('Благословляю. Ой — это была улыбка? Я видела!', 'Blessed be. Oh — was that a smile? I saw it!')],
    },
  },
  {
    id: 'mirabel_ulfa',
    a: 'mirabel',
    b: 'ulfa',
    lines: [
      ['b', L('Я принесла оленя. Хватит на всех на три дня.', 'I brought a deer. Enough for everyone for three days.')],
      ['a', L('Бедное создание… Можно я помолюсь за него?', 'Poor creature… May I pray for it?')],
      ['b', L('Молись. На севере благодарят зверя, прежде чем есть.', 'Pray. Up north we thank the beast before we eat.')],
    ],
    choices: {
      a: L('Помолимся вместе — Мирабель, веди.', 'Let us pray together — Mirabel, lead.'),
      b: L('Ульфа кормит Легион. Спасибо охотнице.', 'Ulfa feeds the Legion. Thanks to the huntress.'),
      both: L('Обычай севера и молитва света — отличный ужин.', 'A northern custom and a prayer of light — a fine supper.'),
    },
    replies: {
      a: ['a', L('Свет, прими его дух… Спасибо, Командор.', 'Light, receive its spirit… Thank you, Commander.')],
      b: ['b', L('Ешь, Командор. Завтра охота — вместе с Снегом.', 'Eat, Commander. Tomorrow we hunt — with Snow.')],
      both: ['b', L('У вас на юге тоже благодарят. Хорошо. Мы похожи.', 'You in the south give thanks too. Good. We are alike.')],
    },
  },
  {
    id: 'elian_keira',
    a: 'elian',
    b: 'keira',
    lines: [
      ['a', L('Спорим, я подкрадусь к часовому тише тебя?', 'Bet I can sneak up on a sentry quieter than you?')],
      ['b', L('Ты уже проиграл. Я стою за тобой с начала разговора.', 'You already lost. I have been behind you since we started talking.')],
      ['a', L('…Я знал. Я просто давал тебе фору.', '…I knew. I was just giving you a head start.')],
    ],
    choices: {
      a: L('Элиан — лучший следопыт, это не спор.', 'Elian is the finest tracker, no contest.'),
      b: L('Кейра выиграла честно.', 'Keira won fairly.'),
      both: L('Завтра проверим: кто первым найдёт вражеский дозор.', 'Tomorrow we test it: who finds the enemy scouts first.'),
    },
    replies: {
      a: ['a', L('Вот! Следы не лгут, Кейра.', 'There! Tracks do not lie, Keira.')],
      b: ['b', L('Спасибо, Командор. Элиан, фора — это мило.', 'Thank you, Commander. Elian, the head start was cute.')],
      both: ['b', L('Принимаю. Проигравший чистит котёл.', 'Accepted. The loser scrubs the pot.')],
    },
  },
  {
    id: 'elian_ulfa',
    a: 'elian',
    b: 'ulfa',
    lines: [
      ['a', L('Арбалет — оружие для тех, кто не умеет натягивать лук.', 'A crossbow is for those who cannot draw a bow.')],
      ['b', L('Лук — для тех, кто не умеет попасть с первого раза.', 'A bow is for those who cannot hit on the first try.')],
      ['a', L('…Ладно. Твоя метка добычи помогает мне стрелять дважды.', '…Fine. Your prey mark lets me shoot twice.')],
    ],
    choices: {
      a: L('Лук Элиана — искусство.', 'Elian’s bow is an art.'),
      b: L('Арбалет Ульфы бьёт наверняка.', 'Ulfa’s crossbow never misses.'),
      both: L('Метка Ульфы и два выстрела Элиана — вот наша травля.', 'Ulfa’s mark and Elian’s double shot — that is our Hunt.'),
    },
    replies: {
      a: ['a', L('Искусство! Запомни это слово, северянка.', 'Art! Remember that word, northerner.')],
      b: ['b', L('Наверняка. Снег согласен.', 'Never misses. Snow agrees.')],
      both: ['b', L('Травля… Хорошее слово. Завтра проверим.', 'The Hunt… A good word. Tomorrow we test it.')],
    },
  },
  {
    id: 'keira_ulfa',
    a: 'keira',
    b: 'ulfa',
    lines: [
      ['a', L('Твой волк нашёл меня в тени. Меня никто не находит.', 'Your wolf found me in the shadows. Nobody finds me.')],
      ['b', L('Снег находит всех. Он просто хотел, чтобы ты его погладила.', 'Snow finds everyone. He just wanted you to pet him.')],
      ['a', L('…Он смотрит на меня. Он всё ещё смотрит.', '…He is looking at me. He is still looking.')],
    ],
    choices: {
      a: L('Кейра, это честь — Снег редко кого выбирает.', 'Keira, it is an honour — Snow rarely picks anyone.'),
      b: L('Погладь его, Кейра. Он не отстанет.', 'Pet him, Keira. He will not give up.'),
      both: L('Снег будет искать для Кейры добычу. Отличная пара.', 'Snow will hunt prey for Keira. A great pair.'),
    },
    replies: {
      a: ['a', L('Честь… Ладно. Хороший волк. Хороший.', 'An honour… Fine. Good wolf. Good.')],
      b: ['b', L('Видишь? Мягкий. Как и ты, если честно.', 'See? Soft. Like you, to be honest.')],
      both: ['a', L('Он приводит — я заканчиваю. Мне нравится этот план.', 'He finds them — I finish them. I like this plan.')],
    },
  },
];

export const CAMPFIRE_MAP: Record<string, CampScene> = Object.fromEntries(CAMPFIRE.map((c) => [c.id, c]));

/** Связки между двумя героинями (в любую сторону) — их сыгранность растёт у костра. */
export function campCombos(a: string, b: string): ComboDef['id'][] {
  const ca = HEROINE_MAP[a]?.cls;
  const cb = HEROINE_MAP[b]?.cls;
  if (!ca || !cb) return [];
  return COMBOS.filter((c) => (c.from === ca && c.to.includes(cb)) || (c.from === cb && c.to.includes(ca))).map((c) => c.id);
}
