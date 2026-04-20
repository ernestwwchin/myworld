import { dnd, ABILITY_DEFS } from '@/config';
import type { GameScene } from '@/game';
import type { Enemy } from '@/types/actors';

type AbilityHook = {
  abilityId?: string;
  condition?: string | ((ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook) => boolean);
  effects?: Array<HookEffect | ((ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook) => void)>;
  fn?: (ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook) => void;
};

type HookEffect = {
  type?: string;
  target?: string;
  stat?: string;
  bonus?: number;
  message?: string;
  statusId?: string;
  abilityId?: string;
  effectId?: string;
  soundId?: string;
  damageBonus?: number;
  fn?: (ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook, effect: HookEffect) => void;
  condition?: string | ((ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook, effect: HookEffect) => boolean);
};

type StealthResult =
  | { spotted: true; reason: string; perception: number | string }
  | { spotted: false };

export const AbilitySystemMixin = {
  executeAbilityHook(this: GameScene, hookName: string, context: Record<string, unknown> = {}): void {
    const w = window as unknown as { ABILITY_HOOKS?: Record<string, AbilityHook[]> };
    if (!w.ABILITY_HOOKS) w.ABILITY_HOOKS = {};
    const hooks = w.ABILITY_HOOKS[hookName] || [];

    for (const hook of hooks) {
      try {
        const ability = hook.abilityId ? ABILITY_DEFS?.[hook.abilityId] : null;
        if (hook.condition) {
          const conditionResult =
            typeof hook.condition === 'function'
              ? hook.condition(context, this, ability, hook)
              : this.evaluateCondition(hook.condition, context);
          if (!conditionResult) continue;
        }

        if (hook.effects) {
          this.executeHookEffects(hook.effects, context, ability, hook);
        }

        if (hook.fn && typeof hook.fn === 'function') {
          hook.fn(context, this, ability, hook);
        }
      } catch (e) {
        console.error(`[Hook Error] ${hookName}:`, e);
      }
    }
  },

  evaluateCondition(this: GameScene, condition: string, context: Record<string, unknown>): boolean {
    try {
      const fn = new Function(...Object.keys(context), `return ${condition}`);
      return !!fn(...Object.values(context));
    } catch (e) {
      console.warn('[Condition Error]', condition, e);
      return false;
    }
  },

  executeHookEffects(
    this: GameScene,
    effects: Array<HookEffect | ((ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook) => void)>,
    context: Record<string, unknown>,
    ability: unknown = null,
    hook: AbilityHook | null = null,
  ): void {
    if (!Array.isArray(effects)) return;

    for (const effect of effects) {
      if (typeof effect === 'function') {
        effect(context, this, ability, hook as AbilityHook);
        continue;
      }

      if (effect?.condition) {
        const effectConditionResult =
          typeof effect.condition === 'function'
            ? effect.condition(context, this, ability, hook as AbilityHook, effect)
            : this.evaluateCondition(effect.condition, context);
        if (!effectConditionResult) continue;
      }

      switch (effect.type) {
        case 'custom':
          if (typeof effect.fn === 'function') {
            effect.fn(context, this, ability, hook as AbilityHook, effect);
          }
          break;
        case 'log':
          this.showStatus(this.interpolateTemplate(effect.message || '', context));
          break;
        case 'status_apply':
          if (effect.target && context[effect.target]) {
            console.log(`[Hook] Apply ${effect.statusId} to ${effect.target}`);
          }
          break;
        case 'modify_stat':
          if (effect.target && context[effect.target]) {
            const actor = context[effect.target] as Record<string, number | undefined>;
            if (effect.stat && actor[effect.stat] !== undefined) {
              actor[effect.stat] = (actor[effect.stat] as number) + (effect.bonus || 0);
              console.log(`[Hook] ${effect.target}.${effect.stat} += ${effect.bonus}`);
            }
          }
          break;
        case 'trigger_ability':
          console.log(`[Hook] Trigger ability: ${effect.abilityId}`);
          break;
        case 'spawn_effect':
          console.log(`[Hook] Spawn effect: ${effect.effectId}`);
          break;
        case 'play_sound':
          console.log(`[Hook] Play sound: ${effect.soundId}`);
          break;
        case 'counter_attack':
          console.log(`[Hook] Counter attack with +${effect.damageBonus}`);
          break;
        default:
          console.warn(`[Hook] Unknown effect type: ${effect.type}`);
      }
    }
  },

  interpolateTemplate(this: GameScene, template: string, context: Record<string, unknown>): string {
    let result = template;
    for (const [key, val] of Object.entries(context)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(val));
    }
    return result;
  },

  _breakStealth(this: GameScene, reason?: string, _opts: Record<string, unknown> = {}): void {
    if (!this.playerHidden) return;
    this.playerHidden = false;
    this.playerStealthRoll = 0;
    this.clearStealthVisuals();
    if (reason) this.showStatus(reason);
  },

  _enterStealth(this: GameScene, stealthTotal: number): void {
    this.playerHidden = true;
    this.playerStealthRoll = stealthTotal;
    this.showStealthVisuals();
  },

  _stealthContestEnemy(this: GameScene, enemy: Enemy, stealthRoll?: number): StealthResult {
    if (!enemy.alive) return { spotted: false };
    if (!this.canEnemySeePlayer(enemy)) return { spotted: false };

    const px = this.playerTile.x;
    const py = this.playerTile.y;
    const light = this.tileLightLevel(px, py);

    if (light === 2) {
      return { spotted: true, reason: 'bright_light', perception: '∞' };
    }

    const traits = enemy.traits as { darkvision?: boolean } | undefined;
    const hasDarkvision = !!(traits?.darkvision || (enemy as { darkvision?: boolean }).darkvision);
    if (light === 0 && !hasDarkvision) return { spotted: false };

    const roll = stealthRoll ?? this.playerStealthRoll;
    const perception = this.getEnemyPassivePerception(enemy);

    const dist = Math.sqrt((enemy.tx - px) ** 2 + (enemy.ty - py) ** 2);
    const proxBonus = dist <= 1.5 ? 5 : 0;
    const effectivePerception = perception + proxBonus;

    if (roll < effectivePerception) {
      return { spotted: true, reason: 'perception', perception: effectivePerception };
    }
    return { spotted: false };
  },

  checkStealthVsEnemies(
    this: GameScene,
    enemyList: Enemy[],
  ): { broken: boolean; spotters: Array<{ enemy: Enemy; reason?: string; perception?: number | string }> } {
    if (!this.playerHidden) return { broken: false, spotters: [] };
    const spotters: Array<{ enemy: Enemy; reason?: string; perception?: number | string }> = [];
    for (const enemy of enemyList) {
      const result = this._stealthContestEnemy(enemy);
      if (result.spotted) {
        spotters.push({ enemy, reason: result.reason, perception: result.perception });
      }
    }
    if (spotters.length) {
      const names = spotters
        .map((s) => {
          const tag = s.reason === 'bright_light' ? 'bright light' : `Perception ${s.perception}`;
          return `${s.enemy.displayName || s.enemy.type} (${tag})`;
        })
        .join(', ');
      this._breakStealth(`Spotted! (Stealth ${this.playerStealthRoll}) by: ${names}`);
      return { broken: true, spotters };
    }
    return { broken: false, spotters: [] };
  },

  tryHideAction(this: GameScene): void {
    if (!this.isPlayerTurn()) return;
    if (this.playerHidden) {
      this.showStatus('Already hidden.');
      return;
    }
    if (this.playerAP <= 0) {
      this.showStatus('Action already used.');
      return;
    }

    const stealthRoll = dnd.skillCheck('stealth', this.pStats as unknown as Record<string, unknown>, 0);

    this.playerAP = 0;
    this.processStatusEffectsForActor('player', 'on_action', { deltaMs: 0 });
    if (typeof this.snapshotMoveResetAnchor === 'function') this.snapshotMoveResetAnchor();
    this.pendingAction = null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);

    const spotters: string[] = [];
    for (const enemy of this.combatGroup as Enemy[]) {
      const result = this._stealthContestEnemy(enemy, stealthRoll.total);
      if (result.spotted) {
        const tag = result.reason === 'bright_light' ? 'bright light' : `Perception ${result.perception}`;
        spotters.push(`${enemy.displayName || enemy.type} (${tag})`);
      }
    }

    if (spotters.length) {
      this.showStatus(`Failed to hide (Stealth ${stealthRoll.total}). Spotted by: ${spotters.join(', ')}`);
      return;
    }

    this._enterStealth(stealthRoll.total);

    for (const enemy of this.combatGroup as Enemy[]) {
      if (enemy.alive) {
        const ai = enemy.ai as { searchTurns?: number } | undefined;
        const searchTurns = Math.max(
          1,
          Number(ai?.searchTurns || (enemy as { searchTurns?: number }).searchTurns || 4),
        );
        enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        enemy.searchTurnsRemaining = searchTurns;
        enemy._searchAbandonedAnnounced = false;
      }
    }

    this.showStatus(
      `Hidden! (Stealth ${stealthRoll.total}). Enemies searching last known position...`,
    );
  },

  tryHideInExplore(this: GameScene): void {
    if (!this.isExploreMode()) return;
    if (this.playerHidden) {
      this.showStatus('Already hidden.');
      return;
    }
    if (this.isMoving) {
      this.showStatus('Cannot hide while moving.');
      return;
    }

    const light = this.tileLightLevel(this.playerTile.x, this.playerTile.y);

    if (light === 2) {
      const exposed = this.enemies.some((e) => e.alive && this.canEnemySeePlayer(e));
      if (exposed) {
        this.showStatus('Too exposed! Cannot hide in bright light within enemy sight.');
        return;
      }
    }

    const stealthRoll = dnd.skillCheck('stealth', this.pStats as unknown as Record<string, unknown>, 0);
    let stealthTotal = stealthRoll.total;

    if (light === 0) stealthTotal += 5;

    const spotters: string[] = [];
    for (const enemy of this.enemies) {
      const result = this._stealthContestEnemy(enemy, stealthTotal);
      if (result.spotted) {
        const tag = result.reason === 'bright_light' ? 'bright light' : `Perception ${result.perception}`;
        spotters.push(`${enemy.displayName || enemy.type} (${tag})`);
      }
    }

    if (spotters.length) {
      const lightLabel = light === 0 ? ' (dark)' : light === 1 ? ' (dim)' : '';
      this.showStatus(
        `Failed to hide (Stealth ${stealthTotal}${lightLabel}). Spotted by: ${spotters.join(', ')}`,
      );
      return;
    }

    this._enterStealth(stealthTotal);

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = Math.sqrt(
        (enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2,
      );
      if (d <= 15) {
        const ai = enemy.ai as { searchTurns?: number } | undefined;
        const searchTurns = Math.max(
          2,
          Number(ai?.searchTurns || (enemy as { searchTurns?: number }).searchTurns || 4),
        );
        enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        enemy.searchTurnsRemaining = searchTurns;
        enemy._searchAbandonedAnnounced = false;
      }
    }

    const lightLabel = light === 0 ? ' (dark +5)' : light === 1 ? ' (dim)' : '';
    this.showStatus(
      `Hidden! (Stealth ${stealthTotal}${lightLabel}). You can move — enemies will contest your Stealth.`,
    );
  },
};

declare module '@/game' {
  interface GameScene {
    executeAbilityHook(hookName: string, context?: Record<string, unknown>): void;
    evaluateCondition(condition: string, context: Record<string, unknown>): boolean;
    executeHookEffects(
      effects: Array<HookEffect | ((ctx: unknown, scene: GameScene, ability: unknown, hook: AbilityHook) => void)>,
      context: Record<string, unknown>,
      ability?: unknown,
      hook?: AbilityHook | null,
    ): void;
    interpolateTemplate(template: string, context: Record<string, unknown>): string;
    _breakStealth(reason?: string, opts?: Record<string, unknown>): void;
    _enterStealth(stealthTotal: number): void;
    _stealthContestEnemy(enemy: Enemy, stealthRoll?: number): StealthResult;
    tryHideAction(): void;
    tryHideInExplore(): void;
    showStatus(msg: string): void;
    clearPendingAction(): void;
    updateResBar(): void;
    setActionButtonsUsed(used: boolean): void;
    snapshotMoveResetAnchor?: () => void;
    isPlayerTurn(): boolean;
    getEnemyPassivePerception(enemy: Enemy): number;
    tileLightLevel(x: number, y: number): number;
  }
}
