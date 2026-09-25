import type { Element, L10n } from '../types';
import type { Look } from './heroines';
import type { SkillDef } from './effects';

export type EnemyRole = 'tank' | 'brute' | 'ranged' | 'caster' | 'healer' | 'rogue';

export interface EnemyDef {
  id: string;
  act: number;
  name: L10n;
  role: EnemyRole;
  element: Element;
  look: Look;
  kind: 'normal' | 'mini' | 'boss' | 'summon';
  skills: string[];
  mechanic?: BossMechanic;
  /** id героини, если босс становится играбельным. */
  hero?: string;
  title?: L10n;
  /** Колосс Разлома: гигантский босс мирового режима, крупнее обычных боссов, со своей анимацией. */
  colossus?: boolean;
}

export type BossMechanic =
  | 'vines'
  | 'sandstorm'
  | 'freeze'
  | 'tideShield'
  | 'bloodThirst'
  | 'fireField'
  | 'skyborne'
  | 'phases'
  | 'raiseDead'
  | 'mirror';

export const MECHANIC_TEXT: Record<BossMechanic, L10n> = {
  vines: {
    ru: 'Призывает лозы: если не убить их за 10 с, они лечат её',
    en: 'Summons vines: if not killed within 10s they heal her',
  },
  sandstorm: { ru: 'Песчаная буря: −50% точности отряда каждые 15 с', en: 'Sandstorm: −50% party accuracy every 15s' },
  freeze: {
    ru: 'Замораживает героиню; помогают огонь или очищение',
    en: 'Freezes a heroine; fire or cleansing helps',
  },
  tideShield: {
    ru: 'Щит приливов пробивается только умениями и ультимейтами',
    en: 'Tide shield can only be broken by skills and ultimates',
  },
  bloodThirst: {
    ru: 'Вампиризм 100%, сила растёт каждые 10 с — наказывает медленные отряды',
    en: '100% lifesteal, grows stronger every 10s — punishes slow parties',
  },
  fireField: { ru: 'Огненное поле: урон растёт каждый ход', en: 'Fire field: damage increases every turn' },
  skyborne: {
    ru: 'Сражается с воздуха: ближний бой наносит вдвое меньше урона',
    en: 'Fights from the air: melee deals half damage',
  },
  phases: {
    ru: 'Три фазы, в каждой новая слабость к стихии',
    en: 'Three phases, each with a new elemental weakness',
  },
  raiseDead: {
    ru: 'Воскрешает врагов, если не добить её за 3 хода',
    en: 'Raises fallen enemies unless finished within 3 turns',
  },
  mirror: { ru: 'Копирует сильнейшую героиню игрока', en: "Copies the player's strongest heroine" },
};

export interface ActDef {
  id: number;
  name: L10n;
  element: Element;
  enemies: string[];
  minis: [string, string, string];
  boss: string;
  bg: { sky: [string, string]; far: string; mid: string; near: string; weather: 'leaves' | 'sand' | 'snow' | 'bubbles' | 'ash' | 'embers' | 'clouds' | 'sparks' | 'wisps' | 'void' };
  sets: [string, string];
}

const L = (
  hair: string,
  style: Look['style'],
  skin: string,
  outfit: string,
  trim: string,
  acc: Look['acc'] = 'none',
  extra: Look['extra'] = 'none',
  accColor?: string,
  eyes = '#E03A3A',
): Look => ({ hair, style, skin, eyes, outfit, trim, acc, accColor, extra });

const SKIN = { fair: '#F4D3B8', tan: '#C98E62', pale: '#E8DCE8', green: '#A9D19A', blue: '#9FC4E0', grey: '#9A96A8', bone: '#E6E0D0', red: '#D86A5A', ash: '#B8B0C8', gold: '#E6C87A', void: '#6A5A8A' };

function e(
  id: string,
  act: number,
  ru: string,
  en: string,
  role: EnemyRole,
  element: Element,
  look: Look,
): EnemyDef {
  return { id, act, name: { ru, en }, role, element, look, kind: 'normal', skills: [`enemy.${role}`] };
}

function mb(id: string, act: number, ru: string, en: string, role: EnemyRole, element: Element, skill: string, look: Look): EnemyDef {
  return { id, act, name: { ru, en }, role, element, look, kind: 'mini', skills: [`enemy.${role}`, skill] };
}

