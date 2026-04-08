// ═══════════════════════════════════════════════════════
// sprites.js — Sprite manager
// Reads SPRITE_MANIFEST (populated by ModLoader from sprites.yaml)
// and loads atlases + wires up animations. Game code uses
// getTileTex(key) to resolve atlas+frame for any tile key.
// ═══════════════════════════════════════════════════════

const SPRITE_CFG = {
  blinkChance: 0.18,
  walkFrameRate: 9,
  runFrameRate: 14,
};

function getSpriteCfg() {
  return { ...SPRITE_CFG, ...(window._SPRITE_CFG || {}) };
}

/**
 * Returns [atlasKey, frameName] for atlas-based tiles,
 * or [textureKey] for standalone image tiles.
 * Use as: this.add.image(x, y, ...getTileTex('t_floor'))
 */
function getTileTex(key) {
  const manifest = window.SPRITE_MANIFEST;
  if (manifest && manifest.tiles[key]) {
    const t = manifest.tiles[key];
    return [t.atlas, t.frame];
  }
  return [key]; // fallback to standalone texture key
}

/**
 * Returns [atlasKey, frameName] for a character's specific animation frame.
 * animType: 'idle' | 'run'
 * frameIdx: 0-based index within that animation
 */
function getCharFrame(type, animType, frameIdx) {
  const manifest = window.SPRITE_MANIFEST;
  if (manifest && manifest.characters[type]) {
    const frames = manifest.characters[type][animType];
    if (frames && frames.length) {
      return [manifest.characters[type].atlas, frames[frameIdx % frames.length]];
    }
  }
  return [`spr_${type}_${animType}`]; // fallback
}

function generateSprites(scene) {
  const manifest = window.SPRITE_MANIFEST;

  if (manifest) {
    // Load all atlases declared by mods
    for (const atlas of (manifest.atlases || [])) {
      scene.load.atlas(atlas.key, atlas.image, atlas.json);
    }
  }

  // ── Procedural overlays (always generated, no PNG needed) ──
  const g = scene.make.graphics({x: 0, y: 0, add: false});
  const dt = (k, fn) => { g.clear(); fn(g); g.generateTexture(k, S, S); };

  dt('t_flee', p => { p.fillStyle(0x2ecc71, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x2ecc71, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_move', p => { p.fillStyle(0x3498db, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x3498db, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_atk',  p => { p.fillStyle(0xe74c3c, 0.15); p.fillRect(0, 0, S, S); p.lineStyle(2, 0xe74c3c, 0.55); p.strokeRect(1, 1, S - 2, S - 2); p.lineStyle(1, 0xe74c3c, 0.3); p.lineBetween(0, 0, S, S); p.lineBetween(S, 0, 0, S); });
  dt('t_tap',  p => { p.lineStyle(2, 0xf0c060, 0.9); p.strokeRect(4, 4, S - 8, S - 8); p.lineStyle(1, 0xf0c060, 0.4); p.lineBetween(0, S / 2, 8, S / 2); p.lineBetween(S - 8, S / 2, S, S / 2); p.lineBetween(S / 2, 0, S / 2, 8); p.lineBetween(S / 2, S - 8, S / 2, S); });
  dt('t_turn', p => { p.lineStyle(3, 0xf0c060, 1); p.strokeRect(2, 2, S - 4, S - 4); p.fillStyle(0xf0c060, 0.1); p.fillRect(2, 2, S - 4, S - 4); });

  const cx = S / 2, cy = S / 2;
  dt('deco_banner', p => {
    p.fillStyle(0x5d4037); p.fillRect(cx-2, 4, 4, S-8);
    p.fillStyle(0x8e2430); p.fillRoundedRect(cx+2, 8, S*0.35, S*0.55, 3);
    p.fillStyle(0xb03040, 0.6); p.fillRoundedRect(cx+4, 10, S*0.28, S*0.48, 2);
    p.fillStyle(0xd4af37); p.fillRect(cx+8, 14, S*0.16, 3);
    p.fillStyle(0xd4af37); p.fillRect(cx+8, 22, S*0.16, 3);
  });
  dt('deco_crystal', p => {
    p.fillStyle(0x37474f); p.fillEllipse(cx, cy+14, 18, 8);
    p.fillStyle(0x40e0d0, 0.7); p.fillTriangle(cx, 4, cx-9, 26, cx+9, 26);
    p.fillStyle(0x80f0e0, 0.5); p.fillTriangle(cx+2, 8, cx-3, 23, cx+7, 23);
    p.fillStyle(0x80f0e0, 0.15); p.fillCircle(cx, cy-2, 14);
  });

  g.destroy();
}

/**
 * Plays a hit reaction on a character sprite.
 * - If the character has a 'hit' frame in the manifest: briefly shows it, then resumes idle.
 * - Otherwise: red tint flash (works for any sprite including enemies).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {string} type  character type key (e.g. 'player', 'goblin')
 */
function playHitAnim(scene, sprite, type) {
  if (!sprite || !sprite.active) return;
  const manifest = window.SPRITE_MANIFEST;
  const cfg = manifest?.characters?.[type];
  if (cfg?.hit?.length) {
    sprite.anims.stop();
    sprite.setTexture(cfg.atlas, cfg.hit[0]);
    scene.time.delayedCall(160, () => {
      if (sprite.active) sprite.play(`anim_${type}_idle`, true);
    });
  } else {
    sprite.setTint(0xff3333);
    scene.time.delayedCall(160, () => {
      if (sprite.active) sprite.clearTint();
    });
  }
}

function generateAnims(scene) {
  const spriteCfg = getSpriteCfg();
  const A = scene.anims;
  const manifest = window.SPRITE_MANIFEST;
  if (!manifest) return;

  for (const [type, cfg] of Object.entries(manifest.characters || {})) {
    const walkFps = Number(spriteCfg.walkFrameRate || 9);
    const runFps  = Number(spriteCfg.runFrameRate || 14);

    const idleKey = `anim_${type}_idle`;
    const walkKey = `anim_${type}_walk`;
    const runKey  = `anim_${type}_run`;

    if (!A.exists(idleKey) && cfg.idle?.length) {
      A.create({
        key: idleKey,
        frames: cfg.idle.map(f => ({ key: cfg.atlas, frame: f })),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!A.exists(walkKey) && cfg.run?.length) {
      A.create({
        key: walkKey,
        frames: cfg.run.map(f => ({ key: cfg.atlas, frame: f })),
        frameRate: walkFps,
        repeat: -1,
      });
    }
    if (!A.exists(runKey) && cfg.run?.length) {
      A.create({
        key: runKey,
        frames: cfg.run.map(f => ({ key: cfg.atlas, frame: f })),
        frameRate: runFps,
        repeat: -1,
      });
    }
  }
}
