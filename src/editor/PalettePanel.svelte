<script lang="ts">
  import * as state from './state';
  import { buildPalette } from './controls';
  import { renderAll } from './renderer';
  import { exportStampJSON, downloadStampFile, exportForMapgen } from './export';
  import { saveCurrentStamp, saveAsNewStamp } from './library';
  import type { VisualLayer } from './types';
  import { PALETTE_MAP } from './data';

  let stampName = $state('Untitled');
  let tags = $state('');
  let difficulty = $state('0');
  let theme = $state('stone');
  let activeLayer = $state<VisualLayer>('ground');
  let palFilter = $state('floor');
  let statusMsg = $state('');

  const layerFilterMap: Record<string, string> = {
    ground: 'floor',
    structure: 'wall_basic',
    decoration: 'wall_deco',
  };

  function changeLayer() {
    state.setActiveVisualLayer(activeLayer);
    palFilter = layerFilterMap[activeLayer] || 'all';
    state.setSelectedSprite(null);
    buildPalette();
    renderAll();
  }

  function changeFilter() {
    buildPalette();
  }

  function handleSave() {
    state.setStampName(stampName);
    syncMetaToDOM();
    saveCurrentStamp();
  }

  function handleSaveAs() {
    state.setStampName(stampName);
    syncMetaToDOM();
    saveAsNewStamp();
  }

  function syncMetaToDOM() {
    // Sync values to hidden DOM inputs so export/storage can read them
    const nameEl = document.getElementById('edName') as HTMLInputElement | null;
    if (nameEl) nameEl.value = stampName;
    const tagsEl = document.getElementById('edTags') as HTMLInputElement | null;
    if (tagsEl) tagsEl.value = tags;
    const diffEl = document.getElementById('edDifficulty') as HTMLSelectElement | null;
    if (diffEl) diffEl.value = difficulty;
    const themeEl = document.getElementById('edTheme') as HTMLSelectElement | null;
    if (themeEl) themeEl.value = theme;
  }

  function handleCopyJSON() {
    syncMetaToDOM();
    exportStampJSON();
  }

  function handleDownload() {
    syncMetaToDOM();
    downloadStampFile();
  }

  function handleExportMapgen() {
    syncMetaToDOM();
    exportForMapgen();
  }

  // Expose setters for library.ts to update metadata when loading stamps
  export function setMeta(m: { name?: string; tags?: string; difficulty?: string; theme?: string }) {
    if (m.name !== undefined) stampName = m.name;
    if (m.tags !== undefined) tags = m.tags;
    if (m.difficulty !== undefined) difficulty = m.difficulty;
    if (m.theme !== undefined) theme = m.theme;
  }
</script>

<!-- Hidden DOM inputs for backward compat with export/storage modules -->
<input id="edName" type="hidden" value={stampName} />
<input id="edTags" type="hidden" value={tags} />
<select id="edDifficulty" style="display:none" bind:value={difficulty}><option value="0"></option></select>
<select id="edTheme" style="display:none" bind:value={theme}><option value="stone"></option></select>

<div class="section">
  <label class="field-label">Stamp name:</label>
  <input type="text" bind:value={stampName} class="name-input" />
</div>

<h4 class="section-title">Selected Cell</h4>
<div id="edSelected" class="cell-info">Click a cell</div>

<h4 class="section-title">Visual Layers</h4>
<div class="row">
  <label class="field-label">Paint to:</label>
  <select bind:value={activeLayer} onchange={changeLayer} class="small-select">
    <option value="ground">Ground</option>
    <option value="structure">Structure</option>
    <option value="decoration">Decoration</option>
  </select>
</div>
<div class="row">
  <label class="field-label">Filter:</label>
  <select bind:value={palFilter} onchange={changeFilter} class="small-select" id="edPalFilter">
    <option value="all">All</option>
    <option value="floor">Floor</option>
    <option value="wall_basic">Wall Basic</option>
    <option value="wall_edge">Wall Edges</option>
    <option value="wall_outer">Wall Outer</option>
    <option value="wall_deco">Wall Deco</option>
    <option value="prop">Props</option>
    <option value="chest">Chests</option>
    <option value="consumable">Consumables</option>
    <option value="creature">Creatures</option>
  </select>
</div>
<div id="edPalette" class="palette-grid"></div>

<!-- Metadata -->
<div class="divider"></div>
<div class="section">
  <label class="field-label">Tags (comma-separated):</label>
  <input type="text" bind:value={tags} placeholder="treasure, combat, pillars" class="tags-input" />
</div>
<div class="row gap">
  <div class="flex1">
    <label class="field-label">Difficulty:</label>
    <select bind:value={difficulty} class="full-select">
      <option value="0">0 - None</option>
      <option value="1">1 - Easy</option>
      <option value="2">2 - Medium</option>
      <option value="3">3 - Hard</option>
      <option value="4">4 - Boss</option>
    </select>
  </div>
  <div class="flex1">
    <label class="field-label">Theme:</label>
    <select bind:value={theme} class="full-select">
      <option value="stone">Stone</option>
      <option value="water">Water</option>
      <option value="mystical">Mystical</option>
      <option value="grass">Grass</option>
    </select>
  </div>
</div>

<!-- Save buttons -->
<div class="row gap btn-row">
  <button class="btn save-btn" onclick={handleSave}>Save</button>
  <button class="btn saveas-btn" onclick={handleSaveAs}>Save As New</button>
</div>
<div class="row gap btn-row">
  <button class="btn" onclick={handleCopyJSON}>Copy JSON</button>
  <button class="btn" onclick={handleDownload}>Download .json</button>
</div>
<button class="btn mapgen-btn" onclick={handleExportMapgen}>Export for Mapgen (.stamp.json)</button>
<span id="edStatus" class="status">{statusMsg}</span>

<style>
  .section { margin-bottom: 8px; }
  .section-title { color: var(--accent); margin-bottom: 6px; font-size: 0.85rem; }
  .field-label { font-size: 0.75rem; color: var(--text-dim); }
  .name-input, .tags-input {
    width: 100%;
    padding: 4px;
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 3px;
    font-size: 0.85rem;
    margin-top: 2px;
    box-sizing: border-box;
  }
  .tags-input { font-size: 0.75rem; padding: 3px; }
  .cell-info { font-size: 0.8rem; color: var(--text-dim); margin-bottom: 10px; }
  .row { display: flex; gap: 4px; align-items: center; margin-bottom: 6px; }
  .row.gap { gap: 6px; }
  .flex1 { flex: 1; }
  .small-select, .full-select {
    background: var(--bg-dark);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 0.75rem;
  }
  .full-select { width: 100%; }
  .palette-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 3px;
    overflow-y: auto;
  }
  .divider { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; }
  .btn-row { margin-bottom: 4px; }
  .btn {
    flex: 1;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-mid);
    color: var(--text);
    cursor: pointer;
    font-size: 0.75rem;
  }
  .save-btn { border-color: #2ecc71; color: #2ecc71; font-weight: bold; padding: 6px; font-size: 0.8rem; }
  .saveas-btn { border-color: var(--accent); color: var(--accent); padding: 6px; font-size: 0.8rem; }
  .mapgen-btn { width: 100%; border-color: #e67e22; color: #e67e22; margin-bottom: 4px; }
  .status { font-size: 0.75rem; color: var(--text-dim); display: block; margin-top: 4px; }
</style>
