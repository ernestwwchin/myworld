// ═══════════════════════════════════════════════════════
// side-panel.js — Tabbed side panel (BG3-style)
// Fixed header (portrait, HP, AC) + tabbed body
// ═══════════════════════════════════════════════════════

const SidePanel = {
  _el: null,
  _collapsed: false,
  _activeTab: 'character',
  _scene: null,

  TABS: ['character', 'inventory', 'abilities', 'journal'],
  TAB_LABELS: { character: 'C', inventory: 'I', abilities: 'K', journal: 'J' },
  TAB_TITLES: { character: 'Character', inventory: 'Inventory', abilities: 'Abilities', journal: 'Journal' },

  init(scene) {
    this._scene = scene;
    this._el = document.getElementById('side-panel');

    // Bind tab clicks
    this.TABS.forEach(tab => {
      const btn = document.getElementById(`tab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => this.switchTab(tab));
        btn.addEventListener('dblclick', () => this.toggleCollapse());
      }
    });

    this.switchTab('character');
  },

  switchTab(tabId) {
    if (!this.TABS.includes(tabId)) return;
    this._activeTab = tabId;

    // Update tab button states
    this.TABS.forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      if (btn) btn.classList.toggle('active', t === tabId);
      const content = document.getElementById(`tab-content-${t}`);
      if (content) content.style.display = t === tabId ? 'block' : 'none';
    });

    this.refreshTab(tabId);
  },

  refreshTab(tabId) {
    const s = this._scene;
    if (!s) return;

    if (tabId === 'character') {
      this._renderCharacterTab(s);
    } else if (tabId === 'inventory') {
      this._renderInventoryTab(s);
    }
    // abilities, journal — Phase 2+
  },

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) wrapper.classList.toggle('panel-collapsed', this._collapsed);
    if (this._el) this._el.classList.toggle('collapsed', this._collapsed);
    // Trigger Phaser resize
    if (window.game) {
      window.game.scale.refresh();
      setTimeout(() => {
        if (typeof syncUIOverlay === 'function') syncUIOverlay();
      }, 100);
    }
  },

  /** Update the fixed header with current player stats */
  updateHeader() {
    const s = this._scene;
    if (!s) return;
    const p = s.pStats;
    const nameEl = document.getElementById('sp-name');
    const classEl = document.getElementById('sp-class');
    const hpTextEl = document.getElementById('sp-hp-text');
    const hpBarEl = document.getElementById('sp-hp-bar');
    const acEl = document.getElementById('sp-ac');
    const profEl = document.getElementById('sp-prof');

    if (nameEl) nameEl.textContent = p.name || 'Adventurer';
    if (classEl) classEl.textContent = `${p.class} Lv ${p.level}`;
    if (hpTextEl) hpTextEl.textContent = `${s.playerHP}/${s.playerMaxHP}`;
    if (hpBarEl) hpBarEl.style.width = (s.playerHP / s.playerMaxHP * 100) + '%';
    if (acEl) acEl.textContent = `AC ${p.ac}`;
    if (profEl) profEl.textContent = `Prof +${p.profBonus}`;

    // ASI badge
    const asiBadge = document.getElementById('sp-asi-badge');
    if (asiBadge) {
      // Show if there are pending ASI points (from class features at certain levels)
      asiBadge.style.display = (s._pendingASI > 0) ? 'inline' : 'none';
    }
  },

  _renderCharacterTab(s) {
    const el = document.getElementById('tab-content-character');
    if (!el) return;
    const p = s.pStats;
    el.innerHTML = T.statsPanel(p, s.playerHP, s.playerMaxHP);
  },

  _renderInventoryTab(s) {
    const el = document.getElementById('tab-content-inventory');
    if (!el) return;
    const p = s.pStats;
    const inv = Array.isArray(p.inventory) ? p.inventory : [];
    const gold = p.gold || 0;

    const TYPE_COLOR = { weapon: '#e8a87c', armor: '#7ec8e3', consumable: '#a8e6cf', gem: '#f5d76e', misc: '#b0b0b0' };
    const TYPE_LABEL = { weapon: 'WPN', armor: 'ARM', consumable: 'USE', gem: 'GEM', misc: '···' };

    const rows = inv.map((item, i) => {
      const tc = TYPE_COLOR[item.type] || '#b0b0b0';
      const tl = TYPE_LABEL[item.type] || '···';
      const canUse = item.type === 'consumable' && item.heal;
      const canEquip = item.type === 'weapon' || item.type === 'armor';
      const qty = Math.max(1, Number(item.qty || 1));
      const qtyLabel = qty > 1 ? ` x${qty}` : '';
      const useBtn = canUse
        ? `<button class="inv-btn" onclick="window._scene&&window._scene.useItem(window._scene.pStats.inventory[${i}])" style="color:#a8e6cf">Use</button>`
        : '';
      const eqBtn = canEquip
        ? `<button class="inv-btn" onclick="window._scene&&window._scene.equipItem(window._scene.pStats.inventory[${i}])" style="color:#e8a87c">Equip</button>`
        : '';
      const dropBtn = `<button class="inv-btn" onclick="window._scene&&window._scene.dropItem(window._scene.pStats.inventory[${i}])" style="color:#ef5350">Drop</button>`;
      return `<div class="inv-row">
        <span class="inv-icon">${item.icon||'📦'}</span>
        <span class="inv-name">${item.name||item.id||'Item'}${qtyLabel}</span>
        <span class="inv-type" style="color:${tc}">${tl}</span>
        <span class="inv-actions">${useBtn}${eqBtn}${dropBtn}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="inv-gold">💰 ${gold} gold</div>
      ${inv.length === 0
        ? '<div style="color:#666;text-align:center;margin-top:16px;font-size:11px">Inventory is empty</div>'
        : `<div class="inv-list">${rows}</div>`
      }`;
  },

  /** Full refresh: header + active tab */
  refresh() {
    this.updateHeader();
    this.refreshTab(this._activeTab);
  },
};

window.SidePanel = SidePanel;
