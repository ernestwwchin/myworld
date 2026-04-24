import type { SavedStamp, StampExport } from './types';

const STORAGE_KEY = 'editor_stamps';

// ── Read all saved stamps ──

export function getAllStamps(): SavedStamp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedStamp[];
  } catch {
    return [];
  }
}

// ── Get a single stamp by id ──

export function getStamp(id: string): SavedStamp | undefined {
  return getAllStamps().find(s => s.id === id);
}

// ── Save (create or update) a stamp ──

export function saveStamp(stamp: SavedStamp): void {
  const all = getAllStamps();
  const idx = all.findIndex(s => s.id === stamp.id);
  if (idx >= 0) {
    all[idx] = { ...stamp, updatedAt: Date.now() };
  } else {
    all.push({ ...stamp, createdAt: stamp.createdAt || Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ── Delete a stamp ──

export function deleteStamp(id: string): void {
  const all = getAllStamps().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ── Generate a unique id ──

export function newStampId(): string {
  return `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Convert a StampExport to a SavedStamp (for import / first save) ──

export function exportToSaved(
  data: StampExport,
  meta?: { id?: string; tags?: string[]; difficulty?: number; theme?: string },
): SavedStamp {
  const now = Date.now();
  return {
    ...data,
    id: meta?.id || newStampId(),
    tags: meta?.tags || [],
    difficulty: meta?.difficulty ?? 0,
    theme: meta?.theme || 'stone',
    createdAt: now,
    updatedAt: now,
  };
}

// ── File download helper ──

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── File import helper — returns parsed JSON or null ──

export function importJSONFile(): Promise<unknown | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result as string)); }
        catch { resolve(null); }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

// ── Export all stamps as a single JSON file ──

export function exportAllStamps(): void {
  const all = getAllStamps();
  if (all.length === 0) return;
  downloadJSON(all, `stamp-library-${new Date().toISOString().slice(0, 10)}.json`);
}

// ── Import stamps from a JSON file (array or single) ──

export async function importStampsFromFile(): Promise<SavedStamp[]> {
  const data = await importJSONFile();
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  const imported: SavedStamp[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    // Must have at least grid + w + h to be a valid stamp
    if (typeof rec.grid !== 'string' || typeof rec.w !== 'number' || typeof rec.h !== 'number') continue;
    const saved = exportToSaved(rec as unknown as StampExport, {
      id: typeof rec.id === 'string' ? rec.id : undefined,
      tags: Array.isArray(rec.tags) ? rec.tags as string[] : [],
      difficulty: typeof rec.difficulty === 'number' ? rec.difficulty : 0,
      theme: typeof rec.theme === 'string' ? rec.theme : 'stone',
    });
    // Avoid duplicate ids — assign new if collision
    const existing = getStamp(saved.id);
    if (existing) saved.id = newStampId();
    saveStamp(saved);
    imported.push(saved);
  }
  return imported;
}
