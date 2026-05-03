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

  // Wire "Browse Stamps" button in aside to switch to stamps tab
  const browseBtn = document.getElementById('asideBrowseStamps');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      const stampsTab = document.querySelector<HTMLElement>('[data-view="stamps"]');
      if (stampsTab) stampsTab.click();
    });
  }

  // Update aside current stamp indicator when a stamp is loaded
  window.addEventListener('editor:stamp-loaded', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const el = document.getElementById('asideCurrentStamp');
    if (el && detail) {
      el.textContent = `${detail.name || 'Untitled'} (${detail.w}×${detail.h})`;
    }
  });
});
