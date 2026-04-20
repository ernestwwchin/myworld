import { S, COMBAT_RULES, mapState } from '@/config';
import { DIRS8 } from '@/helpers';
import { tileDist } from '@/systems/world-position-system';
import type { GameScene } from '@/game';

type BlockFn = (x: number, y: number) => boolean;

function _floodReachable(
  sx: number, sy: number,
  budget: number,
  blockFn: BlockFn,
): Map<string, number> {
  const costMap = new Map<string, number>();
  costMap.set(`${sx},${sy}`, 0);
  const pq: { x: number; y: number; cost: number }[] = [{ x: sx, y: sy, cost: 0 }];
  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const cur = pq.shift()!;
    const curKey = `${cur.x},${cur.y}`;
    if ((costMap.get(curKey) ?? Infinity) < cur.cost) continue;
    for (const d of DIRS8) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= mapState.cols || ny >= mapState.rows) continue;
      if (blockFn(nx, ny)) continue;
      if (d.x !== 0 && d.y !== 0 && blockFn(nx, cur.y) && blockFn(cur.x, ny)) continue;
      const stepCost = Math.sqrt(d.x * d.x + d.y * d.y);
      const nc = cur.cost + stepCost;
      if (nc > budget + 0.001) continue;
      const key = `${nx},${ny}`;
      if (!costMap.has(key) || costMap.get(key)! > nc + 0.001) {
        costMap.set(key, nc);
        pq.push({ x: nx, y: ny, cost: nc });
      }
    }
  }
  return costMap;
}

function _drawSurface(
  scene: GameScene,
  tileSet: Set<string>,
  allTiles: { x: number; y: number }[],
  fillColor: number,
  fillAlpha: number,
  borderColor: number,
  borderAlpha: number,
  depth: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(fillColor, fillAlpha);
  for (const t of allTiles) g.fillRect(t.x * S, t.y * S, S, S);
  if (borderAlpha > 0) {
    g.lineStyle(2, borderColor, borderAlpha);
    for (const t of allTiles) {
      const { x, y } = t;
      if (!tileSet.has(`${x},${y - 1}`)) g.lineBetween(x * S, y * S, (x + 1) * S, y * S);
      if (!tileSet.has(`${x + 1},${y}`)) g.lineBetween((x + 1) * S, y * S, (x + 1) * S, (y + 1) * S);
      if (!tileSet.has(`${x},${y + 1}`)) g.lineBetween(x * S, (y + 1) * S, (x + 1) * S, (y + 1) * S);
      if (!tileSet.has(`${x - 1},${y}`)) g.lineBetween(x * S, y * S, x * S, (y + 1) * S);
    }
  }
  return g;
}

