import { S } from '@/config';
import type { GameScene } from '@/game';

export interface TilePos { x: number; y: number; }

export function tileToWorld(tx: number, ty: number): TilePos {
  return { x: tx * S + S / 2, y: ty * S + S / 2 };
}

export function worldToTile(wx: number, wy: number): TilePos {
  return { x: Math.floor(wx / S), y: Math.floor(wy / S) };
}

export function tileDist(x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pathTileCost(path: TilePos[], startTile: TilePos): number {
  let cost = 0;
  let prev = startTile;
  for (const step of path) {
    cost += tileDist(prev.x, prev.y, step.x, step.y);
    prev = step;
  }
  return cost;
}

export const WorldPositionSystemMixin = {
  worldLightLevel(this: GameScene, wx: number, wy: number): number {
    const t = worldToTile(wx, wy);
    return this.tileLightLevel(t.x, t.y);
  },

  playerWorldPos(this: GameScene): TilePos {
    return { x: this.player.x, y: this.player.y };
  },

  enemyWorldPos(this: GameScene, enemy: { img: { x: number; y: number } }): TilePos {
    return { x: enemy.img.x, y: enemy.img.y };
  },
};

declare module '@/game' {
  interface GameScene {
    worldLightLevel(wx: number, wy: number): number;
    playerWorldPos(): TilePos;
    enemyWorldPos(enemy: { img: { x: number; y: number } }): TilePos;
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.tileToWorld = tileToWorld;
  w.worldToTile = worldToTile;
  w.tileDist = tileDist;
  w.pathTileCost = pathTileCost;
}
