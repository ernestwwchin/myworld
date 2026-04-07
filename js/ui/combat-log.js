// ═══════════════════════════════════════════════════════
// combat-log.js — Scrollable, color-coded combat log
// Replaces the single-line #status-bar
// ═══════════════════════════════════════════════════════

const CombatLog = {
  _el: null,
  _body: null,
  _collapsed: false,
  _maxEntries: 200,
  _activeFilter: 'all',   // 'all'|'combat'|'dialog'|'system'

  /** Message type → CSS color */
  COLORS: {
    info:    '#b0bec5',
    player:  '#66bb6a',
    enemy:   '#ef5350',
    loot:    '#ffd54f',
    system:  '#64b5f6',
  },

  RESULT_COLORS: {
    hit:  '#66bb6a',
    miss: '#ef5350',
    crit: '#f39c12',
  },

  init() {
    this._el = document.getElementById('combat-log');
    this._body = document.getElementById('combat-log-body');
    // Collapse button
    const colBtn = document.getElementById('cl-collapse-btn');
    if (colBtn) colBtn.addEventListener('click', () => this.toggleCollapse());
    // Filter buttons
    const filters = document.querySelectorAll('.cl-filter');
    filters.forEach(btn => {
      btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
    });
  },

  setFilter(cat) {
    this._activeFilter = cat || 'all';
    // Update button states
    document.querySelectorAll('.cl-filter').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === this._activeFilter);
    });
    // Apply CSS filter class
    if (this._body) {
      this._body.className = this._activeFilter === 'all' ? '' : `filter-${this._activeFilter}`;
      this._body.scrollTop = this._body.scrollHeight;
    }
  },

  /** Simple text line
   * @param {string} text
   * @param {string} [type] - color key: info|player|enemy|loot|system
   * @param {string} [cat] - filter category: combat|dialog|system
   */
  log(text, type = 'info', cat = 'system') {
    if (!this._body) return;
    const line = document.createElement('div');
    line.className = 'cl-line';
    line.dataset.cat = cat;
    line.style.color = this.COLORS[type] || this.COLORS.info;
    line.textContent = text;
    this._body.appendChild(line);
    this._trim();
  },

  /** Structured attack roll entry
   * @param {Object} opts
   * @param {string} opts.actor - "You" or enemy name
   * @param {string} opts.target - target name
   * @param {string} opts.result - 'hit'|'miss'|'crit'
   * @param {number} [opts.damage] - damage dealt (if hit)
   * @param {string} [opts.rollDetail] - e.g. "d20[14] + 5 = 19 vs AC 15"
   * @param {string} [opts.dmgDetail] - e.g. "1d8[6] + 3 = 9 slashing"
   * @param {string} [opts.extra] - extra info (sneak, hidden, etc.)
   */
  logRoll(opts) {
    if (!this._body) return;
    const el = document.createElement('div');
    el.dataset.cat = opts.cat || 'combat';

    const resultLabels = { hit: 'HIT', miss: 'MISS', crit: 'CRITICAL HIT' };
    const resultColor = this.RESULT_COLORS[opts.result] || '#b0bec5';
    const mainColor = opts.actor === 'You' ? this.COLORS.player : this.COLORS.enemy;

    // Miss → compact single line
    if (opts.result === 'miss') {
      el.className = 'cl-line';
      el.style.color = resultColor;
      el.innerHTML = `<span style="color:${mainColor}">${opts.actor}</span> → ${opts.target} — <b>MISS</b>${opts.rollDetail ? ' <span style="color:#888;font-size:11px">' + opts.rollDetail + '</span>' : ''}${opts.extra ? ' <span style="color:#888">(' + opts.extra + ')</span>' : ''}`;
      this._body.appendChild(el);
      this._trim();
      return;
    }

    // Hit/Crit → multi-line
    el.className = 'cl-roll';
    let html = `<div class="cl-roll-main" style="color:${mainColor}">`;
    html += `${opts.actor} → ${opts.target}`;
    if (opts.damage != null) html += ` for <span style="color:#fff">${opts.damage}</span>`;
    html += `</div>`;

    if (opts.rollDetail) {
      const tag = opts.result === 'crit'
        ? ` <span style="color:${resultColor};font-weight:bold">CRIT!</span>`
        : '';
      html += `<div class="cl-roll-detail">⚄ ${opts.rollDetail}${tag}</div>`;
    }
    if (opts.dmgDetail) {
      html += `<div class="cl-roll-detail">⚔ ${opts.dmgDetail}</div>`;
    }
    if (opts.extra) {
      html += `<div class="cl-roll-detail" style="color:#aaa">${opts.extra}</div>`;
    }

    el.innerHTML = html;
    this._body.appendChild(el);
    this._trim();
  },

  /** Turn separator */
  logSep(label) {
    if (!this._body) return;
    if (label) {
      const el = document.createElement('div');
      el.className = 'cl-line';
      el.style.color = '#7a7a7a';
      el.style.fontSize = '10px';
      el.style.letterSpacing = '1px';
      el.textContent = `── ${label} ──`;
      this._body.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.className = 'cl-sep';
      this._body.appendChild(el);
    }
    this._trim();
  },

  _trim() {
    while (this._body && this._body.children.length > this._maxEntries) {
      this._body.removeChild(this._body.firstChild);
    }
    if (this._body) this._body.scrollTop = this._body.scrollHeight;
  },

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    if (this._el) {
      this._el.classList.toggle('collapsed', this._collapsed);
    }
  },

  clear() {
    if (this._body) this._body.innerHTML = '';
  },
};

window.CombatLog = CombatLog;
