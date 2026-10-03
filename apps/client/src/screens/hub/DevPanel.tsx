import {
  CURRENCIES,
  HEROINES,
  ITEM_RARITY_NAMES,
  GEAR_SLOTS,
  lootLuck,
  stageLabel,
  stageRef,
  SETS,
  SKINS,
  rollRarity,
  Rng,
  type Currency,
  CLASSES,
} from '@idle/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Panel, Tabs, Toggle, confirmDialog, css, cx, formatNum } from '../../components/ui';
import { t, tl } from '../../i18n';
import { ART_ONCE_KEY, useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { BackHeader } from '../common';

type DevTab = 'resources' | 'heroes' | 'items' | 'progress' | 'time' | 'battle' | 'balance' | 'account' | 'log';

async function dev(type: string, params: Record<string, unknown> = {}) {
  const r = await useGame.getState().act(type, params);
  if (r.ok) useUi.getState().toast(t('dev.done'), 'good');
  return r;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={css.row} style={{ justifyContent: 'space-between', margin: '4px 0' }}>
      <span className={css.tiny}>{label}</span>
      {children}
    </label>
  );
}

/** Режим разработчика (раздел 16 ТЗ). Каждый запрос повторно проверяется сервером. */
export function DevPanel() {
  const [tab, setTab] = useState<DevTab>('resources');
  const tabs: DevTab[] = ['resources', 'heroes', 'items', 'progress', 'time', 'battle', 'balance', 'account', 'log'];
  return (
    <div className={css.col}>
      <BackHeader title={t('dev.title')} />
      <div className={css.tiny} style={{ color: '#ff8070' }}>
        {t('dev.warning')}
      </div>
      <ArtStylePanel />
      <Tabs<DevTab> value={tab} onChange={setTab} items={tabs.map((x) => ({ id: x, label: t(`dev.${x}`) }))} />
      {tab === 'resources' && <Resources />}
      {tab === 'heroes' && <Heroes />}
      {tab === 'items' && <Items />}
      {tab === 'progress' && <Progress />}
      {tab === 'time' && <Time />}
      {tab === 'battle' && <Battle />}
      {tab === 'balance' && <Balance />}
      {tab === 'account' && <Account />}
      {tab === 'log' && <Log />}
    </div>
  );
}

/** Стиль графики для всех игроков: основной (по умолчанию) или мягкий HD. */
function ArtStylePanel() {
  const cur = useCfg().art === 'hd' ? 'hd' : 'classic';
  const pick = (style: 'hd' | 'classic') => {
    if (style === cur) return;
    confirmDialog(t('dev.artConfirm'), async () => {
      const r = (await useGame.getState().backend().dev('art.style', { style })) as { ok?: boolean } | null;
      if (!r?.ok) return useUi.getState().toast(t('dev.artFail'), 'bad');
      // перерисовать всё в новом стиле проще всего перезапуском
      try {
        sessionStorage.setItem(ART_ONCE_KEY, style);
      } catch {
        /* после перезапуска стиль всё равно придёт с сервера */
      }
      location.reload();
    });
  };
  return (
    <Panel title={t('dev.art')}>
      <div className={css.row} style={{ gap: 6 }}>
        {(['classic', 'hd'] as const).map((x) => (
          <button key={x} className={cx(css.chip, cur === x && css.chipOn)} onClick={() => pick(x)}>
            {t(x === 'hd' ? 'dev.artHd' : 'dev.artClassic')}
          </button>
        ))}
      </div>
      <div className={css.tiny} style={{ marginTop: 6 }}>
        {t('dev.artHint')}
      </div>
    </Panel>
  );
}

