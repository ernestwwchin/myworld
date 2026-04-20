import type { GameScene } from '@/game';

export interface MenuOption {
  label: string;
  icon: string;
  action: string;
  enabled: boolean;
}

export interface GameEntity {
  id: string;
  x: number;
  y: number;
  kind: string;
  sprite?: Phaser.GameObjects.Image;
  open?: boolean;
  getTexture(): string | null;
  getLabel(): string;
  needsAdjacency(): boolean;
  blocksMovement(scene: GameScene | null): boolean;
  blocksSight(): boolean;
  getMenuOptions(scene: GameScene | null): MenuOption[];
  interact(scene: GameScene | null, action: string, opts?: Record<string, unknown>): { ok?: boolean; reason?: string; kind?: string } | null | undefined;
  getType?(): string;
}
