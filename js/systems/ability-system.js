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
  // STEALTH & HIDING  (BG3-style)
  //
  // Flow: Hide action → roll Stealth → store result
  // While hidden: can move (slower). Each step near an
  // enemy triggers a Stealth-vs-Perception contest.
  //
  // Light levels:
  //   bright (2): auto-revealed in enemy FOV
  //   dim    (1): normal Stealth contest
  //   dark   (0): advantage (enemies need darkvision)
  //
  // Break conditions:
  //   • Failed Perception contest (enemy spots you)
  //   • Attacking
  //   • Interacting with entities (doors, chests = noise)
  //   • Entering bright light in enemy LOS+FOV
  // ─────────────────────────────────────────

  // Central stealth-break utility — called from everywhere
  _breakStealth(reason, opts = {}) {
    if (!this.playerHidden) return;
    this.playerHidden = false;
    this.playerStealthRoll = 0;
    this.clearStealthVisuals();
    if (reason) this.showStatus(reason);
  },

  // Enter hidden state (shared by combat + explore)
  _enterStealth(stealthTotal) {
    this.playerHidden = true;
    this.playerStealthRoll = stealthTotal;
    this.showStealthVisuals();
  },

  // Check if a specific enemy can see the player through stealth.
  // Returns { spotted, reason } or { spotted: false }.
  _stealthContestEnemy(enemy) {
    if (!enemy.alive) return { spotted: false };
    const px = this.playerTile.x, py = this.playerTile.y;
    const dist = Math.sqrt((enemy.tx - px) ** 2 + (enemy.ty - py) ** 2);
    const sightRange = this.effectiveEnemySight(enemy);
    if (dist > sightRange) return { spotted: false };
    if (!inFOV(enemy, px, py)) return { spotted: false };
    if (!hasLOS(enemy.tx, enemy.ty, px, py)) return { spotted: false };

    // Light at player position
    const light = this.tileLightLevel(px, py);

    // Bright light + in FOV + LOS → auto-spotted (no check)
    if (light === 2) {
      return { spotted: true, reason: 'bright_light', perception: '∞' };
    }

    // Dark + no darkvision → cannot see at all
    const hasDarkvision = !!(enemy.traits?.darkvision || enemy.darkvision);
    if (light === 0 && !hasDarkvision) return { spotted: false };

    // Contested: stored Stealth roll vs enemy Passive Perception
    const perception = this.getEnemyPassivePerception(enemy);

    // Dim light with darkvision or dark with darkvision → normal contest
    // Adjacent (dist <= 1.5) → Perception gets +5 (proximity awareness)
    const proxBonus = dist <= 1.5 ? 5 : 0;
    const effectivePerception = perception + proxBonus;

    if (this.playerStealthRoll < effectivePerception) {
      return { spotted: true, reason: 'perception', perception: effectivePerception };
    }
    return { spotted: false };
  },

  // BG3-style detection check for ALL nearby enemies.
  // Returns { broken, spotters[] } — breaks stealth if any enemy spots.
  checkStealthVsEnemies(enemyList) {
    if (!this.playerHidden) return { broken: false, spotters: [] };
    const spotters = [];
    for (const enemy of enemyList) {
      const result = this._stealthContestEnemy(enemy);
      if (result.spotted) {
        spotters.push({ enemy, ...result });
      }
    }
    if (spotters.length) {
      const names = spotters.map(s => {
        const tag = s.reason === 'bright_light' ? 'bright light' : `Perception ${s.perception}`;
        return `${s.enemy.displayName||s.enemy.type} (${tag})`;
      }).join(', ');
      this._breakStealth(`Spotted! (Stealth ${this.playerStealthRoll}) by: ${names}`);
      return { broken: true, spotters };
    }
    return { broken: false, spotters: [] };
  },

  // ── Combat: Hide action (costs action) ──
  tryHideAction() {
    if (!this.isPlayerTurn()) return;
    if (this.playerHidden) { this.showStatus('Already hidden.'); return; }
    if (this.playerAP <= 0) { this.showStatus('Action already used.'); return; }

    const stealthRoll = dnd.skillCheck('stealth', this.pStats, 0);

    this.playerAP = 0;
    this.processStatusEffectsForActor('player', 'on_action', { actionId: 'hide' });
    if (typeof this.snapshotMoveResetAnchor === 'function') this.snapshotMoveResetAnchor();
    this.pendingAction = null;
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);

    // Immediate check: can any combat enemy see through this roll?
    let spotted = false;
    let spottersList = [];
    for (const enemy of this.combatGroup) {
      if (!enemy.alive) continue;
      const perception = this.getEnemyPassivePerception(enemy);
      if (stealthRoll.total < perception) {
        spotted = true;
        spottersList.push(`${enemy.displayName||enemy.type} (Perception ${perception})`);
      }
    }

    if (spotted) {
      this.showStatus(`Failed to hide (Stealth ${stealthRoll.total}). Spotted by: ${spottersList.join(', ')}`);
      return;
    }

    this._enterStealth(stealthRoll.total);

    // Enemies search last known location
    for (const enemy of this.combatGroup) {
      if (enemy.alive) {
        const searchTurns = Math.max(1, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
        enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        enemy.searchTurnsRemaining = searchTurns;
      }
    }

    this.showStatus(`Hidden! (Stealth ${stealthRoll.total}). Enemies searching last known position...`);
  },

  // ── Explore: Hide action (press H) ──
  tryHideInExplore() {
    if (!this.isExploreMode()) return;
    if (this.playerHidden) { this.showStatus('Already hidden.'); return; }
    if (this.isMoving) { this.showStatus('Cannot hide while moving.'); return; }

    // Light at player tile affects roll
    const light = this.tileLightLevel(this.playerTile.x, this.playerTile.y);

    // Bright light: cannot hide if ANY enemy has LOS+FOV
    if (light === 2) {
      const exposed = this.enemies.some(e => {
        if (!e.alive) return false;
        const d = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
        return d <= e.sight && inFOV(e, this.playerTile.x, this.playerTile.y)
          && hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y);
      });
      if (exposed) {
        this.showStatus('Too exposed! Cannot hide in bright light within enemy sight.');
        return;
      }
    }

    // Roll Stealth (proper skill check with proficiency/expertise)
    const stealthRoll = dnd.skillCheck('stealth', this.pStats, 0);
    let stealthTotal = stealthRoll.total;

    // Dark → advantage (+5 flat bonus, simplified from double-roll)
    if (light === 0) stealthTotal += 5;

    // Immediate contest vs nearby enemies who can see this tile
    let spotted = false;
    let spottersList = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = Math.sqrt((enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2);
      if (d > enemy.sight) continue;
      if (!inFOV(enemy, this.playerTile.x, this.playerTile.y)) continue;
      if (!hasLOS(enemy.tx, enemy.ty, this.playerTile.x, this.playerTile.y)) continue;
      const hasDV = !!(enemy.traits?.darkvision || enemy.darkvision);
      if (light === 0 && !hasDV) continue;
      const perception = this.getEnemyPassivePerception(enemy);
      if (stealthTotal < perception) {
        spotted = true;
        spottersList.push(`${enemy.displayName||enemy.type} (Perception ${perception})`);
      }
    }

    if (spotted) {
      const lightLabel = light === 0 ? ' (dark)' : light === 1 ? ' (dim)' : '';
      this.showStatus(`Failed to hide (Stealth ${stealthTotal}${lightLabel}). Spotted by: ${spottersList.join(', ')}`);
      return;
    }

    this._enterStealth(stealthTotal);

    // Nearby enemies enter search mode
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = Math.sqrt((enemy.tx - this.playerTile.x) ** 2 + (enemy.ty - this.playerTile.y) ** 2);
      if (d <= 15) {
        const searchTurns = Math.max(2, Number(enemy?.ai?.searchTurns || enemy?.searchTurns || 4));
        enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        enemy.searchTurnsRemaining = searchTurns;
      }
    }

    const lightLabel = light === 0 ? ' (dark +5)' : light === 1 ? ' (dim)' : '';
    this.showStatus(`Hidden! (Stealth ${stealthTotal}${lightLabel}). You can move — enemies will contest your Stealth.`);
  },
};

Object.assign(GameScene.prototype, GameSceneAbilitySystem);