function Resources() {
  const s = useGameState();
  const [cur, setCur] = useState<Currency>('gold');
  const [amount, setAmount] = useState(1000);
  return (
    <Panel title={t('dev.resources')}>
      <Field label={t('dev.resources')}>
        <select className={css.input} value={cur} onChange={(e) => setCur(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {t(`cur.${c}`)} ({formatNum(s.cur[c])})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('dev.amount')}>
        <input className={css.input} type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: 140 }} />
      </Field>
      <div className={css.row} style={{ flexWrap: 'wrap', gap: 6 }}>
        <Button size="small" kind="secondary" onClick={() => setAmount(1000)}>×1K</Button>
        <Button size="small" kind="secondary" onClick={() => setAmount(1_000_000)}>×1M</Button>
        <Button size="small" onClick={() => void dev('dev.cur', { cur, op: 'add', amount })}>{t('dev.give')}</Button>
        <Button size="small" kind="secondary" onClick={() => void dev('dev.cur', { cur, op: 'sub', amount })}>{t('dev.take')}</Button>
        <Button size="small" kind="secondary" onClick={() => void dev('dev.cur', { cur, op: 'max' })}>{t('common.max')}</Button>
        <Button size="small" kind="danger" onClick={() => void dev('dev.cur', { cur, op: 'zero' })}>{t('dev.zero')}</Button>
      </div>
      <div className={css.divider} />
      <Button size="small" kind="secondary" onClick={() => void dev('dev.mail', { crystals: 500 })}>{t('dev.mail')}</Button>
    </Panel>
  );
}

