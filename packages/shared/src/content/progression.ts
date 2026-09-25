import type { L10n, Stats } from '../types';

/** Созвездие аккаунта: 12 созвездий по 20 звёзд (240 узлов), покупаются Звёздной пылью. */
export interface ConstellationDef {
  id: string;
  name: L10n;
  /** Бонус за каждую звезду. */
  perStar: Stats;
  /** Особые бонусы за звезду. */
  special?: { offline?: number; loot?: number; inv?: number; capHours?: number };
  desc: L10n;
}

export const CONSTELLATIONS: ConstellationDef[] = [
  { id: 'shield', name: { ru: 'Щит', en: 'Shield' }, perStar: { hpPct: 0.01 }, desc: { ru: '+1% HP отряда за звезду', en: '+1% party HP per star' } },
  { id: 'sword', name: { ru: 'Меч', en: 'Sword' }, perStar: { atkPct: 0.01 }, desc: { ru: '+1% ATK отряда за звезду', en: '+1% party ATK per star' } },
  { id: 'chest', name: { ru: 'Сундук', en: 'Chest' }, perStar: {}, special: { offline: 0.02 }, desc: { ru: '+2% к офлайн-доходу за звезду', en: '+2% offline income per star' } },
  { id: 'tower', name: { ru: 'Башня', en: 'Tower' }, perStar: { defPct: 0.015 }, desc: { ru: '+1,5% DEF отряда за звезду', en: '+1.5% party DEF per star' } },
  { id: 'clover', name: { ru: 'Клевер', en: 'Clover' }, perStar: {}, special: { loot: 0.02 }, desc: { ru: '+2% к шансу редкого лута за звезду', en: '+2% rare loot chance per star' } },
  { id: 'bag', name: { ru: 'Сумка', en: 'Bag' }, perStar: {}, special: { inv: 10 }, desc: { ru: '+10 ячеек инвентаря за звезду', en: '+10 inventory slots per star' } },
  { id: 'crown', name: { ru: 'Корона', en: 'Crown' }, perStar: { critDmg: 0.02 }, desc: { ru: '+2% крит. урона за звезду', en: '+2% crit damage per star' } },
  { id: 'hourglass', name: { ru: 'Песочные часы', en: 'Hourglass' }, perStar: {}, special: { capHours: 0.3 }, desc: { ru: '+18 мин к лимиту офлайна за звезду', en: '+18 min offline cap per star' } },
  { id: 'wings', name: { ru: 'Крылья', en: 'Wings' }, perStar: { spd: 0.5 }, desc: { ru: '+0,5 SPD отряда за звезду', en: '+0.5 party SPD per star' } },
  { id: 'heart', name: { ru: 'Сердце', en: 'Heart' }, perStar: { healPower: 0.02, lifesteal: 0.002 }, desc: { ru: '+2% силы лечения за звезду', en: '+2% healing power per star' } },
  { id: 'lightning', name: { ru: 'Молния', en: 'Lightning' }, perStar: { energyRegen: 0.015, crit: 0.002 }, desc: { ru: '+1,5% регена энергии за звезду', en: '+1.5% energy regen per star' } },
  { id: 'coin', name: { ru: 'Монета', en: 'Coin' }, perStar: { goldPct: 0.03, xpPct: 0.03 }, desc: { ru: '+3% золота и опыта за звезду', en: '+3% gold and XP per star' } },
];

/** Древо Вознесения: 50 постоянных улучшений за Эфир. */
export interface AscensionUpgradeDef {
  id: string;
  name: L10n;
  desc: L10n;
  max: number;
  costBase: number;
  /** Значение за ранг. */
  per: number;
  /** Требуемый ранг другого улучшения. */
  req?: { id: string; rank: number };
}

export const ASCENSION_UPGRADES: AscensionUpgradeDef[] = [
  { id: 'gold', name: { ru: 'Жила Эфира', en: 'Aether Vein' }, desc: { ru: '+25% золота за ранг', en: '+25% gold per rank' }, max: 5, costBase: 3, per: 0.25 },
  { id: 'xp', name: { ru: 'Память Легиона', en: 'Legion Memory' }, desc: { ru: '+25% опыта за ранг', en: '+25% XP per rank' }, max: 5, costBase: 3, per: 0.25 },
  { id: 'atk', name: { ru: 'Клинок вечности', en: 'Eternal Blade' }, desc: { ru: '+20% ATK отряда за ранг', en: '+20% party ATK per rank' }, max: 5, costBase: 4, per: 0.2 },
  { id: 'hp', name: { ru: 'Щит вечности', en: 'Eternal Shield' }, desc: { ru: '+20% HP отряда за ранг', en: '+20% party HP per rank' }, max: 5, costBase: 4, per: 0.2 },
  { id: 'speed', name: { ru: 'Поток времени', en: 'Time Stream' }, desc: { ru: '+10% скорости боя и дохода за ранг', en: '+10% battle speed and income per rank' }, max: 5, costBase: 5, per: 0.1 },
  { id: 'start', name: { ru: 'Путь назад', en: 'The Way Back' }, desc: { ru: 'После Вознесения начинать дальше на 10 этапов за ранг', en: 'Start 10 stages further after Ascension per rank' }, max: 5, costBase: 6, per: 10 },
  { id: 'autoBoss', name: { ru: 'Воля Командора', en: "Commander's Will" }, desc: { ru: 'Автовызов босса этапа', en: 'Auto-summon stage boss' }, max: 1, costBase: 8, per: 1, req: { id: 'speed', rank: 1 } },
  { id: 'offline', name: { ru: 'Спящий Легион', en: 'Sleeping Legion' }, desc: { ru: '+10% к офлайн-доходу за ранг', en: '+10% offline income per rank' }, max: 5, costBase: 4, per: 0.1 },
  { id: 'loot', name: { ru: 'Благосклонность Кристалла', en: "Crystal's Favor" }, desc: { ru: '+5% к шансу редкого лута за ранг', en: '+5% rare loot chance per rank' }, max: 4, costBase: 6, per: 0.05 },
  { id: 'dust', name: { ru: 'Звёздный ветер', en: 'Stellar Wind' }, desc: { ru: '+20% звёздной пыли и пыли заточки за ранг', en: '+20% star dust and enhance dust per rank' }, max: 4, costBase: 5, per: 0.2 },
  { id: 'crit', name: { ru: 'Острота судьбы', en: 'Edge of Fate' }, desc: { ru: '+2% шанса крита отряду за ранг', en: '+2% party crit chance per rank' }, max: 3, costBase: 8, per: 0.02 },
  { id: 'ether', name: { ru: 'Круговорот', en: 'Cycle' }, desc: { ru: '+10% Эфира за Вознесение за ранг', en: '+10% Ether per Ascension per rank' }, max: 3, costBase: 10, per: 0.1 },
];
export const ASC_MAP: Record<string, AscensionUpgradeDef> = Object.fromEntries(ASCENSION_UPGRADES.map((u) => [u.id, u]));

