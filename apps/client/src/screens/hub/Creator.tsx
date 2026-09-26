import {
  CLASSES,
  ELEMENTS,
  ELEMENT_COLORS,
  HEROINES,
  HEROINE_MAP,
  HERO_RARITY_COLORS,
  SKINS,
  type Accessory,
  type ClassId,
  type Element,
  type HairStyle,
  type HeroRarity,
  type L10n,
  type Look,
  type Wear,
} from '@idle/shared';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { frameKey, lifeFrame, newLife, type LifeFrame } from '../../art/anim';
import { EXTRA_POSES, type Arms } from '../../art/figure';
import { customCanvas, customUrl } from '../../art/runtime';
import { Button, ElementIcon, Panel, Toggle, confirmDialog, css, cx, elementName } from '../../components/ui';
import { t, tl } from '../../i18n';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';
import { BackHeader } from '../common';
import st from './Creator.module.css';

// ——— варианты ———

const L = (ru: string, en: string): L10n => ({ ru, en });

const STYLES: [HairStyle, L10n][] = [
  ['long', L('Длинные', 'Long')],
  ['short', L('Короткие', 'Short')],
  ['bob', L('Каре', 'Bob')],
  ['ponytail', L('Хвост', 'Ponytail')],
  ['twintails', L('Два хвостика', 'Twintails')],
  ['braid', L('Коса', 'Braid')],
  ['bun', L('Пучок', 'Bun')],
  ['wild', L('Грива', 'Wild')],
];

const ACCS: [Accessory, L10n][] = [
  ['none', L('Нет', 'None')],
  ['crown', L('Корона', 'Crown')],
  ['tiara', L('Диадема', 'Tiara')],
  ['halo', L('Нимб', 'Halo')],
  ['horns', L('Рога', 'Horns')],
  ['witchHat', L('Шляпа ведьмы', 'Witch hat')],
  ['sunHat', L('Шляпка', 'Sun hat')],
  ['hood', L('Капюшон', 'Hood')],
  ['helmet', L('Шлем', 'Helmet')],
  ['veil', L('Вуаль', 'Veil')],
  ['mask', L('Маска', 'Mask')],
  ['bandana', L('Бандана', 'Bandana')],
  ['flower', L('Цветок', 'Flower')],
  ['bow', L('Бант', 'Bow')],
  ['elfEars', L('Ушки эльфа', 'Elf ears')],
  ['catEars', L('Кошачьи ушки', 'Cat ears')],
  ['bunnyEars', L('Ушки зайки', 'Bunny ears')],
  ['maidBand', L('Ободок горничной', 'Maid band')],
];

type Extra = NonNullable<Look['extra']>;
const EXTRAS: [Extra, L10n][] = [
  ['none', L('Нет', 'None')],
  ['wings', L('Крылья', 'Wings')],
  ['darkWings', L('Тёмные крылья', 'Dark wings')],
  ['tail', L('Хвост', 'Tail')],
  ['fishTail', L('Русалка', 'Mermaid')],
  ['snake', L('Ламия', 'Lamia')],
  ['scorpion', L('Скорпион', 'Scorpion')],
  ['vines', L('Лозы', 'Vines')],
  ['gears', L('Шестерни', 'Gears')],
];

/** '' — классовый костюм. */
const WEARS: [Wear | '', L10n][] = [
  ['', L('По классу', 'Class outfit')],
  ['gown', L('Бальное платье', 'Gown')],
  ['silk', L('Шёлк', 'Silk')],
  ['yukata', L('Юката', 'Yukata')],
  ['regalia', L('Регалии', 'Regalia')],
  ['dancer', L('Танцовщица', 'Dancer')],
  ['maid', L('Горничная', 'Maid')],
  ['bunny', L('Зайка', 'Bunny')],
  ['swim', L('Купальник 1', 'Swimsuit 1')],
  ['swim2', L('Купальник 2', 'Swimsuit 2')],
  ['swim3', L('Купальник 3', 'Swimsuit 3')],
  ['swim4', L('Купальник 4', 'Swimsuit 4')],
  ['lace', L('Бельё 1', 'Lingerie 1')],
  ['lace2', L('Бельё 2', 'Lingerie 2')],
  ['lace3', L('Бельё 3', 'Lingerie 3')],
  ['lace4', L('Бельё 4', 'Lingerie 4')],
];

