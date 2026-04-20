import { S, TILE, MAP, DOOR_RULES, mapState } from '@/config';
import { bfs } from '@/helpers';
import { tileDist } from '@/systems/world-position-system';
import { getTileTex } from '@/sprites';
import type { GameScene } from '@/game';

interface GameEntity {
  id: string;
  x: number;
  y: number;
  kind: string;
  sprite?: Phaser.GameObjects.Image;
  open?: boolean;
  getTexture(): string | null;
  getLabel(): string;
  needsAdjacency(): boolean;
  blocksMovement(scene: GameScene): boolean;
  getMenuOptions(scene: GameScene): Array<{ enabled: boolean; icon: string; label: string; action: string }>;
  interact(scene: GameScene, action: string): { ok?: boolean } | null | undefined;
  getType?: () => string;
}

type EntityCtor = new (raw: Record<string, unknown>) => GameEntity;

declare const DoorEntity: EntityCtor;
declare const ChestEntity: EntityCtor;
declare const InteractableEntity: EntityCtor;

interface ActionDef {
  enabled: boolean;
  icon: string;
  label: string;
  action: string;
  entity: GameEntity;
}

export const EntitySystemMixin = {
  initEntities(this: GameScene): void {
    this.entities = [];
    this.entityById = {};
    this._entityTileIndex = {};
    this.doorEntities = {};
    this.chestEntities = {};
    this._entitySprites = {};

    const isDoor = (x: number, y: number): boolean => {
      const v = MAP?.[y]?.[x];
      return v === TILE.DOOR || v === 'D';
    };
    const isChest = (x: number, y: number): boolean => {
      const v = MAP?.[y]?.[x];
      return v === TILE.CHEST || v === 'C';
    };

    for (let y = 0; y < mapState.rows; y++) {
      for (let x = 0; x < mapState.cols; x++) {
        if (isDoor(x, y)) {
          this._registerEntity(
            new DoorEntity({
              id: `door:${x},${y}`,
              x,
              y,
              open: false,
              locked: false,
              auto: !!DOOR_RULES.defaultAuto,
              behavior: 'standard',
            }),
          );
        } else if (isChest(x, y)) {
          this._registerEntity(
            new ChestEntity({
              id: `chest:${x},${y}`,
              x,
              y,
              lootTable: 'starter_common',
            }),
          );
        }
      }
    }

    const meta = (window as unknown as { _MAP_META?: Record<string, unknown> })._MAP_META || {};
    const legacyDoors = (Array.isArray(meta.doors) ? (meta.doors as Array<Record<string, unknown>>) : []).map(
      (d) => ({ ...d, kind: 'door' }),
    );
    const interactables = Array.isArray(meta.interactables)
      ? (meta.interactables as Array<Record<string, unknown>>)
      : [];
    const defs = [...legacyDoors, ...interactables] as Array<Record<string, unknown>>;

    for (const raw of defs) {
      const kind = String(raw.kind || raw.type || '').toLowerCase();
      const x = Number(raw.x);
      const y = Number(raw.y);

      if (kind === 'door' && MAP[y] && isDoor(x, y)) {
        this._registerEntity(
          new DoorEntity({
            id: (raw.id as string) || `door:${x},${y}`,
            x,
            y,
            open: !!raw.open,
            locked: !!raw.locked,
            auto: raw.auto === undefined ? !!DOOR_RULES.defaultAuto : !!raw.auto,
            behavior: raw.behavior || (raw.locked ? 'locked' : 'standard'),
            keyId: raw.keyId || null,
            closeDelayMs: raw.closeDelayMs,
            tags: raw.tags || [],
            state: raw.state || {},
          }),
        );
      } else if (kind === 'chest') {
        this._registerEntity(
          new ChestEntity({
            id: (raw.id as string) || `chest:${x},${y}`,
            x,
            y,
            open: !!raw.open,
            locked: !!raw.locked,
            keyId: raw.keyId || null,
            behavior: raw.behavior || (raw.locked ? 'locked' : 'standard'),
            trapDamage: raw.trapDamage || 0,
            gold: Number(raw.gold || 0),
            loot: raw.loot || [],
            lootTable: raw.lootTable || null,
            tags: raw.tags || [],
            state: raw.state || {},
          }),
        );
      } else {
        this._registerEntity(new InteractableEntity(raw));
      }
    }

    for (let y = 0; y < mapState.rows; y++) {
      for (let x = 0; x < mapState.cols; x++) {
        if (isDoor(x, y) || isChest(x, y)) {
          MAP[y][x] = TILE.FLOOR;
        }
      }
    }

    this._createAllEntitySprites();
    this.initChestGlows();
  },

  _createAllEntitySprites(this: GameScene): void {
    for (const ent of this.entities as GameEntity[]) {
      this._createEntitySprite(ent);
    }
  },

  _createEntitySprite(this: GameScene, ent: GameEntity): void {
    const tex = ent.getTexture();
    if (!tex) return;
    const key = this._entityKey(ent.x, ent.y);
    const existing = (this._entitySprites as Record<string, Phaser.GameObjects.Image>)[key];
    if (existing) existing.destroy();
    const [texKey, texFrame] = getTileTex(tex);
    const spr = this.add
      .image(ent.x * S + S / 2, ent.y * S + S / 2, texKey, texFrame)
      .setDisplaySize(S, S)
      .setDepth(3);
    (this._entitySprites as Record<string, Phaser.GameObjects.Image>)[key] = spr;
    ent.sprite = spr;
  },

  _updateEntitySprite(this: GameScene, ent: GameEntity): void {
    const tex = ent.getTexture();
    if (!tex) return;
    if (ent.sprite) {
      const [texKey, texFrame] = getTileTex(tex);
      ent.sprite.setTexture(texKey, texFrame);
    } else {
      this._createEntitySprite(ent);
    }
  },

  _registerEntity(this: GameScene, ent: GameEntity): void {
    const byId = this.entityById as Record<string, GameEntity>;
    const existing = byId[ent.id];
    if (existing) {
      const ents = this.entities as GameEntity[];
      const idx = ents.indexOf(existing);
      if (idx >= 0) ents.splice(idx, 1);
      const oldKey = this._entityKey(existing.x, existing.y);
      const tileIndex = this._entityTileIndex as Record<string, GameEntity[]>;
      const arr = tileIndex[oldKey];
      if (arr) {
        const ai = arr.indexOf(existing);
        if (ai >= 0) arr.splice(ai, 1);
        if (!arr.length) delete tileIndex[oldKey];
      }
    }
    (this.entities as GameEntity[]).push(ent);
    byId[ent.id] = ent;
    const key = this._entityKey(ent.x, ent.y);
    const tileIndex = this._entityTileIndex as Record<string, GameEntity[]>;
    if (!tileIndex[key]) tileIndex[key] = [];
    tileIndex[key].push(ent);
    if (ent.kind === 'door') {
      (this.doorEntities as Record<string, GameEntity>)[key] = ent;
    } else if (ent.kind === 'chest') {
      (this.chestEntities as Record<string, GameEntity>)[key] = ent;
    }
  },

  _entityKey(_this: GameScene, x: number, y: number): string {
    return `${x},${y}`;
  },

  getEntityById(this: GameScene, id: string): GameEntity | null {
    return (this.entityById as Record<string, GameEntity>)[String(id)] || null;
  },

  getEntitiesAt(this: GameScene, x: number, y: number): GameEntity[] {
    return (this._entityTileIndex as Record<string, GameEntity[]>)[this._entityKey(x, y)] || [];
  },

  getEntityAt(this: GameScene, x: number, y: number, kind?: string): GameEntity | null {
    const ents = this.getEntitiesAt(x, y);
    if (!kind) return ents[0] || null;
    const k = String(kind).toLowerCase();
    return ents.find((e) => e.kind === k) || null;
  },

  hasEntityType(this: GameScene, x: number, y: number, kind: string): boolean {
    return this.getEntitiesAt(x, y).some((e) => e.kind === String(kind).toLowerCase());
  },

  _findInteractionApproachTile(
    this: GameScene,
    tx: number,
    ty: number,
  ): { x: number; y: number; path: { x: number; y: number }[] } | null {
    const dirs = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
      { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 },
    ];

    const blk = (x: number, y: number): boolean => this.isBlockedTile(x, y, { doorMode: 'passable' });
    let best: { x: number; y: number; path: { x: number; y: number }[] } | null = null;

    for (const d of dirs) {
      const ax = tx + d.x;
      const ay = ty + d.y;
      if (ax < 0 || ay < 0 || ax >= mapState.cols || ay >= mapState.rows) continue;
      if (blk(ax, ay)) continue;
      const path = bfs(this.playerTile.x, this.playerTile.y, ax, ay, blk);
      if (!path.length) continue;
      if (!best || path.length < best.path.length) best = { x: ax, y: ay, path };
    }

    return best;
  },

  interactAtTile(
    this: GameScene,
    tx: number,
    ty: number,
    opts: { autoMove?: boolean; onAutoMoveComplete?: () => void; ptr?: { event?: MouseEvent; clientX?: number; clientY?: number } } = {},
  ): string | null {
    const ents = this.getEntitiesAt(tx, ty);
    if (!ents.length) return null;

    const dist = tileDist(this.playerTile.x, this.playerTile.y, tx, ty);
    const needsAdj = ents.some((e) => e.needsAdjacency());
    if (needsAdj && dist > 1.5) {
      if (opts.autoMove) {
        const canStandOnTarget =
          !ents.some((e) => e.blocksMovement(this)) &&
          !this.isBlockedTile(tx, ty, { doorMode: 'passable' });

        const approach = canStandOnTarget ? { x: tx, y: ty } : this._findInteractionApproachTile(tx, ty);
        if (approach) {
          this.setDestination(approach.x, approach.y, () => {
            this.interactAtTile(tx, ty, { ...opts, autoMove: false });
            if (typeof opts.onAutoMoveComplete === 'function') opts.onAutoMoveComplete();
          });
          return 'moving';
        }
      }
      this.showStatus(`Move closer to interact with ${ents[0].getLabel()}.`);
      return 'blocked';
    }

    const actions: ActionDef[] = [];
    for (const ent of ents) {
      for (const opt of ent.getMenuOptions(this)) {
        if (opt.enabled) actions.push({ ...opt, entity: ent });
      }
    }

    if (!actions.length) {
      this.showStatus(`Cannot interact with ${ents[0].getLabel()}.`);
      return 'blocked';
    }

    if (actions.length === 1) return this._executeEntityAction(actions[0]);

    if (opts.ptr) {
      const seen = new Set<string>();
      const items: Array<{ label: string; action: () => void }> = [];
      for (const a of actions) {
        const lbl = `${a.icon} ${a.label}`;
        if (seen.has(lbl)) continue;
        seen.add(lbl);
        items.push({ label: lbl, action: () => this._executeEntityAction(a) });
      }
      if (items.length === 1) return this._executeEntityAction(actions[0]);
      const ev = (opts.ptr.event || opts.ptr) as { clientX?: number; clientY?: number };
      this.showContextMenu(ev.clientX || 0, ev.clientY || 0, items);
      return 'menu';
    }

    return this._executeEntityAction(actions[0]);
  },

  buildTileMenu(
    this: GameScene,
    tx: number,
    ty: number,
    enemy: unknown,
    ptr: { event?: MouseEvent; clientX?: number; clientY?: number },
    afterAction?: (kind: string) => void,
  ): boolean {
    const menuItems: Array<{ label: string; action: () => void }> = [];
    if (enemy) {
      menuItems.push({ label: '⚔ Engage', action: () => this.onTapEnemy(enemy) });
    }
    const ents = this.getEntitiesAt(tx, ty);
    const dist = tileDist(this.playerTile.x, this.playerTile.y, tx, ty);
    for (const ent of ents) {
      if (ent.needsAdjacency() && dist > 1.5) continue;
      for (const opt of ent.getMenuOptions(this)) {
        if (!opt.enabled) continue;
        menuItems.push({
          label: `${opt.icon} ${opt.label}`,
          action: () => {
            this._executeEntityAction({ ...opt, entity: ent });
            if (afterAction) afterAction(ent.kind);
          },
        });
      }
    }
    if (menuItems.length > 1) {
      const ev = (ptr.event || ptr) as { clientX?: number; clientY?: number };
      this.showContextMenu(ev.clientX || 0, ev.clientY || 0, menuItems);
      return true;
    }
    if (menuItems.length === 1) {
      menuItems[0].action();
      return true;
    }
    return false;
  },

  _executeEntityAction(this: GameScene, actionDef: ActionDef): string {
    const ent = actionDef.entity;
    const kind = ent.kind;
    const action = actionDef.action;

    if (this.playerHidden && (kind === 'door' || kind === 'chest')) {
      this._breakStealth('Interaction noise reveals your position!');
    }

    if (kind === 'door' && action === 'toggle') {
      this.toggleDoor(ent.x, ent.y);
      return 'door';
    }
    if (kind === 'chest' && action === 'open') {
      this.tryOpenChest(ent.x, ent.y);
      return 'chest';
    }
    if (kind === 'floor_item' && action === 'pickup') {
      this.collectFloorItem(ent as unknown as { collected?: boolean; x: number; y: number; items?: unknown[]; gold?: number });
      return 'floor_item';
    }

    const result = ent.interact(this, action);
    const log = (this as unknown as { log?: (tag: string, msg: string) => void }).log;
    if (result?.ok && typeof log === 'function') log('ENTITY', `${kind}:${action} at (${ent.x},${ent.y})`);
    return kind;
  },
};

