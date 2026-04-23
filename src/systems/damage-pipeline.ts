import type { DerivedStats } from './boost-runner';

export const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'poison',
  'radiant', 'necrotic', 'lightning', 'psychic',
] as const;

export type DamageType = typeof DAMAGE_TYPES[number];

export interface DamageInput {
  amount: number;
  type: DamageType | string;
  bonusDamage?: number;
}

export interface DamageResult {
  raw: number;
  type: string;
  final: number;
  immune: boolean;
  resistant: boolean;
  vulnerable: boolean;
  multiplier: number;
}

export function resolveDamage(
  input: DamageInput,
  targetDerived?: DerivedStats | null,
  sourceDerived?: DerivedStats | null,
): DamageResult {
  const raw = input.amount + (input.bonusDamage ?? 0) + (sourceDerived?.damage ?? 0);
  const type = input.type;

  if (!targetDerived) {
    return { raw, type, final: Math.max(1, raw), immune: false, resistant: false, vulnerable: false, multiplier: 1 };
  }

  const immune = targetDerived.immunities.has(type);
  const resistant = targetDerived.resistances.has(type);
  const vulnerable = targetDerived.vulnerabilities.has(type);

  if (immune) {
    return { raw, type, final: 0, immune: true, resistant: false, vulnerable: false, multiplier: 0 };
  }

  if (resistant && vulnerable) {
    const final = Math.max(1, raw);
    return { raw, type, final, immune: false, resistant: true, vulnerable: true, multiplier: 1 };
  }

  if (vulnerable) {
    const final = Math.max(1, raw * 2);
    return { raw, type, final, immune: false, resistant: false, vulnerable: true, multiplier: 2 };
  }

  if (resistant) {
    const final = Math.max(1, Math.floor(raw / 2));
    return { raw, type, final, immune: false, resistant: true, vulnerable: false, multiplier: 0.5 };
  }

  return { raw, type, final: Math.max(1, raw), immune: false, resistant: false, vulnerable: false, multiplier: 1 };
}

export function hasAdvantageOnRoll(
  rollType: string,
  derived?: DerivedStats | null,
): { advantage: boolean; disadvantage: boolean; net: 'advantage' | 'disadvantage' | 'normal' } {
  if (!derived) return { advantage: false, disadvantage: false, net: 'normal' };

  const advantage = derived.advantages.has(rollType);
  const disadvantage = derived.disadvantages.has(rollType);

  if (advantage && disadvantage) return { advantage: true, disadvantage: true, net: 'normal' };
  if (advantage) return { advantage: true, disadvantage: false, net: 'advantage' };
  if (disadvantage) return { advantage: false, disadvantage: true, net: 'disadvantage' };
  return { advantage: false, disadvantage: false, net: 'normal' };
}

export function isAutoFail(
  saveType: string,
  derived?: DerivedStats | null,
): boolean {
  if (!derived) return false;
  return derived.autoFails.has(saveType);
}

export function getSaveBonus(
  saveStat: string,
  derived?: DerivedStats | null,
): number {
  if (!derived) return 0;
  return (derived.saves[saveStat] ?? 0) + derived.saveAll;
}
