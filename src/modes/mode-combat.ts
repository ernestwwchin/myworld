import { S, MODE, COMBAT_RULES, WEAPON_DEFS, dnd, mapState } from '@/config';
import { bfs, hasLOS, inFOV, roomIdAt, withHotbar, withCombatLog, _getRoomTopology } from '@/helpers';
import { tileDist, pathTileCost } from '@/systems/world-position-system';
import { assignCreatureNames } from '@/systems/encounter-placement';
import type { GameScene } from '@/game';

type Enemy = {
  id?: string;
  alive: boolean;
  tx: number; ty: number;
  img?: Phaser.GameObjects.Image | null;
  hpBg?: Phaser.GameObjects.Rectangle | null;
  hpFg?: Phaser.GameObjects.Rectangle | null;
  lbl?: Phaser.GameObjects.Text | null;
  sightRing?: Phaser.GameObjects.Arc | null;
  fa?: { setAlpha: (a: number) => void } | null;
  dot?: Phaser.GameObjects.Image | null;
  sprite?: Phaser.GameObjects.Image | null;
  healthBar?: Phaser.GameObjects.Rectangle | null;
  hitLbl?: Phaser.GameObjects.Text | null;
  displayName: string;
  name?: string;
  type?: string;
  stats: { str: number; dex: number };
  spd: number;
  ac: number;
  hp: number;
  maxHp: number;
  xp?: number;
  group?: string;
  weaponId?: string;
  facing?: number;
  inCombat?: boolean;
  lastSeenPlayerTile: { x: number; y: number };
  searchTurnsRemaining: number;
};

type PStats = {
  str: number; dex: number; ac: number;
  atkRange?: number;
  profBonus: number;
  weaponId?: string;
  xp: number;
};

type InitEntry = {
  id: string;
  roll: number;
  mod: number;
  init: number;
  surprised: boolean;
  enemy?: Enemy;
};

