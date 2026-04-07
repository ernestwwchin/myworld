// ═══════════════════════════════════════════════════════
// sprites.js — Image-based sprites (Dungeon Crawl Stone Soup, CC0)
//              + procedural overlays for UI highlights
// ═══════════════════════════════════════════════════════

const SPRITE_CFG = {
  blinkChance: 0.18,
  walkFrameRate: 9,
  runFrameRate: 14,
};

function getSpriteCfg() {
  return { ...SPRITE_CFG, ...(window._SPRITE_CFG || {}) };
}

// ── Asset manifest — maps game texture keys to PNG paths ──
const TILE_ASSETS = {
  t_floor:      'assets/tiles/floor.png',
  t_wall:       'assets/tiles/wall.png',
  t_door:       'assets/tiles/door_closed.png',
  t_door_open:  'assets/tiles/door_open.png',
  t_chest:      'assets/tiles/chest_closed.png',
  t_chest_open: 'assets/tiles/chest_open.png',
  t_stairs:     'assets/tiles/stairs.png',
  t_water:      'assets/tiles/water1.png',
  t_water_1:    'assets/tiles/water1.png',
  t_water_2:    'assets/tiles/water2.png',
  t_grass:      'assets/tiles/grass1.png',
  t_grass_1:    'assets/tiles/grass1.png',
  t_grass_2:    'assets/tiles/grass2.png',
  deco_torch:   'assets/tiles/torch.png',
};

const CHAR_ASSETS = {
  player:   'assets/characters/player.png',
  goblin:   'assets/characters/goblin.png',
  skeleton: 'assets/characters/skeleton.png',
  orc:      'assets/characters/orc.png',
};

function generateSprites(scene) {
  // ── Load real image assets ──
  for (const [key, path] of Object.entries(TILE_ASSETS)) {
    scene.load.image(key, path);
  }
  for (const [type, path] of Object.entries(CHAR_ASSETS)) {
    // Load the same image for all animation frame keys
    // (single static sprite used for all poses)
    const frames = ['idle', 'walk1', 'walk2', 'run', 'blink'];
    for (const f of frames) {
      scene.load.image(`spr_${type}_${f}`, path);
    }
    scene.load.image(`spr_${type}`, path);
  }

  // ── Procedural overlays (these need transparency, no PNG needed) ──
  const g = scene.make.graphics({x: 0, y: 0, add: false});
  const dt = (k, fn) => { g.clear(); fn(g); g.generateTexture(k, S, S); };

  dt('t_move', p => { p.fillStyle(0x3498db, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x3498db, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_atk', p => { p.fillStyle(0xe74c3c, 0.15); p.fillRect(0, 0, S, S); p.lineStyle(2, 0xe74c3c, 0.55); p.strokeRect(1, 1, S - 2, S - 2); p.lineStyle(1, 0xe74c3c, 0.3); p.lineBetween(0, 0, S, S); p.lineBetween(S, 0, 0, S); });
  dt('t_tap', p => { p.lineStyle(2, 0xf0c060, 0.9); p.strokeRect(4, 4, S - 8, S - 8); p.lineStyle(1, 0xf0c060, 0.4); p.lineBetween(0, S / 2, 8, S / 2); p.lineBetween(S - 8, S / 2, S, S / 2); p.lineBetween(S / 2, 0, S / 2, 8); p.lineBetween(S / 2, S - 8, S / 2, S); });
  dt('t_turn', p => { p.lineStyle(3, 0xf0c060, 1); p.strokeRect(2, 2, S - 4, S - 4); p.fillStyle(0xf0c060, 0.1); p.fillRect(2, 2, S - 4, S - 4); });

  // Procedural decoratives (banner, crystal — no PNG for these yet)
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

function generateAnims(scene) {
  const spriteCfg = getSpriteCfg();
  const A = scene.anims;
  const defs = [
    {type: 'player', walkFps: Number(spriteCfg.walkFrameRate || 9), runFps: Number(spriteCfg.runFrameRate || 14)},
    {type: 'goblin', walkFps: Number(spriteCfg.walkFrameRate || 9) - 1, runFps: Number(spriteCfg.runFrameRate || 14) - 2},
    {type: 'skeleton', walkFps: Number(spriteCfg.walkFrameRate || 9) - 2, runFps: Number(spriteCfg.walkFrameRate || 9)},
    {type: 'orc', walkFps: Number(spriteCfg.walkFrameRate || 9) - 3, runFps: Number(spriteCfg.runFrameRate || 14) - 3}
  ];

  for (const d of defs) {
    const idleKey = `anim_${d.type}_idle`;
    const walkKey = `anim_${d.type}_walk`;
    const runKey = `anim_${d.type}_run`;
    if (!A.exists(idleKey)) {
      A.create({
        key: idleKey,
        frames: [{key: `spr_${d.type}_idle`}, {key: `spr_${d.type}_blink`}, {key: `spr_${d.type}_idle`}],
        frameRate: 2,
        repeat: -1,
        repeatDelay: 1900,
      });
    }
    if (!A.exists(walkKey)) {
      A.create({
        key: walkKey,
        frames: [{key: `spr_${d.type}_walk1`}, {key: `spr_${d.type}_idle`}, {key: `spr_${d.type}_walk2`}, {key: `spr_${d.type}_idle`}],
        frameRate: d.walkFps,
        repeat: -1,
      });
    }
    if (!A.exists(runKey)) {
      A.create({
        key: runKey,
        frames: [{key: `spr_${d.type}_run`}, {key: `spr_${d.type}_walk1`}, {key: `spr_${d.type}_run`}, {key: `spr_${d.type}_walk2`}],
        frameRate: d.runFps,
        repeat: -1,
      });
    }
  }
}
