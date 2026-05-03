<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedStamp } from './types';
  import { getAllStamps, saveStamp, deleteStamp, clearAllStamps, needsReseed, setStampVersion, newStampId, exportToSaved, exportAllStamps, importStampsFromFile, downloadJSON } from './storage';
  import { buildStampExport, showStatus } from './export';
  import { loadStampIntoEditor } from './controls';
  import { renderAll } from './renderer';
  import * as editorState from './state';
  import { rebuildAllBuiltinStamps } from './library';

  let stamps = $state<SavedStamp[]>([]);
  let activeId = $state<string | null>(null);
  let expanded = $state(true);

  onMount(() => {
    // Auto-seed or re-seed stamps when version is outdated
    if (needsReseed()) {
      clearAllStamps();
      rebuildAllBuiltinStamps();
      setStampVersion();
    }
    refresh();
  });

  function refresh() {
    stamps = getAllStamps();
  }

  function loadStamp(saved: SavedStamp) {
    activeId = saved.id;
    const stamp = {
      name: saved.name,
      size: `${saved.w}x${saved.h}`,
      tags: saved.tags || [],
      grid: saved.grid,
      difficulty: saved.difficulty ?? 0,
      theme: saved.theme || 'stone',
      visualLayers: saved.visualLayers as any,
    };
    loadStampIntoEditor(stamp);

    // Sync metadata to palette panel via DOM
    const nameEl = document.getElementById('edName') as HTMLInputElement | null;
    if (nameEl) nameEl.value = saved.name;
    const tagsEl = document.getElementById('edTags') as HTMLInputElement | null;
    if (tagsEl) tagsEl.value = (saved.tags || []).join(', ');
    const diffEl = document.getElementById('edDifficulty') as HTMLSelectElement | null;
    if (diffEl) diffEl.value = String(saved.difficulty ?? 0);
    const themeEl = document.getElementById('edTheme') as HTMLSelectElement | null;
    if (themeEl) themeEl.value = saved.theme || 'stone';
    const catEl = document.getElementById('edCategory') as HTMLSelectElement | null;
    if (catEl) catEl.value = saved.category || 'room';

    showStatus(`Loaded "${saved.name}"`);
    refresh();
  }

  function downloadStamp(saved: SavedStamp) {
    const safeName = (saved.name || 'stamp').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    downloadJSON(saved, `${safeName}.json`);
    showStatus('Downloaded!');
  }

  function removeStamp(id: string) {
    deleteStamp(id);
    if (activeId === id) activeId = null;
    showStatus('Stamp deleted');
    refresh();
  }

  async function handleImport() {
    const imported = await importStampsFromFile();
    if (imported.length === 0) {
      showStatus('No valid stamps found');
      return;
    }
    showStatus(`Imported ${imported.length} stamp(s)`);
    refresh();
  }

  function handleExportAll() {
    if (stamps.length === 0) {
      showStatus('Library is empty');
      return;
    }
    exportAllStamps();
    showStatus(`Exported ${stamps.length} stamp(s)`);
  }

  function handleRebuildAll() {
    const count = rebuildAllBuiltinStamps();
    showStatus(`Rebuilt ${count} built-in stamps with visual layers`);
    refresh();
  }

  function handleClearAll() {
    if (stamps.length === 0) {
      showStatus('Library is already empty');
      return;
    }
    if (!confirm(`Delete all ${stamps.length} stamps from library?`)) return;
    clearAllStamps();
    activeId = null;
    showStatus('Library cleared');
    refresh();
  }

  // Expose for external use
  export function setActiveStampId(id: string | null) { activeId = id; refresh(); }
  export function refreshLibrary() { refresh(); }
</script>

<div class="stamp-library">
<button class="collapse-header" onclick={() => expanded = !expanded}>
  <span class="collapse-arrow" class:open={expanded}>▶</span>
  <span class="title">Stamp Library</span>
  <span class="count">{stamps.length} saved</span>
</button>

{#if expanded}
<div class="actions">
  <button class="btn" onclick={handleImport}>Import .json</button>
  <button class="btn" onclick={handleExportAll}>Export All</button>
  <button class="btn clear-btn" onclick={handleClearAll} title="Delete all stamps from library">Clear All</button>
</div>

{#if stamps.length === 0}
  <div class="empty">No saved stamps yet. Design a room and click Save.</div>
{:else}
  <div class="list">
    {#each stamps as s (s.id)}
      <div
        class="stamp-row"
        class:active={s.id === activeId}
        onclick={() => loadStamp(s)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && loadStamp(s)}
      >
        <div class="stamp-info">
          <div class="stamp-name" class:active-name={s.id === activeId} title={s.name}>{s.name}</div>
          <div class="stamp-meta">{s.w}×{s.h} · {s.category || 'room'} · {s.theme || 'stone'} · d{s.difficulty ?? 0}</div>
        </div>
        <button class="icon-btn accent" onclick={(e) => { e.stopPropagation(); loadStamp(s); }} title="Load">Load</button>
        <button class="icon-btn" onclick={(e) => { e.stopPropagation(); downloadStamp(s); }} title="Download .json">↓</button>
        <button class="icon-btn danger" onclick={(e) => { e.stopPropagation(); removeStamp(s.id); }} title="Delete">✕</button>
      </div>
    {/each}
  </div>
{/if}
{/if}
</div>

<style>
  .stamp-library { }
  .collapse-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    color: var(--text);
  }
  .collapse-header:hover { opacity: 0.8; }
  .collapse-arrow {
    font-size: 0.7rem;
    color: var(--text-dim);
    transition: transform 0.15s;
    display: inline-block;
  }
  .collapse-arrow.open { transform: rotate(90deg); }
  .title { color: var(--accent); font-size: 0.85rem; font-weight: bold; }
  .count { font-weight: normal; color: var(--text-dim); font-size: 0.7rem; margin-left: 4px; }
  .actions { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
  .btn {
    flex: 1;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-mid);
    color: var(--text);
    cursor: pointer;
    font-size: 0.75rem;
  }
  .clear-btn { border-color: #e74c3c; color: #e74c3c; flex: 1; }
  .empty {
    font-size: 0.75rem;
    color: var(--text-dim);
    padding: 8px;
    text-align: center;
  }
  .list { overflow-y: auto; }
  .stamp-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-dark);
    cursor: pointer;
    margin-bottom: 3px;
  }
  .stamp-row.active {
    border-color: var(--accent);
    background: rgba(96, 165, 250, 0.1);
  }
  .stamp-info { flex: 1; min-width: 0; }
  .stamp-name {
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stamp-name.active-name { color: var(--accent); }
  .stamp-meta { font-size: 0.75rem; color: var(--text-dim); }
  .icon-btn {
    padding: 2px 5px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg-mid);
    color: var(--text);
    cursor: pointer;
    font-size: 0.7rem;
  }
  .icon-btn.accent { color: var(--accent); }
  .icon-btn.danger { color: #e74c3c; }
</style>