export const ENEMIES: EnemyDef[] = [
  // ——— Акт 1: Изумрудная опушка ———
  e('a1_sentinel', 1, 'Дриада-стражница', 'Dryad Sentinel', 'tank', 'nature', L('#3F8A34', 'wild', SKIN.green, '#4A6A3A', '#8C6A3A', 'flower', 'vines', '#F2E6D8')),
  e('a1_bandit', 1, 'Разбойница', 'Bandit', 'brute', 'fire', L('#8A3A1E', 'short', SKIN.tan, '#5A4A3A', '#B8322C', 'bandana', 'none', '#B8322C')),
  e('a1_nymph_archer', 1, 'Нимфа-лучница', 'Nymph Archer', 'ranged', 'nature', L('#A0C060', 'ponytail', SKIN.fair, '#6A8A4A', '#F2E6D8', 'elfEars')),
  e('a1_brook_nymph', 1, 'Нимфа ручья', 'Brook Nymph', 'caster', 'water', L('#6FD0E0', 'long', SKIN.blue, '#3A6A8A', '#CFEFFF', 'flower', 'none', '#CFEFFF')),
  e('a1_flower_nymph', 1, 'Цветочная нимфа', 'Blossom Nymph', 'healer', 'nature', L('#F4B8CC', 'bun', SKIN.fair, '#E6F2D8', '#4FBF5A', 'flower', 'none', '#F2A0B0')),
  e('a1_cutthroat', 1, 'Разбойница-ножевщица', 'Cutthroat', 'rogue', 'dark', L('#2A2036', 'bob', SKIN.fair, '#2A2A2A', '#9B4DE0', 'mask', 'none', '#2A2A2A')),
  mb('a1_mb1', 1, 'Атаманша Рыжая Мэг', 'Red Meg the Chieftain', 'brute', 'fire', 'mb.enrage', L('#E0532A', 'wild', SKIN.tan, '#6A2A1E', '#E0A13A', 'bandana', 'none', '#E0A13A')),
  mb('a1_mb2', 1, 'Древняя дриада Ольха', 'Elder Dryad Alder', 'healer', 'nature', 'mb.heal', L('#6A4A2A', 'wild', SKIN.green, '#3F5A2A', '#C0A060', 'crown', 'vines', '#8C6A3A')),
  mb('a1_mb3', 1, 'Нимфа-чародейка Ирида', 'Iris the Nymph Witch', 'caster', 'water', 'mb.storm', L('#8AE0F0', 'long', SKIN.blue, '#2E5A7A', '#F2E6D8', 'tiara', 'none', '#CFEFFF')),

  // ——— Акт 2: Пустыня миражей ———
  e('a2_lamia_guard', 2, 'Ламия-стражница', 'Lamia Guard', 'tank', 'fire', L('#1E1A1A', 'bob', SKIN.tan, '#C0A060', '#3D7BE0', 'helmet', 'snake', '#E0A13A')),
  e('a2_lamia_warrior', 2, 'Ламия-воительница', 'Lamia Warrior', 'brute', 'fire', L('#3A2A1E', 'long', SKIN.tan, '#8A5A2A', '#E0A13A', 'tiara', 'snake', '#E0A13A')),
  e('a2_oasis_archer', 2, 'Лучница оазиса', 'Oasis Archer', 'ranged', 'water', L('#1E1A1A', 'ponytail', SKIN.tan, '#E6D0A0', '#3D9BE0', 'veil', 'none', '#E6D0A0')),
  e('a2_scorpion_priestess', 2, 'Скорпионья жрица', 'Scorpion Priestess', 'caster', 'fire', L('#6A1E1E', 'long', SKIN.tan, '#3A2A1E', '#E0532A', 'tiara', 'scorpion', '#E0532A')),
  e('a2_mirage_priestess', 2, 'Жрица миража', 'Mirage Priestess', 'healer', 'light', L('#F2E3A0', 'bun', SKIN.gold, '#F2E6D8', '#E0A13A', 'veil', 'none', '#F2F0E6')),
  e('a2_sand_spirit', 2, 'Песчаный дух', 'Sand Spirit', 'rogue', 'dark', L('#E6C87A', 'wild', SKIN.gold, '#C0A060', '#8A5A2A', 'mask', 'none', '#8A5A2A', '#F2D46B')),
  mb('a2_mb1', 2, 'Ламия-матрона', 'Lamia Matron', 'tank', 'fire', 'mb.stomp', L('#1E1A1A', 'long', SKIN.tan, '#C0A060', '#E0532A', 'crown', 'snake', '#E0A13A')),
  mb('a2_mb2', 2, 'Верховная скорпионья жрица', 'High Scorpion Priestess', 'caster', 'fire', 'mb.curse', L('#8A1E1E', 'long', SKIN.tan, '#1E1A1A', '#E0532A', 'crown', 'scorpion', '#E0532A')),
  mb('a2_mb3', 2, 'Джинния бури', 'Storm Djinn', 'rogue', 'light', 'mb.volley', L('#6FD0E0', 'wild', SKIN.blue, '#3D7BE0', '#F2D46B', 'tiara', 'none', '#F2D46B')),

  // ——— Акт 3: Ледяной пик ———
  e('a3_yeti', 3, 'Йети-воительница', 'Yeti Warrior', 'tank', 'water', L('#F2F0E6', 'wild', SKIN.fair, '#E6E6F0', '#9FC4E0', 'catEars', 'none', '#F2F0E6', '#3D7BE0')),
  e('a3_ice_berserker', 3, 'Ледяная берсерка', 'Frost Berserker', 'brute', 'water', L('#CFEFFF', 'braid', SKIN.pale, '#4A5A6A', '#6FD0E0', 'horns', 'none', '#E6DCC0', '#6FD0FF')),
  e('a3_pass_archer', 3, 'Лучница перевала', 'Pass Archer', 'ranged', 'water', L('#8A6A4A', 'ponytail', SKIN.fair, '#6A5A4A', '#F2F0E6', 'hood', 'none', '#E6E6F0')),
  e('a3_snow_witch', 3, 'Снежная ведьма', 'Snow Witch', 'caster', 'water', L('#E6F2FF', 'long', SKIN.pale, '#2E5A90', '#CFEFFF', 'witchHat', 'none', '#2E4A7A', '#6FD0FF')),
  e('a3_blizzard_shaman', 3, 'Шаманка метели', 'Blizzard Shaman', 'healer', 'light', L('#F2E3A0', 'braid', SKIN.tan, '#8A6A4A', '#F2F0E6', 'horns', 'none', '#E6DCC0')),
  e('a3_harpy', 3, 'Гарпия бурана', 'Blizzard Harpy', 'rogue', 'nature', L('#9FC4E0', 'wild', SKIN.fair, '#6A8AA0', '#F2F0E6', 'none', 'wings', undefined, '#F2D46B')),
  mb('a3_mb1', 3, 'Вожак йети', 'Yeti Chieftain', 'brute', 'water', 'mb.stomp', L('#F2F0E6', 'wild', SKIN.fair, '#D0D8E0', '#3D7BE0', 'crown', 'none', '#9FC4E0', '#3D7BE0')),
  mb('a3_mb2', 3, 'Королева гарпий', 'Harpy Queen', 'rogue', 'nature', 'mb.volley', L('#6A8AA0', 'wild', SKIN.fair, '#3A5A7A', '#F2D46B', 'crown', 'wings', '#F2D46B', '#F2D46B')),
  mb('a3_mb3', 3, 'Старшая снежная ведьма', 'Elder Snow Witch', 'caster', 'water', 'mb.freeze', L('#FFFFFF', 'long', SKIN.pale, '#1E3A6A', '#CFEFFF', 'witchHat', 'none', '#1E2A4A', '#6FD0FF')),

  // ——— Акт 4: Затонувший храм ———
  e('a4_mermaid_guard', 4, 'Русалка-стража', 'Mermaid Guard', 'tank', 'water', L('#3A8A9A', 'long', SKIN.blue, '#3A6A8A', '#E0A13A', 'helmet', 'fishTail', '#E0A13A')),
  e('a4_krakeness', 4, 'Кракенша', 'Krakeness', 'brute', 'water', L('#8A3A6A', 'wild', SKIN.red, '#5A1E3A', '#E07A6A', 'none', 'tail')),
  e('a4_coral_archer', 4, 'Коралловая лучница', 'Coral Archer', 'ranged', 'nature', L('#E07A6A', 'ponytail', SKIN.fair, '#E07A6A', '#F2E6D8', 'flower', 'fishTail', '#F2E6D8')),
  e('a4_siren', 4, 'Сирена', 'Siren', 'caster', 'water', L('#6FB0E0', 'long', SKIN.fair, '#2E5A7A', '#CFEFFF', 'tiara', 'fishTail', '#F2F0E6', '#3D7BE0')),
  e('a4_deep_priestess', 4, 'Жрица глубин', 'Priestess of the Deep', 'healer', 'dark', L('#1E3A4A', 'long', SKIN.blue, '#1E2A3A', '#6FD0E0', 'veil', 'none', '#1E3A4A', '#6FFFD0')),
  e('a4_moray', 4, 'Мурена', 'Moray', 'rogue', 'dark', L('#3A4A2A', 'bob', SKIN.green, '#2A3A2A', '#E0A13A', 'mask', 'fishTail', '#2A3A2A')),
  mb('a4_mb1', 4, 'Верховная сирена', 'High Siren', 'caster', 'water', 'mb.charm', L('#9FE0FF', 'long', SKIN.fair, '#1E4A6A', '#F2D46B', 'crown', 'fishTail', '#F2D46B', '#3D7BE0')),
  mb('a4_mb2', 4, 'Кракенша-матерь', 'Kraken Mother', 'brute', 'water', 'mb.summon', L('#6A1E4A', 'wild', SKIN.red, '#3A0E2A', '#E07A6A', 'crown', 'tail', '#E07A6A')),
  mb('a4_mb3', 4, 'Страж храма', 'Temple Warden', 'tank', 'dark', 'mb.stomp', L('#2A4A5A', 'long', SKIN.blue, '#2A3A4A', '#E0A13A', 'helmet', 'fishTail', '#3A6A8A')),

  // ——— Акт 5: Проклятый город ———
  e('a5_gargoyle', 5, 'Горгулья', 'Gargoyle', 'tank', 'dark', L('#6A6A7A', 'short', SKIN.grey, '#5A5A6A', '#8A8A9A', 'horns', 'darkWings', '#4A4A5A', '#F2D46B')),
  e('a5_vampiress', 5, 'Вампиресса', 'Vampiress', 'brute', 'dark', L('#1E1420', 'long', SKIN.pale, '#3A0E1A', '#E03A3A', 'none', 'none')),
  e('a5_mad_hunter', 5, 'Безумная охотница', 'Mad Hunter', 'ranged', 'light', L('#8A6A4A', 'short', SKIN.fair, '#3A2A2A', '#C0A060', 'hood', 'none', '#2A1E1E')),
  e('a5_ghost_bride', 5, 'Призрачная невеста', 'Ghost Bride', 'caster', 'dark', L('#E6E0F0', 'long', SKIN.pale, '#E6E0F0', '#9B4DE0', 'veil', 'none', '#F2F0E6', '#6FFFD0')),
  e('a5_blood_nun', 5, 'Кровавая монахиня', 'Blood Nun', 'healer', 'dark', L('#2A1E1E', 'long', SKIN.pale, '#1E1A1A', '#E03A3A', 'veil', 'none', '#1E1A1A')),
  e('a5_night_vampiress', 5, 'Ночная вампиресса', 'Night Vampiress', 'rogue', 'dark', L('#3A1E3A', 'twintails', SKIN.pale, '#1E1420', '#E03A3A', 'none', 'darkWings')),
  mb('a5_mb1', 5, 'Старшая горгулья', 'Elder Gargoyle', 'tank', 'dark', 'mb.stomp', L('#4A4A5A', 'short', SKIN.grey, '#3A3A4A', '#E03A3A', 'horns', 'darkWings', '#2A2A3A', '#E03A3A')),
  mb('a5_mb2', 5, 'Невеста в чёрном', 'Bride in Black', 'caster', 'dark', 'mb.curse', L('#1E1A2A', 'long', SKIN.pale, '#1E1A2A', '#9B4DE0', 'veil', 'none', '#1E1A2A', '#6FFFD0')),
  mb('a5_mb3', 5, 'Вампиресса-маркиза', 'Vampire Marquise', 'brute', 'dark', 'mb.drain', L('#6A1E3A', 'long', SKIN.pale, '#3A0E1A', '#E0A13A', 'tiara', 'darkWings', '#E0A13A')),

  // ——— Акт 6: Пепельный вулкан ———
  e('a6_magma_warden', 6, 'Магмовая стражница', 'Magma Warden', 'tank', 'fire', L('#2A1E1E', 'short', SKIN.red, '#3A2A2A', '#FF7A2A', 'helmet', 'none', '#3A2A2A', '#FFE040')),
  e('a6_demoness', 6, 'Демонесса', 'Demoness', 'brute', 'fire', L('#B8322C', 'wild', SKIN.red, '#2A1E1E', '#F08A24', 'horns', 'tail', '#2A1E1E', '#FFE040')),
  e('a6_salamander', 6, 'Огненная саламандра', 'Fire Salamander', 'ranged', 'fire', L('#F08A24', 'ponytail', SKIN.tan, '#8A2A1E', '#FFE040', 'none', 'tail')),
  e('a6_pyromancer', 6, 'Огненная колдунья', 'Pyromancer', 'caster', 'fire', L('#FF7A2A', 'long', SKIN.fair, '#3A1E1E', '#FF7A2A', 'witchHat', 'none', '#2A1414', '#FFE040')),
  e('a6_ash_priestess', 6, 'Жрица пепла', 'Ash Priestess', 'healer', 'fire', L('#8A8A8A', 'long', SKIN.ash, '#3A3A3A', '#F08A24', 'veil', 'none', '#3A3A3A', '#F08A24')),
  e('a6_succubus', 6, 'Суккуба-воительница', 'Succubus Warrior', 'rogue', 'dark', L('#6A1E6A', 'long', SKIN.pale, '#2A1428', '#E03A8A', 'horns', 'darkWings', '#2A1E22', '#E040FF')),
  mb('a6_mb1', 6, 'Демонесса-палач', 'Demon Executioner', 'brute', 'fire', 'mb.enrage', L('#1E1414', 'wild', SKIN.red, '#1E1414', '#E03A3A', 'horns', 'tail', '#1E1414', '#FFE040')),
  mb('a6_mb2', 6, 'Саламандра-матриарх', 'Salamander Matriarch', 'caster', 'fire', 'mb.storm', L('#FFB040', 'long', SKIN.tan, '#8A2A1E', '#FFE040', 'crown', 'tail', '#FFE040')),
  mb('a6_mb3', 6, 'Суккуба-генерал', 'Succubus General', 'rogue', 'dark', 'mb.charm', L('#4A0E4A', 'long', SKIN.pale, '#1E0A1E', '#E03A8A', 'horns', 'darkWings', '#1E0A1E', '#E040FF')),

  // ——— Акт 7: Небесный архипелаг ———
  e('a7_fallen_shield', 7, 'Падшая щитоносица', 'Fallen Shieldmaiden', 'tank', 'light', L('#C8C0B0', 'braid', SKIN.fair, '#8A8A9A', '#E0A13A', 'helmet', 'darkWings', '#8A8A9A', '#E03A3A')),
  e('a7_fallen_valkyrie', 7, 'Падшая валькирия', 'Fallen Valkyrie', 'brute', 'dark', L('#E6E0D0', 'long', SKIN.pale, '#3A3A4A', '#E03A3A', 'helmet', 'darkWings', '#3A3A4A', '#E03A3A')),
  e('a7_harpy_archer', 7, 'Гарпия-лучница', 'Harpy Archer', 'ranged', 'nature', L('#8A6A4A', 'wild', SKIN.fair, '#6A5A3A', '#F2D46B', 'none', 'wings', undefined, '#F2D46B')),
  e('a7_cloud_mage', 7, 'Облачная чародейка', 'Cloud Mage', 'caster', 'light', L('#F2F0FF', 'bun', SKIN.fair, '#9FC4E0', '#FFFFFF', 'tiara', 'none', '#F2D46B', '#3D9BE0')),
  e('a7_sky_priestess', 7, 'Небесная жрица', 'Sky Priestess', 'healer', 'light', L('#FFF2C0', 'long', SKIN.fair, '#FFFFFF', '#E0A13A', 'halo', 'wings', '#FFE8A0', '#5AA0E0')),
  e('a7_griffon_rider', 7, 'Грифонья наездница', 'Griffon Rider', 'rogue', 'light', L('#C06A2A', 'ponytail', SKIN.tan, '#8A6A4A', '#F2D46B', 'helmet', 'wings', '#C0A060')),
  mb('a7_mb1', 7, 'Капитан наездниц', 'Rider Captain', 'rogue', 'light', 'mb.volley', L('#8A3A1E', 'ponytail', SKIN.tan, '#6A4A2A', '#E0A13A', 'helmet', 'wings', '#E0A13A')),
  mb('a7_mb2', 7, 'Королева гарпий неба', 'Sky Harpy Queen', 'ranged', 'nature', 'mb.storm', L('#4A6A3A', 'wild', SKIN.fair, '#3A5A2A', '#F2D46B', 'crown', 'wings', '#F2D46B', '#F2D46B')),
  mb('a7_mb3', 7, 'Падшая знаменосица', 'Fallen Standard-Bearer', 'tank', 'dark', 'mb.enrage', L('#F2F0E6', 'braid', SKIN.pale, '#2A2A3A', '#E03A3A', 'helmet', 'darkWings', '#2A2A3A', '#E03A3A')),

  // ——— Акт 8: Механическая цитадель ———
  e('a8_golem', 8, 'Голем-стражница', 'Golem Warden', 'tank', 'light', L('#8A8A9A', 'short', SKIN.grey, '#6A6A7A', '#E0A13A', 'helmet', 'gears', '#8A8A9A', '#40E0FF')),
  e('a8_automaton', 8, 'Кукла-автоматон', 'Automaton Doll', 'brute', 'light', L('#C0C8D0', 'twintails', SKIN.bone, '#6A5A7A', '#E0A13A', 'none', 'gears', undefined, '#40E0FF')),
  e('a8_gnome_engineer', 8, 'Инженер-гномка', 'Gnome Engineer', 'ranged', 'fire', L('#E0532A', 'twintails', SKIN.fair, '#6A4A2A', '#E0A13A', 'bandana', 'none', '#3A3A3A', '#3D7BE0')),
  e('a8_tesla', 8, 'Тесла-гномка', 'Tesla Gnome', 'caster', 'light', L('#40E0FF', 'bob', SKIN.fair, '#3A3A5A', '#40E0FF', 'none', 'gears')),
  e('a8_mechanic', 8, 'Ремонтница', 'Mechanic', 'healer', 'fire', L('#8A5A2A', 'ponytail', SKIN.tan, '#5A4A3A', '#F08A24', 'bandana', 'none', '#F08A24')),
  e('a8_killer_doll', 8, 'Кукла-убийца', 'Killer Doll', 'rogue', 'dark', L('#2A2036', 'bob', SKIN.bone, '#1E1A2A', '#E03A3A', 'none', 'gears', undefined, '#E03A3A')),
  mb('a8_mb1', 8, 'Паровой голем', 'Steam Golem', 'tank', 'fire', 'mb.stomp', L('#6A4A2A', 'short', SKIN.grey, '#5A3A2A', '#F08A24', 'helmet', 'gears', '#6A4A2A', '#F08A24')),
  mb('a8_mb2', 8, 'Главный инженер Тинкер', 'Chief Engineer Tinker', 'ranged', 'fire', 'mb.summon', L('#F0A030', 'twintails', SKIN.fair, '#3A3A3A', '#E0A13A', 'bandana', 'gears', '#E0A13A', '#3D7BE0')),
  mb('a8_mb3', 8, 'Заводная балерина', 'Clockwork Ballerina', 'rogue', 'light', 'mb.volley', L('#F2E0F0', 'bun', SKIN.bone, '#F2B0D0', '#E0A13A', 'tiara', 'gears', '#E0A13A', '#40E0FF')),

  // ——— Акт 9: Лунный некрополь ———
  e('a9_bone_warden', 9, 'Костяная стражница', 'Bone Warden', 'tank', 'dark', L('#E6E0D0', 'long', SKIN.bone, '#3A3A3A', '#6FFFD0', 'helmet', 'none', '#6A6A6A', '#6FFFD0')),
  e('a9_bone_maiden', 9, 'Костяная дева', 'Bone Maiden', 'brute', 'dark', L('#E6E0D0', 'wild', SKIN.bone, '#2A2A2A', '#6FFFD0', 'none', 'none', undefined, '#6FFFD0')),
  e('a9_moon_archer', 9, 'Призрачная лучница', 'Spectral Archer', 'ranged', 'light', L('#C8E0FF', 'ponytail', SKIN.blue, '#3A4A6A', '#C8E0FF', 'hood', 'none', '#3A4A6A', '#FFFFFF')),
  e('a9_banshee', 9, 'Банши', 'Banshee', 'caster', 'dark', L('#E6F0FF', 'long', SKIN.blue, '#9FB0D0', '#FFFFFF', 'veil', 'none', '#E6F0FF', '#FFFFFF')),
  e('a9_lich', 9, 'Лич', 'Lich', 'healer', 'dark', L('#C8C0E0', 'long', SKIN.ash, '#1E1A2A', '#6FFFD0', 'crown', 'none', '#6A6A7A', '#6FFFD0')),
  e('a9_crypt_shade', 9, 'Тень склепа', 'Crypt Shade', 'rogue', 'dark', L('#1E1A2A', 'bob', SKIN.void, '#120E1A', '#9B4DE0', 'hood', 'none', '#120E1A', '#E040FF')),
  mb('a9_mb1', 9, 'Банши-плакальщица', 'Wailing Banshee', 'caster', 'dark', 'mb.curse', L('#FFFFFF', 'long', SKIN.blue, '#C8D8F0', '#9B4DE0', 'veil', 'none', '#FFFFFF', '#FFFFFF')),
  mb('a9_mb2', 9, 'Лич-советница', 'Lich Counselor', 'healer', 'dark', 'mb.heal', L('#8A80A0', 'long', SKIN.ash, '#1E1A2A', '#6FFFD0', 'crown', 'none', '#6FFFD0', '#6FFFD0')),
  mb('a9_mb3', 9, 'Костяная невеста', 'Bone Bride', 'brute', 'dark', 'mb.drain', L('#F2F0E6', 'long', SKIN.bone, '#E6E0F0', '#6FFFD0', 'veil', 'none', '#F2F0E6', '#6FFFD0')),

  // ——— Акт 10: Трон Пустоты ———
  e('a10_chaos_guard', 10, 'Страж хаоса', 'Chaos Warden', 'tank', 'dark', L('#2A1A3A', 'wild', SKIN.void, '#1A1024', '#E040FF', 'horns', 'darkWings', '#1A1024', '#E040FF')),
  e('a10_chaos_spawn', 10, 'Порождение хаоса', 'Chaos Spawn', 'brute', 'fire', L('#6A1E3A', 'wild', SKIN.void, '#2A0E1A', '#FF7A2A', 'horns', 'tail', '#1A1024', '#FFE040')),
  e('a10_dark_archer', 10, 'Тёмный двойник лучницы', 'Dark Archer Double', 'ranged', 'dark', L('#2A2A2A', 'ponytail', SKIN.void, '#1A1A1A', '#E040FF', 'hood', 'none', '#1A1A1A', '#E040FF')),
  e('a10_dark_mage', 10, 'Тёмный двойник волшебницы', 'Dark Mage Double', 'caster', 'dark', L('#3A1A1A', 'long', SKIN.void, '#1A1020', '#E040FF', 'witchHat', 'none', '#0E0A12', '#E040FF')),
  e('a10_dark_priestess', 10, 'Тёмный двойник жрицы', 'Dark Priestess Double', 'healer', 'dark', L('#2A2A3A', 'long', SKIN.void, '#1A1A24', '#E040FF', 'veil', 'none', '#1A1A24', '#E040FF')),
  e('a10_dark_assassin', 10, 'Тёмный двойник ассасина', 'Dark Assassin Double', 'rogue', 'dark', L('#E0E0E0', 'bob', SKIN.void, '#0E0A12', '#E040FF', 'mask', 'none', '#0E0A12', '#E040FF')),
  mb('a10_mb1', 10, 'Вестница Хаоса', 'Herald of Chaos', 'caster', 'dark', 'mb.storm', L('#4A1A6A', 'long', SKIN.void, '#1A0A24', '#E040FF', 'halo', 'darkWings', '#6A1E8A', '#E040FF')),
  mb('a10_mb2', 10, 'Искажённая валькирия', 'Twisted Valkyrie', 'brute', 'dark', 'mb.enrage', L('#F2F0E6', 'braid', SKIN.void, '#2A2A3A', '#E040FF', 'helmet', 'darkWings', '#2A2A3A', '#E040FF')),
  mb('a10_mb3', 10, 'Страж Трона', 'Throne Guardian', 'tank', 'light', 'mb.stomp', L('#FFE8A0', 'long', SKIN.gold, '#6A5A3A', '#E040FF', 'crown', 'wings', '#E0A13A', '#E040FF')),
  // ——— Колоссы Разлома (мировой босс) ———
  { id: 'colossus_pyra', act: 6, name: { ru: 'Пира, Колосс Пламени', en: 'Pyra, Colossus of Flame' }, title: { ru: 'Колосс Пламени', en: 'Colossus of Flame' }, role: 'brute', element: 'fire', kind: 'boss', colossus: true, mechanic: 'fireField', skills: ['enemy.brute', 'mb.enrage'], look: { ...L('#FF5A1E', 'wild', SKIN.red, '#8A1E14', '#FFC24A', 'horns', 'tail', '#2A1010', '#FFE040'), wear: 'dancer' } },
  { id: 'colossus_tidea', act: 4, name: { ru: 'Тидея, Колосс Глубин', en: 'Tidea, Colossus of the Deep' }, title: { ru: 'Колосс Глубин', en: 'Colossus of the Deep' }, role: 'caster', element: 'water', kind: 'boss', colossus: true, mechanic: 'freeze', skills: ['enemy.caster', 'mb.storm'], look: { ...L('#3AE0E0', 'long', SKIN.blue, '#0E4A7A', '#E6F6FF', 'crown', 'fishTail', '#9FE0FF', '#7AF0FF'), wear: 'swim3' } },
  { id: 'colossus_verda', act: 1, name: { ru: 'Верда, Колосс Чащи', en: 'Verda, Colossus of the Thicket' }, title: { ru: 'Колосс Чащи', en: 'Colossus of the Thicket' }, role: 'tank', element: 'nature', kind: 'boss', colossus: true, mechanic: 'vines', skills: ['enemy.tank', 'mb.heal'], look: { ...L('#4ABF3A', 'wild', SKIN.green, '#C0306A', '#F2D46B', 'flower', 'vines', '#F4B8CC', '#F2D46B'), wear: 'swim' } },
  { id: 'colossus_sola', act: 7, name: { ru: 'Сола, Колосс Зари', en: 'Sola, Colossus of Daybreak' }, title: { ru: 'Колосс Зари', en: 'Colossus of Daybreak' }, role: 'caster', element: 'light', kind: 'boss', colossus: true, mechanic: 'skyborne', skills: ['enemy.caster', 'mb.storm'], look: { ...L('#FFF0B0', 'long', SKIN.gold, '#E6B23A', '#FFFFFF', 'halo', 'wings', '#FFE8A0', '#FFB020'), wear: 'regalia' } },
  { id: 'colossus_umbra', act: 10, name: { ru: 'Умбра, Колосс Бездны', en: 'Umbra, Colossus of the Abyss' }, title: { ru: 'Колосс Бездны', en: 'Colossus of the Abyss' }, role: 'rogue', element: 'dark', kind: 'boss', colossus: true, mechanic: 'bloodThirst', skills: ['enemy.rogue', 'mb.enrage'], look: { ...L('#3A1A5A', 'long', SKIN.void, '#120A1A', '#E040FF', 'horns', 'darkWings', '#2A1438', '#FF40C0'), wear: 'lace4' } },
];

