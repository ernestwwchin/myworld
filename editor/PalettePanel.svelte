<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as editorState from './state';
  import { buildPalette } from './controls';
  import { renderAll } from './renderer';
  import { exportStampJSON, downloadStampFile, exportForMapgen } from './export';
  import { saveCurrentStamp, saveAsNewStamp } from './library';
  import type { VisualLayer, LogicType, ObjectType, LayerType } from './types';
  import { PALETTE_MAP } from './data';
  import TilesetView from './TilesetView.svelte';

  let stampName = $state('Untitled');
  let tags = $state('');
  let difficulty = $state('0');
  let theme = $state('stone');
  let category = $state<'room' | 'corridor' | 'door'>('room');
  let activeLayer = $state<LayerType>(editorState.activeLayer);
  let activeVisualLayer = $state<VisualLayer>('ground');
  let palFilter = $state('floor');
  let palMode = $state<'grid' | 'sheet'>('grid');
  let statusMsg = $state('');
  let paintLogic = $state<LogicType>('walkable');
  let paintObject = $state<string>('');
  let tilesetRef: TilesetView;

  const layerFilterMap: Record<string, string> = {
    ground: 'floor',
    structure: 'wall_basic',
    decoration: 'wall_deco',
  };

  const logicButtons: { logic: LogicType; label: string; color: string }[] = [
    { logic: 'walkable', label: 'Walkable', color: '#22c55e' },
    { logic: 'blocked', label: 'Blocked', color: '#ef4444' },
    { logic: 'void', label: 'Void', color: '#1a1d24' },
  ];

  const objButtons: { obj: string; label: string }[] = [
    { obj: 'door', label: '🚪 Door' },
    { obj: 'chest', label: '📦 Chest' },
    { obj: 'trap', label: '⚠ Trap' },
    { obj: 'column', label: '🏛 Column' },
    { obj: 'crate', label: '📦 Crate' },
    { obj: 'stairs', label: '🪜 Stairs' },
    { obj: 'shrine', label: '⛩ Shrine' },
    { obj: 'enemy_spawn', label: '👹 Spawn' },
    { obj: '', label: '✕ Clear' },
  ];

  function syncFromEditorState() {
    activeLayer = editorState.activeLayer;
    if (activeLayer === 'ground' || activeLayer === 'structure' || activeLayer === 'decoration') {
      activeVisualLayer = activeLayer;
      palFilter = layerFilterMap[activeLayer] || 'all';
    }
    paintLogic = editorState.paintLogic;
    paintObject = editorState.paintObject;
  }

  function changeFilter() {
    buildPalette();
  }

  function setLogic(logic: LogicType) {
    paintLogic = logic;
    editorState.setPaintLogic(logic);
  }

  function setObj(obj: string) {
    paintObject = obj;
    editorState.setPaintObject(obj as ObjectType | '');
    editorState.setSelectedSprite(null);
  }

  function handleSave() {
    editorState.setStampName(stampName);
    syncMetaToDOM();
    saveCurrentStamp();
  }

  function handleSaveAs() {
    editorState.setStampName(stampName);
    syncMetaToDOM();
    saveAsNewStamp();
  }

  function syncMetaToDOM() {
    const nameEl = document.getElementById('edName') as HTMLInputElement | null;
    if (nameEl) nameEl.value = stampName;
    const tagsEl = document.getElementById('edTags') as HTMLInputElement | null;
    if (tagsEl) tagsEl.value = tags;
    const diffEl = document.getElementById('edDifficulty') as HTMLSelectElement | null;
    if (diffEl) diffEl.value = difficulty;
    const themeEl = document.getElementById('edTheme') as HTMLSelectElement | null;
    if (themeEl) themeEl.value = theme;
    const catEl = document.getElementById('edCategory') as HTMLSelectElement | null;
    if (catEl) catEl.value = category;
  }

  function handleCopyJSON() { syncMetaToDOM(); exportStampJSON(); }
  function handleDownload() { syncMetaToDOM(); downloadStampFile(); }
  function handleExportMapgen() { syncMetaToDOM(); exportForMapgen(); }

  export function setMeta(m: { name?: string; tags?: string; difficulty?: string; theme?: string; category?: string }) {
    if (m.name !== undefined) stampName = m.name;
    if (m.tags !== undefined) tags = m.tags;
    if (m.difficulty !== undefined) difficulty = m.difficulty;
    if (m.theme !== undefined) theme = m.theme;
    if (m.category !== undefined) category = m.category as 'room' | 'corridor' | 'door';
  }

  export function refresh() { syncFromEditorState(); }

  function onStampLoaded(e: Event) {
    const detail = (e as CustomEvent).detail;
    stampName = detail.name || 'Untitled';
    // Also sync tags/difficulty/theme from lastLoadedStamp
    const stamp = editorState.lastLoadedStamp;
    if (stamp) {
      tags = (stamp.tags || []).join(', ');
      difficulty = String(stamp.difficulty ?? 0);
      theme = stamp.theme || 'stone';
      category = (stamp.category as 'room' | 'corridor' | 'door') || 'room';
    }
    syncFromEditorState();
  }

  onMount(() => {
    window.addEventListener('editor:stamp-loaded', onStampLoaded);
  });

  onDestroy(() => {
    window.removeEventListener('editor:stamp-loaded', onStampLoaded);
  });
