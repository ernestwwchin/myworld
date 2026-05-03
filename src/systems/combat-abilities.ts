import type { AbilityDef } from '@/config';

export interface CombatAbilityDef extends AbilityDef {
  actionCost?: 'action' | 'bonusAction' | 'free';
  range?: 'melee' | number;
  attackType?: 'melee' | 'ranged';
  onCast?: string;
  roll?: string;
  onHit?: string;
  onMiss?: string;
  condition?: string;
  uiGroup?: string;
  class?: string[];
}

export const CORE_COMBAT_ABILITIES: Record<string, CombatAbilityDef> = {
  attack: {
    name: 'Attack',
    type: 'action',
    actionCost: 'action',
    range: 'melee',
    attackType: 'melee',
    uiGroup: 'common',
    class: ['all'],
    roll: 'attackRoll("melee")',
    onHit: 'dealWeaponDamage()',
    onMiss: 'logMessage("Miss!")',
  },
  dash: {
    name: 'Dash',
    type: 'action',
    actionCost: 'action',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'grantResource("movement", 5)',
  },
  disengage: {
    name: 'Disengage',
    type: 'bonusAction',
    actionCost: 'bonusAction',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'applyStatus(self, "disengaged", 1)',
  },
  hide: {
    name: 'Hide',
    type: 'action',
    actionCost: 'action',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'applyStatus(self, "hidden", 1)\nlogMessage("You vanish into the shadows.")',
  },
  flee: {
    name: 'Flee',
    type: 'action',
    actionCost: 'action',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'applyStatus(self, "fleeing", 1)\nlogMessage("You attempt to flee!")',
  },
  dodge: {
    name: 'Dodge',
    type: 'action',
    actionCost: 'action',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'applyStatus(self, "dodging", 1)',
  },
  help: {
    name: 'Help',
    type: 'action',
    actionCost: 'action',
    uiGroup: 'common',
    class: ['all'],
    onCast: 'logMessage("You assist an ally.")',
  },
};

export function getCombatAbility(id: string): CombatAbilityDef | undefined {
  return CORE_COMBAT_ABILITIES[id];
}

export function listCombatAbilities(): CombatAbilityDef[] {
  return Object.values(CORE_COMBAT_ABILITIES);
}

export function getAbilitiesByGroup(group: string): CombatAbilityDef[] {
  return Object.values(CORE_COMBAT_ABILITIES).filter(a => a.uiGroup === group);
}
