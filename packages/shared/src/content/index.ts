import { ACT_BOSSES, ENEMY_SKILLS } from './acts';
import { FESTIVAL_SKILLS } from './festival';
import { HEROINE_MAP } from './heroines';

export * from './acts';
export * from './classes';
export * from './heroines';
export * from './items';
export * from './modes';
export * from './quests';
export * from './shop';
export * from './changelog';
export * from './bond';
export * from './festival';
export * from './photo';
export * from './fishing';
export * from './mine';
export * from './volley';
export * from './campfire';
export * from './adjutant';
export * from './fashion';
export * from './sortie';

// Боссы актов выглядят как их играбельные версии.
for (const b of ACT_BOSSES) {
  if (b.hero) b.look = HEROINE_MAP[b.hero].look;
}
// Умения боссов праздников — в общем словаре умений врагов.
for (const sk of FESTIVAL_SKILLS) ENEMY_SKILLS[sk.id] = sk;
