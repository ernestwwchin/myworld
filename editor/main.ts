import { loadCatalogData, renderTiles, renderCharacters, renderStamps, setupViewTabs, setupFilters, initAutotileDemo } from './catalog';
import { mount } from 'svelte';
import EditorApp from './EditorApp.svelte';
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

  // Mount Svelte editor app into the tile-editor panel on first activation
  const panel = document.getElementById('tileeditorView');
  let svelteApp: ReturnType<typeof mount> | null = null;

  if (panel) {
    const observer = new MutationObserver(() => {
      if (panel.classList.contains('active') && !svelteApp) {
        // Clear the old static HTML content
        panel.innerHTML = '';
        svelteApp = mount(EditorApp, { target: panel });
      }
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }
});