const BUSTS: [number, L10n][] = [
  [-1, L('Стройная', 'Slim')],
  [0, L('Обычная', 'Regular')],
  [1, L('Пышная', 'Full')],
  [2, L('Очень пышная', 'Very full')],
];
const HIPS: [number, L10n][] = [
  [0, L('Обычные', 'Regular')],
  [1, L('Широкие', 'Wide')],
  [2, L('Очень широкие', 'Very wide')],
];

type PoseId = 'battle' | Arms;
const POSES: [PoseId, L10n][] = [
  ['battle', L('Боевая', 'Battle')],
  ['hips', L('Руки на бёдрах', 'Hands on hips')],
  ['behindHead', L('Руки за головой', 'Hands behind head')],
  ['victory', L('Победа', 'Victory')],
  ['wave', L('Машет', 'Wave')],
  ['crossed', L('Руки скрещены', 'Arms crossed')],
  ['shy', L('Стесняется', 'Shy')],
  ['kiss', L('Поцелуй', 'Blow a kiss')],
];

const RARITIES: HeroRarity[] = ['R', 'SR', 'SSR', 'UR'];
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

const HAIR_COLORS = ['#1A1418', '#3A2A24', '#6A3A1E', '#A0522D', '#E0532A', '#C03040', '#E8B04A', '#F2E3A0', '#F4F0E8', '#C0C8D8', '#E878B0', '#9A5AE0', '#4A7AE0', '#3AE0E0', '#4ABF3A', '#2A1E3A'];
const SKIN_COLORS = ['#FFE4D4', '#F4D3B8', '#EBC09C', '#C98E62', '#8A5A3C', '#5A3A2A', '#E8DCE8', '#B8B0C8', '#9FC4E0', '#A9D19A', '#F0B0B0', '#D86A6A'];
const EYE_COLORS = ['#6BC04A', '#5AA0E0', '#3AE0E0', '#9A5AE0', '#E878B0', '#E03A3A', '#F0B030', '#8A5A34', '#C0C8D8', '#1A1418'];
const CLOTH_COLORS = ['#1A1418', '#3A2436', '#2A1E3A', '#8A92A6', '#E8ECF2', '#FFFFFF', '#E03A3A', '#C0306A', '#E878B0', '#F08A24', '#E0A13A', '#F2D46B', '#4ABF3A', '#3F8A34', '#3A6AB0', '#5AA0E0', '#3AE0E0', '#9A5AE0', '#6A3A1E', '#D4A640'];

// ——— черновик ———

interface Draft {
  /** героиня-основа ('' — с нуля) и её облик */
  base: string;
  skin: string;
  name: string;
  cls: ClassId;
  element: Element;
  rarity: HeroRarity;
  look: Look;
}

function fromHero(id: string, skin = ''): Draft {
  const h = HEROINE_MAP[id];
  const sk = SKINS.find((x) => x.id === skin);
  return {
    base: id,
    skin: sk ? skin : '',
    name: tl(h.name),
    cls: h.cls,
    element: h.element,
    rarity: h.rarity,
    look: { extra: 'none', ...h.look, ...(sk?.look ?? {}) },
  };
}

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

function randomDraft(): Draft {
  const wear = Math.random() < 0.45 ? pick(WEARS.slice(1))[0] : '';
  const acc = Math.random() < 0.3 ? 'none' : pick(ACCS)[0];
  return {
    base: '',
    skin: '',
    name: pick(['Аэлина', 'Вега', 'Ирида', 'Кассия', 'Лейла', 'Мелисса', 'Ноэль', 'Рэйна', 'Сольвейг', 'Талия', 'Эйра']),
    cls: pick(CLASS_IDS),
    element: pick(ELEMENTS),
    rarity: pick(RARITIES),
    look: {
      hair: pick(HAIR_COLORS),
      style: pick(STYLES)[0],
      skin: pick(SKIN_COLORS.slice(0, 8)),
      eyes: pick(EYE_COLORS),
      outfit: pick(CLOTH_COLORS),
      trim: pick(CLOTH_COLORS),
      acc,
      accColor: pick(CLOTH_COLORS),
      extra: Math.random() < 0.75 ? 'none' : pick(EXTRAS.slice(1))[0],
      ...(wear ? { wear } : {}),
      bust: pick([0, 0, 1, 1, 2]),
      hips: pick([0, 0, 1, 2]),
    },
  };
}

const DRAFT_KEY = 'creator:draft';
const PRESETS_KEY = 'creator:presets';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* хранилище недоступно — просто не запоминаем */
  }
}

