import { DND_XP, SKILLS, dnd } from '@/config';

export const T = {
  sign: (n: number) => (n >= 0 ? '+' : '') + n,

  section: (title: string, mt?: string) =>
    `<div class="ss"${mt ? ` style="margin-top:${mt}"` : ''}>${title}</div>`,

  row: (label: string, value: unknown, extra?: string) =>
    `<div class="sr"><span class="sn">${label}</span><span class="sv">${value}</span>${extra ? extra : ''}</div>`,

  closeBtn: (onclick: string) =>
    `<div style="color:#555;font-size:9px;cursor:pointer" onclick="${onclick}">✕</div>`,

  charHeader: (p: Record<string, unknown>, hp: number, maxHP: number) => `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="color:#c9a84c;letter-spacing:3px;font-size:11px">CHARACTER</div>
      ${T.closeBtn('toggleStats()')}
    </div>
    <div style="background:rgba(41,128,185,0.15);border:1px solid rgba(41,128,185,0.3);border-radius:4px;padding:8px;margin-bottom:10px;text-align:center">
      <div style="color:#f0c060;font-size:15px;letter-spacing:2px">${p.name}</div>
      <div style="color:#7fc8f8;font-size:12px;margin-top:2px">${p.class} · Level ${p.level}</div>
      <div style="color:#aaa;font-size:11px;margin-top:1px">HP ${hp}/${maxHP} · AC ${p.ac} · Prof +${p.profBonus}</div>
    </div>`,

  xpSection: (p: Record<string, unknown>) => {
    const level = Number(p.level);
    const xp = Number(p.xp);
    const xn = DND_XP[Math.min(level, 19)];
    const xp0 = DND_XP[Math.max(level - 1, 0)];
    const pct = level >= 20 ? 100 : Math.floor((xp - xp0) / (xn - xp0) * 100);
    return `
    ${T.section('EXPERIENCE')}
    ${T.row('XP', `${xp.toLocaleString()} / ${level < 20 ? xn.toLocaleString() : 'MAX'}`)}
    <div class="xw"><div class="xb" style="width:${pct}%"></div></div>
    ${level < 20 ? `<div style="color:#555;font-size:10px;margin-top:2px;text-align:right">${(xn - xp).toLocaleString()} XP to Lv${level + 1}</div>` : ''}`;
  },

  abilitySection: (p: Record<string, unknown>) => {
    const m = (s: unknown) => T.sign(dnd.mod(Number(s)));
    return `
    ${T.section('ABILITY SCORES', '10px')}
    ${['str','dex','con','int','wis','cha'].map(s => `
    <div class="sr">
      <span class="sn">${s.toUpperCase()}</span>
      <span class="sv">${p[s]}</span>
      <span class="sm">${m(p[s])}</span>
      <span style="color:#666;font-size:10px">save${(p.savingThrows as Set<string>)?.has(s) ? ` (${T.sign(dnd.mod(Number(p[s])) + Number(p.profBonus))})` : `(${m(p[s])})`}</span>
    </div>`).join('')}`;
  },

  combatSection: (p: Record<string, unknown>) => {
    const m = (s: unknown) => T.sign(dnd.mod(Number(s)));
    const dmg = dnd.damageSpecToString(p.damageFormula || '1d4');
    const equippedWeapon = p.equippedWeapon as Record<string, unknown> | undefined;
    const equippedArmor = p.equippedArmor as Record<string, unknown> | undefined;
    const wpnLabel = equippedWeapon
      ? `${equippedWeapon.icon || '⚔️'} ${equippedWeapon.name}`
      : (p.weaponId ? `⚔️ ${p.weaponId}` : '— unarmed');
    const armLabel = equippedArmor
      ? `${equippedArmor.icon || '🛡️'} ${equippedArmor.name}`
      : '— none';
    return `
    ${T.section('COMBAT', '10px')}
    ${T.row('AC', p.ac)}
    ${T.row('Attack', `d20+${dnd.mod(Number(p.str)) + Number(p.profBonus)} / ${dmg}`)}
    ${T.row('Speed', '6 tiles (30ft)')}
    ${T.row('Initiative', m(p.dex))}
    ${T.section('EQUIPMENT', '8px')}
    ${T.row('Weapon', wpnLabel)}
    ${T.row('Armor', armLabel)}`;
  },

  featuresSection: (p: Record<string, unknown>) => `
    ${T.section('CLASS FEATURES', '10px')}
    ${(p.features as string[]).map(f => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;color:#bbb">⚔ ${f}</div>`).join('')}`,

  skillsSection: (p: Record<string, unknown>) => `
    ${T.section('SKILLS', '10px')}
    ${Object.entries(SKILLS).map(([k, sk]) => {
      const aMod = dnd.mod(Number(p[sk.ability]));
      const prof = (p.skillProficiencies as Set<string>)?.has(k);
      const total = aMod + (prof ? Number(p.profBonus) : 0);
      return `<div class="sr sk-row"><span class="sn">${prof ? '●' : '○'} ${sk.label}</span><span class="sv">${T.sign(total)}</span><span class="sm">${sk.ability.toUpperCase()}</span></div>`;
    }).join('')}`,

  statsPanel: (p: Record<string, unknown>, hp: number, maxHP: number) =>
    T.charHeader(p, hp, maxHP) +
    T.xpSection(p) +
    T.abilitySection(p) +
    T.combatSection(p) +
    T.featuresSection(p) +
    T.skillsSection(p) +
    `<div style="margin-top:12px;color:#555;font-size:10px;text-align:center">DnD 5e · ${p.class}</div>`,
};

(window as unknown as Record<string, unknown>).T = T;
