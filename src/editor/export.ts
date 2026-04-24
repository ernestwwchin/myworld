import { LOGIC, OBJECTS } from './data';
import * as state from './state';
import type { StampExport } from './types';
import { downloadJSON } from './storage';

/** Build a StampExport from the current editor grid (pure data, no side effects). */
export function buildStampExport(): StampExport {
  const name = (document.getElementById('edName') as HTMLInputElement | null)?.value || state.stampName || 'Untitled';

  // ASCII grid
  let ascii = '';
  for (let r = 0; r < state.gridH; r++) {
    let row = '';
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];
      if (cell.object) row += OBJECTS[cell.object].ascii;
      else row += LOGIC[cell.logic].label;
    }
    ascii += (r > 0 ? '\n' : '') + row;
  }

  // BSP numeric grid
  const bspGrid: number[][] = [];
  for (let r = 0; r < state.gridH; r++) {
    bspGrid[r] = [];
    for (let c = 0; c < state.gridW; c++) {
      const cell = state.cells[r][c];
      let val = LOGIC[cell.logic].bsp;
      if (cell.object && OBJECTS[cell.object].bspOverride != null) {
        val = OBJECTS[cell.object].bspOverride!;
      }
      bspGrid[r][c] = val;
    }
  }

  // Connectable edges
  const connectable = { north: [] as number[], south: [] as number[], west: [] as number[], east: [] as number[] };
  for (let c = 2; c < state.gridW - 2; c++) {
    if (!LOGIC[state.cells[2][c].logic].blocked) connectable.north.push(c);
    if (!LOGIC[state.cells[state.gridH - 3][c].logic].blocked) connectable.south.push(c);
  }
  for (let r = 2; r < state.gridH - 2; r++) {
    if (!LOGIC[state.cells[r][2].logic].blocked) connectable.west.push(r);
    if (!LOGIC[state.cells[r][state.gridW - 3].logic].blocked) connectable.east.push(r);
  }

  // Collect objects
  const spawns: { x: number; y: number }[] = [];
  let stairsPos: { x: number; y: number } | null = null;
  const objects: { type: string; x: number; y: number }[] = [];
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const obj = state.cells[r][c].object;
      if (!obj) continue;
      if (obj === 'enemy_spawn') spawns.push({ x: c, y: r });
      else if (obj === 'stairs') stairsPos = { x: c, y: r };
      else objects.push({ type: obj, x: c, y: r });
    }
  }

  // Visual layers
  const visualLayers: Record<string, Record<string, string>> = {};
  for (let r = 0; r < state.gridH; r++) {
    for (let c = 0; c < state.gridW; c++) {
      const v = state.cells[r][c].visuals;
      const entry: Record<string, string> = {};
      if (v.ground) entry.ground = v.ground;
      if (v.structure) entry.structure = v.structure;
      if (v.decoration) entry.decoration = v.decoration;
      if (Object.keys(entry).length > 0) {
        visualLayers[`${r},${c}`] = entry;
      }
    }
  }

  return {
    name,
    w: state.gridW,
    h: state.gridH,
    grid: ascii,
    bspGrid,
    connectable,
    spawns: spawns.length > 0 ? spawns : undefined,
    stairs: stairsPos ?? undefined,
    objects: objects.length > 0 ? objects : undefined,
    visualLayers: Object.keys(visualLayers).length > 0 ? visualLayers : undefined,
  };
}

/** Copy stamp JSON to clipboard (legacy behavior). */
export function exportStampJSON(): void {
  const exportData = buildStampExport();
  const json = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showStatus('Copied to clipboard!');
  }).catch(() => {
    prompt('Stamp JSON:', json);
  });
  console.log('Stamp export:', exportData);
}

/** Download current stamp as a .json file. */
export function downloadStampFile(): void {
  const data = buildStampExport();
  const safeName = (data.name || 'stamp').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  downloadJSON(data, `${safeName}.json`);
  showStatus('Downloaded!');
}

/** Export stamp in the mapgen-compatible StampDef format (for BSP room placement). */
export function exportForMapgen(): void {
  const data = buildStampExport();
  const safeName = (data.name || 'stamp').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const tags = readTagsFromInput();
  const difficulty = parseInt((document.getElementById('edDifficulty') as HTMLSelectElement | null)?.value || '0') || 0;
  const theme = (document.getElementById('edTheme') as HTMLSelectElement | null)?.value || 'stone';

  const stampDef = {
    id: safeName,
    name: data.name,
    w: data.w,
    h: data.h,
    grid: data.grid,
    bspGrid: data.bspGrid,
    tags,
    difficulty,
    theme,
    spawns: data.spawns,
    stairs: data.stairs,
    objects: data.objects,
  };
  downloadJSON(stampDef, `${safeName}.stamp.json`);
  showStatus('Mapgen stamp downloaded!');
}

function readTagsFromInput(): string[] {
  const val = (document.getElementById('edTags') as HTMLInputElement | null)?.value || '';
  return val.split(',').map(t => t.trim()).filter(Boolean);
}

/** Show a brief status message. */
export function showStatus(msg: string): void {
  const el = document.getElementById('edStatus');
  if (el) { el.textContent = `✓ ${msg}`; setTimeout(() => { el.textContent = ''; }, 3000); }
}
