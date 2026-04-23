import { AbilityRunner } from './ability-runner';
import type { SceneAdapter, RollResult } from './ability-runner';
import type { Actor } from '@/types/actors';
import type { AbilityDef } from '@/config';

export interface UseAbilityResult {
  executed: boolean;
  hits: boolean | null;
  rollResult: RollResult | null;
  aborted: boolean;
  reason?: string;
}

type DndLike = {
  roll(n: number, d: number): number;
  mod(score: number): number;
  rollDamageSpec(spec: unknown, crit?: boolean): { total: number };
  profBonus(lvl: number): number;
};

export function useAbility(
  abilityDef: AbilityDef & {
    condition?: string;
    onCast?: string;
    roll?: string;
    onHit?: string;
    onMiss?: string;
  },
  source: Actor,
  target: Actor,
  scene: SceneAdapter,
  dndOverride?: DndLike,
): UseAbilityResult {
  const runner = new AbilityRunner(scene, dndOverride);
  runner.setContext({ source, target, ability: abilityDef });

  if (abilityDef.condition) {
    const fn = runner.compile('return (' + abilityDef.condition + ')');
    if (fn) {
      try {
        const passed = fn.call(runner);
        if (!passed) {
          return { executed: false, hits: null, rollResult: null, aborted: true, reason: 'condition_failed' };
        }
      } catch {
        return { executed: false, hits: null, rollResult: null, aborted: true, reason: 'condition_error' };
      }
    }
  }

  if (abilityDef.onCast) {
    runner.exec(abilityDef.onCast);
  }

  if (abilityDef.roll) {
    runner.exec(abilityDef.roll);
  }

  if (runner.hits) {
    if (abilityDef.onHit) {
      runner.exec(abilityDef.onHit);
    }
  } else if (abilityDef.roll) {
    if (abilityDef.onMiss) {
      runner.exec(abilityDef.onMiss);
    }
  }

  return {
    executed: true,
    hits: abilityDef.roll ? runner.hits : null,
    rollResult: runner.rollResult,
    aborted: false,
  };
}
