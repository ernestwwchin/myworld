import Phaser from 'phaser';
import {
  MODE, MAP, TILE, COMBAT_RULES, PLAYER_STATS, ABILITY_DEFS, STATUS_DEFS,
  S, mapState, dnd,
  type PlayerStats,
} from '@/config';
import type { Enemy } from '@/types/actors';
import { getCharFrame, getTileTex, generateSprites, generateAnims } from '@/sprites';
import { withHotbar, withSidePanel } from '@/helpers';
import { tileDist } from '@/systems/world-position-system';
import { EventRunner } from '@/systems/event-runner';
import { DialogRunner } from '@/systems/dialog-runner';

import { AbilitySystemMixin } from '@/systems/ability-system';
import { CameraSystemMixin } from '@/systems/camera-system';
import { ChestHandlerMixin } from '@/systems/chest-handler';
import { DamageSystemMixin } from '@/systems/damage-system';
import { DoorHandlerMixin } from '@/systems/door-handler';
import { EntitySystemMixin } from '@/systems/entity-system';
import { FloorItemHandlerMixin } from '@/systems/floor-item-handler';
import { FogSystemMixin } from '@/systems/fog-system';
import { InputSystemMixin } from '@/systems/input-system';
import { InventorySystemMixin } from '@/systems/inventory-system';
import { LevelingSystemMixin } from '@/systems/leveling-system';
import { LightSystemMixin } from '@/systems/light-system';
import { MovementSystemMixin } from '@/systems/movement-system';
import { SightSystemMixin } from '@/systems/sight-system';
import { StatusEffectSystemMixin } from '@/systems/status-effect-system';
import { WorldPositionSystemMixin } from '@/systems/world-position-system';

import { CombatAIMixin } from '@/modes/combat-ai';
import { CombatRangesMixin } from '@/modes/combat-ranges';
import { ModeCombatMixin } from '@/modes/mode-combat';
import { ModeExploreMixin } from '@/modes/mode-explore';

import { ActionButtonsMixin } from '@/ui/action-buttons';

interface GameUI {
  showCombatEnemyPopup(enemy: unknown): void;
  showEnemyStatPopup(enemy: unknown): void;
  showDicePopup(rollLine: string, detail: string, type: string, diceValues: unknown): void;
  updateResBar(): void;
  buildInitBar(): void;
  flashBanner(text: string, type: string): void;
  showStatus(msg: string): void;
  updateHUD(): void;
  updateStatsPanel(): void;
}

export class GameScene extends Phaser.Scene {
  mode: typeof MODE[keyof typeof MODE] = MODE.EXPLORE;

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
  atkRangeTiles: Phaser.GameObjects.GameObject[] = [];
  sightTiles: { x: number; y: number }[] = [];
  fogVisited: boolean[][] = [];
  fogVisible: boolean[][] = [];
  detectMarkers: Phaser.GameObjects.GameObject[] = [];
  combatGroup: unknown[] = [];
  turnOrder: { id: string; surprised?: boolean; enemy?: unknown; roll?: number; mod?: number; init?: number }[] = [];
  turnIndex = 0;
  playerAP = 1;
  playerMoves = 5;
  playerMovesUsed = 0;
  pendingAction: unknown = null;
  diceWaiting: string | false = false;
  _afterPlayerDice: (() => void) | null = null;
  turnStartTile: { x: number; y: number } = { x: 0, y: 0 };
  turnStartMoves = 5;
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
  stageSprites: (Phaser.GameObjects.Image & Record<string, unknown>)[] = [];

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
  ui: GameUI | null = null;
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

  log(category: string, message: string, data: unknown = null): void {
    const style = 'color: #c9a84c; font-weight: bold;';
    console.log(`%c[${category}]%c ${message}`, style, '', data || '');
  }

  logCombat(action: string, details: unknown): void {
    console.group(`%c⚔ COMBAT: ${action}`, 'color: #e74c3c; font-weight: bold;');
    console.table(details);
    console.groupEnd();
  }

  static DMG_COLORS: Record<string, string> = {
    slashing: '#ffffff', piercing: '#e0e0e0', bludgeoning: '#d0d0d0',
    fire: '#ff6b35', cold: '#64d8cb', lightning: '#f0e060',
    thunder: '#b388ff', poison: '#66bb6a', acid: '#c6ff00',
    necrotic: '#ce93d8', radiant: '#fff59d', psychic: '#f48fb1',
    force: '#90caf9',
  };

  dmgColor(type: string): string {
    return GameScene.DMG_COLORS[type] || '#ffdd57';
  }

  fmtSigned(n: unknown): string {
    const v = Number(n) || 0;
    return v >= 0 ? `+${v}` : `${v}`;
  }

  formatRollLine(roll: number, mod: number, total: number, ac: number): string {
    const m = Number(mod) || 0;
    return `d20(${roll}) ${m >= 0 ? '+ ' + m : '- ' + Math.abs(m)} = ${total} | AC ${ac}`;
  }

