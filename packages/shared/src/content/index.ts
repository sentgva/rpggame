import { ACT_BOSSES, ENEMY_SKILLS } from './acts';
import { CLASS_SKILLS } from './classes';
import type { SkillDef } from './effects';
import { HEROINE_MAP } from './heroines';
import { TREE_SKILLS } from './trees';

export * from './acts';
export * from './classes';
export * from './effects';
export * from './heroines';
export * from './items';
export * from './modes';
export * from './progression';
export * from './quests';
export * from './shop';
export * from './trees';

// Боссы актов выглядят как их играбельные версии.
for (const b of ACT_BOSSES) {
  if (b.hero) b.look = HEROINE_MAP[b.hero].look;
}

export const SKILL_MAP: Record<string, SkillDef> = Object.fromEntries(
  [...CLASS_SKILLS, ...TREE_SKILLS, ...ENEMY_SKILLS].map((s) => [s.id, s]),
);
export * from './encounters';
export * from './changelog';
export * from './bond';
