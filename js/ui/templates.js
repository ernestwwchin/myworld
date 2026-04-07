// ═══════════════════════════════════════════════════════
// templates.js — Lightweight HTML template helpers
// Replaces inline template literal soup with composable
// builder functions for the stats panel and future UI.
// ═══════════════════════════════════════════════════════

const T = {
  // ── Primitives ─────────────────────────────────
  /** Format a modifier with sign: +2, -1 */
  sign: n => (n >= 0 ? '+' : '') + n,

  /** Section header */
  section: (title, mt) =>
    `<div class="ss"${mt ? ` style="margin-top:${mt}"` : ''}>${title}</div>`,

  /** Stat row: label — value — optional extra */
  row: (label, value, extra) =>
    `<div class="sr"><span class="sn">${label}</span><span class="sv">${value}</span>${extra ? extra : ''}</div>`,

  /** Close button */
  closeBtn: (onclick) =>
    `<div style="color:#555;font-size:9px;cursor:pointer" onclick="${onclick}">✕</div>`,

  // ── Stats Panel Sections ───────────────────────

  /** Character header card */
  charHeader: (p, hp, maxHP) => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="color:#c9a84c;letter-spacing:3px;font-size:11px">CHARACTER</div>
      ${T.closeBtn('toggleStats()')}
    </div>
    <div style="background:rgba(41,128,185,0.15);border:1px solid rgba(41,128,185,0.3);border-radius:4px;padding:8px;margin-bottom:10px;text-align:center">
      <div style="color:#f0c060;font-size:15px;letter-spacing:2px">${p.name}</div>
      <div style="color:#7fc8f8;font-size:12px;margin-top:2px">${p.class} · Level ${p.level}</div>
      <div style="color:#aaa;font-size:11px;margin-top:1px">HP ${hp}/${maxHP} · AC ${p.ac} · Prof +${p.profBonus}</div>
    </div>`,

  /** XP bar */
  xpSection: (p) => {
    const xn = DND_XP[Math.min(p.level, 19)];
    const xp = DND_XP[Math.max(p.level - 1, 0)];
    const pct = p.level >= 20 ? 100 : Math.floor((p.xp - xp) / (xn - xp) * 100);
    return `
    ${T.section('EXPERIENCE')}
    ${T.row('XP', `${p.xp.toLocaleString()} / ${p.level < 20 ? xn.toLocaleString() : 'MAX'}`)}
    <div class="xw"><div class="xb" style="width:${pct}%"></div></div>
    ${p.level < 20 ? `<div style="color:#555;font-size:10px;margin-top:2px;text-align:right">${(xn - p.xp).toLocaleString()} XP to Lv${p.level + 1}</div>` : ''}`;
  },

  /** Ability scores + saving throws */
  abilitySection: (p) => {
    const m = s => T.sign(dnd.mod(s));
    return `
    ${T.section('ABILITY SCORES', '10px')}
    ${['str','dex','con','int','wis','cha'].map(s => `
    <div class="sr">
      <span class="sn">${s.toUpperCase()}</span>
      <span class="sv">${p[s]}</span>
      <span class="sm">${m(p[s])}</span>
      <span style="color:#666;font-size:10px">save${p.savingThrows.has(s) ? ` (${T.sign(dnd.mod(p[s]) + p.profBonus)})` : `(${m(p[s])})`}</span>
    </div>`).join('')}`;
  },

  /** Combat stats */
  combatSection: (p) => {
    const m = s => T.sign(dnd.mod(s));
    const dmg = dnd.damageSpecToString(p.damageFormula || '1d4');
    return `
    ${T.section('COMBAT', '10px')}
    ${T.row('AC', p.ac)}
    ${T.row('Attack', `d20+${dnd.mod(p.str) + p.profBonus} / ${dmg}`)}
    ${T.row('Speed', '6 tiles (30ft)')}
    ${T.row('Initiative', m(p.dex))}`;
  },

  /** Class features list */
  featuresSection: (p) => `
    ${T.section('CLASS FEATURES', '10px')}
    ${p.features.map(f => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;color:#bbb">⚔ ${f}</div>`).join('')}`,

  /** All 18 skills */
  skillsSection: (p) => `
    ${T.section('SKILLS', '10px')}
    ${Object.entries(SKILLS).map(([k, sk]) => {
      const aMod = dnd.mod(p[sk.ability]);
      const prof = p.skillProficiencies.has(k);
      const total = aMod + (prof ? p.profBonus : 0);
      return `<div class="sr sk-row"><span class="sn">${prof ? '●' : '○'} ${sk.label}</span><span class="sv">${T.sign(total)}</span><span class="sm">${sk.ability.toUpperCase()}</span></div>`;
    }).join('')}`,

  /** Full stats panel */
  statsPanel: (p, hp, maxHP) =>
    T.charHeader(p, hp, maxHP) +
    T.xpSection(p) +
    T.abilitySection(p) +
    T.combatSection(p) +
    T.featuresSection(p) +
    T.skillsSection(p) +
    `<div style="margin-top:12px;color:#555;font-size:10px;text-align:center">DnD 5e · ${p.class}</div>`,
};
