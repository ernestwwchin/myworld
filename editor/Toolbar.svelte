<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as editorState from './state';
  import { renderAll } from './renderer';
  import { buildPalette } from './controls';
  import type { ToolType, LogicType, ObjectType } from './types';

  let { onchange }: { onchange?: () => void } = $props();

  let activeTool = $state<ToolType>(editorState.activeTool);
  let gridW = $state(editorState.gridW);
  let gridH = $state(editorState.gridH);
  let sizePreset = $state('custom');

  function onStampLoaded(e: Event) {
    const detail = (e as CustomEvent).detail;
    gridW = detail.w;
    gridH = detail.h;
    sizePreset = 'custom';
    onchange?.();
  }

  function onToolChanged() {
    activeTool = editorState.activeTool;
  }

  onMount(() => {
    window.addEventListener('editor:stamp-loaded', onStampLoaded);
    window.addEventListener('editor:tool-changed', onToolChanged);
  });

  onDestroy(() => {
    window.removeEventListener('editor:stamp-loaded', onStampLoaded);
    window.removeEventListener('editor:tool-changed', onToolChanged);
  });

  const toolButtons: { tool: ToolType; label: string; shortcut: string }[] = [
    { tool: 'brush', label: '🖌 Brush', shortcut: 'B' },
    { tool: 'eraser', label: '⌫ Eraser', shortcut: 'E' },
    { tool: 'fill', label: '🪣 Fill', shortcut: 'G' },
    { tool: 'rectangle', label: '▭ Rect', shortcut: 'R' },
    { tool: 'select', label: '⬚ Select', shortcut: 'S' },
  ];

  const sizePresets: { label: string; w: number; h: number }[] = [
    { label: 'Small 7×7', w: 7, h: 7 },
    { label: 'Medium 9×9', w: 9, h: 9 },
    { label: 'Large 13×11', w: 13, h: 11 },
    { label: 'Huge 19×15', w: 19, h: 15 },
  ];

  function setTool(tool: ToolType) {
    activeTool = tool;
    editorState.setActiveTool(tool);
  }

  function applyPreset() {
    const preset = sizePresets.find(p => p.label === sizePreset);
    if (preset) {
      gridW = preset.w;
      gridH = preset.h;
      resize();
    }
  }

  function resize() {
    const w = Math.max(5, Math.min(40, gridW || 7));
    const h = Math.max(5, Math.min(40, gridH || 7));
    editorState.pushUndo();
    editorState.resizeGrid(w, h);
    gridW = w;
    gridH = h;
    onchange?.();
  }

  function clear() {
    editorState.pushUndo();
    editorState.initGrid();
    onchange?.();
  }

  function newStamp() {
    editorState.clearHistory();
    editorState.initGrid();
    editorState.setStampName('Untitled');
    editorState.setLastLoadedStamp(null);
    import('./library').then(lib => lib.setActiveStampId(null));
    onchange?.();
  }

  function resetStamp() {
    if (editorState.lastLoadedStamp) {
      import('./controls').then(c => c.loadStampIntoEditor(editorState.lastLoadedStamp!));
    }
  }

  function handleUndo() {
    if (editorState.undo()) {
      renderAll();
    }
  }

  function handleRedo() {
    if (editorState.redo()) {
      renderAll();
    }
  }

  function onGridWInput() {
    sizePreset = 'custom';
  }

  function onGridHInput() {
    sizePreset = 'custom';
  }

  // Sync tool state from keyboard shortcuts
  export function syncTool() {
    activeTool = editorState.activeTool;
  }
</script>

<div class="toolbar">
  <div class="tool-group">
    {#each toolButtons as btn}
      <button
        class="tool-btn"
        class:active={activeTool === btn.tool}
        onclick={() => setTool(btn.tool)}
        title="{btn.label} ({btn.shortcut})"
      >{btn.label}</button>
    {/each}
  </div>

  <span class="separator">│</span>

  <div class="grid-controls">
    <select class="preset-select" bind:value={sizePreset} onchange={applyPreset}>
      <option value="custom">Custom</option>
      {#each sizePresets as p}
        <option value={p.label}>{p.label}</option>
      {/each}
    </select>
    <input type="number" bind:value={gridW} oninput={onGridWInput} min="5" max="40" class="grid-input" />
    <span>×</span>
    <input type="number" bind:value={gridH} oninput={onGridHInput} min="5" max="40" class="grid-input" />
    <button class="tool-btn" onclick={resize}>Resize</button>
  </div>

  <span class="separator">│</span>

  <div class="action-group">
    <button class="tool-btn" onclick={handleUndo} title="Undo (Ctrl+Z)">↩</button>
    <button class="tool-btn" onclick={handleRedo} title="Redo (Ctrl+Y)">↪</button>
    <button class="tool-btn new-btn" onclick={newStamp} title="New stamp">New</button>
    <button class="tool-btn" onclick={clear} title="Clear grid">Clear</button>
    <button class="tool-btn" onclick={resetStamp} title="Reload last loaded stamp">Reset</button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    padding: 6px 8px;
    background: var(--bg-mid);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .tool-group, .action-group {
    display: flex;
    gap: 4px;
  }
  .tool-btn {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-dark);
    color: var(--text);
    cursor: pointer;
    font-size: 0.8rem;
    white-space: nowrap;
    transition: border-color 0.1s, color 0.1s;
  }
  .tool-btn:hover { border-color: var(--accent-dim); }
  .tool-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(240,192,96,0.1);
  }
  .new-btn { border-color: #2ecc71; color: #2ecc71; }
  .separator { color: var(--border); margin: 0 2px; user-select: none; }
  .grid-controls {
    font-size: 0.8rem;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .grid-input {
    width: 40px;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 0.8rem;
  }
  .preset-select {
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 0.75rem;
  }
</style>
