/**
 * Балансовый симулятор: F2P-игрок с разумной стратегией играет N дней.
 * Проверяем темп из ТЗ: Акт 1 — день 1; Акт 5 — ~неделя 3; Акт 10 Normal — ~месяц 2;
 * Nightmare 10-20 — 6–9 месяцев; первое Вознесение — через 3–4 недели.
 *
 *   npx tsx scripts/balance-sim.ts [days=60] [sessionsPerDay=6]
 */
import {
  DAILY_CHESTS,
  DAILY_QUESTS,
  DUNGEONS,
  EXPEDITION_MAP,
  HEROINE_MAP,
  TREES,
  WEEKLY_CHESTS,
  WEEKLY_QUESTS,
  ASCENSION_UPGRADES,
  applyAction,
  ascensionCost,
  buildHeroine,
  constellationCost,
  createPlayer,
  enhanceCost,
  equippedIndex,
  etherForStage,
  isUnlocked,
  levelCap,
  partyPower,
  partySlots,
  stageFromGlobal,
  targetStage,
  bossUnits,
  heroUnits,
  GameError,
  DEFAULT_CONFIG,
  mergeConfig,
  type Action,
  type Config,
  type PlayerState,
} from '../src';

const DAYS = Number(process.argv[2] ?? 60);
const SESSIONS = Number(process.argv[3] ?? 6);
const cfg: Config = process.env.CFG ? mergeConfig(DEFAULT_CONFIG, JSON.parse(process.env.CFG)) : DEFAULT_CONFIG;
const DAY = 86400000;
const START = Date.UTC(2026, 0, 1, 8);

let s: PlayerState = createPlayer(cfg, 'sim', 'Sim', START);
let now = START;
const log: string[] = [];
const milestones: Record<string, number> = {};
let crystalsEarned = 0;
let lastAscendDay = 0;
let stalledSince = 0;
let lastMax = 0;
let wallLogged = 0;
let crystalsAtReport = 0;
let reportDay = 0;

function act(type: string, params: Record<string, unknown> = {}): any {
  try {
    const before = s.cur.crystals;
    const r = applyAction(s, { type, ...params } as Action, { cfg, now, server: true });
    s = r.state;
    if (s.cur.crystals > before) crystalsEarned += s.cur.crystals - before;
    return r.result ?? {};
  } catch (e) {
    if (e instanceof GameError) return null;
    throw e;
  }
}

function day() {
  return (now - START) / DAY;
}

function mark(key: string) {
  if (milestones[key] === undefined) {
    milestones[key] = day();
    log.push(`${key.padEnd(22)} day ${day().toFixed(2)}  power ${partyPower(cfg, s).toExponential(2)}  lvls ${party().map((id) => s.heroines[id].lvl).join('/')}`);
  }
}

function party(): string[] {
  return s.party.presets[s.party.active].filter(Boolean) as string[];
}

/** Лучший отряд по силе с учётом ролей: минимум 1 танк/берсерк впереди. */
function arrangeParty() {
  const slots = partySlots(cfg, s);
  const ranked = Object.values(s.heroines)
    .filter((h) => !s.modes.expeditions.some((e) => e.heroes.includes(h.id)))
    .map((h) => ({ id: h.id, p: buildHeroine(cfg, s, h).power, cls: HEROINE_MAP[h.id].cls }))
    .sort((a, b) => b.p - a.p);
  const pick: string[] = [];
  const front = ranked.find((x) => x.cls === 'guardian') ?? ranked.find((x) => x.cls === 'berserker');
  if (front) pick.push(front.id);
  const healer = ranked.find((x) => x.cls === 'priestess');
  if (healer && pick.length < slots) pick.push(healer.id);
  for (const x of ranked) if (pick.length < slots && !pick.includes(x.id)) pick.push(x.id);
  const fronts = pick.filter((id) => ['guardian', 'berserker'].includes(HEROINE_MAP[id].cls));
  const backs = pick.filter((id) => !fronts.includes(id));
  const arr: (string | null)[] = [null, null, null, null, null];
  const f = fronts.slice(0, 2);
  const rest = [...fronts.slice(2), ...backs];
  f.forEach((id, i) => (arr[i] = id));
  let bi = 2;
  for (const id of rest) {
    if (bi > 4) {
      const empty = arr.findIndex((x) => x === null);
      if (empty < 0) break;
      arr[empty] = id;
    } else arr[bi++] = id;
  }
  act('party.set', { preset: 0, slots: arr });
}

function learnTrees() {
  if (!isUnlocked({ s, cfg }, 'tree')) return;
  for (const id of party()) {
    const cls = HEROINE_MAP[id].cls;
    const order = [0, 2, 1];
    for (const b of order) {
      for (const node of TREES[cls].filter((n) => n.branch === b)) {
        for (let k = 0; k < node.max; k++) if (!act('tree.learn', { id, node: node.id })) break;
      }
    }
  }
}

