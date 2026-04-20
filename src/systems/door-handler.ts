import { DOOR_RULES, MODE } from '@/config';
import type { GameScene } from '@/game';
import type { DoorEntity } from '@/entities/door-entity';
import type { GameEntity } from '@/types/entities';

export const DoorHandlerMixin = {
  getDoorEntity(this: GameScene, x: number, y: number): DoorEntity | null {
    return (this.doorEntities as Record<string, DoorEntity>)[this._entityKey(x, y)] || null;
  },

  getDoorState(this: GameScene, x: number, y: number): { open: boolean; locked: boolean; auto: boolean } {
    const ent = this.getDoorEntity(x, y);
    if (ent) return { open: !!ent.open, locked: !!(ent as { locked?: boolean }).locked, auto: !!(ent as { auto?: boolean }).auto };
    return { open: false, locked: false, auto: !!DOOR_RULES.defaultAuto };
  },

  isDoorClosed(this: GameScene, x: number, y: number): boolean {
    const ent = this.getDoorEntity(x, y);
    return ent ? !ent.open : false;
  },

  isDoorPassable(this: GameScene, x: number, y: number): boolean {
    const ent = this.getDoorEntity(x, y);
    if (!ent) return true;
    return ent.open || !(ent as { locked?: boolean }).locked;
  },

  refreshDoorTile(this: GameScene, x: number, y: number): void {
    const ent = this.getDoorEntity(x, y);
    if (ent) this._updateEntitySprite(ent as unknown as GameEntity);
  },

  refreshDoorTiles(this: GameScene): void {
    for (const ent of this.entities as GameEntity[]) {
      if (ent.kind === 'door') this._updateEntitySprite(ent);
    }
  },

  setDoorOpen(this: GameScene, x: number, y: number, open: boolean, silent: boolean): boolean {
    const ent = this.getDoorEntity(x, y);
    if (!ent) return false;

    const result = (ent as unknown as { setOpen: (scene: GameScene, open: boolean, opts: unknown) => { ok: boolean; changed?: boolean } }).setOpen(this, !!open, { silent: !!silent, actor: 'player' });
    if (!result.ok) return false;

    this._updateEntitySprite(ent as unknown as GameEntity);
    if (!silent && result.changed) {
      const msg = ent.open ? 'Door opened.' : 'Door closed.';
      this.showStatus(msg);
    }
    this.updateFogOfWar();
    if (this.mode === MODE.EXPLORE) this.drawSightOverlays();
    return true;
  },

  toggleDoor(this: GameScene, x: number, y: number): void {
    const ent = this.getDoorEntity(x, y);
    if (ent) this.setDoorOpen(x, y, !ent.open, false);
  },
};

declare module '@/game' {
  interface GameScene {
    getDoorEntity(x: number, y: number): DoorEntity | null;
    getDoorState(x: number, y: number): { open: boolean; locked: boolean; auto: boolean };
    isDoorClosed(x: number, y: number): boolean;
    isDoorPassable(x: number, y: number): boolean;
    refreshDoorTile(x: number, y: number): void;
    refreshDoorTiles(): void;
    toggleDoor(x: number, y: number): void;
  }
}
