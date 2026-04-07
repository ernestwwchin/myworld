// ═══════════════════════════════════════════════════════
// dialog-runner.js — Conversation tree engine (BG3-style)
//
// Reads dialogs.yaml per stage. Each dialog node has:
//   speaker  — who is talking
//   text     — what they say
//   choices  — player response options (with optional conditions/skill checks)
//   actions  — steps to execute after node (delegates to EventRunner)
//   next     — auto-advance to next node id
//
// Dialog flow: show text → player picks choice → run actions → next node
// ═══════════════════════════════════════════════════════

const DialogRunner = {
  _dialogs: {},      // loaded dialog trees for current stage { id: node }
  _scene: null,
  _active: false,    // dialog currently showing
  _resolve: null,    // promise resolver for player choice

  // ── Setup ──────────────────────────────────────────

  /** Load dialogs for a stage. Called by ModLoader after stage load. */
  init(scene, dialogDefs) {
    this._scene = scene;
    this._dialogs = dialogDefs || {};
    this._active = false;
    console.log(`[DialogRunner] Loaded ${Object.keys(this._dialogs).length} dialogs`);
  },

  clear() {
    this._dialogs = {};
    this._active = false;
    this._hideUI();
  },

  // ── Public API ─────────────────────────────────────

  /** Start a dialog by id. Returns when dialog tree finishes. */
  async start(dialogId) {
    if (this._active) {
      console.warn('[DialogRunner] Already in dialog');
      return;
    }
    let node = this._dialogs[dialogId];
    if (!node) {
      console.warn(`[DialogRunner] Dialog not found: ${dialogId}`);
      return;
    }

    this._active = true;

    try {
      while (node) {
        // Show speaker + text
        this._showNode(node);

        // Build available choices (filter by conditions)
        const choices = this._getAvailableChoices(node);

        let chosen = null;
        if (choices.length > 0) {
          // Wait for player to pick
          chosen = await this._waitForChoice(choices);
        } else {
          // No choices — just wait for dismiss click
          await this._waitForDismiss();
        }

        // Run node-level actions (after text shown, before advancing)
        if (node.actions) {
          await EventRunner.executeSteps(node.actions);
        }

        // Determine next node
        let nextId = node.next || null;

        if (chosen) {
          // Run skill check if choice has one
          if (chosen.check) {
            const result = dnd.skillCheck(chosen.check.skill, this._scene?.pStats, chosen.check.dc);
            this._showSkillResult(chosen.check.skill, result);
            await this._wait(1500);
            nextId = result.success ? chosen.pass : chosen.fail;
          } else {
            nextId = chosen.next || null;
          }

          // Run choice-level actions
          if (chosen.actions) {
            await EventRunner.executeSteps(chosen.actions);
          }
        }

        // Advance
        node = nextId ? this._dialogs[nextId] : null;
      }
    } finally {
      this._active = false;
      this._hideUI();
    }
  },

  // ── Choice filtering ───────────────────────────────

  _getAvailableChoices(node) {
    if (!node.choices) return [];
    return node.choices.filter(c => {
      if (!c.if) return true;
      return EventRunner.evalCondition(c.if);
    });
  },

  // ── UI ─────────────────────────────────────────────

  _showNode(node) {
    const speaker = node.speaker || '';
    const text = node.text || '';
    console.log(`[Dialog] ${speaker ? speaker + ': ' : ''}${text}`);
    if (typeof CombatLog !== 'undefined') CombatLog.log(`${speaker ? speaker + ': ' : ''}${text}`, 'info', 'dialog');

    let el = document.getElementById('dialog-box');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dialog-box';
      el.style.cssText = `position:fixed;bottom:60px;left:50%;transform:translateX(-50%);
        width:90%;max-width:500px;background:rgba(10,10,15,0.95);border:1px solid #c9a84c;
        border-radius:8px;padding:16px;color:#f0e6c8;font-family:'Courier New',monospace;
        font-size:13px;z-index:900;`;
      document.body.appendChild(el);
    }
    el.style.display = 'block';

    let html = '';
    if (speaker) html += `<div style="color:#c9a84c;font-weight:bold;margin-bottom:6px;">${speaker}</div>`;
    html += `<div style="margin-bottom:12px;line-height:1.5;">${text}</div>`;
    html += `<div id="dialog-choices"></div>`;
    el.innerHTML = html;
  },

  _showSkillResult(skill, result) {
    const icon = result.success ? '✅' : '❌';
    const el = document.getElementById('dialog-box');
    if (el) {
      const div = document.createElement('div');
      div.style.cssText = 'color:#7fc8f8;font-size:11px;margin-top:8px;';
      div.textContent = `${icon} ${result.skill} check: ${result.roll} + ${result.mod} = ${result.total} (DC ${result.total >= result.roll + result.mod ? 'passed' : 'failed'})`;
      el.appendChild(div);
    }
  },

  async _waitForChoice(choices) {
    return new Promise(resolve => {
      const container = document.getElementById('dialog-choices');
      if (!container) { resolve(null); return; }

      choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.style.cssText = `display:block;width:100%;text-align:left;padding:8px 12px;
          margin-top:4px;background:rgba(41,128,185,0.15);border:1px solid rgba(41,128,185,0.4);
          color:#7fc8f8;border-radius:4px;cursor:pointer;font-family:'Courier New',monospace;
          font-size:12px;`;
        btn.textContent = `${i + 1}. ${choice.label}`;
        btn.onmouseenter = () => btn.style.background = 'rgba(41,128,185,0.35)';
        btn.onmouseleave = () => btn.style.background = 'rgba(41,128,185,0.15)';
        btn.onclick = () => resolve(choice);
        container.appendChild(btn);
      });
    });
  },

  async _waitForDismiss() {
    return new Promise(resolve => {
      const el = document.getElementById('dialog-box');
      if (!el) { resolve(); return; }
      const hint = document.createElement('div');
      hint.style.cssText = 'color:#666;font-size:10px;margin-top:8px;text-align:center;';
      hint.textContent = '(click to continue)';
      el.appendChild(hint);
      el.onclick = () => { el.onclick = null; resolve(); };
    });
  },

  _hideUI() {
    const el = document.getElementById('dialog-box');
    if (el) el.style.display = 'none';
  },

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  },
};
