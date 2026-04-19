import Phaser from 'phaser';
import { S } from '@/config';

export interface SpriteCfg {
  blinkChance: number;
  walkFrameRate: number;
  runFrameRate: number;
}

export const SPRITE_CFG: SpriteCfg = {
  blinkChance: 0.18,
  walkFrameRate: 9,
  runFrameRate: 14,
};

export function getSpriteCfg(): SpriteCfg {
  const w = typeof window !== 'undefined'
    ? (window as unknown as { _SPRITE_CFG?: Partial<SpriteCfg> })
    : null;
  return { ...SPRITE_CFG, ...(w?._SPRITE_CFG || {}) };
}

interface TileManifestEntry { atlas: string; frame: string; }
interface CharacterManifestEntry {
  atlas: string;
  idle?: string[];
  run?: string[];
  hit?: string[];
  [key: string]: unknown;
}
interface SpriteManifest {
  atlases?: { key: string; image: string; json: string }[];
  tiles: Record<string, TileManifestEntry>;
  characters: Record<string, CharacterManifestEntry>;
}

function getManifest(): SpriteManifest | undefined {
  const w = typeof window !== 'undefined'
    ? (window as unknown as { SPRITE_MANIFEST?: SpriteManifest })
    : null;
  return w?.SPRITE_MANIFEST;
}

export function getTileTex(key: string): [string] | [string, string] {
  const manifest = getManifest();
  if (manifest && manifest.tiles[key]) {
    const t = manifest.tiles[key];
    return [t.atlas, t.frame];
  }
  return [key];
}

export function getCharFrame(
  type: string,
  animType: 'idle' | 'run' | 'hit',
  frameIdx: number,
): [string] | [string, string] {
  const manifest = getManifest();
  if (manifest && manifest.characters[type]) {
    const frames = manifest.characters[type][animType] as string[] | undefined;
    if (frames && frames.length) {
      return [manifest.characters[type].atlas, frames[frameIdx % frames.length]];
    }
  }
  return [`spr_${type}_${animType}`];
}

export function generateSprites(scene: Phaser.Scene): void {
  const manifest = getManifest();

  if (manifest) {
    for (const atlas of manifest.atlases || []) {
      scene.load.atlas(atlas.key, atlas.image, atlas.json);
    }
  }

  const g = scene.make.graphics({ x: 0, y: 0, add: false } as unknown as Phaser.Types.GameObjects.Graphics.Options);
  const dt = (k: string, fn: (p: Phaser.GameObjects.Graphics) => void) => {
    g.clear();
    fn(g);
    g.generateTexture(k, S, S);
  };

  dt('t_flee', (p) => { p.fillStyle(0x2ecc71, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x2ecc71, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_move', (p) => { p.fillStyle(0x3498db, 0.18); p.fillRect(0, 0, S, S); p.lineStyle(1, 0x3498db, 0.4); p.strokeRect(0, 0, S, S); });
  dt('t_atk',  (p) => { p.fillStyle(0xe74c3c, 0.15); p.fillRect(0, 0, S, S); p.lineStyle(2, 0xe74c3c, 0.55); p.strokeRect(1, 1, S - 2, S - 2); p.lineStyle(1, 0xe74c3c, 0.3); p.lineBetween(0, 0, S, S); p.lineBetween(S, 0, 0, S); });
  dt('t_tap',  (p) => { p.fillStyle(0xf0c060, 0.6); p.fillCircle(S / 2, S / 2, 6); p.lineStyle(1.5, 0xf0c060, 0.8); p.strokeCircle(S / 2, S / 2, 10); });
  dt('t_turn', (p) => { p.lineStyle(3, 0xf0c060, 1); p.strokeRect(2, 2, S - 4, S - 4); p.fillStyle(0xf0c060, 0.1); p.fillRect(2, 2, S - 4, S - 4); });

  dt('t_loot_bag', (p) => {
    const cx = S / 2; const cy = S / 2;
    p.fillStyle(0x8b6914); p.fillEllipse(cx, cy + 4, 18, 14);
    p.fillStyle(0xd4a857); p.fillEllipse(cx, cy + 2, 14, 11);
    p.fillStyle(0xf0c060); p.fillCircle(cx, cy - 4, 5);
    p.lineStyle(1, 0x6b4e0a, 0.6); p.strokeEllipse(cx, cy + 2, 14, 11);
  });

  const cx = S / 2; const cy = S / 2;
  dt('deco_banner', (p) => {
    p.fillStyle(0x5d4037); p.fillRect(cx - 2, 4, 4, S - 8);
    p.fillStyle(0x8e2430); p.fillRoundedRect(cx + 2, 8, S * 0.35, S * 0.55, 3);
    p.fillStyle(0xb03040, 0.6); p.fillRoundedRect(cx + 4, 10, S * 0.28, S * 0.48, 2);
    p.fillStyle(0xd4af37); p.fillRect(cx + 8, 14, S * 0.16, 3);
    p.fillStyle(0xd4af37); p.fillRect(cx + 8, 22, S * 0.16, 3);
  });
  dt('deco_crystal', (p) => {
    p.fillStyle(0x37474f); p.fillEllipse(cx, cy + 14, 18, 8);
    p.fillStyle(0x40e0d0, 0.7); p.fillTriangle(cx, 4, cx - 9, 26, cx + 9, 26);
    p.fillStyle(0x80f0e0, 0.5); p.fillTriangle(cx + 2, 8, cx - 3, 23, cx + 7, 23);
    p.fillStyle(0x80f0e0, 0.15); p.fillCircle(cx, cy - 2, 14);
  });

  g.destroy();
}

export function playHitAnim(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  type: string,
): void {
  if (!sprite || !sprite.active) return;
  const manifest = getManifest();
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

export function generateAnims(scene: Phaser.Scene): void {
  const spriteCfg = getSpriteCfg();
  const A = scene.anims;
  const manifest = getManifest();
  if (!manifest) return;

  for (const [type, cfg] of Object.entries(manifest.characters || {})) {
    const walkFps = Number(spriteCfg.walkFrameRate || 9);
    const runFps = Number(spriteCfg.runFrameRate || 14);

    const idleKey = `anim_${type}_idle`;
    const walkKey = `anim_${type}_walk`;
    const runKey = `anim_${type}_run`;

    if (!A.exists(idleKey) && cfg.idle?.length) {
      A.create({
        key: idleKey,
        frames: cfg.idle.map((f) => ({ key: cfg.atlas, frame: f })),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!A.exists(walkKey) && cfg.run?.length) {
      A.create({
        key: walkKey,
        frames: cfg.run.map((f) => ({ key: cfg.atlas, frame: f })),
        frameRate: walkFps,
        repeat: -1,
      });
    }
    if (!A.exists(runKey) && cfg.run?.length) {
      A.create({
        key: runKey,
        frames: cfg.run.map((f) => ({ key: cfg.atlas, frame: f })),
        frameRate: runFps,
        repeat: -1,
      });
    }
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.SPRITE_CFG = SPRITE_CFG;
  w.getSpriteCfg = getSpriteCfg;
  w.getTileTex = getTileTex;
  w.getCharFrame = getCharFrame;
  w.generateSprites = generateSprites;
  w.playHitAnim = playHitAnim;
  w.generateAnims = generateAnims;
}