export const ModeCombatMixin = {
  rollInitiativeOrder(
    this: GameScene,
    combatGroup: Enemy[],
    surprisedEnemies: Set<Enemy> = new Set(),
  ): InitEntry[] {
    const ps = this.pStats as PStats;
    const playerDexMod = dnd.mod(ps?.dex || 10);
    const playerRoll = dnd.roll(1, 20);
    const entries: InitEntry[] = [{
      id: 'player',
      roll: playerRoll,
      mod: playerDexMod,
      init: playerRoll + playerDexMod,
      surprised: false,
    }];

    for (const e of combatGroup) {
      const dexMod = dnd.mod(e?.stats?.dex || 10);
      const roll = dnd.roll(1, 20);
      entries.push({ id: 'enemy', enemy: e, roll, mod: dexMod, init: roll + dexMod, surprised: surprisedEnemies.has(e) });
    }

    entries.sort((a, b) => {
      if (b.init !== a.init) return b.init - a.init;
      if (b.mod !== a.mod) return b.mod - a.mod;
      if (a.id === 'player' && b.id !== 'player') return -1;
      if (b.id === 'player' && a.id !== 'player') return 1;
      return Math.random() - 0.5;
    });

    return entries;
  },

  findApproachPathToEnemy(
    this: GameScene,
    enemy: Enemy,
    maxSteps: number = Number.POSITIVE_INFINITY,
  ): { path: { x: number; y: number }[]; dest: { x: number; y: number }; partial: boolean } | null {
    if (!enemy || !enemy.alive) return null;
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
    ];
    const moveBlk = (x: number, y: number) => this.isBlockedTile(x, y);

    let best: { path: { x: number; y: number }[]; dest: { x: number; y: number } } | null = null;
    for (const d of dirs) {
      const ax = enemy.tx + d.x, ay = enemy.ty + d.y;
      if (ax < 0 || ay < 0 || ax >= mapState.cols || ay >= mapState.rows) continue;
      if (this.isWallTile(ax, ay)) continue;
      if (this.isDoorTile(ax, ay) && !this.isDoorPassable(ax, ay)) continue;
      if ((this.enemies as unknown as Enemy[]).some((e) => e.alive && e.tx === ax && e.ty === ay)) continue;

      const p = bfs(this.playerTile.x, this.playerTile.y, ax, ay, moveBlk);
      if (!p.length) continue;
      if (!best || p.length < best.path.length) best = { path: p, dest: { x: ax, y: ay } };
    }

    if (!best) return null;
    const allowed = Math.max(0, Number(maxSteps));
    if (Number.isFinite(allowed) && best.path.length > allowed) {
      if (allowed === 0) return null;
      const partial = best.path.slice(0, allowed);
      return { path: partial, dest: partial[partial.length - 1], partial: true };
    }
    return { ...best, partial: false };
  },

  _isEnemyAwareOfPlayer(this: GameScene, enemy: Enemy): boolean {
    return this.canEnemySeePlayer(enemy);
  },

  _roomTileCount(this: GameScene, roomId: number | null): number {
    if (roomId === null || roomId === undefined) return 0;
    const topo = _getRoomTopology();
    let count = 0;
    for (const rid of topo.roomByKey.values()) {
      if (rid === roomId) count++;
    }
    return count;
  },

  _isLargeOpenRoom(this: GameScene, roomId: number | null): boolean {
    const threshold = Math.max(1, Number(COMBAT_RULES.largeRoomTileThreshold || 90));
    return this._roomTileCount(roomId) >= threshold;
  },

  _roomJoinDistanceFor(this: GameScene, roomId: number | null): number {
    if (!this._isLargeOpenRoom(roomId)) return Number.POSITIVE_INFINITY;
    return Math.max(1, Number(COMBAT_RULES.largeRoomJoinDistance || COMBAT_RULES.roomAlertMaxDistance || 8));
  },

  _perceivedCombatant(
    this: GameScene,
    enemy: Enemy,
    combatants: Enemy[],
    maxDist: number,
  ): Enemy | null {
    if (!enemy || !enemy.alive || !Array.isArray(combatants) || !combatants.length) return null;
    for (const c of combatants) {
      if (!c || !c.alive) continue;
      const d = Math.abs(enemy.tx - c.tx) + Math.abs(enemy.ty - c.ty);
      if (d > maxDist) continue;
      if (!hasLOS(enemy.tx, enemy.ty, c.tx, c.ty)) continue;
      if (!inFOV(enemy, c.tx, c.ty)) continue;
      return c;
    }
    return null;
  },

  _joinReasonLabelForEnemy(
    this: GameScene,
    enemy: Enemy,
    triggerSet: Set<Enemy> | null,
    alertedSet: Set<Enemy> | null,
    px: number,
    py: number,
  ): string {
    if (!enemy) return 'unknown';
    if (triggerSet && triggerSet.has(enemy)) return 'trigger';
    if (this.canEnemySeeTile(enemy, px, py)) return 'sight';

    const eRoom = roomIdAt(enemy.tx, enemy.ty);
    if (eRoom !== null) {
      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) return 'same room';

      const combatants = [...(alertedSet || [])].filter(
        (a) => a !== enemy && a.alive && roomIdAt(a.tx, a.ty) === eRoom,
      );
      const src = this._perceivedCombatant(enemy, combatants, nearJoinDist) as Enemy | null;
      if (src) {
        const srcName = src.displayName || src.type || src.id || 'ally';
        return `called by ${srcName}`;
      }
    }
    return 'propagated';
  },

  _buildAlertedEnemySet(
    this: GameScene,
    triggers: Enemy[],
    opts: { openerGroup?: string; surpriseFromOpener?: boolean } = {},
  ): Set<Enemy> {
    const seeds = (triggers || []).filter((e) => e && e.alive);
    const alerted = new Set<Enemy>(seeds);

    if (opts.openerGroup) {
      for (const e of this.enemies as unknown as Enemy[]) {
        if (e.alive && e.group && e.group === opts.openerGroup) alerted.add(e);
      }
    }

    const scriptedGroups = new Set([...alerted].map((e) => e.group).filter(Boolean));
    if (scriptedGroups.size) {
      for (const e of this.enemies as unknown as Enemy[]) {
        if (e.alive && e.group && scriptedGroups.has(e.group)) alerted.add(e);
      }
    }

    const alertedRooms = new Set<number | null>();
    alertedRooms.add(roomIdAt(this.playerTile.x, this.playerTile.y));
    for (const a of alerted) alertedRooms.add(roomIdAt(a.tx, a.ty));
    alertedRooms.delete(null);

    for (const e of this.enemies as unknown as Enemy[]) {
      if (!e.alive || alerted.has(e)) continue;
      if (this.canEnemySeeTile(e, this.playerTile.x, this.playerTile.y)) {
        alerted.add(e);
        continue;
      }
      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null || !alertedRooms.has(eRoom)) continue;

      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) { alerted.add(e); continue; }

      const distToPlayer = Math.abs(e.tx - this.playerTile.x) + Math.abs(e.ty - this.playerTile.y);
      if (distToPlayer <= nearJoinDist && this._perceivedCombatant(e, [...alerted], nearJoinDist)) {
        alerted.add(e);
        continue;
      }

      const localCombatants = [...alerted].filter((a) => roomIdAt(a.tx, a.ty) === eRoom);
      if (this._perceivedCombatant(e, localCombatants, nearJoinDist)) {
        alerted.add(e);
        continue;
      }
    }

    const roomMax = Math.max(1, Number(COMBAT_RULES.roomAlertMaxDistance || 8));
    for (const e of this.enemies as unknown as Enemy[]) {
      if (!e.alive || alerted.has(e)) continue;
      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null) continue;
      const topo = _getRoomTopology();
      const adj = topo.sideByRoom.get(eRoom);
      const inSideRoom = adj && [...alertedRooms].some((r) => r !== null && adj.has(r));
      if (!inSideRoom) continue;
      const dist = Math.sqrt((e.tx - this.playerTile.x) ** 2 + (e.ty - this.playerTile.y) ** 2);
      if (
        dist <= Math.max(this.effectiveEnemySight(e), roomMax) &&
        hasLOS(e.tx, e.ty, this.playerTile.x, this.playerTile.y) &&
        inFOV(e, this.playerTile.x, this.playerTile.y)
      ) {
        alerted.add(e);
      }
    }

    for (const e of this.enemies as unknown as Enemy[]) {
      if (!e.alive || alerted.has(e)) continue;
      const hearRange = Math.max(this.effectiveEnemySight(e), 10);
      for (const a of [...alerted]) {
        const dA = Math.abs(e.tx - a.tx) + Math.abs(e.ty - a.ty);
        if (dA <= hearRange && hasLOS(e.tx, e.ty, a.tx, a.ty) && inFOV(e, a.tx, a.ty)) {
          alerted.add(e);
          break;
        }
      }
    }

    return alerted;
  },

  tryEngageEnemyFromExplore(this: GameScene, enemy: Enemy): void {
    if (!enemy || !enemy.alive) return;
    if (!this.isExploreMode()) return;
    if (this.isMoving) this.cancelCurrentMove();

    const ps = this.pStats as PStats;
    if (tileDist(this.playerTile.x, this.playerTile.y, enemy.tx, enemy.ty) <= (ps.atkRange || 1) + 0.01) {
      this.executeEngageOpenerAttack(enemy);
      return;
    }

    const approach = this.findApproachPathToEnemy(enemy);
    if (!approach || !approach.path.length) {
      this.showStatus('Cannot path to this enemy.');
      return;
    }

    (this as unknown as { _engageInProgress: boolean; _suppressExploreSightChecks: boolean })._engageInProgress = true;
    (this as unknown as { _engageInProgress: boolean; _suppressExploreSightChecks: boolean })._suppressExploreSightChecks = true;
    this.clearPathDots();

    this.setDestination(approach.dest.x, approach.dest.y, () => {
      (this as unknown as { _engageInProgress: boolean; _suppressExploreSightChecks: boolean })._engageInProgress = false;
      (this as unknown as { _engageInProgress: boolean; _suppressExploreSightChecks: boolean })._suppressExploreSightChecks = false;
      this.executeEngageOpenerAttack(enemy);
    });
  },

  executeEngageOpenerAttack(this: GameScene, enemy: Enemy): void {
    if (!enemy || !enemy.alive || !this.isExploreMode()) return;
    const ps = this.pStats as PStats;

    if (tileDist(this.playerTile.x, this.playerTile.y, enemy.tx, enemy.ty) > (ps.atkRange || 1) + 0.01) {
      this.showStatus('Not in melee range to open with attack.');
      return;
    }

    if (this.playerHidden) this._breakStealth(null);
    const strMod = dnd.mod(ps.str);
    const atkRoll = dnd.roll(1, 20);
    const atkTotal = atkRoll + strMod + ps.profBonus;
    const isCrit = atkRoll === 20;
    const isMiss = atkRoll === 1;
    const hits = isCrit || (!isMiss && atkTotal >= enemy.ac);

    if (hits) {
      const dr = this.resolveAbilityDamage('attack', 'player', isCrit);
      const dmg = Math.max(1, dr.total);
      enemy.hp -= dmg;
      this.applyAbilityOnHitStatuses('attack', 'player', enemy);

      this.tweens.add({ targets: enemy.img, alpha: 0.15, duration: 80, yoyo: true, repeat: 3 });
      const wpn = WEAPON_DEFS[ps.weaponId ?? ''];
      const fColor = this.dmgColor(wpn && wpn.damageType);
      const ew = this.enemyWorldPos(enemy);
      this.spawnFloat(ew.x, ew.y - S / 2, isCrit ? `💥${dmg}` : `-${dmg}`, isCrit ? '#f39c12' : fColor);

      const opRollLine = this.formatRollLine(atkRoll, strMod + ps.profBonus, atkTotal, enemy.ac);
      const opDmgText = this.formatDamageBreakdown(dr);
      const opDmgType = wpn ? wpn.damageType : '';
      withCombatLog((l: any) =>
        l.logRoll({ actor: 'You', target: enemy.displayName, result: isCrit ? 'crit' : 'hit', damage: dmg, rollDetail: opRollLine, dmgDetail: `${opDmgText}${opDmgType ? ' ' + opDmgType : ''}`, extra: 'opener' }),
      );

      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      if (enemy.hpFg) {
        enemy.hpFg.setDisplaySize((S - 8) * ratio, 5);
        if (ratio < 0.4) enemy.hpFg.setFillStyle(0xe67e22);
        if (ratio < 0.15) enemy.hpFg.setFillStyle(0xe74c3c);
      }

      if (enemy.hp <= 0) {
        enemy.alive = false;
        enemy.inCombat = true;
        this.tweens.add({
          targets: [enemy.img, enemy.hpBg, enemy.hpFg, enemy.lbl, enemy.sightRing].filter((o) => o && (o as Phaser.GameObjects.GameObject).active),
          alpha: 0,
          duration: 500,
          onComplete: () => {
            (['img', 'hpBg', 'hpFg', 'lbl', 'sightRing', 'fa', 'dot', 'sprite', 'healthBar'] as const).forEach((k) => {
              const o = (enemy as unknown as Record<string, { destroy?: () => void } | null | undefined>)[k];
              if (!o || !o.destroy) return;
              try { o.destroy(); } catch (_) {}
              (enemy as unknown as Record<string, unknown>)[k] = null;
            });
          },
        });
        const ew2 = this.enemyWorldPos(enemy);
        this.spawnFloat(ew2.x, ew2.y - S / 2 - 10, 'DEFEATED!', '#f0c060', 700);
        try {
          if (typeof this.handleEnemyDefeatLoot === 'function') this.handleEnemyDefeatLoot(enemy);
        } catch (err) {
          console.warn('[Combat] Loot resolution failed on opener kill:', err);
        }
        ps.xp += enemy.xp || 50;
        try { this.checkLevelUp(); } catch (err) { console.warn('[Combat] Level-up check failed on opener kill:', err); }

        const wasHiddenKill = this.playerHidden;
        const witnesses = (this.enemies as unknown as Enemy[]).filter((e) => {
          if (!e.alive || e === enemy) return false;
          if (this.canEnemySeePlayer(e)) return true;
          if (this.canEnemySeeTile(e, enemy.tx, enemy.ty, { checkFOV: false })) return true;
          return false;
        });

        if (witnesses.length === 0) {
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Silent kill — ${enemy.displayName} defeated!`);
          this.flashBanner('SILENT KILL', 'explore');
          return;
        }
        if (wasHiddenKill) {
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Kill from stealth! ${witnesses.length} enemies alerted.`);
        } else {
          this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener kill ${enemy.displayName}! ${witnesses.length} alerted!`);
        }
      } else {
        this.showStatus(`${isCrit ? 'CRIT! ' : ''}Opener hit ${enemy.displayName} for ${dmg}. Rolling initiative...`);
      }
    } else {
      this.tweens.add({ targets: enemy.img, x: (enemy.img?.x ?? 0) + 6, duration: 60, yoyo: true, repeat: 1 });
      this.showStatus(`Opener missed! Rolling initiative...`);
      const opMissLine = this.formatRollLine(atkRoll, strMod + ps.profBonus, atkTotal, enemy.ac);
      withCombatLog((l: any) =>
        l.logRoll({ actor: 'You', target: enemy.displayName, result: 'miss', rollDetail: opMissLine, extra: 'opener' }),
      );
    }

    this.enterCombat([enemy], { openerGroup: enemy.group, surpriseFromOpener: true });
  },

  enterCombat(
    this: GameScene,
    triggers: Enemy[],
    opts: { openerGroup?: string; surpriseFromOpener?: boolean; initiatedByPlayer?: boolean } = {},
  ): void {
    if (this.mode === MODE.COMBAT) return;
    this.mode = MODE.COMBAT;
    this.syncExploreBar();
    this.clearSightOverlays();

    this.tweens.killTweensOf(this.player);
    (this as unknown as { movePath: unknown[]; isMoving: boolean; onArrival: unknown }).movePath = [];
    (this as unknown as { movePath: unknown[]; isMoving: boolean; onArrival: unknown }).isMoving = false;
    this.clearPathDots();
    (this as unknown as { movePath: unknown[]; isMoving: boolean; onArrival: unknown }).onArrival = null;
    this.diceWaiting = false;
    this._afterPlayerDice = null;
    const snapTile = (this as unknown as { lastCompletedTile?: { x: number; y: number } }).lastCompletedTile || this.playerTile;
    this.playerTile = { x: snapTile.x, y: snapTile.y };
    (this as unknown as { lastCompletedTile: { x: number; y: number } }).lastCompletedTile = { x: snapTile.x, y: snapTile.y };
    this.player.setPosition(snapTile.x * S + S / 2, snapTile.y * S + S / 2);
    this.cameras.main.startFollow(this.player, true, 1, 1);

    if (this.playerHidden) this._breakStealth(null);

    (this as unknown as { _combatInitiatedByPlayer: boolean })._combatInitiatedByPlayer = opts.initiatedByPlayer === true;
    (this as unknown as { _combatFloorStart: unknown })._combatFloorStart =
      (window as unknown as { _MAP_META?: { floor?: unknown } })._MAP_META?.floor;

    for (const e of this.enemies as unknown as Enemy[]) {
      if (e.alive) {
        e.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
        e.searchTurnsRemaining = 0;
      }
    }

    const triggerSet = new Set<Enemy>((triggers || []).filter((e) => e && e.alive));
    const alerted = this._buildAlertedEnemySet(triggers, opts);
    this.combatGroup = [...alerted];
    assignCreatureNames(this.combatGroup as unknown as Enemy[]);
    (this.combatGroup as unknown as Enemy[]).forEach((e) => (e.inCombat = true));

    (this.combatGroup as unknown as Enemy[]).forEach((e) => {
      if (e.img) e.img.setAlpha(1);
      if (e.hpBg) e.hpBg.setAlpha(1);
      if (e.hpFg) e.hpFg.setAlpha(1);
      if (e.lbl) e.lbl.setAlpha(0.7);
      if (e.fa) e.fa.setAlpha(1);
    });

    (this.combatGroup as unknown as Enemy[]).forEach((e) => this.showDetectedEnemyMarker(e));

    const unseen = (this.combatGroup as unknown as Enemy[]).filter((e) => {
      const invisible = !this.isTileVisibleToPlayer(e.tx, e.ty);
      const dark = this.tileLightLevel(e.tx, e.ty) <= 1;
      return invisible || dark;
    });

    const surprisedEnemies = new Set<Enemy>();
    if (opts.surpriseFromOpener) {
      for (const e of this.combatGroup as unknown as Enemy[]) {
        if (!this._isEnemyAwareOfPlayer(e)) surprisedEnemies.add(e);
      }
    }

    this.turnOrder = this.rollInitiativeOrder(this.combatGroup as unknown as Enemy[], surprisedEnemies);
    this.turnIndex = 0;
    (this as unknown as { playerAP: number; playerMoves: number; playerMovesUsed: number }).playerAP = 1;
    (this as unknown as { playerAP: number; playerMoves: number; playerMovesUsed: number }).playerMoves = Number(COMBAT_RULES.playerMovePerTurn || 5);
    (this as unknown as { playerAP: number; playerMoves: number; playerMovesUsed: number }).playerMovesUsed = 0;

    if (surprisedEnemies.size > 0) {
      this.showStatus(`Ambush! ${surprisedEnemies.size} ${surprisedEnemies.size === 1 ? 'enemy is' : 'enemies are'} surprised.`);
    } else if (unseen.length) {
      this.showStatus(`Detected movement nearby: ${unseen.length} unseen ${unseen.length === 1 ? 'enemy' : 'enemies'}.`);
    }

    this.flashBanner('COMBAT!', 'combat');
    const vignette = document.getElementById('vignette');
    if (vignette) vignette.classList.add('combat');
    const badge = document.getElementById('mode-badge');
    if (badge) { badge.className = 'turnbased'; badge.textContent = '⚔ COMBAT'; }
    const esp = document.getElementById('enemy-stat-popup');
    if (esp) esp.style.display = 'none';
    const ap2 = document.getElementById('atk-predict-popup');
    if (ap2) ap2.style.display = 'none';
    (this as unknown as { _statPopupEnemy: unknown })._statPopupEnemy = null;
    this.cameras.main.shake(400, 0.008);
    this.clearSightOverlays();
    this.syncEnemySightRings(false);
    this.updateFogOfWar();
    if ((this as unknown as { enemySightEnabled?: boolean }).enemySightEnabled && typeof this.drawSightOverlays === 'function') {
      this.drawSightOverlays();
    }
    withCombatLog((l: any) => {
      l.logSep('COMBAT');
      const enemyNames = (this.combatGroup as unknown as Enemy[])
        .map((e) => e?.displayName || e?.name || e?.type || e?.id || 'Unknown')
        .filter(Boolean);
      const enemyLabel = enemyNames.length
        ? `${enemyNames.length} ${enemyNames.length === 1 ? 'enemy' : 'enemies'} (${enemyNames.join(', ')})`
        : `${alerted?.size ?? this.combatGroup.length} enemies`;
      l.log(`Combat started — ${enemyLabel}`, 'system', 'combat');
      const reasonDetails = (this.combatGroup as unknown as Enemy[]).map((e) => {
        const name = e.displayName || e.type || e.id || 'Unknown';
        const reason = this._joinReasonLabelForEnemy(e, triggerSet, alerted, this.playerTile.x, this.playerTile.y);
        return `${name} (${reason})`;
      }).join(', ');
      l.log(`Join reasons: ${reasonDetails}`, 'system', 'combat');
    });
    this.updateFogOfWar();
    this.executeAbilityHook('on_combat_start', { combatants: this.combatGroup });
    this.time.delayedCall(700, () => { this.buildInitBar(); this.startNextTurn(); });
  },

  exitCombat(this: GameScene, reason = 'victory'): void {
    try {
      this.mode = MODE.EXPLORE;
      this._clearPendingSpotWarnings();
      if (this.playerHidden) this._breakStealth(null);
      this.syncExploreBar();

      if (typeof this.clearSightOverlays === 'function') {
        try { this.clearSightOverlays(); } catch (e) { console.warn('[Combat] clearSightOverlays error:', e); }
      }

      for (const e of this.enemies as unknown as Enemy[]) {
        if (!e) continue;
        e.inCombat = false;
        if (!e.alive) continue;
        if (!e.lastSeenPlayerTile) e.lastSeenPlayerTile = { x: e.tx, y: e.ty };
        e.searchTurnsRemaining = 0;
      }
      this.combatGroup = [];
      this.turnOrder = [];
      this.turnIndex = 0;
      this.pendingAction = null;
      this.diceWaiting = false;
      this._afterPlayerDice = null;
      (this as unknown as { _movingToAttack: boolean })._movingToAttack = false;
      (this as unknown as { _combatInitiatedByPlayer: boolean })._combatInitiatedByPlayer = false;
      (this as unknown as { _combatFloorStart: unknown })._combatFloorStart = undefined;
      const ov = document.getElementById('dice-ov');
      if (ov) ov.classList.remove('show');
      this.clearMoveRange(); this.clearAtkRange(); this.clearFleeZone();
      this.clearDetectMarkers(); this.hideHitLabels();
      this.turnHL.setAlpha(0);
      const vignette = document.getElementById('vignette');
      if (vignette) vignette.classList.remove('combat');
      const badge = document.getElementById('mode-badge');
      if (badge) { badge.className = 'realtime'; badge.textContent = 'EXPLORE'; }
      document.getElementById('init-bar')?.classList.remove('show');
      document.getElementById('action-bar')?.classList.remove('show');
      document.getElementById('res-pips')?.classList.remove('show');

      if (reason === 'flee') {
        this.flashBanner('FLED COMBAT', 'explore');
        this.showStatus('Escaped combat. Stay hidden to avoid re-engage.');
        withCombatLog((l: any) => l.log('Fled combat!', 'system', 'combat'));
      } else if (reason === 'escape') {
        withCombatLog((l: any) => l.log('Escaped — enemies lost you.', 'system', 'combat'));
      } else if (reason === 'floor_change') {
        this.flashBanner('LEFT COMBAT', 'explore');
        this.showStatus('Combat ended — you moved to a different area.');
        withCombatLog((l: any) => l.log('Left combat area.', 'system', 'combat'));
      } else {
        const w = window as unknown as { ModLoader?: { shouldResolveBossVictory?: (scene: unknown, reason: string) => boolean; resolveRunOutcome: (scene: unknown, outcome: string) => void } };
        if (w.ModLoader?.shouldResolveBossVictory?.(this, reason)) {
          this.flashBanner('BOSS DEFEATED!', 'explore');
          this.showStatus('The Warchief falls! Victory!');
          withCombatLog((l: any) => l.log('Boss defeated! Victory!', 'player', 'combat'));
          this.time.delayedCall(2000, () => {
            w.ModLoader!.resolveRunOutcome(this, 'victory');
          });
        } else {
          this.flashBanner('COMBAT OVER', 'explore');
          this.showStatus('Victory! Continue exploring.');
          withCombatLog((l: any) => l.log('Victory!', 'player', 'combat'));
        }
      }
      withCombatLog((l: any) => l.logSep());
      this.executeAbilityHook('on_combat_end', { reason });
      this.resetActionButtons();
      withHotbar((h: any) => h.resetUsed());
      this.time.delayedCall(300, () => { this.drawSightOverlays(); this.updateFogOfWar(); });
    } catch (err) {
      console.warn('[Combat] exitCombat error:', err);
      this.mode = MODE.EXPLORE;
      this.showStatus('Combat ended.');
    }
  },

  onTapCombat(this: GameScene, tx: number, ty: number, enemy: Enemy | null, ptr: unknown): void {
    const self = this as unknown as { _movingToAttack: boolean; pendingAction: string | null; _pendingAtkAbilityId: string | null; _targetingAutoTB: boolean };
    if (self._movingToAttack) return;
    if (!this.isPlayerTurn()) return;

    if (this.isDoorTile(tx, ty) && !(enemy && enemy.alive)) {
      if (tileDist(this.playerTile.x, this.playerTile.y, tx, ty) > 1.5) {
        this.showStatus('Move next to the door to interact.');
        return;
      }
      this.toggleDoor(tx, ty);
      return;
    }

    if (enemy && (this.combatGroup as unknown as Enemy[]).includes(enemy)) return;

    if (enemy && !(this.combatGroup as unknown as Enemy[]).includes(enemy)) {
      (this.combatGroup as unknown as Enemy[]).push(enemy);
      enemy.inCombat = true;
      this.turnOrder = this.rollInitiativeOrder(this.combatGroup as unknown as Enemy[]);
      this.showStatus(`${enemy.displayName || 'Enemy'} joined the battle!`);
      this.updateFogOfWar();
      return;
    }

    if (self.pendingAction === 'attack') {
      this.clearPendingAction();
      this.showMoveRange();
      this.showStatus('Attack cancelled.');
      return;
    }

    if (!this.isWallTile(tx, ty)) {
      if ((this as unknown as { ui?: { dismissEnemyPopup: () => void } }).ui) {
        (this as unknown as { ui: { dismissEnemyPopup: () => void } }).ui.dismissEnemyPopup();
      }
      if ((this.enemies as unknown as Enemy[]).some((e) => e.alive && e.tx === tx && e.ty === ty)) {
        this.showStatus('Cannot move onto an enemy tile.');
        return;
      }
      const ts = this as unknown as { turnStartTile?: { x: number; y: number }; playerMoves: number; turnStartMoves?: number; playerMovesUsed: number };
      const anchor = ts.turnStartTile || this.playerTile;
      const totalBudget = ts.turnStartMoves ?? ts.playerMoves;
      const wallBlk2 = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: false });
      const isAnchorTile = tx === anchor.x && ty === anchor.y;
      const pathFromStart = bfs(anchor.x, anchor.y, tx, ty, wallBlk2);
      if (!isAnchorTile && !pathFromStart.length) { this.showStatus('Cannot reach that tile.'); return; }
      const costFromStart = isAnchorTile ? 0 : pathTileCost(pathFromStart, anchor);
      if (costFromStart > totalBudget + 0.001) {
        this.showMoveRange();
        this.showStatus(`Too far (${costFromStart.toFixed(1)}), you have ${totalBudget.toFixed(1)} movement.`);
        return;
      }
      const path = bfs(this.playerTile.x, this.playerTile.y, tx, ty, wallBlk2);
      if (!path.length) { this.showStatus('Cannot reach that tile.'); return; }
      const finalPos = ptr ? { wx: (ptr as { worldX?: number }).worldX ?? 0, wy: (ptr as { worldY?: number }).worldY ?? 0 } : null;
      this.setDestination(tx, ty, () => {
        ts.playerMovesUsed = costFromStart;
        ts.playerMoves = Math.max(0, totalBudget - costFromStart);
        this.updateResBar();
        this._updatePendingSpotWarnings();
      }, finalPos);
    }
  },

  startNextTurn(this: GameScene): void {
    this.turnOrder = this.turnOrder.filter(
      (t) => t.id === 'player' || (t.enemy && (t.enemy as Enemy).alive),
    );

    const currentFloor = (window as unknown as { _MAP_META?: { floor?: unknown } })._MAP_META?.floor;
    const combatSelf = this as unknown as { _combatFloorStart: unknown; _combatInitiatedByPlayer: boolean; playerAP: number; playerMoves: number; playerMovesUsed: number; turnStartMoves: number; turnStartTile: { x: number; y: number }; _queuedEngageEnemy?: Enemy };
    if (combatSelf._combatFloorStart !== undefined && currentFloor !== combatSelf._combatFloorStart) {
      this.exitCombat('floor_change');
      return;
    }

    const noEnemies = (this.combatGroup as unknown as Enemy[]).every((e) => !e.alive);
    const shouldExit = noEnemies && !combatSelf._combatInitiatedByPlayer;
    if (!this.turnOrder.length || shouldExit) { this.exitCombat(); return; }

    if (this.playerHidden && (this.combatGroup as unknown as Enemy[]).every((e) => !e.alive || e.searchTurnsRemaining <= 0)) {
      this.showStatus('All enemies have abandoned the search. You escaped!');
      this.time.delayedCall(400, () => this.exitCombat('escape'));
      return;
    }

    if (this.turnIndex < 0 || this.turnIndex >= this.turnOrder.length) this.turnIndex = 0;
    const cur = this.turnOrder[this.turnIndex];
    this.buildInitBar();

    if (cur.surprised) {
      cur.surprised = false;
      this.showStatus(`${cur.id === 'player' ? 'You are' : (cur.enemy as Enemy).displayName + ' is'} surprised and loses this turn!`);
      if (cur.id === 'player') this.time.delayedCall(220, () => this.endPlayerTurn(true));
      else this.time.delayedCall(220, () => this.endEnemyTurn(cur.enemy));
      return;
    }

    if (cur.id === 'player') {
      const st = this.processStatusEffectsForActor('player', 'turn_start');
      if (st.skipTurn) {
        this.turnHL.setAlpha(0);
        this.tweens.killTweensOf(this.turnHL);
        document.getElementById('action-bar')?.classList.remove('show');
        document.getElementById('res-pips')?.classList.remove('show');
        this.time.delayedCall(250, () => this.endPlayerTurn(true));
        return;
      }
      this.executeAbilityHook('on_turn_start', { actor: 'player' });
      combatSelf.playerAP = 1;
      combatSelf.playerMoves = Number(COMBAT_RULES.playerMovePerTurn || 5);
      combatSelf.playerMovesUsed = 0;
      combatSelf.turnStartMoves = Number(COMBAT_RULES.playerMovePerTurn || 5);
      combatSelf.turnStartTile = { ...this.playerTile };
      this.snapshotMoveResetAnchor();
      (this as unknown as { pendingAction: unknown }).pendingAction = null;
      this.clearMoveRange(); this.clearAtkRange();
      document.getElementById('action-bar')?.classList.add('show');
      document.getElementById('res-pips')?.classList.add('show');
      this.initActionButtons();
      this.resetActionButtons();
      withHotbar((h: any) => {
        h.setExpanded(true);
        h.resetUsed();
      });
      this.turnHL.setPosition(this.player.x, this.player.y).setAlpha(0.6);
      this.tweens.add({ targets: this.turnHL, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
      this.updateResBar();
      this._updatePendingSpotWarnings();
      this.time.delayedCall(100, () => this.showMoveRange());
      const engageTarget = combatSelf._queuedEngageEnemy;
      combatSelf._queuedEngageEnemy = undefined;
      if (engageTarget && engageTarget.alive && (this.combatGroup as unknown as Enemy[]).includes(engageTarget)) {
        this.showStatus(`Engaging ${engageTarget.displayName}...`);
        this.time.delayedCall(180, () => {
          if (this.mode === MODE.COMBAT && this.isPlayerTurn() && engageTarget.alive) {
            this.tryMoveAndAttack(engageTarget);
          }
        });
      }
    } else {
      const enemy = cur.enemy as Enemy;
      const st = this.processStatusEffectsForActor(enemy, 'turn_start');
      if (st.skipTurn) { this.time.delayedCall(220, () => this.endEnemyTurn(enemy)); return; }
      this.executeAbilityHook('on_turn_start', { actor: enemy });
      document.getElementById('action-bar')?.classList.remove('show');
      document.getElementById('res-pips')?.classList.remove('show');
      this.turnHL.setAlpha(0);
      this.tweens.killTweensOf(this.turnHL);
      this.clearMoveRange();
      this.time.delayedCall(400, () => this.doEnemyTurn(enemy));
    }
  },

  endPlayerTurn(this: GameScene, fromStatusSkip = false): void {
    if (this.mode !== MODE.COMBAT) return;
    this._clearPendingSpotWarnings();
    if ((this as unknown as { ui?: { dismissEnemyPopup: () => void } }).ui) {
      (this as unknown as { ui: { dismissEnemyPopup: () => void } }).ui.dismissEnemyPopup();
    }
    if (!fromStatusSkip) {
      this.processStatusEffectsForActor('player', 'turn_end');
      this.executeAbilityHook('on_turn_end', { actor: 'player' });
    }
    if (typeof (this as unknown as { tickStatMods?: () => void }).tickStatMods === 'function') {
      (this as unknown as { tickStatMods: () => void }).tickStatMods();
    }
    const ts = this as unknown as { playerMoves: number; playerAP: number; playerMovesUsed: number; _movingToAttack: boolean };
    ts.playerMoves = 0; ts.playerAP = 0;
    this.diceWaiting = false; this._afterPlayerDice = null; ts._movingToAttack = false;
    this.clearPendingAction(); this.clearMoveRange(); this.clearAtkRange();
    this.turnHL.setAlpha(0); this.tweens.killTweensOf(this.turnHL);
    document.getElementById('action-bar')?.classList.remove('show');
    document.getElementById('res-pips')?.classList.remove('show');
    this._checkForNewEnemiesAfterMove();
    this.turnIndex++;
    this.time.delayedCall(200, () => this.startNextTurn());
  },

  _clearPendingSpotWarnings(this: GameScene): void {
    const self = this as unknown as { _pendingSpotWarningEnemies?: Enemy[]; _pendingSpotWarningKey?: string };
    const warned = self._pendingSpotWarningEnemies || [];
    for (const e of warned) {
      if (e?.img && e.img.active) e.img.clearTint();
    }
    self._pendingSpotWarningEnemies = [];
    self._pendingSpotWarningKey = '';
  },

  _updatePendingSpotWarnings(this: GameScene): void {
    const self = this as unknown as { _pendingSpotWarningEnemies?: Enemy[]; _pendingSpotWarningKey?: string };
    if (this.mode !== MODE.COMBAT || !this.isPlayerTurn()) { this._clearPendingSpotWarnings(); return; }
    const predicted = this._predictNewAlertedAtTileDetailed(this.playerTile.x, this.playerTile.y);
    const spotters = predicted.map((p) => (p as { enemy: Enemy }).enemy);

    const prev = self._pendingSpotWarningEnemies || [];
    for (const e of prev) {
      if (e?.img && e.img.active) e.img.clearTint();
    }

    self._pendingSpotWarningEnemies = spotters;
    for (const e of spotters) {
      if (e?.img && e.img.active) e.img.setTint(0xffb347);
    }

    const key = predicted
      .map((p) => {
        const ep = p as { enemy: Enemy; reason: string };
        return `${ep.enemy.displayName || ep.enemy.type || ep.enemy.id}:${ep.reason}`;
      })
      .sort()
      .join('|');
    if (spotters.length && key !== self._pendingSpotWarningKey) {
      const visual = predicted.filter((p) => (p as { reason: string }).reason === 'sight').length;
      const area = spotters.length - visual;
      if (visual > 0 && area > 0) {
        this.showStatus(`${spotters.length} enemies will join on End Turn (${visual} see you, ${area} nearby hear the fight).`);
      } else if (visual > 0) {
        this.showStatus(`${visual} ${visual === 1 ? 'enemy' : 'enemies'} can see you and will join on End Turn.`);
      } else {
        this.showStatus(`${area} nearby ${area === 1 ? 'enemy' : 'enemies'} will join on End Turn (combat noise).`);
      }
    }
    self._pendingSpotWarningKey = key;
  },

  _predictNewAlertedAtTileDetailed(this: GameScene, px: number, py: number): { enemy: Enemy; reason: string; source?: Enemy | null }[] {
    if (!this.combatGroup || this.combatGroup.length === 0) return [];
    const predicted: { enemy: Enemy; reason: string; source?: Enemy | null }[] = [];
    const seenIds = new Set<unknown>();
    const pushPredicted = (enemy: Enemy, reason: string, source: Enemy | null = null) => {
      if (!enemy || seenIds.has(enemy.id || enemy)) return;
      seenIds.add(enemy.id || enemy);
      predicted.push({ enemy, reason, source });
    };
    const currentRoom = roomIdAt(px, py);
    const alertedRooms = new Set<number | null>();
    alertedRooms.add(currentRoom);
    for (const e of this.combatGroup as unknown as Enemy[]) alertedRooms.add(roomIdAt(e.tx, e.ty));
    alertedRooms.delete(null);

    for (const e of this.enemies as unknown as Enemy[]) {
      if (!e.alive || (this.combatGroup as unknown as Enemy[]).includes(e)) continue;
      if (this.canEnemySeeTile(e, px, py)) { pushPredicted(e, 'sight'); continue; }

      const eRoom = roomIdAt(e.tx, e.ty);
      if (eRoom === null || !alertedRooms.has(eRoom)) continue;

      const nearJoinDist = this._roomJoinDistanceFor(eRoom);
      if (!Number.isFinite(nearJoinDist)) { pushPredicted(e, 'same_room'); continue; }

      const distToPlayer = Math.abs(e.tx - px) + Math.abs(e.ty - py);
      const roomCombatants = (this.enemies as unknown as Enemy[]).filter(
        (other) => other.alive && other.inCombat && roomIdAt(other.tx, other.ty) === eRoom,
      );
      const perceived = this._perceivedCombatant(e, roomCombatants, nearJoinDist) as Enemy | null;
      if (distToPlayer <= nearJoinDist && perceived) { pushPredicted(e, 'area', perceived); continue; }
      if (perceived) { pushPredicted(e, 'area', perceived); continue; }
    }
    return predicted;
  },

  _predictNewAlertedAtTile(this: GameScene, px: number, py: number): Enemy[] {
    return this._predictNewAlertedAtTileDetailed(px, py).map((p) => (p as { enemy: Enemy }).enemy);
  },

  _checkForNewEnemiesAfterMove(this: GameScene): void {
    if (!this.combatGroup || this.combatGroup.length === 0) return;
    const newAlertedDetailed = this._predictNewAlertedAtTileDetailed(this.playerTile.x, this.playerTile.y) as { enemy: Enemy; reason: string; source?: Enemy | null }[];
    const newAlerted = newAlertedDetailed.map((p) => p.enemy);

    if (newAlerted.length > 0) {
      this.showStatus(`${newAlerted.length} new ${newAlerted.length === 1 ? 'enemy' : 'enemies'} joined the battle!`);
      const joinedNames = newAlertedDetailed.map(({ enemy, reason, source }) => {
        const name = enemy.displayName || enemy.type || enemy.id || 'Unknown';
        if (reason === 'sight') return `${name} (sight)`;
        if (reason === 'same_room') return `${name} (same room)`;
        if (source) {
          const src = source.displayName || source.type || source.id || 'ally';
          return `${name} (called by ${src})`;
        }
        return `${name} (nearby)`;
      }).join(', ');
      newAlerted.forEach((e) => {
        (this.combatGroup as unknown as Enemy[]).push(e);
        e.inCombat = true;
        this.showDetectedEnemyMarker(e);
        if (e.img) e.img.setAlpha(1);
        if (e.hpBg) e.hpBg.setAlpha(1);
        if (e.hpFg) e.hpFg.setAlpha(1);
        if (e.lbl) e.lbl.setAlpha(0.7);
        if (e.fa) e.fa.setAlpha(1);
      });
      this.turnOrder = this.rollInitiativeOrder(this.combatGroup as unknown as Enemy[]);
      withCombatLog((l: any) =>
        l.log(`${newAlerted.length} new ${newAlerted.length === 1 ? 'enemy' : 'enemies'} entered combat: ${joinedNames}.`, 'system', 'combat'),
      );
      this.updateFogOfWar();
    }
  },

  isPlayerTurn(this: GameScene): boolean {
    if (this.mode !== MODE.COMBAT) return false;
    const c = this.turnOrder[this.turnIndex];
    return c && c.id === 'player';
  },

  snapshotMoveResetAnchor(this: GameScene): void {
    const self = this as unknown as { moveResetAnchorTile: { x: number; y: number }; moveResetAnchorMoves: number; moveResetAnchorMovesUsed: number; playerMoves: number; playerMovesUsed: number };
    self.moveResetAnchorTile = { ...this.playerTile };
    self.moveResetAnchorMoves = Math.max(0, Number(self.playerMoves || 0));
    self.moveResetAnchorMovesUsed = Math.max(0, Number(self.playerMovesUsed || 0));
  },

  resetMove(this: GameScene): void {
    if (!this.isPlayerTurn()) return;
    const self = this as unknown as { moveResetAnchorTile?: { x: number; y: number }; moveResetAnchorMoves?: number; moveResetAnchorMovesUsed?: number; turnStartTile?: { x: number; y: number }; turnStartMoves?: number; playerMoves: number; playerMovesUsed: number; isMoving: boolean; movePath: unknown[]; onArrival: unknown };
    const anchorTile = self.moveResetAnchorTile || self.turnStartTile;
    const anchorMoves = Math.max(0, Number(self.moveResetAnchorMoves ?? self.turnStartMoves ?? (COMBAT_RULES.playerMovePerTurn || 5)));
    const anchorMovesUsed = Math.max(0, Number(self.moveResetAnchorMovesUsed ?? 0));
    const sameTile = !!anchorTile && this.playerTile.x === anchorTile.x && this.playerTile.y === anchorTile.y;
    if (sameTile && self.playerMoves === anchorMoves && self.playerMovesUsed === anchorMovesUsed) {
      this.showStatus('No movement to reset.');
      return;
    }
    this.tweens.killTweensOf(this.player);
    self.movePath = []; self.isMoving = false; this.clearPathDots(); self.onArrival = null;
    this.playerTile = { ...anchorTile! };
    this.player.setPosition(anchorTile!.x * S + S / 2, anchorTile!.y * S + S / 2);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    self.playerMoves = anchorMoves;
    self.playerMovesUsed = anchorMovesUsed;
    this.updateFogOfWar();
    this.clearMoveRange();
    this.showMoveRange();
    this.updateResBar();
    this._updatePendingSpotWarnings();
    this.showStatus('Move reset.');
  },

  selectAction(this: GameScene, action: string): void {
    const self = this as unknown as { pendingAction: string | null; _pendingAtkAbilityId: string | null; playerAP: number; playerMoves: number; turnStartTile?: { x: number; y: number }; turnStartMoves?: number; _targetingAutoTB: boolean };
    if ((this as unknown as { ui?: { dismissEnemyPopup: () => void } }).ui) {
      (this as unknown as { ui: { dismissEnemyPopup: () => void } }).ui.dismissEnemyPopup();
    }
    if (this.isExploreMode() && action === 'attack') {
      if (self.pendingAction === 'attack') {
        this.clearPendingAction();
        this.showStatus('Attack cancelled.');
        return;
      }
      if (this.mode === MODE.EXPLORE) self._targetingAutoTB = false;
      self.pendingAction = 'attack';
      withHotbar((h: any) => h.setSelected('attack'));
      this.showStatus('Select an enemy to attack. Click empty tile to cancel.');
      return;
    }
    if (this.mode !== MODE.COMBAT) { this.showStatus('Enter combat first.'); return; }
    if (!this.isPlayerTurn()) return;
    if (action === 'attack' || this._isAttackAbility(action)) {
      if (self.playerAP <= 0) { this.showStatus('Action already used.'); return; }
      if (self.pendingAction === 'attack' && (self._pendingAtkAbilityId || 'attack') === action) {
        this.clearPendingAction();
        this.showMoveRange();
        this.showStatus('Attack cancelled.');
        return;
      }
      self.pendingAction = 'attack';
      self._pendingAtkAbilityId = action;
      this.setSelectedActionButton('attack');
      withHotbar((h: any) => h.setSelected(action));
      this.clearMoveRange(); this.showAtkRange();
      this.updateHitLabels();
      const aDef = this.getAbilityDef(action);
      this.showStatus(`Select an enemy to ${(aDef as { name?: string })?.name || 'attack'}.`);
    } else if (action === 'sleep_cloud') {
      this.showStatus('Sleep Cloud action setup is not wired to a targeting flow yet.');
      self.pendingAction = null;
      this.setSelectedActionButton('');
      withHotbar((h: any) => h.clearSelection());
    } else if (action === 'dash') {
      if (self.playerAP <= 0) { this.showStatus('Action already used.'); return; }
      self.playerAP = 0;
      self.playerMoves += Number(COMBAT_RULES.dashMoveBonus || 4);
      this.processStatusEffectsForActor('player', 'on_action', { actionId: 'dash' });
      self.turnStartTile = { ...this.playerTile };
      self.turnStartMoves = Math.max(0, self.playerMoves);
      this.snapshotMoveResetAnchor();
      self.pendingAction = null;
      this.setActionButtonsUsed(true);
      withHotbar((h: any) => h.markAllUsed(true));
      this.updateResBar(); this.clearMoveRange(); this.showMoveRange();
      this.showStatus(`Dashed! ${Math.floor(self.playerMoves)} movement remaining.`);
    } else if (action === 'hide') {
      this.tryHideAction();
    } else if (action === 'flee') {
      if (self.pendingAction === 'flee') {
        this.clearPendingAction();
        this.clearFleeZone();
        this.showMoveRange();
        return;
      }
      const chk = this.canFleeCombat();
      if (chk.ok) {
        this.tryFleeCombat();
      } else {
        self.pendingAction = 'flee';
        withHotbar((h: any) => h.setSelected('flee'));
        this.clearMoveRange(); this.clearAtkRange();
        this.showFleeZone();
        this.showMoveRange();
        withCombatLog((l: any) =>
          l.log(`Can't flee yet: ${chk.reason} Move to a green tile first.`, 'system', 'combat'),
        );
      }
    }
  },

  clearPendingAction(this: GameScene): void {
    const self = this as unknown as { pendingAction: string | null; _pendingAtkAbilityId: string | null; _atkConfirmEnemy: unknown; _targetingAutoTB: boolean };
    self.pendingAction = null;
    self._pendingAtkAbilityId = null;
    self._atkConfirmEnemy = null;
    this._hideHitTooltip();
    this.setSelectedActionButton('');
    withHotbar((h: any) => h.clearSelection());
    this.clearAtkRange(); this.clearFleeZone();
    this.updateHitLabels();
    self._targetingAutoTB = false;
  },

  _isAttackAbility(this: GameScene, id: string): boolean {
    if (id === 'attack') return true;
    const def = this.getAbilityDef(id);
    return !!(def as { template?: { hit?: { attackRoll?: unknown } } } | null)?.template?.hit?.attackRoll;
  },

  calcHitChance(this: GameScene, enemy: Enemy, abilityId?: string): number {
    const ps = this.pStats as PStats;
    const self = this as unknown as { _pendingAtkAbilityId?: string };
    abilityId = abilityId || self._pendingAtkAbilityId || 'attack';
    const aDef = this.getAbilityDef(abilityId);
    const atkStat = (aDef as { template?: { hit?: { attackRoll?: { ability?: string } } } } | null)?.template?.hit?.attackRoll?.ability || 'str';
    const addProf = (aDef as { template?: { hit?: { attackRoll?: { addProf?: boolean } } } } | null)?.template?.hit?.attackRoll?.addProf !== false;
    const statMod = dnd.mod((ps as unknown as Record<string, number>)[atkStat] || 10);
    const bonus = statMod + (addProf ? ps.profBonus : 0);
    const needed = enemy.ac - bonus;
    const raw = (21 - needed) / 20;
    return Math.round(Math.max(0.05, Math.min(0.95, raw)) * 100);
  },

  _showHitTooltip(this: GameScene, enemy: Enemy): void {
    if (!enemy || !enemy.alive) { this._hideHitTooltip(); return; }
    const pct = this.calcHitChance(enemy);
    const adv = this.playerHidden ? ' (Adv)' : '';
    let el = document.getElementById('hit-chance-tip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hit-chance-tip';
      el.style.cssText = 'position:absolute;z-index:35;pointer-events:none;font-family:"Courier New",monospace;font-size:13px;font-weight:bold;padding:4px 10px;border-radius:6px;background:rgba(10,10,20,0.92);border:1px solid rgba(231,76,60,0.5);white-space:nowrap;transition:opacity 0.12s;';
      document.body.appendChild(el);
    }
    el.textContent = `${pct}%${adv}`;
    el.style.color = pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f0c060' : '#e74c3c';
    const cam = this.cameras.main;
    const canvas = document.querySelector('#gc canvas') as HTMLCanvasElement | null;
    const cr = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 960, height: 1008 };
    const scaleX = cr.width / cam.width, scaleY = cr.height / cam.height;
    const sx = (enemy.tx * S + S / 2 - cam.scrollX) * scaleX + cr.left;
    const sy = (enemy.ty * S - 8 - cam.scrollY) * scaleY + cr.top;
    el.style.left = (sx - el.offsetWidth / 2) + 'px';
    el.style.top = (sy - 28) + 'px';
    el.style.display = 'block';
    el.style.opacity = '1';
  },

  _hideHitTooltip(this: GameScene): void {
    const el = document.getElementById('hit-chance-tip');
    if (el) { el.style.opacity = '0'; el.style.display = 'none'; }
    (this as unknown as { _atkHoverEnemy: unknown })._atkHoverEnemy = null;
  },

  updateHitLabels(this: GameScene): void {
    if (!this.enemies) return;
    const self = this as unknown as { _pendingAtkAbilityId?: string; playerAP: number };
    const inCombat = this.mode === MODE.COMBAT;
    const hasAP = self.playerAP > 0;
    let abilityId = self._pendingAtkAbilityId || 'attack';
    if (!self._pendingAtkAbilityId) {
      const hb = (window as unknown as { Hotbar?: { getEffectiveDefaultAttack: () => string } }).Hotbar;
      if (hb) abilityId = hb.getEffectiveDefaultAttack();
    }
    for (const e of this.enemies as unknown as Enemy[]) {
      if (!e.hitLbl) continue;
      if (!inCombat || !e.alive || !e.inCombat || !hasAP) { e.hitLbl.setAlpha(0); continue; }
      const pct = this.calcHitChance(e, abilityId);
      e.hitLbl.setText(`${pct}%`);
      e.hitLbl.setColor(pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f0c060' : '#e74c3c');
      if (e.img) e.hitLbl.setPosition(e.img.x, e.img.y - S * 0.7);
      e.hitLbl.setAlpha(1);
    }
  },

  hideHitLabels(this: GameScene): void {
    if (!this.enemies) return;
    for (const e of this.enemies as unknown as Enemy[]) {
      if (e.hitLbl) e.hitLbl.setAlpha(0);
    }
  },

  playerAttackEnemy(this: GameScene, enemy: Enemy, abilityId = 'attack'): void {
    const ps = this.pStats as PStats;
    const self = this as unknown as { playerAP: number; playerMoves: number; playerMovesUsed: number; turnStartTile?: { x: number; y: number }; turnStartMoves?: number; _afterPlayerDice: (() => void) | null; diceWaiting: string | false };
    if (!this.isPlayerTurn() || self.playerAP <= 0) return;
    if ((this as unknown as { ui?: { dismissEnemyPopup: () => void } }).ui) {
      (this as unknown as { ui: { dismissEnemyPopup: () => void } }).ui.dismissEnemyPopup();
    }

    const wasHidden = this.playerHidden;
    if (wasHidden) this._breakStealth(null);
    if (tileDist(this.playerTile.x, this.playerTile.y, enemy.tx, enemy.ty) > (ps.atkRange || 1) + 0.5) {
      this.showStatus('Too far — move closer first.'); return;
    }
    this.clearPendingAction();
    self.playerAP = 0;
    this.processStatusEffectsForActor('player', 'on_action', { actionId: abilityId });
    self.turnStartTile = { ...this.playerTile };
    self.turnStartMoves = Math.max(0, self.playerMoves);
    this.snapshotMoveResetAnchor();

    const abilityDef = this.getAbilityDef(abilityId);
    const atkStat = (abilityDef as { template?: { hit?: { attackRoll?: { ability?: string } } } } | null)?.template?.hit?.attackRoll?.ability || 'str';
    const addProf = (abilityDef as { template?: { hit?: { attackRoll?: { addProf?: boolean } } } } | null)?.template?.hit?.attackRoll?.addProf !== false;
    const statMod = dnd.mod((ps as unknown as Record<string, number>)[atkStat] || 10);
    const profBonus = addProf ? ps.profBonus : 0;

    let atkRoll: number, atkRoll2: number | null = null;
    if (wasHidden) {
      atkRoll = dnd.roll(1, 20);
      atkRoll2 = dnd.roll(1, 20);
      atkRoll = Math.max(atkRoll, atkRoll2);
    } else {
      atkRoll = dnd.roll(1, 20);
    }

    const atkTotal = atkRoll + statMod + profBonus;
    const isCrit = atkRoll === 20, isMiss = atkRoll === 1;
    const hits = isCrit || (!isMiss && atkTotal >= enemy.ac);
    const abilityName = (abilityDef as { name?: string } | null)?.name || 'Attack';
    const totalMod = statMod + profBonus;

    this.setActionButtonsUsed(true);
    withHotbar((h: any) => h.markAllUsed(true));
    this.updateResBar();

    if (!hits) {
      this.tweens.add({ targets: enemy.img, x: (enemy.img?.x ?? 0) + 6, duration: 60, yoyo: true, repeat: 1 });
      const ew = this.enemyWorldPos(enemy);
      this.spawnFloat(ew.x, ew.y - S / 2, isMiss ? 'NAT 1!' : 'MISS', '#7fc8f8');
      const rollDisplay = wasHidden
        ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod >= 0 ? '+ ' + totalMod : '- ' + Math.abs(totalMod)} = ${atkTotal} | AC ${enemy.ac}`
        : this.formatRollLine(atkRoll, totalMod, atkTotal, enemy.ac);
      this.showStatus(`${abilityName} missed ${enemy.displayName}! ${rollDisplay}`);
      withCombatLog((l: any) =>
        l.logRoll({ actor: 'You', target: enemy.displayName, result: isMiss ? 'crit' : 'miss', rollDetail: rollDisplay, extra: wasHidden ? 'advantage' : '' }),
      );
      this.executeAbilityHook('on_miss', { source: 'player', target: enemy, ability: abilityId });
      self._afterPlayerDice = () => { this.showMoveRange(); };
      if (isMiss) {
        self.diceWaiting = 'player';
        this.showDicePopup(rollDisplay, 'Rolled a 1 — the worst possible roll. Your attack fumbles automatically, no matter how weak the enemy is.', 'miss', [{ sides: 20, value: atkRoll, kind: 'd20' }, ...(atkRoll2 !== null ? [{ sides: 20, value: atkRoll2, kind: 'd20' }] : [])]);
      } else {
        this._finishPlayerAction();
      }
      return;
    }

    const dr = this.resolveAbilityDamage(abilityId, 'player', isCrit);
    const dmg = Math.max(1, dr.total);
    enemy.hp -= dmg;
    this.applyAbilityOnHitStatuses(abilityId, 'player', enemy);
    this.executeAbilityHook('on_hit', { source: 'player', target: enemy, ability: abilityId, isCrit, damage: dmg });
    this.executeAbilityHook('on_damage_dealt', { source: 'player', target: enemy, amount: dmg, damageType: WEAPON_DEFS[ps.weaponId ?? '']?.damageType });

    const wpn = WEAPON_DEFS[ps.weaponId ?? ''];
    const floatColor = this.dmgColor(wpn && wpn.damageType);
    this.tweens.add({ targets: enemy.img, alpha: 0.15, duration: 80, yoyo: true, repeat: 3 });
    const ew = this.enemyWorldPos(enemy);
    this.spawnFloat(ew.x, ew.y - S / 2, isCrit ? `💥${dmg}` : `-${dmg}`, isCrit ? '#f39c12' : floatColor);
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    if (enemy.hpFg) {
      enemy.hpFg.setDisplaySize((S - 8) * ratio, 5);
      if (ratio < 0.4) enemy.hpFg.setFillStyle(0xe67e22);
      if (ratio < 0.15) enemy.hpFg.setFillStyle(0xe74c3c);
    }

    const dmgText = this.formatDamageBreakdown(dr);
    const rollDisplay = wasHidden
      ? `d20(${atkRoll2}|${atkRoll}↑) ${totalMod >= 0 ? '+ ' + totalMod : '- ' + Math.abs(totalMod)} = ${atkTotal} | AC ${enemy.ac}`
      : this.formatRollLine(atkRoll, totalMod, atkTotal, enemy.ac);
    this.showStatus(`${isCrit ? 'CRIT! ' : ''}${wasHidden ? 'SNEAK ' : ''}${abilityName} hit ${enemy.displayName} for ${dmg}! ${rollDisplay} | ${dmgText}`);
    const pWpn = WEAPON_DEFS[ps.weaponId ?? ''];
    const pDmgType = pWpn ? pWpn.damageType : '';
    withCombatLog((l: any) =>
      l.logRoll({ actor: 'You', target: enemy.displayName, result: isCrit ? 'crit' : 'hit', damage: dmg, rollDetail: rollDisplay, dmgDetail: `${dmgText}${pDmgType ? ' ' + pDmgType : ''}`, extra: wasHidden ? 'sneak attack' : '' }),
    );

    self._afterPlayerDice = () => {
      try {
        if (enemy.hp <= 0) {
          enemy.alive = false; enemy.inCombat = false;
          this.tweens.add({
            targets: [enemy.img, enemy.hpBg, enemy.hpFg, enemy.lbl, enemy.sightRing].filter((o) => o && (o as Phaser.GameObjects.GameObject).active),
            alpha: 0,
            duration: 500,
            onComplete: () => {
              (['img', 'hpBg', 'hpFg', 'lbl', 'sightRing', 'fa', 'dot', 'sprite', 'healthBar'] as const).forEach((k) => {
                const o = (enemy as unknown as Record<string, { destroy?: () => void } | null | undefined>)[k];
                if (!o || !o.destroy) return;
                try { o.destroy(); } catch (_) {}
                (enemy as unknown as Record<string, unknown>)[k] = null;
              });
            },
          });
          const ew2 = this.enemyWorldPos(enemy);
          this.spawnFloat(ew2.x, ew2.y - S / 2 - 10, 'DEFEATED!', '#f0c060', 700);
          try {
            if (typeof this.handleEnemyDefeatLoot === 'function') this.handleEnemyDefeatLoot(enemy);
          } catch (err) { console.warn('[Combat] Loot resolution failed on kill:', err); }
          withCombatLog((l: any) =>
            l.log(`${enemy.displayName} defeated! +${enemy.xp || 50} XP`, 'player', 'combat'),
          );
          (this.pStats as PStats).xp += enemy.xp || 50;
          this.executeAbilityHook('on_kill', { source: 'player', target: enemy });
          try { this.checkLevelUp(); } catch (err) { console.warn('[Combat] Level-up check failed on kill:', err); }
          if ((this.combatGroup as unknown as Enemy[]).every((e) => !e.alive)) {
            this.time.delayedCall(600, () => this.exitCombat());
            return;
          }
        }
        this.showMoveRange();
      } catch (err) {
        console.warn('[Combat] Post-hit resolution failed; forcing safe turn recovery:', err);
        this.showStatus('Recovered from combat error. Ending turn.');
        this.time.delayedCall(50, () => {
          if (this.mode === MODE.COMBAT) this.endPlayerTurn(true);
        });
      }
    };

    if (isCrit) {
      self.diceWaiting = 'player';
      const playerDetail = `Rolled a 20 — the best possible roll. You land a perfect strike and deal double damage! ${dmgText}`;
      const diceArray = wasHidden
        ? [{ sides: 20, value: atkRoll2!, kind: 'd20' }, { sides: 20, value: atkRoll, kind: 'd20' }, ...dr.diceValues]
        : [{ sides: 20, value: atkRoll, kind: 'd20' }, ...dr.diceValues];
      this.showDicePopup(rollDisplay, playerDetail, 'crit', diceArray);
    } else {
      this._finishPlayerAction();
    }
  },

  tryMoveAndAttack(this: GameScene, enemy: Enemy): void {
    if (!enemy || !enemy.alive || !(this.combatGroup as unknown as Enemy[]).includes(enemy)) return;
    if (!this.isPlayerTurn()) return;
    const self = this as unknown as { playerAP: number; playerMoves: number; playerMovesUsed: number; turnStartTile?: { x: number; y: number }; turnStartMoves?: number; _movingToAttack: boolean; _defaultAtkIdForMove?: string };
    if (self.playerAP <= 0) { this.showStatus('Action already used.'); return; }

    const anchor = self.turnStartTile || this.playerTile;
    const totalBudget = self.turnStartMoves ?? self.playerMoves;
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }];
    const moveBlk = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: false });
    let bestReachPath: { x: number; y: number }[] | null = null;
    let bestReachAdj: { x: number; y: number } | null = null;
    let bestWalkCost = Infinity, bestAnchorCost = Infinity;
    let reachable = false;

    for (const d of dirs) {
      const ax = enemy.tx + d.x, ay = enemy.ty + d.y;
      if (ax < 0 || ay < 0 || ax >= mapState.cols || ay >= mapState.rows || this.isWallTile(ax, ay)) continue;
      if ((this.enemies as unknown as Enemy[]).some((e) => e.alive && e.tx === ax && e.ty === ay)) continue;
      const pFromStart = bfs(anchor.x, anchor.y, ax, ay, moveBlk);
      if (!pFromStart.length) continue;
      const costFromStart = pathTileCost(pFromStart, anchor);
      if (costFromStart > totalBudget + 0.001) continue;
      reachable = true;
      const p = bfs(this.playerTile.x, this.playerTile.y, ax, ay, moveBlk);
      if (!p.length) continue;
      const walkCost = pathTileCost(p, this.playerTile);
      if (walkCost < bestWalkCost) {
        bestReachPath = p; bestReachAdj = { x: ax, y: ay }; bestWalkCost = walkCost; bestAnchorCost = costFromStart;
      }
    }

    if (bestReachPath && bestReachAdj) {
      const targetEnemy = enemy;
      this.clearMoveRange();
      self._movingToAttack = true;
      this.setDestination(bestReachAdj.x, bestReachAdj.y, () => {
        self._movingToAttack = false;
        self.playerMovesUsed = bestAnchorCost;
        self.playerMoves = Math.max(0, totalBudget - bestAnchorCost);
        this.updateResBar();
        if (self.playerAP > 0 && targetEnemy.alive) {
          const moveAtkId = self._defaultAtkIdForMove || 'attack';
          self._defaultAtkIdForMove = undefined;
          this.time.delayedCall(100, () => this.playerAttackEnemy(targetEnemy, moveAtkId));
        } else {
          this.showMoveRange();
        }
      });
      return;
    }

    if (reachable) {
      this.showStatus(`Can't reach ${enemy.displayName} — no clear path.`);
    } else {
      this.showStatus(`Can't reach ${enemy.displayName} — not enough movement.`);
    }
  },

  canFleeCombat(this: GameScene): { ok: boolean; reason: string } {
    if (this.mode !== MODE.COMBAT) return { ok: false, reason: 'Not in combat.' };
    const alive = (this.combatGroup as unknown as Enemy[]).filter((e) => e.alive);
    if (!alive.length) return { ok: true, reason: '' };

    const minDist = Math.max(1, Number(COMBAT_RULES.fleeMinDistance || 6));
    const nearest = alive.reduce((m, e) => Math.min(m, tileDist(e.tx, e.ty, this.playerTile.x, this.playerTile.y)), Infinity);
    if (nearest < minDist) {
      return { ok: false, reason: `Too close to enemies (need ${minDist}+ tiles).` };
    }

    if (COMBAT_RULES.fleeRequiresNoLOS !== false) {
      const seen = alive.some((e) =>
        this.canEnemySeeTile(e, this.playerTile.x, this.playerTile.y, { checkFOV: false, useEffectiveSight: false }),
      );
      if (seen) return { ok: false, reason: 'Cannot flee while enemies still have line of sight.' };
    }

    return { ok: true, reason: '' };
  },

  tryFleeCombat(this: GameScene): void {
    if (!this.isPlayerTurn()) return;
    const self = this as unknown as { playerAP: number };
    if (self.playerAP <= 0) { this.showStatus('Action already used.'); return; }

    const chk = this.canFleeCombat();
    if (!chk.ok) { this.showStatus(`Flee failed: ${chk.reason}`); return; }

    self.playerAP = 0;
    this.processStatusEffectsForActor('player', 'on_action', { actionId: 'flee' });
    this.snapshotMoveResetAnchor();
    this.clearPendingAction();
    this.updateResBar();
    this.setActionButtonsUsed(true);
    withHotbar((h: any) => h.markAllUsed(true));
    this.showStatus('Flee successful. Breaking away...');
    this.time.delayedCall(140, () => this.exitCombat('flee'));
  },

  _finishPlayerAction(this: GameScene): void {
    if (this._afterPlayerDice) {
      const cb = this._afterPlayerDice;
      this._afterPlayerDice = null;
      cb();
    }
  },

  _handleDiceDismiss(this: GameScene): void {
    clearTimeout((this as unknown as { _diceAutoTimer?: ReturnType<typeof setTimeout> })._diceAutoTimer);
    const ov = document.getElementById('dice-ov');
    if (ov) ov.classList.remove('show');
    if (this.diceWaiting === 'enemy') {
      this.diceWaiting = false;
      if (this._pendingEnemyTurnActor) {
        this.processStatusEffectsForActor(this._pendingEnemyTurnActor, 'turn_end');
        this._pendingEnemyTurnActor = null;
      }
      this.advanceEnemyTurn();
    } else if (this.diceWaiting === 'player') {
      this.diceWaiting = false;
      if (this._afterPlayerDice) { const cb = this._afterPlayerDice; this._afterPlayerDice = null; cb(); }
    } else {
      this.diceWaiting = false;
    }
  },
};

