import { MODE, ABILITY_DEFS } from '@/config';
import { withCombatLog } from '@/helpers';
import { ModLoader } from '@/modloader';
import type { GameScene } from '@/game';

interface Slot {
  type: string | null;
  id: string | null;
  _item?: Record<string, unknown> | null;
  _used?: boolean;
}

type CatSlots = Record<string, Slot[][]>;

export const Hotbar = {
  ROWS: 3,
  COLS: 10,
  _scene: null as GameScene | null,
  _expanded: true,

  _categories: ['common', 'class', 'items', 'passives'],
  _currentCat: 'common',

  _catSlots: null as CatSlots | null,
  _slots: null as CatSlots | null,

  _selectedSlot: null as { cat: string; row: number; col: number } | null,
  _descOpen: false,
  _descSlot: null as { cat: string; row: number; col: number } | null,
  _moveMode: false,
  _moveFrom: null as { cat: string; row: number; col: number; mode: string } | null,

  TYPE_COLORS: {
    action:       't-action',
    bonusAction:  't-bonus',
    classFeature: 't-class',
    spell:        't-spell',
    cantrip:      't-cantrip',
    item:         't-item',
  } as Record<string, string>,

  ABILITY_CATEGORIES: {
    attack: 'common', dash: 'common', dodge: 'common', disengage: 'common',
    help: 'common', hide: 'common', shove: 'common',
    poison_strike: 'class', sleep_cloud: 'class', second_wind: 'class',
    action_surge: 'class', flee: 'common',
  } as Record<string, string>,

  _defaultAttackId: 'attack',

  init(scene: GameScene) {
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
    this._slots = this._catSlots;
  },

  _populateDefaults() {
    const s = this._scene;
    if (!s) return;
    const abilities = s.getAvailablePlayerAbilities ? s.getAvailablePlayerAbilities() : [];

    const commonOrder = ['attack', 'dash', 'dodge', 'disengage', 'help', 'hide'];
    let col = 0;
    for (const id of commonOrder) {
      if (abilities.includes(id) || ['attack', 'dash'].includes(id)) {
        this._setCatSlot('common', 0, col++, 'ability', id);
        if (col >= this.COLS) break;
      }
    }

    const classOrder = ['poison_strike', 'sleep_cloud', 'second_wind', 'action_surge'];
    col = 0;
    for (const id of classOrder) {
      if (abilities.includes(id)) {
        this._setCatSlot('class', 0, col++, 'ability', id);
        if (col >= this.COLS) break;
      }
    }

    this.refreshItems();
  },

  refreshItems() {
    const s = this._scene;
    const inv = (s?.pStats as Record<string, unknown>)?.inventory;
    if (this._catSlots?.items) {
      for (let c = 0; c < this.COLS; c++) {
        this._catSlots.items[0][c] = { type: null, id: null };
      }
    }
    if (!Array.isArray(inv)) return;
    let col = 0;
    for (const item of inv as Array<Record<string, unknown>>) {
      if (col >= this.COLS) break;
      this._setCatSlot('items', 0, col++, 'item', String(item.id || ''), item);
    }
    if (this._currentCat === 'items') this.render();
  },

  _setCatSlot(cat: string, row: number, col: number, type: string, id: string, _item: Record<string, unknown> | null = null) {
    if (this._catSlots?.[cat]?.[row]) {
      this._catSlots[cat][row][col] = { type, id, _item };
    }
  },

  getSlot(cat: string, row: number, col: number): Slot {
    return this._catSlots?.[cat]?.[row]?.[col] || { type: null, id: null };
  },

  _bindEvents() {
    document.querySelectorAll('.hb-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchCategory((tab as HTMLElement).dataset.cat!));
    });

    document.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key >= '1' && e.key <= '9') this._activateSlot(this._currentCat, 0, parseInt(e.key) - 1);
      else if (e.key === '0') this._activateSlot(this._currentCat, 0, 9);
      if (e.key === 'e' || e.key === 'E') {
        const s = this._scene;
        if (s && s.mode === MODE.COMBAT) (s as unknown as { endPlayerTurn?(): void }).endPlayerTurn?.();
      }
      if (e.key === 'l' || e.key === 'L') {
        const s = this._scene;
        (s as unknown as { toggleEnemySight?(): void })?.toggleEnemySight?.();
      }
      if (e.key === 'h' || e.key === 'H') {
        const s = this._scene;
        const inv = (s?.pStats as Record<string, unknown>)?.inventory;
        if (s && Array.isArray(inv)) {
          const potion = (inv as Array<Record<string, unknown>>).find(i => i.type === 'consumable' && i.heal);
          if (potion) {
            (s as unknown as { useItem(i: unknown): void }).useItem(potion);
            this.refreshItems();
          }
        }
      }
    });

    const grid = document.getElementById('hotbar-grid');
    if (grid) {
      grid.addEventListener('contextmenu', e => {
        e.preventDefault();
        const slotEl = (e.target as HTMLElement).closest('.hb-slot') as HTMLElement | null;
        if (slotEl) this._showDescription(slotEl.dataset.cat!, Number(slotEl.dataset.row), Number(slotEl.dataset.col));
      });
    }
  },

  switchCategory(cat: string) {
    if (!this._categories.includes(cat)) return;
    this._currentCat = cat;
    document.querySelectorAll('.hb-cat-tab').forEach(t =>
      t.classList.toggle('active', (t as HTMLElement).dataset.cat === cat)
    );
    this.render();
  },

  setExpanded(expanded: boolean) {
    this._expanded = expanded;
    if (this._catSlots) this.render();
  },

  _cmd(action: string) {
    const s = this._scene;
    if (!s) return;
    const ss = s as unknown as Record<string, unknown>;
    if (action === 'end_turn') (ss.endPlayerTurn as (() => void) | undefined)?.();
    else if (action === 'flee') (ss.tryFleeCombat as (() => void) | undefined)?.();
    else if (action === 'reset_move') (ss.resetMove as (() => void) | undefined)?.();
    else if (action === 'settings') {
      const ok = (typeof window !== 'undefined' && typeof window.confirm === 'function')
        ? window.confirm('Reset all progress and restart the game?')
        : false;
      if (!ok) {
        (ss.showStatus as ((msg: string) => void) | undefined)?.('Reset cancelled.');
        return;
      }
      if (typeof ModLoader?.resetPersistentGame === 'function') {
        ModLoader.resetPersistentGame(true);
      } else {
        (ss.showStatus as ((msg: string) => void) | undefined)?.('Reset is unavailable right now.');
      }
    }
  },

  syncCommandStrip() {
    const s = this._scene;
    const inCombat = s && s.mode === MODE.COMBAT;
    const endBtn = document.getElementById('cmd-end');
    const fleeBtn = document.getElementById('cmd-flee');
    const resetBtn = document.getElementById('cmd-reset');
    if (endBtn) endBtn.classList.toggle('hidden', !inCombat);
    if (fleeBtn) fleeBtn.classList.toggle('hidden', !inCombat);
    if (resetBtn) resetBtn.classList.toggle('hidden', !inCombat);
    this.syncDefaultAttackSlot();
  },

  updateResourcePips() {
    const s = this._scene;
    if (!s) return;
    const ss = s as unknown as Record<string, unknown>;
    const pips = document.getElementById('res-pips');
    if (!pips) return;
    this.render();

    const inCombat = s.mode === MODE.COMBAT;
    pips.classList.toggle('show', inCombat);
    if (!inCombat) return;

    const actGroup = document.getElementById('rp-action');
    if (actGroup) {
      const total = 1;
      const used = (ss.playerAP as number) <= 0 ? total : 0;
      let html = '<span class="rp-label">ACT</span>';
      for (let i = 0; i < total; i++) html += `<div class="rp-pip act${i < used ? ' spent' : ''}"></div>`;
      actGroup.innerHTML = html;
    }

    const baGroup = document.getElementById('rp-bonus');
    if (baGroup) {
      const total = Math.max(1, Number(ss.playerBonusAPMax || 1));
      const remaining = Math.max(0, Math.min(total, Number(ss.playerBonusAP ?? total)));
      const used = Math.max(0, total - remaining);
      let html = '<span class="rp-label">BA</span>';
      for (let i = 0; i < total; i++) html += `<div class="rp-pip bonus${i < used ? ' spent' : ''}"></div>`;
      html += `<span class="rp-count">${remaining}/${total}</span>`;
      baGroup.innerHTML = html;
    }

    const mvGroup = document.getElementById('rp-move');
    if (mvGroup) {
      const budget = Math.max(0, Number(ss.moveResetAnchorMoves ?? ss.turnStartMoves ?? ss.playerMoves ?? 0));
      const remaining = Math.max(0, Number(ss.playerMoves || 0));
      const dTotal = Math.ceil(budget);
      const pipRemaining = Math.max(0, Math.min(dTotal, Math.floor(remaining + 0.001)));
      const countText = Math.abs(remaining - Math.round(remaining)) < 0.001
        ? String(Math.round(remaining))
        : remaining.toFixed(1);
      const totalText = Math.abs(budget - Math.round(budget)) < 0.001
        ? String(Math.round(budget))
        : budget.toFixed(1);
      let html = '<span class="rp-label">MOV</span>';
      for (let i = 0; i < dTotal; i++) html += `<div class="rp-pip mv${i >= pipRemaining ? ' spent' : ''}"></div>`;
      html += `<span class="rp-count">${countText}/${totalText}</span>`;
      mvGroup.innerHTML = html;
    }

    const chGroup = document.getElementById('rp-charges');
    if (chGroup) {
      const charges: Array<{ name: string; used: boolean }> = [];
      const p = s.pStats as Record<string, unknown>;
      if (p && Number(p.level) >= 1) charges.push({ name: 'SW', used: false });
      if (p && Number(p.level) >= 2) charges.push({ name: 'AS', used: false });
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

  _activateSlot(cat: string, row: number, col: number) {
    const slot = this.getSlot(cat, row, col);
    if (!slot || !slot.id) return;

    if (this._moveMode) {
      this._completeMove(cat, row, col);
      return;
    }

    const s = this._scene;
    if (!s) return;
    const ss = s as unknown as Record<string, unknown>;

    if (slot.type === 'ability') {
      (ss.selectAction as ((id: string) => void) | undefined)?.(slot.id);
      this._selectedSlot = ss.pendingAction ? { cat, row, col } : null;
      this.render();
    } else if (slot.type === 'item' && slot._item) {
      const item = slot._item;
      if (item.type === 'consumable') {
        (ss.useItem as ((i: unknown) => void) | undefined)?.(item);
        this.refreshItems();
      } else if (item.type === 'weapon' || item.type === 'armor') {
        (ss.equipItem as ((i: unknown) => void) | undefined)?.(item);
        this.refreshItems();
      }
    }
  },

  markUsed(abilityId: string, used = true) {
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

  setSelected(abilityId: string) {
    this._selectedSlot = null;
    const daEl = document.getElementById('default-atk-slot');
    if (daEl) daEl.classList.toggle('selected', abilityId === this.getEffectiveDefaultAttack());
    for (const cat of this._categories) {
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          const slot = this.getSlot(cat, r, c);
          if (slot.type === 'ability' && slot.id === abilityId) {
            this._selectedSlot = { cat, row: r, col: c };
            if (cat !== this._currentCat) this.switchCategory(cat);
            this.render();
            return;
          }
        }
      }
    }
    this.render();
  },

  clearSelection() {
    this._selectedSlot = null;
    const daEl = document.getElementById('default-atk-slot');
    if (daEl) daEl.classList.remove('selected');
    this.render();
  },

  _showDescription(cat: string, row: number, col: number) {
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
        ${this._addDefaultAtkOption(cat, row, col)}
        <button class="hbd-btn" onclick="Hotbar._startMove('${cat}',${row},${col})">Move ↔</button>
        <button class="hbd-btn" onclick="Hotbar._startSwap('${cat}',${row},${col})">Swap 🔄</button>
        <button class="hbd-btn hbd-btn-danger" onclick="Hotbar._clearSlot('${cat}',${row},${col})">Clear ✕</button>
      </div>`;
    panel.style.display = 'block';
    this._descOpen = true;
    this._descSlot = { cat, row, col };

    const close = (e: MouseEvent) => {
      if (!panel.contains(e.target as Node)) {
        panel.style.display = 'none';
        this._descOpen = false;
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  },

  _startMove(cat: string, row: number, col: number) {
    this._moveMode = true;
    this._moveFrom = { cat, row, col, mode: 'move' };
    const desc = document.getElementById('hotbar-desc');
    if (desc) desc.style.display = 'none';
    this._descOpen = false;
    this.render();
    withCombatLog(cl => (cl as { log(t: string, c: string): void }).log('Click a slot to move this ability to.', 'system'));
  },

  _startSwap(cat: string, row: number, col: number) {
    this._moveMode = true;
    this._moveFrom = { cat, row, col, mode: 'swap' };
    const desc = document.getElementById('hotbar-desc');
    if (desc) desc.style.display = 'none';
    this._descOpen = false;
    this.render();
    withCombatLog(cl => (cl as { log(t: string, c: string): void }).log('Click a slot to swap with.', 'system'));
  },

  _completeMove(toCat: string, toRow: number, toCol: number) {
    const from = this._moveFrom;
    if (!from) { this._moveMode = false; return; }
    const { cat: fc, row: fr, col: fco } = from;

    if (!this._catSlots) { this._moveMode = false; return; }

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

  _clearSlot(cat: string, row: number, col: number) {
    if (this._catSlots?.[cat]?.[row]) {
      this._catSlots[cat][row][col] = { type: null, id: null };
    }
    const desc = document.getElementById('hotbar-desc');
    if (desc) desc.style.display = 'none';
    this._descOpen = false;
    this.render();
  },

  _isSlotUnavailable(slot: Slot): boolean {
    if (!slot.id || slot.type !== 'ability') return false;
    const s = this._scene;
    if (!s || s.mode !== MODE.COMBAT) return false;
    const ss = s as unknown as Record<string, unknown>;
    const def = this._getAbilityDef(slot.id);
    if (!def) return false;
    const rc = def.resourceCost as Record<string, unknown> | undefined;
    if (rc?.action && Number(ss.playerAP || 0) <= 0) return true;
    if (rc?.bonusAction) {
      const baMax = Number(ss.playerBonusAPMax || 1);
      const ba = Number(ss.playerBonusAP ?? baMax);
      if (ba <= 0) return true;
    }
    if (def.type === 'action' && !rc && Number(ss.playerAP || 0) <= 0) return true;
    if (def.type === 'bonusAction' && !rc) {
      const baMax = Number(ss.playerBonusAPMax || 1);
      const ba = Number(ss.playerBonusAP ?? baMax);
      if (ba <= 0) return true;
    }
    return false;
  },

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
        const isUnavail = !isEmpty && !isUsed && this._isSlotUnavailable(slot);
        const isMoveFrom = this._moveMode && this._moveFrom &&
          this._moveFrom.cat === cat && this._moveFrom.row === r && this._moveFrom.col === c;

        const typeClass = isEmpty ? '' : this._getSlotTypeClass(slot.id!, slot);
        let cls = 'hb-slot';
        if (isEmpty) cls += ' empty';
        if (typeClass) cls += ' ' + typeClass;
        if (isSelected) cls += ' selected';
        if (isUsed) cls += ' used';
        if (isUnavail) cls += ' unavail';
        if (isMoveFrom) cls += ' move-from';

        const icon = isEmpty ? '+' : this._getSlotIcon(slot);
        const name = isEmpty ? '' : this._getSlotName(slot);
        const keyHint = r === 0 ? (c < 9 ? (c + 1) : '0') : '';
        const tipData = isEmpty ? '' : `data-tip-cat="${cat}" data-tip-row="${r}" data-tip-col="${c}"`;

        html += `<div class="${cls}" data-cat="${cat}" data-row="${r}" data-col="${c}" ${tipData}
          onclick="Hotbar._activateSlot('${cat}',${r},${c})"
          oncontextmenu="event.preventDefault();Hotbar._showDescription('${cat}',${r},${c})"
          onmouseenter="Hotbar._showTooltip(event,'${cat}',${r},${c})"
          onmouseleave="Hotbar._hideTooltip()">
          <div class="hb-icon">${icon}</div>
          <div class="hb-name">${name}</div>
          ${keyHint ? `<div class="hb-key">${keyHint}</div>` : ''}
        </div>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;
  },

  _getSlotTypeClass(id: string, slot: Slot): string {
    if (!id) return '';
    if (slot?.type === 'item') return this.TYPE_COLORS.item;
    const def = this._getAbilityDef(id);
    if (!def) return '';
    const defR = def as Record<string, unknown>;
    if (defR.category === 'cantrip') return this.TYPE_COLORS.cantrip;
    if (defR.category === 'spell') return this.TYPE_COLORS.spell;
    if (defR.category === 'classFeature') return this.TYPE_COLORS.classFeature;
    if (defR.type === 'bonusAction') return this.TYPE_COLORS.bonusAction;
    const classCat = this.ABILITY_CATEGORIES[id];
    if (classCat === 'class') return this.TYPE_COLORS.classFeature;
    return this.TYPE_COLORS.action;
  },

  _getTypeLabel(id: string): string {
    const def = this._getAbilityDef(id);
    if (!def) return 'Action';
    const defR = def as Record<string, unknown>;
    if (defR.category === 'cantrip') return 'Cantrip';
    if (defR.category === 'spell') return 'Spell';
    if (defR.category === 'classFeature') return 'Class Feature';
    if (defR.type === 'bonusAction') return 'Bonus Action';
    const classCat = this.ABILITY_CATEGORIES[id];
    if (classCat === 'class') return 'Class Feature';
    return 'Action';
  },

  _getTypeColor(id: string): string {
    const cls = this._getSlotTypeClass(id, this.getSlot(this._currentCat, 0, 0));
    const map: Record<string, string> = {
      't-action': '#999', 't-bonus': '#ce93d8', 't-class': '#f0a030',
      't-spell': '#64b5f6', 't-cantrip': '#66bb6a', 't-item': '#4dd0e1',
    };
    return map[cls] || '#999';
  },

  _getAbilityDef(id: string | null): Record<string, unknown> | null {
    if (!id) return null;
    if (ABILITY_DEFS[id]) return ABILITY_DEFS[id] as unknown as Record<string, unknown>;
    const fallbacks: Record<string, Record<string, unknown>> = {
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

  _getSlotIcon(slot: Slot): string {
    if (!slot?.id) return '+';
    if (slot.type === 'item' && slot._item) return String(slot._item.icon || '📦');
    const icons: Record<string, string> = {
      attack: '⚔️', dash: '💨', hide: '🕶', flee: '🏳', sleep_cloud: '🌫',
      poison_strike: '☠️', second_wind: '❤️', action_surge: '⚡',
      dodge: '🛡', help: '🤝', disengage: '↩️',
    };
    return icons[slot.id] || '◆';
  },

  _getSlotName(slot: Slot): string {
    if (!slot?.id) return '';
    if (slot.type === 'item' && slot._item) {
      const qty = Math.max(1, Number(slot._item.qty || 1));
      const name = String(slot._item.name || slot._item.id || 'Item');
      return qty > 1 ? `${name} x${qty}` : name;
    }
    const def = this._getAbilityDef(slot.id);
    return String(def?.name || slot.id);
  },

  _costText(def: Record<string, unknown>): string {
    if (!def) return '—';
    const rc = def.resourceCost as Record<string, unknown> | undefined;
    if (rc) {
      const parts: string[] = [];
      if (rc.action) parts.push(`${rc.action} Action`);
      if (rc.bonusAction) parts.push(`${rc.bonusAction} Bonus`);
      if (rc.movement) parts.push('Movement');
      return parts.join(', ') || 'Free';
    }
    if (def.type === 'bonusAction') return 'Bonus Action';
    if (def.type === 'action') return 'Action';
    return String(def.type || 'Free');
  },

  getDefaultAttackId(): string { return this._defaultAttackId || 'attack'; },

  setDefaultAttack(abilityId: string) {
    this._defaultAttackId = abilityId || 'attack';
    this.renderDefaultAttackSlot();
  },

  isDefaultAttackAvailable(): boolean {
    const s = this._scene;
    if (!s) return false;
    const id = this.getDefaultAttackId();
    if (id === 'attack') return true;
    const abilities = s.getAvailablePlayerAbilities ? s.getAvailablePlayerAbilities() : [];
    if (!abilities.includes(id)) return false;
    const def = this._getAbilityDef(id);
    const rc = def?.resourceCost as Record<string, unknown> | undefined;
    if (rc?.classCharge) {
      const charges = Number((s.pStats as Record<string, unknown>)?.classCharges || 0);
      if (charges <= 0) return false;
    }
    return true;
  },

  getEffectiveDefaultAttack(): string {
    const id = this.getDefaultAttackId();
    if (id === 'attack') return 'attack';
    if (this.isDefaultAttackAvailable()) return id;
    return 'attack';
  },

  renderDefaultAttackSlot() {
    const el = document.getElementById('default-atk-slot');
    if (!el) return;
    const id = this.getDefaultAttackId();
    const icon = this._getSlotIcon({ type: 'ability', id });
    const def = this._getAbilityDef(id);
    const name = String(def?.name || id);
    const avail = this.isDefaultAttackAvailable();
    el.querySelector('.da-icon')!.textContent = icon;
    el.querySelector('.da-name')!.textContent = name;
    el.classList.toggle('unavail', !avail);
  },

  syncDefaultAttackSlot() {
    const el = document.getElementById('default-atk-slot');
    if (!el) return;
    this.renderDefaultAttackSlot();
  },

  _useDefaultAttack() {
    const s = this._scene;
    if (!s) return;
    const id = this.getEffectiveDefaultAttack();
    (s as unknown as { selectAction?(id: string): void }).selectAction?.(id);
  },

  _showDefaultAtkPicker() {
    const s = this._scene;
    if (!s) return;
    const el = document.getElementById('default-atk-slot');
    if (!el) return;

    const allAbilities = s.getAvailablePlayerAbilities ? s.getAvailablePlayerAbilities() : [];
    const assignable = ['attack'];
    for (const abId of allAbilities) {
      if (abId === 'attack') continue;
      const aDef = (s as unknown as { getAbilityDef?(id: string): Record<string, unknown> | null }).getAbilityDef?.(abId);
      const tpl = aDef?.template as Record<string, unknown> | undefined;
      if ((tpl?.hit as Record<string, unknown> | undefined)?.attackRoll) assignable.push(abId);
    }

    let existing = document.getElementById('da-picker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'da-picker';
    picker.style.cssText = 'position:absolute;bottom:100%;left:0;background:rgba(10,10,20,0.95);border:1px solid rgba(240,192,96,0.4);border-radius:6px;padding:4px;display:flex;flex-direction:column;gap:2px;z-index:50;min-width:120px;';

    for (const abId of assignable) {
      const def = this._getAbilityDef(abId);
      const icon = this._getSlotIcon({ type: 'ability', id: abId });
      const name = String(def?.name || abId);
      const isCurrent = abId === this.getDefaultAttackId();

      const opt = document.createElement('div');
      opt.style.cssText = `padding:4px 8px;cursor:pointer;font-size:11px;color:#ddd;border-radius:3px;display:flex;align-items:center;gap:6px;${isCurrent ? 'background:rgba(240,192,96,0.15);' : ''}`;
      opt.innerHTML = `<span>${icon}</span><span>${name}</span>${isCurrent ? '<span style="color:#f0c060;font-size:9px;margin-left:auto">✓</span>' : ''}`;
      opt.addEventListener('click', () => {
        this.setDefaultAttack(abId);
        picker.remove();
        const s2 = this._scene;
        (s2 as unknown as { showStatus?(msg: string): void })?.showStatus?.(`Default attack set to ${name}.`);
      });
      opt.addEventListener('mouseenter', () => { opt.style.background = 'rgba(255,255,255,0.1)'; });
      opt.addEventListener('mouseleave', () => { opt.style.background = isCurrent ? 'rgba(240,192,96,0.15)' : ''; });
      picker.appendChild(opt);
    }

    el.style.position = 'relative';
    el.appendChild(picker);

    const close = (e: PointerEvent) => {
      if (!picker.contains(e.target as Node) && e.target !== el) {
        picker.remove();
        document.removeEventListener('pointerdown', close);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', close), 0);
  },

  _addDefaultAtkOption(cat: string, row: number, col: number): string {
    const slot = this.getSlot(cat, row, col);
    if (!slot?.id || slot.type !== 'ability') return '';
    const s = this._scene;
    const aDef = (s as unknown as { getAbilityDef?(id: string): Record<string, unknown> | null })?.getAbilityDef?.(slot.id);
    const tpl = aDef?.template as Record<string, unknown> | undefined;
    if (!(tpl?.hit as Record<string, unknown> | undefined)?.attackRoll && slot.id !== 'attack') return '';
    const isCurrent = slot.id === this.getDefaultAttackId();
    return `<button class="hbd-btn" onclick="Hotbar.setDefaultAttack('${slot.id}')" ${isCurrent ? 'disabled style="opacity:0.5"' : ''}>🖱 Set as LMB${isCurrent ? ' ✓' : ''}</button>`;
  },

  _tipEl: null as HTMLElement | null,
  _tipTimer: 0,

  _showTooltip(e: MouseEvent, cat: string, row: number, col: number) {
    const slot = this.getSlot(cat, row, col);
    if (!slot?.id) return;
    const def = this._getAbilityDef(slot.id);
    let content = '';
    if (slot.type === 'item' && slot._item) {
      const item = slot._item;
      const desc = String(item.description || item.effect || '');
      content = `<b>${String(item.name || item.id)}</b>${desc ? `<br><span style="color:#bbb;font-size:10px">${desc}</span>` : ''}`;
    } else if (def) {
      const typeLabel = this._getTypeLabel(slot.id);
      const typeColor = this._getTypeColor(slot.id);
      const cost = this._costText(def);
      const unavail = this._isSlotUnavailable(slot);
      content = `<b>${def.name || slot.id}</b><br><span style="color:${typeColor};font-size:10px">${typeLabel} · ${cost}</span>${def.description ? `<br><span style="color:#bbb;font-size:10px">${def.description}</span>` : ''}${unavail ? `<br><span style="color:#e74c3c;font-size:10px">⚡ No ${def.type === 'bonusAction' ? 'Bonus Action' : 'Action'} remaining</span>` : ''}`;
    }
    if (!content) return;

    clearTimeout(this._tipTimer);
    this._tipTimer = window.setTimeout(() => {
      let tip = this._tipEl;
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'hb-tooltip';
        tip.style.cssText = 'position:fixed;z-index:200;pointer-events:none;background:rgba(10,10,20,0.97);border:1px solid rgba(240,192,96,0.4);border-radius:6px;padding:6px 10px;font-family:"Courier New",monospace;font-size:11px;color:#f0e6c8;max-width:200px;line-height:1.4;box-shadow:0 2px 12px rgba(0,0,0,0.6);';
        document.body.appendChild(tip);
        this._tipEl = tip;
      }
      tip.innerHTML = content;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const tipW = 200;
      let left = rect.left + rect.width / 2 - tipW / 2;
      left = Math.max(4, Math.min(window.innerWidth - tipW - 4, left));
      const top = rect.top - 8;
      tip.style.left = left + 'px';
      tip.style.top = (top - 80) + 'px';
      tip.style.display = 'block';
    }, 300);
  },

  _hideTooltip() {
    clearTimeout(this._tipTimer);
    if (this._tipEl) this._tipEl.style.display = 'none';
  },
};

(window as unknown as Record<string, unknown>).Hotbar = Hotbar;