function spendGold() {
  // заточка надетого, пока хватает; оставляем запас на уровни
  const idx = equippedIndex(s);
  const eq = Object.keys(idx)
    .map((u) => s.items[u])
    .filter(Boolean)
    .sort((a, b) => a.enh - b.enh);
  for (const it of eq) {
    for (let k = 0; k < 15; k++) {
      const c = enhanceCost({ cfg }, it);
      if (s.cur.gold < c.gold * 2 || s.cur.dust < c.dust) break;
      if (!act('item.enhance', { uid: it.uid })) break;
    }
  }
}

function claimAll() {
  for (const q of [...DAILY_QUESTS, ...WEEKLY_QUESTS]) act('quest.claim', { id: q.id });
  DAILY_CHESTS.forEach((_, i) => act('quest.chest', { kind: 'daily', index: i }));
  WEEKLY_CHESTS.forEach((_, i) => act('quest.chest', { kind: 'weekly', index: i }));
  act('login.claim', { hero: 'astrid' });
  act('ach.claim', { id: 'all' });
  act('mail.claim', { id: 'all' });
}

function summon() {
  while (s.cur.scrolls >= 1) act('summon', { count: 1, pay: 'scrolls' });
  while (s.cur.crystals >= cfg.summon.cost10) act('summon', { count: 10, pay: 'crystals' });
  // осколки → звёзды и новые героини
  for (const id of Object.keys(s.shards)) {
    if (!s.heroines[id]) act('hero.recruit', { id });
    else while (act('hero.star', { id }));
  }
}

function pushStages(maxAttempts = 25) {
  let fails = 0;
  for (let i = 0; i < maxAttempts; i++) {
    const t = targetStage({ s });
    if (!t) {
      if (s.progress.diff < 2 && act('stage.diff', { diff: s.progress.diff + 1 })) continue;
      break;
    }
    while (s.progress.wave < 3) {
      const r = act('battle.wave');
      if (!r || !r.battle.win) return;
    }
    const b = act('battle.boss');
    if (b && !b.win && process.env.WALL && wallLogged !== t.n) {
      wallLogged = t.n;
      const en = bossUnits(cfg, t);
      const hp = en.reduce((a, u) => a + u.stats.hp, 0);
      const hs = heroUnits(cfg, s, s.party.presets[s.party.active]);
      const dmg = Object.entries(b.battle.dmgDone as Record<string, number>).reduce((a, [k, v]) => (Number(k) < hs.length ? a + v : a), 0);
      const alive = Object.values(b.battle.heroHp as Record<string, number>).filter((v) => v > 0).length;
      const atk = hs.reduce((a, u) => a + u.stats.atk, 0);
      const hhp = hs.reduce((a, u) => a + u.stats.hp, 0);
      if (process.env.DUMP && Number(process.env.DUMP) === t.n) require('fs').writeFileSync(process.env.DUMP_FILE ?? 'wall-state.json', JSON.stringify(s));
      log.push(`  wall d${day().toFixed(1)} n=${t.n} ${t.kind} timeout=${b.battle.timeout} t=${b.battle.time} dmg=${dmg.toExponential(2)} enemyHP=${hp.toExponential(2)} enemyATK=${en[0].stats.atk.toExponential(2)} alive=${alive} partyATK=${atk.toExponential(2)} partyHP=${hhp.toExponential(2)} def=${hs.map((u) => u.stats.def).join('/')} lvls=${hs.map((u) => (u.lvl ?? 0) + '*' + (u.stars ?? 0)).join(',')}`);
    }
    if (!b || !b.win) {
      fails++;
      if (fails >= 2) return;
    }
  }
}

function modes() {
  if (isUnlocked({ s, cfg }, 'dungeons')) {
    for (const d of DUNGEONS) {
      const cleared = s.modes.dungeons[d.id] ?? 0;
      for (let k = 0; k < 3; k++) {
        const r = act('dungeon.fight', { id: d.id, level: Math.min(20, cleared + 1) });
        if (!r || !r.win) {
          if (cleared > 0) act('dungeon.sweep', { id: d.id, level: cleared, times: 3 - (s.day.keys[d.id] ?? 0) });
          break;
        }
      }
    }
  }
  if (isUnlocked({ s, cfg }, 'tower')) for (let k = 0; k < 10; k++) if (!act('tower.fight')?.win) break;
  if (isUnlocked({ s, cfg }, 'constellation')) {
    while (s.cur.starDust >= constellationCost({ cfg }, s.constellation) && s.constellation < 240) act('constellation.buy');
  }
}

