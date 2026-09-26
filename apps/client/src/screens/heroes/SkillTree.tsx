import {
  CLASSES,
  HEROINE_MAP,
  SKILL_MAP,
  TIER_REQ,
  TREES,
  branchPoints,
  fxText,
  isUnlocked,
  skillPoints,
  spentPoints,
  statText,
  type StatKey,
  type TreeNode,
} from '@idle/shared';
import { Button, Cost, Icon, Panel, css, cx } from '../../components/ui';
import { getLang, t, tl } from '../../i18n';
import { useCfg, useGame, useGameState } from '../../store/game';
import { useUi } from '../../store/ui';
import { describeMod, describeSkill } from '../../text/describe';
import { Locked } from '../common';

const VFX_ICON: Record<string, string> = {
  fire: 'fire',
  ice: 'water',
  holy: 'light',
  dark: 'dark',
  poison: 'nature',
  arrow: 'archer',
  slash: 'weapon',
  bolt: 'speed',
  song: 'bard',
  heal: 'plus',
  shield: 'offhand',
  nova: 'summon',
};

const STAT_ICON: Partial<Record<StatKey, string>> = {
  hp: 'heroes',
  hpPct: 'heroes',
  atk: 'weapon',
  atkPct: 'weapon',
  def: 'offhand',
  defPct: 'offhand',
  spd: 'speed',
  crit: 'star',
  critDmg: 'star',
  lifesteal: 'gem',
  healPower: 'plus',
  resist: 'cloak',
  energyRegen: 'ether',
  dmgFire: 'fire',
  dmgWater: 'water',
  dmgNature: 'nature',
  dmgLight: 'light',
  dmgDark: 'dark',
  dmgDot: 'nature',
  dmgBoss: 'skull',
  dmgSkill: 'summon',
  dmgUlt: 'ether',
  shieldPower: 'offhand',
  dmgReduce: 'armor',
  pen: 'weapon',
  acc: 'archer',
  eva: 'boots',
  dmgBasic: 'weapon',
};

export function nodeIcon(n: TreeNode): string {
  if (n.kind === 'active') return VFX_ICON[SKILL_MAP[n.skill!]?.vfx ?? 'slash'] ?? 'weapon';
  if (n.kind === 'mod') return 'forge';
  if (n.kind === 'key') return 'trophy';
  const k = Object.keys(n.stats ?? {})[0] as StatKey;
  return STAT_ICON[k] ?? 'star';
}

export function nodeName(n: TreeNode): string {
  if (n.kind === 'passive')
    return Object.entries(n.stats ?? {})
      .map(([k, v]) => statText(k as StatKey, v as number, getLang()))
      .join(', ');
  return tl(n.name);
}