declare module '@/game' {
  interface GameScene {
    rollInitiativeOrder(combatGroup: unknown[], surprisedEnemies?: Set<unknown>): { id: string; surprised?: boolean; enemy?: unknown; roll: number; mod: number; init: number }[];
    findApproachPathToEnemy(enemy: unknown, maxSteps?: number): { path: { x: number; y: number }[]; dest: { x: number; y: number }; partial: boolean } | null;
    _isEnemyAwareOfPlayer(enemy: unknown): boolean;
    _roomTileCount(roomId: number | null): number;
    _isLargeOpenRoom(roomId: number | null): boolean;
    _roomJoinDistanceFor(roomId: number | null): number;
    _perceivedCombatant(enemy: unknown, combatants: unknown[], maxDist: number): unknown;
    _joinReasonLabelForEnemy(enemy: unknown, triggerSet: unknown, alertedSet: unknown, px: number, py: number): string;
    _buildAlertedEnemySet(triggers: unknown[], opts?: Record<string, unknown>): Set<unknown>;
    tryEngageEnemyFromExplore(enemy: unknown): void;
    executeEngageOpenerAttack(enemy: unknown): void;
    enterCombat(triggers: unknown[], opts?: Record<string, unknown>): void;
    exitCombat(reason?: string): void;
    onTapCombat(tx: number, ty: number, enemy: unknown, ptr: unknown): void;
    startNextTurn(): void;
    endPlayerTurn(fromStatusSkip?: boolean): void;
    _clearPendingSpotWarnings(): void;
    _updatePendingSpotWarnings(): void;
    _predictNewAlertedAtTileDetailed(px: number, py: number): { enemy: unknown; reason: string; source?: unknown }[];
    _checkForNewEnemiesAfterMove(): void;
    isPlayerTurn(): boolean;
    snapshotMoveResetAnchor(): void;
    resetMove(): void;
    selectAction(action: string): void;
    clearPendingAction(): void;
    _isAttackAbility(id: string): boolean;
    calcHitChance(enemy: unknown, abilityId?: string): number;
    _showHitTooltip(enemy: unknown): void;
    _hideHitTooltip(): void;
    updateHitLabels(): void;
    hideHitLabels(): void;
    playerAttackEnemy(enemy: unknown, abilityId?: string): void;
    tryMoveAndAttack(enemy: unknown): void;
    canFleeCombat(): { ok: boolean; reason: string };
    tryFleeCombat(): void;
    _finishPlayerAction(): void;
    _handleDiceDismiss(): void;

