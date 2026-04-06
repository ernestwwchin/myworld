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
    console.warn('[ModLoader] Failed, using built-in defaults:', e);
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
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    render: { pixelArt: true, antialias: false },
  });

  // Keep UI overlay sized to match the scaled canvas
  function syncUIOverlay() {
    const canvas = document.querySelector('#gc canvas');
    const overlay = document.getElementById('ui-overlay');
    if (!canvas || !overlay) return;
    const rect = canvas.getBoundingClientRect();
    const gc = document.getElementById('gc');
    const gcRect = gc.getBoundingClientRect();
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.left = (rect.left - gcRect.left) + 'px';
    overlay.style.top = (rect.top - gcRect.top) + 'px';
  }
  window.addEventListener('resize', syncUIOverlay);
  game.scale.on('resize', () => setTimeout(syncUIOverlay, 50));
  setTimeout(syncUIOverlay, 100);
})();