function expeditions() {
  if (!isUnlocked({ s, cfg }, 'expeditions')) return;
  for (const e of [...s.modes.expeditions]) act('expedition.claim', { id: e.id });
  const board: string[] = act('expedition.board')?.board ?? [];
  const inParty = new Set(party());
  for (const qid of board) {
    const q = EXPEDITION_MAP[qid];
    const busy = new Set(s.modes.expeditions.flatMap((e) => e.heroes));
    const avail = Object.values(s.heroines)
      .filter((h) => !inParty.has(h.id) && !busy.has(h.id) && h.stars >= q.minStars)
      .map((h) => h.id);
    const pick: string[] = [];
    const need = avail.find((id) => (!q.cls || HEROINE_MAP[id].cls === q.cls) && (!q.element || HEROINE_MAP[id].element === q.element));
    if ((q.cls || q.element) && !need) continue;
    if (need) pick.push(need);
    for (const id of avail) if (pick.length < q.heroes && !pick.includes(id)) pick.push(id);
    if (pick.length < q.heroes) continue;
    act('expedition.start', { quest: qid, heroes: pick });
  }
}

function arena() {
  if (!isUnlocked({ s, cfg }, 'arena')) return;
  for (let k = 0; k < cfg.modes.arenaFights; k++) if (!act('arena.fight', { index: 2 })) break;
}

function maybeAscend() {
  if (!isUnlocked({ s, cfg }, 'ascension')) return;
  if (s.progress.maxGlobal > lastMax) {
    lastMax = s.progress.maxGlobal;
    stalledSince = day();
  }
  const stalled = day() - stalledSince > 2;
  // игрок вознесётся, когда прокачка упёрлась в потолок (иначе сброс уровней невыгоден)
  const capped = party().every((id) => s.heroines[id].lvl >= levelCap(cfg, s.heroines[id]) * 0.9);
  if (!capped && day() - stalledSince < 6) return;
  const ether = etherForStage({ cfg, s }, s.progress.maxGlobal);
  if (stalled && s.progress.maxGlobal >= cfg.ascension.unlockGlobal && ether >= 15 && day() - lastAscendDay > 4) {
    const r = act('ascend');
    if (r) {
      log.push(`ASCEND #${r.count} day ${day().toFixed(1)} at stage ${stageFromGlobal(lastMax).act}-${stageFromGlobal(lastMax).stage} (n=${lastMax}) ether +${r.ether}`);
      mark(`ascension${r.count}`);
      lastAscendDay = day();
      lastMax = 0;
      stalledSince = day();
      // покупаем улучшения, дешёвые первыми
      for (let guard = 0; guard < 100; guard++) {
        const opts = ASCENSION_UPGRADES.filter((u) => (s.ascension.up[u.id] ?? 0) < u.max).sort((a, b) => ascensionCost(a, s.ascension.up[a.id] ?? 0) - ascensionCost(b, s.ascension.up[b.id] ?? 0));
        if (!opts.length || !act('ascension.buy', { id: opts[0].id })) break;
      }
    }
  }
}

function session() {
  act('chest.collect');
  act('chest.quick', { method: 'free' });
  claimAll();
  summon();
  arrangeParty();
  act('item.autoEquip');
  learnTrees();
  spendGold();
  pushStages();
  modes();
  expeditions();
  arena();
  act('item.smeltFilter', { below: 3 });
  maybeAscend();
  const n = s.progress.maxGlobalEver;
  if (n >= 20) mark('act1 cleared');
  if (n >= 80) mark('act4 cleared (act5)');
  if (n >= 100) mark('act5 cleared');
  if (n >= 200) mark('normal 10-20');
  if (n >= 400) mark('hard 10-20');
  if (n >= 600) mark('nightmare 10-20');
}

const t0 = Date.now();
for (let d = 0; d < DAYS; d++) {
  const dayStart = START + d * DAY;
  for (let k = 0; k < SESSIONS; k++) {
    now = dayStart + Math.round((k * 16 * 3600000) / Math.max(1, SESSIONS - 1));
    session();
  }
  if ((d + 1) % (DAYS > 100 ? 14 : 7) === 0 || d === 0 || d === 2) {
    const ref = stageFromGlobal(Math.max(1, s.progress.maxGlobal));
    log.push(
      `day ${String(d + 1).padStart(3)}: stage ${['N', 'H', 'NM'][ref.diff]} ${ref.act}-${ref.stage} (best n=${s.progress.maxGlobalEver}) power ${partyPower(cfg, s).toExponential(2)} lvl ${party().map((id) => s.heroines[id].lvl).join('/')} heroes ${Object.keys(s.heroines).length} acc ${s.account.lvl} cons ${s.constellation} tower ${s.modes.tower} crystals/wk ${Math.round(((crystalsEarned - crystalsAtReport) / Math.max(1, d + 1 - reportDay)) * 7)}`,
    );
    crystalsAtReport = crystalsEarned;
    reportDay = d + 1;
  }
}
console.log(log.join('\n'));
console.log(`\nsimulated ${DAYS} days in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