export function ascensionCost(def: AscensionUpgradeDef, rank: number): number {
  return Math.ceil(def.costBase * Math.pow(rank + 1, 1.5));
}

/** Фрагменты сюжета, открываемые Вознесениями и прохождением актов. */
export const LORE: { id: string; title: L10n; text: L10n }[] = [
  { id: 'prologue', title: { ru: 'Пролог: Кристалл Эфира', en: 'Prologue: The Aether Crystal' }, text: { ru: 'Мир Аэрис держался на Небесном Троне и десяти Печатях Света. Богиня Хаоса Никта разбила Трон, и осколки Печатей вонзились в сердца владычиц. Ты — Командор, последний хранитель Кристалла Эфира. Кристалл зовёт души павших героинь. Собери Легион.', en: 'The world of Aeris rested upon the Celestial Throne and ten Seals of Light. Nyx, Goddess of Chaos, shattered the Throne, and shards of the Seals pierced the hearts of the sovereigns. You are the Commander, last keeper of the Aether Crystal. The Crystal calls to the souls of fallen heroines. Gather the Legion.' } },
  { id: 'asc1', title: { ru: 'Цикл I: Эхо времени', en: 'Cycle I: Echo of Time' }, text: { ru: 'Кристалл отмотал время назад. Легион помнит всё — и владычицы, кажется, тоже начинают вспоминать.', en: 'The Crystal turned back time. The Legion remembers everything — and the sovereigns seem to begin remembering too.' } },
  { id: 'asc2', title: { ru: 'Цикл II: Шёпот Печатей', en: 'Cycle II: Whisper of the Seals' }, text: { ru: 'Каждая освобождённая Печать поёт одну и ту же ноту. Лира утверждает, что это имя.', en: 'Every freed Seal sings the same note. Lira insists it is a name.' } },
  { id: 'asc3', title: { ru: 'Цикл III: Первая валькирия', en: 'Cycle III: The First Valkyrie' }, text: { ru: 'В архивах Трона нет ни одного упоминания о Никте. Кто-то очень старался её забыть.', en: 'The Throne archives hold not a single mention of Nyx. Someone tried very hard to forget her.' } },
  { id: 'asc4', title: { ru: 'Цикл IV: Цена света', en: 'Cycle IV: The Price of Light' }, text: { ru: 'Серафина признаётся: Печати Света были выкованы из крыльев первой валькирии.', en: 'Seraphina confesses: the Seals of Light were forged from the wings of the first valkyrie.' } },
  { id: 'asc5', title: { ru: 'Цикл V: Предательство', en: 'Cycle V: Betrayal' }, text: { ru: 'Никта защитила Трон в великой войне, а Трон запер её в Пустоте, чтобы никто не узнал цену победы.', en: 'Nyx defended the Throne in the great war, and the Throne sealed her in the Void so no one would learn the price of victory.' } },
  { id: 'asc6', title: { ru: 'Цикл VI: Трещины', en: 'Cycle VI: Cracks' }, text: { ru: 'С каждым циклом Кристалл трескается сильнее. Он не бесконечен — как и терпение Никты.', en: 'With every cycle the Crystal cracks further. It is not endless — nor is Nyx\'s patience.' } },
  { id: 'asc7', title: { ru: 'Цикл VII: Выбор', en: 'Cycle VII: A Choice' }, text: { ru: 'Легион может снова разбить Никту — или выслушать её. Командору предстоит решить, чьей правде верить.', en: 'The Legion can defeat Nyx again — or listen to her. The Commander must decide whose truth to believe.' } },
  { id: 'act10', title: { ru: 'Финал: Трон Пустоты', en: 'Finale: The Void Throne' }, text: { ru: 'Никта пала, но не погибла. «Я была первой из вас», — шепчет она. Её история продолжится в следующих сезонах.', en: 'Nyx has fallen, but not perished. "I was the first of you," she whispers. Her story continues in the seasons to come.' } },
];