/** Описание для разработчика: готовый к вставке облик и всё, что нужно для новой героини. */
function describe(d: Draft, pose: PoseId): string {
  const look = { ...d.look };
  if (look.extra === 'none') delete look.extra;
  if (!look.bust) delete look.bust;
  if (!look.hips) delete look.hips;
  if (look.acc === 'none') delete look.accColor;
  const body = Object.entries(look)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`)
    .join(', ');
  const lines = [
    `Героиня: ${d.name || '—'} · ${tl(CLASSES[d.cls].name)} · ${elementName(d.element)} · ${d.rarity}`,
    `cls: '${d.cls}', element: '${d.element}', rarity: '${d.rarity}'`,
  ];
  if (d.base) lines.push(`Основа: ${d.base}${d.skin ? ` (облик ${d.skin})` : ''}`);
  lines.push(`look: { ${body} }`);
  if (pose !== 'battle') lines.push(`Поза: ${pose}`);
  return lines.join('\n');
}

// ——— мелкие элементы ———

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Panel title={title}>{children}</Panel>;
}

function Chips<T extends string | number>({ items, value, onChange }: { items: [T, L10n][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={st.chips}>
      {items.map(([id, label]) => (
        <button key={String(id)} className={cx(css.chip, value === id && css.chipOn)} onClick={() => onChange(id)}>
          {tl(label)}
        </button>
      ))}
    </div>
  );
}

function Colors({ label, value, list, onChange }: { label: string; value: string | undefined; list: string[]; onChange: (v: string) => void }) {
  const cur = (value ?? '#000000').toUpperCase();
  return (
    <div className={st.colorRow}>
      <div className={st.colorHead}>
        <span className={css.tiny}>{label}</span>
        <label className={st.custom} style={{ background: cur }} title={t('cr.custom')}>
          <input type="color" value={cur.length === 7 ? cur : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        </label>
      </div>
      <div className={st.swatches}>
        {list.map((c) => (
          <button key={c} className={cx(st.swatch, cur === c.toUpperCase() && st.swatchOn)} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
        ))}
      </div>
    </div>
  );
}

// ——— превью ———

/** Живое превью: дышит и моргает; в боевой позе — с оружием, «Удар» показывает кадр атаки. */
function Preview({ d, pose, armed, strike }: { d: Draft; pose: PoseId; armed: boolean; strike: boolean }) {
  const [frame, setFrame] = useState<LifeFrame>({ arms: 'idle', eyes: 'open' });
  const winged = d.look.extra === 'wings' || d.look.extra === 'darkWings' || d.look.extra === 'tail' || d.look.extra === 'scorpion';
  useEffect(() => {
    const life = newLife(performance.now(), true, winged);
    let key = '';
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const f = lifeFrame(life, performance.now());
      const k = frameKey(f);
      if (k !== key) {
        key = k;
        setFrame(f);
      }
    }, 60);
    return () => clearInterval(id);
  }, [winged]);
  const battle = pose === 'battle';
  const arms: Arms = battle ? (strike ? 'attack' : frame.arms) : pose;
  const eyes = pose === 'kiss' ? 'wink' : frame.eyes;
  const src = customUrl(d.look, d.cls, d.element, { arms, eyes, flap: frame.flap }, battle && armed);
  const still = customUrl(d.look, d.cls, d.element, {}, true);
  return (
    <div className={st.stage} style={{ ['--el' as string]: ELEMENT_COLORS[d.element] }}>
      <img className={cx('pixel', st.big)} src={src} alt="" draggable={false} />
      <div className={st.sizes}>
        <div className={st.sizeBox}>
          <img className="pixel" src={still} width={72} height={72} alt="" draggable={false} />
          <span className={css.tiny}>{t('cr.inGame')}</span>
        </div>
        <div className={st.sizeBox}>
          <div className={st.portrait} style={{ borderColor: HERO_RARITY_COLORS[d.rarity] }}>
            <img className="pixel" src={still} alt="" draggable={false} />
          </div>
          <span className={css.tiny}>{t('cr.portrait')}</span>
        </div>
      </div>
    </div>
  );
}

/** Картинка для бота: боевая стойка и выбранная поза рядом, крупно. */
function renderCard(d: Draft, pose: PoseId): string {
  const S = 6;
  const c = document.createElement('canvas');
  c.width = 48 * S * 2 + 24;
  c.height = 48 * S + 16;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#2a1a24');
  g.addColorStop(1, '#120a10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = false;
  const a = customCanvas(d.look, d.cls, d.element, {}, true);
  const b = customCanvas(d.look, d.cls, d.element, pose === 'battle' ? { eyes: 'wink' } : { arms: pose, eyes: pose === 'kiss' ? 'wink' : 'open' }, pose === 'battle');
  ctx.drawImage(a, 8, 8, 48 * S, 48 * S);
  ctx.drawImage(b, 16 + 48 * S, 8, 48 * S, 48 * S);
  return c.toDataURL('image/png');
}

// ——— экран ———

export function Creator() {
  const [d, setD] = useState<Draft>(() => readJson<Draft | null>(DRAFT_KEY, null) ?? fromHero('lira'));
  const [pose, setPose] = useState<PoseId>('battle');
  const [armed, setArmed] = useState(true);
  const [strike, setStrike] = useState(false);
  const [presets, setPresets] = useState<{ name: string; d: Draft }[]>(() => readJson(PRESETS_KEY, []));
  const [sending, setSending] = useState(false);

  useEffect(() => writeJson(DRAFT_KEY, d), [d]);

  const setLook = (patch: Partial<Look>) => setD((x) => ({ ...x, look: { ...x.look, ...patch } }));
  const text = useMemo(() => describe(d, pose), [d, pose]);
  const skins = SKINS.filter((s) => s.hero === d.base);
  const toast = useUi.getState().toast;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('cr.copied'), 'good');
    } catch {
      toast(t('cr.copyFail'), 'info');
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const r = (await useGame.getState().backend().dev('creator.send', { png: renderCard(d, pose), text, title: d.name })) as { ok?: boolean; error?: { code: string } } | null;
      if (r?.ok) toast(t('cr.sent'), 'good');
      else toast(t(r?.error?.code === 'noChat' || !r ? 'cr.sendLocal' : 'cr.sendFail'), 'bad');
    } catch {
      toast(t('cr.sendFail'), 'bad');
    } finally {
      setSending(false);
    }
  };

  const savePreset = () => {
    const name = d.name || `#${presets.length + 1}`;
    const next = [{ name, d }, ...presets.filter((p) => p.name !== name)].slice(0, 20);
    setPresets(next);
    writeJson(PRESETS_KEY, next);
    toast(t('cr.saved', { name }), 'good');
  };

  const removePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    writeJson(PRESETS_KEY, next);
  };

  const extraPose = EXTRA_POSES.includes(pose as Arms);

  return (
    <div className={css.col}>
      <BackHeader title={t('cr.title')} />
      <div className={st.sticky}>
        <Preview d={d} pose={pose} armed={armed} strike={strike} />
        <div className={st.poseRow}>
          {POSES.map(([id, label]) => (
            <button key={id} className={cx(css.chip, pose === id && css.chipOn)} onClick={() => setPose(id)}>
              {tl(label)}
            </button>
          ))}
        </div>
      </div>
      <div className={st.tools}>
          <label className={st.toggle}>
            <span className={css.tiny}>{t('cr.weapon')}</span>
            <Toggle value={armed && !extraPose} onChange={setArmed} />
          </label>
          <Button
            size="small"
            kind="secondary"
            disabled={pose !== 'battle' || !armed}
            onClick={() => {
              setStrike(true);
              setTimeout(() => setStrike(false), 450);
            }}
          >
            {t('cr.strike')}
          </Button>
          <Button size="small" kind="secondary" onClick={() => setD(randomDraft())}>
            🎲 {t('cr.random')}
          </Button>
      </div>

      <Section title={t('cr.base')}>
        <div className={st.baseRow}>
          <select className={css.input} value={d.base} onChange={(e) => (e.target.value ? setD(fromHero(e.target.value)) : setD((x) => ({ ...x, base: '', skin: '' })))}>
            <option value="">{t('cr.scratch')}</option>
            {HEROINES.map((h) => (
              <option key={h.id} value={h.id}>
                {tl(h.name)} · {h.rarity}
              </option>
            ))}
          </select>
          <select className={css.input} value={d.skin} disabled={!skins.length} onChange={(e) => setD(fromHero(d.base, e.target.value))}>
            <option value="">{t('cr.baseSkin')}</option>
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {tl(s.name)}
              </option>
            ))}
          </select>
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('cr.baseHint')}
        </div>
      </Section>

      <Section title={t('cr.who')}>
        <input className={css.input} value={d.name} maxLength={24} placeholder={t('cr.name')} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} style={{ width: '100%' }} />
        <div className={st.label}>{t('cr.class')}</div>
        <Chips items={CLASS_IDS.map((c) => [c, CLASSES[c].name] as [ClassId, L10n])} value={d.cls} onChange={(cls) => setD((x) => ({ ...x, cls }))} />
        <div className={st.label}>{t('cr.element')}</div>
        <div className={st.chips}>
          {ELEMENTS.map((el) => (
            <button key={el} className={cx(css.chip, d.element === el && css.chipOn)} onClick={() => setD((x) => ({ ...x, element: el }))}>
              <ElementIcon el={el} size={14} /> {elementName(el)}
            </button>
          ))}
        </div>
        <div className={st.label}>{t('cr.rarity')}</div>
        <div className={st.chips}>
          {RARITIES.map((r) => (
            <button key={r} className={cx(css.chip, d.rarity === r && css.chipOn)} style={{ color: d.rarity === r ? undefined : HERO_RARITY_COLORS[r] }} onClick={() => setD((x) => ({ ...x, rarity: r }))}>
              {r}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('cr.figure')}>
        <div className={st.label}>{t('cr.bust')}</div>
        <Chips items={BUSTS} value={d.look.bust ?? 0} onChange={(bust) => setLook({ bust })} />
        <div className={st.label}>{t('cr.hips')}</div>
        <Chips items={HIPS} value={d.look.hips ?? 0} onChange={(hips) => setLook({ hips })} />
        <Colors label={t('cr.skin')} value={d.look.skin} list={SKIN_COLORS} onChange={(skin) => setLook({ skin })} />
        <Colors label={t('cr.eyes')} value={d.look.eyes} list={EYE_COLORS} onChange={(eyes) => setLook({ eyes })} />
      </Section>

      <Section title={t('cr.hair')}>
        <Chips items={STYLES} value={d.look.style} onChange={(style) => setLook({ style })} />
        <Colors label={t('cr.color')} value={d.look.hair} list={HAIR_COLORS} onChange={(hair) => setLook({ hair })} />
      </Section>

      <Section title={t('cr.outfit')}>
        <Chips items={WEARS} value={d.look.wear ?? ''} onChange={(w) => setLook({ wear: w || undefined })} />
        <Colors label={t('cr.outfitColor')} value={d.look.outfit} list={CLOTH_COLORS} onChange={(outfit) => setLook({ outfit })} />
        <Colors label={t('cr.trimColor')} value={d.look.trim} list={CLOTH_COLORS} onChange={(trim) => setLook({ trim })} />
      </Section>

      <Section title={t('cr.acc')}>
        <Chips items={ACCS} value={d.look.acc} onChange={(acc) => setLook({ acc })} />
        {d.look.acc !== 'none' && <Colors label={t('cr.color')} value={d.look.accColor ?? d.look.trim} list={CLOTH_COLORS} onChange={(accColor) => setLook({ accColor })} />}
      </Section>

      <Section title={t('cr.extra')}>
        <Chips items={EXTRAS} value={d.look.extra ?? 'none'} onChange={(extra) => setLook({ extra })} />
      </Section>

      <Section title={t('cr.result')}>
        <pre className={st.code}>{text}</pre>
        <div className={st.actions}>
          <Button block size="big" disabled={sending} onClick={() => void send()}>
            {t('cr.send')}
          </Button>
          <div className={css.row} style={{ gap: 6 }}>
            <Button kind="secondary" style={{ flex: 1 }} onClick={() => void copy()}>
              {t('cr.copy')}
            </Button>
            <Button kind="secondary" style={{ flex: 1 }} onClick={savePreset}>
              {t('cr.save')}
            </Button>
          </div>
        </div>
        <div className={css.tiny} style={{ marginTop: 6 }}>
          {t('cr.sendHint')}
        </div>
      </Section>

      {presets.length > 0 && (
        <Section title={t('cr.presets')}>
          <div className={st.presets}>
            {presets.map((p) => (
              <div key={p.name} className={st.preset}>
                <button className={st.presetBtn} onClick={() => setD(p.d)}>
                  <img className="pixel" src={customUrl(p.d.look, p.d.cls, p.d.element, {}, false)} width={64} height={64} alt="" draggable={false} />
                  <span>{p.name}</span>
                </button>
                <button className={st.presetDel} aria-label={t('cr.delete')} onClick={() => confirmDialog(t('cr.deleteAsk', { name: p.name }), () => removePreset(p.name))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