  formatDamageBreakdown(dr: { total: number; bonus?: number; isCrit?: boolean; baseRolls?: { kind: string; value: number }[]; critRolls?: { kind: string; value: number }[] } | unknown): string {
    if (!dr || typeof dr !== 'object') return String(dr || '');
    const { total, bonus, isCrit, baseRolls, critRolls } = dr as {
      total: number;
      bonus?: number;
      isCrit?: boolean;
      baseRolls?: { kind: string; value: number }[];
      critRolls?: { kind: string; value: number }[];
    };
    const bonusStr = bonus ? (bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`) : '';

    const groupRolls = (rolls: { kind: string; value: number }[]) => {
      const groups: Record<string, { kind: string; values: number[] }> = {};
      for (const r of rolls) {
        const k = r.kind;
        if (!groups[k]) groups[k] = { kind: k, values: [] };
        groups[k].values.push(r.value);
      }
      return Object.values(groups).map((g) => `${g.values.length}${g.kind}(${g.values.join(',')})`).join('+');
    };

    if (isCrit && critRolls && critRolls.length > 0 && baseRolls) {
      return `${groupRolls(baseRolls)} + ${groupRolls(critRolls)} [CRIT]${bonusStr} = ${total}`;
    }
    return `${groupRolls(baseRolls || [])}${bonusStr} = ${total}`;
  }

  isWallTile(x: number, y: number): boolean {
    const v = MAP?.[y]?.[x];
    return v === TILE.WALL || v === '#';
  }

  isDoorTile(x: number, y: number): boolean {
    if (!this._entityTileIndex) return false;
    return this.hasEntityType(x, y, 'door');
  }

  isChestTile(x: number, y: number): boolean {
    if (!this._entityTileIndex) return false;
    return this.hasEntityType(x, y, 'chest');
  }

  isBlockedTile(
    x: number,
    y: number,
    { doorMode = 'passable' as 'passable' | 'closed' | false, excludeEnemy = null as unknown, skipEnemies = false } = {},
  ): boolean {
    if (this.isWallTile(x, y)) return true;
    if (doorMode === 'passable' && this.isDoorTile(x, y) && !this.isDoorPassable(x, y)) return true;
    if (doorMode === 'closed' && this.isDoorTile(x, y) && this.isDoorClosed(x, y)) return true;
    if (!skipEnemies && (this.enemies as Enemy[]).some((e) => e.alive && e.tx === x && e.ty === y && e !== excludeEnemy)) return true;
    return false;
  }

  canMoveDiagonal(ox: number, oy: number, nx: number, ny: number): boolean {
    const hBlk = this.isWallTile(nx, oy) || (this.isDoorTile(nx, oy) && this.isDoorClosed(nx, oy));
    const vBlk = this.isWallTile(ox, ny) || (this.isDoorTile(ox, ny) && this.isDoorClosed(ox, ny));
    return !(hBlk && vBlk);
  }

  preload(): void {
    generateSprites(this);
  }

  create(): void {
    const ROWS = mapState.rows;
    const COLS = mapState.cols;

    generateAnims(this);
    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.mode = MODE.EXPLORE;
    this.pStats = Object.assign({}, PLAYER_STATS);
    this.pStats.features = [...PLAYER_STATS.features];
    this.pStats.savingThrows = new Set(PLAYER_STATS.savingThrows);
    this.pStats.inventory = [...PLAYER_STATS.inventory];
    this.pStats.equippedWeapon = PLAYER_STATS.equippedWeapon ? { ...PLAYER_STATS.equippedWeapon } : null;
    this.pStats.equippedArmor = PLAYER_STATS.equippedArmor ? { ...PLAYER_STATS.equippedArmor } : null;
    this.pStats.baseAC = PLAYER_STATS.baseAC || this.pStats.ac;
    (this.pStats as Record<string, unknown>)._statMods = [];
    this.playerHP = this.pStats.maxHP;
    this.playerMaxHP = this.pStats.maxHP;
    this.playerTile = { x: PLAYER_STATS.startTile.x, y: PLAYER_STATS.startTile.y };
    this.isMoving = false;
    this.movePath = [];
    this.onArrival = null;
    this.pathDots = [];
    this._movingToAttack = false;
    this.lastCompletedTile = { ...PLAYER_STATS.startTile };
    this.rangeTiles = [];
    this.atkRangeTiles = [];
    this.sightTiles = [];
    this.fogVisited = [];
    this.fogVisible = [];
    this.detectMarkers = [];
    this.combatGroup = [];
    this.turnOrder = [];
    this.turnIndex = 0;
    this.playerAP = 1;
    this.playerMoves = Number(COMBAT_RULES.playerMovePerTurn || 5);
    this.playerMovesUsed = 0;
    this.pendingAction = null;
    this.diceWaiting = false;
    this._afterPlayerDice = null;
    this.turnStartTile = { ...PLAYER_STATS.startTile };
    this.enemySightEnabled = true;
    this.playerHidden = false;
    this.playerStealthRoll = 0;
    this.playerEffects = [];
    this._pendingEnemyTurnActor = null;
    this._queuedEngageEnemy = null;
    this._engageInProgress = false;
    this._suppressExploreSightChecks = false;
    this.mapLights = [];
    this.globalLight = 'dark';
    this.doorStates = {};
    this.tileSprites = [];
    this.stageSprites = [];

    for (let r = 0; r < ROWS; r++) {
      this.tileSprites[r] = [];
      for (let c = 0; c < COLS; c++) {
        const t = MAP[r][c];
        let k = 't_floor';
        if (this.isWallTile(c, r)) k = 't_wall';
        else if (t === TILE.STAIRS) k = 't_stairs';
        else if (t === TILE.WATER) k = 't_water';
        else if (t === TILE.GRASS) k = 't_grass';
        const tex = getTileTex(k);
        this.tileSprites[r][c] = this.add.image(c * S + S / 2, r * S + S / 2, tex[0], tex[1]).setDisplaySize(S, S);
      }
    }
    this.startTileAnimations();
    this.spawnStageSprites();

    const _usedTiles = new Set<string>([`${this.playerTile.x},${this.playerTile.y}`]);
    const _randomFloorTile = (minDist = 6): { x: number; y: number } => {
      const px = this.playerTile.x, py = this.playerTile.y;
      const candidates: { x: number; y: number }[] = [];
      for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
        if (MAP[y][x] !== TILE.FLOOR) continue;
        if (Math.abs(x - px) + Math.abs(y - py) < minDist) continue;
        if (_usedTiles.has(`${x},${y}`)) continue;
        candidates.push({ x, y });
      }
      if (!candidates.length) return { x: px + 2, y: py };
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      _usedTiles.add(`${pick.x},${pick.y}`);
      return pick;
    };

    const s = this;
    this.enemies = (this.getEnemyDefs() as Array<Record<string, unknown>>).map((rawDef) => {
      let def = rawDef;
      if ((def.tx as number) < 0) {
        const t = _randomFloorTile();
        def = { ...def, tx: t.x, ty: t.y };
      }
      const [eatlas, eframe] = getCharFrame(String(def.type || 'goblin'), 'idle', 0);
      const tx = Number(def.tx), ty = Number(def.ty);
      const img = this.add.sprite(tx * S + S / 2, ty * S + S / 2, eatlas, eframe)
        .setScale(S / 16).setOrigin(0.5, 0.8).setDepth(9).setInteractive();
      const hpBg = this.add.rectangle(tx * S + S / 2, ty * S - 4, S - 8, 5, 0x1a1a2e)
        .setOrigin(0.5, 0.5).setDepth(11);
      const hpFg = this.add.rectangle(tx * S + S / 2 - (S - 8) / 2, ty * S - 4, S - 8, 5, 0xe74c3c)
        .setOrigin(0, 0.5).setDepth(12);
      const lbl = this.add.text(tx * S + S / 2, ty * S + S / 2 + S * 0.52, '', {
        fontSize: '7px', color: '#aaaacc', letterSpacing: 1,
      }).setOrigin(0.5).setDepth(12).setAlpha(0.7);
      const sight = Number(def.sight || 5);
      const sightRing = this.add.circle(tx * S + S / 2, ty * S + S / 2, sight * S, 0xe74c3c, 0)
        .setDepth(2).setStrokeStyle(1, 0xe74c3c, 0.08).setAlpha(0);

      const faGfx = this.add.graphics().setDepth(8);
      faGfx.x = tx * S + S / 2;
      faGfx.y = ty * S + S / 2;
      const _drawFacing = (facing: number): void => {
        faGfx.clear();
        const r = S * 0.45;
        faGfx.lineStyle(1.5, 0xe74c3c, 0.5);
        faGfx.strokeCircle(0, 0, r);
        const ang = (facing || 0) * Math.PI / 180;
        const ax = Math.cos(ang) * r, ay = Math.sin(ang) * r;
        const sz = 5;
        const a1 = ang + Math.PI * 0.8, a2 = ang - Math.PI * 0.8;
        faGfx.fillStyle(0xe74c3c, 0.9);
        faGfx.fillTriangle(
          ax + Math.cos(ang) * sz, ay + Math.sin(ang) * sz,
          ax + Math.cos(a1) * sz, ay + Math.sin(a1) * sz,
          ax + Math.cos(a2) * sz, ay + Math.sin(a2) * sz,
        );
      };
      _drawFacing(Number(def.facing || 0));
      const fa = faGfx as Phaser.GameObjects.Graphics & { draw: (facing: number) => void };
      fa.draw = _drawFacing;

      const enemy = {
        ...def, img, hpBg, hpFg, lbl, sightRing, fa,
        alive: true, inCombat: false,
        lastSeenPlayerTile: { x: tx, y: ty },
        searchTurnsRemaining: 0,
      } as unknown as Enemy;
      (enemy as Record<string, unknown>).effects = this.normalizeEffects(
        (def.effects as unknown[] || def.statuses as unknown[] || []),
      );

      const hitLbl = this.add.text(tx * S + S / 2, ty * S - 14, '', {
        fontSize: '10px', fontFamily: '"Courier New",monospace', fontStyle: 'bold',
        color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(13).setAlpha(0);
      (enemy as Record<string, unknown>).hitLbl = hitLbl;

      this.playActorIdle(img, String(def.type || 'goblin'));

      img.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (ptr.rightButtonDown()) {
          (enemy as Record<string, unknown>)._rightClicked = true;
          if (s.mode === MODE.COMBAT) s.showCombatEnemyPopup(enemy);
          else s.showEnemyStatPopup(enemy);
          return;
        }
        (enemy as Record<string, unknown>)._pressTimer = s.time.delayedCall(400, () => {
          (enemy as Record<string, unknown>)._longPressed = true;
          if (s.mode === MODE.COMBAT) s.showCombatEnemyPopup(enemy);
          else s.showEnemyStatPopup(enemy);
        });
      });
      img.on('pointerup', () => {
        const et = enemy as Record<string, unknown>;
        if (et._pressTimer) { (et._pressTimer as Phaser.Time.TimerEvent).remove(); et._pressTimer = null; }
        if (et._longPressed) { et._longPressed = false; return; }
        if (et._rightClicked) { et._rightClicked = false; return; }
        s.onTapEnemy(enemy);
      });
      img.on('pointerover', () => {
        if (enemy.alive) img.setTint(0xffddaa);
      });
      img.on('pointerout', () => {
        const et = enemy as Record<string, unknown>;
        if (et._pressTimer) { (et._pressTimer as Phaser.Time.TimerEvent).remove(); et._pressTimer = null; }
        et._longPressed = false;
        img.clearTint();
      });

      return enemy;
    });

    this._assignEnemyDisplayNames();

    const [patlas, pframe] = getCharFrame('player', 'idle', 0);
    this.player = this.add.sprite(
      this.playerTile.x * S + S / 2, this.playerTile.y * S + S / 2,
      patlas, pframe,
    ).setScale(S / 16).setOrigin(0.5, 0.8).setDepth(10);
    this.playActorIdle(this.player, 'player');

    this.turnHL = this.add.image(-100, -100, 't_turn').setDisplaySize(S, S).setDepth(9).setAlpha(0);
    this.tapInd = this.add.image(-100, -100, 't_tap').setDisplaySize(24, 24).setDepth(8).setAlpha(0);

    if (this.textures.exists('_fog_rt')) this.textures.remove('_fog_rt');
    this._fogCanvasTex = this.textures.createCanvas('_fog_rt', COLS * S, ROWS * S)!;
    this._fogCtx = this._fogCanvasTex.getContext() as CanvasRenderingContext2D;
    this.fogLayer = this.add.image(0, 0, '_fog_rt').setOrigin(0, 0).setDepth(15);

    this.fogVisited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    this.fogVisible = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    this.cameras.main.removeBounds();
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setDeadzone(0, 0);
    this.cameras.main.setFollowOffset(0, 0);
    this.cameras.main.setZoom(1.2);

    this.initCameraControls();

    const hz = this.add.zone(0, 0, COLS * S, ROWS * S).setOrigin(0, 0).setDepth(0).setInteractive();
    hz.on('pointerdown', (ptr: Phaser.Input.Pointer) => this._onHzPointerDown(ptr));
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this._onHzPointerMove(ptr));
    this.input.on('pointerup', () => this._onHzPointerUp());
    this.initInputHandlers();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
    this.keyDelay = 0;

    this.input.keyboard!.on('key-h', () => {
      if (this.isExploreMode()) this.tryHideInExplore();
    });

    const eHide = document.getElementById('btn-explore-hide');
    const eSight = document.getElementById('btn-explore-sight');
    const eStats = document.getElementById('btn-explore-stats');
    if (eHide) eHide.onclick = () => { if (this.isExploreMode()) this.tryHideInExplore(); this.syncExploreBar(); };
    if (eSight) eSight.onclick = () => { this.toggleEnemySight(); this.syncExploreBar(); };
    if (eStats) eStats.onclick = () => {
      const w = window as unknown as Record<string, unknown>;
      if (typeof w.toggleStats === 'function') (w.toggleStats as () => void)();
    };
    this.syncExploreBar();

    this.initActionButtons();
    const btnRmove = document.getElementById('btn-rmove');
    const btnEnd = document.getElementById('btn-end');
    if (btnRmove) btnRmove.onclick = () => this.resetMove();
    if (btnEnd) btnEnd.onclick = () => this.endPlayerTurn();

    const meta = (window as unknown as { _MAP_META?: { lights?: { x: number; y: number; radius?: number; level?: string }[]; globalLight?: string } })._MAP_META;
    this.mapLights = (meta && Array.isArray(meta.lights)) ? meta.lights : [];
    this.globalLight = (meta && meta.globalLight)
      ? String(meta.globalLight).toLowerCase() as 'dark' | 'dim' | 'bright'
      : 'dark';

    this.initEntities();

    const w = window as unknown as Record<string, unknown>;
    w._isDoorClosed = (x: number, y: number) => this.isDoorClosed(x, y);
    w._isDoorPassable = (x: number, y: number) => this.isDoorPassable(x, y);
    w._tileBlocksSight = (x: number, y: number) => {
      const ents = this.getEntitiesAt(x, y);
      return ents.some((e: unknown) => (e as { blocksSight(): boolean }).blocksSight());
    };
    w._tileBlocksMovement = (x: number, y: number) => {
      const ents = this.getEntitiesAt(x, y);
      return ents.some((e: unknown) => (e as { blocksMovement(s: GameScene): boolean }).blocksMovement(this));
    };

    const GameUIController = w.GameUIController as (new (scene: GameScene) => GameUI) | undefined;
    if (GameUIController) this.ui = new GameUIController(this);

    withSidePanel((sidePanel) => (sidePanel as { init(s: GameScene): void }).init(this));
    withHotbar((hotbar) => (hotbar as { init(s: GameScene): void }).init(this));

    this.updateHUD();
    this.updateStatsPanel();
    this.playerEffects = this.normalizeEffects(
      (this.pStats as Record<string, unknown>).effects as unknown[] || [],
    );
    this.drawSightOverlays();
    this.updateFogOfWar();
    this.time.addEvent({ delay: 1200, loop: true, callback: () => { if (this.mode === MODE.EXPLORE) this.wanderEnemies(); } });
    this.startExploreStatusTicker();

    const modData = (w.ModLoader as { _modData?: { _stageEvents?: unknown[]; _stageDialogs?: Record<string, unknown> } } | undefined)?._modData;
    EventRunner.init(this, (modData?._stageEvents || []) as Parameters<typeof EventRunner.init>[1]);
    DialogRunner.init(this, (modData?._stageDialogs || {}) as Parameters<typeof DialogRunner.init>[1]);
    w.EventRunner = EventRunner;
    w.DialogRunner = DialogRunner;

    console.log(
      `[GameScene] create() complete — mode:${this.mode} map:${COLS}x${ROWS} enemies:${this.enemies.length}`
      + ` player:(${this.playerTile.x},${this.playerTile.y})`
      + ` floor:${(meta as Record<string, unknown>)?.floor} nextStage:${(meta as Record<string, unknown>)?.nextStage}`,
    );
  }

  playActorIdle(sprite: unknown, type: unknown): void {
    const sp = sprite as Phaser.GameObjects.Sprite | null;
    if (!sp || !sp.anims) return;
    const key = `anim_${type}_idle`;
    if (this.anims.exists(key)) sp.anims.play(key, true);
  }

  playActorMove(sprite: unknown, type: unknown, isRun = false): void {
    const sp = sprite as Phaser.GameObjects.Sprite | null;
    if (!sp || !sp.anims) return;
    const key = isRun ? `anim_${type}_run` : `anim_${type}_walk`;
    if (this.anims.exists(key)) sp.anims.play(key, true);
  }

  startTileAnimations(): void {
    const ROWS = mapState.rows;
    const COLS = mapState.cols;
    const meta = (window as unknown as { _MAP_META?: { tileAnimations?: { enabled?: boolean; speedMs?: number } } })._MAP_META;
    const cfg = (meta && meta.tileAnimations) || {};
    if ((cfg as { enabled?: boolean }).enabled === false) return;
    const speed = Math.max(180, Number((cfg as { speedMs?: number }).speedMs || 420));
    (this as unknown as Record<string, unknown>).tileAnimPhase = 0;
    this.time.addEvent({ delay: speed, loop: true, callback: () => {
      const self = this as unknown as { tileAnimPhase: number };
      self.tileAnimPhase = (self.tileAnimPhase + 1) % 2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const t = MAP[y][x];
        if (t === TILE.WATER) {
          this.tileSprites[y][x].setTexture(self.tileAnimPhase === 0 ? 't_water_1' : 't_water_2');
        } else if (t === TILE.GRASS) {
          this.tileSprites[y][x].setTexture(self.tileAnimPhase === 0 ? 't_grass_1' : 't_grass_2');
        }
      }
    } });
  }

  spawnStageSprites(): void {
    const ROWS = mapState.rows;
    const COLS = mapState.cols;
    const meta = (window as unknown as { _MAP_META?: { stageSprites?: unknown[] } })._MAP_META;
    const defs = (meta && Array.isArray(meta.stageSprites)) ? meta.stageSprites as Record<string, unknown>[] : [];
    this.stageSprites = [];
    for (const sp of defs) {
      const tx = Number(sp.x), ty = Number(sp.y);
      if (Number.isNaN(tx) || Number.isNaN(ty) || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) continue;
      const type = String(sp.type || sp.key || '').toLowerCase();
      const key = String(
        sp.texture || sp.key ||
        (type === 'torch' ? 'deco_torch' : type === 'banner' ? 'deco_banner' : type === 'crystal' ? 'deco_crystal' : 'deco_torch'),
      );
      const texArgs = getTileTex(key);
      if (!this.textures.exists(texArgs[0])) continue;
      const depth = Number(sp.depth || 6);
      const alpha = Math.max(0, Math.min(1, Number(sp.alpha ?? 1)));
      const scale = Math.max(0.3, Number(sp.scale || 1));
      const img = this.add.image(tx * S + S / 2, ty * S + S / 2, texArgs[0], texArgs[1])
        .setDepth(depth).setAlpha(alpha).setScale(scale) as Phaser.GameObjects.Image & Record<string, unknown>;
      img._stageType = type;
      img._stageLit = !(sp.state && (sp.state as Record<string, unknown>).lit === false);
      img._stageLightLevel = String(sp.lightLevel || (type === 'torch' ? 'bright' : 'dim')).toLowerCase();
      img._stageLightRadius = Math.max(0, Number(sp.lightRadius || (type === 'torch' ? 3 : 0)));
      if (sp.pulse) {
        const amp = Math.max(0.02, Number(sp.pulseAmount || 0.07));
        this.tweens.add({ targets: img, alpha: { from: Math.max(0, alpha - amp), to: Math.min(1, alpha + amp) }, duration: 700, yoyo: true, repeat: -1 });
      }
      this.stageSprites.push(img);
    }
  }

  normalizeEffects(list: unknown[]): unknown[] {
    if (!Array.isArray(list)) return [];
    return list.map((raw) => {
      const e = { ...(raw || {}) } as Record<string, unknown>;
      const id = String(e.id || e.type || 'effect').toLowerCase();
      return {
        ...e,
        id,
        type: String(e.type || id).toLowerCase(),
        trigger: String(e.trigger || 'turn_start').toLowerCase(),
        duration: Number(e.duration ?? e.turns ?? 3),
        elapsedMs: 0,
      };
    });
  }

  actorLabel(actor: unknown): string {
    if (actor === 'player') return (this.pStats as Record<string, unknown>)?.name as string || 'Player';
    return (actor as Record<string, unknown>)?.type as string || 'Enemy';
  }

  getAbilityDef(id: string | null | undefined): unknown {
    if (!id) return null;
    return ABILITY_DEFS?.[id] || null;
  }

  _parseAbilityModifierToken(tok: unknown, actor: unknown): number {
    const t = String(tok || '').toLowerCase();
    if (!t) return 0;
    if (t === 'prof') return Number((actor as Record<string, unknown>)?.profBonus || (this.pStats as Record<string, unknown>)?.profBonus || 0);
    if (t.startsWith('ability:')) {
      const st = t.split(':')[1];
      if (actor === 'player') return dnd.mod((this.pStats as Record<string, number>)?.[st] || 10);
      return dnd.mod(((actor as Record<string, unknown>)?.stats as Record<string, number>)?.[st] || 10);
    }
    const n = Number(tok);
    return Number.isFinite(n) ? n : 0;
  }

  _resolveAbilityDamageSpec(actor: unknown, ability: unknown): unknown {
    const tpl = (ability as Record<string, unknown>)?.template as Record<string, unknown> || {};
    const dmg = tpl.damage as Record<string, unknown> || {};
    const base = dmg.base;
    let spec: unknown = (actor as Record<string, unknown>)?.damageFormula || (this.pStats as Record<string, unknown>)?.damageFormula || '1d4';
    if (Array.isArray(base) && base.length >= 3) {
      spec = [Number(base[0]), Number(base[1]), Number(base[2])];
    } else if (typeof base === 'string' && /^\d*d\d+/i.test(base)) {
      spec = base;
    } else if (base === 'actorAttack' || base === 'weapon') {
      spec = (actor as Record<string, unknown>)?.damageFormula || (this.pStats as Record<string, unknown>)?.damageFormula || '1d4';
    }
    const addMods = Array.isArray(dmg.addMods) ? dmg.addMods as unknown[] : [];
    const bonus = addMods.reduce((sum: number, m: unknown) => sum + this._parseAbilityModifierToken(m, actor), 0);
    const norm = dnd.normalizeDamageSpec(spec as import('@/config').DamageSpec);
    (norm as unknown as Record<string, unknown>).bonus = Number((norm as unknown as Record<string, unknown>).bonus || 0) + bonus;
    return norm;
  }

  resolveAbilityDamage(abilityId: string, actor: unknown = 'player', isCrit = false): unknown {
    const ability = this.getAbilityDef(abilityId);
    const spec = ability
      ? this._resolveAbilityDamageSpec(actor, ability)
      : ((actor as Record<string, unknown>)?.damageFormula || (this.pStats as Record<string, unknown>)?.damageFormula || '1d4');
    return dnd.rollDamageSpec(spec as import('@/config').DamageSpec, isCrit);
  }

  evaluateSaveChecks(receiver: unknown, saveCfg: unknown): { resisted: boolean; details: string } {
    if (!saveCfg) return { resisted: false, details: '' };
    const cfg = saveCfg as Record<string, unknown>;
    const checks = Array.isArray(cfg.checks)
      ? cfg.checks as { stat?: string; dc?: number }[]
      : [{ stat: cfg.stat as string, dc: Number(cfg.dc) }];
    const mode = String(cfg.mode || 'all').toLowerCase();
    if (!checks.length) return { resisted: false, details: '' };

    const results = checks.map((ch) => {
      const stat = String(ch?.stat || 'con').toLowerCase();
      const dc = Number(ch?.dc || 10);
      const mod = (receiver === 'player')
        ? dnd.mod((this.pStats as Record<string, number>)?.[stat] || 10)
        : dnd.mod(((receiver as Record<string, unknown>)?.stats as Record<string, number>)?.[stat] || 10);
      const roll = dnd.roll(1, 20) + mod;
      return { stat, dc, roll, pass: roll >= dc };
    });

    const resisted = mode === 'any' ? results.some((r) => r.pass) : results.every((r) => r.pass);
    const details = results.map((r) => `${r.stat.toUpperCase()} ${r.roll}/${r.dc}`).join(', ');
    return { resisted, details };
  }

  applyAbilityOnHitStatuses(abilityId: string, actor: unknown, target: unknown): void {
    const ability = this.getAbilityDef(abilityId);
    if (!ability) return;
    const statuses = ((ability as Record<string, unknown>)?.template as Record<string, unknown>)?.onHit as Record<string, unknown>;
    const statusList = statuses?.statuses;
    if (!Array.isArray(statusList) || !statusList.length) return;
    const caster = actor === 'player' ? 'player' : actor;
    for (const s of statusList as Record<string, unknown>[]) {
      const statusId = String(s.id || s.type || 'effect').toLowerCase();
      const base = (STATUS_DEFS && STATUS_DEFS[statusId]) ? STATUS_DEFS[statusId] as Record<string, unknown> : {};
      const scope = String(s.applyTo || s.target || 'target').toLowerCase();
      let receiver = target;
      if (scope === 'caster' || scope === 'self') receiver = caster;
      if (scope === 'target' && !receiver) continue;

      const saveCfg = s.save || base.save || null;
      if (saveCfg) {
        const saveRes = this.evaluateSaveChecks(receiver, saveCfg);
        if (saveRes.resisted) {
          this.showStatus(`${this.actorLabel(receiver)} resisted ${statusId}${saveRes.details ? ` (${saveRes.details})` : ''}.`);
          continue;
        }
      } else {
        const chance = Math.max(0, Math.min(1, Number(s.chance ?? base.chance ?? 1)));
        if (Math.random() > chance) continue;
      }

      const fx = this.actorEffects(receiver as import('@/types/actors').Actor);
      fx.push({
        ...base, ...s,
        id: statusId,
        type: String(s.type || base.type || statusId).toLowerCase(),
        trigger: String(s.trigger || base.trigger || 'turn_end').toLowerCase(),
        duration: Number(s.duration ?? base.duration ?? 2),
        onTrigger: { ...(base.onTrigger as object || {}), ...(s.onTrigger as object || {}) },
        elapsedMs: 0,
      });
      this.showStatus(`${this.actorLabel(receiver)} is affected by ${statusId}.`);
    }
  }

  _assignEnemyDisplayNames(): void {
    const counts: Record<string, number> = {};
    for (const e of this.enemies) counts[String(e.type || '')] = (counts[String(e.type || '')] || 0) + 1;
    const indices: Record<string, number> = {};
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const e of this.enemies) {
      const eRec = e as Record<string, unknown>;
      if (eRec.name) {
        e.displayName = String(eRec.name);
      } else {
        const raw = String(e.type || e.id || 'Unknown');
        const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
        const typeKey = String(e.type || '');
        if (counts[typeKey] > 1) {
          const idx = indices[typeKey] = (indices[typeKey] || 0);
          e.displayName = `${cap} ${LETTERS[idx] || idx + 1}`;
          indices[typeKey] = idx + 1;
        } else {
          e.displayName = cap;
        }
      }
      if (e.lbl) e.lbl.setText((e.displayName || '').toUpperCase());
    }
  }

  getEnemyPassivePerception(enemy: unknown): number {
    const e = enemy as { stats: Record<string, number>; level?: number; skillProficiencies?: Set<string> };
    const wiseMod = Math.floor((e.stats.wis - 10) / 2);
    const profBonus = e.skillProficiencies?.has('perception')
      ? dnd.profBonus(e.level || 1)
      : 0;
    return 10 + wiseMod + profBonus;
  }

  syncExploreBar(): void {
    const bar = document.getElementById('explore-bar');
    if (bar) {
      const show = this.isExploreMode();
      bar.classList.toggle('hidden', !show);
      const hideBtn = document.getElementById('btn-explore-hide');
      if (hideBtn) hideBtn.classList.toggle('active', !!this.playerHidden);
      const sightBtn = document.getElementById('btn-explore-sight');
      if (sightBtn) sightBtn.classList.toggle('off', !this.enemySightEnabled);
    }
    withHotbar((hotbar) => {
      const h = hotbar as { setExpanded(v: boolean): void; syncCommandStrip(): void; updateResourcePips(): void };
      h.setExpanded(this.mode === MODE.COMBAT);
      h.syncCommandStrip();
      h.updateResourcePips();
    });
  }

  onTapEnemy(enemy: unknown): void {
    const e = enemy as Enemy & Record<string, unknown>;
    if (!e.alive) return;

    if (this.mode === MODE.COMBAT) {
      if (!this.isPlayerTurn()) return;
      if (this.playerAP <= 0) { this.showStatus('Action already used this turn.'); return; }
      if (!this.combatGroup.includes(enemy)) {
        (this.combatGroup as unknown[]).push(enemy);
        (enemy as Record<string, unknown>).inCombat = true;
        this.turnOrder = this.rollInitiativeOrder(this.combatGroup as unknown as Array<{ alive: boolean; id?: string }>);
        this.showStatus(`${(enemy as Record<string, unknown>).displayName || 'Enemy'} joined the battle!`);
        this.updateFogOfWar();
        return;
      }

      let abilityId: string;
      if (this.pendingAction === 'attack') {
        abilityId = (this as unknown as Record<string, unknown>)._pendingAtkAbilityId as string || 'attack';
        this.clearPendingAction();
      } else {
        abilityId = 'attack';
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.Hotbar !== 'undefined') {
          const H = w.Hotbar as { getEffectiveDefaultAttack(): string; getDefaultAttackId(): string; _getAbilityDef(id: string): { name?: string } | null };
          abilityId = H.getEffectiveDefaultAttack();
          if (abilityId !== H.getDefaultAttackId()) {
            const defName = H._getAbilityDef(H.getDefaultAttackId())?.name || H.getDefaultAttackId();
            this.showStatus(`${defName} unavailable — using basic attack.`);
          }
        }
      }
      const d = tileDist(this.playerTile.x, this.playerTile.y, e.tx, e.ty);
      const atkR = (this.pStats as Record<string, unknown>).atkRange as number || 1;
      if (d <= atkR + 0.5) {
        this.playerAttackEnemy(enemy, abilityId);
      } else {
        (this as unknown as Record<string, unknown>)._defaultAtkIdForMove = abilityId;
        this.tryMoveAndAttack(enemy);
      }
      return;
    }

    if (this.isExploreMode()) {
      if (this.isMoving) this.cancelCurrentMove();
      if (typeof this.tryEngageEnemyFromExplore === 'function') {
        this.tryEngageEnemyFromExplore(enemy);
      } else {
        this.enterCombat([enemy]);
      }
    }
  }

  showCombatEnemyPopup(enemy: unknown): void {
    if (this.ui) this.ui.showCombatEnemyPopup(enemy);
  }

  showEnemyStatPopup(enemy: unknown): void {
    if (this.ui) this.ui.showEnemyStatPopup(enemy);
  }

  showDicePopup(rollLine: string, detailLine: string, type: string, diceValues: unknown): void {
    if (this.ui) this.ui.showDicePopup(rollLine, detailLine, type, diceValues);
  }

  updateResBar(): void {
    if (this.ui) this.ui.updateResBar();
    if (this.updateHitLabels) this.updateHitLabels();
  }

  buildInitBar(): void {
    if (this.ui) this.ui.buildInitBar();
  }

  flashBanner(text: string, type: string): void {
    if (this.ui) this.ui.flashBanner(text, type);
  }

  spawnFloat(x: number, y: number, text: string, color: string, delay = 0): void {
    const spawn = () => {
      const t = this.add.text(x, y, text, {
        fontSize: '20px', color, stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(31);
      this.tweens.add({ targets: t, y: y - 50, duration: 1600, ease: 'Power2' });
      this.tweens.add({ targets: t, alpha: 0, duration: 600, delay: 1000, ease: 'Linear', onComplete: () => t.destroy() });
    };
    if (delay > 0) this.time.delayedCall(delay, spawn); else spawn();
  }

  showStatus(msg: string): void {
    if (this.ui) this.ui.showStatus(msg);
  }

  updateHUD(): void {
    if (this.ui) this.ui.updateHUD();
  }

  updateStatsPanel(): void {
    if (this.ui) this.ui.updateStatsPanel();
  }

  getEnemyDefs(): unknown[] {
    return (window as unknown as Record<string, unknown>).ENEMY_DEFS as unknown[] || [];
  }

  override update(_time: number, delta: number): void {
    if (this.diceWaiting) { this.keyDelay = 0; return; }
    if (!this.isExploreMode()) return;
    const self = this as unknown as { _holdMoveActive?: boolean };
    if (self._holdMoveActive && !this.isMoving) { this._holdMoveStep(); return; }
    this.updateExplore(delta);
    this._checkWasdIdle();
  }
}

Object.assign(
  GameScene.prototype,
  WorldPositionSystemMixin,
  LightSystemMixin,
  FogSystemMixin,
  SightSystemMixin,
  DamageSystemMixin,
  StatusEffectSystemMixin,
  EntitySystemMixin,
  AbilitySystemMixin,
  InventorySystemMixin,
  LevelingSystemMixin,
  MovementSystemMixin,
  CameraSystemMixin,
  InputSystemMixin,
  DoorHandlerMixin,
  ChestHandlerMixin,
  FloorItemHandlerMixin,
  CombatRangesMixin,
  CombatAIMixin,
  ModeExploreMixin,
  ModeCombatMixin,
  ActionButtonsMixin,
);
