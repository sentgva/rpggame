/**
 * Балансовый симулятор Легиона 3.0: игрок с разумной стратегией играет N дней.
 * Каждая сессия: сундук, задания, уровень Легиона, ранги, навыки, слияние и «Надеть лучшее»,
 * Знамя, подземелья, Башня, Колосс, затем активный поход (волны и стражи), пока отряд побеждает.
 *
 *   npm run balance -- [days=30] [sessionsPerDay=5] [activeMinutes=20]
 *   CFG='{"growth":1.05}' npm run balance
 */
import {
  BANNER,
  DEFAULT_CONFIG,
  DUNGEONS,
  GameError,
  STAGE_COUNT,
  applyAction,
  bannerCost,
  createPlayer,
  isUnlocked,
  mergeConfig,
  partyPower,
  rankCap,
  rankCost,
  skillCost,
  stageLabel,
  stageRef,
  type Action,
  type Config,
  type PlayerState,
} from '../src';

const days = Number(process.argv[2] ?? 30);
const perDay = Number(process.argv[3] ?? 5);
const activeMin = Number(process.argv[4] ?? 20);
const cfg: Config = process.env.CFG ? mergeConfig(DEFAULT_CONFIG, JSON.parse(process.env.CFG)) : DEFAULT_CONFIG;

let now = Date.UTC(2026, 9, 1, 6);
let s: PlayerState = createPlayer(cfg, 'sim', 'Sim', now);

function act(type: string, p: Record<string, unknown> = {}): any {
  try {
    const r = applyAction(s, { type, ...p } as Action, { cfg, now, server: true, mutate: true });
    s = r.state;
    return r.result;
  } catch (e) {
    if (e instanceof GameError) return null;
    throw e;
  }
}

const milestones: string[] = [];
const seen = new Set<string>();
function mark(key: string, text: string) {
  if (seen.has(key)) return;
  seen.add(key);
  const d = (now - Date.UTC(2026, 9, 1, 6)) / 86400000;
  milestones.push(`день ${d.toFixed(1).padStart(5)} · ${text}`);
}

function upgrade() {
  act('quest.claimAll');
  act('login.claim');
  act('mail.claim', { id: 'all' });
  act('ach.claim', { id: 'all' });
  act('pass.claimAll');
  // слияние и лучшее снаряжение
  act('item.mergeAll');
  act('party.autoEquip');
  // ранги: если упёрлись в потолок
  for (const h of Object.values(s.heroines)) {
    const c = rankCost(cfg, h.rank);
    if (c && s.legion.lvl >= rankCap(cfg, h.rank)) act('hero.rank', { id: h.id });
  }
  // навыки — пока хватает Томов (ульта важнее)
  for (let guard = 0; guard < 60; guard++) {
    let did = false;
    for (const h of Object.values(s.heroines)) {
      for (const which of ['ult', 'skill'] as const) {
        const c = skillCost(cfg, s, h[which]);
        if (c && s.cur.books >= c.books && s.cur.gold >= c.gold * 3) did = !!act('hero.skill', { id: h.id, which }) || did;
      }
    }
    if (!did) break;
  }
  // кристаллы — на Эмблемы в лавке
  for (let i = 0; i < 3; i++) act('shop.buy', { offer: 'sh_emblem' });
  for (let i = 0; i < 5; i++) act('shop.buy', { offer: 'em_10' });
  // уровень Легиона — основная трата; золото на ранг откладываем, если Эмблем на него уже хватает
  const reserve = Object.values(s.heroines).reduce((n, h) => {
    const c = rankCost(cfg, h.rank);
    return c && s.legion.lvl >= rankCap(cfg, h.rank) && s.cur.emblems >= c.emblems ? Math.max(n, c.gold) : n;
  }, 0);
  if (s.cur.gold > reserve * 2 || reserve === 0) act('legion.level', { n: 0 });
  // Знамя: дешёвые улучшения на остатки (не трогая запас на ранг)
  if (isUnlocked({ s, cfg }, 'banner'))
    for (let i = 0; i < 5; i++)
      for (const b of BANNER) {
        const c = bannerCost(cfg, s, b.id);
        if (c !== null && c < (s.cur.gold - reserve) * 0.2) act('banner.buy', { id: b.id });
      }
  // заточка надетого (Сталь)
  for (const h of Object.values(s.heroines)) for (const uid of Object.values(h.gear)) if (uid) act('item.enhance', { uid, n: 3 });
}

function modes() {
  for (const d of DUNGEONS) {
    for (let k = 0; k < cfg.modes.dungeonKeys; k++) {
      const best = s.modes.dungeons[d.id] ?? 0;
      const r = act('dungeon.fight', { id: d.id, tier: Math.min(cfg.modes.dungeonTiers, best + 1) });
      if (!r || !r.win) act('dungeon.sweep', { id: d.id });
    }
  }
  for (let i = 0; i < 3; i++) {
    const r = act('tower.fight');
    if (!r || !r.win) break;
  }
  for (let i = 0; i < cfg.modes.raidAttempts; i++) act('raid.fight');
}

/** Активный поход: бьём волны и стражей, пока не кончится время сессии или не проиграем стража дважды. */
function march(minutes: number) {
  let budget = minutes * 60000;
  let fails = 0;
  while (budget > 0 && s.progress.stage < STAGE_COUNT) {
    if (s.progress.wave < 3) {
      const r = act('battle.wave');
      if (!r) break;
      budget -= r.battle.time + 3000;
      now += r.battle.time + 3000;
      if (!r.battle.win) break;
    } else {
      const r = act('battle.boss');
      if (!r) break;
      budget -= r.battle.time + 3000;
      now += r.battle.time + 3000;
      if (!r.win) {
        fails++;
        upgrade();
        if (fails >= 2) break;
        continue;
      }
      fails = 0;
      const ref = stageRef(s.progress.stage);
      if (ref.kind === 'boss') mark(`act${ref.circle}-${ref.act}`, `пройден ${stageLabel(ref)} (сила ${fmt(partyPower(cfg, s))}, ур. ${s.legion.lvl})`);
      for (const id of Object.keys(s.heroines)) mark(`hero-${id}`, `в Легионе: ${id}`);
      if (s.progress.stage % 2 === 0) upgrade();
    }
  }
}

function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

const t0 = Date.now();
for (let d = 0; d < days; d++) {
  for (let k = 0; k < perDay; k++) {
    act('chest.collect');
    act('chest.quick', { method: 'free' });
    act('boost.x2');
    upgrade();
    modes();
    march(activeMin);
    upgrade();
    now += (24 / perDay) * 3600000 - activeMin * 60000;
  }
  const ranks = Object.values(s.heroines)
    .map((h) => h.rank)
    .join('');
  console.log(
    `день ${String(d + 1).padStart(3)} · этап ${stageLabel(stageRef(Math.max(1, s.progress.stage))).padEnd(8)} (${String(s.progress.stage).padStart(3)}) · ур. ${String(s.legion.lvl).padStart(3)} · ранги ${ranks} · сила ${fmt(partyPower(cfg, s)).padStart(6)} · башня ${String(s.modes.tower).padStart(3)} · эмбл ${String(s.cur.emblems).padStart(4)} · томов ${String(s.cur.books).padStart(4)} · сталь ${fmt(s.cur.steel).padStart(5)} · вещей ${Object.keys(s.items).length}`,
  );
}
console.log('\n' + milestones.join('\n'));
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} с)`);