export const CombatRangesMixin = {
  showMoveRange(this: GameScene): void {
    this.clearMoveRange();
    const anchor = this.turnStartTile || this.playerTile;
    const budget = this.turnStartMoves || this.playerMoves || 0;
    if (budget <= 0) return;
    const px = anchor.x, py = anchor.y;

    const moveBlk = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: false });
    const reachable = _floodReachable(px, py, budget, moveBlk);

    const cpx = this.playerTile.x, cpy = this.playerTile.y;
    const allTiles: { x: number; y: number }[] = [];
    for (const [key] of reachable) {
      const [tx, ty] = key.split(',').map(Number);
      allTiles.push({ x: tx, y: ty });
      if (tx === cpx && ty === cpy) continue;
      if ((this.enemies as unknown as { alive?: boolean; tx: number; ty: number }[]).some((e) => e.alive && e.tx === tx && e.ty === ty)) continue;
      this.rangeTiles.push({ x: tx, y: ty });
    }

    const tileSet = new Set([...reachable.keys()]);
    this._moveRangeGfx = _drawSurface(this, tileSet, allTiles, 0x3498db, 0.18, 0x5dade2, 0.50, 3);

    if (this.combatGroup && this.combatGroup.length) {
      const dangerTiles: { x: number; y: number }[] = [];
      for (const t of allTiles) {
        const predicted = typeof this._predictNewAlertedAtTile === 'function'
          ? this._predictNewAlertedAtTile(t.x, t.y)
          : [];
        if (predicted.length) dangerTiles.push(t);
      }
      if (dangerTiles.length) {
        const dangerSet = new Set(dangerTiles.map((t) => `${t.x},${t.y}`));
        this._moveSpotGfx = _drawSurface(this, dangerSet, dangerTiles, 0xe74c3c, 0.16, 0xff6b6b, 0.55, 4);
      }
    }
  },

  clearMoveRange(this: GameScene): void {
    if (this._moveRangeGfx) { this._moveRangeGfx.destroy(); this._moveRangeGfx = null; }
    if (this._moveSpotGfx) { this._moveSpotGfx.destroy(); this._moveSpotGfx = null; }
    this.rangeTiles = [];
  },

  inMoveRange(this: GameScene, tx: number, ty: number): boolean {
    return this.rangeTiles.some((r) => r.x === tx && r.y === ty);
  },

  showAtkRange(this: GameScene): void {
    this.clearAtkRange();
    if (!this.combatGroup || !this.combatGroup.length) return;
    const anchor = this.turnStartTile || this.playerTile;
    const px = anchor.x, py = anchor.y;
    const atkRange = (this.pStats as { atkRange?: number }).atkRange || 1;
    const moves = this.turnStartMoves || this.playerMoves || 0;
    const moveBlk = (x: number, y: number) => this.isBlockedTile(x, y, { doorMode: false });

    const reachable = _floodReachable(px, py, moves, moveBlk);
    const moveTiles: { x: number; y: number }[] = [];
    const moveSet = new Set<string>();
    for (const [key] of reachable) {
      const [tx, ty] = key.split(',').map(Number);
      moveTiles.push({ x: tx, y: ty });
      moveSet.add(key);
    }

    const attackSet = new Set<string>();
    const atkOnlyTiles: { x: number; y: number }[] = [];
    for (const [key] of reachable) {
      const [rx, ry] = key.split(',').map(Number);
      const rng = Math.ceil(atkRange) + 1;
      for (let dy = -rng; dy <= rng; dy++) {
        for (let dx = -rng; dx <= rng; dx++) {
          if (tileDist(0, 0, dx, dy) > atkRange + 0.01) continue;
          const ax = rx + dx, ay = ry + dy;
          if (ax < 0 || ay < 0 || ax >= mapState.cols || ay >= mapState.rows) continue;
          const k = `${ax},${ay}`;
          if (!attackSet.has(k)) {
            attackSet.add(k);
            if (!moveSet.has(k)) atkOnlyTiles.push({ x: ax, y: ay });
          }
        }
      }
    }

    const moveGfx = _drawSurface(this, moveSet, moveTiles, 0x3498db, 0.10, 0, 0, 3);
    this.atkRangeTiles.push(moveGfx);

    if (atkOnlyTiles.length) {
      const atkFringeSet = new Set(atkOnlyTiles.map((t) => `${t.x},${t.y}`));
      const fullSet = new Set([...moveSet, ...atkFringeSet]);
      const atkGfx = _drawSurface(this, fullSet, atkOnlyTiles, 0xe74c3c, 0.08, 0xe74c3c, 0.35, 3);
      this.atkRangeTiles.push(atkGfx);
    }

    for (const e of this.combatGroup) {
      const enemy = e as { alive: boolean; tx: number; ty: number; img?: Phaser.GameObjects.Image };
      if (!enemy.alive || !enemy.img) continue;
      if (attackSet.has(`${enemy.tx},${enemy.ty}`)) {
        const bright = this.add.image(enemy.tx * S + S / 2, enemy.ty * S + S / 2, 't_atk')
          .setDisplaySize(S, S).setDepth(5).setAlpha(1);
        this.atkRangeTiles.push(bright);
      } else {
        try {
          const g = this.add.graphics().setDepth(5);
          g.lineStyle(2, 0xe74c3c, 0.3);
          g.strokeRoundedRect(enemy.tx * S + 3, enemy.ty * S + 3, S - 6, S - 6, 8);
          this.atkRangeTiles.push(g);
        } catch (_e) {}
      }
    }
    this.showStatus('Select an enemy to attack.');
  },

  clearAtkRange(this: GameScene): void {
    (this.atkRangeTiles as Phaser.GameObjects.Graphics[]).forEach((o) => o.destroy());
    this.atkRangeTiles = [];
  },

  showFleeZone(this: GameScene): void {
    this.clearFleeZone();
    this._fleeZoneTiles = [];
    const alive = (this.combatGroup as { alive: boolean; tx: number; ty: number }[]).filter((e) => e.alive);
    if (!alive.length) return;
    const minDist = Math.max(1, Number(COMBAT_RULES.fleeMinDistance || 6));
    const checkLOS = COMBAT_RULES.fleeRequiresNoLOS !== false;
    const tiles: { x: number; y: number }[] = [];
    const fleeSet = new Set<string>();
    for (let y = 0; y < mapState.rows; y++) {
      for (let x = 0; x < mapState.cols; x++) {
        if (this.isWallTile(x, y)) continue;
        const nearest = alive.reduce((m, e) => Math.min(m, tileDist(e.tx, e.ty, x, y)), Infinity);
        if (nearest < minDist) continue;
        if (checkLOS) {
          const seen = alive.some((e) =>
            this.canEnemySeeTile(e, x, y, { checkFOV: false, useEffectiveSight: false }),
          );
          if (seen) continue;
        }
        tiles.push({ x, y });
        fleeSet.add(`${x},${y}`);
      }
    }
    const g = _drawSurface(this, fleeSet, tiles, 0x2ecc71, 0.18, 0x2ecc71, 0.45, 16);
    this._fleeZoneTiles.push(g);
  },

  clearFleeZone(this: GameScene): void {
    if (this._fleeZoneTiles) {
      (this._fleeZoneTiles as Phaser.GameObjects.Graphics[]).forEach((o) => o.destroy());
    }
    this._fleeZoneTiles = [];
  },
};

declare module '@/game' {
  interface GameScene {
    _moveRangeGfx: Phaser.GameObjects.Graphics | null;
    _moveSpotGfx: Phaser.GameObjects.Graphics | null;
    _fleeZoneTiles: Phaser.GameObjects.Graphics[];

    showMoveRange(): void;
    clearMoveRange(): void;
    inMoveRange(tx: number, ty: number): boolean;
    showAtkRange(): void;
    clearAtkRange(): void;
    showFleeZone(): void;
    clearFleeZone(): void;
    _predictNewAlertedAtTile(px: number, py: number): unknown[];
  }
}
