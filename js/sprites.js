// ═══════════════════════════════════════════════════════
// sprites.js — Procedural sprite generation (preload)
// ═══════════════════════════════════════════════════════

function generateSprites(scene) {
  const g = scene.make.graphics({x:0, y:0, add:false});
  const dt = (k, fn) => { g.clear(); fn(g); g.generateTexture(k, S, S); };
  const cx = S/2, cy = S/2;

  // ── Tile textures ──
  dt('t_floor', g => { g.fillStyle(0x1a1a2e); g.fillRect(0,0,S,S); g.fillStyle(0x21213a); g.fillRect(1,1,S-2,S-2); g.lineStyle(1,0x2a2a4a,0.5); g.strokeRect(0,0,S,S); });
  dt('t_wall', g => { g.fillStyle(0x2c2c4e); g.fillRect(0,0,S,S); g.fillStyle(0x373760); g.fillRect(2,2,S-4,S/2-2); g.fillStyle(0x2e2e50); g.fillRect(2,S/2,S-4,S/2-2); g.lineStyle(1,0x4a4a80,0.8); g.strokeRect(0,0,S,S); g.lineStyle(1,0x3a3a6a,0.5); g.lineBetween(0,S/2,S,S/2); });
  dt('t_door', g => { g.fillStyle(0x1a1a2e); g.fillRect(0,0,S,S); g.fillStyle(0x6d4c2a); g.fillRect(6,3,S-12,S-3); g.fillStyle(0x8b6340); g.fillRect(8,5,S-16,S-8); g.fillStyle(0xd4a857); g.fillRect(cx-3,cy-3,6,6); });
  dt('t_chest', g => { g.fillStyle(0x1a1a2e); g.fillRect(0,0,S,S); g.fillStyle(0x8b6340); g.fillRect(6,10,S-12,S-16); g.fillStyle(0x6d4c2a); g.fillRect(6,10,S-12,8); g.fillStyle(0xd4a857); g.fillRect(cx-4,15,8,6); });
  dt('t_stairs', g => { g.fillStyle(0x1a1a2e); g.fillRect(0,0,S,S); g.fillStyle(0x3a3a5e); for(let i=0;i<4;i++) g.fillRect(4+i*6,6+i*6,S-8-i*6,6); g.fillStyle(0xd4a857); g.fillTriangle(cx,7,cx-6,19,cx+6,19); });
  dt('t_water', g => { g.fillStyle(0x0d2137); g.fillRect(0,0,S,S); g.fillStyle(0x1a4a6e); g.fillRect(0,0,S,S); g.fillStyle(0x1e5a84,0.6); g.fillEllipse(8,12,15,6); g.fillEllipse(22,20,12,5); });
  dt('t_grass', g => { g.fillStyle(0x1a2e1a); g.fillRect(0,0,S,S); g.fillStyle(0x2d4a20); g.fillRect(1,1,S-2,S-2); });
  dt('t_move', g => { g.fillStyle(0x3498db,0.18); g.fillRect(0,0,S,S); g.lineStyle(1,0x3498db,0.4); g.strokeRect(0,0,S,S); });
  dt('t_atk', g => { g.fillStyle(0xe74c3c,0.15); g.fillRect(0,0,S,S); g.lineStyle(2,0xe74c3c,0.55); g.strokeRect(1,1,S-2,S-2); g.lineStyle(1,0xe74c3c,0.3); g.lineBetween(0,0,S,S); g.lineBetween(S,0,0,S); });
  dt('t_tap', g => { g.lineStyle(2,0xf0c060,0.9); g.strokeRect(4,4,S-8,S-8); g.lineStyle(1,0xf0c060,0.4); g.lineBetween(0,S/2,8,S/2); g.lineBetween(S-8,S/2,S,S/2); g.lineBetween(S/2,0,S/2,8); g.lineBetween(S/2,S-8,S/2,S); });
  dt('t_turn', g => { g.lineStyle(3,0xf0c060,1); g.strokeRect(2,2,S-4,S-4); g.fillStyle(0xf0c060,0.1); g.fillRect(2,2,S-4,S-4); });

  // ── Player sprite ──
  dt('spr_player', g => {
    const r=S*0.42;
    g.fillStyle(0x000000,0.18); g.fillEllipse(cx,cy+r*0.85,r*1.2,r*0.35);
    g.fillStyle(0x1a237e); g.fillTriangle(cx-r*0.5,cy-r*0.1,cx+r*0.5,cy-r*0.1,cx,cy+r*0.9);
    g.fillStyle(0x546e7a); g.fillRoundedRect(cx-r*0.38,cy-r*0.05,r*0.76,r*0.65,3);
    g.fillStyle(0x4e342e); g.fillRect(cx-r*0.38,cy+r*0.35,r*0.76,r*0.12);
    g.fillStyle(0xffd54f); g.fillRect(cx-r*0.08,cy+r*0.35,r*0.16,r*0.12);
    g.fillStyle(0x37474f); g.fillRect(cx-r*0.32,cy+r*0.47,r*0.27,r*0.42); g.fillRect(cx+r*0.05,cy+r*0.47,r*0.27,r*0.42);
    g.fillStyle(0x3e2723); g.fillRect(cx-r*0.34,cy+r*0.75,r*0.3,r*0.14); g.fillRect(cx+r*0.04,cy+r*0.75,r*0.3,r*0.14);
    g.fillStyle(0x78909c); g.fillCircle(cx,cy-r*0.32,r*0.28); g.fillRect(cx-r*0.28,cy-r*0.32,r*0.56,r*0.2);
    g.fillStyle(0x546e7a); g.fillRect(cx-r*0.2,cy-r*0.38,r*0.4,r*0.08);
    g.fillStyle(0x1a1a2e); g.fillRect(cx-r*0.18,cy-r*0.28,r*0.36,r*0.06);
    g.fillStyle(0xe53935); g.fillRect(cx-r*0.05,cy-r*0.6,r*0.1,r*0.28);
    g.fillStyle(0xb0bec5); g.fillRect(cx+r*0.42,cy-r*0.45,r*0.09,r*0.7);
    g.fillStyle(0x8d6e63); g.fillRect(cx+r*0.32,cy-r*0.05,r*0.28,r*0.09);
    g.fillStyle(0x1565c0); g.fillRoundedRect(cx-r*0.7,cy-r*0.15,r*0.28,r*0.38,2);
    g.fillStyle(0xffd54f); g.fillCircle(cx-r*0.56,cy+r*0.04,r*0.06);
  });

  // ── Goblin sprite ──
  dt('spr_goblin', g => {
    const r=S*0.38;
    g.fillStyle(0x000000,0.15); g.fillEllipse(cx,cy+r*0.9,r*1.0,r*0.3);
    g.fillStyle(0x2e7d32); g.fillRoundedRect(cx-r*0.35,cy+r*0.05,r*0.7,r*0.55,3);
    g.fillStyle(0x4e342e); g.fillTriangle(cx-r*0.2,cy+r*0.55,cx+r*0.2,cy+r*0.55,cx,cy+r*0.75);
    g.fillStyle(0x1b5e20); g.fillRect(cx-r*0.3,cy+r*0.58,r*0.22,r*0.35); g.fillRect(cx+r*0.08,cy+r*0.58,r*0.22,r*0.35);
    g.fillStyle(0x33691e); g.fillEllipse(cx-r*0.2,cy+r*0.9,r*0.32,r*0.14); g.fillEllipse(cx+r*0.2,cy+r*0.9,r*0.32,r*0.14);
    g.fillStyle(0x2e7d32); g.fillRect(cx-r*0.58,cy+r*0.08,r*0.26,r*0.12); g.fillRect(cx+r*0.32,cy+r*0.08,r*0.26,r*0.12);
    g.fillStyle(0xf9a825); g.fillTriangle(cx-r*0.66,cy+r*0.04,cx-r*0.7,cy+r*0.16,cx-r*0.6,cy+r*0.16); g.fillTriangle(cx+r*0.6,cy+r*0.04,cx+r*0.64,cy+r*0.16,cx+r*0.54,cy+r*0.16);
    g.fillStyle(0x388e3c); g.fillCircle(cx,cy-r*0.22,r*0.32);
    g.fillStyle(0x2e7d32); g.fillEllipse(cx-r*0.36,cy-r*0.28,r*0.18,r*0.3); g.fillEllipse(cx+r*0.36,cy-r*0.28,r*0.18,r*0.3);
    g.fillStyle(0xff1744); g.fillCircle(cx-r*0.12,cy-r*0.24,r*0.09); g.fillCircle(cx+r*0.12,cy-r*0.24,r*0.09);
    g.fillStyle(0xffffff,0.5); g.fillCircle(cx-r*0.1,cy-r*0.26,r*0.03); g.fillCircle(cx+r*0.14,cy-r*0.26,r*0.03);
    g.fillStyle(0x1b5e20); g.fillEllipse(cx,cy-r*0.15,r*0.1,r*0.07);
    g.fillStyle(0xf5f5f5); g.fillRect(cx-r*0.1,cy-r*0.08,r*0.08,r*0.08); g.fillRect(cx+r*0.02,cy-r*0.08,r*0.08,r*0.08);
    g.fillStyle(0xbdbdbd); g.fillRect(cx+r*0.38,cy+r*0.1,r*0.06,r*0.38);
    g.fillStyle(0x5d4037); g.fillRect(cx+r*0.32,cy+r*0.34,r*0.18,r*0.07);
  });

  // ── Skeleton sprite ──
  dt('spr_skeleton', g => {
    const r=S*0.42;
    g.fillStyle(0x000000,0.15); g.fillEllipse(cx,cy+r*0.88,r*0.9,r*0.28);
    g.fillStyle(0xe0e0e0); for(let i=0;i<4;i++) g.fillRect(cx-r*0.3,cy-r*0.05+i*r*0.14,r*0.6,r*0.08);
    g.fillStyle(0xbdbdbd); g.fillRect(cx-r*0.05,cy-r*0.05,r*0.1,r*0.58);
    g.fillStyle(0xe0e0e0); g.fillEllipse(cx,cy+r*0.53,r*0.5,r*0.2);
    g.fillStyle(0xd0d0d0); g.fillRect(cx-r*0.28,cy+r*0.53,r*0.12,r*0.28); g.fillRect(cx+r*0.16,cy+r*0.53,r*0.12,r*0.28); g.fillRect(cx-r*0.3,cy+r*0.76,r*0.14,r*0.12); g.fillRect(cx+r*0.16,cy+r*0.76,r*0.14,r*0.12);
    g.fillRect(cx-r*0.48,cy-r*0.0,r*0.12,r*0.32); g.fillRect(cx+r*0.36,cy-r*0.0,r*0.12,r*0.32);
    g.fillStyle(0xeeeeee); g.fillCircle(cx-r*0.36,cy,r*0.08); g.fillCircle(cx+r*0.36,cy,r*0.08);
    g.fillStyle(0xeeeeee); g.fillCircle(cx,cy-r*0.3,r*0.28);
    g.fillStyle(0xf5f5f5); g.fillEllipse(cx,cy-r*0.15,r*0.22,r*0.14);
    g.fillStyle(0x1a1a2e); g.fillCircle(cx-r*0.12,cy-r*0.3,r*0.1); g.fillCircle(cx+r*0.12,cy-r*0.3,r*0.1);
    g.fillStyle(0x263238); g.fillTriangle(cx-r*0.04,cy-r*0.18,cx+r*0.04,cy-r*0.18,cx,cy-r*0.1);
    g.fillStyle(0xf5f5f5); for(let i=0;i<5;i++) g.fillRect(cx-r*0.1+i*r*0.05,cy-r*0.06,r*0.04,r*0.07);
    g.fillStyle(0x78909c); g.fillRect(cx+r*0.44,cy-r*0.5,r*0.1,r*0.72);
    g.fillStyle(0x5d4037); g.fillRect(cx+r*0.34,cy-r*0.05,r*0.3,r*0.08); g.fillRect(cx+r*0.47,cy-r*0.58,r*0.06,r*0.1);
  });

  // ── Orc sprite ──
  dt('spr_orc', g => {
    const r=S*0.44;
    g.fillStyle(0x000000,0.2); g.fillEllipse(cx,cy+r*0.88,r*1.3,r*0.35);
    g.fillStyle(0x4e342e); g.fillRoundedRect(cx-r*0.48,cy-r*0.05,r*0.96,r*0.7,3);
    g.fillStyle(0x3e2723); g.fillRect(cx-r*0.48,cy+r*0.5,r*0.96,r*0.15);
    g.fillStyle(0x558b2f); g.fillEllipse(cx-r*0.62,cy+r*0.1,r*0.32,r*0.45); g.fillEllipse(cx+r*0.62,cy+r*0.1,r*0.32,r*0.45);
    g.fillStyle(0x558b2f); g.fillRect(cx-r*0.7,cy+r*0.22,r*0.2,r*0.3); g.fillRect(cx+r*0.5,cy+r*0.22,r*0.2,r*0.3);
    g.fillStyle(0x33691e); g.fillRoundedRect(cx-r*0.74,cy+r*0.48,r*0.26,r*0.18,2); g.fillRoundedRect(cx+r*0.48,cy+r*0.48,r*0.26,r*0.18,2);
    g.fillStyle(0x37474f); g.fillRect(cx-r*0.4,cy+r*0.62,r*0.32,r*0.35); g.fillRect(cx+r*0.08,cy+r*0.62,r*0.32,r*0.35);
    g.fillStyle(0x1a1a2e); g.fillRect(cx-r*0.44,cy+r*0.82,r*0.36,r*0.14); g.fillRect(cx+r*0.08,cy+r*0.82,r*0.36,r*0.14);
    g.fillStyle(0x558b2f); g.fillRect(cx-r*0.16,cy-r*0.12,r*0.32,r*0.12);
    g.fillStyle(0x558b2f); g.fillCircle(cx,cy-r*0.38,r*0.34);
    g.fillStyle(0x4caf50); g.fillRect(cx-r*0.22,cy-r*0.2,r*0.44,r*0.16);
    g.fillStyle(0xf5f5f5); g.fillTriangle(cx-r*0.16,cy-r*0.06,cx-r*0.22,cy+r*0.1,cx-r*0.1,cy+r*0.1); g.fillTriangle(cx+r*0.16,cy-r*0.06,cx+r*0.1,cy+r*0.1,cx+r*0.22,cy+r*0.1);
    g.fillStyle(0xd32f2f); g.fillCircle(cx-r*0.14,cy-r*0.4,r*0.08); g.fillCircle(cx+r*0.14,cy-r*0.4,r*0.08);
    g.fillStyle(0x000000); g.fillCircle(cx-r*0.14,cy-r*0.4,r*0.04); g.fillCircle(cx+r*0.14,cy-r*0.4,r*0.04);
    g.fillStyle(0x33691e); g.fillRect(cx-r*0.24,cy-r*0.5,r*0.48,r*0.08);
    g.fillStyle(0x78909c); g.fillRect(cx+r*0.56,cy-r*0.6,r*0.1,r*0.82);
    g.fillStyle(0x546e7a); g.fillTriangle(cx+r*0.56,cy-r*0.6,cx+r*0.86,cy-r*0.38,cx+r*0.56,cy-r*0.16);
    g.fillStyle(0x5d4037); g.fillRect(cx+r*0.58,cy+r*0.18,r*0.08,r*0.24);
  });

  g.destroy();
}