function Heroes() {
  const cfg = useCfg();
  const s = useGameState();
  const [id, setId] = useState('all');
  const [legion, setLegion] = useState(s.legion.lvl);
  const [rank, setRank] = useState(3);
  const [skill, setSkill] = useState(5);
  const [skin, setSkin] = useState<string>('');
  return (
    <Panel title={t('dev.heroes')}>
      <Field label={t('legion.level')}>
        <div className={css.row} style={{ gap: 4 }}>
          <input className={css.input} type="number" value={legion} onChange={(e) => setLegion(Number(e.target.value))} style={{ width: 90 }} />
          <Button size="small" onClick={() => void dev('dev.legion', { lvl: legion })}>
            {t('dev.apply')}
          </Button>
        </div>
      </Field>
      <div className={css.divider} />
      <Field label={t('nav.heroes')}>
        <select className={css.input} value={id} onChange={(e) => setId(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          {HEROINES.map((h) => (
            <option key={h.id} value={h.id}>
              {tl(h.name)} ({tl(CLASSES[h.cls].name)})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('heroes.tabRank')}>
        <input className={css.input} type="number" value={rank} min={1} max={cfg.hero.maxRank} onChange={(e) => setRank(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Field label={t('heroes.tabSkills')}>
        <input className={css.input} type="number" value={skill} min={1} max={cfg.hero.maxSkill} onChange={(e) => setSkill(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      {id !== 'all' && (
        <Field label={t('heroes.tabSkins')}>
          <select className={css.input} value={skin} onChange={(e) => setSkin(e.target.value)}>
            <option value="">—</option>
            {SKINS.filter((x) => x.hero === id).map((x) => (
              <option key={x.id} value={x.id}>
                {tl(x.name)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className={css.row} style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        <Button size="small" onClick={() => void dev('dev.hero', { id, rank })}>
          {t('dev.apply')} ({t('heroes.tabRank')})
        </Button>
        <Button size="small" onClick={() => void dev('dev.hero', { id, skill })}>
          {t('dev.apply')} ({t('heroes.tabSkills')})
        </Button>
        {skin && (
          <Button size="small" onClick={() => void dev('dev.hero', { id, skin })}>
            {t('dev.apply')} ({t('heroes.tabSkins')})
          </Button>
        )}
        <Button size="small" kind="secondary" onClick={() => void dev('dev.hero', { id: 'all' })}>
          {t('dev.allHeroes')}
        </Button>
        <Button size="small" kind="secondary" onClick={() => void dev('dev.skins')}>
          {t('dev.skins')}
        </Button>
      </div>
    </Panel>
  );
}

function Items() {
  const s = useGameState();
  const [slot, setSlot] = useState<string>('');
  const [rarity, setRarity] = useState(4);
  const [lvl, setLvl] = useState(Math.max(10, s.progress.stage));
  const [set, setSet] = useState('');
  const [enh, setEnh] = useState(0);
  const [count, setCount] = useState(1);
  return (
    <Panel title={t('dev.items')}>
      <Field label={t('gear.title')}>
        <select className={css.input} value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option value="">—</option>
          {GEAR_SLOTS.map((x) => (
            <option key={x} value={x}>
              {t(`slot.${x}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rarity">
        <select className={css.input} value={rarity} onChange={(e) => setRarity(Number(e.target.value))}>
          {ITEM_RARITY_NAMES.map((n, i) => (
            <option key={i} value={i}>
              {tl(n)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('dev.setLevel')}>
        <input className={css.input} type="number" value={lvl} onChange={(e) => setLvl(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Field label={t('gear.sets')}>
        <select className={css.input} value={set} onChange={(e) => setSet(e.target.value)}>
          <option value="">—</option>
          {SETS.map((x) => (
            <option key={x.id} value={x.id}>
              {tl(x.name)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="+">
        <input className={css.input} type="number" value={enh} min={0} max={15} onChange={(e) => setEnh(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Field label="×">
        <input className={css.input} type="number" value={count} min={1} max={50} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Button size="small" onClick={() => void dev('dev.item', { slot: slot || undefined, rarity, lvl, set: set || undefined, enh, count })}>
        {t('dev.createItem')}
      </Button>
    </Panel>
  );
}

function Progress() {
  const s = useGameState();
  const cfg = useCfg();
  const [stage, setStage] = useState(s.progress.stage);
  const [tower, setTower] = useState(s.modes.tower);
  const [acc, setAcc] = useState(s.account.lvl);
  return (
    <Panel title={t('dev.progress')}>
      <Field label={t('dev.goStage')}>
        <div className={css.row} style={{ gap: 4 }}>
          <input className={css.input} type="number" min={0} max={600} value={stage} onChange={(e) => setStage(Number(e.target.value))} style={{ width: 80 }} />
          <span className={css.tiny}>{stageLabel(stageRef(Math.max(1, stage)))}</span>
          <Button size="small" onClick={() => void dev('dev.progress', { stage })}>
            {t('dev.apply')}
          </Button>
        </div>
      </Field>
      <Field label={t('mode.tower')}>
        <input className={css.input} type="number" value={tower} onChange={(e) => setTower(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Field label={t('dev.accLevel')}>
        <input className={css.input} type="number" value={acc} max={cfg.account.maxLevel} onChange={(e) => setAcc(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      <Button size="small" onClick={() => void dev('dev.progress', { tower, accLvl: acc })}>
        {t('dev.apply')}
      </Button>
      <div className={css.divider} />
      <Field label={t('dev.unlockAll')}>
        <Toggle value={!!s.dev.unlockAll} onChange={(v) => void dev('dev.progress', { unlockAll: v })} />
      </Field>
    </Panel>
  );
}

function Time() {
  return (
    <Panel title={t('dev.time')}>
      <div className={css.tiny}>{t('dev.rewind')}</div>
      <div className={css.row} style={{ gap: 6, margin: '6px 0' }}>
        <Button size="small" onClick={() => void dev('dev.time', { minutes: 60 })}>+1 ч</Button>
        <Button size="small" onClick={() => void dev('dev.time', { minutes: 720 })}>+12 ч</Button>
        <Button size="small" onClick={() => void dev('dev.time', { minutes: 10080 })}>+7 д</Button>
      </div>
      <Button size="small" kind="secondary" onClick={() => void dev('dev.resetDaily')}>
        {t('dev.resetDaily')}
      </Button>
    </Panel>
  );
}

function Battle() {
  const s = useGameState();
  const d = s.dev;
  const [seed, setSeed] = useState<number>(d.fixedSeed ?? 12345);
  return (
    <Panel title={t('dev.battle')}>
      <Field label={t('dev.immortal')}>
        <Toggle value={!!d.immortal} onChange={(v) => void dev('dev.battle', { immortal: v })} />
      </Field>
      <Field label={t('dev.oneShot')}>
        <Toggle value={!!d.oneShot} onChange={(v) => void dev('dev.battle', { oneShot: v })} />
      </Field>
      <Field label={t('dev.speed')}>
        <div className={css.row} style={{ gap: 4 }}>
          {[1, 2, 5, 10].map((x) => (
            <Button key={x} size="small" kind={(d.speed ?? 1) === x ? 'primary' : 'secondary'} onClick={() => void dev('dev.battle', { speed: x })}>
              ×{x}
            </Button>
          ))}
        </div>
      </Field>
      <Field label={t('dev.fixedSeed')}>
        <div className={css.row} style={{ gap: 4 }}>
          <input className={css.input} type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} style={{ width: 110 }} />
          <Toggle value={!!d.fixedSeed} onChange={(v) => void dev('dev.battle', { fixedSeed: v ? seed : null })} />
        </div>
      </Field>
    </Panel>
  );
}

function Balance() {
  const cfg = useCfg();
  const s = useGameState();
  const [n, setN] = useState(Math.round(lootLuck(s, cfg) * 100));
  const rng = new Rng(1);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) counts[rollRarity(cfg, rng, n / 100)]++;
  return (
    <Panel title={t('dev.balance')}>
      <Button
        size="small"
        onClick={async () => {
          const r = await useGame.getState().backend().dev('config.reload');
          if (r) useUi.getState().toast(t('dev.done'), 'good');
          await useGame.getState().resync();
        }}
      >
        {t('dev.reloadConfig')}
      </Button>
      <div className={css.divider} />
      <div className={css.tiny}>{t('dev.coefficients')} (v{cfg.version})</div>
      <pre style={{ fontSize: 10, maxHeight: 220, overflow: 'auto', background: '#0e0a0c', padding: 6, borderRadius: 4, userSelect: 'text' }}>
        {JSON.stringify({ stat: cfg.stat, enemy: cfg.enemy, income: cfg.income, hero: cfg.hero }, null, 1)}
      </pre>
      <div className={css.tiny}>{t('dev.lootTable')}</div>
      <Field label="luck %">
        <input className={css.input} type="number" value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: 90 }} />
      </Field>
      {counts.map((c, i) => (
        <div key={i} className={css.statRow}>
          <span>{tl(ITEM_RARITY_NAMES[i])}</span>
          <b>{((c / 4000) * 100).toFixed(2)}%</b>
        </div>
      ))}
    </Panel>
  );
}

function Account() {
  const [snaps, setSnaps] = useState<{ slot: number; at: number | null }[]>([]);
  const load = () => void useGame.getState().backend().dev('snapshot.list').then((r) => setSnaps((r as typeof snaps) ?? []));
  useEffect(load, []);
  return (
    <Panel title={t('dev.account')}>
      {[1, 2, 3].map((slot) => {
        const snap = snaps.find((x) => x.slot === slot);
        return (
          <div key={slot} className={css.statRow}>
            <span>
              {t('dev.snapshot', { n: slot })} <span className={css.tiny}>{snap?.at ? new Date(snap.at).toLocaleString() : '—'}</span>
            </span>
            <div className={css.row} style={{ gap: 4 }}>
              <Button size="small" onClick={async () => { await useGame.getState().backend().dev('snapshot.save', { slot }); load(); useUi.getState().toast(t('dev.done'), 'good'); }}>
                {t('dev.save')}
              </Button>
              <Button size="small" kind="secondary" disabled={!snap?.at} onClick={async () => { await useGame.getState().backend().dev('snapshot.load', { slot }); await useGame.getState().resync(); useUi.getState().toast(t('dev.done'), 'good'); }}>
                {t('dev.load')}
              </Button>
            </div>
          </div>
        );
      })}
      <div className={css.divider} />
      <Button kind="danger" block onClick={() => confirmDialog(t('dev.resetConfirm'), () => void dev('dev.reset'))}>
        {t('dev.reset')}
      </Button>
    </Panel>
  );
}


function Log() {
  const [rows, setRows] = useState<{ at: number; op?: string; section?: string; body?: unknown; payload?: unknown }[]>([]);
  useEffect(() => {
    void useGame.getState().backend().dev('log').then((r) => setRows((r as typeof rows) ?? []));
  }, []);
  return (
    <Panel title={t('dev.log')}>
      <div className={css.list}>
        {rows.map((r, i) => (
          <div key={i} className={css.listItem} style={{ fontSize: 11, flexDirection: 'column', alignItems: 'flex-start', userSelect: 'text' }}>
            <b>
              {new Date(r.at).toLocaleString()} · {r.op ?? r.section}
            </b>
            <code style={{ wordBreak: 'break-all' }}>{JSON.stringify(r.body ?? r.payload)}</code>
          </div>
        ))}
        {rows.length === 0 && <div className={css.muted}>—</div>}
      </div>
    </Panel>
  );
}