export function SkillTree({ heroId }: { heroId: string }) {
  const s = useGameState();
  const cfg = useCfg();
  const h = s.heroines[heroId];
  const cls = HEROINE_MAP[heroId].cls;
  if (!isUnlocked({ s, cfg }, 'tree')) return <Locked text={t('tree.locked')} />;
  const nodes = TREES[cls];
  const free = skillPoints(s, h) - spentPoints(h);
  const resetCost = h.lvl >= cfg.hero.treeFreeResetLevel ? Math.ceil(cfg.hero.treeResetCost * (s.week.treeDiscount ? 1 : 0.5)) : 0;

  return (
    <div className={css.col}>
      <Panel
        title={<span className={free > 0 ? css.gold : undefined}>{t('tree.points', { n: free })}</span>}
        right={
          <Button size="small" kind="ghost" onClick={() => void useGame.getState().act('tree.reset', { id: heroId })}>
            {t('tree.reset')}
            {resetCost > 0 ? <Cost cur="crystals" amount={resetCost} size={14} /> : ` · ${t('common.free')}`}
          </Button>
        }
      >
        <EquippedSkills heroId={heroId} />
      </Panel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {[0, 1, 2].map((b) => {
          const pts = branchPoints(h, cls, b);
          return (
            <div key={b} className={css.panel} style={{ padding: 6 }}>
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-pixel)', color: 'var(--accent-2)', fontSize: 16 }}>{tl(CLASSES[cls].branches[b])}</div>
              <div className={css.tiny} style={{ textAlign: 'center', marginBottom: 4 }}>
                {pts}
              </div>
              {[1, 2, 3, 4].map((tier) => {
                const tierNodes = nodes.filter((n) => n.branch === b && n.tier === tier);
                const open = pts >= TIER_REQ[tier];
                return (
                  <div key={tier} style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 6, opacity: open ? 1 : 0.45 }}>
                    {tierNodes.map((n) => (
                      <NodeCell key={n.id} node={n} rank={h.tree[n.id] ?? 0} onClick={() => openNode(heroId, n)} />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeCell({ node, rank, onClick }: { node: TreeNode; rank: number; onClick: () => void }) {
  const border = node.kind === 'key' ? '#ffb45c' : node.kind === 'active' ? '#7ee0ff' : node.kind === 'mod' ? '#b98bff' : '#ff8fc8';
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: 30,
        height: 30,
        borderRadius: node.kind === 'active' || node.kind === 'key' ? 15 : 9,
        border: `1.5px solid ${rank > 0 ? border : 'rgba(255,255,255,.14)'}`,
        background: rank > 0 ? `radial-gradient(circle, color-mix(in srgb, ${border} 30%, transparent), rgba(20,18,48,.9))` : 'rgba(20,18,48,.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: rank >= node.max ? `0 0 6px ${border}` : undefined,
      }}
    >
      <Icon name={nodeIcon(node)} size={20} style={{ opacity: rank > 0 ? 1 : 0.4 }} />
      <span style={{ position: 'absolute', bottom: -6, right: -4, fontSize: 9, fontWeight: 800, background: '#1c1a40', borderRadius: 6, padding: '0 3px', color: rank >= node.max ? '#ffd98a' : 'var(--text)' }}>
        {rank}/{node.max}
      </span>
    </div>
  );
}

function openNode(heroId: string, node: TreeNode) {
  useUi.getState().open((close) => <NodeInfo heroId={heroId} node={node} onClose={close} />);
}

function NodeInfo({ heroId, node, onClose }: { heroId: string; node: TreeNode; onClose: () => void }) {
  const s = useGameState();
  const h = s.heroines[heroId];
  const rank = h.tree[node.id] ?? 0;
  const free = skillPoints(s, h) - spentPoints(h);
  const pts = branchPoints(h, node.cls, node.branch);
  const kind = { passive: t('tree.passive'), active: t('tree.active'), mod: t('tree.mod'), key: t('tree.key') }[node.kind];
  const shownRank = Math.max(1, rank);
  let lines: string[] = [];
  if (node.kind === 'active') {
    const sk = SKILL_MAP[node.skill!];
    lines = describeSkill(sk, shownRank);
    if (sk.cd) lines.push(t('tree.cd', { n: sk.cd }));
  } else if (node.kind === 'mod') {
    const sk = SKILL_MAP[node.mod!.skill];
    lines = [`${tl(sk?.name)}:`, ...describeMod(node.mod!, shownRank, sk)];
  } else if (node.kind === 'key') lines = [fxText(node.fx!, getLang())];
  else lines = Object.entries(node.stats ?? {}).map(([k, v]) => statText(k as StatKey, (v as number) * shownRank, getLang()));

  const blocked = pts < TIER_REQ[node.tier];
  const needSkill = node.kind === 'mod' ? TREES[node.cls].find((n) => n.skill === node.mod!.skill) : null;
  const skillMissing = needSkill && !(h.tree[needSkill.id] > 0);

  return (
    <div className={css.panel} style={{ width: '100%', maxWidth: 480, animation: 'slide-up .22s var(--ease)', paddingBottom: 'calc(14px + var(--safe-bottom))' }} onClick={(e) => e.stopPropagation()}>
      <div className={css.panelTitle}>
        <Icon name={nodeIcon(node)} size={28} />
        <span className={css.grow}>{node.kind === 'passive' ? kind : tl(node.name)}</span>
        <button className={css.closeBtn} onClick={onClose} style={{ background: 'transparent', border: 0 }}>
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className={css.tiny}>
        {kind} · {t('tree.rank', { r: rank, max: node.max })}
      </div>
      <div className={css.inset} style={{ margin: '8px 0' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, padding: '2px 0' }}>
            {l}
          </div>
        ))}
      </div>
      {blocked && <div className={cx(css.tiny, css.badText)}>{t('tree.tierReq', { n: TIER_REQ[node.tier] })}</div>}
      {skillMissing && <div className={cx(css.tiny, css.badText)}>{t('tree.needSkill', { skill: tl(needSkill!.name) })}</div>}
      <div className={css.row} style={{ marginTop: 8 }}>
        <Button block disabled={rank >= node.max || free <= 0 || blocked || !!skillMissing} onClick={() => void useGame.getState().act('tree.learn', { id: heroId, node: node.id })}>
          {t('tree.learn')} +1
        </Button>
        <Button kind="secondary" block disabled={rank >= node.max || free <= 0 || blocked || !!skillMissing} onClick={() => void useGame.getState().act('tree.learn', { id: heroId, node: node.id, ranks: node.max - rank })}>
          {t('tree.learnMax')}
        </Button>
      </div>
    </div>
  );
}

function EquippedSkills({ heroId }: { heroId: string }) {
  const s = useGameState();
  const h = s.heroines[heroId];
  const cls = CLASSES[HEROINE_MAP[heroId].cls];
  const ultId = h.spec ? cls.specs[h.spec === 'A' ? 0 : 1].ult : cls.ult;
  const learned = TREES[HEROINE_MAP[heroId].cls].filter((n) => n.kind === 'active' && (h.tree[n.id] ?? 0) > 0);

  const pick = (slot: number) => {
    useUi.getState().open((close) => (
      <div className={css.panel} style={{ width: '100%', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className={css.panelTitle}>{t('heroes.slot', { n: slot + 1 })}</div>
        <div className={css.list}>
          {learned.map((n) => (
            <div
              key={n.id}
              className={css.listItem}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const next = [...h.skills];
                const other = next.indexOf(n.skill!);
                if (other >= 0) next[other] = next[slot];
                next[slot] = n.skill!;
                void useGame.getState().act('hero.skills', { id: heroId, skills: next.slice(0, 2) });
                close();
              }}
            >
              <Icon name={nodeIcon(n)} size={24} />
              <div className={css.grow}>
                <b>{tl(n.name)}</b>
                <div className={css.tiny}>{describeSkill(SKILL_MAP[n.skill!], h.tree[n.id]).join(' · ')}</div>
              </div>
            </div>
          ))}
          {learned.length === 0 && <div className={css.muted}>{t('heroes.noSkill')}</div>}
        </div>
      </div>
    ));
  };

  return (
    <div className={css.col} style={{ gap: 4 }}>
      <div className={css.tiny}>{t('heroes.skills')}</div>
      <div className={css.row} style={{ flexWrap: 'wrap', gap: 4 }}>
        <span className={css.chip}>{t('heroes.basic')}</span>
        {[0, 1].map((i) => (
          <button key={i} className={cx(css.chip, h.skills[i] && css.chipOn)} onClick={() => pick(i)}>
            {h.skills[i] ? tl(SKILL_MAP[h.skills[i]!]?.name) : `${t('heroes.slot', { n: i + 1 })}: ${t('heroes.noSkill')}`}
          </button>
        ))}
        <span className={css.chip} style={{ borderColor: '#f08a24', color: '#f2c86a' }}>
          {t('heroes.ult')}: {tl(SKILL_MAP[ultId]?.name)}
        </span>
      </div>
    </div>
  );
}
