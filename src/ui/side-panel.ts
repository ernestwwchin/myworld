import { T } from './templates';
import type { GameScene } from '@/game';

export const SidePanel = {
  _el: null as HTMLElement | null,
  _collapsed: false,
  _activeTab: 'character',
  _scene: null as GameScene | null,

  TABS: ['character', 'inventory', 'abilities', 'journal'],
  TAB_LABELS: { character: 'C', inventory: 'I', abilities: 'K', journal: 'J' },
  TAB_TITLES: { character: 'Character', inventory: 'Inventory', abilities: 'Abilities', journal: 'Journal' },

  init(scene: GameScene) {
    this._scene = scene;
    this._el = document.getElementById('side-panel');

    this.TABS.forEach(tab => {
      const btn = document.getElementById(`tab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => this.switchTab(tab));
        btn.addEventListener('dblclick', () => this.toggleCollapse());
      }
    });

    this.switchTab('character');
  },

  switchTab(tabId: string) {
    if (!this.TABS.includes(tabId)) return;
    this._activeTab = tabId;

    this.TABS.forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      if (btn) btn.classList.toggle('active', t === tabId);
      const content = document.getElementById(`tab-content-${t}`);
      if (content) content.style.display = t === tabId ? 'block' : 'none';
    });

    this.refreshTab(tabId);
  },

  refreshTab(tabId: string) {
    const s = this._scene;
    if (!s) return;

    if (tabId === 'character') {
      this._renderCharacterTab(s);
    } else if (tabId === 'inventory') {
      this._renderInventoryTab(s);
    }
  },

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) wrapper.classList.toggle('panel-collapsed', this._collapsed);
    if (this._el) this._el.classList.toggle('collapsed', this._collapsed);
    const w = window as unknown as { game?: { scale: { refresh(): void } }; syncUIOverlay?: () => void };
    if (w.game) {
      w.game.scale.refresh();
      setTimeout(() => { if (typeof w.syncUIOverlay === 'function') w.syncUIOverlay!(); }, 100);
    }
  },

  updateHeader() {
    const s = this._scene;
    if (!s) return;
    const p = s.pStats as Record<string, unknown>;
    const nameEl = document.getElementById('sp-name');
    const classEl = document.getElementById('sp-class');
    const hpTextEl = document.getElementById('sp-hp-text');
    const hpBarEl = document.getElementById('sp-hp-bar');
    const acEl = document.getElementById('sp-ac');
    const profEl = document.getElementById('sp-prof');

    const derived = p.derived as Record<string, number> | undefined;
    const effAc = Number(p.ac) + (derived?.ac || 0);
    if (nameEl) nameEl.textContent = String(p.name || 'Adventurer');
    if (classEl) classEl.textContent = `${p.class} Lv ${p.level}`;
    if (hpTextEl) hpTextEl.textContent = `${s.playerHP}/${s.playerMaxHP}`;
    if (hpBarEl) hpBarEl.style.width = (s.playerHP / s.playerMaxHP * 100) + '%';
    if (acEl) {
      acEl.textContent = `AC ${effAc}`;
      acEl.style.color = derived?.ac ? '#66bb6a' : '';
    }
    if (profEl) profEl.textContent = `Prof +${p.profBonus}`;

    const asiBadge = document.getElementById('sp-asi-badge');
    if (asiBadge) {
      asiBadge.style.display = ((s as unknown as Record<string, unknown>)._pendingASI as number > 0) ? 'inline' : 'none';
    }
  },

  _renderCharacterTab(s: GameScene) {
    const el = document.getElementById('tab-content-character');
    if (!el) return;
    el.innerHTML = T.statsPanel(s.pStats as Record<string, unknown>, s.playerHP, s.playerMaxHP);
  },

  _renderInventoryTab(s: GameScene) {
    const el = document.getElementById('tab-content-inventory');
    if (!el) return;
    const p = s.pStats as Record<string, unknown>;
    const inv = Array.isArray(p.inventory) ? (p.inventory as Array<Record<string, unknown>>) : [];
    const gold = Number(p.gold || 0);

    const TYPE_COLOR: Record<string, string> = { weapon: '#e8a87c', armor: '#7ec8e3', consumable: '#a8e6cf', gem: '#f5d76e', misc: '#b0b0b0' };
    const TYPE_LABEL: Record<string, string> = { weapon: 'WPN', armor: 'ARM', consumable: 'USE', gem: 'GEM', misc: '···' };

    const rows = inv.map((item, i) => {
      const tc = TYPE_COLOR[String(item.type)] || '#b0b0b0';
      const tl = TYPE_LABEL[String(item.type)] || '···';
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
        <span class="inv-icon">${item.icon || '📦'}</span>
        <span class="inv-name">${item.name || item.id || 'Item'}${qtyLabel}</span>
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

  refreshActiveTab() {
    if (!this._collapsed && this._activeTab === 'character') {
      this._renderCharacterTab(this._scene!);
    }
  },

  refresh() {
    this.updateHeader();
    this.refreshTab(this._activeTab);
  },
};

(window as unknown as Record<string, unknown>).SidePanel = SidePanel;
