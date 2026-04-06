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
      if (MAP[ny][nx] === TILE.WALL) return 'Wall at ' + nx + ',' + ny;
      s.playerTile = { x: nx, y: ny };
      s.player.setPosition(nx * S + S / 2, ny * S + S / 2);
      s.updateHUD();
      return `Moved to (${nx},${ny})`;
    },
    playerPos: () => `(${s.playerTile.x},${s.playerTile.y}) HP:${s.playerHP}/${s.playerMaxHP}`,
    playerTp: (x, y) => {
      x = Number(x); y = Number(y);
      if (MAP[y][x] === TILE.WALL) return 'Wall';
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
  if (scene && scene.diceWaiting) scene._handleDiceDismiss();
}

// ── STATS PANEL ──────────────────────────────────────
function toggleStats() {
  document.getElementById('stats-panel').classList.toggle('open');
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
