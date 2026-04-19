import Phaser from 'phaser';
import { MODE, type PlayerStats } from '@/config';
import type { Enemy } from '@/types/actors';

/**
 * Stub scene class. Task 10 ports the full js/game.js body; until then this
 * declaration exists purely so mixin augmentations have a target — each
 * src/systems/*.ts contributes its methods via `declare module '@/game'`.
 */
export class GameScene extends Phaser.Scene {
  mode: typeof MODE[keyof typeof MODE] = MODE.EXPLORE;

  // Runtime state populated by create(); declared here so mixins can read/write
  // without littering `this as any` everywhere.
  pStats!: PlayerStats;
  playerHP = 0;
  playerMaxHP = 0;
  playerTile: { x: number; y: number } = { x: 0, y: 0 };
  isMoving = false;
  movePath: { x: number; y: number }[] = [];
  onArrival: (() => void) | null = null;
  pathDots: Phaser.GameObjects.GameObject[] = [];
  _movingToAttack = false;
  lastCompletedTile: { x: number; y: number } = { x: 0, y: 0 };
  rangeTiles: { x: number; y: number }[] = [];
  atkRangeTiles: { x: number; y: number }[] = [];
  sightTiles: { x: number; y: number }[] = [];
  fogVisited: boolean[][] = [];
  fogVisible: boolean[][] = [];
  detectMarkers: Phaser.GameObjects.GameObject[] = [];
  combatGroup: unknown[] = [];
  turnOrder: unknown[] = [];
  turnIndex = 0;
  playerAP = 1;
  playerMoves = 5;
  playerMovesUsed = 0;
  pendingAction: unknown = null;
  diceWaiting = false;
  _afterPlayerDice: (() => void) | null = null;
  turnStartTile: { x: number; y: number } = { x: 0, y: 0 };
  enemySightEnabled = true;
  playerHidden = false;
  playerStealthRoll = 0;
  playerEffects: unknown[] = [];
  _pendingEnemyTurnActor: unknown = null;
  _queuedEngageEnemy: unknown = null;
  _engageInProgress = false;
  _suppressExploreSightChecks = false;
  mapLights: { x: number; y: number; radius?: number; level?: string }[] = [];
  globalLight: 'dark' | 'dim' | 'bright' = 'dark';
  doorStates: Record<string, unknown> = {};
  tileSprites: Phaser.GameObjects.Image[][] = [];
  stageSprites: (Phaser.GameObjects.Sprite & Record<string, unknown>)[] = [];

  enemies: Enemy[] = [];
  player!: Phaser.GameObjects.Sprite;
  turnHL!: Phaser.GameObjects.Image;
  tapInd!: Phaser.GameObjects.Image;
  fogLayer!: Phaser.GameObjects.Image;
  _fogCanvasTex!: Phaser.Textures.CanvasTexture;
  _fogCtx!: CanvasRenderingContext2D;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  keyDelay = 0;
  ui: unknown = null;
  _entityTileIndex: unknown = null;
  _shadowPlayer: Phaser.GameObjects.Sprite | null = null;
  _fogLightRows: Float32Array[] | null = null;
  _fogTileAlphaRows: Float32Array[] | null = null;
  _fogLowResCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  _fogLowResCtx: CanvasRenderingContext2D | null = null;
  _fogLowResImage: ImageData | null = null;

  constructor() {
    super('GameScene');
  }

  isExploreMode(): boolean {
    return this.mode === MODE.EXPLORE;
  }
}
