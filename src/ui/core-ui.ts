import { S, MAP, TILE, mapState, dnd, type DamageSpec } from '@/config';
import { T } from './templates';
import { SidePanel } from './side-panel';
import { withHotbar, withSidePanel } from '@/helpers';
import type { GameScene } from '@/game';
import type { StatusInstance } from '@/systems/status-engine';

const STATUS_ICONS: Record<string, string> = {
  burning: '🔥', poisoned: '☠', bleeding: '🩸', restrained: '❄',
  sleep: '💤', blessed: '✨', haste: '⚡', slow: '🐢', hidden: '🌑',
  stunned: '⭐', dodging: '🛡', fleeing: '🏃',
};

// ── DEV CONSOLE ──────────────────────────────────────
let _devVisible = false;
document.addEventListener('keydown', e => {
  if (e.key === '`' || e.key === '~') {
    _devVisible = !_devVisible;
    const dc = document.getElementById('dev-console');
    if (dc) dc.style.display = _devVisible ? 'block' : 'none';
    if (_devVisible) (document.getElementById('dev-input') as HTMLInputElement | null)?.focus();
  }
});
const devInputEl = document.getElementById('dev-input') as HTMLInputElement | null;
devInputEl?.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const input = e.target as HTMLInputElement;
  const cmd = input.value.trim();
  input.value = '';
  devLog('❯ ' + cmd);
  try {
    const result = devExec(cmd);
    if (result !== undefined) devLog(String(result));
  } catch (err) { devLog('ERR: ' + (err as Error).message); }
});

function devLog(msg: string) {
  const log = document.getElementById('dev-log');
  if (!log) return;
  const line = document.createElement('div'); line.textContent = msg;
  log.appendChild(line); log.scrollTop = log.scrollHeight;
}

