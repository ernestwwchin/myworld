import type { SavedStamp, Stamp } from './types';
import { getAllStamps, saveStamp, deleteStamp, newStampId, exportToSaved, exportAllStamps, importStampsFromFile, downloadJSON } from './storage';
import { buildStampExport, showStatus } from './export';
import { loadStampIntoEditor } from './controls';
import { renderAll } from './renderer';
import * as state from './state';

let activeStampId: string | null = null;

export function getActiveStampId(): string | null { return activeStampId; }
export function setActiveStampId(id: string | null): void { activeStampId = id; }

// ── Save current editor state to library ──

export function saveCurrentStamp(): void {
  const data = buildStampExport();
  const tags = readTags();
  const difficulty = readDifficulty();
  const theme = readTheme();

  if (activeStampId) {
    // Update existing
    const saved = exportToSaved(data, { id: activeStampId, tags, difficulty, theme });
    saveStamp(saved);
    showStatus(`Saved "${data.name}"`);
  } else {
    // Create new
    const id = newStampId();
    const saved = exportToSaved(data, { id, tags, difficulty, theme });
    saveStamp(saved);
    activeStampId = id;
    showStatus(`Created "${data.name}"`);
  }
  renderLibrary();
}

// ── Save as new (always creates) ──

export function saveAsNewStamp(): void {
  const data = buildStampExport();
  const tags = readTags();
  const difficulty = readDifficulty();
  const theme = readTheme();
  const id = newStampId();
  const saved = exportToSaved(data, { id, tags, difficulty, theme });
  saveStamp(saved);
  activeStampId = id;
  showStatus(`Created "${data.name}"`);
  renderLibrary();
}

// ── Load a saved stamp into the editor ──

export function loadSavedStamp(saved: SavedStamp): void {
  activeStampId = saved.id;
  // Convert to Stamp format for loadStampIntoEditor
  const stamp: Stamp = {
    name: saved.name,
    size: `${saved.w}x${saved.h}`,
    tags: saved.tags || [],
    grid: saved.grid,
    difficulty: saved.difficulty ?? 0,
    theme: saved.theme || 'stone',
    visualLayers: saved.visualLayers as Record<string, Partial<{ ground: string | null; structure: string | null; decoration: string | null }>> | undefined,
  };
  loadStampIntoEditor(stamp);

  // Update metadata inputs
  const tagsEl = document.getElementById('edTags') as HTMLInputElement | null;
  if (tagsEl) tagsEl.value = (saved.tags || []).join(', ');
  const diffEl = document.getElementById('edDifficulty') as HTMLSelectElement | null;
  if (diffEl) diffEl.value = String(saved.difficulty ?? 0);
  const themeEl = document.getElementById('edTheme') as HTMLSelectElement | null;
  if (themeEl) themeEl.value = saved.theme || 'stone';

  renderLibrary();
  showStatus(`Loaded "${saved.name}"`);
}

// ── Delete a stamp from library ──

export function deleteSavedStamp(id: string): void {
  deleteStamp(id);
  if (activeStampId === id) activeStampId = null;
  renderLibrary();
  showStatus('Stamp deleted');
}

// ── Export single stamp to file ──

export function exportSavedStampFile(saved: SavedStamp): void {
  const safeName = (saved.name || 'stamp').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  downloadJSON(saved, `${safeName}.json`);
  showStatus('Downloaded!');
}

// ── Import handler ──

export async function handleImport(): Promise<void> {
  const imported = await importStampsFromFile();
  if (imported.length === 0) {
    showStatus('No valid stamps found');
    return;
  }
  showStatus(`Imported ${imported.length} stamp(s)`);
  renderLibrary();
}

// ── Export all handler ──

export function handleExportAll(): void {
  const all = getAllStamps();
  if (all.length === 0) {
    showStatus('Library is empty');
    return;
  }
  exportAllStamps();
  showStatus(`Exported ${all.length} stamp(s)`);
}

// ── Render the stamp library list ──

export function renderLibrary(): void {
  const el = document.getElementById('edLibraryList');
  if (!el) return;
  const stamps = getAllStamps();

  if (stamps.length === 0) {
    el.innerHTML = '<div style="font-size:0.75rem;color:var(--text-dim);padding:8px;text-align:center;">No saved stamps yet. Design a room and click Save.</div>';
    return;
  }

  el.innerHTML = stamps.map(s => {
    const isActive = s.id === activeStampId;
    return `
      <div class="lib-stamp${isActive ? ' active' : ''}" data-id="${s.id}"
           style="display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};border-radius:4px;background:${isActive ? 'rgba(96,165,250,0.1)' : 'var(--bg-dark)'};cursor:pointer;margin-bottom:3px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.8rem;font-weight:bold;color:${isActive ? 'var(--accent)' : 'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.name}">${s.name}</div>
          <div style="font-size:0.65rem;color:var(--text-dim);">${s.w}×${s.h} · ${s.theme || 'stone'} · d${s.difficulty ?? 0}</div>
        </div>
        <button class="lib-load" data-id="${s.id}" title="Load" style="padding:2px 5px;border:1px solid var(--border);border-radius:3px;background:var(--bg-mid);color:var(--accent);cursor:pointer;font-size:0.7rem;">Load</button>
        <button class="lib-dl" data-id="${s.id}" title="Download .json" style="padding:2px 5px;border:1px solid var(--border);border-radius:3px;background:var(--bg-mid);color:var(--text);cursor:pointer;font-size:0.7rem;">↓</button>
        <button class="lib-del" data-id="${s.id}" title="Delete" style="padding:2px 5px;border:1px solid var(--border);border-radius:3px;background:var(--bg-mid);color:#e74c3c;cursor:pointer;font-size:0.7rem;">✕</button>
      </div>`;
  }).join('');

  // Wire events
  el.querySelectorAll<HTMLButtonElement>('.lib-load').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const stamp = getAllStamps().find(s => s.id === btn.dataset.id);
      if (stamp) loadSavedStamp(stamp);
    };
  });
  el.querySelectorAll<HTMLButtonElement>('.lib-dl').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const stamp = getAllStamps().find(s => s.id === btn.dataset.id);
      if (stamp) exportSavedStampFile(stamp);
    };
  });
  el.querySelectorAll<HTMLButtonElement>('.lib-del').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (btn.dataset.id) deleteSavedStamp(btn.dataset.id);
    };
  });
  // Click row to load
  el.querySelectorAll<HTMLElement>('.lib-stamp').forEach(row => {
    row.onclick = () => {
      const stamp = getAllStamps().find(s => s.id === row.dataset.id);
      if (stamp) loadSavedStamp(stamp);
    };
  });
}

// ── Read metadata inputs ──

function readTags(): string[] {
  const val = (document.getElementById('edTags') as HTMLInputElement | null)?.value || '';
  return val.split(',').map(t => t.trim()).filter(Boolean);
}

function readDifficulty(): number {
  return parseInt((document.getElementById('edDifficulty') as HTMLSelectElement | null)?.value || '0') || 0;
}

function readTheme(): string {
  return (document.getElementById('edTheme') as HTMLSelectElement | null)?.value || 'stone';
}
