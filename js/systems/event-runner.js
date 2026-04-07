// ═══════════════════════════════════════════════════════
// event-runner.js — YAML-driven event/cutscene engine
//
// Reads events.yaml per stage. Each event has:
//   trigger  — when to fire (tile, combatEnd, flag change, etc.)
//   once     — fire only first time (default true)
//   if       — optional condition gate
//   steps    — list of actions to execute sequentially
//
// Steps use { do: actionName, ...params } format.
// Conditions use { flag: key }, { mode: combat }, etc.
// ═══════════════════════════════════════════════════════

const EventRunner = {
  _events: [],       // loaded event definitions for current stage
  _firedOnce: {},    // track once-only events by index
  _running: false,   // prevent re-entrance
  _scene: null,      // GameScene reference

  // ── Setup ──────────────────────────────────────────

  /** Load events for a stage. Called by ModLoader after stage load. */
  init(scene, eventDefs) {
    this._scene = scene;
    this._events = eventDefs || [];
    this._firedOnce = {};
    this._running = false;
    console.log(`[EventRunner] Loaded ${this._events.length} events`);
  },

  /** Clear all events (stage change) */
  clear() {
    this._events = [];
    this._firedOnce = {};
    this._running = false;
  },

  // ── Trigger Checking ───────────────────────────────

  /** Check tile triggers — called when player arrives at a tile */
  onPlayerTile(x, y) {
    for (let i = 0; i < this._events.length; i++) {
      const evt = this._events[i];
      if (!evt.trigger?.tile) continue;
      if (evt.trigger.tile.x !== x || evt.trigger.tile.y !== y) continue;
      this._tryFire(i, evt);
    }
  },

  /** Check named event triggers — called by game systems */
  onEvent(eventName, data) {
    for (let i = 0; i < this._events.length; i++) {
      const evt = this._events[i];
      if (evt.trigger?.event !== eventName) continue;
      this._tryFire(i, evt, data);
    }
  },

  /** Fire an event by id (for triggerEvent action) */
  fireById(eventId) {
    for (let i = 0; i < this._events.length; i++) {
      if (this._events[i].id === eventId) {
        this._tryFire(i, this._events[i]);
        return;
      }
    }
    console.warn(`[EventRunner] Event not found: ${eventId}`);
  },

  /** Internal: check once + condition, then execute */
  async _tryFire(index, evt, data) {
    const once = evt.once !== false; // default true
    if (once && this._firedOnce[index]) return;
    if (evt.trigger?.if && !this.evalCondition(evt.trigger.if)) return;

    if (once) this._firedOnce[index] = true;
    await this.executeSteps(evt.steps || [], data);
  },

  // ── Condition Evaluator ────────────────────────────

  /** Evaluate a condition object. Returns boolean. */
  evalCondition(cond) {
    if (!cond || typeof cond !== 'object') return true;
    const s = this._scene;

    // Combinators
    if (cond.all) return cond.all.every(c => this.evalCondition(c));
    if (cond.any) return cond.any.some(c => this.evalCondition(c));
    if (cond.not) return !this.evalCondition(cond.not);

    // Flag checks
    if ('flag' in cond) {
      if ('eq' in cond) return Flags.eq(cond.flag, cond.eq);
      return Flags.is(cond.flag);
    }

    // Player state
    if ('hidden' in cond) return (!!s?.playerHidden) === cond.hidden;
    if ('mode' in cond) return s?.mode === cond.mode;
    if ('hp_below' in cond) return (s?.playerHP || 0) < cond.hp_below;
    if ('hp_above' in cond) return (s?.playerHP || 0) > cond.hp_above;
    if ('level_min' in cond) return (s?.pStats?.level || 1) >= cond.level_min;

    // Map state
    if ('playerAt' in cond) {
      const [ex, ey] = cond.playerAt;
      return s?.playerTile?.x === ex && s?.playerTile?.y === ey;
    }
    if ('playerNear' in cond) {
      const [ex, ey, range] = cond.playerNear;
      const dx = Math.abs((s?.playerTile?.x || 0) - ex);
      const dy = Math.abs((s?.playerTile?.y || 0) - ey);
      return dx + dy <= range;
    }
    if ('enemyAlive' in cond) {
      return s?.enemies?.some(e => e.alive && e.type === cond.enemyAlive);
    }
    if ('enemyDead' in cond) {
      return s?.enemies?.some(e => !e.alive && e.type === cond.enemyDead);
    }
    if ('doorClosed' in cond) {
      const [dx, dy] = cond.doorClosed;
      const ents = s?.getEntitiesAt?.(dx, dy) || [];
      return ents.some(e => e.getType?.() === 'door' && !e.open);
    }
    if ('doorOpen' in cond) {
      const [dx, dy] = cond.doorOpen;
      const ents = s?.getEntitiesAt?.(dx, dy) || [];
      return ents.some(e => e.getType?.() === 'door' && e.open);
    }

    // Skill check (returns true/false, used in dialog choices)
    if ('skillCheck' in cond) {
      const { skill, dc } = cond.skillCheck;
      const result = dnd.skillCheck(skill, s?.pStats, dc);
      return result.success;
    }

    console.warn('[EventRunner] Unknown condition:', cond);
    return true;
  },

  // ── Step Executor ──────────────────────────────────

  /** Execute a list of steps sequentially */
  async executeSteps(steps, data) {
    if (this._running) {
      console.warn('[EventRunner] Already running, queuing skipped');
      return;
    }
    this._running = true;

    try {
      // Build label index for goto/branch
      const labels = {};
      steps.forEach((step, i) => { if (step.label) labels[step.label] = i; });

      let i = 0;
      while (i < steps.length) {
        const step = steps[i];

        // Skip label-only steps
        if (step.label && !step.do) { i++; continue; }

        // Check per-step condition
        if (step.if && !this.evalCondition(step.if)) { i++; continue; }

        // Execute action
        const result = await this._execAction(step, data);

        // Handle goto from branch
        if (result?.goto && result.goto in labels) {
          i = labels[result.goto];
          continue;
        }

        i++;
      }
    } catch (err) {
      console.error('[EventRunner] Step error:', err);
    } finally {
      this._running = false;
    }
  },

  /** Execute a single action step */
  async _execAction(step, data) {
    const s = this._scene;
    const action = step.do;
    if (!action) return;

    switch (action) {
      // ── Movement ──
      case 'move':
        s?.onTap?.({ worldX: step.x * S + S / 2, worldY: step.y * S + S / 2 });
        await this._wait(100);
        break;

      case 'waitIdle': {
        const timeout = step.timeout || 5000;
        const start = Date.now();
        while (s?.isMoving && Date.now() - start < timeout) await this._wait(50);
        await this._wait(200);
        break;
      }

      case 'wait':
        await this._wait(step.ms || 500);
        break;

      case 'waitMode': {
        const timeout = step.timeout || 8000;
        const start = Date.now();
        while (s?.mode !== step.mode && Date.now() - start < timeout) await this._wait(100);
        break;
      }

      // ── Combat ──
      case 'attack': {
        const target = step.target === 'nearest'
          ? s?.enemies?.filter(e => e.alive).sort((a, b) =>
              (Math.abs(a.tx - s.playerTile.x) + Math.abs(a.ty - s.playerTile.y)) -
              (Math.abs(b.tx - s.playerTile.x) + Math.abs(b.ty - s.playerTile.y))
            )[0]
          : s?.enemies?.find(e => e.alive && e.tx === step.x && e.ty === step.y);
        if (target && s?.playerAttackEnemy) s.playerAttackEnemy(target);
        await this._wait(500);
        break;
      }

      case 'selectAction':
        s?.selectAction?.(step.action || 'attack');
        await this._wait(200);
        break;

      case 'endTurn':
        s?.endPlayerTurn?.();
        await this._wait(1000);
        break;

      case 'flee':
        if (s?.mode === MODE?.COMBAT) s?.exitCombat?.('flee');
        await this._wait(500);
        break;

      case 'enterCombat': {
        const targets = s?.enemies?.filter(e => e.alive) || [];
        if (targets.length) s?.enterCombat?.(targets);
        await this._wait(500);
        break;
      }

      case 'hide':
        if (s?.mode === MODE?.COMBAT) s?.tryHideAction?.();
        else s?.tryHideInExplore?.();
        await this._wait(500);
        break;

      case 'dismiss':
        if (s?.diceWaiting) s?._handleDiceDismiss?.();
        await this._wait(200);
        break;

      case 'forceD20':
        this._forcedD20 = step.value;
        if (typeof dnd !== 'undefined') {
          this._originalRoll = this._originalRoll || dnd.roll;
          const forced = step.value;
          const orig = this._originalRoll;
          dnd.roll = (n, d) => (n === 1 && d === 20 ? forced : orig(n, d));
        }
        break;

      case 'restoreD20':
        if (this._originalRoll) {
          dnd.roll = this._originalRoll;
          this._originalRoll = null;
        }
        break;

      // ── Interaction ──
      case 'interact': {
        const ents = s?.getEntitiesAt?.(step.x, step.y) || [];
        if (ents.length) s?._executeEntityAction?.(ents[0], step.action || 'interact');
        await this._wait(500);
        break;
      }

      case 'openDoor':
      case 'unlockDoor': {
        const ents = s?.getEntitiesAt?.(step.x, step.y) || [];
        const door = ents.find(e => e.getType?.() === 'door');
        if (door) { door.open = true; s?._updateEntitySprite?.(door); }
        await this._wait(300);
        break;
      }

      case 'lockDoor': {
        const ents = s?.getEntitiesAt?.(step.x, step.y) || [];
        const door = ents.find(e => e.getType?.() === 'door');
        if (door) { door.open = false; s?._updateEntitySprite?.(door); }
        await this._wait(300);
        break;
      }

      // ── Spawning ──
      case 'spawn':
        s?.spawnEnemy?.(step.creature, step.x, step.y, step);
        await this._wait(300);
        break;

      // ── Flags ──
      case 'setFlag':
        for (const [k, v] of Object.entries(step)) {
          if (k === 'do' || k === 'if') continue;
          Flags.set(k, v);
        }
        break;

      case 'incrementFlag':
        Flags.increment(step.key, step.amount);
        break;

      case 'decrementFlag':
        Flags.decrement(step.key, step.amount);
        break;

      case 'toggleFlag':
        Flags.toggle(step.key);
        break;

      // ── Dialogue (delegates to DialogRunner) ──
      case 'dialog':
        if (typeof DialogRunner !== 'undefined') {
          await DialogRunner.start(step.id);
        }
        break;

      case 'say':
        this._showSay(step.speaker, step.text);
        await this._wait(step.duration || 2000);
        break;

      // ── Flow control ──
      case 'branch':
        if (step.if && this.evalCondition(step.if)) {
          return { goto: step.goto };
        }
        break;

      case 'goto':
        return { goto: step.label };

      case 'triggerEvent':
        this._running = false; // allow nested
        this.fireById(step.id);
        break;

      case 'log':
        console.log(`[Event] ${step.text || step.msg || ''}`);
        break;

      // ── Test assertions (autoplay only) ──
      case 'assert':
        this._evalAssert(step);
        break;

      case 'custom':
        if (step.fn && typeof window[step.fn] === 'function') {
          await window[step.fn](s, step);
        }
        break;

      default:
        console.warn(`[EventRunner] Unknown action: ${action}`);
    }
  },

  // ── Helpers ────────────────────────────────────────

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  },

  _showSay(speaker, text) {
    const label = speaker ? `${speaker}: ${text}` : text;
    console.log(`[Event] 💬 ${label}`);
    // Show in-game dialogue box (if UI supports it)
    const s = this._scene;
    if (s?.showEventText) {
      s.showEventText(speaker, text);
    } else {
      // Fallback: use status bar
      const bar = document.getElementById('status-bar');
      if (bar) bar.textContent = label;
    }
  },

  _evalAssert(step) {
    const s = this._scene;
    let passed = true;
    let detail = '';

    if (step.playerAt) {
      const [ex, ey] = step.playerAt;
      passed = s?.playerTile?.x === ex && s?.playerTile?.y === ey;
      detail = `expected (${ex},${ey}) got (${s?.playerTile?.x},${s?.playerTile?.y})`;
    } else if (step.mode) {
      passed = s?.mode === step.mode;
      detail = `expected ${step.mode} got ${s?.mode}`;
    } else if ('hidden' in step) {
      passed = (!!s?.playerHidden) === step.hidden;
      detail = `hidden=${s?.playerHidden}`;
    } else if (step.flag) {
      passed = Flags.is(step.flag) === (step.eq !== undefined ? step.eq : true);
      detail = `${step.flag}=${Flags.get(step.flag)}`;
    } else if (step.enemyDead) {
      passed = s?.enemies?.some(e => !e.alive && e.type === step.enemyDead);
      detail = `${step.enemyDead} dead check`;
    }

    const msg = step.msg || step.do;
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} [Assert] ${msg} — ${detail}`);

    // Report to AutoPlay if running
    if (typeof AutoPlay !== 'undefined' && AutoPlay.running) {
      AutoPlay.assert(msg, passed, detail);
    }
  },
};
