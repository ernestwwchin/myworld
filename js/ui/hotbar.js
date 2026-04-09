// ═══════════════════════════════════════════════════════
// hotbar.js — BG3-inspired hotbar with category tabs,
// type-colored borders, resource pips, & command strip
// ═══════════════════════════════════════════════════════

const Hotbar = {
  ROWS: 3,
  COLS: 10,
  _scene: null,
  _expanded: true,

  // Category system (replaces pages)
  _categories: ['common', 'class', 'items', 'passives'],
  _currentCat: 'common',

  // Slot data: _catSlots[category][row][col]
  _catSlots: null,

  _selectedSlot: null,
  _descOpen: false,
  _descSlot: null,
  _moveMode: false,
  _moveFrom: null,

  // ── Ability type → color class mapping ──
  TYPE_COLORS: {
    action:      't-action',   // silver
    bonusAction: 't-bonus',    // purple
    classFeature:'t-class',    // amber
    spell:       't-spell',    // blue
    cantrip:     't-cantrip',  // green
    item:        't-item',     // cyan
  },

  // ── Ability → category mapping ──
  ABILITY_CATEGORIES: {
    attack: 'common', dash: 'common', dodge: 'common', disengage: 'common',
    help: 'common', hide: 'common', shove: 'common',
    poison_strike: 'class', sleep_cloud: 'class', second_wind: 'class',
    action_surge: 'class', flee: 'common',
  },

  init(scene) {
    this._scene = scene;
    this._initSlots();
    this._populateDefaults();
    this._bindEvents();
    this.render();
  },

  _initSlots() {
    this._catSlots = {};
    for (const cat of this._categories) {
      this._catSlots[cat] = [];
      for (let r = 0; r < this.ROWS; r++) {
        this._catSlots[cat][r] = [];
        for (let c = 0; c < this.COLS; c++) {
          this._catSlots[cat][r][c] = { type: null, id: null };
        }
      }
    }
    // Backwards compat: expose _slots as reference to current cat
    this._slots = this._catSlots;
  },

  _populateDefaults() {
    const s = this._scene;
    if (!s) return;
    const abilities = s.getAvailablePlayerAbilities ? s.getAvailablePlayerAbilities() : [];

    // Common: Row 0 = core universal actions
    const commonOrder = ['attack', 'dash', 'dodge', 'disengage', 'help', 'hide'];
    let col = 0;
    for (const id of commonOrder) {
      if (abilities.includes(id) || ['attack', 'dash'].includes(id)) {
        this._setCatSlot('common', 0, col++, 'ability', id);
        if (col >= this.COLS) break;
      }
    }

    // Class: Row 0 = class-specific abilities
    const classOrder = ['poison_strike', 'sleep_cloud', 'second_wind', 'action_surge'];
    col = 0;
    for (const id of classOrder) {
      if (abilities.includes(id)) {
        this._setCatSlot('class', 0, col++, 'ability', id);
        if (col >= this.COLS) break;
      }
    }

    // Items: populated from pStats.inventory
    this.refreshItems();
    // Passives: empty for now (Phase 2)
  },

  /** Sync items tab from pStats.inventory — call after any inventory change */
  refreshItems() {
    const s = this._scene;
    const inv = s?.pStats?.inventory;
    // Clear items tab row 0 first
    if (this._catSlots?.items) {
      for (let c = 0; c < this.COLS; c++) {
        this._catSlots.items[0][c] = { type: null, id: null };
      }
    }
    if (!Array.isArray(inv)) return;
    let col = 0;
    for (const item of inv) {
      if (col >= this.COLS) break;
      this._setCatSlot('items', 0, col++, 'item', item.id, item);
    }
    if (this._currentCat === 'items') this.render();
  },

  _setCatSlot(cat, row, col, type, id, _item = null) {
    if (this._catSlots[cat]?.[row]) {
      this._catSlots[cat][row][col] = { type, id, _item };
    }
  },

  getSlot(cat, row, col) {
    return this._catSlots[cat]?.[row]?.[col] || { type: null, id: null };
  },

  _bindEvents() {
    // Category tabs
    document.querySelectorAll('.hb-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchCategory(tab.dataset.cat));
    });

    // Keyboard: 1-0 = row 0 slots
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key >= '1' && e.key <= '9') this._activateSlot(this._currentCat, 0, parseInt(e.key) - 1);
      else if (e.key === '0') this._activateSlot(this._currentCat, 0, 9);
      // E = End Turn shortcut in combat
      if (e.key === 'e' || e.key === 'E') {
        const s = this._scene;
        if (s && s.mode === MODE.COMBAT && typeof s.endPlayerTurn === 'function') s.endPlayerTurn();
      }
      // H = quick-use first healing consumable from inventory
      if (e.key === 'h' || e.key === 'H') {
        const s = this._scene;
        if (s && Array.isArray(s.pStats?.inventory)) {
          const potion = s.pStats.inventory.find(i => i.type === 'consumable' && i.heal);
          if (potion && typeof s.useItem === 'function') {
            s.useItem(potion);
            this.refreshItems();
          }
        }
      }
    });

    // Context menu on grid
    const grid = document.getElementById('hotbar-grid');
    if (grid) {
      grid.addEventListener('contextmenu', e => {
        e.preventDefault();
        const slotEl = e.target.closest('.hb-slot');
        if (slotEl) this._showDescription(slotEl.dataset.cat, slotEl.dataset.row, slotEl.dataset.col);
      });
    }
  },

  switchCategory(cat) {
    if (!this._categories.includes(cat)) return;
    this._currentCat = cat;
    document.querySelectorAll('.hb-cat-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.cat === cat)
    );
    this.render();
  },

  setExpanded(expanded) {
    this._expanded = expanded;
    if (this._catSlots) this.render();
  },

  // ── Command strip actions ──
  _cmd(action) {
    const s = this._scene;
    if (!s) return;
    if (action === 'end_turn' && typeof s.endPlayerTurn === 'function') s.endPlayerTurn();
    else if (action === 'flee' && typeof s.tryFleeCombat === 'function') s.tryFleeCombat();
    else if (action === 'reset_move' && typeof s.resetMove === 'function') s.resetMove();
    else if (action === 'toggle_tb' && typeof s.toggleExploreTurnBased === 'function') { s.toggleExploreTurnBased(); s.syncExploreBar(); }
    else if (action === 'quest_log') { /* Phase 2 */ }
    else if (action === 'settings') { /* Phase 2 */ }
  },

  /** Update command strip visibility based on mode */
  syncCommandStrip() {
    const s = this._scene;
    const inCombat = s && s.mode === MODE.COMBAT;
    const endBtn = document.getElementById('cmd-end');
    const fleeBtn = document.getElementById('cmd-flee');
    const resetBtn = document.getElementById('cmd-reset');
    if (endBtn) endBtn.classList.toggle('hidden', !inCombat);
    if (fleeBtn) fleeBtn.classList.toggle('hidden', !inCombat);
    if (resetBtn) resetBtn.classList.toggle('hidden', !inCombat);
    // TB toggle: show in explore, highlight when active
    const tbBtn = document.getElementById('cmd-tb');
    if (tbBtn) {
      tbBtn.classList.toggle('hidden', inCombat);
      tbBtn.classList.toggle('active', s && s.mode === MODE.EXPLORE_TB);
    }
  },

  // ── Resource Pips ──
  updateResourcePips() {
    const s = this._scene;
    if (!s) return;
    const pips = document.getElementById('res-pips');
    if (!pips) return;

    const inCombat = s.mode === MODE.COMBAT;
    pips.classList.toggle('show', inCombat);
    if (!inCombat) return;

    // Action pips (1 per total actions)
    const actGroup = document.getElementById('rp-action');
    if (actGroup) {
      const total = 1; // base 1 action
      const used = s.playerAP <= 0 ? total : 0;
      let html = '<span class="rp-label">ACT</span>';
      for (let i = 0; i < total; i++) html += `<div class="rp-pip act${i < used ? ' spent' : ''}"></div>`;
      actGroup.innerHTML = html;
    }

    // Bonus action pips
    const baGroup = document.getElementById('rp-bonus');
    if (baGroup) {
      const total = 1;
      // TODO: track bonus action usage
      let html = '<span class="rp-label">BA</span>';
      for (let i = 0; i < total; i++) html += `<div class="rp-pip bonus"></div>`;
      baGroup.innerHTML = html;
    }

    // Movement pips — BG3 style: filled = available, dim = spent, always show total
    // playerMoves = remaining, playerMovesUsed = spent; total = both combined (handles Dash)
    const mvGroup = document.getElementById('rp-move');
    if (mvGroup) {
      const remaining = Math.max(0, Number(s.playerMoves || 0));
      const used = Math.max(0, Number(s.playerMovesUsed || 0));
      const total = remaining + used;
      let html = '<span class="rp-label">MOV</span>';
      for (let i = 0; i < total; i++) html += `<div class="rp-pip mv${i >= remaining ? ' spent' : ''}"></div>`;
      html += `<span class="rp-count">${remaining}/${total}</span>`;
      mvGroup.innerHTML = html;
    }

    // Class charges (Second Wind, Action Surge, etc.)
    const chGroup = document.getElementById('rp-charges');
    if (chGroup) {
      const charges = [];
      // Check for Second Wind / Action Surge availability
      const p = s.pStats;
      if (p && p.level >= 1) charges.push({ name: 'SW', used: false }); // Second Wind
      if (p && p.level >= 2) charges.push({ name: 'AS', used: false }); // Action Surge
      if (charges.length) {
        let html = '<span class="rp-label">CLASS</span>';
        for (const c of charges) html += `<div class="rp-charge${c.used ? ' spent' : ''}" title="${c.name}"></div>`;
        chGroup.innerHTML = html;
        chGroup.style.display = '';
      } else {
        chGroup.style.display = 'none';
      }
    }
  },

  // ── Slot Activation ──
  _activateSlot(cat, row, col) {
    const slot = this.getSlot(cat, row, col);
    if (!slot || !slot.id) return;

    if (this._moveMode) {
      this._completeMove(cat, row, col);
      return;
    }

    const s = this._scene;
    if (!s) return;

    if (slot.type === 'ability') {
      if (typeof s.selectAction === 'function') s.selectAction(slot.id);
      // Visually select if targeting mode is active
      if (s.pendingAction) {
        this._selectedSlot = { cat, row, col };
      } else {
        this._selectedSlot = null;
      }
      this.render();
    } else if (slot.type === 'item' && slot._item) {
      const item = slot._item;
      if (item.type === 'consumable' && typeof s.useItem === 'function') {
        s.useItem(item);
        this.refreshItems();
      } else if ((item.type === 'weapon' || item.type === 'armor') && typeof s.equipItem === 'function') {
        s.equipItem(item);
        this.refreshItems();
      }
    }
  },

  // ── Used/Selected State Management ──
  markUsed(abilityId, used = true) {
    for (const cat of this._categories) {
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          const slot = this.getSlot(cat, r, c);
          if (slot.type === 'ability' && slot.id === abilityId) slot._used = used;
        }
      }
    }
    this.render();
  },

  markAllUsed(used = true) {
    for (const cat of this._categories) {
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          const slot = this.getSlot(cat, r, c);
          if (slot.type === 'ability') slot._used = used;
        }
      }
    }
    this.render();
  },

  resetUsed() { this.markAllUsed(false); this._selectedSlot = null; this.render(); },

  setSelected(abilityId) {
    this._selectedSlot = null;
    for (const cat of this._categories) {
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          const slot = this.getSlot(cat, r, c);
          if (slot.type === 'ability' && slot.id === abilityId) {
            this._selectedSlot = { cat, row: r, col: c };
            // Auto-switch to correct tab
            if (cat !== this._currentCat) this.switchCategory(cat);
            this.render();
            return;
          }
        }
      }
    }
    this.render();
  },

  clearSelection() { this._selectedSlot = null; this.render(); },

  // ── Description Panel ──
  _showDescription(cat, row, col) {
    row = parseInt(row); col = parseInt(col);
    const slot = this.getSlot(cat, row, col);
    if (!slot || !slot.id) return;

    const panel = document.getElementById('hotbar-desc');
    if (!panel) return;

    const def = this._getAbilityDef(slot.id);
    if (!def) { panel.style.display = 'none'; return; }

    const icon = this._getSlotIcon(slot);
    const typeLabel = this._getTypeLabel(slot.id);
    const typeColor = this._getTypeColor(slot.id);
    panel.innerHTML = `
      <div class="hbd-header">${icon} ${def.name || slot.id}</div>
      <div class="hbd-meta" style="border-left:3px solid ${typeColor};padding-left:6px">${typeLabel} · ${this._costText(def)}</div>
      <div class="hbd-meta">Range: ${def.range || '—'}</div>
      ${def.description ? `<div class="hbd-desc">${def.description}</div>` : ''}
      <div class="hbd-actions">
        <button class="hbd-btn" onclick="Hotbar._startMove('${cat}',${row},${col})">Move ↔</button>
        <button class="hbd-btn" onclick="Hotbar._startSwap('${cat}',${row},${col})">Swap 🔄</button>
        <button class="hbd-btn hbd-btn-danger" onclick="Hotbar._clearSlot('${cat}',${row},${col})">Clear ✕</button>
      </div>`;
    panel.style.display = 'block';
    this._descOpen = true;
    this._descSlot = { cat, row, col };

    const close = e => {
      if (!panel.contains(e.target)) {
        panel.style.display = 'none';
        this._descOpen = false;
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  },

  _startMove(cat, row, col) {
    this._moveMode = true;
    this._moveFrom = { cat, row, col, mode: 'move' };
    document.getElementById('hotbar-desc').style.display = 'none';
    this._descOpen = false;
    this.render();
    withCombatLog(combatLog => combatLog.log('Click a slot to move this ability to.', 'system'));
  },

  _startSwap(cat, row, col) {
    this._moveMode = true;
    this._moveFrom = { cat, row, col, mode: 'swap' };
    document.getElementById('hotbar-desc').style.display = 'none';
    this._descOpen = false;
    this.render();
    withCombatLog(combatLog => combatLog.log('Click a slot to swap with.', 'system'));
  },

  _completeMove(toCat, toRow, toCol) {
    const from = this._moveFrom;
    if (!from) { this._moveMode = false; return; }
    const fc = from.cat, fr = from.row, fco = from.col;

    if (from.mode === 'swap') {
      const temp = { ...this._catSlots[toCat][toRow][toCol] };
      this._catSlots[toCat][toRow][toCol] = { ...this._catSlots[fc][fr][fco] };
      this._catSlots[fc][fr][fco] = temp;
    } else {
      this._catSlots[toCat][toRow][toCol] = { ...this._catSlots[fc][fr][fco] };
      this._catSlots[fc][fr][fco] = { type: null, id: null };
    }

    this._moveMode = false;
    this._moveFrom = null;
    this.render();
  },

  _clearSlot(cat, row, col) {
    this._catSlots[cat][row][col] = { type: null, id: null };
    document.getElementById('hotbar-desc').style.display = 'none';
    this._descOpen = false;
    this.render();
  },

  // ── Rendering ──
  render() {
    const grid = document.getElementById('hotbar-grid');
    if (!grid || !this._catSlots) return;

    const cat = this._currentCat;
    const rowCount = this._expanded ? this.ROWS : 1;

    let html = '';
    for (let r = 0; r < rowCount; r++) {
      html += '<div class="hb-row">';
      for (let c = 0; c < this.COLS; c++) {
        const slot = this.getSlot(cat, r, c);
        const isEmpty = !slot.id;
        const isSelected = this._selectedSlot &&
          this._selectedSlot.cat === cat &&
          this._selectedSlot.row === r &&
          this._selectedSlot.col === c;
        const isUsed = slot._used;
        const isMoveFrom = this._moveMode && this._moveFrom &&
          this._moveFrom.cat === cat && this._moveFrom.row === r && this._moveFrom.col === c;

        const typeClass = isEmpty ? '' : this._getSlotTypeClass(slot.id, slot);
        let cls = 'hb-slot';
        if (isEmpty) cls += ' empty';
        if (typeClass) cls += ' ' + typeClass;
        if (isSelected) cls += ' selected';
        if (isUsed) cls += ' used';
        if (isMoveFrom) cls += ' move-from';

        const icon = isEmpty ? '+' : this._getSlotIcon(slot);
        const name = isEmpty ? '' : this._getSlotName(slot);
        const keyHint = r === 0 ? (c < 9 ? (c + 1) : '0') : '';

        html += `<div class="${cls}" data-cat="${cat}" data-row="${r}" data-col="${c}"
          onclick="Hotbar._activateSlot('${cat}',${r},${c})"
          oncontextmenu="event.preventDefault();Hotbar._showDescription('${cat}',${r},${c})">
          <div class="hb-icon">${icon}</div>
          <div class="hb-name">${name}</div>
          ${keyHint ? `<div class="hb-key">${keyHint}</div>` : ''}
        </div>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;
  },

  // ── Type Classification ──
  _getSlotTypeClass(id, slot) {
    if (!id) return '';
    if (slot?.type === 'item') return this.TYPE_COLORS.item;
    const def = this._getAbilityDef(id);
    if (!def) return '';
    // Check explicit category overrides
    if (def.category === 'cantrip') return this.TYPE_COLORS.cantrip;
    if (def.category === 'spell') return this.TYPE_COLORS.spell;
    if (def.category === 'classFeature') return this.TYPE_COLORS.classFeature;
    // Derive from type
    if (def.type === 'bonusAction') return this.TYPE_COLORS.bonusAction;
    // Class abilities = amber
    const classCat = this.ABILITY_CATEGORIES[id];
    if (classCat === 'class') return this.TYPE_COLORS.classFeature;
    // Default = action (silver)
    return this.TYPE_COLORS.action;
  },

  _getTypeLabel(id) {
    const def = this._getAbilityDef(id);
    if (!def) return 'Action';
    if (def.category === 'cantrip') return 'Cantrip';
    if (def.category === 'spell') return 'Spell';
    if (def.category === 'classFeature') return 'Class Feature';
    if (def.type === 'bonusAction') return 'Bonus Action';
    const classCat = this.ABILITY_CATEGORIES[id];
    if (classCat === 'class') return 'Class Feature';
    return 'Action';
  },

  _getTypeColor(id) {
    const cls = this._getSlotTypeClass(id);
    const map = {
      't-action': '#999', 't-bonus': '#ce93d8', 't-class': '#f0a030',
      't-spell': '#64b5f6', 't-cantrip': '#66bb6a', 't-item': '#4dd0e1',
    };
    return map[cls] || '#999';
  },

  // ── Helper Methods ──
  _getAbilityDef(id) {
    if (!id) return null;
    if (typeof ABILITY_DEFS !== 'undefined' && ABILITY_DEFS[id]) return ABILITY_DEFS[id];
    const fallbacks = {
      attack: { name: 'Attack', type: 'action', range: 'melee', description: 'Melee weapon attack.' },
      dash: { name: 'Dash', type: 'action', range: 'self', description: 'Double your movement this turn.' },
      hide: { name: 'Hide', type: 'action', range: 'self', description: 'Make a Stealth check.' },
      flee: { name: 'Flee', type: 'action', range: 'self', description: 'Attempt to disengage and flee combat.' },
      dodge: { name: 'Dodge', type: 'action', range: 'self', description: 'Gain advantage on DEX saves.' },
      help: { name: 'Help', type: 'action', range: 'nearby', description: 'Give ally advantage on next check.' },
      disengage: { name: 'Disengage', type: 'bonusAction', range: 'self', description: 'Move without provoking opportunity attacks.' },
      second_wind: { name: 'Second Wind', type: 'bonusAction', range: 'self', description: 'Regain 1d10+level HP. 1/short rest.', category: 'classFeature' },
      action_surge: { name: 'Action Surge', type: 'free', range: 'self', description: 'Gain an additional action. 1/short rest.', category: 'classFeature' },
    };
    return fallbacks[id] || null;
  },

  _getSlotIcon(slot) {
    if (!slot?.id) return '+';
    if (slot.type === 'item' && slot._item) return slot._item.icon || '📦';
    const icons = {
      attack: '⚔️', dash: '💨', hide: '🕶', flee: '🏳', sleep_cloud: '🌫',
      poison_strike: '☠️', second_wind: '❤️', action_surge: '⚡',
      dodge: '🛡', help: '🤝', disengage: '↩️',
    };
    return icons[slot.id] || '◆';
  },

  _getSlotName(slot) {
    if (!slot?.id) return '';
    if (slot.type === 'item' && slot._item) {
      const qty = Math.max(1, Number(slot._item.qty || 1));
      const name = slot._item.name || slot._item.id || 'Item';
      return qty > 1 ? `${name} x${qty}` : name;
    }
    const def = this._getAbilityDef(slot.id);
    return def?.name || slot.id;
  },

  _costText(def) {
    if (!def) return '—';
    if (def.resourceCost) {
      const parts = [];
      if (def.resourceCost.action) parts.push(`${def.resourceCost.action} Action`);
      if (def.resourceCost.bonusAction) parts.push(`${def.resourceCost.bonusAction} Bonus`);
      if (def.resourceCost.movement) parts.push('Movement');
      return parts.join(', ') || 'Free';
    }
    if (def.type === 'bonusAction') return 'Bonus Action';
    if (def.type === 'action') return 'Action';
    return def.type || 'Free';
  },
};

window.Hotbar = Hotbar;