/** Боссы актов — владычицы. Внешность берётся из играбельной версии. */
export const ACT_BOSSES: EnemyDef[] = [
  { id: 'boss_sylvana', act: 1, hero: 'sylvana', name: { ru: 'Сильвана', en: 'Sylvana' }, title: { ru: 'Дриада-матриарх', en: 'Dryad Matriarch' }, role: 'healer', element: 'nature', kind: 'boss', mechanic: 'vines', skills: ['boss.thornWhip', 'boss.entangle', 'boss.ultNature'], look: null as unknown as Look },
  { id: 'boss_nefertari', act: 2, hero: 'nefertari', name: { ru: 'Нефертари', en: 'Nefertari' }, title: { ru: 'Песчаная королева', en: 'Sand Queen' }, role: 'caster', element: 'fire', kind: 'boss', mechanic: 'sandstorm', skills: ['boss.sunBlast', 'boss.curseOfSands', 'boss.ultFire'], look: null as unknown as Look },
  { id: 'boss_skadi', act: 3, hero: 'skadi', name: { ru: 'Скади', en: 'Skadi' }, title: { ru: 'Зимняя императрица', en: 'Winter Empress' }, role: 'ranged', element: 'water', kind: 'boss', mechanic: 'freeze', skills: ['boss.frostArrow', 'boss.hailstorm', 'boss.ultWater'], look: null as unknown as Look },
  { id: 'boss_thalassia', act: 4, hero: 'thalassia', name: { ru: 'Талассия', en: 'Thalassia' }, title: { ru: 'Морская ведьма', en: 'Sea Witch' }, role: 'caster', element: 'water', kind: 'boss', mechanic: 'tideShield', skills: ['boss.tidalWave', 'boss.drown', 'boss.ultWater'], look: null as unknown as Look },
  { id: 'boss_carmilla', act: 5, hero: 'carmilla', name: { ru: 'Кармилла', en: 'Carmilla' }, title: { ru: 'Графиня', en: 'The Countess' }, role: 'brute', element: 'dark', kind: 'boss', mechanic: 'bloodThirst', skills: ['boss.bloodKiss', 'boss.batSwarm', 'boss.ultDark'], look: null as unknown as Look },
  { id: 'boss_ifrita', act: 6, hero: 'ifrita', name: { ru: 'Ифрита', en: 'Ifrita' }, title: { ru: 'Королева пламени', en: 'Flame Queen' }, role: 'brute', element: 'fire', kind: 'boss', mechanic: 'fireField', skills: ['boss.magmaFist', 'boss.eruption', 'boss.ultFire'], look: null as unknown as Look },
  { id: 'boss_brunhilde', act: 7, hero: 'brunhilde', name: { ru: 'Брунгильда', en: 'Brunhilde' }, title: { ru: 'Падшая валькирия', en: 'Fallen Valkyrie' }, role: 'tank', element: 'light', kind: 'boss', mechanic: 'skyborne', skills: ['boss.spearDive', 'boss.valkyrieCry', 'boss.ultLight'], look: null as unknown as Look },
  { id: 'boss_aegis', act: 8, hero: 'aegis', name: { ru: 'Эгида', en: 'Aegis' }, title: { ru: 'Механическая императрица', en: 'Mechanical Empress' }, role: 'ranged', element: 'light', kind: 'boss', mechanic: 'phases', skills: ['boss.laser', 'boss.overclock', 'boss.ultLight'], look: null as unknown as Look },
  { id: 'boss_morrigan', act: 9, hero: 'morrigan', name: { ru: 'Морриган', en: 'Morrigan' }, title: { ru: 'Лич-королева', en: 'Lich Queen' }, role: 'caster', element: 'dark', kind: 'boss', mechanic: 'raiseDead', skills: ['boss.soulRend', 'boss.deathCoil', 'boss.ultDark'], look: null as unknown as Look },
  { id: 'boss_nyx', act: 10, hero: 'nyx', name: { ru: 'Никта', en: 'Nyx' }, title: { ru: 'Богиня Хаоса', en: 'Goddess of Chaos' }, role: 'caster', element: 'dark', kind: 'boss', mechanic: 'mirror', skills: ['boss.voidRay', 'boss.chaosNova', 'boss.ultDark'], look: null as unknown as Look },
];