function devExec(cmd: string): unknown {
  const w = window as unknown as Record<string, unknown>;
  const gameObj = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
  const s = gameObj?.scene?.getScene('GameScene');
  if (!s) return 'No scene';
  const cmds: Record<string, (...args: string[]) => unknown> = {
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
      if (nx < 0 || ny < 0 || nx >= mapState.cols || ny >= mapState.rows) return 'Out of bounds';
      if (s.isWallTile(nx, ny) || MAP[ny]?.[nx] === TILE.WALL) return 'Wall at ' + nx + ',' + ny;
      s.playerTile = { x: nx, y: ny };
      s.player.setPosition(nx * S + S / 2, ny * S + S / 2);
      s.updateHUD();
      return `Moved to (${nx},${ny})`;
    },
    playerPos: () => `(${s.playerTile.x},${s.playerTile.y}) HP:${s.playerHP}/${s.playerMaxHP}`,
    playerTp: (x, y) => {
      const nx = Number(x), ny = Number(y);
      if (s.isWallTile(nx, ny) || MAP[ny]?.[nx] === TILE.WALL) return 'Wall';
      s.playerTile = { x: nx, y: ny }; s.player.setPosition(nx * S + S / 2, ny * S + S / 2); s.updateHUD();
      return `Teleported to (${nx},${ny})`;
    },
    enemyList: () => {
      const enemies = (s as unknown as Record<string, unknown>).enemies as Array<Record<string, unknown>>;
      enemies?.forEach((e, i) => devLog(`[${i}] ${e.displayName || e.type} (${e.tx},${e.ty}) HP:${e.hp}/${e.maxHp} alive:${e.alive}`));
      return (enemies?.length || 0) + ' enemies';
    },
    enemyKill: (i) => {
      const enemies = (s as unknown as Record<string, unknown>).enemies as Array<Record<string, unknown>>;
      const e = enemies?.[Number(i)]; if (!e) return 'No enemy ' + i;
      e.hp = 0; e.alive = false;
      ([e.img, e.hpBg, e.hpFg, e.lbl, e.sightRing, e.fa] as Array<{ setAlpha(a: number): void } | null>)
        .forEach(o => { try { if (o) o.setAlpha(0); } catch (_) {} });
      return `Killed ${e.type}`;
    },
    giveXP: (n) => {
      const p = s.pStats as Record<string, unknown>;
      p.xp = Number(p.xp) + Number(n);
      (s as unknown as { checkLevelUp(): void }).checkLevelUp();
      return `XP: ${p.xp}`;
    },
    godMode: () => { s.playerHP = 9999; s.playerMaxHP = 9999; s.updateHUD(); return 'God mode ON'; },
    combat: () => {
      const ss = s as unknown as Record<string, unknown>;
      return `mode:${s.mode} turnIdx:${ss.turnIndex} order:${(ss.turnOrder as Array<Record<string, unknown>>)?.map(t => t.id === 'player' ? 'P' : ((t.enemy as Record<string, unknown>).displayName || (t.enemy as Record<string, unknown>).type)).join(',')} moves:${ss.playerMoves} ap:${ss.playerAP}`;
    },
  };
  const m = cmd.match(/^(\w+)\s*\(?([^)]*)\)?/);
  if (!m) return undefined;
  const fn = cmds[m[1]];
  if (!fn) return undefined;
  const args = m[2] ? m[2].split(',').map(a => a.trim().replace(/['"]/g, '')) : [];
  return fn(...args);
}

// ── GLOBAL ERROR HANDLER ─────────────────────────────
window.onerror = function (msg, _src, line, _col, _err) {
  const s = document.getElementById('status-bar');
  if (s) s.textContent = 'ERROR: ' + msg + ' L' + line;
  return false;
};

// ── DICE CLICK ───────────────────────────────────────
function handleDiceClick() {
  const w = window as unknown as Record<string, unknown>;
  const gameObj = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
  const scene = gameObj?.scene?.getScene('GameScene');
  if (!scene) return;
  const ss = scene as unknown as Record<string, unknown>;
  if (ss.diceWaiting) {
    (scene as unknown as { _handleDiceDismiss(): void })._handleDiceDismiss();
  } else {
    const ov = document.getElementById('dice-ov');
    if (ov) ov.classList.remove('show');
  }
}

// ── STATS PANEL ──────────────────────────────────────
function toggleStats() {
  if (withSidePanel(sidePanel => (sidePanel as typeof SidePanel).toggleCollapse()) !== undefined) {
    return;
  }
  document.getElementById('stats-panel')?.classList.toggle('open');
}

function toggleEnemySight() {
  const w = window as unknown as Record<string, unknown>;
  const gameObj = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
  const scene = gameObj?.scene?.getScene('GameScene');
  if (!scene) return;
  const ss = scene as unknown as { toggleEnemySight?(): boolean };
  if (typeof ss.toggleEnemySight !== 'function') return;
  const enabled = ss.toggleEnemySight();
  const btn = document.getElementById('sight-btn');
  if (!btn) return;
  btn.textContent = enabled ? '👁 SIGHT ON' : '👁 SIGHT OFF';
  btn.classList.toggle('off', !enabled);
}

document.addEventListener('click', e => {
  const p = document.getElementById('stats-panel'), b = document.getElementById('stats-btn');
  if (p?.classList.contains('open') && !p.contains(e.target as Node) && e.target !== b) {
    p.classList.remove('open');
  }
});

// ── ASI PANEL ────────────────────────────────────────
let _asiSel: string[] = [];
function selectASI(stat: string) {
  const btn = document.getElementById('asi-' + stat);
  const idx = _asiSel.indexOf(stat);
  if (idx >= 0) {
    _asiSel.splice(idx, 1);
    if (btn) { btn.style.background = 'rgba(192,150,50,0.1)'; btn.style.borderColor = 'rgba(192,150,50,0.3)'; }
  } else {
    if (_asiSel.length >= 2) return;
    _asiSel.push(stat);
    if (btn) { btn.style.background = 'rgba(240,192,96,0.25)'; btn.style.borderColor = 'rgba(240,192,96,0.7)'; }
  }
  const lbl = document.getElementById('asi-sel-lbl'), conf = document.getElementById('asi-confirm') as HTMLButtonElement | null;
  if (_asiSel.length === 2) {
    if (lbl) lbl.textContent = `+1 ${_asiSel[0].toUpperCase()}, +1 ${_asiSel[1].toUpperCase()}`;
    if (conf) { conf.disabled = false; conf.style.opacity = '1'; }
  } else {
    if (lbl) lbl.textContent = _asiSel.length ? `+1 ${_asiSel[0].toUpperCase()} — select one more` : 'Select 2 stats';
    if (conf) { conf.disabled = true; conf.style.opacity = '0.4'; }
  }
}

function confirmASI() {
  if (_asiSel.length !== 2) return;
  const w = window as unknown as Record<string, unknown>;
  const gameObj = w.game as { scene?: { getScene(k: string): GameScene | null } } | undefined;
  const s = gameObj?.scene?.getScene('GameScene');
  if (s) (s as unknown as { applyASI(a: string, b: string): void }).applyASI(_asiSel[0], _asiSel[1]);
  _asiSel = [];
  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(stat => {
    const b = document.getElementById('asi-' + stat);
    if (b) { b.style.background = 'rgba(192,150,50,0.1)'; b.style.borderColor = 'rgba(192,150,50,0.3)'; }
  });
}

export class GameUIController {
  scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  _mod(score: unknown): string {
    const v = Math.floor((Number(score || 10) - 10) / 2);
    return (v >= 0 ? '+' : '') + v;
  }

  dismissEnemyPopup() {
    const pop = document.getElementById('enemy-stat-popup');
    if (pop) pop.style.display = 'none';
    const atkPop = document.getElementById('atk-predict-popup');
    if (atkPop) atkPop.style.display = 'none';
    (this.scene as unknown as Record<string, unknown>)._statPopupEnemy = null;
  }

  showCombatEnemyPopup(enemy: unknown) {
    this._showEnemyInfoPopup(enemy, true);
  }

  showEnemyStatPopup(enemy: unknown) {
    this._showEnemyInfoPopup(enemy, false);
  }

  _showEnemyInfoPopup(enemy: unknown, inCombat: boolean) {
    const s = this.scene;
    const ss = s as unknown as Record<string, unknown>;
    const e = enemy as Record<string, unknown>;
    const pop = document.getElementById('enemy-stat-popup');
    if (!pop) return;

    if (ss._statPopupEnemy === enemy && pop.style.display !== 'none') {
      pop.style.display = 'none';
      const atkPop = document.getElementById('atk-predict-popup');
      if (atkPop) atkPop.style.display = 'none';
      ss._statPopupEnemy = null;
      return;
    }

    const nameEl = document.getElementById('esp-name');
    const statsEl = document.getElementById('esp-stats');
    if (nameEl) nameEl.textContent = `${e.icon} ${e.displayName || String(e.type || '').toUpperCase()}`;

    const hpPct = Number(e.hp) / Number(e.maxHp);
    const hpColor = hpPct <= 0.25 ? '#e74c3c' : hpPct <= 0.5 ? '#e67e22' : '#a5d6a7';
    const hpBarW = Math.max(0, Math.round(hpPct * 100));

    const fx = (Array.isArray(e.effects) ? e.effects as Array<Record<string, unknown>> : []).filter(ef => ef && ef.id);
    const fxHtml = fx.length
      ? `<div style="margin-top:6px;font-size:11px;color:#ce93d8">Effects: ${fx.map(ef => ef.id).join(', ')}</div>`
      : '';

    let atkPredData: Record<string, unknown> | null = null;
    if ((ss.calcHitChance) && (ss._resolveAbilityDamageSpec)) {
      let abilityId = (inCombat && ss._pendingAtkAbilityId) || 'attack';
      const hotbar = (window as unknown as Record<string, unknown>).Hotbar as { getEffectiveDefaultAttack?(): string } | undefined;
      if (!ss._pendingAtkAbilityId && hotbar?.getEffectiveDefaultAttack) {
        abilityId = hotbar.getEffectiveDefaultAttack();
      }
      const pct = (ss.calcHitChance as (e: unknown, id: unknown) => number)(enemy, abilityId);
      const pctColor = pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f0c060' : '#e74c3c';
      const aDef = (ss.getAbilityDef as (id: unknown) => Record<string, unknown> | null)?.(abilityId);
      const aName = aDef?.name || 'Attack';
      const dmgSpec = (ss._resolveAbilityDamageSpec as (who: string, def: unknown) => DamageSpec)('player', aDef);
      const dmgStr = dnd.damageSpecToString(dmgSpec);
      const dmgAvg = Math.round(dnd.damageSpecAvg(dmgSpec));
      let tacticalHint = '';
      if (Number(e.hp) <= dmgAvg) tacticalHint = '<div style="color:#e74c3c;font-size:12px;margin-top:6px">☠ Lethal</div>';
      else if (Number(e.hp) <= dmgAvg * 2) tacticalHint = '<div style="color:#e67e22;font-size:12px;margin-top:6px">⚠ 2-hit kill</div>';
      atkPredData = { pct, pctColor, aName, dmgStr, dmgAvg, tacticalHint };
    }

    const statsHtml = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        ${['str','dex','con','int','wis','cha'].map(k => {
          const stats = e.stats as Record<string, unknown>;
          return `<div style="text-align:center;min-width:32px"><div style="color:#c9a84c;font-size:10px;letter-spacing:1px">${k.toUpperCase()}</div><div style="font-size:14px">${stats[k]}</div><div style="color:#7fc8f8;font-size:10px">${this._mod(stats[k])}</div></div>`;
        }).join('')}
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:${hpColor};font-size:13px;font-weight:bold">HP ${e.hp}/${e.maxHp}</span>
          <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden"><div style="width:${hpBarW}%;height:100%;background:${hpColor};border-radius:3px"></div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa">
        <span>🛡 AC ${e.ac}</span>
        <span>⚔ ${dnd.damageSpecToString(e.damageFormula as DamageSpec)}</span>
        <span>CR ${e.cr}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:4px">
        <span>👁 sight ${e.sight || '?'}</span>
        <span>🏃 spd ${e.spd || '?'}</span>
        <span>📐 range ${e.atkRange || 1}</span>
      </div>
      ${fxHtml}`;
    if (statsEl) statsEl.innerHTML = statsHtml;

    const cam = s.cameras.main;
    const canvas = s.game.canvas;
    const _ew = (ss.enemyWorldPos as (e: unknown) => { x: number; y: number })(enemy);
    const screenX = (_ew.x - cam.scrollX) * cam.zoom;
    const screenY = (_ew.y - S / 2 - cam.scrollY) * cam.zoom;
    const popW = 260, popH = 180;
    let px = Math.min(Math.max(8, screenX - popW / 2), canvas.width - popW - 8);
    let py = screenY - popH - 12;
    if (py < 8) py = screenY + S * cam.zoom + 8;
    pop.style.left = px + 'px';
    pop.style.top = py + 'px';
    pop.style.transform = 'none';
    pop.style.display = 'block';
    ss._statPopupEnemy = enemy;

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
      const popRect = pop.getBoundingClientRect();
      const atkW = 180;
      const canvasW = canvas.width;
      let ax: number, ay: number;
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

  showDicePopup(rollLine: string, detailLine: string, type: string, diceValues?: Array<{ sides: number; value: number; kind: string }>) {
    const s = this.scene;
    const ss = s as unknown as Record<string, unknown>;
    const ov = document.getElementById('dice-ov');
    const stage = document.getElementById('dice-stage');
    const rl = document.getElementById('dice-rl');
    const dl = document.getElementById('dice-dl');
    const out = document.getElementById('dice-out');
    const cont = document.getElementById('dice-cont');
    if (!ov || !stage || !rl || !dl || !out) return;
    stage.innerHTML = '';
    rl.className = ''; dl.className = ''; out.className = '';
    rl.textContent = ''; dl.textContent = ''; out.textContent = '';
    if (cont) { cont.className = ''; cont.textContent = ''; }
    clearTimeout(ss._diceTimer as ReturnType<typeof setTimeout>);
    clearTimeout(ss._diceAutoTimer as ReturnType<typeof setTimeout>);
    ov.classList.add('show');

    const dice = diceValues || [{ sides: 20, value: 1, kind: 'd20' }];

    const atkDice = dice.filter(d => d.kind === 'd20');
    const dmgDice = dice.filter(d => d.kind !== 'd20');
    const hasBothGroups = atkDice.length > 0 && dmgDice.length > 0;

    const dieColors: Record<string, string> = {
      d20: '#f0c060', d12: '#e67e22', d10: '#e74c3c',
      d8: '#9b59b6', d6: '#3498db', d4: '#2ecc71',
    };
    const dieHalfZ: Record<string, number> = { d4: 24, d6: 32, d8: 28, d10: 28, d12: 30, d20: 32 };

    const buildDie = (d: { sides: number; value: number; kind: string }, dieType: string) => {
      const kind = d.kind || ('d' + d.sides);
      const wrap = document.createElement('div'); wrap.className = `die-wrap ${kind} ${dieType}`;
      const box = document.createElement('div'); box.className = 'die-box';
      box.style.setProperty('--rx', '0deg'); box.style.setProperty('--ry', '0deg');
      const hz = dieHalfZ[kind] || 32;
      const fv = [d.value, 1, Math.ceil(d.sides / 2), Math.ceil(d.sides / 4) * 3, 2, d.sides];
      const faceColor = dieType === 'crit' ? '#f39c12' : dieType === 'miss' ? '#e74c3c' : (dieColors[kind] || '#f0c060');
      for (let f = 0; f < 6; f++) {
        const face = document.createElement('div'); face.className = `die-face f${f + 1}`;
        if (hz !== 32) {
          const transforms = [
            `translateZ(${hz}px)`,
            `rotateY(180deg)translateZ(${hz}px)`,
            `rotateY(90deg)translateZ(${hz}px)`,
            `rotateY(-90deg)translateZ(${hz}px)`,
            `rotateX(90deg)translateZ(${hz}px)`,
            `rotateX(-90deg)translateZ(${hz}px)`,
          ];
          face.style.transform = transforms[f];
        }
        if (f === 0) { face.style.color = faceColor; face.style.fontSize = '24px'; }
        else { face.style.color = 'rgba(255,255,255,0.25)'; face.style.fontSize = '14px'; }
        face.textContent = String(fv[f] > d.sides ? d.sides : fv[f]);
        box.appendChild(face);
      }
      wrap.appendChild(box);
      const badge = document.createElement('div'); badge.className = 'die-type-badge';
      badge.textContent = kind; badge.style.color = faceColor;
      wrap.appendChild(badge);
      return { wrap, box };
    };

    let dieIndex = 0;
    const allBoxes: Array<{ box: HTMLElement; idx: number }> = [];

    if (hasBothGroups) {
      const atkGroup = document.createElement('div'); atkGroup.className = 'dice-group-wrap';
      const atkLabel = document.createElement('div'); atkLabel.className = 'dice-label'; atkLabel.textContent = 'ATK';
      atkGroup.appendChild(atkLabel);
      atkDice.forEach(d => { const { wrap, box } = buildDie(d, type); atkGroup.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
      stage.appendChild(atkGroup);

      const sep = document.createElement('div'); sep.className = 'dice-sep';
      stage.appendChild(sep);

      const dmgGroup = document.createElement('div'); dmgGroup.className = 'dice-group-wrap';
      const dmgLabel = document.createElement('div'); dmgLabel.className = 'dice-label'; dmgLabel.textContent = type === 'crit' ? 'DMG ×2' : 'DMG';
      dmgGroup.appendChild(dmgLabel);
      dmgDice.forEach(d => { const { wrap, box } = buildDie(d, type); dmgGroup.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
      stage.appendChild(dmgGroup);
    } else {
      dice.forEach(d => { const { wrap, box } = buildDie(d, type); stage.appendChild(wrap); allBoxes.push({ box, idx: dieIndex++ }); });
    }

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
      const labels: Record<string, string> = { hit: 'HIT', miss: 'CRITICAL MISS (NAT 1)', crit: 'CRITICAL HIT (NAT 20)' };
      out.textContent = labels[type] || '';
      out.className = 'show ' + type;
    }, delay + 200);

    const requiresTap = type === 'crit' || type === 'miss';
    setTimeout(() => {
      if (cont) { cont.textContent = 'tap to continue'; cont.className = 'show'; }
    }, delay + 400);
    if (!requiresTap) {
      ss._diceAutoTimer = setTimeout(() => {
        if (ss.diceWaiting) (s as unknown as { _handleDiceDismiss(): void })._handleDiceDismiss();
      }, delay + 2000);
    }
  }

  showStatus(msg: string) {
    const s = document.getElementById('status-bar');
    if (s) s.textContent = msg;
  }

  updateHUD() {
    const s = this.scene;
    const ss = s as unknown as Record<string, unknown>;
    const lightLv = typeof ss.tileLightLevel === 'function'
      ? (ss.tileLightLevel as (x: number, y: number) => number)(s.playerTile.x, s.playerTile.y)
      : 2;
    const lightText = lightLv <= 0 ? 'DARK' : (lightLv === 1 ? 'DIM' : 'BRIGHT');
    const lightColor = lightLv <= 0 ? '#e74c3c' : (lightLv === 1 ? '#f0c060' : '#7fd1a0');
    const veilAlpha = lightLv <= 0 ? 0.12 : (lightLv === 1 ? 0.07 : 0.03);

    const U = (window as unknown as Record<string, unknown>).U as Record<string, unknown> | undefined;
    if (U) {
      (U.text as (id: string, v: string) => void)('pos-text', `${s.playerTile.x},${s.playerTile.y}`);
      (U.text as (id: string, v: string) => void)('light-text', lightText);
      const lightEl = (U.el as (id: string) => HTMLElement | null)('light-text');
      if (lightEl) lightEl.style.color = lightColor;
      const hpBar = (U.el as (id: string) => HTMLElement | null)('hp-bar');
      if (hpBar) hpBar.style.width = (U.pct as (a: number, b: number) => number)(s.playerHP, s.playerMaxHP) + '%';
      (U.text as (id: string, v: string) => void)('hp-text', `${s.playerHP}/${s.playerMaxHP}`);
      const vig = (U.el as (id: string) => HTMLElement | null)('vignette');
      if (vig) vig.style.background = `rgba(0,0,0,${veilAlpha})`;
      return;
    }
    const posEl = document.getElementById('pos-text');
    if (posEl) posEl.textContent = `${s.playerTile.x},${s.playerTile.y}`;
    const lightEl = document.getElementById('light-text');
    if (lightEl) { lightEl.textContent = lightText; lightEl.style.color = lightColor; }
    const hpBar = document.getElementById('hp-bar');
    if (hpBar) hpBar.style.width = (s.playerHP / s.playerMaxHP * 100) + '%';
    const hpText = document.getElementById('hp-text');
    if (hpText) hpText.textContent = `${s.playerHP}/${s.playerMaxHP}`;
    const vig = document.getElementById('vignette');
    if (vig) vig.style.background = `rgba(0,0,0,${veilAlpha})`;
    const floorEl = document.getElementById('floor-text');
    if (floorEl) {
      const meta = (window as unknown as { _MAP_META?: { floor?: string; name?: string } })._MAP_META;
      floorEl.textContent = meta?.floor || meta?.name || '';
    }
    this._updateStatusIcons();
  }

  _updateStatusIcons() {
    const el = document.getElementById('status-icons');
    if (!el) return;
    const effects = (this.scene.playerEffects || []) as StatusInstance[];
    if (!effects.length) { el.innerHTML = ''; return; }
    el.innerHTML = effects.map((fx) => {
      const icon = STATUS_ICONS[fx.id] || '◆';
      const dur = fx.remaining > 0 ? `<span class="si-dur">${fx.remaining}</span>` : '';
      const stacks = fx.stacks > 1 ? `<span class="si-dur">×${fx.stacks}</span>` : '';
      return `<span class="si si-${fx.id}" title="${fx.id}"><span class="si-icon">${icon}</span>${dur}${stacks}</span>`;
    }).join('');
  }

  updateResBar() {
    withHotbar(hotbar => (hotbar as { updateResourcePips(): void }).updateResourcePips());
  }

  buildInitBar() {
    const s = this.scene;
    const ss = s as unknown as Record<string, unknown>;
    const bar = document.getElementById('init-bar');
    if (!bar) return;
    bar.innerHTML = '';
    bar.classList.add('show');
    (ss.turnOrder as Array<Record<string, unknown>>)?.forEach((t, i) => {
      if (t.id === 'enemy' && (!(t.enemy as Record<string, unknown>)?.alive)) return;
      const div = document.createElement('div');
      div.className = 'ip ' + (t.id === 'player' ? 'pp' : 'ep');
      if (i === (ss.turnIndex as number)) div.classList.add('active');
      const e = t.enemy as Record<string, unknown>;
      div.innerHTML = `<div class="ip-icon">${t.id === 'player' ? '🧝' : e?.icon}</div><div style="font-size:7px">${t.id === 'player' ? 'YOU' : String(e?.displayName || e?.type || '').slice(0, 5).toUpperCase()}</div>`;
      bar.appendChild(div);
    });
  }

  flashBanner(text: string, type: string) {
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
    if (t) t.textContent = `Level ${(s.pStats as Record<string, unknown>).level} — Ability Score Improvement`;
  }

  updateStatsPanel() {
    const s = this.scene;
    withSidePanel(sidePanel => (sidePanel as typeof SidePanel).refresh());
    const panel = document.getElementById('stats-panel');
    if (!panel) return;
    panel.innerHTML = T.statsPanel(s.pStats as Record<string, unknown>, s.playerHP, s.playerMaxHP);
    this.updateHUD();
  }
}

(window as unknown as Record<string, unknown>).GameUIController = GameUIController;
(window as unknown as Record<string, unknown>).handleDiceClick = handleDiceClick;
(window as unknown as Record<string, unknown>).toggleStats = toggleStats;
(window as unknown as Record<string, unknown>).toggleEnemySight = toggleEnemySight;
(window as unknown as Record<string, unknown>).selectASI = selectASI;
(window as unknown as Record<string, unknown>).confirmASI = confirmASI;
