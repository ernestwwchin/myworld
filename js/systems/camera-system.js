// ═══════════════════════════════════════════════════════
// camera-system.js — Camera pan/zoom controls
// Mouse: middle-drag pan, scroll zoom, C to re-center
// Touch: two-finger drag pan, pinch zoom, double-tap re-center
// ═══════════════════════════════════════════════════════

const CameraSystem = {
  _camPanning: false,
  _camPanStart: null,      // {x, y} screen coords at drag start
  _camScrollStart: null,   // {x, y} camera scroll at drag start
  _camFollowing: true,     // whether camera is following player
  _camMinZoom: 0.6,
  _camMaxZoom: 2.5,

  // Touch pinch state
  _pinchDist0: 0,          // initial distance between two fingers
  _pinchZoom0: 1,          // zoom at pinch start
  _pinchMid0: null,        // midpoint at pinch start
  _touchPanning: false,

  initCameraControls() {
    const cam = this.cameras.main;

    // ── Mouse scroll wheel → zoom ──
    this.input.on('wheel', (_ptr, _gos, _dx, dy) => {
      const step = dy > 0 ? -0.1 : 0.1;
      const z = Phaser.Math.Clamp(cam.zoom + step, this._camMinZoom, this._camMaxZoom);
      cam.setZoom(z);
    });

    // ── Middle-click drag → pan ──
    this.input.on('pointerdown', ptr => {
      if (ptr.middleButtonDown()) {
        this._startCamPan(ptr);
      }
    });
    this.input.on('pointermove', ptr => {
      if (this._camPanning && ptr.middleButtonDown()) {
        this._updateCamPan(ptr);
      }
      // Touch: two-finger pan/pinch
      if (this._touchPanning) {
        this._updateTouchPanPinch();
      }
    });
    this.input.on('pointerup', ptr => {
      if (this._camPanning && !ptr.middleButtonDown()) {
        this._camPanning = false;
      }
      // End touch pan if fewer than 2 pointers
      if (this._touchPanning && this.input.pointer2.isDown === false) {
        this._touchPanning = false;
      }
    });

    // ── Touch: detect two-finger start ──
    this.input.on('pointerdown', ptr => {
      // When second finger touches down, start pinch/pan
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (p1.isDown && p2.isDown && !this._touchPanning) {
        this._startTouchPanPinch(p1, p2);
      }
    });

    // ── Keyboard: C to re-center ──
    this.input.keyboard.on('keydown-C', () => {
      this.recenterCamera();
    });
  },

  _startCamPan(ptr) {
    this._camPanning = true;
    this._camPanStart = { x: ptr.x, y: ptr.y };
    this._camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    this._stopCamFollow();
  },

  _updateCamPan(ptr) {
    if (!this._camPanStart) return;
    const cam = this.cameras.main;
    const dx = (this._camPanStart.x - ptr.x) / cam.zoom;
    const dy = (this._camPanStart.y - ptr.y) / cam.zoom;
    cam.scrollX = this._camScrollStart.x + dx;
    cam.scrollY = this._camScrollStart.y + dy;
  },

  _startTouchPanPinch(p1, p2) {
    this._touchPanning = true;
    this._stopCamFollow();
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    this._pinchDist0 = Math.sqrt(dx * dx + dy * dy) || 1;
    this._pinchZoom0 = this.cameras.main.zoom;
    this._pinchMid0 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    this._camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
  },

  _updateTouchPanPinch() {
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;
    if (!p1.isDown || !p2.isDown) return;
    const cam = this.cameras.main;

    // Pinch zoom
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const scale = dist / this._pinchDist0;
    cam.setZoom(Phaser.Math.Clamp(this._pinchZoom0 * scale, this._camMinZoom, this._camMaxZoom));

    // Pan (midpoint delta)
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const panDx = (this._pinchMid0.x - midX) / cam.zoom;
    const panDy = (this._pinchMid0.y - midY) / cam.zoom;
    cam.scrollX = this._camScrollStart.x + panDx;
    cam.scrollY = this._camScrollStart.y + panDy;
  },

  _stopCamFollow() {
    if (this._camFollowing) {
      this.cameras.main.stopFollow();
      this._camFollowing = false;
    }
  },

  recenterCamera() {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.15, 0.15);
    this._camFollowing = true;
    // After a brief lerp, snap to tight follow
    this.time.delayedCall(400, () => {
      if (this._camFollowing) cam.startFollow(this.player, true, 1, 1);
    });
  },

  /** Auto-recenter when player moves (WASD, click-to-move) */
  _ensureCamFollow() {
    if (!this._camFollowing) {
      this.recenterCamera();
    }
  },
};

Object.assign(GameScene.prototype, CameraSystem);
