// ═══════════════════════════════════════════════════════
// Ability System — All abilities, skills, damage calculations
// ═══════════════════════════════════════════════════════

const GameSceneAbilitySystem = {
  // ─────────────────────────────────────────
  // HOOK SYSTEM (BG3-style mods)
  // ─────────────────────────────────────────

  executeAbilityHook(hookName, context = {}) {
    // Execute all hooks registered for this event
    // hookName: 'on_attack', 'on_attacked', 'on_combat_start', etc.
    if (!window.ABILITY_HOOKS) window.ABILITY_HOOKS = {};
    const hooks = window.ABILITY_HOOKS[hookName] || [];
    
    for (const hook of hooks) {
      try {
        const ability = hook.abilityId ? ABILITY_DEFS?.[hook.abilityId] : null;
        // Check condition if present
        if (hook.condition) {
          const conditionResult = typeof hook.condition === 'function' 
            ? hook.condition(context, this, ability, hook) 
            : this.evaluateCondition(hook.condition, context);
          if (!conditionResult) continue;
        }
        
        // Execute effects
        if (hook.effects) {
          this.executeHookEffects(hook.effects, context, ability, hook);
        }
        
        // Or custom function
        if (hook.fn && typeof hook.fn === 'function') {
          hook.fn(context, this, ability, hook);
        }
      } catch(e) {
        console.error(`[Hook Error] ${hookName}:`, e);
      }
    }
  },

  evaluateCondition(condition, context) {
    // Safe condition evaluation with context variables
    try {
      const fn = new Function(...Object.keys(context), `return ${condition}`);
      return fn(...Object.values(context));
    } catch(e) {
      console.warn(`[Condition Error]`, condition, e);
      return false;
    }
  },

  executeHookEffects(effects, context, ability = null, hook = null) {
    // Execute array of effects
    if (!Array.isArray(effects)) return;
    
    for (const effect of effects) {
      // If effect is a function, call it
      if (typeof effect === 'function') {
        effect(context, this, ability, hook);
        continue;
      }

      if (effect?.condition) {
        const effectConditionResult = typeof effect.condition === 'function'
          ? effect.condition(context, this, ability, hook, effect)
          : this.evaluateCondition(effect.condition, context);
        if (!effectConditionResult) continue;
      }

      switch(effect.type) {
        case 'custom':
          // Custom JS function in YAML
          if (typeof effect.fn === 'function') {
            effect.fn(context, this, ability, hook, effect);
          }
          break;
        case 'log':
          this.showStatus(this.interpolateTemplate(effect.message, context));
          break;
        case 'status_apply':
          // Apply status: { target, statusId, duration }
          if (context[effect.target]) {
            const actor = context[effect.target];
            console.log(`[Hook] Apply ${effect.statusId} to ${effect.target}`);
          }
          break;
        case 'modify_stat':
          // Modify: { target, stat, bonus, duration }
          if (context[effect.target]) {
            const actor = context[effect.target];
            if (actor[effect.stat] !== undefined) {
              actor[effect.stat] += effect.bonus || 0;
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

  interpolateTemplate(template, context) {
    // Replace {var} with context values
    let result = template;
    for (const [key, val] of Object.entries(context)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), val);
    }
    return result;
  },

  // ─────────────────────────────────────────
  // SKILL CHECKS & ABILITY USAGE
  // ─────────────────────────────────────────
  
  getEnemyPassivePerception(enemy) {
    const wisdomMod = dnd.mod(enemy.stats.wis);
    const profBonus = enemy.profBonus || 2;
    return 10 + wisdomMod + (enemy.ai?.hasPassivePerceptionProf ? profBonus : 0);
  },

  resolveAbilityDamage(ability, actor, isCrit) {
    if (ability === 'attack') {
      const dmgSpec = actor === 'player' 
        ? this.pStats.damageFormula 
        : (this.lastShownEnemy?.damageFormula || '1d6+0');
      const dr = dnd.rollDamageSpec(dmgSpec, isCrit);
      return dr;
    }
    // Extensible for other abilities
    return { total: 0, diceValues: [], str: '' };
  },

  applyAbilityOnHitStatuses(ability, actor, target) {
    // Hook for statuses applied on hit (poison, bleed, etc.)
    // Currently no-op, can be extended
  },

  processStatusEffectsForActor(actor, hook, context = {}) {
    // Process status effect triggers (on_action, turn_start, etc.)
    // Currently returns no skip, extensible for status system
    return { skipTurn: false };
  },

  checkLevelUp() {
    const nextThreshold = (this.pStats.level) * 100;
    if (this.pStats.xp >= nextThreshold) {
      this.pStats.level++;
      const strIncrease = Math.floor(Math.random() * 2);
      this.pStats.str += strIncrease;
      const conIncrease = Math.floor(Math.random() * 2);
      this.pStats.con += conIncrease;
      this.playerHP = this.pStats.hp + dnd.mod(this.pStats.con) * this.pStats.level;
      this.showStatus(`⭐ Level ${this.pStats.level}! STR +${strIncrease}, CON +${conIncrease}`);
      this.updateHUD();
    }
  },

  // ─────────────────────────────────────────
  // STEALTH & HIDING
  // ─────────────────────────────────────────

  tryHideAction() {
    if (!this.isPlayerTurn()) { this.showStatus('Not your turn yet.'); return; }
    if (this.playerHidden) { this.showStatus('Already hidden! Move to break stealth.'); return; }
    if (this.playerAP <= 0) { this.showStatus('Action already used.'); return; }

    // Roll Stealth check
    const stealthRoll = dnd.skillCheck('stealth', this.pStats, 100);

    // Compare against each enemy's Passive Perception
    let spotted = false;
    let spottersList = [];
    for (let enemy of this.combatGroup) {
      if (!enemy.alive) continue;
      const perception = this.getEnemyPassivePerception(enemy);
      if (stealthRoll.total < perception) {
        spotted = true;
        spottersList.push(`${enemy.type} (Perception ${perception})`);
      }
    }

    this.playerAP = 0;
    this.processStatusEffectsForActor('player', 'on_action', { actionId: 'hide' });
    this.pendingAction = null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);

    this.playerHidden = !spotted;

    if (spotted) {
      this.playerHidden = false;
      this.player.setAlpha(1);
      this.showStatus(`Failed to hide (Stealth ${stealthRoll.total}). Spotted by: ${spottersList.join(', ')}`);
    } else {
      // Successfully hidden!
      this.player.setAlpha(0.4);

      // Create shadow at current position
      const shx = this.playerTile.x * S + S / 2;
      const shy = this.playerTile.y * S + S / 2;
      this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
      this._shadowPlayer.setAlpha(0.2);
      this._shadowPlayer.setTint(0x6666ff);
      this._shadowPlayer.setDepth(100);

      // Enemies search for configurable turns
      for (let enemy of this.combatGroup) {
        if (enemy.alive) {
          const searchTurns = Math.max(1, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
          enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
          enemy.searchTurnsRemaining = searchTurns;
        }
      }

      this.showStatus(`Hidden! (Stealth ${stealthRoll.total}). Enemies searching last known location...`);

      if (this.logEvent) this.logEvent('COMBAT', 'HIDE_SUCCESS', {
        roll: stealthRoll.total
      });
    }
  },

  tryHideInExplore() {
    if (!this.isExploreMode()) return;
    if (this.playerHidden) { this.showStatus('Already hidden! Move to break stealth.'); return; }
    if (this.isMoving) { this.showStatus('Cannot hide while moving.'); return; }

    // BG3-style: Check light at player position
    const lightAtPlayer = (this.mapLights || []).reduce((maxLight, light) => {
      const dist = Math.sqrt((this.playerTile.x - light.x) ** 2 + (this.playerTile.y - light.y) ** 2);
      const lightVal = Math.max(0, (light.range - dist) / light.range);
      return Math.max(maxLight, lightVal);
    }, 0);
    const lightPenalty = Math.floor(lightAtPlayer * 5);

    // Roll Stealth (with light penalty)
    const stealthRoll = dnd.rollAbility('dex', this.pStats);
    const stealthAdjusted = stealthRoll.total - lightPenalty;

    // Check if any nearby enemies spot
    let spotted = false;
    let spottersList = [];
    for (let enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.sqrt((enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2);
      const perception = this.getEnemyPassivePerception(enemy);
      if (dist <= enemy.sight && inFOV(enemy, this.playerTile.x, this.playerTile.y) && hasLOS(enemy.tx, enemy.ty, this.playerTile.x, this.playerTile.y)) {
        if (stealthAdjusted < perception) {
          spotted = true;
          spottersList.push(`${enemy.type} (Perception ${perception})`);
        }
      }
    }

    if (spotted) {
      const lightMsg = lightPenalty > 0 ? ` (Light penalty: -${lightPenalty})` : '';
      this.showStatus(`Failed to hide (Stealth ${stealthAdjusted})${lightMsg}. Spotted by: ${spottersList.join(', ')}`);
      if (this.logEvent) this.logEvent('EXPLORE', 'HIDE_FAILED', {
        roll: stealthRoll.total,
        adjusted: stealthAdjusted,
        lightPenalty: lightPenalty,
        spottedBy: spottersList
      });
      return;
    }

    // Successfully hidden!
    this.playerHidden = true;
    this.player.setAlpha(0.4);

    // Create shadow at current position
    const shx = this.playerTile.x * S + S / 2;
    const shy = this.playerTile.y * S + S / 2;
    this._shadowPlayer = this.add.sprite(shx, shy, 'player_atlas', 'idle_0');
    this._shadowPlayer.setAlpha(0.2);
    this._shadowPlayer.setTint(0x6666ff);
    this._shadowPlayer.setDepth(100);

    // Set nearby enemies to search
    for (let enemy of this.enemies) {
      if (enemy.alive) {
        const dist = Math.sqrt((enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2);
        if (dist <= 15) {
          const searchTurns = Math.max(2, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
          enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
          enemy.searchTurnsRemaining = searchTurns;
        }
      }
    }

    this.showStatus(`Hidden! (Stealth ${stealthAdjusted}). Stay still to remain hidden...`);

    if (this.logEvent) this.logEvent('EXPLORE', 'HIDE_SUCCESS', {
      roll: stealthRoll.total,
      adjusted: stealthAdjusted,
      lightPenalty: lightPenalty
    });
  },
};

Object.assign(GameScene.prototype, GameSceneAbilitySystem);