/** Призванные юниты (скелеты некромантки, лозы Сильваны…). */
export const SUMMONS: EnemyDef[] = [
  { id: 'skeleton', act: 0, name: { ru: 'Скелет', en: 'Skeleton' }, role: 'brute', element: 'dark', kind: 'summon', skills: [], look: L('#E6E0D0', 'short', SKIN.bone, '#3A3A3A', '#6FFFD0', 'helmet', 'none', '#6A6A6A', '#6FFFD0') },
  { id: 'vine', act: 1, name: { ru: 'Лоза', en: 'Vine' }, role: 'healer', element: 'nature', kind: 'summon', skills: [], look: L('#3F8A34', 'wild', SKIN.green, '#2F5A2A', '#4FBF5A', 'flower', 'vines', '#F4B8CC', '#F2D46B') },
  { id: 'tentacle', act: 4, name: { ru: 'Щупальце', en: 'Tentacle' }, role: 'brute', element: 'water', kind: 'summon', skills: [], look: L('#6A1E4A', 'wild', SKIN.red, '#3A0E2A', '#E07A6A', 'none', 'tail') },
  { id: 'drone', act: 8, name: { ru: 'Дрон', en: 'Drone' }, role: 'ranged', element: 'light', kind: 'summon', skills: [], look: L('#8A8A9A', 'short', SKIN.grey, '#6A6A7A', '#40E0FF', 'helmet', 'gears', '#8A8A9A', '#40E0FF') },
];

