import { S, COMBAT_RULES, WEAPON_DEFS, dnd } from '@/config';
import { bfs, wallBlk, withCombatLog } from '@/helpers';
import { tileDist } from '@/systems/world-position-system';
import { decideAction } from '@/systems/ai-profiles';
import type { AIState, AITarget } from '@/systems/ai-profiles';
import type { GameScene } from '@/game';

const MOVE_SPEED = 440;

type Enemy = {
  alive: boolean;
  tx: number; ty: number;
  img?: Phaser.GameObjects.Image | null;
  hpBg?: Phaser.GameObjects.Rectangle | null;
  hpFg?: Phaser.GameObjects.Rectangle | null;
  lbl?: Phaser.GameObjects.Text | null;
  sightRing?: Phaser.GameObjects.Arc | null;
  fa?: { draw(facing: number): void } | null;
  displayName: string;
  type?: string;
  id?: string;
  stats: { str: number };
  spd: number;
  damageFormula: string;
  weaponId?: string;
  group?: string;
  facing?: number;
  searchTurnsRemaining: number;
  lastSeenPlayerTile: { x: number; y: number };
  _searchAbandonedAnnounced?: boolean;
};

export const CombatAIMixin = {
  advanceEnemyTurn(this: GameScene): void {
    this.diceWaiting = false;
    this._afterPlayerDice = null;

    if (this.playerHidden) {
      const allGivenUp = (this.combatGroup as unknown as Enemy[]).every(
        (e) => !e.alive || e.searchTurnsRemaining <= 0,
      );
      if (allGivenUp) {
        this.showStatus('All enemies have abandoned the search. You escaped!');
        withCombatLog((l: any) =>
          l.log('All enemies lost track of you. You escaped.', 'system', 'combat'),
        );
        this.time.delayedCall(400, () => this.exitCombat('escape'));
        return;
      }
    }

    this.turnIndex++;
    if (this.turnIndex >= this.turnOrder.length) this.turnIndex = 0;
    this.time.delayedCall(150, () => this.startNextTurn());
  },

  doEnemyTurn(this: GameScene, enemy: Enemy): void {
    if (!enemy.alive) { this.advanceEnemyTurn(); return; }
    this.tweens.add({ targets: enemy.img, alpha: 0.55, duration: 150, yoyo: true });

    if (this.playerHidden && this.canEnemySeePlayer(enemy)) {
      this._breakStealth(null);
      withCombatLog((l: any) =>
        l.log(`${enemy.displayName} spotted you and resumes chase.`, 'enemy', 'combat'),
      );
    }

    if (this.playerHidden && enemy.searchTurnsRemaining > 0) {
      enemy.searchTurnsRemaining--;
      if (enemy.searchTurnsRemaining === 0) {
        this.showStatus(`${enemy.displayName} gives up searching.`);
        withCombatLog((l: any) =>
          l.log(`${enemy.displayName} lost track of you and stops searching.`, 'enemy', 'combat'),
        );
        enemy._searchAbandonedAnnounced = true;
        const anySearching = (this.combatGroup as unknown as Enemy[]).some(
          (e) => e.alive && e.searchTurnsRemaining > 0,
        );
        if (!anySearching && this._shadowPlayer) {
          (this._shadowPlayer as Phaser.GameObjects.GameObject).destroy();
          this._shadowPlayer = null;
          this.showStatus('Shadow fades away as search is abandoned.');
        }
      }
    }

    let targetTile = this.playerTile;
    if (this.playerHidden && enemy.searchTurnsRemaining > 0) {
      targetTile = enemy.lastSeenPlayerTile;
    } else if (this.playerHidden && enemy.searchTurnsRemaining <= 0) {
      if (!enemy._searchAbandonedAnnounced) {
        withCombatLog((l: any) =>
          l.log(`${enemy.displayName} is no longer chasing you.`, 'enemy', 'combat'),
        );
        enemy._searchAbandonedAnnounced = true;
      }
      this.endEnemyTurn(enemy);
      return;
    } else if (!this.playerHidden) {
      if (enemy.searchTurnsRemaining > 0) {
        withCombatLog((l: any) =>
          l.log(`${enemy.displayName} reacquired you and continues the chase.`, 'enemy', 'combat'),
        );
      }
      enemy._searchAbandonedAnnounced = false;
      enemy.lastSeenPlayerTile = { x: this.playerTile.x, y: this.playerTile.y };
      enemy.searchTurnsRemaining = 0;
    }

    const isAdj = () => tileDist(enemy.tx, enemy.ty, targetTile.x, targetTile.y) <= 1.01;

    const afterMove = () => {
      this._checkForNewEnemiesAfterMove();
      if (this.playerHidden && this.canEnemySeePlayer(enemy)) {
        this._breakStealth(null);
      }
      if (this.playerHidden) { this.endEnemyTurn(enemy); return; }
      if (isAdj()) this.time.delayedCall(150, () => this.doEnemyAttack(enemy));
      else this.endEnemyTurn(enemy);
    };

    const aiState = this._buildAIState(enemy);
    const aiEnemies = this._buildAITargets();
    const aiAllies = this._buildAIAllies(enemy);
    const decision = decideAction(aiState, aiAllies, aiEnemies);

    const moveTo = (tx: number, ty: number, then: () => void) => {
      const blockFn = (_x: number, _y: number) => wallBlk(_x, _y);
      const path = bfs(enemy.tx, enemy.ty, tx, ty, blockFn);
      const enemyBudget = Math.max(1, Math.floor(enemy.spd * Number(COMBAT_RULES.enemySpeedScale || 1)));
      let budget = enemyBudget;
      const mp: { x: number; y: number }[] = [];
      let prev = { x: enemy.tx, y: enemy.ty };
      for (let i = 0; i < Math.max(0, path.length - 1); i++) {
        const t = path[i];
        const sc = tileDist(prev.x, prev.y, t.x, t.y);
        if (budget < sc - 0.001) break;
        if ((this.enemies as unknown as Enemy[]).some((e) => e.alive && e !== enemy && e.tx === t.x && e.ty === t.y)) break;
        if (!this.playerHidden && t.x === this.playerTile.x && t.y === this.playerTile.y) break;
        budget -= sc;
        mp.push(t);
        prev = t;
      }
      if (!mp.length) { then(); return; }
      const dest = mp[mp.length - 1];
      this.animEnemyMove(enemy, mp.slice(), () => {
        enemy.tx = dest.x;
        enemy.ty = dest.y;
        then();
      });
    };

    switch (decision.action) {
      case 'attack':
        if (isAdj()) {
          this.time.delayedCall(150, () => this.doEnemyAttack(enemy));
        } else {
          moveTo(targetTile.x, targetTile.y, afterMove);
        }
        break;
      case 'move':
        if (decision.moveToward) {
          moveTo(decision.moveToward.tx, decision.moveToward.ty, afterMove);
        } else {
          moveTo(targetTile.x, targetTile.y, afterMove);
        }
        break;
      case 'ability':
        withCombatLog((l: any) =>
          l.log(`${enemy.displayName} uses ${decision.abilityId || 'ability'}!`, 'enemy', 'combat'),
        );
        if (isAdj()) {
          this.time.delayedCall(150, () => this.doEnemyAttack(enemy));
        } else {
          this.endEnemyTurn(enemy);
        }
        break;
      default:
        this.endEnemyTurn(enemy);
    }
  },

  doEnemyAttack(this: GameScene, enemy: Enemy): void {
    const atkMod = dnd.mod(enemy.stats.str);
    const atkRoll = dnd.roll(1, 20);
    const atkTotal = atkRoll + atkMod;
    const isCrit = atkRoll === 20;
    const isMiss = atkRoll === 1 || (!isCrit && atkTotal < (this.pStats as { ac: number }).ac);
    const rollLine = this.formatRollLine(atkRoll, atkMod, atkTotal, (this.pStats as { ac: number }).ac);
    this._pendingEnemyTurnActor = enemy;

    if (isMiss) {
      this.spawnFloat(this.player.x, this.player.y - 10, atkRoll === 1 ? 'NAT 1!' : 'MISS', '#7fc8f8');
      this.showStatus(`${enemy.displayName} missed! ${rollLine}`);
      withCombatLog((l: any) =>
        l.logRoll({ actor: enemy.displayName, target: 'You', result: atkRoll === 1 ? 'crit' : 'miss', rollDetail: rollLine }),
      );
      if (atkRoll === 1) {
        this.diceWaiting = 'enemy';
        this.showDicePopup(rollLine, 'Rolled a 1 — the worst possible roll. The attack fumbles automatically, no matter how tough you are.', 'miss', [{ sides: 20, value: atkRoll, kind: 'd20' }]);
      } else {
        this._finishEnemyTurn(enemy);
      }
      return;
    }
    const dr = dnd.rollDamageSpec(enemy.damageFormula, isCrit);
    const dmg = Math.max(1, dr.total);
    (this as unknown as { playerHP: number }).playerHP = Math.max(0, (this as unknown as { playerHP: number }).playerHP - dmg);
    this.cameras.main.shake(180, 0.006);
    this.tweens.add({ targets: this.player, alpha: 0.3, duration: 80, yoyo: true, repeat: 2 });
    this.spawnFloat(this.player.x, this.player.y - 10, isCrit ? `💥${dmg}` : `-${dmg}`, '#e74c3c');
    const dmgText = this.formatDamageBreakdown(dr);
    this.showStatus(`${enemy.displayName}${isCrit ? ' CRITS' : ' hits'} for ${dmg}! ${dmgText}`);
    const eWpn = enemy.weaponId ? WEAPON_DEFS[enemy.weaponId] : null;
    const eDmgType = eWpn ? eWpn.damageType : '';
    withCombatLog((l: any) =>
      l.logRoll({ actor: enemy.displayName, target: 'You', result: isCrit ? 'crit' : 'hit', damage: dmg, rollDetail: rollLine, dmgDetail: `${dmgText}${eDmgType ? ' ' + eDmgType : ''}` }),
    );
    this.updateHUD();
    if ((this as unknown as { playerHP: number }).playerHP <= 0) {
      this.showStatus('You have been defeated...');
      withCombatLog((l: any) =>
        l.log('You have been defeated...', 'enemy', 'combat'),
      );
      if (typeof this.handlePlayerDefeat === 'function') this.handlePlayerDefeat();
    }
    if (isCrit) {
      this.diceWaiting = 'enemy';
      const enemyDetail = `Rolled a 20 — the best possible roll. ${enemy.displayName} lands a perfect strike and deals double damage! ${dmgText}`;
      this.showDicePopup(rollLine, enemyDetail, 'crit', [{ sides: 20, value: atkRoll, kind: 'd20' }, ...dr.diceValues]);
    } else {
      this._finishEnemyTurn(enemy);
    }
  },

  animEnemyMove(
    this: GameScene,
    enemy: Enemy,
    path: { x: number; y: number }[],
    onDone: () => void,
    _prevTx?: number,
    _prevTy?: number,
  ): void {
    if (!path.length) { onDone(); return; }
    const step = path.shift()!;
    const nx = step.x * S + S / 2, ny = step.y * S + S / 2;
    const fromX = _prevTx !== undefined ? _prevTx : enemy.tx;
    const fromY = _prevTy !== undefined ? _prevTy : enemy.ty;
    const fdx = step.x - fromX, fdy = step.y - fromY;
    if (fdx || fdy) enemy.facing = Math.atan2(fdy, fdx) * 180 / Math.PI;
    const dx = nx - (enemy.img?.x ?? nx), dy = ny - (enemy.img?.y ?? ny);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dur = Math.max(40, (dist / MOVE_SPEED) * 1000);
    this.playActorMove(enemy.img, enemy.type, enemy.spd >= 2);
    this.tweens.add({ targets: enemy.img, x: nx, y: ny, duration: dur, ease: 'Linear', onComplete: () => this.animEnemyMove(enemy, path, onDone, step.x, step.y) });
    this.tweens.add({ targets: enemy.hpBg, x: nx, y: step.y * S - 4, duration: dur });
    this.tweens.add({ targets: enemy.hpFg, x: nx - (S - 8) / 2, y: step.y * S - 4, duration: dur });
    this.tweens.add({ targets: enemy.lbl, x: nx, y: ny + S * 0.52, duration: dur });
    this.tweens.add({ targets: enemy.sightRing, x: nx, y: ny, duration: dur });
    if (enemy.fa) {
      this.tweens.add({ targets: enemy.fa, x: nx, y: step.y * S + S / 2, duration: dur });
      enemy.fa.draw(enemy.facing ?? 0);
    }
    if (!path.length) this.time.delayedCall(dur + 10, () => this.playActorIdle(enemy.img, enemy.type));
  },

  _buildAIState(this: GameScene, enemy: Enemy): AIState {
    const ai = (enemy as Record<string, unknown>).ai as Record<string, unknown> | undefined;
    return {
      profile: (ai?.profile as AIState['profile']) || 'basic',
      preferredRange: Number(ai?.preferredRange || 6),
      abilities: (ai?.abilities || (enemy as Record<string, unknown>).abilities || []) as AIState['abilities'],
      hp: (enemy as { hp?: number }).hp ?? 0,
      maxHp: (enemy as { maxHp?: number }).maxHp ?? 1,
      tx: enemy.tx,
      ty: enemy.ty,
    };
  },

  _buildAITargets(this: GameScene): AITarget[] {
    return [{
      hp: this.playerHP,
      maxHp: this.playerMaxHP,
      tx: this.playerTile.x,
      ty: this.playerTile.y,
    }];
  },

  _buildAIAllies(this: GameScene, enemy: Enemy): AITarget[] {
    return (this.combatGroup as unknown as Enemy[])
      .filter(e => e.alive && e !== enemy)
      .map(e => ({
        hp: (e as { hp?: number }).hp ?? 0,
        maxHp: (e as { maxHp?: number }).maxHp ?? 1,
        tx: e.tx,
        ty: e.ty,
        isAlly: true,
        statuses: [],
      }));
  },

  _finishEnemyTurn(this: GameScene, enemy: Enemy): void {
    if (this._pendingEnemyTurnActor) {
      this.processStatusEffectsForActor(this._pendingEnemyTurnActor, 'turn_end');
      this._pendingEnemyTurnActor = null;
    }
    this.time.delayedCall(400, () => this.advanceEnemyTurn());
  },
};

