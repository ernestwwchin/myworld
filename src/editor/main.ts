import { loadCatalogData, renderTiles, renderCharacters, renderStamps, setupViewTabs, setupFilters, initAutotileDemo } from './catalog';
import { buildPalette, setupTileCanvasEvents, setupLogicCanvasEvents, setupToolbar, ensureEditorReady } from './controls';
import { exportStampJSON } from './export';
import { renderAll } from './renderer';
import './editor.css';

// ── Boot ──
document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching
  setupViewTabs();

  // Load JSON catalogs (tiles, anims, sprites)
  try {
    await loadCatalogData();
    renderTiles();
    renderCharacters();
  } catch (err) {
    console.error('Failed to load tile data:', err);
    const grid = document.getElementById('tileGrid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">Failed to load tile data. Make sure tiles.json, animations.json, sprites.json exist in /scratch/</div>';
  }

  // Stamps (don't need tile data)
  renderStamps();

  // Filters + search
  setupFilters();

  // Tile editor toolbar (logic/object buttons, resize, clear, visual layer)
  setupToolbar();

  // Export button
  document.getElementById('edExport')?.addEventListener('click', () => exportStampJSON());

  // MutationObserver: init editor on first tab switch
  const panel = document.getElementById('tileeditorView');
  if (panel) {
    const observer = new MutationObserver(() => {
      if (panel.classList.contains('active')) {
        ensureEditorReady();
        renderAll();
      }
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }
});