/** Колоссы по стихиям (ротация Разлома по дням недели). */
export const COLOSSI = ENEMIES.filter((x) => x.colossus);

export const ENEMY_MAP: Record<string, EnemyDef> = Object.fromEntries(
  [...ENEMIES, ...ACT_BOSSES, ...SUMMONS].map((x) => [x.id, x]),
);

export const ACTS: ActDef[] = [
  { id: 1, name: { ru: 'Изумрудная опушка', en: 'Emerald Glade' }, element: 'nature', enemies: ['a1_sentinel', 'a1_bandit', 'a1_nymph_archer', 'a1_brook_nymph', 'a1_flower_nymph', 'a1_cutthroat'], minis: ['a1_mb1', 'a1_mb2', 'a1_mb3'], boss: 'boss_sylvana', bg: { sky: ['#1E3A2A', '#4A7A4A'], far: '#2A4A34', mid: '#1E3A26', near: '#12261A', weather: 'leaves' }, sets: ['verdant', 'outlaw'] },
  { id: 2, name: { ru: 'Пустыня миражей', en: 'Desert of Mirages' }, element: 'fire', enemies: ['a2_lamia_guard', 'a2_lamia_warrior', 'a2_oasis_archer', 'a2_scorpion_priestess', 'a2_mirage_priestess', 'a2_sand_spirit'], minis: ['a2_mb1', 'a2_mb2', 'a2_mb3'], boss: 'boss_nefertari', bg: { sky: ['#6A3A1E', '#E0A060'], far: '#B8804A', mid: '#8A5A2E', near: '#5A3A1E', weather: 'sand' }, sets: ['sandQueen', 'scorpion'] },
  { id: 3, name: { ru: 'Ледяной пик', en: 'Frozen Peak' }, element: 'water', enemies: ['a3_yeti', 'a3_ice_berserker', 'a3_pass_archer', 'a3_snow_witch', 'a3_blizzard_shaman', 'a3_harpy'], minis: ['a3_mb1', 'a3_mb2', 'a3_mb3'], boss: 'boss_skadi', bg: { sky: ['#2A3A5A', '#9FC4E0'], far: '#8AA0C0', mid: '#5A7090', near: '#E6F0FF', weather: 'snow' }, sets: ['winter', 'harpy'] },
  { id: 4, name: { ru: 'Затонувший храм', en: 'Sunken Temple' }, element: 'water', enemies: ['a4_mermaid_guard', 'a4_krakeness', 'a4_coral_archer', 'a4_siren', 'a4_deep_priestess', 'a4_moray'], minis: ['a4_mb1', 'a4_mb2', 'a4_mb3'], boss: 'boss_thalassia', bg: { sky: ['#0E1E3A', '#2E6A8A'], far: '#1E4A6A', mid: '#163A56', near: '#0E2A3A', weather: 'bubbles' }, sets: ['tides', 'siren'] },
  { id: 5, name: { ru: 'Проклятый город', en: 'Cursed City' }, element: 'dark', enemies: ['a5_gargoyle', 'a5_vampiress', 'a5_mad_hunter', 'a5_ghost_bride', 'a5_blood_nun', 'a5_night_vampiress'], minis: ['a5_mb1', 'a5_mb2', 'a5_mb3'], boss: 'boss_carmilla', bg: { sky: ['#1A0E1E', '#5A2A3A'], far: '#3A2A3A', mid: '#2A1E2A', near: '#140E14', weather: 'wisps' }, sets: ['countess', 'gargoyle'] },
  { id: 6, name: { ru: 'Пепельный вулкан', en: 'Ashen Volcano' }, element: 'fire', enemies: ['a6_magma_warden', 'a6_demoness', 'a6_salamander', 'a6_pyromancer', 'a6_ash_priestess', 'a6_succubus'], minis: ['a6_mb1', 'a6_mb2', 'a6_mb3'], boss: 'boss_ifrita', bg: { sky: ['#1E0E0A', '#8A2A1E'], far: '#4A1E14', mid: '#2E1410', near: '#1A0A08', weather: 'embers' }, sets: ['inferno', 'succubus'] },
  { id: 7, name: { ru: 'Небесный архипелаг', en: 'Sky Archipelago' }, element: 'light', enemies: ['a7_fallen_shield', 'a7_fallen_valkyrie', 'a7_harpy_archer', 'a7_cloud_mage', 'a7_sky_priestess', 'a7_griffon_rider'], minis: ['a7_mb1', 'a7_mb2', 'a7_mb3'], boss: 'boss_brunhilde', bg: { sky: ['#3A6AB0', '#CFE6FF'], far: '#E6F0FF', mid: '#8AA0C0', near: '#5A6A8A', weather: 'clouds' }, sets: ['valkyrie', 'griffon'] },
  { id: 8, name: { ru: 'Механическая цитадель', en: 'Mechanical Citadel' }, element: 'light', enemies: ['a8_golem', 'a8_automaton', 'a8_gnome_engineer', 'a8_tesla', 'a8_mechanic', 'a8_killer_doll'], minis: ['a8_mb1', 'a8_mb2', 'a8_mb3'], boss: 'boss_aegis', bg: { sky: ['#1E1E2A', '#5A5A6A'], far: '#4A4A5A', mid: '#3A3A46', near: '#2A2A32', weather: 'sparks' }, sets: ['clockwork', 'tinker'] },
  { id: 9, name: { ru: 'Лунный некрополь', en: 'Lunar Necropolis' }, element: 'dark', enemies: ['a9_bone_warden', 'a9_bone_maiden', 'a9_moon_archer', 'a9_banshee', 'a9_lich', 'a9_crypt_shade'], minis: ['a9_mb1', 'a9_mb2', 'a9_mb3'], boss: 'boss_morrigan', bg: { sky: ['#0E0E1E', '#3A3A6A'], far: '#2A2A46', mid: '#1E1E34', near: '#12121E', weather: 'wisps' }, sets: ['lich', 'banshee'] },
  { id: 10, name: { ru: 'Трон Пустоты', en: 'Void Throne' }, element: 'dark', enemies: ['a10_chaos_guard', 'a10_chaos_spawn', 'a10_dark_archer', 'a10_dark_mage', 'a10_dark_priestess', 'a10_dark_assassin'], minis: ['a10_mb1', 'a10_mb2', 'a10_mb3'], boss: 'boss_nyx', bg: { sky: ['#0A0610', '#3A1A4A'], far: '#2A1436', mid: '#1A0E24', near: '#0E0814', weather: 'void' }, sets: ['chaos', 'throne'] },
];

