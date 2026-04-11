// ═══════════════════════════════════════════════════════
// ui.js — Dev console, stats panel, ASI, global handlers
// ═══════════════════════════════════════════════════════

// ── DEV CONSOLE ──────────────────────────────────────
let _devVisible = false;
document.addEventListener('keydown', e => {
  if (e.key === '`' || e.key === '~') {
    _devVisible = !_devVisible;
    document.getElementById('dev-console').style.display = _devVisible ? 'block' : 'none';
    if (_devVisible) document.getElementById('dev-input').focus();
  }
});
document.getElementById('dev-input').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const cmd = e.target.value.trim();
  e.target.value = '';
  devLog('❯ ' + cmd);
  try {
    const result = devExec(cmd);
    if (result !== undefined) devLog(String(result));
  } catch (err) { devLog('ERR: ' + err.message); }
});

function devLog(msg) {
  const log = document.getElementById('dev-log');
  const line = document.createElement('div'); line.textContent = msg;
  log.appendChild(line); log.scrollTop = log.scrollHeight;
}

function devExec(cmd) {
  const s = game && game.scene && game.scene.getScene('GameScene');
  if (!s) return 'No scene';
  const cmds = {
    help: () => {
      devLog('playerMove(dx,dy) — move player by offset');
      devLog('playerPos() — show player tile');
      devLog('playerTp(x,y) — teleport player to tile');
      devLog('enemyList() — list all enemies');
      devLog('enemyKill(i) — kill enemy by index');
      devLog('giveXP(n) — give XP');
      devLog('godMode() — set HP to 9999');
      devLog('combat() — show combat state');
      return 'Commands listed above';
    },
    playerMove: (dx, dy) => {
      const nx = s.playerTile.x + Number(dx), ny = s.playerTile.y + Number(dy);
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return 'Out of bounds';
      if (typeof s.isWallTile === 'function' ? s.isWallTile(nx, ny) : MAP[ny][nx] === TILE.WALL) return 'Wall at ' + nx + ',' + ny;
      s.playerTile = { x: nx, y: ny };
      s.player.setPosition(nx * S + S / 2, ny * S + S / 2);
      s.updateHUD();
      return `Moved to (${nx},${ny})`;
    },
    playerPos: () => `(${s.playerTile.x},${s.playerTile.y}) HP:${s.playerHP}/${s.playerMaxHP}`,
    playerTp: (x, y) => {
      x = Number(x); y = Number(y);
      if (typeof s.isWallTile === 'function' ? s.isWallTile(x, y) : MAP[y][x] === TILE.WALL) return 'Wall';
      s.playerTile = { x, y }; s.player.setPosition(x * S + S / 2, y * S + S / 2); s.updateHUD();
      return `Teleported to (${x},${y})`;
    },
    enemyList: () => {
      s.enemies.forEach((e, i) => devLog(`[${i}] ${e.displayName||e.type} (${e.tx},${e.ty}) HP:${e.hp}/${e.maxHp} alive:${e.alive}`));
      return s.enemies.length + ' enemies';
    },
    enemyKill: (i) => {
      const e = s.enemies[Number(i)]; if (!e) return 'No enemy ' + i;
      e.hp = 0; e.alive = false;
      [e.img, e.hpBg, e.hpFg, e.lbl, e.sightRing, e.fa].forEach(o => { try { if (o) o.setAlpha(0); } catch (_) {} });
      return `Killed ${e.type}`;
    },
    giveXP: (n) => { s.pStats.xp += Number(n); s.checkLevelUp(); return `XP: ${s.pStats.xp}`; },
    godMode: () => { s.playerHP = 9999; s.playerMaxHP = 9999; s.updateHUD(); return 'God mode ON'; },
    combat: () => `mode:${s.mode} turnIdx:${s.turnIndex} order:${s.turnOrder.map(t => t.id === 'player' ? 'P' : (t.enemy.displayName||t.enemy.type)).join(',')} moves:${s.playerMoves} ap:${s.playerAP}`,
  };
  const m = cmd.match(/^(\w+)\s*\(?([^)]*)\)?/);
  if (!m) return undefined;
  const fn = cmds[m[1]];
  if (!fn) return undefined;
  const args = m[2] ? m[2].split(',').map(a => a.trim().replace(/['"]/g, '')) : [];
  return fn(...args);
}

// ── GLOBAL ERROR HANDLER ─────────────────────────────
window.onerror = function (msg, src, line, col, err) {
  const s = document.getElementById('status-bar');
  if (s) s.textContent = 'ERROR: ' + msg + ' L' + line;
  return false;
};

// ── DICE CLICK ───────────────────────────────────────
function handleDiceClick() {
  const scene = game && game.scene && game.scene.getScene('GameScene');
  if (!scene) return;
  if (scene.diceWaiting) {
    scene._handleDiceDismiss();
  } else {
    // Force-dismiss if overlay is visible but diceWaiting got out of sync
    const ov = document.getElementById('dice-ov');
    if (ov) ov.classList.remove('show');
  }
}

// ── STATS PANEL ──────────────────────────────────────
function toggleStats() {
  // Toggle side panel visibility
  if (withSidePanel(sidePanel => sidePanel.toggleCollapse()) !== undefined) {
    return;
  }
  // Legacy fallback
  document.getElementById('stats-panel').classList.toggle('open');
}

function toggleEnemySight() {
  const scene = game && game.scene && game.scene.getScene('GameScene');
  if (!scene || typeof scene.toggleEnemySight !== 'function') return;
  const enabled = scene.toggleEnemySight();
  const btn = document.getElementById('sight-btn');
  if (!btn) return;
  btn.textContent = enabled ? '👁 SIGHT ON' : '👁 SIGHT OFF';
  btn.classList.toggle('off', !enabled);
}

document.addEventListener('click', e => {
  const p = document.getElementById('stats-panel'), b = document.getElementById('stats-btn');
  if (p.classList.contains('open') && !p.contains(e.target) && e.target !== b) p.classList.remove('open');
});

// ── ASI PANEL ────────────────────────────────────────
let _asiSel = [];
function selectASI(stat) {
  const btn = document.getElementById('asi-' + stat), idx = _asiSel.indexOf(stat);
  if (idx >= 0) { _asiSel.splice(idx, 1); btn.style.background = 'rgba(192,150,50,0.1)'; btn.style.borderColor = 'rgba(192,150,50,0.3)'; }
  else { if (_asiSel.length >= 2) return; _asiSel.push(stat); btn.style.background = 'rgba(240,192,96,0.25)'; btn.style.borderColor = 'rgba(240,192,96,0.7)'; }
  const lbl = document.getElementById('asi-sel-lbl'), conf = document.getElementById('asi-confirm');
  if (_asiSel.length === 2) { lbl.textContent = `+1 ${_asiSel[0].toUpperCase()}, +1 ${_asiSel[1].toUpperCase()}`; conf.disabled = false; conf.style.opacity = '1'; }
  else { lbl.textContent = _asiSel.length ? `+1 ${_asiSel[0].toUpperCase()} — select one more` : 'Select 2 stats'; conf.disabled = true; conf.style.opacity = '0.4'; }
}

function confirmASI() {
  if (_asiSel.length !== 2) return;
  const s = game.scene.getScene('GameScene'); if (s) s.applyASI(_asiSel[0], _asiSel[1]);
  _asiSel = [];
  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(s => {
    const b = document.getElementById('asi-' + s);
    if (b) { b.style.background = 'rgba(192,150,50,0.1)'; b.style.borderColor = 'rgba(192,150,50,0.3)'; }
  });
}

class GameUIController {
  constructor(scene) {
    this.scene = scene;
  }

  _mod(score) {
    const v = Math.floor((Number(score || 10) - 10) / 2);
    return (v >= 0 ? '+' : '') + v;
  }

  dismissEnemyPopup() {
    const pop = document.getElementById('enemy-stat-popup');
    if (pop) pop.style.display = 'none';
    const atkPop = document.getElementById('atk-predict-popup');
    if (atkPop) atkPop.style.display = 'none';
    if (this.scene) this.scene._statPopupEnemy = null;
  }

  showCombatEnemyPopup(enemy) {
    this._showEnemyInfoPopup(enemy, true);
  }

  showEnemyStatPopup(enemy) {
    this._showEnemyInfoPopup(enemy, false);
  }

  // Unified info-only popup for both explore and combat
  _showEnemyInfoPopup(enemy, inCombat) {
    const s = this.scene;
    const pop = document.getElementById('enemy-stat-popup');
    if (!pop) return;

    // Toggle off if same enemy
    if (s._statPopupEnemy === enemy && pop.style.display !== 'none') {
      pop.style.display = 'none';
      const atkPop = document.getElementById('atk-predict-popup');
      if (atkPop) atkPop.style.display = 'none';
      s._statPopupEnemy = null;
      return;
    }

    const nameEl = document.getElementById('esp-name');
    const statsEl = document.getElementById('esp-stats');
    if (nameEl) nameEl.textContent = `${enemy.icon} ${enemy.displayName||enemy.type.toUpperCase()}`;

    const hpPct = enemy.hp / enemy.maxHp;
    const hpColor = hpPct <= 0.25 ? '#e74c3c' : hpPct <= 0.5 ? '#e67e22' : '#a5d6a7';
    const hpBarW = Math.max(0, Math.round(hpPct * 100));

    // Active status effects
    const fx = (enemy.effects || []).filter(e => e && e.id);
    const fxHtml = fx.length
      ? `<div style="margin-top:6px;font-size:11px;color:#ce93d8">Effects: ${fx.map(e => e.id).join(', ')}</div>`
      : '';

    // Attack prediction: shown in separate box beside stat popup
    let atkPredData = null;
    if (s.calcHitChance && s._resolveAbilityDamageSpec) {
      let abilityId = (inCombat && s._pendingAtkAbilityId) || 'attack';
      if (!s._pendingAtkAbilityId && typeof Hotbar !== 'undefined') {
        abilityId = Hotbar.getEffectiveDefaultAttack();
      }
      const pct = s.calcHitChance(enemy, abilityId);
      const pctColor = pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f0c060' : '#e74c3c';
      const aDef = s.getAbilityDef(abilityId);
      const aName = aDef?.name || 'Attack';
      const dmgSpec = s._resolveAbilityDamageSpec('player', aDef);
      const dmgStr = dnd.damageSpecToString(dmgSpec);
      const dmgAvg = Math.round(dnd.damageSpecAvg(dmgSpec));
      let tacticalHint = '';
      if (enemy.hp <= dmgAvg) tacticalHint = '<div style="color:#e74c3c;font-size:12px;margin-top:6px">☠ Lethal</div>';
      else if (enemy.hp <= dmgAvg * 2) tacticalHint = '<div style="color:#e67e22;font-size:12px;margin-top:6px">⚠ 2-hit kill</div>';
      atkPredData = { pct, pctColor, aName, dmgStr, dmgAvg, tacticalHint };
    }

    const statsHtml = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        ${['str','dex','con','int','wis','cha'].map(k=>`<div style="text-align:center;min-width:32px"><div style="color:#c9a84c;font-size:10px;letter-spacing:1px">${k.toUpperCase()}</div><div style="font-size:14px">${enemy.stats[k]}</div><div style="color:#7fc8f8;font-size:10px">${this._mod(enemy.stats[k])}</div></div>`).join('')}
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:${hpColor};font-size:13px;font-weight:bold">HP ${enemy.hp}/${enemy.maxHp}</span>
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden"><div style="width:${hpBarW}%;height:100%;background:${hpColor};border-radius:3px"></div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa">
        <span>🛡 AC ${enemy.ac}</span>
        <span>⚔ ${dnd.damageSpecToString(enemy.damageFormula)}</span>
        <span>CR ${enemy.cr}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px">
        <span>👁 sight ${enemy.sight||'?'}</span>
        <span>🏃 spd ${enemy.spd||'?'}</span>
        <span>📐 range ${enemy.atkRange||1}</span>
      </div>
      ${fxHtml}`;
    if (statsEl) statsEl.innerHTML = statsHtml;

    // Position near enemy
    const cam = s.cameras.main;
    const canvas = s.game.canvas;
    const _ew = s.enemyWorldPos(enemy);
    const screenX = (_ew.x - cam.scrollX) * cam.zoom;
    const screenY = (_ew.y - S/2 - cam.scrollY) * cam.zoom;
    const popW = 260, popH = 180;
    let px = Math.min(Math.max(8, screenX - popW / 2), canvas.width - popW - 8);
    let py = screenY - popH - 12;
    if (py < 8) py = screenY + S * cam.zoom + 8;
    pop.style.left = px + 'px';
    pop.style.top = py + 'px';
    pop.style.transform = 'none';
    pop.style.display = 'block';
    s._statPopupEnemy = enemy;

    // Position attack prediction box beside stat popup
    const atkPop = document.getElementById('atk-predict-popup');
    if (atkPop && atkPredData) {
      const d = atkPredData;
      atkPop.innerHTML = `
        <div style="font-size:15px;font-weight:bold;color:#c9a84c;margin-bottom:10px">⚔ ${d.aName}</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:baseline">
          <span style="font-size:18px;line-height:1">🎯</span>
          <span style="font-size:22px;font-weight:bold;color:${d.pctColor};line-height:1">${d.pct}%<span style="font-size:11px;color:#888;font-weight:normal;margin-left:4px">to hit</span></span>
          <span style="font-size:18px;line-height:1">🗡️</span>
          <span style="font-size:22px;font-weight:bold;color:#ddd;line-height:1">${d.dmgStr}<span style="font-size:11px;color:#888;font-weight:normal;margin-left:4px">avg ${d.dmgAvg}</span></span>
        </div>
        ${d.tacticalHint}`;
      // Place to the right of the stat popup, or left if no room
      const popRect = pop.getBoundingClientRect();
      const atkW = 180;
      const canvasW = canvas.width;
      let ax, ay;
      if (popRect.right + atkW + 8 < canvasW) {
        ax = px + pop.offsetWidth + 6;
      } else {
        ax = px - atkW - 6;
      }
      ay = py;
      atkPop.style.left = Math.max(4, ax) + 'px';
      atkPop.style.top = ay + 'px';
      atkPop.style.transform = 'none';
      atkPop.style.display = 'block';
    } else if (atkPop) {
      atkPop.style.display = 'none';
    }
  }

  showDicePopup(rollLine, detailLine, type, diceValues) {
    const s = this.scene;
    const ov = document.getElementById('dice-ov');
    const stage = document.getElementById('dice-stage');
    const rl = document.getElementById('dice-rl');
    const dl = document.getElementById('dice-dl');
    const out = document.getElementById('dice-out');
    const cont = document.getElementById('dice-cont');
    stage.innerHTML = '';
    rl.className = ''; dl.className = ''; out.className = '';
    rl.textContent = ''; dl.textContent = ''; out.textContent = '';
    if (cont) { cont.className = ''; cont.textContent = ''; }
    clearTimeout(s._diceTimer);
    clearTimeout(s._diceAutoTimer);
    ov.classList.add('show');

    const dice = diceValues || [{ sides: 20, value: 1, kind: 'd20' }];

    // Split dice into attack (d20) and damage groups
    const atkDice = dice.filter(d => d.kind === 'd20');
    const dmgDice = dice.filter(d => d.kind !== 'd20');
    const hasBothGroups = atkDice.length > 0 && dmgDice.length > 0;

    // Die face value color per type
    const dieColors = {
      d20: '#f0c060', d12: '#e67e22', d10: '#e74c3c',
      d8: '#9b59b6', d6: '#3498db', d4: '#2ecc71'
    };
    // translateZ half-size for each die
    const dieHalfZ = { d4: 24, d6: 32, d8: 28, d10: 28, d12: 30, d20: 32 };

    const buildDie = (d, type) => {
      const kind = d.kind || ('d' + d.sides);
      const wrap = document.createElement('div'); wrap.className = `die-wrap ${kind} ${type}`;
      const box = document.createElement('div'); box.className = 'die-box';
      box.style.setProperty('--rx', '0deg'); box.style.setProperty('--ry', '0deg');
      const hz = dieHalfZ[kind] || 32;
      const fv = [d.value, 1, Math.ceil(d.sides / 2), Math.ceil(d.sides / 4) * 3, 2, d.sides];
      const faceColor = type === 'crit' ? '#f39c12' : type === 'miss' ? '#e74c3c' : (dieColors[kind] || '#f0c060');
      for (let f = 0; f < 6; f++) {
        const face = document.createElement('div'); face.className = `die-face f${f + 1}`;
        // Override translateZ for non-64px dice
        if (hz !== 32) {
          const transforms = [
            `translateZ(${hz}px)`,
            `rotateY(180deg)translateZ(${hz}px)`,
            `rotateY(90deg)translateZ(${hz}px)`,
            `rotateY(-90deg)translateZ(${hz}px)`,
            `rotateX(90deg)translateZ(${hz}px)`,
            `rotateX(-90deg)translateZ(${hz}px)`
          ];
          face.style.transform = transforms[f];
        }
        if (f === 0) { face.style.color = faceColor; face.style.fontSize = '24px'; }
        else { face.style.color = 'rgba(255,255,255,0.25)'; face.style.fontSize = '14px'; }
        face.textContent = fv[f] > d.sides ? d.sides : fv[f];
        box.appendChild(face);
      }
      wrap.appendChild(box);
      // Type badge below die
      const badge = document.createElement('div'); badge.className = 'die-type-badge';
      badge.textContent = kind; badge.style.color = faceColor;
      wrap.appendChild(badge);
      return { wrap, box };
    };

    let dieIndex = 0;
    const allBoxes = [];

    if (hasBothGroups) {
      // Attack dice group
      const atkGroup = document.createElement('div'); atkGroup.className = 'dice-group-wrap';
      const atkLabel = document.createElement('div'); atkLabel.className = 'dice-label'; atkLabel.textContent = 'ATK';
      atkGroup.appendChild(atkLabel);
      atkDice.forEach(d => { const { wrap, box } = buildDie(d, type); atkGroup.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
      stage.appendChild(atkGroup);

      // Separator
      const sep = document.createElement('div'); sep.className = 'dice-sep';
      stage.appendChild(sep);

      // Damage dice group
      const dmgGroup = document.createElement('div'); dmgGroup.className = 'dice-group-wrap';
      const dmgLabel = document.createElement('div'); dmgLabel.className = 'dice-label'; dmgLabel.textContent = type === 'crit' ? 'DMG ×2' : 'DMG';
      dmgGroup.appendChild(dmgLabel);
      dmgDice.forEach(d => { const { wrap, box } = buildDie(d, type); dmgGroup.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
      stage.appendChild(dmgGroup);
    } else {
      // Single group (miss or single die)
      dice.forEach(d => { const { wrap, box } = buildDie(d, type); stage.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
    }

    // Stagger roll animations
    allBoxes.forEach(({ box, idx }) => {
      setTimeout(() => {
        box.classList.add('rolling');
        box.addEventListener('animationend', () => { box.classList.remove('rolling'); box.classList.add('landing'); }, { once: true });
      }, idx * 120);
    });

    const delay = 700 + dice.length * 120;
    setTimeout(() => { rl.textContent = rollLine; rl.classList.add('show'); }, delay);
    setTimeout(() => { dl.textContent = detailLine; dl.classList.add('show'); }, delay + 100);
    setTimeout(() => {
      const labels = { hit: 'HIT', miss: 'CRITICAL MISS (NAT 1)', crit: 'CRITICAL HIT (NAT 20)' };
      out.textContent = labels[type] || '';
      out.className = 'show ' + type;
    }, delay + 200);

    // Dramatic results (crit/miss) require explicit tap — no auto-dismiss
    const requiresTap = type === 'crit' || type === 'miss';
    setTimeout(() => {
      if (cont) { cont.textContent = 'tap to continue'; cont.className = 'show'; }
    }, delay + 400);
    if (!requiresTap) {
      s._diceAutoTimer = setTimeout(() => {
        if (s.diceWaiting) s._handleDiceDismiss();
      }, delay + 2000);
    }
  }

  showStatus(msg) {
    // Status bar only — no longer writes to combat log.
    // Combat events use CombatLog.logRoll() directly.
    const s = document.getElementById('status-bar');
    if (s) s.textContent = msg;
  }

  updateHUD() {
    const s = this.scene;
    const lightLv = (typeof s.tileLightLevel === 'function')
      ? s.tileLightLevel(s.playerTile.x, s.playerTile.y)
      : 2;
    const lightText = lightLv <= 0 ? 'DARK' : (lightLv === 1 ? 'DIM' : 'BRIGHT');
    const lightColor = lightLv <= 0 ? '#e74c3c' : (lightLv === 1 ? '#f0c060' : '#7fd1a0');
    const veilAlpha = lightLv <= 0 ? 0.12 : (lightLv === 1 ? 0.07 : 0.03);

    if (window.U) {
      U.text('pos-text', `${s.playerTile.x},${s.playerTile.y}`);
      U.text('light-text', lightText);
      const lightEl = U.el('light-text');
      if (lightEl) lightEl.style.color = lightColor;
      const hpBar = U.el('hp-bar');
      if (hpBar) hpBar.style.width = U.pct(s.playerHP, s.playerMaxHP) + '%';
      U.text('hp-text', `${s.playerHP}/${s.playerMaxHP}`);
      const vig = U.el('vignette');
      if (vig) vig.style.background = `rgba(0,0,0,${veilAlpha})`;
      return;
    }
    document.getElementById('pos-text').textContent = `${s.playerTile.x},${s.playerTile.y}`;
    const lightEl = document.getElementById('light-text');
    if (lightEl) {
      lightEl.textContent = lightText;
      lightEl.style.color = lightColor;
    }
    document.getElementById('hp-bar').style.width = (s.playerHP / s.playerMaxHP * 100) + '%';
    document.getElementById('hp-text').textContent = `${s.playerHP}/${s.playerMaxHP}`;
    const vig = document.getElementById('vignette');
    if (vig) vig.style.background = `rgba(0,0,0,${veilAlpha})`;
  }

  updateResBar() {
    withHotbar(hotbar => hotbar.updateResourcePips());
  }

  buildInitBar() {
    const s = this.scene;
    const bar = document.getElementById('init-bar');
    if (!bar) return;
    bar.innerHTML = '';
    bar.classList.add('show');
    s.turnOrder.forEach((t, i) => {
      if (t.id === 'enemy' && (!t.enemy || !t.enemy.alive)) return;
      const div = document.createElement('div');
      div.className = 'ip ' + (t.id === 'player' ? 'pp' : 'ep');
      if (i === s.turnIndex) div.classList.add('active');
      div.innerHTML = `<div class="ip-icon">${t.id === 'player' ? '🧝' : t.enemy.icon}</div><div style="font-size:7px">${t.id === 'player' ? 'YOU' : (t.enemy.displayName||t.enemy.type).slice(0,5).toUpperCase()}</div>`;
      bar.appendChild(div);
    });
  }

  flashBanner(text, type) {
    const s = this.scene;
    const b = document.getElementById('mode-banner'), t = document.getElementById('mode-banner-text');
    if (!b || !t) return;
    t.textContent = text;
    b.className = 'show ' + type;
    s.time.delayedCall(1200, () => { b.className = ''; });
  }

  showASIPanel() {
    const s = this.scene;
    const p = document.getElementById('asi-panel');
    if (p) p.style.display = 'flex';
    const t = document.getElementById('asi-title');
    if (t) t.textContent = `Level ${s.pStats.level} — Ability Score Improvement`;
  }

  updateStatsPanel() {
    const s = this.scene;
    // Update side panel (new system)
    withSidePanel(sidePanel => sidePanel.refresh());
    // Legacy stats panel (kept for compat)
    const panel = document.getElementById('stats-panel');
    if (!panel) return;
    panel.innerHTML = T.statsPanel(s.pStats, s.playerHP, s.playerMaxHP);
    this.updateHUD();
  }
}

window.GameUIController = GameUIController;
