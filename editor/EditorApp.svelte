<script lang="ts">
  import Toolbar from './Toolbar.svelte';
  import MapCanvas from './MapCanvas.svelte';
  import LayersPanel from './LayersPanel.svelte';
  import PalettePanel from './PalettePanel.svelte';
  import { ensureEditorReady, buildPalette } from './controls';
  import { renderAll } from './renderer';
  import { needsReseed, clearAllStamps, setStampVersion } from './storage';
  import { rebuildAllBuiltinStamps } from './library';
  import { onMount } from 'svelte';

  const SIDEBAR_KEY = 'editor_sidebar_width';
  const MIN_W = 260;
  const MAX_W = 500;
  const DEFAULT_W = 300;

  let ready = $state(false);
  let toolbarRef: Toolbar;
  let layersRef: LayersPanel;
  let paletteRef: PalettePanel;
  let sidebarW = $state(DEFAULT_W);

  onMount(() => {
    // Auto-seed or re-seed stamps when version is outdated
    if (needsReseed()) {
      clearAllStamps();
      rebuildAllBuiltinStamps();
      setStampVersion();
    }

    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved) sidebarW = Math.max(MIN_W, Math.min(MAX_W, parseInt(saved) || DEFAULT_W));
    ensureEditorReady();
    buildPalette();
    renderAll();
    ready = true;
  });

  function handleLayerChange() {
    paletteRef?.refresh();
    buildPalette();
  }

  function onResizeDown(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarW;
    function onMove(ev: MouseEvent) {
      const delta = startX - ev.clientX; // dragging left = wider sidebar
      sidebarW = Math.max(MIN_W, Math.min(MAX_W, startW + delta));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      localStorage.setItem(SIDEBAR_KEY, String(sidebarW));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
</script>

<div class="editor-root">
  <Toolbar bind:this={toolbarRef} onchange={() => renderAll()} />
  <div class="editor-main">
    <MapCanvas />
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-handle" onmousedown={onResizeDown}></div>
    <div class="editor-sidebar" style="width:{sidebarW}px">
      <LayersPanel bind:this={layersRef} onlayerchange={handleLayerChange} />
      <PalettePanel bind:this={paletteRef} />
    </div>
  </div>
</div>

<style>
  .editor-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    gap: 6px;
  }
  .editor-main {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .resize-handle {
    width: 6px;
    cursor: col-resize;
    background: var(--border);
    border-radius: 3px;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .resize-handle:hover, .resize-handle:active {
    background: var(--accent);
  }
  .editor-sidebar {
    overflow-y: auto;
    background: var(--bg-mid);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
