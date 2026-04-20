import Phaser from 'phaser';
import './rng';
import { S, mapState } from '@/config';
import { GameScene } from '@/game';
import { ModLoader } from '@/modloader';

(async function boot() {
  try {
    await ModLoader.init();
    // Sync mapState after mod may have changed MAP
    const w = window as unknown as Record<string, unknown>;
    const MAP = w.MAP as unknown[][] | undefined;
    if (Array.isArray(MAP) && MAP.length > 0) {
      mapState.rows = MAP.length;
      mapState.cols = (MAP[0] as unknown[]).length;
    }
  } catch (e: unknown) {
    const err = e as { message?: string; stack?: string };
    console.error('[ModLoader] Failed, using built-in defaults:', err.message || e, err.stack || '');
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
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    input: {
      activePointers: 2,
      mouse: { preventDefaultDown: true, preventDefaultUp: true, preventDefaultMove: false },
    },
    render: { pixelArt: true, antialias: false },
  });
  (window as unknown as Record<string, unknown>).game = game;

  const gcEl = document.getElementById('gc');
  if (gcEl) gcEl.addEventListener('contextmenu', (e) => e.preventDefault());

  function syncUIOverlay(): void {
    const canvas = document.querySelector('#gc canvas');
    const overlay = document.getElementById('ui-overlay');
    if (!canvas || !overlay) return;
    const gc = document.getElementById('gc');
    if (!gc) return;
    const gcRect = gc.getBoundingClientRect();
    overlay.style.width = gcRect.width + 'px';
    overlay.style.height = gcRect.height + 'px';
    overlay.style.left = '0px';
    overlay.style.top = '0px';
  }
  (window as unknown as Record<string, unknown>).syncUIOverlay = syncUIOverlay;
  window.addEventListener('resize', syncUIOverlay);
  game.scale.on('resize', () => setTimeout(syncUIOverlay, 50));
  setTimeout(syncUIOverlay, 100);

  const w = window as unknown as Record<string, unknown>;
  if (w.CombatLog && typeof (w.CombatLog as { init?: () => void }).init === 'function') {
    (w.CombatLog as { init: () => void; log: (msg: string, cat: string) => void }).init();
    (w.CombatLog as { init: () => void; log: (msg: string, cat: string) => void }).log('Explore the dungeon!', 'system');
  }
})();
