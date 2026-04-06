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
      s.enemies.forEach((e, i) => devLog(`[${i}] ${e.type} (${e.tx},${e.ty}) HP:${e.hp}/${e.maxHp} alive:${e.alive}`));
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
    combat: () => `mode:${s.mode} turnIdx:${s.turnIndex} order:${s.turnOrder.map(t => t.id === 'player' ? 'P' : t.enemy.type).join(',')} moves:${s.playerMoves} ap:${s.playerAP}`,
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

function toggleExploreTurnBased() {
  const scene = game && game.scene && game.scene.getScene('GameScene');
  if (!scene || typeof scene.toggleExploreTurnBased !== 'function') return;
  const mode = scene.toggleExploreTurnBased();
  const btn = document.getElementById('tb-btn');
  if (!btn) return;
  const on = mode === MODE.EXPLORE_TB;
  btn.textContent = on ? '⏱ TB ON' : '⏱ TB OFF';
  btn.classList.toggle('off', !on);
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

  showCombatEnemyPopup(enemy) {
    const s = this.scene;
    const pop = document.getElementById('enemy-stat-popup');
    if (!pop) return;
    const dx = Math.abs(s.playerTile.x - enemy.tx), dy = Math.abs(s.playerTile.y - enemy.ty);
    const isAdj = dx <= 1 && dy <= 1;
    const hasAP = s.playerAP > 0;
    const hasMoves = s.playerMoves > 0;

    if (window.U) U.text('esp-name', `${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`);
    else document.getElementById('esp-name').textContent = `${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`;

    const statsHtml = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${['str','dex','con','int','wis','cha'].map(k=>`<div style="text-align:center"><div style="color:#c9a84c;font-size:9px">${k.toUpperCase()}</div><div>${enemy.stats[k]}</div><div style="color:#7fc8f8;font-size:9px">${this._mod(enemy.stats[k])}</div></div>`).join('')}
      </div>
      <div style="color:#aaa;font-size:10px">AC ${enemy.ac} · HP ${enemy.hp}/${enemy.maxHp}</div>
      <div style="color:#e74c3c;font-size:10px;margin-top:2px">ATK ${dnd.damageSpecToString(enemy.damageFormula)} · d20${this._mod(enemy.stats.str)}</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        ${hasAP&&isAdj?`<div onclick="window._combatAct&&window._combatAct('attack')" style="flex:1;text-align:center;background:rgba(231,76,60,0.25);border:1px solid rgba(231,76,60,0.6);color:#e74c3c;padding:5px 6px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">⚔ Attack</div>`:''}
        ${hasAP&&!isAdj&&hasMoves?`<div onclick="window._combatAct&&window._combatAct('moveattack')" style="flex:1;text-align:center;background:rgba(243,156,18,0.2);border:1px solid rgba(243,156,18,0.5);color:#f39c12;padding:5px 6px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">🏃 Move & Attack</div>`:''}
        ${!hasAP?`<div style="flex:1;text-align:center;color:#546e7a;padding:5px 6px;font-size:10px">No action left</div>`:''}
        <div onclick="window._combatAct&&window._combatAct('cancel')" style="text-align:center;background:rgba(52,73,94,0.5);border:1px solid #333;color:#aaa;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">✕</div>
      </div>`;
    if (window.U) U.html('esp-stats', statsHtml);
    else document.getElementById('esp-stats').innerHTML = statsHtml;

    pop.style.display = 'block';
    pop.style.left = '50%';
    pop.style.top = '50%';
    pop.style.transform = 'translate(-50%,-50%)';

    window._combatAct = (action) => {
      pop.style.display = 'none';
      window._combatAct = null;
      if (action === 'attack') s.playerAttackEnemy(enemy);
      else if (action === 'moveattack') s.tryMoveAndAttack(enemy);
    };
  }

  showEnemyStatPopup(enemy) {
    const s = this.scene;
    const pop = document.getElementById('enemy-stat-popup');
    if (!pop) return;

    if (window.U) U.text('esp-name', `${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`);
    else document.getElementById('esp-name').textContent = `${enemy.icon} ${enemy.type.toUpperCase()} (CR ${enemy.cr})`;

    const statsHtml = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${['str','dex','con','int','wis','cha'].map(k=>`<div style="text-align:center"><div style="color:#c9a84c;font-size:9px">${k.toUpperCase()}</div><div>${enemy.stats[k]}</div><div style="color:#7fc8f8;font-size:9px">${this._mod(enemy.stats[k])}</div></div>`).join('')}
      </div>
      <div style="color:#aaa;font-size:10px">AC ${enemy.ac} · HP ${enemy.hp}/${enemy.maxHp} · CR ${enemy.cr}</div>
      <div style="color:#e74c3c;font-size:10px;margin-top:3px">ATK: 1d20+${this._mod(enemy.stats.str)} · DMG: ${dnd.damageSpecToString(enemy.damageFormula)}</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <div onclick="window._engageEnemy&&window._engageEnemy()" style="flex:1;text-align:center;background:rgba(231,76,60,0.2);border:1px solid rgba(231,76,60,0.5);color:#e74c3c;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:10px;letter-spacing:2px;pointer-events:all">⚔ ENGAGE</div>
        <div onclick="window._dismissEnemyPopup&&window._dismissEnemyPopup()" style="text-align:center;background:rgba(52,73,94,0.5);border:1px solid #333;color:#aaa;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;pointer-events:all">✕</div>
      </div>`;
    if (window.U) U.html('esp-stats', statsHtml);
    else document.getElementById('esp-stats').innerHTML = statsHtml;

    // Position popup near the enemy on screen
    const cam = s.cameras.main;
    const canvas = s.game.canvas;
    const screenX = (enemy.tx * S + S / 2 - cam.scrollX) * cam.zoom;
    const screenY = (enemy.ty * S - cam.scrollY) * cam.zoom;
    const popW = 200, popH = 180;
    // Clamp to stay within canvas bounds
    let px = Math.min(Math.max(8, screenX - popW / 2), canvas.width - popW - 8);
    let py = screenY - popH - 12; // prefer above enemy
    if (py < 8) py = screenY + S * cam.zoom + 8; // flip below if no room
    pop.style.left = px + 'px';
    pop.style.top = py + 'px';
    pop.style.transform = 'none';
    pop.style.display = 'block';

    s._statPopupEnemy = enemy;
    window._engageEnemy = () => {
      const p = document.getElementById('enemy-stat-popup');
      if (p) p.style.display = 'none';
      s._statPopupEnemy = null;
      window._engageEnemy = null;
      window._dismissEnemyPopup = null;
      s.tweens.killTweensOf(s.player);
      s.movePath = [];
      s.isMoving = false;
      s.clearPathDots();
      s.onArrival = null;
      if (typeof s.tryEngageEnemyFromExplore === 'function') {
        s.tryEngageEnemyFromExplore(enemy);
      } else {
        s.enterCombat([enemy]);
      }
    };
    window._dismissEnemyPopup = () => {
      const p = document.getElementById('enemy-stat-popup');
      if (p) p.style.display = 'none';
      s._statPopupEnemy = null;
      window._engageEnemy = null;
      window._dismissEnemyPopup = null;
    };
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
      const dmgLabel = document.createElement('div'); dmgLabel.className = 'dice-label'; dmgLabel.textContent = 'DMG';
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
      const labels = { hit: 'HIT', miss: 'MISS', crit: 'CRITICAL HIT (NAT 20)' };
      out.textContent = labels[type] || '';
      out.className = 'show ' + type;
    }, delay + 200);

    // Auto-advance after delay (tap still skips immediately)
    const autoDelay = delay + 2000;
    setTimeout(() => {
      if (cont) { cont.textContent = 'tap to skip'; cont.className = 'show'; }
    }, delay + 400);
    s._diceAutoTimer = setTimeout(() => {
      if (s.diceWaiting) s._handleDiceDismiss();
    }, autoDelay);
  }

  showStatus(msg) {
    if (window.U) U.text('status-bar', msg);
    else {
      const s = document.getElementById('status-bar');
      if (s) s.textContent = msg;
    }
  }

  updateHUD() {
    const s = this.scene;
    if (window.U) {
      U.text('pos-text', `${s.playerTile.x},${s.playerTile.y}`);
      const hpBar = U.el('hp-bar');
      if (hpBar) hpBar.style.width = U.pct(s.playerHP, s.playerMaxHP) + '%';
      U.text('hp-text', `${s.playerHP}/${s.playerMaxHP}`);
      return;
    }
    document.getElementById('pos-text').textContent = `${s.playerTile.x},${s.playerTile.y}`;
    document.getElementById('hp-bar').style.width = (s.playerHP / s.playerMaxHP * 100) + '%';
    document.getElementById('hp-text').textContent = `${s.playerHP}/${s.playerMaxHP}`;
  }

  updateResBar() {
    const s = this.scene;
    const mv = document.getElementById('mv-val'), ac = document.getElementById('ac-val');
    if (mv) { mv.textContent = s.playerMoves || 0; mv.className = 'res-val ' + (s.playerMoves > 0 ? 'ok' : 'spent'); }
    if (ac) { ac.textContent = s.playerAP > 0 ? 'ACTION' : 'USED'; ac.className = 'res-val ' + (s.playerAP > 0 ? 'aok' : 'aused'); }
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
      div.innerHTML = `<div class="ip-icon">${t.id === 'player' ? '🧝' : t.enemy.icon}</div><div style="font-size:7px">${t.id === 'player' ? 'YOU' : t.enemy.type.slice(0,3).toUpperCase()}</div>`;
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
    const panel = document.getElementById('stats-panel');
    if (!panel) return;
    panel.innerHTML = T.statsPanel(s.pStats, s.playerHP, s.playerMaxHP);
    this.updateHUD();
  }
}

window.GameUIController = GameUIController;
