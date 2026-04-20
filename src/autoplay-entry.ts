import Phaser from 'phaser';
import './rng';
import { S, mapState, PLAYER_STATS } from '@/config';
import { GameScene } from '@/game';
import { ModLoader } from '@/modloader';
import '@/ui/combat-log';
import '@/ui/templates';
import '@/ui/side-panel';
import '@/ui/core-ui';
import '@/ui/hotbar';
import '@/demoplay';
import { scenarios } from '@/autoplay';

(window as unknown as Record<string, unknown>).AutoPlayScenarios = scenarios;

void (async function boot() {
  const params = new URLSearchParams(window.location.search);
  const mapOverride = params.get('map');

  try {
    await ModLoader.init();
    if (mapOverride) {
      const md = (ModLoader as unknown as Record<string, unknown>)._modData as Record<string, unknown> | undefined;
      const maps = md?.maps as Record<string, unknown> | undefined;
      if (maps?.[mapOverride]) {
        (ModLoader as unknown as { applyMap(d: unknown, m: string): void }).applyMap(md, mapOverride);
        (ModLoader as unknown as { applyCreatures(d: unknown, m: string): void }).applyCreatures(md, mapOverride);
        const mapDef = maps[mapOverride] as Record<string, unknown> | undefined;
        const p = mapDef?.playerStart;
        if (p) (PLAYER_STATS as Record<string, unknown>).startTile = p;
      }
    }
    const w = window as unknown as Record<string, unknown>;
    const MAP = w.MAP as unknown[][] | undefined;
    if (Array.isArray(MAP) && MAP.length > 0) {
      mapState.rows = MAP.length;
      mapState.cols = (MAP[0] as unknown[]).length;
    }
  } catch (e: unknown) {
    console.warn('[Test] ModLoader failed:', (e as Error).message || e);
  }

  const GAME_W = mapState.cols * S || 640;
  const GAME_H = mapState.rows * S || 480;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0a0a0f',
    parent: 'gc',
    scene: GameScene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    render: { pixelArt: true, antialias: false },
  });
  (window as unknown as Record<string, unknown>).game = game;

  function syncUIOverlay(): void {
    const canvas = document.querySelector('#gc canvas');
    const overlay = document.getElementById('ui-overlay');
    if (!canvas || !overlay) return;
    const rect = canvas.getBoundingClientRect();
    const gc = document.getElementById('gc');
    if (!gc) return;
    const gcRect = gc.getBoundingClientRect();
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.left = (rect.left - gcRect.left) + 'px';
    overlay.style.top = (rect.top - gcRect.top) + 'px';
  }
  (window as unknown as Record<string, unknown>).syncUIOverlay = syncUIOverlay;
  window.addEventListener('resize', syncUIOverlay);
  game.scale.on('resize', () => setTimeout(syncUIOverlay, 50));
  setTimeout(syncUIOverlay, 100);
})();
