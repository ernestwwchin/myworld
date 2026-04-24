<script lang="ts">
  import Toolbar from './Toolbar.svelte';
  import CanvasPanel from './CanvasPanel.svelte';
  import PalettePanel from './PalettePanel.svelte';
  import StampLibrary from './StampLibrary.svelte';
  import { ensureEditorReady, buildPalette } from './controls';
  import { renderAll } from './renderer';
  import { onMount } from 'svelte';

  let ready = $state(false);

  onMount(() => {
    ensureEditorReady();
    buildPalette();
    renderAll();
    ready = true;
  });
</script>

<div class="editor-root">
  <Toolbar onchange={() => renderAll()} />
  <div class="editor-main">
    <CanvasPanel />
    <div class="editor-sidebar">
      <PalettePanel />
      <StampLibrary />
    </div>
  </div>
</div>

<style>
  .editor-root {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    gap: 8px;
  }
  .editor-main {
    display: flex;
    gap: 12px;
    flex: 1;
    min-height: 0;
  }
  .editor-sidebar {
    width: 320px;
    overflow-y: auto;
    background: var(--bg-mid);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
</style>