export const STAGES_PER_ACT = 20;
export const ACT_COUNT = 10;
export const STAGES_PER_DIFF = STAGES_PER_ACT * ACT_COUNT;

export const ROLE_STATS: Record<EnemyRole, { hp: number; atk: number; def: number; spd: number; row: 'front' | 'back' }> = {
  tank: { hp: 1.6, atk: 0.7, def: 1.5, spd: 90, row: 'front' },
  brute: { hp: 1.15, atk: 1.15, def: 1.0, spd: 100, row: 'front' },
  ranged: { hp: 0.8, atk: 1.1, def: 0.7, spd: 104, row: 'back' },
  caster: { hp: 0.75, atk: 1.1, def: 0.6, spd: 100, row: 'back' },
  healer: { hp: 0.85, atk: 0.75, def: 0.8, spd: 98, row: 'back' },
  rogue: { hp: 0.8, atk: 1.2, def: 0.7, spd: 115, row: 'back' },
};

/** Умения врагов, мини-боссов и боссов. */
export const ENEMY_SKILLS: SkillDef[] = [
  { id: 'enemy.basic', cls: 'enemy', kind: 'basic', name: { ru: 'Атака', en: 'Attack' }, target: 'enemy', effects: [{ t: 'dmg', mult: 1 }], vfx: 'slash' },
  { id: 'enemy.basicBack', cls: 'enemy', kind: 'basic', name: { ru: 'Атака', en: 'Attack' }, target: 'enemyBack', effects: [{ t: 'dmg', mult: 1 }], vfx: 'slash' },
  { id: 'enemy.tank', cls: 'enemy', kind: 'active', name: { ru: 'Глухая оборона', en: 'Guard' }, target: 'self', cd: 4, effects: [{ t: 'taunt', turns: 2 }, { t: 'buff', stat: 'dmgTaken', value: -0.3, turns: 2 }], vfx: 'shield' },
  { id: 'enemy.brute', cls: 'enemy', kind: 'active', name: { ru: 'Сокрушение', en: 'Smash' }, target: 'enemy', cd: 3, effects: [{ t: 'dmg', mult: 1.7 }], vfx: 'slash' },
  { id: 'enemy.ranged', cls: 'enemy', kind: 'active', name: { ru: 'Залп', en: 'Volley' }, target: 'enemyRandom', cd: 3, effects: [{ t: 'dmg', mult: 0.6, hits: 3 }], vfx: 'arrow' },
  { id: 'enemy.caster', cls: 'enemy', kind: 'active', name: { ru: 'Волна силы', en: 'Power Wave' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 0.75 }], vfx: 'nova' },
  { id: 'enemy.healer', cls: 'enemy', kind: 'active', name: { ru: 'Исцеление', en: 'Mend' }, target: 'allyLowest', cd: 2, effects: [{ t: 'heal', mult: 1.5 }], vfx: 'heal' },
  { id: 'enemy.rogue', cls: 'enemy', kind: 'active', name: { ru: 'Засада', en: 'Ambush' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 1.9 }], vfx: 'dark' },
  // мини-боссы
  { id: 'mb.enrage', cls: 'enemy', kind: 'active', name: { ru: 'Ярость', en: 'Enrage' }, target: 'self', cd: 4, effects: [{ t: 'buff', stat: 'atk', value: 0.4, turns: 3 }, { t: 'heal', mult: 0.05, scale: 'hp' }], vfx: 'fire' },
  { id: 'mb.heal', cls: 'enemy', kind: 'active', name: { ru: 'Живительный сок', en: 'Living Sap' }, target: 'allyAll', cd: 3, effects: [{ t: 'heal', mult: 1.2 }], vfx: 'heal' },
  { id: 'mb.storm', cls: 'enemy', kind: 'active', name: { ru: 'Буря', en: 'Storm' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 1.0 }, { t: 'cc', cc: 'stun', chance: 0.2, turns: 1 }], vfx: 'bolt' },
  { id: 'mb.stomp', cls: 'enemy', kind: 'active', name: { ru: 'Топот', en: 'Stomp' }, target: 'enemyFront', cd: 3, effects: [{ t: 'dmg', mult: 1.3 }, { t: 'cc', cc: 'stun', chance: 0.35, turns: 1 }], vfx: 'nova' },
  { id: 'mb.curse', cls: 'enemy', kind: 'active', name: { ru: 'Проклятие', en: 'Curse' }, target: 'enemyAll', cd: 4, effects: [{ t: 'debuff', stat: 'atk', value: -0.2, turns: 2 }, { t: 'dot', dot: 'poison', mult: 0.4, turns: 3 }], vfx: 'poison' },
  { id: 'mb.volley', cls: 'enemy', kind: 'active', name: { ru: 'Шквал', en: 'Barrage' }, target: 'enemyRandom', cd: 3, effects: [{ t: 'dmg', mult: 0.7, hits: 4 }], vfx: 'arrow' },
  { id: 'mb.freeze', cls: 'enemy', kind: 'active', name: { ru: 'Ледяное дыхание', en: 'Frost Breath' }, target: 'enemyAll', cd: 4, effects: [{ t: 'dmg', mult: 0.8 }, { t: 'cc', cc: 'freeze', chance: 0.3, turns: 1 }], vfx: 'ice' },
  { id: 'mb.charm', cls: 'enemy', kind: 'active', name: { ru: 'Чары', en: 'Charm' }, target: 'enemy', cd: 3, effects: [{ t: 'cc', cc: 'stun', chance: 0.7, turns: 1 }, { t: 'dmg', mult: 1.2 }], vfx: 'song' },
  { id: 'mb.drain', cls: 'enemy', kind: 'active', name: { ru: 'Кровопийца', en: 'Blood Drain' }, target: 'enemy', cd: 3, effects: [{ t: 'dmg', mult: 1.8, lifesteal: 0.8 }], vfx: 'dark' },
  { id: 'mb.summon', cls: 'enemy', kind: 'active', name: { ru: 'Подмога', en: 'Reinforcements' }, target: 'self', cd: 5, effects: [{ t: 'summon', unit: 'minion', count: 1, mult: 0.5 }], vfx: 'dark' },
  // боссы актов
  { id: 'boss.thornWhip', cls: 'enemy', kind: 'active', name: { ru: 'Терновый хлыст', en: 'Thorn Whip' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 0.8 }, { t: 'dot', dot: 'bleed', mult: 0.3, turns: 2 }], vfx: 'poison' },
  { id: 'boss.entangle', cls: 'enemy', kind: 'active', name: { ru: 'Оплетение', en: 'Entangle' }, target: 'enemyRandom', cd: 4, effects: [{ t: 'cc', cc: 'stun', chance: 0.6, turns: 1 }, { t: 'dmg', mult: 0.6, hits: 2 }], vfx: 'poison' },
  { id: 'boss.sunBlast', cls: 'enemy', kind: 'active', name: { ru: 'Солнечный удар', en: 'Sun Blast' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 0.9 }, { t: 'dot', dot: 'burn', mult: 0.3, turns: 2 }], vfx: 'fire' },
  { id: 'boss.curseOfSands', cls: 'enemy', kind: 'active', name: { ru: 'Проклятие песков', en: 'Curse of Sands' }, target: 'enemyBack', cd: 4, effects: [{ t: 'dmg', mult: 1.6 }, { t: 'debuff', stat: 'def', value: -0.25, turns: 2 }], vfx: 'dark' },
  { id: 'boss.frostArrow', cls: 'enemy', kind: 'active', name: { ru: 'Ледяная стрела', en: 'Frost Arrow' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 1.8 }, { t: 'debuff', stat: 'spd', value: -25, turns: 2 }], vfx: 'ice' },
  { id: 'boss.hailstorm', cls: 'enemy', kind: 'active', name: { ru: 'Град', en: 'Hailstorm' }, target: 'enemyRandom', cd: 4, effects: [{ t: 'dmg', mult: 0.6, hits: 5 }], vfx: 'ice' },
  { id: 'boss.tidalWave', cls: 'enemy', kind: 'active', name: { ru: 'Приливная волна', en: 'Tidal Wave' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 1.0 }, { t: 'debuff', stat: 'spd', value: -15, turns: 2 }], vfx: 'ice' },
  { id: 'boss.drown', cls: 'enemy', kind: 'active', name: { ru: 'Утопление', en: 'Drown' }, target: 'enemy', cd: 4, effects: [{ t: 'cc', cc: 'stun', chance: 0.8, turns: 1 }, { t: 'dot', dot: 'poison', mult: 0.8, turns: 3 }], vfx: 'ice' },
  { id: 'boss.bloodKiss', cls: 'enemy', kind: 'active', name: { ru: 'Кровавый поцелуй', en: 'Blood Kiss' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 2.0 }], vfx: 'dark' },
  { id: 'boss.batSwarm', cls: 'enemy', kind: 'active', name: { ru: 'Стая летучих мышей', en: 'Bat Swarm' }, target: 'enemyRandom', cd: 4, effects: [{ t: 'dmg', mult: 0.5, hits: 6 }], vfx: 'dark' },
  { id: 'boss.magmaFist', cls: 'enemy', kind: 'active', name: { ru: 'Магмовый кулак', en: 'Magma Fist' }, target: 'enemy', cd: 3, effects: [{ t: 'dmg', mult: 2.2 }, { t: 'dot', dot: 'burn', mult: 0.5, turns: 3 }], vfx: 'fire' },
  { id: 'boss.eruption', cls: 'enemy', kind: 'active', name: { ru: 'Извержение', en: 'Eruption' }, target: 'enemyAll', cd: 4, effects: [{ t: 'dmg', mult: 1.1 }, { t: 'cc', cc: 'stun', chance: 0.2, turns: 1 }], vfx: 'fire' },
  { id: 'boss.spearDive', cls: 'enemy', kind: 'active', name: { ru: 'Пике с копьём', en: 'Spear Dive' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 2.1 }], vfx: 'holy' },
  { id: 'boss.valkyrieCry', cls: 'enemy', kind: 'active', name: { ru: 'Клич валькирии', en: "Valkyrie's Cry" }, target: 'allyAll', cd: 6, effects: [{ t: 'buff', stat: 'atk', value: 0.3, turns: 3 }, { t: 'shield', mult: 0.02, scale: 'hp' }], vfx: 'holy' },
  { id: 'boss.laser', cls: 'enemy', kind: 'active', name: { ru: 'Лазер', en: 'Laser' }, target: 'enemyAll', cd: 3, effects: [{ t: 'dmg', mult: 1.0 }], vfx: 'bolt' },
  { id: 'boss.overclock', cls: 'enemy', kind: 'active', name: { ru: 'Разгон', en: 'Overclock' }, target: 'self', cd: 4, effects: [{ t: 'buff', stat: 'spd', value: 40, turns: 3 }, { t: 'summon', unit: 'drone', count: 1, mult: 0.3 }], vfx: 'bolt' },
  { id: 'boss.soulRend', cls: 'enemy', kind: 'active', name: { ru: 'Разрыв души', en: 'Soul Rend' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 1.8, lifesteal: 0.3 }], vfx: 'dark' },
  { id: 'boss.deathCoil', cls: 'enemy', kind: 'active', name: { ru: 'Лик смерти', en: 'Death Coil' }, target: 'enemyAll', cd: 4, effects: [{ t: 'dmg', mult: 0.9 }, { t: 'debuff', stat: 'healRecv', value: -0.5, turns: 2 }], vfx: 'dark' },
  { id: 'boss.voidRay', cls: 'enemy', kind: 'active', name: { ru: 'Луч Пустоты', en: 'Void Ray' }, target: 'enemyBack', cd: 3, effects: [{ t: 'dmg', mult: 2.4 }], vfx: 'dark' },
  { id: 'boss.chaosNova', cls: 'enemy', kind: 'active', name: { ru: 'Сверхновая хаоса', en: 'Chaos Nova' }, target: 'enemyAll', cd: 4, effects: [{ t: 'dmg', mult: 1.2 }, { t: 'debuff', stat: 'def', value: -0.3, turns: 2 }], vfx: 'nova' },
  // ультимейты боссов (срабатывают на 100 энергии)
  { id: 'boss.ultNature', cls: 'enemy', kind: 'ult', name: { ru: 'Гнев леса', en: "Forest's Wrath" }, target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.6 }, { t: 'heal', target: 'allyAll', mult: 1.0 }], vfx: 'poison' },
  { id: 'boss.ultFire', cls: 'enemy', kind: 'ult', name: { ru: 'Солнечная кара', en: 'Solar Wrath' }, target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.8 }, { t: 'dot', dot: 'burn', mult: 0.5, turns: 3 }], vfx: 'fire' },
  { id: 'boss.ultWater', cls: 'enemy', kind: 'ult', name: { ru: 'Вечная зима', en: 'Eternal Winter' }, target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.6 }, { t: 'cc', cc: 'freeze', chance: 0.3, turns: 1 }], vfx: 'ice' },
  { id: 'boss.ultDark', cls: 'enemy', kind: 'ult', name: { ru: 'Кровавая луна', en: 'Blood Moon' }, target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.8, lifesteal: 0.3 }], vfx: 'dark' },
  { id: 'boss.ultLight', cls: 'enemy', kind: 'ult', name: { ru: 'Небесный приговор', en: 'Heavenly Verdict' }, target: 'enemyAll', effects: [{ t: 'dmg', mult: 1.9 }, { t: 'cc', cc: 'stun', chance: 0.2, turns: 1 }], vfx: 'holy' },
];

export interface StageRef {
  diff: 0 | 1 | 2;
  /** Номер этапа внутри сложности, 1…200. */
  idx: number;
  act: number;
  stage: number;
  /** Сквозной номер с учётом сложности (1…600). */
  n: number;
  kind: 'normal' | 'mini' | 'boss';
}

export function stageRef(diff: 0 | 1 | 2, idx: number): StageRef {
  const act = Math.ceil(idx / STAGES_PER_ACT);
  const stage = ((idx - 1) % STAGES_PER_ACT) + 1;
  return {
    diff,
    idx,
    act,
    stage,
    n: diff * STAGES_PER_DIFF + idx,
    kind: stage === 20 ? 'boss' : stage % 5 === 0 ? 'mini' : 'normal',
  };
}

export function stageFromGlobal(n: number): StageRef {
  const diff = Math.min(2, Math.floor((n - 1) / STAGES_PER_DIFF)) as 0 | 1 | 2;
  return stageRef(diff, n - diff * STAGES_PER_DIFF);
}

export function stageLabel(ref: { act: number; stage: number }): string {
  return `${ref.act}-${ref.stage}`;
}