    syncExploreBar(): void;
    clearSightOverlays(): void;
    clearPathDots(): void;
    clearDetectMarkers(): void;
    showDetectedEnemyMarker(enemy: unknown): void;
    buildInitBar(): void;
    initActionButtons(): void;
    resetActionButtons(): void;
    setSelectedActionButton(id: string): void;
    setActionButtonsUsed(v: boolean): void;
    updateResBar(): void;
    syncEnemySightRings(v: boolean): void;
    drawSightOverlays(): void;
    isTileVisibleToPlayer(tx: number, ty: number): boolean;
    tileLightLevel(tx: number, ty: number): number;
    effectiveEnemySight(enemy: unknown): number;
    flashBanner(text: string, mode: string): void;
    showStatus(msg: string): void;
    updateFogOfWar(): void;
    updateHUD(): void;
    spawnFloat(x: number, y: number, text: string, color: string, duration?: number): void;
    enemyWorldPos(enemy: unknown): { x: number; y: number };
    dmgColor(damageType?: string): string;
    resolveAbilityDamage(abilityId: string, actor: string, isCrit: boolean): { total: number; diceValues: { sides: number; value: number; kind: string }[] };
    applyAbilityOnHitStatuses(abilityId: string, actor: string, enemy: unknown): void;
    handleEnemyDefeatLoot(enemy: unknown): void;
    checkLevelUp(): void;
    getAbilityDef(id: string): unknown;
    tryHideAction(): void;
    isDoorPassable(x: number, y: number): boolean;
    toggleDoor(x: number, y: number): void;
    formatRollLine(roll: number, mod: number, total: number, dc: number): string;
    formatDamageBreakdown(dr: { total: number; diceValues: unknown[] }): string;
    showDicePopup(rollLine: string, detail: string, kind: string, dice: { sides: number; value: number; kind: string }[]): void;
    processStatusEffectsForActor(actor: unknown, phase: string, opts?: Record<string, unknown>): { skipTurn?: boolean };
    setDestination(tx: number, ty: number, onArrival?: (() => void) | null, finalPos?: { wx: number; wy: number } | null): void;
    isBlockedTile(x: number, y: number, opts?: Record<string, unknown>): boolean;
    isWallTile(x: number, y: number): boolean;
    isDoorTile(x: number, y: number): boolean;
    isExploreMode(): boolean;
    showMoveRange(): void;
    clearMoveRange(): void;
    showAtkRange(): void;
    clearAtkRange(): void;
    showFleeZone(): void;
    clearFleeZone(): void;
    _perceivedCombatant(enemy: unknown, combatants: unknown[], maxDist: number): unknown;
  }
}
