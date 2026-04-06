// ═══════════════════════════════════════════════════════
// sprites.js — Procedural sprite generation + animations
// ═══════════════════════════════════════════════════════

const SPRITE_CFG = {
  blinkChance: 0.18,
  walkFrameRate: 9,
  runFrameRate: 14,
};

function getSpriteCfg() {
  return { ...SPRITE_CFG, ...(window._SPRITE_CFG || {}) };
}

function generateSprites(scene) {
  const spriteCfg = getSpriteCfg();
  const g = scene.make.graphics({x: 0, y: 0, add: false});
  const dt = (k, fn) => { g.clear(); fn(g); g.generateTexture(k, S, S); };
  const cx = S / 2, cy = S / 2;

  // ── Tile textures ──
  dt('t_floor', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.fillStyle(0x21213a); p.fillRect(1, 1, S - 2, S - 2); p.lineStyle(1, 0x2a2a4a, 0.5); p.strokeRect(0, 0, S, S); });
  dt('t_wall', p => { p.fillStyle(0x2c2c4e); p.fillRect(0, 0, S, S); p.fillStyle(0x373760); p.fillRect(2, 2, S - 4, S / 2 - 2); p.fillStyle(0x2e2e50); p.fillRect(2, S / 2, S - 4, S / 2 - 2); p.lineStyle(1, 0x4a4a80, 0.8); p.strokeRect(0, 0, S, S); p.lineStyle(1, 0x3a3a6a, 0.5); p.lineBetween(0, S / 2, S, S / 2); });
  dt('t_door', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.fillStyle(0x6d4c2a); p.fillRect(6, 3, S - 12, S - 3); p.fillStyle(0x8b6340); p.fillRect(8, 5, S - 16, S - 8); p.fillStyle(0xd4a857); p.fillRect(cx - 3, cy - 3, 6, 6); });
  dt('t_door_open', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.lineStyle(2, 0x6d4c2a, 0.8); p.strokeRect(2, 2, S - 4, S - 4); p.fillStyle(0x4a4a6a, 0.3); p.fillRect(4, 4, S - 8, S - 8); p.fillStyle(0x2ecc71, 0.4); p.fillTriangle(cx + 2, 6, cx + 8, cy, cx + 2, S - 6); });
  dt('t_chest', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.fillStyle(0x8b6340); p.fillRect(6, 10, S - 12, S - 16); p.fillStyle(0x6d4c2a); p.fillRect(6, 10, S - 12, 8); p.fillStyle(0xd4a857); p.fillRect(cx - 4, 15, 8, 6); });
  dt('t_chest_open', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.fillStyle(0x6d4c2a); p.fillRect(6, 10, S - 12, S - 16); p.fillStyle(0x5a3a1a); p.fillRect(8, 12, S - 16, S - 20); p.fillStyle(0x8b6340); p.fillRect(6, 4, S - 12, 10); p.lineStyle(1, 0x4a2a10, 0.6); p.strokeRect(6, 10, S - 12, S - 16); });
  dt('t_stairs', p => { p.fillStyle(0x1a1a2e); p.fillRect(0, 0, S, S); p.fillStyle(0x3a3a5e); for (let i = 0; i < 4; i++) p.fillRect(4 + i * 6, 6 + i * 6, S - 8 - i * 6, 6); p.fillStyle(0xd4a857); p.fillTriangle(cx, 7, cx - 6, 19, cx + 6, 19); });
  dt('t_water', p => { p.fillStyle(0x0d2137); p.fillRect(0, 0, S, S); p.fillStyle(0x1a4a6e); p.fillRect(0, 0, S, S); p.fillStyle(0x1e5a84, 0.6); p.fillEllipse(8, 12, 15, 6); p.fillEllipse(22, 20, 12, 5); });
  dt('t_water_1', p => { p.fillStyle(0x0d2137); p.fillRect(0, 0, S, S); p.fillStyle(0x1a4a6e); p.fillRect(0, 0, S, S); p.fillStyle(0x1e5a84, 0.62); p.fillEllipse(8, 12, 15, 6); p.fillEllipse(23, 21, 11, 5); p.fillStyle(0x58a7d1,0.35); p.fillEllipse(14,28,18,5); });
  dt('t_water_2', p => { p.fillStyle(0x0d2137); p.fillRect(0, 0, S, S); p.fillStyle(0x1a4a6e); p.fillRect(0, 0, S, S); p.fillStyle(0x246892, 0.62); p.fillEllipse(10, 11, 14, 6); p.fillEllipse(21, 19, 13, 6); p.fillStyle(0x79c2e8,0.35); p.fillEllipse(30,26,14,4); });
  dt('t_grass', p => { p.fillStyle(0x1a2e1a); p.fillRect(0, 0, S, S); p.fillStyle(0x2d4a20); p.fillRect(1, 1, S - 2, S - 2); });
  dt('t_grass_1', p => { p.fillStyle(0x1a2e1a); p.fillRect(0, 0, S, S); p.fillStyle(0x2d4a20); p.fillRect(1, 1, S - 2, S - 2); p.fillStyle(0x3e6b2a,0.8); p.fillRect(8,10,2,12); p.fillRect(14,7,2,15); p.fillRect(22,12,2,10); p.fillRect(30,9,2,13); });
  dt('t_grass_2', p => { p.fillStyle(0x1a2e1a); p.fillRect(0, 0, S, S); p.fillStyle(0x2d4a20); p.fillRect(1, 1, S - 2, S - 2); p.fillStyle(0x4f7c34,0.8); p.fillRect(9,9,2,13); p.fillRect(16,8,2,14); p.fillRect(24,11,2,11); p.fillRect(31,10,2,12); });
  dt('t_move', p => { p.fillStyle(0x3498db, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x3498db, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_atk', p => { p.fillStyle(0xe74c3c, 0.15); p.fillRect(0, 0, S, S); p.lineStyle(2, 0xe74c3c, 0.55); p.strokeRect(1, 1, S - 2, S - 2); p.lineStyle(1, 0xe74c3c, 0.3); p.lineBetween(0, 0, S, S); p.lineBetween(S, 0, 0, S); });
  dt('t_tap', p => { p.lineStyle(2, 0xf0c060, 0.9); p.strokeRect(4, 4, S - 8, S - 8); p.lineStyle(1, 0xf0c060, 0.4); p.lineBetween(0, S / 2, 8, S / 2); p.lineBetween(S - 8, S / 2, S, S / 2); p.lineBetween(S / 2, 0, S / 2, 8); p.lineBetween(S / 2, S - 8, S / 2, S); });
  dt('t_turn', p => { p.lineStyle(3, 0xf0c060, 1); p.strokeRect(2, 2, S - 4, S - 4); p.fillStyle(0xf0c060, 0.1); p.fillRect(2, 2, S - 4, S - 4); });
  dt('deco_torch', p => { p.fillStyle(0x4e342e); p.fillRect(cx-3,cy-8,6,18); p.fillStyle(0x7b5e57); p.fillRect(cx-5,cy+8,10,4); p.fillStyle(0xffb74d,0.9); p.fillCircle(cx,cy-12,6); p.fillStyle(0xff7043,0.7); p.fillCircle(cx,cy-10,4); p.fillStyle(0xfff176,0.75); p.fillCircle(cx,cy-14,2); });
  dt('deco_banner', p => { p.fillStyle(0x5d4037); p.fillRect(cx-2,6,4,S-10); p.fillStyle(0x8e2430); p.fillRoundedRect(cx+2,8,S*0.35,S*0.55,3); p.fillStyle(0xd4af37); p.fillRect(cx+8,12,S*0.18,4); p.fillRect(cx+8,20,S*0.18,4); });
  dt('deco_crystal', p => { p.fillStyle(0x37474f); p.fillEllipse(cx,cy+14,18,8); p.fillStyle(0x80deea,0.85); p.fillTriangle(cx,6,cx-8,24,cx+8,24); p.fillStyle(0xb2ebf2,0.6); p.fillTriangle(cx,10,cx-4,21,cx+4,21); });

  function drawHumanoid(p, palette, frame) {
    const r = S * 0.41;
    const legA = frame === 'walk1' ? -2 : frame === 'walk2' ? 2 : 0;
    const legB = -legA;
    const armA = frame === 'walk1' ? 2 : frame === 'walk2' ? -2 : 0;
    const blink = frame === 'blink';
    const bodyY = frame === 'run' ? -1 : 0;

    p.fillStyle(0x000000, 0.18); p.fillEllipse(cx, cy + r * 0.9, r * 1.15, r * 0.33);

    p.fillStyle(palette.cape); p.fillTriangle(cx - r * 0.5, cy - r * 0.06 + bodyY, cx + r * 0.5, cy - r * 0.06 + bodyY, cx, cy + r * 0.92 + bodyY);
    p.fillStyle(palette.body); p.fillRoundedRect(cx - r * 0.36, cy - r * 0.02 + bodyY, r * 0.72, r * 0.64, 3);
    p.fillStyle(palette.belt); p.fillRect(cx - r * 0.36, cy + r * 0.36 + bodyY, r * 0.72, r * 0.11);
    p.fillStyle(0xffd54f); p.fillRect(cx - r * 0.08, cy + r * 0.36 + bodyY, r * 0.16, r * 0.11);

    p.fillStyle(palette.skin);
    p.fillRoundedRect(cx - r * 0.63, cy + r * 0.06 + armA + bodyY, r * 0.28, r * 0.14, 2);
    p.fillRoundedRect(cx + r * 0.35, cy + r * 0.06 - armA + bodyY, r * 0.28, r * 0.14, 2);

    p.fillStyle(palette.legs);
    p.fillRect(cx - r * 0.33, cy + r * 0.47 + legA + bodyY, r * 0.27, r * 0.42);
    p.fillRect(cx + r * 0.06, cy + r * 0.47 + legB + bodyY, r * 0.27, r * 0.42);
    p.fillStyle(palette.boots);
    p.fillRect(cx - r * 0.34, cy + r * 0.77 + legA + bodyY, r * 0.30, r * 0.13);
    p.fillRect(cx + r * 0.04, cy + r * 0.77 + legB + bodyY, r * 0.30, r * 0.13);

    p.fillStyle(palette.skin); p.fillCircle(cx, cy - r * 0.3 + bodyY, r * 0.30);
    p.fillStyle(palette.helm); p.fillRoundedRect(cx - r * 0.25, cy - r * 0.42 + bodyY, r * 0.50, r * 0.14, 2);

    p.fillStyle(0x111111);
    if (blink) {
      p.fillRect(cx - r * 0.16, cy - r * 0.28 + bodyY, r * 0.12, r * 0.02);
      p.fillRect(cx + r * 0.04, cy - r * 0.28 + bodyY, r * 0.12, r * 0.02);
    } else {
      p.fillCircle(cx - r * 0.10, cy - r * 0.28 + bodyY, r * 0.05);
      p.fillCircle(cx + r * 0.10, cy - r * 0.28 + bodyY, r * 0.05);
      p.fillStyle(0xffffff, 0.6);
      p.fillCircle(cx - r * 0.08, cy - r * 0.30 + bodyY, r * 0.015);
      p.fillCircle(cx + r * 0.12, cy - r * 0.30 + bodyY, r * 0.015);
    }

    p.fillStyle(palette.mouth); p.fillRoundedRect(cx - r * 0.08, cy - r * 0.18 + bodyY, r * 0.16, r * 0.04, 2);
  }

  function drawSkeleton(p, frame) {
    const r = S * 0.42;
    const sway = frame === 'walk1' ? -2 : frame === 'walk2' ? 2 : 0;
    const blink = frame === 'blink';
    p.fillStyle(0x000000, 0.15); p.fillEllipse(cx, cy + r * 0.88, r * 0.9, r * 0.28);
    p.fillStyle(0xe0e0e0); for (let i = 0; i < 4; i++) p.fillRect(cx - r * 0.3, cy - r * 0.05 + i * r * 0.14, r * 0.6, r * 0.08);
    p.fillStyle(0xbdbdbd); p.fillRect(cx - r * 0.05, cy - r * 0.05, r * 0.1, r * 0.58);
    p.fillStyle(0xd0d0d0);
    p.fillRect(cx - r * 0.28, cy + r * 0.53 + sway, r * 0.12, r * 0.28);
    p.fillRect(cx + r * 0.16, cy + r * 0.53 - sway, r * 0.12, r * 0.28);
    p.fillRect(cx - r * 0.3, cy + r * 0.76 + sway, r * 0.14, r * 0.12);
    p.fillRect(cx + r * 0.16, cy + r * 0.76 - sway, r * 0.14, r * 0.12);
    p.fillStyle(0xeeeeee); p.fillCircle(cx, cy - r * 0.3, r * 0.28);
    p.fillStyle(0xf5f5f5); p.fillEllipse(cx, cy - r * 0.15, r * 0.22, r * 0.14);
    p.fillStyle(0x1a1a2e);
    if (blink) {
      p.fillRect(cx - r * 0.18, cy - r * 0.32, r * 0.12, r * 0.02);
      p.fillRect(cx + r * 0.06, cy - r * 0.32, r * 0.12, r * 0.02);
    } else {
      p.fillCircle(cx - r * 0.12, cy - r * 0.3, r * 0.1);
      p.fillCircle(cx + r * 0.12, cy - r * 0.3, r * 0.1);
    }
    p.fillStyle(0x263238); p.fillTriangle(cx - r * 0.04, cy - r * 0.18, cx + r * 0.04, cy - r * 0.18, cx, cy - r * 0.1);
  }

  function makeFrames(base, drawer) {
    dt(`spr_${base}_idle`, p => drawer(p, 'idle'));
    dt(`spr_${base}_walk1`, p => drawer(p, 'walk1'));
    dt(`spr_${base}_walk2`, p => drawer(p, 'walk2'));
    dt(`spr_${base}_run`, p => drawer(p, 'run'));
    if (Math.random() < Number(spriteCfg.blinkChance || 0.18)) {
      dt(`spr_${base}_blink`, p => drawer(p, 'blink'));
    } else {
      dt(`spr_${base}_blink`, p => drawer(p, 'idle'));
    }
    dt(`spr_${base}`, p => drawer(p, 'idle'));
  }

  makeFrames('player', (p, frame) => drawHumanoid(p, {
    cape: 0x1a237e, body: 0x546e7a, belt: 0x4e342e, skin: 0xb0bec5,
    legs: 0x37474f, boots: 0x3e2723, helm: 0x546e7a, mouth: 0x1a1a2e
  }, frame));

  makeFrames('goblin', (p, frame) => drawHumanoid(p, {
    cape: 0x33691e, body: 0x2e7d32, belt: 0x4e342e, skin: 0x66bb6a,
    legs: 0x1b5e20, boots: 0x33691e, helm: 0x2e7d32, mouth: 0x1b5e20
  }, frame));

  makeFrames('skeleton', drawSkeleton);

  makeFrames('orc', (p, frame) => drawHumanoid(p, {
    cape: 0x4e342e, body: 0x558b2f, belt: 0x3e2723, skin: 0x7cb342,
    legs: 0x37474f, boots: 0x1a1a2e, helm: 0x33691e, mouth: 0x2e7d32
  }, frame));

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
