<script lang="ts">
  import { onMount } from 'svelte';
  import type { SavedStamp } from './types';
  import { getAllStamps, saveStamp, deleteStamp, newStampId, exportToSaved, exportAllStamps, importStampsFromFile, downloadJSON } from './storage';
  import { buildStampExport, showStatus } from './export';
  import { loadStampIntoEditor } from './controls';
  import { renderAll } from './renderer';
  import * as state from './state';

  let stamps = $state<SavedStamp[]>([]);
  let activeId = $state<string | null>(null);

  onMount(() => { refresh(); });

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

  // Expose for external use
  export function setActiveStampId(id: string | null) { activeId = id; refresh(); }
  export function refreshLibrary() { refresh(); }
</script>

<div class="divider"></div>
<h4 class="title">
  Stamp Library
  <span class="count">{stamps.length} saved</span>
</h4>

<div class="actions">
  <button class="btn" onclick={handleImport}>Import .json</button>
  <button class="btn" onclick={handleExportAll}>Export All</button>
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
          <div class="stamp-meta">{s.w}×{s.h} · {s.theme || 'stone'} · d{s.difficulty ?? 0}</div>
        </div>
        <button class="icon-btn accent" onclick={(e) => { e.stopPropagation(); loadStamp(s); }} title="Load">Load</button>
        <button class="icon-btn" onclick={(e) => { e.stopPropagation(); downloadStamp(s); }} title="Download .json">↓</button>
        <button class="icon-btn danger" onclick={(e) => { e.stopPropagation(); removeStamp(s.id); }} title="Delete">✕</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .divider { margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px; }
  .title { color: var(--accent); margin-bottom: 6px; font-size: 0.85rem; }
  .count { font-weight: normal; color: var(--text-dim); font-size: 0.7rem; margin-left: 4px; }
  .actions { display: flex; gap: 4px; margin-bottom: 6px; }
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
  .empty {
    font-size: 0.75rem;
    color: var(--text-dim);
    padding: 8px;
    text-align: center;
  }
  .list { max-height: 280px; overflow-y: auto; }
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
  .stamp-meta { font-size: 0.65rem; color: var(--text-dim); }
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
