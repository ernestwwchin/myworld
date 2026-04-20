import Phaser from 'phaser';
import type { GameScene } from '@/game';

export const CameraSystemMixin = {
  _camPanning: false,
  _camPanStart: null as { x: number; y: number } | null,
  _camScrollStart: null as { x: number; y: number } | null,
  _camFollowing: true,
  _camMinZoom: 0.6,
  _camMaxZoom: 2.5,

  _pinchDist0: 0,
  _pinchZoom0: 1,
  _pinchMid0: null as { x: number; y: number } | null,
  _touchPanning: false,

  initCameraControls(this: GameScene): void {
    const cam = this.cameras.main;

    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gos: unknown, _dx: number, dy: number) => {
      const step = dy > 0 ? -0.1 : 0.1;
      const z = Phaser.Math.Clamp(cam.zoom + step, this._camMinZoom, this._camMaxZoom);
      cam.setZoom(z);
    });

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.middleButtonDown()) {
        this._startCamPan(ptr);
      }
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this._camPanning && ptr.middleButtonDown()) {
        this._updateCamPan(ptr);
      }
      if (this._touchPanning) {
        this._updateTouchPanPinch();
      }
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (this._camPanning && !ptr.middleButtonDown()) {
        this._camPanning = false;
      }
      if (this._touchPanning && this.input.pointer2.isDown === false) {
        this._touchPanning = false;
      }
    });

    this.input.on('pointerdown', () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown && !this._touchPanning) {
        this._startTouchPanPinch(p1, p2);
      }
    });

    this.input.keyboard?.on('keydown-C', () => {
      this.recenterCamera();
    });
  },

  _startCamPan(this: GameScene, ptr: Phaser.Input.Pointer): void {
    this._camPanning = true;
    this._camPanStart = { x: ptr.x, y: ptr.y };
    this._camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    this._stopCamFollow();
  },

  _updateCamPan(this: GameScene, ptr: Phaser.Input.Pointer): void {
    if (!this._camPanStart || !this._camScrollStart) return;
    const cam = this.cameras.main;
    const dx = (this._camPanStart.x - ptr.x) / cam.zoom;
    const dy = (this._camPanStart.y - ptr.y) / cam.zoom;
    cam.scrollX = this._camScrollStart.x + dx;
    cam.scrollY = this._camScrollStart.y + dy;
  },

  _startTouchPanPinch(this: GameScene, p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): void {
    this._touchPanning = true;
    this._stopCamFollow();
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    this._pinchDist0 = Math.sqrt(dx * dx + dy * dy) || 1;
    this._pinchZoom0 = this.cameras.main.zoom;
    this._pinchMid0 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    this._camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
  },

  _updateTouchPanPinch(this: GameScene): void {
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;
    if (!p1.isDown || !p2.isDown) return;
    const cam = this.cameras.main;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const scale = dist / this._pinchDist0;
    cam.setZoom(Phaser.Math.Clamp(this._pinchZoom0 * scale, this._camMinZoom, this._camMaxZoom));

    if (!this._pinchMid0 || !this._camScrollStart) return;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const panDx = (this._pinchMid0.x - midX) / cam.zoom;
    const panDy = (this._pinchMid0.y - midY) / cam.zoom;
    cam.scrollX = this._camScrollStart.x + panDx;
    cam.scrollY = this._camScrollStart.y + panDy;
  },

  _stopCamFollow(this: GameScene): void {
    if (this._camFollowing) {
      this.cameras.main.stopFollow();
      this._camFollowing = false;
    }
  },

  recenterCamera(this: GameScene): void {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.15, 0.15);
    this._camFollowing = true;
    this.time.delayedCall(400, () => {
      if (this._camFollowing) cam.startFollow(this.player, true, 1, 1);
    });
  },

  _ensureCamFollow(this: GameScene): void {
    if (!this._camFollowing) {
      this.recenterCamera();
    }
  },
};

declare module '@/game' {
  interface GameScene {
    _camPanning: boolean;
    _camPanStart: { x: number; y: number } | null;
    _camScrollStart: { x: number; y: number } | null;
    _camFollowing: boolean;
    _camMinZoom: number;
    _camMaxZoom: number;
    _pinchDist0: number;
    _pinchZoom0: number;
    _pinchMid0: { x: number; y: number } | null;
    _touchPanning: boolean;
    initCameraControls(): void;
    _startCamPan(ptr: Phaser.Input.Pointer): void;
    _updateCamPan(ptr: Phaser.Input.Pointer): void;
    _startTouchPanPinch(p1: Phaser.Input.Pointer, p2: Phaser.Input.Pointer): void;
    _updateTouchPanPinch(): void;
    _stopCamFollow(): void;
    recenterCamera(): void;
    _ensureCamFollow(): void;
  }
}
