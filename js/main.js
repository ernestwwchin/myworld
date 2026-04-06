// ═══════════════════════════════════════════════════════
// main.js — Phaser game boot
// ═══════════════════════════════════════════════════════

const game = window.game = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a0f',
  parent: 'gc',
  scene: GameScene,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  render: { pixelArt: true, antialias: false },
});

window.addEventListener('resize', () => game.scale.resize(window.innerWidth, window.innerHeight));
