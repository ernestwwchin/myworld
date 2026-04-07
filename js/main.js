// ═══════════════════════════════════════════════════════
// main.js — Load mods, then boot Phaser
// ═══════════════════════════════════════════════════════

(async function boot() {
  // Load YAML mod data into game globals
  try {
    await ModLoader.init();
    // Sync ROWS/COLS after mod may have changed MAP
    ROWS = MAP.length;
    COLS = MAP[0].length;
  } catch (e) {
    console.error('[ModLoader] Failed, using built-in defaults:', e.message || e, e.stack || '');
  }

  const GAME_W = COLS * S;
  const GAME_H = ROWS * S;

  const game = window.game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#0a0a0f',
    parent: 'gc',
    scene: GameScene,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 2 },
    render: { pixelArt: true, antialias: false },
  });

  // Keep UI overlay sized to match the scaled canvas
  function syncUIOverlay() {
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
  window.syncUIOverlay = syncUIOverlay;
  window.addEventListener('resize', syncUIOverlay);
  game.scale.on('resize', () => setTimeout(syncUIOverlay, 50));
  setTimeout(syncUIOverlay, 100);

  // Initialize UI modules
  CombatLog.init();
  CombatLog.log('Explore the dungeon!', 'system');
})();