declare module '@/game' {
  interface GameScene {
    advanceEnemyTurn(): void;
    doEnemyTurn(enemy: unknown): void;
    doEnemyAttack(enemy: unknown): void;
    animEnemyMove(enemy: unknown, path: { x: number; y: number }[], onDone: () => void, prevTx?: number, prevTy?: number): void;
    _buildAIState(enemy: unknown): AIState;
    _buildAITargets(): AITarget[];
    _buildAIAllies(enemy: unknown): AITarget[];
    _finishEnemyTurn(enemy: unknown): void;
    endEnemyTurn(enemy: unknown): void;
    handlePlayerDefeat(): void;

    canEnemySeePlayer(enemy: unknown): boolean;
    canEnemySeeTile(enemy: unknown, tx: number, ty: number, opts?: Record<string, unknown>): boolean;
    _breakStealth(msg: string | null): void;
    _checkForNewEnemiesAfterMove(): void;
    playActorMove(img: unknown, type: unknown, fast?: boolean): void;
    playActorIdle(img: unknown, type: unknown): void;
    formatRollLine(roll: number, mod: number, total: number, dc: number): string;
    formatDamageBreakdown(dr: { total: number; diceValues: unknown[] }): string;
    showDicePopup(rollLine: string, detail: string, kind: string, dice: { sides: number; value: number; kind: string }[]): void;
    processStatusEffectsForActor(actor: unknown, phase: string, opts?: Record<string, unknown>): { skipTurn?: boolean };

    _pendingEnemyTurnActor: unknown;
  }
}