</script>

<!-- Hidden DOM inputs for backward compat with export/storage modules -->
<input id="edName" type="hidden" value={stampName} />
<input id="edTags" type="hidden" value={tags} />
<select id="edDifficulty" style="display:none" bind:value={difficulty}><option value="0"></option></select>
<select id="edTheme" style="display:none" bind:value={theme}><option value="stone"></option></select>
<select id="edCategory" style="display:none" bind:value={category}><option value="room"></option></select>

<div class="palette-panel">
  <!-- Stamp name -->
  <div class="section">
    <label class="field-label">Stamp name:</label>
    <input type="text" bind:value={stampName} class="name-input" />
  </div>

  <!-- Selected Cell Info -->
  <h4 class="section-title">Selected Cell</h4>
  <div id="edSelected" class="cell-info">Click a cell</div>

  <!-- Context-aware palette -->
  {#if activeLayer === 'logic'}
    <!-- Logic palette -->
    <h4 class="section-title">Logic Type</h4>
    <div class="logic-grid">
      {#each logicButtons as btn}
        <button
          class="logic-btn"
          class:active={paintLogic === btn.logic}
          style="--logic-color: {btn.color}"
          onclick={() => setLogic(btn.logic)}
        >
          <span class="logic-swatch" style="background: {btn.color}"></span>
          {btn.label}
        </button>
      {/each}
    </div>

  {:else if activeLayer === 'objects'}
    <!-- Objects palette -->
    <h4 class="section-title">Object Type</h4>
    <div class="obj-grid">
      {#each objButtons as btn}
        <button
          class="obj-btn"
          class:active={paintObject === btn.obj}
          onclick={() => setObj(btn.obj)}
        >{btn.label}</button>
      {/each}
    </div>

  {:else}
    <!-- Visual tile palette (ground/structure/decoration) -->
    <h4 class="section-title">Tile Palette — {activeVisualLayer}</h4>
    <div class="row" style="margin-bottom: 6px;">
      <div class="mode-toggle">
        <button class="mode-btn" class:active={palMode === 'grid'} onclick={() => palMode = 'grid'}>Grid</button>
        <button class="mode-btn" class:active={palMode === 'sheet'} onclick={() => palMode = 'sheet'}>Sheet</button>
      </div>
    </div>
    {#if palMode === 'grid'}
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
    {:else}
      <TilesetView bind:this={tilesetRef} />
    {/if}
  {/if}

  <!-- Metadata -->
  <div class="divider"></div>
  <div class="section">
    <label class="field-label">Tags (comma-separated):</label>
    <input type="text" bind:value={tags} placeholder="combat, treasure, pillars" class="tags-input" />
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
  <div class="row gap">
    <div class="flex1">
      <label class="field-label">Category:</label>
      <select bind:value={category} class="full-select" id="edCategory">
        <option value="room">Room</option>
        <option value="corridor">Corridor</option>
        <option value="door">Door</option>
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
</div>

<style>
  .palette-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
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
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 3px;
    overflow-y: auto;
    max-height: 300px;
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

  /* Logic palette */
  .logic-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-bottom: 8px;
  }
  .logic-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border: 2px solid var(--border);
    border-radius: 4px;
    background: var(--bg-dark);
    color: var(--text);
    cursor: pointer;
    font-size: 0.8rem;
    transition: border-color 0.1s;
  }
  .logic-btn:hover { border-color: var(--accent-dim); }
  .logic-btn.active { border-color: var(--logic-color, var(--accent)); box-shadow: 0 0 4px var(--logic-color, var(--accent)); }
  .logic-swatch { width: 16px; height: 16px; border-radius: 2px; flex-shrink: 0; }

  /* Object palette */
  .obj-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
    margin-bottom: 8px;
  }
  .obj-btn {
    padding: 6px 4px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-dark);
    color: var(--text);
    cursor: pointer;
    font-size: 0.7rem;
    text-align: center;
    transition: border-color 0.1s;
  }
  .obj-btn:hover { border-color: var(--accent-dim); }
  .obj-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(240,192,96,0.1); }

  /* Grid/Sheet mode toggle */
  .mode-toggle {
    display: flex;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .mode-btn {
    padding: 3px 10px;
    border: none;
    background: var(--bg-dark);
    color: var(--text-dim);
    cursor: pointer;
    font-size: 0.7rem;
    transition: background 0.1s, color 0.1s;
  }
  .mode-btn:not(:last-child) { border-right: 1px solid var(--border); }
  .mode-btn:hover { color: var(--text); }
  .mode-btn.active { background: var(--accent); color: var(--bg-dark); font-weight: bold; }
</style>