declare module '@/game' {
  interface GameScene {
    entities: GameEntity[];
    entityById: Record<string, GameEntity>;
    doorEntities: Record<string, GameEntity>;
    chestEntities: Record<string, GameEntity>;
    _entitySprites: Record<string, Phaser.GameObjects.Image>;
    _chestGlows?: Record<string, Phaser.GameObjects.Graphics>;

    initEntities(): void;
    _createAllEntitySprites(): void;
    _createEntitySprite(ent: GameEntity): void;
    _updateEntitySprite(ent: GameEntity): void;
    _registerEntity(ent: GameEntity): void;
    _entityKey(x: number, y: number): string;
    getEntityById(id: string): GameEntity | null;
    getEntitiesAt(x: number, y: number): GameEntity[];
    getEntityAt(x: number, y: number, kind?: string): GameEntity | null;
    hasEntityType(x: number, y: number, kind: string): boolean;
    _findInteractionApproachTile(tx: number, ty: number): { x: number; y: number; path: { x: number; y: number }[] } | null;
    interactAtTile(tx: number, ty: number, opts?: { autoMove?: boolean; onAutoMoveComplete?: () => void; ptr?: { event?: MouseEvent; clientX?: number; clientY?: number } }): string | null;
    buildTileMenu(
      tx: number,
      ty: number,
      enemy: unknown,
      ptr: { event?: MouseEvent; clientX?: number; clientY?: number },
      afterAction?: (kind: string) => void,
    ): boolean;
    _executeEntityAction(actionDef: ActionDef): string;

    isBlockedTile(x: number, y: number, opts?: { doorMode?: string; excludeEnemy?: unknown }): boolean;
    setDestination(tx: number, ty: number, onArrival?: (() => void) | null, finalPos?: { wx: number; wy: number } | null): void;
    showContextMenu(x: number, y: number, options: Array<{ label: string; action: () => void }>): void;
    onTapEnemy(enemy: unknown): void;
    toggleDoor(x: number, y: number): void;
    tryOpenChest(x: number, y: number): boolean;
    collectFloorItem(ent: unknown): { ok?: boolean; kind?: string };
    initChestGlows(): void;
  }
}
