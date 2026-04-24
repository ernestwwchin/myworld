export const CombatLog = {
  _el: null as HTMLElement | null,
  _body: null as HTMLElement | null,
  _collapsed: false,
  _maxEntries: 200,
  _activeFilter: 'all' as string,

  COLORS: {
    info:   '#b0bec5',
    player: '#66bb6a',
    enemy:  '#ef5350',
    loot:   '#ffd54f',
    system: '#64b5f6',
  } as Record<string, string>,

  RESULT_COLORS: {
    hit:  '#66bb6a',
    miss: '#ef5350',
    crit: '#f39c12',
  } as Record<string, string>,

  DMG_TYPE_COLORS: {
    slashing:    '#ef9a9a',
    piercing:    '#f48fb1',
    bludgeoning: '#ce93d8',
    fire:        '#ff7043',
    cold:        '#81d4fa',
    lightning:   '#fff176',
    acid:        '#a5d6a7',
    poison:      '#a5d6a7',
    necrotic:    '#b0bec5',
    radiant:     '#fff9c4',
    psychic:     '#ce93d8',
    thunder:     '#b0bec5',
    force:       '#90caf9',
  } as Record<string, string>,

  dmgTypeColor(type: string): string {
    return this.DMG_TYPE_COLORS[type?.toLowerCase()] || '#ddd';
  },

  dmgTypeBadge(type: string): string {
    if (!type) return '';
    const color = this.dmgTypeColor(type);
    return ` <span style="color:${color};font-size:10px;opacity:0.85">[${type}]</span>`;
  },

  resistBadge(label: string): string {
    if (!label) return '';
    const lower = label.toLowerCase();
    if (lower.includes('immune')) return ` <span style="color:#90caf9;font-size:10px">${label}</span>`;
    if (lower.includes('vuln')) return ` <span style="color:#ff7043;font-size:10px">${label}</span>`;
    if (lower.includes('resist')) return ` <span style="color:#b0bec5;font-size:10px">${label}</span>`;
    return ` <span style="color:#aaa;font-size:10px">${label}</span>`;
  },

  init() {
    this._el = document.getElementById('combat-log');
    this._body = document.getElementById('combat-log-body');
    const colBtn = document.getElementById('cl-collapse-btn');
    if (colBtn) colBtn.addEventListener('click', () => this.toggleCollapse());
    document.querySelectorAll('.cl-filter').forEach(btn => {
      btn.addEventListener('click', () => this.setFilter((btn as HTMLElement).dataset.filter));
    });
  },

  setFilter(cat: string | undefined) {
    this._activeFilter = cat || 'all';
    document.querySelectorAll('.cl-filter').forEach(b => {
      (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.filter === this._activeFilter);
    });
    if (this._body) {
      this._body.className = this._activeFilter === 'all' ? '' : `filter-${this._activeFilter}`;
      this._body.scrollTop = this._body.scrollHeight;
    }
  },

  log(text: string, type = 'info', cat = 'system') {
    if (!this._body) return;
    const line = document.createElement('div');
    line.className = 'cl-line';
    line.dataset.cat = cat;
    line.style.color = this.COLORS[type] || this.COLORS.info;
    line.textContent = text;
    this._body.appendChild(line);
    this._trim();
  },

  logRoll(opts: {
    actor: string; target: string; result: string;
    damage?: number; rollDetail?: string; dmgDetail?: string; dmgType?: string; resistLabel?: string; extra?: string; cat?: string;
  }) {
    if (!this._body) return;
    const el = document.createElement('div');
    el.dataset.cat = opts.cat || 'combat';

    const resultColor = this.RESULT_COLORS[opts.result] || '#b0bec5';
    const mainColor = opts.actor === 'You' ? this.COLORS.player : this.COLORS.enemy;

    if (opts.result === 'miss') {
      el.className = 'cl-line';
      el.style.color = resultColor;
      el.innerHTML = `<span style="color:${mainColor}">${opts.actor}</span> → ${opts.target} — <b>MISS</b>${opts.rollDetail ? ' <span style="color:#888;font-size:11px">' + opts.rollDetail + '</span>' : ''}${opts.extra ? ' <span style="color:#888">(' + opts.extra + ')</span>' : ''}`;
      this._body.appendChild(el);
      this._trim();
      return;
    }

    el.className = 'cl-roll';
    let html = `<div class="cl-roll-main" style="color:${mainColor}">`;
    html += `${opts.actor} → ${opts.target}`;
    if (opts.damage != null) {
      const dmgColor = opts.dmgType ? this.dmgTypeColor(opts.dmgType) : '#fff';
      html += ` for <span style="color:${dmgColor};font-weight:bold">${opts.damage}</span>`;
    }
    if (opts.dmgType) html += this.dmgTypeBadge(opts.dmgType);
    if (opts.resistLabel) html += this.resistBadge(opts.resistLabel);
    html += `</div>`;

    if (opts.rollDetail) {
      const tag = opts.result === 'crit'
        ? ` <span style="color:${resultColor};font-weight:bold">CRIT!</span>`
        : '';
      html += `<div class="cl-roll-detail">⚄ ${opts.rollDetail}${tag}</div>`;
    }
    if (opts.dmgDetail) html += `<div class="cl-roll-detail">⚔ ${opts.dmgDetail}</div>`;
    if (opts.extra) html += `<div class="cl-roll-detail" style="color:#aaa">${opts.extra}</div>`;

    el.innerHTML = html;
    this._body.appendChild(el);
    this._trim();
  },

  logSep(label?: string) {
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
      this._body.removeChild(this._body.firstChild!);
    }
    if (this._body) this._body.scrollTop = this._body.scrollHeight;
  },

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    if (this._el) this._el.classList.toggle('collapsed', this._collapsed);
  },

  clear() {
    if (this._body) this._body.innerHTML = '';
  },
};

(window as unknown as Record<string, unknown>).CombatLog = CombatLog;
